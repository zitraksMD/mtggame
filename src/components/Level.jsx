import * as THREE from "three";
// Добавляем useMemo в импорт
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import nipplejs from "nipplejs";
// Предполагаемые импорты кастомных хуков
import usePlayerLoader from './usePlayerLoader'; // Убедись, что путь и имя файла верны
import useEnemyLoader from './useEnemyLoader';   // Убедись, что путь и имя файла верны
// Импорт стора и UI компонентов
import useGameStore from '../store/useGameStore'; // Убедись, что путь верный
import GameOverPopup from './GameOverPopup'; // Убедись, что путь верный
// Импорт стилей
import "./styles.scss"; // Убедись, что путь верный
import { clamp, checkCollision, convertTiledX, convertTiledY, DEFAULT_WORLD_WIDTH, DEFAULT_WORLD_HEIGHT } from './utils';


// --- Константы для луча ---
const BEAM_WIDTH = 15; // <<<--- Подбери ширину луча
const BEAM_TEXTURE_FIRE = '/assets/fire-beam.png'; // <<<--- УКАЖИ ПРАВИЛЬНЫЙ ПУТЬ
const BEAM_TEXTURE_ICE = '/assets/ice-beam.png';   // <<<--- УКАЖИ ПРАВИЛЬНЫЙ ПУТЬ

// --- Компонент HealthBar (определен здесь же) ---
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
// (используется внутри useMemo ниже)
const getWorldDimensions = (levelData) => {
    const gameWorldWidth = levelData?.width || DEFAULT_WORLD_WIDTH;
    const gameWorldHeight = levelData?.height || DEFAULT_WORLD_HEIGHT;
    const WORLD_Y_OFFSET = gameWorldHeight / 2;
    return { gameWorldWidth, gameWorldHeight, WORLD_Y_OFFSET };
};
// ---------------------------------------------

// === Основной компонент Уровня ===
const Level = ({ levelData, onLevelComplete, onReady }) => {
    // Проверка наличия данных уровня
    if (!levelData || typeof levelData.id === 'undefined') {
        return <div className="error-message">Ошибка: Не найдены данные уровня!</div>;
    }

    const HEALTH_BAR_WIDTH = 30; // Такое же значение, как в useEnemyLoader!

    // === Рефы ===
    const mountRef = useRef(null);
    const cameraRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const joystickRef = useRef(null);
    const animationFrameId = useRef(null);
    const wallsRef = useRef([]);
    const projectilesRef = useRef([]);
    const velocity = useRef({ x: 0, y: 0, force: 0 });
    const playerAttackCooldown = useRef(0);
    const levelStartTimeRef = useRef(null);
    const readyCalledRef = useRef(false);
    const enemyProjectilesRef = useRef([]); // <<<--- НОВЫЙ РЕФ: Снаряды врагов
    const beamTexturesRef = useRef({});
const [beamTexturesLoaded, setBeamTexturesLoaded] = useState(false);

    // === Состояния ===
    const [isLoading, setIsLoading] = useState(true);
    const [levelStatus, setLevelStatus] = useState('playing');
    const [enemiesState, setEnemiesState] = useState([]);
    const [remainingTime, setRemainingTime] = useState(null);

    // === Глобальный Стор ===
    const {
        playerHp,
        displayMaxHp,
        playerStats,
        playerTakeDamage,
        initializeLevelHp
    } = useGameStore(state => ({
        playerHp: state.playerHp,
        displayMaxHp: state.computedStats().hp,
        playerStats: state.computedStats(),
        playerTakeDamage: state.playerTakeDamage,
        initializeLevelHp: state.initializeLevelHp,
    }));

    useEffect(() => {
        console.log("Player Stats Loaded:", JSON.stringify(playerStats, null, 2));
    }, [playerStats]);
    // <<<--- КОНЕЦ ЛОГА ---<<<

    useEffect(() => {
        console.log("--- Level Mount/Data Change: Вызов initializeLevelHp() ---");
        if (typeof initializeLevelHp === 'function') {
            initializeLevelHp(); // Сбрасываем HP в сторе до максимального
        } else {
            console.error("ОШИБКА: initializeLevelHp не функция!");
        }
        // Также сбросим статус уровня на 'playing' при загрузке, на всякий случай
        setLevelStatus('playing');
    }, [initializeLevelHp, levelData]); // Запускаем при монтировании и смене уровня
    // === Конфигурация Уровня (Мемоизированная) ===
    const levelConfig = useMemo(() => {
        // console.log("Calculating levelConfig..."); // Раскомментируй для отладки частоты вызова
        return getWorldDimensions(levelData);
    }, [levelData?.width, levelData?.height]);

     // --- !!! НОВЫЙ useEffect для загрузки текстур лучей !!! ---
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

        // Загрузка огненного луча
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

        // Загрузка ледяного луча
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
             // Очистка текстур при размонтировании уровня (опционально, если они больше нигде не нужны)
             // beamTexturesRef.current.fire?.dispose();
             // beamTexturesRef.current.ice?.dispose();
             // beamTexturesRef.current = {};
             // setBeamTexturesLoaded(false);
        }
    }, []); // Пустой массив зависимостей - загружаем один раз
