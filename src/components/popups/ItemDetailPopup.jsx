// src/components/popups/ItemDetailPopup.jsx
import React, { useMemo, useState } from 'react'; // Добавили useState
import { motion, AnimatePresence } from 'framer-motion'; // Добавили AnimatePresence
import { getItemSetById } from '../../data/itemSets'; // <<< ДОБАВЛЕН ЭТОТ ИМПОРТ
// import useGameStore from '../../store/useGameStore'; // Оставляем, если onUpgradeItem требует его контекста или если он используется для других целей
import {
    calculateItemStat,
    MAX_ITEM_LEVEL
} from '../../data/itemsDatabase'; // Убедитесь, что путь правильный

// Анимации для попапа (основные - из вашего второго кода)
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

// Анимации для переключения контента (статы/бонусы сета) - как в ForgeItemInfoPopup (из вашего первого кода)
const contentSwitchVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.2, ease: "easeInOut" } },
};

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (из вашего второго кода, без изменений) ---
// Хелпер для форматирования значений статов для таблицы
const formatStatValueForTable = (value, isPercent, addSign = false, isLevelValue = false) => {
    if (value === undefined || value === null) return '-';

    if (isLevelValue) {
        return String(addSign ? value : (value === 0 ? 1 : value));
    }

    const numValue = Number(value);
    if (isNaN(numValue)) return '-';

    const sign = addSign && numValue > 0 ? '+' : '';
    const fixedValue = isPercent ?
        (numValue * 100).toFixed(1) :
        (Number.isInteger(numValue) ? numValue.toString() : numValue.toFixed(1));

    return `${sign}${fixedValue}${isPercent ? '%' : ''}`;
};

// Функция для рендеринга строки в 3-колоночной таблице характеристик
const renderStatComparisonRow = (labelWithIcon, currentValue, nextValue, showNextValueColumn, isPercent = false, isLevelRow = false) => {
    let currentDisplay;
    if (isLevelRow) {
        currentDisplay = `Lvl. ${formatStatValueForTable(currentValue, false, false, true)}`;
    } else {
        currentDisplay = formatStatValueForTable(currentValue, isPercent, false);
    }

    let nextDisplayContent = "-";
    let arrowContent = "";
    let nextValueExtraClass = "no-value";

    if (showNextValueColumn) {
        let formattedNextValue;
        if (isLevelRow) {
            formattedNextValue = `Lvl. ${formatStatValueForTable(nextValue, false, false, true)}`;
        } else {
            formattedNextValue = formatStatValueForTable(nextValue, isPercent, false);
        }

        if (formattedNextValue !== "-") {
            nextDisplayContent = formattedNextValue;
            arrowContent = "→";
            nextValueExtraClass = "has-value";
        }
    } else if (isLevelRow) {
        nextDisplayContent = "Макс.";
        nextValueExtraClass = "no-upgrade";
    }

    const key = typeof labelWithIcon === 'string' ? labelWithIcon : JSON.stringify(labelWithIcon);
    const currentValCellClasses = `current-value-cell ${isLevelRow ? 'is-level-value' : ''}`;
    const nextValCellClasses = `next-value-cell ${nextValueExtraClass} ${isLevelRow ? 'is-level-value' : ''}`;

    return (
        <React.Fragment key={key}>
            <div className="stat-name-cell">{labelWithIcon}</div>
            <div className={currentValCellClasses}>{currentDisplay}</div>
            <div className="arrow-cell">{arrowContent}</div>
            <div className={nextValCellClasses}>{nextDisplayContent}</div>
        </React.Fragment>
    );
};
// --- КОНЕЦ ВСПОМОГАТЕЛЬНЫХ ФУНКЦИЙ ---


