// src/components/Shop.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Импортируем AnimatePresence для анимации карусели
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../store/useGameStore';

// Данные сундуков
import { ARTIFACT_CHESTS, getArtifactChestById } from '../data/artifactChestData.js';
import { GEAR_CHESTS, getGearChestById } from '../data/gearChestData.js';

// Данные предметов и артефактов (для Daily Shop и потенциально InfoPopup)
import itemsDatabase, { getItemById as getItemDataById } from '../data/itemsDatabase';
import { getArtifactById } from '../data/artifactsData.js';

// Компоненты попапов
import ChestResultsPopup from './ChestResultsPopup';
import ChestInfoPopup from './ChestInfoPopup';

// Стили
import './Shop.scss';
import './ChestCard.scss'; // Стили для карточек (может содержать и стили слайдов или их нужно добавить)
// import './Carousel.scss'; // Раскомментируйте, если стили карусели вынесены

// --- Хелперы Редкости (для InfoPopup) ---
const rarityOrder = { "Common": 1, "Uncommon": 2, "Rare": 3, "Epic": 4, "Legendary": 5, "Mythic": 6 };
const getTopRarities = (chest, count = 5) => {
    if (!chest || !chest.possibleRarities) {
        return [];
    }
    const sortedRarities = [...chest.possibleRarities].sort((a, b) => (rarityOrder[b] || 0) - (rarityOrder[a] || 0));
    return sortedRarities.slice(0, count);
};

// --- Хелперы и Компоненты Карточек ---

// Хелпер для получения данных предмета
const getItemData = (itemId) => getItemDataById(itemId);

// Компонент карточки товара Daily Shop
const ShopItemCard = ({ deal, itemData, onPurchase, purchased, playerGold, playerDiamonds }) => {
    const canAfford = deal.currency === 'gold' ? playerGold >= deal.price : playerDiamonds >= deal.price;
    const isAvailable = !purchased;
    const purchaseDisabled = !isAvailable || !canAfford;

    return (
        <div className={`shop-item-card ${!isAvailable ? 'sold-out' : ''} rarity-${itemData?.rarity || 'common'}`}>
            {deal.discount > 0 && <div className="discount-banner">{deal.discount}% OFF</div>}
            <div className="item-name">{itemData?.name || deal.itemId}</div>
            <img src={itemData?.image || '/assets/default-item.png'} alt={itemData?.name || 'Предмет'} />
            <div className="purchase-limit">Осталось: {isAvailable ? (deal.purchaseLimit || 1) : 0}</div>
            <button
                className="purchase-button"
                onClick={() => onPurchase(deal.id)}
                disabled={purchaseDisabled}
            >
                <img src={deal.currency === 'gold' ? '/assets/coin-icon.png' : '/assets/diamond-image.png'} alt={deal.currency} />
                {deal.price.toLocaleString()}
            </button>
        </div>
    );
};

// Компонент для пакета валюты
const CurrencyPackCard = ({ pack, onPurchase }) => {
    const purchaseDisabled = false; // Реальная логика в onPurchase

    return (
        <div className={`shop-item-card currency-pack-card rarity-${pack.rarity || 'common'}`}>
            <div className="item-name">{pack.name}</div>
            <img src={pack.icon || '/assets/currencies/diamonds_pack_1.png'} alt={pack.name} />
            <button className="purchase-button currency-button" onClick={() => onPurchase(pack.id)} disabled={purchaseDisabled}>
                <span>{pack.priceDisplay || `${pack.price}$`}</span>
            </button>
        </div>
    );
};

// Компонент для бандла
const BundleCard = ({ bundle, onPurchase }) => {
    const purchaseDisabled = false; // Заглушка

    return (
       <div className={`shop-item-card bundle-card rarity-${bundle.rarity || 'rare'}`}>
            {bundle.discount > 0 && <div className="discount-banner">{bundle.discount}% OFF</div>}
            <div className="item-name">{bundle.name}</div>
            <img src={bundle.icon || '/assets/bundles/bundles-icon.png'} alt={bundle.name} />
             <div className="bundle-contents">
                    {bundle.contents?.map((content, index) => <span key={index}>{content}</span>)}
             </div>
            <button className="purchase-button bundle-button" onClick={() => onPurchase(bundle.id)} disabled={purchaseDisabled}>
                <span>{bundle.priceDisplay || `${bundle.price}$`}</span>
            </button>
       </div>
     );
};

