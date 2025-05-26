// src/components/Inventory.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // <<< --- ДОБАВЛЕН ЭТОТ ИМПОРТ
import useGameStore from '../../store/useGameStore.js';
import { shallow } from "zustand/shallow";
import "./Inventory.scss";
import CharacterViewer from "../CharacterViewer";
import ArtifactsPanel from "./ArtifactsPanel";
import InventoryTabs from "../InventoryTabs";
import ItemDetailPopup from "../popups/ItemDetailPopup"; // <--- Убедитесь, что путь правильный, если он был изменен
import {
    MAX_ITEM_LEVEL,
    getGoldUpgradeCost,    // <<< Убедитесь, что это используется или удалите, если нет
    getDiamondUpgradeCost  // <<< Убедитесь, что это используется или удалите, если нет
} from '../../data/itemsDatabase.js';

// --- Логика сортировки ---
const rarityOrder = {
    common: 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
    mythic: 5
};
// getRarityValue теперь использует toLowerCase() для большей надежности
const getRarityValue = (item) => rarityOrder[item?.rarity?.toLowerCase()] || 0;

// --- Анимации ---
const layoutTransitionVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.25, ease: "easeInOut" } },
    exit: { opacity: 0, transition: { duration: 0.15, ease: "easeInOut" } }
};
const contentTransitionVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.1 }}
};
const arrowVariants = {
    initial: (custom) => ({
        opacity: 0,
        x: `calc(-50% + ${custom.offsetX}px)`,
        y: custom.type === 'gain' ? '130px' : '-130px',
        scale: 0.7
    }),
    animate: (custom) => ({
        opacity: [0, 1, 1, 0],
        x: `calc(-50% + ${custom.offsetX}px)`,
        y: custom.type === 'gain' ? '-130px' : '130px',
        scale: 1,
        transition: {
            duration: 1.4,
            delay: custom.delay,
            ease: "linear",
            opacity: { times: [0, 0.1, 0.9, 1], duration: 1.4 }
        }
    }),
};
const arrowContainerVariants = { exit: { opacity: 0, transition: { duration: 0.1 } } };

const formatPower = (power) => {
    if (power == null || isNaN(power)) return '...';
    if (power < 1000) {
        return power.toString();
    }
    const valueInK = power / 1000;
    const truncatedToOneDecimal = Math.floor(valueInK * 10) / 10;
    let formattedNumber = truncatedToOneDecimal.toFixed(1);
    formattedNumber = formattedNumber.replace('.', ',');
    return `${formattedNumber}K`;
};

