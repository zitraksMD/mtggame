// src/components/Level.jsx
import * as THREE from "three";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import nipplejs from "nipplejs";
import './Styles.scss'; // Используем стиль из code1
import useGameStore from '../store/useGameStore';
import usePlayerLoader from './usePlayerLoader';
import useEnemyLoader from './useEnemyLoader'; // Импорт из code1
import GameOverPopup from './GameOverPopup';
import LoadingScreen from "./LoadingScreen"; // Импорт из code1
import { clamp, checkCollision, convertTiledX, convertTiledY, DEFAULT_WORLD_WIDTH, DEFAULT_WORLD_HEIGHT } from './utils';

// --- Константы ---
const HEALTH_BAR_WIDTH = 30;
const HEALTH_BAR_HEIGHT = 4;
const HEALTH_BAR_OFFSET_Y = 25; // Y-смещение хелсбара относительно центра врага
const BEAM_WIDTH = 15;
const BEAM_TEXTURE_FIRE = '/assets/fire-beam.png'; // <<<--- УКАЖИ ПРАВИЛЬНЫЙ ПУТЬ
const BEAM_TEXTURE_ICE = '/assets/ice-beam.png';   // <<<--- УКАЖИ ПРАВИЛЬНЫЙ ПУТЬ
const ENEMY_COLLISION_SIZE = { width: 30, height: 30 }; // Размер хитбокса врага (из code1)

// --- Компонент HealthBar ---
const HealthBar = ({ currentHp, maxHp }) => {
    const healthPercent = maxHp > 0 ? Math.max(0, (currentHp / maxHp) * 100) : 0;
    return (
        <div className="health-bar-container">
            <div className="health-bar" style={{ width: `${healthPercent}%` }}></div>
        </div>
    );
};
// ---------------------------------------------

// --- Вспомогательная функция для получения размеров мира ---
const getWorldDimensions = (levelData) => {
    const gameWorldWidth = levelData?.width || DEFAULT_WORLD_WIDTH;
    const gameWorldHeight = levelData?.height || DEFAULT_WORLD_HEIGHT;
    const WORLD_Y_OFFSET = gameWorldHeight / 2;
    return { gameWorldWidth, gameWorldHeight, WORLD_Y_OFFSET };
};
// ---------------------------------------------

// === Основной компонент Уровня ===
const Level = ({ levelData, onLevelComplete, onReady, difficulty = 'normal' }) => {

    // --- Проверка levelData в самом начале ---
    if (!levelData || typeof levelData.id === 'undefined') {
        console.error("[Level.jsx] Ошибка: Получены невалидные levelData!", levelData);
        return <div className="level-screen error">Ошибка: Неверные данные уровня!</div>;
    }

    // === Рефы ===
    const mountRef = useRef(null);
    const cameraRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const joystickRef = useRef(null);
    const animationFrameId = useRef(null);
    const wallsRef = useRef([]);
    const projectilesRef = useRef([]); // Снаряды игрока
    const enemyProjectilesRef = useRef([]); // Снаряды врагов
    const velocity = useRef({ x: 0, y: 0, force: 0 });
    const playerAttackCooldown = useRef(0);
    const levelStartTimeRef = useRef(null);
    const readyCalledRef = useRef(false);
    const beamTexturesRef = useRef({});
    const backgroundMeshRef = useRef(null); // Реф для фона

    // === Состояния ===
    const [isLoading, setIsLoading] = useState(true);
    const [levelStatus, setLevelStatus] = useState('playing');
    const [enemiesState, setEnemiesState] = useState([]); // Состояние HP врагов
    const [remainingTime, setRemainingTime] = useState(null);
    const [beamTexturesLoaded, setBeamTexturesLoaded] = useState(false);
    const [activeClouds, setActiveClouds] = useState([]); // <<< НОВОЕ СОСТОЯНИЕ для облаков
    const activeCloudsRef = useRef([]); // Реф для доступа в animate

    
    
    // === Глобальный Стор ===
    const {
        playerHp,
        displayMaxHp, // computedStats().hp
        playerStats,  // computedStats()
        playerTakeDamage,
        initializeLevelHp,
        // Добавляем из code1 (если нужно будет вызывать applyDebuff)
        // applyDebuff // <- Раскомментировать, если нужно вызывать action
    } = useGameStore(state => ({
        playerHp: state.playerHp,
        displayMaxHp: state.computedStats().hp,
        playerStats: state.computedStats(),
        playerTakeDamage: state.playerTakeDamage,
        initializeLevelHp: state.initializeLevelHp,
        // applyDebuff: state.applyDebuff // <- Раскомментировать, если нужно вызывать action
    }));

    
    // --- Инициализация HP при монтировании/смене уровня ---
    useEffect(() => {
        console.log(`[Level ${levelData.id}] Mount/Data Change: Вызов initializeLevelHp()`);
        if (typeof initializeLevelHp === 'function') {
             initializeLevelHp();
        } else {
            console.error("ОШИБКА: initializeLevelHp не функция при монтировании/смене уровня!");
        }
        setLevelStatus('playing');
        readyCalledRef.current = false;
    }, [initializeLevelHp, levelData.id]);

    // --- Конфигурация Уровня ---
    const levelConfig = useMemo(() => {
        console.log("[Level.jsx] Calculating levelConfig");
        return getWorldDimensions(levelData);
    }, [levelData?.width, levelData?.height]);

    // --- Загрузка текстур лучей ---
    useEffect(() => {
        const textureLoader = new THREE.TextureLoader();
        let fireLoaded = false;
        let iceLoaded = false;
        let mounted = true;

        console.log("Загрузка текстур лучей...");

        const checkTexLoadComplete = () => {
            if (fireLoaded && iceLoaded && mounted) {
                console.log("✅ Текстуры лучей загружены.");
                setBeamTexturesLoaded(true);
            }
        };

        textureLoader.load(
            BEAM_TEXTURE_FIRE,
            (texture) => {
                if (!mounted) return;
                console.log("🔥 Текстура Огня загружена");
                texture.encoding = THREE.sRGBEncoding;
                beamTexturesRef.current.fire = texture;
                fireLoaded = true;
                checkTexLoadComplete();
            },
            undefined,
            (error) => {
                if (!mounted) return;
                console.error(`❌ Ошибка загрузки ${BEAM_TEXTURE_FIRE}:`, error);
                fireLoaded = true; // Считаем "завершенным" даже с ошибкой
                checkTexLoadComplete();
            }
        );

        textureLoader.load(
            BEAM_TEXTURE_ICE,
            (texture) => {
                if (!mounted) return;
                console.log("❄️ Текстура Льда загружена");
                texture.encoding = THREE.sRGBEncoding;
                beamTexturesRef.current.ice = texture;
                iceLoaded = true;
                checkTexLoadComplete();
            },
            undefined,
            (error) => {
                if (!mounted) return;
                console.error(`❌ Ошибка загрузки ${BEAM_TEXTURE_ICE}:`, error);
                iceLoaded = true; // Считаем "завершенным" даже с ошибкой
                checkTexLoadComplete();
            }
        );

        return () => {
            mounted = false;
            beamTexturesRef.current.fire?.dispose();
            beamTexturesRef.current.ice?.dispose();
            beamTexturesRef.current = {};
            setBeamTexturesLoaded(false);
        }
    }, []);

    // --- Инициализация Сцены, Рендерера, Камеры ---
    useEffect(() => {
        console.log("[Level.jsx] Инициализация сцены Three.js");
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
        camera.position.set(0, 0, 1000);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputEncoding = THREE.sRGBEncoding;
        rendererRef.current = renderer;

        const mountPoint = mountRef.current;
        if (!mountPoint) { console.error("Mount point not found!"); setLevelStatus('error'); return; }

        mountPoint.innerHTML = "";
        mountPoint.appendChild(renderer.domElement);

        const handleResize = () => {
            if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
            const width = mountPoint.clientWidth;
            const height = mountPoint.clientHeight;
            rendererRef.current.setSize(width, height);
            cameraRef.current.left = width / -2;
            cameraRef.current.right = width / 2;
            cameraRef.current.top = height / 2;
            cameraRef.current.bottom = height / -2;
            cameraRef.current.updateProjectionMatrix();
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
        directionalLight.position.set(50, 150, 100);
        directionalLight.target.position.set(0, 0, 0);
        scene.add(directionalLight);
        scene.add(directionalLight.target);

        // Функция очистки Three.js (основная)
        return () => {
            console.log("[Level.jsx] Очистка основной сцены Three.js");
            window.removeEventListener('resize', handleResize);

            // Отмена анимации
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
            // Уничтожение джойстика
            if (joystickRef.current) {
                try { joystickRef.current.destroy(); } catch (e) { console.warn("Joystick destroy error:", e); }
                joystickRef.current = null;
            }

            // Удаляем снаряды
            if (sceneRef.current) {
                 enemyProjectilesRef.current.forEach(proj => {
                     if (proj.mesh) {
                         sceneRef.current?.remove(proj.mesh);
                         proj.mesh.geometry?.dispose();
                         proj.mesh.material?.dispose();
                     }
                 });
                 projectilesRef.current.forEach(proj => {
                     if (proj.mesh) {
                         sceneRef.current?.remove(proj.mesh);
                         proj.mesh.geometry?.dispose();
                         proj.mesh.material?.dispose();
                     }
                 });
                 // Удаление света
                 sceneRef.current.remove(ambientLight);
                 sceneRef.current.remove(directionalLight);
                 sceneRef.current.remove(directionalLight.target);
                 // Модели игрока и врагов удаляются своими хуками или эффектами
            }
             enemyProjectilesRef.current = [];
             projectilesRef.current = [];


            // Очистка рендерера
            rendererRef.current?.dispose();
            if (mountPoint && rendererRef.current?.domElement && mountPoint.contains(rendererRef.current.domElement)) {
                mountPoint.removeChild(rendererRef.current.domElement);
            }

            // Сброс рефов
            sceneRef.current = null;
            rendererRef.current = null;
            cameraRef.current = null;
        };
    }, []);

    // --- Добавление Фона и Стен ---
    useEffect(() => {
        const currentScene = sceneRef.current;
        if (!currentScene || !levelConfig) {
            console.log("[Level.jsx] Skip Background/Walls: No scene or levelConfig yet.");
            return;
        }
        console.log("[Level.jsx] Создание фона и стен");

        // Удаление старых
        if(backgroundMeshRef.current) {
            console.log("  > Removing old background");
            currentScene.remove(backgroundMeshRef.current);
            backgroundMeshRef.current.geometry?.dispose();
            backgroundMeshRef.current.material?.map?.dispose();
            backgroundMeshRef.current.material?.dispose();
            backgroundMeshRef.current = null;
        }
        if(wallsRef.current.length > 0) {
            console.log(`  > Removing ${wallsRef.current.length} old walls`);
            wallsRef.current.forEach(w => {
                if(w.mesh) {
                    currentScene.remove(w.mesh);
                    w.mesh.geometry?.dispose();
                    // Общий материал не удаляем тут
                }
            });
            wallsRef.current = [];
        }

        // Создание нового фона
        const textureLoader = new THREE.TextureLoader();
        if (levelData?.backgroundTexture) {
            console.log(`  > Loading background texture: ${levelData.backgroundTexture}`);
            textureLoader.load(
                levelData.backgroundTexture,
                (texture) => {
                    if (!sceneRef.current) return;
                    console.log("    * Background texture loaded successfully");
                    texture.encoding = THREE.sRGBEncoding;
                    const bgGeometry = new THREE.PlaneGeometry(levelConfig.gameWorldWidth, levelConfig.gameWorldHeight);
                    const bgMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                    const backgroundMesh = new THREE.Mesh(bgGeometry, bgMaterial);
                    backgroundMesh.position.set(0, 0, -10);
                    backgroundMesh.renderOrder = -1;
                    sceneRef.current.add(backgroundMesh);
                    backgroundMeshRef.current = backgroundMesh;
                },
                undefined,
                (error) => {
                    console.error("❌ Ошибка загрузки фона:", error);
                    if(sceneRef.current) sceneRef.current.background = new THREE.Color(0x282c34);
                }
            );
        } else {
            console.log("  > No background texture specified, using color.");
            currentScene.background = new THREE.Color(0x282c34);
        }

        // Создание новых стен
        if (levelData?.walls && levelData.walls.length > 0 && levelConfig) {
            console.log(`  > Creating ${levelData.walls.length} walls`);
             const wallMaterial = new THREE.MeshStandardMaterial({
                 color: 0x808080,
                 roughness: 0.8,
                 metalness: 0.2
             });
             const tempWalls = [];

             levelData.walls.forEach(wallData => {
                 const wallWidth = wallData.width;
                 const wallHeight = wallData.height;
                 const wallX = convertTiledX(wallData.x, wallWidth, levelConfig.gameWorldWidth);
                 const wallY = convertTiledY(wallData.y, wallHeight, levelConfig.gameWorldHeight, levelConfig.WORLD_Y_OFFSET);

                 const wallGeometry = new THREE.BoxGeometry(wallWidth, wallHeight, 10);
                 const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
                 wallMesh.position.set(wallX, wallY, -5);
                 currentScene.add(wallMesh);

                 tempWalls.push({
                     id: wallData.id || `wall-${Math.random()}`,
                     x: wallX - wallWidth / 2,
                     y: wallY - wallHeight / 2,
                     width: wallWidth,
                     height: wallHeight,
                     mesh: wallMesh
                 });
             });
             wallsRef.current = tempWalls;
         } else {
             console.log("  > No walls data found or levelConfig missing.");
         }

        // Функция очистки для этого useEffect
        return () => {
            console.log("[Level.jsx] Очистка фона и стен перед пересозданием");
             if (sceneRef.current) {
                 if(backgroundMeshRef.current) {
                     sceneRef.current.remove(backgroundMeshRef.current);
                     backgroundMeshRef.current.geometry?.dispose();
                     backgroundMeshRef.current.material?.map?.dispose();
                     backgroundMeshRef.current.material?.dispose();
                     backgroundMeshRef.current = null;
                 }
                 wallsRef.current.forEach(w => {
                     if (w.mesh) {
                         sceneRef.current?.remove(w.mesh);
                         w.mesh.geometry?.dispose();
                         // Не удаляем общий материал здесь
                     }
                 });
                 sceneRef.current.background = null;
             }
             wallsRef.current = [];
        };
    }, [levelConfig, levelData?.backgroundTexture, levelData?.walls]);

    // --- Загрузка Игрока ---
    const { playerObject, isPlayerModelLoaded } = usePlayerLoader(
        playerStats?.skin || "/Models/character.glb",
        levelData?.playerStart || (levelConfig ? { x: 0, y: levelConfig.WORLD_Y_OFFSET - 50 } : { x: 0, y: 0 }),
        sceneRef.current,
        levelConfig
    );

    // --- Загрузка Врагов (ИСПОЛЬЗУЕМ useEnemyLoader) ---
    const { enemyRefs, areEnemiesLoaded, initialEnemyStates } = useEnemyLoader(
        levelData?.enemies,
        sceneRef.current,
        levelConfig,
        levelData?.id,
        difficulty
    );

    // --- Управление общей загрузкой ---
    useEffect(() => {
        const allLoaded = !!levelConfig && isPlayerModelLoaded && areEnemiesLoaded && beamTexturesLoaded;
        const currentlyLoading = !allLoaded;

        if (isLoading !== currentlyLoading) {
            setIsLoading(currentlyLoading);
            if (!currentlyLoading) { // Если загрузка ТОЛЬКО ЧТО завершилась
                if (!readyCalledRef.current) {
                    console.log("✨ Уровень ГОТОВ! Вызов onReady.");
                    if (typeof initializeLevelHp === 'function') {
                        initializeLevelHp();
                        console.log("HP игрока инициализировано после загрузки.");
                    } else {
                        console.error("ОШИБКА: initializeLevelHp не функция при вызове onReady!");
                    }
                    if (typeof onReady === 'function') {
                         onReady();
                    } else {
                         console.warn("Пропс onReady не передан в Level.");
                    }
                    readyCalledRef.current = true;

                    if (levelData?.winCondition?.type === 'survive_duration') {
                        levelStartTimeRef.current = Date.now();
                        setRemainingTime(levelData.winCondition.duration);
                        console.log(`Survival Timer Started: ${levelData.winCondition.duration}s`);
                    } else {
                        levelStartTimeRef.current = null;
                        setRemainingTime(null);
                    }
                } else {
                     console.log("[Level.jsx] Загрузка завершена, но onReady уже был вызван.");
                }
            } else {
                 console.log("[Level.jsx] Переход в состояние загрузки...");
            }
        }
    }, [
        levelConfig,
        isPlayerModelLoaded,
        areEnemiesLoaded,
        beamTexturesLoaded,
        isLoading,
        onReady,
        initializeLevelHp,
        levelData?.winCondition
    ]);

    // --- Инициализация состояния врагов ---
    useEffect(() => {
        if (areEnemiesLoaded && initialEnemyStates && initialEnemyStates.length > 0) {
            if (JSON.stringify(enemiesState) !== JSON.stringify(initialEnemyStates)) {
                 console.log(`--- ИНИЦИАЛИЗАЦИЯ enemiesState (${initialEnemyStates.length} шт.) из initialEnemyStates ---`);
                 setEnemiesState(initialEnemyStates);
            }
        } else if (!areEnemiesLoaded && enemiesState.length > 0) {
             console.log("--- Очистка enemiesState, т.к. areEnemiesLoaded = false ---");
             setEnemiesState([]);
        }
    }, [areEnemiesLoaded, initialEnemyStates]); // Не зависим от enemiesState

    const hpResources = useMemo(() => ({
        geometryBg: new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT),
        geometryFill: new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT),
        materialBg: new THREE.MeshBasicMaterial({ color: 0x333333, depthTest: false, depthWrite: false, transparent: true, opacity: 0.8 }),
        materialFill: new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false, depthWrite: false, transparent: true, opacity: 0.9 })
    }), []); // Пустой массив зависимостей = создается один раз

    // Добавляем лог для синхронизации рефа и стейта
    useEffect(() => {
        console.log(`[Sync Ref] activeClouds state changed, updating activeCloudsRef. New length: ${activeClouds.length}`);
        activeCloudsRef.current = activeClouds;
    }, [activeClouds]);