// Компонент для карточки Осколков Артефакта
const ArtifactShardCard = ({ deal, artifactData, onPurchase, purchased, playerGold, playerDiamonds }) => {
    if (!artifactData) {
        return <div className="shop-item-card sold-out"><p>Ошибка: Артефакт не найден</p></div>;
    }
    const canAfford = deal.currency === 'gold' ? playerGold >= deal.price : playerDiamonds >= deal.price;
    const isAvailable = !purchased;
    const purchaseDisabled = !isAvailable || !canAfford;

    return (
        <div className={`shop-item-card artifact-shard-card ${!isAvailable ? 'sold-out' : ''} rarity-${artifactData.rarity || 'common'}`}>
            {deal.discount > 0 && <div className="discount-banner">{deal.discount}% OFF</div>}
            <div className="item-name">{artifactData.name} (Осколки) x{deal.quantity}</div>
            <img src={artifactData.icon || '/assets/default-item.png'} alt={`${artifactData.name} (Осколки)`} />
            <div className="purchase-limit">Осталось: {isAvailable ? (deal.purchaseLimit || 1) : 0}</div>
            <button
                className="purchase-button shard-button"
                onClick={() => onPurchase(deal.id)}
                disabled={purchaseDisabled}
            >
                <img src={deal.currency === 'gold' ? '/assets/coin-icon.png' : '/assets/diamond-image.png'} alt={deal.currency} />
                {deal.price.toLocaleString()}
            </button>
        </div>
    );
};


