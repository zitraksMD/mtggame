// src/data/generalBundlesData.js

export const GENERAL_BUNDLES = [
  {
    id: 'bundle_double_find', // Уникальный идентификатор
    name: 'Двойная Находка', // Предложенное название для "Мешок золота + Мешок алмазов"
    description: 'Щедрый запас золота и алмазов для ваших приключений.',
    icon: '/assets/bundles/bundle_gold_diamonds.png', // <<< Укажите актуальный путь к иконке
    rarity: 'uncommon', // Редкость набора
    price: 4.99, // Цена в реальной валюте
    currency: 'USD', // Тип валюты
    priceDisplay: '$4.99', // Отображаемая цена для UI
    contents: [ // Содержимое набора
      'Золото x10,000',
      'Алмазы x1,000'
    ],
    isActive: true, // Активен ли набор в магазине
    // discount: 10, // Опционально: процент скидки, если есть
    // purchaseLimit: 1, // Опционально: лимит покупок на пользователя
  },
  {
    id: 'bundle_gold_cart',
    name: 'Тележка Золота',
    description: 'Внушительный воз золотых монет для любых трат.',
    icon: '/assets/bundles/bundle_cart_gold.png', // <<< Укажите актуальный путь к иконке
    rarity: 'rare',
    price: 7.99,
    currency: 'USD',
    priceDisplay: '$7.99',
    contents: [
      'Золото x100,000'
    ],
    isActive: true,
  },
  {
    id: 'bundle_diamonds_treasure',
    name: 'Бриллиантовая Россыпь', // Предложенное название для "Тележка алмазов"
    description: 'Сияющее изобилие алмазов для самых амбициозных планов.',
    icon: '/assets/bundles/bundle_cart_diamonds.png', // <<< Укажите актуальный путь к иконке
    rarity: 'rare', // или 'epic', в зависимости от ценности в вашей экономике
    price: 14.99,
    currency: 'USD',
    priceDisplay: '$14.99',
    contents: [
      'Алмазы x10,000'
    ],
    isActive: true,
  },
  {
    id: 'bundle_epic_artifact_summon',
    name: 'Эпический Призыв', // Предложенное название для "Алмазы + Рандомный эпик артефакт"
    description: 'Гарантированный эпический артефакт и запас алмазов для его усиления.',
    icon: '/assets/bundles/bundle_epic_artifact.png', // <<< Укажите актуальный путь к иконке
    rarity: 'epic',
    price: 19.99,
    currency: 'USD',
    priceDisplay: '$19.99',
    contents: [
      'Алмазы x5,000',
      'Случайный Эпический Артефакт x1'
    ],
    isActive: true,
  },
  {
    id: 'bundle_legendary_artifact_gift',
    name: 'Легендарный Дар', // Предложенное название для "Алмазы + Рандомный легендарный артефакт"
    description: 'Станьте обладателем легендарного артефакта и значительного количества алмазов.',
    icon: '/assets/bundles/bundle_legendary_artifact.png', // <<< Укажите актуальный путь к иконке
    rarity: 'legendary',
    price: 39.99,
    currency: 'USD',
    priceDisplay: '$39.99',
    contents: [
      'Алмазы x10,000',
      'Случайный Легендарный Артефакт x1'
    ],
    isActive: true,
  },
  {
    id: 'bundle_mythic_artifact_blessing',
    name: 'Мифическое Благословение', // Предложенное название для "Алмазы + Рандомный мифический артефакт"
    description: 'Прикоснитесь к мифической силе с этим эксклюзивным набором!',
    icon: '/assets/bundles/bundle_mythic_artifact.png', // <<< Укажите актуальный путь к иконке
    rarity: 'mythic',
    price: 59.99,
    currency: 'USD',
    priceDisplay: '$59.99',
    contents: [
      'Алмазы x12,500',
      'Случайный Мифический Артефакт x1'
    ],
    isActive: true,
  }
];

// Хелпер для получения обычного бандла по ID (остается полезным)
const GENERAL_BUNDLES_MAP = new Map(GENERAL_BUNDLES.map(bundle => [bundle.id, bundle]));
export const getGeneralBundleById = (id) => GENERAL_BUNDLES_MAP.get(id);