// В Level.jsx
const createPoisonCloud = useCallback((position) => {
    const currentScene = sceneRef.current;
    if (!currentScene) return;

    const cloudRadius = 70; // Пока оставим для расчета урона
    const cloudDuration = 8.0;
    const cloudDps = 5;
    // const cloudColor = 0x32CD32; // Зеленый цвет

    console.log(`☁️ Создание ЯДОВИТОГО ОБЛАКА (ТЕСТ КУБ) в (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`);

    // --- ТЕСТОВЫЙ Визуал (Ярко-розовый куб) ---
    const testGeometry = new THREE.BoxGeometry(cloudRadius * 0.8, cloudRadius * 0.8, 10); // Куб размером с радиус
    const testMaterial = new THREE.MeshStandardMaterial({ // Standard материал реагирует на свет
        color: 0xff00ff,    // Ярко-розовый
        emissive: 0x330033, // Немного собственного свечения
        roughness: 0.5,
        metalness: 0.1
        // Убираем прозрачность для теста
        // transparent: false,
        // opacity: 1.0,
    });
    const testMesh = new THREE.Mesh(testGeometry, testMaterial);
    testMesh.position.copy(position);
    testMesh.position.z = 5; // <<< Ставим НАД землей (Z=0)
    // mesh.rotation.x = -Math.PI / 2; // Кубу не нужен поворот, чтобы лежать на земле
    testMesh.renderOrder = 30; // Выше других объектов
    currentScene.add(testMesh);
    // --- Конец тестового визуала ---

    // --- Добавляем в состояние (с тестовым мешем!) ---
    const cloudData = {
        id: Math.random(),
        mesh: testMesh, // <<< Важно сохранить ссылку на ТЕСТОВЫЙ меш
        position: position.clone(),
        radiusSq: cloudRadius * cloudRadius,
        dps: cloudDps,
        endTime: Date.now() + cloudDuration * 1000,
    };
    // Используем функцию обновления для надежности стейта
    setActiveClouds(prevClouds => {
         const newClouds = [...prevClouds, cloudData];
         console.log(`[setActiveClouds] Добавлено облако ${cloudData.id}. Всего: ${newClouds.length}`);
         return newClouds;
     });

}, [sceneRef, setActiveClouds]); // Зависимости

     

// В Level.jsx

    // === 8. УДАЛЕНИЕ МЕРТВЫХ ВРАГОВ СО СЦЕНЫ ===
    useEffect(() => {
        const currentScene = sceneRef.current;
        // Проверяем базовые зависимости
        if (!currentScene || !enemyRefs || !enemiesState) {
            return; // Выходим, если что-то не готово
        }

        // Проходим по ТЕКУЩИМ РЕФАМ (3D объектам), которые могут быть на сцене
        enemyRefs.forEach(enemyRef => {
            if (!enemyRef || !enemyRef.pivot) return; // Пропускаем невалидные рефы

            // Находим СОСТОЯНИЕ для этого врага
            const enemyState = enemiesState.find(es => es.id === enemyRef.id);

            // Определяем, мертв ли враг согласно СОСТОЯНИЮ
            const isDeadInState = enemyState && enemyState.currentHp <= 0;

            // Определяем, есть ли объект врага еще на сцене
            const isOnScene = currentScene.children.includes(enemyRef.pivot);

            if (isDeadInState) {
                // --- Враг МЕРТВ по состоянию ---
                 if (!enemyRef.isDead) {
                     enemyRef.isDead = true; // Устанавливаем флаг в рефе для остановки AI
                     // console.log(`Установка isDead=true для ${enemyRef.id} на основе состояния.`);
                 }

                 // Если объект еще на сцене - УДАЛЯЕМ
                 if (isOnScene) {
                     // <<<--- ВОТ ЭТУ ПРОВЕРКУ НУЖНО ДОБАВИТЬ / ВЕРНУТЬ --->>>
                     // console.log(`[Cleanup Check] Проверка для ${enemyRef.id}: Тип=${enemyRef.type}, Флаг needsToExplode=${enemyRef.needsToExplode}`); // Лог для отладки
                     if (enemyRef.type === 'rotting_soldier' && enemyRef.needsToExplode) {
                         createPoisonCloud(enemyRef.pivot.position.clone()); // Вызываем облако
                         enemyRef.needsToExplode = false; // Снимаем флаг, чтобы не вызывать повторно
                         console.log(`Активирован эффект смерти (облако) для солдата ${enemyRef.id}`);
                     }
                     // <<<--- КОНЕЦ ПРОВЕРКИ --- >>>

                     console.log(`--- Удаление мертвого врага ${enemyRef.id} (State HP: ${enemyState?.currentHp}) со сцены ---`);
                     currentScene.remove(enemyRef.pivot); // Удаляем объект

                     // ... Опциональная очистка ресурсов ...
                 }
            }
             // Дополнительно: Скрываем хелсбар мертвого врага
             if (enemyRef.hpBar?.container && isDeadInState) {
                   enemyRef.hpBar.container.visible = false;
             }

        }); // Конец forEach

    // Убедись, что createPoisonCloud есть в зависимостях!
    }, [enemiesState, enemyRefs, sceneRef, createPoisonCloud, hpResources]);

    

    // --- Настройка Джойстика ---
    useEffect(() => {
        let joystickInstance = null;
        if (!isLoading && sceneRef.current) {
            const joystickZone = document.getElementById("joystick-container");
            if (joystickZone && !joystickRef.current) {
                try {
                    console.log("Инициализация джойстика...");
                    const options = {
                        zone: joystickZone,
                        mode: "static",
                        position: { left: "50%", top: "50%" },
                        size: 100,
                        color: "rgba(255, 255, 255, 0.5)",
                        threshold: 0.1
                    };
                    joystickInstance = nipplejs.create(options);
                    joystickRef.current = joystickInstance;

                    joystickInstance.on("move", (evt, data) => {
                        if (data.vector) {
                            velocity.current = { x: data.vector.x, y: data.vector.y, force: data.force };
                        }
                    });
                    joystickInstance.on("end", () => {
                        velocity.current = { x: 0, y: 0, force: 0 };
                    });
                    console.log("Джойстик создан.");
                } catch (error) {
                    console.error("❌ Ошибка создания джойстика:", error);
                }
            } else if (!joystickZone) {
                 console.warn("Не найден #joystick-container для джойстика.");
            }
        } else if (isLoading && joystickRef.current) {
             console.log("Уничтожение джойстика из-за isLoading=true");
              try { joystickRef.current.destroy(); } catch(e) { console.warn("Joystick destroy error:", e); }
              joystickRef.current = null;
        }

        return () => {
            if (joystickRef.current) {
                 console.log("Уничтожение джойстика при очистке useEffect");
                 try { joystickRef.current.destroy(); } catch(e) { console.warn("Joystick destroy error:", e); }
                 joystickRef.current = null;
            }
        };
    }, [isLoading]);

    // --- Обработчик урона врагу ---
