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

// --- Определение артефактов ---

// --- Сет 1: Закаленные В Битве (Uncommon, Uncommon, Rare, Rare) ---
const art_battleworn_talisman = {
    id: 'art_battleworn_talisman', name: 'Боевой Талисман Героя', icon: '/assets/artifacts/hero_talisman_worn.png', rarity: Rarity.UNCOMMON,
    description: "Хранит отголоски бесчисленных сражений.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "hp": +80 }, levelStats: { "hp": 25 }, basePowerLevel: 1400, powerPerLevelMultiplier: 0.04
};
const art_ironclad_gauntlets = {
    id: 'art_ironclad_gauntlets', name: 'Железные Рукавицы Воли', icon: '/assets/artifacts/hero_gauntlets_crude.png', rarity: Rarity.UNCOMMON,
    description: "Укрепляют руки и дух владельца.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "attack": +8 }, levelStats: { "attack": 2 }, basePowerLevel: 1400, powerPerLevelMultiplier: 0.04
};
const art_swift_march_boots = {
    id: 'art_swift_march_boots', name: 'Сапоги Быстрого Марша', icon: '/assets/artifacts/hero_boots_reinforced.png', rarity: Rarity.RARE,
    description: "Позволяют нестись по полю боя.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "attackSpeed": +0.4 }, levelStats: { "attackSpeed": 0.15 }, basePowerLevel: 2100, powerPerLevelMultiplier: 0.04
};
const art_unyielding_amulet = {
    id: 'art_unyielding_amulet', name: 'Непреклонный Амулет', icon: '/assets/artifacts/hero_amulet_simple.png', rarity: Rarity.RARE,
    description: "Символ стойкости и несгибаемой воли.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "critChance": +0.8 }, levelStats: { "critChance": 0.25 }, basePowerLevel: 2100, powerPerLevelMultiplier: 0.04
};

// --- Сет 2: Шепот Стихий (Uncommon, Rare, Rare, Epic) ---
const art_whispering_stone = {
    id: 'art_whispering_stone', name: 'Шепчущий Камень Ветра', icon: '/assets/artifacts/elemental_stone_wind.png', rarity: Rarity.UNCOMMON,
    description: "Наполнен легкой энергией ветра.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "attackSpeed": +0.6 }, levelStats: { "attackSpeed": 0.2 }, basePowerLevel: 1400, powerPerLevelMultiplier: 0.04
};
const art_glowing_orb = {
    id: 'art_glowing_orb', name: 'Светящаяся Сфера Огня', icon: '/assets/artifacts/elemental_orb_fire.png', rarity: Rarity.RARE,
    description: "Источает слабое тепло и силу пламени.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "attack": +25 }, levelStats: { "attack": 8 }, basePowerLevel: 2100, powerPerLevelMultiplier: 0.04
};
const art_flowing_waters = {
    id: 'art_flowing_waters', name: 'Текучие Воды Жизни', icon: '/assets/artifacts/elemental_waters.png', rarity: Rarity.RARE,
    description: "Несет в себе целительную силу.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "hpRegen": +5 }, levelStats: { "hpRegen": 2 }, basePowerLevel: 2100, powerPerLevelMultiplier: 0.04
};
const art_earthen_heart = {
    id: 'art_earthen_heart', name: 'Сердце Земли', icon: '/assets/artifacts/elemental_earth.png', rarity: Rarity.EPIC,
    description: "Дарует стойкость и защиту.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    baseStats: { "hp": +300, /* "defense": +8 */ }, levelStats: { "hp": 90, /* "defense": +3 */ }, basePowerLevel: 3200, powerPerLevelMultiplier: 0.04
};

