// src/data/gearChestData.js

// Определяем данные для сундуков СНАРЯЖЕНИЯ
export const GEAR_CHESTS = [
    // --- 1. Сундук Common/Uncommon без гаранта ---
    {
        id: "gear_chest_basic", // Уникальный ID
        name: "Солдатский сундук", // Название
        description: "Простой сундук с базовой экипировкой для начинающих бойцов.",
        icon: `/assets/chest-icon.png`, // <<< Замени на свой путь к иконке
        cost: { currency: 'gold', price: 0 },
        possibleRarities: ["Common", "Uncommon"],
        rarityChances: {
            "Common": 0.75,
            "Uncommon": 0.25,
        },
        pity: null,
        shardPassXp: 10, // <<< ДОБАВЛЕНО: Опыт для ShardPass
    },

    // --- 2. Сундук Common/Uncommon/Rare с гарантом Rare ---
    {
        id: "gear_chest_advanced",
        name: "Сундук оруженосца",
        description: "Содержит более качественную экипировку с шансом найти редкий предмет.",
        icon: `/assets/chest-icon.png`, // <<< Замени на свой путь к иконке
        cost: { currency: 'diamonds', price: 0 },
        possibleRarities: ["Common", "Uncommon", "Rare"],
        rarityChances: {
            "Common": 0.65,
            "Uncommon": 0.25,
            "Rare": 0.10,
        },
        pity: {
            rarity: "Rare",
            limit: 10,
        },
        shardPassXp: 30, // <<< ДОБАВЛЕНО: Опыт для ShardPass
    },

    // --- 3. Сундук Common/Uncommon/Rare/Epic с двумя гарантами ---
    // Примечание: я изменил Legendary на Epic в possibleRarities и pity, чтобы соответствовать rarityChances.
    // Если Legendary - это отдельный, более высокий шанс, верните как было и скорректируйте шансы.
    {
        id: "gear_chest_legendary",
        name: "Королевский сундук",
        description: "Хранит в себе мощное снаряжение, включая легендарные артефакты королевской гвардии.",
        icon: `/assets/chest-icon.png`, // <<< Замени на свой путь к иконке
        cost: { currency: 'diamonds', price: 0 },
        possibleRarities: ["Common", "Uncommon", "Rare", "Epic"],
        rarityChances: {
            "Common": 0.60,
            "Uncommon": 0.25,
            "Rare": 0.12,
            "Epic": 0.03,
        },
        pity: [
            { rarity: "Rare", limit: 10 },
            { rarity: "Epic", limit: 50 }
        ],
        shardPassXp: 50, // <<< ДОБАВЛЕНО: Опыт для ShardPass
    },
];

// --- Хелпер для получения данных сундука снаряжения по ID ---
const GEAR_CHEST_MAP = new Map(GEAR_CHESTS.map(chest => [chest.id, chest]));

export const getGearChestById = (id) => {
    return GEAR_CHEST_MAP.get(id);
};