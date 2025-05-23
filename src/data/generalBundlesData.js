// src/data/generalBundlesData.js

export const GENERAL_BUNDLES = [
    {
        id: 'bundle_gold_small',
        name: 'Кошель Золота',
        description: 'Небольшой запас золота для повседневных нужд.',
        icon: '/assets/bundles/gold_coins_bundle.png', // <<< Укажите ваш путь
        rarity: 'common',
        price: 100, // Цена в алмазах
        currency: 'diamonds',
        priceDisplay: '100💎', // Отображаемая цена
        contents: ['Золото x10,000'],
        isActive: true,
    },
    {
        id: 'bundle_diamonds_starter',
        name: 'Стартовые Алмазы',
        description: 'Небольшое количество алмазов для начала.',
        icon: '/assets/bundles/diamonds_bundle.png', // <<< Укажите ваш путь
        rarity: 'common',
        price: 1.99, // Цена в реальной валюте
        currency: 'USD', // или 'RUB', 'EUR' и т.д.
        priceDisplay: '$1.99',
        contents: ['Алмазы x200'],
        isActive: true,
    },
    {
        id: 'bundle_gear_keys_pack',
        name: 'Связка Ключей Снаряжения',
        description: 'Откройте больше сундуков со снаряжением!',
        icon: '/assets/bundles/gear_keys_bundle.png', // <<< Укажите ваш путь
        rarity: 'uncommon',
        price: 250,
        currency: 'diamonds',
        priceDisplay: '250💎',
        contents: ['Редкий ключ снаряжения x3', 'Обычный ключ снаряжения x5'],
        isActive: true,
    },
    {
        id: 'bundle_artifact_boost',
        name: 'Ускорение Артефактов',
        description: 'Получите осколки для улучшения ваших артефактов.',
        icon: '/assets/bundles/artifact_shards_bundle.png', // <<< Укажите ваш путь
        rarity: 'rare',
        price: 4.99,
        currency: 'USD',
        priceDisplay: '$4.99',
        discount: 20,
        contents: ['Осколки артефакта (Случайные) x500', 'Алмазы x100'],
        isActive: true,
    },
    {
        id: 'bundle_warriors_stash',
        name: 'Запас Воителя',
        description: 'Все необходимое для усиления вашего героя.',
        icon: '/assets/bundles/warrior_stash_bundle.png', // <<< Укажите ваш путь
        rarity: 'epic',
        price: 9.99,
        currency: 'USD',
        priceDisplay: '$9.99',
        discount: 30,
        contents: [
            'Золото x250,000',
            'Алмазы x1200',
            'Эпический ключ снаряжения x2',
            'Редкий ключ артефактов x1'
        ],
        isActive: true,
    },
    {
        id: 'bundle_value_pack_monthly', // Пример ежемесячного или еженедельного набора
        name: 'Выгодный Набор Месяца',
        description: 'Лучшее предложение этого месяца!',
        icon: '/assets/bundles/value_pack_bundle.png', // <<< Укажите ваш путь
        rarity: 'legendary',
        price: 19.99,
        currency: 'USD',
        priceDisplay: '$19.99',
        discount: 50,
        contents: [
            'Алмазы x5,000',
            'Золото x1,000,000',
            'Легендарный ключ (Любой) x1',
            'Осколки артефакта (Случайные) x1000'
        ],
        // availabilityCondition: { type: 'monthlyOffer', month: 'current' }, // Пример для более сложной логики доступности
        purchaseLimit: 1, // Например, можно купить только раз в месяц
        isActive: true,
    }
];

// Хелпер для получения обычного бандла по ID (опционально)
const GENERAL_BUNDLES_MAP = new Map(GENERAL_BUNDLES.map(deal => [deal.id, deal]));
export const getGeneralBundleById = (id) => GENERAL_BUNDLES_MAP.get(id);