// src/components/Level.jsx
import * as THREE from "three";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import nipplejs from "nipplejs";
import './Styles.scss'; // Используем стиль из code1
import useGameStore from '../store/useGameStore';
import usePlayerLoader from './usePlayerLoader';
import useEnemyLoader from './useEnemyLoader'; // Импорт из code1
import GameOverPopup from './GameOverPopup';
import LoadingScreen from "./LoadingScreen"; // Импорт из code1 (на случай ошибки)
import { clamp, checkCollision, convertTiledX, convertTiledY, DEFAULT_WORLD_WIDTH, DEFAULT_WORLD_HEIGHT } from './utils';

// --- Константы ---
const HEALTH_BAR_WIDTH = 30; // Из code1
const HEALTH_BAR_HEIGHT = 4; // Из code1
const HEALTH_BAR_OFFSET_Y = 25; // Из code1 (или подбираем новое значение, если нужно)
// Константы лучей остаются из code2
const BEAM_WIDTH = 15;
const BEAM_TEXTURE_FIRE = '/assets/fire-beam.png'; // <<<--- УКАЖИ ПРАВИЛЬНЫЙ ПУТЬ
const BEAM_TEXTURE_ICE = '/assets/ice-beam.png';   // <<<--- УКАЖИ ПРАВИЛЬНЫЙ ПУТЬ

// --- Компонент HealthBar (перенесен из code2, но можно вынести в отдельный файл) ---
const HealthBar = ({ currentHp, maxHp }) => {
    const healthPercent = maxHp > 0 ? Math.max(0, (currentHp / maxHp) * 100) : 0;
    return (
        <div className="health-bar-container">
            <div className="health-bar" style={{ width: `${healthPercent}%` }}></div>
        </div>
    );
};
// ---------------------------------------------

// --- Вспомогательная функция для получения размеров мира (из code1) ---
const getWorldDimensions = (levelData) => {
    const gameWorldWidth = levelData?.width || DEFAULT_WORLD_WIDTH;
    const gameWorldHeight = levelData?.height || DEFAULT_WORLD_HEIGHT;
    const WORLD_Y_OFFSET = gameWorldHeight / 2;
    return { gameWorldWidth, gameWorldHeight, WORLD_Y_OFFSET };
};
// ---------------------------------------------

