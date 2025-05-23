// src/data/artifactChestData.js

// --- Определения пулов наград и гарантов для каждого сундука ---

// Сундук Адепта: Новые шансы
const ADEPT_CHEST_REWARD_POOL = [
    // тип, параметры награды, вес (процент как вес для суммы 100)
    { type: 'gold', min: 500, max: 2500, weight: 30 },        // Золото - 30%
    { type: 'diamonds', amount: 50, weight: 20 },             // Алмазы - 20%
    { type: 'artifact_shard', rarity: 'uncommon', weight: 15 },// Осколок Анкомон - 15% (Изменено на lowercase)
    { type: 'artifact_shard', rarity: 'rare', weight: 10 },    // Осколок Рейр - 10% (Изменено на lowercase)
    { type: 'artifact_shard', rarity: 'epic', weight: 7 },     // Осколок Эпик - 7% (Изменено на lowercase)
    { type: 'full_artifact', rarity: 'uncommon', weight: 10 }, // Полный Анкомон - 10% (Изменено на lowercase)
    { type: 'full_artifact', rarity: 'rare', weight: 6 },      // Полный Рейр - 6% (Изменено на lowercase)
    { type: 'full_artifact', rarity: 'epic', weight: 2 }       // Полный Эпик - 2% (Изменено на lowercase)
]; // Сумма весов = 30+20+15+10+7+10+6+2 = 100

// Гарант для Сундука Адепта
const ADEPT_CHEST_PITY_RARITY_POOL = [
    { rarity: 'uncommon', weight: 70 }, // (Изменено на lowercase)
    { rarity: 'rare', weight: 20 },     // (Изменено на lowercase)
    { rarity: 'epic', weight: 10 }      // (Изменено на lowercase)
]; // Сумма весов = 100

// Сундук Мастера: Новые шансы
const MASTER_CHEST_REWARD_POOL = [
    { type: 'gold', min: 2000, max: 10000, weight: 35 },   // Золото - 30%
    { type: 'diamonds', amount: 150, weight: 24 },         // Алмазы - 20%
    { type: 'artifact_shard', rarity: 'epic', weight: 15 },    // Осколок Эпик - 15% (Изменено на lowercase)
    { type: 'artifact_shard', rarity: 'legendary', weight: 10 },// Осколок Легендари - 10% (Изменено на lowercase)
    { type: 'artifact_shard', rarity: 'mythic', weight: 7 },   // Осколок Мифик - 7% (Изменено на lowercase)
    { type: 'full_artifact', rarity: 'epic', weight: 5 },     // Полный Эпик - 10% (Изменено на lowercase)
    { type: 'full_artifact', rarity: 'legendary', weight: 3 }, // Полный Легендари - 6% (Изменено на lowercase)
    { type: 'full_artifact', rarity: 'mythic', weight: 1 }     // Полный Мифик - 2% (Изменено на lowercase)
]; // Сумма весов = 30+20+15+10+7+10+6+2 = 100

// Гарант для Сундука Мастера
const MASTER_CHEST_PITY_RARITY_POOL = [
    { rarity: 'epic', weight: 80 },     // (Изменено на lowercase)
    { rarity: 'legendary', weight: 15 }, // (Изменено на lowercase)
    { rarity: 'mythic', weight: 5 }      // (Изменено на lowercase)
]; // Сумма весов = 100

// --- Определение данных для каждого сундука артефактов ---
export const ARTIFACT_CHESTS = [
    {
        id: 'artifact_chest_adept',
        name: 'Сундук Адепта',
        description: 'Содержит артефакты от Необычной до Эпической редкости, их осколки, а также золото и алмазы.',
        icon: '/assets/chest-icon.png', // Укажите ваш путь
        cost: { currency: 'diamonds', price: 0 }, // Настройте цену
        shardPassXp: 25, // Опыт для ShardPass
        rewardPool: ADEPT_CHEST_REWARD_POOL, // Обновленный пул наград
        pity: {
            triggerLimit: 50, // Через сколько открытий гарантирован ПОЛНЫЙ артефакт
            guaranteedArtifactRarityPool: ADEPT_CHEST_PITY_RARITY_POOL,
            pityEnabledRarities: ['uncommon', 'rare', 'epic'] // (Изменено на lowercase)
        },
        isEnabled: true,
    },
    {
        id: 'artifact_chest_master',
        name: 'Сундук Мастера',
        description: 'Содержит артефакты от Эпической до Мифической редкости, их осколки, а также золото и алмазы.',
        icon: '/assets/chest-icon.png', // Укажите ваш путь
        cost: { currency: 'diamonds', price: 0 }, // Настройте цену
        shardPassXp: 50, // Опыт для ShardPass
        rewardPool: MASTER_CHEST_REWARD_POOL, // Обновленный пул наград
        pity: {
            triggerLimit: 50,
            guaranteedArtifactRarityPool: MASTER_CHEST_PITY_RARITY_POOL,
            pityEnabledRarities: ['epic', 'legendary', 'mythic'] // (Изменено на lowercase)
        },
        isEnabled: true,
    }
];

// --- Хелперы (остаются без изменений) ---
const ARTIFACT_CHEST_MAP = new Map(ARTIFACT_CHESTS.map(chest => [chest.id, chest]));

export const getArtifactChestById = (id) => {
    return ARTIFACT_CHEST_MAP.get(id);
};

export const selectWeightedRandomItem = (pool) => {
    if (!pool || pool.length === 0) {
        console.error("Попытка выбора из пустого или недействительного пула.");
        return null;
    }
    const totalWeight = pool.reduce((sum, item) => sum + (item.weight || 0), 0);
    if (totalWeight <= 0) {
        console.warn("Суммарный вес в пуле равен нулю или меньше. Возвращается первый элемент или null.");
        return pool.length > 0 ? pool[0] : null;
    }
    let randomValue = Math.random() * totalWeight;
    for (const item of pool) {
        if (randomValue < (item.weight || 0)) {
            return item;
        }
        randomValue -= (item.weight || 0);
    }
    return pool[pool.length - 1]; // Fallback
};