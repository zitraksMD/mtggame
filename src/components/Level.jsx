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
import LevelLootPopup from './LevelLootPopup'; // Импортируем новый компонент
import { clamp, checkCollision, convertTiledX, convertTiledY, DEFAULT_WORLD_WIDTH, DEFAULT_WORLD_HEIGHT } from './utils';
import { BASE_ENEMY_STATS } from '../data/enemyBaseStats';
import { getLevelChestTypeById } from '../data/levelChestData'; // Adjust path
import { CSSTransition } from 'react-transition-group'; // Импортируем CSSTransition




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
      // Контейнер остается
      <div className="health-bar-container">
        {/* Полоска заполнения */}
        <div className="health-bar" style={{ width: `${healthPercent}%` }}></div>
        {/* Текст поверх полоски */}
        <span className="health-bar-text">{`${currentHp} / ${maxHp}`}</span>
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
    const animatingDoorsRef = useRef([]); // Массив для хранения данных об активных анимациях дверей
    const activePuddlesRef = useRef([]);
    const activeEffectProjectilesRef = useRef([]);
    const activeBurningGroundsRef = useRef([]);
    const levelChestsRef = useRef([]); // To store info about chests on the level




    

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
    const [activePuddles, setActivePuddles] = useState([]);
    const [activeBurningGrounds, setActiveBurningGrounds] = useState([]);
    const [timePlayedSeconds, setTimePlayedSeconds] = useState(0);
    const [elapsedTimeSec, setElapsedTimeSec] = useState(0);



    useEffect(() => {
        enemiesStateRef.current = enemiesState;
        console.log("[enemiesStateRef updated] Length:", enemiesState.length, enemiesState); // Лог для проверки
    }, [enemiesState]); // Этот эффект сработает КАЖДЫЙ РАЗ при изменении enemiesState

    useEffect(() => {
        activePuddlesRef.current = activePuddles;
        console.log(`[Sync Ref] activePuddles state changed, updating activePuddlesRef. New length: ${activePuddles.length}`);
    }, [activePuddles]);

    useEffect(() => {
        console.log("[Debuff Cleanup] Starting periodic cleanup interval.");
        // Запускаем интервал, который вызывает очистку каждые, например, 2 секунды
        const intervalId = setInterval(() => {
            // Используем useGameStore.getState() для вызова action вне React-компонента/хука
            useGameStore.getState().cleanupExpiredDebuffs();
        }, 2000); // Проверять каждые 2000 мс (2 секунды)
    
        // Функция очистки для useEffect: убираем интервал при размонтировании компонента
        return () => {
            console.log("[Debuff Cleanup] Clearing periodic cleanup interval.");
            clearInterval(intervalId);
        };
    }, []); // Пустой массив зависимостей, чтобы эффект запустился один раз при монтировании
    
    useEffect(() => { // Синхронизация состояния с рефом
        activeBurningGroundsRef.current = activeBurningGrounds;
        // console.log(`[Sync Ref] activeBurningGrounds state changed, updating Ref. New length: ${activeBurningGrounds.length}`);
    }, [activeBurningGrounds]);

    // New useEffect for the timer interval
useEffect(() => {
    let intervalId = null;

    // Start interval only when the level is actively playing and start time is known
    if (levelStatus === 'playing' && levelStartTimeRef.current && !isLoading) {
        console.log("[Timer Interval] Starting timer update interval.");
        // Update immediately first time
        setElapsedTimeSec(Math.floor((Date.now() - levelStartTimeRef.current) / 1000));
        
        intervalId = setInterval(() => {
            if (levelStartTimeRef.current) { // Check ref still valid inside interval
                 const currentElapsedSec = Math.floor((Date.now() - levelStartTimeRef.current) / 1000);
                 setElapsedTimeSec(currentElapsedSec);
            }
        }, 1000); // Update every second
    } else {
        // If status is not playing or timer shouldn't run, ensure time is reset (optional)
        // setElapsedTimeSec(0); // Resetting might not be needed if done elsewhere on level start
    }

    // Cleanup function: clear interval when status changes or component unmounts
    return () => {
        if (intervalId) {
            console.log("[Timer Interval] Clearing timer update interval.");
            clearInterval(intervalId);
        }
    };
// Dependencies: status, start time ref (or a boolean flag if start time is valid), loading state
}, [levelStatus, isLoading, levelStartTimeRef]); // Add levelStartTimeRef to deps, even though it's a ref, its value matters here conceptually for starting

