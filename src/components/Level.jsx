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
import { BASE_ENEMY_STATS } from '../data/enemyBaseStats';


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
    const effectTimersRef = useRef([]);
    const velocity = useRef({ x: 0, y: 0, force: 0 });
    const playerAttackCooldown = useRef(0);
    const levelStartTimeRef = useRef(null);
    const readyCalledRef = useRef(false);
    const beamTexturesRef = useRef({});
    const backgroundMeshRef = useRef(null); // Реф для фона
    const fogOverlaysRef = useRef({}); // Для хранения мешей тумана по ID комнаты
    const fogMaterialRef = useRef(null); // Для создания материала тумана один раз
    const worldRoomBoundariesRef = useRef({});
    const [clearedRoomIds, setClearedRoomIds] = useState(new Set());


    

    // === Состояния ===
    const [isLoading, setIsLoading] = useState(true);
    const [levelStatus, setLevelStatus] = useState('playing');
    const [enemiesState, setEnemiesState] = useState([]); // Состояние HP врагов
    const [remainingTime, setRemainingTime] = useState(null);
    const [beamTexturesLoaded, setBeamTexturesLoaded] = useState(false);
    const [activeClouds, setActiveClouds] = useState([]); // <<< НОВОЕ СОСТОЯНИЕ для облаков
    const activeCloudsRef = useRef([]); // Реф для доступа в animate
    const enemiesStateRef = useRef(enemiesState); // Реф для актуального состояния врагов
    const [currentActiveRoomId, setCurrentActiveRoomId] = useState(null);


    useEffect(() => {
        enemiesStateRef.current = enemiesState;
        console.log("[enemiesStateRef updated] Length:", enemiesState.length, enemiesState); // Лог для проверки
    }, [enemiesState]); // Этот эффект сработает КАЖДЫЙ РАЗ при изменении enemiesState

    
    
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
            if (fogMaterialRef.current) {
                console.log("[Level.jsx] Disposing shared fog material");
                fogMaterialRef.current.dispose();
                fogMaterialRef.current = null;
            }

            // Сброс рефов
            sceneRef.current = null;
            rendererRef.current = null;
            cameraRef.current = null;
        };
    }, []);

 // --- Добавление Фона, Стен, ТУМАНА ВОЙНЫ и РАСЧЕТ ГРАНИЦ КОМНАТ ---
