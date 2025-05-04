// src/data/achievementsDatabase.js

// Типы условий:
// - 'counter': достичь числового значения (например, убить врагов, собрать золото)
// - 'boolean': выполнить какое-то действие (да/нет) (например, улучшить предмет)
// - 'level_complete': завершить конкретный уровень/главу (нужно будет добавить логику флагов в useGameStore)
// - 'equip_rarity': надеть предмет определенной редкости (можно через boolean флаг)

const achievements = [
  {
    id: "complete_level_1", // Уникальный ID
    name: "Первый шаг",     // Название
    description: "Завершить Уровень 1 Главы 1.", // Описание
    icon: "🏆",            // Иконка (Emoji или путь к файлу)
    condition: { type: 'boolean', flag: 'completed_level_1_1' }, // Используем флаг, который нужно будет устанавливать в useGameStore после завершения уровня
    reward: { gold: 100 },
    xpGain: 50  // <<< ОПЫТ ЗА ДОСТИЖЕНИЕ
  },
  {
    id: "collect_1000_gold_total",
    name: "Золотая лихорадка",
    description: "Собрать 1000 золота за всё время.",
    icon: "💰",
    condition: { type: 'counter', stat: 'totalGoldCollected', target: 1000 }, // Стат из useGameStore
    reward: { diamonds: 10 },
    xpGain: 100 // <<< ОПЫТ ЗА ДОСТИЖЕНИЕ
  },
  {
    id: "forge_first_item",
    name: "Начинающий кузнец",
    description: "Улучшить или создать предмет в кузнице.",
    icon: "🔨",
    condition: { type: 'boolean', flag: 'hasForgedOrUpgraded' }, // Флаг в useGameStore
    reward: { gold: 200 },
    xpGain: 75 // <<< ОПЫТ ЗА ДОСТИЖЕНИЕ
  },
  {
    id: "reach_power_100",
    name: "Растущая мощь",
    description: "Достигнуть 100 ед. силы.",
    icon: "⭐",
    condition: { type: 'counter', stat: 'powerLevel', target: 100 }, // Стат из useGameStore
    reward: { diamonds: 20 },
    xpGain: 120 // <<< ОПЫТ ЗА ДОСТИЖЕНИЕ
  },
  {
    id: "equip_legendary",
    name: "Легенда во плоти",
    description: "Экипировать предмет легендарной редкости.",
    icon: "✨",
    condition: { type: 'boolean', flag: 'equippedLegendary' }, // Флаг в useGameStore
    reward: { gold: 500, diamonds: 15 },
    xpGain: 250 // <<< ОПЫТ ЗА ДОСТИЖЕНИЕ
  },
  {
    id: "kill_100_enemies",
    name: "Мясник",
    description: "Убить 100 врагов.",
    icon: "💀",
    condition: { type: 'counter', stat: 'totalKills', target: 100 }, // Стат из useGameStore
    reward: { gold: 250 },
    xpGain: 150 // <<< ОПЫТ ЗА ДОСТИЖЕНИЕ
  },
  // --- Примеры других достижений ---
  // {
  //   id: "open_10_chests",
  //   name: "Кладоискатель",
  //   description: "Открыть 10 сундуков.",
  //   icon: "🪙",
  //   condition: { type: 'counter', stat: 'totalChestsOpened', target: 10 }, // Нужен счетчик totalChestsOpened в useGameStore
  //   reward: { diamonds: 5 },
  //   xpGain: 80
  // },
  // {
  //   id: "reach_ach_level_5",
  //   name: "Коллекционер",
  //   description: "Достигнуть 5 уровня достижений.",
  //   icon: "🌟",
  //   condition: { type: 'counter', stat: 'achievementLevel', target: 5 }, // Стат из useGameStore
  //   reward: { gold: 1000 },
  //   xpGain: 200
  // },
  // {
  //   id: "buy_shop_item",
  //   name: "Первая покупка",
  //   description: "Купить любой предмет в магазине.",
  //   icon: "🛒",
  //   condition: { type: 'boolean', flag: 'hasMadeShopPurchase' }, // Нужен флаг в useGameStore
  //   reward: { gold: 50 },
  //   xpGain: 40
  // }
];

export default achievements;