// --- Сет 3: Тайны Древних Знаний (Uncommon, Rare, Epic, Epic) ---
const art_scroll_wisdom = {
    id: 'art_scroll_wisdom', name: 'Свиток Древней Мудрости', icon: '/assets/artifacts/ancient_scroll.png', rarity: Rarity.UNCOMMON,
    description: "Содержит знания давно ушедших эпох.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "critChance": +1.2 }, levelStats: { "critChance": 0.4 }, basePowerLevel: 1400, powerPerLevelMultiplier: 0.04
};
const art_ornate_key = {
    id: 'art_ornate_key', name: 'Искусный Ключ', icon: '/assets/artifacts/ancient_key.png', rarity: Rarity.RARE,
    description: "Открывает скрытые возможности.", // Может давать бонус к выпадению предметов?
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { /* "itemFind": +3% */ "attack": +15 }, levelStats: { /* "itemFind": +1% */ "attack": 5 }, basePowerLevel: 2100, powerPerLevelMultiplier: 0.04
};
const art_engraved_tablet = {
    id: 'art_engraved_tablet', name: 'Загадочная Табличка', icon: '/assets/artifacts/ancient_tablet.png', rarity: Rarity.EPIC,
    description: "Наполнена непостижимыми символами.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    baseStats: { "doubleStrikeChance": +1.5 }, levelStats: { "doubleStrikeChance": 0.5 }, basePowerLevel: 3200, powerPerLevelMultiplier: 0.04
};
const art_astrolabe_arcane = {
    id: 'art_astrolabe_arcane', name: 'Магический Астроляб', icon: '/assets/artifacts/ancient_astrolabe.png', rarity: Rarity.EPIC,
    description: "Позволяет предвидеть ходы противника.", // Может влиять на уклонение?
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    baseStats: { "attackSpeed": +1.2 }, levelStats: { "attackSpeed": 0.45 }, basePowerLevel: 3200, powerPerLevelMultiplier: 0.04
};

// --- Сет 4: Механизмы Прогресса (Rare, Epic, Epic, Legendary) ---
const art_precision_gear = {
    id: 'art_precision_gear', name: 'Прецизионный Механизм', icon: '/assets/artifacts/tech_gear_precision.png', rarity: Rarity.RARE,
    description: "Идеально подогнанные шестерни, повышающие точность.", // Увеличивает шанс крита?
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "critChance": +1.8 }, levelStats: { "critChance": 0.55 }, basePowerLevel: 2100, powerPerLevelMultiplier: 0.04
};
const art_energy_core = {
    id: 'art_energy_core', name: 'Ядро Энергии', icon: '/assets/artifacts/tech_core_energy.png', rarity: Rarity.EPIC,
    description: "Источник стабильной энергии, увеличивающий атаку.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    baseStats: { "attack": +60 }, levelStats: { "attack": 18 }, basePowerLevel: 3200, powerPerLevelMultiplier: 0.04
};
const art_magnetic_field = {
    id: 'art_magnetic_field', name: 'Магнитное Поле Защиты', icon: '/assets/artifacts/tech_field_magnetic.png', rarity: Rarity.EPIC,
    description: "Создает защитный барьер.", // Увеличивает HP?
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    baseStats: { "hp": +450 }, levelStats: { "hp": 135 }, basePowerLevel: 3200, powerPerLevelMultiplier: 0.04
};
const art_neural_interface = {
    id: 'art_neural_interface', name: 'Нейронный Интерфейс', icon: '/assets/artifacts/tech_interface_neural.png', rarity: Rarity.LEGENDARY,
    description: "Оптимизирует реакции, повышая скорость атаки.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    baseStats: { "attackSpeed": +2.0 }, levelStats: { "attackSpeed": 0.7 }, basePowerLevel: 5400, powerPerLevelMultiplier: 0.04
};