// В Level.jsx

    // === ОБРАБОТЧИК УРОНА ВРАГУ (ФИНАЛЬНАЯ ВЕРСИЯ с БЛОКОМ и ВЗРЫВОМ) ===
// В Level.jsx

    // === ОБРАБОТЧИК УРОНА ВРАГУ (ИСПРАВЛЕННЫЙ) ===
    const handleEnemyHit = useCallback((enemyId, damageAmount) => {
        // <<< ИСПОЛЬЗУЕМ enemyRefs ИЗ СОСТОЯНИЯ >>>
        const enemyRef = enemyRefs.find(ref => ref && ref.id === enemyId);

        // Если враг не найден или уже помечен как мертвый, выходим
        if (!enemyRef || enemyRef.isDead) {
             // console.log(`[handleEnemyHit] Hit ignored for dead/missing enemy ${enemyId}`);
             return;
        }

        // --- ПРОВЕРКА БЛОКА РЫЦАРЯ ---
        if (enemyRef.type === 'revenant_knight') {
            if (typeof enemyRef.blockCharges === 'undefined') {
                 enemyRef.blockCharges = enemyRef.stats.initialBlockCharges || 0;
            }
            if (enemyRef.blockCharges > 0) {
                enemyRef.blockCharges -= 1;
                console.log(`🛡️ Knight ${enemyId} BLOCKED! Charges left: ${enemyRef.blockCharges}`);
                // TODO: Эффект блока
                return; // Урон не наносим
            } else if (enemyRef.blockCharges === 0 && !enemyRef.blockBrokenNotified) {
                 console.log(`Knight ${enemyId} block broken!`);
                 enemyRef.blockBrokenNotified = true;
            }
        }
        // --- КОНЕЦ ПРОВЕРКИ БЛОКА ---

        // Наносим урон через обновление состояния
        let enemyDefeated = false;
        let needsExplosion = false;

        setEnemiesState(prevEnemies => {
            const enemyIndex = prevEnemies.findIndex(e => e.id === enemyId);
            if (enemyIndex !== -1 && prevEnemies[enemyIndex].currentHp > 0) {
                 const newState = [...prevEnemies];
                 const currentHp = newState[enemyIndex].currentHp;
                 const newHp = Math.max(0, currentHp - damageAmount);
                 // console.log(`   >> HP change for ${enemyId} (${enemyRef.type}): ${currentHp} -> ${newHp}`);

                 if (newHp === 0) {
                      enemyDefeated = true;
                      console.log(`   >> Enemy ${enemyId} defeated (HP=0)!`);
                      if (enemyRef.type === 'rotting_soldier') {
                          needsExplosion = true;
                      }
                 }
                 newState[enemyIndex] = { ...newState[enemyIndex], currentHp: newHp };
                 return newState;
            }
            return prevEnemies;
        });

        // Установка флагов в РЕФЕ после обновления состояния
         if (enemyDefeated && !enemyRef.isDead) {
             enemyRef.isDead = true;
             if (needsExplosion) {
                 enemyRef.needsToExplode = true;
                 console.log(`[handleEnemyHit] УСТАНОВЛЕН ФЛАГ ${enemyRef.id}.needsToExplode = ${enemyRef.needsToExplode}`);
                }             
             console.log(`--- Flag isDead SET for ${enemyId} AFTER state update ---`);
         }
    // <<< ОБНОВЛЯЕМ ЗАВИСИМОСТИ: используем enemyRefs из состояния >>>
    }, [enemyRefs, enemiesState, playerTakeDamage]); // Добавили enemyRefs

    // ... остальные функции и useEffect ...

    // --- Логика статусов игры ---
    const winLevel = useCallback(() => { if (levelStatus === 'playing') { console.log(">>> Уровень ВЫИГРАН <<<"); setLevelStatus('won'); } }, [levelStatus]);
    const loseLevel = useCallback(() => { if (levelStatus === 'playing') { console.log(">>> Уровень ПРОИГРАН <<<"); setLevelStatus('lost'); } }, [levelStatus]);

    // Следим за HP игрока для проигрыша
    useEffect(() => {
        if (typeof playerHp === 'number' && playerHp <= 0 && levelStatus === 'playing') {
            loseLevel();
        }
    }, [playerHp, levelStatus, loseLevel]);


    // === ФУНКЦИИ-ЗАГЛУШКИ ДЛЯ СПОСОБНОСТЕЙ ВРАГОВ (из code1) ===

    // Для Некроманта, Носильщика
    const summonCreature = useCallback((summonerId, creatureType, count, position) => {
        console.warn(`[${summonerId}] SUMMON STUB: ${count} x ${creatureType} at (${position.x.toFixed(0)}, ${position.y.toFixed(0)}) - НЕ РЕАЛИЗОВАНО`);
        // TODO:
        // 1. Получить базовые статы для creatureType (из какого-то общего конфига врагов?).
        // 2. Отмасштабировать статы на основе текущего levelId и difficulty.
        // 3. Создать новый объект врага (pivot, mesh-заглушку, hpBar) аналогично useEnemyLoader.
        // 4. Добавить новый объект в enemyRefs.current (ВАЖНО: мутировать реф напрямую или через очередь).
        // 5. Добавить начальное состояние HP в enemiesState (ВАЖНО: использовать setEnemiesState с осторожностью внутри цикла, лучше через очередь обновлений).
        // 6. Добавить созданный pivot на сцену sceneRef.current.
    }, [levelData?.id, difficulty]); // Зависит от ID уровня и сложности для масштабирования

    // Для Тотемщика
    const placeTotem = useCallback((casterId, position, totemType, duration, range, effect) => {
        console.warn(`[${casterId}] PLACE TOTEM STUB: type=${totemType}, duration=${duration}s at (${position.x.toFixed(0)}, ${position.y.toFixed(0)}) - НЕ РЕАЛИЗОВАНО`);
        // TODO:
        // 1. Создать 3D-меш для тотема (цилиндр?).
        // 2. Добавить меш на сцену в указанной position.
        // 3. Добавить информацию о тотеме (id, position, type, range, effect, endTime, mesh) в новый массив состояния, например, `activeTotems`.
        // 4. В основном цикле `animate` нужно будет проверять активные тотемы:
        //     - Удалять со сцены и из состояния, если время вышло (Date.now() > endTime).
        //     - Проверять, находится ли игрок в радиусе действия активных тотемов.
        //     - Применять соответствующие эффекты (баффы/дебаффы) к игроку (через useGameStore?).
    }, []);

    // Для Жнеца
    const triggerGroundSpikes = useCallback((casterId, targetPos, delay, radius, damage) => {
        console.warn(`[${casterId}] TRIGGER SPIKES STUB at (${targetPos.x.toFixed(0)}, ${targetPos.y.toFixed(0)}) after ${delay}s - НЕ РЕАЛИЗОВАНО`);
        // TODO:
        // 1. Создать визуальный индикатор на земле в targetPos (декаль, круг?).
        // 2. Запустить таймер (setTimeout или через логику в animate).
        // 3. По истечении delay:
        //     - Показать анимацию/эффект шипов.
        //     - Проверить, находится ли игрок в radius от targetPos.
        //     - Если да, нанести урон: playerTakeDamage(damage).
        //     - Удалить индикатор/эффект шипов через некоторое время.
    }, [playerTakeDamage]); // Зависит от playerTakeDamage

    // Для Культиста
    const createPoisonPuddle = useCallback((casterId, targetPos, duration, radius, dps) => {
        console.warn(`[${casterId}] CREATE PUDDLE STUB at (${targetPos.x.toFixed(0)}, ${targetPos.y.toFixed(0)}), ${dps} dps for ${duration}s - НЕ РЕАЛИЗОВАНО`);
        // TODO:
        // 1. Создать визуальный эффект лужи (декаль, плоскость с текстурой?).
        // 2. Добавить меш на сцену в targetPos.
        // 3. Добавить информацию о луже (id, position, radius, dps, endTime, mesh) в новый массив состояния `activePuddles`.
        // 4. В основном цикле `animate` нужно будет:
        //     - Удалять лужи со сцены и из состояния, если время вышло.
        //     - Проверять, находится ли игрок внутри активных луж.
        //     - Если да, наносить периодический урон: playerTakeDamage(dps * dt).
    }, [playerTakeDamage]); // Зависит от playerTakeDamage

    // Для Призрачного заклинателя
    const applyPlayerDebuff = useCallback((casterId, type, duration, strength) => {
        console.warn(`[${casterId}] APPLY DEBUFF STUB: ${type}, duration: ${duration}s, strength: ${strength} - НЕ РЕАЛИЗОВАНО`);
        // TODO:
        // 1. Вызвать action из useGameStore для применения дебаффа:
        //     store.applyDebuff(type, duration, strength); // <-- нужно импортировать applyDebuff из стора
        // 2. В useGameStore должна быть логика:
        //     - Добавления дебаффа в список активных дебаффов игрока (с временем окончания).
        //     - Обновления computedStats, чтобы они учитывали активные дебаффы (например, уменьшали урон игрока).
        //     - Удаления дебаффа из списка по истечении duration.
    }, [/* applyDebuff */]); // <- Раскомментировать зависимость, если нужно

    // Для Огра-мага
    const createProjectileToPoint = useCallback((enemyId, startPos, targetPos, damage, speed) => {
        console.warn(`[${enemyId}] CREATE PROJECTILE TO POINT STUB from (${startPos.x.toFixed(0)}, ${startPos.y.toFixed(0)}) to (${targetPos.x.toFixed(0)}, ${targetPos.y.toFixed(0)}) - НЕ РЕАЛИЗОВАНО`);
        // TODO:
        // 1. Рассчитать вектор направления velocity от startPos к targetPos.
        // 2. Создать данные снаряда (id, ownerId, position=startPos, velocity, damage, lifetime).
        // 3. Добавить снаряд в массив enemyProjectilesRef.current.
        // 4. Создать и добавить меш снаряда на сцену (addEnemyProjectileMesh).
        // 5. Логика движения и коллизии в основном цикле animate уже должна работать для enemyProjectilesRef.
    }, []); // Пока без зависимостей, но может понадобиться sceneRef

    // === КОНЕЦ ФУНКЦИЙ-ЗАГЛУШЕК ===


    // === ОСНОВНОЙ ИГРОВОЙ ЦИКЛ ===
    useEffect(() => {
        // Условие запуска цикла
        if (isLoading || levelStatus !== 'playing' || !playerObject || !enemyRefs || !sceneRef.current || !rendererRef.current || !cameraRef.current || !levelConfig || !beamTexturesLoaded) {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
            return;
        }
        const clock = new THREE.Clock();
        let lastTimestamp = 0;

        // --- Вспомогательные функции цикла ---

        const findNearestEnemy = (origin, maxRangeSq) => {
            let nearestEnemy = null;
            let minDistanceSq = maxRangeSq;
            enemyRefs?.forEach(enemy => {
                // Используем enemy.isDead вместо поиска в enemiesState каждый раз
                if (!enemy || enemy.isDead || !enemy.pivot?.position) return;
                const distanceSq = origin.distanceToSquared(enemy.pivot.position);
                if (distanceSq < minDistanceSq) {
                    minDistanceSq = distanceSq;
                    nearestEnemy = enemy;
                }
            });
            return nearestEnemy;
        };

        const addProjectileMesh = (projectileData) => {
            if (!sceneRef.current) return;
            const geometry = new THREE.SphereGeometry(4, 6, 6);
            const material = new THREE.MeshBasicMaterial({ color: projectileData.isCrit ? 0xffaa00 : 0xffffff });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(projectileData.position);
            projectileData.mesh = mesh;
            sceneRef.current.add(mesh);
        };

        const createProjectile = (targetEnemyRef) => {
            if (!playerObject || !targetEnemyRef?.pivot?.position || !playerStats) return;

            const projSpeed = 500;
            const projLifetime = 1.5;
            const baseDamage = playerStats.attack || 1;
            const startPos = playerObject.position.clone();
            const targetPos = targetEnemyRef.pivot.position.clone();
            const direction = targetPos.sub(startPos).normalize();
            const critChance = playerStats.critChance || 0;
            const isCrit = Math.random() * 100 < critChance;
            const critMultiplier = playerStats.critMultiplier || 2;
            let finalDamage = isCrit ? Math.round(baseDamage * critMultiplier) : baseDamage;

            const doubleStrikeChance = playerStats.doubleStrikeChance || 0;
            const isDoubleStrike = Math.random() * 100 < doubleStrikeChance;

            const makeProjectileData = (dmg, crit, offset = 0) => {
                const pos = playerObject.position.clone().add(direction.clone().multiplyScalar(25));
                if (offset !== 0) {
                    pos.add(new THREE.Vector3(direction.y, -direction.x, 0).multiplyScalar(offset));
                }
                return {
                    id: Math.random(),
                    position: pos,
                    velocity: direction.clone().multiplyScalar(projSpeed),
                    damage: dmg,
                    isCrit: crit,
                    lifetime: projLifetime,
                    mesh: null
                };
            };

            const p1 = makeProjectileData(finalDamage, isCrit);
            projectilesRef.current.push(p1);
            addProjectileMesh(p1);

            if (isDoubleStrike) {
                const isCrit2 = Math.random() * 100 < critChance;
                const dmg2 = isCrit2 ? Math.round(baseDamage * critMultiplier) : baseDamage;
                const p2 = makeProjectileData(dmg2, isCrit2, 8);
                projectilesRef.current.push(p2);
                addProjectileMesh(p2);
            }
        };

        const addEnemyProjectileMesh = (projData) => {
            if (!sceneRef.current) return;
            const geometry = new THREE.CylinderGeometry(0.5, 0.5, 12, 5);
            const material = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(projData.position);
            mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), projData.velocity.clone().normalize());
            projData.mesh = mesh;
            sceneRef.current.add(mesh);
        };

        const createEnemyProjectile = (enemy, playerCurrentPos) => {
             if (!enemy || !enemy.pivot?.position || !enemy.stats || !playerCurrentPos || enemy.isDead) return;

             const projSpeed = 300 + Math.random() * 100;
             const projLifetime = 2.0;
             const damage = enemy.stats.damage || 3;

             const startPos = enemy.pivot.position.clone();
             const targetPos = playerCurrentPos.clone();
             const direction = targetPos.sub(startPos).normalize();
             startPos.add(direction.clone().multiplyScalar(25)); // Смещаем старт от центра врага

             const projectileData = {
                 id: Math.random(),
                 ownerId: enemy.id,
                 position: startPos,
                 velocity: direction.clone().multiplyScalar(projSpeed),
                 damage: damage,
                 lifetime: projLifetime,
                 mesh: null
             };
             enemyProjectilesRef.current.push(projectileData);
             addEnemyProjectileMesh(projectileData);
        };

        // --- Функции для лучей ---
        const createBeamMeshFixed = (enemy, targetPos) => {
            if (!sceneRef.current || !enemy.pivot?.position || !beamTexturesRef.current || !enemy.stats || enemy.isDead) {
                console.warn("createBeamMeshFixed: Пропущен из-за отсутствия необходимых данных или враг мертв.");
                return null;
            }

            const beamType = enemy.stats.beamType === 'fire' ? 'fire' : 'ice';
            const texture = beamTexturesRef.current[beamType];

            if (!texture) {
                console.error(`Текстура для луча типа "${beamType}" не загружена!`);
                return null;
            }

            const startPoint = enemy.pivot.position.clone();
            const beamOriginOffsetY = 25;
            startPoint.y += beamOriginOffsetY;

            const endPoint = targetPos.clone();
            const direction = endPoint.clone().sub(startPoint);
            const distance = direction.length();

            if (distance <= 0.1) return null;

            const beamGeo = new THREE.PlaneGeometry(BEAM_WIDTH, 1);
            const beamMat = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                depthTest: false,
                depthWrite: false,
                side: THREE.DoubleSide,
            });

            const beamMesh = new THREE.Mesh(beamGeo, beamMat);
            beamMesh.name = `beam_${enemy.id}`;
            beamMesh.renderOrder = 900;
            beamMesh.scale.y = distance;
            beamMesh.position.copy(startPoint).lerp(endPoint, 0.5);
            beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());

            sceneRef.current.add(beamMesh);
            return beamMesh;
        }

        const updateBeamMesh = (beamMesh, startPosRaw, targetPos) => {
             if (!beamMesh || !startPosRaw || !targetPos) return;

             const startPoint = startPosRaw.clone();
             const beamOriginOffsetY = 25;
             startPoint.y += beamOriginOffsetY;

             const endPoint = targetPos.clone();
             const direction = endPoint.clone().sub(startPoint);
             const distance = direction.length();

             if (distance <= 0.1) {
                 beamMesh.visible = false;
                 return;
             }

             beamMesh.visible = true;
             beamMesh.scale.y = distance;
             beamMesh.position.copy(startPoint).lerp(endPoint, 0.5);
             beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        }

        const removeBeamMesh = (enemy) => {
             if (enemy.beamEffectMesh && sceneRef.current) {
                 sceneRef.current.remove(enemy.beamEffectMesh);
                 enemy.beamEffectMesh.geometry?.dispose();
                 enemy.beamEffectMesh.material?.map?.dispose();
                 enemy.beamEffectMesh.material?.dispose();
                 enemy.beamEffectMesh = null;
             }
        }
        // --- Конец функций для лучей ---


        // --- Проверка условий победы ---
        const checkWinCondition = () => {
            if (!levelData?.winCondition || isLoading || levelStatus !== 'playing') return;

             if (enemiesState.length === 0 && initialEnemyStates?.length > 0 && areEnemiesLoaded) {
                  if (levelData.winCondition.type === 'clear_enemies') {
                      console.log("Win Condition Check: clear_enemies MET (enemiesState became empty)!");
                      winLevel();
                      return;
                  }
             }

            const { type, duration } = levelData.winCondition;

            switch (type) {
                 case 'clear_enemies': {
                     const liveEnemies = enemiesState?.filter(e => e.currentHp > 0) || [];
                     if (liveEnemies.length === 0 && enemiesState.length > 0) { // Проверяем, что враги вообще были
                         console.log("Win Condition Check: clear_enemies MET!");
                         winLevel();
                     }
                     break;
                 }
                 case 'defeat_all_bosses': {
                      const liveBosses = enemiesState?.filter(e => e.isBoss && e.currentHp > 0) || [];
                      const wereBosses = enemiesState?.some(e => e.isBoss);
                      if (liveBosses.length === 0 && wereBosses) {
                          console.log("Win Condition Check: defeat_all_bosses MET!");
                          winLevel();
                      }
                      break;
                 }
                 case 'survive_duration': {
                      if (levelStartTimeRef.current && duration) {
                          const elapsed = (Date.now() - levelStartTimeRef.current) / 1000;
                          const timeLeft = duration - elapsed;
                          setRemainingTime(timeLeft > 0 ? timeLeft : 0);
                          if (timeLeft <= 0) {
                              console.log("Win Condition Check: survive_duration MET!");
                              winLevel();
                          }
                      }
                      break;
                 }
                 default:
                     break;
            }
        }; // --- Конец checkWinCondition ---

        // --- Главная функция кадра ---
        // --- Главная функция кадра ---
