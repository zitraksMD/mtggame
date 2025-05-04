// itemSets.js

export const ITEM_SETS = [
    {
      id: "tide_set",
      name: "Сет Прилива",
      rarity: "Legendary",
      itemIds: [
          "legendary-bow-tide", "legendary-helm-tide", "legendary-armor-tide",
          "legendary-boots-tide", "legendary-ring-tide", "legendary-amulet-tide",
      ],
      bonuses: [
        // --- ИЗМЕНЕНО: Конкретные бонусы к статам ---
        { requiredCount: 2, description: "+15% HP" }, // Пример: +% ХП
        { requiredCount: 4, description: "+10% Attack Speed" }, // Пример: +% Скор. Атаки
        { requiredCount: 6, description: "+10% Double Strike Chance" }, // Пример: +% Двойного удара
      ]
    },
    {
      id: "celestial_hunter_set",
      name: "Сет Небесного Охотника",
      rarity: "Mythic",
      itemIds: [
          "mythic-crossbow-celestial", "mythic-helm-celestial", "mythic-armor-celestial",
          "mythic-boots-celestial", "mythic-ring-celestial", "mythic-amulet-celestial",
      ],
      bonuses: [
        // --- ИЗМЕНЕНО: Конкретные бонусы к статам ---
        { requiredCount: 2, description: "+10% Crit Chance" }, // Пример: +% Крит. Шанса
        { requiredCount: 4, description: "+15% Attack" }, // Пример: +% Атаки
        { requiredCount: 6, description: "+12% Attack Speed, +8% Crit Chance" }, // Пример: Комбинированный бонус
      ]
    },
  ];
  
  // Хелпер для получения данных сета по ID (без изменений)
  const ITEM_SET_MAP = new Map(ITEM_SETS.map(set => [set.id, set]));
  export const getItemSetById = (setId) => ITEM_SET_MAP.get(setId);