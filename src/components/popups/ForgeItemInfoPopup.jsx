// src/components/popups/ForgeItemInfoPopup.jsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import './ForgeItemInfoPopup.scss'; // <--- ВОТ ЭТОТ ИМПОРТ

// calculateItemStat может понадобиться, если базовые статы не хранятся напрямую в объекте предмета
// import { calculateItemStat } from '../../data/itemsDatabase';

// Анимации можно оставить, они универсальны для попапов
const popupBackdropVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
};
const popupContentVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.2, delay: 0.05 }
};

// Упрощенный форматер статов (если стат 0 или отсутствует, не показываем)
const formatBaseStatValue = (value, isPercent) => {
    if (value === undefined || value === null || Number(value) === 0) return null;

    const numValue = Number(value);
    if (isNaN(numValue)) return null;

    const fixedValue = isPercent ?
        (numValue * 100).toFixed(1) :
        (Number.isInteger(numValue) ? numValue.toString() : numValue.toFixed(1));

    return `${fixedValue}${isPercent ? '%' : ''}`;
};

// Упрощенный рендерер строки стата
const renderBaseStatRow = (label, value, isPercent = false) => {
    const displayValue = formatBaseStatValue(value, isPercent);
    if (!displayValue) return null; // Не рендерим строку, если значение нулевое или отсутствует

    return (
        <React.Fragment key={label}>
            <div className="stat-name-cell">{label}</div>
            <div className="current-value-cell" style={{ justifyContent: 'flex-start', paddingLeft: '10px' }}>{displayValue}</div> {/* Выравниваем значение по левому краю для наглядности */}
            {/* Пустые ячейки для сохранения структуры грида, если используется тот же CSS */}
            <div className="arrow-cell"></div>
            <div className="next-value-cell"></div>
        </React.Fragment>
    );
};

const ForgeItemInfoPopup = ({ item, onClose }) => {
    if (!item) return null;

    // Предполагаем, что объект 'item' (который будет selectedRecipeData.outputItemData)
    // уже содержит все необходимые базовые характеристики.
    // Если нет, их нужно будет получить или рассчитать здесь.
    // Например, item.hpBonus, item.attackBonus и т.д.
    const itemStats = useMemo(() => {
        // Эта часть зависит от структуры вашего объекта item.
        // Если статы в item.stats:
        // return {
        //     hpBonus: item.stats?.hpBonus || 0,
        //     attackBonus: item.stats?.attackBonus || 0,
        //     // ... и т.д.
        // };
        // Если статы прямо в item:
        return {
            hpBonus: item.hpBonus || 0,
            attackBonus: item.attackBonus || 0,
            attackSpeedBonus: item.attackSpeedBonus || 0,
            critChanceBonus: item.critChanceBonus || 0,
            doubleStrikeChanceBonus: item.doubleStrikeChanceBonus || 0,
        };
    }, [item]);

    const hasAnyStats = Object.values(itemStats).some(stat => stat && Number(stat) !== 0);

    return (
        <motion.div
            key="forge-item-info-popup-backdrop"
            className="item-popup-backdrop" // Используем существующие стили
            variants={popupBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose} // Закрытие по клику на фон
        >
            <motion.div
                className="item-popup-content" // Используем существующие стили
                onClick={(e) => e.stopPropagation()} // Предотвращаем закрытие по клику на сам попап
                variants={popupContentVariants}
            >
                {/* --- Шапка --- */}
                <div className="custom-popup-header">
                    {/* Крестик убран по запросу */}
                    <div className={`item-name-banner rarity-bg-${item.rarity?.toLowerCase() || 'common'}`}>
                        <h2>{item.name}</h2>
                    </div>
                    {item.type && (
                        <div className="item-type-banner">
                            <span>{item.type}</span>
                        </div>
                    )}
                </div>

                {/* --- Тело попапа --- */}
                <div className="popup-body">
                    <div className="popup-content-stack">
                        {/* Иконка и Описание */}
                        <div className="icon-description-row">
                            <div className="icon-column">
                                <div className={`popup-icon-area rarity-${item.rarity?.toLowerCase() || 'common'}`}>
                                    <img src={item.image || "/assets/default-item.png"} alt={item.name} className="popup-icon"/>
                                </div>
                            </div>
                            {item.description && (
                                <div className="description-column">
                                    <div className="popup-description-area">
                                        <p>{item.description}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Разделитель и Блок Статов */}
                        {(item.description && hasAnyStats) && <hr className="popup-divider content-divider" />}

                        {hasAnyStats && (
                            <div className="stats-block">
                                <div className="stats-comparison-table"> {/* Можно переименовать CSS класс, если смущает "comparison" */}
                                    {renderBaseStatRow("Health", itemStats.hpBonus, false)}
                                    {renderBaseStatRow("Attack", itemStats.attackBonus, false)}
                                    {renderBaseStatRow("Attack Speed", itemStats.attackSpeedBonus, true)}
                                    {renderBaseStatRow("Crit Strike", itemStats.critChanceBonus, true)}
                                    {renderBaseStatRow("Double Strike", itemStats.doubleStrikeChanceBonus, true)}
                                </div>
                            </div>
                        )}
                         {!hasAnyStats && item.description && !Object.values(itemStats).some(s => s) && (
                             <div className="no-stats-message" style={{padding: '10px 0', textAlign: 'center'}}>
                                <p>Предмет не имеет дополнительных характеристик.</p>
                            </div>
                         )}


                        {/* Бонус комплекта (если есть) */}
                        {item.setId && (
                            <>
                                <hr className="popup-divider content-divider" />
                                <div className="popup-set-bonus-area">
                                    <h4>Бонус Комплекта (Placeholder)</h4> {/* Заменить на реальные данные */}
                                    <p>Принадлежит к комплекту: {item.setId}</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* --- Футер с кнопкой "Закрыть" --- */}
                <div className="popup-buttons">
                    <div className="action-button-row" style={{justifyContent: 'center'}}> {/* Добавлен стиль для центрирования кнопки, если она одна */}
                        <button
                            className="button-action button-close-forge-info" // Новый класс для стилизации
                            onClick={onClose}
                        >
                            Закрыть
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ForgeItemInfoPopup;