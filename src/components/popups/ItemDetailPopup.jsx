// src/components/popups/ItemDetailPopup.jsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../../store/useGameStore'; // Для доступа к upgradeEquippedItem, если он там
import { 
    calculateItemStat, 
    // getGoldUpgradeCost, // Эти функции будут вызываться в Inventory и передаваться как результат
    // getDiamondUpgradeCost // или передаваться как функции, если попап сам будет их вызывать
    // Для простоты пока предположим, что стоимость передается как проп или отображается через TODO
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

// Хелпер для рендера статов (перенесен из Inventory.jsx)
const renderStatLine = (labelWithIcon, value, diffValue, isPercent) => {
    const hasValue = value !== undefined && value !== null && (typeof value === 'string' ? parseFloat(value) !== 0 : value !== 0);
    const showDiff = diffValue !== undefined && diffValue !== null && diffValue !== 0;

    if (!hasValue && !showDiff && value !== 0) return null; // Не рендерим, если нет значения (кроме 0) и нет разницы

    let diffElement = null;
    if (showDiff) {
        const diffClass = diffValue > 0 ? 'positive' : 'negative';
        const diffSymbol = diffValue > 0 ? '▲' : '▼';
        const diffDisplay = `${diffValue > 0 ? '+' : ''}${isPercent ? (diffValue * 100).toFixed(1) : diffValue.toFixed(0)}${isPercent ? '%' : ''}`;
        diffElement = <span className={`stat-diff ${diffClass}`}> ({diffSymbol}{diffDisplay})</span>;
    }
    
    const valueDisplay = hasValue || value === 0
        ? `${!isPercent && value > 0 ? '+' : ''}${isPercent ? (value * 100).toFixed(1) : value}${isPercent ? '%' : ''}`
        : '-';


    return (
        <p className="popup-stat-line">
            <span className="label">{labelWithIcon}:</span>
            <span className="value">{valueDisplay}{diffElement}</span>
        </p>
    );
};


const ItemDetailPopup = ({
    item, // Выбранный предмет { id, type, rarity, level, name, image, description, setId, maxLevel, ... }
    equippedItems, // объект всех надетых предметов
    onClose,
    onEquipItem,
    onUnequipItem,
    onUpgradeItem, // Обработчик из Inventory
    // upgradeCostGold, // Передается из Inventory
    // upgradeCostDiamonds, // Передается из Inventory
}) => {
    if (!item) return null;

    // Получаем предмет, который сейчас надет в этом же слоте (если есть)
    const currentlyEquippedInSlot = equippedItems[item.type] || null;

    // Рассчитываем статы для выбранного предмета и надетого (если есть)
    const selectedItemStats = {
        hpBonus: calculateItemStat(item.type, "hpBonus", item.rarity, item.level),
        attackBonus: calculateItemStat(item.type, "attackBonus", item.rarity, item.level),
        attackSpeedBonus: calculateItemStat(item.type, "attackSpeedBonus", item.rarity, item.level),
        critChanceBonus: calculateItemStat(item.type, "critChanceBonus", item.rarity, item.level),
        doubleStrikeChanceBonus: calculateItemStat(item.type, "doubleStrikeChanceBonus", item.rarity, item.level),
    };

    const equippedInSlotStats = currentlyEquippedInSlot ? {
        hpBonus: calculateItemStat(currentlyEquippedInSlot.type, "hpBonus", currentlyEquippedInSlot.rarity, currentlyEquippedInSlot.level),
        attackBonus: calculateItemStat(currentlyEquippedInSlot.type, "attackBonus", currentlyEquippedInSlot.rarity, currentlyEquippedInSlot.level),
        attackSpeedBonus: calculateItemStat(currentlyEquippedInSlot.type, "attackSpeedBonus", currentlyEquippedInSlot.rarity, currentlyEquippedInSlot.level),
        critChanceBonus: calculateItemStat(currentlyEquippedInSlot.type, "critChanceBonus", currentlyEquippedInSlot.rarity, currentlyEquippedInSlot.level),
        doubleStrikeChanceBonus: calculateItemStat(currentlyEquippedInSlot.type, "doubleStrikeChanceBonus", currentlyEquippedInSlot.rarity, currentlyEquippedInSlot.level),
    } : null;

    // Рассчитываем разницу статов
    const statDiffs = useMemo(() => {
        if (!currentlyEquippedInSlot || item.uid === currentlyEquippedInSlot.uid) return null;
        
        const diffs = {};
        const statKeys = ["hpBonus", "attackBonus", "attackSpeedBonus", "critChanceBonus", "doubleStrikeChanceBonus"];
        statKeys.forEach(key => {
            const selectedVal = selectedItemStats[key] || 0;
            const equippedVal = equippedInSlotStats[key] || 0;
            diffs[key.replace('Bonus','')] = selectedVal - equippedVal;
        });
        return diffs;
    }, [item, currentlyEquippedInSlot, selectedItemStats, equippedInSlotStats]);

    const isEquipped = equippedItems[item.type]?.uid === item.uid;

    // TODO: Логика получения стоимости улучшения здесь или передача через props
    // const goldCost = getGoldUpgradeCost(item.level, item.rarity);
    // const diamondCost = getDiamondUpgradeCost(item.level, item.rarity);
    // Пока оставим placeholder для отображения стоимости
    const displayUpgradeCost = () => {
        // if (item.level >= item.maxLevel) return "";
        // return `(${goldCost}💰 ${diamondCost > 0 ? diamondCost + '💎' : ''})`;
        return "(TODO: Cost)"; // Заглушка
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
                <button className="popup-close-x" onClick={onClose}>✖</button>

                <div className={`popup-header simple rarity-border-${item.rarity?.toLowerCase() || 'common'}`}>
                    <h3 className="popup-title">{item.name}</h3>
                    <div className="popup-subtitle">
                        <span className={`rarity-text rarity-${item.rarity?.toLowerCase() || 'common'}`}>
                            {item.rarity || 'Common'}
                        </span>
                        <span className="separator"> - </span>
                        <span className="item-type-text">{item.type || 'Предмет'}</span>
                    </div>
                </div>

                <div className="popup-body">
                    <div className="popup-main-row">
                        <div className="popup-left-col">
                            <div className={`popup-icon-area rarity-${item.rarity?.toLowerCase() || 'common'}`}>
                                <img src={item.image || "/assets/default-item.png"} alt={item.name} className="popup-icon"/>
                            </div>
                        </div>
                        <div className="popup-details-col">
                            {isEquipped && (item.maxLevel > 0 || item.level > 0) && (
                                <div className="item-level-display">
                                    <span className="label">Уровень:</span>
                                    <span className="value">{item.level || 0} / {item.maxLevel || MAX_ITEM_LEVEL}</span>
                                </div>
                            )}
                            {isEquipped && (item.maxLevel > 0 || item.level > 0) && 
                             (item.description || item.setId) && <hr className="popup-divider thin" />}

                            <div className="popup-stats-area">
                                {renderStatLine("💖 ХП", selectedItemStats.hpBonus, statDiffs?.hp, false)}
                                {renderStatLine("⚔️ Урон", selectedItemStats.attackBonus, statDiffs?.attack, false)}
                                {renderStatLine("💨 Скор. атаки", selectedItemStats.attackSpeedBonus, statDiffs?.attackSpeed, true)}
                                {renderStatLine("💥 Крит. шанс", selectedItemStats.critChanceBonus, statDiffs?.critChance, true)}
                                {renderStatLine("✌️ Двойной удар", selectedItemStats.doubleStrikeChanceBonus, statDiffs?.doubleStrike, true)}
                                {![
                                    selectedItemStats.hpBonus, selectedItemStats.attackBonus, selectedItemStats.attackSpeedBonus,
                                    selectedItemStats.critChanceBonus, selectedItemStats.doubleStrikeChanceBonus
                                ].some(stat => stat !== undefined && stat !== 0) && (
                                    <p className="no-stats">Нет базовых характеристик</p>
                                )}
                            </div>

                            {item.description && (
                                <>
                                    <hr className="popup-divider" />
                                    <div className="popup-description-area">
                                        <p>{item.description}</p>
                                    </div>
                                </>
                            )}
                            {item.setId && (
                                <>
                                    <hr className="popup-divider" />
                                    <div className="popup-set-bonus-area">
                                        <h4>Бонус Комплекта (Placeholder)</h4>
                                        <p>Принадлежит к комплекту: {item.setId}</p>
                                        {/* TODO: Логика отображения прогресса сета */}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="popup-buttons">
                    {isEquipped ? (
                        <>
                            <button className="button-unequip" onClick={() => onUnequipItem(item.type)}>Снять</button>
                            {item.maxLevel > 0 && ( // Используем item.maxLevel из определения предмета
                                <button
                                    className="button-upgrade"
                                    disabled={item.level >= (item.maxLevel || MAX_ITEM_LEVEL) /* || !canAffordUpgrade */}
                                    onClick={() => onUpgradeItem(item)}
                                >
                                    Улучшить {item.level < (item.maxLevel || MAX_ITEM_LEVEL) ? `(${(item.level || 0) + 1})` : '(Макс)'}
                                    <span className="upgrade-cost"> {displayUpgradeCost()}</span>
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <button 
                                className={currentlyEquippedInSlot ? "button-change" : "button-equip"} 
                                onClick={() => onEquipItem(item)}
                            >
                                {currentlyEquippedInSlot ? "Поменять" : "Экипировать"}
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ItemDetailPopup;