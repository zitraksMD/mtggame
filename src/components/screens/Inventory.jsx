// src/components/Inventory.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
// Убедись, что импортированы motion и AnimatePresence
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../store/useGameStore.js';
import { shallow } from "zustand/shallow"; // Для оптимизации подписки на стор
import "./Inventory.scss"; // Основные стили инвентаря
import CharacterViewer from "../CharacterViewer"; // Компонент для 3D модели
import ArtifactsPanel from "./ArtifactsPanel"; // Компонент панели артефактов
import InventoryTabs from "../InventoryTabs"; // Компонент для кнопок табов
// Подключаем стили, если они есть для дочерних компонентов и еще не импортированы глобально
// import "./ArtifactsPanel.scss";


// --- Логика сортировки ---
const rarityOrder = { 
    common: 0, 
    uncommon: 1, 
    rare: 2, 
    epic: 3,        // <--- ДОБАВЛЕНО
    legendary: 4,   // Изменен порядок
    mythic: 5       // Изменен порядок
};
const getRarityValue = (item) => rarityOrder[item?.rarity] || 0; // Если ключи в объекте и в item.rarity совпадают по регистру
    const LOCAL_STORAGE_KEY = "equippedItems"; // Ключ для сохранения экипировки

// --- Анимации для смены ЛЕЙАУТОВ ---
const layoutTransitionVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.25, ease: "easeInOut" } },
    exit: { opacity: 0, transition: { duration: 0.15, ease: "easeInOut" } }
};

// --- Анимации для смены контента ВНУТРИ нормального лейаута ---
const contentTransitionVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.1 }}
}