// ▼▼▼ ИЗМЕНЕНИЕ: Удаляем setShowForge из пропсов, так как будем использовать useNavigate ▼▼▼
const Inventory = () => { // ▲▲▲--------------------------------------------------------------------------------▲▲▲
    const {
        inventory, gold, diamonds, isAnyRecipeCraftable,
        equipItem, equipped, unequipItem, /* setEquipped, */ playerStats, powerLevel, // setEquipped было в вашем коде, но не в эталонном. Решите, нужно ли оно.
        // ▼▼▼ ДОБАВЛЯЕМ startScreenTransition ▼▼▼
        startScreenTransition
        // ▲▲▲-------------------------------▲▲▲
    } = useGameStore(
        (state) => ({
            inventory: state.inventory, gold: state.gold, diamonds: state.diamonds,
            isAnyRecipeCraftable: state.isAnyRecipeCraftable,
            equipItem: state.equipItem, equipped: state.equipped,
            unequipItem: state.unequipItem, // setEquipped: state.setEquipped,
            playerStats: state.computedStats ? state.computedStats() : state.playerStats,
            powerLevel: state.powerLevel,
            // ▼▼▼ ДОБАВЛЯЕМ startScreenTransition В ВЫБОРКУ ▼▼▼
            startScreenTransition: state.startScreenTransition
            // ▲▲▲------------------------------------------▲▲▲
        }),
        shallow
    );
        const markItemAsSeen = useGameStore(state => state.markItemAsSeen); // Получаем действие
            const markAllDisplayedNewItemsAsOld = useGameStore(state => state.markAllDisplayedNewItemsAsOld);
    const [showSwapPopup, setShowSwapPopup] = useState(false);
const [swapData, setSwapData] = useState({
    candidateItem: null,        // Предмет, который мы хотим надеть
    currentlyEquippedItem: null, // Предмет, который сейчас в слоте
    slotType: null
});
    const [selectedItem, setSelectedItem] = useState(null);
    const [powerChangeEffect, setPowerChangeEffect] = useState({ type: null, key: 0 });
    const [internalActiveTab, setInternalActiveTab] = useState("gear");
    const [sortOrder, setSortOrder] = useState('desc');

    // ▼▼▼ ДОБАВЛЯЕМ useNavigate ▼▼▼
    const navigate = useNavigate();
    // ▲▲▲-----------------------▲▲▲

    // canForge остается, так как может использоваться для индикатора на кнопке
    const canForge = useMemo(() => isAnyRecipeCraftable(), [isAnyRecipeCraftable, inventory, gold, diamonds]);


    useEffect(() => {
        console.log('[Inventory.jsx] Received inventory update:', JSON.parse(JSON.stringify(inventory)));
        console.log('[Inventory.jsx] Inventory length:', inventory.length);
    }, [inventory]);

    const handleArtifactPowerChange = useCallback((oldPower, newPower) => {
        console.log(`Inventory получил сигнал об изменении силы от артефакта: ${oldPower} -> ${newPower}`);
    }, []);

    const triggerPowerChangeEffect = (oldPower, newPower, effectKey) => {
        if (oldPower !== newPower) {
            const effectType = newPower > oldPower ? 'gain' : 'loss';
            setPowerChangeEffect({ type: effectType, key: effectKey });
            const arrowAnimationDuration = 1400;
            setTimeout(() => {
                setPowerChangeEffect(prev => (prev.key === effectKey ? { type: null, key: 0 } : prev));
            }, arrowAnimationDuration);
        }
    }

    useEffect(() => {
        // Эта функция (возвращаемая из useEffect) будет вызвана, 
        // когда компонент Inventory будет размонтирован (например, при переходе на другой экран).
        return () => {
            // console.log('[Inventory.jsx] Unmounting. Marking all new items as "seen".');
            markAllDisplayedNewItemsAsOld();
        };
    }, [markAllDisplayedNewItemsAsOld]); // Зависимость нужна, чтобы ESLint не ругался и для стабильности
    // ▲▲▲ КОНЕЦ useEffect ▲▲▲
const handleEquip = (itemToEquipFromDetailPopup) => { // itemToEquipFromDetailPopup - это 'item' из ItemDetailPopup
    const slotType = itemToEquipFromDetailPopup.type;
    const currentlyEquippedInSlot = equipped[slotType]; // 'equipped' из useGameStore

    if (currentlyEquippedInSlot && currentlyEquippedInSlot.uid !== itemToEquipFromDetailPopup.uid) {
        // Если слот занят другим предметом, открываем SwapPopup
        setSwapData({
            candidateItem: itemToEquipFromDetailPopup,
            currentlyEquippedItem: currentlyEquippedInSlot,
            slotType: slotType
        });
        setShowSwapPopup(true);
        setSelectedItem(null); // Закрываем ItemDetailPopup
    } else if (!currentlyEquippedInSlot) {
        // Если слот пуст, просто экипируем
        const oldPower = useGameStore.getState().powerLevel;
        equipItem(itemToEquipFromDetailPopup); // 'equipItem' - экшен из useGameStore
        setSelectedItem(null); // Закрываем ItemDetailPopup
        requestAnimationFrame(() => {
            const newPower = useGameStore.getState().powerLevel;
            triggerPowerChangeEffect(oldPower, newPower, Date.now() + '_equip');
        });
    }
    // Если currentlyEquippedInSlot.uid === itemToEquipFromDetailPopup.uid, ничего не делаем (предмет уже надет)
};

const handleConfirmSwapActual = (newItemToEquip) => {
    const oldPower = useGameStore.getState().powerLevel;
    equipItem(newItemToEquip); // Экшен equipItem из useGameStore должен сам позаботиться о возврате старого предмета в инвентарь

    setShowSwapPopup(false);
    setSwapData({ candidateItem: null, currentlyEquippedItem: null, slotType: null }); // Сбрасываем данные

    requestAnimationFrame(() => {
        const newPower = useGameStore.getState().powerLevel;
        triggerPowerChangeEffect(oldPower, newPower, Date.now() + '_swap_equip_confirm');
    });
};

    const handleUnequip = (slot) => {
        const oldPower = useGameStore.getState().powerLevel;
        unequipItem(slot);
        setSelectedItem(null);
        requestAnimationFrame(() => {
            const newPower = useGameStore.getState().powerLevel;
            triggerPowerChangeEffect(oldPower, newPower, Date.now() + '_unequip');
        });
    };

    const handleUpgradeClick = (itemToUpgradeFromPopup) => {
        if (!itemToUpgradeFromPopup) return;
        const { upgradeItem } = useGameStore.getState();
        const success = upgradeItem(itemToUpgradeFromPopup); // Передаем весь объект

        if (success) {
            let updatedItemInStore;
            const currentEquipped = useGameStore.getState().equipped;
            if (currentEquipped[itemToUpgradeFromPopup.type]?.uid === itemToUpgradeFromPopup.uid) {
                updatedItemInStore = currentEquipped[itemToUpgradeFromPopup.type];
            } else {
                updatedItemInStore = useGameStore.getState().inventory.find(invItem => invItem.uid === itemToUpgradeFromPopup.uid);
            }
            if (updatedItemInStore) setSelectedItem(updatedItemInStore);
            else setSelectedItem(null);
        } else {
            // alert("Не удалось улучшить предмет.");
        }
    };

const sortConfigurations = useMemo(() => [
        { type: 'newness', direction: 'desc', label: 'Newness' }, // <-- Это будет по умолчанию
        { type: 'rarity',  direction: 'desc', label: 'Quality' },
        { type: 'level',   direction: 'desc', label: 'Level' },
    ], []);

    // Индекс начальной конфигурации (Новизна, новые сверху)
    const initialSortConfigIndex = 0; 

    const [currentSortConfigIndex, setCurrentSortConfigIndex] = useState(initialSortConfigIndex);
    const [sortConfig, setSortConfig] = useState(sortConfigurations[initialSortConfigIndex]);

    const handleSortChange = useCallback(() => {
        setCurrentSortConfigIndex(prevIndex => {
            const nextIndex = (prevIndex + 1) % sortConfigurations.length;
            setSortConfig(sortConfigurations[nextIndex]);
            return nextIndex;
        });
    }, [sortConfigurations]); // Добавили sortConfigurations в зависимости useCallback
    // ▲▲▲ КОНЕЦ ОБНОВЛЕННОЙ КОНФИГУРАЦИИ СОРТИРОВОК ▲▲▲


const sortedInventory = useMemo(() => {
        // Эта функция остается без изменений, т.к. она уже использует sortConfig.type и sortConfig.direction
        // и включает логику для 'rarity', 'level' и 'newness'.
        return [...inventory].sort((itemA, itemB) => {
            let comparison = 0;
            switch (sortConfig.type) {
                case 'rarity':
                    const valueA_rarity = getRarityValue(itemA);
                    const valueB_rarity = getRarityValue(itemB);
                    comparison = valueA_rarity - valueB_rarity;
                    break;
                case 'level':
                    const levelA = itemA.level || 0;
                    const levelB = itemB.level || 0;
                    comparison = levelA - levelB;
                    break;
                case 'newness':
                    const timeA = itemA.receivedTimestamp || 0;
                    const timeB = itemB.receivedTimestamp || 0;
                    comparison = timeA - timeB;
                    break;
                default:
                    comparison = 0;
            }
            return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
        });
    }, [inventory, sortConfig]);

    // ▼▼▼ НОВАЯ ФУНКЦИЯ ДЛЯ ПЕРЕХОДА В КУЗНИЦУ ▼▼▼
    const handleGoToForge = useCallback(() => {
        if (startScreenTransition) {
            // Предполагаем, что при переходе из Инвентаря в Кузницу BottomNav остается видимым
            startScreenTransition(() => navigate('/forge'), { preservesBottomNav: true });
        } else {
            navigate('/forge');
        }
    }, [navigate, startScreenTransition]);
    // ▲▲▲-----------------------------------------▲▲▲

    return (
        <div className="inventory">
            <AnimatePresence initial={false} mode="wait">
                {internalActiveTab !== 'artifacts' ? (
                    <motion.div
                        key="normal-layout"
                        className="inventory-layout inventory-layout--normal"
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={layoutTransitionVariants}
                    >
                        <div className="character-section">
                            <div className="character-equip">
    <div className="left-column">
        <div className={`equipment-slot ${equipped.weapon ? 'rarity-' + equipped.weapon.rarity.toLowerCase() : 'empty'}`} onClick={() => equipped.weapon && setSelectedItem(equipped.weapon)}>
            {equipped.weapon ? (
                <>
                    <img src={equipped.weapon.image || "/assets/default-item.png"} alt="weapon"/>
                    {equipped.weapon.level > 0 && (
                        <div className="equipped-item-level-badge">
                            Lvl {equipped.weapon.level}
                        </div>
                    )}
                </>
            ) : <div className="empty-slot">⚔️</div>}
        </div>
        <div className={`equipment-slot ${equipped.amulet ? 'rarity-' + equipped.amulet.rarity.toLowerCase() : 'empty'}`} onClick={() => equipped.amulet && setSelectedItem(equipped.amulet)}>
            {equipped.amulet ? (
                <>
                    <img src={equipped.amulet.image || "/assets/default-item.png"} alt="amulet"/>
                    {equipped.amulet.level > 0 && (
                        <div className="equipped-item-level-badge">
                            Lvl {equipped.amulet.level}
                        </div>
                    )}
                </>
            ) : <div className="empty-slot">📿</div>}
        </div>
        <div className={`equipment-slot ${equipped.ring ? 'rarity-' + equipped.ring.rarity.toLowerCase() : 'empty'}`} onClick={() => equipped.ring && setSelectedItem(equipped.ring)}>
            {equipped.ring ? (
                <>
                    <img src={equipped.ring.image || "/assets/default-item.png"} alt="ring"/>
                    {equipped.ring.level > 0 && (
                        <div className="equipped-item-level-badge">
                            Lvl {equipped.ring.level}
                        </div>
                    )}
                </>
            ) : <div className="empty-slot">💍</div>}
        </div>
    </div>
                                <div className="character-model">
                                    <CharacterViewer modelPath={playerStats?.skin || "/Models/character.glb"} />
                                    <AnimatePresence>
                                        {powerChangeEffect.type && (
                                            <motion.div
                                                key={powerChangeEffect.key}
                                                className={`power-arrows-container ${powerChangeEffect.type}`}
                                                initial="initial" animate="animate" exit="initial"
                                                variants={arrowContainerVariants}
                                            >
                                            {(() => {
                                                const columnOffset = 30; const staggerDelay = 0.05;
                                                return Array.from({ length: 9 }).map((_, i) => {
                                                    const columnIndex = Math.floor(i / 3); const rowIndex = i % 3;
                                                    let offsetXValue = 0;
                                                    if (columnIndex === 0) { offsetXValue = -columnOffset; }
                                                    else if (columnIndex === 2) { offsetXValue = columnOffset; }
                                                    const calculatedDelay = rowIndex * staggerDelay;
                                                    const customProps = { type: powerChangeEffect.type, offsetX: offsetXValue, delay: calculatedDelay };
                                                    return (
                                                        <motion.img
                                                            key={i} className="power-arrow"
                                                            src={powerChangeEffect.type === 'gain' ? '/assets/green-arrow.png' : '/assets/red-arrow.png'}
                                                            alt={powerChangeEffect.type === 'gain' ? 'Power Up' : 'Power Down'}
                                                            variants={arrowVariants} custom={customProps}
                                                            initial="initial" animate="animate"
                                                        />
                                                    );
                                                });
                                            })()}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="right-column">
        <div className={`equipment-slot ${equipped.helmet ? 'rarity-' + equipped.helmet.rarity.toLowerCase() : 'empty'}`} onClick={() => equipped.helmet && setSelectedItem(equipped.helmet)}>
            {equipped.helmet ? (
                <>
                    <img src={equipped.helmet.image || "/assets/default-item.png"} alt="helmet"/>
                    {equipped.helmet.level > 0 && (
                        <div className="equipped-item-level-badge">
                            Lvl {equipped.helmet.level}
                        </div>
                    )}
                </>
            ) : <div className="empty-slot">🪖</div>}
        </div>
        <div className={`equipment-slot ${equipped.armor ? 'rarity-' + equipped.armor.rarity.toLowerCase() : 'empty'}`} onClick={() => equipped.armor && setSelectedItem(equipped.armor)}>
            {equipped.armor ? (
                <>
                    <img src={equipped.armor.image || "/assets/default-item.png"} alt="armor"/>
                    {equipped.armor.level > 0 && (
                        <div className="equipped-item-level-badge">
                            Lvl {equipped.armor.level}
                        </div>
                    )}
                </>
            ) : <div className="empty-slot">🛡️</div>}
        </div>
        <div className={`equipment-slot ${equipped.boots ? 'rarity-' + equipped.boots.rarity.toLowerCase() : 'empty'}`} onClick={() => equipped.boots && setSelectedItem(equipped.boots)}>
            {equipped.boots ? (
                <>
                    <img src={equipped.boots.image || "/assets/default-item.png"} alt="boots"/>
                    {equipped.boots.level > 0 && (
                        <div className="equipped-item-level-badge">
                            Lvl {equipped.boots.level}
                        </div>
                    )}
                </>
            ) : <div className="empty-slot">🥾</div>}
        </div>
    </div>
</div> {/* Конец .character-equip */}

                            <div className="inventory-power-display">
                                <span className="inventory-power-label">Power: </span>
                                <span className="inventory-power-value">{formatPower(powerLevel)}</span>
                            </div>
                        </div> {/* Конец .character-section */}

<div 
        className={`
            content-section 
            ${internalActiveTab === 'stats' ? 'content-section--fit-content' : ''}
        `}
    >                            <InventoryTabs
                                className="inventory-tabs"
                                activeTab={internalActiveTab}
                                setActiveTab={setInternalActiveTab}
                                position="middle"
                            />
                           {internalActiveTab === 'gear' && (
               <div className="inventory-action-buttons-wrapper">
    <button onClick={handleSortChange} className="inventory-sort-button">
        by {sortConfig.label} 
    </button>
    {/* ▼▼▼ КНОПКА "FORGE" БЕЗ ИЗОБРАЖЕНИЯ ▼▼▼ */}
    <button onClick={handleGoToForge} className="inventory-forge-button">
        Forge {/* Текст кнопки */}
        {canForge && <span className="forge-indicator">!</span>} {/* Индикатор крафта, если нужен */}
    </button>
    {/* ▲▲▲ КОНЕЦ КНОПКИ "FORGE" БЕЗ ИЗОБРАЖЕНИЯ ▲▲▲ */}
</div>  
            )}
                            <div 
    className={`
        inventory-main-area 
        inventory-main-area--normal 
        ${internalActiveTab === 'stats' ? 'inventory-main-area--fit-content' : ''}
    `}
>
                                <AnimatePresence initial={false} mode="wait">
                                    {internalActiveTab === 'stats' && (
                                        <motion.div
                                            key="stats-panel"
                                            variants={contentTransitionVariants}
                                            initial="initial" animate="animate" exit="exit"
                                            className="stats-panel"
                                        >
                                            <p data-icon="💖"> <span className="stat-label">Health</span> <span className="stat-value">{playerStats?.hp ?? '-'}</span> </p>
                                            <p data-icon="⚔️"> <span className="stat-label">Attack</span> <span className="stat-value">{playerStats?.attack ?? '-'}</span> </p>
                                            <p data-icon="💨"> <span className="stat-label">Attack Speed</span> <span className="stat-value">{(playerStats?.attackSpeed ?? 0).toFixed ? (playerStats.attackSpeed).toFixed(2) : '-'}</span> </p>
                                            <p data-icon="💥"> <span className="stat-label">Crit Strike</span> <span className="stat-value">{playerStats?.critChance ?? '-'}%</span> </p>
                                            <p data-icon="✌️"> <span className="stat-label">Double Strike</span> <span className="stat-value">{playerStats?.doubleStrikeChance ?? '-'}%</span> </p>
                                           
                                        </motion.div>
                                    )}
                                    {internalActiveTab === 'gear' && (
                                        <motion.div
                                            key="gear-panel"
                                            variants={contentTransitionVariants}
                                            initial="initial" animate="animate" exit="exit"
                                            className="inventory-gear-wrapper"
                                        >
                                             <div className="inventory-scroll-wrapper">
                        <div className="inventory-items">
                           {sortedInventory.map((item) => (
    <div
        key={item.uid || item.id}
        className={`inventory-item rarity-${(item.rarity || "common").toLowerCase()}`}
        onClick={() => {
            setSelectedItem(item);
            if (item.isNew && item.uid) {
                // Если вы оставили индивидуальную пометку, она здесь
                // markItemAsSeen(item.uid); 
            }
        }}
    >
        <img src={item.image || "/assets/default-item.png"} alt={item.name} />
        {equipped[item.type]?.uid === item.uid && <div className="equipped-indicator">E</div>}
        {item.isNew && <div className="new-item-label">NEW</div>}
        {/* ▼▼▼ ДОБАВЛЕНИЕ ОТОБРАЖЕНИЯ УРОВНЯ ▼▼▼ */}
        {item.level && item.level > 0 && ( // Показываем, если уровень есть и больше 0 (или просто item.level, если он всегда есть)
            <div className="item-level-badge">
                <span className="level-text">Lvl</span> {item.level}
            </div>
        )}
        {/* ▲▲▲ КОНЕЦ ОТОБРАЖЕНИЯ УРОВНЯ ▲▲▲ */}
    </div>
))}
                            {sortedInventory.length === 0 && <p className="empty-inventory-message">Инвентарь пуст</p>}
                        </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div> {/* Конец .inventory-main-area */}
                        </div> {/* Конец .content-section */}
                    </motion.div> /* Конец .inventory-layout--normal */
                ) : (
                    <motion.div
                        key="artifacts-layout"
                        className="inventory-layout inventory-layout--artifacts"
                        initial="initial" animate="animate" exit="exit"
                        variants={layoutTransitionVariants}
                    >
                        <InventoryTabs
                            activeTab={internalActiveTab}
                            setActiveTab={setInternalActiveTab}
                            position="top"
                        />
                        <div className="content-section content-section--artifacts">
                            <div className="inventory-main-area inventory-main-area--artifacts">
                                <ArtifactsPanel onPowerChange={handleArtifactPowerChange} />
                            </div>
                        </div>
                    </motion.div> /* Конец .inventory-layout--artifacts */
                )}
            </AnimatePresence>

                  <AnimatePresence>
                    {selectedItem && (
                     <ItemDetailPopup
                        key="item-detail-popup"
                        item={selectedItem}
                        equippedItems={equipped} // Это уже есть
                        inventory={inventory}    // <<< ДОБАВЬТЕ ЭТОТ ПРОП
                        onClose={() => setSelectedItem(null)}
                        onEquipItem={handleEquip}
                        onUnequipItem={handleUnequip}
                        onUpgradeItem={handleUpgradeClick}
                        getGoldUpgradeCost={getGoldUpgradeCost}
                        getDiamondUpgradeCost={getDiamondUpgradeCost}
                        playerGold={gold}
                        playerDiamonds={diamonds}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
    {showSwapPopup && swapData.currentlyEquippedItem && swapData.candidateItem && (
        <SwapItemPopup
            isOpen={showSwapPopup}
            onClose={() => {
                setShowSwapPopup(false);
                setSwapData({ candidateItem: null, currentlyEquippedItem: null, slotType: null });
            }}
            currentlyEquippedItem={swapData.currentlyEquippedItem}
            candidateItem={swapData.candidateItem}
            inventory={inventory} // Передаем весь инвентарь для фильтрации
            slotType={swapData.slotType}
            onConfirmSwap={handleConfirmSwapActual}
        />
    )}
</AnimatePresence>
        </div> // Конец .inventory
    );
};

export default Inventory;