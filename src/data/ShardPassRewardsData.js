// ShardPassRewardsData.js

// Типы наград для удобства (можно использовать для определения иконок и логики)
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

// Данные по уровням ShardPass
const shardPassLevelsData = [
    // Уровень 1
    {
        level: 1,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 2
    {
        level: 2,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500, icon: '/assets/icons/gold.png' },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75, icon: '/assets/icons/diamonds.png' },
    },
    // Уровень 3
    {
        level: 3,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1, icon: '/assets/icons/rare_key.png' },
    },
    // Уровень 4
    {
        level: 4,
        freeReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×50', amount: 50, icon: '/assets/icons/diamonds.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 5
    {
        level: 5,
        freeReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1, icon: '/assets/icons/rare_key.png' },
        premiumReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1, icon: '/assets/icons/epic_key.png' },
    },
    // Уровень 6
    {
        level: 6,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500, icon: '/assets/icons/gold.png' },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75, icon: '/assets/icons/diamonds.png' },
    },
    // Уровень 7
    {
        level: 7,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 8
    {
        level: 8,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1, icon: '/assets/icons/rare_key.png' },
    },
    // Уровень 9
    {
        level: 9,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500, icon: '/assets/icons/gold.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 10
    {
        level: 10,
        freeReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1, icon: '/assets/icons/epic_key.png' },
        premiumReward: { type: REWARD_TYPES.TONCOIN_SHARDS, name: 'Осколки Toncoin ×7', amount: 7, icon: '/assets/icons/toncoin_shards.png' },
    },
    // Уровень 11
    {
        level: 11,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75, icon: '/assets/icons/diamonds.png' },
    },
    // Уровень 12
    {
        level: 12,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500, icon: '/assets/icons/gold.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 13
    {
        level: 13,
        freeReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×50', amount: 50, icon: '/assets/icons/diamonds.png' },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1, icon: '/assets/icons/rare_key.png' },
    },
    // Уровень 14
    {
        level: 14,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 15
    {
        level: 15,
        freeReward: { type: REWARD_TYPES.TONCOIN_SHARDS, name: 'Осколки Toncoin ×3', amount: 3, icon: '/assets/icons/toncoin_shards.png' },
        premiumReward: { type: REWARD_TYPES.EPIC_ARTIFACT, name: 'Артефакт (Epic)', amount: 1, icon: '/assets/icons/epic_artifact.png' },
    },
    // Уровень 16
    {
        level: 16,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500, icon: '/assets/icons/gold.png' },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75, icon: '/assets/icons/diamonds.png' },
    },
    // Уровень 17
    {
        level: 17,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1, icon: '/assets/icons/rare_key.png' },
    },
    // Уровень 18
    {
        level: 18,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 19
    {
        level: 19,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500, icon: '/assets/icons/gold.png' },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75, icon: '/assets/icons/diamonds.png' },
    },
    // Уровень 20
    {
        level: 20,
        freeReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1, icon: '/assets/icons/rare_key.png' },
        premiumReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1, icon: '/assets/icons/epic_key.png' },
    },
    // Уровень 21
    {
        level: 21,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 22
    {
        level: 22,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500, icon: '/assets/icons/gold.png' },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1, icon: '/assets/icons/rare_key.png' },
    },
    // Уровень 23
    {
        level: 23,
        freeReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×50', amount: 50, icon: '/assets/icons/diamonds.png' },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75, icon: '/assets/icons/diamonds.png' },
    },
    // Уровень 24
    {
        level: 24,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 25
    {
        level: 25,
        freeReward: { type: REWARD_TYPES.RARE_ARTIFACT, name: 'Артефакт (Rare)', amount: 1, icon: '/assets/icons/rare_artifact.png' },
        premiumReward: { type: REWARD_TYPES.EPIC_GEAR_CHEST, name: 'Сундук с гарант. снаряжением (Эпик)', amount: 1, icon: '/assets/icons/epic_gear_chest.png' },
    },
    // Уровень 26
    {
        level: 26,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500, icon: '/assets/icons/gold.png' },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75, icon: '/assets/icons/diamonds.png' },
    },
    // Уровень 27
    {
        level: 27,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 28
    {
        level: 28,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1, icon: '/assets/icons/rare_key.png' },
    },
    // Уровень 29
    {
        level: 29,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500, icon: '/assets/icons/gold.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 30
    {
        level: 30,
        freeReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1, icon: '/assets/icons/epic_key.png' },
        premiumReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1, icon: '/assets/icons/epic_key.png' },
    },
    // Уровень 31
    {
        level: 31,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 32
    {
        level: 32,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500, icon: '/assets/icons/gold.png' },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75, icon: '/assets/icons/diamonds.png' },
    },
    // Уровень 33
    {
        level: 33,
        freeReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×50', amount: 50, icon: '/assets/icons/diamonds.png' },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1, icon: '/assets/icons/rare_key.png' },
    },
    // Уровень 34
    {
        level: 34,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 35
    {
        level: 35,
        freeReward: { type: REWARD_TYPES.TONCOIN_SHARDS, name: 'Осколки Toncoin ×3', amount: 3, icon: '/assets/icons/toncoin_shards.png' },
        premiumReward: { type: REWARD_TYPES.TONCOIN_SHARDS, name: 'Осколки Toncoin ×7', amount: 7, icon: '/assets/icons/toncoin_shards.png' },
    },
    // Уровень 36
    {
        level: 36,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500, icon: '/assets/icons/gold.png' },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75, icon: '/assets/icons/diamonds.png' },
    },
    // Уровень 37
    {
        level: 37,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1, icon: '/assets/icons/rare_key.png' },
    },
    // Уровень 38
    {
        level: 38,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 39
    {
        level: 39,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500, icon: '/assets/icons/gold.png' },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75, icon: '/assets/icons/diamonds.png' },
    },
    // Уровень 40
    {
        level: 40,
        freeReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1, icon: '/assets/icons/rare_key.png' },
        premiumReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1, icon: '/assets/icons/epic_key.png' },
    },
    // Уровень 41
    {
        level: 41,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 42
    {
        level: 42,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500, icon: '/assets/icons/gold.png' },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1, icon: '/assets/icons/rare_key.png' },
    },
    // Уровень 43
    {
        level: 43,
        freeReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×50', amount: 50, icon: '/assets/icons/diamonds.png' },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75, icon: '/assets/icons/diamonds.png' },
    },
    // Уровень 44
    {
        level: 44,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 45
    {
        level: 45,
        freeReward: { type: REWARD_TYPES.TONCOIN_SHARDS, name: 'Осколки Toncoin ×3', amount: 3, icon: '/assets/icons/toncoin_shards.png' },
        premiumReward: { type: REWARD_TYPES.EPIC_ARTIFACT, name: 'Артефакт (Epic)', amount: 1, icon: '/assets/icons/epic_artifact.png' },
    },
    // Уровень 46
    {
        level: 46,
        freeReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×2500', amount: 2500, icon: '/assets/icons/gold.png' },
        premiumReward: { type: REWARD_TYPES.GOLD, name: 'Золото ×5000', amount: 5000, icon: '/assets/icons/gold.png' },
    },
    // Уровень 47
    {
        level: 47,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.RARE_CHEST_KEY, name: 'Ключ от сундука редкого', amount: 1, icon: '/assets/icons/rare_key.png' },
    },
    // Уровень 48
    {
        level: 48,
        freeReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1, icon: '/assets/icons/epic_key.png' },
        premiumReward: { type: REWARD_TYPES.EPIC_CHEST_KEY, name: 'Ключ от сундука эпического', amount: 1, icon: '/assets/icons/epic_key.png' },
    },
    // Уровень 49
    {
        level: 49,
        freeReward: { type: REWARD_TYPES.ENERGY, name: 'Энергия +10', amount: 10, icon: '/assets/icons/energy.png' },
        premiumReward: { type: REWARD_TYPES.DIAMONDS, name: 'Алмазы ×75', amount: 75, icon: '/assets/icons/diamonds.png' },
    },
    // Уровень 50
    {
        level: 50,
        freeReward: { type: REWARD_TYPES.EPIC_GEAR_CHEST, name: '🎁 Сундук с гарант. снаряжением (Эпик)', amount: 1, icon: '/assets/icons/epic_gear_chest.png' },
        premiumReward: { type: REWARD_TYPES.LEGENDARY_GEAR_CHEST, name: '🏆 Сундук с гарант. снаряжением (Легендарное)', amount: 1, icon: '/assets/icons/legendary_gear_chest.png' },
    },
];

export const MOCK_SHARD_PASS_DATA_FULL = {
    currentLevel: 1, // Начальный уровень для примера
    currentProgress: 0, // Начальный прогресс для примера
    maxLevel: 50,
    isPremium: false, // Пользователь не имеет премиум по умолчанию
    levels: shardPassLevelsData.map(level => ({
        ...level,
        // Добавляем состояние 'claimed' для каждой награды, по умолчанию false
        freeReward: { ...level.freeReward, claimed: false },
        premiumReward: { ...level.premiumReward, claimed: false },
    })),
};

// Ты можешь импортировать MOCK_SHARD_PASS_DATA_FULL в свой компонент ShardPassScreen
// import { MOCK_SHARD_PASS_DATA_FULL } from './ShardPassRewardsData';
// ...
// const [shardPassData, setShardPassData] = useState(MOCK_SHARD_PASS_DATA_FULL);