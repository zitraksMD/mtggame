// ShardPassRewardsData.js

// Типы наград для удобства
export const REWARD_TYPES = {
    ENERGY: 'energy',
    GOLD: 'gold',
    DIAMONDS: 'diamonds',
    RARE_CHEST_KEY: 'rare_chest_key',
    EPIC_CHEST_KEY: 'epic_chest_key',
    TONCOIN_SHARDS: 'toncoin_shards',
    RARE_ARTIFACT: 'rare_artifact',
    EPIC_ARTIFACT: 'epic_artifact',
    EPIC_GEAR_CHEST: 'epic_gear_chest',
    LEGENDARY_GEAR_CHEST: 'legendary_gear_chest',
};

// Иконки для каждого типа награды
// Вводим иконки только один раз здесь!
export const REWARD_ICONS = {
    [REWARD_TYPES.ENERGY]: '/assets/energy-icon.png',          // Путь обновлен
    [REWARD_TYPES.GOLD]: '/assets/coin-icon.png',              // Путь обновлен
    [REWARD_TYPES.DIAMONDS]: '/assets/diamond-image.png',      // Путь обновлен
    [REWARD_TYPES.RARE_CHEST_KEY]: '/assets/icons/rare_key.png',
    [REWARD_TYPES.EPIC_CHEST_KEY]: '/assets/icons/epic_key.png',
    [REWARD_TYPES.TONCOIN_SHARDS]: '/assets/toncoin-icon.png', // Путь обновлен
    [REWARD_TYPES.RARE_ARTIFACT]: '/assets/icons/rare_artifact.png',
    [REWARD_TYPES.EPIC_ARTIFACT]: '/assets/icons/epic_artifact.png',
    [REWARD_TYPES.EPIC_GEAR_CHEST]: '/assets/icons/epic_gear_chest.png',
    [REWARD_TYPES.LEGENDARY_GEAR_CHEST]: '/assets/icons/legendary_gear_chest.png',
};