// Helper function (if not already defined globally or imported)
const formatTime = (totalSeconds) => {
    if (typeof totalSeconds !== 'number' || totalSeconds < 0 || isNaN(totalSeconds)) return '00:00';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    return `${paddedMinutes}:${paddedSeconds}`;
};

    // === Глобальный Стор ===
    const {
        playerHp,
        displayMaxHp, // computedStats().hp
        playerStats,  // computedStats()
        playerTakeDamage,
        initializeLevelHp,
        // Добавляем из code1 (если нужно будет вызывать applyDebuff)
        applyDebuff, // <- Раскомментировать, если нужно вызывать action
        setWeakeningAuraStatus,
        incrementKills, // <<< ДОБАВЬ ЭТО
        openLevelChest, 
        lastOpenedLevelChestRewards, 
        clearLastLevelChestRewards    } = useGameStore(state => ({
        playerHp: state.playerHp,
        displayMaxHp: state.computedStats().hp,
        playerStats: state.computedStats(),
        playerTakeDamage: state.playerTakeDamage,
        initializeLevelHp: state.initializeLevelHp,
        applyDebuff: state.applyDebuff, // <- Раскомментировать, если нужно вызывать action
        setWeakeningAuraStatus: state.setWeakeningAuraStatus,
        incrementKills: state.incrementKills, // <<< И СВЯЗЫВАНИЕ ЗДЕСЬ
        openLevelChest: state.openLevelChest, // <<< ДОБАВЬ ЭТО
        lastOpenedLevelChestRewards: state.lastOpenedLevelChestRewards,
        clearLastLevelChestRewards: state.clearLastLevelChestRewards    }));

    const levelLootPopupRef = useRef(null);

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

    const chestResources = useMemo(() => {
        console.log("[Chest Resources] Creating chest placeholder resources");
        // Размеры заглушки (Ширина, Высота, Глубина) - подбери под свой масштаб
        const geometry = new THREE.BoxGeometry(25, 30, 20);
        // Материал для обычного сундука
        const woodMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // SaddleBrown (коричневый)
            roughness: 0.8,
            metalness: 0.1
        });
        // Материал для сундука босса
        const goldMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700, // Gold (золотой)
            roughness: 0.5,
            metalness: 0.5 // Чуть больше металличности для золота
        });
        return { geometry, woodMaterial, goldMaterial };
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
    // --- Создание СУНДУКОВ (Заглушки) ---
    if (levelData.chests && Array.isArray(levelData.chests)) {
        console.log(`  > Creating ${levelData.chests.length} chest placeholders...`);
        const chestGeometry = new THREE.BoxGeometry(25, 30, 20); // W, H, D - Example size (Chest shape)

        levelData.chests.forEach(chestInstanceData => {
            if (!chestInstanceData.id || !chestInstanceData.chestTypeId) {
                console.warn("Skipping chest instance due to missing id or chestTypeId", chestInstanceData);
                return;
            }

            const chestTypeData = getLevelChestTypeById(chestInstanceData.chestTypeId);
            if (!chestTypeData) {
                console.warn(`Chest type '${chestInstanceData.chestTypeId}' not found for instance ${chestInstanceData.id}. Skipping.`);
                return;
            }

            // --- Placeholder Material based on type ---
            let chestColor = 0x8B4513; // Brown default
            if (chestInstanceData.chestTypeId === 'boss_gold') {
                chestColor = 0xFFD700; // Gold
            }
            const chestMaterial = new THREE.MeshStandardMaterial({
                color: chestColor,
                roughness: 0.7,
                metalness: chestTypeData.chestTypeId === 'boss_gold' ? 0.4 : 0.1 // More metalness for gold
            });
            // -----------------------------------------

            const chestMesh = new THREE.Mesh(chestGeometry, chestMaterial);
            chestMesh.name = `chest_${chestInstanceData.id}`;
            chestMesh.castShadow = true;

            // Calculate world position
            const worldX = convertTiledX(chestInstanceData.x || 0, 25, levelConfig.gameWorldWidth); // Use width for centering
            const worldY = convertTiledY(chestInstanceData.y || 0, 20, levelConfig.gameWorldHeight, levelConfig.WORLD_Y_OFFSET); // Use depth for centering? Or 0? Let's use 0 for Y center. Need height for Y placement though.

            // Position the pivot/mesh. Pivot at bottom center.
            chestMesh.position.set(worldX, worldY, 15); // Place bottom of chest slightly above ground Z=0? Let's assume pivot is bottom center, so Z = height/2 = 15. Recheck convertTiledY.
            // convertTiledY(y, objectHeight, ...) -> WORLD_Y_OFFSET - y - objectHeight / 2
            // Let's adjust: Calculate center X/Y first, then place.
            const chestWidth = 25; const chestHeight = 30; // Use geometry dimensions
            const centerWorldX = convertTiledX(chestInstanceData.x || 0, chestWidth, levelConfig.gameWorldWidth);
            const centerWorldY = convertTiledY(chestInstanceData.y || 0, chestWidth, levelConfig.gameWorldHeight, levelConfig.WORLD_Y_OFFSET); // Using width for Y center seems wrong. Tiled Y usually refers to top edge.
            // Let's assume Tiled x,y is top-left corner.
            // World X = convertTiledX(chestInstanceData.x + chestWidth/2, 0, ...)
            // World Y = convertTiledY(chestInstanceData.y + chestHeight/2, 0, ...) -> Center of chest in world coords
            const finalWorldX = convertTiledX((chestInstanceData.x || 0) + chestWidth/2, 0, levelConfig.gameWorldWidth);
            const finalWorldY = convertTiledY((chestInstanceData.y || 0) + chestHeight/2, 0, levelConfig.gameWorldHeight, levelConfig.WORLD_Y_OFFSET);

            chestMesh.position.set(finalWorldX, finalWorldY, chestHeight / 2); // Place pivot (center of geometry) at height/2 above ground z=0

            currentScene.add(chestMesh);

            // Store reference and data
            levelChestsRef.current.push({
                instanceId: chestInstanceData.id,
                chestTypeId: chestInstanceData.chestTypeId,
                roomId: chestInstanceData.roomId || null,
                object3D: chestMesh, // Reference to the THREE object
                position: chestMesh.position.clone(), // Store world position
                isOpened: false // Initial state
            });
            console.log(`    * Added chest placeholder: ${chestInstanceData.id} (${chestInstanceData.chestTypeId})`);
        });

        // Cleanup geometry (only need one instance as it's shared)
        // Cleanup materials? Only if cloned per instance. We use one per type here.
        // Let's handle material cleanup in the main scene cleanup instead.
        // geometry needs cleanup only once when the component unmounts, maybe outside useEffect?
        // We need to ensure chestGeometry is disposed, maybe memoize it like hpResources?

    } else {
        console.log("  > No chest data found in levelData.");
    }
    // --- Конец создания СУНДУКОВ ---
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
}, [levelConfig, levelData, chestResources, fogMaterialRef.current]); // sceneRef, convertTiledX, convertTiledY, worldRoomBoundariesRef - также являются зависимостями, если они не стабильны.
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
        const allLoaded = !!levelConfig && isPlayerModelLoaded && areEnemiesLoaded && beamTexturesLoaded;
        const currentlyLoading = !allLoaded;
    
        if (isLoading !== currentlyLoading) {
            setIsLoading(currentlyLoading);
    
            if (!currentlyLoading) { // Загрузка ТОЛЬКО ЧТО завершилась
                if (!readyCalledRef.current) { // И onReady еще не вызывался
                    console.log("✨ Уровень ГОТОВ! Вызов onReady.");
    
                    // Инициализация HP и вызов onReady (как у тебя и было)
                    if (typeof initializeLevelHp === 'function') {
                        initializeLevelHp();
                        console.log("HP игрока инициализировано после загрузки.");
                    } else { /* ошибка */ }
                    if (typeof onReady === 'function') {
                        onReady();
                    } else { /* предупреждение */ }
                    readyCalledRef.current = true;
    
                    // --- >>> ЗАПУСК ОБЩЕГО ТАЙМЕРА ВРЕМЕНИ ИГРЫ <<< ---
                    // Запоминаем время начала уровня ВСЕГДА, когда уровень готов
                    levelStartTimeRef.current = Date.now();
                    // Сбрасываем состояние с длительностью предыдущей игры
                    setTimePlayedSeconds(0);
                    console.log("[Timer] Уровень готов, общий таймер времени запущен.");
                    // --- >>> КОНЕЦ ЗАПУСКА ТАЙМЕРА <<< ---
    
    
                    // Установка стартовой комнаты (как у тебя и было)
                    if (levelData?.rooms) {
                        const startingRoom = levelData.rooms.find(room => room.isStartingRoom);
                        if (startingRoom) {
                            setCurrentActiveRoomId(startingRoom.id);
                            console.log(`[Level.jsx] Starting room set to: ${startingRoom.id}`);
                            // Опционально: убедиться, что туман для нее скрыт
                            // if (fogOverlaysRef.current?.[startingRoom.id]) {
                            //     fogOverlaysRef.current[startingRoom.id].visible = false;
                            // }
                        } else if (levelData.rooms.length > 0) {
                             // Логика выбора первой комнаты по умолчанию
                            const firstRoomAsStarting = levelData.rooms[0];
                            setCurrentActiveRoomId(firstRoomAsStarting.id);
                            console.log(`[Level.jsx] Defaulting to first room as starting room: ${firstRoomAsStarting.id}`);
                            // Скрыть туман для первой комнаты
                            if (fogOverlaysRef.current?.[firstRoomAsStarting.id]) {
                                 fogOverlaysRef.current[firstRoomAsStarting.id].visible = false;
                                 console.log(`[Level.jsx] Fog cleared for default starting room: ${firstRoomAsStarting.id}`);
                            }
                        } else { /* ошибка, если комнат нет */ }
                    } else { /* предупреждение, если нет levelData.rooms */ }
    
    
                    // Логика для ТАЙМЕРА ВЫЖИВАНИЯ (если он нужен)
                    if (levelData?.winCondition?.type === 'survive_duration') {
                        // levelStartTimeRef уже установлен выше
                        setRemainingTime(levelData.winCondition.duration);
                        console.log(`Survival Timer Started: ${levelData.winCondition.duration}s`);
                    } else {
                        // Для других типов уровней
                        setRemainingTime(null);
                    }
    
                } else {
                    // Загрузка завершилась, но onReady уже был вызван
                }
            } else {
                // Переход в состояние загрузки
                console.log("[Level.jsx] Переход в состояние загрузки...");
                // Сбрасываем таймер при начале загрузки (на всякий случай)
                levelStartTimeRef.current = null;
                setTimePlayedSeconds(0);
            }
        }
    // }, [ /* Старые зависимости */ ]);
    // Добавляем все функции установки состояния, используемые внутри
    }, [levelConfig, isPlayerModelLoaded, areEnemiesLoaded, beamTexturesLoaded, isLoading, onReady, initializeLevelHp, levelData, setIsLoading, setRemainingTime, setCurrentActiveRoomId, setTimePlayedSeconds, readyCalledRef, levelStartTimeRef]); // Добавлены зависимости (рефы и set-функции)

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
                    console.warn(`[RoomCheck DEBUG] Monster ${enemyDef.id} (defined for room ${currentActiveRoomId}) NOT FOUND in enemiesState. This might be an issue.`);
                    // Если мы хотим, чтобы все монстры, перечисленные для комнаты, были УЧТЕНЫ (т.е. были в enemiesState и имели hp <=0),
                    // то отсутствие в enemiesState должно считаться как "комната не зачищена".
                    // allMonstersInRoomDead = false; 
                    // break;
                }
            }
        } else {
            allMonstersInRoomDead = false;
            console.log(`[RoomCheck DEBUG] No monsters defined for room ${currentActiveRoomId} in levelData, so allMonstersInRoomDead = false (nothing to clear).`);
        }
    
        console.log(`[RoomCheck DEBUG] Final check: allMonstersInRoomDead = ${allMonstersInRoomDead}, monstersInCurrentRoom.length = ${monstersInCurrentRoom.length}`);
    
        if (allMonstersInRoomDead && monstersInCurrentRoom.length > 0) {
            console.log(`[RoomCheck] 🎉 Комната ${currentActiveRoomId} ЗАЧИЩЕНА!`);
    
            const doorsToOpenData = levelData.walls.filter(wallDataInLevel =>
                wallDataInLevel.isDoor === true && wallDataInLevel.opensWhenRoomCleared === currentActiveRoomId
            );
    
            if (doorsToOpenData.length > 0) {
                doorsToOpenData.forEach(doorData => {
                    console.log(`[DoorLogic] Найдена дверь для открытия: ID='${doorData.id}', ведет в '${doorData.targetRoomIdForDoor || 'не указано'}'`);
    
                    const doorWallObjectInRef = wallsRef.current.find(wallRef => wallRef.id === doorData.id);
    
                    // --- НАЧАЛО ИЗМЕНЕНИЙ: Внедрение логики из код1 ---
                    if (doorWallObjectInRef && doorWallObjectInRef.mesh) {
                        const doorMesh = doorWallObjectInRef.mesh;
                        const doorIdToOpen = doorData.id; // ID двери из levelData
                        
                        // ПРЕДПОЛОЖЕНИЕ: doorData содержит свойство height. Убедитесь, что это так.
                        // Если doorData.height не определено, анимация не будет работать корректно.
                        const doorHeight = doorData.height; 
    
                        if (typeof doorHeight !== 'number') {
                            console.warn(`[DoorLogic] Высота для двери ${doorIdToOpen} не определена или не является числом. Пропуск анимации.`);
                            return; // Пропустить эту дверь, если высота не задана
                        }
    
                        // --- Логика ЗАПУСКА анимации ---
    
                        // 1. Проверяем, не анимируется ли уже эта дверь
                        // ПРЕДПОЛОЖЕНИЕ: animatingDoorsRef существует и является ref (например, const animatingDoorsRef = useRef([]))
                        const isAlreadyAnimating = animatingDoorsRef.current.some(anim => anim.id === doorIdToOpen);
    
                        if (!isAlreadyAnimating) {
                            console.log(`[DoorLogic] Дверь ${doorIdToOpen} найдена. Запускаем анимацию опускания.`);
    
                            // 2. Убираем дверь из коллизий НЕМЕДЛЕННО, чтобы игрок мог пройти
                            wallsRef.current = wallsRef.current.filter(wallInRef => wallInRef.id !== doorIdToOpen);
                            console.log(`[DoorLogic] Дверь ${doorIdToOpen} удалена из массива стен для коллизий.`);
    
                            // 3. Готовим данные для анимации
                            const animationDuration = 1.5; // Длительность анимации в секундах (можно настроить)
                            const startY = doorMesh.position.y; // Текущая позиция Y центра меша
                            // Опускаем на высоту двери + небольшой запас (10%), чтобы точно ушла
                            const descendAmount = doorHeight * 1.1;
                            const targetY = startY - descendAmount; // Конечная позиция Y
    
                            // 4. Добавляем информацию об анимации в реф
                            animatingDoorsRef.current.push({
                                id: doorIdToOpen, // Сохраняем ID для отладки и проверки
                                mesh: doorMesh,
                                startY: startY,
                                targetY: targetY,
                                duration: animationDuration,
                                elapsedTime: 0 // Счетчик времени анимации
                            });
    
                            // Убедимся, что дверь видима на начало анимации
                            doorMesh.visible = true;
    
                        } else {
                            console.log(`[DoorLogic] Анимация для двери ${doorIdToOpen} уже запущена.`);
                        }
                    } else {
                        console.warn(`[DoorLogic] Не найден 3D объект (меш) для двери с ID '${doorData.id}' в wallsRef.current.`);
                    }
                    // --- КОНЕЦ ИЗМЕНЕНИЙ ---
                });
            } else {
                console.log(`[DoorLogic] Для зачищенной комнаты ${currentActiveRoomId} не найдено дверей в levelData.walls, которые должны открыться.`);
            }
    
            setClearedRoomIds(prevCleared => new Set(prevCleared).add(currentActiveRoomId));
        }
    
    }, [enemiesState, currentActiveRoomId, clearedRoomIds, levelData, wallsRef, /* animatingDoorsRef - добавьте, если это state/prop */ ]);

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

