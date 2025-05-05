// src/hooks/useEnemyLoader.js (или /components/useEnemyLoader.js ?)
// ИСПРАВЛЕННАЯ ВЕРСИЯ с ЗАГЛУШКАМИ и МАСШТАБИРОВАНИЕМ

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'; // <<< НЕ НУЖЕН
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
    difficulty = 'normal'
) => {
    const [enemyRefs, setEnemyRefs] = useState([]);
    const [areEnemiesLoaded, setAreEnemiesLoaded] = useState(false);
    const [initialEnemyStates, setInitialEnemyStates] = useState([]);
    const internalRefs = useRef([]);

    // --- Общие ресурсы для хелсбаров ---
    const hpResources = useMemo(() => ({
         geometryBg: new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT),
         geometryFill: new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT),
         materialBg: new THREE.MeshBasicMaterial({ color: 0x333333, depthTest: false, depthWrite: false, transparent: true, opacity: 0.8 }),
         materialFill: new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false, depthWrite: false, transparent: true, opacity: 0.9 })
    }), []);
    // Очистка общих ресурсов
    useEffect(() => {
        return () => {
            hpResources.geometryBg.dispose(); hpResources.geometryFill.dispose();
            hpResources.materialBg.dispose(); hpResources.materialFill.dispose();
        };
    }, [hpResources]);
    // ------------------------------

    const cleanupEnemies = useCallback(() => {
        if (!scene) return;
        console.log(`[useEnemyLoader] Cleaning up ${internalRefs.current.length} enemies`);
        internalRefs.current.forEach(enemyRef => {
            if (enemyRef.pivot && scene.children.includes(enemyRef.pivot)) {
                scene.remove(enemyRef.pivot);
                enemyRef.pivot.traverse(object => {
                     if (object.geometry) object.geometry.dispose();
                     if (object.material && object.material !== hpResources.materialBg && object.material !== hpResources.materialFill) {
                         if (Array.isArray(object.material)) { object.material.forEach(material => material.dispose()); }
                         else { object.material.dispose(); }
                     }
                 });
            }
        });
        internalRefs.current = [];
        setEnemyRefs([]); // Сброс состояния наружу
        setInitialEnemyStates([]); // Сброс состояния наружу
    }, [scene, hpResources]);

    // --- Основной эффект создания врагов ---
    useEffect(() => {
        if (!scene || !enemiesData || !levelConfig || !levelId) {
            if (internalRefs.current.length > 0) cleanupEnemies();
            setAreEnemiesLoaded(true); // Считаем "загруженными"
            return;
        }
        console.log(`[useEnemyLoader] Effect RUNNING for level ${levelId}, difficulty ${difficulty}`);
        setAreEnemiesLoaded(false);
        cleanupEnemies(); // Очищаем старых

        const loadedEnemyData = [];
        const initialStatesData = [];
        const { gameWorldWidth, gameWorldHeight, WORLD_Y_OFFSET } = levelConfig;

        // --- Масштабирование статов ---
        const levelNumber = levelId % 100 || 1; // Номер уровня (минимум 1)
        const difficultyMultiplier = difficulty === 'hard' ? 2.0 : 1.0;
        const levelHpMultiplier = 1 + 0.15 * (levelNumber - 1);
        const levelDamageMultiplier = 1 + 0.10 * (levelNumber - 1);
        // --------------------------

        enemiesData.forEach((enemyData, index) => {
            if (!enemyData?.id || !enemyData.type || !enemyData.stats) {
                console.error("Invalid enemy data structure at index", index, enemyData);
                return;
            }

            // --- Масштабирование ---
            const baseStats = enemyData.stats;
            const scaledStats = { /* ... расчет scaledStats как в прошлом ответе ... */
                ...baseStats,
                hp: Math.max(1, Math.round((baseStats.hp || 10) * levelHpMultiplier * difficultyMultiplier)),
                damage: Math.max(1, Math.round((baseStats.damage || 1) * levelDamageMultiplier * difficultyMultiplier)),
                beamDamage: Math.max(1, Math.round((baseStats.beamDamage || 0) * levelDamageMultiplier * difficultyMultiplier)),
                dotDamage: Math.max(1, Math.round((baseStats.dotDamage || 0) * levelDamageMultiplier * difficultyMultiplier)),
                puddleDps: Math.max(1, Math.round((baseStats.puddleDps || 0) * levelDamageMultiplier * difficultyMultiplier)),
                // Копируем остальные статы, которые не масштабируем
                speed: baseStats.speed,
                attackRange: baseStats.attackRange,
                attackSpeed: baseStats.attackSpeed,
                summonType: baseStats.summonType,
                summonCount: baseStats.summonCount,
                summonCooldown: baseStats.summonCooldown,
                initialBlockCharges: baseStats.blockCharges,
                stackDamageBonus: baseStats.stackDamageBonus,
                // Добавь сюда другие статы, если нужно
            };
            // --- Конец масштабирования ---

            // --- Создание Pivot ---
            const pivot = new THREE.Group();
            pivot.name = `pivot_${enemyData.id}`;
            const startX = convertTiledX(enemyData.x || 0, 0, gameWorldWidth);
            const startY = convertTiledY(enemyData.y || 0, 0, gameWorldHeight, WORLD_Y_OFFSET);
            pivot.position.set(startX, startY, 0);

             // <<<--- ЛОГ ПЕРЕД СОЗДАНИЕМ ЗАГЛУШКИ --->>>
             console.log(`[useEnemyLoader] Creating placeholder for ${enemyData.id} (${enemyData.type}) at x:${startX.toFixed(1)}, y:${startY.toFixed(1)} with HP ${scaledStats.hp}`);

            // === СОЗДАНИЕ СФЕРЫ-ЗАГЛУШКИ ===
            const geometry = new THREE.SphereGeometry(15, 12, 8);
            let color = 0xaaaaaa;
             switch (enemyData.type) {
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
            mesh.name = enemyData.id + "_placeholder";
            mesh.position.y = 15; // Приподнимаем
            mesh.castShadow = true;
            pivot.add(mesh);
            // === КОНЕЦ СОЗДАНИЯ ЗАГЛУШКИ ===

            // --- Создание хелсбара ---
            const hpBarContainer = new THREE.Group(); hpBarContainer.name = `hpBar_${enemyData.id}`;
            const hpBgMesh = new THREE.Mesh(hpResources.geometryBg, hpResources.materialBg);
            const hpFillMesh = new THREE.Mesh(hpResources.geometryFill, hpResources.materialFill);
            hpFillMesh.position.z = 0.1; hpBarContainer.add(hpBgMesh); hpBarContainer.add(hpFillMesh);
            hpBarContainer.position.set(0, HEALTH_BAR_OFFSET_Y + 15, 1); // Над сферой
            hpBgMesh.renderOrder = 998; hpFillMesh.renderOrder = 999;
            pivot.add(hpBarContainer);
            // ---

            scene.add(pivot);

            // --- Сохранение данных врага ---
            const enemyRefData = {
                id: enemyData.id,
                type: enemyData.type,
                stats: scaledStats, // <<< Отмасштабированные статы
                pivot: pivot,
                mesh: mesh,         // <<< Ссылка на заглушку
                mixer: null, actions: {}, idleActionName: null, currentAction: null, // <<< Нет анимаций
                attackCooldown: Math.random() * 0.5, abilityCooldown: Math.random() * (scaledStats.summonCooldown || scaledStats.abilityCooldown || 5.0),
                isDead: false, hpBar: { container: hpBarContainer, bg: hpBgMesh, fill: hpFillMesh }, aiState: null,
                // Доп. поля для ИИ
                blockCharges: scaledStats.initialBlockCharges, // Используем из отмасштабированных статов
                damageStacks: 0, exploded: false, beamEffectMesh: null, beamEffectTimer: 0,
            };
            loadedEnemyData.push(enemyRefData);

            initialStatesData.push({
                id: enemyData.id,
                maxHp: scaledStats.hp, // Используем отмасштабированное HP
                currentHp: scaledStats.hp,
                isBoss: enemyData.type === 'boss'
            });
        }); // Конец forEach

        console.log(`[useEnemyLoader] Finished processing. Created ${loadedEnemyData.length} placeholders.`);
        console.log('[useEnemyLoader] Final enemyRefs:', loadedEnemyData.map(e=>({id:e.id, type:e.type}))); // Логируем только ID и тип
        console.log('[useEnemyLoader] Final initialStates:', initialStatesData);

        internalRefs.current = [...loadedEnemyData];
        setEnemyRefs(loadedEnemyData);
        setInitialEnemyStates(initialStatesData);
        setAreEnemiesLoaded(true); // <<< Устанавливаем флаг ПОСЛЕ создания врагов
        console.log(`✅ useEnemyLoader завершил создание ${loadedEnemyData.length} врагов-заглушек.`);

        return () => { cleanupEnemies(); };
    // Перезапускаем при смене этих данных
    }, [enemiesData, scene, levelConfig, levelId, difficulty, cleanupEnemies, hpResources]); // Зависимости


    return { enemyRefs, areEnemiesLoaded, initialEnemyStates };
};

export default useEnemyLoader;