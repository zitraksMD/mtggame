// src/data/entityConfig.js
// или src/data/entities.js

export const ENTITY_CONFIG = {


    "necropolis_bone_guardian": {
        id: "necropolis_bone_guardian",
        name: "Костяной Страж",
        zone: "necropolis_raatken",
        modelPath: "/Models/enemies/necropolis/bone_guardian.glb",
        typeForAI: "melee_chaser_basic",
        collisionSize: { width: 30, height: 30, depth: 30 },
        modelScale: 1.0,
        modelHeightOffset: 0, 
        animations: { idle: "Idle", walk: "Walk", attack: "Attack1", death: "Death" },
        baseStats: {
            hp: 100000, damage: 8, speed: 100.0, attackRange: 35, attackSpeed: 1.0, 
            aggroRadius: 200, visionAngle: 120, xpValue: 10,
            armor: 5, 
        },
        abilities: [],
    },
    "necropolis_resurrected_archer": {
        id: "necropolis_resurrected_archer",
        name: "Воскрешённый Лучник",
        zone: "necropolis_raatken",
        modelPath: "/Models/enemies/necropolis/resurrected_archer.glb",
        typeForAI: "ranged_sentry_reset", 
        collisionSize: { width: 30, height: 30, depth: 30 },
        modelScale: 1.0,
        modelHeightOffset: 0,
        animations: { idle: "Idle", walk: "Walk", attack: "Attack_Bow", death: "Death" },
        baseStats: {
            hp: 40, damage: 10, speed: 150.0, attackRange: 300, attackSpeed: 0.8,
            projectileType: "arrow_bone", projectileSpeed: 350,
            aggroRadius: 350, visionAngle: 140, xpValue: 12,
        },
        abilities: [ 
        {
          "id": "ability_archer_shoot_arrow", 
          "type": "attack_ranged_projectile", 
          "trigger": {"type": "on_attack_command"}, 

          "params": { 
            "projectileTypeFromStat": "projectileType",
            "damageFromStat": "damage",            
            "speedFromStat": "projectileSpeed",     
            "projectileCount": 1,
            "spreadAngle": 0,
            "lifetime": 10.0 
          },
          "animationName": "Attack_Bow" 
        }
    ],
    basicRangedAttackAbilityId: "ability_archer_shoot_arrow", // <--- ДОБАВЬ ЭТО ПОЛЕ, чтобы AI знал, какую абилку использовать по умолчанию
    patrolConfig: { enabled: true, type: "points_random", radius: 150, points: [], waitTime: 2.0 }
},
    "necropolis_ethereal_devourer": {
        id: "necropolis_ethereal_devourer",
        name: "Призрачный Поглотитель",
        zone: "necropolis_raatken",
        modelPath: "/Models/enemies/necropolis/ethereal_devourer.glb",
        typeForAI: "melee_lifesteal_chaser", // AI должен будет вызывать lifesteal способность
        collisionSize: { width: 35, height: 35, depth: 35 },
        modelScale: 1.1,
        modelHeightOffset: 0,
        animations: { idle: "Idle_Float", walk: "Walk_Float", attack: "Attack_Claw", death: "Death_Dissolve" },
        baseStats: {
            hp: 70, damage: 12, speed: 2.2, attackRange: 40, attackSpeed: 0.9,
            aggroRadius: 220, visionAngle: 120, xpValue: 15,
        },
        abilities: [
            {
                id: "ability_lifesteal_on_hit",
                type: "passive_on_hit",
                trigger: { type: "on_deal_damage", attackType: "melee" }, // Срабатывает при нанесении урона атакой
                params: {
                    healPercentOfDamageDealt: 0.30, // 30% от нанесенного урона в здоровье
                },
                vfx: { onHitTarget: "vfx_lifesteal_impact", onCaster: "vfx_lifesteal_heal_pulse" }
            }
        ],
    },
    "necropolis_raatken_necromancer": {
        id: "necropolis_raatken_necromancer",
        name: "Некромант Раат’Кена",
        zone: "necropolis_raatken",
        modelPath: "/Models/enemies/necropolis/raatken_necromancer.glb",
        typeForAI: "ranged_caster_stationary", // Может быть стационарным или медленно двигаться
        collisionSize: { width: 30, height: 40, depth: 30 },
        modelScale: 1.0,
        modelHeightOffset: 0,
        animations: { idle: "Idle_Staff", walk: "Walk_Staff", attack: "Cast_Skull", death: "Death" },
        baseStats: {
            hp: 50, damage: 15, speed: 1.0, attackRange: 280, attackSpeed: 0.7,
            projectileType: "projectile_skull_animated", projectileSpeed: 300,
            aggroRadius: 300, visionAngle: 130, xpValue: 18,
        },
        abilities: [
            { // Обычная атака стрельбы черепами уже заложена в baseStats и typeForAI
                id: "ability_shoot_skull_projectile",
                type: "attack_ranged_projectile",
                trigger: { type: "on_attack_command" }, // AI решает когда атаковать
                cooldown: 1.0 / 0.7, // attackSpeed
                params: {
                    projectileType: "projectile_skull_animated",
                    damage: 15, // Берется из baseStats.damage
                    speed: 300,  // Берется из baseStats.projectileSpeed
                },
                animationName: "Cast_Skull"
            }
        ],
    },
    "necropolis_fetid_blightspawn": {
        id: "necropolis_fetid_blightspawn",
        name: "Зловонный Сквернород",
        zone: "necropolis_raatken",
        modelPath: "/Models/enemies/necropolis/fetid_blightspawn.glb",
        typeForAI: "melee_slow_exploding",
        collisionSize: { width: 40, height: 40, depth: 40 },
        modelScale: 1.2,
        modelHeightOffset: 0,
        animations: { idle: "Idle_Heavy", walk: "Walk_Heavy", death: "Death_Explode_Poison" },
        baseStats: {
            hp: 100, damage: 10, speed: 1.2, attackRange: 45, attackSpeed: 0.5, // Может и не атаковать, а просто взрываться
            aggroRadius: 180, visionAngle: 120, xpValue: 20,
        },
        abilities: [
            {
                id: "ability_poison_cloud_on_death",
                type: "on_death_effect",
                trigger: { type: "on_death" },
                params: {
                    effectType: "create_aoe_dot",
                    aoeType: "poison_cloud", // Для выбора VFX и логики
                    radius: 80,
                    duration: 10, // секунд
                    dps: 5,       // урона в секунду
                },
                animationNameOnDeath: "Death_Explode_Poison"
            }
        ],
    },
    "necropolis_fallen_gladiator": {
        id: "necropolis_fallen_gladiator",
        name: "Погибший Гладиатор",
        zone: "necropolis_raatken",
        modelPath: "/Models/enemies/necropolis/fallen_gladiator.glb",
        typeForAI: "melee_enraging_chaser",
        collisionSize: { width: 35, height: 35, depth: 35 },
        modelScale: 1.1,
        modelHeightOffset: 0,
        animations: { idle: "Idle_Armed", walk: "Walk_Armed", attack: "Attack_Heavy", death: "Death", enrage: "Enrage_Buff" },
        baseStats: {
            hp: 80, damage: 12, speed: 2.1, attackRange: 40, attackSpeed: 0.9,
            aggroRadius: 250, visionAngle: 120, xpValue: 22,
        },
        abilities: [
            {
                id: "ability_enrage_on_low_hp",
                type: "passive_buff_on_condition",
                trigger: { type: "on_hp_percent_threshold", threshold: 0.4, once: true }, // Сработает 1 раз на 40% HP
                params: {
                    buffs: [
                        { stat: "damageMultiplier", value: 1.5, duration: 999 }, // Увеличить урон в 1.5 раза
                        { stat: "attackSpeedMultiplier", value: 1.2, duration: 999 }, // Увеличить скорость атаки
                    ],
                    vfxOnCaster: "vfx_enrage_burst_red",
                },
                animationName: "Enrage_Buff"
            }
        ],
    },
    "necropolis_corpsefiend_tank": {
        id: "necropolis_corpsefiend_tank",
        name: "Трупный Танк",
        zone: "necropolis_raatken",
        modelPath: "/Models/enemies/necropolis/corpsefiend_tank.glb",
        typeForAI: "melee_heavy_blocker",
        collisionSize: { width: 45, height: 45, depth: 45 },
        modelScale: 1.3,
        modelHeightOffset: 0,
        animations: { idle: "Idle_Big", walk: "Walk_Big", attack: "Attack_Slam", death: "Death_Collapse", block: "Block_Impact" },
        baseStats: {
            hp: 150, damage: 10, speed: 1.0, attackRange: 50, attackSpeed: 0.6,
            aggroRadius: 150, visionAngle: 120, xpValue: 25, armor: 20,
        },
        abilities: [
            {
                id: "ability_block_initial_hits",
                type: "defensive_charges",
                chargesStatName: "blockCharges", // Имя стата в enemyRef.abilityStates для хранения зарядов
                initialCharges: 2,
                onBlockEffect: { // Что происходит при успешном блоке
                    vfx: "vfx_shield_impact_stone",
                    sfx: "sfx_stone_block",
                    animation: "Block_Impact" // Анимация блока
                },
                // Визуальный эффект щита можно добавить через visualEffects
            }
        ],
        visualEffects: [
            {
                id: "corpse_tank_shield_visual",
                type: "temporary_shield_vfx", // Отображается пока есть заряды
                linkedAbilityId: "ability_block_initial_hits", // Связь с абилкой
                params: { color: "0x888888", opacity: 0.3 }
            }
        ]
    },
    "necropolis_creaking_gravedigger": {
        id: "necropolis_creaking_gravedigger",
        name: "Скрипящий Могильник",
        zone: "necropolis_raatken",
        modelPath: "/Models/enemies/necropolis/creaking_gravedigger.glb",
        typeForAI: "melee_summoner_on_death",
        collisionSize: { width: 30, height: 35, depth: 30 },
        modelScale: 1.0,
        modelHeightOffset: 0,
        animations: { idle: "Idle_Shovel", walk: "Walk_Shovel", attack: "Attack_Shovel", death: "Death_Summon" },
        baseStats: {
            hp: 70, damage: 9, speed: 1.8, attackRange: 35, attackSpeed: 0.8,
            aggroRadius: 200, visionAngle: 120, xpValue: 18,
        },
        abilities: [
            {
                id: "ability_summon_skeletons_on_death",
                type: "on_death_effect",
                trigger: { type: "on_death" },
                params: {
                    effectType: "summon_creatures",
                    creatures: [
                        { typeId: "necropolis_bone_guardian_weak", count: 2 } // Можно создать "слабую" версию стража
                    ],
                    spawnPattern: "around_caster",
                    spawnRadius: 50,
                },
                animationNameOnDeath: "Death_Summon"
            }
        ],
    },
    "necropolis_rotting_predator": {
        id: "necropolis_rotting_predator",
        name: "Гниющий Хищник",
        zone: "necropolis_raatken",
        modelPath: "/Models/enemies/necropolis/rotting_predator.glb",
        typeForAI: "melee_dasher_basic", // AI должен управлять рывком
        collisionSize: { width: 35, height: 30, depth: 40 }, // Может быть более вытянутым
        modelScale: 1.0,
        modelHeightOffset: 0,
        animations: { idle: "Idle_Predator", walk: "Run_Predator", attack: "Attack_Bite", death: "Death", dash: "Dash_Forward" },
        baseStats: {
            hp: 60, damage: 12, speed: 2.5, // Обычная скорость
            attackRange: 30, attackSpeed: 1.0,
            aggroRadius: 280, visionAngle: 130, xpValue: 20,
        },
        abilities: [
            {
                id: "ability_dash_attack",
                type: "movement_attack",
                trigger: { type: "on_ai_command", command: "dash_attack" }, // AI решает когда делать рывок
                cooldown: 5.0, // секунд
                params: {
                    dashSpeedMultiplier: 2.5, // Умножается на baseStats.speed
                    dashDistance: 200,
                    damageMultiplierDuringDash: 1.0, // Урон такой же, как от обычной атаки
                    canPassThroughEnemies: false,
                    stopOnTargetHit: true,
                },
                animationName: "Dash_Forward",
                vfx: { trail: "vfx_rotting_dash_trail" }
            }
        ],
    },

    // --- Мини-босс Некрополя ---
    "necropolis_raatken_lich_miniboss": {
        id: "necropolis_raatken_lich_miniboss",
        name: "Лич Раат’Кен (мини-босс)",
        zone: "necropolis_raatken",
        isMiniboss: true,
        modelPath: "/Models/minibosses/necropolis/raatken_lich.glb",
        typeForAI: "miniboss_lich_raatken_caster", // Уникальный AI
        collisionSize: { width: 40, height: 45, depth: 40 },
        modelScale: 1.2,
        modelHeightOffset: 0,
        animations: { idle: "Idle_Floating", walk: "Move_Floating", attack: "Cast_EtherealVolley", death: "Death_Fade", teleport: "Teleport_Out", summon: "Cast_Summon" },
        baseStats: {
            hp: 450, damage: 20, speed: 1.8, attackRange: 350, attackSpeed: 0.6, // Атака эфирными залпами
            projectileType: "projectile_ethereal_bolt", projectileSpeed: 400,
            aggroRadius: 400, visionAngle: 180, xpValue: 100, armor: 10,
        },
        abilities: [
            { // Атака залпами
                id: "ability_ethereal_volley_cast",
                type: "attack_ranged_projectile_multi",
                trigger: { type: "on_ai_command", command: "attack_volley" },
                cooldown: 3.0,
                params: {
                    projectileType: "projectile_ethereal_bolt",
                    projectileCount: 3,
                    spreadAngle: 20, // Угол разброса снарядов
                    damagePerProjectile: 18, // Урон может отличаться от базового
                    speed: 400,
                },
                animationName: "Cast_EtherealVolley"
            },
            {
                id: "ability_teleport_random_medium_range",
                type: "movement_teleport",
                trigger: { type: "on_timer_or_condition", timer: 10.0, condition: "player_too_close" }, // Например, каждые 10 сек или если игрок близко
                cooldown: 8.0, // Общий кулдаун после использования
                params: {
                    rangeMin: 150,
                    rangeMax: 300,
                    targetPreference: "away_from_player", // или "random_spot"
                    allowNearPlayer: false, // Не телепортироваться слишком близко к игроку
                },
                animationName: "Teleport_Out", // Анимация исчезновения/появления
                vfx: { teleportOut: "vfx_lich_teleport_out", teleportIn: "vfx_lich_teleport_in" }
            },
            {
                id: "ability_summon_skeletons_basic",
                type: "summon_creatures",
                trigger: { type: "on_timer", timer: 15.0 }, // Каждые 15 секунд
                cooldown: 15.0,
                params: {
                    creatures: [
                        { typeId: "necropolis_bone_guardian", count: 2 } // Призывает 2 обычных стража
                    ],
                    spawnPattern: "near_caster",
                    spawnRadius: 80,
                },
                animationName: "Cast_Summon"
            }
        ],
    },

    // --- Боссы Некрополя ---
    "necropolis_guardian_sah_ten_boss": {
        id: "necropolis_guardian_sah_ten_boss",
        name: "Страж Гробницы Сах’Тен",
        zone: "necropolis_raatken",
        isBoss: true,
        modelPath: "/Models/bosses/necropolis/guardian_sah_ten.glb",
        typeForAI: "boss_guardian_sah_ten", // Уникальный AI
        collisionSize: { width: 60, height: 70, depth: 60 },
        modelScale: 1.8,
        modelHeightOffset: 0,
        animations: { idle: "Idle_Guardian", walk: "Walk_Guardian", attack: "Attack_HeavySlam", death: "Death_Crumble", block_stance: "Block_Stance", summon: "Roar_Summon" },
        baseStats: {
            hp: 1200, damage: 25, speed: 1.5, attackRange: 60, attackSpeed: 0.7,
            aggroRadius: 1000, visionAngle: 360, xpValue: 200, armor: 30,
        },
        abilities: [
            { // Щит Гробницы
                id: "ability_tomb_shield_charges",
                type: "defensive_charges_ignore_damage", // Полностью игнорирует урон
                chargesStatName: "tombShieldCharges",
                initialCharges: 3,
                onBlockEffect: { vfx: "vfx_tomb_shield_impact", sfx: "sfx_tomb_shield_deflect" },
                onChargesDepleted: { vfx: "vfx_tomb_shield_break", sfx: "sfx_tomb_shield_shatter" },
                // Визуальный эффект самого щита
                visualEffectId: "visual_tomb_shield_active"
            },
            { // Призыв скелетов
                id: "ability_summon_skeletons_sah_ten",
                type: "summon_creatures",
                trigger: { type: "on_hp_percent_threshold", threshold: 0.5, once: true },
                cooldown: 99999, // Сработает один раз
                params: {
                    creatures: [ { typeId: "necropolis_bone_guardian", count: 3 } ],
                    spawnPattern: "arena_points_preset", // или "around_caster"
                    spawnRadius: 150,
                },
                animationName: "Roar_Summon"
            }
        ],
        visualEffects: [
            {
                id: "visual_tomb_shield_active",
                type: "persistent_shield_vfx", // Отображается, пока есть заряды у 'ability_tomb_shield_charges'
                linkedAbilityId: "ability_tomb_shield_charges",
                params: { color: "0xA0A0FF", opacity: 0.4, pulsate: true }
            }
        ]
    },
    "necropolis_prophet_el_miras_boss": {
        id: "necropolis_prophet_el_miras_boss",
        name: "Мертвый Прорицатель Эл’Мирас",
        zone: "necropolis_raatken",
        isBoss: true,
        modelPath: "/Models/bosses/necropolis/prophet_el_miras.glb",
        typeForAI: "boss_prophet_el_miras",
        collisionSize: { width: 50, height: 60, depth: 50 },
        modelScale: 1.6,
        modelHeightOffset: 0,
        animations: { idle: "Idle_Seer", walk: "Walk_Seer", cast_eclipse: "Cast_Eclipse", cast_summon_shadows: "Cast_SummonShadows", attack_ranged: "Attack_ShadowBolt", death: "Death_Fade" },
        baseStats: {
            hp: 1000, damage: 22, speed: 1.2, attackRange: 300, attackSpeed: 0.8,
            projectileType: "shadow_bolt", projectileSpeed: 380,
            aggroRadius: 1000, visionAngle: 360, xpValue: 220, armor: 15,
        },
        abilities: [
            { // Затмение
                id: "ability_eclipse_screen_obscure",
                type: "player_debuff_global",
                trigger: { type: "on_timer", timer: 20.0 }, // Каждые 20 секунд
                cooldown: 20.0,
                params: {
                    debuffType: "screen_dim",
                    duration: 2.0, // секунды
                    intensity: 0.7, // 70% затемнения
                },
                animationName: "Cast_Eclipse",
                vfx: { globalScreenEffect: "vfx_eclipse_overlay" }
            },
            { // Призыв теней-стрелков
                id: "ability_summon_shadow_archers_el_miras",
                type: "summon_creatures",
                trigger: { type: "on_hp_percent_threshold", threshold: 0.4, once: true },
                cooldown: 99999,
                params: {
                    creatures: [ { typeId: "necropolis_shadow_archer_elite", count: 2 } ], // Нужен новый тип "теневой лучник"
                    spawnPattern: "flanking_player",
                },
                animationName: "Cast_SummonShadows"
            },
            { // Обычная атака (если не основная)
                id: "ability_shoot_shadow_bolt",
                type: "attack_ranged_projectile",
                trigger: { type: "on_attack_command" },
                cooldown: 1.0 / 0.8, // attackSpeed
                params: { projectileType: "shadow_bolt", damage: 22, speed: 380},
                animationName: "Attack_ShadowBolt"
            }
        ]
    },
     "necropolis_shadow_archer_elite": { // Пример для призываемого юнита
        id: "necropolis_shadow_archer_elite",
        name: "Тень-Стрелок",
        zone: "necropolis_raatken",
        modelPath: "/Models/enemies/necropolis/shadow_archer.glb", // Нужна модель
        typeForAI: "ranged_stationary_quickshot",
        collisionSize: { width: 30, height: 30, depth: 30 },
        modelScale: 1.0,
        baseStats: { hp: 80, damage: 18, attackRange: 350, attackSpeed: 1.2, projectileType: "shadow_arrow", projectileSpeed: 450, xpValue: 0 /* не дает опыта отдельно */},
        abilities: [],
        lifeSpan: 30.0 // Может исчезать через время
    },
    "necropolis_hovering_skull_un_ktar_boss": {
        id: "necropolis_hovering_skull_un_ktar_boss",
        name: "Парящий Череп Ун’Ктар",
        zone: "necropolis_raatken",
        isBoss: true,
        modelPath: "/Models/bosses/necropolis/hovering_skull_un_ktar.glb",
        typeForAI: "boss_hovering_skull_un_ktar", // Летающий, стреляющий
        collisionSize: { width: 70, height: 70, depth: 70 }, // Большой череп
        modelScale: 2.0,
        modelHeightOffset: 100, // Парит высоко
        animations: { idle: "Idle_Hover", attack_skull_shot: "Attack_SkullShot", attack_power_beam: "Attack_PowerBeam", death: "Death_Explode" },
        baseStats: {
            hp: 1500, damage: 0, speed: 2.5, // Урон через способности
            aggroRadius: 1000, visionAngle: 360, xpValue: 250, armor: 10, isFlying: true,
        },
        abilities: [
            { // Стрельба черепами (основная атака)
                id: "ability_shoot_skull_projectiles_un_ktar",
                type: "attack_ranged_projectile_multi",
                trigger: { type: "on_attack_command" },
                cooldown: 2.0,
                params: {
                    projectileType: "projectile_bouncing_skull", // Черепа могут отскакивать или просто снаряды
                    projectileCount: 3,
                    spreadAngle: 30,
                    damagePerProjectile: 15,
                    speed: 300,
                },
                animationName: "Attack_SkullShot"
            },
            { // Мощный снаряд по прямой
                id: "ability_power_linear_projectile_un_ktar",
                type: "attack_ranged_linear_beam", // или очень большой снаряд
                trigger: { type: "on_timer", timer: 10.0 },
                cooldown: 10.0,
                params: {
                    beamType: "unholy_energy_beam",
                    damage: 40,
                    chargeTime: 1.5, // Время на подготовку
                    beamWidth: 50,
                    beamDuration: 1.0, // Если это луч, а не мгновенный снаряд
                    vfxCharge: "vfx_un_ktar_beam_charge",
                    vfxBeam: "vfx_un_ktar_beam_fire",
                },
                animationName: "Attack_PowerBeam"
            }
        ]
    },
    "necropolis_chanting_ort_viya_boss": {
        id: "necropolis_chanting_ort_viya_boss",
        name: "Певчая Могил Орт’Вия",
        zone: "necropolis_raatken",
        isBoss: true,
        modelPath: "/Models/bosses/necropolis/chanting_ort_viya.glb",
        typeForAI: "boss_chanting_ort_viya_caster_summoner",
        collisionSize: { width: 45, height: 55, depth: 45 },
        modelScale: 1.5,
        animations: { idle: "Idle_Chanting", walk: "Walk_Graceful", cast_slow_aura: "Cast_DebuffAura", cast_summon_song: "Cast_SummonSong", death: "Death_Silent" },
        baseStats: {
            hp: 1300, damage: 18, speed: 1.3, attackRange: 320, attackSpeed: 0.9, // Может атаковать базовыми снарядами
            projectileType: "sound_wave_projectile", projectileSpeed: 300,
            aggroRadius: 1000, visionAngle: 360, xpValue: 280, armor: 10,
        },
        abilities: [
            { // Замедление игрока после 5 попаданий
                id: "ability_apply_slow_on_hit_stacking_ort_viya",
                type: "passive_on_hit_apply_debuff_stacking",
                trigger: { type: "on_deal_damage_to_player_with_type", attackOrAbilityId: "basic_attack_ort_viya" }, // Срабатывает от ее базовых атак
                params: {
                    debuffType: "movement_slow_stacking",
                    maxStacks: 5,
                    slowPerStack: 0.1, // 10% замедления за стак
                    durationPerStack: 3.0, // Длительность стака или всего дебаффа
                    targetDebuffId: "ort_viya_slow_debuff", // Уникальный ID для дебаффа на игроке
                },
                // Базовая атака должна быть определена, например, как способность или в AI
            },
            { // Песнь призывает 3 скелета
                id: "ability_summon_skeletons_song_ort_viya",
                type: "summon_creatures",
                trigger: { type: "on_timer_or_condition", timer: 25.0 }, // Каждые 25 сек
                cooldown: 25.0,
                params: {
                    creatures: [ { typeId: "necropolis_bone_guardian_weak", count: 3 } ],
                    spawnPattern: "triangle_around_caster",
                    spawnRadius: 120,
                },
                animationName: "Cast_SummonSong",
                sfx: "sfx_ort_viya_summon_chant"
            }
        ]
    },
    "necropolis_cursed_priestess_sel_rass_boss": {
        id: "necropolis_cursed_priestess_sel_rass_boss",
        name: "Проклятая Жрица Сел’Расс",
        zone: "necropolis_raatken",
        isBoss: true,
        modelPath: "/Models/bosses/necropolis/cursed_priestess_sel_rass.glb",
        typeForAI: "boss_priestess_sel_rass_summoner_healer",
        collisionSize: { width: 50, height: 60, depth: 50 },
        modelScale: 1.6,
        animations: { idle: "Idle_Priestess", walk: "Walk_Priestess", cast_summon_cultists: "Cast_SummonCultists", cast_self_heal_buff: "Cast_HealBuff", death: "Death_Corrupt" },
        baseStats: {
            hp: 1600, damage: 20, speed: 1.4, attackRange: 300, attackSpeed: 0.7, // Может атаковать проклятиями
            projectileType: "curse_bolt", projectileSpeed: 330,
            aggroRadius: 1000, visionAngle: 360, xpValue: 320, armor: 12,
        },
        abilities: [
            { // Призыв 2 культистов
                id: "ability_summon_cultists_sel_rass",
                type: "summon_creatures",
                trigger: { type: "on_timer_or_condition", timer: 30.0, condition: "no_active_cultists" },
                cooldown: 30.0,
                params: {
                    creatures: [ { typeId: "necropolis_poison_cultist_minion", count: 2 } ], // Нужен тип "культист-миньон"
                    spawnPattern: "flanking_caster",
                },
                animationName: "Cast_SummonCultists"
            },
            { // Лечение себя и усиление урона после гибели культистов
                id: "ability_heal_buff_on_cultist_death_sel_rass",
                type: "passive_on_ally_death_buff_self", // Сложный триггер
                trigger: { type: "on_ally_death", allyTypeId: "necropolis_poison_cultist_minion" }, // Срабатывает, когда умирает ее культист
                params: {
                    healAmountStatic: 200, // Лечит на фиксированное значение
                    buffs: [
                        { stat: "damageMultiplier", value: 1.2, duration: 15.0 } // +20% урона на 15 сек
                    ],
                    maxStacks: 2, // Если может стакаться от двух культистов
                },
                animationName: "Cast_HealBuff", // Анимация при получении баффа
                vfx: { onCaster: "vfx_sel_rass_heal_buff_pulse" }
            }
        ]
    },
    "necropolis_poison_cultist_minion": { // Миньон для Сел'Расс
        id: "necropolis_poison_cultist_minion",
        name: "Культист Сел'Расс",
        zone: "necropolis_raatken",
        modelPath: "/Models/enemies/necropolis/poison_cultist_minion.glb", // Нужна модель
        typeForAI: "melee_chaser_exploding_poison",
        collisionSize: { width: 25, height: 30, depth: 25 },
        baseStats: { hp: 100, damage: 10, speed: 2.0, attackRange: 30, attackSpeed: 1.0, xpValue: 0 },
        abilities: [
            {
                id: "ability_poison_explosion_on_death_cultist",
                type: "on_death_effect",
                trigger: { type: "on_death" },
                params: {
                    effectType: "create_aoe_dot_explosion", // Взрыв + ядовитое облако
                    aoeType: "poison_burst_cloud",
                    explosionDamage: 20, // Мгновенный урон от взрыва
                    explosionRadius: 60,
                    cloudRadius: 70,
                    cloudDuration: 8,
                    cloudDps: 4,
                }
            }
        ]
    },
    "necropolis_decaying_titan_k_grot_boss": {
        id: "necropolis_decaying_titan_k_grot_boss",
        name: "Разлагающийся Титан К’Грот",
        zone: "necropolis_raatken",
        isBoss: true,
        modelPath: "/Models/bosses/necropolis/decaying_titan_k_grot.glb",
        typeForAI: "boss_titan_k_grot_heavy_hitter",
        collisionSize: { width: 80, height: 90, depth: 80 }, // Очень большой
        modelScale: 2.5,
        animations: { idle: "Idle_Titan", walk: "Walk_Lumbering", attack_slam: "Attack_GroundSlam", attack_sweep: "Attack_ArmSweep", enrage_roar: "Roar_Enrage", death: "Death_Fall", periodic_shield: "Activate_StoneSkin" },
        baseStats: {
            hp: 2500, damage: 35, speed: 0.8, attackRange: 80, attackSpeed: 0.5, // Медленные, но сильные атаки
            aggroRadius: 1000, visionAngle: 360, xpValue: 380, armor: 40,
        },
        abilities: [
            { // Игнорирует урон каждые 5 сек
                id: "ability_periodic_invulnerability_k_grot",
                type: "defensive_periodic_buff",
                trigger: { type: "on_timer_repeating", timer: 8.0 }, // Каждые 8 секунд (5 сек кулдаун + 3 сек длительность щита, например)
                cooldown: 8.0,
                params: {
                    buffType: "invulnerability", // или "damage_immunity"
                    duration: 3.0, // Длительность иммунитета - 3 секунды, например
                    // Если "игнорирует урон", то это может быть очень высокий % резиста или полный иммунитет
                    // damageResistancePercent: 1.0, // 100% сопротивление урону
                },
                animationName: "Activate_StoneSkin",
                vfx: { onCasterLoop: "vfx_k_grot_stone_skin_active", onCasterEnd: "vfx_k_grot_stone_skin_fade" }
            },
            { // Бешенство на 30% HP
                id: "ability_frenzy_on_low_hp_k_grot",
                type: "passive_buff_on_condition",
                trigger: { type: "on_hp_percent_threshold", threshold: 0.3, once: true },
                params: {
                    buffs: [
                        { stat: "damageMultiplier", value: 1.4, duration: 999 },
                        { stat: "speedMultiplier", value: 1.3, duration: 999 },
                        { stat: "attackSpeedMultiplier", value: 1.2, duration: 999 },
                    ],
                    vfxOnCaster: "vfx_k_grot_frenzy_aura",
                },
                animationName: "Roar_Enrage"
            },
            // Добавить АоЕ атаки, если нужны (например, Attack_GroundSlam)
        ]
    },
    "necropolis_necrochanter_til_ksor_boss": {
        id: "necropolis_necrochanter_til_ksor_boss",
        name: "Некрораспеватель Тил’Ксор",
        zone: "necropolis_raatken",
        isBoss: true,
        modelPath: "/Models/bosses/necropolis/necrochanter_til_ksor.glb",
        typeForAI: "boss_necrochanter_til_ksor_summoner_illusionist",
        collisionSize: { width: 50, height: 65, depth: 50 },
        modelScale: 1.7,
        animations: { idle: "Idle_Chanter", walk: "Walk_Chanter", cast_resurrect: "Cast_Resurrect", cast_summon_shadows: "Cast_SummonIllusions", attack_curse: "Attack_CurseWave", death: "Death_Vanish" },
        baseStats: {
            hp: 1800, damage: 25, speed: 1.6, attackRange: 330, attackSpeed: 0.8,
            projectileType: "curse_wave", projectileSpeed: 280, // Атака волной проклятий
            aggroRadius: 1000, visionAngle: 360, xpValue: 420, armor: 20,
        },
        abilities: [
            { // Воскрешение последнего врага
                id: "ability_resurrect_last_enemy_til_ksor",
                type: "summon_resurrect",
                trigger: { type: "on_timer", timer: 20.0 },
                cooldown: 20.0,
                params: {
                    resurrectCount: 1,
                    target: "last_defeated_elite_or_strongest", // Сложная логика выбора цели для воскрешения
                    resurrectedHpPercent: 0.7, // Воскресает с 70% HP
                },
                animationName: "Cast_Resurrect"
            },
            { // Призыв 2 теневых двойников при 50% HP
                id: "ability_summon_shadow_clones_til_ksor",
                type: "summon_creatures_clones", // Клоны могут иметь часть способностей оригинала
                trigger: { type: "on_hp_percent_threshold", threshold: 0.5, once: true },
                cooldown: 99999,
                params: {
                    cloneSource: "self", // Клонирует себя
                    count: 2,
                    cloneHpPercent: 0.5, // Клоны имеют 50% HP оригинала
                    cloneDamagePercent: 0.4, // Клоны наносят 40% урона
                    cloneAbilitiesSubset: ["attack_curse_wave_basic"], // Клоны могут использовать только базовую атаку
                    lifeSpan: 45.0, // Клоны живут 45 секунд или пока не умрут
                },
                animationName: "Cast_SummonIllusions"
            }
        ]
    },
    "necropolis_pillar_of_chaos_mra_klun_boss": {
        id: "necropolis_pillar_of_chaos_mra_klun_boss",
        name: "Столп Хаоса Мра’Клун",
        zone: "necropolis_raatken",
        isBoss: true,
        modelPath: "/Models/bosses/necropolis/pillar_of_chaos_mra_klun.glb", // Стационарный объект?
        typeForAI: "boss_pillar_mra_klun_stationary_aoe",
        collisionSize: { width: 100, height: 150, depth: 100 }, // Очень большой и стационарный
        modelScale: 3.0,
        animations: { idle: "Idle_Pulsating", attack_all_directions: "Attack_NovaPulse", aura_fear_active: "Aura_Fear_Active", death: "Death_Shatter" },
        baseStats: {
            hp: 3000, damage: 0, speed: 0, // Стационарный, урон через способности
            aggroRadius: 1000, visionAngle: 360, xpValue: 450, armor: 50, isImmobile: true,
        },
        abilities: [
            { // Атаки во все стороны
                id: "ability_nova_pulse_mra_klun",
                type: "attack_aoe_nova_projectile", // Выпускает снаряды во все стороны
                trigger: { type: "on_timer_repeating", timer: 2.5 }, // Частые атаки
                cooldown: 2.5,
                params: {
                    projectileType: "chaos_bolt_small",
                    projectileCount: 16, // Количество снарядов в нове
                    damagePerProjectile: 8, // Низкий урон
                    speed: 250,
                    range: 400, // Максимальная дальность снарядов
                },
                animationName: "Attack_NovaPulse"
            },
            { // Аура страха
                id: "ability_fear_aura_mra_klun",
                type: "passive_aura_debuff_player",
                params: {
                    auraRadius: 200, // Радиус ауры
                    debuffType: "movement_slow_proximity", // Замедление при приближении
                    maxSlowPercent: 0.4, // Максимальное замедление 40%
                    minDistanceForMaxSlow: 50, // На расстоянии 50 и ближе - максимальное замедление
                    vfxOnPlayer: "vfx_fear_debuff_tendrils", // Эффект на игроке
                },
                animationNameWhileActive: "Aura_Fear_Active", // Анимация босса, пока аура активна
                visualEffectId: "visual_fear_aura_mra_klun" // Визуальный эффект самой ауры
            }
        ],
        visualEffects: [
            {
                id: "visual_fear_aura_mra_klun",
                type: "persistent_aura_vfx",
                linkedAbilityId: "ability_fear_aura_mra_klun", // Связано с аурой страха
                params: { radiusProperty: "auraRadius", color: "0x4B0082", opacity: 0.15 }
            }
        ]
    },
    "necropolis_harbinger_of_plagues_fa_ren_boss": {
        id: "necropolis_harbinger_of_plagues_fa_ren_boss",
        name: "Вестник Моров Фа’Рен",
        zone: "necropolis_raatken",
        isBoss: true,
        modelPath: "/Models/bosses/necropolis/harbinger_fa_ren.glb",
        typeForAI: "boss_harbinger_fa_ren_debuffer_zoner",
        collisionSize: { width: 55, height: 70, depth: 55 },
        modelScale: 1.8,
        animations: { idle: "Idle_Harbinger", walk: "Walk_Harbinger", cast_slow_attack_speed: "Cast_DebuffPlayer", cast_aoe_plague: "Attack_PlagueNova", death: "Death_DissolveInPlague" },
        baseStats: {
            hp: 2200, damage: 28, speed: 1.3, attackRange: 350, attackSpeed: 0.9,
            projectileType: "plague_glob", projectileSpeed: 320,
            aggroRadius: 1000, visionAngle: 360, xpValue: 480, armor: 25,
        },
        abilities: [
            { // Заражённая земля после смерти врагов (которых он сам призывает или уже есть на арене)
                id: "ability_create_infected_ground_on_minion_death_fa_ren",
                type: "passive_on_ally_death_create_aoe", // Срабатывает на смерть миньонов в комнате босса
                trigger: { type: "on_minion_death_in_room" }, // Любой миньон в комнате босса
                params: {
                    aoeType: "infected_ground_dot",
                    radius: 100,
                    duration: 15.0,
                    dps: 8,
                    maxInstances: 5, // Максимум 5 луж одновременно
                },
                // Эта способность может быть пассивной аурой босса, которая активирует эффект
            },
            { // Замедление скорости стрельбы игрока
                id: "ability_player_attack_speed_slow_fa_ren",
                type: "player_debuff_targeted", // Может быть снарядом или направленным кастом
                trigger: { type: "on_timer_or_condition", timer: 12.0 },
                cooldown: 12.0,
                params: {
                    debuffType: "attack_speed_slow",
                    slowPercent: 0.3, // Замедление на 30%
                    duration: 8.0,
                },
                animationName: "Cast_DebuffPlayer",
                vfx: { onPlayerHit: "vfx_plague_debuff_hit" }
            }
        ]
    },

    // --- Финальный Босс Некрополя ---
    "necropolis_archlich_raat_ken_final_boss": {
        id: "necropolis_archlich_raat_ken_final_boss",
        name: "Архилич Раат’Кен",
        zone: "necropolis_raatken",
        isBoss: true,
        modelPath: "/Models/bosses/necropolis/archlich_raat_ken.glb",
        typeForAI: "boss_archlich_raat_ken_multi_phase", // Специальный AI для управления фазами
        collisionSize: { width: 60, height: 80, depth: 60 },
        modelScale: 2.0,
        animations: { /* ... множество анимаций для разных фаз и способностей ... */ },
        baseStats: { // Статы могут меняться по фазам или быть общими с модификаторами
            hp: 4000, damage: 30, speed: 1.7, attackRange: 400, attackSpeed: 1.0,
            aggroRadius: 2000, visionAngle: 360, xpValue: 1000, armor: 30,
        },
        phases: [
            { // Фаза 1: стреляет эфирными снарядами
                id: "phase1_ethereal_barrage",
                name: "Фаза 1: Эфирный Обстрел",
                typeForAI_Phase: "boss_archlich_phase1_ranged_focus", // AI для этой фазы
                entryCondition: { type: "initial" }, // Первая фаза
                nextPhaseTrigger: { type: "hp_percent_threshold", threshold: 0.75 }, // Переход на 75% HP
                abilitiesInPhase: ["ability_archlich_ethereal_projectiles_phase1"],
                visuals: { auraColor: "0x8888FF" } // Пример
            },
            { // Фаза 2: призывает скелетов, накладывает щит
                id: "phase2_summon_and_shield",
                name: "Фаза 2: Призыв и Щит",
                typeForAI_Phase: "boss_archlich_phase2_defensive_summoner",
                entryCondition: { type: "previous_phase_end" },
                nextPhaseTrigger: { type: "hp_percent_threshold", threshold: 0.50 },
                abilitiesInPhase: ["ability_archlich_summon_elite_skeletons_phase2", "ability_archlich_self_ethereal_shield_phase2"],
                onPhaseStartActions: [{ action: "play_animation", name: "Phase2_Transform"}]
            },
            { // Фаза 3: аура истощения — HP игрока уходит
                id: "phase3_exhaustion_aura",
                name: "Фаза 3: Аура Истощения",
                typeForAI_Phase: "boss_archlich_phase3_aura_pressure",
                entryCondition: { type: "previous_phase_end" },
                nextPhaseTrigger: { type: "hp_percent_threshold", threshold: 0.25 },
                abilitiesInPhase: ["ability_archlich_exhaustion_aura_phase3", "ability_archlich_desperation_attacks_phase3"],
            },
            { // Фаза 4: массовое воскрешение и залп
                id: "phase4_final_stand",
                name: "Фаза 4: Последний Бой",
                typeForAI_Phase: "boss_archlich_phase4_all_out_attack",
                entryCondition: { type: "previous_phase_end" },
                // No nextPhaseTrigger - это последняя фаза перед смертью
                abilitiesInPhase: ["ability_archlich_mass_resurrection_phase4", "ability_archlich_final_barrage_phase4"],
                onPhaseStartActions: [{ action: "play_animation", name: "Phase4_UltimateStance"}]
            }
        ],
        // Способности определяются отдельно и линкуются в фазах
        abilities: [
            // Фаза 1
            { id: "ability_archlich_ethereal_projectiles_phase1", type: "attack_ranged_projectile_multi", cooldown: 2.0, params: { projectileType: "archlich_ethereal_bolt", projectileCount: 5, spreadAngle: 40, damagePerProjectile: 25, speed: 400}, animationName: "Cast_EtherealBarrage_Phase1"},
            // Фаза 2
            { id: "ability_archlich_summon_elite_skeletons_phase2", type: "summon_creatures", cooldown: 20.0, params: { creatures: [{ typeId: "necropolis_elite_skeleton_warrior", count: 2 }, { typeId: "necropolis_elite_skeleton_archer", count: 1 }], spawnPattern: "strategic_points" }, animationName: "Cast_SummonUndead_Phase2" },
            { id: "ability_archlich_self_ethereal_shield_phase2", type: "defensive_self_shield", cooldown: 30.0, params: { shieldHp: 500, duration: 15.0, vfxId: "archlich_ethereal_shield" }, animationName: "Cast_SelfShield_Phase2"},
            // Фаза 3
            { id: "ability_archlich_exhaustion_aura_phase3", type: "passive_aura_player_dot_hp_drain", params: { auraRadius: 600, hpDrainPerSecond: 10, vfxId: "archlich_exhaustion_aura" }, animationNameWhileActive: "Aura_Exhaustion_Active_Phase3" },
            { id: "ability_archlich_desperation_attacks_phase3", type: "attack_random_aoe_strikes", cooldown: 8.0, params: { aoeType: "ethereal_ground_rupture", count: 3, radiusPerStrike: 70, damagePerStrike: 35, delayBetweenStrikes: 0.3 }, animationName: "Cast_GroundRupture_Phase3"},
            // Фаза 4
            { id: "ability_archlich_mass_resurrection_phase4", type: "summon_resurrect_multiple", cooldown: 45.0, params: { resurrectCount: 4, target: "recently_defeated_strong", resurrectedHpPercent: 0.5 }, animationName: "Cast_MassResurrection_Phase4"},
            { id: "ability_archlich_final_barrage_phase4", type: "attack_sequence_multi_spell", cooldown: 25.0, params: { sequence: [ { abilityId: "ability_archlich_ethereal_projectiles_phase1", delay: 0}, { abilityId: "ability_archlich_desperation_attacks_phase3", delay: 2.0} ]}, animationName: "Cast_FinalBarrage_Phase4"}
        ],
        // ... и так далее для всех зон ...
    },

    // =================================================================================
    // Зона 2: 🧊 Замёрзшие Пределы Айсхольма (Iceholm Frozen Reaches)
    // =================================================================================
    // --- Обычные враги Айсхольма ---
    "iceholm_frost_wolf": {
        id: "iceholm_frost_wolf",
        name: "Ледяной Волк",
        zone: "iceholm",
        modelPath: "/Models/enemies/iceholm/frost_wolf.glb",
        typeForAI: "melee_fast_chaser_debuff",
        collisionSize: { width: 35, height: 30, depth: 40 },
        modelScale: 1.0,
        animations: { idle: "Idle_Wolf", walk: "Run_Wolf", attack: "Attack_Bite_Ice", death: "Death_Frost" },
        baseStats: { hp: 70, damage: 10, speed: 3.0, attackRange: 30, attackSpeed: 1.2, aggroRadius: 250, xpValue: 15, elementalDamageType: "ice" },
        abilities: [
            { id: "ability_frost_bite_slow", type: "on_hit_debuff", trigger: {type: "on_deal_damage"}, params: {debuffType: "slow_movement", slowPercent: 0.2, duration: 3.0, chance: 0.3 }} // 30% шанс замедлить
        ],
    },
    "iceholm_frozen_knight": {
        id: "iceholm_frozen_knight",
        name: "Застывший Рыцарь",
        zone: "iceholm",
        modelPath: "/Models/enemies/iceholm/frozen_knight.glb",
        typeForAI: "melee_blocker_slower",
        collisionSize: { width: 40, height: 40, depth: 40 },
        modelScale: 1.1,
        animations: { idle: "Idle_Knight", walk: "Walk_Knight", attack: "Attack_IceSword", death: "Death_Shatter", block: "Block_IceShield" },
        baseStats: { hp: 120, damage: 15, speed: 1.5, attackRange: 40, attackSpeed: 0.8, aggroRadius: 200, xpValue: 20, armor: 15, elementalDamageType: "ice" },
        abilities: [
            { id: "ability_block_first_hit_ice", type: "defensive_charges", chargesStatName: "iceBlockCharges", initialCharges: 1, onBlockEffect: {vfx: "vfx_ice_shield_impact"} },
            { id: "ability_slowing_strike_ice", type: "on_hit_debuff", trigger: {type: "on_deal_damage"}, params: {debuffType: "slow_movement_attack_speed", slowPercent: 0.15, duration: 4.0 }}
        ],
    },
    "iceholm_shard_gnome": {
        id: "iceholm_shard_gnome",
        name: "Осколочный Гном",
        zone: "iceholm",
        modelPath: "/Models/enemies/iceholm/shard_gnome.glb",
        typeForAI: "ranged_shooter_basic",
        collisionSize: { width: 25, height: 25, depth: 25 },
        modelScale: 0.8,
        animations: { idle: "Idle_Gnome", walk: "Walk_Gnome", attack: "Throw_IceShard", death: "Death_Poof" },
        baseStats: { hp: 50, damage: 12, speed: 1.8, attackRange: 280, attackSpeed: 1.0, projectileType: "ice_shard_spear", projectileSpeed: 380, aggroRadius: 320, xpValue: 18, elementalDamageType: "ice" },
        abilities: [],
    },
    "iceholm_snow_wraith": {
        id: "iceholm_snow_wraith",
        name: "Снежный Призрак",
        zone: "iceholm",
        modelPath: "/Models/enemies/iceholm/snow_wraith.glb",
        typeForAI: "caster_hit_and_run_invisible", // AI для исчезновения
        collisionSize: { width: 30, height: 40, depth: 30 },
        modelScale: 1.0,
        animations: { idle: "Idle_Floating_Wraith", attack: "Cast_IceBolt", death: "Death_Vanish", disappear: "Vanish_Effect", reappear: "Reappear_Effect" },
        baseStats: { hp: 60, damage: 18, speed: 0, attackRange: 300, attackSpeed: 0.7, projectileType: "frost_bolt_seeking", projectileSpeed: 300, aggroRadius: 350, xpValue: 22, isFlying: true, elementalDamageType: "ice" },
        abilities: [
            { id: "ability_disappear_on_damage_taken", type: "defensive_reaction_buff", trigger: {type: "on_damage_taken"}, cooldown: 5.0, // КД после повторного появления
              params: { buffId: "invisibility_temporary", duration: 3.0, chance: 1.0 }, // 100% шанс исчезнуть
              animationName: "Vanish_Effect", vfx: "vfx_snow_wraith_disappear"
            },
            { id: "ability_reappear_random_pos", type: "movement_teleport", trigger: {type: "on_buff_expire", buffId: "invisibility_temporary"},
              params: {rangeMin: 100, rangeMax: 250, targetPreference: "random_near_player_line_of_sight"},
              animationName: "Reappear_Effect", vfx: "vfx_snow_wraith_reappear"
            }
        ],
    },
     "iceholm_crystal_guardian": {
        id: "iceholm_crystal_guardian",
        name: "Кристальный Страж",
        zone: "iceholm",
        modelPath: "/Models/enemies/iceholm/crystal_guardian.glb",
        typeForAI: "support_aura_defensive_stationary", // Стационарный, дает ауру защиты
        collisionSize: { width: 40, height: 50, depth: 40 },
        modelScale: 1.2,
        animations: { idle: "Idle_Crystal", death: "Death_Shatter", aura_pulse: "Aura_Pulse_Defense" },
        baseStats: { hp: 150, speed: 0, aggroRadius: 0, xpValue: 20, armor: 20, isImmobile: true, elementalDamageType: "ice" },
        abilities: [
            { id: "ability_damage_reduction_aura_allies", type: "passive_aura_buff_allies",
              params: { auraRadius: 200, buffType: "damage_resistance_percentage", resistancePercent: 0.20, // 20% снижение урона для союзников
                        targetTags: ["iceholm_ally"] // Применять только к союзникам этой зоны
              },
              animationNameWhileActive: "Aura_Pulse_Defense", visualEffectId: "visual_crystal_guardian_aura"
            }
        ],
        visualEffects: [{ id: "visual_crystal_guardian_aura", type: "persistent_aura_vfx", params: {radiusPropertyFromAbility: "auraRadius", color: "0xADD8E6", opacity: 0.1}}],
    },
    "iceholm_frost_marksman": {
        id: "iceholm_frost_marksman",
        name: "Морозный Стрелок",
        zone: "iceholm",
        modelPath: "/Models/enemies/iceholm/frost_marksman.glb",
        typeForAI: "ranged_stationary_sniper", // Точный, но статичный
        collisionSize: { width: 30, height: 35, depth: 30 },
        modelScale: 1.0,
        animations: { idle: "Idle_Aiming", attack: "Shoot_IceLance", death: "Death" },
        baseStats: { hp: 70, damage: 20, speed: 0, attackRange: 400, attackSpeed: 0.6, projectileType: "ice_lance_penetrating", projectileSpeed: 500, aggroRadius: 450, xpValue: 25, isImmobile: true, elementalDamageType: "ice" },
        abilities: [
            {id: "ability_ice_lance_penetrating_shot", type: "attack_ranged_projectile", trigger: {type: "on_attack_command"}, cooldown: 1.0/0.6,
             params: {projectileType: "ice_lance_penetrating", damage: 20, speed: 500, canPenetrate: true, maxPenetrations: 1}, // Пробивает одну цель
             animationName: "Shoot_IceLance"
            }
        ],
    },
    "iceholm_ice_elemental": {
        id: "iceholm_ice_elemental",
        name: "Ледяной Элементаль",
        zone: "iceholm",
        modelPath: "/Models/enemies/iceholm/ice_elemental.glb",
        typeForAI: "melee_chaser_spawner_on_death",
        collisionSize: { width: 35, height: 45, depth: 35 },
        modelScale: 1.1,
        animations: { idle: "Idle_Elemental", walk: "Walk_Elemental", attack: "Attack_IcePunch", death: "Death_Shatter_Spike" },
        baseStats: { hp: 90, damage: 16, speed: 1.7, attackRange: 35, attackSpeed: 0.9, aggroRadius: 220, xpValue: 20, elementalDamageType: "ice" },
        abilities: [
            {id: "ability_leave_ice_spike_on_death", type: "on_death_effect", trigger: {type: "on_death"},
             params: {effectType: "create_hazard_aoe", hazardType: "ice_spike_trap", radius: 40, damage: 25, duration: 10.0, armTime: 0.5} // Шип наносит урон при касании
            }
        ],
    },
    "iceholm_frozen_priest": {
        id: "iceholm_frozen_priest",
        name: "Замёрзший Жрец",
        zone: "iceholm",
        modelPath: "/Models/enemies/iceholm/frozen_priest.glb",
        typeForAI: "support_caster_healer_ranged", // Лечит союзников, может атаковать
        collisionSize: { width: 30, height: 40, depth: 30 },
        modelScale: 1.0,
        animations: { idle: "Idle_Priest", walk: "Walk_Priest", cast_heal: "Cast_HealAlly", attack: "Cast_FrostNova", death: "Death" },
        baseStats: { hp: 80, damage: 12, speed: 1.2, attackRange: 250, attackSpeed: 0.7, projectileType: "frost_nova_small", projectileSpeed: 280, aggroRadius: 300, xpValue: 28, elementalDamageType: "ice" },
        abilities: [
            { id: "ability_heal_nearby_allies_iceholm", type: "support_aoe_heal", trigger: {type: "on_timer_or_condition", timer: 8.0, condition: "ally_low_hp_nearby"}, cooldown: 8.0,
              params: { healAmount: 50, radius: 150, targetTags: ["iceholm_ally"], maxTargets: 3},
              animationName: "Cast_HealAlly"
            },
            // Атака ледяной новой как базовая атака
            { id: "ability_frost_nova_attack", type: "attack_ranged_aoe_projectile_burst", trigger: {type: "on_attack_command"}, cooldown: 1.0/0.7,
              params: {aoeType: "frost_nova_small", radius: 60, damage: 12, speed: 280, slowPercent: 0.2, slowDuration: 2.0},
              animationName: "Cast_FrostNova"
            }
        ],
    },
    "iceholm_rime_parasite": {
        id: "iceholm_rime_parasite",
        name: "Инейный Паразит",
        zone: "iceholm",
        modelPath: "/Models/enemies/iceholm/rime_parasite.glb",
        typeForAI: "melee_chaser_pull_player", // Притягивается к игроку или притягивает игрока
        collisionSize: { width: 20, height: 20, depth: 20 }, // Маленький
        modelScale: 0.7,
        animations: { idle: "Idle_Parasite", move_attach: "Move_Attach", attack: "Attack_Leech", death: "Death_Pop" },
        baseStats: { hp: 40, damage: 8, speed: 2.8, attackRange: 10, attackSpeed: 1.5, aggroRadius: 200, xpValue: 16, elementalDamageType: "ice" },
        abilities: [
             { id: "ability_pull_self_to_player", type: "movement_dash_to_target", trigger: {type: "on_ai_command", command: "pull_to_player"}, cooldown: 6.0,
               params: {dashSpeedMultiplier: 3.0, range: 200, stopOnTargetReach: true},
               animationName: "Move_Attach"
             }
        ],
    },

    // --- Мини-босс Айсхольма ---
    "iceholm_ice_companion_miniboss": {
        id: "iceholm_ice_companion_miniboss",
        name: "Айс-Соратник (мини-босс)",
        zone: "iceholm",
        isMiniboss: true,
        modelPath: "/Models/minibosses/iceholm/ice_companion.glb",
        typeForAI: "miniboss_ice_companion_caster_aoe",
        collisionSize: { width: 45, height: 55, depth: 45 },
        modelScale: 1.3,
        animations: { idle: "Idle_IceElementalLarge", walk: "Walk_IceElementalLarge", cast_ice_rain: "Cast_IceRain", cast_freeze_attack: "Cast_FreezeCone", death: "Death_ShatterLarge" },
        baseStats: { hp: 600, damage: 0, speed: 1.4, aggroRadius: 450, xpValue: 120, armor: 20, elementalDamageType: "ice" },
        abilities: [
            { id: "ability_ice_rain_aoe", type: "attack_aoe_targeted_multi_hit", trigger: {type: "on_timer", timer: 10.0}, cooldown: 10.0,
              params: {aoeType: "ice_rain_falling_shards", targetAreaRadius: 100, numShards: 15, damagePerShard: 10, duration: 3.0, warningTime: 1.5},
              animationName: "Cast_IceRain"
            },
            { id: "ability_freeze_on_hit_cone", type: "attack_cone_debuff", trigger: {type: "on_ai_command", command: "freeze_cone_attack"}, cooldown: 7.0,
              params: {coneAngle: 60, coneRange: 150, damage: 25, debuffType: "freeze_stun", stunDuration: 2.5, chance: 1.0}, // 100% шанс заморозить
              animationName: "Cast_FreezeCone"
            }
        ],
    },
    // --- Боссы Айсхольма ---
    "iceholm_northern_guardian_rig_mor_boss": {
        id: "iceholm_northern_guardian_rig_mor_boss",
        name: "Северный Страж Риг’Мор",
        zone: "iceholm",
        isBoss: true,
        modelPath: "/Models/bosses/iceholm/rig_mor.glb",
        typeForAI: "boss_rig_mor_tank_debuffer",
        collisionSize: { width: 65, height: 75, depth: 65 }, modelScale: 1.9,
        animations: { idle: "Idle_GuardianIce", walk: "Walk_GuardianIce", attack: "Attack_IceHammer", cast_blizzard: "Cast_Blizzard", death: "Death_CrumbleIce" },
        baseStats: { hp: 1400, damage: 28, speed: 1.3, attackRange: 65, attackSpeed: 0.6, aggroRadius: 1000, xpValue: 230, armor: 35, elementalResistance: { ice: 0.5 } }, // Сопротивление льду
        abilities: [
            { id: "ability_ice_shell_partial_block", type: "defensive_partial_damage_reduction_charges", chargesStatName: "iceShellCharges", initialCharges: 2,
              params: { damageReductionPercent: 0.5 }, // Первые 2 атаки наносят половину урона
              onBlockEffect: { vfx: "vfx_ice_shell_impact_half" }
            },
            { id: "ability_blizzard_slow_aoe", type: "attack_aoe_selfcentered_debuff", trigger: {type: "on_timer", timer: 15.0}, cooldown: 15.0,
              params: { aoeType: "blizzard_swirl", radius: 300, duration: 5.0, // Длительность бури
                        debuffType: "slow_movement", slowPercent: 0.4, slowDurationInAoe: 2.0 // Замедление на 2 сек пока в АОЕ или после выхода
              },
              animationName: "Cast_Blizzard"
            }
        ]
    },
    // ... и так далее для всех остальных сущностей и зон.

    // Остальные боссы и обычные враги для Айсхольма и последующих зон будут добавлены по аналогии.
    // Из-за ограничений на длину ответа, я не могу привести здесь полный список для всех 10 зон.
    // Но я показал детальные примеры для первой зоны и начала второй, которые ты можешь использовать как шаблон.

    // Ключевые моменты при добавлении остальных:
    // 1. Уникальные `id` для каждой сущности.
    // 2. Правильный `zone` для группировки.
    // 3. Заполненные `modelPath` (хотя бы как заглушка).
    // 4. Продуманный `typeForAI` (если поведение стандартное - используй общие, если уникальное - создавай новый).
    // 5. Соответствующие `baseStats`, которые должны расти с уровнем зоны/босса.
    // 6. Тщательное описание `abilities` с корректными `id`, `trigger`, `params`.
    // 7. Для боссов с фазами используй массив `phases` как у Архилича.
};

