// src/data/achievementsDatabase.js

// Типы наград для удобства (если еще не определены глобально)
// const REWARD_TYPE_GOLD = 'gold';
// const REWARD_TYPE_DIAMONDS = 'diamonds';
// const REWARD_TYPE_RARE_KEY = 'rareChestKeys'; // Должно совпадать с ключами в useGameStore
// const REWARD_TYPE_EPIC_KEY = 'epicChestKeys';   // Должно совпадать с ключами в useGameStore
// const REWARD_TYPE_TON_SHARDS = 'toncoinShards'; // Должно совпадать с ключами в useGameStore

const achievements = [
    // Категория: Закаленный Временем
    {
        id: "daily_login_milestones",
        name: "Страж Времени", // "Верный Игрок", "Хранитель Портала"
        icon: "⏳",
        stat: 'uniqueLoginDaysCount', // Новый стат в useGameStore: общее кол-во уникальных дней входа
        category: "Закаленный Временем",
        levels: [
            { level: 1, description: "Войти в игру 30 разных дней.", target: 30, reward: { gold: 1000, diamonds: 25 }, xpGain: 100 },
            { level: 2, description: "Войти в игру 90 разных дней.", target: 90, reward: { gold: 3000, diamonds: 75, rareChestKeys: 1 }, xpGain: 250 },
            { level: 3, description: "Войти в игру 180 разных дней.", target: 180, reward: { gold: 7500, diamonds: 150, rareChestKeys: 2 }, xpGain: 500 },
            { level: 4, description: "Войти в игру 365 разных дней.", target: 365, reward: { gold: 15000, diamonds: 300, epicChestKeys: 1 }, xpGain: 1000 },
            { level: 5, description: "Войти в игру 750 разных дней.", target: 750, reward: { gold: 30000, diamonds: 500, epicChestKeys: 2 }, xpGain: 2000 },
        ]
    },

    // Категория: Бич Монстров
    {
        id: "monster_slayer_progression",
        name: "Гроза Чудовищ", // "Истребитель", "Легендарный Охотник"
        icon: "⚔️",
        stat: 'totalKills', // Существующий стат
        category: "Бич Монстров",
        levels: [
            { level: 1, description: "Убить 1,000 монстров.", target: 1000, reward: { gold: 500 }, xpGain: 100 },
            { level: 2, description: "Убить 5,000 монстров.", target: 5000, reward: { gold: 2000, diamonds: 20 }, xpGain: 200 },
            { level: 3, description: "Убить 10,000 монстров.", target: 10000, reward: { gold: 5000, diamonds: 50 }, xpGain: 400 },
            { level: 4, description: "Убить 25,000 монстров.", target: 25000, reward: { gold: 12000, diamonds: 100, rareChestKeys: 1 }, xpGain: 800 },
            { level: 5, description: "Убить 100,000 монстров.", target: 100000, reward: { gold: 30000, diamonds: 250, epicChestKeys: 1 }, xpGain: 1500 },
        ]
    },

    // Категория: Искатель Сокровищ
    {
        id: "gear_chest_connoisseur",
        name: "Коллекционер Снаряжения", // "Взломщик Сейфов", "Мастер Ключей"
        icon: "🧰",
        stat: 'totalGearChestsOpened', // Существующий стат (убедись, что он суммирует все 3 типа)
        category: "Искатель Сокровищ",
        levels: [
            { level: 1, description: "Открыть 100 сундуков снаряжения.", target: 100, reward: { gold: 750 }, xpGain: 100 },
            { level: 2, description: "Открыть 500 сундуков снаряжения.", target: 500, reward: { gold: 3000, diamonds: 30 }, xpGain: 250 },
            { level: 3, description: "Открыть 1,500 сундуков снаряжения.", target: 1500, reward: { gold: 8000, diamonds: 75, rareChestKeys: 1 }, xpGain: 500 },
            { level: 4, description: "Открыть 2,500 сундуков снаряжения.", target: 2500, reward: { gold: 15000, diamonds: 150, rareChestKeys: 2 }, xpGain: 800 },
            { level: 5, description: "Открыть 10,000 сундуков снаряжения.", target: 10000, reward: { gold: 40000, diamonds: 300, epicChestKeys: 1 }, xpGain: 1600 },
        ]
    },
    {
        id: "artifact_chest_adept",
        name: "Знаток Артефактов", // "Хранитель Древностей"
        icon: "🏺",
        stat: 'totalArtifactChestsOpened', // Существующий стат (убедись, что он суммирует оба типа)
        category: "Искатель Сокровищ",
        levels: [
            { level: 1, description: "Открыть 100 сундуков артефактов.", target: 100, reward: { diamonds: 50 }, xpGain: 120 },
            { level: 2, description: "Открыть 500 сундуков артефактов.", target: 500, reward: { diamonds: 200, gold: 1000 }, xpGain: 280 },
            { level: 3, description: "Открыть 1,500 сундуков артефактов.", target: 1500, reward: { diamonds: 500, rareChestKeys: 1 }, xpGain: 550 },
            { level: 4, description: "Открыть 2,500 сундуков артефактов.", target: 2500, reward: { diamonds: 800, epicChestKeys: 1 }, xpGain: 900 },
            { level: 5, description: "Открыть 10,000 сундуков артефактов.", target: 10000, reward: { diamonds: 1500, epicChestKeys: 2 }, xpGain: 1800 },
        ]
    },

    // Категория: Икона Стиля
    {
        id: "epic_fashionista",
        name: "Эпический Кутюрье",
        icon: "💜", // Эмодзи для эпического цвета
        stat: 'equippedEpicItemCount', // Новый вычисляемый стат: кол-во надетых эпических предметов
        category: "Икона Стиля",
        levels: [
            { level: 1, description: "Надеть 1 эпический предмет снаряжения.", target: 1, reward: { gold: 500 }, xpGain: 50 },
            { level: 2, description: "Надеть 2 эпических предмета снаряжения.", target: 2, reward: { gold: 1000 }, xpGain: 75 },
            { level: 3, description: "Надеть 3 эпических предмета снаряжения.", target: 3, reward: { gold: 1500, diamonds: 10 }, xpGain: 100 },
            { level: 4, description: "Надеть 4 эпических предмета снаряжения.", target: 4, reward: { gold: 2000, diamonds: 20 }, xpGain: 125 },
            { level: 5, description: "Надеть 5 эпических предметов снаряжения.", target: 5, reward: { gold: 2500, diamonds: 30 }, xpGain: 150 },
            { level: 6, description: "Надеть 6 эпических предметов снаряжения (полный сет).", target: 6, reward: { gold: 5000, diamonds: 50, rareChestKeys:1 }, xpGain: 250 },
        ]
    },
    {
        id: "legendary_trendsetter",
        name: "Легендарный Законодатель Мод",
        icon: "🧡", // Эмодзи для легендарного цвета
        stat: 'equippedLegendaryItemCount', // Новый вычисляемый стат
        category: "Икона Стиля",
        levels: [
            { level: 1, description: "Надеть 1 легендарный предмет снаряжения.", target: 1, reward: { gold: 1000, diamonds: 10 }, xpGain: 100 },
            { level: 2, description: "Надеть 2 легендарных предмета снаряжения.", target: 2, reward: { gold: 2000, diamonds: 20 }, xpGain: 150 },
            { level: 3, description: "Надеть 3 легендарных предмета снаряжения.", target: 3, reward: { gold: 3000, diamonds: 30 }, xpGain: 200 },
            { level: 4, description: "Надеть 4 легендарных предмета снаряжения.", target: 4, reward: { gold: 4000, diamonds: 40, rareChestKeys: 1 }, xpGain: 250 },
            { level: 5, description: "Надеть 5 легендарных предметов снаряжения.", target: 5, reward: { gold: 5000, diamonds: 50, epicChestKeys: 1 }, xpGain: 300 },
            { level: 6, description: "Надеть 6 легендарных предметов снаряжения (полный сет).", target: 6, reward: { gold: 10000, diamonds: 100, epicChestKeys:1 }, xpGain: 500 },
        ]
    },
    {
        id: "mythic_paragon",
        name: "Мифический Идеал",
        icon: "❤️", // Эмодзи для мифического цвета
        stat: 'equippedMythicItemCount', // Новый вычисляемый стат
        category: "Икона Стиля",
        levels: [
            { level: 1, description: "Надеть 1 мифический предмет снаряжения.", target: 1, reward: { gold: 2500, diamonds: 25 }, xpGain: 200 },
            { level: 2, description: "Надеть 2 мифических предмета снаряжения.", target: 2, reward: { gold: 5000, diamonds: 50 }, xpGain: 300 },
            { level: 3, description: "Надеть 3 мифических предмета снаряжения.", target: 3, reward: { gold: 7500, diamonds: 75, rareChestKeys: 1 }, xpGain: 400 },
            { level: 4, description: "Надеть 4 мифических предмета снаряжения.", target: 4, reward: { gold: 10000, diamonds: 100, epicChestKeys: 1 }, xpGain: 500 },
            { level: 5, description: "Надеть 5 мифических предметов снаряжения.", target: 5, reward: { gold: 12500, diamonds: 125, epicChestKeys: 1 }, xpGain: 600 },
            { level: 6, description: "Надеть 6 мифических предметов снаряжения (полный сет).", target: 6, reward: { gold: 25000, diamonds: 250, epicChestKeys:2 }, xpGain: 1000 },
        ]
    },

    // Категория: Собиратель Реликвий
    {
        id: "artifact_set_collector",
        name: "Хранитель Сетов", // "Магистр Реликвий"
        icon: "📜",
        stat: 'completedArtifactSetCount', // Новый вычисляемый стат: кол-во полностью собранных и активных сетов артефактов
        category: "Собиратель Реликвий",
        levels: [
            { level: 1, description: "Собрать 1 полный сет артефактов.", target: 1, reward: { diamonds: 100 }, xpGain: 150 },
            { level: 2, description: "Собрать 2 полных сета артефактов.", target: 2, reward: { diamonds: 200, gold: 2000 }, xpGain: 300 },
            { level: 3, description: "Собрать 3 полных сета артефактов.", target: 3, reward: { diamonds: 300, rareChestKeys: 1 }, xpGain: 450 },
            { level: 4, description: "Собрать 4 полных сета артефактов.", target: 4, reward: { diamonds: 400, epicChestKeys: 1 }, xpGain: 600 },
            { level: 5, description: "Собрать 5 полных сетов артефактов.", target: 5, reward: { diamonds: 500, epicChestKeys: 1, gold: 5000 }, xpGain: 750 },
            { level: 6, description: "Собрать все 6 полных сетов артефактов.", target: 6, reward: { diamonds: 1000, epicChestKeys: 2 }, xpGain: 1000 },
        ]
    },

    // Категория: Покоритель Миров
    {
        id: "normal_mode_campaigner",
        name: "Исследователь Пустошей",
        icon: "🗺️",
        stat: 'uniqueNormalLevelsCompleted', // Новый вычисляемый стат: кол-во уникальных пройденных уровней на Normal
        category: "Покоритель Миров",
        levels: [
            { level: 1, description: "Пройти 10 разных уровней на обычном режиме.", target: 10, reward: { gold: 300 }, xpGain: 80 },
            { level: 2, description: "Пройти 100 разных уровней на обычном режиме.", target: 100, reward: { gold: 1000, diamonds: 20 }, xpGain: 200 },
            { level: 3, description: "Пройти 500 разных уровней на обычном режиме.", target: 500, reward: { gold: 5000, diamonds: 50 }, xpGain: 500 },
            { level: 4, description: "Пройти 1500 разных уровней на обычном режиме.", target: 1500, reward: { gold: 15000, diamonds: 100, rareChestKeys: 1 }, xpGain: 1000 },
            { level: 5, description: "Пройти 3000 разных уровней на обычном режиме.", target: 3000, reward: { gold: 30000, diamonds: 200, epicChestKeys: 1 }, xpGain: 2000 },
        ]
    },
    {
        id: "hard_mode_veteran",
        name: "Закаленный в Боях",
        icon: "🔥",
        stat: 'uniqueHardLevelsCompleted', // Новый вычисляемый стат: кол-во уникальных пройденных уровней на Hard
        category: "Покоритель Миров",
        levels: [
            { level: 1, description: "Пройти 3 разных уровня на сложном режиме.", target: 3, reward: { gold: 500, diamonds: 10 }, xpGain: 100 },
            { level: 2, description: "Пройти 25 разных уровней на сложном режиме.", target: 25, reward: { gold: 2000, diamonds: 30 }, xpGain: 250 },
            { level: 3, description: "Пройти 125 разных уровней на сложном режиме.", target: 125, reward: { gold: 8000, diamonds: 80, rareChestKeys: 1 }, xpGain: 600 },
            { level: 4, description: "Пройти 500 разных уровней на сложном режиме.", target: 500, reward: { gold: 20000, diamonds: 150, epicChestKeys: 1 }, xpGain: 1200 },
            { level: 5, description: "Пройти 750 разных уровней на сложном режиме.", target: 750, reward: { gold: 35000, diamonds: 250, epicChestKeys: 2 }, xpGain: 2500 },
        ]
    },

    // Категория: Финансовый Магнат
    {
        id: "gold_spender",
        name: "Золотой Транжира", // "Щедрая Душа"
        icon: "💸",
        stat: 'totalGoldSpent', // Новый стат: общее кол-во потраченного золота
        category: "Финансовый Магнат",
        levels: [
            { level: 1, description: "Потратить 25,000 золота.", target: 25000, reward: { diamonds: 10 }, xpGain: 50 },
            { level: 2, description: "Потратить 150,000 золота.", target: 150000, reward: { diamonds: 50 }, xpGain: 150 },
            { level: 3, description: "Потратить 1,000,000 золота.", target: 1000000, reward: { diamonds: 100, rareChestKeys:1 }, xpGain: 300 },
            { level: 4, description: "Потратить 10,000,000 золота.", target: 10000000, reward: { diamonds: 250, epicChestKeys:1 }, xpGain: 700 },
            { level: 5, description: "Потратить 50,000,000 золота.", target: 50000000, reward: { diamonds: 500, epicChestKeys:2 }, xpGain: 1500 },
        ]
    },
    {
        id: "diamond_investor",
        name: "Алмазный Инвестор", // "Бриллиантовый Барон"
        icon: "💎✨",
        stat: 'totalDiamondsSpent', // Новый стат: общее кол-во потраченных алмазов
        category: "Финансовый Магнат",
        levels: [
            { level: 1, description: "Потратить 5,000 алмазов.", target: 5000, reward: { gold: 10000 }, xpGain: 100 },
            { level: 2, description: "Потратить 25,000 алмазов.", target: 25000, reward: { gold: 50000, rareChestKeys: 1 }, xpGain: 250 },
            { level: 3, description: "Потратить 125,000 алмазов.", target: 125000, reward: { gold: 200000, epicChestKeys: 1 }, xpGain: 500 },
            { level: 4, description: "Потратить 300,000 алмазов.", target: 300000, reward: { gold: 500000, epicChestKeys: 1, /* Special Item ID? */ }, xpGain: 1000 },
            { level: 5, description: "Потратить 500,000 алмазов.", target: 500000, reward: { gold: 1000000, epicChestKeys: 2, /* Another Special Item ID? */ }, xpGain: 2000 },
        ]
    },
    {
        id: "ton_shard_hoarder",
        name: "Коллекционер Осколков",
        icon: "💠", // Эмодзи, похожий на кристалл/осколок
        stat: 'totalTonShardsEarned', // Новый стат: общее кол-во заработанных осколков TON
        category: "Финансовый Магнат",
        levels: [
            { level: 1, description: "Получить 25 осколков Toncoin.", target: 25, reward: { gold: 500 }, xpGain: 50 },
            { level: 2, description: "Получить 300 осколков Toncoin.", target: 300, reward: { gold: 2500, diamonds: 10 }, xpGain: 150 },
            { level: 3, description: "Получить 1,500 осколков Toncoin.", target: 1500, reward: { gold: 10000, diamonds: 50 }, xpGain: 300 },
            { level: 4, description: "Получить 5,000 осколков Toncoin.", target: 5000, reward: { gold: 25000, diamonds: 100, rareChestKeys: 1 }, xpGain: 600 },
            { level: 5, description: "Получить 15,000 осколков Toncoin.", target: 15000, reward: { gold: 50000, diamonds: 200, epicChestKeys: 1 }, xpGain: 1200 },
        ]
    },
    {
        id: "ton_whale",
        name: "TON Кит",
        icon: "🐳",
        stat: 'totalTonWithdrawn', // Новый стат: общее кол-во выведенных TON (после обмена из осколков)
        category: "Финансовый Магнат",
        levels: [
            { level: 1, description: "Вывести 5 Toncoin.", target: 5, reward: { toncoinShards: 50 }, xpGain: 200 }, // Награда осколками за вывод :)
            { level: 2, description: "Вывести 25 Toncoin.", target: 25, reward: { toncoinShards: 250 }, xpGain: 400 },
            { level: 3, description: "Вывести 100 Toncoin.", target: 100, reward: { toncoinShards: 1000, diamonds: 100 }, xpGain: 800 },
            { level: 4, description: "Вывести 300 Toncoin.", target: 300, reward: { toncoinShards: 3000, diamonds: 250 }, xpGain: 1500 },
            { level: 5, description: "Вывести 500 Toncoin.", target: 500, reward: { toncoinShards: 5000, diamonds: 500 }, xpGain: 2500 },
        ]
    },
    
    // Категория: Воплощение Силы
    {
        id: "power_overwhelming",
        name: "Несокрушимая Мощь",
        icon: "🚀",
        stat: 'powerLevel', // Существующий стат
        category: "Воплощение Силы",
        levels: [
            { level: 1, description: "Достигнуть 50,000 Мощи.", target: 50000, reward: { gold: 10000, diamonds: 50 }, xpGain: 200 },
            { level: 2, description: "Достигнуть 250,000 Мощи.", target: 250000, reward: { gold: 25000, diamonds: 125, rareChestKeys: 1 }, xpGain: 500 },
            { level: 3, description: "Достигнуть 500,000 Мощи.", target: 500000, reward: { gold: 50000, diamonds: 250, epicChestKeys: 1 }, xpGain: 1000 },
            { level: 4, description: "Достигнуть 1,000,000 Мощи.", target: 1000000, reward: { gold: 100000, diamonds: 500, epicChestKeys: 1 }, xpGain: 2000 },
            { level: 5, description: "Достигнуть 2,500,000 Мощи.", target: 2500000, reward: { gold: 250000, diamonds: 1000, epicChestKeys: 2 }, xpGain: 4000 },
        ]
    },
];

export default achievements;