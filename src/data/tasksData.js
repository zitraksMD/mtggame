export const TASK_TYPES = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
  };
  
  export const DAILY_TASKS_DEFINITIONS = [
    { 
      id: 'daily_login', 
      description: "Войти в игру", 
      target: 1, 
      reward: { diamonds: 25 }, 
      xp: 100,
      eventTracked: 'dailyLoginToday', // Событие, которое отслеживается в useGameStore
      // statResetType не нужен, т.к. это одноразовое событие в день
    },
    { 
      id: 'daily_kill_monsters', 
      description: "Уничтожить {N} монстров",
      target: 50, 
      reward: { diamonds: 25 }, 
      xp: 20,
      eventTracked: 'killsToday', // Отдельный счетчик для дневных убийств
      statResetType: TASK_TYPES.DAILY,
    },
    { 
      id: 'daily_complete_levels', 
      description: "Пройти {N} уровней",
      target: 3, 
      reward: { diamonds: 25 }, 
      xp: 20,
      eventTracked: 'levelsCompletedToday',
      statResetType: TASK_TYPES.DAILY,
    },
    { 
      id: 'daily_upgrade_gear', 
      description: "Улучшить {N} раз экипировку",
      target: 2, 
      reward: { diamonds: 25 }, 
      xp: 20,
      eventTracked: 'gearUpgradedToday',
      statResetType: TASK_TYPES.DAILY,
    },
    { 
      id: 'daily_open_chests', 
      description: "Открыть {N} сундуков", // Любых сундуков (артефактных, снаряжения)
      target: 5, 
      reward: { diamonds: 25 }, 
      xp: 20,
      eventTracked: 'chestsOpenedToday',
      statResetType: TASK_TYPES.DAILY,
    },
  ];
  
  export const WEEKLY_TASKS_DEFINITIONS = [
    { 
      id: 'weekly_login_days', 
      description: "Войти в игру {N} дней", 
      target: 7, // Или 5, если хочешь более достижимо
      reward: { diamonds: 50 }, 
      xp: 20,
      eventTracked: 'weeklyLoginDays', // Счетчик уникальных дней входа за неделю
      statResetType: TASK_TYPES.WEEKLY,
    },
    { 
      id: 'weekly_kill_monsters', 
      description: "Уничтожить {N} монстров",
      target: 300, // Больше, чем для daily
      reward: { diamonds: 50 }, 
      xp: 20,
      eventTracked: 'killsThisWeek', // Отдельный счетчик для недельных убийств
      statResetType: TASK_TYPES.WEEKLY,
    },
    { 
      id: 'weekly_complete_levels', 
      description: "Пройти {N} уровней",
      target: 15, 
      reward: { diamonds: 50 }, 
      xp: 20,
      eventTracked: 'levelsCompletedThisWeek',
      statResetType: TASK_TYPES.WEEKLY,
    },
    { 
      id: 'weekly_upgrade_gear', 
      description: "Улучшить {N} раз экипировку",
      target: 10, 
      reward: { diamonds: 50 }, 
      xp: 20,
      eventTracked: 'gearUpgradedThisWeek',
      statResetType: TASK_TYPES.WEEKLY,
    },
    { 
      id: 'weekly_open_chests', 
      description: "Открыть {N} сундуков",
      target: 25, 
      reward: { diamonds: 50 }, 
      xp: 20,
      eventTracked: 'chestsOpenedThisWeek',
      statResetType: TASK_TYPES.WEEKLY,
    },
  ];
  
  export const MONTHLY_TASKS_DEFINITIONS = [
    { 
      id: 'monthly_login_days', 
      description: "Войти в игру {N} дней",
      target: 28, // Например, 25 из ~30 дней
      reward: { diamonds: 75 }, 
      xp: 20,
      eventTracked: 'monthlyLoginDays', // Счетчик уникальных дней входа за месяц
      statResetType: TASK_TYPES.MONTHLY,
    },
    { 
      id: 'monthly_kill_monsters', 
      description: "Уничтожить {N} монстров",
      target: 1000, 
      reward: { diamonds: 75 }, 
      xp: 20,
      eventTracked: 'killsThisMonth',
      statResetType: TASK_TYPES.MONTHLY,
    },
    { 
      id: 'monthly_complete_levels', 
      description: "Пройти {N} уровней",
      target: 50, 
      reward: { diamonds: 75 }, 
      xp: 20,
      eventTracked: 'levelsCompletedThisMonth',
      statResetType: TASK_TYPES.MONTHLY,
    },
    { 
      id: 'monthly_upgrade_gear', 
      description: "Улучшить {N} раз экипировку",
      target: 30, 
      reward: { diamonds: 75 }, 
      xp: 20,
      eventTracked: 'gearUpgradedThisMonth',
      statResetType: TASK_TYPES.MONTHLY,
    },
    { 
      id: 'monthly_open_chests', 
      description: "Открыть {N} сундуков",
      target: 75, 
      reward: { diamonds: 75 }, 
      xp: 20,
      eventTracked: 'chestsOpenedThisMonth',
      statResetType: TASK_TYPES.MONTHLY,
    },
  ];
  
  // Награды за полную полосу опыта для каждого типа заданий
  export const BONUS_REWARDS_CONFIG = {
    [TASK_TYPES.DAILY]: {
      xpRequired: 100, // 5 заданий * 20xp = 100xp
      reward: { type: 'item_key', itemId: 'gear_chest_key_legendary', quantity: 1, name: "Ключ от редкого сундука", icon: "/assets/icons/key_rare.png" } // Добавил иконку
    },
    [TASK_TYPES.WEEKLY]: {
      xpRequired: 100,
      reward: { type: 'item_key', itemId: 'gear_chest_key_legendary', quantity: 3, name: "Ключ от редкого сундука", icon: "/assets/icons/key_rare.png" } // Добавил иконку, уточнил имя
    },
    [TASK_TYPES.MONTHLY]: {
      xpRequired: 100,
      // Убедись, что у тебя есть валюта 'toncoin_shards' или измени на существующую (например, diamonds или специальный предмет)
      reward: { type: 'currency', currencyId: 'toncoin_shards', quantity: 10, name: "Осколки TON", icon: "/assets/toncoin-icon.png" } // Добавил иконку
    }
  };
  
  // Хелпер для замены {N} в описании
  export const getTaskDescription = (taskDef) => {
    if (!taskDef || !taskDef.description) return "";
    return taskDef.description.replace('{N}', taskDef.target);
  };
  
  // Объединяем все определения для удобного доступа
  export const ALL_TASK_DEFINITIONS = {
    [TASK_TYPES.DAILY]: DAILY_TASKS_DEFINITIONS,
    [TASK_TYPES.WEEKLY]: WEEKLY_TASKS_DEFINITIONS,
    [TASK_TYPES.MONTHLY]: MONTHLY_TASKS_DEFINITIONS,
  };

