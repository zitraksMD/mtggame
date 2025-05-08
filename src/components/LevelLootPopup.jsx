// src/components/LevelLootPopup.jsx
import React, { useRef, forwardRef } from 'react'; // Импортируем forwardRef
import './LevelLootPopup.scss'; // Подключим стили

// Примерная функция для получения иконки награды (доработай пути!)
const getRewardIcon = (reward) => {
  if (!reward) return '/assets/icons/unknown.png'; // На случай ошибки
  switch (reward.type) {
    case 'gold': return '/assets/coin-icon.png'; // Укажи свои пути
    case 'diamonds': return '/assets/diamond-image.png'; // Укажи свои пути
    case 'item': return reward.icon || '/assets/icons/item_default.png'; // Берем иконку из данных предмета или дефолтную
    default: return '/assets/icons/unknown.png';
  }
};

// Примерные цвета для редкости (можешь взять из своей базы)
const rarityColors = {
  Common: '#ffffff',      // Белый
  Uncommon: '#6eff54',    // Зеленый
  Rare: '#54b4ff',        // Синий
  Epic: '#d454ff',        // Фиолетовый
  Legendary: '#ffc854',   // Оранжевый
  Mythic: '#ff5454',       // Красный
};

// Компонент использует forwardRef для работы с CSSTransition
const LevelLootPopup = forwardRef(({ rewards }, ref) => {
    if (!rewards || rewards.length === 0) {
      return null;
    }
  
    // --- Разделяем награды по типу ---
    const goldReward = rewards.find(r => r.type === 'gold');
    const diamondReward = rewards.find(r => r.type === 'diamonds');
    const itemReward = rewards.find(r => r.type === 'item');
    // --------------------------------
  
    return (
      <div ref={ref} className="level-loot-popup-overlay">
        <div className="level-loot-popup-content">
          <h4>Добыча!</h4> {/* Заголовок */}
  
          {/* --- Блок для валюты --- */}
          {(goldReward || diamondReward) && ( // Показываем блок, только если есть золото или алмазы
            <div className="currency-rewards">
              {/* Золото */}
              {goldReward && (
                <div className="currency-item">
                  <img src={getRewardIcon(goldReward)} alt="Золото" className="reward-icon" />
                  <span>x{goldReward.amount}</span>
                </div>
              )}
              {/* Алмазы */}
              {diamondReward && (
                <div className="currency-item">
                  <img src={getRewardIcon(diamondReward)} alt="Алмазы" className="reward-icon" />
                  <span>x{diamondReward.amount}</span>
                </div>
              )}
            </div>
          )}
          {/* --- Конец блока валюты --- */}
  
  
 {/* === ИЗМЕНЕННЫЙ Блок для предмета === */}
 {itemReward && (
          <div className="item-reward-section">
            <p className="item-received-text">Получен предмет:</p>
            {/* Новый контейнер для иконки и текста под ней */}
            <div className="item-display">
              {/* Иконка предмета (можно сделать ее побольше) */}
              <img
                src={getRewardIcon(itemReward)}
                alt={itemReward.name}
                className="reward-icon item-icon-large" // Добавляем класс для размера
              />
              {/* Блок текста под иконкой */}
              <div className="item-text-block">
                {/* Название предмета */}
                <span className={`reward-text rarity-${itemReward.rarity?.toLowerCase() || 'common'}`}>
                  {itemReward.name || 'Предмет'}
                </span>
                {/* Редкость предмета (рядом с названием) */}
                {itemReward.rarity && (
                  <span className="reward-rarity" style={{ color: rarityColors[itemReward.rarity] || '#ffffff' }}>
                    {` (${itemReward.rarity})`}
                  </span>
                )}
              </div>
            </div> {/* Конец item-display */}
          </div> // Конец item-reward-section
        )}
        {/* === Конец измененного блока для предмета === */}
  
        </div>
      </div>
    );
  });
  
  LevelLootPopup.displayName = 'LevelLootPopup';
  export default LevelLootPopup;