// === Основной компонент Уровня ===
const Level = ({ levelData, onLevelComplete, onReady, difficulty = 'normal' }) => {

    // --- Проверка levelData в самом начале (из code1) ---
    if (!levelData || typeof levelData.id === 'undefined') {
        console.error("[Level.jsx] Ошибка: Получены невалидные levelData!", levelData);
        // Можно показать сообщение об ошибке или вернуть лоадер
        return <div className="level-screen error">Ошибка: Неверные данные уровня!</div>;
        // Или использовать вариант из code2:
        // return <div className="error-message">Ошибка: Не найдены данные уровня!</div>;
    }

    // === Рефы (Объединение из code1 и code2) ===
    const mountRef = useRef(null);
    const cameraRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const joystickRef = useRef(null);
    const animationFrameId = useRef(null);
    const wallsRef = useRef([]);
    const projectilesRef = useRef([]); // Снаряды игрока
    const velocity = useRef({ x: 0, y: 0, force: 0 });
    const playerAttackCooldown = useRef(0);
    const levelStartTimeRef = useRef(null);
    const readyCalledRef = useRef(false);
    const enemyProjectilesRef = useRef([]); // Снаряды врагов (из code2)
    const beamTexturesRef = useRef({});
    const backgroundMeshRef = useRef(null); // Реф для фона (из code1)

    // === Состояния (Объединение из code1 и code2) ===
    const [isLoading, setIsLoading] = useState(true); // Начинаем с загрузки
    const [levelStatus, setLevelStatus] = useState('playing');
    const [enemiesState, setEnemiesState] = useState([]); // Состояние HP врагов
    const [remainingTime, setRemainingTime] = useState(null);
    const [beamTexturesLoaded, setBeamTexturesLoaded] = useState(false); // Флаг загрузки текстур лучей

    // === Глобальный Стор (из code2, проверяем наличие нужных полей из code1) ===
    const {
        playerHp,
        displayMaxHp, // computedStats().hp
        playerStats,  // computedStats()
        playerTakeDamage,
        initializeLevelHp
    } = useGameStore(state => ({
        playerHp: state.playerHp,
        displayMaxHp: state.computedStats().hp, // Убедимся, что computedStats возвращает hp
        playerStats: state.computedStats(),     // Убедимся, что computedStats возвращает нужные статы (skin, attack, speed, attackSpeed, attackRange, critChance, critMultiplier, doubleStrikeChance)
        playerTakeDamage: state.playerTakeDamage,
        initializeLevelHp: state.initializeLevelHp,
    }));

    // --- Инициализация HP при монтировании/смене уровня (из code1) ---
    useEffect(() => {
        console.log(`[Level ${levelData.id}] Mount/Data Change: Вызов initializeLevelHp()`);
        if (typeof initializeLevelHp === 'function') {
             initializeLevelHp();
        } else {
            console.error("ОШИБКА: initializeLevelHp не функция при монтировании/смене уровня!");
        }
        setLevelStatus('playing'); // Сброс статуса
        readyCalledRef.current = false; // Сброс флага готовности
    }, [initializeLevelHp, levelData.id]); // Зависимость от ID уровня и функции

    // --- Конфигурация Уровня (useMemo из code1) ---
    const levelConfig = useMemo(() => {
        console.log("[Level.jsx] Calculating levelConfig");
        // Проверка levelData уже есть в начале компонента
        return getWorldDimensions(levelData);
    }, [levelData?.width, levelData?.height]); // Зависит только от размеров

    // --- Загрузка текстур лучей (из code2) ---
    useEffect(() => {
        const textureLoader = new THREE.TextureLoader();
        let fireLoaded = false;
        let iceLoaded = false;
        let mounted = true;

        console.log("Загрузка текстур лучей...");

        const checkTexLoadComplete = () => {
            if (fireLoaded && iceLoaded && mounted) {
                console.log("✅ Текстуры лучей загружены.");
                setBeamTexturesLoaded(true); // Устанавливаем флаг, что все готово
            }
        };

        textureLoader.load(
            BEAM_TEXTURE_FIRE,
            (texture) => {
                if (!mounted) return;
                console.log("🔥 Текстура Огня загружена");
                texture.encoding = THREE.sRGBEncoding; // Правильная кодировка цвета
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
            // Очистка текстур (опционально, если нужно освобождать память сразу)
            beamTexturesRef.current.fire?.dispose();
            beamTexturesRef.current.ice?.dispose();
            beamTexturesRef.current = {};
            setBeamTexturesLoaded(false); // Сбрасываем флаг при размонтировании
        }
    }, []); // Пустой массив зависимостей - загружаем один раз

    // --- Инициализация Сцены, Рендерера, Камеры ---
    useEffect(() => {
        console.log("[Level.jsx] Инициализация сцены Three.js");
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
        camera.position.set(0, 0, 1000); // Z подальше для ортографической
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputEncoding = THREE.sRGBEncoding; // Как в code2
        rendererRef.current = renderer;

        const mountPoint = mountRef.current;
        if (!mountPoint) { console.error("Mount point not found!"); setLevelStatus('error'); return; }

        mountPoint.innerHTML = ""; // Очистка перед добавлением
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

        handleResize(); // Первый вызов
        window.addEventListener('resize', handleResize);

        // Добавление света (из code1 или code2, они похожи)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
        directionalLight.position.set(50, 150, 100); // Можно настроить позицию
        directionalLight.target.position.set(0, 0, 0);
        scene.add(directionalLight);
        scene.add(directionalLight.target);

        // Функция очистки Three.js (основная)
        return () => {
            console.log("[Level.jsx] Очистка основной сцены Three.js");
            window.removeEventListener('resize', handleResize);

             // Удаляем снаряды врагов при очистке сцены
             if (sceneRef.current && enemyProjectilesRef.current) {
                enemyProjectilesRef.current.forEach(proj => {
                    if (proj.mesh) {
                        sceneRef.current?.remove(proj.mesh);
                        proj.mesh.geometry?.dispose();
                        proj.mesh.material?.dispose();
                    }
                });
                enemyProjectilesRef.current = [];
             }
             // Удаляем снаряды игрока
             if (sceneRef.current && projectilesRef.current) {
                projectilesRef.current.forEach(proj => {
                    if (proj.mesh) {
                        sceneRef.current?.remove(proj.mesh);
                        proj.mesh.geometry?.dispose();
                        proj.mesh.material?.dispose();
                    }
                });
                projectilesRef.current = [];
             }
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
            // Очистка рендерера
            rendererRef.current?.dispose();
            if (mountPoint && rendererRef.current?.domElement && mountPoint.contains(rendererRef.current.domElement)) {
                mountPoint.removeChild(rendererRef.current.domElement);
            }
            // Очистка сцены (фон и стены будут удалены в другом useEffect)
             if (sceneRef.current) {
                 // Удаление всех оставшихся детей (свет, камера и т.д., если они добавлены на сцену)
                 // while(sceneRef.current.children.length > 0){
                 //     const child = sceneRef.current.children[0];
                 //     sceneRef.current.remove(child);
                 //     // Дополнительная очистка для геометрий/материалов, если необходимо
                 //     if (child instanceof THREE.Mesh) {
                 //         child.geometry?.dispose();
                 //         if (Array.isArray(child.material)) {
                 //             child.material.forEach(m => m.dispose());
                 //         } else {
                 //             child.material?.dispose();
                 //         }
                 //     }
                 // }
                 // --- ИЛИ более простой вариант, если фон/стены удаляются отдельно ---
                 sceneRef.current.remove(ambientLight);
                 sceneRef.current.remove(directionalLight);
                 sceneRef.current.remove(directionalLight.target);
                 // Модели игрока и врагов удаляются своими хуками или эффектами
             }

            // Сброс рефов
            sceneRef.current = null;
            rendererRef.current = null;
            cameraRef.current = null;
        };
    }, []); // Пустая зависимость - выполняется один раз при монтировании

    // --- Добавление Фона и Стен (из code1) ---
    useEffect(() => {
        const currentScene = sceneRef.current;
        // Ждем сцену и КОНФИГ, так как размеры мира нужны для фона и стен
        if (!currentScene || !levelConfig) {
            console.log("[Level.jsx] Skip Background/Walls: No scene or levelConfig yet.");
            return;
        }
        console.log("[Level.jsx] Создание фона и стен");

        // Удаление старых (если они были)
        if(backgroundMeshRef.current) {
            console.log("  > Removing old background");
            currentScene.remove(backgroundMeshRef.current);
            backgroundMeshRef.current.geometry?.dispose();
            backgroundMeshRef.current.material?.map?.dispose(); // Dispose texture map
            backgroundMeshRef.current.material?.dispose();
            backgroundMeshRef.current = null;
        }
        if(wallsRef.current.length > 0) {
            console.log(`  > Removing ${wallsRef.current.length} old walls`);
            wallsRef.current.forEach(w => {
                if(w.mesh) {
                    currentScene.remove(w.mesh);
                    w.mesh.geometry?.dispose();
                    // Материал стен обычно общий, его можно не удалять каждый раз,
                    // но если он уникальный для каждой стены, то нужно: w.mesh.material?.dispose();
                }
            });
            wallsRef.current = []; // Очищаем реф массива стен
        }

        // Создание нового фона
        const textureLoader = new THREE.TextureLoader();
        if (levelData?.backgroundTexture) {
            console.log(`  > Loading background texture: ${levelData.backgroundTexture}`);
            textureLoader.load(
                levelData.backgroundTexture,
                (texture) => {
                    if (!sceneRef.current) return; // Проверка на случай размонтирования во время загрузки
                    console.log("    * Background texture loaded successfully");
                    texture.encoding = THREE.sRGBEncoding;
                    const bgGeometry = new THREE.PlaneGeometry(levelConfig.gameWorldWidth, levelConfig.gameWorldHeight);
                    const bgMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                    const backgroundMesh = new THREE.Mesh(bgGeometry, bgMaterial);
                    backgroundMesh.position.set(0, 0, -10); // За игроком и стенами
                    backgroundMesh.renderOrder = -1; // Рендерить первым
                    sceneRef.current.add(backgroundMesh);
                    backgroundMeshRef.current = backgroundMesh; // Сохраняем ссылку
                },
                undefined, // Progress callback (optional)
                (error) => {
                    console.error("❌ Ошибка загрузки фона:", error);
                    // Можно установить цвет фона как fallback
                    if(sceneRef.current) sceneRef.current.background = new THREE.Color(0x282c34);
                }
            );
        } else {
            console.log("  > No background texture specified, using color.");
            currentScene.background = new THREE.Color(0x282c34); // Цвет фона по умолчанию
        }

        // Создание новых стен
        if (levelData?.walls && levelData.walls.length > 0 && levelConfig) {
            console.log(`  > Creating ${levelData.walls.length} walls`);
             // Материал можно создать один раз
            const wallMaterial = new THREE.MeshStandardMaterial({
                 color: 0x808080, // Серый
                 roughness: 0.8,
                 metalness: 0.2
             });
            const tempWalls = []; // Временный массив для накопления

            levelData.walls.forEach(wallData => {
                const wallWidth = wallData.width;
                const wallHeight = wallData.height;
                // Используем конвертеры координат
                const wallX = convertTiledX(wallData.x, wallWidth, levelConfig.gameWorldWidth);
                const wallY = convertTiledY(wallData.y, wallHeight, levelConfig.gameWorldHeight, levelConfig.WORLD_Y_OFFSET);

                const wallGeometry = new THREE.BoxGeometry(wallWidth, wallHeight, 10); // Небольшая глубина
                const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
                wallMesh.position.set(wallX, wallY, -5); // Чуть выше фона, но за игроком
                wallMesh.receiveShadow = true; // Если тени включены
                currentScene.add(wallMesh);

                // Сохраняем данные для коллизий
                tempWalls.push({
                    id: wallData.id || `wall-${Math.random()}`, // Генерируем ID, если нет
                    x: wallX - wallWidth / 2, // Левый край для AABB
                    y: wallY - wallHeight / 2, // Нижний край для AABB
                    width: wallWidth,
                    height: wallHeight,
                    mesh: wallMesh // Ссылка на меш для удаления
                });
            });
            wallsRef.current = tempWalls; // Обновляем реф

             // Очистка материала, если он больше не нужен (например, при полном размонтировании)
             // Но здесь он нужен до следующего обновления стен/фона
             // wallMaterial.dispose(); // Не здесь
        } else {
            console.log("  > No walls data found or levelConfig missing.");
        }

        // Функция очистки для этого useEffect (при смене levelConfig или levelData)
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
                 // Сброс цвета фона, если он был установлен
                 sceneRef.current.background = null;
             }
            wallsRef.current = []; // Очищаем реф
             // Общий материал стен нужно очистить, если сам Level размонтируется
             // Но его можно переиспользовать между обновлениями стен
        };
    }, [levelConfig, levelData?.backgroundTexture, levelData?.walls]); // Зависит от конфига и данных уровня для фона/стен

    // --- Загрузка Игрока (из code1) ---
    const { playerObject, isPlayerModelLoaded } = usePlayerLoader(
        playerStats?.skin || "/Models/character.glb", // Безопасный доступ к skin
        // Используем levelData?.playerStart, но предоставляем дефолтное значение на основе levelConfig, если start не задан
        levelData?.playerStart || (levelConfig ? { x: 0, y: levelConfig.WORLD_Y_OFFSET - 50 } : { x: 0, y: 0 }),
        sceneRef.current,
        levelConfig // Передаем levelConfig
    );
    // Убрали лог отсюда, чтобы не спамить при каждом ререндере

    // --- Загрузка Врагов (ИСПОЛЬЗУЕМ useEnemyLoader из code1) ---
    const { enemyRefs, areEnemiesLoaded, initialEnemyStates } = useEnemyLoader(
        levelData?.enemies,   // Массив врагов из данных уровня
        sceneRef.current,     // Текущая сцена
        levelConfig,          // Конфиг уровня (для координат и размеров)
        levelData?.id,        // ID уровня (для возможного масштабирования/логики)
        difficulty            // Сложность (для масштабирования статов)
    );
     // console.log('[Level.jsx] ПОСЛЕ useEnemyLoader:', { enemyRefsCount: enemyRefs?.length, areEnemiesLoaded, initialEnemyStatesCount: initialEnemyStates?.length }); // Можно раскомментировать для отладки

    // --- Управление общей загрузкой (из code1, объединено с логикой code2) ---
    useEffect(() => {
        // Считаем уровень загруженным, если загружен игрок И враги И текстуры лучей
        // Добавляем проверку на наличие levelConfig, т.к. он нужен для игры
        const allLoaded = !!levelConfig && isPlayerModelLoaded && areEnemiesLoaded && beamTexturesLoaded;
        // console.log(`[Level.jsx] Checking Loading Status: Config=${!!levelConfig}, Player=${isPlayerModelLoaded}, Enemies=${areEnemiesLoaded}, Beams=${beamTexturesLoaded}. All Loaded = ${allLoaded}`);
        const currentlyLoading = !allLoaded;

        if (isLoading !== currentlyLoading) {
            setIsLoading(currentlyLoading);
            if (!currentlyLoading) { // Если загрузка ТОЛЬКО ЧТО завершилась
                if (!readyCalledRef.current) { // Вызываем onReady только один раз
                    console.log("✨ Уровень ГОТОВ! Вызов onReady.");
                    // Инициализируем HP здесь, когда все загружено и готово к игре
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
                    readyCalledRef.current = true; // Ставим флаг, что onReady вызван

                    // Установка таймера для survival
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
        levelConfig, // Добавили levelConfig в зависимости
        isPlayerModelLoaded,
        areEnemiesLoaded,
        beamTexturesLoaded,
        isLoading,
        onReady,
        initializeLevelHp, // Добавили initializeLevelHp
        levelData?.winCondition // Зависимость от условия победы для таймера
    ]);

    // --- Инициализация состояния врагов (из code1, но с проверкой из code2) ---
    useEffect(() => {
        // Запускается, только если враги УЖЕ загружены и есть начальные состояния
        if (areEnemiesLoaded && initialEnemyStates && initialEnemyStates.length > 0) {
            // Сравниваем JSON строки, чтобы избежать лишних ререндеров, если массив тот же
            // Это может быть неэффективно для больших массивов, но для списка врагов обычно нормально
            if (JSON.stringify(enemiesState) !== JSON.stringify(initialEnemyStates)) {
                 console.log(`--- ИНИЦИАЛИЗАЦИЯ enemiesState (${initialEnemyStates.length} шт.) из initialEnemyStates ---`);
                 setEnemiesState(initialEnemyStates);
            }
        } else if (!areEnemiesLoaded && enemiesState.length > 0) {
             // Если враги выгружаются (например, смена уровня), очищаем состояние
             console.log("--- Очистка enemiesState, т.к. areEnemiesLoaded = false ---");
             setEnemiesState([]);
        }
        // Не зависим от enemiesState здесь, чтобы избежать цикла
    }, [areEnemiesLoaded, initialEnemyStates]);

    // --- Настройка Джойстика (из code2, но зависимость от isLoading как в code1) ---
    useEffect(() => {
        let joystickInstance = null;
        // Создаем только ПОСЛЕ завершения загрузки и если сцена существует
        if (!isLoading && sceneRef.current) {
            const joystickZone = document.getElementById("joystick-container");
            if (joystickZone && !joystickRef.current) { // Создаем только если еще не создан
                try {
                    console.log("Инициализация джойстика...");
                    const options = {
                        zone: joystickZone,
                        mode: "static", // Или dynamic/semi
                        position: { left: "50%", top: "50%" }, // Центрирование внутри зоны
                        size: 100, // Размер джойстика
                        color: "rgba(255, 255, 255, 0.5)", // Полупрозрачный белый
                        threshold: 0.1 // Порог срабатывания
                    };
                    joystickInstance = nipplejs.create(options);
                    joystickRef.current = joystickInstance; // Сохраняем ссылку

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
             // Если перешли в загрузку, а джойстик был, уничтожаем его
             console.log("Уничтожение джойстика из-за isLoading=true");
              try { joystickRef.current.destroy(); } catch(e) { console.warn("Joystick destroy error:", e); }
              joystickRef.current = null;
        }

        // Очистка при размонтировании компонента или изменении isLoading на true
        return () => {
            if (joystickRef.current) {
                 console.log("Уничтожение джойстика при очистке useEffect");
                 try { joystickRef.current.destroy(); } catch(e) { console.warn("Joystick destroy error:", e); }
                 joystickRef.current = null;
            }
        };
    }, [isLoading]); // Зависит только от isLoading

    // --- Обработчик урона врагу (из code2, useCallback как в code1) ---
    const handleEnemyHit = useCallback((enemyId, damageAmount) => {
        let enemyDefeated = false;
        let enemyRefForBlockCheck = null;

        setEnemiesState(prevEnemies => {
            const newEnemiesState = [...prevEnemies];
            const enemyIndex = newEnemiesState.findIndex(e => e.id === enemyId);

            if (enemyIndex !== -1 && newEnemiesState[enemyIndex].currentHp > 0) {
                enemyRefForBlockCheck = enemyRefs?.find(ref => ref && ref.id === enemyId); // Находим ссылку
                let finalDamage = damageAmount;

                // --- Логика блокирования для Revenant Knight ---
                if (enemyRefForBlockCheck?.type === 'revenant_knight' && typeof enemyRefForBlockCheck.blockCharges === 'number' && enemyRefForBlockCheck.blockCharges > 0) {
                    enemyRefForBlockCheck.blockCharges -= 1; // Уменьшаем заряды в рефе
                    console.log(`Revenant Knight ${enemyId} blocked! Charges left: ${enemyRefForBlockCheck.blockCharges}`);
                    finalDamage = 0; // Блок поглощает урон
                    // TODO: Визуальный/звуковой эффект блока?
                }
                // --- ---

                const currentHp = newEnemiesState[enemyIndex].currentHp;
                const newHp = Math.max(0, currentHp - finalDamage);

                if (newHp === 0 && currentHp > 0) { // Проверяем, что HP стало 0 именно сейчас
                    console.log(`--- Враг ${enemyId} помечен как побежденный (HP=0)! ---`);
                    enemyDefeated = true;
                    // Помечаем isDead сразу в рефе, чтобы AI перестал работать
                    if (enemyRefForBlockCheck && !enemyRefForBlockCheck.isDead) {
                        enemyRefForBlockCheck.isDead = true;
                        console.log(`--- Флаг isDead установлен для ${enemyId} в handleEnemyHit ---`);
                        // Эффекты при смерти (кроме Rotting Soldier, он взрывается в цикле)
                        if (enemyRefForBlockCheck.type === 'cursed_carrier') {
                             // Логика спавна при смерти (если нужна)
                             // summonCreature('skeleton_swordsman', 1, enemyRefForBlockCheck.pivot.position.clone());
                             console.log(`(Placeholder) Cursed Carrier ${enemyId} died.`);
                        }
                    } else if (!enemyRefForBlockCheck) {
                        console.warn(`[handleEnemyHit] Не найден enemyRef ${enemyId} для установки isDead при HP=0!`);
                    }
                }

                newEnemiesState[enemyIndex] = { ...newEnemiesState[enemyIndex], currentHp: newHp };
                return newEnemiesState;
            }
            return prevEnemies; // Не нашли врага или он уже мертв
        });

    }, [enemyRefs]); // Зависимость только от enemyRefs (для поиска рыцаря)

    // --- Удаление мертвых врагов со сцены (Визуальное) - Логика из code2, но используем isDead ---
    // Этот useEffect больше не нужен, так как isDead устанавливается в handleEnemyHit/game loop,
    // а логика скрытия/удаления происходит в game loop (для Rotting Soldier) или при очистке уровня.
    // Оставляем его пока закомментированным, если понадобится явное удаление ДО очистки.
    /*
    useEffect(() => {
        if (!sceneRef.current || !enemyRefs || !enemiesState) return;

        // Находим ID врагов, у которых HP <= 0 в состоянии
        const deadEnemyIdsInState = new Set(enemiesState.filter(state => state.currentHp <= 0).map(state => state.id));

        enemyRefs.forEach(enemyRef => {
            if (!enemyRef || !enemyRef.pivot) return;

            const isMarkedDead = enemyRef.isDead; // Проверяем флаг isDead в рефе
            const isOnScene = enemyRef.pivot.parent === sceneRef.current;

            // Удаляем со сцены, если помечен мертвым И еще на сцене
            // Исключаем Rotting Soldier, который удаляется после взрыва в цикле
            if (isMarkedDead && isOnScene && enemyRef.type !== 'rotting_soldier') {
                console.log(`--- Удаление мертвого врага ${enemyRef.id} со сцены (useEffect) ---`);
                sceneRef.current.remove(enemyRef.pivot);
                 // Очистка геометрии/материалов (если не используются повторно)
                 // enemyRef.mesh?.geometry?.dispose();
                 // enemyRef.mesh?.material?.dispose();
                 // enemyRef.hpBar?.container?.geometry?.dispose();
                 // enemyRef.hpBar?.container?.material?.dispose();
                 // enemyRef.hpBar?.fill?.geometry?.dispose();
                 // enemyRef.hpBar?.fill?.material?.dispose();
            }
            // Логика возвращения на сцену здесь не нужна,
            // т.к. useEnemyLoader должен добавлять их при загрузке.
        });
    }, [enemiesState, enemyRefs]); // Зависит от состояния и ссылок
    */

    // --- Логика статусов игры (из code1/code2) ---
    const winLevel = useCallback(() => { if (levelStatus === 'playing') { console.log(">>> Уровень ВЫИГРАН <<<"); setLevelStatus('won'); } }, [levelStatus]);
    const loseLevel = useCallback(() => { if (levelStatus === 'playing') { console.log(">>> Уровень ПРОИГРАН <<<"); setLevelStatus('lost'); } }, [levelStatus]);

    // Следим за HP игрока для проигрыша
    useEffect(() => {
        if (typeof playerHp === 'number' && playerHp <= 0 && levelStatus === 'playing') {
            loseLevel();
        }
    }, [playerHp, levelStatus, loseLevel]);


    // === ОСНОВНОЙ ИГРОВОЙ ЦИКЛ (Объединенный и доработанный) ===
    useEffect(() => {
        // <<< Условие запуска цикла: НЕ isLoading И статус 'playing' И ОСНОВНЫЕ объекты созданы И текстуры лучей загружены >>>
        if (isLoading || levelStatus !== 'playing' || !playerObject || !enemyRefs || !sceneRef.current || !rendererRef.current || !cameraRef.current || !levelConfig || !beamTexturesLoaded) {
            if (animationFrameId.current) {
                 // console.log("Game loop cancelled due to unmet conditions."); // Debug log
                 cancelAnimationFrame(animationFrameId.current);
                 animationFrameId.current = null;
            }
            return; // Выходим, если не готовы
        }

        console.log(">>> ЗАПУСК ИГРОВОГО ЦИКЛА <<<"); // Лог запуска цикла

        const clock = new THREE.Clock();
        let lastTimestamp = 0;

        // --- Вспомогательные функции цикла (перенесены и адаптированы) ---

        const findNearestEnemy = (origin, maxRangeSq) => {
            let nearestEnemy = null;
            let minDistanceSq = maxRangeSq;
            // Используем enemyRefs и enemiesState для проверки живости
            enemyRefs?.forEach(enemy => {
                if (!enemy || enemy.isDead || !enemy.pivot?.position) return; // Проверяем isDead и наличие pivot
                // const enemyState = enemiesState.find(es => es.id === enemy.id); // Можно не искать, если isDead достаточно
                // if (!enemyState || enemyState.currentHp <= 0) return;

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
            // Простой шар для снаряда игрока
            const geometry = new THREE.SphereGeometry(4, 6, 6);
            const material = new THREE.MeshBasicMaterial({ color: projectileData.isCrit ? 0xffaa00 : 0xffffff }); // Оранжевый для крита
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(projectileData.position);
            projectileData.mesh = mesh; // Сохраняем ссылку в данных снаряда
            sceneRef.current.add(mesh);
        };

        const createProjectile = (targetEnemyRef) => {
            if (!playerObject || !targetEnemyRef?.pivot?.position || !playerStats) return;

            const projSpeed = 500; // Скорость снаряда игрока
            const projLifetime = 1.5; // Время жизни снаряда игрока
            const baseDamage = playerStats.attack || 1;
            const startPos = playerObject.position.clone();
            const targetPos = targetEnemyRef.pivot.position.clone();
            const direction = targetPos.sub(startPos).normalize();
            const critChance = playerStats.critChance || 0;
            const isCrit = Math.random() * 100 < critChance;
            const critMultiplier = playerStats.critMultiplier || 2;
            let finalDamage = isCrit ? Math.round(baseDamage * critMultiplier) : baseDamage;

            // Логика двойного удара
            const doubleStrikeChance = playerStats.doubleStrikeChance || 0;
            const isDoubleStrike = Math.random() * 100 < doubleStrikeChance;

            const makeProjectileData = (dmg, crit, offset = 0) => {
                const pos = startPos.clone().add(direction.clone().multiplyScalar(25)); // Смещение от центра игрока
                if (offset !== 0) {
                     // Смещаем второй снаряд перпендикулярно направлению полета
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

            // Создаем первый (или единственный) снаряд
            const p1 = makeProjectileData(finalDamage, isCrit);
            projectilesRef.current.push(p1);
            addProjectileMesh(p1);

            // Если двойной удар, создаем второй
            if (isDoubleStrike) {
                const isCrit2 = Math.random() * 100 < critChance;
                const dmg2 = isCrit2 ? Math.round(baseDamage * critMultiplier) : baseDamage;
                const p2 = makeProjectileData(dmg2, isCrit2, 8); // Смещаем второй на 8 пикселей
                projectilesRef.current.push(p2);
                addProjectileMesh(p2);
                // console.log("Double Strike!"); // Debug log
            }
        };

        const addEnemyProjectileMesh = (projData) => {
            if (!sceneRef.current) return;
            // Используем цилиндр (стрелу) как в code2
            const geometry = new THREE.CylinderGeometry(0.5, 0.5, 12, 5); // Тоньше и длиннее
            const material = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Коричневый цвет
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(projData.position);
            // Поворачиваем стрелу по направлению полета (исходная ориентация цилиндра по Y)
            mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), projData.velocity.clone().normalize());
            projData.mesh = mesh;
            sceneRef.current.add(mesh);
        };

        const createEnemyProjectile = (enemy, playerCurrentPos) => {
            if (!enemy || !enemy.pivot?.position || !enemy.stats || !playerCurrentPos || enemy.isDead) return;

            const projSpeed = 300 + Math.random() * 100; // Скорость вражеского снаряда (лучник)
            const projLifetime = 2.0; // Время жизни
            const damage = enemy.stats.damage || 3; // Урон из статов врага

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

        // --- Функции для лучей (из code2, с проверками из code1) ---
        const createBeamMeshFixed = (enemy, targetPos) => {
            if (!sceneRef.current || !enemy.pivot?.position || !beamTexturesRef.current || !enemy.stats || enemy.isDead) {
                 console.warn("createBeamMeshFixed: Пропущен из-за отсутствия необходимых данных или враг мертв.", { hasScene: !!sceneRef.current, hasPivot: !!enemy.pivot?.position, hasTextures: !!beamTexturesRef.current, hasStats: !!enemy.stats, isDead: enemy.isDead });
                 return null;
            }

            const beamType = enemy.stats.beamType === 'fire' ? 'fire' : 'ice';
            const texture = beamTexturesRef.current[beamType];

            if (!texture) {
                console.error(`Текстура для луча типа "${beamType}" не загружена!`);
                return null;
            }

            const startPoint = enemy.pivot.position.clone();
            const beamOriginOffsetY = 25; // Смещение точки старта луча (можно вынести в константы)
            startPoint.y += beamOriginOffsetY; // Испускаем чуть выше центра

            const endPoint = targetPos.clone();
            const direction = endPoint.clone().sub(startPoint);
            const distance = direction.length();

            if (distance <= 0.1) return null; // Не создаем слишком короткий луч

            // Используем кешированные геометрию и материал, если возможно (но для простоты создаем новые)
            const beamGeo = new THREE.PlaneGeometry(BEAM_WIDTH, 1); // Ширина и высота 1 для масштабирования по Y
            const beamMat = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                depthTest: false, // Рендерить поверх всего
                depthWrite: false,
                side: THREE.DoubleSide, // Виден с обеих сторон
                // blending: THREE.AdditiveBlending, // Можно включить для эффекта свечения
            });

            const beamMesh = new THREE.Mesh(beamGeo, beamMat);
            beamMesh.name = `beam_${enemy.id}`;
            beamMesh.renderOrder = 900; // Ниже хелсбаров (у них 999)

            beamMesh.scale.y = distance; // Растягиваем по длине
            beamMesh.position.copy(startPoint).lerp(endPoint, 0.5); // Ставим в середину отрезка
            // Поворачиваем плоскость (которая изначально в XY) так, чтобы ее ось Y совпала с направлением луча
            beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());

            sceneRef.current.add(beamMesh);
            // console.log(`--- МЕШ ЛУЧА СОЗДАН для ${enemy.id} (тип: ${beamType}) ---`); // Debug log
            return beamMesh;
        }

        const updateBeamMesh = (beamMesh, startPosRaw, targetPos) => {
             if (!beamMesh || !startPosRaw || !targetPos) return;

             const startPoint = startPosRaw.clone();
             const beamOriginOffsetY = 25; // То же смещение
             startPoint.y += beamOriginOffsetY;

             const endPoint = targetPos.clone();
             const direction = endPoint.clone().sub(startPoint);
             const distance = direction.length();

             if (distance <= 0.1) {
                 beamMesh.visible = false; // Скрываем короткий луч
                 return;
             }

             beamMesh.visible = true;
             beamMesh.scale.y = distance;
             beamMesh.position.copy(startPoint).lerp(endPoint, 0.5);
             beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        }

        const removeBeamMesh = (enemy) => {
             if (enemy.beamEffectMesh && sceneRef.current) {
                 // console.log(`--- Удаление меша луча для ${enemy.id} ---`); // Debug log
                 sceneRef.current.remove(enemy.beamEffectMesh);
                 // Очистка геометрии/материала (если они не кешируются)
                 enemy.beamEffectMesh.geometry?.dispose();
                 enemy.beamEffectMesh.material?.map?.dispose(); // Важно для текстур
                 enemy.beamEffectMesh.material?.dispose();
                 enemy.beamEffectMesh = null; // Убираем ссылку из рефа врага
             }
        }
        // --- Конец функций для лучей ---

        // --- Функции-заглушки для способностей (из code1/code2) ---
        // TODO: Реализовать логику этих способностей
        const summonCreature = (type, count, position) => {
            console.warn(`ЗАГЛУШКА: summonCreature(${type}, ${count}, ${position?.x.toFixed(0)},${position?.y.toFixed(0)}) - НЕ РЕАЛИЗОВАНО`);
            // Здесь должна быть логика динамического создания нового врага:
            // 1. Создать данные врага (enemyData)
            // 2. Использовать функции из useEnemyLoader или похожие для создания объекта Three.js (pivot, mesh, hpBar)
            // 3. Добавить новый ref в enemyRefs.current
            // 4. Добавить новое состояние в enemiesState
            // 5. Добавить объект на сцену sceneRef.current.add(newEnemy.pivot)
        };
        const applyPlayerDebuff = (type, duration, strength) => {
            console.warn(`ЗАГЛУШКА: applyPlayerDebuff(${type}, ${duration}, ${strength}) - НЕ РЕАЛИЗОВАНО`);
            // Здесь должна быть логика применения дебаффа к игроку:
            // 1. Добавить состояние дебаффов в useGameStore
            // 2. Создать action для добавления/обновления дебаффа
            // 3. Вызывать этот action отсюда
            // 4. Учитывать дебафф при расчете статов игрока (в computedStats или напрямую)
        };
        const createPoisonCloud = (position) => {
            console.warn(`ЗАГЛУШКА: createPoisonCloud(${position?.x.toFixed(0)},${position?.y.toFixed(0)}) - НЕ РЕАЛИЗОВАНО`);
            // Создание визуального эффекта облака (например, спрайт или система частиц)
            // Добавление логики урона игроку, если он внутри облака (проверка коллизий в цикле)
        };
        const placeTotem = (position, totemType) => {
            console.warn(`ЗАГЛУШКА: placeTotem(${position?.x.toFixed(0)},${position?.y.toFixed(0)}, ${totemType}) - НЕ РЕАЛИЗОВАНО`);
            // Создание объекта тотема (модель, эффекты)
            // Добавление логики работы тотема (аура, атака и т.д.)
        };
        const triggerGroundSpikes = (position, delay, damage) => { // Добавили урон
             console.warn(`ЗАГЛУШКА: triggerGroundSpikes(${position?.x.toFixed(0)},${position?.y.toFixed(0)}, ${delay}) - НЕ РЕАЛИЗОВАНО`);
             // Создание визуального эффекта (например, анимация появления шипов под целью)
             // Через `delay` секунд проверка, находится ли игрок в зоне поражения, и нанесение урона `damage`
             // Можно использовать setTimeout или отслеживать таймер в цикле
        };
        const createPoisonPuddle = (position, dps, duration) => { // Добавили параметры
             console.warn(`ЗАГЛУШКА: createPoisonPuddle(${position?.x.toFixed(0)},${position?.y.toFixed(0)}) - НЕ РЕАЛИЗОВАНО`);
             // Создание визуального эффекта лужи (спрайт/декаль на земле)
             // Добавление логики урона игроку (`dps`) пока он стоит в луже
             // Удаление лужи через `duration` секунд
        };
        // --- Конец TODO ---

        // --- Проверка условий победы (из code1, адаптировано) ---
        const checkWinCondition = () => {
            if (!levelData?.winCondition || isLoading || levelStatus !== 'playing') {
                return; // Не проверяем, если нет условия, идет загрузка или игра не идет
            }

            // Проверяем, что состояние врагов уже инициализировано хотя бы раз
            // Это важно, чтобы не выиграть сразу, если врагов 0 изначально
             if (enemiesState.length === 0 && initialEnemyStates?.length > 0 && areEnemiesLoaded) {
                  // Если initialEnemyStates был не пустой, а enemiesState стал пустым - значит всех убили
                  if (levelData.winCondition.type === 'clear_enemies') {
                       console.log("Win Condition Check: clear_enemies MET (enemiesState became empty)!");
                       winLevel();
                       return; // Выходим, чтобы не проверять другие условия
                  }
             } else if (enemiesState.length === 0 && initialEnemyStates?.length === 0 && areEnemiesLoaded) {
                 // Если врагов не было изначально, возможно, это уровень на выживание
                 // или другое условие. Не считаем "clear_enemies" выполненным.
             }


            const { type, duration } = levelData.winCondition;

            switch (type) {
                case 'clear_enemies':
                    // Проверяем, есть ли живые враги в ТЕКУЩЕМ состоянии
                    const liveEnemies = enemiesState?.filter(e => e.currentHp > 0) || [];
                     // Условие: живых нет И состояние врагов не пустое (т.е. они были)
                    if (liveEnemies.length === 0 && enemiesState.length > 0) {
                        console.log("Win Condition Check: clear_enemies MET!");
                        winLevel();
                    }
                    break;
                case 'defeat_all_bosses':
                     const liveBosses = enemiesState?.filter(e => e.isBoss && e.currentHp > 0) || [];
                     // Проверяем, были ли боссы вообще в этом состоянии (на случай, если их убили очень быстро)
                     const wereBosses = enemiesState?.some(e => e.isBoss);
                     if (liveBosses.length === 0 && wereBosses) {
                        console.log("Win Condition Check: defeat_all_bosses MET!");
                        winLevel();
                    }
                    break;
                case 'survive_duration':
                    if (levelStartTimeRef.current && duration) {
                        const elapsed = (Date.now() - levelStartTimeRef.current) / 1000;
                        const timeLeft = duration - elapsed;
                        setRemainingTime(timeLeft > 0 ? timeLeft : 0); // Обновляем стейт для UI
                        if (timeLeft <= 0) {
                             console.log("Win Condition Check: survive_duration MET!");
                             winLevel();
                        }
                    }
                    break;
                default:
                    // console.warn(`Неизвестное условие победы: ${type}`);
                    break;
            }
        }; // --- Конец checkWinCondition ---

        // --- Главная функция кадра ---
        const animate = (timestamp) => {
            // Проверка статуса игры перед продолжением
            if (levelStatus !== 'playing') {
                console.log(`Game loop stopping. Status: ${levelStatus}`);
                if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
                clock.stop();
                return;
            }
            // Запрос следующего кадра
            animationFrameId.current = requestAnimationFrame(animate);

            // Расчет Delta Time (dt)
            // const dt = Math.min(clock.getDelta(), 0.05); // Ограничение dt для стабильности
            // --- ИЛИ более точный расчет dt ---
            const dt = timestamp === 0 ? 0.016 : Math.min((timestamp - lastTimestamp) / 1000, 0.05);
            lastTimestamp = timestamp;
            // ---

            // Получаем ссылки на объекты для удобства
            const playerPos = playerObject?.position; // Безопасный доступ
            const currentScene = sceneRef.current;
            const currentCamera = cameraRef.current;
            const currentRenderer = rendererRef.current;

            // Проверка наличия необходимых объектов перед основной логикой
            if (!playerObject || !playerPos || !currentScene || !currentCamera || !currentRenderer || !levelConfig || !playerStats) {
                 console.warn("Пропуск кадра: Отсутствуют необходимые объекты (player, scene, camera, renderer, config, stats)");
                 return;
            }

            // ==================================
            // === 1. Обновление Игрока =======
            // ==================================
            const effectiveSpeed = (playerStats.speed || 3) * (velocity.current.force > 0.1 ? 1 : 0); // Скорость из статов
            const speedMultiplier = 60; // Множитель для согласования скорости

            if (effectiveSpeed > 0) {
                const dx = (velocity.current.x || 0) * effectiveSpeed * dt * speedMultiplier;
                const dy = (velocity.current.y || 0) * effectiveSpeed * dt * speedMultiplier;

                let nextX = playerPos.x + dx;
                let nextY = playerPos.y + dy;
                const PLAYER_SIZE = { width: 30, height: 30 }; // Размер игрока для коллизий

                // --- Проверка коллизий со стенами ---
                const pRect = { x: playerPos.x - PLAYER_SIZE.width / 2, y: playerPos.y - PLAYER_SIZE.height / 2, width: PLAYER_SIZE.width, height: PLAYER_SIZE.height };
                let colX = false;
                let colY = false;
                const pRectX = { ...pRect, x: nextX - PLAYER_SIZE.width / 2 };
                for (const wall of wallsRef.current) { if (checkCollision(pRectX, wall)) { colX = true; break; } }
                const pRectY = { ...pRect, y: nextY - PLAYER_SIZE.height / 2 };
                for (const wall of wallsRef.current) { if (checkCollision(pRectY, wall)) { colY = true; break; } }

                if (!colX) playerPos.x = nextX;
                if (!colY) playerPos.y = nextY;
                // --- ---

                // --- Ограничение по границам мира ---
                const pSizeHW = PLAYER_SIZE.width / 2;
                const pSizeHH = PLAYER_SIZE.height / 2;
                const minX = -levelConfig.gameWorldWidth / 2 + pSizeHW;
                const maxX = levelConfig.gameWorldWidth / 2 - pSizeHW;
                const minYw = -levelConfig.WORLD_Y_OFFSET + pSizeHH; // Нижняя граница с учетом смещения
                const maxYw = levelConfig.gameWorldHeight - levelConfig.WORLD_Y_OFFSET - pSizeHH; // Верхняя граница

                playerPos.x = clamp(playerPos.x, minX, maxX);
                playerPos.y = clamp(playerPos.y, minYw, maxYw);
                // --- ---

                // --- Плавный поворот модели игрока ---
                if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
                    const angle = Math.atan2(dy, dx);
                    let targetRotZ = angle - Math.PI / 2; // Поворот модели (обычно Y вперед)
                    const currentRotZ = playerObject.rotation.z;
                    const twoPi = Math.PI * 2;
                    let diff = targetRotZ - currentRotZ;
                    while (diff < -Math.PI) diff += twoPi;
                    while (diff > Math.PI) diff -= twoPi;
                    const lerpFactor = 0.15; // Коэффициент интерполяции для плавности
                    playerObject.rotation.z += diff * lerpFactor;
                }
                // --- ---

                // TODO: Анимация ходьбы игрока
                // playerObject.userData?.actions?.Walk?.play();
                // playerObject.userData?.actions?.Idle?.stop();
            } else {
                 // TODO: Анимация бездействия игрока
                 // playerObject.userData?.actions?.Idle?.play();
                 // playerObject.userData?.actions?.Walk?.stop();
            }
             // Обновление миксера игрока, если он есть
             playerObject.userData?.mixer?.update(dt);

            // ==================================
            // === 2. Атака Игрока =============
            // ==================================
            playerAttackCooldown.current -= dt;
            if (playerAttackCooldown.current <= 0) {
                const interval = 1 / (playerStats.attackSpeed || 1.0); // Интервал из статов
                playerAttackCooldown.current = interval;
                const range = playerStats.attackRange || 150; // Дальность из статов
                const rangeSq = range * range;
                const target = findNearestEnemy(playerPos, rangeSq);
                if (target) {
                     createProjectile(target);
                     // TODO: Анимация атаки игрока?
                }
            }

            // ==================================
            // === 3. Снаряды Игрока ==========
            // ==================================
            const activeProjectiles = [];
            // Создаем хитбоксы только для живых врагов один раз за кадр
             const enemyHitboxes = enemyRefs?.map(enemy => {
                 if (enemy?.pivot?.position && !enemy.isDead) { // Проверяем isDead
                     const size = 40; // Размер хитбокса врага (можно брать из данных врага)
                     return {
                         id: enemy.id,
                         type: enemy.type, // Для проверки блокировки рыцаря
                         ref: enemy, // Ссылка для прямого доступа к blockCharges
                         x: enemy.pivot.position.x - size / 2,
                         y: enemy.pivot.position.y - size / 2,
                         width: size,
                         height: size
                     };
                 } return null;
             }).filter(Boolean) || []; // Фильтруем null и пустой массив если enemyRefs нет

            projectilesRef.current.forEach(proj => {
                // Движение
                proj.position.add(proj.velocity.clone().multiplyScalar(dt));
                proj.lifetime -= dt;

                // Обновление меша
                if (proj.mesh) proj.mesh.position.copy(proj.position);

                let hit = false;
                // Проверка столкновений, если снаряд жив и есть хитбоксы врагов
                if (proj.lifetime > 0 && enemyHitboxes.length > 0) {
                    const projSize = 8; // Размер хитбокса снаряда
                    const pHitbox = { x: proj.position.x - projSize / 2, y: proj.position.y - projSize / 2, width: projSize, height: projSize };

                    for (const eBox of enemyHitboxes) {
                        if (checkCollision(pHitbox, eBox)) {
                            // Передаем ID и урон в обработчик
                            handleEnemyHit(eBox.id, proj.damage);
                            hit = true;
                            break; // Снаряд попал, дальше не проверяем
                        }
                    }
                }

                // Удаление или сохранение снаряда
                if (proj.lifetime > 0 && !hit) {
                    activeProjectiles.push(proj); // Оставляем
                } else {
                    // Удаляем меш и чистим ресурсы
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
                const enemyState = enemiesState?.find(es => es.id === enemy.id); // Состояние HP

                // Основная проверка: есть ли враг, его pivot, статы, и не помечен ли он как мертвый
                if (!enemy || !enemy.pivot || !enemy.stats || enemy.isDead || !enemyState) {
                     // Если враг помечен как мертвый, но хелсбар еще виден - скрыть
                    if (enemy?.isDead && enemy.hpBar?.container?.visible) {
                         enemy.hpBar.container.visible = false;
                     }
                     // Если враг мертв и у него был луч, удаляем луч
                     if (enemy?.isDead && enemy.beamEffectMesh) {
                          removeBeamMesh(enemy);
                     }
                    return; // Выходим из обработки этого врага
                }

                // Проверка, умер ли враг ТОЛЬКО ЧТО (HP <= 0, но isDead еще false)
                 if (enemyState.currentHp <= 0 /* && !enemy.isDead - уже проверили выше */) {
                    enemy.isDead = true; // Помечаем здесь
                    console.log(`--- Враг ${enemy.id} (${enemy.type}) помечен как isDead в основном цикле (HP=${enemyState.currentHp}) ---`);

                     // --- ЛОГИКА ПРИ СМЕРТИ (для тех, кто не удаляется сразу) ---
                     if (enemy.type === 'rotting_soldier' && !enemy.exploded) {
                        console.log(`Rotting Soldier ${enemy.id} EXPLODES!`);
                         // TODO: Эффект взрыва (визуальный/звуковой) в точке ePos
                         const ePos = enemy.pivot.position;

                         // Урон игроку от взрыва
                         if (enemy.stats.explosionDamage && typeof playerTakeDamage === 'function') {
                             const explosionRadius = enemy.stats.explosionRadius || 50; // Радиус из статов или дефолт
                             const distToPlayer = ePos.distanceTo(playerPos);
                             if (distToPlayer <= explosionRadius) {
                                 console.log(`... Player takes ${enemy.stats.explosionDamage} explosion damage`);
                                 playerTakeDamage(enemy.stats.explosionDamage);
                             }
                         }
                         // Создание облака яда в месте смерти
                         createPoisonCloud(ePos.clone());
                         enemy.exploded = true; // Помечаем, что взорвался
                         if(enemy.pivot) enemy.pivot.visible = false; // Скрываем модель/заглушку
                         if(enemy.hpBar?.container) enemy.hpBar.container.visible = false; // Скрываем хелсбар

                         // Так как он скрыт, можно дальше не обрабатывать AI и т.д.
                         return; // !!! ВАЖНО: выходим из обработки этого врага !!!

                     } else if (enemy.type === 'cursed_carrier') {
                          // Спавн при смерти, если выбран этот вариант
                          // const ePos = enemy.pivot.position;
                          // summonCreature(enemy.stats.summonType || 'skeleton_swordsman', enemy.stats.summonCount || 1, ePos.clone());
                          // console.log(`Cursed Carrier ${enemy.id} summoned on death`);
                     }

                    // Убираем луч, если маг умер во время каста
                    if (enemy.beamEffectMesh) removeBeamMesh(enemy);

                    // TODO: Анимация смерти? Запускаем один раз.
                    // enemy.actions?.[deathActionName]?.reset().play();

                    // После пометки isDead враг больше не будет обновляться в следующих кадрах,
                    // но если у него есть особые действия при смерти (как взрыв), они выполняются здесь.
                    // Само удаление объекта со сцены произойдет позже (или не произойдет, если он просто скрыт).
                    return; // Выходим из обработки мертвого врага
                 }


                // --- Если враг жив (прошел все проверки) ---
                const ePivot = enemy.pivot;
                const ePos = ePivot.position;
                const eStats = enemy.stats;
                const mixer = enemy.mixer; // Анимационный миксер (если есть)
                // playerPos уже есть

                // 2. --- Обновление анимаций (если есть) ---
                mixer?.update(dt);

                // 3. --- Расчет дистанции до игрока ---
                const dist = ePos.distanceTo(playerPos);

                // 4. --- Обновление Хелсбара (из code2, но с проверкой isDead) ---
                if (enemy.hpBar?.container && enemy.hpBar?.fill && enemyState.maxHp > 0 /* && !enemy.isDead - уже проверили */) {
                     const hpPercent = Math.max(0, enemyState.currentHp / enemyState.maxHp); // Не даем уйти в минус
                     const fillMesh = enemy.hpBar.fill;
                     const container = enemy.hpBar.container;
                     const newScaleX = Math.max(0.001, hpPercent); // Минимальный размер, чтобы не исчезал совсем
                     // Центрируем полоску при изменении масштаба
                     const newPosX = (HEALTH_BAR_WIDTH * (newScaleX - 1)) / 2;
                     fillMesh.scale.x = newScaleX;
                     fillMesh.position.x = newPosX;
                     container.visible = true; // Показываем
                     // Поворачиваем к камере
                     if (currentCamera) { container.quaternion.copy(currentCamera.quaternion); }
                } else if (enemy.hpBar?.container) {
                     container.visible = false; // Скрываем, если HP <= 0 или нет данных
                }

                // 5. --- ОБНОВЛЕНИЕ КУЛДАУНОВ ---
                if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt;
                if (enemy.abilityCooldown > 0) enemy.abilityCooldown -= dt;
                // Специфичные кулдауны (если есть)
                if (typeof enemy.beamEffectTimer === 'number' && enemy.beamEffectTimer > 0) {
                    enemy.beamEffectTimer -= dt;
                    if (enemy.beamEffectTimer <= 0) {
                        removeBeamMesh(enemy); // Убираем луч по таймеру
                    }
                }

                 // --- Переменные для AI ---
                 const atkRange = eStats.attackRange || 50; // Базовая дальность атаки/агро
                 const playerInAttackRange = dist <= atkRange;
                 const aggroMultiplier = 5; // Насколько дальше видит враг, чем атакует
                 const aggroRange = atkRange * aggroMultiplier;
                 const playerInAggroRange = dist <= aggroRange;
                 const baseSpeed = eStats.speed || 1.5; // Базовая скорость (пикселей в секунду?)
                 const moveSpeed = baseSpeed * dt; // Дистанция перемещения за кадр

                 // Состояния AI для более сложных поведений (можно вынести вовне)
                 let currentAiState = enemy.aiState || 'idle'; // Получаем текущее состояние

                 // --- Функция для плавного поворота врага ---
                 const rotateEnemyTowards = (targetPosition, rotationSpeed = 0.08) => {
                     const direction = new THREE.Vector3().subVectors(targetPosition, ePos);
                     if (direction.lengthSq() < 0.01) return; // Не поворачиваемся, если цель слишком близко
                     const angle = Math.atan2(direction.y, direction.x);
                     let targetZ = angle - Math.PI / 2; // Модель смотрит по Y+
                     const currentZ = ePivot.rotation.z;
                     const twoPi = Math.PI * 2;
                     let diff = targetZ - currentZ;
                     while (diff < -Math.PI) diff += twoPi;
                     while (diff > Math.PI) diff -= twoPi;
                     const threshold = 0.05; // Порог для мгновенного поворота или начала lerp
                     if (Math.abs(diff) > threshold) {
                         ePivot.rotation.z += diff * rotationSpeed; // Плавный поворот
                     } else {
                          ePivot.rotation.z = targetZ; // Резкий поворот, если почти довернулись
                     }
                     ePivot.rotation.order = 'XYZ'; // Порядок вращения
                     ePivot.rotation.x = 0;
                     ePivot.rotation.y = 0;
                 };

                 // --- Функция для движения врага с коллизиями ---
                 const moveEnemy = (directionVector, speed) => {
                      if (speed <= 0) return;
                      const moveDir = directionVector.clone().normalize();
                      const dx = moveDir.x * speed;
                      const dy = moveDir.y * speed;

                      let nextX = ePos.x + dx;
                      let nextY = ePos.y + dy;
                      const ENEMY_COLLISION_SIZE = { width: 30, height: 30 }; // Размер для коллизий
                      const eRect = { x: ePos.x - ENEMY_COLLISION_SIZE.width / 2, y: ePos.y - ENEMY_COLLISION_SIZE.height / 2, width: ENEMY_COLLISION_SIZE.width, height: ENEMY_COLLISION_SIZE.height };

                      let colX = false; let colY = false;
                      const eRectX = { ...eRect, x: nextX - ENEMY_COLLISION_SIZE.width / 2 };
                      for (const wall of wallsRef.current) { if (checkCollision(eRectX, wall)) { colX = true; break; } }
                      const eRectY = { ...eRect, y: nextY - ENEMY_COLLISION_SIZE.height / 2 };
                      for (const wall of wallsRef.current) { if (checkCollision(eRectY, wall)) { colY = true; break; } }

                      if (!colX) ePos.x = nextX;
                      if (!colY) ePos.y = nextY;

                      // Ограничение по границам мира (важно!)
                      const eSizeHW = ENEMY_COLLISION_SIZE.width / 2;
                      const eSizeHH = ENEMY_COLLISION_SIZE.height / 2;
                      const minX = -levelConfig.gameWorldWidth / 2 + eSizeHW;
                      const maxX = levelConfig.gameWorldWidth / 2 - eSizeHW;
                      const minYw = -levelConfig.WORLD_Y_OFFSET + eSizeHH;
                      const maxYw = levelConfig.gameWorldHeight - levelConfig.WORLD_Y_OFFSET - eSizeHH;
                      ePos.x = clamp(ePos.x, minX, maxX);
                      ePos.y = clamp(ePos.y, minYw, maxYw);

                      return { collidedX: colX, collidedY: colY }; // Возвращаем информацию о столкновении
                 };

                 // --- TODO: Функции для управления анимациями ---
                 const playAnimation = (animName) => {
                      // if (!enemy.actions || !enemy.actions[animName]) return;
                      // // Остановить другие анимации и запустить нужную
                      // Object.values(enemy.actions).forEach(action => {
                      //     if (action !== enemy.actions[animName]) action.fadeOut(0.2);
                      // });
                      // enemy.actions[animName].reset().fadeIn(0.2).play();
                 };


                // 6. --- ЛОГИКА ИИ (switch из code1, доработано) ---
                if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt;
                if (enemy.abilityCooldown > 0) enemy.abilityCooldown -= dt;
                
                // Флаги для общих действий
                let shouldMove = false;
                let moveTargetPos = playerPos.clone(); // По умолчанию движемся к игроку
                let shouldRotate = false;
                let rotateTargetPos = playerPos.clone(); // По умолчанию смотрим на игрока
                
                // --- Выбор поведения по ТИПУ ВРАГА ---
                switch (enemy.type) {
                
                    // === БЛИЖНИЙ БОЙ (ОСНОВНОЙ) ===
                    case 'melee':
                    case 'boss': // Босс пока ведет себя как мили
                    case 'skeleton_swordsman':
                    case 'cursed_gladiator':
                    case 'revenant_knight': // Рыцарь тоже, но с блоком
                    case 'rotting_soldier': // Тоже мили, пока жив
                    case 'cursed_carrier': // Тоже мили, но еще и спаунит
                    {
                        const atkRange = eStats.attackRange || 25;
                        const playerInAttackRange = dist <= atkRange;
                        const aggroMult = 5;
                        const aggroRange = atkRange * aggroMult;
                        const inAggroRange = dist <= aggroRange;
                        let isAttacking = false;
                
                        // --- Логика Рыцаря (Блок) ---
                        let canAttack = true;
                        if (enemy.type === 'revenant_knight') {
                            // Инициализируем заряды блока, если их нет
                            if (typeof enemy.blockCharges === 'undefined') {
                                 enemy.blockCharges = enemy.stats.initialBlockCharges || 0; // Берем из отмасштабированных статов
                                 console.log(`Knight ${enemy.id} initialized with ${enemy.blockCharges} block charges.`);
                            }
                            if (enemy.blockCharges > 0) {
                                canAttack = false; // Не может атаковать, пока есть блок? Или может? Реши сам.
                                // TODO: Анимация блока? Визуальный эффект щита?
                            }
                            // Логика снятия блока должна быть в handleEnemyHit
                        }
                        // --- Конец логики Рыцаря ---
                
                        if (playerInAttackRange && enemy.attackCooldown <= 0 && canAttack) { // Атака
                            let currentDamage = eStats.damage || 5;
                            // --- Логика Гладиатора (Стаки) ---
                            if (enemy.type === 'cursed_gladiator') {
                                if (typeof enemy.damageStacks === 'undefined') enemy.damageStacks = 0;
                                currentDamage += enemy.damageStacks * (eStats.stackDamageBonus || 1);
                                enemy.damageStacks++; // Увеличиваем стаки ПОСЛЕ атаки
                            }
                            // --- Конец логики Гладиатора ---
                
                            console.log(`${enemy.id} (${enemy.type}) attacks player! Damage: ${currentDamage}`);
                            if (typeof playerTakeDamage === 'function') playerTakeDamage(currentDamage);
                            enemy.attackCooldown = 1 / (eStats.attackSpeed || 1.0);
                            isAttacking = true;
                            // TODO: Анимация атаки
                
                        } else if (inAggroRange && !playerInAttackRange) { // Преследование
                            shouldMove = true;
                            moveTargetPos = playerPos.clone();
                            shouldRotate = true;
                            rotateTargetPos = playerPos.clone();
                            // TODO: Анимация ходьбы
                        } else if (!inAggroRange && enemy.type === 'cursed_carrier' && enemy.abilityCooldown <= 0) {
                             // Носильщик спаунит, даже если игрок далеко? Или только когда стоит? Решим пока так.
                              console.log(`Carrier ${enemy.id} summons while idle...`);
                              // summonCreature(eStats.summonType || 'skeleton_swordsman', eStats.summonCount || 1, ePos);
                              enemy.abilityCooldown = eStats.summonCooldown || 15.0;
                              // TODO: Анимация призыва?
                        }
                        else { // Бездействие
                             // TODO: Анимация Idle
                             // У рыцаря может быть BlockIdle
                             // if (enemy.type === 'revenant_knight' && enemy.blockCharges > 0) { /* Анимация BlockIdle */ }
                        }
                
                        // --- Логика Носильщика (Спаун по КД, если не атакует) ---
                         if (enemy.type === 'cursed_carrier' && !isAttacking && enemy.abilityCooldown <= 0) {
                              console.log(`Carrier ${enemy.id} summons...`);
                              // summonCreature(eStats.summonType || 'skeleton_swordsman', eStats.summonCount || 1, ePos);
                              enemy.abilityCooldown = eStats.summonCooldown || 15.0; // Сброс КД
                              // TODO: Анимация призыва?
                         }
                         // --- Конец логики Носильщика ---
                
                        break; // Конец case для мили-подобных
                    }
                
                
                    // === ДАЛЬНИЙ БОЙ (Снаряды) ===
                    case 'ranged':
                    case 'skeleton_archer':
                    {
                         const atkRange = eStats.attackRange || 100;
                         const playerInAttackRange = dist <= atkRange;
                         shouldRotate = playerInAttackRange; // Поворачиваемся только если видим цель?
                
                         if (playerInAttackRange) {
                             if (enemy.attackCooldown <= 0) {
                                 console.log(`${enemy.id} firing projectile!`);
                                 // createEnemyProjectile(enemy, playerPos); // Вызываем функцию создания снаряда
                                 enemy.attackCooldown = 1 / (eStats.attackSpeed || 0.8);
                                 // TODO: Анимация атаки
                             } else {
                                 // TODO: Анимация перезарядки/ожидания
                             }
                         } else {
                             // --- Патрулирование (Очень простое - стоим на месте) ---
                             // TODO: Заменить на реальное патрулирование
                             shouldMove = false;
                             // TODO: Анимация Idle
                         }
                         rotateTargetPos = playerPos.clone(); // Цель поворота всегда игрок, если поворачиваемся
                         break;
                     }
                
                
                    // === КАСТЕРЫ (Лучи / Снаряды в точку) ===
                    case 'caster': // Огонь/Лед
                    case 'ghostly_enchanter': // Ослабление
                    case 'ogre_mage': // Снаряд в точку
                    {
                        const atkRange = eStats.attackRange || 300;
                        const playerInAttackRange = dist <= atkRange;
                        shouldRotate = playerInAttackRange; // Поворот только если видит игрока
                        rotateTargetPos = playerPos.clone();
                
                        if (playerInAttackRange) {
                             if (enemy.attackCooldown <= 0) {
                                  // Кастуем!
                                  enemy.attackCooldown = 1 / (eStats.attackSpeed || 0.5);
                                  // TODO: Анимация каста ('Attack')
                
                                 if (enemy.type === 'ogre_mage') {
                                     enemy.targetPosition = playerPos.clone(); // Запомнить точку
                                     console.log(`Ogre Mage ${enemy.id} attacks target point!`);
                                     // TODO: createProjectileToPoint(ePos, enemy.targetPosition, eStats.damage || 10, 400); // Создать снаряд, летящий в точку
                                 } else if (enemy.type === 'ghostly_enchanter') {
                                     console.log(`Enchanter ${enemy.id} applies weaken!`);
                                     // TODO: applyPlayerDebuff('weaken', eStats.debuffDuration || 5, eStats.debuffStrength || 0.2); // Применить дебафф
                                     // TODO: Визуализация луча ослабления? (можно использовать createBeamMeshFixed/updateBeamMesh)
                                 } else { // Обычные маги огня/льда
                                      if (typeof playerTakeDamage === 'function') playerTakeDamage(eStats.beamDamage || 1); // Урон от луча (мгновенный?)
                                      if (eStats.beamType === 'fire') { console.log("Applying FIRE DoT (placeholder)"); /* TODO: applyPlayerDoT('fire', ...) */ }
                                      else if (eStats.beamType === 'ice') { console.log("Applying ICE Freeze (placeholder)"); /* TODO: applyPlayerStatus('frozen', ...) */ }
                                      // Визуализация луча
                                      if(enemy.beamEffectMesh) removeBeamMesh(enemy);
                                      enemy.beamEffectMesh = createBeamMeshFixed(enemy, playerPos);
                                      if (enemy.beamEffectMesh) enemy.beamEffectTimer = eStats.beamEffectDuration || 1.0;
                                 }
                             } else {
                                 // Ожидание кулдауна
                                  if (enemy.beamEffectMesh) updateBeamMesh(enemy.beamEffectMesh, ePos, playerPos); // Обновляем существующий луч
                                 // TODO: Анимация Idle или Aiming
                             }
                         } else { // Игрок вне радиуса
                             if (enemy.beamEffectMesh) removeBeamMesh(enemy); // Убираем луч
                             // TODO: Анимация Idle
                         }
                          // Обновление/удаление визуала луча по таймеру
                          if (enemy.beamEffectMesh && enemy.beamEffectTimer > 0) {
                              enemy.beamEffectTimer -= dt;
                              if (enemy.beamEffectTimer <= 0) removeBeamMesh(enemy);
                          }
                         break;
                    }
                
                
                    // === УНИКАЛЬНЫЕ НОВЫЕ ТИПЫ ===
                
                    case 'necromancer': {
                        shouldRotate = true; // Всегда смотрит на игрока
                        rotateTargetPos = playerPos.clone();
                        // Призыв по кулдауну способности
                        if (enemy.abilityCooldown <= 0) {
                            console.log(`Necromancer ${enemy.id} summons ${eStats.summonCount || 1} ${eStats.summonType || 'skeleton_spirit'}!`);
                            // TODO: Вызвать функцию summonCreature(eStats.summonType || 'skeleton_spirit', eStats.summonCount || 1, ePos);
                            enemy.abilityCooldown = eStats.summonCooldown || 10.0; // Сброс кулдауна
                            // TODO: Анимация призыва ('Attack'?)
                        } else {
                            // TODO: Анимация Idle
                        }
                        // TODO: Добавить простое движение к игроку или от него?
                        break;
                    }
                
                    case 'bone_dancer': {
                        const desiredDist = 60; // Дистанция орбиты
                        const orbitSpeed = (eStats.speed || 3.0) * 60 * dt; // Скорость движения
                        const adjustSpeed = orbitSpeed * 0.5; // Скорость приближения/удаления
                
                        let dirToPlayer = new THREE.Vector3().subVectors(playerPos, ePos);
                        let currentDist = dirToPlayer.length();
                        let tangentDir = new THREE.Vector3(-dirToPlayer.y, dirToPlayer.x, 0).normalize(); // Перпендикуляр
                        let radialDir = dirToPlayer.normalize(); // Направление к/от игрока
                
                        let moveVector = tangentDir; // Начинаем с движения по касательной
                
                        // Коррекция дистанции
                        if (currentDist < desiredDist - 5) { // Слишком близко - отбегаем
                             moveVector.sub(radialDir.multiplyScalar(adjustSpeed / orbitSpeed)); // Вычитаем часть радиального вектора
                        } else if (currentDist > desiredDist + 5) { // Слишком далеко - приближаемся
                             moveVector.add(radialDir.multiplyScalar(adjustSpeed / orbitSpeed)); // Добавляем часть радиального вектора
                        }
                
                        moveVector.normalize().multiplyScalar(orbitSpeed); // Нормализуем и применяем скорость
                
                        // Применяем движение
                        const nextX = ePos.x + moveVector.x;
                        const nextY = ePos.y + moveVector.y;
                        // TODO: Проверка коллизий со стенами для nextX, nextY
                        ePos.x = nextX;
                        ePos.y = nextY;
                
                        shouldRotate = true; // Поворачиваемся
                        rotateTargetPos = playerPos.clone(); // Смотрим на игрока (или по движению?)
                        // TODO: Анимация бега ('Walk')
                        break;
                    }
                
                
                    case 'plague_totemist': {
                         shouldRotate = true; // Смотрит на игрока
                         rotateTargetPos = playerPos.clone();
                         // Ставит тотем по кулдауну способности
                         if (enemy.abilityCooldown <= 0) {
                             console.log(`Totemist ${enemy.id} places a ${eStats.totemType || 'debuff'} totem!`);
                             // TODO: Вызвать placeTotem(ePos, eStats.totemType || 'debuff_slow', ...);
                             enemy.abilityCooldown = eStats.totemCooldown || 12.0;
                             // TODO: Анимация каста ('Attack'?)
                         } else {
                             // TODO: Стоять или двигаться? Анимация Idle.
                         }
                        break;
                     }
                
                
                    case 'sand_reaper': {
                         shouldRotate = true; // Смотрит на игрока
                         rotateTargetPos = playerPos.clone();
                         // Кастует шипы по кулдауну способности
                         if (enemy.abilityCooldown <= 0) {
                             console.log(`Sand Reaper ${enemy.id} summons spikes under player!`);
                             // TODO: Вызвать triggerGroundSpikes(playerPos.clone(), eStats.spikeDelay || 1.0, ...);
                             enemy.abilityCooldown = eStats.abilityCooldown || 5.0;
                             // TODO: Анимация каста ('Attack'?)
                         } else {
                             // TODO: Стоять или двигаться? Анимация Idle.
                         }
                        break;
                     }
                
                
                    case 'poison_cultist': {
                         shouldRotate = true; // Смотрит на игрока
                         rotateTargetPos = playerPos.clone();
                         const atkRange = eStats.attackRange || 200; // Радиус для атаки
                         const playerInAttackRange = dist <= atkRange;
                
                         if (playerInAttackRange && enemy.abilityCooldown <= 0) { // Атакует в радиусе по КД
                             console.log(`Cultist ${enemy.id} throws poison puddle!`);
                             // TODO: Вызвать createPoisonPuddle(playerPos.clone(), ...); // Кидает в игрока
                             enemy.abilityCooldown = eStats.abilityCooldown || 8.0;
                             // TODO: Анимация атаки ('Attack')
                         } else {
                             // TODO: Стоять или двигаться? Анимация Idle.
                         }
                        break;
                     }
                
                    default:
                        console.warn(`Неизвестный или необработанный тип врага в switch: ${enemy.type}`);
                        // Базовое поведение - просто стоять
                        // TODO: Анимация Idle
                        break;
                } // --- Конец switch(enemy.type) ---
                
                // --- Общая Логика для всех: Поворот и Движение (если нужно) ---
                if (shouldRotate && rotateTargetPos) {
                   // rotateEnemyToTarget(ePivot, rotateTargetPos, dt, 0.05); // Вызов функции поворота
                   // Временная заглушка поворота:
                    let dirRot = new THREE.Vector3().subVectors(rotateTargetPos, ePos);
                    const angle = Math.atan2(dirRot.y, dirRot.x);
                    let targetZ = angle + Math.PI / 2; // +PI/2 т.к. модель смотрит по Y
                    const curZ = ePivot.rotation.z;
                    const twoPi = Math.PI * 2;
                    let diff = targetZ - curZ;
                    while (diff < -Math.PI) diff += twoPi;
                    while (diff > Math.PI) diff -= twoPi;
                    const thresh = 0.05; // Порог для моментального поворота
                    if (Math.abs(diff) > thresh) {
                        const lerp = 0.08; // Плавность поворота
                        ePivot.rotation.z = curZ + diff * lerp;
                    } else {
                        ePivot.rotation.z = targetZ; // Поворачиваем точно, если близко
                    }
                    ePivot.rotation.order = 'XYZ'; ePivot.rotation.x = 0; ePivot.rotation.y = 0;
                }
                
                if (shouldMove && moveTargetPos) {
                   // Движение (этот код нужно будет вставить в нужные case выше,
                   // здесь он для примера, как было у мили)
                   // let chaseDir = new THREE.Vector3().subVectors(moveTargetPos, ePos);
                   // const moveDir = chaseDir.normalize();
                   // const moveSpeed = (eStats.speed || 1.5) * dt * 60;
                   // if (moveSpeed > 0) {
                   //     const nextX = ePos.x + moveDir.x * moveSpeed;
                   //     const nextY = ePos.y + moveDir.y * moveSpeed;
                   //     // TODO: checkWallCollisionPlaceholder(...)
                   //     ePos.x = nextX;
                   //     ePos.y = nextY;
                   // }
                }
                
                }); // --- Конец enemyRefs.forEach ---
                

            // ==================================
            // === 5. Снаряды Врагов ==========
            // ==================================
            const activeEnemyProjectiles = [];
            const PLAYER_HITBOX_SIZE = { width: 25, height: 25 }; // Хитбокс игрока (чуть меньше модели)
            const playerHitboxForEnemyProj = playerObject ? {
                 x: playerPos.x - PLAYER_HITBOX_SIZE.width / 2,
                 y: playerPos.y - PLAYER_HITBOX_SIZE.height / 2,
                 width: PLAYER_HITBOX_SIZE.width,
                 height: PLAYER_HITBOX_SIZE.height
             } : null;

            if (playerHitboxForEnemyProj) { // Обрабатываем снаряды только если игрок жив и есть хитбокс
                enemyProjectilesRef.current.forEach(proj => {
                    // Движение
                    proj.position.add(proj.velocity.clone().multiplyScalar(dt));
                    proj.lifetime -= dt;
                    // Обновление меша
                    if (proj.mesh) {
                        proj.mesh.position.copy(proj.position);
                        // Обновление поворота стрелы/снаряда
                        proj.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), proj.velocity.clone().normalize());
                    }

                    let hitPlayer = false;
                    if (proj.lifetime > 0) {
                        // Хитбокс снаряда врага
                        const projSize = 10; // Размер хитбокса стрелы
                        const projHitbox = { x: proj.position.x - projSize / 2, y: proj.position.y - projSize / 2, width: projSize, height: projSize };
                        // Проверка коллизии с игроком
                        if (checkCollision(projHitbox, playerHitboxForEnemyProj)) {
                            if (typeof playerTakeDamage === 'function') {
                                playerTakeDamage(proj.damage);
                            } else { console.error("playerTakeDamage is not a function!"); }
                            hitPlayer = true;
                        }
                        // TODO: Проверка коллизии со стенами для вражеских снарядов?
                    }

                    // Удаление или сохранение снаряда
                    if (proj.lifetime > 0 && !hitPlayer) {
                        activeEnemyProjectiles.push(proj); // Оставляем
                    } else {
                        // Удаляем меш и чистим ресурсы
                        if (proj.mesh) {
                            currentScene?.remove(proj.mesh);
                            proj.mesh.geometry?.dispose();
                            proj.mesh.material?.dispose();
                        }
                    }
                });
                enemyProjectilesRef.current = activeEnemyProjectiles; // Обновляем массив
            } else {
                 // Если игрока нет (или его хитбокс не определен), удаляем все вражеские снаряды
                 enemyProjectilesRef.current.forEach(proj => {
                     if (proj.mesh) {
                         currentScene?.remove(proj.mesh);
                         proj.mesh.geometry?.dispose();
                         proj.mesh.material?.dispose();
                     }
                 });
                 enemyProjectilesRef.current = [];
            }


            // ==================================
            // === 6. Проверка Победы/Проигрыша =
            // ==================================
             // Проверка проигрыша по HP уже есть в отдельном useEffect
             checkWinCondition(); // Проверяем условия победы

            // ==================================
            // === 7. Обновление Камеры ========
            // ==================================
             if (playerObject && currentCamera && levelConfig) {
                 const camWidth = currentCamera.right - currentCamera.left;
                 const camHeight = currentCamera.top - currentCamera.bottom;
                 // Ограничиваем позицию камеры, чтобы она не выходила за края мира
                 const targetXCam = clamp(
                     playerPos.x,
                     -levelConfig.gameWorldWidth / 2 + camWidth / 2, // Левая граница
                     levelConfig.gameWorldWidth / 2 - camWidth / 2   // Правая граница
                 );
                 const targetYCam = clamp(
                     playerPos.y,
                     -levelConfig.WORLD_Y_OFFSET + camHeight / 2, // Нижняя граница
                     levelConfig.gameWorldHeight - levelConfig.WORLD_Y_OFFSET - camHeight / 2 // Верхняя граница
                 );
                 // Плавное следование камеры
                 currentCamera.position.lerp(new THREE.Vector3(targetXCam, targetYCam, currentCamera.position.z), 0.1);
                 // lookAt не нужен для ортографической камеры, если она не вращается
                 // currentCamera.lookAt(currentCamera.position.x, currentCamera.position.y, 0);
             }


            // ==================================
            // === 8. Рендеринг =================
            // ==================================
            if (currentRenderer && currentScene && currentCamera) {
                try {
                     currentRenderer.render(currentScene, currentCamera);
                } catch (error) {
                     console.error("❌ Ошибка рендеринга:", error);
                     setLevelStatus('error'); // Устанавливаем статус ошибки
                     if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current); // Останавливаем цикл
                     animationFrameId.current = null;
                     clock.stop();
                }
            }

        }; // --- Конец функции animate ---

        // Запуск первого кадра, если цикл еще не запущен
        if (!animationFrameId.current) {
            clock.start();
            lastTimestamp = performance.now(); // Инициализируем timestamp
            animationFrameId.current = requestAnimationFrame(animate);
        }

        // Функция очистки для useEffect игрового цикла
        return () => {
            console.log("<<< ОСТАНОВКА ИГРОВОГО ЦИКЛА (Очистка useEffect) >>>");
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
            clock.stop();
            // Очистка снарядов и эффектов при остановке цикла (на всякий случай)
             projectilesRef.current.forEach(p => p.mesh && sceneRef.current?.remove(p.mesh));
             projectilesRef.current = [];
             enemyProjectilesRef.current.forEach(p => p.mesh && sceneRef.current?.remove(p.mesh));
             enemyProjectilesRef.current = [];
             enemyRefs?.forEach(e => { if (e.beamEffectMesh) removeBeamMesh(e); });
        };
    }, [ // Зависимости главного цикла (Тщательно отобраны!)
        // === Основные состояния и объекты ===
        isLoading,         // Флаг общей загрузки
        levelStatus,       // 'playing', 'won', 'lost', 'error'
        levelData,         // Данные уровня (для winCondition и др.)
        levelConfig,       // Размеры мира и смещения
        playerObject,      // Объект игрока (для позиции и анимаций)
        enemyRefs,         // Массив ссылок на объекты врагов
        enemiesState,      // Состояние HP врагов
        playerStats,       // Статы игрока
        beamTexturesLoaded,// Флаг загрузки текстур лучей

        // === Функции, определенные ВНЕ этого useEffect ===
        playerTakeDamage,  // Функция из useGameStore
        handleEnemyHit,    // useCallback для обработки урона врагу
        winLevel,          // useCallback для установки статуса победы
        loseLevel,         // useCallback для установки статуса проигрыша
        difficulty         // Сложность (если влияет на логику в цикле, хотя сейчас влияет только на useEnemyLoader)
        // Функции, определенные ВНУТРИ (animate, helpers), не включаются!
    ]);


    // === 11. РЕНДЕР JSX (из code2, с мелкими правками) ===
    return (
        <div className="game-wrapper">
            {/* Оверлей загрузки */}
            {isLoading && <LoadingScreen />} {/* Используем LoadingScreen из code1 */}

            {/* Игровой контейнер - скрываем через visibility, чтобы сохранить размеры */}
            <div className="game-container" style={{ visibility: isLoading ? 'hidden' : 'visible' }}>
                {/* Отображаем HP игрока только если игрок и статы загружены */}
                {!isLoading && playerObject && typeof playerHp === 'number' && typeof displayMaxHp === 'number' && (
                    <HealthBar currentHp={playerHp} maxHp={displayMaxHp} />
                )}
                {/* Таймер выживания */}
                {!isLoading && levelData?.winCondition?.type === 'survive_duration' && remainingTime !== null && levelStatus === 'playing' && (
                     <div className="survival-timer"> Выжить: {Math.ceil(remainingTime)} сек </div>
                 )}
                {/* Место для рендера Three.js */}
                <div ref={mountRef} className="game-canvas"></div>
            </div>

            {/* Джойстик - скрываем во время загрузки */}
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
                     {/* Отображаем ID уровня и сложность */}
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

export default Level; // Экспорт по умолчанию