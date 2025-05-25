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

    const handleEquip = (item) => {
        const oldPower = useGameStore.getState().powerLevel;
        equipItem(item);
        setSelectedItem(null);
        requestAnimationFrame(() => {
            const newPower = useGameStore.getState().powerLevel;
            triggerPowerChangeEffect(oldPower, newPower, Date.now() + '_equip');
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

    // Этот useEffect дублировался, оставляем один
    // useEffect(() => {
    //  console.log('[Inventory.jsx] Received inventory update:', JSON.parse(JSON.stringify(inventory)));
    //  console.log('[Inventory.jsx] Inventory length:', inventory.length);
    // }, [inventory]);

    const sortedInventory = useMemo(() => {
        return [...inventory].sort((itemA, itemB) => {
            const valueA = getRarityValue(itemA); const valueB = getRarityValue(itemB);
            return sortOrder === 'desc' ? valueB - valueA : valueA - valueB; });
    }, [inventory, sortOrder]);
    const toggleSortOrder = () => { setSortOrder(prevOrder => prevOrder === 'desc' ? 'asc' : 'desc'); };

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
                                        {equipped.weapon ? <img src={equipped.weapon.image || "/assets/default-item.png"} alt="weapon"/> : <div className="empty-slot">⚔️</div>}
                                    </div>
                                    <div className={`equipment-slot ${equipped.amulet ? 'rarity-' + equipped.amulet.rarity.toLowerCase() : 'empty'}`} onClick={() => equipped.amulet && setSelectedItem(equipped.amulet)}>
                                        {equipped.amulet ? <img src={equipped.amulet.image || "/assets/default-item.png"} alt="amulet"/> : <div className="empty-slot">📿</div>}
                                    </div>
                                    <div className={`equipment-slot ${equipped.ring ? 'rarity-' + equipped.ring.rarity.toLowerCase() : 'empty'}`} onClick={() => equipped.ring && setSelectedItem(equipped.ring)}>
                                        {equipped.ring ? <img src={equipped.ring.image || "/assets/default-item.png"} alt="ring"/> : <div className="empty-slot">💍</div>}
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
                                        {equipped.helmet ? <img src={equipped.helmet.image || "/assets/default-item.png"} alt="helmet"/> : <div className="empty-slot">🪖</div>}
                                    </div>
                                    <div className={`equipment-slot ${equipped.armor ? 'rarity-' + equipped.armor.rarity.toLowerCase() : 'empty'}`} onClick={() => equipped.armor && setSelectedItem(equipped.armor)}>
                                        {equipped.armor ? <img src={equipped.armor.image || "/assets/default-item.png"} alt="armor"/> : <div className="empty-slot">🛡️</div>}
                                    </div>
                                    <div className={`equipment-slot ${equipped.boots ? 'rarity-' + equipped.boots.rarity.toLowerCase() : 'empty'}`} onClick={() => equipped.boots && setSelectedItem(equipped.boots)}>
                                        {equipped.boots ? <img src={equipped.boots.image || "/assets/default-item.png"} alt="boots"/> : <div className="empty-slot">🥾</div>}
                                    </div>
                                </div>
                            </div> {/* Конец .character-equip */}

                            <div className="inventory-power-display">
                                <span className="inventory-power-label">Power: </span>
                                <span className="inventory-power-value">{formatPower(powerLevel)}</span>
                            </div>
                        </div> {/* Конец .character-section */}

                        <div className="content-section">
                            <InventoryTabs
                                className="inventory-tabs"
                                activeTab={internalActiveTab}
                                setActiveTab={setInternalActiveTab}
                                position="middle"
                            />
                            {internalActiveTab === 'gear' && (
                                <div className="inventory-action-buttons-wrapper">
                                    <button onClick={toggleSortOrder} className="inventory-sort-button">
                                        {sortOrder === 'desc' ? 'По Редкости 🔽' : 'По Редкости🔼'}
                                    </button>
                                    {/* ▼▼▼ НОВАЯ КНОПКА "КУЗНИЦА" ▼▼▼ */}
                                    <button onClick={handleGoToForge} className="inventory-forge-button">
                                        <img src="/assets/forge-icon.png" alt="Кузница" className="button-icon" /> Кузница
                                        {/* Опционально: индикатор крафта, если нужно */}
                                        {canForge && <span className="forge-indicator">!</span>}
                                    </button>
                                    {/* ▲▲▲ КОНЕЦ НОВОЙ КНОПКИ ▲▲▲ */}
                                </div>
                            )}
                            <div className="inventory-main-area inventory-main-area--normal">
                                <AnimatePresence initial={false} mode="wait">
                                    {internalActiveTab === 'stats' && (
                                        <motion.div
                                            key="stats-panel"
                                            variants={contentTransitionVariants}
                                            initial="initial" animate="animate" exit="exit"
                                            className="stats-panel"
                                        >
                                            <p data-icon="💖"> <span className="stat-label">ХП:</span> <span className="stat-value">{playerStats?.hp ?? '-'}</span> </p>
                                            <p data-icon="⚔️"> <span className="stat-label">Урон:</span> <span className="stat-value">{playerStats?.attack ?? '-'}</span> </p>
                                            <p data-icon="💨"> <span className="stat-label">Скор. атаки:</span> <span className="stat-value">{(playerStats?.attackSpeed ?? 0).toFixed ? (playerStats.attackSpeed).toFixed(2) : '-'}</span> </p>
                                            <p data-icon="💥"> <span className="stat-label">Крит. шанс:</span> <span className="stat-value">{playerStats?.critChance ?? '-'}%</span> </p>
                                            <p data-icon="✌️"> <span className="stat-label">Двойной удар:</span> <span className="stat-value">{playerStats?.doubleStrikeChance ?? '-'}%</span> </p>
                                            <hr className="popup-divider thin stats-divider" />
                                            <p data-icon="⚡"> <span className="stat-label">Уровень Силы:</span> <span className="stat-value power-level-value">{powerLevel ?? '-'}</span> </p>
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
                                                            onClick={() => setSelectedItem(item)}
                                                        >
                                                            <img src={item.image || "/assets/default-item.png"} alt={item.name} />
                                                            {equipped[item.type]?.uid === item.uid && <div className="equipped-indicator">E</div>}
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
                        equippedItems={equipped}
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
        </div> // Конец .inventory
    );
};

export default Inventory;