const animate = (timestamp) => {
    if (levelStatus !== 'playing') {
        console.log(`Game loop stopping. Status: ${levelStatus}`);
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
        clock.stop();
        return;
    }
    animationFrameId.current = requestAnimationFrame(animate);

    // Расчет дельта времени (dt)
    const dt = timestamp === 0 ? 0.016 : Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;

    const playerPos = playerObject?.position;
    const currentScene = sceneRef.current;
    const currentCamera = cameraRef.current;
    const currentRenderer = rendererRef.current;

    // Проверка наличия необходимых объектов
    if (!playerObject || !playerPos || !currentScene || !currentCamera || !currentRenderer || !levelConfig || !playerStats) {
        console.warn("Пропуск кадра: Отсутствуют необходимые объекты");
        return;
    }

    // ==================================
    // === 1. Обновление Игрока =======
    // ==================================
    const effectiveSpeed = (playerStats.speed || 3) * (velocity.current.force > 0.1 ? 1 : 0);
    const speedMultiplier = 60;

    if (effectiveSpeed > 0) {
        const dx = (velocity.current.x || 0) * effectiveSpeed * dt * speedMultiplier;
        const dy = (velocity.current.y || 0) * effectiveSpeed * dt * speedMultiplier;

        let nextX = playerPos.x + dx;
        let nextY = playerPos.y + dy;
        const PLAYER_SIZE = { width: 30, height: 30 };

        // Проверка коллизий игрока со стенами
        const pRect = { x: playerPos.x - PLAYER_SIZE.width / 2, y: playerPos.y - PLAYER_SIZE.height / 2, width: PLAYER_SIZE.width, height: PLAYER_SIZE.height };
        let colX = false;
        let colY = false;
        const pRectX = { ...pRect, x: nextX - PLAYER_SIZE.width / 2 };
        for (const wall of wallsRef.current) { if (checkCollision(pRectX, wall)) { colX = true; break; } }
        const pRectY = { ...pRect, y: nextY - PLAYER_SIZE.height / 2 };
        for (const wall of wallsRef.current) { if (checkCollision(pRectY, wall)) { colY = true; break; } }

        // Применение движения, если нет коллизий
        if (!colX) playerPos.x = nextX;
        if (!colY) playerPos.y = nextY;

        // Ограничение движения границами мира
        const pSizeHW = PLAYER_SIZE.width / 2;
        const pSizeHH = PLAYER_SIZE.height / 2;
        const minX = -levelConfig.gameWorldWidth / 2 + pSizeHW;
        const maxX = levelConfig.gameWorldWidth / 2 - pSizeHW;
        const minYw = -levelConfig.WORLD_Y_OFFSET + pSizeHH;
        const maxYw = levelConfig.gameWorldHeight - levelConfig.WORLD_Y_OFFSET - pSizeHH;
        playerPos.x = clamp(playerPos.x, minX, maxX);
        playerPos.y = clamp(playerPos.y, minYw, maxYw);

        // Плавный поворот игрока
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
            const angle = Math.atan2(dy, dx);
            let targetRotZ = angle - Math.PI / 2;
            const currentRotZ = playerObject.rotation.z;
            const twoPi = Math.PI * 2;
            let diff = targetRotZ - currentRotZ;
            while (diff < -Math.PI) diff += twoPi;
            while (diff > Math.PI) diff -= twoPi;
            const lerpFactor = 0.15;
            playerObject.rotation.z += diff * lerpFactor;
        }
        // TODO: Анимация ходьбы
    } else {
        // TODO: Анимация бездействия
    }
    playerObject.userData?.mixer?.update(dt); // Обновление миксера анимаций игрока

    // ==================================
    // === 2. Атака Игрока =============
    // ==================================
    playerAttackCooldown.current -= dt;
    if (playerAttackCooldown.current <= 0) {
        const interval = 1 / (playerStats.attackSpeed || 1.0);
        playerAttackCooldown.current = interval;
        const range = playerStats.attackRange || 150;
        const rangeSq = range * range;
        const target = findNearestEnemy(playerPos, rangeSq); // Находим ближайшего врага
        if (target) {
            createProjectile(target); // Создаем снаряд в сторону цели
            // TODO: Анимация атаки
        }
    }

    // ==================================
    // === 3. Снаряды Игрока ==========
    // ==================================
    const activeProjectiles = [];
    // Создаем хитбоксы для живых врагов
    const enemyHitboxes = enemyRefs?.map(enemy => {
        if (enemy?.pivot?.position && !enemy.isDead) {
            const size = 40; // TODO: брать из enemy.stats.hitboxSize?
            return {
                id: enemy.id,
                type: enemy.type,
                ref: enemy, // Для доступа к blockCharges
                x: enemy.pivot.position.x - size / 2,
                y: enemy.pivot.position.y - size / 2,
                width: size,
                height: size
            };
        } return null;
    }).filter(Boolean) || [];

    // Обновление и проверка коллизий снарядов игрока
    projectilesRef.current.forEach(proj => {
        proj.position.add(proj.velocity.clone().multiplyScalar(dt)); // Движение
        proj.lifetime -= dt; // Уменьшение времени жизни

        if (proj.mesh) proj.mesh.position.copy(proj.position); // Обновление позиции меша

        let hit = false;
        if (proj.lifetime > 0 && enemyHitboxes.length > 0) {
            const projSize = 8;
            const pHitbox = { x: proj.position.x - projSize / 2, y: proj.position.y - projSize / 2, width: projSize, height: projSize };

            // Проверка коллизии с хитбоксами врагов
            for (const eBox of enemyHitboxes) {
                if (checkCollision(pHitbox, eBox)) {
                    handleEnemyHit(eBox.id, proj.damage); // Обработка попадания
                    hit = true;
                    break;
                }
            }
        }

        // Если снаряд еще жив и никого не поразил, оставляем его
        if (proj.lifetime > 0 && !hit) {
            activeProjectiles.push(proj);
        } else { // Иначе удаляем меш из сцены и освобождаем ресурсы
            if (proj.mesh) {
                currentScene?.remove(proj.mesh);
                proj.mesh.geometry?.dispose();
                proj.mesh.material?.dispose();
            }
        }
    });
    projectilesRef.current = activeProjectiles; // Обновляем массив активных снарядов

    // ==================================
    // === 4. Обновление Врагов ========
    // ==================================
    enemyRefs?.forEach(enemy => {
        // 1. --- Получение данных и базовые проверки ---
        const enemyState = enemiesState?.find(es => es.id === enemy.id);

        if (!enemy || !enemy.pivot || !enemy.stats || enemy.isDead || !enemyState) {
            // Скрытие хелсбара и луча для мертвых или некорректных врагов
            if (enemy?.isDead && enemy.hpBar?.container?.visible) {
                enemy.hpBar.container.visible = false;
            }
            if (enemy?.isDead && enemy.beamEffectMesh) {
                removeBeamMesh(enemy);
            }
            return; // Пропускаем обработку этого врага
        }

        // 2. --- Проверка смерти в этом кадре ---
        if (enemyState.currentHp <= 0) {
            enemy.isDead = true; // Помечаем как мертвого
            console.log(`--- Враг ${enemy.id} (${enemy.type}) помечен как isDead (HP=${enemyState.currentHp}) ---`);

            // --- ЛОГИКА ПРИ СМЕРТИ (взята из code1) ---
            if (enemy.type === 'rotting_soldier' && !enemy.exploded) {
                console.log(`Rotting Soldier ${enemy.id} EXPLODES!`);
                const ePosOnDeath = enemy.pivot.position.clone();
                // TODO: Эффект взрыва

                // Урон игроку от взрыва
                if (enemy.stats.explosionDamage && typeof playerTakeDamage === 'function') {
                    const explosionRadius = enemy.stats.explosionRadius || 50;
                    const distToPlayer = ePosOnDeath.distanceTo(playerPos);
                    if (distToPlayer <= explosionRadius) {
                        console.log(`... Player takes ${enemy.stats.explosionDamage} explosion damage`);
                        playerTakeDamage(enemy.stats.explosionDamage);
                    }
                }
                // Создание облака яда
                createPoisonCloud(ePosOnDeath); // Вызов функции создания облака (нужно определить ее)
                enemy.exploded = true;
                if (enemy.pivot) enemy.pivot.visible = false; // Скрыть модель
                if (enemy.hpBar?.container) enemy.hpBar.container.visible = false; // Скрыть хелсбар
                return; // Завершаем обработку этого врага
            } else if (enemy.type === 'cursed_carrier') {
                console.log(`Cursed Carrier ${enemy.id} summons on death...`);
                // Вызов функции призыва (нужно определить ее)
                summonCreature(enemy.id, enemy.stats.summonOnDeathType || 'skeleton_spirit', enemy.stats.summonOnDeathCount || 1, enemy.pivot.position.clone());
            }

            // Убираем луч, если он был активен при смерти
            if (enemy.beamEffectMesh) removeBeamMesh(enemy);
            // TODO: Анимация смерти?
            return; // Завершаем обработку мертвого врага
        }

        // --- Если враг жив ---
        const ePivot = enemy.pivot;
        const ePos = ePivot.position;
        const eStats = enemy.stats;
        const mixer = enemy.mixer;

        // 3. --- Обновление анимаций ---
        mixer?.update(dt);

        // 4. --- Расчет дистанции до игрока ---
        const dist = ePos.distanceTo(playerPos);

        // 5. --- Обновление Хелсбара ---
        if (enemy.hpBar?.container && enemy.hpBar?.fill && enemyState.maxHp > 0) {
            const hpPercent = Math.max(0, enemyState.currentHp / enemyState.maxHp);
            const fillMesh = enemy.hpBar.fill;
            const container = enemy.hpBar.container;
            const newScaleX = Math.max(0.001, hpPercent); // Чтобы не было scale=0
            const newPosX = (HEALTH_BAR_WIDTH * (newScaleX - 1)) / 2;
            fillMesh.scale.x = newScaleX;
            fillMesh.position.x = newPosX;
            container.visible = true;
            // Поворот хелсбара к камере
            if (currentCamera) { container.quaternion.copy(currentCamera.quaternion); }
        } else if (enemy.hpBar?.container) {
            container.visible = false; // Скрываем, если нет данных
        }

        // 6. --- Обновление кулдаунов ---
        if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt;
        if (enemy.abilityCooldown > 0) enemy.abilityCooldown -= dt;
        if (typeof enemy.beamEffectTimer === 'number' && enemy.beamEffectTimer > 0) {
            enemy.beamEffectTimer -= dt;
            if (enemy.beamEffectTimer <= 0) {
                removeBeamMesh(enemy); // Удаляем эффект луча по таймеру
            }
        }

        // 7. --- Вспомогательные функции для ИИ ---
        const rotateEnemyTowards = (targetPosition, rotationSpeed = 0.08) => {
             const direction = new THREE.Vector3().subVectors(targetPosition, ePos);
             if (direction.lengthSq() < 0.01) return; // Не поворачивать, если цель близко
             const angle = Math.atan2(direction.y, direction.x);
             let targetZ = angle - Math.PI / 2; // Коррекция для модели, смотрящей по Y
             const currentZ = ePivot.rotation.z;
             const twoPi = Math.PI * 2;
             let diff = targetZ - currentZ;
             // Нормализация разницы углов (-PI, PI]
             while (diff <= -Math.PI) diff += twoPi;
             while (diff > Math.PI) diff -= twoPi;
             const threshold = 0.05; // Порог для мгновенного поворота
             if (Math.abs(diff) > threshold) {
                 ePivot.rotation.z += diff * rotationSpeed; // Плавный поворот
             } else {
                 ePivot.rotation.z = targetZ; // Точный поворот
             }
             // Убедиться, что вращение только по Z
             ePivot.rotation.order = 'XYZ';
             ePivot.rotation.x = 0;
             ePivot.rotation.y = 0;
        };

        const ENEMY_COLLISION_SIZE = { width: 30, height: 30 }; // Размер для коллизий врага

        const moveEnemyWithCollision = (directionVector, speedValue) => {
             if (speedValue <= 0) return { collidedX: false, collidedY: false };
             const moveDir = directionVector.clone().normalize();
             const moveAmount = speedValue * dt * 60; // Общее смещение за кадр (60 FPS база)

             const nextX = ePos.x + moveDir.x * moveAmount;
             const nextY = ePos.y + moveDir.y * moveAmount; // Исправлено: Умножить на moveDir.y

             const enemyHitbox = {
                 x: ePos.x - ENEMY_COLLISION_SIZE.width / 2,
                 y: ePos.y - ENEMY_COLLISION_SIZE.height / 2,
                 width: ENEMY_COLLISION_SIZE.width,
                 height: ENEMY_COLLISION_SIZE.height
             };

             // Проверка по X
             const nextHitboxX = { ...enemyHitbox, x: nextX - ENEMY_COLLISION_SIZE.width / 2 };
             let canMoveX = true;
             for (const wall of wallsRef.current) {
                 if (checkCollision(nextHitboxX, wall)) {
                     canMoveX = false;
                     break;
                 }
             }

             // Проверка по Y
             const nextHitboxY = { ...enemyHitbox, y: nextY - ENEMY_COLLISION_SIZE.height / 2 };
             let canMoveY = true;
             for (const wall of wallsRef.current) {
                 if (checkCollision(nextHitboxY, wall)) {
                     canMoveY = false;
                     break;
                 }
             }

             // Применяем движение
             if (canMoveX) { ePos.x = nextX; }
             if (canMoveY) { ePos.y = nextY; }

             // Ограничение по границам мира (после коллизий со стенами)
             const eSizeHW = ENEMY_COLLISION_SIZE.width / 2;
             const eSizeHH = ENEMY_COLLISION_SIZE.height / 2;
             const minXb = -levelConfig.gameWorldWidth / 2 + eSizeHW;
             const maxXb = levelConfig.gameWorldWidth / 2 - eSizeHW;
             const minYwb = -levelConfig.WORLD_Y_OFFSET + eSizeHH;
             const maxYwb = levelConfig.gameWorldHeight - levelConfig.WORLD_Y_OFFSET - eSizeHH;
             ePos.x = clamp(ePos.x, minXb, maxXb);
             ePos.y = clamp(ePos.y, minYwb, maxYwb);

             return { collidedX: !canMoveX, collidedY: !canMoveY };
        };


        // 8. --- ЛОГИКА ИИ (по типам врагов) ---
        let isAttacking = false; // Флаг для использования в других системах, если нужно

        switch (enemy.type) {

            // --- ОБНОВЛЕННЫЙ CASE ДЛЯ МИЛИ-ПОДОБНЫХ (Объединение логики) ---
            case 'melee':
            case 'boss':
            case 'skeleton_swordsman':
            case 'cursed_gladiator':
            case 'revenant_knight':
            case 'rotting_soldier': // Поведение до взрыва - как у мили
            case 'cursed_carrier':  // Поведение до призыва - как у мили
            {
                // --- 1. Получаем данные и рассчитываем условия ---
                const eStats = enemy.stats;
                const atkRange = eStats.attackRange || 25;
                const aggroRange = atkRange * (eStats.aggroMultiplier || 5);
                const playerInAttackRange = dist <= atkRange;
                const playerInAggroRange = dist <= aggroRange;

                // Инициализация состояния и позиции спавна
                if (!enemy.aiState) enemy.aiState = 'IDLE';
                if (!enemy.spawnPosition) enemy.spawnPosition = ePos.clone();
                const spawnPos = enemy.spawnPosition;
                const distToSpawn = spawnPos ? ePos.distanceTo(spawnPos) : 0;

                // --- 2. Логика Переключения Состояний ---
                let nextState = enemy.aiState;
                const returnDelay = 3500; // мс - время ожидания перед возвратом

                switch (enemy.aiState) {
                    case 'IDLE':
                        if (playerInAggroRange) {
                            nextState = 'CHASING';
                            enemy.chaseEndTime = null; // Сброс таймера возврата
                        }
                        break;

                    case 'CHASING':
                        if (playerInAttackRange) {
                            nextState = 'ATTACKING';
                            enemy.chaseEndTime = null;
                        } else if (!playerInAggroRange) { // Игрок вне радиуса аггро
                            if (!enemy.chaseEndTime) { // Запускаем таймер, если еще не запущен
                                enemy.chaseEndTime = Date.now() + returnDelay;
                                console.log(`Enemy ${enemy.id} потерял игрока, таймер возврата запущен.`);
                            }
                            if (Date.now() >= enemy.chaseEndTime) { // Таймер истек
                                nextState = 'RETURNING';
                                console.log(`Enemy ${enemy.id} возвращается на базу.`);
                                enemy.chaseEndTime = null;
                            }
                            // Если таймер идет - продолжаем погоню (nextState не меняется)
                        } else { // Игрок снова в радиусе аггро
                            enemy.chaseEndTime = null; // Сбрасываем таймер, если он был
                            // nextState остается 'CHASING'
                        }
                        break;

                    case 'ATTACKING':
                        if (!playerInAttackRange) {
                            nextState = 'CHASING'; // Догонять снова
                        }
                        // Если в КД или не может атаковать - остается в ATTACKING (анимация другая)
                        break;

                    case 'RETURNING':
                        if (playerInAggroRange) {
                            nextState = 'CHASING'; // Снова агрится
                            enemy.chaseEndTime = null;
                        } else if (distToSpawn < 10) { // Добрался до базы
                            nextState = 'IDLE';
                             ePos.copy(spawnPos); // Точно ставим на спавн
                             ePivot.rotation.z = enemy.spawnRotationZ || 0; // Возвращаем исходный поворот (если есть)
                             console.log(`Enemy ${enemy.id} вернулся.`);
                        }
                        // Иначе продолжает возвращаться (nextState не меняется)
                        break;
                }
                enemy.aiState = nextState;

                // --- 3. Выполнение Действий на основе Текущего Состояния ---
                let shouldMove = false;
                let moveTargetPos = null;
                let shouldRotate = false;
                let rotateTargetPos = null;
                let isAttackingNow = false;
                let currentMoveSpeed = eStats.speed || 1.5; // Скорость по умолчанию
                let canAttack = true; // Флаг для блока рыцаря

                // Логика блока Рыцаря
                if (enemy.type === 'revenant_knight') {
                    if (typeof enemy.blockCharges === 'undefined') enemy.blockCharges = eStats.initialBlockCharges || 0;
                    if (enemy.blockCharges > 0) {
                        canAttack = false; // Не может атаковать с блоком
                         // TODO: Анимация BlockIdle / BlockWalk ?
                    }
                    // Отображение щита
                    if (enemy.shieldMesh) enemy.shieldMesh.visible = enemy.blockCharges > 0;
                 }

                 // Определяем действия для текущего состояния
                 switch (enemy.aiState) {
                     case 'IDLE':
                         shouldMove = false;
                         shouldRotate = false; // Можно не поворачивать
                         // TODO: Анимация Idle (или BlockIdle для рыцаря)
                         break;
                     case 'CHASING':
                         shouldMove = true;
                         moveTargetPos = playerPos.clone();
                         shouldRotate = true;
                         rotateTargetPos = playerPos.clone();
                         currentMoveSpeed = eStats.speed || 1.5;
                         // TODO: Анимация Walk (или BlockWalk для рыцаря)
                         break;
                     case 'ATTACKING':
                         shouldMove = false; // Не двигается во время атаки
                         shouldRotate = true;
                         rotateTargetPos = playerPos.clone();
                         if (enemy.attackCooldown <= 0 && canAttack) {
                             isAttackingNow = true; // Готов атаковать
                             // TODO: Анимация Attack
                         } else {
                             // TODO: Анимация Idle или конец атаки (или BlockIdle)
                         }
                         break;
                     case 'RETURNING':
                         shouldMove = true;
                         moveTargetPos = spawnPos.clone();
                         shouldRotate = true;
                         rotateTargetPos = spawnPos.clone();
                         currentMoveSpeed = (eStats.speed || 1.5) * 0.8; // Возвращается чуть медленнее?
                         // TODO: Анимация Walk
                         break;
                 }

                 // --- 4. Выполняем Атаку (если isAttackingNow=true) ---
                 if (isAttackingNow) {
                     let currentDamage = eStats.damage || 5;
                     // TODO: Логика Гладиатора (урон зависит от HP?)
                     // if (enemy.type === 'cursed_gladiator') { /* ... */ }
                     console.log(`${enemy.id} (${enemy.type}) attacks player! Damage: ${currentDamage}`);
                     if (typeof playerTakeDamage === 'function') playerTakeDamage(currentDamage);
                     enemy.attackCooldown = 1 / (eStats.attackSpeed || 1.0); // Сброс кулдауна
                 }

                 // --- 5. Выполняем Движение и Коллизии ---
                 if (shouldMove && moveTargetPos) {
                    const direction = new THREE.Vector3().subVectors(moveTargetPos, ePos);
                    moveEnemyWithCollision(direction, currentMoveSpeed);
                 }

                 // --- 6. Выполняем Поворот ---
                 if (shouldRotate && rotateTargetPos) {
                     rotateEnemyTowards(rotateTargetPos);
                 }

                 // --- 7. Логика Носильщика (Спаун по КД Способности) ---
                  if (enemy.type === 'cursed_carrier' && enemy.abilityCooldown <= 0) {
                     // Спаунит, если игрок в радиусе аггро? Или всегда? Допустим, всегда, если не возвращается.
                     if (enemy.aiState !== 'RETURNING') {
                          console.log(`Carrier ${enemy.id} summons...`);
                          summonCreature(enemy.id, eStats.summonType || 'skeleton_swordsman', eStats.summonCount || 1, ePos.clone());
                          enemy.abilityCooldown = eStats.summonCooldown || 15.0; // Сброс КД способности
                          // TODO: Анимация призыва?
                     }
                  }

                break; // Конец case для мили-подобных
            } // Конец блока {}


            // === ДАЛЬНИЙ БОЙ (Снаряды - Лучник) ===
            case 'ranged':
            case 'skeleton_archer':
            {
                const eStats = enemy.stats;
                const atkRange = eStats.attackRange || 100;
                const playerInAttackRange = dist <= atkRange;
                const currentMoveSpeed = eStats.speed || 1.0; // Базовая скорость

                // Инициализация для патрулирования
                if (typeof enemy.patrolWaitTimer === 'undefined') enemy.patrolWaitTimer = 0;
                if (!enemy.patrolTargetPosition) enemy.patrolTargetPosition = null;
                if (!enemy.spawnPosition) enemy.spawnPosition = ePos.clone();

                let shouldRotate = false;
                let rotateTargetPos = null;
                let shouldMove = false;
                let moveTargetPos = null;
                let isAttackingNow = false;

                if (playerInAttackRange) {
                    // --- Логика Атаки ---
                    shouldRotate = true;
                    rotateTargetPos = playerPos.clone();
                    enemy.patrolTargetPosition = null; // Прерываем патруль
                    enemy.patrolWaitTimer = 0;
                    shouldMove = false; // Стоит на месте при атаке

                    if (enemy.attackCooldown <= 0) {
                        isAttackingNow = true;
                        // TODO: Анимация атаки
                    } else {
                        // TODO: Анимация Idle/Aim
                    }
                } else {
                    // --- Логика Патрулирования ---
                    if (enemy.patrolWaitTimer > 0) {
                        // Ждем на месте
                        enemy.patrolWaitTimer -= dt;
                        shouldMove = false;
                        shouldRotate = false;
                        // TODO: Анимация Idle
                    } else if (enemy.patrolTargetPosition) {
                        // Идем к точке патруля
                        const distToPatrolTarget = ePos.distanceTo(enemy.patrolTargetPosition);
                        if (distToPatrolTarget < 10) { // Дошли
                            console.log(`Enemy ${enemy.id} reached patrol point.`);
                            enemy.patrolTargetPosition = null;
                            enemy.patrolWaitTimer = 1.5 + Math.random() * 2; // Ждем
                            shouldMove = false;
                            shouldRotate = false;
                            // TODO: Анимация Idle
                        } else { // Продолжаем идти
                            shouldMove = true;
                            moveTargetPos = enemy.patrolTargetPosition.clone();
                            shouldRotate = true; // Поворот по ходу движения
                            rotateTargetPos = enemy.patrolTargetPosition.clone();
                            // TODO: Анимация Walk
                        }
                    } else {
                        // Выбираем новую точку патруля
                        const PATROL_RADIUS = 150;
                        const randomAngle = Math.random() * Math.PI * 2;
                        const randomDist = Math.random() * PATROL_RADIUS;
                        // Рассчитываем точку вокруг спавна
                        const targetX = enemy.spawnPosition.x + Math.cos(randomAngle) * randomDist;
                        const targetY = enemy.spawnPosition.y + Math.sin(randomAngle) * randomDist;
                        const newTarget = new THREE.Vector3(targetX, targetY, 0);
                        // TODO: Проверить на коллизию с окружением перед установкой? (сложнее)
                        enemy.patrolTargetPosition = newTarget;
                        console.log(`Enemy ${enemy.id} new patrol target: (${targetX.toFixed(0)}, ${targetY.toFixed(0)})`);

                        shouldMove = true; // Начинаем идти к ней
                        moveTargetPos = enemy.patrolTargetPosition.clone();
                        shouldRotate = true;
                        rotateTargetPos = enemy.patrolTargetPosition.clone();
                        // TODO: Анимация Walk
                    }
                }

                 // --- Выполняем Атаку (если надо) ---
                 if (isAttackingNow) {
                     console.log(`${enemy.id} firing projectile!`);
                     // createEnemyProjectile(enemy, playerPos); // Нужна функция создания снаряда врага
                     enemy.attackCooldown = 1 / (eStats.attackSpeed || 0.8);
                 }

                 // --- Выполняем Движение ---
                 if (shouldMove && moveTargetPos) {
                     const direction = new THREE.Vector3().subVectors(moveTargetPos, ePos);
                     moveEnemyWithCollision(direction, currentMoveSpeed);
                 }

                 // --- Выполняем Поворот ---
                 if (shouldRotate && rotateTargetPos) {
                     rotateEnemyTowards(rotateTargetPos);
                 }

                break; // Конец case лучника
            } // Конец {}


            // === КАСТЕРЫ (Маги, Чародеи и т.д.) ===
            case 'caster':
            case 'ghostly_enchanter':
            case 'ogre_mage':
            {
                 const currentAtkRange = eStats.attackRange || 300;
                 const isPlayerInAttackRange = dist <= currentAtkRange;

                 if (isPlayerInAttackRange) {
                     rotateEnemyTowards(playerPos); // Поворот к цели
                     // Атака по КД
                     if (enemy.attackCooldown <= 0) {
                         enemy.attackCooldown = 1 / (eStats.attackSpeed || 0.5);
                         // TODO: playAnimation('Attack');

                         if (enemy.type === 'ogre_mage') {
                             const targetPoint = playerPos.clone(); // Стреляет в текущую позицию
                             console.log(`Ogre Mage ${enemy.id} attacks target point!`);
                             // createProjectileToPoint(enemy.id, ePos.clone(), targetPoint, eStats.damage || 10, eStats.projectileSpeed || 400); // Нужна эта функция
                         } else if (enemy.type === 'ghostly_enchanter') {
                             console.log(`Enchanter ${enemy.id} applies weaken!`);
                             // applyPlayerDebuff(enemy.id, 'weaken', eStats.debuffDuration || 5, eStats.debuffStrength || 0.2); // Нужна эта функция
                             // TODO: Визуализация луча ослабления?
                         } else { // Обычные маги огня/льда
                             if (typeof playerTakeDamage === 'function') playerTakeDamage(eStats.beamDamage || 1); // Мгновенный урон луча?
                             // TODO: Наложить DoT/Freeze эффекты, если есть
                             // Показываем/обновляем луч
                             if (enemy.beamEffectMesh) removeBeamMesh(enemy); // Убираем старый, если был
                             enemy.beamEffectMesh = createBeamMeshFixed(enemy, playerPos); // Нужна эта функция
                             if (enemy.beamEffectMesh) enemy.beamEffectTimer = eStats.beamEffectDuration || 1.0; // Запускаем таймер видимости
                         }
                     } else {
                         // Обновляем существующий луч, если это маг огня/льда и луч активен
                         if (enemy.beamEffectMesh && (enemy.type === 'caster')) {
                             updateBeamMesh(enemy.beamEffectMesh, ePos, playerPos); // Нужна эта функция
                         }
                         // TODO: playAnimation('Idle'); // Или Aim?
                     }
                 } else { // Игрок вне радиуса
                     if (enemy.beamEffectMesh) removeBeamMesh(enemy); // Убираем луч
                     // TODO: playAnimation('Idle');
                     // Можно добавить логику патрулирования, как у лучника?
                 }
                 break; // Конец case кастеров
            } // Конец {}


            // === УНИКАЛЬНЫЕ НОВЫЕ ТИПЫ (из code1) ===

            case 'necromancer': {
                 rotateEnemyTowards(playerPos); // Всегда смотрит на игрока
                 // Призыв по кулдауну способности
                 if (enemy.abilityCooldown <= 0) {
                     console.log(`Necromancer ${enemy.id} summons ${eStats.summonCount || 1} ${eStats.summonType || 'skeleton_spirit'}!`);
                     summonCreature(enemy.id, eStats.summonType || 'skeleton_spirit', eStats.summonCount || 1, ePos.clone());
                     enemy.abilityCooldown = eStats.summonCooldown || 10.0;
                     // TODO: playAnimation('Summon');
                 } else {
                     // TODO: playAnimation('Idle');
                 }
                 // Можно добавить движение уклонения или патрулирование?
                 break;
            }
            case 'bone_dancer': {
                const eStats = enemy.stats;
 
                // --- Параметры из последнего запроса ---
                const baseSpeed = (eStats.speed || 3.5) * 60; // Скорость в юнитах/сек
                const rotationLerp = 0.15; // Плавность поворота чуть выше
                const activationRange = eStats.activationRange || 200; // Уменьшим радиус агро
                const chargeSpeedMultiplier = eStats.chargeMultiplier || 3.0; // Увеличим скорость рывка
                const chargeDuration = eStats.chargeDuration || 0.25;    // Уменьшим длительность рывка
                const desiredOrbitDist = eStats.orbitDistance || 60;     // Дистанция орбиты (осталась 60)
                // const radialCorrectionStrength = 1.8; // <<< Убрано, т.к. логика орбиты полностью заменена
 
                // --- Флаги и переменные для управления ---
                let shouldMove = false;
                let shouldRotate = true;
                let moveTargetPos = null; // Используется для движения к точке (в CHARGING и новой ORBITING)
                let rotateTargetPos = playerPos.clone(); // По умолчанию смотрим на игрока
                let currentMoveSpeed = baseSpeed; // Скорость по умолчанию
 
                // --- Расчеты расстояний (оставляем из предыдущей версии) ---
                const vectorToPlayer = new THREE.Vector3().subVectors(playerPos, ePos);
                const currentDistToPlayer = vectorToPlayer.length(); // <<< Используем это имя переменной
                // const distToSpawn = ePos.distanceTo(enemy.spawnPosition); // <<< Убрано, т.к. RETURNING удален
 
                // --- Инициализация состояния ИИ и переменных ---
                if (!enemy.aiState) enemy.aiState = 'IDLE';
                if (typeof enemy.chargeTimer === 'undefined') enemy.chargeTimer = 0;
                if (!enemy.spawnPosition) enemy.spawnPosition = ePos.clone();
                // Инициализация orbitDirection перенесена в переход из CHARGING в ORBITING
 
                // --- Логика состояний Танцора (обновленная) ---
                switch (enemy.aiState) {
                    case 'IDLE':
                        shouldMove = false;
                        shouldRotate = false;
                        // TODO: Анимация Idle
 
                        // Используем currentDistToPlayer вместо dist для ясности
                        if (currentDistToPlayer <= activationRange) {
                            console.log(`Bone Dancer ${enemy.id} activated! Charging!`); // <<< Добавлен console.log
                            enemy.aiState = 'CHARGING';
                            enemy.chargeTargetPos = playerPos.clone();
                            enemy.chargeTimer = 0;
                        }
                        break;
 
                    case 'CHARGING':
                        shouldMove = true;
                        shouldRotate = true;
                        moveTargetPos = enemy.chargeTargetPos || playerPos.clone();
                        rotateTargetPos = moveTargetPos; // В рывке смотрим на цель рывка
                        currentMoveSpeed = baseSpeed * chargeSpeedMultiplier; // Увеличенная скорость
                        // TODO: Анимация рывка
 
                        enemy.chargeTimer += dt;
                        if (enemy.chargeTimer >= chargeDuration) {
                            console.log(`Bone Dancer ${enemy.id} finished charge, orbiting.`); // <<< Добавлен console.log
                            enemy.aiState = 'ORBITING';
                            enemy.chargeTimer = 0;
                            // >>> Инициализируем направление орбиты при переходе <<<
                            enemy.orbitDirection = (Math.random() < 0.5 ? 1 : -1);
                        }
                        break;
 
                    case 'ORBITING':
                        // >>> Полностью новая логика ORBITING из последнего запроса <<<
                        shouldMove = true;
                        shouldRotate = true;
                        rotateTargetPos = playerPos.clone(); // Всегда смотрим на игрока во время орбиты
                        // TODO: Анимация бега/кружения
 
                        // Используем currentDistToPlayer вместо currentDist
                        if (currentDistToPlayer > 0.1) {
                            // --- Новая логика расчета точки для движения ---
 
                            // Вектор К игроку (нужен для normTangentDir)
                            const normDirToPlayer = vectorToPlayer.clone().normalize(); // Пересчитываем на всякий случай или берем извне switch
 
                            // 1. Вектор от игрока к врагу и его нормаль
                            // Используем clone(), чтобы не менять исходный vectorToPlayer
                            let vecPlayerToEnemy = vectorToPlayer.clone().negate(); // vectorToPlayer = player - enemy => negate = enemy - player
                            const normVecPlayerToEnemy = vecPlayerToEnemy.normalize(); // Нормализуем вектор ОТ игрока
 
                            // 2. Идеальная точка на орбите (на нужной дистанции от игрока)
                            const idealOrbitPoint = playerPos.clone().add(normVecPlayerToEnemy.multiplyScalar(desiredOrbitDist));
 
                            // 3. Тангенциальное направление в текущей точке врага
                            // enemy.orbitDirection инициализируется при переходе в ORBITING
                            // Используем normDirToPlayer (вектор к игроку) для расчета перпендикуляра
                            const normTangentDir = new THREE.Vector3(-normDirToPlayer.y, normDirToPlayer.x, 0).multiplyScalar(enemy.orbitDirection);
 
                            // 4. Вектор от текущей позиции к идеальной орбитальной
                            const vecToIdealOrbit = new THREE.Vector3().subVectors(idealOrbitPoint, ePos);
                            const distToIdealOrbit = vecToIdealOrbit.length();
 
                            // 5. Комбинируем движение:
                            const tangentVelocity = normTangentDir.clone().multiplyScalar(baseSpeed); // clone() важен
                            // Скорость коррекции дистанции
                            const correctionSpeed = Math.min(baseSpeed, distToIdealOrbit * 2.0); // Ограничим макс. скорость коррекции
                            const correctionVelocity = vecToIdealOrbit.normalize().multiplyScalar(correctionSpeed); // clone() не нужен, vecToIdealOrbit больше не используется
 
                            // Суммируем векторы скорости
                            const finalVelocity = tangentVelocity.add(correctionVelocity); // tangentVelocity изменяется
                            finalVelocity.clampLength(0, baseSpeed * 1.5); // Ограничим макс. итоговую скорость
 
                            // --- Рассчитываем цель для этого кадра ---
                            moveTargetPos = ePos.clone().add(finalVelocity.clone().multiplyScalar(dt)); // clone() чтобы не менять finalVelocity перед .length()
                            currentMoveSpeed = finalVelocity.length(); // Обновляем скорость для коллизий
 
                            if (currentMoveSpeed < 1) { // Если почти не движемся
                                shouldMove = false;
                                // shouldRotate = false; // <<< В новом коде поворот НЕ отключается здесь, враг продолжает смотреть на игрока
                            }
                            // --- Переход в RETURNING убран ---
 
                        } else { // Стоим на игроке
                            shouldMove = false;
                            shouldRotate = false; // Не двигаемся и не поворачиваемся (остается смотреть куда смотрел)
                        }
                        break; // Конец case 'ORBITING'
 
                    // --- СОСТОЯНИЕ RETURNING УДАЛЕНО ---
 
                } // --- Конец switch(enemy.aiState) ---
 
 
                // --- Выполняем Движение (Общий блок) ---
                if (shouldMove && moveTargetPos) {
                    let moveDir = new THREE.Vector3().subVectors(moveTargetPos, ePos);
                    const distToTarget = moveDir.length();
 
                    // Используем порог 0.01 из последнего запроса
                    if (distToTarget > 0.01) {
                        moveDir.normalize();
                        // Используем currentMoveSpeed, который теперь корректно устанавливается и в ORBITING
                        const step = Math.min(currentMoveSpeed * dt, distToTarget);
 
                        const calculatedNextX = ePos.x + moveDir.x * step;
                        const calculatedNextY = ePos.y + moveDir.y * step;
 
                        // --- Проверка коллизий со стенами (без изменений) ---
                        const ENEMY_COLLISION_RADIUS = eStats.collisionRadius || 15;
                        const enemyHitbox = { x: ePos.x - ENEMY_COLLISION_RADIUS, y: ePos.y - ENEMY_COLLISION_RADIUS, width: ENEMY_COLLISION_RADIUS * 2, height: ENEMY_COLLISION_RADIUS * 2 };
 
                        let finalNextX = ePos.x;
                        let finalNextY = ePos.y;
 
                        // Проверка по X
                        const nextHitboxX = { ...enemyHitbox, x: calculatedNextX - ENEMY_COLLISION_RADIUS };
                        let canMoveX = true;
                        if (wallsRef && wallsRef.current) {
                            for (const wall of wallsRef.current) {
                                if (checkCollision(nextHitboxX, wall)) {
                                    canMoveX = false; break;
                                }
                            }
                        }
                        if (canMoveX) { finalNextX = calculatedNextX; }
 
                        // Проверка по Y
                        const nextHitboxY = { x: finalNextX - ENEMY_COLLISION_RADIUS, y: calculatedNextY - ENEMY_COLLISION_RADIUS, width: ENEMY_COLLISION_RADIUS * 2, height: ENEMY_COLLISION_RADIUS * 2 };
                        let canMoveY = true;
                        if (wallsRef && wallsRef.current) {
                             for (const wall of wallsRef.current) {
                                 if (checkCollision(nextHitboxY, wall)) {
                                     canMoveY = false; break;
                                 }
                             }
                        }
                        if (canMoveY) { finalNextY = calculatedNextY; }
 
                        // Применяем движение
                        ePos.x = finalNextX;
                        ePos.y = finalNextY;
 
                        // --- Clamp по границам мира (без изменений) ---
                        if (levelConfig && typeof levelConfig.gameWorldWidth !== 'undefined' && typeof levelConfig.gameWorldHeight !== 'undefined' && typeof levelConfig.WORLD_Y_OFFSET !== 'undefined') {
                            const minX = -levelConfig.gameWorldWidth / 2 + ENEMY_COLLISION_RADIUS;
                            const maxX = levelConfig.gameWorldWidth / 2 - ENEMY_COLLISION_RADIUS;
                            const minYw = -levelConfig.WORLD_Y_OFFSET + ENEMY_COLLISION_RADIUS;
                            const maxYw = levelConfig.gameWorldHeight - levelConfig.WORLD_Y_OFFSET - ENEMY_COLLISION_RADIUS;
                            ePos.x = clamp(ePos.x, minX, maxX);
                            ePos.y = clamp(ePos.y, minYw, maxYw);
                        }
                    }
                }
                // Плавное возвращение на спавн в IDLE убрано, так как RETURNING удален и логика не требуется
 
                // --- Выполняем Поворот (Общий блок) ---
                if (shouldRotate && rotateTargetPos) {
                    let dirRot = new THREE.Vector3().subVectors(rotateTargetPos, ePos);
                    if (dirRot.lengthSq() > 0.001) { // Порог из предыдущей версии, можно оставить
                        const angle = Math.atan2(dirRot.y, dirRot.x);
                        let targetZ = angle - Math.PI / 2; // Модель смотрит вверх (по +Y)
 
                        const curZ = ePivot.rotation.z;
                        const twoPi = Math.PI * 2;
                        let rotationDiff = targetZ - curZ;
 
                        while (rotationDiff <= -Math.PI) rotationDiff += twoPi;
                        while (rotationDiff > Math.PI) rotationDiff -= twoPi;
 
                        const rotationThreshold = 0.01;
                        if (Math.abs(rotationDiff) > rotationThreshold) {
                            // Используем обновленный rotationLerp
                            ePivot.rotation.z += rotationDiff * rotationLerp; // rotationLerp = 0.15
                        } else {
                            ePivot.rotation.z = targetZ;
                        }
                        ePivot.rotation.z %= twoPi;
 
                        ePivot.rotation.order = 'XYZ';
                        ePivot.rotation.x = 0;
                        ePivot.rotation.y = 0;
                    }
                }
 
                // --- Обновление анимации (упрощено без RETURNING) ---
                let nextActionName = 'Idle'; // По умолчанию
                if (enemy.aiState === 'IDLE') {
                    nextActionName = enemy.actions?.Idle ? 'Idle' : 'idle';
                } else if (enemy.aiState === 'CHARGING') {
                    nextActionName = enemy.actions?.Run ? 'Run' : 'walk'; // Или спец. анимация рывка
                } else if (enemy.aiState === 'ORBITING') {
                    // Анимация зависит от скорости на орбите
                    // Используем 'Run' если скорость > 80% от базовой, иначе 'Walk'
                    if(currentMoveSpeed > baseSpeed * 0.8 && enemy.actions?.Run) nextActionName = 'Run';
                    else nextActionName = enemy.actions?.Walk ? 'Walk' : 'walk';
                }
 
                // Если стоим на месте, но не в IDLE (например, на орбите очень близко или застряли)
                if (!shouldMove && enemy.aiState !== 'IDLE') {
                   nextActionName = enemy.actions?.Idle ? 'Idle' : 'idle';
                }
                // switchAction(enemy, nextActionName); // Вызов переключения анимации
 
                break; // Конец case bone_dancer
            } // Конец блока {}

            case 'plague_totemist': {
                 rotateEnemyTowards(playerPos); // Смотрит на игрока
                 // Ставит тотем по кулдауну способности
                 if (enemy.abilityCooldown <= 0) {
                     console.log(`Totemist ${enemy.id} places a ${eStats.totemType || 'debuff'} totem!`);
                     // placeTotem(enemy.id, ePos.clone(), eStats.totemType || 'debuff_slow', eStats.totemDuration || 15.0, eStats.totemRange || 120, eStats.totemEffect || { slowPercent: 0.3 }); // Нужна эта функция
                     enemy.abilityCooldown = eStats.totemCooldown || 12.0;
                     // TODO: playAnimation('Cast');
                 } else {
                     // TODO: playAnimation('Idle');
                 }
                 // Обычно неподвижен? Или может патрулировать?
                 break;
            }

            case 'sand_reaper': {
                 rotateEnemyTowards(playerPos); // Смотрит на игрока
                 // Кастует шипы по кулдауну способности
                 if (enemy.abilityCooldown <= 0) {
                     console.log(`Sand Reaper ${enemy.id} summons spikes under player!`);
                     // triggerGroundSpikes(enemy.id, playerPos.clone(), eStats.spikeDelay || 1.0, eStats.spikeRadius || 30, eStats.spikeDamage || 15); // Нужна эта функция
                     enemy.abilityCooldown = eStats.abilityCooldown || 5.0;
                     // TODO: playAnimation('Cast');
                 } else {
                     // TODO: playAnimation('Idle');
                 }
                 // Обычно неподвижен?
                 break;
            }

            case 'poison_cultist': {
                 rotateEnemyTowards(playerPos); // Смотрит на игрока
                 const currentAtkRange = eStats.attackRange || 200;
                 const isPlayerInAttackRange = dist <= currentAtkRange;

                 // Атакует в радиусе по КД способности
                 if (isPlayerInAttackRange && enemy.abilityCooldown <= 0) {
                     console.log(`Cultist ${enemy.id} throws poison puddle!`);
                     // createPoisonPuddle(enemy.id, playerPos.clone(), eStats.puddleDuration || 10.0, eStats.puddleRadius || 50, eStats.puddleDps || 3); // Нужна эта функция
                     enemy.abilityCooldown = eStats.abilityCooldown || 8.0;
                     // TODO: playAnimation('Attack');
                 } else {
                     // TODO: playAnimation('Idle');
                 }
                 // Патрулирует или стоит?
                 break;
            }

            default:
                console.warn(`Неизвестный или необработанный тип врага в switch: ${enemy.type}`);
                // TODO: playAnimation('Idle');
                break;
        } // --- Конец switch(enemy.type) ---

    }); // --- Конец enemyRefs.forEach ---


    // ==================================
    // === 5. Снаряды Врагов ==========
    // ==================================
    const activeEnemyProjectiles = [];
    const PLAYER_HITBOX_SIZE = { width: 25, height: 25 }; // Хитбокс игрока для снарядов врага
    const playerHitboxForEnemyProj = playerObject ? {
        x: playerPos.x - PLAYER_HITBOX_SIZE.width / 2,
        y: playerPos.y - PLAYER_HITBOX_SIZE.height / 2,
        width: PLAYER_HITBOX_SIZE.width,
        height: PLAYER_HITBOX_SIZE.height
    } : null;

    // Обработка снарядов врагов, только если игрок жив
    if (playerHitboxForEnemyProj && playerHp > 0) {
        enemyProjectilesRef.current.forEach(proj => {
            proj.position.add(proj.velocity.clone().multiplyScalar(dt)); // Движение
            proj.lifetime -= dt; // Уменьшение времени жизни
            if (proj.mesh) {
                proj.mesh.position.copy(proj.position); // Обновление меша
                // Поворот меша по направлению движения
                proj.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), proj.velocity.clone().normalize());
            }

            let hitPlayer = false;
            if (proj.lifetime > 0) {
                const projSize = 10; // Размер хитбокса снаряда врага
                const projHitbox = { x: proj.position.x - projSize / 2, y: proj.position.y - projSize / 2, width: projSize, height: projSize };
                if (checkCollision(projHitbox, playerHitboxForEnemyProj)) {
                    if (typeof playerTakeDamage === 'function') {
                        playerTakeDamage(proj.damage); // Наносим урон игроку
                    } else { console.error("playerTakeDamage is not a function!"); }
                    hitPlayer = true;
                }
                // TODO: Проверка коллизии со стенами для снарядов врага?
            }

            // Оставляем снаряд, если он жив и не попал
            if (proj.lifetime > 0 && !hitPlayer) {
                activeEnemyProjectiles.push(proj);
            } else { // Удаляем меш
                if (proj.mesh) {
                    currentScene?.remove(proj.mesh);
                    proj.mesh.geometry?.dispose();
                    proj.mesh.material?.dispose();
                }
            }
        });
        enemyProjectilesRef.current = activeEnemyProjectiles; // Обновляем массив
    } else { // Если игрок мертв или не найден - удаляем все снаряды врагов
         enemyProjectilesRef.current.forEach(proj => {
              if (proj.mesh) {
                   currentScene?.remove(proj.mesh);
                   proj.mesh.geometry?.dispose();
                   proj.mesh.material?.dispose();
              }
         });
         enemyProjectilesRef.current = [];
    }


    // =====================================================
    // === 5.1 ОБРАБОТКА АКТИВНЫХ ЯДОВИТЫХ ОБЛАКОВ (ИЗ КОД1) ===
    // =====================================================
     const now = Date.now();
     const remainingClouds = [];
     // const playerPos = playerObject?.position; // Уже получено в начале animate

     activeCloudsRef.current.forEach(cloud => {
         if (now < cloud.endTime) { // Облако еще активно
             remainingClouds.push(cloud);
             // Проверка урона игроку, если он жив и есть функция урона
             if (playerPos && typeof playerTakeDamage === 'function' && playerHp > 0) {
                 const distSq = playerPos.distanceToSquared(cloud.position);
                 if (distSq <= cloud.radiusSq) { // Игрок внутри облака
                     const damage = cloud.dps * dt; // Урон за этот кадр (DPS * время кадра)
                     playerTakeDamage(damage);
                     // console.log(`Player takes ${damage.toFixed(2)} poison cloud damage`); // Отладка
                 }
             }
         } else { // Облако истекло
             currentScene?.remove(cloud.mesh); // Удаляем меш из сцены
             cloud.mesh.geometry?.dispose();   // Освобождаем геометрию
             cloud.mesh.material?.dispose();   // Освобождаем материал
             console.log("☁️ Poison cloud expired and removed.");
         }
     });
     // Обновляем массив активных облаков напрямую в рефе
     // (избегаем setActiveClouds для производительности в RAF)
     if (remainingClouds.length !== activeCloudsRef.current.length) {
         activeCloudsRef.current = remainingClouds;
     }
    // --- КОНЕЦ ОБРАБОТКИ ОБЛАКОВ ---


    // ==================================
    // === 6. Проверка Победы/Проигрыша =
    // ==================================
    checkWinCondition(); // Проверка, убиты ли все необходимые враги


    // ==================================
    // === 7. Обновление Камеры ========
    // ==================================
    if (playerObject && currentCamera && levelConfig) {
        const camWidth = currentCamera.right - currentCamera.left;
        const camHeight = currentCamera.top - currentCamera.bottom;
        // Ограничиваем позицию камеры, чтобы она не выходила за границы мира
        const targetXCam = clamp(
            playerPos.x,
            -levelConfig.gameWorldWidth / 2 + camWidth / 2,
            levelConfig.gameWorldWidth / 2 - camWidth / 2
        );
        const targetYCam = clamp(
            playerPos.y,
            -levelConfig.WORLD_Y_OFFSET + camHeight / 2,
            levelConfig.gameWorldHeight - levelConfig.WORLD_Y_OFFSET - camHeight / 2
        );
        // Плавно перемещаем камеру к целевой позиции
        currentCamera.position.lerp(new THREE.Vector3(targetXCam, targetYCam, currentCamera.position.z), 0.1);
    }

    // ==================================
    // === 8. Рендеринг =================
    // ==================================
    if (currentRenderer && currentScene && currentCamera) {
        try {
            currentRenderer.render(currentScene, currentCamera); // Отрисовка кадра
        } catch (error) {
            console.error("❌ Ошибка рендеринга:", error);
            setLevelStatus('error'); // Переводим игру в статус ошибки
            if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current); // Останавливаем цикл
            animationFrameId.current = null;
            clock.stop();
        }
    }

}; // --- Конец функции animate ---

        // Запуск первого кадра
        if (!animationFrameId.current) {
            clock.start();
            lastTimestamp = performance.now();
            animationFrameId.current = requestAnimationFrame(animate);
        }

        // Функция очистки для useEffect игрового цикла
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
            clock.stop();
            // Очистка эффектов при остановке
             projectilesRef.current.forEach(p => p.mesh && sceneRef.current?.remove(p.mesh));
             projectilesRef.current = [];
             enemyProjectilesRef.current.forEach(p => p.mesh && sceneRef.current?.remove(p.mesh));
             enemyProjectilesRef.current = [];
             enemyRefs?.forEach(e => { if (e?.beamEffectMesh) removeBeamMesh(e); }); // Безопасный доступ к e
        };
    }, [ // Зависимости главного цикла (ОЧЕНЬ ВАЖНО)
         isLoading, levelStatus, levelData, levelConfig, playerObject, enemyRefs, enemiesState, playerStats, beamTexturesLoaded,
         playerTakeDamage, handleEnemyHit, winLevel, loseLevel, difficulty,
         // Добавляем новые функции-заглушки в зависимости!
         summonCreature, placeTotem, triggerGroundSpikes, createPoisonPuddle, applyPlayerDebuff, createProjectileToPoint
         // applyDebuff <- если используется
      ]);


    // === 11. РЕНДЕР JSX ===
    return (
        <div className="game-wrapper">
            {/* Оверлей загрузки */}
            {isLoading && <LoadingScreen />}

            {/* Игровой контейнер */}
            <div className="game-container" style={{ visibility: isLoading ? 'hidden' : 'visible' }}>
                {/* HP игрока */}
                {!isLoading && playerObject && typeof playerHp === 'number' && typeof displayMaxHp === 'number' && (
                    <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 100 }}> {/* Обертка для позиционирования */}
                         <HealthBar currentHp={playerHp} maxHp={displayMaxHp} />
                    </div>
                )}
                {/* Таймер выживания */}
                {!isLoading && levelData?.winCondition?.type === 'survive_duration' && remainingTime !== null && levelStatus === 'playing' && (
                     <div className="survival-timer"> Выжить: {Math.ceil(remainingTime)} сек </div>
                 )}
                {/* Место для рендера Three.js */}
                <div ref={mountRef} className="game-canvas"></div>
            </div>

            {/* Джойстик */}
            <div id="joystick-container" className="joystick-container" style={{ visibility: isLoading ? 'hidden' : 'visible' }}></div>

            {/* Попап Поражения */}
            {levelStatus === 'lost' && (
                <GameOverPopup
                    onGoToMenu={() => {
                        if (typeof onLevelComplete === 'function') onLevelComplete(levelData.id, 'lost');
                        else console.warn("onLevelComplete не передан");
                    }}
                />
            )}

            {/* Попап Победы */}
            {levelStatus === 'won' && (
                 <div className="level-complete-overlay">
                     <h2>Победа!</h2>
                     <p>Уровень {levelData.id} ({difficulty}) пройден!</p>
                     <button onClick={() => {
                         if (typeof onLevelComplete === 'function') onLevelComplete(levelData.id, 'won');
                         else console.warn("onLevelComplete не передан");
                     }}>
                         В главное меню
                     </button>
                 </div>
             )}

             {/* Попап Ошибки */}
             {levelStatus === 'error' && (
                  <div className="level-error-overlay">
                      <h2>Ошибка</h2>
                      <p>Произошла ошибка при загрузке или работе уровня.</p>
                      <button onClick={() => {
                          if (typeof onLevelComplete === 'function') onLevelComplete(levelData.id, 'error');
                          else console.warn("onLevelComplete не передан");
                      }}>
                          В главное меню
                      </button>
                  </div>
              )}
        </div> // Закрытие game-wrapper
    ); // Закрытие return
}; // Закрытие компонента Level

export default Level;