// === 1. ИНИЦИАЛИЗАЦИЯ СЦЕНЫ, РЕНДЕРЕРА, КАМЕРЫ + ОБРАБОТКА РЕСАЙЗА ===
    // =======================================================================
    useEffect(() => {
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Создаем камеру СНАЧАЛА с временными границами
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
        cameraRef.current = camera;
        camera.position.set(0, 0, 1000); // Z важен

        // Создаем рендерер
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        rendererRef.current = renderer;
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputEncoding = THREE.sRGBEncoding;

        const mountPoint = mountRef.current;
        if (!mountPoint) { console.error("Mount point not found!"); setLevelStatus('error'); return; }

        // Вставляем канвас в DOM
        mountPoint.innerHTML = "";
        mountPoint.appendChild(renderer.domElement);

        // --- Обработчик изменения размера ---
        const handleResize = () => {
            if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;

            const width = mountPoint.clientWidth;
            const height = mountPoint.clientHeight;

            // 1. Обновить размер рендерера
            rendererRef.current.setSize(width, height);

            // 2. Обновить границы ортографической камеры
            cameraRef.current.left = width / -2;
            cameraRef.current.right = width / 2;
            cameraRef.current.top = height / 2;
            cameraRef.current.bottom = height / -2;

            // 3. ОБЯЗАТЕЛЬНО обновить проекционную матрицу камеры
            cameraRef.current.updateProjectionMatrix();

            // console.log(`Canvas resized to: ${width}x${height}`); // Отладка
        };

        // --- Устанавливаем НАЧАЛЬНЫЙ размер и параметры камеры ---
        handleResize(); // Вызываем один раз при инициализации

        // --- Добавляем слушатель события resize окна ---
        window.addEventListener('resize', handleResize);

        // --- Остальная инициализация сцены (свет, фон, стены) ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
        directionalLight.position.set(50, 150, 100); directionalLight.target.position.set(0, 0, 0);
        scene.add(directionalLight); scene.add(directionalLight.target);

        const textureLoader = new THREE.TextureLoader(); let backgroundMesh = null;
        if (levelData?.backgroundTexture) {
            textureLoader.load(levelData.backgroundTexture, (texture) => {
                 if (!sceneRef.current) return; texture.encoding = THREE.sRGBEncoding;
                 const bgGeometry = new THREE.PlaneGeometry(levelConfig.gameWorldWidth, levelConfig.gameWorldHeight);
                 const bgMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                 backgroundMesh = new THREE.Mesh(bgGeometry, bgMaterial); backgroundMesh.position.set(0, 0, -10); backgroundMesh.renderOrder = -1;
                 sceneRef.current.add(backgroundMesh);
            }, undefined, (error) => console.error("❌ Ошибка загрузки фона:", error));
        } else { scene.background = new THREE.Color(0x282c34); }

        wallsRef.current = [];
        if (levelData?.walls && levelData.walls.length > 0) {
             const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8, metalness: 0.2 });
             levelData.walls.forEach(wallData => {
                 const wallWidth = wallData.width; const wallHeight = wallData.height;
                 const wallX = convertTiledX(wallData.x, wallWidth, levelConfig.gameWorldWidth);
                 const wallY = convertTiledY(wallData.y, wallHeight, levelConfig.gameWorldHeight, levelConfig.WORLD_Y_OFFSET);
                 const wallGeometry = new THREE.BoxGeometry(wallWidth, wallHeight, 10);
                 const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
                 wallMesh.position.set(wallX, wallY, -5.1); wallMesh.receiveShadow = true; scene.add(wallMesh);
                 wallsRef.current.push({id: wallData.id || `wall-${Math.random()}`, x: wallX - wallWidth / 2, y: wallY - wallHeight / 2, width: wallWidth, height: wallHeight, mesh: wallMesh});
             });
        }

        // --- Функция Очистки ---
        return () => {
            window.removeEventListener('resize', handleResize); // << Важно: Удаляем слушатель
            // <<<--- ДОБАВЛЕНО: Очистка снарядов врагов ---<<<
if (sceneRef.current && enemyProjectilesRef.current) {
     enemyProjectilesRef.current.forEach(proj => {
         if (proj.mesh) {
             sceneRef.current.remove(proj.mesh);
             proj.mesh.geometry?.dispose();
             proj.mesh.material?.dispose();
         }
     });
     enemyProjectilesRef.current = [];
 }
            // Остальная очистка
            if (animationFrameId.current) { cancelAnimationFrame(animationFrameId.current); animationFrameId.current = null; }
            if (joystickRef.current) { joystickRef.current.destroy(); joystickRef.current = null; }
            rendererRef.current?.dispose();
            if (mountPoint && rendererRef.current?.domElement && mountPoint.contains(rendererRef.current.domElement)) {
                mountPoint.removeChild(rendererRef.current.domElement);
            }
            if (sceneRef.current) { wallsRef.current.forEach(wall => { if(wall.mesh) sceneRef.current?.remove(wall.mesh); wall.mesh?.geometry?.dispose(); }); if (backgroundMesh) { sceneRef.current.remove(backgroundMesh); backgroundMesh.geometry?.dispose(); backgroundMesh.material?.map?.dispose(); backgroundMesh.material?.dispose(); } while(sceneRef.current.children.length > 0){ sceneRef.current.remove(sceneRef.current.children[0]); } }
            wallsRef.current = []; sceneRef.current = null; rendererRef.current = null; cameraRef.current = null;
        };
    // Зависимости остаются прежними, так как handleResize сама берет размеры из DOM
    }, [levelData?.backgroundTexture, levelData?.walls, levelConfig]);
    // =======================================================================
    // === КОНЕЦ БЛОКА ИНИЦИАЛИЗАЦИИ СЦЕНЫ + РЕСАЙЗ ===
    // =======================================================================

    // === 2. ЗАГРУЗКА ИГРОКА ===
    const { playerObject, isPlayerModelLoaded } = usePlayerLoader(
        playerStats.skin || "/Models/character.glb",
        levelData?.playerStart || { x: levelConfig.gameWorldWidth / 2, y: levelConfig.gameWorldHeight - 100 },
        sceneRef.current, levelConfig
    );

    // === 3. ЗАГРУЗКА ВРАГОВ ===
    const { enemyRefs, areEnemiesLoaded, initialEnemyStates } = useEnemyLoader(
        levelData?.enemies, sceneRef.current, levelConfig
    );

    // === 4. УПРАВЛЕНИЕ ОБЩЕЙ ЗАГРУЗКОЙ ===
    useEffect(() => {
        const currentlyLoading = !(isPlayerModelLoaded && areEnemiesLoaded);
        if (isLoading !== currentlyLoading) {
            setIsLoading(currentlyLoading);
            if (!currentlyLoading) {
                console.log("✨ Уровень ГОТОВ!");
                if (typeof initializeLevelHp === 'function') { initializeLevelHp(); console.log("HP игрока инициализировано."); }
                else { console.error("ОШИБКА: initializeLevelHp не функция!"); }
                if (typeof onReady === 'function' && !readyCalledRef.current) { onReady(); readyCalledRef.current = true; }
                if (levelData?.winCondition?.type === 'survive_duration') {
                    levelStartTimeRef.current = Date.now(); setRemainingTime(levelData.winCondition.duration);
                } else { levelStartTimeRef.current = null; setRemainingTime(null); }
            }
        }
    }, [isPlayerModelLoaded, areEnemiesLoaded, isLoading, onReady, levelData?.winCondition]);

    // === 5. ИНИЦИАЛИЗАЦИЯ СОСТОЯНИЯ ВРАГОВ ===
    useEffect(() => {
        if (areEnemiesLoaded && initialEnemyStates.length > 0) {
            // Устанавливаем начальное состояние, только если оно еще не установлено
            // Сравнение через JSON.stringify может быть не самым оптимальным, но предотвратит лишние ререндеры, если initialEnemyStates не меняется
            if (JSON.stringify(enemiesState) !== JSON.stringify(initialEnemyStates)) {
                 console.log("--- ИНИЦИАЛИЗАЦИЯ enemiesState из initialEnemyStates ---");
                 setEnemiesState(initialEnemyStates);
            }
        } else if (!areEnemiesLoaded && enemiesState.length > 0) {
             // Очищаем состояние, если враги выгружены
             console.log("--- Очистка enemiesState при выгрузке врагов ---");
             setEnemiesState([]);
        }
        // Зависим ТОЛЬКО от флага загрузки и начальных данных
    }, [areEnemiesLoaded, initialEnemyStates]); // <<<--- УБРАЛИ enemiesState ИЗ ЗАВИСИМОСТЕЙ

    // === 6. НАСТРОЙКА ДЖОЙСТИКА ===
     useEffect(() => {
        let joystickInstance = null;
        if (!isLoading && sceneRef.current) { // Создаем только после загрузки
            const joystickZone = document.getElementById("joystick-container");
            if (joystickZone && !joystickRef.current) {
                 try {
                     const options = { zone: joystickZone, mode: "static", position: { left: "50%", top: "50%" }, size: 100, color: "rgba(255, 255, 255, 0.5)", threshold: 0.1 };
                     joystickInstance = nipplejs.create(options); joystickRef.current = joystickInstance;
                     joystickInstance.on("move", (evt, data) => { if (data.vector) { velocity.current = { x: data.vector.x, y: data.vector.y, force: data.force }; } });
                     joystickInstance.on("end", () => { velocity.current = { x: 0, y: 0, force: 0 }; });
                 } catch (error) { console.error("❌ Ошибка создания джойстика:", error); }
             } else if (!joystickZone && !isLoading) { console.warn("Не найден #joystick-container."); }
        }
        return () => { if (joystickRef.current) { joystickRef.current.destroy(); joystickRef.current = null; } };
    }, [isLoading]);

    // === 7. ОБРАБОТЧИК УРОНА ВРАГУ ===
    const handleEnemyHit = useCallback((enemyId, damageAmount) => {
        console.log(`--- handleEnemyHit вызван: враг ID=${enemyId}, урон=${damageAmount} ---`);
        let enemyDefeated = false;
        let enemyRefToMark = null;

        setEnemiesState(prevEnemies => {
            console.log(`--- setEnemiesState получил prevEnemies с HP:`, JSON.stringify(prevEnemies.map(e => ({id: e.id, hp: e.currentHp}))));
            const newEnemiesState = [...prevEnemies];
            const enemyIndex = newEnemiesState.findIndex(e => e.id === enemyId);

            // Проверяем, найден ли враг и жив ли он
            if (enemyIndex !== -1 && newEnemiesState[enemyIndex].currentHp > 0) {
                const currentHp = newEnemiesState[enemyIndex].currentHp; // Запомним текущее HP
                const newHp = Math.max(0, currentHp - damageAmount); // Вычислим новое HP

                // --- !!! ПРАВИЛЬНОЕ МЕСТО ДЛЯ ЛОГА ИЗМЕНЕНИЯ HP !!! ---
                console.log(`--- Изменение HP для ${enemyId}: ${currentHp} -> ${newHp} ---`);
                // --- !!! ---

                // Проверяем, умер ли враг именно этим ударом
                if (newHp === 0 /* && currentHp > 0 */) { // Можно убрать currentHp > 0, т.к. newHp=0 только если currentHp был > 0
                    console.log(`--- Враг ${enemyId} помечен как побежденный (HP=0)! ---`);
                    enemyDefeated = true;
                    // Ищем ссылку на объект врага в enemyRefs СРАЗУ, пока есть enemyId
                     enemyRefToMark = enemyRefs.find(ref => ref && ref.id === enemyId);
                     if (!enemyRefToMark) { console.warn(`[handleEnemyHit] Не найден enemyRef ${enemyId} для установки isDead!`); }
                }

                // Обновляем HP в новом массиве состояния
                 newEnemiesState[enemyIndex] = { ...newEnemiesState[enemyIndex], currentHp: newHp };
                 return newEnemiesState; // Возвращаем измененный массив
            }

            // Если враг не найден или уже мертв, возвращаем старый массив без изменений
            return prevEnemies;
        });

        // Устанавливаем флаг isDead на объекте врага вне setEnemiesState
        // Это нужно, чтобы AI врага перестал работать сразу, не дожидаясь ререндера
        if (enemyDefeated && enemyRefToMark && !enemyRefToMark.isDead) {
             enemyRefToMark.isDead = true;
             console.log(`--- Флаг isDead установлен для ${enemyId} ---`);
        }
    }, [enemyRefs]); // Зависимость только от enemyRefs

    // === 8. УДАЛЕНИЕ МЕРТВЫХ ВРАГОВ СО СЦЕНЫ ===
     useEffect(() => {
        if (!sceneRef.current || !enemyRefs || !enemiesState) return;
        const deadEnemyIds = new Set(enemiesState.filter(state => state.currentHp <= 0).map(state => state.id));
        console.log("--- Множество мертвых ID:", deadEnemyIds); // Показывает, кого считаем мертвыми
        enemyRefs.forEach(enemyRef => {
            if (deadEnemyIds.has(enemyRef.id) && enemyRef.pivot?.parent === sceneRef.current) { // Добавил ?.parent
                console.log(`--- Удаление мертвого врага ${enemyRef.id} со сцены ---`);
                 sceneRef.current.remove(enemyRef.pivot);
            }
        });
    }, [enemiesState, enemyRefs]); // sceneRef не меняется, убрал из зависимостей

    // === 9. ЛОГИКА СТАТУСОВ ИГРЫ ===
    const winLevel = useCallback(() => { if (levelStatus === 'playing') setLevelStatus('won'); }, [levelStatus]);
    const loseLevel = useCallback(() => { if (levelStatus === 'playing') setLevelStatus('lost'); }, [levelStatus]);
    useEffect(() => { if (typeof playerHp === 'number' && playerHp <= 0 && levelStatus === 'playing') loseLevel(); }, [playerHp, levelStatus, loseLevel]);

    // === 10. ОСНОВНОЙ ИГРОВОЙ ЦИКЛ ===
    useEffect(() => {
        if (isLoading || levelStatus !== 'playing' || !playerObject || !enemyRefs || !sceneRef.current || !rendererRef.current || !cameraRef.current) {
            // Если игра не готова к запуску цикла, убедимся, что он остановлен
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current); animationFrameId.current = null;
            }
            return; // Выходим, если не готовы
        }

        const clock = new THREE.Clock();
        // --- Вспомогательные функции цикла ---
        const findNearestEnemy = (origin, maxRangeSq) => { /* ... реализация ... */
            let nearestEnemy = null; let minDistanceSq = maxRangeSq;
            enemyRefs.forEach(enemy => {
                const enemyState = enemiesState.find(es => es.id === enemy.id);
                if (!enemy || !enemy.pivot?.position || !enemyState || enemyState.currentHp <= 0 || enemy.isDead) return;
                const distanceSq = origin.distanceToSquared(enemy.pivot.position);
                if (distanceSq < minDistanceSq) { minDistanceSq = distanceSq; nearestEnemy = enemy; }
            }); return nearestEnemy;
        };
        const addProjectileMesh = (projectileData) => { /* ... реализация ... */
            if (!sceneRef.current) return; const geometry = new THREE.SphereGeometry(4, 6, 6);
            const material = new THREE.MeshBasicMaterial({ color: projectileData.isCrit ? 0xffaa00 : 0xffffff });
            const mesh = new THREE.Mesh(geometry, material); mesh.position.copy(projectileData.position);
            projectileData.mesh = mesh; sceneRef.current.add(mesh);
         };
        const createProjectile = (targetEnemyRef) => { /* ... реализация ... */
             if (!playerObject || !targetEnemyRef?.pivot?.position) return;
             const projSpeed = 500; const projLifetime = 1.5; const baseDamage = playerStats.attack || 1;
             const startPos = playerObject.position.clone(); const targetPos = targetEnemyRef.pivot.position.clone();
             const direction = targetPos.sub(startPos).normalize(); const critChance = playerStats.critChance || 0;
             const isCrit = Math.random() * 100 < critChance; const critMultiplier = 2;
             let finalDamage = isCrit ? Math.round(baseDamage * critMultiplier) : baseDamage;
             const doubleStrikeChance = playerStats.doubleStrikeChance || 0;
             const isDoubleStrike = Math.random() * 100 < doubleStrikeChance;
             const makeProjectileData = (dmg, crit) => ({id: Math.random(), position: startPos.clone().add(direction.clone().multiplyScalar(25)), velocity: direction.clone().multiplyScalar(projSpeed), damage: dmg, isCrit: crit, lifetime: projLifetime, mesh: null});
             const p1 = makeProjectileData(finalDamage, isCrit); projectilesRef.current.push(p1); addProjectileMesh(p1);
             if (isDoubleStrike) { const isCrit2 = Math.random() * 100 < critChance; const dmg2 = isCrit2 ? Math.round(baseDamage * critMultiplier) : baseDamage;
                 const p2 = makeProjectileData(dmg2, isCrit2); p2.position.add(new THREE.Vector3(direction.y, -direction.x, 0).multiplyScalar(5));
                 projectilesRef.current.push(p2); addProjectileMesh(p2);
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
            if (!enemy || !enemy.pivot?.position || !enemy.stats || !playerCurrentPos) return;

            const projSpeed = 300 + Math.random() * 100;
            const projLifetime = 2.0;
            const damage = enemy.stats.damage || 3; // Берем урон из статов врага

            const startPos = enemy.pivot.position.clone();
            const targetPos = playerCurrentPos.clone();
            const direction = targetPos.sub(startPos).normalize();
            startPos.add(direction.clone().multiplyScalar(25)); // Смещаем старт

            const projectileData = {
                id: Math.random(),
                ownerId: enemy.id, // ID врага, который выпустил снаряд
                position: startPos,
                velocity: direction.clone().multiplyScalar(projSpeed),
                damage: damage,
                lifetime: projLifetime,
                mesh: null
            };

            enemyProjectilesRef.current.push(projectileData); // Добавляем в массив вражеских снарядов
            addEnemyProjectileMesh(projectileData); // Создаем меш
        };

        // Функция для создания меша луча (можно добавить рядом с другими create...Projectile)
        const createBeamMeshFixed = (enemy, targetPos) => {
            console.log("--- DEBUG: Вход в createBeamMeshFixed ---"); // Лог входа

            // --- Логи для проверки условия ---
            console.log("  >> sceneRef.current:", sceneRef.current ? 'ЕСТЬ' : 'НЕТ');
            console.log("  >> enemy.pivot?.position:", enemy.pivot?.position);
            console.log("  >> beamTexturesRef.current:", beamTexturesRef.current);
            // --- ---
            if (!sceneRef.current || !enemy.pivot?.position || !beamTexturesRef.current) return null;

            const beamType = enemy.stats.beamType === 'fire' ? 'fire' : 'ice';
            const texture = beamTexturesRef.current[beamType]; // Берем загруженную текстуру

            if (!texture) {
                console.error(`Текстура для луча типа "${beamType}" не загружена!`);
                return null;
            }

            const startPoint = enemy.pivot.position.clone();
            // --- !!! Смещение начальной точки луча (к руке/посоху мага) !!! ---
             const beamOriginOffsetY = 25; // <<<--- ПОДБЕРИ ЭТО ЗНАЧЕНИЕ
             startPoint.y += beamOriginOffsetY;
            // --- !!! ---

            const endPoint = targetPos.clone();
            const direction = endPoint.clone().sub(startPoint); // Вектор от начала к концу
            const distance = direction.length();
            console.log(`  >> Дистанция луча: ${distance.toFixed(1)}`); // Не равна ли нулю?


            if (distance <= 0.1) return null; // Не создаем слишком короткий луч

            // Используем PlaneGeometry. Высота = 1 для удобства масштабирования по длине.
            const beamGeo = new THREE.PlaneGeometry(BEAM_WIDTH, 1);
            const beamMat = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true, // Обязательно для PNG с прозрачностью
                depthTest: false,  // Рендерить поверх всего
                depthWrite: false,
                side: THREE.DoubleSide, // Видно с обеих сторон
                // blending: THREE.AdditiveBlending, // Попробуй для яркого эффекта "свечения"
            });

            const beamMesh = new THREE.Mesh(beamGeo, beamMat);
            beamMesh.name = `beam_${enemy.id}`;
            beamMesh.renderOrder = 900; // Порядок рендера (ниже хелсбаров)

            // --- Позиционирование и ориентация ---
            beamMesh.scale.y = distance; // Растягиваем по высоте (=длине луча)
            beamMesh.position.copy(startPoint).lerp(endPoint, 0.5); // Ставим в середину между точками
            // Поворачиваем "вверх" плоскости (ось Y) вдоль направления луча
            beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
            // --- ---

            sceneRef.current.add(beamMesh);
            console.log(`--- МЕШ ЛУЧА (Plane) СОЗДАН для ${enemy.id} ---`);
            return beamMesh;
        }

        // Функция для обновления существующего луча (PlaneGeometry)
        const updateBeamMesh = (beamMesh, startPosRaw, targetPos) => {
            if (!beamMesh || !startPosRaw || !targetPos) return;

            const startPoint = startPosRaw.clone();
            // --- !!! Применяем то же смещение, что и при создании !!! ---
            const beamOriginOffsetY = 25; // <<<--- ТО ЖЕ ЗНАЧЕНИЕ, ЧТО И ВЫШЕ
            startPoint.y += beamOriginOffsetY;
             // --- !!! ---

            const endPoint = targetPos.clone();
            const direction = endPoint.clone().sub(startPoint);
            const distance = direction.length();

            if (distance <= 0.1) { beamMesh.visible = false; return; }

            beamMesh.visible = true;
            beamMesh.scale.y = distance; // Обновляем длину
            beamMesh.position.copy(startPoint).lerp(endPoint, 0.5); // Обновляем середину
            // Обновляем ориентацию
            beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        }

        // Функция удаления луча (остается почти такой же)
        const removeBeamMesh = (enemy) => {
             if (enemy.beamEffectMesh && sceneRef.current) {
                console.log(`--- Удаление меша луча для ${enemy.id} ---`);
                 sceneRef.current.remove(enemy.beamEffectMesh);
                 // Геометрию и материал удалять не нужно, если они используются повторно
                 // Но если ты создаешь их каждый раз уникально, то нужно:
                 // enemy.beamEffectMesh.geometry?.dispose();
                 // enemy.beamEffectMesh.material?.dispose();
                 enemy.beamEffectMesh = null; // Убираем ссылку
             }
}

        const checkWinCondition = () => { /* ... реализация ... */
             if (!levelData?.winCondition) return; const { type, duration } = levelData.winCondition;
             const liveEnemies = enemiesState.filter(e => e.currentHp > 0); const liveBosses = liveEnemies.filter(e => e.isBoss);
             switch (type) {
                 case 'clear_enemies': if (liveEnemies.length === 0 && levelData.enemies?.length > 0) winLevel(); break;
                 case 'defeat_all_bosses': const wereBosses = levelData.enemies?.some(e => e.type === 'boss'); if (liveBosses.length === 0 && wereBosses) winLevel(); break;
                 case 'survive_duration': if (levelStartTimeRef.current && duration) { const elapsed = (Date.now() - levelStartTimeRef.current) / 1000; const remaining = Math.max(0, duration - elapsed); setRemainingTime(remaining); if (remaining <= 0) winLevel(); } break;
                 default: break;
             }
        };

        // --- Главная функция кадра ---
        const animate = () => {
            
            if (levelStatus !== 'playing') { // Проверка статуса внутри цикла для корректной остановки
                if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current); animationFrameId.current = null; return;
            }
            animationFrameId.current = requestAnimationFrame(animate); // Запрос следующего кадра
            const dt = Math.min(clock.getDelta(), 0.05);
            // Переменные для удобства (из рефов / объектов)
             const playerPos = playerObject.position;
             const currentScene = sceneRef.current;
             const currentCamera = cameraRef.current;
             const currentRenderer = rendererRef.current;

            // 1. Обновление игрока (движение, коллизии, поворот)
            const effectiveSpeed = (playerStats.speed || 3) * (velocity.current.force > 0.1 ? 1 : 0);
            if (effectiveSpeed > 0) { /* ... логика движения, коллизий, поворота playerObject ... */
                const speedMultiplier = 60; const dx = (velocity.current.x || 0) * effectiveSpeed * dt * speedMultiplier; const dy = (velocity.current.y || 0) * effectiveSpeed * dt * speedMultiplier;
                let nextX = playerPos.x + dx; let nextY = playerPos.y + dy; const PLAYER_SIZE = { width: 30, height: 30 };
                const pRect = { x: playerPos.x - PLAYER_SIZE.width / 2, y: playerPos.y - PLAYER_SIZE.height / 2, width: PLAYER_SIZE.width, height: PLAYER_SIZE.height };
                let colX = false; let colY = false; const pRectX = { ...pRect, x: nextX - PLAYER_SIZE.width / 2 };
                for (const wall of wallsRef.current) { if (checkCollision(pRectX, wall)) { colX = true; break; } }
                const pRectY = { ...pRect, y: nextY - PLAYER_SIZE.height / 2 };
                for (const wall of wallsRef.current) { if (checkCollision(pRectY, wall)) { colY = true; break; } }
                if (!colX) playerPos.x = nextX; if (!colY) playerPos.y = nextY;
                const pSizeHW = PLAYER_SIZE.width / 2; const pSizeHH = PLAYER_SIZE.height / 2;
                const minX = -levelConfig.gameWorldWidth / 2 + pSizeHW; const maxX = levelConfig.gameWorldWidth / 2 - pSizeHW;
                const minYw = -levelConfig.WORLD_Y_OFFSET + pSizeHH; const maxYw = levelConfig.gameWorldHeight - levelConfig.WORLD_Y_OFFSET - pSizeHH;
                playerPos.x = clamp(playerPos.x, minX, maxX); playerPos.y = clamp(playerPos.y, minYw, maxYw);
                if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
                    const angle = Math.atan2(dy, dx); let targetRotZ = angle + Math.PI / 2; const currentRotZ = playerObject.rotation.z; const twoPi = Math.PI * 2;
                    let diff = targetRotZ - currentRotZ; while (diff < -Math.PI) diff += twoPi; while (diff > Math.PI) diff -= twoPi;
                    const lerp = 0.15; playerObject.rotation.z = currentRotZ + diff * lerp;
                }
            }
            // 2. Атака игрока
            playerAttackCooldown.current -= dt;
            if (playerAttackCooldown.current <= 0) {
                const interval = 1 / (playerStats.attackSpeed || 1.0); playerAttackCooldown.current = interval;
                const rangeSq = 150 * 150; const target = findNearestEnemy(playerPos, rangeSq); if (target) createProjectile(target);
            }
            // 3. Обновление снарядов игрока
            const activeProjectiles = [];
            const enemyHitboxes = enemyRefs.map(enemy => { /* ... создание хитбоксов живых врагов ... */
                const state = enemiesState.find(es => es.id === enemy.id);
                if (enemy.pivot?.position && state && state.currentHp > 0 && !enemy.isDead) {
                    const size = 40; return { id: enemy.id, x: enemy.pivot.position.x - size / 2, y: enemy.pivot.position.y - size / 2, width: size, height: size };
                } return null; }).filter(Boolean);
            projectilesRef.current.forEach(proj => { /* ... движение, проверка коллизий, удаление ... */
                proj.position.x += proj.velocity.x * dt; proj.position.y += proj.velocity.y * dt; proj.lifetime -= dt;
                if (proj.mesh) proj.mesh.position.copy(proj.position); let hit = false;
                if (proj.lifetime > 0 && enemyHitboxes.length > 0) { const size = 8; const pHitbox = { x: proj.position.x - size / 2, y: proj.position.y - size / 2, width: size, height: size };
                    for (const eBox of enemyHitboxes) { if (checkCollision(pHitbox, eBox)) { handleEnemyHit(eBox.id, proj.damage); hit = true; break; } } }
                if (proj.lifetime > 0 && !hit) activeProjectiles.push(proj); else { if (proj.mesh) { currentScene?.remove(proj.mesh); proj.mesh.geometry?.dispose(); } }
            }); projectilesRef.current = activeProjectiles;
            // 4. Обновление врагов (анимация, ИИ: поворот, движение, атака)
  // === НАЧАЛО ПОЛНОГО КОДА ДЛЯ enemyRefs.forEach(...) ===
        // ===================================================================
        enemyRefs.forEach(enemy => {
            // 1. --- Получение данных и базовые проверки ---
            const enemyState = enemiesState.find(es => es.id === enemy.id);
            // Добавим проверку на playerObject, чтобы playerPos был доступен
            if (!enemy || !enemy.pivot || !enemy.stats || enemy.isDead || !enemyState || enemyState.currentHp <= 0 || !playerObject) {
                 if (enemy?.hpBar?.container) { enemy.hpBar.container.visible = false; } // Скрываем хелсбар если враг невалиден/мертв
                 if (enemyState?.currentHp <= 0 && enemy && !enemy.isDead) enemy.isDead = true; // Помечаем как мертвого, если еще не помечен
                 return; // Выходим из обработки этого врага
            }
            const ePivot = enemy.pivot;
            const ePos = ePivot.position;
            const eStats = enemy.stats;
            const mixer = enemy.mixer;
            const playerPos = playerObject.position; // Позиция игрока

            // 2. --- Обновление анимаций (ДО принятия решений) ---
            mixer?.update(dt);

            // 3. --- Расчет дистанции и радиуса атаки ---
            const dist = ePos.distanceTo(playerPos);
            const atkRange = eStats.attackRange || 30; // Используем статы врага
            const playerInAttackRange = dist <= atkRange;

            // 4. --- Обновление Хелсбара ---
            // (Этот блок кода из твоего последнего сообщения выглядит правильным)
            if (enemy.hpBar?.container && enemy.hpBar?.fill && enemyState.maxHp > 0) {
                const hpPercent = enemyState.currentHp / enemyState.maxHp;
                const fillMesh = enemy.hpBar.fill;
                const container = enemy.hpBar.container;
                const newScaleX = Math.max(0.001, hpPercent);
                const newPosX = (HEALTH_BAR_WIDTH * (newScaleX - 1)) / 2; // Используем константу из Level.jsx
                // console.log(`Обновление HP Бара для ${enemy.id}: HP=${enemyState.currentHp}/${enemyState.maxHp}, Процент=${hpPercent.toFixed(2)}`);
                // console.log(`  >> Установка scale.x=${newScaleX.toFixed(2)}, position.x=${newPosX.toFixed(2)}`);
                fillMesh.scale.x = newScaleX;
                fillMesh.position.x = newPosX;
                container.visible = true; // Показываем, если враг жив
                if (cameraRef.current) {
                    container.quaternion.copy(cameraRef.current.quaternion); // Поворачиваем к камере
                }
            } else if (enemy.hpBar?.container) {
                 container.visible = false; // Скрываем в остальных случаях
            }

            // 5. --- Получение ссылок на анимации ---
            const idleAct = enemy.actions['Idle'] || enemy.actions[enemy.idleActionName];
            const walkAct = enemy.actions['Walk'] || enemy.actions[enemy.walkActionName];
            const attackAct = enemy.actions['Attack'] || enemy.actions[enemy.attackActionName];
            const reloadAct = enemy.actions['Reload']; // Убедись, что 'Reload' есть

            // 6. --- Функция переключения анимаций ---
             const switchAction = (newAction) => {
                if (!newAction) { newAction = idleAct; if (!newAction) return; }
                if (typeof newAction.reset !== 'function' || typeof newAction.fadeIn !== 'function' || typeof newAction.play !== 'function') { console.error("Invalid anim action:", newAction); return; }
                if (!enemy.currentAction || enemy.currentAction !== newAction) {
                    if (enemy.currentAction && typeof enemy.currentAction.fadeOut === 'function') { enemy.currentAction.fadeOut(0.2); }
                    newAction.reset().fadeIn(0.2).play();
                    enemy.currentAction = newAction;
                }
             };

            // 7. --- Определение СЛЕДУЮЩЕГО состояния ИИ ---
            let currentState = enemy.aiState;
            // Инициализация состояния при первом кадре
             if (enemy.type === 'ranged' && !currentState) { enemy.aiState = 'PATROLLING'; currentState = 'PATROLLING'; /* TODO: Init patrol data */ }
             else if (enemy.type === 'caster' && !currentState) { enemy.aiState = 'IDLE'; currentState = 'IDLE'; }
             else if (!currentState) { enemy.aiState = 'IDLE'; currentState = 'IDLE'; } // Для мили/боссов по умолчанию
            let nextState = currentState; // Начинаем с текущего

            // --- Логика переходов между состояниями ---
            if (enemy.type === 'ranged') {
                // Логика состояний лучника (PATROLLING -> ATTACKING -> RELOADING -> ATTACKING -> PATROLLING)
                if (currentState === 'PATROLLING') { if (playerInAttackRange) nextState = 'ATTACKING'; }
                else if (currentState === 'ATTACKING') { if (!playerInAttackRange) nextState = 'PATROLLING'; else if (enemy.attackCooldown <= 0 && attackAct) nextState = 'RELOADING'; }
                else if (currentState === 'RELOADING') { if (!playerInAttackRange) nextState = 'PATROLLING'; else if (enemy.attackCooldown <= 0 && reloadAct) nextState = 'ATTACKING'; }
            }
            else if (enemy.type === 'caster') {
                // Логика состояний мага (IDLE -> AIMING -> CASTING -> AIMING/IDLE)
                 // console.log(`Маг ${enemy.id}: В радиусе=${playerInAttackRange}, Кулдаун=${enemy.attackCooldown?.toFixed(2)}, Состояние=${currentState}`); // Отладочный лог
                 if (currentState === 'IDLE') { if (playerInAttackRange) nextState = 'AIMING'; }
                 else if (currentState === 'AIMING') { if (!playerInAttackRange) nextState = 'IDLE'; else if (enemy.attackCooldown <= 0) nextState = 'CASTING_BEAM_EFFECT'; }
                 else if (currentState === 'CASTING_BEAM_EFFECT') { nextState = playerInAttackRange ? 'AIMING' : 'IDLE'; } // Сразу выходим после начала каста
            }
            // Для мили/боссов можно не использовать 'nextState', а действовать сразу (как было у тебя)

            // --- Обновляем сохраненное состояние ИИ ---
            enemy.aiState = nextState;

            // 8. --- Выполнение ДЕЙСТВИЙ на основе текущего состояния (которое только что обновили) ---
            let shouldRotate = false; // Флаг, нужно ли поворачивать врага в этом кадре
            let rotateTarget = playerPos; // Цель поворота по умолчанию
            let animationToPlay = idleAct; // Анимация по умолчанию

            if (enemy.type === 'ranged') {
                // --- Действия лучника ---
                 animationToPlay = idleAct; // По умолчанию
                 if (enemy.aiState === 'PATROLLING') {
                     animationToPlay = walkAct;
                     // --- !!! ЗДЕСЬ НУЖНА ТВОЯ ЛОГИКА ПАТРУЛИРОВАНИЯ !!! ---
                     // TODO: Выбрать цель патруля patrolTargetPos
                     // TODO: Двигать ePos к patrolTargetPos со скоростью eStats.speed
                     // TODO: Поворачивать к patrolTargetPos (shouldRotate = true; rotateTarget = patrolTargetPos;)
                     // TODO: Переключать цель при достижении
                     // --- !!! ---
                 } else if (enemy.aiState === 'ATTACKING') {
                     shouldRotate = true; rotateTarget = playerPos;
                     if (enemy.attackCooldown <= 0) {
                         createEnemyProjectile(enemy, playerPos); // Стреляем
                         enemy.attackCooldown = 1 / (eStats.attackSpeed || 0.5); // Сброс кулдауна
                         animationToPlay = attackAct; // Анимация атаки
                     } else {
                         animationToPlay = reloadAct; // Показываем перезарядку, пока ждем
                     }
                 } else if (enemy.aiState === 'RELOADING') {
                     shouldRotate = true; rotateTarget = playerPos;
                     animationToPlay = reloadAct; // Анимация перезарядки
                 }
                 // Поворот лучника
                 if (shouldRotate && rotateTarget) { let dirRot = new THREE.Vector3().subVectors(rotateTarget, ePos); const angle = Math.atan2(dirRot.y, dirRot.x); let targetZ = angle + Math.PI / 2; const curZ = ePivot.rotation.z; const twoPi = Math.PI * 2; let diff = targetZ - curZ; while (diff < -Math.PI) diff += twoPi; while (diff > Math.PI) diff -= twoPi; const thresh = 0.05; if (Math.abs(diff) > thresh) { const lerp = 0.03; ePivot.rotation.z = curZ + diff * lerp; } ePivot.rotation.order = 'XYZ'; ePivot.rotation.x = 0; ePivot.rotation.y = 0; }
                 switchAction(animationToPlay); // Применяем анимацию лучника

            } else if (enemy.type === 'caster') {
                // --- Действия мага ---
                 animationToPlay = idleAct; // По умолчанию
                 if (enemy.aiState === 'IDLE') {
                     animationToPlay = idleAct;
                     if(enemy.beamEffectMesh) removeBeamMesh(enemy); // Убираем луч, если он был
                 } else if (enemy.aiState === 'AIMING') {
                     shouldRotate = true; rotateTarget = playerPos;
                     animationToPlay = idleAct; // Или анимация прицеливания, если есть
                     if(enemy.beamEffectMesh) removeBeamMesh(enemy); // Убираем луч, если он был
                 } else if (enemy.aiState === 'CASTING_BEAM_EFFECT') {
                     shouldRotate = true; rotateTarget = playerPos;
                     animationToPlay = attackAct; // Анимация каста
                     console.log(`>>> Маг ${enemy.id} CASTING ${enemy.stats.beamType} beam!`); // Должно вызваться!

                     // Наносим урон и эффекты
                     if (typeof playerTakeDamage === 'function') { playerTakeDamage(enemy.stats.beamDamage || 1); }
                     if (enemy.stats.beamType === 'fire') { console.log("Applying FIRE DoT (placeholder)"); /* TODO */ }
                     else if (enemy.stats.beamType === 'ice') { console.log("Applying ICE Freeze (placeholder)"); /* TODO */ }

                     // Создаем визуальный эффект луча
                     if(enemy.beamEffectMesh) removeBeamMesh(enemy); // Удаляем старый
                     enemy.beamEffectMesh = createBeamMeshFixed(enemy, playerPos); // Создаем новый
                     if (enemy.beamEffectMesh) { enemy.beamEffectTimer = enemy.stats.beamEffectDuration || 1.0; console.log(`--- Beam timer SET for ${enemy.id}: ${enemy.beamEffectTimer} ---`); }
                     else { console.error(`--- Beam mesh FAILED for ${enemy.id} ---`); }

                     // Сбрасываем кулдаун атаки
                     enemy.attackCooldown = 1 / (eStats.attackSpeed || 0.5);
                 }

                 // Обновление/удаление визуала луча (происходит всегда, если меш существует)
                 if (enemy.beamEffectMesh) { if (enemy.beamEffectTimer > 0) { enemy.beamEffectTimer -= dt; updateBeamMesh(enemy.beamEffectMesh, enemy.pivot.position, playerPos); } else { removeBeamMesh(enemy); } }

                 // Поворот мага
                 if (shouldRotate && rotateTarget) { let dirRot = new THREE.Vector3().subVectors(rotateTarget, ePos); const angle = Math.atan2(dirRot.y, dirRot.x); let targetZ = angle + Math.PI / 2; const curZ = ePivot.rotation.z; const twoPi = Math.PI * 2; let diff = targetZ - curZ; while (diff < -Math.PI) diff += twoPi; while (diff > Math.PI) diff -= twoPi; const thresh = 0.05; if (Math.abs(diff) > thresh) { const lerp = 0.03; ePivot.rotation.z = curZ + diff * lerp; } ePivot.rotation.order = 'XYZ'; ePivot.rotation.x = 0; ePivot.rotation.y = 0; }
                 // Анимация мага
                 switchAction(animationToPlay);

            } else { // --- Действия для Мили / Боссов ---
                 // Эта логика теперь выполняется здесь, на основе enemy.aiState (если ты его используешь)
                 // Либо оставь здесь ту логику, которая была у тебя раньше для них
                 const aggroMult = 5; const aggroRange = atkRange * aggroMult; const inAggroRange = dist <= aggroRange;
                 if (playerInAttackRange && enemy.attackCooldown <= 0) { // Атака вблизи
                      if (typeof playerTakeDamage === 'function') { playerTakeDamage(eStats.attack || 5); }
                      enemy.attackCooldown = 1 / (eStats.attackSpeed || 0.5);
                      switchAction(attackAct);
                      // enemy.aiState = 'MELEE_ATTACKING'; // Можно убрать, если не используешь состояния для них
                 } else if (inAggroRange && !playerInAttackRange) { // Преследование
                      let chaseDir = new THREE.Vector3().subVectors(playerPos, ePos); const moveDir = chaseDir.normalize(); const moveSpeed = (eStats.speed || 1.5) * dt * 60; if (moveSpeed > 0) { ePos.x += moveDir.x * moveSpeed; ePos.y += moveDir.y * moveSpeed; } const angle = Math.atan2(chaseDir.y, chaseDir.x); let targetZ = angle + Math.PI / 2; const curZ = ePivot.rotation.z; const twoPi = Math.PI * 2; let diff = targetZ - curZ; while (diff < -Math.PI) diff += twoPi; while (diff > Math.PI) diff -= twoPi; const thresh = 0.05; if (Math.abs(diff) > thresh) { const lerp = 0.08; ePivot.rotation.z = curZ + diff * lerp; } ePivot.rotation.order = 'XYZ'; ePivot.rotation.x = 0; ePivot.rotation.y = 0;
                      switchAction(walkAct);
                      // enemy.aiState = 'CHASING';
                 } else { // Бездействие
                      switchAction(idleAct);
                      // enemy.aiState = 'IDLE';
                 }
            }

            // 9. --- ОБЩЕЕ ОБНОВЛЕНИЕ КУЛДАУНА АТАКИ (ПОСЛЕ ВСЕХ ДЕЙСТВИЙ!) ---
            if (enemy.attackCooldown > 0) {
                enemy.attackCooldown -= dt;
            }

        }); // <<<--- КОНЕЦ enemyRefs.forEach

            const activeEnemyProjectiles = [];
            const PLAYER_SIZE_ENEMY_PROJ = { width: 30, height: 30 }; // Размер игрока для коллизий (можно использовать одну константу)
            // Обновляем хитбокс игрока каждый кадр
            const playerHitboxForEnemyProj = {
                 x: playerPos.x - PLAYER_SIZE_ENEMY_PROJ.width / 2,
                 y: playerPos.y - PLAYER_SIZE_ENEMY_PROJ.height / 2,
                 width: PLAYER_SIZE_ENEMY_PROJ.width,
                 height: PLAYER_SIZE_ENEMY_PROJ.height
             };
    
    
            enemyProjectilesRef.current.forEach(proj => {
                // Движение
                proj.position.add(proj.velocity.clone().multiplyScalar(dt));
                proj.lifetime -= dt;
                // Обновление меша
                if (proj.mesh) {
                    proj.mesh.position.copy(proj.position);
                    // Обновление поворота стрелы
                    proj.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), proj.velocity.clone().normalize());
                }
    
                let hitPlayer = false;
                if (proj.lifetime > 0) {
                    // Хитбокс снаряда (стрелы)
                    const projSize = 10; // Настроить размер хитбокса стрелы
                    const projHitbox = { x: proj.position.x - projSize / 2, y: proj.position.y - projSize / 2, width: projSize, height: projSize };
                    // Проверка коллизии с игроком
                    if (checkCollision(projHitbox, playerHitboxForEnemyProj)) {
                         console.log(`🎯 Enemy projectile hit player! Dmg: ${proj.damage}`); // Лог для отладки
                         if (typeof playerTakeDamage === 'function') {
                             playerTakeDamage(proj.damage);
                         } else { console.error("playerTakeDamage is not a function!"); }
                         hitPlayer = true;
                    }
                }
    
                // Удаление или сохранение снаряда
                if (proj.lifetime > 0 && !hitPlayer) {
                    activeEnemyProjectiles.push(proj); // Оставляем
                } else {
                    // Удаляем меш и чистим ресурсы
                    if (proj.mesh) {
                        currentScene?.remove(proj.mesh);
                        proj.mesh.geometry?.dispose();
                        proj.mesh.material?.dispose(); // Добавим очистку материала
                     }
                }
            });
            enemyProjectilesRef.current = activeEnemyProjectiles; // Обновляем массив
            // --- КОНЕЦ БЛОКА, КОТОРЫЙ НУЖНО ВСТАВИТЬ ---<<<

            // 5. Проверка условий победы
            checkWinCondition();
            // 6. Обновление камеры
            const targetXCam = clamp(playerPos.x, -levelConfig.gameWorldWidth / 2 + 375 / 2, levelConfig.gameWorldWidth / 2 - 375 / 2);
            const targetYCam = clamp(playerPos.y, -levelConfig.WORLD_Y_OFFSET + 667 / 2, levelConfig.gameWorldHeight - levelConfig.WORLD_Y_OFFSET - 667 / 2);
            currentCamera.position.lerp(new THREE.Vector3(targetXCam, targetYCam, currentCamera.position.z), 0.1);
            currentCamera.lookAt(currentCamera.position.x, currentCamera.position.y, 0);
            // 7. Рендеринг
            try { currentRenderer.render(currentScene, currentCamera); }
            catch (error) { console.error("❌ Ошибка рендеринга:", error); setLevelStatus('error'); }
        }; // --- Конец функции animate ---
        
        // Запуск первого кадра
        console.log("🚀 Запуск игрового цикла animate()");
        clock.start();
        if (!animationFrameId.current) { // Убедимся, что не запускаем дважды
             animationFrameId.current = requestAnimationFrame(animate);
        }

        // Функция очистки для useEffect игрового цикла
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
                clock.stop(); // Останавливаем часы
                // console.log("🧹 Остановка игрового цикла animate() при размонтировании/смене зависимостей");
            }
        };
    }, [ // Зависимости главного цикла
        isLoading, levelStatus, levelData, levelConfig, playerObject, enemyRefs, enemiesState, playerStats, // Объекты и состояния
        playerTakeDamage, handleEnemyHit, winLevel, loseLevel // Функции
    ]);


    // === 11. РЕНДЕР JSX ===
    return (
        <div className="game-wrapper">
            {/* Оверлей загрузки */}
            {isLoading && (
                <div className="level-loading-overlay">
                    <div className="loading-spinner"></div>
                    <div className="loading-text">Загрузка уровня...</div>
                </div>
            )}

            {/* Игровой контейнер */}
            <div className="game-container" style={{ visibility: isLoading ? 'hidden' : 'visible' }}>
                <HealthBar currentHp={playerHp} maxHp={displayMaxHp} />
                {levelData?.winCondition?.type === 'survive_duration' && remainingTime !== null && levelStatus === 'playing' && (
                     <div className="survival-timer"> Выжить: {Math.ceil(remainingTime)} сек </div>
                 )}
                <div ref={mountRef} className="game-canvas"></div> {/* Место для рендера */}
            </div>

            {/* Джойстик */}
            <div id="joystick-container" className="joystick-container" style={{ visibility: isLoading ? 'hidden' : 'visible' }}></div>

            {/* Попап Поражения */}
            {levelStatus === 'lost' && (
                <GameOverPopup
                    onGoToMenu={() => { if (typeof onLevelComplete === 'function') onLevelComplete(levelData.id, 'lost'); }}
                />
            )}

             {/* Попап Победы */}
             {levelStatus === 'won' && (
                 <div className="level-complete-overlay">
                     <h2>Победа!</h2>
                     <p>Уровень {levelData.id} пройден!</p>
                     <button onClick={() => { if (typeof onLevelComplete === 'function') onLevelComplete(levelData.id, 'won'); }}>
                         В главное меню
                     </button>
                 </div>
             )}

             {/* Попап Ошибки */}
             {levelStatus === 'error' && (
                 <div className="level-error-overlay">
                      <h2>Ошибка</h2>
                      <p>Произошла ошибка при загрузке или работе уровня.</p>
                      <button onClick={() => { if (typeof onLevelComplete === 'function') onLevelComplete(levelData.id, 'error'); }}>
                          В главное меню
                      </button>
                 </div>
              )}
        </div> // Закрытие game-wrapper
    ); // Закрытие return
}; // Закрытие компонента Level

export default Level; // Экспорт по умолчанию