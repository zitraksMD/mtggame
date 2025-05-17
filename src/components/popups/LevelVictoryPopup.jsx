// src/components/LevelVictoryPopup.jsx
import React, { useState, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './LevelVictoryPopup.scss';

// 1. Импорт для ОСНОВНЫХ ДАННЫХ ПРЕДМЕТА (из код 1)
// Укажите ПРАВИЛЬНЫЙ путь к вашему файлу itemsDatabase.js
// Например: import { getItemById } from '../data/itemsDatabase';
import { getItemById } from '../../data/itemsDatabase.js'; // Используем путь как в код 1, при необходимости скорректируйте

// 2. Импорт для ДАННЫХ О СЕТАХ ПРЕДМЕТОВ (из код 1)
// Укажите ПРАВИЛЬНЫЙ путь к вашему файлу с данными о сетах
// Например: import { getItemSetById as getSetDataFromDB } from '../data/itemSets';
import { getItemSetById as getSetDataFromDB } from '../../data/itemSets.js'; // Используем путь и имя файла как в код 1, при необходимости скорректируйте

// --- ХЕЛПЕРЫ И АНИМАЦИИ ---

const popupOverlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};
const popupContentVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 50 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 20, stiffness: 280, delay: 0.1 }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 30,
    transition: { duration: 0.15, ease: 'easeOut' }
  }
};

