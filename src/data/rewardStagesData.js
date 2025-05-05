// src/data/rewardStagesData.js

/**
 * Структура данных для наград по этапам "Боевого Фонда" / "Фонда Приключений".
 * Используемые типы наград (поле type):
 * - 'diamond': Алмазы (основная премиум-валюта)
 * - 'ton_shard': Осколки Toncoin (специальная валюта/ресурс)
 * - 'key': Ключи от сундуков
 * - (Можно добавить 'energy', 'chest_common', 'chest_rare' и т.д.)
 *
 * Структура объекта уровня:
 * {
 * level: number,          // Номер уровня внутри этапа (начиная с 1)
 * completed: boolean,     // Пройден ли уровень пользователем?
 * freeClaimed: boolean,   // Получена ли бесплатная награда?
 * paidClaimed: boolean,   // Получена ли платная награда?
 * freeReward: { type: string, amount: number } | null, // Бесплатная награда
 * paidReward: { type: string, amount: number } | null  // Платная награда
 * }
 */

const allStagesData = {
    // --- ЭТАП 1 ---
    '1': [
      // Заменили 'gem' на 'diamond'
      { level: 1, completed: true, freeClaimed: true, paidClaimed: false, freeReward: { type: 'diamond', amount: 50 }, paidReward: { type: 'key', amount: 1 } },
      { level: 2, completed: true, freeClaimed: true, paidClaimed: false, freeReward: { type: 'ton_shard', amount: 10 }, paidReward: { type: 'key', amount: 1 } },
      { level: 3, completed: true, freeClaimed: false, paidClaimed: false, freeReward: { type: 'diamond', amount: 75 }, paidReward: { type: 'ton_shard', amount: 25 } },
      { level: 4, completed: true, freeClaimed: false, paidClaimed: false, freeReward: { type: 'key', amount: 1 }, paidReward: { type: 'diamond', amount: 150 } },
      { level: 5, completed: true, freeClaimed: false, paidClaimed: false, freeReward: { type: 'diamond', amount: 100 }, paidReward: { type: 'ton_shard', amount: 50 } },
      { level: 6, completed: false, freeClaimed: false, paidClaimed: false, freeReward: { type: 'ton_shard', amount: 15 }, paidReward: { type: 'key', amount: 2 } },
      { level: 7, completed: false, freeClaimed: false, paidClaimed: false, freeReward: { type: 'diamond', amount: 125 }, paidReward: { type: 'diamond', amount: 200 } },
      { level: 8, completed: false, freeClaimed: false, paidClaimed: false, freeReward: { type: 'key', amount: 1 }, paidReward: { type: 'ton_shard', amount: 75 } },
      { level: 9, completed: false, freeClaimed: false, paidClaimed: false, freeReward: { type: 'ton_shard', amount: 20 }, paidReward: { type: 'diamond', amount: 250 } },
      { level: 10, completed: false, freeClaimed: false, paidClaimed: false, freeReward: { type: 'diamond', amount: 150 }, paidReward: { type: 'key', amount: 3 } },
    ],
    // --- ЭТАП 2 ---
    '2': [
       // Заменили 'gem' на 'diamond'
      { level: 1, completed: false, freeClaimed: false, paidClaimed: false, freeReward: { type: 'diamond', amount: 70 }, paidReward: { type: 'key', amount: 1 } },
      { level: 2, completed: false, freeClaimed: false, paidClaimed: false, freeReward: { type: 'ton_shard', amount: 20 }, paidReward: { type: 'key', amount: 1 } },
      { level: 3, completed: false, freeClaimed: false, paidClaimed: false, freeReward: { type: 'diamond', amount: 90 }, paidReward: { type: 'ton_shard', amount: 30 } },
      { level: 4, completed: false, freeClaimed: false, paidClaimed: false, freeReward: { type: 'key', amount: 1 }, paidReward: { type: 'diamond', amount: 175 } },
      { level: 5, completed: false, freeClaimed: false, paidClaimed: false, freeReward: { type: 'diamond', amount: 120 }, paidReward: { type: 'ton_shard', amount: 60 } },
      { level: 6, completed: false, freeClaimed: false, paidClaimed: false, freeReward: { type: 'ton_shard', amount: 25 }, paidReward: { type: 'key', amount: 2 } },
      { level: 7, completed: false, freeClaimed: false, paidClaimed: false, freeReward: { type: 'diamond', amount: 140 }, paidReward: { type: 'diamond', amount: 225 } },
      { level: 8, completed: false, freeClaimed: false, paidClaimed: false, freeReward: { type: 'key', amount: 2 }, paidReward: { type: 'ton_shard', amount: 85 } },
      { level: 9, completed: false, freeClaimed: false, paidClaimed: false, freeReward: { type: 'ton_shard', amount: 30 }, paidReward: { type: 'diamond', amount: 275 } },
      { level: 10, completed: false, freeClaimed: false, paidClaimed: false, freeReward: { type: 'diamond', amount: 170 }, paidReward: { type: 'key', amount: 3 } },
    ],
    // --- ЭТАП 3 --- (Пока пустой)
    '3': [],
    // --- ЭТАП 4 --- (Пока пустой)
    '4': [],
  };
  
  export default allStagesData; // Экспортируем объект по умолчанию