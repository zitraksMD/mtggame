// src/data/itemsDatabase.js

// --- КОНСТАНТЫ И БАЗОВЫЕ ДАННЫЕ ---
export const MAX_ITEM_LEVEL = 100;
export const PLAYER_BASE_HP = 100; // Базовое здоровье игрока

// Максимальный возможный ролл характеристики для предмета Mythic L100
// Ключи для HP и ATK включают тип слота для специфичных максимумов
const MYTHIC_L100_MAX_ROLLS = {
    HP_ARMOR: 15000,
    HP_BOOTS: 15000,
    HP_HELMET: 15000,
    ATK_WEAPON: 7000,
    ATK_AMULET: 4000,
    ATK_RING: 4000,
    AS_PERC: 0.667,  // +66.7% (0.667 означает прирост на 66.7% от базовой скорости)
    CC_PERC: 0.0833,  // +8.33%
    DSC_PERC: 0.0625, // +6.25%
};

// Мультипликаторы характеристик в зависимости от редкости
const STAT_RARITY_MULTIPLIERS = {
    Common: 0.15,
    Uncommon: 0.30,
    Rare: 0.50,
    Epic: 0.70,
    Legendary: 0.85,
    Mythic: 1.0,
};

// Мультипликаторы стоимости улучшения золотом в зависимости от редкости
const GOLD_COST_RARITY_MULTIPLIERS = {
    Common: 1.0,
    Uncommon: 1.5,
    Rare: 2.5,
    Epic: 4.0,
    Legendary: 7.0,
    Mythic: 12.0,
};

// Константы для расчета стоимости улучшения золотом
const BASE_COMMON_L1_UPGRADE_GOLD_COST = 750; // Стоимость улучшения Common с L1 на L2
const GOLD_COST_LEVEL_LINEAR_FACTOR = 100;
const GOLD_COST_LEVEL_EXP_FACTOR = 10;
const GOLD_COST_LEVEL_CURVE_FACTOR = 1.5; // Степенной коэффициент

// Константы для расчета стоимости улучшения алмазами
const BASE_DIAMOND_UPGRADE_COST = 35; // Для улучшения с L50 на L51
const DIAMOND_COST_LEGENDARY_LEVEL_FACTOR = 2; // Прирост за уровень для Legendary
const DIAMOND_COST_MYTHIC_LEVEL_FACTOR = 5;    // Прирост за уровень для Mythic
const DIAMOND_COST_START_LEVEL = 50; // Уровень, С которого начинается стоимость в алмазах

// --- ФУНКЦИИ-ХЕЛПЕРЫ ---

/**
 * Рассчитывает значение характеристики для предмета.
 * @param {string} itemType Тип предмета (e.g., "weapon", "armor").
 * @param {string} statName Название характеристики (e.g., "attackBonus", "hpBonus").
 * @param {string} rarity Редкость предмета.
 * @param {number} level Уровень предмета (1-100).
 * @returns {number} Рассчитанное значение характеристики.
 */
