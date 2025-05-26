// src/components/popups/CraftingSuccessPopup.jsx
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './CraftingSuccessPopup.scss';
import { getItemSetById } from '../../data/itemSets';
import { calculateItemStat } from '../../data/itemsDatabase'; // <-- ВАЖНО: Импорт для calculateItemStat

// Анимации для попапа (основные - без изменений)
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

// Анимации для переключения контента (статы/бонусы сета - из ForgeItemInfoPopup)
const contentSwitchVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.2, ease: "easeInOut" } },
};

// Хелпер форматирования статов (из вашего CraftingSuccessPopup.jsx - без изменений)
const formatBaseStatValue = (value, isPercent) => {
    // Изменено: теперь если значение равно 0, функция вернет null
    if (value === undefined || value === null || Number(value) === 0) {
        return null;
    }
    const numValue = Number(value);
    if (isNaN(numValue)) {
        return null;
    }
    
    // Для процентных значений, если они все-таки не равны 0, но очень малы (например, после округления до 0.0%)
    // Эта часть опциональна, если calculateItemStat уже дает корректные значения или 0.
    // const potentiallyZeroPercent = isPercent && (numValue * 100).toFixed(1) === "0.0";
    // if (potentiallyZeroPercent) return null; // Если хотим скрыть и "0.0%"

    const fixedValue = isPercent ?
        (numValue * 100).toFixed(1) :
        (Number.isInteger(numValue) ? numValue.toString() : numValue.toFixed(1));
    
    // Если после форматирования процентное значение стало "0.0", но исходное было не 0, то показываем.
    // Если же исходное было 0, оно отсеется первым if.
    // Это значит, что "0.0%" будет показано, если это действительно 0.0%, а не просто 0.
    // Если вы хотите скрыть и "0.0%", то используйте закомментированную логику выше.

    return `${fixedValue}${isPercent ? '%' : ''}`;
};

// Рендерер строки стата (без изменений, он уже корректно работает с null)
const renderBaseStatRow = (label, value, isPercent = false) => {
    const displayValue = formatBaseStatValue(value, isPercent);
    if (!displayValue) { // Это условие эквивалентно displayValue === null
        return null;
    }
    return (
        <React.Fragment key={label}>
            <div className="stat-name-cell">{label}</div>
            <div className="current-value-cell">{displayValue}</div>
            {/* Для CraftingSuccessPopup эти ячейки должны быть скрыты через SCSS */}
            <div className="arrow-cell"></div> 
            <div className="next-value-cell"></div>
        </React.Fragment>
    );
};