// В Level.jsx

// === ОБРАБОТЧИК УРОНА ВРАГУ (ИСПРАВЛЕННЫЙ И ОБЪЕДИНЕННЫЙ) ===
const handleEnemyHit = useCallback((enemyId, damageAmount) => {
    // <<< ИСПОЛЬЗУЕМ loadedEnemyRefsArray ИЗ СОСТОЯНИЯ (как в код2) >>>
    // или используем enemyRefs, если это более актуальная переменная в вашем контексте
    const enemyRef = loadedEnemyRefsArray.find(ref => ref && ref.id === enemyId); // Используем loadedEnemyRefsArray из код2

    // Если враг не найден или уже помечен как мертвый, выходим
    if (!enemyRef || enemyRef.isDead) {
        // console.log(`[handleEnemyHit] Hit ignored for dead/missing enemy ${enemyId}`);
        return;
    }

    // --- ПРОВЕРКА БЛОКА РЫЦАРЯ (логика из обоих кодов, они идентичны) ---
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

// --- Проверяем ЗАРАНЕЕ, убьет ли этот удар врага ---
let enemyJustDefeated = false;
let needsExplosion = false; // Флаг для солдата

// Находим ТЕКУЩЕЕ состояние врага ДО обновления
// Важно: читаем из 'enemiesState', а не 'prevEnemies'
const currentEnemyState = enemiesState.find(es => es.id === enemyId);

// Проверяем, только если враг найден и жив СЕЙЧАС
if (currentEnemyState && currentEnemyState.currentHp > 0) {
    // Считаем, каким станет HP ПОСЛЕ удара
    const newHp = Math.max(0, currentEnemyState.currentHp - damageAmount);
    // Если HP станет 0, то это смертельный удар
    if (newHp === 0) {
        enemyJustDefeated = true; // Устанавливаем флаг СИНХРОННО
        if (enemyRef.type === 'rotting_soldier') {
            needsExplosion = true;
        }
        console.log(`   >> Враг ${enemyId} БУДЕТ побежден этим ударом! (HP: ${currentEnemyState.currentHp} -> ${newHp})`);
    }
}
// --- Конец предварительной проверки ---


// --- Обновляем состояние HP врагов ---
// Используем функциональную форму setEnemiesState для безопасности
setEnemiesState(prevEnemies => {
    const enemyIndex = prevEnemies.findIndex(e => e.id === enemyId);
    if (enemyIndex !== -1 && prevEnemies[enemyIndex].currentHp > 0) {
        const newState = [...prevEnemies];
        // Пересчитываем newHp внутри на основе prevEnemies для точности
        const calculatedNewHp = Math.max(0, prevEnemies[enemyIndex].currentHp - damageAmount);
        newState[enemyIndex] = { ...newState[enemyIndex], currentHp: calculatedNewHp };
        // Не нужно устанавливать флаг enemyJustDefeated здесь
        return newState;
    }
    return prevEnemies;
});
// --- Конец обновления состояния ---


// --- Действия ПОСЛЕ запроса на обновление состояния ---

// Устанавливаем флаги в рефе (isDead, needsToExplode)
// Используем флаг enemyJustDefeated, который мы рассчитали ранее
if (enemyJustDefeated && !enemyRef.isDead) {
    enemyRef.isDead = true;
    if (needsExplosion) {
        enemyRef.needsToExplode = true;
    }
    console.log(`--- Флаг isDead=true установлен для ${enemyId} после удара ---`);
}

// --- Вызываем счетчик убийств ---
// Используем флаг enemyJustDefeated, рассчитанный ДО setEnemiesState
if (enemyJustDefeated) {
    if (typeof incrementKills === 'function') {
         console.log(`[Kill Counter] Увеличиваем счетчик убийств (враг побежден: ${enemyId})`);
         incrementKills(1); // Вызываем action
    } else {
         console.error("Action incrementKills не доступен в Level.jsx!");
    }
}
// --- Конец вызова счетчика ---

// }, [loadedEnemyRefsArray, enemiesState, setEnemiesState, incrementKills]); // <<< ОБНОВЛЕННЫЕ ЗАВИСИМОСТИ
// Добавили enemiesState, так как читаем его перед setEnemiesState
}, [loadedEnemyRefsArray, enemiesState, setEnemiesState, incrementKills]);

    // ... остальные функции и useEffect ...

    // --- Логика статусов игры ---
    const winLevel = useCallback(() => { if (levelStatus === 'playing') { console.log(">>> Уровень ВЫИГРАН <<<"); setLevelStatus('won'); } }, [levelStatus]);
    const loseLevel = useCallback(() => { if (levelStatus === 'playing') { console.log(">>> Уровень ПРОИГРАН <<<"); setLevelStatus('lost'); } }, [levelStatus]);

    // Следим за HP игрока для проигрыша
    useEffect(() => {
        if (typeof playerHp === 'number' && playerHp <= 0 && levelStatus === 'playing') {
            // Игрок погиб
            if (levelStartTimeRef.current) {
                // Рассчитываем прошедшее время в секундах
                const durationSeconds = Math.round((Date.now() - levelStartTimeRef.current) / 1000);
                setTimePlayedSeconds(durationSeconds); // Сохраняем в стейт
                console.log(`[Timer] Уровень проигран. Время игры: ${durationSeconds} сек.`);
            } else {
                setTimePlayedSeconds(0); // Если таймер не был запущен
            }
            loseLevel(); // Устанавливаем levelStatus = 'lost'
        }
    // }, [playerHp, levelStatus, loseLevel]); // Старые зависимости
    }, [playerHp, levelStatus, loseLevel, levelStartTimeRef]); // Добавили levelStartTimeRef (хотя он реф, для ясности)


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
        const currentScene = sceneRef.current;
        if (!currentScene) {
            console.error("[createPoisonPuddle] Scene not available!");
            return;
        }
        // Проверка входных параметров
        if (!targetPos || typeof duration !== 'number' || typeof radius !== 'number' || typeof dps !== 'number' || radius <= 0 || duration <= 0) {
            console.error("[createPoisonPuddle] Invalid parameters received.", { casterId, targetPos, duration, radius, dps });
            return;
        }
    
        console.log(`[${casterId}] Creating poison puddle at (${targetPos.x.toFixed(0)}, ${targetPos.y.toFixed(0)}) R=${radius}, DPS=${dps}, Duration=${duration}s`);
    
        // --- Создание визуального эффекта (Плоский круг) ---
        const puddleGeometry = new THREE.CircleGeometry(radius, 32); // Круг с нужным радиусом
        // Простой зеленый полупрозрачный материал
        const puddleMaterial = new THREE.MeshBasicMaterial({
            color: 0x228B22, // ForestGreen
            transparent: true,
            opacity: 0.65,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        // TODO: В будущем можно заменить на более красивый материал с текстурой или шейдером
    
        const puddleMesh = new THREE.Mesh(puddleGeometry, puddleMaterial);
        puddleMesh.name = `puddle_${casterId}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        puddleMesh.position.copy(targetPos);
        puddleMesh.position.z = 1; // Оставляем Z=5 для теста
        // puddleMesh.rotation.x = -Math.PI / 2;
        puddleMesh.renderOrder = 8; // Оставляем renderOrder
    
        currentScene.add(puddleMesh); // Добавляем меш лужи на сцену
        console.log(`[createPoisonPuddle DEBUG] Attempted to add mesh ${puddleMesh.name}. Scene children count: ${currentScene.children.length}`);
        const addedMesh = currentScene.getObjectByName(puddleMesh.name);
        if (addedMesh) {
            console.log(`[createPoisonPuddle DEBUG] Mesh ${puddleMesh.name} FOUND in scene. Name: ${addedMesh.name}, Visible: ${addedMesh.visible}, Position: (${addedMesh.position.x.toFixed(0)}, ${addedMesh.position.y.toFixed(0)}, ${addedMesh.position.z.toFixed(0)})`);
            // Дополнительно проверим scale
            console.log(`[createPoisonPuddle DEBUG] Mesh Scale: (${addedMesh.scale.x}, ${addedMesh.scale.y}, ${addedMesh.scale.z})`);
        } else {
            console.error(`[createPoisonPuddle DEBUG] Mesh ${puddleMesh.name} NOT FOUND in scene by name immediately after adding!`);
        }

        // --- Добавление информации о луже в состояние ---
        const puddleData = {
            id: `puddle_${casterId}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            mesh: puddleMesh,              // Ссылка на 3D объект
            position: targetPos.clone(),   // Центр лужи
            radiusSq: radius * radius,     // Квадрат радиуса для быстрой проверки дистанции
            dps: dps,                      // Урон в секунду
            endTime: Date.now() + duration * 1000, // Время "смерти" лужи в миллисекундах
        };
    
        // Используем функциональное обновление состояния, чтобы избежать гонок
        setActivePuddles(prevPuddles => {
            const newPuddles = [...prevPuddles, puddleData];
            // console.log(`[setActivePuddles] Добавлена лужа ${puddleData.id}. Всего: ${newPuddles.length}`);
            return newPuddles;
        });
    
    // }, [sceneRef, setActivePuddles]); // <--- ОБНОВИ ЗАВИСИМОСТИ
       // Добавляем зависимости playerTakeDamage и activePuddles, если setActivePuddles используется
    }, [sceneRef, setActivePuddles, playerTakeDamage]); // Добавили setActivePuddles. playerTakeDamage уже был. sceneRef тоже нужен.

    // Новая функция для запуска снаряда, который создаст лужу при попадании