useEffect(() => {
    const currentScene = sceneRef.current;
    // Обновленная проверка: добавили levelData и fogMaterialRef
    if (!currentScene || !levelConfig || !levelData || !fogMaterialRef.current) {
        console.log("[Level.jsx] Skip Background/Walls/Fog/Boundaries: Missing critical refs or data.");
        return;
    }
    console.log("[Level.jsx] Создание/обновление фона, стен, тумана войны и границ комнат");

    // --- РАСЧЕТ ГРАНИЦ КОМНАТ В МИРОВЫХ КООРДИНАТАХ (из код1) ---
    // После того как levelConfig и levelData.rooms точно доступны
    if (levelData.rooms && levelConfig) {
        const boundaries = {};
        levelData.rooms.forEach(room => {
            if (room.area) {
                // Конвертируем min/max Tiled координаты в min/max мировые координаты
                // Для X: Tiled X -> World X (convertTiledX(tiledX, 0, worldWidth))
                // Для Y: Tiled Y -> World Y (WORLD_Y_OFFSET - tiledY) (упрощенно, без objectHeight)
                // convertTiledY(tiledY, 0, gameWorldHeight, WORLD_Y_OFFSET)

                // Важно: convertTiledX дает ЦЕНТР объекта, если objectWidth > 0.
                // Если мы передаем 0, то это просто конвертация точки.
                // x_min_world будет соответствовать левой границе, x_max_world - правой.
                // y_min_world будет соответствовать ВЕРХНЕЙ границе в Three.js (большее значение Y в Tiled),
                // y_max_world будет соответствовать НИЖНЕЙ границе в Three.js (меньшее значение Y в Tiled).
                // Это из-за инверсии Y в convertTiledY.

                // x_min_world < x_max_world
                // y_min_world (верхняя граница) > y_max_world (нижняя граница) в координатах Three.js, если Y растет вверх.
                // Давай пересмотрим convertTiledY: WORLD_Y_OFFSET - y - objectHeight / 2.
                // Если y_tiled_min = 50 (верхняя в Tiled), y_tiled_max = 590 (нижняя в Tiled) для room2_north
                // world_y_for_tiled_y_50 = W_H/2 - 50
                // world_y_for_tiled_y_590 = W_H/2 - 590
                // То есть, в мире Three.js: y_max_world = W_H/2 - 50, y_min_world = W_H/2 - 590. (y_min_world < y_max_world)

                boundaries[room.id] = {
                    xMinWorld: convertTiledX(room.area.x_min, 0, levelConfig.gameWorldWidth),
                    xMaxWorld: convertTiledX(room.area.x_max, 0, levelConfig.gameWorldWidth),
                    // Для Y нужно быть внимательным с инверсией.
                    // convertTiledY переводит верхнюю границу Tiled в верхнюю границу мира, нижнюю Tiled в нижнюю мира.
                    // y_min в Tiled (например, 50) это ВЕРХ комнаты. y_max в Tiled (например, 590) это НИЗ комнаты.
                    // В мире Three.js Y растет ВВЕРХ.
                    // convertTiledY(room.area.y_min) даст БОЛЬШЕЕ значение Y (верхняя граница мира)
                    // convertTiledY(room.area.y_max) даст МЕНЬШЕЕ значение Y (нижняя граница мира)
                    yMaxWorld: convertTiledY(room.area.y_min, 0, levelConfig.gameWorldHeight, levelConfig.WORLD_Y_OFFSET), // Верхняя граница комнаты в мире
                    yMinWorld: convertTiledY(room.area.y_max, 0, levelConfig.gameWorldHeight, levelConfig.WORLD_Y_OFFSET)  // Нижняя граница комнаты в мире
                };
            }
        });
        worldRoomBoundariesRef.current = boundaries; // Предполагается, что worldRoomBoundariesRef это useRef(), определенный где-то выше
        console.log("[Level.jsx] World room boundaries calculated:", boundaries);
    }

    // --- Очистка старого ---

    // Очистка старого фона
    if(backgroundMeshRef.current) {
        console.log("  > Removing old background");
        currentScene.remove(backgroundMeshRef.current);
        backgroundMeshRef.current.geometry?.dispose();
        backgroundMeshRef.current.material?.map?.dispose();
        backgroundMeshRef.current.material?.dispose();
        backgroundMeshRef.current = null;
    }

    // Очистка старых стен
    if(wallsRef.current.length > 0) {
        console.log(`  > Removing ${wallsRef.current.length} old walls`);
        wallsRef.current.forEach(w => {
            if(w.mesh) {
                currentScene.remove(w.mesh);
                w.mesh.geometry?.dispose();
                // Общий материал стен не удаляем тут, он будет удален при размонтировании, если нужно
            }
        });
        wallsRef.current = [];
    }

    // Очистка старого тумана
    Object.values(fogOverlaysRef.current).forEach(overlay => {
        if (overlay) {
            console.log(`  > Removing old fog overlay: ${overlay.name}`);
            currentScene.remove(overlay);
            overlay.geometry?.dispose();
            // Материал общий (fogMaterialRef.current), не удаляем его здесь.
        }
    });
    fogOverlaysRef.current = {}; // Очищаем объект со ссылками на туман

    // --- Создание нового ФОНА ---
    const textureLoader = new THREE.TextureLoader();
    if (levelData?.backgroundTexture) {
        console.log(`  > Loading background texture: ${levelData.backgroundTexture}`);
        textureLoader.load(
            levelData.backgroundTexture,
            (texture) => { // Success callback
                if (!sceneRef.current) return;
                console.log("    * Background texture loaded successfully");
                texture.encoding = THREE.sRGBEncoding;
                const bgGeometry = new THREE.PlaneGeometry(levelConfig.gameWorldWidth, levelConfig.gameWorldHeight);
                const bgMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                const backgroundMesh = new THREE.Mesh(bgGeometry, bgMaterial);
                backgroundMesh.position.set(0, 0, -10); // Z=-10
                backgroundMesh.renderOrder = -1; // Чтобы рендерился первым
                sceneRef.current.add(backgroundMesh);
                backgroundMeshRef.current = backgroundMesh;
            },
            undefined, // onProgress callback (не используется)
            (error) => { // Error callback
                console.error("❌ Ошибка загрузки фона:", error);
                if(sceneRef.current) sceneRef.current.background = new THREE.Color(0x282c34); // Установка цвета фона по умолчанию при ошибке
            }
        );
    } else {
        console.log("  > No background texture specified, using color.");
        currentScene.background = new THREE.Color(0x282c34);
    }

    // --- Создание новых СТЕН ---
    // Важно: стены должны быть добавлены на сцену ДО тумана,
    // чтобы туман был поверх них (если Z-позиция тумана это предполагает).
    if (levelData?.walls && levelData.walls.length > 0) {
        console.log(`  > Creating ${levelData.walls.length} walls`);
          const wallMaterial = new THREE.MeshStandardMaterial({ // Предполагаем, что материал стен может быть общим
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

                const wallGeometry = new THREE.BoxGeometry(wallWidth, wallHeight, 10); // Глубина стены 10
                const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
                wallMesh.position.set(wallX, wallY, -5); // Z-позиция стен, чтобы были перед фоном, но за туманом
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
           console.log("  > No walls data found for creation.");
       }

    // --- Создание нового ТУМАНА ВОЙНЫ ---
    if (levelData.rooms && levelData.rooms.length > 0) {
        console.log(`  > Creating fog for ${levelData.rooms.length} rooms`);
        levelData.rooms.forEach(room => {
            if (!room.area) {
                console.warn(`Room ${room.id} has no area defined, skipping fog.`);
                return;
            }

            const roomWidth = room.area.x_max - room.area.x_min;
            const roomHeight = room.area.y_max - room.area.y_min;

            if (roomWidth <= 0 || roomHeight <= 0) {
                console.warn(`Room ${room.id} has invalid area dimensions, skipping fog.`);
                return;
            }

            const fogGeometry = new THREE.PlaneGeometry(roomWidth, roomHeight);
            // Используем общий материал из fogMaterialRef
            const fogOverlayMesh = new THREE.Mesh(fogGeometry, fogMaterialRef.current);

            const roomCenterX_tiled = room.area.x_min + roomWidth / 2;
            const roomCenterY_tiled = room.area.y_min + roomHeight / 2;

            const worldX = convertTiledX(roomCenterX_tiled, 0, levelConfig.gameWorldWidth);
            const worldY = convertTiledY(roomCenterY_tiled, 0, levelConfig.gameWorldHeight, levelConfig.WORLD_Y_OFFSET);

            fogOverlayMesh.position.set(worldX, worldY, 0.5); // Z=0.5, чтобы быть над фоном/полом, но под персонажами
            fogOverlayMesh.name = `fog_overlay_${room.id}`;

            if (room.isStartingRoom) {
                fogOverlayMesh.visible = false;
                console.log(`    * Fog for starting room ${room.id} created and hidden.`);
            } else {
                fogOverlayMesh.visible = true;
                console.log(`    * Fog for room ${room.id} created and visible.`);
            }
            
            currentScene.add(fogOverlayMesh);
            fogOverlaysRef.current[room.id] = fogOverlayMesh;
        });
    } else {
        console.log("  > No rooms data found for fog creation.");
    }

    // --- Функция очистки для этого useEffect ---
    return () => {
        console.log("[Level.jsx] Очистка фона, стен и тумана перед пересозданием/размонтированием");
        const sceneForCleanup = sceneRef.current; // Используем локальную копию, на случай если sceneRef изменится
        if (sceneForCleanup) {
            // Очистка фона
            if(backgroundMeshRef.current) {
                sceneForCleanup.remove(backgroundMeshRef.current);
                backgroundMeshRef.current.geometry?.dispose();
                backgroundMeshRef.current.material?.map?.dispose();
                backgroundMeshRef.current.material?.dispose();
            }
            
            // Очистка стен
            wallsRef.current.forEach(w => {
                if (w.mesh) {
                    sceneForCleanup.remove(w.mesh);
                    w.mesh.geometry?.dispose();
                    // Общий материал стен (wallMaterial) был создан внутри этого useEffect.
                    // Если он больше нигде не используется и не сохраняется в ref для последующего dispose,
                    // он будет удален сборщиком мусора, когда все ссылки на него пропадут.
                    // Однако, если вы хотите быть более явными, можно сохранить wallMaterial в ref
                    // (например, wallMaterialRef.current = wallMaterial;) и затем диспозить его здесь:
                    // wallMaterialRef.current?.dispose(); wallMaterialRef.current = null;
                    // В текущей реализации, он не диспозится явно, что может быть нормально для многих случаев.
                }
            });
            sceneForCleanup.background = null; // Сбрасываем фон сцены, если он был установлен как цвет

            // Очистка тумана
            Object.values(fogOverlaysRef.current).forEach(overlay => {
                if (overlay) {
                    sceneForCleanup.remove(overlay);
                    overlay.geometry?.dispose();
                    // Общий материал fogMaterialRef.current НЕ удаляется здесь,
                    // он должен быть удален при размонтировании компонента Level целиком, если он там создается.
                }
            });
        }
        backgroundMeshRef.current = null;
        wallsRef.current = [];
        fogOverlaysRef.current = {};
        // worldRoomBoundariesRef.current = {}; // Очистка границ, если это необходимо при размонтировании/пересоздании
    };
// Используем обновленные зависимости, так как levelData включает все необходимое
// и worldRoomBoundariesRef также зависит от levelData и levelConfig
}, [levelConfig, levelData, fogMaterialRef.current]); // sceneRef, convertTiledX, convertTiledY, worldRoomBoundariesRef - также являются зависимостями, если они не стабильны.
                                                    // Однако, ref-ы (sceneRef, fogMaterialRef, worldRoomBoundariesRef) обычно стабильны.
                                                    // Функции convertTiledX, convertTiledY - если они определены вне компонента или являются useCallback с пустым массивом зависимостей,
                                                    // то их можно не включать. Если они пересоздаются при каждом рендере, их стоит включить или обернуть в useCallback.

    // --- Загрузка Игрока ---
    const { playerObject, isPlayerModelLoaded } = usePlayerLoader(
        playerStats?.skin || "/Models/character.glb",
        levelData?.playerStart || (levelConfig ? { x: 0, y: levelConfig.WORLD_Y_OFFSET - 50 } : { x: 0, y: 0 }),
        sceneRef.current,
        levelConfig
    );

    // --- Загрузка Врагов (ИСПОЛЬЗУЕМ useEnemyLoader) ---
    const {
        enemyRefs: loadedEnemyRefsArray,  // Это МАССИВ данных врагов из useEnemyLoader
        setEnemyRefs: setLoadedEnemyRefsArray, // Это ФУНКЦИЯ для обновления этого массива
        areEnemiesLoaded,
        initialEnemyStates: loadedInitialStates,
        // shieldResources // Если нужны
    } = useEnemyLoader(
        levelData?.enemies,
        sceneRef.current, // sceneRef должен быть useRef(), инициализированный в Level.jsx
        levelConfig,
        levelData?.id,
        difficulty,
        BASE_ENEMY_STATS
    );

    // --- Управление общей загрузкой ---
    useEffect(() => {
        // Определяем, все ли необходимые ресурсы загружены
        const allLoaded = !!levelConfig && isPlayerModelLoaded && areEnemiesLoaded && beamTexturesLoaded;
        const currentlyLoading = !allLoaded; // Обратное значение для состояния "идет загрузка"
    
        // Если состояние загрузки изменилось (например, с true на false)
        if (isLoading !== currentlyLoading) {
            setIsLoading(currentlyLoading); // Обновляем состояние загрузки в родительском компоненте или локально
    
            // Если загрузка ТОЛЬКО ЧТО завершилась
            if (!currentlyLoading) {
                // И если колбек onReady еще не был вызван (чтобы избежать многократного вызова)
                if (!readyCalledRef.current) {
                    console.log("✨ Уровень ГОТОВ! Вызов onReady.");
    
                    // Инициализация HP игрока, если соответствующая функция передана
                    if (typeof initializeLevelHp === 'function') {
                        initializeLevelHp();
                        console.log("HP игрока инициализировано после загрузки.");
                    } else {
                        console.error("ОШИБКА: initializeLevelHp не функция при вызове onReady!");
                    }
    
                    // Вызов колбека onReady, если он передан как пропс
                    if (typeof onReady === 'function') {
                        onReady();
                    } else {
                        console.warn("Пропс onReady не передан в Level.");
                    }
                    readyCalledRef.current = true; // Помечаем, что onReady и инициализация уровня были выполнены
    
                    // --- НАЧАЛО ИНТЕГРИРОВАННОГО КОДА (из код1) ---
                    // Установка стартовой комнаты после полной загрузки уровня и вызова onReady
                    // Проверяем наличие levelData и массива комнат
                    if (levelData && levelData.rooms && Array.isArray(levelData.rooms)) {
                        // Ищем комнату, помеченную как стартовая
                        const startingRoom = levelData.rooms.find(room => room.isStartingRoom);
    
                        if (startingRoom) {
                            setCurrentActiveRoomId(startingRoom.id);
                            console.log(`[Level.jsx] Starting room set to: ${startingRoom.id}`);
                            // Согласно комментарию в код1: "Туман для стартовой комнаты уже должен быть скрыт при создании".
                            // Если требуется дополнительная гарантия скрытия тумана здесь:
                            // if (fogOverlaysRef.current && fogOverlaysRef.current[startingRoom.id] && fogOverlaysRef.current[startingRoom.id].visible !== false) {
                            //     fogOverlaysRef.current[startingRoom.id].visible = false;
                            //     console.log(`[Level.jsx] Fog explicitly ensured hidden for designated starting room: ${startingRoom.id}`);
                            // }
                        } else {
                            console.warn("[Level.jsx] No starting room defined in levelData.rooms!");
                            // Если стартовая комната не определена, но комнаты есть, используем первую из списка
                            if (levelData.rooms.length > 0) {
                                const firstRoomAsStarting = levelData.rooms[0];
                                setCurrentActiveRoomId(firstRoomAsStarting.id);
                                console.log(`[Level.jsx] Defaulting to first room as starting room: ${firstRoomAsStarting.id}`);
                                // Скрыть туман для первой комнаты, если она выбрана как стартовая по умолчанию
                                if (fogOverlaysRef.current && fogOverlaysRef.current[firstRoomAsStarting.id]) {
                                    // Проверяем, что туман действительно видим, перед тем как его скрывать
                                    if (fogOverlaysRef.current[firstRoomAsStarting.id].visible !== false) {
                                        fogOverlaysRef.current[firstRoomAsStarting.id].visible = false;
                                        console.log(`[Level.jsx] Fog cleared for default starting room: ${firstRoomAsStarting.id}`);
                                    }
                                } else {
                                    // Это предупреждение может быть полезно, если ожидается, что для каждой комнаты есть оверлей тумана
                                    console.warn(`[Level.jsx] Fog overlay not found or not applicable for default starting room: ${firstRoomAsStarting.id}`);
                                }
                            } else {
                                // Если комнат вообще нет
                                console.error("[Level.jsx] No rooms available in levelData.rooms to set as a default starting room.");
                            }
                        }
                    } else {
                        // Если данные о комнатах отсутствуют или некорректны
                        console.warn("[Level.jsx] levelData.rooms is not available or not an array. Cannot set starting room.");
                    }
                    // --- КОНЕЦ ИНТЕГРИРОВАННОГО КОДА ---
    
                    // Логика для условия победы "выжить определенное время"
                    if (levelData?.winCondition?.type === 'survive_duration') {
                        levelStartTimeRef.current = Date.now(); // Запоминаем время начала уровня
                        setRemainingTime(levelData.winCondition.duration); // Устанавливаем общее время для выживания
                        console.log(`Survival Timer Started: ${levelData.winCondition.duration}s`);
                    } else {
                        levelStartTimeRef.current = null; // Сбрасываем время начала, если условие не "survive_duration"
                        setRemainingTime(null); // Сбрасываем оставшееся время
                    }
                } else {
                    // Этот блок выполнится, если загрузка завершилась, но onReady уже был вызван ранее (например, из-за изменения зависимостей)
                    console.log("[Level.jsx] Загрузка завершена, но onReady уже был вызван ранее.");
                }
            } else {
                // Если загрузка еще не завершена (currentlyLoading === true)
                console.log("[Level.jsx] Переход в состояние загрузки...");
            }
        }
    }, [
        levelConfig,            // Конфигурация уровня
        isPlayerModelLoaded,    // Флаг загрузки модели игрока
        areEnemiesLoaded,       // Флаг загрузки врагов
        beamTexturesLoaded,     // Флаг загрузки текстур лучей
        isLoading,              // Текущее состояние загрузки (из state)
        // setIsLoading,        // Функция для установки isLoading, обычно стабильна и не требуется в зависимостях, если это setState из useState
        onReady,                // Колбек, вызываемый по готовности уровня (пропс)
        initializeLevelHp,      // Функция инициализации HP (пропс)
        levelData,              // Данные уровня, включая levelData.rooms и levelData.winCondition. Важно для логики стартовой комнаты и условий победы.
        // setCurrentActiveRoomId, // Функция для установки активной комнаты (setState), стабильна
        // fogOverlaysRef,      // ref-объект, стабилен
        // readyCalledRef,      // ref-объект, стабилен
        // levelStartTimeRef,   // ref-объект, стабилен
        // setRemainingTime     // Функция для установки оставшегося времени (setState), стабильна
    ]);

    // --- Инициализация состояния врагов ---
    useEffect(() => {
        if (areEnemiesLoaded && loadedInitialStates && loadedInitialStates.length > 0) {
            if (JSON.stringify(enemiesState) !== JSON.stringify(loadedInitialStates)) {
                 console.log(`--- ИНИЦИАЛИЗАЦИЯ enemiesState (${loadedInitialStates.length} шт.) из initialEnemyStates ---`);
                 setEnemiesState(loadedInitialStates);
            }
        } else if (!areEnemiesLoaded && enemiesState.length > 0) {
             console.log("--- Очистка enemiesState, т.к. areEnemiesLoaded = false ---");
             setEnemiesState([]);
        }
    }, [areEnemiesLoaded, loadedInitialStates]); // Не зависим от enemiesState

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

    const spikeResources = useMemo(() => {
        // Параметры шипа (можно вынести в константы)
        const indicatorRadius = 30; // Базовый радиус
        const spikeHeight = indicatorRadius * 1.2;
        const spikeRadius = indicatorRadius * 0.15;
        const spikeColor = 0xB8860B; // Песочный
    
        return {
            geometry: new THREE.ConeGeometry(spikeRadius, spikeHeight, 8),
            material: new THREE.MeshStandardMaterial({
                color: spikeColor,
                roughness: 0.7,
                metalness: 0.2
            })
        };
    }, []); // Создаем один раз
    
    // --- Добавляем очистку spikeResources в useEffect ---
    useEffect(() => {
        return () => {
            console.log("Очистка общих ресурсов шипов из Level");
            spikeResources.geometry.dispose();
            spikeResources.material.dispose();
            // ... очистка hpResources ...
        };
    }, [spikeResources, hpResources]); // Добавляем spikeResources в зависимости

    useEffect(() => {
        console.log('[RoomCheck DEBUG] useEffect triggered. currentActiveRoomId:', currentActiveRoomId, 'clearedRoomIds:', clearedRoomIds, 'enemiesState length:', enemiesState?.length);
    
        if (!currentActiveRoomId || clearedRoomIds.has(currentActiveRoomId) || !levelData?.enemies || !enemiesState?.length) {
            console.log('[RoomCheck DEBUG] Early return. Conditions:', {
                hasActiveRoom: !!currentActiveRoomId,
                isAlreadyCleared: currentActiveRoomId ? clearedRoomIds.has(currentActiveRoomId) : 'N/A',
                hasLevelEnemies: !!levelData?.enemies,
                hasEnemiesState: !!enemiesState?.length
            });
            return;
        }
    
        const monstersInCurrentRoom = levelData.enemies.filter(enemyDef => enemyDef.roomId === currentActiveRoomId);
        console.log(`[RoomCheck DEBUG] For room '${currentActiveRoomId}', monstersInCurrentRoom (from levelData):`, monstersInCurrentRoom.map(m => m.id), `Count: ${monstersInCurrentRoom.length}`);
        
        if (monstersInCurrentRoom.length === 0 && currentActiveRoomId && !levelData.rooms.find(r => r.id === currentActiveRoomId)?.isStartingRoom) {
            console.log(`[RoomCheck DEBUG] Room '${currentActiveRoomId}' is defined as empty in levelData and not starting room. Returning.`);
            return;
        }
    
        let allMonstersInRoomDead = true;
        if (monstersInCurrentRoom.length > 0) {
            console.log('[RoomCheck DEBUG] Checking individual monster states...');
            for (const enemyDef of monstersInCurrentRoom) {
                const enemyState = enemiesState.find(es => es.id === enemyDef.id);
                if (enemyState) {
                    console.log(`[RoomCheck DEBUG] Monster ${enemyDef.id} (in room ${currentActiveRoomId}): currentHp = ${enemyState.currentHp}`);
                    if (enemyState.currentHp > 0) {
                        allMonstersInRoomDead = false;
                        console.log(`[RoomCheck DEBUG] Monster ${enemyDef.id} is ALIVE. Setting allMonstersInRoomDead = false.`);
                        break;
                    }
                } else {
                    // Если монстр определен для комнаты в levelData, но его нет в enemiesState
                    // Это может быть нормально, если он еще не активирован (initiallyActive: false и комната еще не посещалась)
                    // Но если ВСЕ монстры комнаты, которые ДОЛЖНЫ БЫТЬ активны, мертвы, комната зачищена.
                    // Если монстр initiallyActive: true, он ДОЛЖЕН быть в enemiesState.
                    // Если initiallyActive: false, и комната только что стала активной, он должен появиться в enemiesState.
                    // Этот момент нужно аккуратно продумать: как мы считаем монстров, которые еще не были добавлены в enemiesState?
                    // Пока что, если его нет в enemiesState, мы его не считаем "живым", что может привести к преждевременной зачистке,
                    // ЕСЛИ не все монстры комнаты добавляются в enemiesState при активации комнаты.
                    // Но useEnemyLoader должен добавлять всех (даже неактивных initiallyActive:false) в initialEnemyStates,
                    // так что они должны быть в enemiesState с самого начала.
                    console.warn(`[RoomCheck DEBUG] Monster ${enemyDef.id} (defined for room ${currentActiveRoomId}) NOT FOUND in enemiesState. This might be an issue.`);
                    // Если мы хотим, чтобы все монстры, перечисленные для комнаты, были УЧТЕНЫ (т.е. были в enemiesState и имели hp <=0),
                    // то отсутствие в enemiesState должно считаться как "комната не зачищена".
                    // allMonstersInRoomDead = false; 
                    // break;
                }
            }
        } else {
            // Если в levelData.enemies нет монстров для этой комнаты
            allMonstersInRoomDead = false;
            console.log(`[RoomCheck DEBUG] No monsters defined for room ${currentActiveRoomId} in levelData, so allMonstersInRoomDead = false (nothing to clear).`);
        }
        
        console.log(`[RoomCheck DEBUG] Final check: allMonstersInRoomDead = ${allMonstersInRoomDead}, monstersInCurrentRoom.length = ${monstersInCurrentRoom.length}`);
    
    
        if (allMonstersInRoomDead && monstersInCurrentRoom.length > 0) {
            console.log(`[RoomCheck] 🎉 Комната ${currentActiveRoomId} ЗАЧИЩЕНА!`);
            
            // --- Шаг B: Найти дверь(и), которая открывается этой комнатой ---
            const doorsToOpenData = levelData.walls.filter(wallDataInLevel =>
                wallDataInLevel.isDoor === true && wallDataInLevel.opensWhenRoomCleared === currentActiveRoomId
            );
        
            if (doorsToOpenData.length > 0) {
                doorsToOpenData.forEach(doorData => {
                    console.log(`[DoorLogic] Найдена дверь для открытия: ID='${doorData.id}', ведет в '${doorData.targetRoomIdForDoor || 'не указано'}'`);
                    
                    // Теперь найдем соответствующий 3D объект (меш) этой двери в wallsRef.current
                    const doorWallObjectInRef = wallsRef.current.find(wallRef => wallRef.id === doorData.id);
        
                    if (doorWallObjectInRef && doorWallObjectInRef.mesh) {
                        const doorMesh = doorWallObjectInRef.mesh;
                        const doorId = doorData.id; // Сохраним ID для использования в логах и filter
                    
                        console.log(`[DoorLogic] Найден 3D объект (меш) для двери ${doorId}. Открываем (удаляем).`);
                    
                        // 1. Удаляем 3D объект двери со сцены
                        if (sceneRef.current && doorMesh.parent === sceneRef.current) { // Убедимся, что он на сцене
                            sceneRef.current.remove(doorMesh);
                        } else if (sceneRef.current && doorMesh.parent !== sceneRef.current && doorMesh.parent instanceof THREE.Object3D) {
                            // Если меш вложен в другой объект (например, в pivot самого wallRef, что вероятно)
                            doorMesh.parent.remove(doorMesh);
                        }
                        wallsRef.current = wallsRef.current.filter(wallInRef => wallInRef.id !== doorId);
    
                        console.log(`[DoorLogic] Дверь ${doorId} удалена со сцены и из массива стен для коллизий.`);
                    
                    } else {
                        console.warn(`[DoorLogic] Не найден 3D объект (меш) для двери с ID '${doorData.id}' в wallsRef.current. Проверьте ID.`);
                    }
                });
            } else {
                console.log(`[DoorLogic] Для зачищенной комнаты ${currentActiveRoomId} не найдено дверей в levelData.walls, которые должны открыться.`);
            }
            // --- Конец Шага B ---
        
            // Помечаем комнату как зачищенную (это у тебя уже есть)
            setClearedRoomIds(prevCleared => new Set(prevCleared).add(currentActiveRoomId));
        }
    
    }, [enemiesState, currentActiveRoomId, clearedRoomIds, levelData]); // Следим за этими зависимостями

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
        if (!currentScene || !loadedEnemyRefsArray || !enemiesState) {
            return; // Выходим, если что-то не готово
        }

        // Проходим по ТЕКУЩИМ РЕФАМ (3D объектам), которые могут быть на сцене
        loadedEnemyRefsArray.forEach(enemyRef => {
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
    }, [enemiesState, loadedEnemyRefsArray, sceneRef, createPoisonCloud, hpResources]);

    

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
        // <<< ИСПОЛЬЗУЕМ loadedEnemyRefsArray ИЗ СОСТОЯНИЯ >>>
        const enemyRef = loadedEnemyRefsArray.find(ref => ref && ref.id === enemyId);

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
    // <<< ОБНОВЛЯЕМ ЗАВИСИМОСТИ: используем loadedEnemyRefsArray из состояния >>>
    }, [loadedEnemyRefsArray, enemiesState, playerTakeDamage]); // Добавили loadedEnemyRefsArray

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


 // --- Функция для атаки Шипами Жнеца (ОБНОВЛЕНА с конусами) ---
 // Предполагается, что `spikeResources` определен где-то в области видимости этого useCallback,