// Пример как мог бы выглядеть скелет для финального босса Айсхольма Крио'Тер:
/*
"iceholm_cryo_ther_final_boss": {
    id: "iceholm_cryo_ther_final_boss",
    name: "Сердце Айсхольма — Крио’Тер",
    zone: "iceholm",
    isBoss: true,
    modelPath: "/Models/bosses/iceholm/cryo_ther.glb",
    typeForAI: "boss_cryo_ther_multi_phase",
    // ... baseStats ...
    phases: [
        { // Фаза 1: атаки льдом, лёд на полу снижает скорость
            id: "phase1_ice_assault",
            typeForAI_Phase: "boss_cryo_ther_phase1",
            nextPhaseTrigger: { type: "hp_percent_threshold", threshold: 0.75 },
            abilitiesInPhase: ["ability_cryo_ther_ice_shards_p1", "ability_cryo_ther_icy_ground_p1"],
            onPhaseStartActions: [{ action: "arena_effect_icy_floor_partial"}]
        },
        { // Фаза 2: вызывает ледяные статуи, отражающие урон
            id: "phase2_reflecting_statues",
            typeForAI_Phase: "boss_cryo_ther_phase2",
            nextPhaseTrigger: { type: "hp_percent_threshold", threshold: 0.50 },
            abilitiesInPhase: ["ability_cryo_ther_summon_reflect_statues_p2", "ability_cryo_ther_focused_beam_p2"],
        },
        { // Фаза 3: вся арена покрыта морозом, движение сильно замедлено
            id: "phase3_deep_freeze",
            typeForAI_Phase: "boss_cryo_ther_phase3",
            nextPhaseTrigger: { type: "hp_percent_threshold", threshold: 0.25 },
            abilitiesInPhase: ["ability_cryo_ther_arena_freeze_p3", "ability_cryo_ther_shattering_nova_p3"],
            onPhaseStartActions: [{ action: "arena_effect_icy_floor_full_intense_slow"}]
        },
        { // Фаза 4: серия ледяных взрывов и телепортация по арене
            id: "phase4_ice_rage",
            typeForAI_Phase: "boss_cryo_ther_phase4",
            abilitiesInPhase: ["ability_cryo_ther_ice_explosions_serial_p4", "ability_cryo_ther_teleport_evasive_p4", "ability_cryo_ther_final_burst_p4"],
        }
    ],
    abilities: [
        // Способности для фазы 1
        { id: "ability_cryo_ther_ice_shards_p1", type: "attack_ranged_projectile_multi", params: { ... } },
        { id: "ability_cryo_ther_icy_ground_p1", type: "aoe_hazard_ground_effect", params: { ... } },
        // Способности для фазы 2
        { id: "ability_cryo_ther_summon_reflect_statues_p2", type: "summon_special_units", params: { unitTypeId: "iceholm_reflecting_statue", count: 3, properties: {reflectDamagePercent: 0.5} } },
        { id: "ability_cryo_ther_focused_beam_p2", type: "attack_ranged_beam_channeled", params: { ... } },
        // ... и так далее для всех способностей всех фаз
    ]
},
"iceholm_reflecting_statue": { // Пример для статуи
    id: "iceholm_reflecting_statue",
    name: "Ледяная Статуя (отражающая)",
    zone: "iceholm",
    isMinion: true, // или isStructure
    modelPath: "/Models/structures/iceholm/reflecting_statue.glb",
    typeForAI: "structure_stationary_passive_aura_or_effect",
    baseStats: { hp: 200, speed: 0, isImmobile: true, armor: 50 },
    abilities: [
        { id: "ability_reflect_projectile_damage_statue", type: "passive_aura_effect_on_self_or_allies",
          params: { effectType: "reflect_projectiles", reflectChance: 1.0, reflectDamageMultiplier: 0.5, auraRadius: 50 } // Отражает снаряды рядом с собой
        }
    ],
    lifeSpan: 60.0 // Живет 60 секунд или пока не уничтожат
},
*/