// Данные по уровням ShardPass (без свойства icon)
const shardPassLevelsData = [
    // Уровень 1
    {
        level: 1,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 2
    {
        level: 2,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500 },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75 },
    },
    // Уровень 3
    {
        level: 3,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1 },
    },
    // Уровень 4
    {
        level: 4,
        freeReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×50', amount: 50 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 5
    {
        level: 5,
        freeReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1 },
        premiumReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1 },
    },
    // Уровень 6
    {
        level: 6,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500 },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75 },
    },
    // Уровень 7
    {
        level: 7,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 8
    {
        level: 8,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1 },
    },
    // Уровень 9
    {
        level: 9,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 10
    {
        level: 10,
        freeReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1 },
        premiumReward: { type: REWARD_TYPES.TONCOIN_SHARDS, name: 'Осколки Toncoin ×7', amount: 7 },
    },
    // Уровень 11
    {
        level: 11,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75 },
    },
    // Уровень 12
    {
        level: 12,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 13
    {
        level: 13,
        freeReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×50', amount: 50 },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1 },
    },
    // Уровень 14
    {
        level: 14,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 15
    {
        level: 15,
        freeReward: { type: REWARD_TYPES.TONCOIN_SHARDS, name: 'Осколки Toncoin ×3', amount: 3 },
        premiumReward: { type: REWARD_TYPES.EPIC_ARTIFACT, name: 'Артефакт (Epic)', amount: 1 },
    },
    // Уровень 16
    {
        level: 16,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500 },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75 },
    },
    // Уровень 17
    {
        level: 17,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1 },
    },
    // Уровень 18
    {
        level: 18,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 19
    {
        level: 19,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500 },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75 },
    },
    // Уровень 20
    {
        level: 20,
        freeReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1 },
        premiumReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1 },
    },
    // Уровень 21
    {
        level: 21,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 22
    {
        level: 22,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500 },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1 },
    },
    // Уровень 23
    {
        level: 23,
        freeReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×50', amount: 50 },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75 },
    },
    // Уровень 24
    {
        level: 24,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 25
    {
        level: 25,
        freeReward: { type: REWARD_TYPES.RARE_ARTIFACT, name: 'Артефакт (Rare)', amount: 1 },
        premiumReward: { type: REWARD_TYPES.EPIC_GEAR_CHEST, name: 'Сундук с гарант. снаряжением (Эпик)', amount: 1 },
    },
    // Уровень 26
    {
        level: 26,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500 },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75 },
    },
    // Уровень 27
    {
        level: 27,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 28
    {
        level: 28,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1 },
    },
    // Уровень 29
    {
        level: 29,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 30
    {
        level: 30,
        freeReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1 },
        premiumReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1 },
    },
    // Уровень 31
    {
        level: 31,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 32
    {
        level: 32,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500 },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75 },
    },
    // Уровень 33
    {
        level: 33,
        freeReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×50', amount: 50 },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1 },
    },
    // Уровень 34
    {
        level: 34,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 35
    {
        level: 35,
        freeReward: { type: REWARD_TYPES.TONCOIN_SHARDS, name: 'Осколки Toncoin ×3', amount: 3 },
        premiumReward: { type: REWARD_TYPES.TONCOIN_SHARDS, name: 'Осколки Toncoin ×7', amount: 7 },
    },
    // Уровень 36
    {
        level: 36,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500 },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75 },
    },
    // Уровень 37
    {
        level: 37,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1 },
    },
    // Уровень 38
    {
        level: 38,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 39
    {
        level: 39,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500 },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75 },
    },
    // Уровень 40
    {
        level: 40,
        freeReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1 },
        premiumReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1 },
    },
    // Уровень 41
    {
        level: 41,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 42
    {
        level: 42,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500 },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1 },
    },
    // Уровень 43
    {
        level: 43,
        freeReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×50', amount: 50 },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75 },
    },
    // Уровень 44
    {
        level: 44,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 45
    {
        level: 45,
        freeReward: { type: REWARD_TYPES.TONCOIN_SHARDS, name: 'Осколки Toncoin ×3', amount: 3 },
        premiumReward: { type: REWARD_TYPES.EPIC_ARTIFACT, name: 'Артефакт (Epic)', amount: 1 },
    },
    // Уровень 46
    {
        level: 46,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500 },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000 },
    },
    // Уровень 47
    {
        level: 47,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1 },
    },
    // Уровень 48
    {
        level: 48,
        freeReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1 },
        premiumReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1 },
    },
    // Уровень 49
    {
        level: 49,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10 },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75 },
    },
    // Уровень 50
    {
        level: 50,
        freeReward: { type: REWARD_TYPES.EPIC_GEAR_CHEST, name: '🎁 Сундук с гарант. снаряжением (Эпик)', amount: 1 },
        premiumReward: { type: REWARD_TYPES.LEGENDARY_GEAR_CHEST, name: '🏆 Сундук с гарант. снаряжением (Легендарное)', amount: 1 },
    },
];

export const MOCK_SHARD_PASS_DATA_FULL = {
    currentLevel: 1,
    currentProgress: 670, // Процент прогресса (0-100)
    currentLevelXp: 670,  // Текущее количество XP на данном уровне (0-xpPerLevel)
    xpPerLevel: 1000,   // XP необходимое для одного уровня
    maxLevel: 50,
    isPremium: false,
    seasonNumber: 1,
    daysRemaining: 45,

    levels: shardPassLevelsData.map(level => ({
        ...level,
        // Добавляем иконку и состояние 'claimed' для каждой награды
        freeReward: {
            ...level.freeReward,
            icon: REWARD_ICONS[level.freeReward.type], // Берем иконку из REWARD_ICONS
            claimed: false
        },
        premiumReward: {
            ...level.premiumReward,
            icon: REWARD_ICONS[level.premiumReward.type], // Берем иконку из REWARD_ICONS
            claimed: false
        },
    })),
};

// Ты можешь импортировать MOCK_SHARD_PASS_DATA_FULL в свой компонент ShardPassScreen
// import { MOCK_SHARD_PASS_DATA_FULL, REWARD_ICONS, REWARD_TYPES } from './ShardPassRewardsData';
// ...
// const [shardPassData, setShardPassData] = useState(MOCK_SHARD_PASS_DATA_FULL);