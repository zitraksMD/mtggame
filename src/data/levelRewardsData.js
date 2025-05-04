// src/data/levelRewardsData.js

// Определяем типы наград для ясности
export const RewardType = {
    GOLD: 'gold',
    DIAMONDS: 'diamonds',
    ITEM: 'item', // Обычный предмет из itemsDatabase
    SKIN: 'skin', // Особый тип для скинов/косметики
    // Можно добавить другие типы: XP_BOOST, ENERGY, etc.
  };
  
  // Описываем награды за каждый уровень
  const levelRewards = [
    {
      level: 2,
      levelIcon: '🏆', // Или путь к иконке '/assets/icons/ach-level-2.png'
      description: 'Небольшой бонус за первые успехи!',
      rewards: [
        { type: RewardType.DIAMONDS, amount: 25 },
      ],
    },
    {
      level: 3,
      levelIcon: '🏆',
      description: 'Продолжай в том же духе!',
      rewards: [
        { type: RewardType.GOLD, amount: 500 },
        { type: RewardType.DIAMONDS, amount: 50 },
      ],
    },
    {
      level: 4,
      levelIcon: '🌟', // Другая иконка
      description: 'Особая награда за упорство!',
      rewards: [
        { type: RewardType.GOLD, amount: 1000 },
        { type: RewardType.DIAMONDS, amount: 100 },
        // Пример награды предметом - нужен ID из itemsDatabase
        // { type: RewardType.ITEM, itemId: 'rare_amulet', quantity: 1 },
      ],
    },
    {
      level: 5,
      levelIcon: '🌟',
      description: 'Уникальный скин в награду!', // Пример описания для уровня 5
      rewards: [
        { type: RewardType.GOLD, amount: 2500 },
        { type: RewardType.DIAMONDS, amount: 250 },
        // Пример награды скином (ID скина может быть из другой базы или просто уникальной строкой)
        { type: RewardType.SKIN, skinId: 'unique_pickaxe_skin', name: 'Unique Pickaxe Skin' }, // Добавили name для отображения
      ],
    },
    {
      level: 6,
      levelIcon: '🌟',
      description: 'Уникальный скин в награду!', // Пример описания для уровня 5
      rewards: [
        { type: RewardType.GOLD, amount: 2500 },
        { type: RewardType.DIAMONDS, amount: 250 },
        // Пример награды скином (ID скина может быть из другой базы или просто уникальной строкой)
        { type: RewardType.SKIN, skinId: 'unique_pickaxe_skin', name: 'Unique Pickaxe Skin' }, // Добавили name для отображения
      ],
    },
    {
      level: 7,
      levelIcon: '🌟',
      description: 'Уникальный скин в награду!', // Пример описания для уровня 5
      rewards: [
        { type: RewardType.GOLD, amount: 2500 },
        { type: RewardType.DIAMONDS, amount: 250 },
        // Пример награды скином (ID скина может быть из другой базы или просто уникальной строкой)
        { type: RewardType.SKIN, skinId: 'unique_pickaxe_skin', name: 'Unique Pickaxe Skin' }, // Добавили name для отображения
      ],
    },
    {
      level: 8,
      levelIcon: '🌟',
      description: 'Уникальный скин в награду!', // Пример описания для уровня 5
      rewards: [
        { type: RewardType.GOLD, amount: 2500 },
        { type: RewardType.DIAMONDS, amount: 250 },
        // Пример награды скином (ID скина может быть из другой базы или просто уникальной строкой)
        { type: RewardType.SKIN, skinId: 'unique_pickaxe_skin', name: 'Unique Pickaxe Skin' }, // Добавили name для отображения
      ],
    },
    {
      level: 9,
      levelIcon: '🌟',
      description: 'Уникальный скин в награду!', // Пример описания для уровня 5
      rewards: [
        { type: RewardType.GOLD, amount: 2500 },
        { type: RewardType.DIAMONDS, amount: 250 },
        // Пример награды скином (ID скина может быть из другой базы или просто уникальной строкой)
        { type: RewardType.SKIN, skinId: 'unique_pickaxe_skin', name: 'Unique Pickaxe Skin' }, // Добавили name для отображения
      ],
    },
    // Добавляй сюда награды для следующих уровней
  ];
  
  export default levelRewards;
  
  // Вспомогательная функция для получения данных предмета/скина (если нужно)
  // Импортируй itemsDatabase, если награды-предметы будут использоваться
  // import itemsDatabase from './itemsDatabase';
  export const getRewardDetails = (reward) => {
      if (reward.type === RewardType.ITEM) {
          // const item = itemsDatabase.find(i => i.id === reward.itemId);
          // return item ? { name: item.name, image: item.image } : { name: 'Неизвестный предмет' };
          return { name: `Предмет: ${reward.itemId}`, image: '/assets/icons/default_item.png' }; // Заглушка
      }
      if (reward.type === RewardType.SKIN) {
          // Логика получения данных скина (имя, иконка)
          return { name: reward.name || `Скин: ${reward.skinId}`, image: '/assets/icons/default_skin.png' }; // Заглушка
      }
      return null; // Для золота и алмазов детали не нужны, отображаем amount
  };