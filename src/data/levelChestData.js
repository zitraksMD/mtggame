// src/data/levelChestData.js

// Описание типов сундуков, которые могут встречаться на уровнях
export const LEVEL_CHEST_TYPES = {
    "standard_wood": { // ID типа сундука
      id: "standard_wood",
      name: "Деревянный сундук",       // Название для UI
      modelPath: "/models/chests/chest_wood.glb", // Путь к 3D модели (замени на свой)
      // Таблица лута для этого типа сундука
      lootTable: {
        // Гарантированные награды (валюта)
        guaranteed: [
          { type: "gold", min: 50, max: 100 },     // Золото от 50 до 100
          { type: "diamonds", min: 10, max: 30 }, // Алмазы от 10 до 30
        ],
        // Шанс и параметры выпадения предмета снаряжения
        itemDrop: {
          chance: 1.0, // 100% шанс получить 1 предмет
          rarityChances: { // Шансы редкости (сумма должна быть 100 или использоваться как веса)
               Common: 60,
               Uncommon: 30,
               Rare: 10
              // Epic: 0, Mythic: 0 - здесь не падают
           }
        }
      }
    },
    "boss_gold": {
      id: "boss_gold",
      name: "Золотой сундук босса",
      modelPath: "/models/chests/chest_gold.glb", // Путь к модели золотого сундука
      lootTable: {
        guaranteed: [
          { type: "gold", min: 200, max: 400 },    // Больше золота
          { type: "diamonds", min: 30, max: 50 }, // Больше алмазов
        ],
        itemDrop: {
          chance: 1.0, // 100% шанс на предмет
          rarityChances: { // Другие шансы редкости
               Common: 50,
               Uncommon: 25,
               Rare: 20,
               Epic: 5 // Добавлен шанс на Epic
              // Mythic: 0
           }
        }
      }
    },
    // Можешь добавить другие типы сундуков здесь
  };
  
  // Хелпер для получения данных сундука по ID его типа
  export const getLevelChestTypeById = (id) => LEVEL_CHEST_TYPES[id];