// src/data/artifactsData.js

// Определение возможных редкостей (для удобства)
export const Rarity = {
    COMMON: 'common',
    RARE: 'rare',
    LEGENDARY: 'legendary',
    MYTHIC: 'mythic',
};

// --- Параметры прокачки ---
export const MAX_ARTIFACT_LEVEL = 10;
export const BASE_SHARD_COST_PER_LEVEL = 10;

// --- Определение артефактов с новыми полями и твоими статами ---

// Сет 1: Клятва Рыцаря (Фокус наhp и немного атаки)
const art_helm_valor = {
    id: 'art_helm_valor', name: 'Шлем Доблести', icon: '/assets/artifacts/knight_helm.png', rarity: Rarity.RARE,
    description: "Прочный шлем, внушающий смелость владельцу.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "hp": +150 },
    levelStats: { "hp": 50 }, // +500hp на макс уровне
    basePowerLevel: 20, powerLevelPerLevel: 8
};
const art_plate_loyalty = {
    id: 'art_plate_loyalty', name: 'Нагрудник Верности', icon: '/assets/artifacts/knight_chest.png', rarity: Rarity.RARE,
    description: "Защищает сердце и укрепляет дух.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "hp": +100 },
    levelStats: { "hp": +40, "attack": +3 }, // +400hp, +30 ATK на макс уровне
    basePowerLevel: 20, powerLevelPerLevel: 8
};
const art_shield_honor = {
    id: 'art_shield_honor', name: 'Щит Чести', icon: '/assets/artifacts/knight_shield.png', rarity: Rarity.LEGENDARY,
    description: "Несокрушимый щит, отражающий атаки врагов.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: { "hp": +300, "attack": +20 },
    levelStats: { "hp": +100, "attack": +5 }, // +1000hp, +50 ATK на макс уровне
    basePowerLevel: 50, powerLevelPerLevel: 15
};

// Сет 2: Шепот Леса (Фокус на скорости, критах, двойном ударе)
const art_bow_winds = {
    id: 'art_bow_winds', name: 'Лук Ветров', icon: '/assets/artifacts/elf_bow.png', rarity: Rarity.RARE,
    description: "Стрелы летят быстрее ветра.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {"attack": 40},
    levelStats: {"attack": 12, "attackSpeed": 0.5 }, // +120 ATK, +5  AS на макс
    basePowerLevel: 25, powerLevelPerLevel: 9
};
const art_quiver_swiftness = {
    id: 'art_quiver_swiftness', name: 'Колчан Скорости', icon: '/assets/artifacts/elf_quiver.png', rarity: Rarity.RARE,
    description: "Позволяет выпускать стрелы чаще.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {"attackSpeed": 3},
    levelStats: {"attackSpeed": 1}, // +10  AS на макс
    basePowerLevel: 15, powerLevelPerLevel: 7
};
const art_cloak_shadows = {
    id: 'art_cloak_shadows', name: 'Плащ Невидимости', icon: '/assets/artifacts/elf_cloak.png', rarity: Rarity.LEGENDARY,
    description: "Позволяет легко уходить от атак и наносить неожиданные удары.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {"critChance": 2, "doubleStrikeChance": 1},
    levelStats: {"critChance": 0.5, "doubleStrikeChance": 0.4}, // +5  critChance, +4  Double на макс
    basePowerLevel: 45, powerLevelPerLevel: 14
};

// Сет 3: Наследие Мага (Фокус на атаке, критах)
const art_crown_knowledge = {
    id: 'art_crown_knowledge', name: 'Корона Знаний', icon: '/assets/artifacts/mage_crown.png', rarity: Rarity.LEGENDARY,
    description: "Увеличивает магическую силу.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {"attack": 50, "critChance": 1.5 },
    levelStats: {"attack": 15, "critChance": 0.4 }, // +150 ATK, +4  critChance на макс
    basePowerLevel: 60, powerLevelPerLevel: 18
};
const art_orb_elements = {
    id: 'art_orb_elements', name: 'Сфера Стихий', icon: '/assets/artifacts/mage_orb.png', rarity: Rarity.RARE,
    description: "Усиливает разрушительную мощь.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {"attack": 30},
    levelStats: {"attack": 10}, // +100 ATK на макс
    basePowerLevel: 22, powerLevelPerLevel: 8
};
const art_staff_lightning = {
    id: 'art_staff_lightning', name: 'Посох Молний', icon: '/assets/artifacts/mage_staff.png', rarity: Rarity.LEGENDARY,
    description: "Проводник чистой энергии молний.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {"attack": 80, "critChance": 3},
    levelStats: {"attack": 25, "critChance": 0.5}, // +250 ATK, +5  critChance на макс
    basePowerLevel: 55, powerLevelPerLevel: 16
};