const launchPoisonProjectile = useCallback((casterId, casterPos, targetPos, projectileSpeed, puddleDuration, puddleRadius, puddleDps) => {
    const currentScene = sceneRef.current;
    // Проверки на наличие сцены и позиций
    if (!currentScene || !casterPos || !targetPos) {
        console.error("[launchPoisonProjectile] Missing scene or positions");
        return;
    }

    console.log(`[launchPoisonProjectile] Caster ${casterId} launching poison projectile towards (${targetPos.x.toFixed(0)}, ${targetPos.y.toFixed(0)})`);

    // --- Визуальное представление снаряда (Зеленая сфера) ---
    const projRadius = 8; // Размер сферы (подбери)
    const projGeometry = new THREE.SphereGeometry(projRadius, 16, 8);
    const projMaterial = new THREE.MeshStandardMaterial({
        color: 0x33cc33,    // Ярко-зеленый
        emissive: 0x114411, // Легкое свечение
        roughness: 0.4,
        metalness: 0.0
        // Можно добавить прозрачность, если хочется
        // transparent: true, opacity: 0.8,
    });
    const projMesh = new THREE.Mesh(projGeometry, projMaterial);
    projMesh.name = `poison_proj_${casterId}_visual`;

    // Начальная позиция - немного перед кастером
    const directionToTarget = targetPos.clone().sub(casterPos).normalize();
    const startOffset = 20; // Насколько перед кастером появится снаряд
    const startPos = casterPos.clone().add(directionToTarget.clone().multiplyScalar(startOffset));
    startPos.z = (casterPos.z || 0) + 15; // Немного выше центра кастера (подбери высоту)
    projMesh.position.copy(startPos);

    currentScene.add(projMesh);

    // --- Расчет полета ---
    // Направление от фактической точки старта к цели
    const finalDirection = targetPos.clone().sub(startPos).normalize();
    const velocity = finalDirection.multiplyScalar(projectileSpeed);
    // Общее расстояние до цели от точки старта
    const distanceToTarget = startPos.distanceTo(targetPos);

    // --- Данные для отслеживания снаряда ---
    const projectileData = {
        id: `poison_proj_${casterId}_${Date.now()}`,
        type: 'poison_puddle_projectile', // <<< Тип снаряда
        mesh: projMesh,
        targetPos: targetPos.clone(),
        velocity: velocity,
        distanceToTarget: distanceToTarget,
        elapsedDistance: 0,
        directDamage: 0, // Нет прямого урона
        createsGroundEffect: true, // <<< Флаг, что создает эффект на земле
        groundEffectParams: { // <<< Переименовано + добавлен тип
            casterId: casterId,
            type: 'poison', // <<< Тип эффекта
            duration: puddleDuration,
            radius: puddleRadius,
            dps: puddleDps
        }
    };
    activeEffectProjectilesRef.current.push(projectileData);
    console.log(`[launchPoisonProjectile] Projectile ${projectileData.id} added. Total active: ${activeEffectProjectilesRef.current.length}`);

    // Зависимости useCallback: sceneRef нужен для добавления меша.
    // Другие параметры приходят извне.
}, [sceneRef]); // createPoisonPuddle тут не нужен, он будет вызван из animate

