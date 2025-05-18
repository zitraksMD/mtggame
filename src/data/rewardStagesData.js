// src/data/rewardStagesData.js

/**
 * Структура данных для наград по этапам "Боевого Фонда" / "Фонда Приключений".
 * ... (описание структуры остается тем же) ...
 * gameLevelInChapter: number, // ID Уровня в игре, например, 101 для Г1У1, 201 для Г2У1
 */

const allStagesData = {
  // --- ЭТАП 1 (соответствует Главе 1 игры) ---
  '1': [
    { level: 1, gameChapterId: 1, gameLevelInChapter: (1 * 100) + 1, freeReward: { type: 'ton_shard', amount: 50 }, paidReward: { type: 'key', amount: 1 }, freeClaimed: false, paidClaimed: false },
    { level: 2, gameChapterId: 1, gameLevelInChapter: (1 * 100) + 2, freeReward: { type: 'ton_shard', amount: 10 }, paidReward: { type: 'key', amount: 1 }, freeClaimed: false, paidClaimed: false },
    { level: 3, gameChapterId: 1, gameLevelInChapter: (1 * 100) + 3, freeReward: { type: 'diamond', amount: 75 }, paidReward: { type: 'ton_shard', amount: 25 }, freeClaimed: false, paidClaimed: false },
    { level: 4, gameChapterId: 1, gameLevelInChapter: (1 * 100) + 4, freeReward: { type: 'key', amount: 1 }, paidReward: { type: 'diamond', amount: 150 }, freeClaimed: false, paidClaimed: false },
    { level: 5, gameChapterId: 1, gameLevelInChapter: (1 * 100) + 5, freeReward: { type: 'diamond', amount: 100 }, paidReward: { type: 'ton_shard', amount: 50 }, freeClaimed: false, paidClaimed: false },
    { level: 6, gameChapterId: 1, gameLevelInChapter: (1 * 100) + 6, freeReward: { type: 'ton_shard', amount: 15 }, paidReward: { type: 'key', amount: 2 }, freeClaimed: false, paidClaimed: false },
    { level: 7, gameChapterId: 1, gameLevelInChapter: (1 * 100) + 7, freeReward: { type: 'diamond', amount: 125 }, paidReward: { type: 'diamond', amount: 200 }, freeClaimed: false, paidClaimed: false },
    { level: 8, gameChapterId: 1, gameLevelInChapter: (1 * 100) + 8, freeReward: { type: 'key', amount: 1 }, paidReward: { type: 'ton_shard', amount: 75 }, freeClaimed: false, paidClaimed: false },
    { level: 9, gameChapterId: 1, gameLevelInChapter: (1 * 100) + 9, freeReward: { type: 'ton_shard', amount: 20 }, paidReward: { type: 'diamond', amount: 250 }, freeClaimed: false, paidClaimed: false },
    { level: 10, gameChapterId: 1, gameLevelInChapter: (1 * 100) + 10, freeReward: { type: 'diamond', amount: 150 }, paidReward: { type: 'key', amount: 3 }, freeClaimed: false, paidClaimed: false },
  ],
  // --- ЭТАП 2 (соответствует Главе 2 игры) ---
  '2': [
    { level: 1, gameChapterId: 2, gameLevelInChapter: (2 * 100) + 1, freeReward: { type: 'diamond', amount: 70 }, paidReward: { type: 'key', amount: 1 }, freeClaimed: false, paidClaimed: false },
    { level: 2, gameChapterId: 2, gameLevelInChapter: (2 * 100) + 2, freeReward: { type: 'ton_shard', amount: 20 }, paidReward: { type: 'key', amount: 1 }, freeClaimed: false, paidClaimed: false },
    { level: 3, gameChapterId: 2, gameLevelInChapter: (2 * 100) + 3, freeReward: { type: 'diamond', amount: 90 }, paidReward: { type: 'ton_shard', amount: 30 }, freeClaimed: false, paidClaimed: false },
    { level: 4, gameChapterId: 2, gameLevelInChapter: (2 * 100) + 4, freeReward: { type: 'key', amount: 1 }, paidReward: { type: 'diamond', amount: 175 }, freeClaimed: false, paidClaimed: false },
    { level: 5, gameChapterId: 2, gameLevelInChapter: (2 * 100) + 5, freeReward: { type: 'diamond', amount: 120 }, paidReward: { type: 'ton_shard', amount: 60 }, freeClaimed: false, paidClaimed: false },
    { level: 6, gameChapterId: 2, gameLevelInChapter: (2 * 100) + 6, freeReward: { type: 'ton_shard', amount: 25 }, paidReward: { type: 'key', amount: 2 }, freeClaimed: false, paidClaimed: false },
    { level: 7, gameChapterId: 2, gameLevelInChapter: (2 * 100) + 7, freeReward: { type: 'diamond', amount: 140 }, paidReward: { type: 'diamond', amount: 225 }, freeClaimed: false, paidClaimed: false },
    { level: 8, gameChapterId: 2, gameLevelInChapter: (2 * 100) + 8, freeReward: { type: 'key', amount: 2 }, paidReward: { type: 'ton_shard', amount: 85 }, freeClaimed: false, paidClaimed: false },
    { level: 9, gameChapterId: 2, gameLevelInChapter: (2 * 100) + 9, freeReward: { type: 'ton_shard', amount: 30 }, paidReward: { type: 'diamond', amount: 275 }, freeClaimed: false, paidClaimed: false },
    { level: 10, gameChapterId: 2, gameLevelInChapter: (2 * 100) + 10, freeReward: { type: 'diamond', amount: 170 }, paidReward: { type: 'key', amount: 3 }, freeClaimed: false, paidClaimed: false },
  ],
  // --- ЭТАП 3 (соответствует Главе 3 игры) ---
  '3': [
    { level: 1, gameChapterId: 3, gameLevelInChapter: (3 * 100) + 1, freeReward: { type: 'diamond', amount: 90 }, paidReward: { type: 'key', amount: 1 }, freeClaimed: false, paidClaimed: false },
    { level: 2, gameChapterId: 3, gameLevelInChapter: (3 * 100) + 2, freeReward: { type: 'ton_shard', amount: 30 }, paidReward: { type: 'key', amount: 1 }, freeClaimed: false, paidClaimed: false },
    { level: 3, gameChapterId: 3, gameLevelInChapter: (3 * 100) + 3, freeReward: { type: 'diamond', amount: 110 }, paidReward: { type: 'ton_shard', amount: 40 }, freeClaimed: false, paidClaimed: false },
    { level: 4, gameChapterId: 3, gameLevelInChapter: (3 * 100) + 4, freeReward: { type: 'key', amount: 1 }, paidReward: { type: 'diamond', amount: 200 }, freeClaimed: false, paidClaimed: false },
    { level: 5, gameChapterId: 3, gameLevelInChapter: (3 * 100) + 5, freeReward: { type: 'diamond', amount: 140 }, paidReward: { type: 'ton_shard', amount: 70 }, freeClaimed: false, paidClaimed: false },
    { level: 6, gameChapterId: 3, gameLevelInChapter: (3 * 100) + 6, freeReward: { type: 'ton_shard', amount: 35 }, paidReward: { type: 'key', amount: 2 }, freeClaimed: false, paidClaimed: false },
    { level: 7, gameChapterId: 3, gameLevelInChapter: (3 * 100) + 7, freeReward: { type: 'diamond', amount: 160 }, paidReward: { type: 'diamond', amount: 250 }, freeClaimed: false, paidClaimed: false },
    { level: 8, gameChapterId: 3, gameLevelInChapter: (3 * 100) + 8, freeReward: { type: 'key', amount: 2 }, paidReward: { type: 'ton_shard', amount: 95 }, freeClaimed: false, paidClaimed: false },
    { level: 9, gameChapterId: 3, gameLevelInChapter: (3 * 100) + 9, freeReward: { type: 'ton_shard', amount: 40 }, paidReward: { type: 'diamond', amount: 300 }, freeClaimed: false, paidClaimed: false },
    { level: 10, gameChapterId: 3, gameLevelInChapter: (3 * 100) + 10, freeReward: { type: 'diamond', amount: 190 }, paidReward: { type: 'key', amount: 3 }, freeClaimed: false, paidClaimed: false },
  ],
  // --- ЭТАП 4 (соответствует Главе 4 игры) ---
  '4': [
    { level: 1, gameChapterId: 4, gameLevelInChapter: (4 * 100) + 1, freeReward: { type: 'diamond', amount: 110 }, paidReward: { type: 'key', amount: 1 }, freeClaimed: false, paidClaimed: false },
    { level: 2, gameChapterId: 4, gameLevelInChapter: (4 * 100) + 2, freeReward: { type: 'ton_shard', amount: 40 }, paidReward: { type: 'key', amount: 1 }, freeClaimed: false, paidClaimed: false },
    { level: 3, gameChapterId: 4, gameLevelInChapter: (4 * 100) + 3, freeReward: { type: 'diamond', amount: 130 }, paidReward: { type: 'ton_shard', amount: 50 }, freeClaimed: false, paidClaimed: false },
    { level: 4, gameChapterId: 4, gameLevelInChapter: (4 * 100) + 4, freeReward: { type: 'key', amount: 2 }, paidReward: { type: 'diamond', amount: 225 }, freeClaimed: false, paidClaimed: false },
    { level: 5, gameChapterId: 4, gameLevelInChapter: (4 * 100) + 5, freeReward: { type: 'diamond', amount: 160 }, paidReward: { type: 'ton_shard', amount: 80 }, freeClaimed: false, paidClaimed: false },
    { level: 6, gameChapterId: 4, gameLevelInChapter: (4 * 100) + 6, freeReward: { type: 'ton_shard', amount: 45 }, paidReward: { type: 'key', amount: 2 }, freeClaimed: false, paidClaimed: false },
    { level: 7, gameChapterId: 4, gameLevelInChapter: (4 * 100) + 7, freeReward: { type: 'diamond', amount: 180 }, paidReward: { type: 'diamond', amount: 275 }, freeClaimed: false, paidClaimed: false },
    { level: 8, gameChapterId: 4, gameLevelInChapter: (4 * 100) + 8, freeReward: { type: 'key', amount: 2 }, paidReward: { type: 'ton_shard', amount: 105 }, freeClaimed: false, paidClaimed: false },
    { level: 9, gameChapterId: 4, gameLevelInChapter: (4 * 100) + 9, freeReward: { type: 'ton_shard', amount: 50 }, paidReward: { type: 'diamond', amount: 325 }, freeClaimed: false, paidClaimed: false },
    { level: 10, gameChapterId: 4, gameLevelInChapter: (4 * 100) + 10, freeReward: { type: 'diamond', amount: 210 }, paidReward: { type: 'key', amount: 4 }, freeClaimed: false, paidClaimed: false },
  ],
  // --- ЭТАП 5 (соответствует Главе 5 игры) ---
  '5': [
    { level: 1, gameChapterId: 5, gameLevelInChapter: (5 * 100) + 1, freeReward: { type: 'diamond', amount: 130 }, paidReward: { type: 'key', amount: 1 }, freeClaimed: false, paidClaimed: false },
    { level: 2, gameChapterId: 5, gameLevelInChapter: (5 * 100) + 2, freeReward: { type: 'ton_shard', amount: 50 }, paidReward: { type: 'key', amount: 2 }, freeClaimed: false, paidClaimed: false },
    { level: 3, gameChapterId: 5, gameLevelInChapter: (5 * 100) + 3, freeReward: { type: 'diamond', amount: 150 }, paidReward: { type: 'ton_shard', amount: 60 }, freeClaimed: false, paidClaimed: false },
    { level: 4, gameChapterId: 5, gameLevelInChapter: (5 * 100) + 4, freeReward: { type: 'key', amount: 2 }, paidReward: { type: 'diamond', amount: 250 }, freeClaimed: false, paidClaimed: false },
    { level: 5, gameChapterId: 5, gameLevelInChapter: (5 * 100) + 5, freeReward: { type: 'diamond', amount: 180 }, paidReward: { type: 'ton_shard', amount: 90 }, freeClaimed: false, paidClaimed: false },
    { level: 6, gameChapterId: 5, gameLevelInChapter: (5 * 100) + 6, freeReward: { type: 'ton_shard', amount: 55 }, paidReward: { type: 'key', amount: 3 }, freeClaimed: false, paidClaimed: false },
    { level: 7, gameChapterId: 5, gameLevelInChapter: (5 * 100) + 7, freeReward: { type: 'diamond', amount: 200 }, paidReward: { type: 'diamond', amount: 300 }, freeClaimed: false, paidClaimed: false },
    { level: 8, gameChapterId: 5, gameLevelInChapter: (5 * 100) + 8, freeReward: { type: 'key', amount: 3 }, paidReward: { type: 'ton_shard', amount: 115 }, freeClaimed: false, paidClaimed: false },
    { level: 9, gameChapterId: 5, gameLevelInChapter: (5 * 100) + 9, freeReward: { type: 'ton_shard', amount: 60 }, paidReward: { type: 'diamond', amount: 350 }, freeClaimed: false, paidClaimed: false },
    { level: 10, gameChapterId: 5, gameLevelInChapter: (5 * 100) + 10, freeReward: { type: 'diamond', amount: 230 }, paidReward: { type: 'key', amount: 4 }, freeClaimed: false, paidClaimed: false },
  ],
  // --- ЭТАП 6 (соответствует Главе 6 игры) ---
  '6': [
    { level: 1, gameChapterId: 6, gameLevelInChapter: (6 * 100) + 1, freeReward: { type: 'diamond', amount: 150 }, paidReward: { type: 'key', amount: 2 }, freeClaimed: false, paidClaimed: false },
    { level: 2, gameChapterId: 6, gameLevelInChapter: (6 * 100) + 2, freeReward: { type: 'ton_shard', amount: 60 }, paidReward: { type: 'key', amount: 2 }, freeClaimed: false, paidClaimed: false },
    { level: 3, gameChapterId: 6, gameLevelInChapter: (6 * 100) + 3, freeReward: { type: 'diamond', amount: 170 }, paidReward: { type: 'ton_shard', amount: 70 }, freeClaimed: false, paidClaimed: false },
    { level: 4, gameChapterId: 6, gameLevelInChapter: (6 * 100) + 4, freeReward: { type: 'key', amount: 2 }, paidReward: { type: 'diamond', amount: 275 }, freeClaimed: false, paidClaimed: false },
    { level: 5, gameChapterId: 6, gameLevelInChapter: (6 * 100) + 5, freeReward: { type: 'diamond', amount: 200 }, paidReward: { type: 'ton_shard', amount: 100 }, freeClaimed: false, paidClaimed: false },
    { level: 6, gameChapterId: 6, gameLevelInChapter: (6 * 100) + 6, freeReward: { type: 'ton_shard', amount: 65 }, paidReward: { type: 'key', amount: 3 }, freeClaimed: false, paidClaimed: false },
    { level: 7, gameChapterId: 6, gameLevelInChapter: (6 * 100) + 7, freeReward: { type: 'diamond', amount: 220 }, paidReward: { type: 'diamond', amount: 325 }, freeClaimed: false, paidClaimed: false },
    { level: 8, gameChapterId: 6, gameLevelInChapter: (6 * 100) + 8, freeReward: { type: 'key', amount: 3 }, paidReward: { type: 'ton_shard', amount: 125 }, freeClaimed: false, paidClaimed: false },
    { level: 9, gameChapterId: 6, gameLevelInChapter: (6 * 100) + 9, freeReward: { type: 'ton_shard', amount: 70 }, paidReward: { type: 'diamond', amount: 375 }, freeClaimed: false, paidClaimed: false },
    { level: 10, gameChapterId: 6, gameLevelInChapter: (6 * 100) + 10, freeReward: { type: 'diamond', amount: 250 }, paidReward: { type: 'key', amount: 5 }, freeClaimed: false, paidClaimed: false },
  ],
};

export default allStagesData;