// --- Сет 5: Высшая Инженерия (Epic, Legendary, Legendary, Mythic) ---
const art_advanced_circuitry = {
    id: 'art_advanced_circuitry', name: 'Продвинутая Схема', icon: '/assets/artifacts/tech_circuit_advanced.png', rarity: Rarity.EPIC,
    description: "Сложная сеть проводников, увеличивающая шанс двойного удара.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    baseStats: { "doubleStrikeChance": +2.5 }, levelStats: { "doubleStrikeChance": 0.8 }, basePowerLevel: 3200, powerPerLevelMultiplier: 0.04
};
const art_holographic_projector = {
    id: 'art_holographic_projector', name: 'Голографический Проектор', icon: '/assets/artifacts/tech_projector_holo.png', rarity: Rarity.LEGENDARY,
    description: "Создает отвлекающие иллюзии.", // Может влиять на уклонение или шанс крита врага?
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    baseStats: { "critChance": +3.5 }, levelStats: { "critChance": 1.1 }, basePowerLevel: 5400, powerPerLevelMultiplier: 0.04
};
const art_quantum_processor = {
    id: 'art_quantum_processor', name: 'Квантовый Процессор', icon: '/assets/artifacts/tech_processor_quantum.png', rarity: Rarity.LEGENDARY,
    description: "Выполняет вычисления с невероятной скоростью, увеличивая атаку.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    baseStats: { "attack": +120 }, levelStats: { "attack": 36 }, basePowerLevel: 5400, powerPerLevelMultiplier: 0.04
};
const art_graviton_emitter = {
    id: 'art_graviton_emitter', name: 'Гравитонный Излучатель', icon: '/assets/artifacts/tech_emitter_graviton.png', rarity: Rarity.MYTHIC,
    description: "Изменяет гравитационные поля, влияя на скорость атаки.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 3,
    baseStats: { "attackSpeed": +4.0 }, levelStats: { "attackSpeed": 1.3 }, basePowerLevel: 8000, powerPerLevelMultiplier: 0.04
};

// --- Сет 6: Космические Технологии (Legendary, Legendary, Mythic, Mythic) ---
const art_interstellar_drive = {
    id: 'art_interstellar_drive', name: 'Звездолетный Двигатель', icon: '/assets/artifacts/cosmic_drive_interstellar.png', rarity: Rarity.LEGENDARY,
    description: "Позволяет преодолевать огромные расстояния.", // Увеличивает HP?
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    baseStats: { "hp": +800 }, levelStats: { "hp": 240 }, basePowerLevel: 5400, powerPerLevelMultiplier: 0.04
};
const art_dark_matter_core = {
    id: 'art_dark_matter_core', name: 'Ядро Темной Материи', icon: '/assets/artifacts/cosmic_core_darkmatter.png', rarity: Rarity.LEGENDARY,
    description: "Содержит невероятную энергию, значительно увеличивая атаку.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    baseStats: { "attack": +180 }, levelStats: { "attack": 54 }, basePowerLevel: 5400, powerPerLevelMultiplier: 0.04
};
const art_singularity_shard = {
    id: 'art_singularity_shard', name: 'Осколок Сингулярности', icon: '/assets/artifacts/cosmic_shard_singularity.png', rarity: Rarity.MYTHIC,
    description: "Искажает пространство и время, увеличивая шанс критического удара.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 3,
    baseStats: { "critChance": +6.0 }, levelStats: { "critChance": 1.8 }, basePowerLevel: 8000, powerPerLevelMultiplier: 0.04
};
const art_tachyon_accelerator = {
    id: 'art_tachyon_accelerator', name: 'Тахионный Ускоритель', icon: '/assets/artifacts/cosmic_accelerator_tachyon.png', rarity: Rarity.MYTHIC,
    description: "Ускоряет частицы до сверхсветовых скоростей, значительно повышая скорость атаки.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 3,
    baseStats: { "attackSpeed": +6.0 }, levelStats: { "attackSpeed": 1.9 }, basePowerLevel: 8000, powerPerLevelMultiplier: 0.04
};