export function calculateItemStat(itemType, statName, rarity, level) {
if (typeof level !== 'number' || Number.isNaN(level) || level < 1) {
    level = 1; // Если уровень не число, NaN, null, undefined или меньше 1, считаем его равным 1
} else if (level > MAX_ITEM_LEVEL) {
    level = MAX_ITEM_LEVEL; // Если уровень больше максимального, ограничиваем максимальным
}

    let baseMaxRollM100;
    switch (statName) {
        case "hpBonus":
            if (itemType === "armor") baseMaxRollM100 = MYTHIC_L100_MAX_ROLLS.HP_ARMOR;
            else if (itemType === "boots") baseMaxRollM100 = MYTHIC_L100_MAX_ROLLS.HP_BOOTS;
            else if (itemType === "helmet") baseMaxRollM100 = MYTHIC_L100_MAX_ROLLS.HP_HELMET;
            else return 0;
            break;
        case "attackBonus":
            if (itemType === "weapon") baseMaxRollM100 = MYTHIC_L100_MAX_ROLLS.ATK_WEAPON;
            else if (itemType === "amulet") baseMaxRollM100 = MYTHIC_L100_MAX_ROLLS.ATK_AMULET;
            else if (itemType === "ring") baseMaxRollM100 = MYTHIC_L100_MAX_ROLLS.ATK_RING;
            else return 0;
            break;
        case "attackSpeedBonus": // Дают Оружие, Броня, Сапоги
            if (!["weapon", "armor", "boots"].includes(itemType)) return 0;
            baseMaxRollM100 = MYTHIC_L100_MAX_ROLLS.AS_PERC;
            break;
        case "critChanceBonus": // Дают все 6 типов
            if (!["weapon", "armor", "boots", "helmet", "amulet", "ring"].includes(itemType)) return 0;
            baseMaxRollM100 = MYTHIC_L100_MAX_ROLLS.CC_PERC;
            break;
        case "doubleStrikeChanceBonus": // Дают Оружие, Шлем, Ожерелье, Кольцо
            if (!["weapon", "helmet", "amulet", "ring"].includes(itemType)) return 0;
            baseMaxRollM100 = MYTHIC_L100_MAX_ROLLS.DSC_PERC;
            break;
        default:
            return 0;
    }

    const rarityMultiplier = STAT_RARITY_MULTIPLIERS[rarity] || STAT_RARITY_MULTIPLIERS.Common;
    const maxStatForRarityAtL100 = baseMaxRollM100 * rarityMultiplier;

    let statValue;
    if (MAX_ITEM_LEVEL === 1) { // Если максимальный уровень всего 1
        statValue = maxStatForRarityAtL100;
    } else if (level === 1) {
        statValue = maxStatForRarityAtL100 * 0.2; // 20% на L1
    } else {
        // Линейный рост для оставшихся 80% на 99 уровнях улучшений
        statValue = maxStatForRarityAtL100 * (0.2 + 0.8 * (level - 1) / (MAX_ITEM_LEVEL - 1));
    }
    
    // Округление для HP и Attack, проценты возвращаются как есть (десятичные дроби)
    if (statName === "hpBonus" || statName === "attackBonus") {
        return Math.round(statValue);
    }
    // Для процентных статов возвращаем значение (например, 0.05 для 5%)
    // Округление для отображения (e.g. .toFixed(3)) лучше делать в UI
    return statValue; 
}

/**
 * Рассчитывает стоимость улучшения предмета в золоте.
 * @param {number} currentLevel Текущий уровень предмета (1-99).
 * @param {string} rarity Редкость предмета.
 * @returns {number} Стоимость улучшения в золоте.
 */
export function getGoldUpgradeCost(currentLevel, rarity) {
    if (currentLevel < 1 || currentLevel >= MAX_ITEM_LEVEL) return Infinity; 

    const L_eff_gold = currentLevel - 1;
    const commonCost = BASE_COMMON_L1_UPGRADE_GOLD_COST +
                       (L_eff_gold * GOLD_COST_LEVEL_LINEAR_FACTOR) +
                       Math.floor(Math.pow(L_eff_gold, GOLD_COST_LEVEL_CURVE_FACTOR) * GOLD_COST_LEVEL_EXP_FACTOR);

    const rarityMultiplier = GOLD_COST_RARITY_MULTIPLIERS[rarity] || GOLD_COST_RARITY_MULTIPLIERS.Common;
    return Math.round(commonCost * rarityMultiplier);
}

/**
 * Рассчитывает стоимость улучшения предмета в алмазах.
 * @param {number} currentLevel Текущий уровень предмета (1-99).
 * @param {string} rarity Редкость предмета.
 * @returns {number} Стоимость улучшения в алмазах (0, если не требуется).
 */
export function getDiamondUpgradeCost(currentLevel, rarity) {
    if (currentLevel < DIAMOND_COST_START_LEVEL || currentLevel >= MAX_ITEM_LEVEL) {
        return 0;
    }

    const L_eff_diamond = currentLevel - DIAMOND_COST_START_LEVEL; // От 0 до (MAX_ITEM_LEVEL - 1 - DIAMOND_COST_START_LEVEL)

    if (rarity === "Legendary") {
        return BASE_DIAMOND_UPGRADE_COST + L_eff_diamond * DIAMOND_COST_LEGENDARY_LEVEL_FACTOR;
    } else if (rarity === "Mythic") {
        return BASE_DIAMOND_UPGRADE_COST + L_eff_diamond * DIAMOND_COST_MYTHIC_LEVEL_FACTOR;
    }
    return 0;
}

