// src/components/CompactRecipeCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import './screens/Forge.scss';

const CompactRecipeCard = ({ recipe, onSelect }) => {
  if (!recipe || !recipe.outputItemData) {
    return null; // Не рендерим, если нет данных
  }

  return (
    <motion.button // Используем button для доступности и семантики
      className={`compact-recipe-card rarity-border-${recipe.outputItemData.rarity.toLowerCase()} ${!recipe.canCraft ? 'disabled' : ''}`}
      onClick={() => onSelect(recipe)}
      disabled={!recipe.canCraft} // Блокируем клик, если нельзя скрафтить
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
    >
      {/* Индикатор доступности крафта */}
      {recipe.canCraft && <span className="compact-craft-indicator">!</span>}

      {/* Иконка результата */}
      <div className={`recipe-item-display output compact rarity-${recipe.outputItemData.rarity.toLowerCase()}`}>
        <img
          src={recipe.outputItemData.image || '/assets/default-item.png'}
          alt={recipe.outputItemData.name}
          loading="lazy" // Ленивая загрузка для иконок в карусели
        />
        {/* Можно добавить Shimmer сюда, если он нужен в карусели */}
      </div>


    </motion.button>
  );
};

export default CompactRecipeCard;