// src/data/artifactChestData.js
import { ARTIFACT_SETS } from './artifactsData'; // Убедись, что путь верный

// --- Пул наград для ВСЕХ сундуков артефактов ---
// Настрой веса (weight) так, чтобы они отражали желаемые шансы.
// Больший вес = больший шанс.
const ARTIFACT_CHEST_REWARD_POOL = [
    { type: 'gold', min: 100, max: 500, weight: 25 },   // Пример: 25 вес золота
    { type: 'diamonds', amount: 10, weight: 5 },     // Пример: 5 вес алмазов
    { type: 'artifact_shard', weight: 60 },           // Пример: 60 вес на 1 осколок
    { type: 'full_artifact', weight: 10 },            // Пример: 10 вес на целый артефакт
]; // Суммарный вес: 100

// --- Определение данных для каждого сундука артефактов ---
export const ARTIFACT_CHESTS = ARTIFACT_SETS.map(set => ({
    id: `chest_${set.id}`,
    name: `Сундук "${set.name}"`,
    description: set.description || `Содержит награды, связанные с набором артефактов "${set.name}".`,
    icon: set.chestIcon || "/assets/chest-icon.png",
    setId: set.id,
    cost: { currency: 'diamonds', price: 0 }, // <<< Настрой цену
    rewardPool: ARTIFACT_CHEST_REWARD_POOL, // Используем общий пул для всех
    pityLimit: 50, // Гарант на ТИП 'full_artifact'
    isEnabled: set.artifacts && set.artifacts.length > 0,
})).filter(chest => chest.isEnabled); // Убираем сундуки для сетов без артефактов

// --- Хелперы ---
const ARTIFACT_CHEST_MAP = new Map(ARTIFACT_CHESTS.map(chest => [chest.id, chest]));

export const getArtifactChestById = (id) => {
    return ARTIFACT_CHEST_MAP.get(id);
};

// Функция взвешенного выбора ТИПА награды из пула
export const selectWeightedRandom = (pool) => {
    if (!pool || pool.length === 0) return null;
    const totalWeight = pool.reduce((sum, item) => sum + (item.weight || 0), 0);
    if (totalWeight <= 0) return pool[0];
    let randomValue = Math.random() * totalWeight;
    for (const item of pool) {
        if (randomValue < (item.weight || 0)) {
            return item; // Возвращает весь объект { type: '...', weight: X, ... }
        }
        randomValue -= (item.weight || 0);
    }
    return pool[pool.length - 1]; // Fallback
};