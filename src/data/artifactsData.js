// src/data/artifactsData.js

// Определение возможных редкостей (без изменений)
export const Rarity = {
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic',
    LEGENDARY: 'legendary',
    MYTHIC: 'mythic',
};

// --- Параметры прокачки --- (без изменений)
export const MAX_ARTIFACT_LEVEL = 20;
export const BASE_SHARD_COST_PER_LEVEL = 15;

// --- КОНСТАНТЫ ДЛЯ ДИНАМИЧЕСКОГО РАСЧЕТА СТАТОВ АРТЕФАКТОВ --- (без изменений)
const MYTHIC_L20_MAX_PRIMARY_STATS = {
    hp: 13000,
    attack: 8000,
};
const ARTIFACT_PRIMARY_STAT_L1_RATIOS = {
    hp: 3000 / 13000,
    attack: 1600 / 8000,
};
const ARTIFACT_STAT_RARITY_MULTIPLIERS = {
    [Rarity.UNCOMMON]: 0.15,
    [Rarity.RARE]: 0.35,
    [Rarity.EPIC]: 0.5,
    [Rarity.LEGENDARY]: 0.7,
    [Rarity.MYTHIC]: 1.0,
};

// --- ФУНКЦИЯ РАСЧЕТА СТАТОВ АРТЕФАКТА --- (без изменений)
export function calculateArtifactStat(artifactDefinition, statName, currentLevel) {
    const level = Math.max(1, Math.min(currentLevel, artifactDefinition.maxLevel || MAX_ARTIFACT_LEVEL));

    if (statName === "hp" || statName === "attack") {
        const maxStatMythicL20 = MYTHIC_L20_MAX_PRIMARY_STATS[statName];
        const l1Ratio = ARTIFACT_PRIMARY_STAT_L1_RATIOS[statName];
        const rarityKey = artifactDefinition.rarity.toLowerCase();
        const rarityMultiplier = ARTIFACT_STAT_RARITY_MULTIPLIERS[rarityKey] || ARTIFACT_STAT_RARITY_MULTIPLIERS[Rarity.UNCOMMON];

        if (maxStatMythicL20 === undefined || l1Ratio === undefined) {
            console.warn(`Динамический расчет для стата "${statName}" не определен.`);
            return 0;
        }
        const maxStatForRarityAtL20 = maxStatMythicL20 * rarityMultiplier;
        let statValue;
        if ((artifactDefinition.maxLevel || MAX_ARTIFACT_LEVEL) === 1) {
            statValue = maxStatForRarityAtL20 * l1Ratio;
        } else if (level === 1) {
            statValue = maxStatForRarityAtL20 * l1Ratio;
        } else {
            statValue = maxStatForRarityAtL20 * (l1Ratio + (1 - l1Ratio) * (level - 1) / ((artifactDefinition.maxLevel || MAX_ARTIFACT_LEVEL) - 1));
        }
        return Math.round(statValue);
    } else {
        // Если стат не HP и не Attack, он должен приходить от сетового бонуса или другого источника.
        // Для индивидуальных артефактов эти статы теперь не определены в baseStats/levelStats.
        const baseStat = artifactDefinition.baseStats?.[statName] || 0;
        const perLevelStat = artifactDefinition.levelStats?.[statName] || 0;
        // Если стат был удален из baseStats/levelStats артефакта, то baseStat и perLevelStat будут 0.
        return baseStat + (level - 1) * perLevelStat;
    }
}

// --- Определение артефактов ---
// КАЖДЫЙ артефакт теперь будет давать ТОЛЬКО динамически рассчитываемые HP и Урон.
// baseStats и levelStats очищены от уникальных статов.