// Новая функция для создания огненной зоны
const createBurningGround = useCallback((casterId, position, duration, radius, dps) => {
    const currentScene = sceneRef.current;
    if (!currentScene || !position || radius <= 0 || duration <= 0) {
        console.error("[createBurningGround] Некорректные параметры или сцена.", {casterId, position, duration, radius, dps});
        return;
    }

    console.log(`[${casterId}] Создание горящей земли в (${position.x.toFixed(0)}, ${position.y.toFixed(0)}) R=${radius}, DPS=${dps}, Duration=${duration}s`);

    // --- Визуальный эффект (Огненный круг) ---
    const groundGeometry = new THREE.CircleGeometry(radius, 32);
    // Пример материала для огня (подбери цвета и прозрачность)
    const groundMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF8C00, // DarkOrange
        transparent: true,
        opacity: 0.6,
        // blending: THREE.AdditiveBlending, // Можно попробовать для яркости
        side: THREE.DoubleSide,
        depthWrite: false
        // TODO: Позже можно улучшить: анимированная текстура огня, система частиц и т.д.
    });

    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.position.copy(position);
    groundMesh.position.z = 0.1; // Снова немного над землей (можно чуть выше лужи - 0.15?)
    groundMesh.renderOrder = 3; // Порядок отрисовки

    currentScene.add(groundMesh);

    // --- Добавляем данные в состояние ---
    const groundData = {
        id: `burn_ground_${casterId}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        mesh: groundMesh,
        position: position.clone(),
        radiusSq: radius * radius,
        dps: dps,
        endTime: Date.now() + duration * 1000,
    };

    setActiveBurningGrounds(prevGrounds => {
        const newGrounds = [...prevGrounds, groundData];
        // console.log(`[setActiveBurningGrounds] Добавлена горящая зона ${groundData.id}. Всего: ${newGrounds.length}`);
        return newGrounds;
    });

}, [sceneRef, setActiveBurningGrounds]); // Зависимости

const createGroundEffect = useCallback((position, params) => {
    // Параметры params: { casterId, type, duration, radius, dps }
    if (!params || !position) {
        console.error("[createGroundEffect] Invalid position or params received.");
        return;
    }

    console.log(`[GroundEffect] Creating effect type '${params.type}' at (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`);

    switch (params.type) {
        case 'poison':
            // Вызываем функцию создания ядовитой лужи (она у нас уже есть)
            if (typeof createPoisonPuddle === 'function') {
                 createPoisonPuddle(params.casterId, position, params.duration, params.radius, params.dps);
            } else {
                 console.error("createPoisonPuddle is not defined!");
            }
            break;
        case 'fire':
            // Вызываем НОВУЮ функцию создания огненной земли
            if (typeof createBurningGround === 'function') {
                createBurningGround(params.casterId, position, params.duration, params.radius, params.dps);
            } else {
                console.error("createBurningGround is not defined yet!"); // Она еще не создана
            }
            break;
        default:
            console.warn(`[GroundEffect] Unknown ground effect type: ${params.type}`);
    }
}, [createPoisonPuddle, createBurningGround]); // <<< Добавили createBurningGround

    // Для Призрачного заклинателя
    const applyPlayerDebuff = useCallback((casterId, type, duration, strength) => {
        // Проверяем, что функция applyDebuff была успешно получена из стора
        if (typeof applyDebuff === 'function') {
            console.log(`[${casterId}] Applying debuff to player: Type=${type}, Duration=${duration}s, Strength=${strength}`);
            // Вызываем action из useGameStore
            applyDebuff(type, duration, strength);
        } else {
            console.error("useGameStore action 'applyDebuff' is not available in Level component!");
        }
    // }, [/* applyDebuff */]); // <--- Старая зависимость
    }, [applyDebuff]);

    // Для Огра-мага
    const createProjectileToPoint = useCallback((casterId, casterPos, targetPos, projectileSpeed, directDamage, groundEffectDuration, groundEffectRadius, groundEffectDps) => {
        const currentScene = sceneRef.current;
        if (!currentScene || !casterPos || !targetPos) {
            console.error("[ProjectileToPoint] Отсутствует сцена или позиции!");
            return;
        }
    
        // Проверим параметры для эффекта земли
        if (typeof groundEffectDuration !== 'number' || typeof groundEffectRadius !== 'number' || typeof groundEffectDps !== 'number') {
             console.warn(`[ProjectileToPoint] Некорректные параметры для groundEffect для кастера ${casterId}`);
             // Можно либо прервать, либо создать снаряд без наземного эффекта
             // return;
        }
    
    
        console.log(`[ProjectileToPoint] Кастер ${casterId} запускает снаряд к точке (${targetPos.x.toFixed(0)}, ${targetPos.y.toFixed(0)})`);
    
        // --- Визуализация снаряда (Огненная сфера) ---
        const projRadius = 10; // Радиус сферы снаряда
        const projGeometry = new THREE.SphereGeometry(projRadius, 16, 8);
        const projMaterial = new THREE.MeshStandardMaterial({
            color: 0xffA500,     // Оранжевый
            emissive: 0xcc5500,  // Оранжевое свечение
            roughness: 0.6,
            // Можно добавить emissiveMap для текстуры огня
        });
        const projMesh = new THREE.Mesh(projGeometry, projMaterial);
        projMesh.name = `point_proj_${casterId}_visual`;
    
        // Начальная позиция снаряда - немного впереди кастера
        const directionToTarget = targetPos.clone().sub(casterPos).normalize();
        const startOffset = 25; // Как далеко от кастера появится
        const startPos = casterPos.clone().add(directionToTarget.clone().multiplyScalar(startOffset));
        startPos.z = (casterPos.z || 0) + 20; // На уровне "груди" огра? Подбери высоту
        projMesh.position.copy(startPos);
    
        currentScene.add(projMesh);
    
        // --- Расчет траектории ---
        const finalDirection = targetPos.clone().sub(startPos).normalize(); // Направление от реального старта
        const velocity = finalDirection.multiplyScalar(projectileSpeed);
        const distanceToTarget = startPos.distanceTo(targetPos);
    
        // --- Данные для отслеживания снаряда ---
        const projectileData = {
            id: `point_proj_${casterId}_${Date.now()}`,
            type: 'ogre_fire_projectile', // Оставляем или делаем более общим
            mesh: projMesh,
            targetPos: targetPos.clone(),
            velocity: velocity,
            distanceToTarget: distanceToTarget,
            elapsedDistance: 0,
            directDamage: directDamage || 0,
            createsGroundEffect: true, // Флаг уже был
            groundEffectParams: {
                casterId: casterId, // <<< Добавили ID кастера
                type: 'fire', // <<< Добавили тип эффекта
                duration: groundEffectDuration,
                radius: groundEffectRadius,
                dps: groundEffectDps
            }
        };
        activeEffectProjectilesRef.current.push(projectileData);
        console.log(`[ProjectileToPoint] Добавлен снаряд ${projectileData.id}. Активных эффект-снарядов: ${activeEffectProjectilesRef.current.length}`);
    
    }, [sceneRef]); // Зависимость только от sceneRef для добавления меша

    // === КОНЕЦ ФУНКЦИЙ-ЗАГЛУШЕК ===
    const createArrowProjectile = useCallback((casterId, casterPos, targetPos, projectileSpeed, damage) => {
        const currentScene = sceneRef.current;
        if (!currentScene || !casterPos || !targetPos) {
            console.error("[createArrowProjectile] Отсутствует сцена или позиции!");
            return;
        }
    
        console.log(`[Arrow] Лучник ${casterId} стреляет в точку (${targetPos.x.toFixed(0)}, ${targetPos.y.toFixed(0)})`);
    
        // --- Визуализация снаряда (Стрела) ---
        // Простой вариант: тонкий длинный цилиндр или вытянутый куб
        const arrowLength = 20;
        const arrowRadius = 1;
        // Используем CylinderGeometry(radiusTop, radiusBottom, height, radialSegments)
        // Ось цилиндра по умолчанию - Y. Нам нужно направить его по вектору скорости.
        const projGeometry = new THREE.CylinderGeometry(arrowRadius, arrowRadius, arrowLength, 6);
        const projMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Коричневый (SaddleBrown)
            roughness: 0.8,
            metalness: 0.1
        });
        const projMesh = new THREE.Mesh(projGeometry, projMaterial);
        projMesh.name = `arrow_proj_${casterId}_visual`;
    
        // Начальная позиция - немного впереди лучника
        const directionToTarget = targetPos.clone().sub(casterPos).normalize();
        const startOffset = 15; // Чуть ближе, чем у огра
        const startPos = casterPos.clone().add(directionToTarget.clone().multiplyScalar(startOffset));
        startPos.z = (casterPos.z || 0) + 15; // На уровне плеча/лука?
        projMesh.position.copy(startPos);
    
        // --- Ориентация стрелы ---
        // Поворачиваем меш так, чтобы его ось Y совпадала с направлением полета
        // Сначала ставим вертикально (ось Y смотрит вверх)
        projMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)); // Промежуточный шаг, чтобы избежать проблем с lookAt(0,0,0)
        // Затем направляем на цель
        projMesh.lookAt(targetPos.x, targetPos.y, startPos.z); // Смотрим на точку цели на той же высоте Z
    
        // Или более надежный способ ориентации по вектору скорости:
        const finalDirection = targetPos.clone().sub(startPos).normalize();
        // Создаем кватернион, который поворачивает ось Y объекта (0,1,0) так, чтобы она совпадала с finalDirection
        projMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), finalDirection);
    
        currentScene.add(projMesh);
    
        // --- Расчет полета ---
        const velocity = finalDirection.multiplyScalar(projectileSpeed); // finalDirection уже нормализован
        const distanceToTarget = startPos.distanceTo(targetPos);
    
        // --- Данные для отслеживания снаряда ---
        // Добавляем в ОБЫЧНЫЙ список снарядов врага enemyProjectilesRef
        const projectileData = {
            id: `arrow_${casterId}_${Date.now()}`,
            ownerId: casterId, // ID владельца
            mesh: projMesh,
            position: startPos.clone(), // Сохраняем стартовую позицию для обновления
            targetPos: targetPos.clone(), // Точка, к которой летим (для информации, не для самонаведения)
            velocity: velocity,         // Фиксированная скорость
            damage: damage,             // Урон при попадании
            lifetime: distanceToTarget / projectileSpeed + 0.2, // Время жизни = время полета + небольшой запас
            // Не создает эффект на земле
            // type: 'arrow' // Можно добавить тип, если нужно
        };
    
        // Добавляем в основной реф снарядов врага
        enemyProjectilesRef.current.push(projectileData);
        console.log(`[Arrow] Добавлен снаряд ${projectileData.id}. Всего вражеских снарядов: ${enemyProjectilesRef.current.length}`);
    
    }, [sceneRef, enemyProjectilesRef]); // Добавляем enemyProjectilesRef в зависимости

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
    const currentStats = playerStats; // Получаем статы (они у тебя уже есть из useGameStore)
// Выводим только нужные для проверки статы

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

// Recommended new version accepting moveStep
const moveEnemyWithCollision = (directionVector, moveStep) => { // Changed parameter name
    // console.log(`[Move Fn DEBUG] Called with moveStep: ${moveStep.toFixed(3)}`); // Debug log
    if (!directionVector || moveStep <= 0) return { collidedX: false, collidedY: false };

    // Assuming ePos, ENEMY_COLLISION_SIZE, wallsRef, checkCollision, levelConfig, clamp are accessible from closure

    // 1. Normalize direction
    const moveDir = directionVector.clone().normalize();

    // 2. Calculate potential next position using the provided moveStep
    const currentX = ePos.x;
    const currentY = ePos.y;
    const nextX = currentX + moveDir.x * moveStep; // Use moveStep directly
    const nextY = currentY + moveDir.y * moveStep; // Use moveStep directly

    // 3. Check collision along X axis
    const enemyHitbox = { 
        x: currentX - ENEMY_COLLISION_SIZE.width / 2, 
        y: currentY - ENEMY_COLLISION_SIZE.height / 2, 
        width: ENEMY_COLLISION_SIZE.width, 
        height: ENEMY_COLLISION_SIZE.height 
    };
    const nextHitboxX = { ...enemyHitbox, x: nextX - ENEMY_COLLISION_SIZE.width / 2 };
    let canMoveX = true;
    for (const wall of wallsRef.current) { 
        if (checkCollision(nextHitboxX, wall)) {
            canMoveX = false; 
            break; 
        } 
    }

    // 4. Check collision along Y axis (using potentially updated X)
    // Use the X position the enemy will actually have after resolving X collision
    const actualNextX = canMoveX ? nextX : currentX; 
    const nextHitboxY = { 
        x: actualNextX - ENEMY_COLLISION_SIZE.width / 2, // Use actualNextX
        y: nextY - ENEMY_COLLISION_SIZE.height / 2, 
        width: ENEMY_COLLISION_SIZE.width, 
        height: ENEMY_COLLISION_SIZE.height 
    };
    let canMoveY = true;
    for (const wall of wallsRef.current) { 
        if (checkCollision(nextHitboxY, wall)) {
            canMoveY = false; 
            break; 
        } 
    }

    // 5. Apply movement based on collision results
    const finalX = canMoveX ? nextX : currentX;
    const finalY = canMoveY ? nextY : currentY;
    
    // Check if position actually changed before assigning (optional micro-optimization)
    if (ePos.x !== finalX) ePos.x = finalX;
    if (ePos.y !== finalY) ePos.y = finalY;


    // 6. Clamp final position to world boundaries
    const eSizeHW = ENEMY_COLLISION_SIZE.width / 2;
    const eSizeHH = ENEMY_COLLISION_SIZE.height / 2;
    const minXb = -levelConfig.gameWorldWidth / 2 + eSizeHW;
    const maxXb = levelConfig.gameWorldWidth / 2 - eSizeHW;
    const minYwb = -levelConfig.WORLD_Y_OFFSET + eSizeHH;
    const maxYwb = levelConfig.gameWorldHeight - levelConfig.WORLD_Y_OFFSET - eSizeHH;
    
    const clampedX = clamp(ePos.x, minXb, maxXb);
    const clampedY = clamp(ePos.y, minYwb, maxYwb);

    if (ePos.x !== clampedX) ePos.x = clampedX;
    if (ePos.y !== clampedY) ePos.y = clampedY;
    
    // console.log(`[Move Fn DEBUG] Final Pos: (${ePos.x.toFixed(1)}, ${ePos.y.toFixed(1)})`);

    // 7. Return collision results
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
                        const ePos = enemy.pivot.position; // --- ИЗМЕНЕНИЕ ИЗ КОД 1 --- (добавлено объявление ePos)
                        const eStats = enemy.stats;
                        const atkRange = eStats.attackRange || 100; // У лучника был меньше радиус (комментарий из кода 1)
                        const playerInAttackRange = dist <= atkRange;
                        const currentMoveSpeed = eStats.speed || 1.0; // Убери * 60, если перешли на новую систему (комментарий из кода 1)
                    
                        // Инициализация патрулирования (взята из код2, т.к. в код1 был только комментарий)
                        if (typeof enemy.patrolWaitTimer === 'undefined') enemy.patrolWaitTimer = 0;
                        if (!enemy.patrolTargetPosition) enemy.patrolTargetPosition = null;
                        if (!enemy.spawnPosition) enemy.spawnPosition = ePos.clone();
                    
                        let shouldRotate = false;
                        let rotateTargetPos = null;
                        let shouldMove = false;
                        let moveTargetPos = null;
                        let isAttackingNow = false; // Флаг для атаки (из кода 1)
                    
                        if (playerInAttackRange) {
                            // --- Игрок в радиусе ---
                            shouldRotate = true; rotateTargetPos = playerPos.clone();
                            // сброс патруля (логика из код2, но соответствует комментарию из код1)
                            enemy.patrolTargetPosition = null;
                            enemy.patrolWaitTimer = 0;
                            shouldMove = false;
                            if (enemy.attackCooldown <= 0) {
                                isAttackingNow = true; // Готовы атаковать (из кода 1)
                            }
                        } else {
                            // --- Игрок вне радиуса (патрулирование) ---
                            // Логика патрулирования оставлена из код2, так как в код1 это был плейсхолдер
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
                    
                        // --- Выполнение действий ---
                        if (isAttackingNow) {
                            // --- ИЗМЕНЕНИЕ ИЗ КОД 1 (логика атаки) ---
                            console.log(`Archer ${enemy.id} firing arrow!`); // Сообщение из кода 1
                    
                            // Запоминаем позицию игрока в момент выстрела
                            const targetPoint = playerPos.clone();
                    
                            // Вызываем новую функцию создания стрелы
                            createArrowProjectile( // Функция из кода 1
                                enemy.id,
                                ePos.clone(),                       // Старт от лучника
                                targetPoint,                        // Цель - точка, где был игрок
                                eStats.projectileSpeed || 400,      // Скорость стрелы (добавь в статы!)
                                eStats.damage                       // Урон стрелы
                            );
                    
                            enemy.attackCooldown = 1 / (eStats.attackSpeed || 1.8); // Сброс кулдауна, attackSpeed из кода 1
                            // TODO: Анимация выстрела из лука (комментарий из кода 1)
                            // --- КОНЕЦ ИЗМЕНЕНИЯ ИЗ КОД 1 (логика атаки) ---
                        }
                    
                        // Движение (если патрулирует)
                        if (shouldMove && moveTargetPos) {
                            const direction = new THREE.Vector3().subVectors(moveTargetPos, ePos);
                            // --- ИЗМЕНЕНИЕ ИЗ КОД 1 (расчет шага) ---
                            const moveStep = currentMoveSpeed * dt; // Рассчитываем шаг здесь
                            moveEnemyWithCollision(direction, moveStep); // Используем обновленную функцию (и moveStep)
                            // --- КОНЕЦ ИЗМЕНЕНИЯ ИЗ КОД 1 (расчет шага) ---
                        }
                    
                        // Поворот
                        if (shouldRotate && rotateTargetPos) {
                            rotateEnemyTowards(rotateTargetPos);
                        }
                        break;
                    } // Конец case 'skeleton_archer' / 'ranged' (комментарий из кода 1)

            // === КАСТЕРЫ (Маги, Чародеи и т.д.) ===
            case 'caster':
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
            
            case 'ogre_mage': {
                const eStats = enemy.stats;
                const ePos = enemy.pivot.position;
                const currentAtkRange = eStats.attackRange || 300; // Используем attackRange для дистанции атаки
                const isPlayerInAttackRange = dist <= currentAtkRange; // dist рассчитано до switch
            
                if (isPlayerInAttackRange) {
                    rotateEnemyTowards(playerPos); // Целимся в игрока
            
                    if (enemy.attackCooldown <= 0) { // Готовность атаки
                        enemy.attackCooldown = 1 / (eStats.attackSpeed || 0.5); // Сброс кулдауна
            
                        // Запоминаем позицию игрока в МОМЕНТ выстрела
                        const targetPoint = playerPos.clone();
            
                        console.log(`Ogre Mage ${enemy.id} запускает снаряд в точку (${targetPoint.x.toFixed(0)}, ${targetPoint.y.toFixed(0)})!`);
            
                        // Вызываем новую функцию для запуска снаряда
                        createProjectileToPoint(
                            enemy.id,                           // ID кастера
                            ePos.clone(),                       // Позиция кастера
                            targetPoint,                        // Точка цели (позиция игрока в момент каста)
                            eStats.projectileSpeed || 350,      // Скорость снаряда
                            eStats.directDamage || 0,           // Прямой урон (если есть)
                            eStats.groundEffectDuration || 3.0, // Длительность огня на земле
                            eStats.groundEffectRadius || 40,    // Радиус огня
                            eStats.groundEffectDps || 5         // Урон огня в секунду
                        );
                         // TODO: Анимация каста Огра-мага
                    } else {
                         // TODO: Анимация ожидания или прицеливания
                    }
                } else {
                    // Игрок вне радиуса
                    // TODO: Анимация Idle / Патрулирование?
                }
                break; // Конец case 'ogre_mage'
            }

            case 'ghostly_enchanter': {
                const eStats = enemy.stats;
                const ePos = enemy.pivot.position;
            
                // Используем радиус ауры или старый радиус атаки как радиус "внимания"
                const awarenessRange = eStats.auraRadius || eStats.attackRange || 150;
                const isPlayerInAwarenessRange = dist <= awarenessRange; // dist - расстояние до игрока, рассчитанное ранее
            
                // --- Новое поведение ---
                if (isPlayerInAwarenessRange) {
                    // Если игрок близко, поворачиваемся к нему
                    rotateEnemyTowards(playerPos);
                    // TODO: Здесь можно включить анимацию типа "поддерживает ауру" или "насторожен"
                } else {
                    // Игрок далеко.
                    // Можно добавить логику возврата к точке спавна или простое стояние/патрулирование.
                    // Пока что он просто не будет поворачиваться к игроку.
                    // TODO: Анимация Idle
                }
            
                // --- Старая логика атаки полностью УДАЛЕНА ---
                // Весь блок if (isPlayerInAttackRange) { if (enemy.attackCooldown <= 0) { applyPlayerDebuff(...) } } больше не нужен.
            
                // Также убедись, что визуальный меш ауры (enemy.auraMesh) всегда видим,
                // если сам враг активен и не мертв (это управляется в useEnemyLoader и проверкой isActive в animate)
                if (enemy.auraMesh) {
                     enemy.auraMesh.visible = enemy.pivot.visible; // Синхронизируем видимость ауры с видимостью врага
                }
            
            
                break; // Конец case 'ghostly_enchanter'
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
                // --- Общие данные (как у лучника и в нашей предыдущей версии) ---
                const eStats = enemy.stats;
                const ePos = enemy.pivot.position;
                const currentAtkRange = eStats.attackRange || 200;
                // Используем скорость патрулирования из статов
                const currentMoveSpeed = (eStats.speed || 1.0) *30; // <<< УБЕРИ * 60
                const playerDist = ePos.distanceTo(playerPos);
                const isPlayerInAttackRange = playerDist <= currentAtkRange;
            
                // --- Инициализация переменных для патрулирования (как у лучника, но используем поля из enemyRefData) ---
                if (typeof enemy.patrolWaitTimer === 'undefined') enemy.patrolWaitTimer = 0;
                if (typeof enemy.currentPatrolIndex === 'undefined') enemy.currentPatrolIndex = 0;
                // patrolPoints и spawnPosition должны быть инициализированы в useEnemyLoader
            
                // --- Переменные для действий (как у лучника) ---
                let shouldRotate = false;
                let rotateTargetPos = null;
                let shouldMove = false;
                let moveTargetPos = null;
                let canAttack = false; // Заменил isAttackingNow на canAttack для ясности
            
                // --- Основная логика (как у лучника) ---
                if (isPlayerInAttackRange) {
                    // === Игрок в радиусе атаки ===
                    shouldRotate = true;
                    rotateTargetPos = playerPos.clone();
                    // enemy.patrolTargetPosition = null; // У культиста нет patrolTargetPosition, он использует patrolPoints/index
                    enemy.patrolWaitTimer = 0; // Сбрасываем таймер ожидания
                    shouldMove = false; // Останавливаемся для атаки
                    if (enemy.abilityCooldown <= 0) { // Проверяем кулдаун способности
                        canAttack = true;
                    }
                    // TODO: Можно добавить анимацию прицеливания/каста здесь
                } else {
                    // === Игрок вне радиуса атаки - Патрулирование ===
                    if (enemy.patrolWaitTimer > 0) {
                        // Стоим на точке, ждем
                        enemy.patrolWaitTimer -= dt;
                        shouldMove = false;
                        shouldRotate = false; // Не поворачиваемся во время ожидания
                        // TODO: Анимация Idle
                    } else if (enemy.patrolPoints && enemy.patrolPoints.length > 0) {
                        // Есть точки патруля и время ожидания вышло, двигаемся к следующей
                        // Определяем целевую точку
                        const targetPatrolPoint = enemy.patrolPoints[enemy.currentPatrolIndex];
                        moveTargetPos = targetPatrolPoint; // Двигаемся к ней
            
                        const distToPatrolTargetSq = ePos.distanceToSquared(targetPatrolPoint);
            
                        // Порог достижения точки патруля (квадрат расстояния < 15*15)
                        if (distToPatrolTargetSq < 225) {
                            // Достигли точки патруля
                            // console.log(`Cultist ${enemy.id} reached patrol point ${enemy.currentPatrolIndex}`);
                            enemy.patrolWaitTimer = 1.5 + Math.random() * 2; // Начинаем ждать
                            // Выбираем ИНДЕКС следующей точки (но двигаться начнем после ожидания)
                            enemy.currentPatrolIndex = (enemy.currentPatrolIndex + 1) % enemy.patrolPoints.length;
                            shouldMove = false; // Стоим и ждем
                            shouldRotate = false;
                            // TODO: Анимация Idle
                        } else {
                            // Продолжаем движение к точке
                            shouldMove = true;
                            shouldRotate = true; // Поворачиваемся по направлению к точке патруля
                            rotateTargetPos = targetPatrolPoint;
                            // TODO: Анимация ходьбы
                        }
                    } else {
                        // Точек патруля нет - просто стоим (можно вернуть к spawnPosition?)
                        shouldMove = false;
                        shouldRotate = false; // Можно повернуться в сторону спавна или не поворачиваться
                        // TODO: Анимация Idle
                    }
                }
            
                // --- Выполнение действий ---
            
                // Атака
                if (canAttack) {
                    console.log(`Cultist ${enemy.id} throws poison projectile!`);
                    launchPoisonProjectile(
                        enemy.id, ePos.clone(), playerPos.clone(),
                        eStats.projectileSpeed || 250,
                        eStats.puddleDuration || 10.0, eStats.puddleRadius || 50, eStats.puddleDps || 3
                    );
                    enemy.abilityCooldown = eStats.abilityCooldown || 8.0; // Сброс кулдауна
                     // TODO: Анимация атаки
                }
            
                // Движение
                if (shouldMove && moveTargetPos) {
                    const direction = new THREE.Vector3().subVectors(moveTargetPos, ePos);
                    const moveStep = currentMoveSpeed * dt; // <<< Рассчитываем шаг здесь
                    moveEnemyWithCollision(direction, moveStep); // <<< Передаем готовый шаг
                }
            
                // Поворот
                if (shouldRotate && rotateTargetPos) {
                    rotateEnemyTowards(rotateTargetPos);
                }
            
                break; // Конец case 'poison_cultist'
            }
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

    // === Y. Обновление Ядовитых Луж ===
    // ==================================
    const remainingPuddles = []; // Массив для луж, которые еще активны
    const nowMs = Date.now(); // Текущее время в миллисекундах

    // Итерируемся по всем лужам, которые сейчас активны (используем реф)
    for (const puddle of activePuddlesRef.current) {
        // Проверяем, не истекло ли время жизни лужи
        if (nowMs < puddle.endTime) {
            // 1. Лужа еще активна - оставляем ее в списке
            remainingPuddles.push(puddle);

            // 2. Проверяем, находится ли игрок внутри лужи
            if (playerObject?.position && playerHp > 0) { // Проверяем, что игрок жив и существует
                // Рассчитываем квадрат расстояния от игрока до центра лужи
                const distanceSq = playerObject.position.distanceToSquared(puddle.position);

                // Сравниваем с квадратом радиуса лужи
                if (distanceSq <= puddle.radiusSq) {
                    // Игрок внутри! Наносим урон, пропорциональный времени кадра (dt)
                    const damageThisFrame = puddle.dps * dt;

                    // Вызываем функцию нанесения урона игроку (из useGameStore)
                    if (typeof playerTakeDamage === 'function') {
                        playerTakeDamage(damageThisFrame);
                        // Можно добавить лог для отладки урона, если нужно
                        // console.log(`Игрок получает ${damageThisFrame.toFixed(2)} урона от лужи ${puddle.id}`);
                    } else {
                        console.error("Функция playerTakeDamage не доступна!");
                    }
                }
            }
        } else {
            // 3. Время жизни лужи истекло - удаляем ее
            console.log(`Ядовитая лужа ${puddle.id} исчезла.`);
            // Удаляем меш со сцены
            if (sceneRef.current && puddle.mesh) {
                sceneRef.current.remove(puddle.mesh);
            }
            // Освобождаем ресурсы геометрии и материала
            puddle.mesh?.geometry?.dispose();
            puddle.mesh?.material?.dispose();
            // Эту лужу мы НЕ добавляем в remainingPuddles
        }
    }

    // Обновляем реф `activePuddlesRef`, оставляя только те лужи, что еще активны
    // Сравниваем длину массивов, чтобы избежать лишних присваиваний рефу
    if (activePuddlesRef.current.length !== remainingPuddles.length) {
        activePuddlesRef.current = remainingPuddles;
        // Важно: Мы напрямую меняем activePuddlesRef.current, как и для облаков.
        // Если бы мы хотели синхронизировать это с состоянием activePuddles,
        // потребовался бы вызов setActivePuddles уже после цикла animate (например, через requestAnimationFrame).
        // Но для производительности прямое обновление рефа внутри animate допустимо.
    }
    // === Конец обновления Ядовитых Луж ===

// === Z. Обновление Снарядов-Эффектов ===
// =========================================
const remainingEffectProjectiles = [];
for (const proj of activeEffectProjectilesRef.current) {
    if (!proj?.mesh || !proj.velocity || !proj.targetPos) { continue; } // Проверка

    const velocityThisFrame = proj.velocity.clone().multiplyScalar(dt);
    const distanceThisFrame = velocityThisFrame.length();
    proj.elapsedDistance += distanceThisFrame;

    let reachedTarget = proj.elapsedDistance >= proj.distanceToTarget;
    const projRadius = proj.mesh.geometry?.parameters?.radius || 8;
    if (!reachedTarget && proj.mesh.position.distanceToSquared(proj.targetPos) < projRadius * projRadius) {
        reachedTarget = true;
    }

    if (!reachedTarget) {
        // === Снаряд еще летит ===
        proj.mesh.position.add(velocityThisFrame);
        remainingEffectProjectiles.push(proj);
    } else {
        // === Снаряд достиг цели ===
        const impactPos = proj.targetPos; // Точка прибытия
        console.log(`[EffectProj] Projectile ${proj.id} (type: ${proj.type}) reached target at (${impactPos.x.toFixed(0)}, ${impactPos.y.toFixed(0)}).`);

        // --- >>> Шаг 1: Проверка прямого попадания в игрока <<< ---
        if (proj.directDamage > 0 && playerObject?.position && playerHp > 0) {
            const playerPos = playerObject.position;
            // Задаем небольшой радиус вокруг точки попадания для регистрации прямого урона
            // Можно использовать половину ширины хитбокса игрока или фиксированное значение
            const hitRadius = PLAYER_HITBOX_SIZE.width / 2 || 15; // Радиус "взрыва" для прямого урона
            const hitRadiusSq = hitRadius * hitRadius;

            // Проверяем расстояние от ТЕКУЩЕЙ позиции игрока до ТОЧКИ ПРИБЫТИЯ снаряда
            if (playerPos.distanceToSquared(impactPos) <= hitRadiusSq) {
                // Попали! Наносим прямой урон.
                console.log(`   -> Projectile ${proj.id} НАПРЯМУЮ ПОПАЛ в игрока! Урон: ${proj.directDamage}.`);
                if (typeof playerTakeDamage === 'function') {
                    playerTakeDamage(proj.directDamage);
                } else {
                    console.error("playerTakeDamage function is not available!");
                }
            } else {
                 console.log(`   -> Снаряд ${proj.id} достиг цели, но игрок не был достаточно близко для прямого попадания.`);
            }
        }
        // --- >>> Конец проверки прямого попадания <<< ---


        // --- Шаг 2: Создаем эффект на земле (в любом случае, если он предусмотрен) ---
        if (proj.createsGroundEffect && proj.groundEffectParams) {
            if (typeof createGroundEffect === 'function') {
                console.log(`   -> Создание эффекта на земле: ${proj.groundEffectParams.type}`);
                createGroundEffect(impactPos, proj.groundEffectParams); // Используем точку прибытия
            } else {
                console.error(`[EffectProj] Функция createGroundEffect не определена!`);
            }
        }

        // --- Шаг 3: Удаляем меш снаряда ---
        if (sceneRef.current && proj.mesh) {
            sceneRef.current.remove(proj.mesh);
        }
        proj.mesh?.geometry?.dispose();
        proj.mesh?.material?.dispose();

        // Снаряд обработан, в remainingEffectProjectiles не добавляем
    }
}
// Обновляем реф
if (activeEffectProjectilesRef.current.length !== remainingEffectProjectiles.length) {
    activeEffectProjectilesRef.current = remainingEffectProjectiles;
}
// === Конец обновления Снарядов-Эффектов ===

// === ZZ. Обновление Горящей Земли ===
// =========================================
const remainingBurningGrounds = []; // Для активных зон горения
const nowMs_fire = Date.now(); // Или используй nowMs, если он еще доступен

for (const zone of activeBurningGroundsRef.current) {
    // Проверяем время жизни
    if (nowMs_fire < zone.endTime) {
        // Зона активна
        remainingBurningGrounds.push(zone);

        // Проверяем коллизию с игроком
        if (playerObject?.position && playerHp > 0) {
            const distanceSq = playerObject.position.distanceToSquared(zone.position);
            if (distanceSq <= zone.radiusSq) {
                // Игрок внутри горящей зоны
                const damageThisFrame = zone.dps * dt; // Урон за кадр
                if (typeof playerTakeDamage === 'function') {
                    playerTakeDamage(damageThisFrame);
                    // console.log(`Игрок получает ${damageThisFrame.toFixed(2)} урона от огня ${zone.id}`);
                } else {
                    console.error("playerTakeDamage function is not available!");
                }
            }
        }
    } else {
        // Время жизни зоны истекло
        // console.log(`Зона горения ${zone.id} истекла. Удаляем.`);
        // Удаляем меш со сцены
        if (sceneRef.current && zone.mesh) {
            sceneRef.current.remove(zone.mesh);
        }
        // Освобождаем ресурсы
        zone.mesh?.geometry?.dispose();
        zone.mesh?.material?.dispose();
    }
}

// Обновляем реф новым массивом активных зон
if (activeBurningGroundsRef.current.length !== remainingBurningGrounds.length) {
    activeBurningGroundsRef.current = remainingBurningGrounds;
}
// === Конец обновления Горящей Земли ===

    // === X. Проверка Ауры Заклинателей ===
    // =====================================
    let isPlayerCurrentlyInAnyAura = false; // Флаг, находится ли игрок ХОТЯ БЫ В ОДНОЙ ауре в этом кадре

    // Проверяем только если игрок существует
    if (playerObject?.position) {
        const playerPos = playerObject.position;

        // Проходим по всем активным врагам
        loadedEnemyRefsArray?.forEach(enemy => { // enemyRefs - массив из useEnemyLoader
            // Проверяем, является ли враг активным заклинателем с аурой
            if (enemy.type === 'ghostly_enchanter' && enemy.isActive && !enemy.isDead && enemy.stats.auraRadius > 0) {
                const auraRadius = enemy.stats.auraRadius;
                const distSq = playerPos.distanceToSquared(enemy.pivot.position); // Квадрат расстояния

                // Если игрок внутри радиуса ауры этого заклинателя
                if (distSq <= auraRadius * auraRadius) {
                    isPlayerCurrentlyInAnyAura = true;
                    // Можно было бы выйти из forEach, если бы это был обычный for,
                    // но для forEach придется пройти до конца. Это не страшно.
                }
            }
        });
    }

    // Получаем ТЕКУЩИЙ статус ауры из стора (чтобы не вызывать set лишний раз)
    const currentAuraStatusInStore = useGameStore.getState().isAffectedByWeakeningAura;

    // Если статус изменился (игрок вошел в ауру или вышел из всех аур)
    if (isPlayerCurrentlyInAnyAura !== currentAuraStatusInStore) {
        // Вызываем action для обновления флага в сторе
        setWeakeningAuraStatus(isPlayerCurrentlyInAnyAura);
    }
    // === Конец проверки Ауры ===

    
    // === X. Обновление Анимаций Дверей ===
    // =====================================
    // Используем новый массив для хранения анимаций, которые еще не завершены
    const remainingDoorAnimations = [];
    // Итерируемся по текущему массиву анимируемых дверей
    for (const anim of animatingDoorsRef.current) {
        // Увеличиваем прошедшее время
        anim.elapsedTime += dt;

        // Рассчитываем прогресс анимации (значение от 0 до 1)
        const t = Math.min(anim.elapsedTime / anim.duration, 1.0);

        // Рассчитываем новую позицию Y с помощью линейной интерполяции (lerp)
        // THREE.MathUtils.lerp(startValue, endValue, interpolationFactor)
        anim.mesh.position.y = THREE.MathUtils.lerp(anim.startY, anim.targetY, t);

        // Проверяем, завершена ли анимация
        if (t < 1.0) {
            // Если нет, добавляем ее в список для следующего кадра
            remainingDoorAnimations.push(anim);
        } else {
            // Анимация завершена
            console.log(`[DoorAnim] Анимация для двери ${anim.id} завершена.`);
            // Делаем дверь невидимой или удаляем окончательно
            anim.mesh.visible = false;
            // Если нужно полностью удалить:
            // if (sceneRef.current) sceneRef.current.remove(anim.mesh);
            // anim.mesh.geometry?.dispose();
            // anim.mesh.material?.dispose();
        }
    }

    // Обновляем реф `animatingDoorsRef`, оставляя только незавершенные анимации
    // Сравниваем длину, чтобы избежать лишних присваиваний, если ничего не изменилось
    if (animatingDoorsRef.current.length !== remainingDoorAnimations.length) {
         animatingDoorsRef.current = remainingDoorAnimations;
    }
    // === Конец обновления анимаций дверей ===

    // === X. Проверка взаимодействия с сундуками ===
// =====================================
const interactionRadius = 45; // <<< Дистанция для открытия сундука (подбери)
const interactionRadiusSq = interactionRadius * interactionRadius;

// Проверяем, только если игрок существует и есть сундуки на уровне
if (playerObject?.position && levelChestsRef.current?.length > 0) {
    const playerPos = playerObject.position;

    // Проходим по всем сундукам на уровне (из рефа)
    levelChestsRef.current.forEach(chest => {
        // Проверяем только НЕОТКРЫТЫЕ сундуки
        if (!chest.isOpened && chest.object3D) { // Добавим проверку object3D
            // Считаем квадрат расстояния от игрока до сундука
            const distSq = playerPos.distanceToSquared(chest.position);

            // Если игрок достаточно близко
            if (distSq <= interactionRadiusSq) {
                console.log(`[Chest Interaction] Игрок подошел к сундуку ${chest.instanceId}. Открываем...`);

                // 1. Помечаем сундук как открытый в рефе (чтобы не открывать повторно)
                chest.isOpened = true;

                // 2. Вызываем action в сторе для генерации и добавления лута
                if (typeof openLevelChest === 'function') {
                     openLevelChest(chest.instanceId, chest.chestTypeId);
                } else {
                     console.error("Action openLevelChest не доступен!");
                }

                // 3. TODO: Запустить анимацию открытия сундука для chest.object3D
                // Пока что просто сделаем его полупрозрачным, чтобы показать, что он открыт
                if(chest.object3D && chest.object3D.material) {
                    chest.object3D.material.transparent = true; // Убедимся, что прозрачность включена
                    chest.object3D.material.opacity = 0.5;      // Делаем полупрозрачным
                    // chest.object3D.rotation.z += Math.PI / 8; // Можно немного повернуть
                }
            }
        }
    });
}
// === Конец проверки сундуков ===

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
    }, [isLoading, levelStatus, playerObject, levelData, playerStats]);

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
    {/* === Контейнер HUD игрока === */}
    {!isLoading && playerObject && typeof playerHp === 'number' && typeof displayMaxHp === 'number' && playerStats && (
        // Новый контейнер для хелсбара и текста
        <div className="player-hud">
        {/* Сначала HealthBar (который теперь содержит текст HP) */}
        <HealthBar currentHp={playerHp} maxHp={displayMaxHp} />

        {/* Потом блок с текстом Атаки */}
        <div className="player-attack-text">
            <span className="stat-atk">ATK: {playerStats.attack}</span>
        </div>
    </div>
    )}
    {/* === Конец контейнера HUD игрока === */}

    {/* === Level Timer === */}
    {!isLoading && levelStatus === 'playing' && (
        <div className="level-timer">
            {formatTime(elapsedTimeSec)}
        </div>
    )}
    {/* === End Level Timer === */}

                {/* Таймер выживания */}
                {!isLoading && levelData?.winCondition?.type === 'survive_duration' && remainingTime !== null && levelStatus === 'playing' && (
                     <div className="survival-timer"> Выжить: {Math.ceil(remainingTime)} сек </div>
                 )}
                {/* Место для рендера Three.js */}
                <div ref={mountRef} className="game-canvas"></div>
            </div>
            {/* Отображение попапа с лутом */}
        <CSSTransition
            in={!!lastOpenedLevelChestRewards} // Показываем, если есть данные о награде
            timeout={300}                   // Длительность анимации (должна совпадать с CSS transition)
            classNames="loot-popup-fade"    // Префикс для CSS классов анимации
            mountOnEnter                    // Монтировать при появлении
            unmountOnExit                   // Размонтировать после исчезновения
            nodeRef={levelLootPopupRef}     // Ссылка на DOM-узел для анимации
        >
            {/* Передаем ref и награды в компонент */}
            <LevelLootPopup ref={levelLootPopupRef} rewards={lastOpenedLevelChestRewards} />
        </CSSTransition>
        
            {/* Джойстик */}
            <div id="joystick-container" className="joystick-container" style={{ visibility: isLoading ? 'hidden' : 'visible' }}></div>

            {/* Попап Поражения */}
            {levelStatus === 'lost' && (
    <GameOverPopup
        onGoToMenu={() => {
            if (typeof onLevelComplete === 'function') onLevelComplete(levelData.id, 'lost');
            else console.warn("onLevelComplete не передан");
        }}
        // <<< ПЕРЕДАЕМ ВРЕМЯ КАК ПРОПС >>>
        timePlayed={timePlayedSeconds}
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