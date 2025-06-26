// src/hooks/useEnemyLoader.js
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // <--- ДОБАВЛЕНО
import { convertTiledX, convertTiledY } from './utils'; // Убедитесь, что путь корректен

// --- Константы хелсбара ---
const HEALTH_BAR_WIDTH = 30;
const HEALTH_BAR_HEIGHT = 4;
const HEALTH_BAR_OFFSET_Y = 25;

// Загрузчик моделей
const modelLoader = new GLTFLoader();
// const textureLoader = new THREE.TextureLoader(); // Раскомментируйте, если понадобится для моделей

const useEnemyLoader = (
    enemiesDataFromLevelLayout, // Переименовано для ясности (это `levelData.enemies`)
    scene,
    levelConfig,
    levelId,
    difficulty = 'normal',
    ENTITY_CONFIG // <--- Теперь это наш главный справочник (ранее BASE_ENEMY_STATS)
) => {
    const [enemyRefsArray, setEnemyRefsArray] = useState([]);
    const [areEnemiesLoaded, setAreEnemiesLoaded] = useState(false);
    const [initialEnemyStates, setInitialEnemyStates] = useState([]);
    const internalRefs = useRef([]); // Для хранения ссылок на созданные объекты для последующей очистки

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

    // shieldResources может быть пересмотрен или удален, если все щиты управляются через visualEffects в ENTITY_CONFIG
    const shieldResources = useMemo(() => ({
        // Геометрия будет создаваться динамически в visualEffects, это может быть базовый материал
        material: new THREE.MeshBasicMaterial({
            color: 0xfacc15, // Цвет по умолчанию, может быть переопределен
            transparent: true,
            opacity: 0.35,    // Прозрачность по умолчанию
            side: THREE.FrontSide,
            depthWrite: false,
        })
    }), []);

    useEffect(() => {
        return () => {
            // Если shieldResources.geometry была бы общей, ее нужно было бы очищать здесь
            shieldResources.material.dispose();
        };
    }, [shieldResources]);


    const cleanupEnemies = useCallback(() => {
        if (!scene) return;
        console.log(`[useEnemyLoader] Cleanup: Removing ${internalRefs.current.length} enemy refs.`);
        internalRefs.current.forEach(enemyRef => {
            if (enemyRef.pivot) {
                scene.remove(enemyRef.pivot);
                // Очистка геометрий и материалов моделей, если они не общие
                enemyRef.pivot.traverse(object => {
                    if (object.geometry &&
                        object.geometry !== hpResources.geometryBg &&
                        object.geometry !== hpResources.geometryFill
                        // Проверка на другие общие ресурсы, если они есть
                    ) {
                        object.geometry.dispose();
                    }
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => {
                                if (material !== hpResources.materialBg &&
                                    material !== hpResources.materialFill &&
                                    material !== shieldResources.material // Если материал щита был клонирован, оригинальный все равно не должен удаляться здесь
                                    // Проверка на другие общие материалы
                                ) {
                                    material.dispose();
                                }
                                if (material.map) material.map.dispose();
                                // ... другие текстуры (normalMap, roughnessMap и т.д.)
                            });
                        } else {
                            if (object.material !== hpResources.materialBg &&
                                object.material !== hpResources.materialFill &&
                                object.material !== shieldResources.material
                            ) {
                                object.material.dispose();
                            }
                            if (object.material.map) object.material.map.dispose();
                            // ... другие текстуры
                        }
                    }
                });
            }
            // Очистка микшера, если он был создан
            if (enemyRef.mixer) {
                enemyRef.mixer.stopAllAction();
                // enemyRef.mixer = null; // Сам THREE.AnimationMixer не требует явного dispose,
                                       // но если бы мы кешировали анимации или клипы где-то еще, их надо было бы чистить
            }
        });
        internalRefs.current = [];
        setEnemyRefsArray([]);
        setInitialEnemyStates([]);
    }, [scene, hpResources, shieldResources]); // setEnemyRefsArray, setInitialEnemyStates не нужны как зависимости set-функций


    useEffect(() => {
        if (!scene || !enemiesDataFromLevelLayout || !levelConfig || !levelId || !ENTITY_CONFIG) {
            if (internalRefs.current.length > 0) cleanupEnemies();
            else {
                setEnemyRefsArray([]);
                setInitialEnemyStates([]);
            }
            setAreEnemiesLoaded(true); // Если нет данных, считаем "загрузку" завершенной (пустой)
            if (!ENTITY_CONFIG) console.warn("[useEnemyLoader] ENTITY_CONFIG не передан!");
            return;
        }

        setAreEnemiesLoaded(false);
        cleanupEnemies(); // Очищаем предыдущих врагов перед загрузкой новых

        const { gameWorldWidth, gameWorldHeight, WORLD_Y_OFFSET } = levelConfig;
        const levelNumber = parseInt(String(levelId).slice(-2), 10) || 1;

        const isHardMode = difficulty && difficulty.toLowerCase() === 'hard';
        const difficultyStatMultiplier = isHardMode ? (ENTITY_CONFIG.globalDifficultyMultipliers?.hard?.statMultiplier || 2.0) : 1.0;
        const difficultyHpMultiplier = isHardMode ? (ENTITY_CONFIG.globalDifficultyMultipliers?.hard?.hpMultiplier || 2.0) : 1.0;


        const enemyLoadPromises = enemiesDataFromLevelLayout.map(async (enemyInstanceData, index) => {
            if (!enemyInstanceData?.id || !enemyInstanceData.type) {
                console.error(`[useEnemyLoader] Некорректные данные для врага ${index} в level layout:`, enemyInstanceData);
                return null;
            }

            const enemyTypeKey = enemyInstanceData.type;
            const entityConfig = ENTITY_CONFIG[enemyTypeKey];

            if (!entityConfig) {
                console.error(`[useEnemyLoader] Конфигурация для типа "${enemyTypeKey}" (ID инстанса: ${enemyInstanceData.id}) не найдена в ENTITY_CONFIG.`);
                return null;
            }

            // 1. Расчет финальных статов
            const baseStatsFromConfig = { ...entityConfig.baseStats, ...(enemyInstanceData.statsOverrides || {}) };

            const currentLevelHpMultiplier = 1 + (entityConfig.scaling?.hpPerLevel || 0.15) * (levelNumber - 1);
            const currentLevelDamageMultiplier = 1 + (entityConfig.scaling?.damagePerLevel || 0.10) * (levelNumber - 1);
            
            const finalStats = { ...baseStatsFromConfig };
            finalStats.hp = Math.max(1, Math.round((baseStatsFromConfig.hp || 10) * currentLevelHpMultiplier * difficultyHpMultiplier));
            finalStats.maxHp = finalStats.hp;
            finalStats.damage = Math.max(1, Math.round((baseStatsFromConfig.damage || 1) * currentLevelDamageMultiplier * difficultyStatMultiplier));

            for (const key in baseStatsFromConfig) {
                if (key.toLowerCase().includes('damage') || key.toLowerCase().includes('dps') || key.toLowerCase().includes('heal')) {
                    if (typeof baseStatsFromConfig[key] === 'number' && !finalStats[key]) {
                       finalStats[key] = Math.max(baseStatsFromConfig[key] === 0 ? 0 : 1, Math.round(baseStatsFromConfig[key] * currentLevelDamageMultiplier * difficultyStatMultiplier));
                    }
                }
                if (!(key in finalStats)) { // Копируем остальные статы, не требующие умножения
                    finalStats[key] = baseStatsFromConfig[key];
                }
            }
            // Убедимся, что initialBlockCharges есть в finalStats, если они были в baseStatsFromConfig
            if (baseStatsFromConfig.initialBlockCharges !== undefined && finalStats.initialBlockCharges === undefined) {
                finalStats.initialBlockCharges = baseStatsFromConfig.initialBlockCharges;
            }


            // 2. Создание Pivot
            const pivot = new THREE.Group();
            pivot.name = `pivot_${enemyInstanceData.id}`;
            const startX = convertTiledX(enemyInstanceData.x || 0, 0, gameWorldWidth);
            const startY = convertTiledY(enemyInstanceData.y || 0, 0, gameWorldHeight, WORLD_Y_OFFSET);
            pivot.position.set(startX, startY, entityConfig.modelHeightOffset || 0);
            pivot.visible = enemyInstanceData.initiallyActive !== undefined ? enemyInstanceData.initiallyActive : true;


            // 3. Загрузка 3D Модели и Анимаций
            let modelMesh = null;
            let mixer = null;
            let actions = {};

            if (entityConfig.modelPath) {
                try {
                    const gltf = await modelLoader.loadAsync(entityConfig.modelPath);
                    modelMesh = gltf.scene;
                    modelMesh.name = `${enemyInstanceData.id}_model`;
                    
                    const scale = entityConfig.modelScale || 1.0;
                    modelMesh.scale.set(scale, scale, scale);
                    modelMesh.position.set(0, entityConfig.pivotOffsetY || 0, 0);

                    modelMesh.castShadow = true;
                    // modelMesh.receiveShadow = true; // Опционально, для крупных врагов может быть полезно
                    modelMesh.traverse(object => {
                        if (object.isMesh) object.castShadow = true;
                    });

                    pivot.add(modelMesh);

                    if (gltf.animations && gltf.animations.length > 0 && entityConfig.animations) {
                        mixer = new THREE.AnimationMixer(modelMesh);
                        for (const animKey in entityConfig.animations) {
                            const animName = entityConfig.animations[animKey];
                            const clip = THREE.AnimationClip.findByName(gltf.animations, animName);
                            if (clip) {
                                actions[animKey] = mixer.clipAction(clip);
                            } else {
                                console.warn(`[useEnemyLoader] Анимация "${animName}" (ключ: ${animKey}) не найдена в модели ${entityConfig.modelPath}`);
                            }
                        }
                        const defaultAnimation = entityConfig.animations.idle || entityConfig.animations.walk; // Пример
                        if (actions[entityConfig.defaultAnimationKey || 'idle'] ) {
                             actions[entityConfig.defaultAnimationKey || 'idle'].play();
                        } else if (Object.keys(actions).length > 0) {
                            actions[Object.keys(actions)[0]].play();
                        }
                    }
                } catch (error) {
                    console.error(`[useEnemyLoader] Ошибка загрузки модели ${entityConfig.modelPath} для ${enemyTypeKey}:`, error);
                    const placeholderGeo = new THREE.SphereGeometry(entityConfig.collisionSize?.width / 2 || 15, 12, 8);
                    const placeholderMat = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Красная сфера как ошибка
                    modelMesh = new THREE.Mesh(placeholderGeo, placeholderMat);
                    modelMesh.name = `${enemyInstanceData.id}_ERROR_placeholder`;
                    modelMesh.position.y = (entityConfig.collisionSize?.height / 2 || 15) + (entityConfig.pivotOffsetY || 0);
                    pivot.add(modelMesh);
                }
            } else {
                console.warn(`[useEnemyLoader] modelPath не указан для ${enemyTypeKey}. Создана заглушка.`);
                const placeholderGeo = new THREE.SphereGeometry(entityConfig.collisionSize?.width / 2 || 15, 12, 8);
                const placeholderMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
                modelMesh = new THREE.Mesh(placeholderGeo, placeholderMat);
                modelMesh.name = `${enemyInstanceData.id}_placeholder`;
                modelMesh.position.y = (entityConfig.collisionSize?.height / 2 || 15) + (entityConfig.pivotOffsetY || 0);
                pivot.add(modelMesh);
            }

            // 4. Создание HP Бара
            const hpBarContainer = new THREE.Group(); hpBarContainer.name = `hpBar_${enemyInstanceData.id}`;
            const hpBgMesh = new THREE.Mesh(hpResources.geometryBg, hpResources.materialBg.clone()); // Клонируем материал, если хотим менять его свойства независимо
            const hpFillMesh = new THREE.Mesh(hpResources.geometryFill, hpResources.materialFill.clone());
            hpFillMesh.position.z = 0.1; // Чтобы гарантированно отрисовался поверх фона
            hpBarContainer.add(hpBgMesh); hpBarContainer.add(hpFillMesh);
            
            const modelVisualHeight = entityConfig.modelVisualHeight || (entityConfig.collisionSize?.height || 30) * (entityConfig.modelScale || 1.0);
            const modelPivotOffsetY = entityConfig.pivotOffsetY || 0;
            hpBarContainer.position.set(0, modelPivotOffsetY + modelVisualHeight + HEALTH_BAR_OFFSET_Y, 1); // Z=1 чтобы быть ближе к камере, если есть проблемы с глубиной
            hpBgMesh.renderOrder = 998; hpFillMesh.renderOrder = 999; // Для корректной отрисовки UI элементов
            pivot.add(hpBarContainer);


            // 5. Создание Визуальных Эффектов Способностей
            const visualMeshes = {};
            if (entityConfig.visualEffects) {
                entityConfig.visualEffects.forEach(effectConf => {
                    let effectMeshInstance = null;
                    if (effectConf.type === 'shield_bubble' && shieldResources) {
                        const shieldMaterial = shieldResources.material.clone();
                        if(effectConf.params?.color) shieldMaterial.color.set(effectConf.params.color);
                        if(effectConf.params?.opacity) shieldMaterial.opacity = effectConf.params.opacity;

                        const shieldScale = effectConf.params?.scaleRelativeToModel
                            ? (entityConfig.collisionSize?.width || 30) * 0.5 * (effectConf.params.scaleMultiplier || 1.2)
                            : (effectConf.params?.radius || 19);
                        
                        const shieldGeometry = new THREE.SphereGeometry(shieldScale, 16, 12);
                        effectMeshInstance = new THREE.Mesh(shieldGeometry, shieldMaterial);
                        effectMeshInstance.position.copy(modelMesh.position); // Позиционируем относительно центра модели
                         // Видимость управляется логикой способности, например, по initialBlockCharges
                        effectMeshInstance.visible = effectConf.initiallyVisible || (effectConf.id === 'block_shield' && (finalStats.initialBlockCharges || 0) > 0) || false;
                    
                    } else if (effectConf.type === 'persistent_aura_vfx') {
                        const auraRadius = finalStats[effectConf.params.radiusPropertyFromStats] || effectConf.params.radius || 100;
                        // Можно использовать PlaneGeometry для круга на земле или SphereGeometry для объемной ауры
                        const auraGeometry = effectConf.params.onGround
                            ? new THREE.PlaneGeometry(auraRadius * 2, auraRadius * 2)
                            : new THREE.SphereGeometry(auraRadius, 32, 16);
                        
                        const auraMaterial = new THREE.MeshBasicMaterial({
                            color: new THREE.Color(effectConf.params.color || 0x9370DB),
                            transparent: true,
                            opacity: effectConf.params.opacity || 0.15,
                            depthWrite: false, // Чтобы не перекрывать другие прозрачные объекты некорректно
                            side: THREE.DoubleSide // Для PlaneGeometry особенно важно
                        });
                        effectMeshInstance = new THREE.Mesh(auraGeometry, auraMaterial);
                        effectMeshInstance.position.copy(modelMesh.position); // Позиционируем относительно центра модели
                        if (effectConf.params.onGround) {
                            effectMeshInstance.rotation.x = -Math.PI / 2; // Поворачиваем плоскость на землю
                            effectMeshInstance.position.y = modelMesh.position.y - (entityConfig.pivotOffsetY || 0) + (effectConf.params.groundOffset || 0.1); // Немного над землей
                        }
                        effectMeshInstance.visible = pivot.visible && (effectConf.initiallyVisible !== undefined ? effectConf.initiallyVisible : true);
                    }
                    // ... другие типы визуальных эффектов ...

                    if (effectMeshInstance) {
                        effectMeshInstance.name = effectConf.id || `${effectConf.type}_${enemyInstanceData.id}`;
                        pivot.add(effectMeshInstance);
                        visualMeshes[effectConf.id] = effectMeshInstance;
                    }
                });
            }


            // 6. Настройка Патрульных Точек
            let patrolPoints = null;
            let initialPatrolWaitTimer = 0;
            if (entityConfig.patrolConfig && entityConfig.patrolConfig.enabled) {
                const { type, radius, pointsArray, waitTimeMin = 1.5, waitTimeMax = 3.0 } = entityConfig.patrolConfig;
                const enemySpawnVec3 = new THREE.Vector3(startX, startY, entityConfig.modelHeightOffset || 0);

                if (type === 'square' && radius > 0) {
                    patrolPoints = [
                        enemySpawnVec3.clone().add(new THREE.Vector3(radius, 0, 0)), // Смещение по X, Y модели, а не по глобальным Y
                        enemySpawnVec3.clone().add(new THREE.Vector3(0, radius, 0)),
                        enemySpawnVec3.clone().add(new THREE.Vector3(-radius, 0, 0)),
                        enemySpawnVec3.clone().add(new THREE.Vector3(0, -radius, 0)),
                    ];
                } else if (type === 'line' && radius > 0) {
                     patrolPoints = [
                        enemySpawnVec3.clone().add(new THREE.Vector3(radius, 0, 0)),
                        enemySpawnVec3.clone().sub(new THREE.Vector3(radius, 0, 0)),
                    ];
                } else if ((type === 'explicit_tiled' || type === 'explicit_world') && pointsArray && pointsArray.length > 0) {
                    patrolPoints = pointsArray.map(p => {
                        if (type === 'explicit_tiled') {
                            return new THREE.Vector3(
                                convertTiledX(p.x, 0, gameWorldWidth),
                                convertTiledY(p.y, 0, gameWorldHeight, WORLD_Y_OFFSET),
                                p.z !== undefined ? p.z : (entityConfig.modelHeightOffset || 0)
                            );
                        }
                        return new THREE.Vector3(p.x, p.y, p.z !== undefined ? p.z : (entityConfig.modelHeightOffset || 0));
                    });
                }
                if (patrolPoints && patrolPoints.length > 0) {
                     initialPatrolWaitTimer = waitTimeMin + Math.random() * (waitTimeMax - waitTimeMin);
                }
            }

            // 7. Формирование `enemyRefData`
            const enemyRefData = {
                id: enemyInstanceData.id,
                type: enemyTypeKey,
                config: entityConfig,
                stats: finalStats,
                pivot: pivot,
                modelMesh: modelMesh,
                mixer: mixer,
                actions: actions,
                currentAnimation: entityConfig.defaultAnimationKey || (actions.idle ? 'idle' : (Object.keys(actions)[0] || null)),
                
                hpBar: { container: hpBarContainer, fill: hpFillMesh, bg: hpBgMesh }, // Добавил bg для полноты
                visualMeshes: visualMeshes,

                aiState: entityConfig.initialAiState || 'IDLE',
                aiBlackboard: {},
                abilityStates: {},
                currentPhaseId: entityConfig.initialPhaseId || (entityConfig.phases?.[0]?.id),

                currentHp: finalStats.hp,
                maxHp: finalStats.maxHp,
                blockCharges: finalStats.initialBlockCharges || 0, // Добавлено из старого кода, если нужно
                isDead: false,
                isActive: pivot.visible,
                roomId: enemyInstanceData.roomId || null,
                spawnPosition: pivot.position.clone(),

                attackCooldownTimer: (entityConfig.baseStats?.attackSpeed > 0)
                    ? (Math.random() * (1 / entityConfig.baseStats.attackSpeed)) // Начальный случайный кулдаун атаки
                    : (entityConfig.baseStats?.attackSpeed === 0 ? Infinity : 0), // Если attackSpeed = 0, то не атакует сам

                patrolPoints: patrolPoints,
                currentPatrolIndex: 0,
                patrolWaitTimer: initialPatrolWaitTimer,
                
                // Поля из старого enemyRefData, которые могут быть полезны или управляться через ENTITY_CONFIG
                // damageStacks: 0, // Если будет система стаков урона
                // exploded: false, // Для специфичных врагов
                // beamEffectMesh: null, // Если будет управляться через visualEffects
                // beamEffectTimer: 0,
            };
            
            if (entityConfig.abilities) {
                entityConfig.abilities.forEach(abilityConf => {
                    enemyRefData.abilityStates[abilityConf.id] = {
                        cooldownTimer: abilityConf.initialCooldownRandomness 
                            ? Math.random() * (abilityConf.cooldown || 0) 
                            : (abilityConf.cooldownBeforeFirstUse !== undefined ? abilityConf.cooldownBeforeFirstUse : (abilityConf.cooldown || 0)),
                        currentCharges: abilityConf.initialCharges !== undefined ? abilityConf.initialCharges : (abilityConf.charges || undefined),
                        isActive: abilityConf.initiallyActive || false,
                        // ... другие начальные состояния для способности ...
                    };
                });
            }

            scene.add(pivot);

            const initialStateEntry = {
                id: enemyInstanceData.id,
                type: enemyTypeKey,
                maxHp: finalStats.maxHp,
                currentHp: finalStats.hp,
                isBoss: entityConfig.isBoss || false,
                isMiniboss: entityConfig.isMiniboss || false, // Добавлено для консистентности
                isActive: enemyRefData.isActive,
                roomId: enemyRefData.roomId,
                initialBlockCharges: finalStats.initialBlockCharges || 0 // Из старого кода
            };

            return { enemyRef: enemyRefData, initialState: initialStateEntry };
        });

        Promise.all(enemyLoadPromises.filter(p => p !== null))
            .then(results => {
                const finalLoadedEnemyData = results.map(r => r.enemyRef);
                const finalInitialStatesData = results.map(r => r.initialState);

                internalRefs.current = [...finalLoadedEnemyData];
                setEnemyRefsArray(finalLoadedEnemyData);
                setInitialEnemyStates(finalInitialStatesData);
                setAreEnemiesLoaded(true);
                console.log(`[useEnemyLoader] ${finalLoadedEnemyData.length} врагов успешно ЗАГРУЖЕНО и создано для уровня ${levelId} (Сложность: ${difficulty}).`);
            })
            .catch(error => {
                console.error("[useEnemyLoader] Критическая ошибка при параллельной загрузке врагов:", error);
                internalRefs.current = [];
                setEnemyRefsArray([]);
                setInitialEnemyStates([]);
                setAreEnemiesLoaded(true); // Уровень загрузится, но без врагов (или с частичными ошибками)
            });

        return () => {
            cleanupEnemies();
        };
    }, [
        enemiesDataFromLevelLayout, scene, levelConfig, levelId, difficulty, ENTITY_CONFIG,
        cleanupEnemies, hpResources, shieldResources // shieldResources может быть удален из зависимостей, если он больше не влияет на рендер или логику напрямую
    ]);

    return {
        enemyRefs: enemyRefsArray,
        setEnemyRefs: setEnemyRefsArray, // Обычно не требуется извне, но оставлено для совместимости, если было нужно
        areEnemiesLoaded,
        initialEnemyStates,
        // hpResources и shieldResources можно не возвращать, если они используются только внутри хука
    };
};

export default useEnemyLoader;