// --- БАЗА ДАННЫХ ПРЕДМЕТОВ ---
// Теперь предметы не содержат числовых значений характеристик,
// они будут рассчитываться функциями выше на основе type, rarity и level.
// Поля basePowerLevel и powerPerLevelMultiplier оставлены, если вы их используете для расчета "Силы Предмета".
const itemsDatabase = [
    // ========================
    // --- Common ---
    // ========================
    {
        id: "common-shortbow", name: "Короткий лук", type: "weapon", weaponClass: "bow",
        rarity: "Common", image: "/assets/weapons/bow_common_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Простой, но надежный лук для начинающего стрелка. Тетива слегка потерта.",
        // Статы: attackBonus, attackSpeedBonus, doubleStrikeChanceBonus, critChanceBonus (определяются по type="weapon")
        basePowerLevel: 100, powerPerLevelMultiplier: 0.015,
    },
    {
        id: "common-leather-cap", name: "Кожаная шапка", type: "helmet",
        rarity: "Common", image: "/assets/helmets/helmet_common_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Базовая защита головы из дубленой кожи. Лучше, чем совсем ничего.",
        // Статы: hpBonus, critChanceBonus, doubleStrikeChanceBonus (определяются по type="helmet")
        basePowerLevel: 100, powerPerLevelMultiplier: 0.015,
    },
    {
        id: "common-padded-vest", name: "Стеганая жилетка", type: "armor",
        rarity: "Common", image: "/assets/armor/armor_common_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Смягчает удары, но вряд ли спасет от серьезного оружия. Пахнет пылью.",
        // Статы: hpBonus, attackSpeedBonus, critChanceBonus (определяются по type="armor")
        basePowerLevel: 100, powerPerLevelMultiplier: 0.015,
    },
    {
        id: "common-worn-boots", name: "Потертые сапоги", type: "boots",
        rarity: "Common", image: "/assets/boots/boots_common_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Видали и лучшие дни, но все еще защищают ноги от острых камней.",
        // Статы: hpBonus, attackSpeedBonus, critChanceBonus (определяются по type="boots")
        basePowerLevel: 100, powerPerLevelMultiplier: 0.015,
    },
    {
        id: "common-iron-ring", name: "Железное кольцо", type: "ring",
        rarity: "Common", image: "/assets/rings/ring_common_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Грубое железное кольцо. Немного утяжеляет кулак и холодит палец.",
        // Статы: attackBonus, critChanceBonus, doubleStrikeChanceBonus (определяются по type="ring")
        basePowerLevel: 100, powerPerLevelMultiplier: 0.015,
    },
    {
        id: "common-simple-pendant", name: "Простой кулон", type: "amulet",
        rarity: "Common", image: "/assets/amulets/amulet_common_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Незамысловатый кулон на потертой веревке. Возможно, приносит удачу, а может и нет.",
        // Статы: attackBonus, critChanceBonus, doubleStrikeChanceBonus (определяются по type="amulet")
        basePowerLevel: 100, powerPerLevelMultiplier: 0.015,
    },

    // ========================
    // --- Uncommon ---
    // ========================
    {
        id: "uncommon-hunters-bow", name: "Лук охотника", type: "weapon", weaponClass: "bow",
        rarity: "Uncommon", image: "/assets/weapons/bow_uncommon_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Добротный лук, популярный среди следопытов. Удобно лежит в руке.",
        basePowerLevel: 225, powerPerLevelMultiplier: 0.018,
    },
    {
        id: "uncommon-studded-cap", name: "Клепаная шапка", type: "helmet",
        rarity: "Uncommon", image: "/assets/helmets/helmet_uncommon_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Кожаная шапка, усиленная металлическими заклепками. Дает базовую защиту от тупых предметов.",
        basePowerLevel: 225, powerPerLevelMultiplier: 0.018,
    },
    {
        id: "uncommon-reinforced-vest", name: "Усиленная жилетка", type: "armor",
        rarity: "Uncommon", image: "/assets/armor/armor_uncommon_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Жилетка с добавлением прочных кожаных вставок. Дает шанс пережить еще один бой.",
        basePowerLevel: 225, powerPerLevelMultiplier: 0.018,
    },
    {
        id: "uncommon-sturdy-boots", name: "Крепкие сапоги", type: "boots",
        rarity: "Uncommon", image: "/assets/boots/boots_uncommon_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Крепкие сапоги с толстой подошвой. Удобны для долгих переходов по пересеченной местности.",
        basePowerLevel: 225, powerPerLevelMultiplier: 0.018,
    },
    {
        id: "uncommon-silver-ring", name: "Серебряное кольцо", type: "ring",
        rarity: "Uncommon", image: "/assets/rings/ring_uncommon_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Кольцо из тусклого серебра. Чувствуется легкая, почти угасшая магия.",
        basePowerLevel: 225, powerPerLevelMultiplier: 0.018,
    },
    {
        id: "uncommon-charm-vigor", name: "Талисман бодрости", type: "amulet",
        rarity: "Uncommon", image: "/assets/amulets/amulet_uncommon_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Этот талисман из гладкого камня придает носителю немного жизненных сил.",
        basePowerLevel: 225, powerPerLevelMultiplier: 0.018,
    },

    // ========================
    // --- Rare ---
    // ========================
    {
        id: "rare-elven-bow", name: "Эльфийский лук", type: "weapon", weaponClass: "bow",
        rarity: "Rare", image: "/assets/weapons/bow_rare_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Легкий и изящный лук, созданный эльфийскими мастерами. Стрелы летят быстрее и точнее.",
        basePowerLevel: 500, powerPerLevelMultiplier: 0.022,
    },
    {
        id: "rare-steel-helmet", name: "Стальной шлем", type: "helmet",
        rarity: "Rare", image: "/assets/helmets/helmet_rare_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Надежный стальной шлем, отполированный до блеска. Способен выдержать сильный удар.",
        basePowerLevel: 500, powerPerLevelMultiplier: 0.022,
    },
    {
        id: "rare-scale-mail", name: "Чешуйчатая броня", type: "armor",
        rarity: "Rare", image: "/assets/armor/armor_rare_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Броня из перекрывающихся стальных пластин, напоминающих чешую дракона.",
        basePowerLevel: 500, powerPerLevelMultiplier: 0.022,
    },
    {
        id: "rare-swift-boots", name: "Быстрые сапоги", type: "boots",
        rarity: "Rare", image: "/assets/boots/boots_rare_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Легкие кожаные сапоги, зачарованные на скорость. Ноги в них будто сами несут вперед.",
        basePowerLevel: 500, powerPerLevelMultiplier: 0.022,
    },
    {
        id: "rare-gemstone-ring", name: "Кольцо с самоцветом", type: "ring",
        rarity: "Rare", image: "/assets/rings/ring_rare_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Золотое кольцо, украшенное мерцающим самоцветом. Концентрирует магическую энергию.",
        basePowerLevel: 500, powerPerLevelMultiplier: 0.022,
    },
    {
        id: "rare-amulet-precision", name: "Амулет точности", type: "amulet",
        rarity: "Rare", image: "/assets/amulets/amulet_rare_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Амулет с выгравированным символом глаза. Обостряет чувства и направляет руку владельца.",
        basePowerLevel: 500, powerPerLevelMultiplier: 0.022,
    },

    // ========================
    // --- Epic ---
    // ========================
    {
        id: "epic-dragonbone-bow", name: "Лук из кости дракона", type: "weapon", weaponClass: "bow",
        rarity: "Epic", image: "/assets/weapons/bow_epic_dragon.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Мощный лук, сделанный из кости древнего дракона. Наконечники стрел пробивают любую броню.",
        basePowerLevel: 1050, powerPerLevelMultiplier: 0.028,
    },
    {
        id: "epic-guardian-helm", name: "Шлем Несокрушимого Стража", type: "helmet",
        rarity: "Epic", image: "/assets/helmets/helmet_epic_guardian.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Тяжелый шлем, выкованный для защиты королевских особ. Украшен фамильным гербом.",
        basePowerLevel: 1050, powerPerLevelMultiplier: 0.028,
    },
    {
        id: "epic-phoenix-mail", name: "Броня Пепла Феникса", type: "armor",
        rarity: "Epic", image: "/assets/armor/armor_epic_phoenix.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Кажется, эта броня все еще хранит тепло огня мифической птицы. Защищает и исцеляет.",
        basePowerLevel: 1050, powerPerLevelMultiplier: 0.028,
    },
    {
        id: "epic-shadow-walkers", name: "Сапоги Призрачного Шага", type: "boots",
        rarity: "Epic", image: "/assets/boots/boots_epic_shadow.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Эти сапоги позволяют передвигаться почти бесшумно, словно тень.",
        basePowerLevel: 1050, powerPerLevelMultiplier: 0.028,
    },
    {
        id: "epic-runic-ring", name: "Кольцо Рунной Магии", type: "ring",
        rarity: "Epic", image: "/assets/rings/ring_epic_rune.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Кольцо испещрено древними рунами, которые светятся при использовании магии.",
        basePowerLevel: 1050, powerPerLevelMultiplier: 0.028,
    },
    {
        id: "epic-stormcaller-amulet", name: "Амулет Призывателя Гроз", type: "amulet",
        rarity: "Epic", image: "/assets/amulets/amulet_epic_storm.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Внутри этого амулета заключена сила молнии и грома.",
        basePowerLevel: 1050, powerPerLevelMultiplier: 0.028,
    },

    // ========================
    // --- Legendary (Set: tide_set) ---
    // ========================
    {
        id: "legendary-bow-tide", name: "Лук Прилива", type: "weapon", weaponClass: "bow",
        rarity: "Legendary", setId: "tide_set", image: "/assets/weapons/bow_legendary_tide.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Лук, заряженный мощью океанских глубин. Каждая стрела несет силу прилива.",
        basePowerLevel: 2100, powerPerLevelMultiplier: 0.032,
    },
    {
        id: "legendary-helm-tide", name: "Шлем Бездны", type: "helmet",
        rarity: "Legendary", setId: "tide_set", image: "/assets/helmets/helmet_legendary_tide.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Шлем, поднятый со дна моря. В нем слышен шепот затонувших цивилизаций.",
        basePowerLevel: 2100, powerPerLevelMultiplier: 0.032,
    },
    {
        id: "legendary-armor-tide", name: "Кираса Затонувших Городов", type: "armor",
        rarity: "Legendary", setId: "tide_set", image: "/assets/armor/armor_legendary_tide.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Кираса из перламутра и кораллов, закаленная давлением глубоководья.",
        basePowerLevel: 2100, powerPerLevelMultiplier: 0.032,
    },
    {
        id: "legendary-boots-tide", name: "Сапоги Водоворота", type: "boots",
        rarity: "Legendary", setId: "tide_set", image: "/assets/boots/boots_legendary_tide.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Сапоги, позволяющие идти по воде, словно по суше, и двигаться со скоростью течения.",
        basePowerLevel: 2100, powerPerLevelMultiplier: 0.032,
    },
    {
        id: "legendary-ring-tide", name: "Кольцо Повелителя Океана", type: "ring",
        rarity: "Legendary", setId: "tide_set", image: "/assets/rings/ring_legendary_tide.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Кольцо, дарующее власть над морскими течениями и его обитателями. Пульсирует силой.",
        basePowerLevel: 2100, powerPerLevelMultiplier: 0.032,
    },
    {
        id: "legendary-amulet-tide", name: "Амулет Приливов", type: "amulet",
        rarity: "Legendary", setId: "tide_set", image: "/assets/amulets/amulet_legendary_tide.png", maxLevel: MAX_ITEM_LEVEL,
        description: "В сердце амулета бьется энергия приливов и отливов, даруя стойкость океана.",
        basePowerLevel: 2100, powerPerLevelMultiplier: 0.032,
    },

    // ========================
    // --- Mythic (Set: celestial_hunter_set) ---
    // ========================
    {
        id: "mythic-crossbow-celestial", name: "Звездный Арбалет", type: "weapon", weaponClass: "crossbow",
        rarity: "Mythic", setId: "celestial_hunter_set", image: "/assets/weapons/crossbow_mythic_celestial.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Наконечники его болтов выкованы из света умирающих звезд. Каждый выстрел - маленький апокалипсис.",
        basePowerLevel: 4150, powerPerLevelMultiplier: 0.035,
    },
    {
        id: "mythic-helm-celestial", name: "Корона Созвездий", type: "helmet",
        rarity: "Mythic", setId: "celestial_hunter_set", image: "/assets/helmets/helmet_mythic_celestial.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Мерцает светом далеких галактик, нашептывая секреты космоса.",
        basePowerLevel: 4150, powerPerLevelMultiplier: 0.035,
    },
    {
        id: "mythic-armor-celestial", name: "Одеяние Туманности", type: "armor",
        rarity: "Mythic", setId: "celestial_hunter_set", image: "/assets/armor/armor_mythic_celestial.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Соткано из космической пыли и чистого звездного света. Легкое, но невероятно прочное.",
        basePowerLevel: 4150, powerPerLevelMultiplier: 0.035,
    },
    {
        id: "mythic-boots-celestial", name: "Поступь Кометы", type: "boots",
        rarity: "Mythic", setId: "celestial_hunter_set", image: "/assets/boots/boots_mythic_celestial.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Позволяют передвигаться со скоростью падающей звезды, оставляя за собой мерцающий след.",
        basePowerLevel: 4150, powerPerLevelMultiplier: 0.035,
    },
    {
        id: "mythic-ring-celestial", name: "Кольцо Пустоты", type: "ring",
        rarity: "Mythic", setId: "celestial_hunter_set", image: "/assets/rings/ring_mythic_celestial.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Хранит в себе эхо Большого Взрыва и тишину межзвездной пустоты.",
        basePowerLevel: 4150, powerPerLevelMultiplier: 0.035,
    },
    {
        id: "mythic-amulet-celestial", name: "Амулет Вечного Цикла", type: "amulet",
        rarity: "Mythic", setId: "celestial_hunter_set", image: "/assets/amulets/amulet_mythic_celestial.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Символизирует бесконечное рождение и смерть звезд, даруя частицу их мощи.",
        basePowerLevel: 4150, powerPerLevelMultiplier: 0.035,
    },
];

