// src/data/gearChestData.js

// Определяем данные для сундуков СНАРЯЖЕНИЯ
export const GEAR_CHESTS = [
    // --- 1. Сундук Common/Uncommon без гаранта ---
    {
      id: "gear_chest_basic", // Уникальный ID
      name: "Солдатский сундук", // Название
      description: "Простой сундук с базовой экипировкой для начинающих бойцов.", // Описание (опционально)
      icon: `/assets/chest-icon.png`, // <<< Замени на свой путь к иконке
      cost: { currency: 'gold', price: 0 }, // <<< Пример: цена в золоте
      possibleRarities: ["Common", "Uncommon"], // Какие редкости могут выпасть
      // Шансы выпадения для каждой редкости (сумма должна быть 1)
      rarityChances: {
        "Common": 0.75,   // 75% шанс на Common
        "Uncommon": 0.25, // 25% шанс на Uncommon
      },
      pity: null, // Гарант отсутствует
    },
  
    // --- 2. Сундук Common/Uncommon/Rare с гарантом Rare ---
    {
      id: "gear_chest_advanced",
      name: "Сундук оруженосца",
      description: "Содержит более качественную экипировку с шансом найти редкий предмет.",
      icon: `/assets/chest-icon.png`, // <<< Замени на свой путь к иконке
      cost: { currency: 'diamonds', price: 0 }, // <<< Пример: цена в алмазах
      possibleRarities: ["Common", "Uncommon", "Rare"],
      rarityChances: {
        "Common": 0.65,    // 65% шанс
        "Uncommon": 0.25,  // 25% шанс
        "Rare": 0.10,      // 10% шанс
      },
      // Гарант: Редкий предмет на 10-е открытие, если не выпал ранее
      pity: {
          rarity: "Rare", // Гарантируемая редкость
          limit: 10,      // Порог срабатывания
      },
    },
  
    // --- 3. Сундук Common/Uncommon/Rare/Legendary с двумя гарантами ---
    {
      id: "gear_chest_legendary",
      name: "Королевский сундук",
      description: "Хранит в себе мощное снаряжение, включая легендарные артефакты королевской гвардии.",
      icon: `/assets/chest-icon.png`, // <<< Замени на свой путь к иконке
      cost: { currency: 'diamonds', price: 0 }, // <<< Пример: более высокая цена в алмазах
      possibleRarities: ["Common", "Uncommon", "Rare", "Epic"],
      rarityChances: {
        "Common": 0.60,     // 60% шанс
        "Uncommon": 0.25,   // 25% шанс
        "Rare": 0.12,       // 12% шанс
        "Epic": 0.03,  // 3% шанс
      },
      // Несколько гарантов:
      pity: [
          // Гарант 1: Редкий на 10-е открытие (если не выпал Rare или Legendary)
          { rarity: "Rare", limit: 10 },
          // Гарант 2: Легендарный на 50-е открытие (если не выпал Legendary)
          { rarity: "Epic", limit: 50 }
      ],
    },
  ];
  
  // --- Хелпер для получения данных сундука снаряжения по ID ---
  // Создаем Map для быстрого доступа
  const GEAR_CHEST_MAP = new Map(GEAR_CHESTS.map(chest => [chest.id, chest]));
  
  export const getGearChestById = (id) => {
      return GEAR_CHEST_MAP.get(id);
  };