// и содержит предварительно созданные `geometry` и `material` для шипов.
// Например:
// const spikeResources = {
//   geometry: new THREE.ConeGeometry(некий_радиус, некая_высота, 8), // Геометрия должна быть определена
//   material: new THREE.MeshStandardMaterial({ color: 0xC19A6B, roughness: 0.8, metalness: 0.2 }), // Материал должен быть определен
// };
// Эти `некий_радиус` и `некая_высота` должны соответствовать желаемым параметрам шипов.
// Если они должны зависеть от `indicatorRadius`, то `spikeResources` должен обновляться соответствующим образом вне этой функции.

// В Level.jsx

const triggerGroundSpikes = useCallback((casterId, targetPos, delay, radius, damage) => {
    const currentScene = sceneRef.current;
    if (!currentScene || !playerObject) return;

    console.log(` Reaper ${casterId} кастует шипы в (${targetPos.x.toFixed(0)}, ${targetPos.y.toFixed(0)}) с задержкой ${delay}с`);

    const indicatorRadius = radius || 30;
    const spikeHeight = indicatorRadius * 1.5; // Высота конуса
    const spikeRadius = indicatorRadius * 0.2; // Радиус основания конуса
    const numSpikes = 7; // Количество шипов
    const spikeColor = 0xC19A6B; // Песочно-коричневый
    const eruptionDuration = 0.5; // Как долго шипы видны (секунд)

    // --- 1. Создаем индикатор опасности (Красное Кольцо) ---
    const indicatorGeometry = new THREE.RingGeometry(indicatorRadius - 2, indicatorRadius, 32);
    const indicatorMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide, transparent: true, opacity: 0.6, depthWrite: false });
    const indicatorMesh = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicatorMesh.position.copy(targetPos);
    indicatorMesh.position.z = -8.8; // На земле, чуть выше фона
    indicatorMesh.rotation.x = -Math.PI / 2;
    indicatorMesh.renderOrder = 6;
    currentScene.add(indicatorMesh);
    // ---

    // --- 2. Таймер для срабатывания шипов ---
    const eruptionTimerId = setTimeout(() => {
        // Удаляем индикатор
        currentScene?.remove(indicatorMesh);
        indicatorGeometry.dispose();
        indicatorMaterial.dispose();

        const currentPlayerPos = playerObject?.position;
        console.log(` Reaper ${casterId} шипы появились! Проверка игрока @ (${currentPlayerPos?.x.toFixed(0)}, ${currentPlayerPos?.y.toFixed(0)})`);

        // --- 3. Создаем ШИПЫ (КОНУСЫ) ---
         // Используем ОБЩИЕ ресурсы, если они были созданы через useMemo (как для хелсбаров/щита)
         // Или создаем новые КАЖДЫЙ РАЗ (как здесь) - тогда нужно их очищать в cleanupTimer
         const spikeGeometry = new THREE.ConeGeometry(spikeRadius, spikeHeight, 8);
         const spikeMaterial = new THREE.MeshStandardMaterial({ // <<< Standard Material - НУЖЕН СВЕТ!
              color: spikeColor,
              roughness: 0.8,
              metalness: 0.2
         });
         const spikeMeshes = []; // Массив для хранения созданных мешей

        console.log(`   -> Создание ${numSpikes} шипов...`);
        for (let i = 0; i < numSpikes; i++) {
            const spikeMesh = new THREE.Mesh(spikeGeometry, spikeMaterial);
            const angle = (i / numSpikes) * Math.PI * 2 * (1 + (Math.random() - 0.5) * 0.3);
            const dist = indicatorRadius * (0.2 + Math.random() * 0.7);
            spikeMesh.position.copy(targetPos);
            spikeMesh.position.x += Math.cos(angle) * dist;
            spikeMesh.position.y += Math.sin(angle) * dist;
            spikeMesh.position.z = spikeHeight / 2; // <<< Основание на земле (Z=0)
            spikeMesh.rotation.x = (Math.random() - 0.5) * 0.4;
            spikeMesh.rotation.z = (Math.random() - 0.5) * 0.4;
            spikeMesh.renderOrder = 7;
            currentScene.add(spikeMesh); // <<< ДОБАВЛЯЕМ НА СЦЕНУ
            spikeMeshes.push(spikeMesh);
        }
        console.log(`   -> ${spikeMeshes.length} шипов добавлено на сцену.`);
        // ---

        // --- 4. Проверяем урон игроку ---
        if (currentPlayerPos && typeof playerTakeDamage === 'function' && playerHp > 0) {
             const distSq = currentPlayerPos.distanceToSquared(targetPos);
             if (distSq <= indicatorRadius * indicatorRadius) {
                 const finalDamage = damage || 15;
                 console.log(` Игрок получил урон от шипов! Урон: ${finalDamage}`);
                 playerTakeDamage(finalDamage);
             }
        }

        // --- 5. Таймер для удаления шипов ---
        const cleanupTimerId = setTimeout(() => {
             console.log(` Reaper ${casterId} удаляет ${spikeMeshes.length} шипов.`);
             spikeMeshes.forEach(spike => {
                  currentScene?.remove(spike);
             });
             // Очищаем ГЕОМЕТРИЮ и МАТЕРИАЛ, так как создавали их в этом вызове
              spikeGeometry.dispose();
              spikeMaterial.dispose();
             effectTimersRef.current = effectTimersRef.current.filter(id => id !== cleanupTimerId);
        }, eruptionDuration * 1000);

        effectTimersRef.current.push(cleanupTimerId);
        effectTimersRef.current = effectTimersRef.current.filter(id => id !== eruptionTimerId);

    }, delay * 1000);

    effectTimersRef.current.push(eruptionTimerId);

}, [sceneRef, playerObject, playerTakeDamage, playerHp]); // Зависимости

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
        if (isLoading || levelStatus !== 'playing' || !playerObject || !loadedEnemyRefsArray || !sceneRef.current || !rendererRef.current || !cameraRef.current || !levelConfig || !beamTexturesLoaded) {
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
            loadedEnemyRefsArray?.forEach(enemy => {
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
            console.log("Player Attack Stat:", playerStats?.attack);
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
// Предполагается, что THREE, HEALTH_BAR_WIDTH, levelConfig, playerStats, checkCollision, clamp, 
// createProjectile, handleEnemyHit, playerTakeDamage, removeBeamMesh, createPoisonCloud,
// checkWinCondition, loadedEnemyRefsArray (массив объектов врагов с полями isActive, isDead, pivot, stats, hpBar, mixer, type, id и т.д.),
// enemiesStateRef, playerObject, sceneRef, cameraRef, rendererRef, wallsRef, projectilesRef,
// enemyProjectilesRef, activeCloudsRef, clock, velocity, playerAttackCooldown,
// lastTimestamp, animationFrameId, levelStatus, setLevelStatus, playerHp,
// createBeamMeshFixed, updateBeamMesh, triggerGroundSpikes, (и возможно другие функции, вызываемые из ИИ врагов)
// УЖЕ ОПРЕДЕЛЕНЫ И ДОСТУПНЫ В ЭТОЙ ОБЛАСТИ ВИДИМОСТИ.

const animate = (timestamp) => {
    if (levelStatus !== 'playing') {
        console.log(`Game loop stopping. Status: ${levelStatus}`);
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
        clock.stop();
        return;
    }
    animationFrameId.current = requestAnimationFrame(animate);

    const dt = timestamp === 0 ? 0.016 : Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;
    
    const currentEnemiesState = enemiesStateRef.current;
    const playerPos = playerObject?.position;
    const currentScene = sceneRef.current;
    const currentCamera = cameraRef.current;
    const currentRenderer = rendererRef.current;
    
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

        const pRect = { x: playerPos.x - PLAYER_SIZE.width / 2, y: playerPos.y - PLAYER_SIZE.height / 2, width: PLAYER_SIZE.width, height: PLAYER_SIZE.height };
        let colX = false;
        let colY = false;
        const pRectX = { ...pRect, x: nextX - PLAYER_SIZE.width / 2 };
        for (const wall of wallsRef.current) { if (checkCollision(pRectX, wall)) { colX = true; break; } }
        const pRectY = { ...pRect, y: nextY - PLAYER_SIZE.height / 2 };
        for (const wall of wallsRef.current) { if (checkCollision(pRectY, wall)) { colY = true; break; } }

        if (!colX) playerPos.x = nextX;
        if (!colY) playerPos.y = nextY;

        const pSizeHW = PLAYER_SIZE.width / 2;
        const pSizeHH = PLAYER_SIZE.height / 2;
        const minX = -levelConfig.gameWorldWidth / 2 + pSizeHW;
        const maxX = levelConfig.gameWorldWidth / 2 - pSizeHW;
        const minYw = -levelConfig.WORLD_Y_OFFSET + pSizeHH;
        const maxYw = levelConfig.gameWorldHeight - levelConfig.WORLD_Y_OFFSET - pSizeHH;
        playerPos.x = clamp(playerPos.x, minX, maxX);
        playerPos.y = clamp(playerPos.y, minYw, maxYw);

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
    }
    playerObject.userData?.mixer?.update(dt); 

    // Внутри animate
let playerCurrentRoom = null;
if (playerObject?.position && levelData?.rooms) {
    const pX = playerObject.position.x;
    const pY = playerObject.position.y;

    for (const room of levelData.rooms) { // Или итерироваться по keys(worldRoomBoundariesRef.current)
        const bounds = worldRoomBoundariesRef.current[room.id];
        if (bounds &&
            pX >= bounds.xMinWorld && pX <= bounds.xMaxWorld &&
            pY >= bounds.yMinWorld && pY <= bounds.yMaxWorld) {
            playerCurrentRoom = room.id;
            break;
        }
    }
}

if (playerCurrentRoom && playerCurrentRoom !== currentActiveRoomId) {
    console.log(`Player entered new room: ${playerCurrentRoom}. Previously active: ${currentActiveRoomId}`);
    // Здесь будет логика активации новой комнаты:
    // 1. Скрыть туман для playerCurrentRoom
    if (fogOverlaysRef.current[playerCurrentRoom]) {
        fogOverlaysRef.current[playerCurrentRoom].visible = false;
    }
    // 2. Активировать монстров в playerCurrentRoom
    if (loadedEnemyRefsArray) { // Добавим проверку, что массив существует
        loadedEnemyRefsArray.forEach(enemy => {
            if (enemy.roomId === playerCurrentRoom && !enemy.isActive) {
                enemy.isActive = true;
                if (enemy.pivot) {
                    enemy.pivot.visible = true; // Делаем видимым
                }
                console.log(`Enemy ${enemy.id} in room ${playerCurrentRoom} activated.`);
                if (enemy.aiState === 'SLEEPING' || !enemy.aiState) { // "Разбудить" AI
                    enemy.aiState = 'IDLE';
                }
            }
        });
    }
    
    setCurrentActiveRoomId(playerCurrentRoom);
}

    // ==================================
    // === 2. Атака Игрока =============
    // ==================================
    playerAttackCooldown.current -= dt;
    if (playerAttackCooldown.current <= 0) {
        const interval = 1 / (playerStats.attackSpeed || 1.0);
        playerAttackCooldown.current = interval;
        const range = playerStats.attackRange || 150;
        const rangeSq = range * range;
        const target = findNearestEnemy(playerPos, rangeSq); 
        if (target) {
            createProjectile(target); 
        }
    }

    // ==================================
    // === 3. Снаряды Игрока ==========
    // ==================================
    const activeProjectiles = [];
    const enemyHitboxes = loadedEnemyRefsArray?.map(enemy => {
        // Убедимся, что enemy.isActive существует и используется (если нет, считать true или добавить)
        // Добавлена проверка !enemy.isActive
        if (enemy?.pivot?.position && !enemy.isDead && (typeof enemy.isActive === 'undefined' || enemy.isActive)) {
            const size = 40; 
            return {
                id: enemy.id,
                type: enemy.type,
                ref: enemy, 
                x: enemy.pivot.position.x - size / 2,
                y: enemy.pivot.position.y - size / 2,
                width: size,
                height: size
            };
        } return null;
    }).filter(Boolean) || [];

    projectilesRef.current.forEach(proj => {
        proj.position.add(proj.velocity.clone().multiplyScalar(dt)); 
        proj.lifetime -= dt; 
        if (proj.mesh) proj.mesh.position.copy(proj.position); 

        let hit = false;
        if (proj.lifetime > 0 && enemyHitboxes.length > 0) {
            const projSize = 8;
            const pHitbox = { x: proj.position.x - projSize / 2, y: proj.position.y - projSize / 2, width: projSize, height: projSize };
            for (const eBox of enemyHitboxes) {
                if (checkCollision(pHitbox, eBox)) {
                    console.log(`>>> СНАРЯД ${proj.id} ПОПАЛ во врага ${eBox.id}! Урон: ${proj.damage}`);
                    handleEnemyHit(eBox.id, proj.damage); 
                    hit = true;
                    break;
                }
            }
        }

        if (proj.lifetime > 0 && !hit) {
            activeProjectiles.push(proj);
        } else { 
            if (proj.mesh) {
                currentScene?.remove(proj.mesh);
                proj.mesh.geometry?.dispose();
                proj.mesh.material?.dispose();
            }
        }
    });
    projectilesRef.current = activeProjectiles; 

    // ==================================
    // === 4. Обновление Врагов ========
    // ==================================
    loadedEnemyRefsArray?.forEach(enemy => {
        // +++ ВАЖНОЕ ИЗМЕНЕНИЕ ИЗ КОД1: Проверка активности и состояния "мертв" +++
        // Предполагаем, что 'enemy.isActive' существует. Если нет, эту проверку нужно адаптировать.
        if (!enemy.isActive || enemy.isDead) {
            if (enemy.hpBar?.container) {
                enemy.hpBar.container.visible = false;
            }
            if (enemy.isDead && enemy.beamEffectMesh) { // Дополнительно для мертвых
                 removeBeamMesh(enemy);
            }
            return; // Пропускаем неактивных или мертвых врагов
        }
        // +++ КОНЕЦ ВАЖНОГО ИЗМЕНЕНИЯ ИЗ КОД1 +++

        // Если мы дошли сюда, значит enemy.isActive === true и enemy.isDead === false.
        // Убедимся, что pivot врага видим (из код1)
        if (enemy.pivot && !enemy.pivot.visible) {
             enemy.pivot.visible = true; 
        }

        const enemyState = currentEnemiesState.find(es => es.id === enemy.id);

        // Базовые проверки (объединение код1 и существующей логики из код2)
        // isDead уже проверен выше.
        if (!enemy.pivot || !enemy.stats || !enemyState) {
            if (enemy.hpBar?.container) enemy.hpBar.container.visible = false;
            if (enemy.beamEffectMesh) removeBeamMesh(enemy); 
            return;
        }
        
        // Проверка смерти по HP из состояния (если он только что умер)
        if (enemyState.currentHp <= 0) {
            enemy.isDead = true; 
            console.log(`--- Враг ${enemy.id} (${enemy.type}) ПОМЕЧЕН МЕРТВЫМ в animate (HP=${enemyState.currentHp}) ---`);
            
            // --- ЛОГИКА ПРИ СМЕРТИ (объединенная) ---
            if (enemy.type === 'rotting_soldier' && !enemy.exploded) {
                console.log(`Rotting Soldier ${enemy.id} EXPLODES!`);
                const ePosOnDeath = enemy.pivot.position.clone();
                if (enemy.stats.explosionDamage && typeof playerTakeDamage === 'function') {
                    const explosionRadius = enemy.stats.explosionRadius || 50;
                    if (ePosOnDeath.distanceTo(playerPos) <= explosionRadius) {
                        console.log(`... Player takes ${enemy.stats.explosionDamage} explosion damage`);
                        playerTakeDamage(enemy.stats.explosionDamage);
                    }
                }
                createPoisonCloud(ePosOnDeath); 
                enemy.exploded = true;
                if (enemy.pivot) enemy.pivot.visible = false; 
            } else if (enemy.type === 'cursed_carrier') {
                // Ваша логика призыва существ при смерти (если вы вернетесь к суммонерам)
                console.log(`Cursed Carrier ${enemy.id} умер. TODO: логика призыва существ.`);
            }

            if (enemy.hpBar?.container) enemy.hpBar.container.visible = false; 
            if (enemy.beamEffectMesh) removeBeamMesh(enemy); 
            
            // Завершаем обработку, так как враг только что умер.
            // useEffect должен позаботиться об удалении из массива врагов.
            return; 
        }

        // --- Если враг жив и активен ---
        const ePivot = enemy.pivot;
        const ePos = ePivot.position;
        const eStats = enemy.stats;
        // const mixer = enemy.mixer; // enemy.mixer используется напрямую ниже

        // Обновление анимаций (из код1)
        enemy.mixer?.update(dt);

        // Обновление Хелсбара (из код1)
        if (enemy.hpBar?.container && enemy.hpBar?.fill && enemyState && enemyState.maxHp > 0) {
            enemy.hpBar.container.visible = true; 
            const hpPercent = Math.max(0, enemyState.currentHp / enemyState.maxHp);
            const fillMesh = enemy.hpBar.fill;
            const newScaleX = Math.max(0.001, hpPercent);
            fillMesh.scale.x = newScaleX;
            // HEALTH_BAR_WIDTH должна быть определена глобально или передана
            fillMesh.position.x = (HEALTH_BAR_WIDTH * (newScaleX - 1)) / 2; 
            if (cameraRef.current) { 
                enemy.hpBar.container.quaternion.copy(cameraRef.current.quaternion);
            }
        } else if (enemy.hpBar?.container) { 
            enemy.hpBar.container.visible = false;
        }
        
        // --- Остальная логика ИИ, движения, атак, кулдаунов из код2 ---
        const dist = ePos.distanceTo(playerPos); // Расчет дистанции до игрока
    
        // Обновление кулдаунов
        if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt;
        if (enemy.abilityCooldown > 0) enemy.abilityCooldown -= dt;
        if (typeof enemy.beamEffectTimer === 'number' && enemy.beamEffectTimer > 0) {
            enemy.beamEffectTimer -= dt;
            if (enemy.beamEffectTimer <= 0) {
                removeBeamMesh(enemy); 
            }
        }

        // Вспомогательные функции для ИИ
        const rotateEnemyTowards = (targetPosition, rotationSpeed = 0.08) => {
            const direction = new THREE.Vector3().subVectors(targetPosition, ePos);
            if (direction.lengthSq() < 0.01) return; 
            const angle = Math.atan2(direction.y, direction.x);
            let targetZ = angle - Math.PI / 2; 
            const currentZ = ePivot.rotation.z;
            const twoPi = Math.PI * 2;
            let diff = targetZ - currentZ;
            while (diff <= -Math.PI) diff += twoPi;
            while (diff > Math.PI) diff -= twoPi;
            const threshold = 0.05; 
            if (Math.abs(diff) > threshold) {
                ePivot.rotation.z += diff * rotationSpeed; 
            } else {
                ePivot.rotation.z = targetZ; 
            }
            ePivot.rotation.order = 'XYZ';
            ePivot.rotation.x = 0;
            ePivot.rotation.y = 0;
        };

        const ENEMY_COLLISION_SIZE = { width: 30, height: 30 }; 

        const moveEnemyWithCollision = (directionVector, speedValue) => {
            if (typeof dt === 'undefined') console.error("DT IS UNDEFINED IN moveEnemyWithCollision!");
            if (speedValue <= 0) return { collidedX: false, collidedY: false };
            const moveDir = directionVector.clone().normalize();
            const moveAmount = speedValue * dt * 60; 

            const nextX = ePos.x + moveDir.x * moveAmount;
            const nextY = ePos.y + moveDir.y * moveAmount; 

            const enemyHitbox = {
                x: ePos.x - ENEMY_COLLISION_SIZE.width / 2,
                y: ePos.y - ENEMY_COLLISION_SIZE.height / 2,
                width: ENEMY_COLLISION_SIZE.width,
                height: ENEMY_COLLISION_SIZE.height
            };

            const nextHitboxX = { ...enemyHitbox, x: nextX - ENEMY_COLLISION_SIZE.width / 2 };
            let canMoveX = true;
            for (const wall of wallsRef.current) {
                if (checkCollision(nextHitboxX, wall)) {
                    canMoveX = false; break;
                }
            }

            const nextHitboxY = { ...enemyHitbox, y: nextY - ENEMY_COLLISION_SIZE.height / 2 };
            let canMoveY = true;
            for (const wall of wallsRef.current) {
                if (checkCollision(nextHitboxY, wall)) {
                    canMoveY = false; break;
                }
            }

            if (canMoveX) { ePos.x = nextX; }
            if (canMoveY) { ePos.y = nextY; }

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

        // ЛОГИКА ИИ (по типам врагов) 
        let isAttacking = false; 
        switch (enemy.type) {
            // --- ОБНОВЛЕННЫЙ CASE ДЛЯ МИЛИ-ПОДОБНЫХ ---
            case 'melee':
            case 'boss':
            case 'skeleton_swordsman':
            case 'cursed_gladiator':
            case 'revenant_knight':
            case 'rotting_soldier': // Уже обработан выше, если умер. Если жив, то ИИ здесь.
            case 'cursed_carrier':  // Аналогично.
            {
                const eStats = enemy.stats;
                const atkRange = eStats.attackRange || 25;
                const aggroRange = atkRange * (eStats.aggroMultiplier || 5);
                const playerInAttackRange = dist <= atkRange;
                const playerInAggroRange = dist <= aggroRange;

                if (!enemy.aiState && !enemy.id.startsWith('summon_')) { 
                    enemy.aiState = 'IDLE';
                }
                if (!enemy.spawnPosition) enemy.spawnPosition = ePos.clone();
                const spawnPos = enemy.spawnPosition;
                const distToSpawn = spawnPos ? ePos.distanceTo(spawnPos) : 0;

                let nextState = enemy.aiState;
                const returnDelay = 3500; 

                switch (enemy.aiState) {
                    case 'IDLE':
                        if (playerInAggroRange) {
                            nextState = 'CHASING';
                            enemy.chaseEndTime = null; 
                        }
                        break;
                    case 'CHASING':
                        if (playerInAttackRange) {
                            nextState = 'ATTACKING';
                            enemy.chaseEndTime = null;
                        } else if (!playerInAggroRange) { 
                            if (!enemy.chaseEndTime) { 
                                enemy.chaseEndTime = Date.now() + returnDelay;
                                console.log(`Enemy ${enemy.id} потерял игрока, таймер возврата запущен.`);
                            }
                            if (Date.now() >= enemy.chaseEndTime) { 
                                nextState = 'RETURNING';
                                console.log(`Enemy ${enemy.id} возвращается на базу.`);
                                enemy.chaseEndTime = null;
                            }
                        } else { 
                            enemy.chaseEndTime = null; 
                        }
                        break;
                    case 'ATTACKING':
                        if (!playerInAttackRange) {
                            nextState = 'CHASING'; 
                        }
                        break;
                    case 'RETURNING':
                        if (playerInAggroRange) {
                            nextState = 'CHASING'; 
                            enemy.chaseEndTime = null;
                        } else if (distToSpawn < 10) { 
                            nextState = 'IDLE';
                            ePos.copy(spawnPos); 
                            ePivot.rotation.z = enemy.spawnRotationZ || 0; 
                            console.log(`Enemy ${enemy.id} вернулся.`);
                        }
                        break;
                }
                enemy.aiState = nextState;

                let shouldMove = false;
                let moveTargetPos = null;
                let shouldRotate = false;
                let rotateTargetPos = null;
                let isAttackingNow = false;
                let currentMoveSpeed = eStats.speed || 1.5; 
                let canAttack = true; 

                if (enemy.type === 'revenant_knight') {
                    if (typeof enemy.blockCharges === 'undefined') enemy.blockCharges = eStats.initialBlockCharges || 0;
                    if (enemy.blockCharges > 0) {
                        canAttack = false; 
                    }
                    if (enemy.shieldMesh) enemy.shieldMesh.visible = enemy.blockCharges > 0;
                }

                switch (enemy.aiState) {
                    case 'IDLE':
                        shouldMove = false; shouldRotate = false; break;
                    case 'CHASING':
                        shouldMove = true; moveTargetPos = playerPos.clone();
                        shouldRotate = true; rotateTargetPos = playerPos.clone();
                        currentMoveSpeed = eStats.speed || 1.5;
                        break;
                    case 'ATTACKING':
                        shouldMove = false; 
                        shouldRotate = true; rotateTargetPos = playerPos.clone();
                        if (enemy.attackCooldown <= 0 && canAttack) {
                            isAttackingNow = true; 
                        }
                        break;
                    case 'RETURNING':
                        shouldMove = true; moveTargetPos = spawnPos.clone();
                        shouldRotate = true; rotateTargetPos = spawnPos.clone();
                        currentMoveSpeed = (eStats.speed || 1.5) * 0.8; 
                        break;
                }

                if (isAttackingNow) {
                    let currentDamage = eStats.damage || 5;
                    console.log(`${enemy.id} (${enemy.type}) attacks player! Damage: ${currentDamage}`);
                    if (typeof playerTakeDamage === 'function') playerTakeDamage(currentDamage);
                    enemy.attackCooldown = 1 / (eStats.attackSpeed || 1.0); 
                }

                if (shouldMove && moveTargetPos) {
                    const direction = new THREE.Vector3().subVectors(moveTargetPos, ePos);
                    moveEnemyWithCollision(direction, currentMoveSpeed);
                }

                if (shouldRotate && rotateTargetPos) {
                    rotateEnemyTowards(rotateTargetPos);
                }
                break; 
            }

            // === ДАЛЬНИЙ БОЙ (Снаряды - Лучник) ===
            case 'ranged':
            case 'skeleton_archer':
            {
                const eStats = enemy.stats;
                const atkRange = eStats.attackRange || 100;
                const playerInAttackRange = dist <= atkRange;
                const currentMoveSpeed = eStats.speed || 1.0; 

                if (typeof enemy.patrolWaitTimer === 'undefined') enemy.patrolWaitTimer = 0;
                if (!enemy.patrolTargetPosition) enemy.patrolTargetPosition = null;
                if (!enemy.spawnPosition) enemy.spawnPosition = ePos.clone();

                let shouldRotate = false;
                let rotateTargetPos = null;
                let shouldMove = false;
                let moveTargetPos = null;
                let isAttackingNow = false;

                if (playerInAttackRange) {
                    shouldRotate = true; rotateTargetPos = playerPos.clone();
                    enemy.patrolTargetPosition = null; 
                    enemy.patrolWaitTimer = 0;
                    shouldMove = false; 
                    if (enemy.attackCooldown <= 0) {
                        isAttackingNow = true;
                    }
                } else {
                    if (enemy.patrolWaitTimer > 0) {
                        enemy.patrolWaitTimer -= dt;
                        shouldMove = false; shouldRotate = false;
                    } else if (enemy.patrolTargetPosition) {
                        const distToPatrolTarget = ePos.distanceTo(enemy.patrolTargetPosition);
                        if (distToPatrolTarget < 10) { 
                            enemy.patrolTargetPosition = null;
                            enemy.patrolWaitTimer = 1.5 + Math.random() * 2; 
                            shouldMove = false; shouldRotate = false;
                        } else { 
                            shouldMove = true; moveTargetPos = enemy.patrolTargetPosition.clone();
                            shouldRotate = true; rotateTargetPos = enemy.patrolTargetPosition.clone();
                        }
                    } else {
                        const PATROL_RADIUS = 150;
                        const randomAngle = Math.random() * Math.PI * 2;
                        const randomDist = Math.random() * PATROL_RADIUS;
                        const targetX = enemy.spawnPosition.x + Math.cos(randomAngle) * randomDist;
                        const targetY = enemy.spawnPosition.y + Math.sin(randomAngle) * randomDist;
                        enemy.patrolTargetPosition = new THREE.Vector3(targetX, targetY, 0);
                        console.log(`Enemy ${enemy.id} new patrol target: (${targetX.toFixed(0)}, ${targetY.toFixed(0)})`);
                        shouldMove = true; moveTargetPos = enemy.patrolTargetPosition.clone();
                        shouldRotate = true; rotateTargetPos = enemy.patrolTargetPosition.clone();
                    }
                }

                if (isAttackingNow) {
                    console.log(`${enemy.id} firing projectile!`);
                    // createEnemyProjectile(enemy, playerPos); // Ваша функция создания снаряда врага
                    enemy.attackCooldown = 1 / (eStats.attackSpeed || 0.8);
                }
                if (shouldMove && moveTargetPos) {
                    const direction = new THREE.Vector3().subVectors(moveTargetPos, ePos);
                    moveEnemyWithCollision(direction, currentMoveSpeed);
                }
                if (shouldRotate && rotateTargetPos) {
                    rotateEnemyTowards(rotateTargetPos);
                }
                break; 
            }

            // === КАСТЕРЫ (Маги, Чародеи и т.д.) ===
            case 'caster':
            case 'ghostly_enchanter':
            case 'ogre_mage':
            {
                const currentAtkRange = eStats.attackRange || 300;
                const isPlayerInAttackRange = dist <= currentAtkRange;

                if (isPlayerInAttackRange) {
                    rotateEnemyTowards(playerPos); 
                    if (enemy.attackCooldown <= 0) {
                        enemy.attackCooldown = 1 / (eStats.attackSpeed || 0.5);
                        if (enemy.type === 'ogre_mage') {
                            // createProjectileToPoint(enemy.id, ePos.clone(), playerPos.clone(), eStats.damage || 10, eStats.projectileSpeed || 400);
                            console.log(`Ogre Mage ${enemy.id} attacks target point!`);
                        } else if (enemy.type === 'ghostly_enchanter') {
                            // applyPlayerDebuff(enemy.id, 'weaken', eStats.debuffDuration || 5, eStats.debuffStrength || 0.2);
                            console.log(`Enchanter ${enemy.id} applies weaken!`);
                        } else { 
                            if (typeof playerTakeDamage === 'function') playerTakeDamage(eStats.beamDamage || 1); 
                            if (enemy.beamEffectMesh) removeBeamMesh(enemy); 
                            // enemy.beamEffectMesh = createBeamMeshFixed(enemy, playerPos); 
                            if (enemy.beamEffectMesh) enemy.beamEffectTimer = eStats.beamEffectDuration || 1.0; 
                        }
                    } else {
                        if (enemy.beamEffectMesh && (enemy.type === 'caster')) {
                            // updateBeamMesh(enemy.beamEffectMesh, ePos, playerPos); 
                        }
                    }
                } else { 
                    if (enemy.beamEffectMesh) removeBeamMesh(enemy); 
                }
                break;
            }

            // === УНИКАЛЬНЫЕ НОВЫЕ ТИПЫ (из code1, адаптировано) ===
            case 'bone_dancer': 
            // ... (Логика для bone_dancer из вашего code2, она довольно объемная и специфичная) ...
            // Убедитесь, что эта логика корректно использует rotateEnemyTowards и moveEnemyWithCollision,
            // а также dt для таймеров и анимаций.
            // ВАЖНО: Логика анимации для bone_dancer в конце его case должна быть актуализирована или удалена,
            // так как общее `enemy.mixer?.update(dt);` уже есть выше.
            // Либо, если у bone_dancer есть своя логика `switchAction`, она должна быть здесь.
            { // Начало блока для bone_dancer из вашего кода
                const eStats = enemy.stats;
                const baseSpeed = (eStats.speed || 3.5) * 60; 
                const rotationLerp = 0.15; 
                const activationRange = eStats.activationRange || 200; 
                const chargeSpeedMultiplier = eStats.chargeMultiplier || 3.0; 
                const chargeDuration = eStats.chargeDuration || 0.25;
                const desiredOrbitDist = eStats.orbitDistance || 60;

                let shouldMove = false;
                let shouldRotate = true;
                let moveTargetPos = null; 
                let rotateTargetPos = playerPos.clone(); 
                let currentMoveSpeed = baseSpeed; 

                const vectorToPlayer = new THREE.Vector3().subVectors(playerPos, ePos);
                const currentDistToPlayer = vectorToPlayer.length(); 

                if (!enemy.aiState) enemy.aiState = 'IDLE';
                if (typeof enemy.chargeTimer === 'undefined') enemy.chargeTimer = 0;
                if (!enemy.spawnPosition) enemy.spawnPosition = ePos.clone();
                
                switch (enemy.aiState) {
                    case 'IDLE':
                        shouldMove = false; shouldRotate = false;
                        if (currentDistToPlayer <= activationRange) {
                            console.log(`Bone Dancer ${enemy.id} activated! Charging!`);
                            enemy.aiState = 'CHARGING';
                            enemy.chargeTargetPos = playerPos.clone();
                            enemy.chargeTimer = 0;
                        }
                        break;
                    case 'CHARGING':
                        shouldMove = true; shouldRotate = true;
                        moveTargetPos = enemy.chargeTargetPos || playerPos.clone();
                        rotateTargetPos = moveTargetPos; 
                        currentMoveSpeed = baseSpeed * chargeSpeedMultiplier; 
                        enemy.chargeTimer += dt;
                        if (enemy.chargeTimer >= chargeDuration) {
                            console.log(`Bone Dancer ${enemy.id} finished charge, orbiting.`);
                            enemy.aiState = 'ORBITING';
                            enemy.chargeTimer = 0;
                            enemy.orbitDirection = (Math.random() < 0.5 ? 1 : -1);
                        }
                        break;
                    case 'ORBITING':
                        shouldMove = true; shouldRotate = true;
                        rotateTargetPos = playerPos.clone(); 
                        if (currentDistToPlayer > 0.1) {
                            const normDirToPlayer = vectorToPlayer.clone().normalize();
                            let vecPlayerToEnemy = vectorToPlayer.clone().negate();
                            const normVecPlayerToEnemy = vecPlayerToEnemy.normalize();
                            const idealOrbitPoint = playerPos.clone().add(normVecPlayerToEnemy.multiplyScalar(desiredOrbitDist));
                            const normTangentDir = new THREE.Vector3(-normDirToPlayer.y, normDirToPlayer.x, 0).multiplyScalar(enemy.orbitDirection);
                            const vecToIdealOrbit = new THREE.Vector3().subVectors(idealOrbitPoint, ePos);
                            const distToIdealOrbit = vecToIdealOrbit.length();
                            const tangentVelocity = normTangentDir.clone().multiplyScalar(baseSpeed);
                            const correctionSpeed = Math.min(baseSpeed, distToIdealOrbit * 2.0); 
                            const correctionVelocity = vecToIdealOrbit.normalize().multiplyScalar(correctionSpeed);
                            const finalVelocity = tangentVelocity.add(correctionVelocity); 
                            finalVelocity.clampLength(0, baseSpeed * 1.5); 
                            moveTargetPos = ePos.clone().add(finalVelocity.clone().multiplyScalar(dt)); 
                            currentMoveSpeed = finalVelocity.length(); 
                            if (currentMoveSpeed < 1) { 
                                shouldMove = false;
                            }
                        } else { 
                            shouldMove = false; shouldRotate = false; 
                        }
                        break; 
                } 
                
                if (shouldMove && moveTargetPos) {
                    let moveDir = new THREE.Vector3().subVectors(moveTargetPos, ePos);
                    // Используем moveEnemyWithCollision, передавая только направление и скорость
                    if (moveDir.lengthSq() > 0.001) { // Убедимся, что есть направление
                       moveEnemyWithCollision(moveDir, currentMoveSpeed / 60 ); // moveEnemyWithCollision ожидает скорость в условных юнитах/dt*60
                    }
                }
                if (shouldRotate && rotateTargetPos) {
                    rotateEnemyTowards(rotateTargetPos, rotationLerp); // Используем свой lerp для поворота
                }
                // Логика анимации для bone_dancer (если специфична)
                // let nextActionName = 'Idle'; // ... ваша логика switchAction
                // switchAction(enemy, nextActionName);
            } // Конец блока bone_dancer
            break;

            case 'plague_totemist': {
                rotateEnemyTowards(playerPos); 
                if (enemy.abilityCooldown <= 0) {
                    console.log(`Totemist ${enemy.id} places a ${eStats.totemType || 'debuff'} totem!`);
                    // placeTotem(enemy.id, ePos.clone(), eStats.totemType || 'debuff_slow', eStats.totemDuration || 15.0, eStats.totemRange || 120, eStats.totemEffect || { slowPercent: 0.3 });
                    enemy.abilityCooldown = eStats.totemCooldown || 12.0;
                }
                break;
            }
            case 'sand_reaper': {
                const eStats = enemy.stats;
                rotateEnemyTowards(playerPos.clone());
                if (enemy.abilityCooldown <= 0) {
                    console.log(`Sand Reaper ${enemy.id} summons spikes under player!`);
                    // triggerGroundSpikes(enemy.id, playerPos.clone(), eStats.spikeDelay || 1.0, eStats.spikeRadius || 30, eStats.spikeDamage || 15);
                    enemy.abilityCooldown = eStats.abilityCooldown || 5.0; 
                }
                break; 
            } 
            case 'poison_cultist': {
                rotateEnemyTowards(playerPos); 
                const currentAtkRange = eStats.attackRange || 200;
                if (dist <= currentAtkRange && enemy.abilityCooldown <= 0) {
                    console.log(`Cultist ${enemy.id} throws poison puddle!`);
                    // createPoisonPuddle(enemy.id, playerPos.clone(), eStats.puddleDuration || 10.0, eStats.puddleRadius || 50, eStats.puddleDps || 3); 
                    enemy.abilityCooldown = eStats.abilityCooldown || 8.0;
                }
                break;
            }
            default:
                console.warn(`Неизвестный или необработанный тип врага в switch: ${enemy.type}`);
                break;
        } // --- Конец switch(enemy.type) ---
    }); // --- Конец loadedEnemyRefsArray.forEach ---

    // ==================================
    // === 5. Снаряды Врагов ==========
    // ==================================
    const activeEnemyProjectiles = [];
    const PLAYER_HITBOX_SIZE = { width: 25, height: 25 }; 
    const playerHitboxForEnemyProj = playerObject ? {
        x: playerPos.x - PLAYER_HITBOX_SIZE.width / 2,
        y: playerPos.y - PLAYER_HITBOX_SIZE.height / 2,
        width: PLAYER_HITBOX_SIZE.width,
        height: PLAYER_HITBOX_SIZE.height
    } : null;

    if (playerHitboxForEnemyProj && playerHp > 0) { // playerHp - глобальная переменная или из playerStats
        enemyProjectilesRef.current.forEach(proj => {
            proj.position.add(proj.velocity.clone().multiplyScalar(dt)); 
            proj.lifetime -= dt; 
            if (proj.mesh) {
                proj.mesh.position.copy(proj.position); 
                proj.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), proj.velocity.clone().normalize());
            }

            let hitPlayer = false;
            if (proj.lifetime > 0) {
                const projSize = 10; 
                const projHitbox = { x: proj.position.x - projSize / 2, y: proj.position.y - projSize / 2, width: projSize, height: projSize };
                if (checkCollision(projHitbox, playerHitboxForEnemyProj)) {
                    if (typeof playerTakeDamage === 'function') {
                        playerTakeDamage(proj.damage); 
                    } else { console.error("playerTakeDamage is not a function!"); }
                    hitPlayer = true;
                }
            }

            if (proj.lifetime > 0 && !hitPlayer) {
                activeEnemyProjectiles.push(proj);
            } else { 
                if (proj.mesh) {
                    currentScene?.remove(proj.mesh);
                    proj.mesh.geometry?.dispose();
                    proj.mesh.material?.dispose();
                }
            }
        });
        enemyProjectilesRef.current = activeEnemyProjectiles; 
    } else { 
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
    activeCloudsRef.current.forEach(cloud => {
        if (now < cloud.endTime) { 
            remainingClouds.push(cloud);
            if (playerPos && typeof playerTakeDamage === 'function' && playerHp > 0) {
                const distSq = playerPos.distanceToSquared(cloud.position);
                if (distSq <= cloud.radiusSq) { 
                    const damage = cloud.dps * dt; 
                    playerTakeDamage(damage);
                }
            }
        } else { 
            currentScene?.remove(cloud.mesh); 
            cloud.mesh.geometry?.dispose();  
            cloud.mesh.material?.dispose();  
            console.log("☁️ Poison cloud expired and removed.");
        }
    });
    if (remainingClouds.length !== activeCloudsRef.current.length) {
        activeCloudsRef.current = remainingClouds;
    }

    // ==================================
    // === 6. Проверка Победы/Проигрыша =
    // ==================================
    checkWinCondition(); 

    // ==================================
    // === 7. Обновление Камеры ========
    // ==================================
    if (playerObject && currentCamera && levelConfig) {
        const camWidth = currentCamera.right - currentCamera.left;
        const camHeight = currentCamera.top - currentCamera.bottom;
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
        currentCamera.position.lerp(new THREE.Vector3(targetXCam, targetYCam, currentCamera.position.z), 0.1);
    }

    // ==================================
    // === 8. Рендеринг =================
    // ==================================
    if (currentRenderer && currentScene && currentCamera) {
        try {
            currentRenderer.render(currentScene, currentCamera); 
        } catch (error) {
            console.error("❌ Ошибка рендеринга:", error);
            setLevelStatus('error'); 
            if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current); 
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
            console.log(`--- ОЧИСТКА игрового цикла Effect! Статус: ${levelStatus}. Таймеров в рефе: ${effectTimersRef.current.length} ---`); // <<< ДОБАВЬ ЛОГ
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
             loadedEnemyRefsArray?.forEach(e => { if (e?.beamEffectMesh) removeBeamMesh(e); }); // Безопасный доступ к e
             effectTimersRef.current.forEach(timerId => clearTimeout(timerId));
             effectTimersRef.current = [];
        };
    }, [isLoading, levelStatus, playerObject, levelData]);

    if (!fogMaterialRef.current && sceneRef.current) { // Добавим проверку на sceneRef, чтобы убедиться, что Three.js готово
        console.log("[Level.jsx] Creating fog material");
        fogMaterialRef.current = new THREE.MeshBasicMaterial({
            color: 0x000000, // Черный цвет
            transparent: true,
            opacity: 0.8,    // Степень непрозрачности (0.0 до 1.0)
            depthWrite: false // Важно для корректной работы прозрачности
        });
    }

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