const ItemDetailPopup = ({
    item,
    equippedItems,
    onClose,
    onEquipItem,
    onUnequipItem,
    onUpgradeItem,
    getGoldUpgradeCost,
    getDiamondUpgradeCost,
    playerGold,
    playerDiamonds
}) => {
    if (!item) return null;

    // ▼▼▼ НОВОЕ СОСТОЯНИЕ И ЛОГИКА ДЛЯ ПЕРЕКЛЮЧЕНИЯ ВИДА (из первого кода) ▼▼▼
    const [showingView, setShowingView] = useState('stats'); // 'stats' или 'setBonuses'

    const setDetails = useMemo(() => {
        if (item.setId) {
            return getItemSetById(item.setId);
        }
        return null;
    }, [item.setId, getItemSetById]); // Добавили getItemSetById в зависимости useMemo

    const handleToggleView = () => {
        setShowingView(prev => prev === 'stats' ? 'setBonuses' : 'stats');
    };
    // ▲▲▲ КОНЕЦ НОВОЙ ЛОГИКИ (из первого кода) ▲▲▲

    const currentlyEquippedInSlot = equippedItems[item.type] || null;
    const isEquipped = equippedItems[item.type]?.uid === item.uid;

    // Текущие статы выбранного предмета (из вашего второго кода)
    const selectedItemStats = useMemo(() => ({
        hpBonus: calculateItemStat(item.type, "hpBonus", item.rarity, item.level || 0),
        attackBonus: calculateItemStat(item.type, "attackBonus", item.rarity, item.level || 0),
        attackSpeedBonus: calculateItemStat(item.type, "attackSpeedBonus", item.rarity, item.level || 0),
        critChanceBonus: calculateItemStat(item.type, "critChanceBonus", item.rarity, item.level || 0),
        doubleStrikeChanceBonus: calculateItemStat(item.type, "doubleStrikeChanceBonus", item.rarity, item.level || 0),
    }), [item.type, item.rarity, item.level]);

    // Статы экипированного предмета в том же слоте (из вашего второго кода)
    const equippedInSlotStats = useMemo(() => {
        if (!currentlyEquippedInSlot) return null;
        return {
            hpBonus: calculateItemStat(currentlyEquippedInSlot.type, "hpBonus", currentlyEquippedInSlot.rarity, currentlyEquippedInSlot.level || 0),
            attackBonus: calculateItemStat(currentlyEquippedInSlot.type, "attackBonus", currentlyEquippedInSlot.rarity, currentlyEquippedInSlot.level || 0),
            attackSpeedBonus: calculateItemStat(currentlyEquippedInSlot.type, "attackSpeedBonus", currentlyEquippedInSlot.rarity, currentlyEquippedInSlot.level || 0),
            critChanceBonus: calculateItemStat(currentlyEquippedInSlot.type, "critChanceBonus", currentlyEquippedInSlot.rarity, currentlyEquippedInSlot.level || 0),
            doubleStrikeChanceBonus: calculateItemStat(currentlyEquippedInSlot.type, "doubleStrikeChanceBonus", currentlyEquippedInSlot.rarity, currentlyEquippedInSlot.level || 0),
        };
    }, [currentlyEquippedInSlot]);

    // Разница в статах (из вашего второго кода)
    const statDiffs = useMemo(() => {
        if (!currentlyEquippedInSlot || item.uid === currentlyEquippedInSlot.uid) return null;
        const diffs = {};
        const statKeys = ["hpBonus", "attackBonus", "attackSpeedBonus", "critChanceBonus", "doubleStrikeChanceBonus"];
        statKeys.forEach(key => {
            const selectedVal = selectedItemStats[key] || 0;
            const equippedVal = equippedInSlotStats?.[key] || 0;
            diffs[key.replace('Bonus', '')] = selectedVal - equippedVal;
        });
        return diffs;
    }, [item.uid, currentlyEquippedInSlot, selectedItemStats, equippedInSlotStats]);


    // Логика для расчета canUpgrade и nextLevelStats (из вашего второго кода, соответствует первому)
    const isLevelable = useMemo(() => item.maxLevel !== undefined, [item.maxLevel]);
    const itemMaxActualLevel = useMemo(() => (item.maxLevel !== undefined && item.maxLevel > 0) ? item.maxLevel : MAX_ITEM_LEVEL, [item.maxLevel]);
    const currentActualLevel = useMemo(() => item.level || 0, [item.level]);
    const canUpgrade = useMemo(() => isLevelable && currentActualLevel < itemMaxActualLevel, [isLevelable, currentActualLevel, itemMaxActualLevel]);
    const nextLevelValueForCalc = useMemo(() => currentActualLevel + 1, [currentActualLevel]);

    const nextLevelStats = useMemo(() => {
        if (!canUpgrade) {
            return selectedItemStats;
        }
        return {
            hpBonus: calculateItemStat(item.type, "hpBonus", item.rarity, nextLevelValueForCalc),
            attackBonus: calculateItemStat(item.type, "attackBonus", item.rarity, nextLevelValueForCalc),
            attackSpeedBonus: calculateItemStat(item.type, "attackSpeedBonus", item.rarity, nextLevelValueForCalc),
            critChanceBonus: calculateItemStat(item.type, "critChanceBonus", item.rarity, nextLevelValueForCalc),
            doubleStrikeChanceBonus: calculateItemStat(item.type, "doubleStrikeChanceBonus", item.rarity, nextLevelValueForCalc),
        };
    }, [item.type, item.rarity, nextLevelValueForCalc, canUpgrade, selectedItemStats]);


    // Отображение стоимости улучшения (из вашего второго кода)
    const displayUpgradeCost = () => {
        if (!item || typeof getGoldUpgradeCost !== 'function' || typeof getDiamondUpgradeCost !== 'function') {
            return { isNa: true, textNa: "(N/A)" };
        }
        if (currentActualLevel >= itemMaxActualLevel) {
            return null;
        }
        const goldCost = getGoldUpgradeCost(currentActualLevel, item.rarity);
        const diamondCost = getDiamondUpgradeCost(currentActualLevel, item.rarity);
        const goldIsUnavailable = goldCost === Infinity || goldCost === undefined;
        const diamondIsUnavailable = diamondCost === Infinity || diamondCost === undefined;

        if (goldIsUnavailable && diamondIsUnavailable) {
            return { isNa: true, textNa: "(N/A)" };
        }
        if ((goldIsUnavailable || goldCost <= 0) && (diamondIsUnavailable || diamondCost <= 0)) {
            return { isFree: true, textFree: "Бесплатно" };
        }
        let hasSufficientGold = true;
        if (goldCost > 0 && !goldIsUnavailable) {
            if (typeof playerGold !== 'number' || playerGold < goldCost) {
                hasSufficientGold = false;
            }
        }
        return {
            gold: (goldCost > 0 && !goldIsUnavailable) ? goldCost : null,
            diamonds: (diamondCost > 0 && !diamondIsUnavailable) ? diamondCost : null,
            hasSufficientGold: hasSufficientGold,
        };
    };

    return (
        <motion.div
            key="item-popup-backdrop"
            className="item-popup-backdrop"
            variants={popupBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
        >
            <motion.div
                className="item-popup-content" // Можно добавить forge-info-popup-fixed-height, если нужна фикс. высота
                onClick={(e) => e.stopPropagation()}
                variants={popupContentVariants}
                // initial, animate, exit наследуются от родителя или можно указать явно, если нужно переопределить
            >
                <div className="custom-popup-header"> {/* Шапка (из вашего второго кода) */}
                    <button className="popup-close-x" onClick={onClose}>✖</button>
                    {isLevelable && (
                        <div className="current-level-banner">
                            <span>Lvl. {(item.level && item.level > 0) ? item.level : 1}</span>
                        </div>
                    )}
                    <div className={`item-name-banner rarity-bg-${item.rarity?.toLowerCase() || 'common'}`}>
                        <h2>{item.name}</h2>
                    </div>
                    {item.type && (
                        <div className="item-type-banner">
                            <span>{item.type}</span>
                        </div>
                    )}
                </div>

                <div className="popup-body">
                    <div className="popup-content-stack">
                        <div className="icon-description-row"> {/* Иконка и Описание (из вашего второго кода) */}
                            <div className="icon-column">
                                <div className={`popup-icon-area rarity-${item.rarity?.toLowerCase() || 'common'}`}>
                                    <img src={item.image || "/assets/default-item.png"} alt={item.name} className="popup-icon" />
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

                        {/* Разделитель перед блоком статов/сета (условие из первого кода, упрощенное) */}
                        {(isLevelable || Object.values(selectedItemStats).some(stat => stat !== undefined && stat !== 0) || setDetails) &&
                            <hr className="popup-divider content-divider" />
                        }

                        {/* ▼▼▼ ОБЛАСТЬ ДЛЯ ПЕРЕКЛЮЧАЕМОГО КОНТЕНТА (СТАТЫ / БОНУСЫ СЕТА) (из первого кода) ▼▼▼ */}
                        <div className="toggleable-content-area">
                            <AnimatePresence mode="wait" initial={false}>
                                {showingView === 'stats' && (
                                    <motion.div
                                        key="statsViewItemDetail"
                                        className="stats-view-wrapper" // Можно использовать существующий .stats-block или обернуть его
                                        variants={contentSwitchVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                    >
                                        <div className="stats-block"> {/* Обертка из вашего второго кода */}
                                            {(isLevelable || Object.values(selectedItemStats).some(stat => stat !== undefined && stat !== 0)) && (
                                                <div className="stats-comparison-table">
                                                    {isLevelable && renderStatComparisonRow("", currentActualLevel, nextLevelValueForCalc, canUpgrade, false, true)}
                                                    {selectedItemStats.hpBonus !== 0 && renderStatComparisonRow("Health", selectedItemStats.hpBonus, nextLevelStats.hpBonus, canUpgrade, false)}
                                                    {selectedItemStats.attackBonus !== 0 && renderStatComparisonRow("Attack", selectedItemStats.attackBonus, nextLevelStats.attackBonus, canUpgrade, false)}
                                                    {selectedItemStats.attackSpeedBonus !== 0 && renderStatComparisonRow("Attack Speed", selectedItemStats.attackSpeedBonus, nextLevelStats.attackSpeedBonus, canUpgrade, true)}
                                                    {selectedItemStats.critChanceBonus !== 0 && renderStatComparisonRow("Crit Strike", selectedItemStats.critChanceBonus, nextLevelStats.critChanceBonus, canUpgrade, true)}
                                                    {selectedItemStats.doubleStrikeChanceBonus !== 0 && renderStatComparisonRow("Double Strike", selectedItemStats.doubleStrikeChanceBonus, nextLevelStats.doubleStrikeChanceBonus, canUpgrade, true)}
                                                </div>
                                            )}
                                            {/* Сообщение "Нет базовых характеристик" (условие из первого кода, уточнено) */}
                                            {![
                                                selectedItemStats.hpBonus,
                                                selectedItemStats.attackBonus,
                                                selectedItemStats.attackSpeedBonus,
                                                selectedItemStats.critChanceBonus,
                                                selectedItemStats.doubleStrikeChanceBonus
                                            ].some(s => s && s !== 0) && !isLevelable && (
                                                <div className="no-stats-message"><p>Предмет не имеет базовых характеристик.</p></div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {showingView === 'setBonuses' && setDetails && (
                                    <motion.div
                                        key="setBonusesViewItemDetail"
                                        className="set-bonuses-view-wrapper"
                                        variants={contentSwitchVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                    >
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
                        {/* ▲▲▲ КОНЕЦ ОБЛАСТИ ДЛЯ ПЕРЕКЛЮЧАЕМОГО КОНТЕНТА ▲▲▲ */}
                        
                        {/* Старый блок "Бонус Комплекта (Placeholder)" УДАЛЕН, так как теперь это часть toggleable-content-area */}

                        {/* ▼▼▼ КНОПКА ПЕРЕКЛЮЧЕНИЯ ВИДА (если предмет в сете) (из первого кода) ▼▼▼ */}
                        {setDetails && (
                            <>
                                {/* Опциональный разделитель перед кнопкой */}
                                {showingView === 'stats' && <hr className="popup-divider content-divider thin" />}
                                <button
                                    className="button-action button-toggle-view-standalone"
                                    onClick={handleToggleView}
                                    style={{ width: '95%', maxWidth: '300px', margin: '10px auto 5px auto' }} // Стили можно вынести в SCSS
                                >
                                    {showingView === 'stats' ? `Set bonuses` : 'Stats'}
                                </button>
                            </>
                        )}
                        {/* ▲▲▲ КОНЕЦ КНОПКИ ПЕРЕКЛЮЧЕНИЯ ВИДА ▲▲▲ */}

                    </div> {/* Конец popup-content-stack */}
                </div> {/* Конец popup-body */}

                <div className="popup-buttons"> {/* Футер с кнопками (из вашего второго кода) */}
                    {isLevelable && (
                        <div className="upgrade-action-group">
                            <button
                                className="button-upgrade main-action"
                                onClick={() => {
                                    if (canUpgrade) {
                                        onUpgradeItem(item);
                                    }
                                }}
                                disabled={!canUpgrade}
                            >
                                <span className="upgrade-action-text">
                                    {!canUpgrade ? "Max." : "Upgrade"}
                                </span>
                                {canUpgrade && (() => {
                                    const costInfo = displayUpgradeCost();
                                    if (!costInfo) return null;
                                    return (
                                        <span className="upgrade-cost-display">
                                            {costInfo.isNa && <span className="cost-info-text">{costInfo.textNa}</span>}
                                            {costInfo.isFree && <span className="cost-info-text">{costInfo.textFree}</span>}
                                            {costInfo.gold && (
                                                <span className="cost-item cost-gold">
                                                    <span className={!costInfo.hasSufficientGold ? 'insufficient-funds' : ''}>
                                                        {costInfo.gold.toLocaleString()}
                                                    </span>
                                                    <img src="/assets/coin-icon.png" alt="" className="cost-icon" />
                                                </span>
                                            )}
                                            {costInfo.gold && costInfo.diamonds && <span style={{ margin: '0 3px' }}></span>}
                                            {costInfo.diamonds && (
                                                <span className="cost-item cost-diamonds">
                                                    <span>{costInfo.diamonds.toLocaleString()}</span>
                                                    <img src="/assets/diamond-image.png" alt="" className="cost-icon" />
                                                </span>
                                            )}
                                        </span>
                                    );
                                })()}
                            </button>
                            {canUpgrade &&
                                playerGold !== undefined && playerDiamonds !== undefined && (
                                    <div className="player-currency-panel">
                                        <span className="currency-display">
                                            <span className="player-gold-text">{typeof playerGold === 'number' ? playerGold.toLocaleString() : '--'}</span>
                                            <img src="/assets/coin-icon.png" alt="Золото" className="currency-icon" />
                                        </span>
                                        <span className="currency-separator">/</span>
                                        <span className="currency-display">
                                            <span className="player-diamonds-text">{typeof playerDiamonds === 'number' ? playerDiamonds.toLocaleString() : '--'}</span>
                                            <img src="/assets/diamond-image.png" alt="Алмазы" className="currency-icon" />
                                        </span>
                                    </div>
                                )}
                        </div>
                    )}
                    {!isLevelable && <div className="button-group-placeholder"></div>}

                    <div className="action-button-row">
                        {isEquipped ? (
                            <button className="button-action button-unequip" onClick={() => onUnequipItem(item.type)}>Swap</button> // Текст изменен на Swap для единообразия с Equip
                        ) : (
                            <button
                                className={`button-action ${currentlyEquippedInSlot ? "button-change" : "button-equip"}`} // "button-change" если слот занят, "button-equip" если слот пуст
                                onClick={() => onEquipItem(item)}
                            >
                                {currentlyEquippedInSlot ? "Equip" : "Экипировать"} {/* Equip если замена, Экипировать если в пустой слот*/}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ItemDetailPopup;