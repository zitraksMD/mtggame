// src/components/Level.jsx
import * as THREE from "three";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import nipplejs from "nipplejs";
import './Styles.scss'; // Используем стиль из code1
import useGameStore from '../store/useGameStore';
import usePlayerLoader from './usePlayerLoader';
import useEnemyLoader from './useEnemyLoader'; // Импорт из code1
import GameOverPopup from './popups/GameOverPopup';
import LoadingScreen from "./LoadingScreen"; // Импорт из code1
import LevelLootPopup from './popups/LevelLootPopup'; // Импортируем новый компонент
import { clamp, checkCollision, convertTiledX, convertTiledY, DEFAULT_WORLD_WIDTH, DEFAULT_WORLD_HEIGHT } from './utils';
import { ENTITY_CONFIG } from '../data/ENTITY_CONFIG.js'; // <--- ИЗМЕНИ ЗДЕСЬ
import { getLevelChestTypeById } from '../data/levelChestData'; // Adjust path
import { CSSTransition } from 'react-transition-group'; // Импортируем CSSTransition
import LevelVictoryPopup from './popups/LevelVictoryPopup';


// --- Константы ---
const HEALTH_BAR_WIDTH = 30;
const HEALTH_BAR_HEIGHT = 4;
const HEALTH_BAR_OFFSET_Y = 25; // Y-смещение хелсбара относительно центра врага
const BEAM_WIDTH = 15;
const BEAM_TEXTURE_FIRE = '/assets/fire-beam.png';
const BEAM_TEXTURE_ICE = '/assets/ice-beam.png';
const ENEMY_COLLISION_SIZE_DEFAULT = { width: 30, height: 30 }; // Default enemy collision size

