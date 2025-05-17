// src/components/CraftingSuccessPopup.jsx
import React from 'react';
import { motion } from 'framer-motion';
import './CraftingSuccessPopup.scss'; // Стили остаются те же
// Импорт из твоего файла src/data/itemSets.js
import { getItemSetById } from '../../data/itemSets.js'; // <-- Убедись, что путь '../data/itemSets' верный относительно этого файла!

// --- Анимации (оставляем как есть из кода 2) ---
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

// --- Хелперы форматирования статов (оставляем как есть из кода 2) ---
const formatStatValue = (key, value) => {
    const percentStats = ['attackSpeedBonus', 'critChanceBonus', 'doubleStrikeChanceBonus'];
    if (percentStats.includes(key)) {
        return `${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    }
    return value.toLocaleString();
};
const statNames = {
    hpBonus: "Здоровье",
    attackBonus: "Атака",
    attackSpeedBonus: "Скор. Атаки",
    critChanceBonus: "Шанс Крита",
    doubleStrikeChanceBonus: "Двойная Атака",
};

// --- Основной компонент ---
// ИЗМЕНЕНО: Добавлен проп onNavigateToInventory, onClose оставлен для кнопки "X" и фона
const CraftingSuccessPopup = ({ itemData, onClose, onNavigateToInventory }) => {
    if (!itemData) return null;

    // --- Классы редкости (оставляем как есть из кода 2) ---
    const rarity = itemData.rarity?.toLowerCase().replace('+', '') || 'common';
    const rarityClass = `rarity-${rarity}`;
    const rarityTextClass = `rarity-text-${rarity}`;

    // --- Начальные характеристики (оставляем как есть из кода 2) ---
    const initialStats = Object.entries(statNames)
        .map(([key, name]) => {
            const value = itemData[key];
            if (value && value !== 0) {
                return { name, value: `+${formatStatValue(key, value)}` };
            }
            return null;
        })
        .filter(Boolean);

    // --- Информация о сете (оставляем как есть из кода 2) ---
    const setInfo = itemData.setId ? getItemSetById(itemData.setId) : null;

    return (
        <motion.div
            className="popup-overlay new-style" // Стили из кода 2
            variants={popupOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose} // ИЗМЕНЕНО: Клик на фон вызывает onClose (закрытие)
        >
            <motion.div
                className={`popup-container ${rarityClass}`} // Стили из кода 2
                variants={popupContentVariants}
                onClick={(e) => e.stopPropagation()} // Предотвращаем закрытие при клике на сам попап
            >
                {/* Вынесенный баннер заголовка (оставляем как есть из кода 2) */}
                <div className="popup-header-banner">
                     {/* ИЗМЕНЕНО: Текст заголовка как в коде 1 */}
                    <h3>Успех!</h3>
                </div>

                {/* Кнопка закрытия "X" (оставляем как есть из кода 2) */}
                <button className="popup-close-button" onClick={onClose} aria-label="Закрыть">&times;</button>

                {/* Центральное название предмета (оставляем как есть из кода 2) */}
                <h2 className={`item-name-centered ${rarityTextClass}`}>{itemData.name}</h2>

                {/* Основная область контента (оставляем как есть из кода 2) */}
                <div className="popup-content-area">

                    {/* --- Иконка + Редкость/Тип --- (оставляем как есть из кода 2) */}
                    <div className="item-main-info">
                        <div className={`item-icon-wrapper ${rarityClass}`}>
                            {/* ИЗМЕНЕНО: Путь к картинке как в коде 1 */}
                            <img src={itemData.image || '/assets/default-item.png'} alt={itemData.name} className="item-icon" />
                        </div>
                        <div className="item-details">
                            <span className={`item-rarity-badge ${rarityClass}`}>{itemData.rarity}</span>
                            <span className='item-type'>{itemData.type}</span>
                        </div>
                    </div>

                    {/* --- Начальные характеристики --- (оставляем как есть из кода 2) */}
                    {initialStats.length > 0 && (
                        <div className="item-section item-initial-stats">
                            <h4>Начальные характеристики</h4>
                            <div className="stats-grid">
                                {initialStats.map((stat, index) => (
                                    <div key={index} className="stat-item">
                                        <span className="stat-name">{stat.name}:</span>
                                        <span className="stat-value">{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- Описание --- (оставляем как есть из кода 2) */}
                    {itemData.description && (
                        <div className="item-section item-description">
                            <h4>Описание</h4>
                            <p>{itemData.description}</p>
                        </div>
                    )}

                    {/* --- Бонусы набора --- (оставляем как есть из кода 2) */}
                    {setInfo && (
                        <div className="item-section item-set-bonus">
                            <h4 className={`set-name ${rarityTextClass}`}>Набор: {setInfo.name}</h4>
                            <ul className="stats-list set-bonus-list">
                                {setInfo.bonuses.map((bonus, index) => (
                                    <li key={index} className="stat-item set-bonus-item">
                                        {/* Используем requiredCount из твоего файла */}
                                        <span className="set-pieces">({bonus.requiredCount} предмета):</span>
                                        <span className="set-description">{bonus.description}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div> {/* Конец popup-content-area */}

                {/* ИЗМЕНЕНО: Сообщение об успешном создании из кода 1 */}
                <p style={{ textAlign: 'center', margin: '10px 0' }}>Предмет успешно создан!</p>

                {/* --- Кнопка действия --- */}
                <div className="popup-actions">
                     {/* --- ИЗМЕНЕННАЯ КНОПКА --- */}
                    <button
                        // Можно использовать старый класс или создать новый/модифицировать существующий
                        // className="popup-button navigate-button" // Пример нового класса
                        className="popup-button" // Используем общий класс кнопки, можно добавить модификатор
                        onClick={onNavigateToInventory} // Используем новый обработчик
                    >
                        Перейти в Инвентарь {/* Текст кнопки из кода 1 */}
                    </button>
                </div>
            </motion.div> {/* Конец popup-container */}
        </motion.div>
    );
};

export default CraftingSuccessPopup;