const formatStatValue = (key, value) => {
  const percentStats = ['attackSpeedBonus', 'critChanceBonus', 'doubleStrikeChanceBonus', 'critDamageBonus'];
  if (percentStats.includes(key) && typeof value === 'number') {
    return `${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }
  return typeof value === 'number' ? value.toLocaleString() : value;
};

const statNames = {
  hpBonus: "Здоровье",
  attackBonus: "Атака",
  defenseBonus: "Защита",
  attackSpeedBonus: "Скор. Атаки",
  critChanceBonus: "Шанс Крита",
  critDamageBonus: "Крит. Урон",
  doubleStrikeChanceBonus: "Двойная Атака",
  moveSpeedBonus: "Скор. Движ.",
  // Добавьте другие статы, если необходимо
};

const getRewardIcon = (reward) => {
    if (!reward) return '/assets/icons/unknown.png';
    if (reward.type === 'gold') return '/assets/coin-icon.png';
    if (reward.type === 'diamonds') return '/assets/diamond-image.png';
  
    if (reward.image) { // Сначала проверяем image (как в itemsDatabase)
      return reward.image;
    }
    if (reward.icon) { // Затем проверяем icon (если rewards.items использует его)
      return reward.icon;
    }
    return '/assets/icons/item_default.png';
  };

const rarityColors = {
  common: '#808080',
  uncommon: '#2ECC71',
  rare: '#3498DB',
  epic: '#9B59B6',
  legendary: '#F39C12',
  mythic: '#FF0000',
  default: '#444444'
};

const LevelVictoryPopup = forwardRef(
  ({ levelId, difficulty, rewards, onGoToMenu }, ref) => {
    const goldCollected = rewards?.gold || 0;
    const diamondsCollected = rewards?.diamonds || 0;
    const itemsCollected = rewards?.items || [];

    const [selectedItemId, setSelectedItemId] = useState(null);
    const [itemDataForTooltip, setItemDataForTooltip] = useState(null);

    const handleItemClick = (itemFromGrid, event) => {
      event.stopPropagation();
      setSelectedItemId(prevId => (prevId === itemFromGrid.id ? null : itemFromGrid.id));
    };

    // Загружаем полные данные, когда selectedItemId меняется (логика из код 1)
    useEffect(() => {
      if (selectedItemId) {
        const fullItemData = getItemById(selectedItemId); // Используем импортированную getItemById
        if (fullItemData) {
          setItemDataForTooltip(fullItemData);
        } else {
          console.error(`Item with ID "${selectedItemId}" not found in itemsDatabase.`);
          setItemDataForTooltip(null);
        }
      } else {
        setItemDataForTooltip(null);
      }
    }, [selectedItemId]);

    const handleCloseTooltipOverlay = (event) => {
      if (event.target === event.currentTarget) {
        setSelectedItemId(null);
      }
    };

    let displayLevelText = `Уровень ${levelId || '??'}`;
    if (typeof levelId === 'number' && levelId >= 100) {
      try {
        const chapter = Math.floor(levelId / 100);
        const level = levelId % 100;
        displayLevelText = `Ур. ${chapter}-${String(level).padStart(2, '0')}`;
      } catch (e) { console.error("Ошибка форматирования levelId:", levelId, e); }
    }
    const displayDifficulty = difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1) : 'Normal';

    let tooltipRarity = 'common';
    let tooltipRarityClass = 'rarity-common';
    let tooltipRarityTextClass = 'rarity-text-common';
    let tooltipInitialStats = [];
    let tooltipSetInfo = null;

    if (itemDataForTooltip) {
      tooltipRarity = itemDataForTooltip.rarity?.toLowerCase().replace('+', '') || 'common';
      tooltipRarityClass = `rarity-${tooltipRarity}`;
      tooltipRarityTextClass = `rarity-text-${tooltipRarity}`;

      tooltipInitialStats = Object.entries(statNames)
        .map(([key, name]) => {
          const value = itemDataForTooltip[key];
          if (value !== undefined && value !== null && (typeof value === 'string' || value !== 0)) {
            const sign = typeof value === 'number' && value > 0 && !['attackSpeedBonus', 'critChanceBonus', 'doubleStrikeChanceBonus', 'critDamageBonus'].includes(key) ? '+' : '';
            return { name, value: `${sign}${formatStatValue(key, value)}` };
          }
          return null;
        })
        .filter(Boolean);

      if (itemDataForTooltip.setId) {
        // Используем импортированную функцию для сетов (getSetDataFromDB из itemSets.js)
        tooltipSetInfo = getSetDataFromDB(itemDataForTooltip.setId);
      }
    }
    console.log("Items for grid (itemsCollected):", itemsCollected);

    return (
        
<>
        {/* Основной попап победы */}
        <div className="level-victory-overlay" ref={ref}>
          <div
            className="level-victory-content" // Убрали динамический класс редкости
            onClick={(e) => e.stopPropagation()}
          >
            {/* --- НАВИСАЮЩИЙ ЗАГОЛОВОК "ПОБЕДА!" --- */}
            <div className="popup-header-banner victory-banner"> {/* Добавлен класс victory-banner для возможной кастомизации */}
              <h3>Победа!</h3>
            </div>

            {/* --- ИНФО ОБ УРОВНЕ И РЕЖИМЕ ПОД БАННЕРОМ --- */}
            <div className="level-mode-info">
  <span className="level-text">{displayLevelText}</span>
  <span className="separator"> | </span>
  {/* Добавляем динамический класс */}
  <span className={`mode-text mode-${difficulty?.toLowerCase() || 'normal'}`}>
    Режим: {displayDifficulty}
  </span>
</div>

            {/* --- КОНТЕЙНЕР ДЛЯ НАГРАД (сдвинут ниже) --- */}
            <div className="victory-content-area">
              <div className="victory-rewards">
                <h4>Награды за уровень:</h4>
                {/* Валюта */}
                {(goldCollected > 0 || diamondsCollected > 0) && (
                  <div className="reward-line currency-line">
                    {goldCollected > 0 && (<> <img src={getRewardIcon({ type: 'gold' })} alt="Золото" className="reward-icon" /> <span>{goldCollected}</span> </>)}
                    {(goldCollected > 0 && diamondsCollected > 0) && (<div style={{ width: '15px' }}></div>)}
                    {diamondsCollected > 0 && (<> <img src={getRewardIcon({ type: 'diamonds' })} alt="Алмазы" className="reward-icon" /> <span>{diamondsCollected}</span> </>)}
                  </div>
                )}
                {/* Предметы */}
                {itemsCollected.length > 0 && (
                  <div className="item-reward-section">
                    <p className="item-received-text">Полученные предметы:</p>
                    <div className="item-icons-grid">
                      {itemsCollected.map((item, index) => {
                        const itemRarityKey = item.rarity?.toLowerCase().replace('+', '') || 'default';
                        const rarityColorVal = rarityColors[itemRarityKey] || rarityColors.default;
                        return (
                          <div key={item.id ? `${item.id}-${index}` : `item-${index}`} className="item-icon-wrapper" style={{ backgroundColor: rarityColorVal, borderColor: rarityColorVal }} onClick={(e) => handleItemClick(item, e)} title={item.name || 'Предмет'}>
                            <img src={getRewardIcon(item)} alt={item.name || 'Предмет'} className="reward-icon item-icon-clickable" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={onGoToMenu}>Продолжить</button>
            </div> {/* Конец victory-content-area */}

          </div> {/* Конец level-victory-content */}
        </div> {/* Конец level-victory-overlay */}

        {/* Анимированный тултип для предмета */}
        <AnimatePresence>
          {itemDataForTooltip && (
            <motion.div
              className="popup-overlay new-style item-tooltip-overlay"
              variants={popupOverlayVariants} initial="hidden" animate="visible" exit="exit"
              onClick={handleCloseTooltipOverlay}
              style={{ zIndex: 1050 }}
            >
              <motion.div
                className={`popup-container ${tooltipRarityClass}`}
                variants={popupContentVariants}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="popup-header-banner"><h3>Информация о предмете</h3></div>
                <h2 className={`item-name-centered ${tooltipRarityTextClass}`}>{itemDataForTooltip.name}</h2>
                <div className="popup-content-area">
                  <div className="item-main-info">
                    <div className={`item-icon-wrapper ${tooltipRarityClass}`}>
                      <img src={getRewardIcon(itemDataForTooltip)} alt={itemDataForTooltip.name} className="item-icon" />
                    </div>
                    <div className="item-details">
                      <span className={`item-rarity-badge ${tooltipRarityClass}`}>{itemDataForTooltip.rarity}</span>
                      {itemDataForTooltip.type && <span className='item-type'>{itemDataForTooltip.type}</span>}
                    </div>
                  </div>
                  {tooltipInitialStats.length > 0 && (
                    <div className="item-section item-initial-stats">
                      <h4>Характеристики</h4>
                      <div className="stats-grid">
                        {tooltipInitialStats.map((stat, index) => (
                          <div key={index} className="stat-item">
                            <span className="stat-name">{stat.name}:</span>
                            <span className="stat-value">{stat.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {itemDataForTooltip.description && (
                    <div className="item-section item-description">
                      <h4>Описание</h4>
                      <p>{itemDataForTooltip.description}</p>
                    </div>
                  )}
                  {tooltipSetInfo && (
                    <div className="item-section item-set-bonus">
                      <h4 className={`set-name ${tooltipRarityTextClass}`}>Набор: {tooltipSetInfo.name}</h4>
                      <ul className="stats-list set-bonus-list">
                        {tooltipSetInfo.bonuses.map((bonus, index) => (
                          <li key={index} className="stat-item set-bonus-item">
                            <span className="set-pieces">({bonus.requiredCount} шт.):</span>
                            <span className="set-description">{bonus.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="popup-actions">
                  <button className="popup-button close-only" onClick={() => setSelectedItemId(null)}>Закрыть</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }
);

LevelVictoryPopup.displayName = 'LevelVictoryPopup';
export default LevelVictoryPopup;