// --- Хелпер для форматирования времени ---
const formatTime = (ms) => {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

const REFRESH_HOUR_UTC = 2; // Час сброса

// --- Основной компонент Магазина (Объединенный) ---
const Shop = () => {
    // --- Состояния ---
    const [refreshTimer, setRefreshTimer] = useState("--:--:--"); // Таймер Daily Shop
    const [openingChestId, setOpeningChestId] = useState(null);   // Для анимации открытия
    const [infoPopupChestData, setInfoPopupChestData] = useState(null); // Данные для инфо-попапа

    // Состояния для каруселей
    const [currentGearChestIndex, setCurrentGearChestIndex] = useState(0);
    const [direction, setDirection] = useState(0); // 1 для 'next', -1 для 'prev', 0 для initial/click
    const [currentArtifactChestIndex, setCurrentArtifactChestIndex] = useState(0); // Для карусели артефактов
    const [directionArtifact, setDirectionArtifact] = useState(0); // Для карусели артефактов

    // --- Константы для каруселей ---
    const numGearChests = GEAR_CHESTS.length;
    const numArtifactChests = ARTIFACT_CHESTS.length;
    const DRAG_BUFFER = 100; // Мин. дистанция для свайпа
    const VELOCITY_THRESHOLD = 200; // Мин. скорость для свайпа

    // --- Примерные данные для новых секций ---
    const currencyPacks = [
         { id: 'gold_pack_1', name: 'Мешок золота', type: 'gold', amount: 10000, price: 50, currency: 'diamonds', icon: '/assets/currencies/gold_pack_1.png', priceDisplay: '50💎', rarity: 'common'},
         { id: 'gold_pack_2', name: 'Сундук золота', type: 'gold', amount: 55000, price: 250, currency: 'diamonds', icon: '/assets/currencies/gold_pack_2.png', priceDisplay: '250💎', rarity: 'rare'},
         { id: 'diamond_pack_1', name: 'Горсть алмазов', type: 'diamonds', amount: 100, price: 1.99, currency: 'real_money', icon: '/assets/currencies/diamonds_pack_1.png', priceDisplay: '$1.99', rarity: 'common'},
         { id: 'diamond_pack_2', name: 'Кошель алмазов', type: 'diamonds', amount: 550, price: 9.99, currency: 'real_money', icon: '/assets/currencies/diamonds_pack_2.png', priceDisplay: '$9.99', rarity: 'rare'},
       ];
     const bundleDeals = [
         { id: 'starter_bundle', name: 'Набор Новичка', rarity: 'rare', icon: '/assets/bundles/starter_bundle.png', price: 0.99, currency: 'real_money', priceDisplay: '$0.99', discount: 80, contents: ['x1000 Золота', 'x50 Алмазов', 'x1 Ключ Снаряжения'] },
         { id: 'artifact_bundle', name: 'Набор Артефактов', rarity: 'epic', icon: '/assets/bundles/artifact_bundle.png', price: 4.99, currency: 'real_money', priceDisplay: '$4.99', discount: 50, contents: ['x1000 Осколков', 'x300 Алмазов'] },
       ];

    // --- Получаем данные и actions из стора ---
    const {
        gold, diamonds,
        dailyDeals, dailyDealsLastGenerated, dailyShopPurchases,
        artifactChestPity = {}, // Pity для артефактов
        gearChestPity = {},     // Pity для снаряжения
        lastChestRewards, lastOpenedChestInfo,
        // Actions
        purchaseShopItem,
        openArtifactChest, openArtifactChestX10, // Экшены артефактов
        openGearChest, openGearChestX10,       // Экшены снаряжения
        clearLastChestData,
        purchaseCurrencyPack,
        purchaseBundle
    } = useGameStore((state) => ({
        gold: state.gold,
        diamonds: state.diamonds,
        dailyDeals: state.dailyDeals,
        dailyDealsLastGenerated: state.dailyDealsLastGenerated,
        dailyShopPurchases: state.dailyShopPurchases,
        artifactChestPity: state.artifactChestPity,
        gearChestPity: state.gearChestPity, // Важно получать из стора
        lastChestRewards: state.lastChestRewards,
        lastOpenedChestInfo: state.lastOpenedChestInfo,
        purchaseShopItem: state.purchaseShopItem,
        openArtifactChest: state.openArtifactChest,
        openArtifactChestX10: state.openArtifactChestX10,
        openGearChest: state.openGearChest,
        openGearChestX10: state.openGearChestX10,
        clearLastChestData: state.clearLastChestData,
        purchaseCurrencyPack: state.purchaseCurrencyPack,
        purchaseBundle: state.purchaseBundle,
    }), (left, right) => {
        // Функция сравнения для useGameStore
        return left.gold === right.gold &&
               left.diamonds === right.diamonds &&
               left.dailyDealsLastGenerated === right.dailyDealsLastGenerated &&
               JSON.stringify(left.dailyDeals) === JSON.stringify(right.dailyDeals) &&
               JSON.stringify(left.dailyShopPurchases) === JSON.stringify(right.dailyShopPurchases) &&
               JSON.stringify(left.artifactChestPity) === JSON.stringify(right.artifactChestPity) &&
               JSON.stringify(left.gearChestPity) === JSON.stringify(right.gearChestPity) && // Сравнение gearChestPity
               JSON.stringify(left.lastChestRewards) === JSON.stringify(right.lastChestRewards) &&
               JSON.stringify(left.lastOpenedChestInfo) === JSON.stringify(right.lastOpenedChestInfo);
    });

    // --- Framer Motion Variants для обеих каруселей ---
    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? '100%' : '-100%',
            opacity: 0,
            scale: 0.95 // Чуть уменьшаем входящий
        }),
        center: {
            zIndex: 1, // Активный слайд поверх
            x: 0,
            opacity: 1,
            scale: 1,
            transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } // Плавная анимация
        },
        exit: (direction) => ({
            zIndex: 0, // Уходящий слайд под низ
            x: direction < 0 ? '100%' : '-100%',
            opacity: 0,
            scale: 0.95, // Чуть уменьшаем уходящий
            transition: { duration: 0.3, ease: [0.4, 0, 0.6, 1] } // Чуть быстрее уход
        })
    };

    // --- Функции пагинации для каруселей ---
    // Для сундуков снаряжения
    const paginate = useCallback((newDirection) => {
        if (!newDirection || numGearChests <= 1) return; // Не делать ничего, если направление 0 или 1 сундук
        setDirection(newDirection); // Устанавливаем направление для анимации
        setCurrentGearChestIndex(prevIndex =>
            (prevIndex + newDirection + numGearChests) % numGearChests
        );
    }, [numGearChests]);

    // Для сундуков артефактов
    const paginateArtifact = useCallback((newDirection) => {
        if (!newDirection || numArtifactChests <= 1) return;
        setDirectionArtifact(newDirection); // Используем отдельный стейт направления
        setCurrentArtifactChestIndex(prevIndex =>
            (prevIndex + newDirection + numArtifactChests) % numArtifactChests
        );
    }, [numArtifactChests]);

    // --- Обработчики Drag End для каруселей ---
    // Для сундуков снаряжения
    const handleDragEndForSlide = useCallback((event, info) => {
        const { offset, velocity } = info;
        if (Math.abs(offset.x) > DRAG_BUFFER || Math.abs(velocity.x) > VELOCITY_THRESHOLD) {
            paginate(offset.x < 0 ? 1 : -1);
        }
        // Если свайп недостаточный, анимация exit/enter вернет слайд на место
    }, [paginate, DRAG_BUFFER, VELOCITY_THRESHOLD]); // Добавили paginate и константы в зависимости

    // Для сундуков артефактов
    const handleDragEndForArtifactSlide = useCallback((event, info) => {
        const { offset, velocity } = info;
        if (Math.abs(offset.x) > DRAG_BUFFER || Math.abs(velocity.x) > VELOCITY_THRESHOLD) {
            paginateArtifact(offset.x < 0 ? 1 : -1); // Вызываем paginateArtifact
        }
    }, [paginateArtifact, DRAG_BUFFER, VELOCITY_THRESHOLD]); // Зависимость от paginateArtifact и констант

    // --- useEffect для таймера Daily Shop ---
    useEffect(() => {
        let intervalId = null;
        const updateTimer = () => {
            const nowTs = Date.now();
            const nowUtcDate = new Date(nowTs);
            // Логика расчета времени до сброса
            const targetTodayUtcTs = Date.UTC(
                nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate(),
                REFRESH_HOUR_UTC, 0, 0, 0
            );
            let nextRefreshTimeTs;
            if (nowTs < targetTodayUtcTs) {
                nextRefreshTimeTs = targetTodayUtcTs;
            } else {
                const targetTomorrowUtcTs = Date.UTC(
                    nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate() + 1,
                    REFRESH_HOUR_UTC, 0, 0, 0
                );
                nextRefreshTimeTs = targetTomorrowUtcTs;
            }
            const remainingMs = Math.max(0, nextRefreshTimeTs - nowTs);
            setRefreshTimer(formatTime(remainingMs));
        };
        intervalId = setInterval(updateTimer, 1000);
        updateTimer(); // Запустить сразу
        return () => { if (intervalId) clearInterval(intervalId); };
    }, []);

    // --- Обработчики открытия сундуков ---
    // Для Артефактов
    const handleOpenArtifactChest = (chestId, amount = 1) => {
        if (openingChestId) return;
        const chestData = getArtifactChestById(chestId);
        if (!chestData) { console.error(`[Shop] Artifact chest data not found: ${chestId}`); return; }
        const cost = chestData.cost.price * amount;
        if (diamonds < cost) { alert(`Недостаточно алмазов! Нужно ${cost.toLocaleString()}`); return; }
        setOpeningChestId(chestId);
        console.log(`[Shop] Attempting to open Artifact Chest: ${chestId} x${amount}`);
        try {
            if (amount === 10) openArtifactChestX10(chestId); else openArtifactChest(chestId);
        } catch (error) {
             console.error(`[Shop] Error calling open action for artifact chest ${chestId} x${amount}:`, error);
             setOpeningChestId(null);
        }
    };

    // Для Снаряжения
    const handleOpenGearChest = (chestId, amount = 1) => {
        if (openingChestId) return;
        const chestData = getGearChestById(chestId);
        if (!chestData) { console.error("[Shop] Gear chest data not found:", chestId); return; }

        const cost = chestData.cost.price * amount;
        const currency = chestData.cost.currency;
        const playerCurrency = currency === 'gold' ? gold : diamonds;

        if (playerCurrency < cost) {
            alert(`Недостаточно ${currency === 'gold' ? 'золота' : 'алмазов'}! Нужно ${cost.toLocaleString()}`);
            return;
        }

        setOpeningChestId(chestId);
        console.log(`[Shop] Attempting to open Gear Chest: ${chestId} x${amount}`);
        try {
            if (amount === 10) {
                console.log(`[Shop] Calling openGearChestX10 for ${chestId}`);
                openGearChestX10(chestId);
            } else {
                console.log(`[Shop] Calling openGearChest for ${chestId}`);
                openGearChest(chestId);
            }
        } catch (error) {
            console.error(`[Shop] Error calling open action for gear chest ${chestId} x${amount}:`, error);
            setOpeningChestId(null);
        }
    };

    // --- useEffect для сброса анимации открытия при появлении попапа ---
      useEffect(() => {
         if (lastChestRewards && openingChestId) {
             console.log("[Shop] Rewards received, resetting openingChestId");
             setOpeningChestId(null);
         }
     }, [lastChestRewards, openingChestId]);

    // --- Обработчики инфо-попапа и закрытия попапов ---
    const handleShowInfoPopup = useCallback((chestData) => {
        console.log("[Shop] Showing info for chest:", chestData?.id);
        setInfoPopupChestData(chestData);
    }, []);
    const handleCloseInfoPopup = useCallback(() => {
        console.log("[Shop] Closing info popup");
        setInfoPopupChestData(null);
    }, []);
    const handleCloseResultsPopup = useCallback(() => {
        console.log("[Shop] Closing results popup and clearing data");
        clearLastChestData(); // Вызываем экшн из стора
    }, [clearLastChestData]);

    // --- Рендеринг Компонента ---
    return (
        <> {/* Обертка для попапов */}
            <motion.div
                className="shop-screen"
                style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}
            >
                {/* Шапка может быть добавлена здесь, если нужна */}
                {/* <div className="shop-header"> ... </div> */}

                {/* Контент магазина со всеми секциями */}
                <div className="shop-content">

                    {/* --- Секция Daily Shop (СТРУКТУРА ИЗ КОДА 1 ПРИМЕНЕНА) --- */}
                    <div className="shop-section">
                        <h3 className="shop-section-title">Ежедневные предложения</h3>
                        {/* Добавляем обертку section-content-box (как в коде 1) */}
                        <div className="section-content-box">
                            {/* Таймер теперь ВНУТРИ бокса */}
                            <div className="shop-timer daily-timer">Обновление через: {refreshTimer}</div>
                            {/* Сетка теперь ВНУТРИ бокса */}
                            <div className="daily-shop-grid">
                                {dailyDeals && dailyDeals.length > 0 ? (
                                    dailyDeals.map(deal => {
                                        const purchased = !!dailyShopPurchases[deal.id];
                                        if (deal.type === 'item') {
                                            const itemData = getItemData(deal.itemId);
                                            if (!itemData) {
                                                console.warn(`Предмет ${deal.itemId} не найден для Daily Shop`);
                                                return <div key={deal.id} className="shop-item-card sold-out"><p>Ошибка: Предмет не найден</p></div>;
                                            }
                                            return (
                                                <ShopItemCard key={deal.id} deal={deal} itemData={itemData} onPurchase={purchaseShopItem}
                                                    purchased={purchased} playerGold={gold} playerDiamonds={diamonds} />
                                            );
                                        } else if (deal.type === 'artifact_shard') {
                                             const artifactData = getArtifactById(deal.itemId);
                                             if (!artifactData) {
                                                 console.warn(`Артефакт ${deal.itemId} не найден для Daily Shop`);
                                                 return <div key={deal.id} className="shop-item-card sold-out"><p>Ошибка: Артефакт не найден</p></div>;
                                            }
                                            return (
                                                <ArtifactShardCard key={deal.id} deal={deal} artifactData={artifactData} onPurchase={purchaseShopItem}
                                                    purchased={purchased} playerGold={gold} playerDiamonds={diamonds} />
                                            );
                                        } else {
                                            console.warn(`Неизвестный тип товара в Daily Shop: ${deal.type}`);
                                            return null;
                                        }
                                    })
                                ) : (
                                    <p>Сегодня нет доступных предложений...</p>
                                )}
                            </div> {/* Конец .daily-shop-grid */}
                        </div> {/* Конец НОВОГО .section-content-box */}
                    </div>
                    {/* --- Конец секции Daily Shop --- */}


                    {/* ====================================================================== */}
                    {/* === СЕКЦИЯ СУНДУКОВ СНАРЯЖЕНИЯ С КАРУСЕЛЬЮ === */}
                    {/* ====================================================================== */}
                    <div className="shop-section">
                         <h3 className="shop-section-title">Сундуки Снаряжения</h3>
                         <div className="section-content-box"> {/* Используем тот же класс обертки */}
                             <div className="chest-carousel-container gear-carousel"> {/* Контейнер для карусели */}
                                 <AnimatePresence initial={false} custom={direction} mode='wait'>
                                     <motion.div
                                         key={currentGearChestIndex} // Key запускает анимацию
                                         className={`chest-slide gear-chest-slide ${openingChestId === GEAR_CHESTS[currentGearChestIndex]?.id ? 'opening' : ''}`}
                                         custom={direction} // Передаем направление в variants
                                         variants={slideVariants}
                                         initial="enter"
                                         animate="center"
                                         exit="exit"
                                         drag="x" // Включаем драг
                                         dragConstraints={{ left: 0, right: 0 }}
                                         dragElastic={0.7}
                                         onDragEnd={handleDragEndForSlide} // Обработчик свайпа
                                     >
                                         {/* --- Содержимое Слайда Снаряжения --- */}
                                         {(() => {
                                             const chest = GEAR_CHESTS[currentGearChestIndex];
                                             if (!chest) {
                                                 console.error(`[Shop] Gear chest at index ${currentGearChestIndex} not found!`);
                                                 return <div className="error-placeholder">Ошибка загрузки сундука</div>;
                                             }

                                             const isOpeningThis = openingChestId === chest.id;
                                             const costX1 = chest.cost.price;
                                             const costX10 = chest.cost.price * 10;
                                             const currency = chest.cost.currency;
                                             const canAffordX1 = currency === 'gold' ? gold >= costX1 : diamonds >= costX1;
                                             const canAffordX10 = currency === 'gold' ? gold >= costX10 : diamonds >= costX10;
                                             const openDisabledX1 = isOpeningThis || !canAffordX1;
                                             const openDisabledX10 = isOpeningThis || !canAffordX10;

                                             return (
                                                 <>
                                                      <div className="chest-title-wrapper">
                                                          <h4 className="chest-slide-name">{chest.name}</h4>
                                                          <button className="chest-info-button" onClick={(e) => { e.stopPropagation(); handleShowInfoPopup(chest); }} aria-label="Информация о шансах"> i </button>
                                                      </div>
                                                      <div className="chest-slide-graphic-area">
                                                          <img
                                                              src={chest.icon || '/assets/chests/gear_chest_default.png'}
                                                              alt={chest.name}
                                                              className="chest-slide-graphic-img"
                                                              draggable="false"
                                                          />
                                                      </div>
                                                      {chest.description && (
                                                          <p className="chest-slide-description">{chest.description}</p>
                                                      )}

                                                      {/* Pity Info для снаряжения */}
                                                      <div className="chest-pity-info-container">
                                                          {chest.pity && (
                                                              <div className="chest-pity-info multiple">
                                                                  {(Array.isArray(chest.pity) ? chest.pity : [chest.pity])
                                                                       .sort((a, b) => (b.rarity === 'Epic' ? 1 : a.rarity === 'Epic' ? -1 : 0)) // Легендарный первый
                                                                       .map(p => {
                                                                           const pityKey = p.rarity.toLowerCase();
                                                                           const currentPityCount = (gearChestPity[chest.id]?.[pityKey]) || 0; // Безопасный доступ
                                                                           const pityRemaining = Math.max(0, p.limit - currentPityCount);
                                                                           const text = pityRemaining > 0
                                                                                         ? `Гарантированный ${p.rarity} через ${pityRemaining}`
                                                                                         : `Гарантированный ${p.rarity} СЛЕДУЮЩИЙ!`;
                                                                           return <span key={p.rarity} className={`rarity-${pityKey}`}>{text}</span>;
                                                                       })}
                                                              </div>
                                                          )}
                                                      </div>

                                                      {/* Кнопки x1 / x10 */}
                                                      <div className={`chest-button-wrapper two-buttons`}>
                                                          <button
                                                              className="purchase-button open-chest-button gear-style"
                                                              onClick={() => !isOpeningThis && handleOpenGearChest(chest.id, 1)}
                                                              disabled={openDisabledX1} >
                                                              <img src={currency === 'gold' ? '/assets/coin-icon.png' : '/assets/diamond-image.png'} alt={currency} /> {costX1.toLocaleString()} <span>x1</span>
                                                          </button>
                                                          <button
                                                              className="purchase-button open-chest-button gear-style"
                                                              onClick={() => !isOpeningThis && handleOpenGearChest(chest.id, 10)}
                                                              disabled={openDisabledX10} >
                                                              <img src={currency === 'gold' ? '/assets/coin-icon.png' : '/assets/diamond-image.png'} alt={currency} /> {costX10.toLocaleString()} <span>x10</span>
                                                          </button>
                                                      </div>
                                                 </>
                                             );
                                         })()}
                                         {/* --- Конец Содержимого Слайда Снаряжения --- */}
                                     </motion.div>
                                 </AnimatePresence>

                                 {/* --- Навигация и Пагинация для Снаряжения --- */}
                                 {numGearChests > 1 && (
                                     <>
                                         <button className="carousel-nav-button prev" onClick={() => paginate(-1)} aria-label="Предыдущий сундук">◀</button>
                                         <button className="carousel-nav-button next" onClick={() => paginate(1)} aria-label="Следующий сундук">▶</button>
                                         <div className="carousel-pagination">
                                             {GEAR_CHESTS.map((_, index) => (
                                                 <button
                                                     key={`dot-gear-${index}`}
                                                     className={`dot ${index === currentGearChestIndex ? 'active' : ''}`}
                                                     onClick={() => {
                                                         if (index !== currentGearChestIndex) {
                                                             setDirection(index > currentGearChestIndex ? 1 : -1);
                                                             setCurrentGearChestIndex(index);
                                                         }
                                                     }}
                                                     aria-label={`Перейти к сундуку ${index + 1}`}
                                                 />
                                             ))}
                                         </div>
                                     </>
                                 )}
                             </div> {/* Конец .chest-carousel-container */}
                         </div> {/* Конец .section-content-box */}
                    </div>
                    {/* ====================================================================== */}
                    {/* === КОНЕЦ СЕКЦИИ СУНДУКОВ СНАРЯЖЕНИЯ === */}
                    {/* ====================================================================== */}


                    {/* ====================================================================== */}
                    {/* === СЕКЦИЯ СУНДУКОВ АРТЕФАКТОВ С КАРУСЕЛЬЮ === */}
                    {/* ====================================================================== */}
                    <div className="shop-section">
                          <h3 className="shop-section-title">Сундуки Артефактов</h3>
                          <div className="section-content-box"> {/* Используем тот же класс обертки */}
                              <div className="chest-carousel-container swiper-mode artifact-carousel"> {/* Контейнер для карусели артефактов */}
                                  <AnimatePresence initial={false} custom={directionArtifact} mode='wait'>
                                      <motion.div
                                          key={currentArtifactChestIndex} // Key запускает анимацию
                                          className={`chest-slide artifact-chest-slide ${openingChestId === ARTIFACT_CHESTS[currentArtifactChestIndex]?.id ? 'opening' : ''}`}
                                          custom={directionArtifact} // Передаем направление артефактов
                                          variants={slideVariants} // Используем те же варианты
                                          initial="enter"
                                          animate="center"
                                          exit="exit"
                                          drag="x" // Включаем драг
                                          dragConstraints={{ left: 0, right: 0 }}
                                          dragElastic={0.7}
                                          onDragEnd={handleDragEndForArtifactSlide} // Обработчик свайпа артефактов
                                      >
                                          {/* --- Содержимое Слайда Артефактов --- */}
                                          {(() => {
                                              const chest = ARTIFACT_CHESTS[currentArtifactChestIndex];
                                              if (!chest) {
                                                  console.error(`[Shop] Artifact chest at index ${currentArtifactChestIndex} not found!`);
                                                  return <div className="error-placeholder">Ошибка загрузки сундука</div>;
                                              }

                                              const isOpeningThis = openingChestId === chest.id;
                                              const costX1 = chest.cost.price;
                                              const costX10 = chest.cost.price * 10;
                                              // Артефакты только за алмазы
                                              const canAffordX1 = diamonds >= costX1;
                                              const canAffordX10 = diamonds >= costX10;
                                              const openDisabledX1 = isOpeningThis || !canAffordX1;
                                              const openDisabledX10 = isOpeningThis || !canAffordX10;
                                              // Pity для артефактов
                                              const currentPityCount = artifactChestPity[chest.id] || 0;
                                              const pityRemaining = Math.max(0, chest.pityLimit - currentPityCount);

                                              return (
                                                  <>
                                                       <div className="chest-title-wrapper">
                                                           <h4 className="chest-slide-name">{chest.name}</h4>
                                                           <button className="chest-info-button" onClick={(e) => { e.stopPropagation(); handleShowInfoPopup(chest); }} aria-label="Информация о шансах"> i </button>
                                                       </div>
                                                       <div className="chest-slide-graphic-area">
                                                           <img
                                                               src={chest.icon || '/assets/chests/artifact_chest_default.png'}
                                                               alt={chest.name}
                                                               className="chest-slide-graphic-img"
                                                               draggable="false"
                                                           />
                                                       </div>
                                                       {chest.description && (
                                                           <p className="chest-slide-description">{chest.description}</p>
                                                       )}
                                                       {/* Pity Info для артефактов */}
                                                       <div className="chest-pity-info-container">
                                                           {chest.pityLimit && ( // Проверяем наличие pityLimit
                                                               <div className="chest-pity-info">
                                                                   <span className={`rarity-${(chest.guaranteedRarity || 'legendary').toLowerCase()}`}>
                                                                   Гарантированный артефакт {pityRemaining > 0 ? `через ${pityRemaining}` : 'СЛЕДУЮЩИЙ!'}
                                                                   </span>
                                                               </div>
                                                           )}
                                                       </div>

                                                       {/* Кнопки x1 / x10 */}
                                                       <div className={`chest-button-wrapper two-buttons`}>
                                                           <button
                                                               className="purchase-button open-chest-button wish-style"
                                                               onClick={() => !isOpeningThis && handleOpenArtifactChest(chest.id, 1)}
                                                               disabled={openDisabledX1}>
                                                               <img src={'/assets/diamond-image.png'} alt="алмазы" /> {costX1.toLocaleString()} <span>x1</span>
                                                           </button>
                                                           <button
                                                               className="purchase-button open-chest-button wish-style"
                                                               onClick={() => !isOpeningThis && handleOpenArtifactChest(chest.id, 10)}
                                                               disabled={openDisabledX10}>
                                                               <img src={'/assets/diamond-image.png'} alt="алмазы" /> {costX10.toLocaleString()} <span>x10</span>
                                                           </button>
                                                       </div>
                                                  </>
                                              );
                                          })()}
                                          {/* --- Конец Содержимого Слайда Артефактов --- */}
                                      </motion.div>
                                  </AnimatePresence>

                                  {/* --- Навигация и Пагинация для Артефактов --- */}
                                  {numArtifactChests > 1 && (
                                      <>
                                          <button className="carousel-nav-button prev" onClick={() => paginateArtifact(-1)} aria-label="Предыдущий сундук">◀</button>
                                          <button className="carousel-nav-button next" onClick={() => paginateArtifact(1)} aria-label="Следующий сундук">▶</button>
                                          <div className="carousel-pagination">
                                              {ARTIFACT_CHESTS.map((_, index) => (
                                                  <button
                                                      key={`dot-artifact-${index}`}
                                                      className={`dot ${index === currentArtifactChestIndex ? 'active' : ''}`}
                                                      onClick={() => {
                                                          if (index !== currentArtifactChestIndex) {
                                                              setDirectionArtifact(index > currentArtifactChestIndex ? 1 : -1);
                                                              setCurrentArtifactChestIndex(index);
                                                          }
                                                      }}
                                                      aria-label={`Перейти к сундуку ${index + 1}`}
                                                  />
                                              ))}
                                          </div>
                                      </>
                                  )}
                              </div> {/* Конец .chest-carousel-container */}
                          </div> {/* Конец .section-content-box */}
                    </div>
                    {/* ====================================================================== */}
                    {/* === КОНЕЦ СЕКЦИИ СУНДУКОВ АРТЕФАКТОВ === */}
                    {/* ====================================================================== */}

                    {/* --- Секция Валюты --- */}
                    <div className="shop-section">
                            <h3 className="shop-section-title">Валюта</h3>
                            <div className="section-content-box"> {/* Используем тот же класс обертки */}
                                <div className="daily-shop-grid currency-grid">
                                    {currencyPacks.map(pack => (
                                        <CurrencyPackCard key={pack?.id || Math.random()} pack={pack}
                                            onPurchase={() => purchaseCurrencyPack ? purchaseCurrencyPack(pack.id) : alert('Покупка валюты в разработке')}
                                        />
                                    ))}
                                </div>
                            </div>
                    </div>

                    {/* --- Секция Бандлов --- */}
                    <div className="shop-section">
                            <h3 className="shop-section-title">Наборы</h3>
                            <div className="section-content-box"> {/* Используем тот же класс обертки */}
                                <div className="daily-shop-grid bundles-grid">
                                    {bundleDeals.map(bundle => (
                                        <BundleCard key={bundle.id} bundle={bundle}
                                            onPurchase={() => purchaseBundle ? purchaseBundle(bundle.id) : alert('Покупка наборов в разработке')}
                                        />
                                    ))}
                                </div>
                            </div>
                    </div>

                </div> {/* Конец .shop-content */}
            </motion.div> {/* Конец .shop-screen */}

            {/* Попапы */}
            {lastChestRewards && (
                <ChestResultsPopup
                    rewards={lastChestRewards}
                    lastOpenInfo={lastOpenedChestInfo}
                    onClose={handleCloseResultsPopup}
                />
            )}
            {infoPopupChestData && (
                <ChestInfoPopup
                    chestData={infoPopupChestData}
                    onClose={handleCloseInfoPopup}
                />
            )}
        </> // Конец React Fragment
    );
};

export default Shop;