// Сет 4: Сокровища Глубин (Сбалансированный сет)
const art_pearl_abyss = {
    id: 'art_pearl_abyss', name: 'Жемчужина Бездны', icon: '/assets/artifacts/sea_pearl.png', rarity: Rarity.LEGENDARY,
    description: "Переливается таинственной энергией.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {"hp": 200, "attack": 40},
    levelStats: {"hp": 60, "attack": 10}, // +600hp, +100 ATK на макс
    basePowerLevel: 40, powerLevelPerLevel: 12
};
const art_trident_poseidon = {
    id: 'art_trident_poseidon', name: 'Трезубец Посейдона', icon: '/assets/artifacts/sea_trident.png', rarity: Rarity.MYTHIC,
    description: "Оружие бога морей, источающее мощь.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {"attack": 150, "critChance": 4},
    levelStats: {"attack": 40, "critChance": 0.6}, // +400 ATK, +6  critChance на макс
    basePowerLevel: 100, powerLevelPerLevel: 25
};
const art_helm_lostships = {
    id: 'art_helm_lostships', name: 'Штурвал Затерянных Кораблей', icon: '/assets/artifacts/sea_wheel.png', rarity: Rarity.RARE,
    description: "Направляет на верный курс.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {"attackSpeed": 2},
    levelStats: {"attackSpeed": 0.8}, // +8  AS на макс
    basePowerLevel: 18, powerLevelPerLevel: 6
};


// --- Определение СЕТОВ с обновленными бонусами ---
export const ARTIFACT_SETS = [
    {
        id: 'set_knights_oath',
        name: "Клятва Рыцаря",
        artifacts: [ art_helm_valor, art_plate_loyalty, art_shield_honor ],
        bonuses: [
            { condition: '[Собрано 2]', description: 'hp +15 ' }, // Увеличил бонусhp
            { condition: '[Собрано 3]', description: 'hp +30 , attack +10 ' } // Заменил реген на атаку
        ]
    },
    {
        id: 'set_whisperwind',
        name: "Шепот Леса",
        artifacts: [ art_bow_winds, art_quiver_swiftness, art_cloak_shadows ],
        bonuses: [
            { condition: '[Собрано 2]', description: 'attackSpeed  +10 ' }, // Увеличил скорость атаки
            { condition: '[Собрано 3]', description: 'attackSpeed  +20 , doubleStrikeChance  +10 ' } // Добавил двойной удар
        ]
    },
    {
        id: 'set_mages_legacy', 
        name: "Наследие Мага",
        artifacts: [ art_crown_knowledge, art_orb_elements, art_staff_lightning ],
        bonuses: [
            { condition: '[Собрано 2]', description: 'attack +15 ' }, // Увеличил атаку
            { condition: '[Собрано 3]', description: 'attack +30 , critChance +8 ' } // Заменил доп. снаряд на шанс крита
        ]
    },
    {
        id: 'set_deepsea_treasures',
        name: "Сокровища Глубин",
        artifacts: [ art_pearl_abyss, art_trident_poseidon, art_helm_lostships ],
        bonuses: [
            { condition: '[Собрано 2]', description: 'critChance  +5 ' }, // Заменил золото на крит
            { condition: '[Собрано 3]', description: 'attack +15 , hp +15 ' } // Заменил поиск осколков и золота на статы
        ]
    },
];

// --- Карта для быстрого доступа к данным артефакта по ID ---
const ALL_ARTIFACTS_MAP = new Map();
ARTIFACT_SETS.forEach(set => {
    set.artifacts.forEach(artifact => {
        // Добавляем дефолты (без изменений)
        if (!artifact.description) artifact.description = "Описание артефакта...";
        if (!artifact.maxLevel) artifact.maxLevel = MAX_ARTIFACT_LEVEL;
        if (!artifact.baseShardCost) artifact.baseShardCost = BASE_SHARD_COST_PER_LEVEL;
        if (!artifact.baseStats) artifact.baseStats = {};
        if (!artifact.levelStats) artifact.levelStats = {};
        if (artifact.basePowerLevel === undefined) artifact.basePowerLevel = 0;
        if (artifact.powerLevelPerLevel === undefined) artifact.powerLevelPerLevel = 0;

        ALL_ARTIFACTS_MAP.set(artifact.id, artifact);
    });
});

// --- >>> ДОБАВИТЬ ЭТОТ ЭКСПОРТ <<< ---
export const ALL_ARTIFACTS_ARRAY = Array.from(ALL_ARTIFACTS_MAP.values());
// --- >>> КОНЕЦ ДОБАВЛЕНИЯ <<< ---


// --- Экспорт функции для получения данных артефакта по ID ---
export const getArtifactById = (id) => ALL_ARTIFACTS_MAP.get(id);
// --- ---