// ==================================
// ДИСПЕТЧЕР AI ПАТТЕРНОВ
// ==================================
const AI_PATTERNS = {
    /**
     * @param {object} enemyRef - Ссылка на объект врага (из loadedEnemyRefsArray)
     * @param {THREE.Vector3} playerPosition - Текущая позиция игрока
     * @param {number} dt - DeltaTime
     * @param {object} worldContext - Контекст мира (scene, walls, playerRef, allEnemies, levelConfig, etc.)
     * @param {object} commandExecutor - Функция для выполнения команд (движение, поворот, атака)
     * @param {function} abilityExecutor - Функция для вызова способностей врага
     */
    "melee_chaser_basic": (enemyRef, playerPosition, dt, worldContext, commandExecutor, abilityExecutor) => {
    const { stats, pivot, config } = enemyRef;
    const ePos = pivot.position;
    const distToPlayer = ePos.distanceTo(playerPosition);

    const attackRange = stats.attackRange || 35;
    const aggroRadius = stats.aggroRadius || 200;

    // DEBUG: Логируем состояние и дистанции
    console.log(`[AI ${enemyRef.id}]: state=${enemyRef.aiState}, dist=${distToPlayer.toFixed(1)}, aggroR=${aggroRadius}, attackR=${attackRange}, speed=${stats.speed}, damage=${stats.damage}`);

    if (distToPlayer <= attackRange) {
        enemyRef.aiState = 'ATTACKING';
        commandExecutor.rotateTowards(enemyRef, playerPosition);
        if (enemyRef.attackCooldownTimer <= 0) {
            console.log(`[AI ${enemyRef.id}]: Attempting attack! Cooldown met.`); // DEBUG
            const basicAttackAbilityId = config.basicAttackAbilityId || "ability_basic_melee_attack"; // Убедись, что это есть в ENTITY_CONFIG или есть fallback
            const basicAttackAbility = config.abilities?.find(ab => ab.id === basicAttackAbilityId);
            if (basicAttackAbility) {
                console.log(`[AI ${enemyRef.id}]: Executing ability: ${basicAttackAbility.id}`); // DEBUG
                abilityExecutor(basicAttackAbility.id, enemyRef, playerPosition, basicAttackAbility.params); // playerPosition здесь может быть playerRef, если абилка ожидает ссылку на цель
                enemyRef.attackCooldownTimer = 1 / (stats.attackSpeed || 1.0);
            } else if (stats.damage > 0) {
                console.log(`[AI ${enemyRef.id}]: Executing direct damage: ${stats.damage}`); // DEBUG
                commandExecutor.dealDirectDamageToPlayer(stats.damage);
                enemyRef.attackCooldownTimer = 1 / (stats.attackSpeed || 1.0);
            } else {
                console.log(`[AI ${enemyRef.id}]: Attack condition met, but no attack ability/damage defined.`); // DEBUG
            }
        }
    } else if (distToPlayer <= aggroRadius) {
        enemyRef.aiState = 'CHASING';
        commandExecutor.rotateTowards(enemyRef, playerPosition);
        const directionToPlayer = playerPosition.clone().sub(ePos).normalize();
        const moveDistance = (stats.speed || 0) * dt;
         console.log(`[AI ${enemyRef.id}]: Chasing. Move distance: ${moveDistance}`); // DEBUG
        if (moveDistance > 0) { // Только если есть скорость и dt
             commandExecutor.move(enemyRef, directionToPlayer, moveDistance);
        } else {
            console.log(`[AI ${enemyRef.id}]: Chase condition met, but moveDistance is ${moveDistance}. Speed: ${stats.speed}, dt: ${dt}`); // DEBUG
        }
    } else {
        enemyRef.aiState = 'IDLE';
        if (commandExecutor.patrol) commandExecutor.patrol(enemyRef, dt);
        commandExecutor.playAnimation(enemyRef, 'idle'); // Если есть такая команда
    }
},

"ranged_sentry_reset": (enemyRef, playerPosition, dt, worldContext, commandExecutor, abilityExecutor) => {
    const { stats, pivot, config } = enemyRef; // spawnPosition будем брать из enemyRef напрямую
    const ePos = pivot.position;

    // 1. Проверка и установка spawnPosition, если отсутствует (защита)
    // В идеале, это должно быть установлено один раз в useEnemyLoader
    if (!enemyRef.spawnPosition || !(enemyRef.spawnPosition instanceof THREE.Vector3)) {
        if (!enemyRef.spawnPositionWarned) { // Логируем предупреждение только один раз
            console.warn(`[AI ${enemyRef.id}] ranged_sentry_reset: spawnPosition не определена корректно! Используется текущая позиция. spawnPosition должна быть установлена при инициализации врага.`);
            enemyRef.spawnPositionWarned = true;
        }
        enemyRef.spawnPosition = ePos.clone(); // Запасной вариант
    }
    const spawnPosition = enemyRef.spawnPosition; // Теперь spawnPosition точно есть

    const distToPlayer = ePos.distanceTo(playerPosition);
    const attackRange = stats.attackRange || 300;
    const aggroRadius = stats.aggroRadius || 350;

    // --- ЛОГИКА СОСТОЯНИЙ ---

    // 2. СОСТОЯНИЕ: ВОЗВРАЩЕНИЕ НА БАЗУ
    if (enemyRef.aiState === 'RETURNING_TO_SPAWN') {
        const distToSpawn = ePos.distanceTo(spawnPosition);
        // console.log(`[AI ${enemyRef.id}] State: RETURNING_TO_SPAWN. Dist to spawn: ${distToSpawn.toFixed(1)}`);

        if (distToSpawn > 5) { // Допуск для достижения точки (5 юнитов)
            commandExecutor.rotateTowards(enemyRef, spawnPosition);
            const directionToSpawn = spawnPosition.clone().sub(ePos).normalize();
            commandExecutor.move(enemyRef, directionToSpawn, (stats.speed || 1.5) * dt);

            // Если игрок снова вошел в агро-радиус во время возвращения
            if (distToPlayer <= aggroRadius) {
                // console.log(`[AI ${enemyRef.id}] Игрок снова замечен во время возврата. Переключаюсь на ПРЕСЛЕДОВАНИЕ.`);
                enemyRef.aiState = 'APPROACHING_PLAYER';
            }
        } else {
            // console.log(`[AI ${enemyRef.id}] Достиг базы. Переключаюсь на ПАТРУЛИРОВАНИЕ.`);
            ePos.copy(spawnPosition); // Точно на место
            enemyRef.aiState = 'IDLE_PATROLLING';
            // Сброс состояния патруля, если commandExecutor.patrol его хранит
            if (enemyRef.patrolTargetPosition) enemyRef.patrolTargetPosition = null;
            if (typeof enemyRef.currentPatrolIndex !== 'undefined') enemyRef.currentPatrolIndex = 0;
        }
    }
    // 3. СОСТОЯНИЕ: ВЗАИМОДЕЙСТВИЕ С ИГРОКОМ (когда игрок в радиусе агрессии)
    else if (distToPlayer <= aggroRadius) {
        commandExecutor.rotateTowards(enemyRef, playerPosition);

        if (distToPlayer <= attackRange) { // Игрок в радиусе атаки (или ближе)
            if (enemyRef.aiState !== 'ATTACKING_PLAYER') {
                // console.log(`[AI ${enemyRef.id}] Игрок в радиусе атаки (${distToPlayer.toFixed(1)} <= ${attackRange}). Переключаюсь на АТАКУ.`);
                enemyRef.aiState = 'ATTACKING_PLAYER';
            }
            commandExecutor.move(enemyRef, new THREE.Vector3(0, 0, 0), 0); // Остановиться для атаки

            if (enemyRef.attackCooldownTimer <= 0) {
                // console.log(`[AI ${enemyRef.id}] Кулдаун прошел. Попытка атаки.`);
                const attackAbilityId = config.basicRangedAttackAbilityId || "ability_basic_ranged_attack"; // Убедись, что это ID есть в ENTITY_CONFIG для лучника
                const attackAbility = config.abilities?.find(ab => ab.id === attackAbilityId);

                if (attackAbility) {
                    // console.log(`[AI ${enemyRef.id}] Выполняю способность атаки: ${attackAbility.id}`);
                    abilityExecutor(attackAbility.id, enemyRef, playerPosition, attackAbility.params);
                    enemyRef.attackCooldownTimer = 1 / (stats.attackSpeed || 1.0); // Устанавливаем кулдаун
                } else {
                    console.warn(`[AI ${enemyRef.id}] ОШИБКА АТАКИ: Не найдена конфигурация способности для ID: ${attackAbilityId}`);
                }
            } else {
                // console.log(`[AI ${enemyRef.id}] АТАКА: На кулдауне (${enemyRef.attackCooldownTimer.toFixed(2)} сек).`);
            }
        } else { // Игрок в радиусе агрессии, но СЛИШКОМ ДАЛЕКО для атаки -> Приближаемся
            if (enemyRef.aiState !== 'APPROACHING_PLAYER') {
                // console.log(`[AI ${enemyRef.id}] Игрок в агро, но вне радиуса атаки (${distToPlayer.toFixed(1)} > ${attackRange}). Переключаюсь на ПРЕСЛЕДОВАНИЕ.`);
                enemyRef.aiState = 'APPROACHING_PLAYER';
            }
            const directionToPlayer = playerPosition.clone().sub(ePos).normalize();
            commandExecutor.move(enemyRef, directionToPlayer, (stats.speed || 1.5) * dt);
        }
    }
    // 4. СОСТОЯНИЕ: ИГРОК ВНЕ РАДИУСА АГРЕССИИ
    else {
        // Если враг до этого атаковал или преследовал, теперь он должен вернуться на базу
        if (enemyRef.aiState === 'APPROACHING_PLAYER' || enemyRef.aiState === 'ATTACKING_PLAYER') {
            // console.log(`[AI ${enemyRef.id}] Игрок покинул агро-радиус. Переключаюсь на ВОЗВРАЩЕНИЕ НА БАЗУ.`);
            enemyRef.aiState = 'RETURNING_TO_SPAWN';
        }
        // Если уже патрулировал или возвращался, соответствующая логика сработает
        else if (enemyRef.aiState === 'IDLE_PATROLLING') {
            // console.log(`[AI ${enemyRef.id}] Состояние: ПАТРУЛИРОВАНИЕ. Выполняю патруль.`);
            if (commandExecutor.patrol && config.patrolConfig?.enabled) {
                commandExecutor.patrol(enemyRef, dt);
            } else {
                // Если патрулирование не настроено, просто стоим на базе
                commandExecutor.move(enemyRef, new THREE.Vector3(0,0,0), 0);
                 // Можно добавить проигрывание idle анимации, если она не проигрывается автоматически при остановке
                if (config.animations?.idle && enemyRef.currentAnimation !== config.animations.idle && commandExecutor.playAnimation) {
                     commandExecutor.playAnimation(enemyRef, 'idle');
                }
            }
        } else if (typeof enemyRef.aiState === 'undefined' || enemyRef.aiState === null) { // Начальное или неопределенное состояние
            // console.log(`[AI ${enemyRef.id}] Начальное состояние. Переключаюсь на ВОЗВРАЩЕНИЕ НА БАЗУ (для установки на spawnPosition).`);
            // При первом запуске AI для юнита, лучше сначала отправить его на spawnPosition, а оттуда он начнет патрулировать.
            // Если он уже у spawnPosition, RETURNING_TO_SPAWN быстро переключит его в IDLE_PATROLLING.
            enemyRef.aiState = 'RETURNING_TO_SPAWN';
        }
    }

    // НАПОМИНАНИЕ: Уменьшение enemyRef.attackCooldownTimer ( -= dt ) должно происходить
    // в основном цикле обновления врагов в функции animate() для всех активных врагов один раз за кадр.
    // Если это делается глобально, то строки ниже здесь не нужны.
    // Если НЕ делается глобально, то они НУЖНЫ здесь, но убедись, что этот код всегда достигается.
    /*
    if (enemyRef.attackCooldownTimer > 0) {
        enemyRef.attackCooldownTimer -= dt;
    }
    */
}
    // TODO: Добавить сюда AI_PATTERNS для ВСЕХ `typeForAI` из твоего ENTITY_CONFIG
    // Например:
    // "necropolis_bone_guardian": (enemyRef, playerPosition, dt, worldContext, commandExecutor, abilityExecutor) => { AI_PATTERNS.melee_chaser_basic(enemyRef, playerPosition, dt, worldContext, commandExecutor, abilityExecutor); /* + specific logic */ },
    // "necropolis_raatken_necromancer": (enemyRef, playerPosition, dt, worldContext, commandExecutor, abilityExecutor) => { /* custom logic for stationary caster */ },
    // "melee_lifesteal_chaser_ethereal": (enemyRef, playerPosition, dt, worldContext, commandExecutor, abilityExecutor) => { ... }
    // "ranged_caster_stationary": (enemyRef, playerPosition, dt, worldContext, commandExecutor, abilityExecutor) => { ... }
    // "boss_guardian_sah_ten": (enemyRef, playerPosition, dt, worldContext, commandExecutor, abilityExecutor) => { /* логика босса Сах'Тен */ }
    // ... и т.д.
};
// --- Компонент HealthBar ---
const HealthBar = ({ currentHp, maxHp }) => {
    const healthPercent = maxHp > 0 ? Math.max(0, (currentHp / maxHp) * 100) : 0;
    const displayCurrentHp = Math.max(0, Math.round(currentHp));
    const displayMaxHp = Math.round(maxHp);

    return (
      <div className="health-bar-container">
        <div className="health-bar" style={{ width: `${healthPercent}%` }}></div>
        <span className="health-bar-text">{`${displayCurrentHp} / ${displayMaxHp}`}</span>
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


    if (!levelData || typeof levelData.id === 'undefined') {
        console.error("[Level.jsx] Ошибка: Получены невалидные levelData!", levelData);
        return <div className="level-screen error">Ошибка: Неверные данные уровня!</div>;
    }

    const mountRef = useRef(null);
    const cameraRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const joystickRef = useRef(null);
    const animationFrameId = useRef(null);
    const wallsRef = useRef([]);
    const projectilesRef = useRef([]);
    const enemyProjectilesRef = useRef([]);
    const effectTimersRef = useRef([]);
    const velocity = useRef({ x: 0, y: 0, force: 0 });
    const playerAttackCooldown = useRef(0);
    const levelStartTimeRef = useRef(null);
    const readyCalledRef = useRef(false);
    const beamTexturesRef = useRef({});
    const backgroundMeshRef = useRef(null);
    const fogOverlaysRef = useRef({});
    const fogMaterialRef = useRef(null);
    const worldRoomBoundariesRef = useRef({});
    const [clearedRoomIds, setClearedRoomIds] = useState(new Set());
    const animatingDoorsRef = useRef([]);
    const activePuddlesRef = useRef([]);
    const activeEffectProjectilesRef = useRef([]);
    const activeBurningGroundsRef = useRef([]);
    const levelChestsRef = useRef([]);

    const [isLoading, setIsLoading] = useState(true);
    const [levelStatus, setLevelStatus] = useState('playing');
    const [enemiesState, setEnemiesState] = useState([]);
    const [remainingTime, setRemainingTime] = useState(null);
    const [beamTexturesLoaded, setBeamTexturesLoaded] = useState(false);
    const [activeClouds, setActiveClouds] = useState([]);
    const activeCloudsRef = useRef([]);
    const enemiesStateRef = useRef(enemiesState);
    const [currentActiveRoomId, setCurrentActiveRoomId] = useState(null);
    const [activePuddles, setActivePuddlesState] = useState([]); // Renamed to avoid conflict with ref
    const [activeBurningGrounds, setActiveBurningGroundsState] = useState([]); // Renamed
    const [timePlayedSeconds, setTimePlayedSeconds] = useState(0);
    const [elapsedTimeSec, setElapsedTimeSec] = useState(0);


    useEffect(() => {
        enemiesStateRef.current = enemiesState;
    }, [enemiesState]);

    useEffect(() => {
        activePuddlesRef.current = activePuddles;
    }, [activePuddles]);

    useEffect(() => {
        console.log("[Debuff Cleanup] Starting periodic cleanup interval.");
        const intervalId = setInterval(() => {
            useGameStore.getState().cleanupExpiredDebuffs();
        }, 2000);
        return () => {
            console.log("[Debuff Cleanup] Clearing periodic cleanup interval.");
            clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        activeBurningGroundsRef.current = activeBurningGrounds;
    }, [activeBurningGrounds]);

    useEffect(() => {
        let intervalId = null;
        if (levelStatus === 'playing' && levelStartTimeRef.current && !isLoading) {
            console.log("[Timer Interval] Starting timer update interval.");
            setElapsedTimeSec(Math.floor((Date.now() - levelStartTimeRef.current) / 1000));
            intervalId = setInterval(() => {
                if (levelStartTimeRef.current) {
                    const currentElapsedSec = Math.floor((Date.now() - levelStartTimeRef.current) / 1000);
                    setElapsedTimeSec(currentElapsedSec);
                }
            }, 1000);
        }
        return () => {
            if (intervalId) {
                console.log("[Timer Interval] Clearing timer update interval.");
                clearInterval(intervalId);
            }
        };
    }, [levelStatus, isLoading, levelStartTimeRef]);

    const formatTime = (totalSeconds) => {
        if (typeof totalSeconds !== 'number' || totalSeconds < 0 || isNaN(totalSeconds)) return '00:00';
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const paddedMinutes = String(minutes).padStart(2, '0');
        const paddedSeconds = String(seconds).padStart(2, '0');
        return `${paddedMinutes}:${paddedSeconds}`;
    };

    const {
        playerHp,
        displayMaxHp,
        playerStats,
        playerTakeDamage,
        initializeLevelHp,
        applyDebuff,
        setWeakeningAuraStatus,
        incrementKills,
        openLevelChest,
        lastOpenedLevelChestRewards,
        clearLastLevelChestRewards,
        resetLevelRewards,
        currentLevelRewards
    } = useGameStore(state => ({
        playerHp: state.playerHp,
        displayMaxHp: state.computedStats().hp,
        playerStats: state.computedStats(),
        playerTakeDamage: state.playerTakeDamage,
        initializeLevelHp: state.initializeLevelHp,
        applyDebuff: state.applyDebuff,
        setWeakeningAuraStatus: state.setWeakeningAuraStatus,
        incrementKills: state.incrementKills,
        openLevelChest: state.openLevelChest,
        lastOpenedLevelChestRewards: state.lastOpenedLevelChestRewards,
        clearLastLevelChestRewards: state.clearLastLevelChestRewards,
        resetLevelRewards: state.resetLevelRewards,
        currentLevelRewards: state.currentLevelRewards
    }));

    const levelLootPopupRef = useRef(null);
    const levelVictoryPopupRef = useRef(null);

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

    const levelConfig = useMemo(() => {
        console.log("[Level.jsx] Calculating levelConfig");
        return getWorldDimensions(levelData);
    }, [levelData?.width, levelData?.height]);

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
        textureLoader.load(BEAM_TEXTURE_FIRE, (texture) => {
            if (!mounted) return;
            console.log("🔥 Текстура Огня загружена");
            texture.encoding = THREE.sRGBEncoding;
            beamTexturesRef.current.fire = texture;
            fireLoaded = true;
            checkTexLoadComplete();
        }, undefined, (error) => {
            if (!mounted) return;
            console.error(`❌ Ошибка загрузки ${BEAM_TEXTURE_FIRE}:`, error);
            fireLoaded = true; checkTexLoadComplete();
        });
        textureLoader.load(BEAM_TEXTURE_ICE, (texture) => {
            if (!mounted) return;
            console.log("❄️ Текстура Льда загружена");
            texture.encoding = THREE.sRGBEncoding;
            beamTexturesRef.current.ice = texture;
            iceLoaded = true;
            checkTexLoadComplete();
        }, undefined, (error) => {
            if (!mounted) return;
            console.error(`❌ Ошибка загрузки ${BEAM_TEXTURE_ICE}:`, error);
            iceLoaded = true; checkTexLoadComplete();
        });
        return () => {
            mounted = false;
            beamTexturesRef.current.fire?.dispose();
            beamTexturesRef.current.ice?.dispose();
            beamTexturesRef.current = {};
            setBeamTexturesLoaded(false);
        }
    }, []);

    useEffect(() => {
    console.log("[Level.jsx] Инициализация сцены Three.js и fogMaterial");
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
    camera.position.set(0, 0, 1000);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    rendererRef.current = renderer;

    // >>> НАЧАЛО ИЗМЕНЕНИЙ ДЛЯ FOGMATERIALREF
    // Инициализируем fogMaterialRef.current здесь, после создания сцены
    if (!fogMaterialRef.current) {
        console.log("[Level.jsx] Создание общего материала для тумана войны.");
        fogMaterialRef.current = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.8,
            depthWrite: false
        });
    }
    // <<< КОНЕЦ ИЗМЕНЕНИЙ ДЛЯ FOGMATERIALREF

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
        };        // ... (без изменений)
    handleResize();
    window.addEventListener('resize', handleResize);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(50, 150, 100);
    directionalLight.target.position.set(0, 0, 0);
    scene.add(directionalLight);
    scene.add(directionalLight.target);

    return () => {
        console.log("[Level.jsx] Очистка основной сцены Three.js и fogMaterial");
        window.removeEventListener('resize', handleResize);
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
        if (joystickRef.current) {
            try { joystickRef.current.destroy(); } catch (e) { console.warn("Joystick destroy error:", e); }
            joystickRef.current = null;
        }

        if (sceneRef.current) { // Используем sceneRef.current вместо аргумента scene, т.к. он мог измениться
            enemyProjectilesRef.current.forEach(proj => {
                if (proj.mesh) {
                    sceneRef.current?.remove(proj.mesh); // Добавлена проверка sceneRef.current
                    proj.mesh.geometry?.dispose();
                    proj.mesh.material?.dispose();
                }
            });
            projectilesRef.current.forEach(proj => {
                if (proj.mesh) {
                    sceneRef.current?.remove(proj.mesh); // Добавлена проверка sceneRef.current
                    proj.mesh.geometry?.dispose();
                    proj.mesh.material?.dispose();
                }
            });
            sceneRef.current.remove(ambientLight);
            sceneRef.current.remove(directionalLight);
            sceneRef.current.remove(directionalLight.target);
        }
        enemyProjectilesRef.current = [];
        projectilesRef.current = [];

        rendererRef.current?.dispose();
        if (mountPoint && rendererRef.current?.domElement && mountPoint.contains(rendererRef.current.domElement)) {
            mountPoint.removeChild(rendererRef.current.domElement);
        }

        // >>> НАЧАЛО ИЗМЕНЕНИЙ ДЛЯ FOGMATERIALREF (ОЧИСТКА)
        if (fogMaterialRef.current) {
            console.log("[Level.jsx] Disposing shared fog material from scene cleanup.");
            fogMaterialRef.current.dispose();
            fogMaterialRef.current = null;
        }
        // <<< КОНЕЦ ИЗМЕНЕНИЙ ДЛЯ FOGMATERIALREF (ОЧИСТКА)

        sceneRef.current = null;
        rendererRef.current = null;
        cameraRef.current = null;
    };
}, []);

    const chestResources = useMemo(() => {
        console.log("[Chest Resources] Creating chest placeholder resources");
        const geometry = new THREE.BoxGeometry(25, 30, 20);
        const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8, metalness: 0.1 });
        const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.5, metalness: 0.5 });
        return { geometry, woodMaterial, goldMaterial };
    }, []);

    useEffect(() => {
       const currentScene = sceneRef.current;
    const currentFogMaterial = fogMaterialRef.current; // Получаем актуальное значение

    if (!currentScene || !levelConfig || !levelData || !currentFogMaterial) { // Проверяем currentFogMaterial
        console.log("[Level.jsx] Skip Background/Walls/Fog/Boundaries: Missing critical refs or data.", {
            currentScene: !!currentScene,
            levelConfig: !!levelConfig,
            levelData: !!levelData,
            currentFogMaterial: !!currentFogMaterial // Эта переменная должна быть true
        });
        return;
    }
    console.log("[Level.jsx] Создание/обновление фона, стен, тумана войны и границ комнат");


        if (levelData.rooms && levelConfig) {
            const boundaries = {};
            levelData.rooms.forEach(room => {
                if (room.area) {
                    boundaries[room.id] = {
                        xMinWorld: convertTiledX(room.area.x_min, 0, levelConfig.gameWorldWidth),
                        xMaxWorld: convertTiledX(room.area.x_max, 0, levelConfig.gameWorldWidth),
                        yMaxWorld: convertTiledY(room.area.y_min, 0, levelConfig.gameWorldHeight, levelConfig.WORLD_Y_OFFSET),
                        yMinWorld: convertTiledY(room.area.y_max, 0, levelConfig.gameWorldHeight, levelConfig.WORLD_Y_OFFSET)
                    };
                }
            });
            worldRoomBoundariesRef.current = boundaries;
            console.log("[Level.jsx] World room boundaries calculated:", boundaries);
        }

        if(backgroundMeshRef.current) {
            currentScene.remove(backgroundMeshRef.current);
            backgroundMeshRef.current.geometry?.dispose();
            backgroundMeshRef.current.material?.map?.dispose();
            backgroundMeshRef.current.material?.dispose();
            backgroundMeshRef.current = null;
        }
        if(wallsRef.current.length > 0) {
            wallsRef.current.forEach(w => {
                if(w.mesh) {
                    currentScene.remove(w.mesh);
                    w.mesh.geometry?.dispose();
                }
            });
            wallsRef.current = [];
        }
        Object.values(fogOverlaysRef.current).forEach(overlay => {
            if (overlay) {
                currentScene.remove(overlay);
                overlay.geometry?.dispose();
            }
        });
        fogOverlaysRef.current = {};

        const textureLoader = new THREE.TextureLoader();
        if (levelData?.backgroundTexture) {
            textureLoader.load(levelData.backgroundTexture, (texture) => {
                if (!sceneRef.current) return;
                texture.encoding = THREE.sRGBEncoding;
                const bgGeometry = new THREE.PlaneGeometry(levelConfig.gameWorldWidth, levelConfig.gameWorldHeight);
                const bgMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                const backgroundMesh = new THREE.Mesh(bgGeometry, bgMaterial);
                backgroundMesh.position.set(0, 0, -10);
                backgroundMesh.renderOrder = -1;
                sceneRef.current.add(backgroundMesh);
                backgroundMeshRef.current = backgroundMesh;
            }, undefined, (error) => {
                console.error("❌ Ошибка загрузки фона:", error);
                if(sceneRef.current) sceneRef.current.background = new THREE.Color(0x282c34);
            });
        } else {
            currentScene.background = new THREE.Color(0x282c34);
        }

        if (levelData?.walls && levelData.walls.length > 0) {
            const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8, metalness: 0.2 });
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
        }

        if (levelData.rooms && levelData.rooms.length > 0) {
            levelData.rooms.forEach(room => {
                if (!room.area) return;
                const roomWidth = room.area.x_max - room.area.x_min;
                const roomHeight = room.area.y_max - room.area.y_min;
                if (roomWidth <= 0 || roomHeight <= 0) return;
                const fogGeometry = new THREE.PlaneGeometry(roomWidth, roomHeight);
                const fogOverlayMesh = new THREE.Mesh(fogGeometry, fogMaterialRef.current);
                const roomCenterX_tiled = room.area.x_min + roomWidth / 2;
                const roomCenterY_tiled = room.area.y_min + roomHeight / 2;
                const worldX = convertTiledX(roomCenterX_tiled, 0, levelConfig.gameWorldWidth);
                const worldY = convertTiledY(roomCenterY_tiled, 0, levelConfig.gameWorldHeight, levelConfig.WORLD_Y_OFFSET);
                fogOverlayMesh.position.set(worldX, worldY, 0.5);
                fogOverlayMesh.name = `fog_overlay_${room.id}`;
                fogOverlayMesh.visible = !room.isStartingRoom;
                currentScene.add(fogOverlayMesh);
                fogOverlaysRef.current[room.id] = fogOverlayMesh;
            });
        }
        if (levelData.chests && Array.isArray(levelData.chests)) {
            const chestGeometry = chestResources.geometry; // Use memoized geometry
            levelData.chests.forEach(chestInstanceData => {
                if (!chestInstanceData.id || !chestInstanceData.chestTypeId) return;
                const chestTypeData = getLevelChestTypeById(chestInstanceData.chestTypeId);
                if (!chestTypeData) return;

                const chestMaterial = chestInstanceData.chestTypeId === 'boss_gold' ? chestResources.goldMaterial : chestResources.woodMaterial;
                const chestMesh = new THREE.Mesh(chestGeometry, chestMaterial);
                chestMesh.name = `chest_${chestInstanceData.id}`;
                chestMesh.castShadow = true;
                const chestWidth = 25; const chestHeight = 30;
                const finalWorldX = convertTiledX((chestInstanceData.x || 0) + chestWidth/2, 0, levelConfig.gameWorldWidth);
                const finalWorldY = convertTiledY((chestInstanceData.y || 0) + chestHeight/2, 0, levelConfig.gameWorldHeight, levelConfig.WORLD_Y_OFFSET);
                chestMesh.position.set(finalWorldX, finalWorldY, chestHeight / 2);
                currentScene.add(chestMesh);
                levelChestsRef.current.push({
                    instanceId: chestInstanceData.id,
                    chestTypeId: chestInstanceData.chestTypeId,
                    roomId: chestInstanceData.roomId || null,
                    object3D: chestMesh,
                    position: chestMesh.position.clone(),
                    isOpened: false
                });
            });
        }
        return () => {
            const sceneForCleanup = sceneRef.current;
            if (sceneForCleanup) {
                if(backgroundMeshRef.current) {
                    sceneForCleanup.remove(backgroundMeshRef.current);
                    backgroundMeshRef.current.geometry?.dispose();
                    backgroundMeshRef.current.material?.map?.dispose();
                    backgroundMeshRef.current.material?.dispose();
                }
                wallsRef.current.forEach(w => {
                    if (w.mesh) {
                        sceneForCleanup.remove(w.mesh);
                        w.mesh.geometry?.dispose();
                        // Note: Wall material is shared and disposed with chestResources or main cleanup
                    }
                });
                sceneForCleanup.background = null;
                Object.values(fogOverlaysRef.current).forEach(overlay => {
                    if (overlay) {
                        sceneForCleanup.remove(overlay);
                        overlay.geometry?.dispose();
                    }
                });
                 levelChestsRef.current.forEach(chest => {
                    if (chest.object3D) {
                        sceneForCleanup.remove(chest.object3D);
                        // Geometry & materials are from chestResources, disposed there
                    }
                });
                levelChestsRef.current = [];
            }
            backgroundMeshRef.current = null;
            wallsRef.current = [];
            fogOverlaysRef.current = {};
        };
    }, [levelConfig, levelData, chestResources, fogMaterialRef]); // Removed .current from fogMaterialRef dependency

    const { playerObject, isPlayerModelLoaded } = usePlayerLoader(
        playerStats?.skin || "/Models/character.glb",
        levelData?.playerStart || (levelConfig ? { x: 0, y: levelConfig.WORLD_Y_OFFSET - 50 } : { x: 0, y: 0 }),
        sceneRef.current,
        levelConfig
    );

    const {
        enemyRefs: loadedEnemyRefsArray,
        setEnemyRefs: setLoadedEnemyRefsArray,
        areEnemiesLoaded,
        initialEnemyStates: loadedInitialStates,
    } = useEnemyLoader(
        levelData?.enemies,
        sceneRef.current,
        levelConfig,
        levelData?.id,
        difficulty,
        ENTITY_CONFIG
    );

    useEffect(() => {
        const allLoaded = !!levelConfig && isPlayerModelLoaded && areEnemiesLoaded && beamTexturesLoaded;
        const currentlyLoading = !allLoaded;
        if (isLoading !== currentlyLoading) {
            setIsLoading(currentlyLoading);
            if (!currentlyLoading) {
                if (!readyCalledRef.current) {
                    console.log("✨ Уровень ГОТОВ! Вызов onReady.");
                    if (typeof initializeLevelHp === 'function') {
                        initializeLevelHp();
                    }
                    if (typeof onReady === 'function') {
                        onReady();
                    }
                    if (typeof resetLevelRewards === 'function') {
                        resetLevelRewards();
                    }
                    levelStartTimeRef.current = Date.now();
                    setTimePlayedSeconds(0);
                    readyCalledRef.current = true;
                    if (levelData?.rooms) {
                        const startingRoom = levelData.rooms.find(room => room.isStartingRoom) || (levelData.rooms.length > 0 ? levelData.rooms[0] : null);
                        if (startingRoom) {
                            setCurrentActiveRoomId(startingRoom.id);
                            if (fogOverlaysRef.current?.[startingRoom.id]) {
                                fogOverlaysRef.current[startingRoom.id].visible = false;
                            }
                        }
                    }
                    if (levelData?.winCondition?.type === 'survive_duration') {
                        setRemainingTime(levelData.winCondition.duration);
                    } else {
                        setRemainingTime(null);
                    }
                }
            } else {
                levelStartTimeRef.current = null;
                setTimePlayedSeconds(0);
            }
        }
    }, [levelConfig, isPlayerModelLoaded, areEnemiesLoaded, beamTexturesLoaded, isLoading, onReady, initializeLevelHp, levelData, setIsLoading, setRemainingTime, setCurrentActiveRoomId, setTimePlayedSeconds, resetLevelRewards, readyCalledRef, levelStartTimeRef]);

    useEffect(() => {
        if (areEnemiesLoaded && loadedInitialStates && loadedInitialStates.length > 0) {
            if (JSON.stringify(enemiesState) !== JSON.stringify(loadedInitialStates)) {
                setEnemiesState(loadedInitialStates);
            }
        } else if (!areEnemiesLoaded && enemiesState.length > 0) {
            setEnemiesState([]);
        }
    }, [areEnemiesLoaded, loadedInitialStates, enemiesState]); // Added enemiesState to dependencies

    const hpResources = useMemo(() => ({
        geometryBg: new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT),
        geometryFill: new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT),
        materialBg: new THREE.MeshBasicMaterial({ color: 0x333333, depthTest: false, depthWrite: false, transparent: true, opacity: 0.8 }),
        materialFill: new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false, depthWrite: false, transparent: true, opacity: 0.9 })
    }), []);

    useEffect(() => {
        activeCloudsRef.current = activeClouds;
    }, [activeClouds]);

    const spikeResources = useMemo(() => {
        const indicatorRadius = 30;
        const spikeHeight = indicatorRadius * 1.2;
        const spikeRadius = indicatorRadius * 0.15;
        const spikeColor = 0xB8860B;
        return {
            geometry: new THREE.ConeGeometry(spikeRadius, spikeHeight, 8),
            material: new THREE.MeshStandardMaterial({ color: spikeColor, roughness: 0.7, metalness: 0.2 })
        };
    }, []);

    useEffect(() => {
        return () => {
            console.log("Очистка общих ресурсов шипов и HP баров из Level");
            spikeResources.geometry.dispose();
            spikeResources.material.dispose();
            hpResources.geometryBg.dispose();
            hpResources.geometryFill.dispose();
            hpResources.materialBg.dispose();
            hpResources.materialFill.dispose();
            chestResources.geometry.dispose();
            chestResources.woodMaterial.dispose();
            chestResources.goldMaterial.dispose();
        };
    }, [spikeResources, hpResources, chestResources]);

    useEffect(() => {
        if (!currentActiveRoomId || clearedRoomIds.has(currentActiveRoomId) || !levelData?.enemies || !enemiesState?.length) {
            return;
        }
        const monstersInCurrentRoom = levelData.enemies.filter(enemyDef => enemyDef.roomId === currentActiveRoomId);
        if (monstersInCurrentRoom.length === 0 && currentActiveRoomId && !levelData.rooms.find(r => r.id === currentActiveRoomId)?.isStartingRoom) {
            return;
        }
        let allMonstersInRoomDead = true;
        if (monstersInCurrentRoom.length > 0) {
            for (const enemyDef of monstersInCurrentRoom) {
                const enemyState = enemiesState.find(es => es.id === enemyDef.id);
                if (enemyState) {
                    if (enemyState.currentHp > 0) {
                        allMonstersInRoomDead = false;
                        break;
                    }
                }
            }
        } else {
            allMonstersInRoomDead = false;
        }
        if (allMonstersInRoomDead && monstersInCurrentRoom.length > 0) {
            console.log(`[RoomCheck] 🎉 Комната ${currentActiveRoomId} ЗАЧИЩЕНА!`);
            const doorsToOpenData = levelData.walls.filter(wallDataInLevel =>
                wallDataInLevel.isDoor === true && wallDataInLevel.opensWhenRoomCleared === currentActiveRoomId
            );
            if (doorsToOpenData.length > 0) {
                doorsToOpenData.forEach(doorData => {
                    const doorWallObjectInRef = wallsRef.current.find(wallRef => wallRef.id === doorData.id);
                    if (doorWallObjectInRef && doorWallObjectInRef.mesh) {
                        const doorMesh = doorWallObjectInRef.mesh;
                        const doorIdToOpen = doorData.id;
                        const doorHeight = doorData.height;
                        if (typeof doorHeight !== 'number') return;
                        const isAlreadyAnimating = animatingDoorsRef.current.some(anim => anim.id === doorIdToOpen);
                        if (!isAlreadyAnimating) {
                            wallsRef.current = wallsRef.current.filter(wallInRef => wallInRef.id !== doorIdToOpen);
                            const animationDuration = 1.5;
                            const startY = doorMesh.position.y;
                            const descendAmount = doorHeight * 1.1;
                            const targetY = startY - descendAmount;
                            animatingDoorsRef.current.push({
                                id: doorIdToOpen, mesh: doorMesh, startY: startY, targetY: targetY,
                                duration: animationDuration, elapsedTime: 0
                            });
                            doorMesh.visible = true;
                        }
                    }
                });
            }
            setClearedRoomIds(prevCleared => new Set(prevCleared).add(currentActiveRoomId));
        }
    }, [enemiesState, currentActiveRoomId, clearedRoomIds, levelData, wallsRef]);


    const createPoisonCloud = useCallback((position, params = {}) => { // Added params
        const currentScene = sceneRef.current;
        if (!currentScene) return;

        const cloudRadius = params.radius || 70;
        const cloudDuration = params.duration || 8.0;
        const cloudDps = params.dps || 5;

        console.log(`☁️ Создание ЯДОВИТОГО ОБЛАКА в (${position.x.toFixed(0)}, ${position.y.toFixed(0)}) R=${cloudRadius}`);
        const testGeometry = new THREE.BoxGeometry(cloudRadius * 0.8, cloudRadius * 0.8, 10);
        const testMaterial = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0x330033, roughness: 0.5, metalness: 0.1 });
        const testMesh = new THREE.Mesh(testGeometry, testMaterial);
        testMesh.position.copy(position);
        testMesh.position.z = 5;
        testMesh.renderOrder = 30;
        currentScene.add(testMesh);

        const cloudData = {
            id: Math.random(), mesh: testMesh, position: position.clone(),
            radiusSq: cloudRadius * cloudRadius, dps: cloudDps,
            endTime: Date.now() + cloudDuration * 1000,
        };
        setActiveClouds(prevClouds => [...prevClouds, cloudData]);
    }, [sceneRef, setActiveClouds]);


    useEffect(() => {
        const currentScene = sceneRef.current;
        if (!currentScene || !loadedEnemyRefsArray || !enemiesState) {
            return;
        }
        loadedEnemyRefsArray.forEach(enemyRef => {
            if (!enemyRef || !enemyRef.pivot) return;
            const enemyState = enemiesState.find(es => es.id === enemyRef.id);
            const isDeadInState = enemyState && enemyState.currentHp <= 0;
            const isOnScene = currentScene.children.includes(enemyRef.pivot);

            if (isDeadInState) {
                if (!enemyRef.isDead) {
                    enemyRef.isDead = true;
                }
                if (isOnScene) {
                    // This on_death logic will be handled by the new AI system's abilityExecutor
                    // if (enemyRef.type === 'rotting_soldier' && enemyRef.needsToExplode) {
                    //     createPoisonCloud(enemyRef.pivot.position.clone());
                    //     enemyRef.needsToExplode = false;
                    // }
                    console.log(`--- Удаление мертвого врага ${enemyRef.id} (State HP: ${enemyState?.currentHp}) со сцены ---`);
                    currentScene.remove(enemyRef.pivot);
                }
            }
            if (enemyRef.hpBar?.container && isDeadInState) {
                enemyRef.hpBar.container.visible = false;
            }
        });
    }, [enemiesState, loadedEnemyRefsArray, sceneRef, createPoisonCloud, hpResources]);


    useEffect(() => {
        let joystickInstance = null;
        if (!isLoading && sceneRef.current) {
            const joystickZone = document.getElementById("joystick-container");
            if (joystickZone && !joystickRef.current) {
                try {
                    const options = { zone: joystickZone, mode: "static", position: { left: "50%", top: "50%" }, size: 100, color: "rgba(255, 255, 255, 0.5)", threshold: 0.1 };
                    joystickInstance = nipplejs.create(options);
                    joystickRef.current = joystickInstance;
                    joystickInstance.on("move", (evt, data) => { if (data.vector) { velocity.current = { x: data.vector.x, y: data.vector.y, force: data.force }; } });
                    joystickInstance.on("end", () => { velocity.current = { x: 0, y: 0, force: 0 }; });
                } catch (error) { console.error("❌ Ошибка создания джойстика:", error); }
            }
        } else if (isLoading && joystickRef.current) {
            try { joystickRef.current.destroy(); } catch(e) { console.warn("Joystick destroy error:", e); }
            joystickRef.current = null;
        }
        return () => {
            if (joystickRef.current) {
                try { joystickRef.current.destroy(); } catch(e) { console.warn("Joystick destroy error:", e); }
                joystickRef.current = null;
            }
        };
    }, [isLoading]);


    const handleEnemyHit = useCallback((enemyId, damageAmount) => {
        const enemyRef = loadedEnemyRefsArray.find(ref => ref && ref.id === enemyId);
        if (!enemyRef || enemyRef.isDead) return;

        if (enemyRef.config?.typeForAI === 'revenant_knight_blocker') { // Example typeForAI for knight
            if (typeof enemyRef.blockCharges === 'undefined') {
                enemyRef.blockCharges = enemyRef.stats.initialBlockCharges || 0;
            }
            if (enemyRef.blockCharges > 0) {
                enemyRef.blockCharges -= 1;
                console.log(`🛡️ Knight ${enemyId} BLOCKED! Charges left: ${enemyRef.blockCharges}`);
                // TODO: Эффект блока
                return;
            } else if (enemyRef.blockCharges === 0 && !enemyRef.blockBrokenNotified) {
                console.log(`Knight ${enemyId} block broken!`);
                enemyRef.blockBrokenNotified = true;
            }
        }

        let enemyJustDefeated = false;
        const currentEnemyState = enemiesState.find(es => es.id === enemyId);
        if (currentEnemyState && currentEnemyState.currentHp > 0) {
            const newHp = Math.max(0, currentEnemyState.currentHp - damageAmount);
            if (newHp === 0) {
                enemyJustDefeated = true;
                 // The on_death explosion for rotting_soldier will be handled by abilityExecutor
            }
        }

        setEnemiesState(prevEnemies => {
            const enemyIndex = prevEnemies.findIndex(e => e.id === enemyId);
            if (enemyIndex !== -1 && prevEnemies[enemyIndex].currentHp > 0) {
                const newState = [...prevEnemies];
                const calculatedNewHp = Math.max(0, prevEnemies[enemyIndex].currentHp - damageAmount);
                newState[enemyIndex] = { ...newState[enemyIndex], currentHp: calculatedNewHp };
                return newState;
            }
            return prevEnemies;
        });

        if (enemyJustDefeated && !enemyRef.isDead) { // Check !enemyRef.isDead before setting
            enemyRef.isDead = true; // Mark as dead in the ref for AI logic
            console.log(`--- Флаг isDead=true установлен для ${enemyId} после удара ---`);
        }

        if (enemyJustDefeated) {
            if (typeof incrementKills === 'function') {
                incrementKills(1);
            }
        }
    }, [loadedEnemyRefsArray, enemiesState, setEnemiesState, incrementKills]);


    const winLevel = useCallback(() => { if (levelStatus === 'playing') { setLevelStatus('won'); } }, [levelStatus]);
    const loseLevel = useCallback(() => { if (levelStatus === 'playing') { setLevelStatus('lost'); } }, [levelStatus]);

    useEffect(() => {
        if (typeof playerHp === 'number' && playerHp <= 0 && levelStatus === 'playing') {
            if (levelStartTimeRef.current) {
                const durationSeconds = Math.round((Date.now() - levelStartTimeRef.current) / 1000);
                setTimePlayedSeconds(durationSeconds);
            } else {
                setTimePlayedSeconds(0);
            }
            loseLevel();
        }
    }, [playerHp, levelStatus, loseLevel, levelStartTimeRef]);

    const placeTotem = useCallback((casterId, position, totemType, duration, range, effect) => {
        console.warn(`[${casterId}] PLACE TOTEM STUB: type=${totemType} - НЕ РЕАЛИЗОВАНО`);
    }, []);

    const triggerGroundSpikes = useCallback((casterId, targetPos, delay, radius, damage) => {
        const currentScene = sceneRef.current;
        if (!currentScene || !playerObject) return;
        const indicatorRadius = radius || 30;
        const spikeHeight = indicatorRadius * 1.5;
        const spikeRadius = indicatorRadius * 0.2;
        const numSpikes = 7;
        const spikeColor = 0xC19A6B;
        const eruptionDuration = 0.5;
        const indicatorGeometry = new THREE.RingGeometry(indicatorRadius - 2, indicatorRadius, 32);
        const indicatorMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide, transparent: true, opacity: 0.6, depthWrite: false });
        const indicatorMesh = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicatorMesh.position.copy(targetPos);
        indicatorMesh.position.z = -8.8;
        indicatorMesh.rotation.x = -Math.PI / 2;
        indicatorMesh.renderOrder = 6;
        currentScene.add(indicatorMesh);
        const eruptionTimerId = setTimeout(() => {
            currentScene?.remove(indicatorMesh);
            indicatorGeometry.dispose();
            indicatorMaterial.dispose();
            const currentPlayerPos = playerObject?.position;
            const spikeGeometry = spikeResources.geometry; // Use memoized
            const spikeMaterial = spikeResources.material; // Use memoized
            const spikeMeshes = [];
            for (let i = 0; i < numSpikes; i++) {
                const spikeMesh = new THREE.Mesh(spikeGeometry, spikeMaterial);
                const angle = (i / numSpikes) * Math.PI * 2 * (1 + (Math.random() - 0.5) * 0.3);
                const dist = indicatorRadius * (0.2 + Math.random() * 0.7);
                spikeMesh.position.copy(targetPos);
                spikeMesh.position.x += Math.cos(angle) * dist;
                spikeMesh.position.y += Math.sin(angle) * dist;
                spikeMesh.position.z = spikeHeight / 2;
                spikeMesh.rotation.x = (Math.random() - 0.5) * 0.4;
                spikeMesh.rotation.z = (Math.random() - 0.5) * 0.4;
                spikeMesh.renderOrder = 7;
                currentScene.add(spikeMesh);
                spikeMeshes.push(spikeMesh);
            }
            if (currentPlayerPos && typeof playerTakeDamage === 'function' && playerHp > 0) {
                const distSq = currentPlayerPos.distanceToSquared(targetPos);
                if (distSq <= indicatorRadius * indicatorRadius) {
                    const finalDamage = damage || 15;
                    playerTakeDamage(finalDamage);
                }
            }
            const cleanupTimerId = setTimeout(() => {
                spikeMeshes.forEach(spike => { currentScene?.remove(spike); });
                // Geometry and material are shared, do not dispose here
                effectTimersRef.current = effectTimersRef.current.filter(id => id !== cleanupTimerId);
            }, eruptionDuration * 1000);
            effectTimersRef.current.push(cleanupTimerId);
            effectTimersRef.current = effectTimersRef.current.filter(id => id !== eruptionTimerId);
        }, delay * 1000);
        effectTimersRef.current.push(eruptionTimerId);
    }, [sceneRef, playerObject, playerTakeDamage, playerHp, spikeResources]);

    const createPoisonPuddle = useCallback((casterId, targetPos, duration, radius, dps) => {
        const currentScene = sceneRef.current;
        if (!currentScene || !targetPos || radius <= 0 || duration <= 0) return;
        const puddleGeometry = new THREE.CircleGeometry(radius, 32);
        const puddleMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false });
        const puddleMesh = new THREE.Mesh(puddleGeometry, puddleMaterial);
        puddleMesh.name = `puddle_${casterId}_${Date.now()}`;
        puddleMesh.position.copy(targetPos);
        puddleMesh.position.z = 1;
        puddleMesh.renderOrder = 8;
        currentScene.add(puddleMesh);
        const puddleData = {
            id: puddleMesh.name, mesh: puddleMesh, position: targetPos.clone(),
            radiusSq: radius * radius, dps: dps, endTime: Date.now() + duration * 1000,
        };
        setActivePuddlesState(prevPuddles => [...prevPuddles, puddleData]);
    }, [sceneRef, setActivePuddlesState]);

    const launchPoisonProjectile = useCallback((casterId, casterPos, targetPos, projectileSpeed, puddleDuration, puddleRadius, puddleDps) => {
        const currentScene = sceneRef.current;
        if (!currentScene || !casterPos || !targetPos) return;
        const projRadius = 8;
        const projGeometry = new THREE.SphereGeometry(projRadius, 16, 8);
        const projMaterial = new THREE.MeshStandardMaterial({ color: 0x33cc33, emissive: 0x114411, roughness: 0.4 });
        const projMesh = new THREE.Mesh(projGeometry, projMaterial);
        projMesh.name = `poison_proj_${casterId}_visual`;
        const directionToTarget = targetPos.clone().sub(casterPos).normalize();
        const startOffset = 20;
        const startPos = casterPos.clone().add(directionToTarget.clone().multiplyScalar(startOffset));
        startPos.z = (casterPos.z || 0) + 15;
        projMesh.position.copy(startPos);
        currentScene.add(projMesh);
        const finalDirection = targetPos.clone().sub(startPos).normalize();
        const velocityVec = finalDirection.multiplyScalar(projectileSpeed);
        const distanceToTargetVal = startPos.distanceTo(targetPos);
        const projectileData = {
            id: `poison_proj_${casterId}_${Date.now()}`, type: 'poison_puddle_projectile', mesh: projMesh,
            targetPos: targetPos.clone(), velocity: velocityVec, distanceToTarget: distanceToTargetVal,
            elapsedDistance: 0, directDamage: 0, createsGroundEffect: true,
            groundEffectParams: { casterId: casterId, type: 'poison', duration: puddleDuration, radius: puddleRadius, dps: puddleDps }
        };
        activeEffectProjectilesRef.current.push(projectileData);
    }, [sceneRef]);

    const createBurningGround = useCallback((casterId, position, duration, radius, dps) => {
        const currentScene = sceneRef.current;
        if (!currentScene || !position || radius <= 0 || duration <= 0) return;
        const groundGeometry = new THREE.CircleGeometry(radius, 32);
        const groundMaterial = new THREE.MeshBasicMaterial({ color: 0xFF8C00, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.position.copy(position);
        groundMesh.position.z = 0.1;
        groundMesh.renderOrder = 3;
        currentScene.add(groundMesh);
        const groundData = {
            id: `burn_ground_${casterId}_${Date.now()}`, mesh: groundMesh, position: position.clone(),
            radiusSq: radius * radius, dps: dps, endTime: Date.now() + duration * 1000,
        };
        setActiveBurningGroundsState(prevGrounds => [...prevGrounds, groundData]);
    }, [sceneRef, setActiveBurningGroundsState]);

    const createGroundEffect = useCallback((position, params) => {
        if (!params || !position) return;
        switch (params.type) {
            case 'poison':
                if (typeof createPoisonPuddle === 'function') {
                    createPoisonPuddle(params.casterId, position, params.duration, params.radius, params.dps);
                }
                break;
            case 'fire':
                if (typeof createBurningGround === 'function') {
                    createBurningGround(params.casterId, position, params.duration, params.radius, params.dps);
                }
                break;
            default:
                console.warn(`[GroundEffect] Unknown ground effect type: ${params.type}`);
        }
    }, [createPoisonPuddle, createBurningGround]);

    const applyPlayerDebuff = useCallback((casterId, type, duration, strength) => {
        if (typeof applyDebuff === 'function') {
            applyDebuff(type, duration, strength);
        }
    }, [applyDebuff]);

    const createProjectileToPoint = useCallback((casterId, casterPos, targetPos, projectileSpeed, directDamage, groundEffectDuration, groundEffectRadius, groundEffectDps) => {
        const currentScene = sceneRef.current;
        if (!currentScene || !casterPos || !targetPos) return;
        const projRadius = 10;
        const projGeometry = new THREE.SphereGeometry(projRadius, 16, 8);
        const projMaterial = new THREE.MeshStandardMaterial({ color: 0xffA500, emissive: 0xcc5500, roughness: 0.6 });
        const projMesh = new THREE.Mesh(projGeometry, projMaterial);
        projMesh.name = `point_proj_${casterId}_visual`;
        const directionToTarget = targetPos.clone().sub(casterPos).normalize();
        const startOffset = 25;
        const startPos = casterPos.clone().add(directionToTarget.clone().multiplyScalar(startOffset));
        startPos.z = (casterPos.z || 0) + 20;
        projMesh.position.copy(startPos);
        currentScene.add(projMesh);
        const finalDirection = targetPos.clone().sub(startPos).normalize();
        const velocityVec = finalDirection.multiplyScalar(projectileSpeed);
        const distanceToTargetVal = startPos.distanceTo(targetPos);
        const projectileData = {
            id: `point_proj_${casterId}_${Date.now()}`, type: 'ogre_fire_projectile', mesh: projMesh,
            targetPos: targetPos.clone(), velocity: velocityVec, distanceToTarget: distanceToTargetVal,
            elapsedDistance: 0, directDamage: directDamage || 0, createsGroundEffect: true,
            groundEffectParams: { casterId: casterId, type: 'fire', duration: groundEffectDuration, radius: groundEffectRadius, dps: groundEffectDps }
        };
        activeEffectProjectilesRef.current.push(projectileData);
    }, [sceneRef]);

    const createArrowProjectile = useCallback((casterId, casterPos, targetPos, projectileSpeed, damage) => {
        const currentScene = sceneRef.current;
        if (!currentScene || !casterPos || !targetPos) return;
        const arrowLength = 20;
        const arrowRadius = 1;
        const projGeometry = new THREE.CylinderGeometry(arrowRadius, arrowRadius, arrowLength, 6);
        const projMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8, metalness: 0.1 });
        const projMesh = new THREE.Mesh(projGeometry, projMaterial);
        projMesh.name = `arrow_proj_${casterId}_visual`;
        const directionToTarget = targetPos.clone().sub(casterPos).normalize();
        const startOffset = 15;
        const startPos = casterPos.clone().add(directionToTarget.clone().multiplyScalar(startOffset));
        startPos.z = (casterPos.z || 0) + 15;
        projMesh.position.copy(startPos);
        const finalDirection = targetPos.clone().sub(startPos).normalize();
        projMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), finalDirection);
        currentScene.add(projMesh);
        const velocityVec = finalDirection.multiplyScalar(projectileSpeed);
        const distanceToTargetVal = startPos.distanceTo(targetPos);
        const projectileData = {
            id: `arrow_${casterId}_${Date.now()}`, ownerId: casterId, mesh: projMesh, position: startPos.clone(),
            targetPos: targetPos.clone(), velocity: velocityVec, damage: damage,
            lifetime: distanceToTargetVal / projectileSpeed + 0.2,
        };
        enemyProjectilesRef.current.push(projectileData);
    }, [sceneRef]);


    // New helper functions for AI system, defined as useCallback
    const createEnemyProjectileFromConfig = useCallback((casterRef, target, abilityConfig) => {
        if (!casterRef || !target || !abilityConfig || !abilityConfig.params || !sceneRef.current) return;

        const params = abilityConfig.params;
        const casterPos = casterRef.pivot.position.clone();
        const targetPos = target.isVector3 ? target.clone() : target.position.clone(); // target can be playerPosition (Vector3) or playerObject

        const projectileTypeKey = params.projectileTypeFromStat ? casterRef.stats[params.projectileTypeFromStat] : params.projectileType;
        // TODO: Based on projectileTypeKey, select appropriate visual/logic. For now, using createArrowProjectile as a generic example.
        const damage = params.damageFromStat ? casterRef.stats[params.damageFromStat] : params.damagePerProjectile || params.damage || 0;
        const speed = params.speedFromStat ? casterRef.stats[params.speedFromStat] : params.speed || 300;
        const count = params.projectileCount || 1;
        const spread = params.spreadAngle || 0; // Degrees
        const lifetime = params.lifetime || 2.0; // Seconds

        const baseDirection = targetPos.clone().sub(casterPos).normalize();

        for (let i = 0; i < count; i++) {
            let projDirection = baseDirection.clone();
            if (count > 1 && spread > 0) {
                // Calculate angle offset for spread. Spread is total angle for all projectiles.
                const angleOffsetRad = (i - (count - 1) / 2) * (spread / (count > 1 ? count -1 : 1)) * (Math.PI / 180) ;
                projDirection.applyAxisAngle(new THREE.Vector3(0, 0, 1), angleOffsetRad); // Rotate around Z for 2D
            }

            const projectileSpawnOffsetY = casterRef.config?.projectileSpawnOffsetY || 15;
            const startPosition = casterPos.clone().add(projDirection.clone().multiplyScalar(casterRef.config?.collisionSize?.width || 20));
            startPosition.z = casterPos.z + projectileSpawnOffsetY;

            // Call your existing projectile creation function. Adapt as needed.
            // This example assumes createArrowProjectile can handle these parameters.
            if (typeof createArrowProjectile === 'function') {
                // Target for non-homing projectile is a point far away in its direction
                const farTargetPos = startPosition.clone().add(projDirection.clone().multiplyScalar(speed * lifetime));
                createArrowProjectile(
                    casterRef.id,
                    startPosition,
                    farTargetPos,
                    speed,
                    damage
                    // You might need to pass lifetime, projectileType (for visuals) etc. to createArrowProjectile
                );
            } else {
                console.error("createArrowProjectile (or equivalent) is not defined!");
            }
        }
    }, [sceneRef, createArrowProjectile]); // Add dependencies of createArrowProjectile if it's a useCallback

    const executeSummonAbility = useCallback((casterRef, abilityConfig) => {
        if (!casterRef || !abilityConfig || !abilityConfig.params || !abilityConfig.params.creaturesToSummon) return;

        const { creaturesToSummon, spawnPattern, spawnRadius = 100 } = abilityConfig.params;
        const casterPos = casterRef.pivot.position;

        console.log(`[Summon] ${casterRef.id} призывает:`, creaturesToSummon);

        creaturesToSummon.forEach(summonOrder => {
            const { entityTypeId, count } = summonOrder;
            for (let i = 0; i < count; i++) {
                let spawnX, spawnY;
                // Basic circular spawn pattern
                const angle = Math.random() * Math.PI * 2;
                const radiusOffset = spawnRadius * (0.5 + Math.random() * 0.5); // Spawn between 50% and 100% of radius
                spawnX = casterPos.x + Math.cos(angle) * radiusOffset;
                spawnY = casterPos.y + Math.sin(angle) * radiusOffset;

                console.log(`  -> Существо ${entityTypeId} должно появиться в ${spawnX.toFixed(0)}, ${spawnY.toFixed(0)} (Мировые координаты)`);
                // TODO: Implement dynamicAddEnemyToLevel(entityTypeId, worldPosition, casterRef.roomId, isBossMinion);
                // This requires updating loadedEnemyRefsArray and enemiesState, and potentially re-running parts of useEnemyLoader logic.
                // For now, just logging.
                // Example call: dynamicAddEnemyToLevel(entityTypeId, new THREE.Vector3(spawnX, spawnY, 0), casterRef.roomId, false);
            }
        });
    }, [/* dependencies for dynamicAddEnemyToLevel if implemented */]);

            // Исполнитель способностей

        const abilityExecutor = useCallback((abilityId, casterRef, target, paramsFromConfig) => {

            const abilityConfig = casterRef.config?.abilities?.find(ab => ab.id === abilityId);

            if (!abilityConfig) {

                console.warn(`[AbilityExecutor] Config for ability ${abilityId} not found on ${casterRef.id}`);

                return;

            }

            const finalParams = { ...(abilityConfig.params || {}), ...(paramsFromConfig || {}) };



            // Анимация каста способности

            if (abilityConfig.animationName && casterRef.actions && casterRef.actions[abilityConfig.animationName]) {

                const castAction = casterRef.actions[abilityConfig.animationName];

                castAction.reset().play();

                if (casterRef.currentAnimation && casterRef.actions[casterRef.currentAnimation] && casterRef.currentAnimation !== abilityConfig.animationName) {

                    casterRef.actions[casterRef.currentAnimation].fadeOut(0.1);

                }

                casterRef.currentAnimation = abilityConfig.animationName;



                if (castAction.loop === THREE.LoopOnce && casterRef.mixer) { // Check mixer exists

                    const onFinished = (e) => {

                        if (e.action === castAction) {

                            casterRef.mixer.removeEventListener('finished', onFinished);

                            if (casterRef.actions.idle) {

                                casterRef.actions.idle.reset().fadeIn(0.2).play();

                                casterRef.currentAnimation = 'idle';

                            }

                        }

                    };

                    casterRef.mixer.addEventListener('finished', onFinished);

                }

            }



            switch (abilityId) {

                case "ability_poison_cloud_on_death_soldier":

                case "ability_poison_cloud_on_death": // General on death poison cloud

                    if (typeof createPoisonCloud === 'function') {

                        // Ensure position is cloned, pass all params

                        createPoisonCloud(casterRef.pivot.position.clone(), finalParams);

                    }

                    break;

                case "ability_necromancer_skull_bolt_attack":

                case "ability_shoot_skull_projectiles_un_ktar":

                case "ability_ethereal_volley_cast":

                case "ability_lich_miniboss_ethereal_volley":

                case "ability_archlich_ethereal_projectiles_phase1":
                case "ability_archer_shoot_arrow":

                    if (typeof createEnemyProjectileFromConfig === 'function') {

                        createEnemyProjectileFromConfig(casterRef, target, abilityConfig);

                    }

                    break;

                case "ability_summon_skeletons_sah_ten":

                case "ability_summon_shadow_archers_el_miras":

                case "ability_summon_skeletons_song_ort_viya":

                case "ability_summon_cultists_sel_rass":

                    if (typeof executeSummonAbility === 'function') {

                        executeSummonAbility(casterRef, abilityConfig);

                    }

                    break;

                // TODO: Добавить case для КАЖДОГО `id` способности из `ENTITY_CONFIG`

                // case "ability_lifesteal_on_melee_hit":

                //     // Logic for lifesteal, could be direct stat modification or a visual effect

                //     // Example: casterRef.stats.currentHp += actualDamageDealt * finalParams.healFromDamageDealtPercent;

                //     // Ensure actualDamageDealt is available if needed, or simplify.

                //     break;

                // case "ability_dash_to_player_predator":

                //     // if (typeof triggerDashAbility === 'function') { // You'd need a triggerDashAbility

                //     //     triggerDashAbility(casterRef, target, finalParams);

                //     // }

                //     break;

                // case "ability_tomb_shield_charges": // This is a passive/reactive ability, likely handled in handleEnemyHit

                //     break;

                default:

                    console.warn(`[AbilityExecutor] Неизвестный или необработанный ID способности: ${abilityId}`);

            }

        }, [createPoisonCloud, createEnemyProjectileFromConfig, executeSummonAbility /*, other ability functions */]);

    // === ОСНОВНОЙ ИГРОВОЙ ЦИКЛ ===
    useEffect(() => {
        if (isLoading || levelStatus !== 'playing' || !playerObject || !loadedEnemyRefsArray || !sceneRef.current || !rendererRef.current || !cameraRef.current || !levelConfig || !beamTexturesLoaded) {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
            return;
        }
        const clock = new THREE.Clock();
        let lastTimestamp = 0;

        // --- Вспомогательные функции для передачи в AI (Command Executor) ---
        const commandExecutor = {
            move: (enemyRef, direction, distance) => {
    if (!enemyRef || !enemyRef.pivot || distance <= 0) {
        // console.log(`[Move ${enemyRef?.id}]: Aborted. Distance: ${distance}`); // DEBUG
        return;
    }
    // console.log(`[Move ${enemyRef.id}]: Dir=(${direction.x.toFixed(2)},${direction.y.toFixed(2)}), Dist=${distance.toFixed(3)}`); // DEBUG

    const ePos = enemyRef.pivot.position;
    const enemySize = enemyRef.config?.collisionSize || ENEMY_COLLISION_SIZE_DEFAULT; // Убедись, что ENEMY_COLLISION_SIZE_DEFAULT определена
    const oldPos = ePos.clone();

    // ВАЖНО: direction должен быть нормализованным вектором! AI_PATTERNS это делает.
    const moveVector = direction.clone().multiplyScalar(distance); // `distance` здесь уже stats.speed * dt
    let newX = ePos.x + moveVector.x;
    let newY = ePos.y + moveVector.y;

    // console.log(`[Move ${enemyRef.id}]: Old=(${oldPos.x.toFixed(1)},${oldPos.y.toFixed(1)}), TryNew=(${newX.toFixed(1)},${newY.toFixed(1)})`); // DEBUG

    // Твоя логика коллизий
    const pRect = { x: ePos.x - enemySize.width / 2, y: ePos.y - enemySize.height / 2, width: enemySize.width, height: enemySize.height };
    let colX = false;
    let colY = false;

    const pRectX = { ...pRect, x: newX - enemySize.width / 2 };
    for (const wall of wallsRef.current) { if (checkCollision(pRectX, wall)) { colX = true; break; } }

    const pRectY = { ...pRect, y: newY - enemySize.height / 2 };
    for (const wall of wallsRef.current) { if (checkCollision(pRectY, wall)) { colY = true; break; } }

    if (!colX) ePos.x = newX; else { console.log(`[Move ${enemyRef.id}]: Collision X`); } // DEBUG
    if (!colY) ePos.y = newY; else { console.log(`[Move ${enemyRef.id}]: Collision Y`);  } // DEBUG

    // Ограничение по миру
    const minX = -levelConfig.gameWorldWidth / 2 + enemySize.width / 2;
    const maxX =  levelConfig.gameWorldWidth / 2 - enemySize.width / 2;
    const minYw = -levelConfig.WORLD_Y_OFFSET + enemySize.height / 2; // Используй WORLD_Y_OFFSET из levelConfig
    const maxYw =  levelConfig.gameWorldHeight - levelConfig.WORLD_Y_OFFSET - enemySize.height / 2; // Используй WORLD_Y_OFFSET из levelConfig

    ePos.x = clamp(ePos.x, minX, maxX);
    ePos.y = clamp(ePos.y, minYw, maxYw);

    console.log(`[Move ${enemyRef.id}]: Final=(${ePos.x.toFixed(1)},${ePos.y.toFixed(1)})`); // DEBUG

    // Обновление анимации
    if (enemyRef.actions && enemyRef.config?.animations) { // Проверяем наличие и animations в config
        const walkAnimName = enemyRef.config.animations.walk || 'walk';
        const idleAnimName = enemyRef.config.animations.idle || 'idle';

        if (enemyRef.actions[walkAnimName] && enemyRef.actions[idleAnimName]) {
            if (ePos.distanceToSquared(oldPos) > 0.0001 * dt) { // Учитываем dt для порога движения
                if (enemyRef.currentAnimation !== walkAnimName) {
                    if (enemyRef.actions[enemyRef.currentAnimation]) enemyRef.actions[enemyRef.currentAnimation].fadeOut(0.2);
                    enemyRef.actions[walkAnimName].reset().setEffectiveTimeScale(1).fadeIn(0.2).play();
                    enemyRef.currentAnimation = walkAnimName;
                }
            } else {
                if (enemyRef.currentAnimation !== idleAnimName) {
                    if (enemyRef.actions[enemyRef.currentAnimation]) enemyRef.actions[enemyRef.currentAnimation].fadeOut(0.2);
                    enemyRef.actions[idleAnimName].reset().setEffectiveTimeScale(1).fadeIn(0.2).play();
                    enemyRef.currentAnimation = idleAnimName;
                }
            }
        }
    }
    return { collidedX: colX, collidedY: colY };
},
            rotateTowards: (enemyRef, targetPosition) => {
                if (!enemyRef || !enemyRef.pivot) return;
                const ePos = enemyRef.pivot.position;
                const direction = new THREE.Vector3().subVectors(targetPosition, ePos).normalize();
                 if (direction.lengthSq() > 0.0001) {
                    const angle = Math.atan2(direction.y, direction.x);
                    let targetRotationZ = angle - Math.PI / 2; // Assuming model looks along its +Y axis

                    const currentZ = enemyRef.pivot.rotation.z;
                    const twoPi = Math.PI * 2;
                    let diff = targetRotationZ - currentZ;
                    while (diff <= -Math.PI) diff += twoPi;
                    while (diff > Math.PI) diff -= twoPi;

                    const rotationSpeedFactor = enemyRef.stats?.rotationSpeedFactor || 0.1;
                    enemyRef.pivot.rotation.z += diff * rotationSpeedFactor;
                }
            },
          dealDirectDamageToPlayer: (damageAmount) => {
    console.log(`[CommandExecutor]: Trying to deal direct damage: ${damageAmount}`); // DEBUG
    if (typeof playerTakeDamage === 'function' && damageAmount > 0) {
        playerTakeDamage(damageAmount);
        console.log(`[CommandExecutor]: playerTakeDamage called with ${damageAmount}`); // DEBUG
    } else {
        console.log(`[CommandExecutor]: playerTakeDamage not a function or damage is zero. Damage: ${damageAmount}`); // DEBUG
    }
},
            patrol: (enemyRef, dt) => {
                if (!enemyRef.patrolPoints || enemyRef.patrolPoints.length === 0 || !enemyRef.stats) return;

                if (typeof enemyRef.patrolWaitTimer === 'undefined') enemyRef.patrolWaitTimer = 0;
                if (typeof enemyRef.currentPatrolIndex === 'undefined') enemyRef.currentPatrolIndex = 0;


                if (enemyRef.patrolWaitTimer > 0) {
                    enemyRef.patrolWaitTimer -= dt;
                    commandExecutor.move(enemyRef, new THREE.Vector3(), 0); // Stop walk animation
                    return;
                }

                const targetPatrolPoint = enemyRef.patrolPoints[enemyRef.currentPatrolIndex];
                if (!targetPatrolPoint) { // Should not happen if patrolPoints is not empty
                     enemyRef.currentPatrolIndex = 0;
                     return;
                }
                const distanceToTarget = enemyRef.pivot.position.distanceTo(targetPatrolPoint);
                const patrolConfig = enemyRef.config?.patrolConfig || {};


                if (distanceToTarget < (enemyRef.stats.speed * dt * 2) || distanceToTarget < 10) {
                    enemyRef.currentPatrolIndex = (enemyRef.currentPatrolIndex + 1) % enemyRef.patrolPoints.length;
                    enemyRef.patrolWaitTimer = (patrolConfig.waitTimeMin || 1.5) + Math.random() * ((patrolConfig.waitTimeMax || 3.0) - (patrolConfig.waitTimeMin || 1.5));
                    commandExecutor.move(enemyRef, new THREE.Vector3(), 0); // Stop walk animation
                } else {
                    const direction = targetPatrolPoint.clone().sub(enemyRef.pivot.position).normalize();
                    commandExecutor.rotateTowards(enemyRef, targetPatrolPoint);
                    commandExecutor.move(enemyRef, direction, enemyRef.stats.speed * dt);
                }
            },
// ✅ Implement the playAnimation method
        playAnimation: (enemyRef, animationName, loop = THREE.LoopRepeat, crossfadeDuration = 0.2) => {
            if (!enemyRef || !enemyRef.actions || !enemyRef.mixer || !enemyRef.config?.animations) {
                // Optional: console.warn for debugging missing parts
                // console.warn(`[playAnimation] Missing refs/config for enemy ${enemyRef?.id} or animation ${animationName}`);
                return;
            }

            // Resolve actual animation name from config (e.g., config might map 'idle' to 'Idle_Animation_v2')
            const actualAnimationName = enemyRef.config.animations[animationName] || animationName;
            const actionToPlay = enemyRef.actions[actualAnimationName];

            if (!actionToPlay) {
                console.warn(`[playAnimation] Animation "${actualAnimationName}" (mapped from "${animationName}") not found for enemy ${enemyRef.id}`);
                return;
            }

            // If the requested animation is already the current one and is looping, do nothing
            if (enemyRef.currentAnimation === actualAnimationName && actionToPlay.isRunning() && actionToPlay.loop === THREE.LoopRepeat) {
                return;
            }

            // Fade out the current animation if it's different
            if (enemyRef.currentAnimation &&
                enemyRef.actions[enemyRef.currentAnimation] &&
                enemyRef.currentAnimation !== actualAnimationName) {
                enemyRef.actions[enemyRef.currentAnimation].fadeOut(crossfadeDuration);
            }

            // Set up and play the new animation
            actionToPlay
                .reset()
                .setEffectiveTimeScale(1) // Ensure normal playback speed
                .setLoop(loop, Infinity)    // Set looping behavior (THREE.LoopOnce, THREE.LoopRepeat)
                .fadeIn(crossfadeDuration)  // Fade in the new animation
                .play();

            enemyRef.currentAnimation = actualAnimationName; // Track the current animation
        },        };




        const findNearestEnemy = (origin, maxRangeSq) => {
            let nearestEnemy = null;
            let minDistanceSq = maxRangeSq;
            loadedEnemyRefsArray?.forEach(enemy => {
                if (!enemy || enemy.isDead || !enemy.pivot?.position || !enemy.isActive) return; // Added isActive check
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
                    id: Math.random(), position: pos, velocity: direction.clone().multiplyScalar(projSpeed),
                    damage: dmg, isCrit: crit, lifetime: projLifetime, mesh: null
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

        const removeBeamMesh = (enemy) => {
            if (enemy.visualMeshes?.beam && sceneRef.current) { // Changed from beamEffectMesh to visualMeshes.beam
                sceneRef.current.remove(enemy.visualMeshes.beam);
                enemy.visualMeshes.beam.geometry?.dispose();
                enemy.visualMeshes.beam.material?.map?.dispose();
                enemy.visualMeshes.beam.material?.dispose();
                enemy.visualMeshes.beam = null;
            }
        };

        const checkWinCondition = () => {
            if (!levelData?.winCondition || isLoading || levelStatus !== 'playing') return;
            if (enemiesState.length === 0 && loadedInitialStates?.length > 0 && areEnemiesLoaded) {
                if (levelData.winCondition.type === 'clear_enemies') {
                    winLevel(); return;
                }
            }
            const { type, duration } = levelData.winCondition;
            switch (type) {
                case 'clear_enemies': {
                    const liveEnemies = enemiesState?.filter(e => e.currentHp > 0) || [];
                    if (liveEnemies.length === 0 && enemiesState.length > 0) { winLevel(); }
                    break;
                }
                case 'defeat_all_bosses': {
                    const liveBosses = enemiesState?.filter(e => e.isBoss && e.currentHp > 0) || [];
                    const wereBosses = enemiesState?.some(e => e.isBoss);
                    if (liveBosses.length === 0 && wereBosses) { winLevel(); }
                    break;
                }
                case 'survive_duration': {
                    if (levelStartTimeRef.current && duration) {
                        const elapsed = (Date.now() - levelStartTimeRef.current) / 1000;
                        const timeLeft = duration - elapsed;
                        setRemainingTime(timeLeft > 0 ? timeLeft : 0);
                        if (timeLeft <= 0) { winLevel(); }
                    }
                    break;
                }
                default: break;
            }
        };

        const animate = (timestamp) => {
            if (levelStatus !== 'playing') {
                if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
                clock.stop();
                return;
            }
            animationFrameId.current = requestAnimationFrame(animate);
            const dt = timestamp === 0 ? 0.016 : Math.min((timestamp - lastTimestamp) / 1000, 0.05);
            lastTimestamp = timestamp;

            const playerPos = playerObject?.position;
            const currentScene = sceneRef.current;
            const currentCamera = cameraRef.current;
            const currentRenderer = rendererRef.current;
            const currentEnemiesState = enemiesStateRef.current; // Use the ref for up-to-date state

            if (!playerObject || !playerPos || !currentScene || !currentCamera || !currentRenderer || !levelConfig || !playerStats) {
                return;
            }

            // 1. Update Player
            const effectiveSpeed = (playerStats.speed || 3) * (velocity.current.force > 0.1 ? 1 : 0);
            const speedMultiplier = 60;
            if (effectiveSpeed > 0) {
                const dx = (velocity.current.x || 0) * effectiveSpeed * dt * speedMultiplier;
                const dy = (velocity.current.y || 0) * effectiveSpeed * dt * speedMultiplier;
                let nextX = playerPos.x + dx;
                let nextY = playerPos.y + dy;
                const PLAYER_SIZE = { width: 30, height: 30 };
                const pRect = { x: playerPos.x - PLAYER_SIZE.width / 2, y: playerPos.y - PLAYER_SIZE.height / 2, width: PLAYER_SIZE.width, height: PLAYER_SIZE.height };
                let colX = false; let colY = false;
                const pRectX = { ...pRect, x: nextX - PLAYER_SIZE.width / 2 };
                for (const wall of wallsRef.current) { if (checkCollision(pRectX, wall)) { colX = true; break; } }
                const pRectY = { ...pRect, y: nextY - PLAYER_SIZE.height / 2 };
                for (const wall of wallsRef.current) { if (checkCollision(pRectY, wall)) { colY = true; break; } }
                if (!colX) playerPos.x = nextX;
                if (!colY) playerPos.y = nextY;
                const pSizeHW = PLAYER_SIZE.width / 2; const pSizeHH = PLAYER_SIZE.height / 2;
                const minX = -levelConfig.gameWorldWidth / 2 + pSizeHW; const maxX = levelConfig.gameWorldWidth / 2 - pSizeHW;
                const minYw = -levelConfig.WORLD_Y_OFFSET + pSizeHH; const maxYw = levelConfig.gameWorldHeight - levelConfig.WORLD_Y_OFFSET - pSizeHH;
                playerPos.x = clamp(playerPos.x, minX, maxX);
                playerPos.y = clamp(playerPos.y, minYw, maxYw);
                if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
                    const angle = Math.atan2(dy, dx); let targetRotZ = angle - Math.PI / 2;
                    const currentRotZ = playerObject.rotation.z; const twoPi = Math.PI * 2;
                    let diff = targetRotZ - currentRotZ;
                    while (diff < -Math.PI) diff += twoPi; while (diff > Math.PI) diff -= twoPi;
                    playerObject.rotation.z += diff * 0.15;
                }
            }
            playerObject.userData?.mixer?.update(dt);

            let playerCurrentRoom = null;
            if (playerObject?.position && levelData?.rooms) {
                const pX = playerObject.position.x; const pY = playerObject.position.y;
                for (const room of levelData.rooms) {
                    const bounds = worldRoomBoundariesRef.current[room.id];
                    if (bounds && pX >= bounds.xMinWorld && pX <= bounds.xMaxWorld && pY >= bounds.yMinWorld && pY <= bounds.yMaxWorld) {
                        playerCurrentRoom = room.id; break;
                    }
                }
            }
            if (playerCurrentRoom && playerCurrentRoom !== currentActiveRoomId) {
                if (fogOverlaysRef.current[playerCurrentRoom]) { fogOverlaysRef.current[playerCurrentRoom].visible = false; }
                if (loadedEnemyRefsArray) {
                    loadedEnemyRefsArray.forEach(enemy => {
                        if (enemy.roomId === playerCurrentRoom && !enemy.isActive) {
                            enemy.isActive = true;
                            if (enemy.pivot) { enemy.pivot.visible = true; }
                            if (enemy.aiState === 'SLEEPING' || !enemy.aiState) { enemy.aiState = 'IDLE'; }
                        }
                    });
                }
                setCurrentActiveRoomId(playerCurrentRoom);
            }

            // 2. Player Attack
            playerAttackCooldown.current -= dt;
            if (playerAttackCooldown.current <= 0) {
                const interval = 1 / (playerStats.attackSpeed || 1.0);
                playerAttackCooldown.current = interval;
                const range = playerStats.attackRange || 150;
                const rangeSq = range * range;
                const target = findNearestEnemy(playerPos, rangeSq);
                if (target) { createProjectile(target); }
            }

            // 3. Player Projectiles
            const activeProjectiles = [];
            const enemyHitboxes = loadedEnemyRefsArray?.map(enemy => {
                if (enemy?.pivot?.position && !enemy.isDead && enemy.isActive) { // Added isActive
                    const size = enemy.config?.collisionSize?.width || ENEMY_COLLISION_SIZE_DEFAULT.width; // Use enemy specific or default
                    return {
                        id: enemy.id, type: enemy.type, ref: enemy,
                        x: enemy.pivot.position.x - size / 2, y: enemy.pivot.position.y - size / 2,
                        width: size, height: size
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
                            handleEnemyHit(eBox.id, proj.damage);
                            hit = true; break;
                        }
                    }
                }
                if (proj.lifetime > 0 && !hit) { activeProjectiles.push(proj); }
                else { if (proj.mesh) { currentScene?.remove(proj.mesh); proj.mesh.geometry?.dispose(); proj.mesh.material?.dispose(); } }
            });
            projectilesRef.current = activeProjectiles;

            // ==================================
            // === 4. Обновление Врагов (NEW AI SYSTEM) ========
            // ==================================
            loadedEnemyRefsArray?.forEach(enemyRef => {
                if (!enemyRef.pivot || !currentScene) return;

                const enemyConfig = enemyRef.config;
                const enemyStats = enemyRef.stats;
                const enemyStateFromGlobal = currentEnemiesState.find(es => es.id === enemyRef.id);

                if (!enemyRef.isActive || !enemyConfig || !enemyStats || !enemyStateFromGlobal) {
                    if (enemyRef.hpBar?.container) enemyRef.hpBar.container.visible = false;
                    // If enemy became dead and was marked by handleEnemyHit, isDead will be true.
                    // The actual removal from scene is handled by another useEffect.
                    // Here we just stop its logic if it's not supposed to act.
                    if (enemyRef.isDead && enemyRef.visualMeshes?.beam) removeBeamMesh(enemyRef);
                    return;
                }

                 // Check if HP dropped to 0 and mark as dead if not already
                if (enemyStateFromGlobal.currentHp <= 0 && !enemyRef.isDead) {
                    enemyRef.isDead = true; // Mark in ref for AI to stop
                    console.log(`--- Враг ${enemyRef.id} (${enemyRef.type}) ПОМЕЧЕН МЕРТВЫМ в animate (HP=${enemyStateFromGlobal.currentHp}) ---`);

                    // Trigger "on_death" abilities
                    enemyConfig.abilities?.forEach(ability => {
                        if (ability.trigger?.type === "on_death") {
                            abilityExecutor(ability.id, enemyRef, null, ability.params); // target is null for on_death
                        }
                    });

                    if (enemyRef.hpBar?.container) enemyRef.hpBar.container.visible = false;
                    if (enemyRef.visualMeshes?.beam) removeBeamMesh(enemyRef);
                    // The useEffect watching enemiesState will handle removing the mesh from the scene.
                    return; // Stop further processing for this dead enemy in this frame
                }
                
                // If enemy is already marked dead by previous logic (e.g. handleEnemyHit), skip AI.
                if (enemyRef.isDead) {
                     if (enemyRef.hpBar?.container) enemyRef.hpBar.container.visible = false;
                     if (enemyRef.visualMeshes?.beam) removeBeamMesh(enemyRef);
                     return;
                }


                // Update HP bar
                if (enemyRef.hpBar?.container && enemyRef.hpBar?.fill && enemyStateFromGlobal && enemyStateFromGlobal.maxHp > 0) {
                    enemyRef.hpBar.container.visible = true;
                    const hpPercent = Math.max(0, enemyStateFromGlobal.currentHp / enemyStateFromGlobal.maxHp);
                    enemyRef.hpBar.fill.scale.x = Math.max(0.001, hpPercent);
                    enemyRef.hpBar.fill.position.x = (HEALTH_BAR_WIDTH * (enemyRef.hpBar.fill.scale.x - 1)) / 2;
                    if (cameraRef.current) enemyRef.hpBar.container.quaternion.copy(cameraRef.current.quaternion);
                } else if (enemyRef.hpBar?.container) {
                    enemyRef.hpBar.container.visible = false;
                }

                // Update animations (mixer)
                if (enemyRef.mixer) {
                    enemyRef.mixer.update(dt);
                }

                // Update cooldowns
                if (typeof enemyRef.attackCooldownTimer === 'undefined') enemyRef.attackCooldownTimer = 0;
                if (enemyRef.attackCooldownTimer > 0) enemyRef.attackCooldownTimer -= dt;

                if (!enemyRef.abilityStates) enemyRef.abilityStates = {};
                for (const abilityId in enemyRef.abilityStates) {
                    if (enemyRef.abilityStates[abilityId].cooldownTimer > 0) {
                        enemyRef.abilityStates[abilityId].cooldownTimer -= dt;
                    }
                }

                // === ОСНОВНАЯ ЛОГИКА AI ===
                const aiPatternFunction = AI_PATTERNS[enemyConfig.typeForAI];
                if (aiPatternFunction) {
                    const worldContext = {
                        scene: currentScene,
                        walls: wallsRef.current,
                        playerRef: playerObject,
                        allEnemies: loadedEnemyRefsArray,
                        levelConfig: levelConfig,
                        checkCollision: checkCollision,
                        clamp: clamp,
                        // Add other context an AI might need
                    };
                    aiPatternFunction(enemyRef, playerPos, dt, worldContext, commandExecutor, abilityExecutor);
                } else {
                    // console.warn(`[Animate] AI Pattern для типа "${enemyConfig.typeForAI}" не найден! Враг ${enemyRef.id} будет бездействовать.`);
                    if (commandExecutor.patrol && enemyRef.patrolPoints && enemyRef.patrolPoints.length > 0) {
                         commandExecutor.patrol(enemyRef, dt); // Default to patrol if AI pattern missing but patrol points exist
                    } else {
                        // Default to idle animation if no patrol and no AI
                        if (enemyRef.actions?.idle && enemyRef.currentAnimation !== 'idle') {
                            if(enemyRef.actions.walk) enemyRef.actions.walk.fadeOut(0.2);
                            enemyRef.actions.idle.reset().fadeIn(0.2).play();
                            enemyRef.currentAnimation = 'idle';
                        }
                    }
                }
            });


            // 5. Enemy Projectiles (Existing logic)
           const activeEnemyProjectiles = [];

// Определяем границы мира для "сборки мусора" - улетевших снарядов
// projectileCleanupBuffer - это насколько далеко за пределы основного мира может улететь снаряд перед удалением
const projectileCleanupBuffer = 200; // Можно настроить
const worldMinX_cleanup = -levelConfig.gameWorldWidth / 2 - projectileCleanupBuffer;
const worldMaxX_cleanup =  levelConfig.gameWorldWidth / 2 + projectileCleanupBuffer;

// Для Y-координат, если используется WORLD_Y_OFFSET (как для сущностей):
// Предполагается, что levelConfig.WORLD_Y_OFFSET = levelConfig.gameWorldHeight / 2
// и мир для сущностей находится в диапазоне Y от (-WORLD_Y_OFFSET) до (gameWorldHeight - WORLD_Y_OFFSET)
const worldMinY_cleanup = -levelConfig.WORLD_Y_OFFSET - projectileCleanupBuffer;
const worldMaxY_cleanup =  levelConfig.gameWorldHeight - levelConfig.WORLD_Y_OFFSET + projectileCleanupBuffer;


enemyProjectilesRef.current.forEach(proj => {
    proj.position.add(proj.velocity.clone().multiplyScalar(dt)); // Обновляем позицию

    if (proj.mesh) {
        proj.mesh.position.copy(proj.position);
        // Если нужна ориентация снаряда по направлению полета:
        // proj.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), proj.velocity.clone().normalize());
    }

    let hitPlayer = false;
    let hitWall = false;
    let isOutOfBounds = false;

    const projX = proj.position.x;
    const projY = proj.position.y;

    // 1. Проверка: Вылетел ли снаряд за пределы мира?
    if (projX < worldMinX_cleanup || projX > worldMaxX_cleanup || projY < worldMinY_cleanup || projY > worldMaxY_cleanup) {
        isOutOfBounds = true;
        // console.log(`Снаряд ${proj.id} удален: вышел за границы мира.`);
    }

    // 2. Проверка столкновений (только если еще не помечен для удаления)
    if (!isOutOfBounds) {
        const projRadius = proj.mesh?.geometry?.parameters?.radius || 5; // Используй радиус сферы или половину размера для Box
        const projHitboxSize = projRadius * 2;
        const projHitbox = {
            x: projX - projRadius,
            y: projY - projRadius, // Обрати внимание на систему координат Y для хитбокса
            width: projHitboxSize,
            height: projHitboxSize
        };

        // Проверка столкновения с игроком
        if (playerObject && playerHp > 0) { // Убедись, что playerObject и playerHp доступны
             const playerHitbox = { // Используй актуальные размеры игрока
                x: playerObject.position.x - (PLAYER_HITBOX_SIZE.width / 2),
                y: playerObject.position.y - (PLAYER_HITBOX_SIZE.height / 2),
                width: PLAYER_HITBOX_SIZE.width,
                height: PLAYER_HITBOX_SIZE.height
            };
            if (checkCollision(projHitbox, playerHitbox)) {
                if (typeof playerTakeDamage === 'function') {
                    playerTakeDamage(proj.damage);
                }
                hitPlayer = true;
            }
        }

        // Проверка столкновения со стенами (если не попал в игрока)
        if (!hitPlayer) {
            for (const wall of wallsRef.current) {
                if (checkCollision(projHitbox, wall)) {
                    hitWall = true;
                    break;
                }
            }
        }
    }

    // Условие удаления: попал в игрока ИЛИ попал в стену ИЛИ вылетел за границы
    if (hitPlayer || hitWall || isOutOfBounds) {
        if (proj.mesh) {
            currentScene?.remove(proj.mesh); // currentScene должен быть sceneRef.current
            proj.mesh.geometry?.dispose();
            proj.mesh.material?.dispose();
        }
    } else {
        activeEnemyProjectiles.push(proj); // Оставляем снаряд, если нет причин удалять
    }
});
enemyProjectilesRef.current = activeEnemyProjectiles;

            // 5.1 Poison Clouds
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
                    cloud.mesh.geometry?.dispose(); cloud.mesh.material?.dispose();
                }
            });
            if (remainingClouds.length !== activeCloudsRef.current.length) { activeCloudsRef.current = remainingClouds; }


            // Poison Puddles 
            const remainingPuddles = [];
            const nowMs = Date.now();
            for (const puddle of activePuddlesRef.current) {
                if (nowMs < puddle.endTime) {
                    remainingPuddles.push(puddle);
                    if (playerObject?.position && playerHp > 0) {
                        const distanceSq = playerObject.position.distanceToSquared(puddle.position);
                        if (distanceSq <= puddle.radiusSq) {
                            const damageThisFrame = puddle.dps * dt;
                            if (typeof playerTakeDamage === 'function') { playerTakeDamage(damageThisFrame); }
                        }
                    }
                } else {
                    if (sceneRef.current && puddle.mesh) { sceneRef.current.remove(puddle.mesh); }
                    puddle.mesh?.geometry?.dispose(); puddle.mesh?.material?.dispose();
                }
            }
            if (activePuddlesRef.current.length !== remainingPuddles.length) { activePuddlesRef.current = remainingPuddles; }

            // Effect Projectiles 
            const remainingEffectProjectiles = [];
            for (const proj of activeEffectProjectilesRef.current) {
                if (!proj?.mesh || !proj.velocity || !proj.targetPos) { continue; }
                const velocityThisFrame = proj.velocity.clone().multiplyScalar(dt);
                const distanceThisFrame = velocityThisFrame.length();
                proj.elapsedDistance += distanceThisFrame;
                let reachedTarget = proj.elapsedDistance >= proj.distanceToTarget;
                const projRadius = proj.mesh.geometry?.parameters?.radius || 8;
                if (!reachedTarget && proj.mesh.position.distanceToSquared(proj.targetPos) < projRadius * projRadius) { reachedTarget = true; }
                if (!reachedTarget) {
                    proj.mesh.position.add(velocityThisFrame);
                    remainingEffectProjectiles.push(proj);
                } else {
                    const impactPos = proj.targetPos;
                    if (proj.directDamage > 0 && playerObject?.position && playerHp > 0) {
                        const playerPosHit = playerObject.position;
                        const hitRadius = PLAYER_HITBOX_SIZE.width / 2 || 15;
                        const hitRadiusSq = hitRadius * hitRadius;
                        if (playerPosHit.distanceToSquared(impactPos) <= hitRadiusSq) {
                            if (typeof playerTakeDamage === 'function') { playerTakeDamage(proj.directDamage); }
                        }
                    }
                    if (proj.createsGroundEffect && proj.groundEffectParams) {
                        if (typeof createGroundEffect === 'function') { createGroundEffect(impactPos, proj.groundEffectParams); }
                    }
                    if (sceneRef.current && proj.mesh) { sceneRef.current.remove(proj.mesh); }
                    proj.mesh?.geometry?.dispose(); proj.mesh?.material?.dispose();
                }
            }
            if (activeEffectProjectilesRef.current.length !== remainingEffectProjectiles.length) { activeEffectProjectilesRef.current = remainingEffectProjectiles; }

            // Burning Grounds (Existing logic)
            const remainingBurningGrounds = [];
            const nowMs_fire = Date.now();
            for (const zone of activeBurningGroundsRef.current) {
                if (nowMs_fire < zone.endTime) {
                    remainingBurningGrounds.push(zone);
                    if (playerObject?.position && playerHp > 0) {
                        const distanceSq = playerObject.position.distanceToSquared(zone.position);
                        if (distanceSq <= zone.radiusSq) {
                            const damageThisFrame = zone.dps * dt;
                            if (typeof playerTakeDamage === 'function') { playerTakeDamage(damageThisFrame); }
                        }
                    }
                } else {
                    if (sceneRef.current && zone.mesh) { sceneRef.current.remove(zone.mesh); }
                    zone.mesh?.geometry?.dispose(); zone.mesh?.material?.dispose();
                }
            }
            if (activeBurningGroundsRef.current.length !== remainingBurningGrounds.length) { activeBurningGroundsRef.current = remainingBurningGrounds; }

            // Aura Check 
            let isPlayerCurrentlyInAnyAura = false;
            if (playerObject?.position) {
                const playerPosAura = playerObject.position;
                loadedEnemyRefsArray?.forEach(enemy => {
                    if (enemy.config?.typeForAI === 'ghostly_enchanter_aura' && enemy.isActive && !enemy.isDead && enemy.stats.auraRadius > 0) { // Example typeForAI
                        const auraRadius = enemy.stats.auraRadius;
                        const distSq = playerPosAura.distanceToSquared(enemy.pivot.position);
                        if (distSq <= auraRadius * auraRadius) { isPlayerCurrentlyInAnyAura = true; }
                    }
                });
            }
            const currentAuraStatusInStore = useGameStore.getState().isAffectedByWeakeningAura;
            if (isPlayerCurrentlyInAnyAura !== currentAuraStatusInStore) { setWeakeningAuraStatus(isPlayerCurrentlyInAnyAura); }

            // Door Animations 
            const remainingDoorAnimations = [];
            for (const anim of animatingDoorsRef.current) {
                anim.elapsedTime += dt;
                const t = Math.min(anim.elapsedTime / anim.duration, 1.0);
                anim.mesh.position.y = THREE.MathUtils.lerp(anim.startY, anim.targetY, t);
                if (t < 1.0) { remainingDoorAnimations.push(anim); }
                else { anim.mesh.visible = false; }
            }
            if (animatingDoorsRef.current.length !== remainingDoorAnimations.length) { animatingDoorsRef.current = remainingDoorAnimations; }

            // Chest Interaction 
            const interactionRadius = 45;
            const interactionRadiusSq = interactionRadius * interactionRadius;
            if (playerObject?.position && levelChestsRef.current?.length > 0) {
                const playerPosChest = playerObject.position;
                levelChestsRef.current.forEach(chest => {
                    if (!chest.isOpened && chest.object3D) {
                        const distSq = playerPosChest.distanceToSquared(chest.position);
                        if (distSq <= interactionRadiusSq) {
                            chest.isOpened = true;
                            if (typeof openLevelChest === 'function') { openLevelChest(chest.instanceId, chest.chestTypeId); }
                            if(chest.object3D && chest.object3D.material) {
                                chest.object3D.material.transparent = true;
                                chest.object3D.material.opacity = 0.5;
                            }
                        }
                    }
                });
            }

            // 6. Check Win/Loss
            checkWinCondition();

            // 7. Update Camera
            if (playerObject && currentCamera && levelConfig) {
                const camWidth = currentCamera.right - currentCamera.left;
                const camHeight = currentCamera.top - currentCamera.bottom;
                const targetXCam = clamp(playerPos.x, -levelConfig.gameWorldWidth / 2 + camWidth / 2, levelConfig.gameWorldWidth / 2 - camWidth / 2);
                const targetYCam = clamp(playerPos.y, -levelConfig.WORLD_Y_OFFSET + camHeight / 2, levelConfig.gameWorldHeight - levelConfig.WORLD_Y_OFFSET - camHeight / 2);
                currentCamera.position.lerp(new THREE.Vector3(targetXCam, targetYCam, currentCamera.position.z), 0.1);
            }

            // 8. Render
            if (currentRenderer && currentScene && currentCamera) {
                try { currentRenderer.render(currentScene, currentCamera); }
                catch (error) {
                    console.error("❌ Ошибка рендеринга:", error); setLevelStatus('error');
                    if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
                    animationFrameId.current = null; clock.stop();
                }
            }
        };

        if (!animationFrameId.current) {
            clock.start();
            lastTimestamp = performance.now();
            animationFrameId.current = requestAnimationFrame(animate);
        }
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
            clock.stop();
            projectilesRef.current.forEach(p => p.mesh && sceneRef.current?.remove(p.mesh));
            projectilesRef.current = [];
            enemyProjectilesRef.current.forEach(p => p.mesh && sceneRef.current?.remove(p.mesh));
            enemyProjectilesRef.current = [];
            loadedEnemyRefsArray?.forEach(e => { if (e?.visualMeshes?.beam) removeBeamMesh(e); });
            effectTimersRef.current.forEach(timerId => clearTimeout(timerId));
            effectTimersRef.current = [];
        };
    }, [
        isLoading, levelStatus, playerObject, levelData, playerStats, levelConfig, beamTexturesLoaded, // Core dependencies
        wallsRef, checkCollision, clamp, playerTakeDamage, // Utilities and actions used by commandExecutor and animate
        createPoisonCloud, createEnemyProjectileFromConfig, executeSummonAbility, // Main ability functions
        createArrowProjectile, // Projectile creation used by createEnemyProjectileFromConfig
        // Dependencies for abilityExecutor (these are the functions it might call)
        // Note: commandExecutor is defined inside this useEffect, so it's not a dependency here.
        // abilityExecutor itself will be a dependency if other hooks use it, but here it's defined and used locally.
        // Make sure all functions called by abilityExecutor and commandExecutor that come from props or useCallback are listed.
        openLevelChest, setWeakeningAuraStatus, // Store actions
        createGroundEffect, // Ground effect dispatcher
        // Ensure all other useCallback functions used inside animate or by command/ability executors are listed:
        // e.g. findNearestEnemy, addProjectileMesh, createProjectile, removeBeamMesh, checkWinCondition
        // However, many of these are defined locally within the useEffect or are stable.
        // The key is that any function from *outside* this useEffect that is used *inside* and can change, must be a dependency.
        // For functions defined inside this useEffect (like animate itself, commandExecutor, abilityExecutor), they don't go into deps.
        // For functions passed as props or from useState/useCallback outside, they do.
        // Simplified:
        playerHp, displayMaxHp, // For UI and checks
        enemiesState, loadedEnemyRefsArray, // For enemy processing
        currentActiveRoomId, // For room logic
        // Add specific ability-related functions if they are useCallback from component scope:
        // placeTotem, triggerGroundSpikes, launchPoisonProjectile, createProjectileToPoint, applyPlayerDebuff
        // If these are stable (defined once or properly memoized), they are fine.
        // The new abilityExecutor is a useCallback, so it should be stable if its own dependencies are stable.
                         // However, it's defined and used *within* this same useEffect, so it doesn't need to be in its own dependency array.
                         // The functions *it* calls (createPoisonCloud, etc.) are its dependencies.
    ]);




    return (
        <div className="game-wrapper">
            {isLoading && <LoadingScreen />}
            <div className="game-container" style={{ visibility: isLoading ? 'hidden' : 'visible' }}>
                {!isLoading && playerObject && typeof playerHp === 'number' && typeof displayMaxHp === 'number' && playerStats && (
                    <div className="player-hud">
                        <HealthBar currentHp={playerHp} maxHp={displayMaxHp} />
                        <div className="player-attack-text">
                            <span className="stat-atk">ATK: {playerStats.attack}</span>
                        </div>
                    </div>
                )}
                {!isLoading && levelStatus === 'playing' && (
                    <div className="level-timer">
                        {formatTime(elapsedTimeSec)}
                    </div>
                )}
                {!isLoading && levelData?.winCondition?.type === 'survive_duration' && remainingTime !== null && levelStatus === 'playing' && (
                    <div className="survival-timer"> Выжить: {Math.ceil(remainingTime)} сек </div>
                )}
                <div ref={mountRef} className="game-canvas"></div>
            </div>
            <CSSTransition
                in={!!lastOpenedLevelChestRewards}
                timeout={300}
                classNames="loot-popup-fade"
                mountOnEnter
                unmountOnExit
                nodeRef={levelLootPopupRef}
            >
                <LevelLootPopup ref={levelLootPopupRef} rewards={lastOpenedLevelChestRewards} />
            </CSSTransition>
            <div id="joystick-container" className="joystick-container" style={{ visibility: isLoading ? 'hidden' : 'visible' }}></div>
            {levelStatus === 'lost' && (
                <GameOverPopup
                    onGoToMenu={() => {
                        if (typeof onLevelComplete === 'function') onLevelComplete(levelData.id, 'lost', difficulty);
                    }}
                    timePlayed={timePlayedSeconds}
                />
            )}
            <CSSTransition
                in={levelStatus === 'won'}
                timeout={300}
                classNames="popup-fade"
                mountOnEnter
                unmountOnExit
                nodeRef={levelVictoryPopupRef}
            >
                <LevelVictoryPopup
                    ref={levelVictoryPopupRef}
                    levelId={levelData?.id || 'N/A'}
                    difficulty={difficulty}
                    rewards={currentLevelRewards}
                    onGoToMenu={() => {
                        if (typeof onLevelComplete === 'function') onLevelComplete(levelData.id, 'won', difficulty);
                    }}
                />
            </CSSTransition>
            {levelStatus === 'error' && (
                <div className="level-error-overlay">
                    <h2>Ошибка</h2>
                    <p>Произошла ошибка при загрузке или работе уровня.</p>
                    <button onClick={() => {
                        if (typeof onLevelComplete === 'function') onLevelComplete(levelData.id, 'error');
                    }}>
                        В главное меню
                    </button>
                </div>
            )}
        </div>
    );
};

export default Level;
