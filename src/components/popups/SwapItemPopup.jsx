// src/components/popups/SwapItemPopup.jsx
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion'; // AnimatePresence убран, т.к.isOpen управляется родителем
import './SwapItemPopup.scss';
import { calculateItemStat } from '../../data/itemsDatabase';

// Анимации можно взять из ItemDetailPopup или определить новые
const popupBackdropVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
};
const popupContentVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
};

const ItemDisplayCard = ({ item, isSelected, onClick, displayMode = 'full' }) => { // Новый проп displayMode
    if (!item) {
        // Для единообразия размеров, пустой слот тоже может быть 'iconOnly' или 'full'
        return (
            <div 
                className={`item-display-card empty fixed-size ${displayMode === 'iconOnly' ? 'icon-only-mode' : 'full-mode'}`}
            >
                {displayMode === 'iconOnly' ? '' : 'Выберите предмет'}
            </div>
        );
    }

    const itemLevel = item.level || 1;
    const itemRarityClass = `rarity-${item.rarity?.toLowerCase() || 'common'}`;

    // Для режима iconOnly, полное имя и уровень будут в title для подсказки при наведении
    const cardTitle = displayMode === 'iconOnly' ? `${item.name} (Lvl ${itemLevel})` : item.name;

    return (
        <div
            className={`item-display-card fixed-size ${displayMode === 'iconOnly' ? 'icon-only-mode' : 'full-mode'} ${itemRarityClass} ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
            title={cardTitle}
        >
            <div className={`item-card-icon-area ${itemRarityClass}`}>
                <img src={item.image || "/assets/default-item.png"} alt={item.name} className="item-card-icon"/>
            </div>
            
            {/* Название и уровень показываем только если displayMode не 'iconOnly' */}
            {displayMode !== 'iconOnly' && (
                <>
                    <div className="item-card-name-wrapper">
                        <div className="item-card-name">{item.name}</div>
                    </div>
                    <div className="item-card-level">Lvl {itemLevel}</div>
                </>
            )}
        </div>
    );
};
const StatComparisonRow = ({ label, currentValue, valueToCompare, isPercent }) => {
    const formatDisplayValue = (val) => {
        if (val === null || val === undefined || Number.isNaN(Number(val))) return '-';
        const numVal = Number(val);
        return isPercent ? `${(numVal * 100).toFixed(1)}%` : String(Math.round(numVal));
    };

    const displayCurrentValue = formatDisplayValue(currentValue);
    let valueClass = 'neutral';
    const numCurrent = Number(currentValue);
    const numCompare = Number(valueToCompare);

    if (!Number.isNaN(numCurrent) && !Number.isNaN(numCompare)) {
        if (numCurrent > numCompare) valueClass = 'better';
        else if (numCurrent < numCompare) valueClass = 'worse';
    } else if (!Number.isNaN(numCurrent) && (valueToCompare === null || valueToCompare === undefined || Number.isNaN(numCompare))) {
        // Если у текущего предмета есть стат, а у сравниваемого нет, можно считать "лучше"
        // valueClass = 'better'; // Раскомментируйте, если такое поведение предпочтительно
    }

    return (
        <div className="stat-comparison-row">
            <span className="stat-label">{label}:</span>
            <span className={`stat-value ${valueClass}`}>{displayCurrentValue}</span>
        </div>
    );
};

const SwapItemPopup = ({
    isOpen, // isOpen будет управлять AnimatePresence в родительском компоненте
    onClose,
    currentlyEquippedItem,
    candidateItem,
    inventory,
    slotType,
    onConfirmSwap
    // onUnequipCurrentItem ПРОП УДАЛЕН
}) => {
    // if (!isOpen) return null; // Не нужен, если управляется AnimatePresence в родителе

    const [selectedForSwap, setSelectedForSwap] = useState(candidateItem);

    const getFullStatsForItem = (item) => {
        if (!item) return null;
        return {
            hp: calculateItemStat(item.type, "hpBonus", item.rarity, item.level || 1),
            attack: calculateItemStat(item.type, "attackBonus", item.rarity, item.level || 1),
            attackSpeed: calculateItemStat(item.type, "attackSpeedBonus", item.rarity, item.level || 1),
            critChance: calculateItemStat(item.type, "critChanceBonus", item.rarity, item.level || 1),
            doubleStrike: calculateItemStat(item.type, "doubleStrikeChanceBonus", item.rarity, item.level || 1),
        };
    };

    const equippedItemFullStats = useMemo(() => getFullStatsForItem(currentlyEquippedItem), [currentlyEquippedItem]);
    const selectedForSwapFullStats = useMemo(() => getFullStatsForItem(selectedForSwap), [selectedForSwap]);

    const swappableItems = useMemo(() => {
        if (!currentlyEquippedItem || !inventory) return []; // Добавлена проверка
        return inventory.filter(
            invItem => invItem.type === slotType && invItem.uid !== currentlyEquippedItem.uid
        ).sort(/* Ваша логика сортировки */);
    }, [inventory, slotType, currentlyEquippedItem]);

    const handleConfirm = () => {
        if (selectedForSwap) {
            onConfirmSwap(selectedForSwap);
        }
    };
    
    const statDefinitions = [
        { key: 'hp', label: 'Здоровье', isPercent: false },
        { key: 'attack', label: 'Атака', isPercent: false },
        { key: 'attackSpeed', label: 'Скор. Атаки', isPercent: true },
        { key: 'critChance', label: 'Крит. Шанс', isPercent: true },
        { key: 'doubleStrike', label: 'Двойной Удар', isPercent: true },
    ];

    return (
        <motion.div 
            className="item-popup-backdrop swap-popup-backdrop" 
            variants={popupBackdropVariants}
            initial="initial" 
            animate="animate" 
            exit="exit"
            onClick={onClose}
        >
            <motion.div 
                className="item-popup-content swap-popup-content" 
                variants={popupContentVariants}
                onClick={(e) => e.stopPropagation()}
            >
                <button className="popup-close-x" onClick={onClose}>✖</button>
                <h3 className="swap-popup-title">Swap item</h3>
                
                <div className="swap-main-display-area">
                    {/* Левая колонка: Сейчас надето */}
                    <div className="item-display-column">
                        <h4 className="panel-title">Equipped</h4>
                        <ItemDisplayCard item={currentlyEquippedItem} isSelected={false} showMinimalStats={false} />
                        {equippedItemFullStats && (
                            <div className="stats-preview-column">
                                {statDefinitions.map(statDef => {
                                    const val = equippedItemFullStats[statDef.key];
                                    // ▼▼▼ 1. Не отображаем стат, если его значение 0 (или null/undefined) ▼▼▼
                                    if (val === 0 || val === null || val === undefined) return null; 
                                    
                                    const compareVal = selectedForSwapFullStats ? selectedForSwapFullStats[statDef.key] : null;
                                    return (
                                        <StatComparisonRow 
                                            key={`eq-${statDef.key}`}
                                            label={statDef.label} 
                                            currentValue={val} 
                                            valueToCompare={compareVal}
                                            isPercent={statDef.isPercent} 
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    
                    <div className="swap-arrow-indicator">⇄</div>

                    {/* Правая колонка: Будет надето */}
                    <div className="item-display-column">
                        <h4 className="panel-title">Equip</h4>
                        {selectedForSwap ? (
                            <ItemDisplayCard item={selectedForSwap} isSelected={true} showMinimalStats={false} />
                        ) : (
                            // Используем ItemDisplayCard с пропсами для плейсхолдера
                            <ItemDisplayCard isPlaceholder={true} placeholderText="Выберите предмет" />
                        )}
                         {selectedForSwapFullStats && selectedForSwap && (
                            <div className="stats-preview-column">
                                {statDefinitions.map(statDef => {
                                     const val = selectedForSwapFullStats[statDef.key];
                                     // ▼▼▼ 1. Не отображаем стат, если его значение 0 (или null/undefined) ▼▼▼
                                     if (val === 0 || val === null || val === undefined) return null;
                                     
                                     const compareVal = equippedItemFullStats ? equippedItemFullStats[statDef.key] : null;
                                     return (
                                        <StatComparisonRow 
                                            key={`sel-${statDef.key}`}
                                            label={statDef.label} 
                                            currentValue={val} 
                                            valueToCompare={compareVal} // Здесь сравниваем значение выбранного предмета с текущим надетым
                                            isPercent={statDef.isPercent} 
                                        />
                                    );
                                 })}
                            </div>
                        )}
                    </div>
                </div>

               <div className="swap-inventory-grid-title">Replace with:</div>
                <div className="swap-inventory-grid">
                    {swappableItems.map(item => (
                        <ItemDisplayCard 
                            key={item.uid} 
                            item={item} 
                            isSelected={selectedForSwap?.uid === item.uid}
                            onClick={() => setSelectedForSwap(item)}
                            displayMode="iconOnly" // <<< УКАЗЫВАЕМ РЕЖИМ ДЛЯ СЕТКИ
                        />
                    ))} : <p className="no-items-message">Нет подходящих предметов.</p> 
                </div>

                <div className="popup-buttons swap-popup-buttons">
                    <button className="button-action button-secondary" onClick={onClose}>Отмена</button>
                    {/* ▼▼▼ 3. Кнопка "Снять текущий" УДАЛЕНА ▼▼▼ */}
                    <button 
                        className="button-action button-primary" 
                        onClick={handleConfirm}
                        disabled={!selectedForSwap || (currentlyEquippedItem && selectedForSwap.uid === currentlyEquippedItem.uid)}
                    >
                        Подтвердить
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SwapItemPopup;