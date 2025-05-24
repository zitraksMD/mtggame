// src/data/gearChestData.js

// Определяем данные для сундуков СНАРЯЖЕНИЯ
// src/data/gearChestData.js
// Убедитесь, что REWARD_TYPES доступны (импортированы или определены здесь)
import { REWARD_TYPES } from './ShardPassRewardsData.js'; // или './path/to/ShardPassRewards.js'


export const GEAR_CHESTS = [
    // --- 1. Сундук Common/Uncommon ---
    {
        id: "gear_chest_basic",
        name: "Солдатский сундук",
        description: "Простой сундук с базовой экипировкой.",
        icon: `/assets/chest-icon.png`,
        cost: { currency: 'gold', price: 100 }, // Стандартная цена (может быть 0, если изначально бесплатен)
        keyToOpenForFree: null, // Для этого сундука нет специального ключа (или можно опустить поле)
        possibleRarities: ["Common", "Uncommon"],
        rarityChances: { "Common": 0.75, "Uncommon": 0.25 },
        pity: null,
        shardPassXp: 10,
    },

    // --- 2. Сундук Common/Uncommon/Rare ---
    {
        id: "gear_chest_rare",
        name: "Сундук оруженосца",
        description: "Содержит более качественную экипировку.",
        icon: `/assets/chest-icon.png`,
        cost: { currency: 'diamonds', price: 50 }, // Стандартная цена в алмазах
        keyToOpenForFree: REWARD_TYPES.RARE_CHEST_KEY, // <<< МОЖНО ОТКРЫТЬ РЕДКИМ КЛЮЧОМ БЕСПЛАТНО
        possibleRarities: ["Common", "Uncommon", "Rare"],
        rarityChances: { "Common": 0.65, "Uncommon": 0.25, "Rare": 0.10 },
        pity: { rarity: "Rare", limit: 10 },
        shardPassXp: 30,
    },

    // --- 3. Сундук Common/Uncommon/Rare/Epic ---
    {
        id: "gear_chest_epic",
        name: "Королевский сундук",
        description: "Хранит в себе мощное снаряжение.",
        icon: `/assets/chest-icon.png`,
        cost: { currency: 'diamonds', price: 250 }, // Стандартная цена в алмазах
        keyToOpenForFree: REWARD_TYPES.EPIC_CHEST_KEY, // <<< МОЖНО ОТКРЫТЬ ЭПИЧЕСКИМ КЛЮЧОМ БЕСПЛАТНО
        possibleRarities: ["Common", "Uncommon", "Rare", "Epic"],
        rarityChances: { "Common": 0.65, "Uncommon": 0.27, "Rare": 0.07, "Epic": 0.01 },
        pity: [
            { rarity: "Rare", limit: 10 },
            { rarity: "Epic", limit: 50 }
        ],
        shardPassXp: 50,
    },
];

// --- Хелпер для получения данных сундука снаряжения по ID ---
const GEAR_CHEST_MAP = new Map(GEAR_CHESTS.map(chest => [chest.id, chest]));

export const getGearChestById = (id) => {
    return GEAR_CHEST_MAP.get(id);
};