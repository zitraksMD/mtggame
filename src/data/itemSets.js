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
          { requiredCount: 2, description: "+15% HP", powerLevelBonus: 0.02 }, // +2% PL за 2 предмета
          { requiredCount: 4, description: "+10% Attack Speed", powerLevelBonus: 0.04 }, // +4% PL за 4 предмета
          { requiredCount: 6, description: "+10% Double Strike Chance", powerLevelBonus: 0.06 }, // +6% PL за 6 предметов
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
          { requiredCount: 2, description: "+10% Crit Chance", powerLevelBonus: 0.03 }, // +3% PL за 2 предмета
          { requiredCount: 4, description: "+15% Attack", powerLevelBonus: 0.05 }, // +5% PL за 4 предмета
          { requiredCount: 6, description: "+12% Attack Speed, +8% Crit Chance", powerLevelBonus: 0.08 }, // +8% PL за 6 предметов
      ]
  },
];

// Хелпер для получения данных сета по ID (без изменений)
const ITEM_SET_MAP = new Map(ITEM_SETS.map(set => [set.id, set]));
export const getItemSetById = (setId) => ITEM_SET_MAP.get(setId);