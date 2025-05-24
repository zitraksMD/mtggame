// src/components/popups/ForgeItemInfoPopup.jsx
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ForgeItemInfoPopup.scss';
import { calculateItemStat } from '../../data/itemsDatabase';
import { getItemSetById } from '../../data/itemSets'; // <-- Импорт для работы с сетами

// Анимации для попапа (основные)
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

// Анимации для переключения контента (статы/бонусы сета)
const contentSwitchVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.2, ease: "easeInOut" } },
};


// Форматер статов (без изменений)
const formatBaseStatValue = (value, isPercent) => {
    if (value === undefined || value === null || Number(value) === 0) return null;
    const numValue = Number(value);
    if (isNaN(numValue)) return null;
    const fixedValue = isPercent ?
        (numValue * 100).toFixed(1) :
        (Number.isInteger(numValue) ? numValue.toString() : numValue.toFixed(1));
    return `${fixedValue}${isPercent ? '%' : ''}`;
};

// Рендерер строки стата (без изменений)
const renderBaseStatRow = (label, value, isPercent = false) => {
    const displayValue = formatBaseStatValue(value, isPercent);
    if (!displayValue) return null;
    return (
        <React.Fragment key={label}>
            <div className="stat-name-cell">{label}</div>
            <div className="current-value-cell">{displayValue}</div>
            <div className="arrow-cell"></div>
            <div className="next-value-cell"></div>
        </React.Fragment>
    );
};

const ForgeItemInfoPopup = ({ item, onClose }) => {
    if (!item) return null;

    const [showingView, setShowingView] = useState('stats'); // 'stats' или 'setBonuses'

    const itemStats = useMemo(() => {
        if (!item || !item.type || !item.rarity) {
            return { hpBonus: 0, attackBonus: 0, attackSpeedBonus: 0, critChanceBonus: 0, doubleStrikeChanceBonus: 0, };
        }
        const baseLevel = item.level || 1;
        return {
            hpBonus: calculateItemStat(item.type, "hpBonus", item.rarity, baseLevel),
            attackBonus: calculateItemStat(item.type, "attackBonus", item.rarity, baseLevel),
            attackSpeedBonus: calculateItemStat(item.type, "attackSpeedBonus", item.rarity, baseLevel),
            critChanceBonus: calculateItemStat(item.type, "critChanceBonus", item.rarity, baseLevel),
            doubleStrikeChanceBonus: calculateItemStat(item.type, "doubleStrikeChanceBonus", item.rarity, baseLevel),
        };
    }, [item]);

    const hasAnyStats = Object.values(itemStats).some(stat => stat && Number(stat) !== 0);

    const setDetails = useMemo(() => {
        if (item.setId) {
            return getItemSetById(item.setId);
        }
        return null;
    }, [item.setId]);

    const handleToggleView = () => {
        setShowingView(prev => prev === 'stats' ? 'setBonuses' : 'stats');
    };

    return (
        <motion.div
            key="forge-item-info-popup-backdrop"
            className="item-popup-backdrop"
            variants={popupBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
        >
            <motion.div
                className="item-popup-content forge-info-popup-fixed-height"
                onClick={(e) => e.stopPropagation()}
                variants={popupContentVariants}
            >
                {/* Шапка */}
                <div className="custom-popup-header">
                    <div className={`item-name-banner rarity-bg-${item.rarity?.toLowerCase() || 'common'}`}>
                        <h2>{item.name}</h2>
                    </div>
                    {item.type && (
                        <div className="item-type-banner">
                            <span>{item.type}</span>
                        </div>
                    )}
                </div>

                {/* Тело попапа */}
                <div className="popup-body-scrollable-area">
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
                        
                        {/* Разделитель может быть не нужен, если отступы блоков достаточны */}
                        {/* {(item.description || hasAnyStats || setDetails) && <hr className="popup-divider content-divider thick-divider" />} */}

                        {/* Блок для переключения статов и бонусов сета */}
                        <div className="toggleable-content-area">
                            <AnimatePresence mode="wait" initial={false}>
                                {showingView === 'stats' && (
                                    <motion.div
                                        key="statsView"
                                        className="stats-view-wrapper"
                                        variants={contentSwitchVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                    >
                                        {/* --- >>> НОВЫЙ ЗАГОЛОВОК "Характеристики" <<< --- */}
                                        <h4 className="content-section-title left-aligned-title">Stats:</h4>
                                        {hasAnyStats && (
                                            <div className="stats-block">
                                                <div className="stats-comparison-table">
                                                    {renderBaseStatRow("Health", itemStats.hpBonus, false)}
                                                    {renderBaseStatRow("Attack", itemStats.attackBonus, false)}
                                                    {renderBaseStatRow("Attack Speed", itemStats.attackSpeedBonus, true)}
                                                    {renderBaseStatRow("Crit Strike", itemStats.critChanceBonus, true)}
                                                    {renderBaseStatRow("Double Strike", itemStats.doubleStrikeChanceBonus, true)}
                                                </div>
                                            </div>
                                        )}
                                        {!hasAnyStats && (
                                            <div className="no-stats-message">
                                                <p>Предмет не имеет базовых характеристик.</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {showingView === 'setBonuses' && setDetails && (
                                    <motion.div
                                        key="setBonusesView"
                                        className="set-bonuses-view-wrapper"
                                        variants={contentSwitchVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                    >
                                        {/* Заголовок для бонусов сета уже есть внутри .popup-set-bonus-area (h4) */}
                                        <div className="popup-set-bonus-area actual-set-bonuses">
                                            <h4>{setDetails.name}</h4>
                                            {setDetails.bonuses.map(bonus => (
                                                <div key={bonus.requiredCount} className="set-bonus-entry">
                                                    <span className="set-bonus-count">({bonus.requiredCount} шт.):</span>
                                                    <span className="set-bonus-desc">{bonus.description}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* --- >>> КНОПКА ПЕРЕКЛЮЧЕНИЯ ПЕРЕМЕЩЕНА СЮДА <<< --- */}
                        {setDetails && (
                            <button
                                className="button-action button-toggle-view-standalone" // Новый класс для стилизации
                                onClick={handleToggleView}
                            >
                                {showingView === 'stats' ? 'Set bonuses' : 'Stats'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Футер (теперь только с кнопкой "Закрыть") */}
                <div className="popup-buttons item-info-footer">
                    {/* Кнопка переключения вида была перемещена выше */}
                    <button
                        className="button-action button-close-forge-info"
                        onClick={onClose}
                        // Стиль для растягивания кнопки "Закрыть", если кнопка переключения вида отсутствует (setDetails === null)
                        // Если setDetails есть, кнопка переключения будет выше, и эта кнопка "Закрыть" не будет растягиваться.
                        // Если setDetails нет, кнопки переключения не будет, и кнопка "Закрыть" растянется.
                        style={!setDetails ? { width: '100%', maxWidth: '300px', margin: '0 auto' } : {}} 
                    >
                        Закрыть
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
export default ForgeItemInfoPopup;