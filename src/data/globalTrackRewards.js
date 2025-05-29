// src/data/xpMilestoneRewards.js (или где ты хранишь подобные данные)

// Предполагаемые новые типы наград, которые должны быть определены
// и обрабатываться в useGameStore или глобально:
// const REWARD_TYPE_EPIC_ITEM_CHOICE_CHEST = 'epicItemChoiceChest';
// const REWARD_TYPE_LEGENDARY_ITEM_CHOICE_CHEST = 'legendaryItemChoiceChest';
// const REWARD_TYPE_MYTHIC_ITEM_CHOICE_CHEST = 'mythicItemChoiceChest';
// const REWARD_TYPE_TONCOIN = 'toncoin'; // Для фактического Toncoin
// const REWARD_TYPE_BNB = 'bnb';       // Для фактического BNB

// Существующие типы из achievementsDatabase для справки:
// const REWARD_TYPE_EPIC_KEY = 'epicChestKeys';
// const REWARD_TYPE_TON_SHARDS = 'toncoinShards';

const xpMilestoneRewards = [
    {
        xpThreshold: 300,
        rewards: { epicChestKeys: 1 },
        description: "Награда за 300 XP: 1 Эпический ключ!"
    },
    {
        xpThreshold: 650,
        rewards: { epicItemChoiceChest: 1 },
        description: "Награда за 650 XP: Сундук с эпической вещью на выбор!"
    },
    {
        xpThreshold: 1000,
        rewards: { toncoinShards: 50 }, // Начальное количество осколков
        description: "Награда за 1000 XP: 250 Осколков Toncoin!"
    },
    {
        xpThreshold: 1350,
        rewards: { epicChestKeys: 5 },
        description: "Награда за 1350 XP: 2 Эпических ключа!"
    },
    {
        xpThreshold: 1700,
        rewards: { legendaryItemChoiceChest: 1 },
        description: "Награда за 1700 XP: Сундук с легендарной вещью на выбор!"
    },
    {
        xpThreshold: 2050,
        rewards: { toncoinShards: 75 },
        description: "Награда за 2050 XP: 500 Осколков Toncoin!"
    },
    {
        xpThreshold: 2400,
        rewards: { epicItemChoiceChest: 1 },
        description: "Награда за 2400 XP: 3 Эпических ключа и Сундук с эпической вещью на выбор!"
    },
    {
        xpThreshold: 2800,
        rewards: { toncoin: 2 }, // Примерное значение фактического Toncoin
        description: "Награда за 2800 XP: 0.1 Toncoin!"
    },
    {
        xpThreshold: 3200,
        rewards: { mythicItemChoiceChest: 1 },
        description: "Награда за 3200 XP: Сундук с мифической вещью на выбор!"
    },
    {
        xpThreshold: 3600,
        rewards: { toncoinShards: 300 },
        description: "Награда за 3600 XP: 1000 Осколков Toncoin и 2 Эпических ключа!"
    },
    {
        xpThreshold: 4000,
        rewards: { legendaryItemChoiceChest: 1 }, // Примерное значение
        description: "Награда за 4000 XP: Легендарный сундук на выбор и 0.25 Toncoin!"
    },
    {
        xpThreshold: 4400,
        rewards: { toncoinShards: 500 },
        description: "Награда за 4400 XP: 1500 Осколков Toncoin!"
    },
    {
        xpThreshold: 4800,
        rewards: { mythicItemChoiceChest: 1 }, // Примерное значение
        description: "Награда за 4800 XP: Мифический сундук на выбор и 0.5 Toncoin!"
    },
    {
        xpThreshold: 5150,
        rewards: { toncoin: 10 }, // Примерное значение
        description: "Награда за 5150 XP: 0.75 Toncoin и 3 Эпических ключа!"
    },
    {
        xpThreshold: 5500,
        rewards: { bnb: 0.5 }, // Примерное значение BNB
        description: "Максимальный опыт! Особая награда: 0.005 BNB!"
    }
];

export default xpMilestoneRewards; // или экспортируй как часть существующего объекта данных