const CraftingSuccessPopup = ({ itemData, onClose, onNavigateToInventory }) => {
    if (!itemData) return null;

    const [showingView, setShowingView] = useState('stats');

    const itemStats = useMemo(() => {
        // Используем calculateItemStat, как в ForgeItemInfoPopup
        // Предполагается, что itemData содержит itemData.type, itemData.rarity и itemData.level
        if (!itemData || !itemData.type || !itemData.rarity) {
            // Возвращаем статы по умолчанию или пустые, если данных не хватает
            return { hpBonus: 0, attackBonus: 0, attackSpeedBonus: 0, critChanceBonus: 0, doubleStrikeChanceBonus: 0 };
        }
        const baseLevel = itemData.level || 1; // Уровень по умолчанию 1, если не указан

        return {
            hpBonus: calculateItemStat(itemData.type, "hpBonus", itemData.rarity, baseLevel),
            attackBonus: calculateItemStat(itemData.type, "attackBonus", itemData.rarity, baseLevel),
            attackSpeedBonus: calculateItemStat(itemData.type, "attackSpeedBonus", itemData.rarity, baseLevel),
            critChanceBonus: calculateItemStat(itemData.type, "critChanceBonus", itemData.rarity, baseLevel),
            doubleStrikeChanceBonus: calculateItemStat(itemData.type, "doubleStrikeChanceBonus", itemData.rarity, baseLevel),
        };
    }, [itemData]); // Зависимость от itemData (которое должно содержать type, rarity, level)

    const hasAnyStats = Object.values(itemStats).some(stat => stat && Number(stat) !== 0);

    const setDetails = useMemo(() => {
        if (itemData.setId) {
            return getItemSetById(itemData.setId);
        }
        return null;
    }, [itemData.setId]);

    const handleToggleView = () => {
        setShowingView(prev => prev === 'stats' ? 'setBonuses' : 'stats');
    };

    const itemRarity = itemData.rarity?.toLowerCase() || 'common';

    return (
        <motion.div
            key="crafting-success-popup-backdrop"
            className="popup-backdrop-new"
            variants={popupBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
        >
            <motion.div
                className="popup-content-new forge-info-popup-fixed-height"
                onClick={(e) => e.stopPropagation()}
                variants={popupContentVariants}
            >
                

                <div className="popup-header-new">
                    <div className={`item-name-banner-new rarity-bg-${itemRarity}`}>
                        {itemData.name}
                    </div>
                    {itemData.type && (
                        <div className="item-type-banner-new">
                            {itemData.type}
                        </div>
                    )}
                </div>

                <div className="popup-body-new popup-body-scrollable-area">
                    <div className="popup-content-stack">
                        <div className="icon-description-row">
                            <div className="icon-column">
                                <div className={`popup-icon-area rarity-${itemRarity}`}>
                                    <img src={itemData.image || "/assets/default-item.png"} alt={itemData.name} className="popup-icon"/>
                                </div>
                            </div>
                            {itemData.description && (
                                <div className="description-column">
                                    <div className="popup-description-area">
                                        <p>{itemData.description}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="toggleable-content-area">
                            <AnimatePresence mode="wait" initial={false}>
                                {showingView === 'stats' && (
                                    <motion.div
                                        key="statsViewCraft"
                                        className="stats-view-wrapper"
                                        variants={contentSwitchVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                    >
                                        <h4 className="content-section-title left-aligned-title stats-title-new">Stats:</h4>
                                        {hasAnyStats ? (
                                            <div className="stats-block">
                                                <div className="stats-comparison-table stats-list-wrapper-new">
                                                    {renderBaseStatRow("Health", itemStats.hpBonus, false)}
                                                    {renderBaseStatRow("Attack", itemStats.attackBonus, false)}
                                                    {renderBaseStatRow("Attack Speed", itemStats.attackSpeedBonus, true)}
                                                    {renderBaseStatRow("Crit Strike", itemStats.critChanceBonus, true)}
                                                    {renderBaseStatRow("Double Strike", itemStats.doubleStrikeChanceBonus, true)}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="no-stats-message">
                                                <p>Предмет не имеет базовых характеристик.</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {showingView === 'setBonuses' && setDetails && (
                                    <motion.div
                                        key="setBonusesViewCraft"
                                        className="set-bonuses-view-wrapper"
                                        variants={contentSwitchVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                    >
                                        <div className="popup-set-bonus-area actual-set-bonuses set-bonus-block-new">
                                            <h4 className="set-name-new">{setDetails.name}</h4>
                                            {setDetails.bonuses.map(bonus => (
                                                <div key={bonus.requiredCount} className="set-bonus-entry set-bonus-entry-new">
                                                    <span className="set-bonus-count set-bonus-count-new">({bonus.requiredCount} шт.):</span>
                                                    <span className="set-bonus-desc set-bonus-desc-new">{bonus.description}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {setDetails && (
                            <button
                                className="button-action button-toggle-view-standalone"
                                onClick={handleToggleView}
                            >
                                {showingView === 'stats' ? 'Set bonuses' : 'Stats'}
                            </button>
                        )}
                        
<div className="success-message-container">
    <p className="success-creation-message-new">Предмет успешно создан!</p>
</div>
                    </div>
                </div>

                <div className="popup-footer-new">
                    <button
                        className="action-button-new navigate-button-new"
                        onClick={onNavigateToInventory}
                    >
                        Перейти в Инвентарь
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default CraftingSuccessPopup;