// --- Анимации для стрелок изменения силы ---
const arrowVariants = {
    initial: (custom) => ({
        opacity: 0,
        x: `calc(-50% + ${custom.offsetX}px)`,
        y: custom.type === 'gain' ? '130px' : '-130px', // Подстрой, если нужно
        scale: 0.7
    }),
    animate: (custom) => ({
        opacity: [0, 1, 1, 0],
        x: `calc(-50% + ${custom.offsetX}px)`,
        y: custom.type === 'gain' ? '-130px' : '130px', // Подстрой, если нужно
        scale: 1,
        transition: {
            duration: 1.4,
            delay: custom.delay, // Используем рассчитанную задержку из custom
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


// НАЧАЛО КОМПОНЕНТА INVENTORY
// ================================================================
const Inventory = ({ setShowForge }) => {
    // === Хуки и Состояние ===
    const {
        inventory, gold, diamonds, isAnyRecipeCraftable,
        equipItem, equipped, unequipItem, setEquipped, playerStats, powerLevel,
        // Предполагаем, что есть функция upgradeEquippedItem в сторе (или ее нужно будет добавить)
        // upgradeEquippedItem
    } = useGameStore(
        (state) => ({
            inventory: state.inventory, gold: state.gold, diamonds: state.diamonds,
            isAnyRecipeCraftable: state.isAnyRecipeCraftable,
            equipItem: state.equipItem, equipped: state.equipped,
            unequipItem: state.unequipItem, setEquipped: state.setEquipped,
            playerStats: state.computedStats ? state.computedStats() : state.playerStats,
            powerLevel: state.powerLevel,
            // upgradeEquippedItem: state.upgradeEquippedItem // Раскомментируй, если есть
        }),
        shallow
    );

    const [selectedItem, setSelectedItem] = useState(null);
    const [powerChangeEffect, setPowerChangeEffect] = useState({ type: null, key: 0 });
    const [internalActiveTab, setInternalActiveTab] = useState("gear");
    const [sortOrder, setSortOrder] = useState('desc');
    const canForge = useMemo(() => isAnyRecipeCraftable(), [isAnyRecipeCraftable, inventory, gold, diamonds]);

    // === Эффекты ===
    useEffect(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
            try { setEquipped(JSON.parse(saved)); }
            catch (err) { console.warn("Failed to parse equipped items:", err); }
        }
    }, [setEquipped]); // setEquipped должна быть стабильной ссылкой из Zustand

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(equipped));
    }, [equipped]);

    // === Логика для попапа сравнения ===
    const equippedItemForComparison = useMemo(() => {
        if (!selectedItem || !selectedItem.type) return null;
        return equipped[selectedItem.type] || null;
    }, [selectedItem, equipped]);

    const calculateDiff = (selectedStat, equippedStat) => {
        const selectedValue = selectedStat || 0; const equippedValue = equippedStat || 0; return selectedValue - equippedValue;
    };

    const statDiffs = useMemo(() => {
        if (!selectedItem || !equippedItemForComparison || selectedItem.uid === equippedItemForComparison.uid) return null;
        return {
            hp: calculateDiff(selectedItem.hpBonus, equippedItemForComparison.hpBonus),
            attack: calculateDiff(selectedItem.attackBonus, equippedItemForComparison.attackBonus),
            attackSpeed: calculateDiff(selectedItem.attackSpeedBonus, equippedItemForComparison.attackSpeedBonus),
            critChance: calculateDiff(selectedItem.critChanceBonus, equippedItemForComparison.critChanceBonus),
            doubleStrikeChance: calculateDiff(selectedItem.doubleStrikeChanceBonus, equippedItemForComparison.doubleStrikeChanceBonus),
        };
    }, [selectedItem, equippedItemForComparison]);

    // === Обработчики ===
    const handleArtifactPowerChange = useCallback((oldPower, newPower) => {
        console.log(`Inventory получил сигнал об изменении силы от артефакта: ${oldPower} -> ${newPower}`);
        // TODO: Добавить эффект стрелок? (Сейчас стрелки только от equip/unequip)
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
        setSelectedItem(null); // Закрываем попап СРАЗУ
        // Используем requestAnimationFrame или setTimeout 0 для получения обновленного состояния
        requestAnimationFrame(() => {
            const newPower = useGameStore.getState().powerLevel;
            triggerPowerChangeEffect(oldPower, newPower, Date.now());
        });
    };

    const handleUnequip = (slot) => {
        const oldPower = useGameStore.getState().powerLevel;
        unequipItem(slot);
        setSelectedItem(null); // Закрываем попап СРАЗУ
        requestAnimationFrame(() => {
             const newPower = useGameStore.getState().powerLevel;
             triggerPowerChangeEffect(oldPower, newPower, Date.now());
        });
    };

    const handleUpgradeClick = (item) => {
        // TODO: Реализовать логику УЛУЧШЕНИЯ ПРЕДМЕТА
        console.log(`Попытка улучшить слот ${item.type} (предмет ${item.name})`);
        alert(`Улучшение ${item.name} (Ур. ${item.level}/${item.maxLevel}) - логика в разработке!`);

        // --- ПРИМЕР (если бы была функция в сторе) ---
        // const oldPower = useGameStore.getState().powerLevel;
        // const success = upgradeEquippedItem(item.type); // Функция из стора
        // if (success) {
        //     // Обновляем selectedItem, чтобы показать новый уровень ВНУТРИ попапа
        //     const updatedEquippedItem = useGameStore.getState().equipped[item.type];
        //     if (updatedEquippedItem) {
        //          setSelectedItem(updatedEquippedItem);
        //     } else {
        //          setSelectedItem(null); // На всякий случай, если что-то пошло не так
        //     }
        //     // Показываем эффект изменения силы
        //     requestAnimationFrame(() => {
        //         const newPower = useGameStore.getState().powerLevel;
        //         triggerPowerChangeEffect(oldPower, newPower, Date.now() + '_upgrade');
        //     });
        // } else {
        //     // Сообщение об ошибке (не хватило ресурсов и т.д.)
        //     console.error("Не удалось улучшить предмет");
        //     // Можно показать пользователю сообщение
        // }
        // --- КОНЕЦ ПРИМЕРА ---

        // Пока не закрываем попап, чтобы видеть результат (если бы он обновлялся)
        // setSelectedItem(null);
    };

    // === Сортировка ===
    const sortedInventory = useMemo(() => {
        return [...inventory].sort((itemA, itemB) => {
            const valueA = getRarityValue(itemA); const valueB = getRarityValue(itemB);
            return sortOrder === 'desc' ? valueB - valueA : valueA - valueB; });
    }, [inventory, sortOrder]);
    const toggleSortOrder = () => { setSortOrder(prevOrder => prevOrder === 'desc' ? 'asc' : 'desc'); };

    // === Хелпер рендера статов (для попапа) ===
    // Эта функция используется ВНУТРИ интегрированного попапа
    const renderStatLine = (labelWithIcon, value, diff) => {
        const hasValue = value !== undefined && value !== null && value !== 0;
        const showDiff = diff !== undefined && diff !== null && diff !== 0;

        if (!hasValue && !showDiff) return null; // Не рендерим строку, если нет ни значения, ни разницы

        // Определяем, процентное ли значение, по иконке/ключевым словам в лейбле
        const isPercent = labelWithIcon.includes('💨') || labelWithIcon.includes('💥') || labelWithIcon.includes('✌️') || labelWithIcon.toLowerCase().includes('скор.') || labelWithIcon.toLowerCase().includes('шанс') || labelWithIcon.toLowerCase().includes('удар');

        // Форматирование разницы
        let diffElement = null;
        if (showDiff) {
            const diffClass = diff > 0 ? 'positive' : 'negative';
            const diffSymbol = diff > 0 ? '▲' : '▼';
            // Добавляем знак +/- к разнице и % если нужно
            const diffDisplayValue = `${diff > 0 ? '+' : ''}${diff}${isPercent ? '%' : ''}`;
            diffElement = ( <span className={`stat-diff ${diffClass}`}> ({diffSymbol}{diffDisplayValue}) </span> );
        }

        // Форматирование основного значения
        // Добавляем + для положительных непроцентных значений, и % для процентных
        const valueDisplay = hasValue
            ? `${!isPercent && value > 0 ? '+' : ''}${value}${isPercent ? '%' : ''}`
            : '0'; // Показываем 0, если значение отсутствует, но есть diff

        return (
             // Используем классы из структуры Кода 1
            <p className="popup-stat-line"> {/* Можно использовать popup-stat-line или detail-line */}
                <span className="label">{labelWithIcon}:</span>
                <span className="value">{valueDisplay}{diffElement}</span>
            </p>
        );
    };


    // ================================================================
    // НАЧАЛО RENDER (RETURN)
    // ================================================================
    return (
        <div className="inventory">

            <AnimatePresence initial={false} mode="wait">
                {/* Условие переключения лейаутов: НЕ Артефакты или Артефакты */}
                {internalActiveTab !== 'artifacts' ? (
                    // ===========================================================
                    // === НАЧАЛО: ЛЕЙАУТ 1: ОБЫЧНЫЙ (Stats/Gear) ===============
                    // ===========================================================
                    <motion.div
                        key="normal-layout"
                        className="inventory-layout inventory-layout--normal"
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={layoutTransitionVariants}
                    >
                        {/* ===== 1. Секция Персонажа ===== */}
                        <div className="character-section">
                            <div className="character-equip">
                                {/* --- Левая колонка слотов --- */}
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

                                {/* --- Модель персонажа и Анимация стрелок --- */}
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
                                                    const columnOffset = 30;
                                                    const staggerDelay = 0.05;
                                                    return Array.from({ length: 9 }).map((_, i) => {
                                                        const columnIndex = Math.floor(i / 3);
                                                        const rowIndex = i % 3;
                                                        let offsetXValue = 0;
                                                        if (columnIndex === 0) { offsetXValue = -columnOffset; }
                                                        else if (columnIndex === 2) { offsetXValue = columnOffset; }
                                                        const calculatedDelay = rowIndex * staggerDelay;
                                                        const customProps = { type: powerChangeEffect.type, offsetX: offsetXValue, delay: calculatedDelay };
                                                        return (
                                                            <motion.img
                                                                key={i}
                                                                className="power-arrow"
                                                                src={powerChangeEffect.type === 'gain' ? '/assets/green-arrow.png' : '/assets/red-arrow.png'}
                                                                alt={powerChangeEffect.type === 'gain' ? 'Power Up' : 'Power Down'}
                                                                variants={arrowVariants}
                                                                custom={customProps}
                                                                initial="initial"
                                                                animate="animate"
                                                            />
                                                        );
                                                    });
                                                })()}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                    
                                {/* --- Правая колонка слотов --- */}
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
                        </div> {/* ===== Конец .character-section ===== */}
                        
                        <div className="inventory-power-display">
             <span className="inventory-power-label">Your Power: </span>
             <span className="inventory-power-value">{formatPower(powerLevel)}</span>
         </div>

                        {/* ===== 2. Секция Контента ===== */}
                        <div className="content-section">
                        <div className="inventory-tabs-container"> {/* <--- Добавили этот div */}
                            {/* --- Табы --- */}
                            <InventoryTabs
                                activeTab={internalActiveTab}
                                setActiveTab={setInternalActiveTab}
                                position="middle"
                            />
                            {/* --- Кнопки действий (только для вкладки Gear) --- */}
                            {internalActiveTab === 'gear' && (
                                <div className="inventory-action-buttons-wrapper">
                                    <button onClick={toggleSortOrder} className="inventory-sort-button">
                                        {sortOrder === 'desc' ? 'По Редкости 🔽' : 'По Редкости🔼'}
                                    </button>
                                </div>
                            )}

                            {/* --- Основная область (Статы или Инвентарь) --- */}
                            <div className="inventory-main-area inventory-main-area--normal">
                                <AnimatePresence initial={false} mode="wait">
                                    {/* --- Панель Статов --- */}
                                    {internalActiveTab === 'stats' && (
                                        <motion.div
                                            key="stats-panel"
                                            variants={contentTransitionVariants}
                                            initial="initial" animate="animate" exit="exit"
                                            className="stats-panel"
                                        >
                                            {/* Отображаем статы с иконками и классами */}
                                            <p data-icon="💖"> <span className="stat-label">ХП:</span> <span className="stat-value">{playerStats?.hp ?? '-'}</span> </p>
                                            <p data-icon="⚔️"> <span className="stat-label">Урон:</span> <span className="stat-value">{playerStats?.attack ?? '-'}</span> </p>
                                            <p data-icon="💨"> <span className="stat-label">Скор. атаки:</span> <span className="stat-value">{(playerStats?.attackSpeed ?? 0).toFixed ? (playerStats.attackSpeed).toFixed(2) : '-'}</span> </p>
                                            <p data-icon="💥"> <span className="stat-label">Крит. шанс:</span> <span className="stat-value">{playerStats?.critChance ?? '-'}%</span> </p>
                                            <p data-icon="✌️"> <span className="stat-label">Двойной удар:</span> <span className="stat-value">{playerStats?.doubleStrikeChance ?? '-'}%</span> </p>
                                            <hr className="popup-divider thin stats-divider" /> {/* Разделитель перед Уровнем Силы */}
                                            <p data-icon="⚡"> <span className="stat-label">Уровень Силы:</span> <span className="stat-value power-level-value">{powerLevel ?? '-'}</span> </p>
                                        </motion.div>
                                    )}

                                    {/* --- Сетка Инвентаря --- */}
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
                                                            key={item.uid || item.id} /* Убедись, что ключ уникален */
                                                            className={`inventory-item rarity-${(item.rarity || "common").toLowerCase()}`}
                                                            onClick={() => setSelectedItem(item)}
                                                        >
                                                            <img src={item.image || "/assets/default-item.png"} alt={item.name} />
                                                            {/* Индикатор 'E', если предмет надет */}
                                                            {equipped[item.type]?.uid === item.uid && <div className="equipped-indicator">E</div>}
                                                            {/* Можно добавить уровень предмета, если нужно */}
                                                            {/* {item.level > 0 && <span className="item-level-badge">{item.level}</span>} */}
                                                        </div>
                                                    ))}
                                                    {sortedInventory.length === 0 && <p className="empty-inventory-message">Инвентарь пуст</p>}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div> {/* Конец .inventory-main-area */}
                        </div> {/* ===== Конец .content-section ===== */}
                        </div>

                    </motion.div>
                    // ===========================================================
                    // === КОНЕЦ: ЛЕЙАУТ 1: ОБЫЧНЫЙ (Stats/Gear) =================
                    // ===========================================================

                ) : ( // НАЧАЛО ВЕТКИ ДЛЯ АРТЕФАКТОВ

                    // ===========================================================
                    // === НАЧАЛО: ЛЕЙАУТ 2: АРТЕФАКТЫ (ИЗМЕНЕННАЯ СТРУКТУРА) ===
                    // ===========================================================
                    <motion.div
                        key="artifacts-layout"
                        className="inventory-layout inventory-layout--artifacts"
                        initial="initial" animate="animate" exit="exit"
                        variants={layoutTransitionVariants}
                    >
                        {/* 1. Табы рендерятся ПЕРВЫМИ, чтобы быть наверху */}
                        <InventoryTabs
                            activeTab={internalActiveTab}
                            setActiveTab={setInternalActiveTab}
                            position="top"
                        />

                        {/* 2. Секция контента для панели артефактов (под табами) */}
                        <div className="content-section content-section--artifacts">
                            {/* Основная область для ArtifactsPanel */}
                            <div className="inventory-main-area inventory-main-area--artifacts">
                                {/* Сам компонент панели артефактов */}
                                <ArtifactsPanel onPowerChange={handleArtifactPowerChange} />
                            </div>
                        </div> {/* Конец .content-section--artifacts */}
                    </motion.div>
                    // ===========================================================
                    // === КОНЕЦ: ЛЕЙАУТ 2: АРТЕФАКТЫ ============================
                    // ===========================================================
                )} {/* Конец условного рендеринга по internalActiveTab */}
            </AnimatePresence> {/* Конец AnimatePresence для смены лейаутов */}


             {/* ================================================================ */}
            {/* === НАЧАЛО: ИНТЕГРИРОВАННЫЙ ПОПАП ПРЕДМЕТА (из Кода 1) ========= */}
            {/* ================================================================ */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        key="item-popup-integrated" // Уникальный ключ для анимации
                        className="item-popup-backdrop" // Класс для фона (затемнения)
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setSelectedItem(null)} // Закрытие по клику на фон
                    >
                        {/* Контейнер контента попапа */}
                        <motion.div
                            className="item-popup-content" // Класс для стилизации окна попапа
                            onClick={(e) => e.stopPropagation()} // Предотвращаем закрытие по клику на сам попап
                            initial={{ opacity: 0, scale: 0.9 }} // Анимация появления контента
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2, delay: 0.05 }}
                        >
                            {/* Кнопка закрытия "X" */}
                            <button className="popup-close-x" onClick={() => setSelectedItem(null)}>✖</button>

                            {/* 1. Шапка с названием и рамкой редкости */}
                            {/* Класс редкости применяется к шапке для рамки/фона */}
                            <div className={`popup-header simple rarity-border-${selectedItem.rarity?.toLowerCase() || 'common'}`}>
                                <h3 className="popup-title">{selectedItem.name}</h3>
                                {/* Подзаголовок с редкостью и типом */}
                                <div className="popup-subtitle">
                                     <span className={`rarity-text rarity-${selectedItem.rarity?.toLowerCase() || 'common'}`}>
                                        {selectedItem.rarity || 'Common'}
                                    </span>
                                     {/* Используем тире или другой разделитель */}
                                     <span className="separator"> - </span>
                                    <span className="item-type-text">{selectedItem.type || 'Предмет'}</span>
                                </div>
                            </div>

                            {/* 2. Основное тело попапа */}
                            <div className="popup-body">
                                {/* Главная строка: Левая колонка (Иконка) | Правая колонка (Детали) */}
                                <div className="popup-main-row">

                                    {/* --- Левая Колонка (только иконка) --- */}
                                    <div className="popup-left-col">
                                        {/* Иконка с рамкой редкости */}
                                        <div className={`popup-icon-area rarity-${selectedItem.rarity?.toLowerCase() || 'common'}`}>
                                            <img src={selectedItem.image || "/assets/default-item.png"} alt={selectedItem.name} className="popup-icon"/>
                                        </div>
                                        {/* Мета-информация (Редкость/Тип) теперь в шапке, этот блок удален для упрощения */}
                                    </div>

                                    {/* --- Правая Колонка (Детали) --- */}
                                    <div className="popup-details-col">
                                        {/* Уровень предмета (если есть и предмет НАДЕТ) */}
                                        {/* Показываем уровень, только если предмет НАДЕТ и имеет уровни */}
                                        {equipped[selectedItem.type]?.uid === selectedItem.uid && (selectedItem.maxLevel > 0 || selectedItem.level > 0) && (
                                            <div className="item-level-display">
                                                <span className="label">Уровень:</span>
                                                <span className="value">{selectedItem.level || 0} / {selectedItem.maxLevel || '?'}</span>
                                            </div>
                                        )}

                                        {/* Разделитель перед статами (если был уровень ИЛИ если есть описание/сет) */}
                                        {( (equipped[selectedItem.type]?.uid === selectedItem.uid && (selectedItem.maxLevel > 0 || selectedItem.level > 0))
                                          || selectedItem.description || selectedItem.setId ) && <hr className="popup-divider thin" />
                                        }

                                        {/* Статы (Используем renderStatLine определенную выше) */}
                                        <div className="popup-stats-area">
                                            {/* Передаем label с иконкой, значение и разницу (diff) */}
                                            {renderStatLine("💖 ХП", selectedItem.hpBonus, statDiffs?.hp)}
                                            {renderStatLine("⚔️ Урон", selectedItem.attackBonus, statDiffs?.attack)}
                                            {renderStatLine("💨 Скор. атаки", selectedItem.attackSpeedBonus, statDiffs?.attackSpeed)}
                                            {renderStatLine("💥 Крит. шанс", selectedItem.critChanceBonus, statDiffs?.critChance)}
                                            {renderStatLine("✌️ Двойной удар", selectedItem.doubleStrikeChanceBonus, statDiffs?.doubleStrikeChance)}

                                            {/* Сообщение, если нет статов */}
                                            {![
                                                selectedItem.hpBonus, selectedItem.attackBonus, selectedItem.attackSpeedBonus,
                                                selectedItem.critChanceBonus, selectedItem.doubleStrikeChanceBonus
                                            ].some(stat => stat !== undefined && stat !== 0) && (
                                                <p className="no-stats">Нет базовых характеристик</p>
                                            )}
                                        </div>

                                        {/* Описание (если есть) */}
                                        {selectedItem.description && (
                                            <>
                                                <hr className="popup-divider" />
                                                <div className="popup-description-area">
                                                    <p>{selectedItem.description}</p>
                                                </div>
                                            </>
                                        )}

                                        {/* Сет Бонус (если есть) */}
                                        {selectedItem.setId && (
                                            <>
                                                <hr className="popup-divider" />
                                                <div className="popup-set-bonus-area">
                                                    <h4>Бонус Комплекта (Placeholder)</h4>
                                                    <p>Принадлежит к комплекту: {selectedItem.setId}</p>
                                                    {/* TODO: Логика отображения прогресса сета */}
                                                    {/* Пример: <p>Надето X из Y предметов.</p> */}
                                                    {/* Пример: <p>Активные бонусы: ...</p> */}
                                                </div>
                                            </>
                                        )}
                                    </div> {/* Конец правой колонки */}
                                </div> {/* Конец главной строки */}
                            </div> {/* Конец тела попапа */}

                            {/* 3. Футер с кнопками (логика из Кода 1, использует обработчики из Кода 2) */}
                            <div className="popup-buttons">
                                {/* Проверяем, является ли выбранный предмет тем, что сейчас надет в этом слоте */}
                                {equipped[selectedItem.type]?.uid === selectedItem.uid ? (
                                    // --- Случай 1: Выбранный предмет НАДЕТ ---
                                    <>
                                        {/* Кнопка "Снять" (Использует handleUnequip из Inventory) */}
                                        <button className="button-unequip" onClick={() => handleUnequip(selectedItem.type)}>
                                            Снять
                                        </button>

                                        {/* Кнопка "Улучшить" (если предмет имеет уровни и надет) */}
                                        {selectedItem.maxLevel > 0 && (
                                            <button
                                                className="button-upgrade"
                                                // Блокируем, если достигнут макс. уровень ИЛИ (TODO) не хватает ресурсов
                                                disabled={selectedItem.level >= selectedItem.maxLevel /* || !canAffordUpgrade(selectedItem) */}
                                                onClick={() => handleUpgradeClick(selectedItem)} // Используем новый обработчик
                                            >
                                                Улучшить {selectedItem.level < selectedItem.maxLevel ? `(${selectedItem.level + 1})` : '(Макс)'}
                                                {/* TODO: Показать стоимость улучшения */}
                                                {/* <span className="upgrade-cost"> (100💎)</span> */}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    // --- Случай 2: Выбранный предмет НЕ НАДЕТ ---
                                    <>
                                        {/* Проверяем, занят ли слот ДРУГИМ предметом */}
                                        {equipped[selectedItem.type] ? (
                                            // Слот занят -> кнопка "Поменять" (Использует handleEquip из Inventory)
                                            <button className="button-change" onClick={() => handleEquip(selectedItem)}>
                                                Поменять
                                            </button>
                                        ) : (
                                            // Слот пуст -> кнопка "Экипировать" (Использует handleEquip из Inventory)
                                            <button className="button-equip" onClick={() => handleEquip(selectedItem)}>
                                                Экипировать
                                            </button>
                                        )}
                                        {/* Кнопки "Улучшить" здесь нет, так как предмет не надет */}
                                    </>
                                )}
                            </div> {/* Конец popup-buttons */}

                        </motion.div> {/* Конец item-popup-content */}
                    </motion.div> /* Конец item-popup-backdrop */
                )}
            </AnimatePresence>
            {/* ================================================================ */}
            {/* === КОНЕЦ: ИНТЕГРИРОВАННЫЙ ПОПАП ПРЕДМЕТА ======================= */}
            {/* ================================================================ */}

        </div> // Конец .inventory
    );
    // ================================================================
    // КОНЕЦ RENDER (RETURN)
    // ================================================================
}; // ================================================================
// КОНЕЦ КОМПОНЕНТА INVENTORY
// ================================================================

export default Inventory;