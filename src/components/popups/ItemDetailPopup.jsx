// src/components/popups/ItemDetailPopup.jsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
// import useGameStore from '../../store/useGameStore'; // Оставляем, если onUpgradeItem требует его контекста или если он используется для других целей
import {
    calculateItemStat,
    MAX_ITEM_LEVEL
} from '../../data/itemsDatabase'; // Убедитесь, что путь правильный

// Анимации для попапа (можно вынести в общий файл анимаций, если используются еще где-то)
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

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ИЗ КОД1 (остаются без изменений, т.к. идентичны в обоих версиях) ---

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
        // Для строки уровня, форматируем число и добавляем "Lvl. "
        currentDisplay = `Lvl. ${formatStatValueForTable(currentValue, false, false, true)}`; // true для isLevelNumberOnly
    } else {
        // Для остальных статов добавляем знак "+" если нужно
        currentDisplay = formatStatValueForTable(currentValue, isPercent, false); 
    }

    let nextDisplayContent = "-";
    let arrowContent = "";
    let nextValueExtraClass = "no-value";

    if (showNextValueColumn) {
        let formattedNextValue;
        if (isLevelRow) {
            // Для следующего уровня также форматируем число и добавляем "Lvl. "
            formattedNextValue = `Lvl. ${formatStatValueForTable(nextValue, false, false, true)}`; // true для isLevelNumberOnly
        } else {
            formattedNextValue = formatStatValueForTable(nextValue, isPercent, false);
        }

        // Показываем стрелку и значение, только если отформатированное значение не просто "-"
        if (formattedNextValue !== "-") {
            nextDisplayContent = formattedNextValue;
            arrowContent = "→";
            nextValueExtraClass = "has-value";
        } else {
            // nextDisplayContent останется "-", если отформатированное значение "-"
        }
    } else if (isLevelRow) { // Если это строка уровня и улучшение невозможно
        nextDisplayContent = "Макс."; // Отображаем "Макс." без "Lvl. "
        nextValueExtraClass = "no-upgrade";
    }
    // Для остальных статов, если showNextValueColumn=false, nextDisplayContent останется "-", стрелка пустая

    const key = typeof labelWithIcon === 'string' ? labelWithIcon : JSON.stringify(labelWithIcon);
    const currentValCellClasses = `current-value-cell ${isLevelRow ? 'is-level-value' : ''}`; // is-level-value для центрирования
    const nextValCellClasses = `next-value-cell ${nextValueExtraClass} ${isLevelRow ? 'is-level-value' : ''}`;

    return (
        <React.Fragment key={key}>
            <div className="stat-name-cell">{labelWithIcon}</div> {/* Будет пустым для строки уровня */}
            <div className={currentValCellClasses}>{currentDisplay}</div>
            <div className="arrow-cell">{arrowContent}</div>
            <div className={nextValCellClasses}>{nextDisplayContent}</div>
        </React.Fragment>
    );
};
;
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

    const currentlyEquippedInSlot = equippedItems[item.type] || null;
    const isEquipped = equippedItems[item.type]?.uid === item.uid;

    // Текущие статы выбранного предмета (как в код2)
    const selectedItemStats = useMemo(() => ({ // Добавлен useMemo для консистентности, хотя зависимости простые
        hpBonus: calculateItemStat(item.type, "hpBonus", item.rarity, item.level || 0),
        attackBonus: calculateItemStat(item.type, "attackBonus", item.rarity, item.level || 0),
        attackSpeedBonus: calculateItemStat(item.type, "attackSpeedBonus", item.rarity, item.level || 0),
        critChanceBonus: calculateItemStat(item.type, "critChanceBonus", item.rarity, item.level || 0),
        doubleStrikeChanceBonus: calculateItemStat(item.type, "doubleStrikeChanceBonus", item.rarity, item.level || 0),
    }), [item.type, item.rarity, item.level]);

    // Статы экипированного предмета в том же слоте (как в код2)
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

    // Разница в статах (как в код2)
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


    // --- НОВАЯ ЛОГИКА из КОД1 для расчета canUpgrade и nextLevelStats ---
    const isLevelable = useMemo(() => item.maxLevel !== undefined, [item.maxLevel]); // Взято из код1 (было в код2 похожее)

    const itemMaxActualLevel = useMemo(() => (item.maxLevel !== undefined && item.maxLevel > 0) ? item.maxLevel : MAX_ITEM_LEVEL, [item.maxLevel]);
    const currentActualLevel = useMemo(() => item.level || 0, [item.level]); // Фактический текущий уровень (0 для нового предмета)

    const canUpgrade = useMemo(() => isLevelable && currentActualLevel < itemMaxActualLevel, [isLevelable, currentActualLevel, itemMaxActualLevel]);
    const nextLevelValueForCalc = useMemo(() => currentActualLevel + 1, [currentActualLevel]);

    const nextLevelStats = useMemo(() => {
        if (!canUpgrade) {
            // Если улучшение невозможно, характеристики следующего уровня равны текущим
            // или можно возвращать null/undefined, чтобы renderStatComparisonRow отображал прочерки
            // Для соответствия код1, возвращаем selectedItemStats, что логично
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
    // --- КОНЕЦ НОВОЙ ЛОГИКИ ---


    // Отображение стоимости улучшения (логика из код2, но использует itemMaxActualLevel)
const displayUpgradeCost = () => { // Теперь эта функция будет возвращать объект
    if (!item || typeof getGoldUpgradeCost !== 'function' || typeof getDiamondUpgradeCost !== 'function') {
        return { isNa: true, textNa: "(N/A)" }; // Возвращаем объект для случая N/A
    }

    // currentActualLevel и itemMaxActualLevel уже должны быть определены в компоненте
    if (currentActualLevel >= itemMaxActualLevel) {
        return null; // Нет стоимости для отображения, если предмет максимального уровня
    }

    const goldCost = getGoldUpgradeCost(currentActualLevel, item.rarity);
    const diamondCost = getDiamondUpgradeCost(currentActualLevel, item.rarity);

    // Проверяем на неопределенность или бесконечность перед тем, как считать, что стоимости нет
    const goldIsUnavailable = goldCost === Infinity || goldCost === undefined;
    const diamondIsUnavailable = diamondCost === Infinity || diamondCost === undefined;

    if (goldIsUnavailable && diamondIsUnavailable) {
        return { isNa: true, textNa: "(N/A)" };
    }
    // Условие для бесплатного улучшения, если оба стоят 0 или меньше
    if ((goldIsUnavailable || goldCost <= 0) && (diamondIsUnavailable || diamondCost <= 0)) {
        return { isFree: true, textFree: "Бесплатно" };
    }

    return {
        gold: (goldCost > 0 && !goldIsUnavailable) ? goldCost : null,
        diamonds: (diamondCost > 0 && !diamondIsUnavailable) ? diamondCost : null,
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
                className="item-popup-content"
                onClick={(e) => e.stopPropagation()}
                variants={popupContentVariants}
            >
               <div className="custom-popup-header"> {/* Новый класс для области шапки */}
    <button className="popup-close-x" onClick={onClose}>✖</button>

    {/* Баннер с текущим уровнем (слева вверху) */}
    {isLevelable && ( // Показываем, только если предмет имеет уровни
        <div className="current-level-banner">
            <span>Lvl. {(item.level && item.level > 0) ? item.level : 1}</span>
        </div>
    )}

    {/* Баннер с названием предмета (по центру, с фоном по редкости) */}
    <div className={`item-name-banner rarity-bg-${item.rarity?.toLowerCase() || 'common'}`}>
        {/* Используйте h1, h2 или h3 для семантики, стили будут применены к .item-name-banner */}
        <h2>{item.name}</h2>
        {/* Сюда же можно добавить текстовое отображение редкости, если цвет фона не единственный индикатор */}
        {/* <span className={`rarity-text-indicator rarity-${item.rarity?.toLowerCase() || 'common'}`}>{item.rarity || 'Common'}</span> */}
    </div>

    {/* Баннер с типом предмета (под названием, золотистый) */}
    {item.type && (
        <div className="item-type-banner">
            <span>{item.type}</span>
        </div>
    )}
</div>


                <div className="popup-body">
    {/* Этот div теперь будет главным вертикальным контейнером для блоков контента */}
    <div className="popup-content-stack"> {/* Раньше это был .popup-main-row, можно переименовать или изменить стили .popup-main-row */}

        {/* --- ЭТАЖ 1: Иконка и Описание --- */}
        <div className="icon-description-row"> {/* Новый контейнер для иконки и описания */}
            <div className="icon-column"> {/* Обертка для иконки (раньше .popup-left-col) */}
                <div className={`popup-icon-area rarity-${item.rarity?.toLowerCase() || 'common'}`}>
                    <img src={item.image || "/assets/default-item.png"} alt={item.name} className="popup-icon"/>
                </div>
            </div>

            {item.description && (
                <div className="description-column"> {/* Обертка для описания */}
                    <div className="popup-description-area">
                        <p>{item.description}</p>
                    </div>
                </div>
            )}
        </div> {/* Конец icon-description-row */}

        {/* Разделитель между [Иконка+Описание] и [Статы] */}
        {/* Показываем, если есть описание ИЛИ если будут показаны статы (т.е. предмет улучшаемый или уже есть статы) */}
        {(item.description || isLevelable || Object.values(selectedItemStats).some(stat => stat !== undefined && stat !== 0)) &&
         (isLevelable || Object.values(selectedItemStats).some(stat => stat !== undefined && stat !== 0)) &&
            <hr className="popup-divider content-divider" />
        }
<div className="stats-block"> {/* НОВАЯ ОБЕРТКА */}
       {(isLevelable || Object.values(selectedItemStats).some(stat => stat !== undefined && stat !== 0)) && (
    <div className="stats-comparison-table">
        {/* Строка для УРОВНЯ (обычно отображается всегда, если предмет улучшаемый) */}
        {isLevelable && renderStatComparisonRow(
            "",
            currentActualLevel,
            nextLevelValueForCalc,
            canUpgrade,
            false, // isPercent
            true   // isLevelRow
        )}

        {/* --- УСЛОВНОЕ ОТОБРАЖЕНИЕ СТАТОВ --- */}

        {/* Показываем ХП, только если значение не 0 */}
        {selectedItemStats.hpBonus !== 0 && renderStatComparisonRow(
            "Health",
            selectedItemStats.hpBonus,
            nextLevelStats.hpBonus,
            canUpgrade,
            false
        )}

        {/* Показываем Урон, только если значение не 0 */}
        {selectedItemStats.attackBonus !== 0 && renderStatComparisonRow(
            "Attack",
            selectedItemStats.attackBonus,
            nextLevelStats.attackBonus,
            canUpgrade,
            false
        )}

        {/* Показываем Скор. атаки, только если значение не 0 */}
        {selectedItemStats.attackSpeedBonus !== 0 && renderStatComparisonRow(
            "Attack Speed",
            selectedItemStats.attackSpeedBonus,
            nextLevelStats.attackSpeedBonus,
            canUpgrade,
            true // isPercent = true
        )}

        {/* Показываем Крит. шанс, только если значение не 0 */}
        {selectedItemStats.critChanceBonus !== 0 && renderStatComparisonRow(
            "Crit Strike",
            selectedItemStats.critChanceBonus,
            nextLevelStats.critChanceBonus,
            canUpgrade,
            true
        )}

        {/* Показываем Двойной удар, только если значение не 0 */}
        {selectedItemStats.doubleStrikeChanceBonus !== 0 && renderStatComparisonRow(
            "Double Strike",
            selectedItemStats.doubleStrikeChanceBonus,
            nextLevelStats.doubleStrikeChanceBonus,
            canUpgrade,
            true
        )}
    </div>
)}
        {/* Сообщение "Нет базовых характеристик" */}
        {![selectedItemStats.hpBonus, /* ...остальные selectedItemStats... */ ].some(s => s) && !isLevelable && (
            <div className="no-stats-message"><p>Нет базовых характеристик</p></div>
        )}
</div>

        {/* --- ЭТАЖ 3: Бонус Комплекта --- */}
        {item.setId && (
            <>
                <hr className="popup-divider content-divider" />
                <div className="popup-set-bonus-area">
                    <h4>Бонус Комплекта (Placeholder)</h4>
                    <p>Принадлежит к комплекту: {item.setId}</p>
                </div>
            </>
        )}
    </div> {/* Конец popup-content-stack */}
</div> 

                <div className="popup-buttons">
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
        {/* Убираем отображение уровня в скобках из основного текста кнопки */}
        {!canUpgrade ? "Max." : "Upgrade"}
    </span>

    {/* Обновленное отображение стоимости ВНУТРИ КНОПКИ */}
    {canUpgrade && (() => { // Самовызывающаяся функция для рендеринга стоимости
        const costInfo = displayUpgradeCost(); // Вызываем обновленную функцию
        if (!costInfo) return null;

        return (
            <span className="upgrade-cost-display"> {/* Используем тот же класс, что и для панели валюты, или новый */}
                {costInfo.isNa && <span className="cost-info-text">{costInfo.textNa}</span>}
                {costInfo.isFree && <span className="cost-info-text">{costInfo.textFree}</span>}
                
                {costInfo.gold && (
                    <span className="cost-item cost-gold">
                        <span>{costInfo.gold.toLocaleString()}</span>
                        <img src="/assets/coin-icon.png" alt="" className="cost-icon" />
                    </span>
                )}
                {/* Если стоимость может быть и золотом И алмазами одновременно ВНУТРИ кнопки, добавляем отступ */}
                {costInfo.gold && costInfo.diamonds && <span style={{margin: '0 4px'}}></span>} 

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
                    {!isLevelable && <div className="button-group-placeholder"></div>} {/* Заглушка, если предмет не улучшаемый */}


                    <div className="action-button-row">
                        {isEquipped ? (
                            <button className="button-action button-unequip" onClick={() => onUnequipItem(item.type)}>Swap</button>
                        ) : (
                            <button
                                className={`button-action ${currentlyEquippedInSlot ? "button-change" : "button-equip"}`}
                                onClick={() => onEquipItem(item)}
                            >
                                {currentlyEquippedInSlot ? "Equip" : "Экипировать"}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ItemDetailPopup;