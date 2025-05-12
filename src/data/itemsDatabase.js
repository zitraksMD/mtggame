// itemsDatabase.js

// --- КОНСТАНТЫ ---
const MAX_ITEM_LEVEL = 100;

const itemsDatabase = [
    // ========================
    // --- Common ---
    // ========================
    {
        id: "common-shortbow", name: "Короткий лук", type: "weapon", weaponClass: "bow",
        rarity: "Common", image: "/assets/weapons/bow_common_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Простой, но надежный лук для начинающего стрелка. Тетива слегка потерта.",
        // Base Stats (Level 0)
        hpBonus: 0, attackBonus: 3, attackSpeedBonus: 0, critChanceBonus: 0, doubleStrikeChanceBonus: 0,
        // Bonus Per Level
        hpLevelBonus: 0, attackLevelBonus: 0.5, attackSpeedLevelBonus: 0.1, critChanceLevelBonus: 0, doubleStrikeLevelBonus: 0,
        // Power Scaling
        basePowerLevel: 100,
        powerPerLevelMultiplier: 0.015, // 1.5%
    },
    {
        id: "common-leather-cap", name: "Кожаная шапка", type: "helmet",
        rarity: "Common", image: "/assets/helmets/helmet_common_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Базовая защита головы из дубленой кожи. Лучше, чем совсем ничего.",
        hpBonus: 5, attackBonus: 0, attackSpeedBonus: 0, critChanceBonus: 0, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 1, attackLevelBonus: 0, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0, doubleStrikeLevelBonus: 0,
        basePowerLevel: 100,
        powerPerLevelMultiplier: 0.015, // 1.5%
    },
    {
        id: "common-padded-vest", name: "Стеганая жилетка", type: "armor",
        rarity: "Common", image: "/assets/armor/armor_common_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Смягчает удары, но вряд ли спасет от серьезного оружия. Пахнет пылью.",
        hpBonus: 10, attackBonus: 0, attackSpeedBonus: 0, critChanceBonus: 0, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 1.5, attackLevelBonus: 0, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0, doubleStrikeLevelBonus: 0,
        basePowerLevel: 100,
        powerPerLevelMultiplier: 0.015, // 1.5%
    },
    {
        id: "common-worn-boots", name: "Потертые сапоги", type: "boots",
        rarity: "Common", image: "/assets/boots/boots_common_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Видали и лучшие дни, но все еще защищают ноги от острых камней.",
        hpBonus: 4, attackBonus: 0, attackSpeedBonus: 0.2, critChanceBonus: 0, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 0.8, attackLevelBonus: 0, attackSpeedLevelBonus: 0.05, critChanceLevelBonus: 0, doubleStrikeLevelBonus: 0,
        basePowerLevel: 100,
        powerPerLevelMultiplier: 0.015, // 1.5%
    },
    {
        id: "common-iron-ring", name: "Железное кольцо", type: "ring",
        rarity: "Common", image: "/assets/rings/ring_common_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Грубое железное кольцо. Немного утяжеляет кулак и холодит палец.",
        hpBonus: 2, attackBonus: 1, attackSpeedBonus: 0, critChanceBonus: 0, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 0.5, attackLevelBonus: 0.2, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0, doubleStrikeLevelBonus: 0,
        basePowerLevel: 100,
        powerPerLevelMultiplier: 0.015, // 1.5%
    },
    {
        id: "common-simple-pendant", name: "Простой кулон", type: "amulet",
        rarity: "Common", image: "/assets/amulets/amulet_common_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Незамысловатый кулон на потертой веревке. Возможно, приносит удачу, а может и нет.",
        hpBonus: 3, attackBonus: 0, attackSpeedBonus: 0, critChanceBonus: 0.5,
        hpLevelBonus: 0.6, attackLevelBonus: 0, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0.1, doubleStrikeLevelBonus: 0,
        basePowerLevel: 100,
        powerPerLevelMultiplier: 0.015, // 1.5%
    },

    // ========================
    // --- Uncommon ---
    // ========================
    {
        id: "uncommon-hunters-bow", name: "Лук охотника", type: "weapon", weaponClass: "bow",
        rarity: "Uncommon", image: "/assets/weapons/bow_uncommon_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Добротный лук, популярный среди следопытов. Удобно лежит в руке.",
        hpBonus: 0, attackBonus: 5, attackSpeedBonus: 1, critChanceBonus: 0, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 0, attackLevelBonus: 0.8, attackSpeedLevelBonus: 0.15, critChanceLevelBonus: 0, doubleStrikeLevelBonus: 0,
        basePowerLevel: 225,
        powerPerLevelMultiplier: 0.018, // 1.8%
    },
    {
        id: "uncommon-studded-cap", name: "Клепаная шапка", type: "helmet",
        rarity: "Uncommon", image: "/assets/helmets/helmet_uncommon_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Кожаная шапка, усиленная металлическими заклепками. Дает базовую защиту от тупых предметов.",
        hpBonus: 15, attackBonus: 0, attackSpeedBonus: 0.5, critChanceBonus: 0, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 2, attackLevelBonus: 0, attackSpeedLevelBonus: 0.1, critChanceLevelBonus: 0, doubleStrikeLevelBonus: 0,
        basePowerLevel: 225,
        powerPerLevelMultiplier: 0.018, // 1.8%
    },
    {
        id: "uncommon-reinforced-vest", name: "Усиленная жилетка", type: "armor",
        rarity: "Uncommon", image: "/assets/armor/armor_uncommon_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Жилетка с добавлением прочных кожаных вставок. Дает шанс пережить еще один бой.",
        hpBonus: 25, attackBonus: 0, attackSpeedBonus: 0, critChanceBonus: 0, doubleStrikeChanceBonus: 0.5,
        hpLevelBonus: 3, attackLevelBonus: 0, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0, doubleStrikeLevelBonus: 0.1,
        basePowerLevel: 225,
        powerPerLevelMultiplier: 0.018, // 1.8%
    },
    {
        id: "uncommon-sturdy-boots", name: "Крепкие сапоги", type: "boots",
        rarity: "Uncommon", image: "/assets/boots/boots_uncommon_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Крепкие сапоги с толстой подошвой. Удобны для долгих переходов по пересеченной местности.",
        hpBonus: 12, attackBonus: 0, attackSpeedBonus: 1.0, critChanceBonus: 0, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 1.5, attackLevelBonus: 0, attackSpeedLevelBonus: 0.1, critChanceLevelBonus: 0, doubleStrikeLevelBonus: 0,
        basePowerLevel: 225,
        powerPerLevelMultiplier: 0.018, // 1.8%
    },
    {
        id: "uncommon-silver-ring", name: "Серебряное кольцо", type: "ring",
        rarity: "Uncommon", image: "/assets/rings/ring_uncommon_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Кольцо из тусклого серебра. Чувствуется легкая, почти угасшая магия.",
        hpBonus: 8, attackBonus: 2, attackSpeedBonus: 0, critChanceBonus: 0.5, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 1, attackLevelBonus: 0.4, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0.1, doubleStrikeLevelBonus: 0,
        basePowerLevel: 225,
        powerPerLevelMultiplier: 0.018, // 1.8%
    },
    {
        id: "uncommon-charm-vigor", name: "Талисман бодрости", type: "amulet",
        rarity: "Uncommon", image: "/assets/amulets/amulet_uncommon_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Этот талисман из гладкого камня придает носителю немного жизненных сил.",
        hpBonus: 15, attackBonus: 0, attackSpeedBonus: 0, critChanceBonus: 0, doubleStrikeChanceBonus: 0.5,
        hpLevelBonus: 2, attackLevelBonus: 0, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0, doubleStrikeLevelBonus: 0.1,
        basePowerLevel: 225,
        powerPerLevelMultiplier: 0.018, // 1.8%
    },

    // ========================
    // --- Rare ---
    // ========================
    {
        id: "rare-elven-bow", name: "Эльфийский лук", type: "weapon", weaponClass: "bow",
        rarity: "Rare", image: "/assets/weapons/bow_rare_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Легкий и изящный лук, созданный эльфийскими мастерами. Стрелы летят быстрее и точнее.",
        hpBonus: 0, attackBonus: 12, attackSpeedBonus: 2.5, critChanceBonus: 1, doubleStrikeChanceBonus: 1,
        hpLevelBonus: 0, attackLevelBonus: 1.5, attackSpeedLevelBonus: 0.25, critChanceLevelBonus: 0.1, doubleStrikeLevelBonus: 0.1,
        basePowerLevel: 500,
        powerPerLevelMultiplier: 0.022, // 2.2%
    },
    {
        id: "rare-steel-helmet", name: "Стальной шлем", type: "helmet",
        rarity: "Rare", image: "/assets/helmets/helmet_rare_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Надежный стальной шлем, отполированный до блеска. Способен выдержать сильный удар.",
        hpBonus: 30, attackBonus: 0, attackSpeedBonus: 1.0, critChanceBonus: 1, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 4, attackLevelBonus: 0, attackSpeedLevelBonus: 0.1, critChanceLevelBonus: 0.1, doubleStrikeLevelBonus: 0,
        basePowerLevel: 500,
        powerPerLevelMultiplier: 0.022, // 2.2%
    },
    {
        id: "rare-scale-mail", name: "Чешуйчатая броня", type: "armor",
        rarity: "Rare", image: "/assets/armor/armor_rare_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Броня из перекрывающихся стальных пластин, напоминающих чешую дракона.",
        hpBonus: 50, attackBonus: 0, attackSpeedBonus: 0, critChanceBonus: 0, doubleStrikeChanceBonus: 1.0,
        hpLevelBonus: 6, attackLevelBonus: 0, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0, doubleStrikeLevelBonus: 0.2,
        basePowerLevel: 500,
        powerPerLevelMultiplier: 0.022, // 2.2%
    },
    {
        id: "rare-swift-boots", name: "Быстрые сапоги", type: "boots",
        rarity: "Rare", image: "/assets/boots/boots_rare_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Легкие кожаные сапоги, зачарованные на скорость. Ноги в них будто сами несут вперед.",
        hpBonus: 20, attackBonus: 0, attackSpeedBonus: 2.0, critChanceBonus: 0, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 2.5, attackLevelBonus: 0, attackSpeedLevelBonus: 0.2, critChanceLevelBonus: 0, doubleStrikeLevelBonus: 0,
        basePowerLevel: 500,
        powerPerLevelMultiplier: 0.022, // 2.2%
    },
    {
        id: "rare-gemstone-ring", name: "Кольцо с самоцветом", type: "ring",
        rarity: "Rare", image: "/assets/rings/ring_rare_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Золотое кольцо, украшенное мерцающим самоцветом. Концентрирует магическую энергию.",
        hpBonus: 15, attackBonus: 4, attackSpeedBonus: 0, critChanceBonus: 1.5, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 2, attackLevelBonus: 0.6, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0.2, doubleStrikeLevelBonus: 0,
        basePowerLevel: 500,
        powerPerLevelMultiplier: 0.022, // 2.2%
    },
    {
        id: "rare-amulet-precision", name: "Амулет точности", type: "amulet",
        rarity: "Rare", image: "/assets/amulets/amulet_rare_01.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Амулет с выгравированным символом глаза. Обостряет чувства и направляет руку владельца.",
        hpBonus: 0, attackBonus: 3, attackSpeedBonus: 0, critChanceBonus: 2.5, doubleStrikeChanceBonus: 1.5,
        hpLevelBonus: 0, attackLevelBonus: 0.5, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0.3, doubleStrikeLevelBonus: 0.2,
        basePowerLevel: 500,
        powerPerLevelMultiplier: 0.022, // 2.2%
    },

    // ========================
    // --- Epic ---
    // ========================
    {
        id: "epic-dragonbone-bow", name: "Лук из кости дракона", type: "weapon", weaponClass: "bow",
        rarity: "Epic", image: "/assets/weapons/bow_epic_dragon.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Мощный лук, сделанный из кости древнего дракона. Наконечники стрел пробивают любую броню.",
        hpBonus: 10, attackBonus: 20, attackSpeedBonus: 3, critChanceBonus: 3, doubleStrikeChanceBonus: 2.5,
        hpLevelBonus: 1.5, attackLevelBonus: 2.5, attackSpeedLevelBonus: 0.1, critChanceLevelBonus: 0.3, doubleStrikeLevelBonus: 0.3,
        basePowerLevel: 1050,
        powerPerLevelMultiplier: 0.028, // 2.8%
    },
    {
        id: "epic-guardian-helm", name: "Шлем Несокрушимого Стража", type: "helmet",
        rarity: "Epic", image: "/assets/helmets/helmet_epic_guardian.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Тяжелый шлем, выкованный для защиты королевских особ. Украшен фамильным гербом.",
        hpBonus: 50, attackBonus: 0, attackSpeedBonus: 1.2, critChanceBonus: 2, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 6, attackLevelBonus: 0, attackSpeedLevelBonus: 0.15, critChanceLevelBonus: 0.2, doubleStrikeChanceBonus: 0,
        basePowerLevel: 1050,
        powerPerLevelMultiplier: 0.028, // 2.8%
    },
    {
        id: "epic-phoenix-mail", name: "Броня Пепла Феникса", type: "armor",
        rarity: "Epic", image: "/assets/armor/armor_epic_phoenix.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Кажется, эта броня все еще хранит тепло огня мифической птицы. Защищает и исцеляет.",
        hpBonus: 80, attackBonus: 5, attackSpeedBonus: 0, critChanceBonus: 0, doubleStrikeChanceBonus: 2.0,
        hpLevelBonus: 9, attackLevelBonus: 0.5, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0, doubleStrikeChanceBonus: 0.3,
        basePowerLevel: 1050,
        powerPerLevelMultiplier: 0.028, // 2.8%
    },
    {
        id: "epic-shadow-walkers", name: "Сапоги Призрачного Шага", type: "boots",
        rarity: "Epic", image: "/assets/boots/boots_epic_shadow.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Эти сапоги позволяют передвигаться почти бесшумно, словно тень.",
        hpBonus: 30, attackBonus: 0, attackSpeedBonus: 2.5, critChanceBonus: 2, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 4, attackLevelBonus: 0, attackSpeedLevelBonus: 0.25, critChanceLevelBonus: 0.2, doubleStrikeChanceBonus: 0,
        basePowerLevel: 1050,
        powerPerLevelMultiplier: 0.028, // 2.8%
    },
    {
        id: "epic-runic-ring", name: "Кольцо Рунной Магии", type: "ring",
        rarity: "Epic", image: "/assets/rings/ring_epic_rune.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Кольцо испещрено древними рунами, которые светятся при использовании магии.",
        hpBonus: 25, attackBonus: 6, attackSpeedBonus: 1.0, critChanceBonus: 2.0, doubleStrikeChanceBonus: 1.0,
        hpLevelBonus: 3, attackLevelBonus: 0.8, attackSpeedLevelBonus: 0.1, critChanceLevelBonus: 0.25, doubleStrikeChanceBonus: 0.1,
        basePowerLevel: 1050,
        powerPerLevelMultiplier: 0.028, // 2.8%
    },
    {
        id: "epic-stormcaller-amulet", name: "Амулет Призывателя Гроз", type: "amulet",
        rarity: "Epic", image: "/assets/amulets/amulet_epic_storm.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Внутри этого амулета заключена сила молнии и грома.",
        hpBonus: 20, attackBonus: 8, attackSpeedBonus: 0, critChanceBonus: 0, doubleStrikeChanceBonus: 3.5,
        hpLevelBonus: 3, attackLevelBonus: 1, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0, doubleStrikeChanceBonus: 0.4,
        basePowerLevel: 1050,
        powerPerLevelMultiplier: 0.028, // 2.8%
    },

    // ========================
    // --- Legendary (Set: tide_set) ---
    // ========================
    {
        id: "legendary-bow-tide", name: "Лук Прилива", type: "weapon", weaponClass: "bow",
        rarity: "Legendary", setId: "tide_set", image: "/assets/weapons/bow_legendary_tide.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Лук, заряженный мощью океанских глубин. Каждая стрела несет силу прилива.",
        hpBonus: 25, attackBonus: 25, attackSpeedBonus: 4, critChanceBonus: 2, doubleStrikeChanceBonus: 2,
        hpLevelBonus: 3, attackLevelBonus: 3, attackSpeedLevelBonus: 0.4, critChanceLevelBonus: 0.2, doubleStrikeChanceBonus: 0.2,
        basePowerLevel: 2100,
        powerPerLevelMultiplier: 0.032, // 3.2%
    },
    {
        id: "legendary-helm-tide", name: "Шлем Бездны", type: "helmet",
        rarity: "Legendary", setId: "tide_set", image: "/assets/helmets/helmet_legendary_tide.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Шлем, поднятый со дна моря. В нем слышен шепот затонувших цивилизаций.",
        hpBonus: 60, attackBonus: 5, attackSpeedBonus: 1.5, critChanceBonus: 3, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 8, attackLevelBonus: 0.5, attackSpeedLevelBonus: 0.2, critChanceLevelBonus: 0.3, doubleStrikeChanceBonus: 0,
        basePowerLevel: 2100,
        powerPerLevelMultiplier: 0.032, // 3.2%
    },
    {
        id: "legendary-armor-tide", name: "Кираса Затонувших Городов", type: "armor",
        rarity: "Legendary", setId: "tide_set", image: "/assets/armor/armor_legendary_tide.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Кираса из перламутра и кораллов, закаленная давлением глубоководья.",
        hpBonus: 100, attackBonus: 0, attackSpeedBonus: 0, critChanceBonus: 0, doubleStrikeChanceBonus: 3,
        hpLevelBonus: 12, attackLevelBonus: 0, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0, doubleStrikeChanceBonus: 0.4,
        basePowerLevel: 2100,
        powerPerLevelMultiplier: 0.032, // 3.2%
    },
    {
        id: "legendary-boots-tide", name: "Сапоги Водоворота", type: "boots",
        rarity: "Legendary", setId: "tide_set", image: "/assets/boots/boots_legendary_tide.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Сапоги, позволяющие идти по воде, словно по суше, и двигаться со скоростью течения.",
        hpBonus: 40, attackBonus: 0, attackSpeedBonus: 3.0, critChanceBonus: 0, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 5, attackLevelBonus: 0, attackSpeedLevelBonus: 0.3, critChanceLevelBonus: 0, doubleStrikeChanceBonus: 0,
        basePowerLevel: 2100,
        powerPerLevelMultiplier: 0.032, // 3.2%
    },
    {
        id: "legendary-ring-tide", name: "Кольцо Повелителя Океана", type: "ring",
        rarity: "Legendary", setId: "tide_set", image: "/assets/rings/ring_legendary_tide.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Кольцо, дарующее власть над морскими течениями и его обитателями. Пульсирует силой.", // Слегка дополнено
        hpBonus: 30, attackBonus: 8, attackSpeedBonus: 1, critChanceBonus: 2, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 4, attackLevelBonus: 1, attackSpeedLevelBonus: 0.1, critChanceLevelBonus: 0.2, doubleStrikeChanceBonus: 0,
        basePowerLevel: 2100,
        powerPerLevelMultiplier: 0.032, // 3.2%
    },
    {
        id: "legendary-amulet-tide", name: "Амулет Приливов", type: "amulet",
        rarity: "Legendary", setId: "tide_set", image: "/assets/amulets/amulet_legendary_tide.png", maxLevel: MAX_ITEM_LEVEL,
        description: "В сердце амулета бьется энергия приливов и отливов, даруя стойкость океана.",
        hpBonus: 35, attackBonus: 5, attackSpeedBonus: 0, critChanceBonus: 0, doubleStrikeChanceBonus: 2.5,
        hpLevelBonus: 4.5, attackLevelBonus: 0.6, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0, doubleStrikeChanceBonus: 0.3,
        basePowerLevel: 2100,
        powerPerLevelMultiplier: 0.032, // 3.2%
    },

    // ========================
    // --- Mythic (Set: celestial_hunter_set) ---
    // ========================
    {
        id: "mythic-crossbow-celestial", name: "Звездный Арбалет", type: "weapon", weaponClass: "crossbow",
        rarity: "Mythic", setId: "celestial_hunter_set", image: "/assets/weapons/crossbow_mythic_celestial.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Наконечники его болтов выкованы из света умирающих звезд. Каждый выстрел - маленький апокалипсис.", // Слегка дополнено
        hpBonus: 0, attackBonus: 40, attackSpeedBonus: 0, critChanceBonus: 10, doubleStrikeChanceBonus: 5,
        hpLevelBonus: 0, attackLevelBonus: 5, attackSpeedLevelBonus: 0, critChanceLevelBonus: 1, doubleStrikeLevelBonus: 0.5,
        basePowerLevel: 4150,
        powerPerLevelMultiplier: 0.035, // 3.5%
    },
    {
        id: "mythic-helm-celestial", name: "Корона Созвездий", type: "helmet",
        rarity: "Mythic", setId: "celestial_hunter_set", image: "/assets/helmets/helmet_mythic_celestial.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Мерцает светом далеких галактик, нашептывая секреты космоса.", // Слегка дополнено
        hpBonus: 100, attackBonus: 0, attackSpeedBonus: 3, critChanceBonus: 5, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 12, attackLevelBonus: 0, attackSpeedLevelBonus: 0.3, critChanceLevelBonus: 0.5, doubleStrikeChanceBonus: 0,
        basePowerLevel: 4150,
        powerPerLevelMultiplier: 0.035, // 3.5%
    },
    {
        id: "mythic-armor-celestial", name: "Одеяние Туманности", type: "armor",
        rarity: "Mythic", setId: "celestial_hunter_set", image: "/assets/armor/armor_mythic_celestial.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Соткано из космической пыли и чистого звездного света. Легкое, но невероятно прочное.", // Слегка дополнено
        hpBonus: 180, attackBonus: 0, attackSpeedBonus: 0, critChanceBonus: 0, doubleStrikeChanceBonus: 5,
        hpLevelBonus: 20, attackLevelBonus: 0, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0, doubleStrikeChanceBonus: 0.6,
        basePowerLevel: 4150,
        powerPerLevelMultiplier: 0.035, // 3.5%
    },
    {
        id: "mythic-boots-celestial", name: "Поступь Кометы", type: "boots",
        rarity: "Mythic", setId: "celestial_hunter_set", image: "/assets/boots/boots_mythic_celestial.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Позволяют передвигаться со скоростью падающей звезды, оставляя за собой мерцающий след.", // Слегка дополнено
        hpBonus: 80, attackBonus: 0, attackSpeedBonus: 5.0, critChanceBonus: 0, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 10, attackLevelBonus: 0, attackSpeedLevelBonus: 0.5, critChanceLevelBonus: 0, doubleStrikeChanceBonus: 0,
        basePowerLevel: 4150,
        powerPerLevelMultiplier: 0.035, // 3.5%
    },
    {
        id: "mythic-ring-celestial", name: "Кольцо Пустоты", type: "ring",
        rarity: "Mythic", setId: "celestial_hunter_set", image: "/assets/rings/ring_mythic_celestial.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Хранит в себе эхо Большого Взрыва и тишину межзвездной пустоты.", // Слегка дополнено
        hpBonus: 50, attackBonus: 12, attackSpeedBonus: 0, critChanceBonus: 4, doubleStrikeChanceBonus: 3,
        hpLevelBonus: 6, attackLevelBonus: 1.5, attackSpeedLevelBonus: 0, critChanceLevelBonus: 0.4, doubleStrikeChanceBonus: 0.3,
        basePowerLevel: 4150,
        powerPerLevelMultiplier: 0.035, // 3.5%
    },
    {
        id: "mythic-amulet-celestial", name: "Амулет Вечного Цикла", type: "amulet",
        rarity: "Mythic", setId: "celestial_hunter_set", image: "/assets/amulets/amulet_mythic_celestial.png", maxLevel: MAX_ITEM_LEVEL,
        description: "Символизирует бесконечное рождение и смерть звезд, даруя частицу их мощи.", // Слегка дополнено
        hpBonus: 70, attackBonus: 8, attackSpeedBonus: 3, critChanceBonus: 3, doubleStrikeChanceBonus: 0,
        hpLevelBonus: 9, attackLevelBonus: 1, attackSpeedLevelBonus: 0.3, critChanceLevelBonus: 0.3, doubleStrikeChanceBonus: 0,
        basePowerLevel: 4150,
        powerPerLevelMultiplier: 0.035, // 3.5%
    },
];

export default itemsDatabase;

// --- Хелпер для получения предмета по ID ---
const ITEMS_MAP = new Map(itemsDatabase.map(item => [item.id, item]));
export const getItemById = (id) => ITEMS_MAP.get(id);