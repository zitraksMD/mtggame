// src/data/artifactsData.js

// Определение возможных редкостей
export const Rarity = {
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic',
    LEGENDARY: 'legendary',
    MYTHIC: 'mythic',
};

// --- Параметры прокачки ---
export const MAX_ARTIFACT_LEVEL = 20;
export const BASE_SHARD_COST_PER_LEVEL = 15;

// --- НОВЫЕ КОНСТАНТЫ ДЛЯ ДИНАМИЧЕСКОГО РАСЧЕТА СТАТОВ АРТЕФАКТОВ ---
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
// --- КОНЕЦ НОВЫХ КОНСТАНТ ---

// --- НОВАЯ ФУНКЦИЯ РАСЧЕТА СТАТОВ АРТЕФАКТА ---
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
        const baseStat = artifactDefinition.baseStats?.[statName] || 0;
        const perLevelStat = artifactDefinition.levelStats?.[statName] || 0;
        return baseStat + (level - 1) * perLevelStat;
    }
}
// --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

// --- Определение артефактов ---
// КАЖДЫЙ артефакт теперь будет иметь динамически рассчитываемые HP и Урон.
// Уникальные статы остаются в baseStats/levelStats.

// --- Сет 1: Закаленные В Битве ---
const art_battleworn_talisman = {
    id: 'art_battleworn_talisman', name: 'Боевой Талисман Героя', icon: '/assets/artifacts/hero_talisman_worn.png', rarity: Rarity.UNCOMMON,
    description: "Хранит отголоски бесчисленных сражений. Дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    basePowerLevel: 1400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"] // Всегда дает HP и Attack
};
const art_ironclad_gauntlets = {
    id: 'art_ironclad_gauntlets', name: 'Железные Рукавицы Воли', icon: '/assets/artifacts/hero_gauntlets_crude.png', rarity: Rarity.UNCOMMON,
    description: "Укрепляют руки и дух владельца. Дают бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    basePowerLevel: 1400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_swift_march_boots = {
    id: 'art_swift_march_boots', name: 'Сапоги Быстрого Марша', icon: '/assets/artifacts/hero_boots_reinforced.png', rarity: Rarity.RARE,
    description: "Позволяют нестись по полю боя, увеличивая Скорость Атаки. Также дают бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "attackSpeed": 0.4 }, levelStats: { "attackSpeed": 0.15 }, // Уникальный стат
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_unyielding_amulet = {
    id: 'art_unyielding_amulet', name: 'Непреклонный Амулет', icon: '/assets/artifacts/hero_amulet_simple.png', rarity: Rarity.RARE,
    description: "Символ стойкости. Повышает Шанс Критического Удара, а также дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "critChance": 0.8 }, levelStats: { "critChance": 0.25 }, // Уникальный стат
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Сет 2: Шепот Стихий ---
const art_whispering_stone = {
    id: 'art_whispering_stone', name: 'Шепчущий Камень Ветра', icon: '/assets/artifacts/elemental_stone_wind.png', rarity: Rarity.UNCOMMON,
    description: "Наполнен энергией ветра, увеличивая Скорость Атаки. Также дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "attackSpeed": 0.6 }, levelStats: { "attackSpeed": 0.2 }, // Уникальный стат
    basePowerLevel: 1400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_glowing_orb = {
    id: 'art_glowing_orb', name: 'Светящаяся Сфера Огня', icon: '/assets/artifacts/elemental_orb_fire.png', rarity: Rarity.RARE,
    description: "Источает тепло и силу пламени. Дает бонус к Здоровью и Атаке.", // Был только attack, теперь и HP
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_flowing_waters = {
    id: 'art_flowing_waters', name: 'Текучие Воды Жизни', icon: '/assets/artifacts/elemental_waters.png', rarity: Rarity.RARE,
    description: "Несет целительную силу, увеличивая Регенерацию Здоровья. Также дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "hpRegen": 5 }, levelStats: { "hpRegen": 2 }, // Уникальный стат
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_earthen_heart = {
    id: 'art_earthen_heart', name: 'Сердце Земли', icon: '/assets/artifacts/elemental_earth.png', rarity: Rarity.EPIC,
    description: "Дарует стойкость и защиту. Дает бонус к Здоровью и Атаке.", // Был только HP, теперь и Attack
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    // baseStats: { "defense": +8 }, levelStats: { "defense": +3 }, // Пример другого стата, если он был
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Сет 3: Тайны Древних Знаний ---
const art_scroll_wisdom = {
    id: 'art_scroll_wisdom', name: 'Свиток Древней Мудрости', icon: '/assets/artifacts/ancient_scroll.png', rarity: Rarity.UNCOMMON,
    description: "Содержит знания эпох, повышая Шанс Крита. Также дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "critChance": 1.2 }, levelStats: { "critChance": 0.4 }, // Уникальный стат
    basePowerLevel: 1400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_ornate_key = {
    id: 'art_ornate_key', name: 'Искусный Ключ', icon: '/assets/artifacts/ancient_key.png', rarity: Rarity.RARE,
    description: "Открывает скрытые возможности. Дает бонус к Здоровью и Атаке.", // Был только attack, теперь и HP
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    // baseStats: { "itemFind": 3 }, levelStats: { "itemFind": 1 }, // Пример если был уникальный стат
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_engraved_tablet = {
    id: 'art_engraved_tablet', name: 'Загадочная Табличка', icon: '/assets/artifacts/ancient_tablet.png', rarity: Rarity.EPIC,
    description: "Наполнена символами, увеличивая Шанс Двойного Удара. Также дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    baseStats: { "doubleStrikeChance": 1.5 }, levelStats: { "doubleStrikeChance": 0.5 }, // Уникальный стат
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_astrolabe_arcane = {
    id: 'art_astrolabe_arcane', name: 'Магический Астроляб', icon: '/assets/artifacts/ancient_astrolabe.png', rarity: Rarity.EPIC,
    description: "Позволяет предвидеть, увеличивая Скорость Атаки. Также дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    baseStats: { "attackSpeed": 1.2 }, levelStats: { "attackSpeed": 0.45 }, // Уникальный стат
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Сет 4: Механизмы Прогресса ---
const art_precision_gear = {
    id: 'art_precision_gear', name: 'Прецизионный Механизм', icon: '/assets/artifacts/tech_gear_precision.png', rarity: Rarity.RARE,
    description: "Идеальные шестерни, повышающие Шанс Крита. Также дают бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "critChance": 1.8 }, levelStats: { "critChance": 0.55 }, // Уникальный стат
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_energy_core = {
    id: 'art_energy_core', name: 'Ядро Энергии', icon: '/assets/artifacts/tech_core_energy.png', rarity: Rarity.EPIC,
    description: "Источник стабильной энергии. Дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_magnetic_field = {
    id: 'art_magnetic_field', name: 'Магнитное Поле Защиты', icon: '/assets/artifacts/tech_field_magnetic.png', rarity: Rarity.EPIC,
    description: "Создает защитный барьер. Дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_neural_interface = {
    id: 'art_neural_interface', name: 'Нейронный Интерфейс', icon: '/assets/artifacts/tech_interface_neural.png', rarity: Rarity.LEGENDARY,
    description: "Оптимизирует реакции, повышая Скорость Атаки. Также дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    baseStats: { "attackSpeed": 2.0 }, levelStats: { "attackSpeed": 0.7 }, // Уникальный стат
    basePowerLevel: 5400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Сет 5: Высшая Инженерия ---
const art_advanced_circuitry = {
    id: 'art_advanced_circuitry', name: 'Продвинутая Схема', icon: '/assets/artifacts/tech_circuit_advanced.png', rarity: Rarity.EPIC,
    description: "Сложная сеть, увеличивающая Шанс Двойного Удара. Также дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    baseStats: { "doubleStrikeChance": 2.5 }, levelStats: { "doubleStrikeChance": 0.8 }, // Уникальный стат
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_holographic_projector = {
    id: 'art_holographic_projector', name: 'Голографический Проектор', icon: '/assets/artifacts/tech_projector_holo.png', rarity: Rarity.LEGENDARY,
    description: "Создает иллюзии, повышая Шанс Крита. Также дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    baseStats: { "critChance": 3.5 }, levelStats: { "critChance": 1.1 }, // Уникальный стат
    basePowerLevel: 5400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_quantum_processor = {
    id: 'art_quantum_processor', name: 'Квантовый Процессор', icon: '/assets/artifacts/tech_processor_quantum.png', rarity: Rarity.LEGENDARY,
    description: "Выполняет вычисления с невероятной скоростью. Дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    basePowerLevel: 5400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_graviton_emitter = {
    id: 'art_graviton_emitter', name: 'Гравитонный Излучатель', icon: '/assets/artifacts/tech_emitter_graviton.png', rarity: Rarity.MYTHIC,
    description: "Изменяет гравитацию, влияя на Скорость Атаки. Также дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 3,
    baseStats: { "attackSpeed": 4.0 }, levelStats: { "attackSpeed": 1.3 }, // Уникальный стат
    basePowerLevel: 8000, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Сет 6: Космические Технологии ---
const art_interstellar_drive = {
    id: 'art_interstellar_drive', name: 'Звездолетный Двигатель', icon: '/assets/artifacts/cosmic_drive_interstellar.png', rarity: Rarity.LEGENDARY,
    description: "Позволяет преодолевать огромные расстояния. Дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    basePowerLevel: 5400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_dark_matter_core = {
    id: 'art_dark_matter_core', name: 'Ядро Темной Материи', icon: '/assets/artifacts/cosmic_core_darkmatter.png', rarity: Rarity.LEGENDARY,
    description: "Содержит невероятную энергию. Дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    basePowerLevel: 5400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_singularity_shard = {
    id: 'art_singularity_shard', name: 'Осколок Сингулярности', icon: '/assets/artifacts/cosmic_shard_singularity.png', rarity: Rarity.MYTHIC,
    description: "Искажает пространство и время, увеличивая Шанс Крита. Также дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 3,
    baseStats: { "critChance": 6.0 }, levelStats: { "critChance": 1.8 }, // Уникальный стат
    basePowerLevel: 8000, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_tachyon_accelerator = {
    id: 'art_tachyon_accelerator', name: 'Тахионный Ускоритель', icon: '/assets/artifacts/cosmic_accelerator_tachyon.png', rarity: Rarity.MYTHIC,
    description: "Ускоряет частицы, повышая Скорость Атаки. Также дает бонус к Здоровью и Атаке.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 3,
    baseStats: { "attackSpeed": 6.0 }, levelStats: { "attackSpeed": 1.9 }, // Уникальный стат
    basePowerLevel: 8000, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Определение СЕТОВ ---
export const ARTIFACT_SETS = [
    {
        id: 'set_battle_hardened', name: "Закаленные В Битве", rarity: "uncommon",
        artifacts: [art_battleworn_talisman, art_ironclad_gauntlets, art_swift_march_boots, art_unyielding_amulet],
        bonuses: [
            { condition: '[Собрано 2]', description: 'HP +40 (дополнительно), Attack +5 (дополнительно)' }, // Уточнил, что это сверх базовых
            { condition: '[Собрано 4]', description: 'Attack Speed +0.3 (дополнительно), Crit Chance +0.5% (дополнительно), PowerLevel +3%' }
        ]
    },
    {
        id: 'set_elemental_whispers', name: "Шепот Стихий", rarity: "rare",
        artifacts: [art_whispering_stone, art_glowing_orb, art_flowing_waters, art_earthen_heart],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +15 (дополнительно), HP Regen +3' },
            { condition: '[Собрано 4]', description: 'Attack Speed +0.8 (дополнительно), HP +200 (дополнительно), PowerLevel +4%' }
        ]
    },
    {
        id: 'set_ancient_knowledge', name: "Тайны Древних Знаний", rarity: "epic",
        artifacts: [art_scroll_wisdom, art_ornate_key, art_engraved_tablet, art_astrolabe_arcane],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Crit Chance +1.8% (дополнительно), Double Strike Chance +0.8%' },
            { condition: '[Собрано 4]', description: 'Attack +40 (дополнительно), Attack Speed +1.0 (дополнительно), PowerLevel +5%' }
        ]
    },
    {
        id: 'set_mechanisms_of_progress', name: "Механизмы Прогресса", rarity: "epic",
        artifacts: [art_precision_gear, art_energy_core, art_magnetic_field, art_neural_interface],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +30 (дополнительно), Crit Chance +1.2% (дополнительно)' },
            { condition: '[Собрано 4]', description: 'Attack Speed +1.5 (дополнительно), HP +300 (дополнительно), PowerLevel +5%' }
        ]
    },
    {
        id: 'set_superior_engineering', name: "Высшая Инженерия", rarity: "legendary",
        artifacts: [art_advanced_circuitry, art_holographic_projector, art_quantum_processor, art_graviton_emitter],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Double Strike Chance +1.8%, Crit Chance +2.5% (дополнительно)' },
            { condition: '[Собрано 4]', description: 'Attack +80 (дополнительно), Attack Speed +2.0 (дополнительно), PowerLevel +6%' }
        ]
    },
    {
        id: 'set_cosmic_technologies', name: "Космические Технологии", rarity: "mythic",
        artifacts: [art_interstellar_drive, art_dark_matter_core, art_singularity_shard, art_tachyon_accelerator],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +100 (дополнительно), HP +500 (дополнительно)' },
            { condition: '[Собрано 4]', description: 'Crit Chance +4.0% (дополнительно), Attack Speed +3.0 (дополнительно), PowerLevel +7%' }
        ]
    },
];

// --- Карта для быстрого доступа к данным артефакта по ID ---
const ALL_ARTIFACTS_MAP = new Map();
ARTIFACT_SETS.forEach(set => {
    set.artifacts.forEach(artifact => {
        const hydratedArtifact = {
            description: "Описание артефакта...", // Дефолт, будет перезаписан
            maxLevel: MAX_ARTIFACT_LEVEL,
            baseShardCost: BASE_SHARD_COST_PER_LEVEL,
            baseStats: {}, // Для уникальных статов, не HP/Attack
            levelStats: {}, // Для уникальных статов, не HP/Attack
            basePowerLevel: 0,
            powerPerLevelMultiplier: 0,
            primaryDynamicStats: ["hp", "attack"], // По умолчанию каждый артефакт дает HP и Attack
            ...artifact // Перезаписываем дефолты реальными значениями, включая primaryDynamicStats если они отличаются (хотя по новой логике они всегда будут ["hp", "attack"])
        };
        ALL_ARTIFACTS_MAP.set(hydratedArtifact.id, hydratedArtifact);
    });
});

// --- Экспорт массива всех артефактов ---
export const ALL_ARTIFACTS_ARRAY = Array.from(ALL_ARTIFACTS_MAP.values());

// --- Экспорт функции для получения данных артефакта по ID ---
export const getArtifactById = (id) => ALL_ARTIFACTS_MAP.get(id);

/*
Пример использования новой функции:

import { getArtifactById, calculateArtifactStat } from './artifactsData';

// Предположим, у игрока есть артефакт (получен из useGameStore или другого места)
const playerArtifactInstance = { artifactId: 'art_swift_march_boots', level: 10 }; // Сапоги, которые также дают уникальный стат

const artifactDefinition = getArtifactById(playerArtifactInstance.artifactId);

if (artifactDefinition) {
    console.log(`Артефакт: ${artifactDefinition.name}, Уровень: ${playerArtifactInstance.level}`);
    console.log(`Описание: ${artifactDefinition.description}`);

    // Рассчитываем HP (динамический стат, есть у всех)
    const hpBonus = calculateArtifactStat(artifactDefinition, "hp", playerArtifactInstance.level);
    console.log(`Бонус HP: +${hpBonus}`);

    // Рассчитываем Атаку (динамический стат, есть у всех)
    const attackBonus = calculateArtifactStat(artifactDefinition, "attack", playerArtifactInstance.level);
    console.log(`Бонус Атаки: +${attackBonus}`);
    
    // Рассчитываем уникальный стат для art_swift_march_boots (attackSpeed)
    if (artifactDefinition.baseStats?.attackSpeed !== undefined) {
        const speedBonus = calculateArtifactStat(artifactDefinition, "attackSpeed", playerArtifactInstance.level);
        console.log(`Бонус скорости атаки: +${speedBonus.toFixed(2)}`);
    }

    // Отображение всех статов артефакта:
    console.log("--- Все бонусы артефакта ---");
    // 1. Динамические (HP, Attack)
    artifactDefinition.primaryDynamicStats?.forEach(statKey => {
        const value = calculateArtifactStat(artifactDefinition, statKey, playerArtifactInstance.level);
        console.log(`Динамический ${statKey}: ${value}`);
    });
    // 2. Статы из baseStats/levelStats (уникальные для артефакта)
    for (const statKey in artifactDefinition.baseStats) {
        // Убедимся, что не пытаемся повторно посчитать hp/attack, если они вдруг остались в baseStats (хотя не должны)
        if (!artifactDefinition.primaryDynamicStats?.includes(statKey)) { 
            const value = calculateArtifactStat(artifactDefinition, statKey, playerArtifactInstance.level);
            // Для статов с плавающей точкой можно добавить .toFixed(2) или аналогичное форматирование
            const displayValue = (typeof value === 'number' && !Number.isInteger(value)) ? value.toFixed(2) : value;
            console.log(`Уникальный ${statKey}: ${displayValue}`);
        }
    }
}
*/