// --- Сет 1: Закаленные В Битве ---
const art_battleworn_talisman = {
    id: 'art_battleworn_talisman', name: 'Боевой Талисман Героя', icon: '/assets/artifacts/hero_talisman_worn.png', rarity: Rarity.UNCOMMON,
    description: "Хранит отголоски бесчисленных сражений. Дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    basePowerLevel: 1400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_ironclad_gauntlets = {
    id: 'art_ironclad_gauntlets', name: 'Железные Рукавицы Воли', icon: '/assets/artifacts/hero_gauntlets_crude.png', rarity: Rarity.UNCOMMON,
    description: "Укрепляют руки и дух владельца. Дают бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    basePowerLevel: 1400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_swift_march_boots = {
    id: 'art_swift_march_boots', name: 'Сапоги Быстрого Марша', icon: '/assets/artifacts/hero_boots_reinforced.png', rarity: Rarity.RARE,
    description: "Позволяют нестись по полю боя. Дают бонус к Здоровью и Атаке.", // Удалено упоминание Скорости Атаки
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {}, levelStats: {}, // Очищено от attackSpeed
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_unyielding_amulet = {
    id: 'art_unyielding_amulet', name: 'Непреклонный Амулет', icon: '/assets/artifacts/hero_amulet_simple.png', rarity: Rarity.RARE,
    description: "Символ стойкости. Дает бонус к Здоровью и Атаке.", // Удалено упоминание Шанса Критического Удара
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {}, levelStats: {}, // Очищено от critChance
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Сет 2: Шепот Стихий ---
const art_whispering_stone = {
    id: 'art_whispering_stone', name: 'Шепчущий Камень Ветра', icon: '/assets/artifacts/elemental_stone_wind.png', rarity: Rarity.UNCOMMON,
    description: "Наполнен энергией ветра. Дает бонус к Здоровью и Атаке.", // Удалено упоминание Скорости Атаки
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {}, levelStats: {}, // Очищено от attackSpeed
    basePowerLevel: 1400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_glowing_orb = {
    id: 'art_glowing_orb', name: 'Светящаяся Сфера Огня', icon: '/assets/artifacts/elemental_orb_fire.png', rarity: Rarity.RARE,
    description: "Источает тепло и силу пламени. Дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_flowing_waters = {
    id: 'art_flowing_waters', name: 'Текучие Воды Жизни', icon: '/assets/artifacts/elemental_waters.png', rarity: Rarity.RARE,
    description: "Несет целительную силу. Дает бонус к Здоровью и Атаке.", // Удалено упоминание Регенерации Здоровья
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {}, levelStats: {}, // Очищено от hpRegen
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_earthen_heart = {
    id: 'art_earthen_heart', name: 'Сердце Земли', icon: '/assets/artifacts/elemental_earth.png', rarity: Rarity.EPIC,
    description: "Дарует стойкость и защиту. Дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};

// --- Сет 3: Тайны Древних Знаний ---
const art_scroll_wisdom = {
    id: 'art_scroll_wisdom', name: 'Свиток Древней Мудрости', icon: '/assets/artifacts/ancient_scroll.png', rarity: Rarity.UNCOMMON,
    description: "Содержит знания эпох. Дает бонус к Здоровью и Атаке.", // Удалено упоминание Шанса Крита
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {}, levelStats: {}, // Очищено от critChance
    basePowerLevel: 1400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_ornate_key = {
    id: 'art_ornate_key', name: 'Искусный Ключ', icon: '/assets/artifacts/ancient_key.png', rarity: Rarity.RARE,
    description: "Открывает скрытые возможности. Дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_engraved_tablet = {
    id: 'art_engraved_tablet', name: 'Загадочная Табличка', icon: '/assets/artifacts/ancient_tablet.png', rarity: Rarity.EPIC,
    description: "Наполнена символами. Дает бонус к Здоровью и Атаке.", // Удалено упоминание Шанса Двойного Удара
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    baseStats: {}, levelStats: {}, // Очищено от doubleStrikeChance
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_astrolabe_arcane = {
    id: 'art_astrolabe_arcane', name: 'Магический Астроляб', icon: '/assets/artifacts/ancient_astrolabe.png', rarity: Rarity.EPIC,
    description: "Позволяет предвидеть. Дает бонус к Здоровью и Атаке.", // Удалено упоминание Скорости Атаки
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    baseStats: {}, levelStats: {}, // Очищено от attackSpeed
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Сет 4: Механизмы Прогресса ---
const art_precision_gear = {
    id: 'art_precision_gear', name: 'Прецизионный Механизм', icon: '/assets/artifacts/tech_gear_precision.png', rarity: Rarity.RARE,
    description: "Идеальные шестерни. Дает бонус к Здоровью и Атаке.", // Удалено упоминание Шанса Крита
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {}, levelStats: {}, // Очищено от critChance
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_energy_core = {
    id: 'art_energy_core', name: 'Ядро Энергии', icon: '/assets/artifacts/tech_core_energy.png', rarity: Rarity.EPIC,
    description: "Источник стабильной энергии. Дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_magnetic_field = {
    id: 'art_magnetic_field', name: 'Магнитное Поле Защиты', icon: '/assets/artifacts/tech_field_magnetic.png', rarity: Rarity.EPIC,
    description: "Создает защитный барьер. Дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_neural_interface = {
    id: 'art_neural_interface', name: 'Нейронный Интерфейс', icon: '/assets/artifacts/tech_interface_neural.png', rarity: Rarity.LEGENDARY,
    description: "Оптимизирует реакции. Дает бонус к Здоровью и Атаке.", // Удалено упоминание Скорости Атаки
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    baseStats: {}, levelStats: {}, // Очищено от attackSpeed
    basePowerLevel: 5400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Сет 5: Высшая Инженерия ---
const art_advanced_circuitry = {
    id: 'art_advanced_circuitry', name: 'Продвинутая Схема', icon: '/assets/artifacts/tech_circuit_advanced.png', rarity: Rarity.EPIC,
    description: "Сложная сеть. Дает бонус к Здоровью и Атаке.", // Удалено упоминание Шанса Двойного Удара
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    baseStats: {}, levelStats: {}, // Очищено от doubleStrikeChance
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_holographic_projector = {
    id: 'art_holographic_projector', name: 'Голографический Проектор', icon: '/assets/artifacts/tech_projector_holo.png', rarity: Rarity.LEGENDARY,
    description: "Создает иллюзии. Дает бонус к Здоровью и Атаке.", // Удалено упоминание Шанса Крита
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    baseStats: {}, levelStats: {}, // Очищено от critChance
    basePowerLevel: 5400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_quantum_processor = {
    id: 'art_quantum_processor', name: 'Квантовый Процессор', icon: '/assets/artifacts/tech_processor_quantum.png', rarity: Rarity.LEGENDARY,
    description: "Выполняет вычисления с невероятной скоростью. Дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    basePowerLevel: 5400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_graviton_emitter = {
    id: 'art_graviton_emitter', name: 'Гравитонный Излучатель', icon: '/assets/artifacts/tech_emitter_graviton.png', rarity: Rarity.MYTHIC,
    description: "Изменяет гравитацию. Дает бонус к Здоровью и Атаке.", // Удалено упоминание Скорости Атаки
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 3,
    baseStats: {}, levelStats: {}, // Очищено от attackSpeed
    basePowerLevel: 8000, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Сет 6: Космические Технологии ---
const art_interstellar_drive = {
    id: 'art_interstellar_drive', name: 'Звездолетный Двигатель', icon: '/assets/artifacts/cosmic_drive_interstellar.png', rarity: Rarity.LEGENDARY,
    description: "Позволяет преодолевать огромные расстояния. Дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    basePowerLevel: 5400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_dark_matter_core = {
    id: 'art_dark_matter_core', name: 'Ядро Темной Материи', icon: '/assets/artifacts/cosmic_core_darkmatter.png', rarity: Rarity.LEGENDARY,
    description: "Содержит невероятную энергию. Дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    basePowerLevel: 5400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_singularity_shard = {
    id: 'art_singularity_shard', name: 'Осколок Сингулярности', icon: '/assets/artifacts/cosmic_shard_singularity.png', rarity: Rarity.MYTHIC,
    description: "Искажает пространство и время. Дает бонус к Здоровью и Атаке.", // Удалено упоминание Шанса Крита
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 3,
    baseStats: {}, levelStats: {}, // Очищено от critChance
    basePowerLevel: 8000, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_tachyon_accelerator = {
    id: 'art_tachyon_accelerator', name: 'Тахионный Ускоритель', icon: '/assets/artifacts/cosmic_accelerator_tachyon.png', rarity: Rarity.MYTHIC,
    description: "Ускоряет частицы. Дает бонус к Здоровью и Атаке.", // Удалено упоминание Скорости Атаки
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 3,
    baseStats: {}, levelStats: {}, // Очищено от attackSpeed
    basePowerLevel: 8000, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Определение СЕТОВ --- (остается с предыдущими изменениями: процентные бонусы HP/Attack, Attack Speed, PowerLevel)
// --- Определение СЕТОВ ---
export const ARTIFACT_SETS = [
    {
        id: 'set_battle_hardened', name: "Закаленные В Битве", rarity: Rarity.UNCOMMON,
        artifacts: [art_battleworn_talisman, art_ironclad_gauntlets, art_swift_march_boots, art_unyielding_amulet],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +2.5%' },
            { condition: '[Собрано 2]', description: 'HP +1.5%' },
            // Бонусы за 4 части (включают добавочные Attack/HP и уникальные)
            { condition: '[Собрано 4]', description: 'HP +1.5%' },        // Итого +3% HP с 2 частями
            { condition: '[Собрано 4]', description: 'Crit Chance +0.5%' },
            { condition: '[Собрано 4]', description: 'PowerLevel +3%' }
            // Attack Speed был убран из этого сета
        ]
    },
    {
        id: 'set_elemental_whispers', name: "Шепот Стихий", rarity: Rarity.RARE,
        artifacts: [art_whispering_stone, art_glowing_orb, art_flowing_waters, art_earthen_heart],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +3.5%' },
            { condition: '[Собрано 2]', description: 'HP +2.0%' },
            { condition: '[Собрано 2]', description: 'HP Regen +3' },
            // Бонусы за 4 части
            { condition: '[Собрано 4]', description: 'Attack +3.5%' },    // Итого +7% Attack
            { condition: '[Собрано 4]', description: 'Attack Speed +1.5%' },
            { condition: '[Собрано 4]', description: 'PowerLevel +4%' }
        ]
    },
    {
        id: 'set_ancient_knowledge', name: "Тайны Древних Знаний", rarity: Rarity.EPIC,
        artifacts: [art_scroll_wisdom, art_ornate_key, art_engraved_tablet, art_astrolabe_arcane],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +4.5%' },
            { condition: '[Собрано 2]', description: 'HP +2.5%' },
            { condition: '[Собрано 2]', description: 'Crit Chance +1.8%' },
            { condition: '[Собрано 2]', description: 'Double Strike Chance +0.8%' },
            // Бонусы за 4 части
            { condition: '[Собрано 4]', description: 'Attack +4.5%' },    // Итого +9% Attack
            { condition: '[Собрано 4]', description: 'HP +2.5%' },        // Итого +5% HP
            { condition: '[Собрано 4]', description: 'PowerLevel +5%' }
            // Attack Speed был убран из этого сета
        ]
    },
    {
        id: 'set_mechanisms_of_progress', name: "Механизмы Прогресса", rarity: Rarity.EPIC,
        artifacts: [art_precision_gear, art_energy_core, art_magnetic_field, art_neural_interface],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +5.5%' },
            { condition: '[Собрано 2]', description: 'HP +3.0%' },
            { condition: '[Собрано 2]', description: 'Crit Chance +1.2%' },
            // Бонусы за 4 части
            { condition: '[Собрано 4]', description: 'Attack +5.5%' },    // Итого +11% Attack
            { condition: '[Собрано 4]', description: 'Attack Speed +2.5%' },
            { condition: '[Собрано 4]', description: 'PowerLevel +5%' }
        ]
    },
    {
        id: 'set_superior_engineering', name: "Высшая Инженерия", rarity: Rarity.LEGENDARY,
        artifacts: [art_advanced_circuitry, art_holographic_projector, art_quantum_processor, art_graviton_emitter],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +6.5%' },
            { condition: '[Собрано 2]', description: 'HP +3.5%' },
            { condition: '[Собрано 2]', description: 'Double Strike Chance +1.8%' },
            { condition: '[Собрано 2]', description: 'Crit Chance +2.5%' },
            // Бонусы за 4 части
            { condition: '[Собрано 4]', description: 'HP +3.5%' },        // Итого +7% HP
            { condition: '[Собрано 4]', description: 'Attack Speed +3.5%' },
            { condition: '[Собрано 4]', description: 'PowerLevel +6%' }
        ]
    },
    {
        id: 'set_cosmic_technologies', name: "Космические Технологии", rarity: Rarity.MYTHIC,
        artifacts: [art_interstellar_drive, art_dark_matter_core, art_singularity_shard, art_tachyon_accelerator],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +6.0%' },
            { condition: '[Собрано 2]', description: 'HP +4.0%' },
            // Бонусы за 4 части
            { condition: '[Собрано 4]', description: 'Crit Chance +4.0%' },
            { condition: '[Собрано 4]', description: 'Attack Speed +4.5%' },
            { condition: '[Собрано 4]', description: 'PowerLevel +7%' }
        ]
    },
];

// --- Карта для быстрого доступа к данным артефакта по ID --- (без изменений)
const ALL_ARTIFACTS_MAP = new Map();
ARTIFACT_SETS.forEach(set => {
    set.artifacts.forEach(artifact => {
        const hydratedArtifact = {
            description: "Описание артефакта...", 
            maxLevel: MAX_ARTIFACT_LEVEL,
            baseShardCost: BASE_SHARD_COST_PER_LEVEL,
            baseStats: {}, 
            levelStats: {}, 
            basePowerLevel: 0,
            powerPerLevelMultiplier: 0,
            primaryDynamicStats: ["hp", "attack"], 
            ...artifact 
        };
        ALL_ARTIFACTS_MAP.set(hydratedArtifact.id, hydratedArtifact);
    });
});

// --- Экспорт массива всех артефактов --- (без изменений)
export const ALL_ARTIFACTS_ARRAY = Array.from(ALL_ARTIFACTS_MAP.values());

// --- Экспорт функции для получения данных артефакта по ID --- (без изменений)
export const getArtifactById = (id) => ALL_ARTIFACTS_MAP.get(id);