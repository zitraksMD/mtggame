// src/data/shopData.js

/**
 * Массив предложений для ежедневного магазина.
 * Каждый объект представляет одно предложение.
 */
export const dailyShopDeals = [
    {
      id: "daily_deal_1", // Уникальный ID сделки
      type: "item", // Тип: предмет снаряжения
      itemId: "common-worn-boots", // ID предмета из itemsDatabase.js
      quantity: 1, // Количество
      currency: "gold", // Валюта
      price: 450,       // Цена
      rarity: "Common",  // Редкость для отображения
      discount: 10,     // Скидка в % (0 если нет)
      purchaseLimit: 1, // Сколько раз можно купить (опционально)
    },
    {
      id: "daily_deal_2",
      type: "artifact_shard", // Тип: осколок артефакта
      itemId: "art_helm_valor", // ID артефакта из artifactsData.js (он Rare, но для примера пока так)
                                 // <<< Замени на ID Common/Uncommon артефакта!
      quantity: 5,          // Количество осколков
      currency: "gold",
      price: 1200,
      rarity: "Rare",       // Редкость самого артефакта
      discount: 0,
      purchaseLimit: 1,
    },
    {
      id: "daily_deal_3",
      type: "item",
      itemId: "uncommon-hunters-bow",
      quantity: 1,
      currency: "diamonds", // Продаем за алмазы
      price: 40,
      rarity: "Uncommon",
      discount: 20,
      purchaseLimit: 1,
    },
    {
      id: "daily_deal_4",
      type: "item",
      itemId: "common-simple-pendant",
      quantity: 1,
      currency: "gold",
      price: 300,
      rarity: "Common",
      discount: 0,
      purchaseLimit: 1,
    },
    {
      id: "daily_deal_5",
      type: "artifact_shard",
      itemId: "art_orb_elements", // ID артефакта (Rare, замени на Common/Uncommon!)
      quantity: 3,
      currency: "diamonds",
      price: 25,
      rarity: "Rare",
      discount: 0,
      purchaseLimit: 1,
    },
    {
      id: "daily_deal_6",
      type: "item",
      itemId: "uncommon-studded-cap",
      quantity: 1,
      currency: "gold",
      price: 2800,
      rarity: "Uncommon",
      discount: 15,
      purchaseLimit: 1,
    },
  ];
  
  // Можно добавить и другие экспорты, если нужны (например, время до обновления и т.д.)
  // export const DAILY_SHOP_REFRESH_TIME = 24 * 60 * 60 * 1000; // 24 часа в мс