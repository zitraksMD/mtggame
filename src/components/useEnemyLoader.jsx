// src/hooks/useEnemyLoader.js
// ВЕРСИЯ С ЗАГЛУШКАМИ, МАСШТАБИРОВАНИЕМ И ЩИТАМИ ДЛЯ РЫЦАРЕЙ
// ИНТЕГРИРОВАНА ЛОГИКА ИЗ КОД1 ДЛЯ БАЗОВЫХ СТАТОВ ИЗ СПРАВОЧНИКА
// ИЗМЕНЕНИЯ ИЗ КОД1 (переименование состояния, возвращаемые значения) ПРИМЕНЕНЫ
// ДОБАВЛЕНА ЛОГИКА INITIALLY_ACTIVE И ROOM_ID

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { convertTiledX, convertTiledY } from './utils'; // <<< ПРОВЕРЬ ПУТЬ

// --- Константы хелсбара ---
const HEALTH_BAR_WIDTH = 30;
const HEALTH_BAR_HEIGHT = 4;
const HEALTH_BAR_OFFSET_Y = 25; // Подняли над сферой

const useEnemyLoader = (
    enemiesData,
    scene,
    levelConfig,
    levelId,
    difficulty = 'normal',
    BASE_ENEMY_STATS // <<< ПЕРЕДАЕМ ИЛИ ИМПОРТИРУЕМ BASE_ENEMY_STATS
) => {
    const [enemyRefsArray, setEnemyRefsArray] = useState([]);
    const [areEnemiesLoaded, setAreEnemiesLoaded] = useState(false);
    const [initialEnemyStates, setInitialEnemyStates] = useState([]);
    const internalRefs = useRef([]);

    const hpResources = useMemo(() => ({
        geometryBg: new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT),
        geometryFill: new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT),
        materialBg: new THREE.MeshBasicMaterial({ color: 0x333333, depthTest: false, depthWrite: false, transparent: true, opacity: 0.8 }),
        materialFill: new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false, depthWrite: false, transparent: true, opacity: 0.9 })
    }), []);

    useEffect(() => {
        return () => {
            hpResources.geometryBg.dispose(); hpResources.geometryFill.dispose();
            hpResources.materialBg.dispose(); hpResources.materialFill.dispose();
        };
    }, [hpResources]);

    const shieldResources = useMemo(() => ({
        geometry: new THREE.SphereGeometry(19, 16, 12),
        material: new THREE.MeshBasicMaterial({
            color: 0xfacc15,
            transparent: true,
            opacity: 0.35,
            side: THREE.FrontSide,
            depthWrite: false,
        })
    }), []);

    useEffect(() => {
        return () => {
            shieldResources.geometry.dispose();
            shieldResources.material.dispose();
        };
    }, [shieldResources]);

    const cleanupEnemies = useCallback(() => {
        if (!scene) return;
        internalRefs.current.forEach(enemyRef => {
            if (enemyRef.pivot && scene.children.includes(enemyRef.pivot)) {
                scene.remove(enemyRef.pivot);
                enemyRef.pivot.traverse(object => {
                    if (object.geometry &&
                        object.geometry !== hpResources.geometryBg &&
                        object.geometry !== hpResources.geometryFill &&
                        object.geometry !== shieldResources.geometry) {
                        object.geometry.dispose();
                    }
                    if (object.material &&
                        object.material !== hpResources.materialBg &&
                        object.material !== hpResources.materialFill &&
                        object.material !== shieldResources.material) {
                        if (Array.isArray(object.material)) { object.material.forEach(material => material.dispose()); }
                        else { object.material.dispose(); }
                    }
                });
            }
        });
        internalRefs.current = [];
        setEnemyRefsArray([]);
        setInitialEnemyStates([]);
    }, [scene, hpResources, shieldResources, setEnemyRefsArray]); // setEnemyRefsArray добавлена, как и было

    useEffect(() => {
        if (!scene || !enemiesData || !levelConfig || !levelId || !BASE_ENEMY_STATS) {
            if (internalRefs.current.length > 0) cleanupEnemies();
            setAreEnemiesLoaded(true);
            if (!BASE_ENEMY_STATS) console.warn("[useEnemyLoader] Справочник BASE_ENEMY_STATS не передан или не импортирован!");
            return;
        }
        setAreEnemiesLoaded(false);
        cleanupEnemies();

        const loadedEnemyData = [];
        const initialStatesData = [];
        const { gameWorldWidth, gameWorldHeight, WORLD_Y_OFFSET } = levelConfig;

        const levelNumber = levelId % 100 || 1;
        const difficultyMultiplier = difficulty === 'hard' ? 2.0 : 1.0;
        const levelHpMultiplier = 1 + 0.15 * (levelNumber - 1);
        const levelDamageMultiplier = 1 + 0.10 * (levelNumber - 1);

        enemiesData.forEach((enemyDataFromLevel, index) => {
            if (!enemyDataFromLevel?.id || !enemyDataFromLevel.type) {
                console.error(`Некорректные данные врага ${index}: нет id или type`, enemyDataFromLevel);
                return;
            }

            const baseStatsFromDirectory = BASE_ENEMY_STATS[enemyDataFromLevel.type];
            if (!baseStatsFromDirectory) {
                console.error(`Не найдены базовые статы для типа: ${enemyDataFromLevel.type} (ID: ${enemyDataFromLevel.id})`);
                return;
            }

            const baseStats = {
                ...baseStatsFromDirectory,
                ...(enemyDataFromLevel.stats || {})
            };

            const scaledStats = {
                ...baseStats,
                hp: Math.max(1, Math.round((baseStats.hp || 10) * levelHpMultiplier * difficultyMultiplier)),
                damage: Math.max(1, Math.round((baseStats.damage || 1) * levelDamageMultiplier * difficultyMultiplier)),
                ...(baseStats.beamDamage !== undefined && { beamDamage: Math.max(1, Math.round(baseStats.beamDamage * levelDamageMultiplier * difficultyMultiplier)) }),
                ...(baseStats.dotDamage !== undefined && { dotDamage: Math.max(1, Math.round(baseStats.dotDamage * levelDamageMultiplier * difficultyMultiplier)) }),
                ...(baseStats.puddleDps !== undefined && { puddleDps: Math.max(1, Math.round(baseStats.puddleDps * levelDamageMultiplier * difficultyMultiplier)) }),
                ...(baseStats.explosionDamage !== undefined && { explosionDamage: Math.max(1, Math.round(baseStats.explosionDamage * levelDamageMultiplier * difficultyMultiplier)) }),
                ...(baseStats.spikeDamage !== undefined && { spikeDamage: Math.max(1, Math.round(baseStats.spikeDamage * levelDamageMultiplier * difficultyMultiplier)) }),
                initialBlockCharges: baseStats.initialBlockCharges || 0,
            };
            delete scaledStats.hp_multiplier;

            // +++ ИЗМЕНЕНИЯ ИЗ КОД1: Читаем флаг начальной активности +++
            // Если initiallyActive не указан в JSON, по умолчанию считаем врага активным
            const initiallyActive = enemyDataFromLevel.initiallyActive !== undefined ? enemyDataFromLevel.initiallyActive : true;
            const roomId = enemyDataFromLevel.roomId || null; // Получаем roomId

            // --- Создание Pivot ---
            const pivot = new THREE.Group();
            pivot.name = `pivot_${enemyDataFromLevel.id}`;
            const startX = convertTiledX(enemyDataFromLevel.x || 0, 0, gameWorldWidth);
            const startY = convertTiledY(enemyDataFromLevel.y || 0, 0, gameWorldHeight, WORLD_Y_OFFSET);
            pivot.position.set(startX, startY, 0);

            console.log(`[useEnemyLoader] Creating placeholder for ${enemyDataFromLevel.id} (${enemyDataFromLevel.type}) at x:${startX.toFixed(1)}, y:${startY.toFixed(1)} with HP ${scaledStats.hp}, Damage: ${scaledStats.damage || 'N/A'}, InitiallyActive: ${initiallyActive}, RoomID: ${roomId}`);

            const geometry = new THREE.SphereGeometry(15, 12, 8);
            let color = 0xaaaaaa;
            switch (enemyDataFromLevel.type) {
                case 'melee': case 'skeleton_swordsman': color = 0xff5555; break;
                case 'ranged': case 'skeleton_archer': color = 0x55ff55; break;
                case 'caster': case 'necromancer': case 'ogre_mage': color = 0x5555ff; break;
                case 'boss': case 'cursed_gladiator': color = 0xffcc33; break;
                case 'bone_dancer': color = 0xffffff; break;
                case 'cursed_carrier': case 'rotting_soldier': color = 0xaa6633; break;
                case 'plague_totemist': color = 0xaa44cc; break;
                case 'revenant_knight': color = 0xC0C0C0; break;
                case 'sand_reaper': color = 0xD2B48C; break;
                case 'ghostly_enchanter': color = 0xADD8E6; break;
                case 'poison_cultist': color = 0x32CD32; break;
            }
            const material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6, metalness: 0.1 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = enemyDataFromLevel.id + "_placeholder";
            mesh.position.y = 15;
            mesh.castShadow = true;
            pivot.add(mesh);

            let shieldMesh = null;
            if (enemyDataFromLevel.type === 'revenant_knight') {
                shieldMesh = new THREE.Mesh(shieldResources.geometry, shieldResources.material);
                shieldMesh.name = `shield_${enemyDataFromLevel.id}`;
                shieldMesh.position.y = 15;
                shieldMesh.visible = (scaledStats.initialBlockCharges || 0) > 0;
                pivot.add(shieldMesh);
            }

            const hpBarContainer = new THREE.Group(); hpBarContainer.name = `hpBar_${enemyDataFromLevel.id}`;
            const hpBgMesh = new THREE.Mesh(hpResources.geometryBg, hpResources.materialBg);
            const hpFillMesh = new THREE.Mesh(hpResources.geometryFill, hpResources.materialFill);
            hpFillMesh.position.z = 0.1;
            hpBarContainer.add(hpBgMesh); hpBarContainer.add(hpFillMesh);
            hpBarContainer.position.set(0, HEALTH_BAR_OFFSET_Y + 15, 1);
            hpBgMesh.renderOrder = 998; hpFillMesh.renderOrder = 999;
            pivot.add(hpBarContainer);

            // +++ ИЗМЕНЕНИЯ ИЗ КОД1: Добавление на сцену и управление начальной видимостью +++
            if (initiallyActive) {
                pivot.visible = true;
                console.log(`[useEnemyLoader] Враг ${enemyDataFromLevel.id} создан АКТИВНЫМ и видимым.`); // Можно раскомментировать для детального лога
            } else {
                pivot.visible = false; // Делаем невидимым, если неактивен
                console.log(`[useEnemyLoader] Враг ${enemyDataFromLevel.id} создан НЕАКТИВНЫМ и скрыт.`); // Можно раскомментировать для детального лога
            }
            scene.add(pivot); // Добавляем pivot на сцену в любом случае

            const enemyRefData = {
                id: enemyDataFromLevel.id,
                type: enemyDataFromLevel.type,
                stats: scaledStats,
                pivot: pivot,
                mesh: mesh,
                shieldMesh: shieldMesh,
                mixer: null, actions: {}, idleActionName: null, currentAction: null,
                attackCooldown: Math.random() * 0.5,
                abilityCooldown: Math.random() * (scaledStats.summonCooldown || scaledStats.abilityCooldown || 5.0),
                isDead: false,
                hpBar: { container: hpBarContainer, bg: hpBgMesh, fill: hpFillMesh },
                aiState: 'IDLE',
                spawnPosition: pivot.position.clone(),
                chaseEndTime: null,
                blockCharges: scaledStats.initialBlockCharges,
                damageStacks: 0,
                exploded: false,
                beamEffectMesh: null,
                beamEffectTimer: 0,
                // +++ ИЗМЕНЕНИЯ ИЗ КОД1: Сохраняем состояние активности и roomId +++
                isActive: initiallyActive,
                roomId: roomId
            };
            loadedEnemyData.push(enemyRefData);

            initialStatesData.push({
                id: enemyDataFromLevel.id,
                maxHp: scaledStats.hp,
                currentHp: scaledStats.hp,
                isBoss: enemyDataFromLevel.type === 'boss', // или другая логика определения босса
                initialBlockCharges: scaledStats.initialBlockCharges || 0,
                // +++ ИЗМЕНЕНИЯ ИЗ КОД1: Также сохраняем в initialStates +++
                isActive: initiallyActive,
                roomId: roomId
            });
        }); // Конец forEach

        internalRefs.current = [...loadedEnemyData];
        setEnemyRefsArray(loadedEnemyData);
        setInitialEnemyStates(initialStatesData);
        setAreEnemiesLoaded(true);
        // console.log(`✅ useEnemyLoader завершил создание ${loadedEnemyData.length} врагов-заглушек.`);

        return () => { cleanupEnemies(); };
    }, [enemiesData, scene, levelConfig, levelId, difficulty, cleanupEnemies, hpResources, shieldResources, BASE_ENEMY_STATS, setEnemyRefsArray]);


    return {
        enemyRefs: enemyRefsArray,
        setEnemyRefs: setEnemyRefsArray,
        areEnemiesLoaded,
        initialEnemyStates,
        hpResources,
        shieldResources
    };
};

export default useEnemyLoader;