// --- Определение СЕТОВ с обновленными артефактами и бонусами ---
export const ARTIFACT_SETS = [
    {
        id: 'set_battle_hardened',
        name: "Закаленные В Битве",
        rarity: "uncommon",
        artifacts: [art_battleworn_talisman, art_ironclad_gauntlets,art_swift_march_boots, art_unyielding_amulet],
        bonuses: [
            { condition: '[Собрано 2]', description: 'HP +40, Attack +5' },
            { condition: '[Собрано 4]', description: 'Attack Speed +0.3, Crit Chance +0.5%, PowerLevel +3%' }
        ]
    },
    {
        id: 'set_elemental_whispers',
        name: "Шепот Стихий",
        rarity: "rare",
        artifacts: [art_whispering_stone, art_glowing_orb, art_flowing_waters, art_earthen_heart],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +15, HP Regen +3' },
            { condition: '[Собрано 4]', description: 'Attack Speed +0.8, HP +200, PowerLevel +4%' }
        ]
    },
    {
        id: 'set_ancient_knowledge',
        name: "Тайны Древних Знаний",
        rarity: "epic",
        artifacts: [art_scroll_wisdom, art_ornate_key, art_engraved_tablet, art_astrolabe_arcane],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Crit Chance +1.8%, Double Strike Chance +0.8%' },
            { condition: '[Собрано 4]', description: 'Attack +40, Attack Speed +1.0, PowerLevel +5%' }
        ]
    },
    {
        id: 'set_mechanisms_of_progress',
        name: "Механизмы Прогресса",
        rarity: "epic",
        artifacts: [art_precision_gear, art_energy_core, art_magnetic_field, art_neural_interface],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +30, Crit Chance +1.2%' },
            { condition: '[Собрано 4]', description: 'Attack Speed +1.5, HP +300, PowerLevel +5%' }
        ]
    },
    {
        id: 'set_superior_engineering',
        name: "Высшая Инженерия",
        rarity: "legendary",
        artifacts: [art_advanced_circuitry, art_holographic_projector, art_quantum_processor, art_graviton_emitter],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Double Strike Chance +1.8%, Crit Chance +2.5%' },
            { condition: '[Собрано 4]', description: 'Attack +80, Attack Speed +2.0, PowerLevel +6%' }
        ]
    },
    {
        id: 'set_cosmic_technologies',
        name: "Космические Технологии",
        rarity: "mythic",
        artifacts: [art_interstellar_drive, art_dark_matter_core, art_singularity_shard, art_tachyon_accelerator],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +100, HP +500' },
            { condition: '[Собрано 4]', description: 'Crit Chance +4.0%, Attack Speed +3.0, PowerLevel +7%' }
        ]
    },
];

// --- Карта для быстрого доступа к данным артефакта по ID ---
const ALL_ARTIFACTS_MAP = new Map();
ARTIFACT_SETS.forEach(set => {
    set.artifacts.forEach(artifact => {
        // Добавляем дефолты
        if (!artifact.description) artifact.description = "Описание артефакта...";
        if (!artifact.maxLevel) artifact.maxLevel = MAX_ARTIFACT_LEVEL;
        if (!artifact.baseShardCost) artifact.baseShardCost = BASE_SHARD_COST_PER_LEVEL;
        if (!artifact.baseStats) artifact.baseStats = {};
        if (!artifact.levelStats) artifact.levelStats = {};
        if (artifact.basePowerLevel === undefined) artifact.basePowerLevel = 0;
        if (artifact.powerPerLevelMultiplier === undefined) artifact.powerPerLevelMultiplier = 0;

        ALL_ARTIFACTS_MAP.set(artifact.id, artifact);
    });
});

// --- Экспорт массива всех артефактов ---
export const ALL_ARTIFACTS_ARRAY = Array.from(ALL_ARTIFACTS_MAP.values());

// --- Экспорт функции для получения данных артефакта по ID ---
export const getArtifactById = (id) => ALL_ARTIFACTS_MAP.get(id);