// src/data/specialDealsData.js

export const SPECIAL_DEALS = [
    {
        id: 'special_welcome_pack',
        name: 'Приветственный Набор',
        description: 'Мощный старт для новых героев! Огромная выгода!',
        icon: '/assets/bundles/welcome_pack_icon.png', // <<< Укажите ваш путь
        rarity: 'epic',
        price: 0.99,
        currency: 'USDT',
        priceDisplay: '0.99 USDT',
        discount: 90,
        contents: [
            'Золото x50,000',
            'Алмазы x250',
            'Редкий ключ снаряжения x3'
        ],
        availabilityCondition: { type: 'firstLogin' },
        purchaseLimit: 1,
        isActive: true,
    },
    // --- ПРИМЕРЫ БАНДЛОВ ЗА УРОВНИ ---
    {
        id: 'special_c1_lvl5_normal', // Глава 1, Уровень 5, Нормальная сложность
        name: 'Поддержка на полпути (Глава 1)',
        description: 'Отлично идешь! Небольшой бонус за достижение 5-го уровня первой главы.',
        icon: '/assets/bundles/c1_lvl5_pack_icon.png', // <<< Укажите ваш путь
        rarity: 'uncommon',
        price: 0.49,
        currency: 'USDT',
        priceDisplay: '0.49 USDT',
        discount: 60,
        contents: [
            'Золото x15,000',
            'Малый эликсир выносливости x2'
        ],
        // Новое условие доступности:
        availabilityCondition: { 
            type: 'levelComplete', 
            chapterId: 'chapter_1', // ID главы (должен совпадать с тем, как вы их храните)
            levelNumber: 5,         // Номер пройденного уровня (1-10)
            difficulty: 'normal'    // Сложность
        },
        purchaseLimit: 1,
        isActive: true,
    },
    // --- КОНЕЦ ПРИМЕРОВ ЗА УРОВНИ ---
    {
        id: 'special_chapter1_normal_complete',
        name: 'Награда за Главу 1',
        description: 'Отличная работа! Примите эту награду за прохождение Главы 1.',
        icon: '/assets/bundles/chapter_1_pack_icon.png',
        rarity: 'rare',
        price: 1.99,
        currency: 'USDT',
        priceDisplay: '1.99 USDT',
        discount: 75,
        contents: [
            'Алмазы x500',
            'Эпический ключ снаряжения x1',
            'Осколки артефакта (Случайные) x100'
        ],
        availabilityCondition: { type: 'chapterComplete', chapterId: 'chapter_1', difficulty: 'normal' },
        purchaseLimit: 1,
        isActive: true,
    },
    // --- ЕЩЕ ПРИМЕР БАНДЛА ЗА УРОВЕНЬ ---
    {
        id: 'special_c2_lvl3_normal', // Глава 2, Уровень 3, Нормальная сложность
        name: 'Ранний успех (Глава 2)',
        description: 'Так держать! Бонус за достижение 3-го уровня второй главы.',
        icon: '/assets/bundles/c2_lvl3_pack_icon.png', // <<< Укажите ваш путь
        rarity: 'uncommon',
        price: 0.99,
        currency: 'USDC',
        priceDisplay: '0.99 USDC',
        discount: 50,
        contents: [
            'Алмазы x150',
            'Обычный ключ снаряжения x5'
        ],
        availabilityCondition: { 
            type: 'levelComplete', 
            chapterId: 'chapter_2', 
            levelNumber: 3, 
            difficulty: 'normal' 
        },
        purchaseLimit: 1,
        isActive: true,
    },
    // --- КОНЕЦ ПРИМЕРА ---
    {
        id: 'special_chapter2_normal_complete',
        name: 'Триумф Главы 2',
        description: 'Вы одолели все испытания Главы 2! Заслуженная награда!',
        icon: '/assets/bundles/chapter_2_pack_icon.png',
        rarity: 'epic',
        price: 2.99,
        currency: 'USDC',
        priceDisplay: '2.99 USDC',
        discount: 70,
        contents: [
            'Золото x100,000',
            'Алмазы x750',
            'Легендарный ключ артефактов x1'
        ],
        availabilityCondition: { type: 'chapterComplete', chapterId: 'chapter_2', difficulty: 'normal' },
        purchaseLimit: 1,
        isActive: true,
    },
    // ... Добавьте больше бандлов за прохождение других глав и уровней ...
];

// Хелпер для получения специального предложения по ID (опционально, если нужно)
const SPECIAL_DEALS_MAP = new Map(SPECIAL_DEALS.map(deal => [deal.id, deal]));
export const getSpecialDealById = (id) => SPECIAL_DEALS_MAP.get(id);