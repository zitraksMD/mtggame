// src/hooks/useEnemyLoader.js
// ВЕРСИЯ С ЗАГЛУШКАМИ, МАСШТАБИРОВАНИЕМ И ЩИТАМИ ДЛЯ РЫЦАРЕЙ
// ИНТЕГРИРОВАНА ЛОГИКА ИЗ КОД1 ДЛЯ БАЗОВЫХ СТАТОВ ИЗ СПРАВОЧНИКА
// ИЗМЕНЕНИЯ ИЗ КОД1 (переименование состояния, возвращаемые значения) ПРИМЕНЕНЫ
// ДОБАВЛЕНА ЛОГИКА INITIALLY_ACTIVE И ROOM_ID
// +++ ИНТЕГРИРОВАНА ЛОГИКА АУРЫ ИЗ КОД1 +++
// +++ ВНЕСЕНЫ ИЗМЕНЕНИЯ ИЗ КОД1 ОТНОСИТЕЛЬНО СТАТОВ И МНОЖИТЕЛЕЙ СЛОЖНОСТИ (ДОПОЛНЕНО) +++

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
                        object.geometry !== shieldResources.geometry &&
                        (!enemyRef.auraMesh || object.geometry !== enemyRef.auraMesh.geometry)
                    ) {
                        object.geometry.dispose();
                    }
                    if (object.material &&
                        object.material !== hpResources.materialBg &&
                        object.material !== hpResources.materialFill &&
                        object.material !== shieldResources.material &&
                        (!enemyRef.auraMesh || object.material !== enemyRef.auraMesh.material)
                    ) {
                        if (Array.isArray(object.material)) { object.material.forEach(material => material.dispose()); }
                        else { object.material.dispose(); }
                    }
                });
            }
        });
        internalRefs.current = [];
        setEnemyRefsArray([]);
        setInitialEnemyStates([]);
    }, [scene, hpResources, shieldResources, setEnemyRefsArray]); // setEnemyRefsArray добавлена в зависимости, т.к. используется

    useEffect(() => {
        if (!scene || !enemiesData || !levelConfig || !levelId || !BASE_ENEMY_STATS) {
            if (internalRefs.current.length > 0) {
                cleanupEnemies();
            } else {
                setEnemyRefsArray([]);
                setInitialEnemyStates([]);
            }
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

        // --- ИЗМЕНЕНИЕ ИЗ КОД1: Определение множителя сложности ---
        const isHardMode = difficulty && difficulty.toLowerCase() === 'hard';
        const difficultyStatMultiplier = isHardMode ? 10.0 : 1.0;
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

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

            // --- ИЗМЕНЕНИЕ ИЗ КОД1: Объединение базовых статов и статов уровня ---
            const baseStats = {
                ...baseStatsFromDirectory,
                ...(enemyDataFromLevel.stats || {})
            };
            // --- КОНЕЦ ИЗМЕНЕНИЯ ---

            const finalStats = {
                ...baseStats,
                hp: Math.max(1, Math.round(
                    (baseStats.hp || 10) * levelHpMultiplier * difficultyStatMultiplier
                )),
                maxHp: Math.max(1, Math.round(
                    (baseStats.hp || 10) * levelHpMultiplier * difficultyStatMultiplier
                )),
                damage: Math.max(1, Math.round(
                    (baseStats.damage || 1) * levelDamageMultiplier * difficultyStatMultiplier
                )),
            };

            if (baseStats.beamDamage !== undefined) {
                finalStats.beamDamage = Math.max(1, Math.round(baseStats.beamDamage * levelDamageMultiplier * difficultyStatMultiplier));
            }
            if (baseStats.dotDamage !== undefined) {
                finalStats.dotDamage = Math.max(1, Math.round(baseStats.dotDamage * levelDamageMultiplier * difficultyStatMultiplier));
            }
            if (baseStats.puddleDps !== undefined) {
                finalStats.puddleDps = Math.max(1, Math.round(baseStats.puddleDps * levelDamageMultiplier * difficultyStatMultiplier));
            }
            if (baseStats.explosionDamage !== undefined) {
                finalStats.explosionDamage = Math.max(1, Math.round(baseStats.explosionDamage * levelDamageMultiplier * difficultyStatMultiplier));
            }
            if (baseStats.spikeDamage !== undefined) {
                finalStats.spikeDamage = Math.max(1, Math.round(baseStats.spikeDamage * levelDamageMultiplier * difficultyStatMultiplier));
            }
            
            finalStats.initialBlockCharges = baseStats.initialBlockCharges || 0;
            delete finalStats.hp_multiplier;


            const initiallyActive = enemyDataFromLevel.initiallyActive !== undefined ? enemyDataFromLevel.initiallyActive : true;
            const roomId = enemyDataFromLevel.roomId || null;

            const pivot = new THREE.Group();
            pivot.name = `pivot_${enemyDataFromLevel.id}`;
            const startX = convertTiledX(enemyDataFromLevel.x || 0, 0, gameWorldWidth);
            const startY = convertTiledY(enemyDataFromLevel.y || 0, 0, gameWorldHeight, WORLD_Y_OFFSET);
            pivot.position.set(startX, startY, 0);

            console.log(`[useEnemyLoader] Creating placeholder for ${enemyDataFromLevel.id} (${enemyDataFromLevel.type}) at x:${startX.toFixed(1)}, y:${startY.toFixed(1)} with HP ${finalStats.hp}, Damage: ${finalStats.damage || 'N/A'}, InitiallyActive: ${initiallyActive}, RoomID: ${roomId}`);

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
                shieldMesh.visible = (finalStats.initialBlockCharges || 0) > 0;
                pivot.add(shieldMesh);
            }

            const hpBarContainer = new THREE.Group(); hpBarContainer.name = `hpBar_${enemyDataFromLevel.id}`;
            const hpBgMesh = new THREE.Mesh(hpResources.geometryBg, hpResources.materialBg);
            const hpFillMesh = new THREE.Mesh(hpResources.geometryFill, hpResources.materialFill);
            hpFillMesh.position.z = 0.1;
            hpBarContainer.add(hpBgMesh); hpBarContainer.add(hpFillMesh);
            hpBarContainer.position.set(0, mesh.position.y + HEALTH_BAR_OFFSET_Y, 1);
            hpBgMesh.renderOrder = 998; hpFillMesh.renderOrder = 999;
            pivot.add(hpBarContainer);

            let auraMesh = null;
            if (enemyDataFromLevel.type === 'ghostly_enchanter') {
                const auraRadius = baseStats.auraRadius; 
                if (typeof auraRadius === 'number' && auraRadius > 0) {
                    const auraGeometry = new THREE.SphereGeometry(auraRadius, 32, 16);
                    const auraMaterial = new THREE.MeshBasicMaterial({
                        color: 0x9370DB, 
                        transparent: true,
                        opacity: 0.15,
                        depthWrite: false,
                        side: THREE.DoubleSide
                    });
                    auraMesh = new THREE.Mesh(auraGeometry, auraMaterial);
                    auraMesh.name = `aura_${enemyDataFromLevel.id}`;
                    auraMesh.position.copy(mesh.position);
                    pivot.add(auraMesh);
                    console.log(`[useEnemyLoader] Создана аура для ${enemyDataFromLevel.id} с радиусом ${auraRadius}`);
                    auraMesh.visible = initiallyActive;
                } else {
                    console.warn(`[useEnemyLoader] У Заклинателя ${enemyDataFromLevel.id} не задан или некорректен auraRadius.`);
                }
            }
            
            pivot.visible = initiallyActive;
            scene.add(pivot);
            
            let patrolPoints = null;
            let initialPatrolWaitTimer = 0;
            if (enemyDataFromLevel.type === 'poison_cultist') {
                const patrolRadius = baseStats.patrolRadius;
                if (typeof patrolRadius === 'number' && patrolRadius > 0) {
                    const spawnPosVec = new THREE.Vector3(startX, startY, 0);
                    patrolPoints = [
                        spawnPosVec.clone().add(new THREE.Vector3( patrolRadius,  patrolRadius, 0)),
                        spawnPosVec.clone().add(new THREE.Vector3(-patrolRadius,  patrolRadius, 0)),
                        spawnPosVec.clone().add(new THREE.Vector3(-patrolRadius, -patrolRadius, 0)),
                        spawnPosVec.clone().add(new THREE.Vector3( patrolRadius, -patrolRadius, 0))
                    ];
                    initialPatrolWaitTimer = 1.0 + Math.random() * 1.5;
                }
            }

            const enemyRefData = {
                id: enemyDataFromLevel.id,
                type: enemyDataFromLevel.type,
                stats: finalStats,
                pivot: pivot,
                mesh: mesh,
                shieldMesh: shieldMesh,
                auraMesh: auraMesh,
                mixer: null, actions: {}, idleActionName: null, currentAction: null,
                attackCooldown: Math.random() * 0.5,
                abilityCooldown: Math.random() * (finalStats.summonCooldown || finalStats.abilityCooldown || 5.0),
                isDead: false,
                hpBar: { container: hpBarContainer, bg: hpBgMesh, fill: hpFillMesh },
                aiState: 'IDLE',
                spawnPosition: pivot.position.clone(),
                chaseEndTime: null,
                blockCharges: finalStats.initialBlockCharges,
                damageStacks: 0,
                exploded: false,
                beamEffectMesh: null,
                beamEffectTimer: 0,
                isActive: initiallyActive,
                roomId: roomId,
                patrolPoints: patrolPoints,
                currentPatrolIndex: 0,
                patrolWaitTimer: initialPatrolWaitTimer
            };
            loadedEnemyData.push(enemyRefData);

            initialStatesData.push({
                id: enemyDataFromLevel.id,
                // --- ИЗМЕНЕНИЕ ИЗ КОД1: Используем finalStats.maxHp ---
                maxHp: finalStats.maxHp,
                // --- КОНЕЦ ИЗМЕНЕНИЯ ---
                currentHp: finalStats.hp,
                isBoss: baseStats.isBoss || enemyDataFromLevel.type === 'boss',
                initialBlockCharges: finalStats.initialBlockCharges || 0,
                isActive: initiallyActive,
                roomId: roomId
            });
        });

        internalRefs.current = [...loadedEnemyData];
        setEnemyRefsArray(loadedEnemyData);
        setInitialEnemyStates(initialStatesData);
        setAreEnemiesLoaded(true);
        console.log(`[useEnemyLoader] ${loadedEnemyData.length} врагов обработано для уровня ${levelId} (Сложность: ${difficulty}).`);

        return () => {
            cleanupEnemies();
        };
    // Добавил setEnemyRefsArray в cleanupEnemies, так что здесь она уже не нужна явно,
    // но оставлю для ясности, что useEffect зависит от этой функции из useState.
    // BASE_ENEMY_STATS также важна, так как при её изменении (теоретически) нужно перезагружать врагов.
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