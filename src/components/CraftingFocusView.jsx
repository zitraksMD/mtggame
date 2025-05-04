// src/components/CraftingFocusView.jsx
import React from 'react';
import { motion } from 'framer-motion';
import './Forge.scss'; // Используем те же стили

// Анимации для этой секции
const focusViewVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 50 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
        type: "spring",
        damping: 15,
        stiffness: 150,
        when: "beforeChildren", // Анимация дочерних после родителя
        staggerChildren: 0.1 // Задержка для дочерних
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 30,
    transition: { duration: 0.2 }
   }
};

const itemVariants = { // Анимация для элементов внутри
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};


const CraftingFocusView = ({ recipe, onForge, onClose }) => {
  if (!recipe || !recipe.outputItemData || !recipe.inputItemsData) {
    return null;
  }

  const inputDisplayData = recipe.inputItemsData[0]; // Предполагаем один тип входа

  return (
    <motion.div
      className="crafting-focus-view"
      variants={focusViewVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Можно добавить полупрозрачный фон для затемнения */}
      {/* <div className="focus-overlay" onClick={onClose}></div> */}

      {/* Кнопка закрытия */}
      <motion.button variants={itemVariants} className="close-focus-view" onClick={onClose}>✕</motion.button>

      {/* Основная область крафта (условный треугольник/звезда) */}
      <motion.div variants={itemVariants} className="crafting-area">

        {/* 1. Центральный элемент - РЕЗУЛЬТАТ */}
        <motion.div variants={itemVariants} className="output-item-focus">
          {/* Иконка результата */}
          <div className={`recipe-item-display output focus rarity-${recipe.outputItemData.rarity.toLowerCase()}`}>
            <img
              src={recipe.outputItemData.image || '/assets/default-item.png'}
              alt={recipe.outputItemData.name}
            />
            {/* Здесь тоже можно добавить Shimmer, если он нужен именно тут */}
          </div>
          {/* Название результата */}
          <h3 className={`output-name-focus rarity-text-${recipe.outputItemData.rarity.toLowerCase()}`}>
            {recipe.outputItemData.name}
          </h3>
        </motion.div>

        {/* 2. Элементы по бокам - ИНГРЕДИЕНТЫ */}
        {/* Позиционируем абсолютно или через flex/grid с transform */}
        {inputDisplayData && Array.from({ length: inputDisplayData.quantity }).map((_, index) => {
           const isAvailable = inputDisplayData.ownedCount > index;
           // Определяем позицию для треугольника (примерные значения)
           let style = {};
           if(inputDisplayData.quantity === 3) { // Только для 3х ингредиентов
                if(index === 0) style = { top: '75%', left: '50%', transform: 'translate(-50%, -50%) rotate(0deg)'};      // Нижний
                if(index === 1) style = { top: '10%', left: '10%', transform: 'translate(0, 0) rotate(-15deg)' }; // Верхний левый
                if(index === 2) style = { top: '10%', right: '10%', transform: 'translate(0, 0) rotate(15deg)' }; // Верхний правый
           } else { // Если не 3, просто располагаем рядом
                style = { position: 'relative', top: 'auto', left: 'auto', right: 'auto', transform: 'none' };
           }

           return (
                <motion.div
                    key={index}
                    variants={itemVariants}
                    className={`input-item-focus input-${index + 1}`} // Для возможной разной стилизации/позиционирования
                    style={style} // Применяем позицию
                >
                    <div className={`recipe-item-display input focus rarity-${inputDisplayData.rarity?.toLowerCase()} ${!isAvailable ? 'dimmed' : ''}`}>
                        <img
                            src={inputDisplayData.data?.image || '/assets/default-item.png'}
                            alt={inputDisplayData.data?.name}
                        />
                    </div>
                </motion.div>
            );
        })}
        {/* Текст с количеством ингредиентов можно вынести отдельно */}
        {inputDisplayData && (
             <motion.div variants={itemVariants} className="input-info-focus">
                 Необходимо: <span className={`recipe-item-owned ${recipe.canCraft ? 'enough' : 'not-enough'}`}>
                     {inputDisplayData.ownedCount} / {inputDisplayData.quantity}
                 </span> {inputDisplayData.data?.name}
             </motion.div>
        )}


        {/* 3. Стоимость */}
        <motion.div variants={itemVariants} className="cost-focus">
          {recipe.cost.gold > 0 && <span><img src="/assets/coin-icon.png" alt="gold"/> {recipe.cost.gold.toLocaleString()}</span>}
          {recipe.cost.diamonds > 0 && <span><img src="/assets/diamond-image.png" alt="diamond"/> {recipe.cost.diamonds.toLocaleString()}</span>}
        </motion.div>

        {/* 4. Кнопка крафта */}
        <motion.div variants={itemVariants} className="action-focus">
          <button
            className="forge-button focus-button"
            onClick={() => onForge(recipe)}
            disabled={!recipe.canCraft}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Создать! {/* Или Улучшить */}
          </button>
        </motion.div>

      </motion.div> {/* Конец .crafting-area */}
    </motion.div> // Конец .crafting-focus-view
  );
};

export default CraftingFocusView;