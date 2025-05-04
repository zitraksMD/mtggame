// src/data/forgeDatabase.js

// Стоимость улучшения
const upgradeCosts = {
    Uncommon: { gold: 100, diamonds: 0 },
    Rare:     { gold: 500, diamonds: 10 },
    Epic:     { gold: 1000, diamonds: 25 },
    Legendary:{ gold: 2500, diamonds: 75 },
    Mythic:   { gold: 10000, diamonds: 200 }
};

// Функция-помощник для создания трех одинаковых слотов
const createThreeSlots = (itemId, rarity) => [
    { itemId, rarity, quantity: 1 },
    { itemId, rarity, quantity: 1 },
    { itemId, rarity, quantity: 1 }
];

const forgeRecipes = [
    // ========================
    // --- Common -> Uncommon --- (Все переделаны на 3 слота)
    // ========================
    {
        id: "upgrade_common-shortbow_to_uncommon",
        outputItemId: "uncommon-hunters-bow",
        inputItems: createThreeSlots("common-shortbow", "Common"),
        cost: upgradeCosts.Uncommon
    },
    {
        id: "upgrade_common-leather-cap_to_uncommon",
        outputItemId: "uncommon-studded-cap",
        inputItems: createThreeSlots("common-leather-cap", "Common"),
        cost: upgradeCosts.Uncommon
    },
    {
        id: "upgrade_common-padded-vest_to_uncommon",
        outputItemId: "uncommon-reinforced-vest",
        inputItems: createThreeSlots("common-padded-vest", "Common"),
        cost: upgradeCosts.Uncommon
    },
    {
        id: "upgrade_common-worn-boots_to_uncommon",
        outputItemId: "uncommon-sturdy-boots",
        inputItems: createThreeSlots("common-worn-boots", "Common"),
        cost: upgradeCosts.Uncommon
    },
    {
        id: "upgrade_common-iron-ring_to_uncommon",
        outputItemId: "uncommon-silver-ring",
        inputItems: createThreeSlots("common-iron-ring", "Common"),
        cost: upgradeCosts.Uncommon
    },
    {
        id: "upgrade_common-simple-pendant_to_uncommon",
        outputItemId: "uncommon-charm-vigor",
        inputItems: createThreeSlots("common-simple-pendant", "Common"),
        cost: upgradeCosts.Uncommon
    },

    // ========================
    // --- Uncommon -> Rare --- (Все переделаны на 3 слота)
    // ========================
    {
        id: "upgrade_uncommon-hunters-bow_to_rare",
        outputItemId: "rare-elven-bow",
        inputItems: createThreeSlots("uncommon-hunters-bow", "Uncommon"),
        cost: upgradeCosts.Rare
    },
     {
        id: "upgrade_uncommon-studded-cap_to_rare",
        outputItemId: "rare-steel-helmet",
        inputItems: createThreeSlots("uncommon-studded-cap", "Uncommon"),
        cost: upgradeCosts.Rare
    },
     {
        id: "upgrade_uncommon-reinforced-vest_to_rare",
        outputItemId: "rare-scale-mail",
        inputItems: createThreeSlots("uncommon-reinforced-vest", "Uncommon"),
        cost: upgradeCosts.Rare
    },
     {
        id: "upgrade_uncommon-sturdy-boots_to_rare",
        outputItemId: "rare-swift-boots",
        inputItems: createThreeSlots("uncommon-sturdy-boots", "Uncommon"),
        cost: upgradeCosts.Rare
    },
     {
        id: "upgrade_uncommon-silver-ring_to_rare",
        outputItemId: "rare-gemstone-ring",
        inputItems: createThreeSlots("uncommon-silver-ring", "Uncommon"),
        cost: upgradeCosts.Rare
    },
     {
        id: "upgrade_uncommon-charm-vigor_to_rare",
        outputItemId: "rare-amulet-precision",
        inputItems: createThreeSlots("uncommon-charm-vigor", "Uncommon"),
        cost: upgradeCosts.Rare
    },

    // ========================
    // --- Rare -> Epic --- (Все переделаны на 3 слота)
    // ========================
    {
        id: "upgrade_rare-elven-bow_to_epic",
        outputItemId: "epic-dragonbone-bow",
        inputItems: createThreeSlots("rare-elven-bow", "Rare"),
        cost: upgradeCosts.Epic
    },
    {
        id: "upgrade_rare-steel-helmet_to_epic",
        outputItemId: "epic-guardian-helm",
        inputItems: createThreeSlots("rare-steel-helmet", "Rare"),
        cost: upgradeCosts.Epic
    },
    {
        id: "upgrade_rare-scale-mail_to_epic",
        outputItemId: "epic-phoenix-mail",
        inputItems: createThreeSlots("rare-scale-mail", "Rare"),
        cost: upgradeCosts.Epic
    },
    {
        id: "upgrade_rare-swift-boots_to_epic",
        outputItemId: "epic-shadow-walkers",
        inputItems: createThreeSlots("rare-swift-boots", "Rare"),
        cost: upgradeCosts.Epic
    },
    {
        id: "upgrade_rare-gemstone-ring_to_epic",
        outputItemId: "epic-runic-ring",
        inputItems: createThreeSlots("rare-gemstone-ring", "Rare"),
        cost: upgradeCosts.Epic
    },
    {
        id: "upgrade_rare-amulet-precision_to_epic",
        outputItemId: "epic-stormcaller-amulet",
        inputItems: createThreeSlots("rare-amulet-precision", "Rare"),
        cost: upgradeCosts.Epic
    },

    // ========================
    // --- Epic -> Legendary --- (Все переделаны на 3 слота)
    // ========================
    {
        id: "upgrade_epic-dragonbone-bow_to_legendary",
        outputItemId: "legendary-bow-tide",
        inputItems: createThreeSlots("epic-dragonbone-bow", "Epic"),
        cost: upgradeCosts.Legendary
    },
    {
        id: "upgrade_epic-guardian-helm_to_legendary",
        outputItemId: "legendary-helm-tide",
        inputItems: createThreeSlots("epic-guardian-helm", "Epic"),
        cost: upgradeCosts.Legendary
    },
    {
        id: "upgrade_epic-phoenix-mail_to_legendary",
        outputItemId: "legendary-armor-tide",
        inputItems: createThreeSlots("epic-phoenix-mail", "Epic"),
        cost: upgradeCosts.Legendary
    },
    {
        id: "upgrade_epic-shadow-walkers_to_legendary",
        outputItemId: "legendary-boots-tide",
        inputItems: createThreeSlots("epic-shadow-walkers", "Epic"),
        cost: upgradeCosts.Legendary
    },
    {
        id: "upgrade_epic-runic-ring_to_legendary",
        outputItemId: "legendary-ring-tide",
        inputItems: createThreeSlots("epic-runic-ring", "Epic"),
        cost: upgradeCosts.Legendary
    },
    {
        id: "upgrade_epic-stormcaller-amulet_to_legendary",
        outputItemId: "legendary-amulet-tide",
        inputItems: createThreeSlots("epic-stormcaller-amulet", "Epic"),
        cost: upgradeCosts.Legendary
    },

    // ========================
    // --- Legendary -> Mythic --- (Все переделаны на 3 слота)
    // ========================
    {
        id: "upgrade_legendary-bow-tide_to_mythic",
        outputItemId: "mythic-crossbow-celestial",
        inputItems: createThreeSlots("legendary-bow-tide", "Legendary"),
        cost: upgradeCosts.Mythic
    },
    {
        id: "upgrade_legendary-helm-tide_to_mythic",
        outputItemId: "mythic-helm-celestial",
        inputItems: createThreeSlots("legendary-helm-tide", "Legendary"),
        cost: upgradeCosts.Mythic
    },
    {
        id: "upgrade_legendary-armor-tide_to_mythic",
        outputItemId: "mythic-armor-celestial",
        inputItems: createThreeSlots("legendary-armor-tide", "Legendary"),
        cost: upgradeCosts.Mythic
    },
    {
        id: "upgrade_legendary-boots-tide_to_mythic",
        outputItemId: "mythic-boots-celestial",
        inputItems: createThreeSlots("legendary-boots-tide", "Legendary"),
        cost: upgradeCosts.Mythic
    },
    {
        id: "upgrade_legendary-ring-tide_to_mythic",
        outputItemId: "mythic-ring-celestial",
        inputItems: createThreeSlots("legendary-ring-tide", "Legendary"),
        cost: upgradeCosts.Mythic
    },
    {
        id: "upgrade_legendary-amulet-tide_to_mythic",
        outputItemId: "mythic-amulet-celestial",
        inputItems: createThreeSlots("legendary-amulet-tide", "Legendary"),
        cost: upgradeCosts.Mythic
    },

];

export default forgeRecipes;

// Хелпер
export const getForgeRecipeById = (recipeId) => forgeRecipes.find(r => r.id === recipeId);