export default itemsDatabase;

// --- Хелпер для получения предмета по ID ---
const ITEMS_MAP = new Map(itemsDatabase.map(item => [item.id, item]));
export const getItemById = (id) => ITEMS_MAP.get(id);

console.log("itemsDatabase.js executed successfully. getItemById type:", typeof getItemById);

// Как использовать новые функции:
// import { calculateItemStat, getGoldUpgradeCost, getDiamondUpgradeCost, getItemById } from './itemsDatabase';
//
// const someItemFromInventory = { id: "common-shortbow", level: 10, rarity: "Common", type: "weapon" };
// const itemDefinition = getItemById(someItemFromInventory.id); // Получаем базовое определение
//
// if (itemDefinition) {
//   const attack = calculateItemStat(itemDefinition.type, "attackBonus", someItemFromInventory.rarity, someItemFromInventory.level);
//   const as = calculateItemStat(itemDefinition.type, "attackSpeedBonus", someItemFromInventory.rarity, someItemFromInventory.level);
//   console.log(`Attack: ${attack}, AS: ${(as*100).toFixed(1)}%`);
//
//   const goldCost = getGoldUpgradeCost(someItemFromInventory.level, someItemFromInventory.rarity);
//   const diamondCost = getDiamondUpgradeCost(someItemFromInventory.level, someItemFromInventory.rarity);
//   console.log(`Upgrade Cost: ${goldCost} Gold, ${diamondCost} Diamonds`);
// }