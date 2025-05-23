// src/components/Shop.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Импортируем AnimatePresence для анимации карусели
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../store/useGameStore.js';

// Данные сундуков
import { ARTIFACT_CHESTS, getArtifactChestById } from '../../data/artifactChestData.js';
import { GEAR_CHESTS, getGearChestById } from '../../data/gearChestData.js';

// Данные предметов и артефактов (для Daily Shop и потенциально InfoPopup)
import itemsDatabase, { getItemById as getItemDataById } from '../../data/itemsDatabase.js';
import { getArtifactById } from '../../data/artifactsData.js';

// --- >>> ИМПОРТ ДАННЫХ ДЛЯ БАНДЛОВ <<< ---
import { SPECIAL_DEALS } from '../../data/specialDealsData.js'; // Убедитесь, что путь правильный
import { GENERAL_BUNDLES } from '../../data/generalBundlesData.js'; // Убедитесь, что путь правильный
// --- <<< КОНЕЦ ИМПОРТА ДАННЫХ ДЛЯ БАНДЛОВ >>> ---

// Компоненты попапов
import ChestResultsPopup from '../popups/ChestResultsPopup.jsx';
import ChestInfoPopup from '../popups/ChestInfoPopup.jsx';

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

// Компонент для бандла (используется в каруселях)
const BundleCard = ({ bundle, onPurchase }) => {
    if (!bundle) { 
        return <div className="shop-item-card bundle-card error-placeholder" style={{height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><p>Ошибка загрузки набора</p></div>;
    }
    const purchaseDisabled = false; 

    return (
       <div className={`shop-item-card bundle-card rarity-${bundle.rarity || 'rare'}`}>
            {bundle.discount > 0 && <div className="discount-banner">{bundle.discount}% OFF</div>}
            {/* Image is now a direct child, for flex layout */}
            <img 
                className="bundle-image" /* Added class for specific styling */
                src={bundle.icon || '/assets/bundles/bundles-icon.png'} 
                alt={bundle.name} 
            />
            {/* New wrapper for all text content and the button */}
            <div className="bundle-text-content">
                <div className="item-name">{bundle.name}</div>
                <div className="bundle-contents">
                    {bundle.contents?.map((content, index) => <span key={index}>{typeof content === 'object' ? content.text : content}</span>)}
                </div>
                <button className="purchase-button bundle-button" onClick={() => onPurchase(bundle.id)} disabled={purchaseDisabled}>
                    <span>
                        {bundle.priceDisplay 
                            ? bundle.priceDisplay 
                            : `${bundle.price}${bundle.currency === 'USDT' || bundle.currency === 'USDC' ? ` ${bundle.currency}` : '$'}`}
                    </span>
                </button>
            </div>
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
    const [refreshTimer, setRefreshTimer] = useState("--:--:--");
    const [openingChestId, setOpeningChestId] = useState(null); // null | string (chestId)
    const [infoPopupChestData, setInfoPopupChestData] = useState(null);

    // Состояния для каруселей сундуков
    const [currentGearChestIndex, setCurrentGearChestIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const [currentArtifactChestIndex, setCurrentArtifactChestIndex] = useState(0);
    const [directionArtifact, setDirectionArtifact] = useState(0);

    // --- Состояния для карусели Специальных Предложений ---
    const [currentSpecialBundleIndex, setCurrentSpecialBundleIndex] = useState(0);
    const [directionSpecial, setDirectionSpecial] = useState(0);
    
    // --- Состояния для карусели Обычных Наборов ---
    const [currentGeneralBundleIndex, setCurrentGeneralBundleIndex] = useState(0);
    const [directionGeneral, setDirectionGeneral] = useState(0);

    // --- Примерные данные для Валюты (оставляем, т.к. они не из GENERAL_BUNDLES или SPECIAL_DEALS) ---
    const currencyPacks = [
        { id: 'gold_pack_1', name: 'Мешок золота', type: 'gold', amount: 10000, price: 50, currency: 'diamonds', icon: '/assets/currencies/gold_pack_1.png', priceDisplay: '50💎', rarity: 'common'},
        { id: 'gold_pack_2', name: 'Сундук золота', type: 'gold', amount: 55000, price: 250, currency: 'diamonds', icon: '/assets/currencies/gold_pack_2.png', priceDisplay: '250💎', rarity: 'rare'},
        { id: 'diamond_pack_1', name: 'Горсть алмазов', type: 'diamonds', amount: 100, price: 1.99, currency: 'real_money', icon: '/assets/currencies/diamonds_pack_1.png', priceDisplay: '$1.99', rarity: 'common'},
        { id: 'diamond_pack_2', name: 'Кошель алмазов', type: 'diamonds', amount: 550, price: 9.99, currency: 'real_money', icon: '/assets/currencies/diamonds_pack_2.png', priceDisplay: '$9.99', rarity: 'rare'},
    ];
    
    // --- Получаем данные и actions из стора ---
    const {
        gold, diamonds,
        dailyDeals, dailyDealsLastGenerated, dailyShopPurchases,
        artifactChestPity = {},
        gearChestPity = {},
        lastChestRewards, lastOpenedChestInfo,
        purchaseShopItem,
        openArtifactChest, openArtifactChestX10,
        openGearChest, openGearChestX10,
        clearLastChestData,
        purchaseCurrencyPack,
        purchaseBundle,
        // --- >>> Добавьте сюда состояние прогресса игрока из стора <<< ---
        // playerProgress, // Пример: playerProgress (объект с firstLoginDone, пройденными главами/уровнями)
        // purchasedSpecialDeals, // Пример: purchasedSpecialDeals (массив ID уже купленных специальных предложений с лимитом 1)
    } = useGameStore((state) => ({
        gold: state.gold,
        diamonds: state.diamonds,
        dailyDeals: state.dailyDeals,
        dailyDealsLastGenerated: state.dailyDealsLastGenerated,
        dailyShopPurchases: state.dailyShopPurchases,
        artifactChestPity: state.artifactChestPity,
        gearChestPity: state.gearChestPity,
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
        // playerProgress: state.playerProgress, // Пример
        // purchasedSpecialDeals: state.purchasedSpecialDeals, // Пример
    }), (left, right) => {
        return left.gold === right.gold &&
               left.diamonds === right.diamonds &&
               left.dailyDealsLastGenerated === right.dailyDealsLastGenerated &&
               JSON.stringify(left.dailyDeals) === JSON.stringify(right.dailyDeals) &&
               JSON.stringify(left.dailyShopPurchases) === JSON.stringify(right.dailyShopPurchases) &&
               JSON.stringify(left.artifactChestPity) === JSON.stringify(right.artifactChestPity) &&
               JSON.stringify(left.gearChestPity) === JSON.stringify(right.gearChestPity) &&
               JSON.stringify(left.lastChestRewards) === JSON.stringify(right.lastChestRewards) &&
               JSON.stringify(left.lastOpenedChestInfo) === JSON.stringify(right.lastOpenedChestInfo);
               // && JSON.stringify(left.playerProgress) === JSON.stringify(right.playerProgress) // Пример
               // && JSON.stringify(left.purchasedSpecialDeals) === JSON.stringify(right.purchasedSpecialDeals); // Пример
    });

    // --- >>> Фильтрация Специальных Предложений (SPECIAL_DEALS) <<< ---
    const activeSpecialDeals = useMemo(() => {
        if (!SPECIAL_DEALS) return [];
        // const purchasedSpecialDealsFromStore = purchasedSpecialDeals || []; // Получаем из стора
        // const playerProgressFromStore = playerProgress || {}; // Получаем из стора

        return SPECIAL_DEALS.filter(deal => {
            if (!deal.isActive) return false;

            // TODO: Реализуйте проверку, не был ли этот бандл уже куплен, если у него purchaseLimit: 1
            // Пример: if (deal.purchaseLimit === 1 && purchasedSpecialDealsFromStore.includes(deal.id)) return false;

            const condition = deal.availabilityCondition;
            if (condition) {
                if (condition.type === 'firstLogin') {
                    // return playerProgressFromStore?.flags?.firstLoginDone; // Ваша логика из стора
                    return true; // Заглушка для примера
                }
                if (condition.type === 'chapterComplete') {
                    // return playerProgressFromStore?.chapters?.[condition.chapterId]?.[condition.difficulty]?.completed;
                    console.log(`Проверка chapterComplete для ${deal.id}:`, condition);
                    return true; // Заглушка
                }
                if (condition.type === 'levelComplete') {
                    // const chapterProg = playerProgressFromStore?.chapters?.[condition.chapterId]?.[condition.difficulty];
                    // return chapterProg && chapterProg.highestLevelCompleted >= condition.levelNumber;
                    console.log(`Проверка levelComplete для ${deal.id}:`, condition);
                    return true; // Заглушка
                }
                // Добавьте другие типы условий, если они есть
            }
            return true; // По умолчанию доступен, если нет условий или условия выполнены
        });
        // Зависимости: SPECIAL_DEALS и данные из стора, от которых зависит доступность
    }, [SPECIAL_DEALS /*, playerProgress, purchasedSpecialDeals */]);


    // --- Константы для каруселей (обновляем количество) ---
    const numGearChests = GEAR_CHESTS.length;
    const numArtifactChests = ARTIFACT_CHESTS.length;
    const numSpecialBundles = activeSpecialDeals.length; // Используем отфильтрованный массив
    const numGeneralBundles = GENERAL_BUNDLES.length;  // Используем импортированный массив

    const DRAG_BUFFER = 100;
    const VELOCITY_THRESHOLD = 200;
    
    // --- >>> Обработчик покупки для Специальных Предложений (USDT/USDC) <<< ---
    const handlePurchaseSpecialBundle = useCallback((bundleId) => {
        const dealToPurchase = activeSpecialDeals.find(d => d.id === bundleId);
        if (!dealToPurchase) {
            console.error("Специальное предложение не найдено:", bundleId);
            return;
        }
        alert(`Покупка специального набора "${dealToPurchase.name}" за ${dealToPurchase.priceDisplay} (логика USDT/USDC в разработке).`);
        // Здесь должна быть ваша логика:
        // 1. Проверка, можно ли купить (например, purchaseLimit)
        // 2. Интеграция с платежной системой
        // 3. В случае успеха:
        //    - useGameStore.getState().recordSpecialBundlePurchase(bundleId); // или аналогичная action
        //    - useGameStore.getState().addItems(dealToPurchase.contents); // или аналогичная функция для начисления наград
        //    - Обновление UI (например, убрать бандл из списка доступных, если purchaseLimit=1)
    }, [activeSpecialDeals /*, purchasedSpecialDeals, playerProgress, ... другие зависимости из стора, если нужны */]);


    const slideVariants = {
        enter: (directionParam) => ({
            x: directionParam > 0 ? '100%' : '-100%',
            opacity: 0,
            scale: 0.95
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
            transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
        },
        exit: (directionParam) => ({
            zIndex: 0,
            x: directionParam < 0 ? '100%' : '-100%',
            opacity: 0,
            scale: 0.95,
            transition: { duration: 0.3, ease: [0.4, 0, 0.6, 1] }
        })
    };

    const createPaginator = (setCurrentIndex, setDirectionState, numItems) => {
        return useCallback((newDirectionCallback) => {
            if (!!openingChestId || typeof newDirectionCallback !== 'number' || numItems <= 1) return; 
            setDirectionState(newDirectionCallback);
            setCurrentIndex(prevIndex => (prevIndex + newDirectionCallback + numItems) % numItems);
        }, [setCurrentIndex, setDirectionState, numItems, openingChestId]);
    };

    const createDragEndHandler = (paginatorFn, dragBufferConst, velocityThresholdConst) => {
        return useCallback((event, info) => {
            if (!!openingChestId) return; 
            const { offset, velocity } = info;
            if (Math.abs(offset.x) > dragBufferConst || Math.abs(velocity.x) > velocityThresholdConst) {
                paginatorFn(offset.x < 0 ? 1 : -1);
            }
        }, [paginatorFn, dragBufferConst, velocityThresholdConst, openingChestId]);
    };

    const paginateGear = createPaginator(setCurrentGearChestIndex, setDirection, numGearChests);
    const handleDragEndGear = createDragEndHandler(paginateGear, DRAG_BUFFER, VELOCITY_THRESHOLD);

    const paginateArtifact = createPaginator(setCurrentArtifactChestIndex, setDirectionArtifact, numArtifactChests);
    const handleDragEndArtifact = createDragEndHandler(paginateArtifact, DRAG_BUFFER, VELOCITY_THRESHOLD);

    const paginateSpecialBundle = createPaginator(setCurrentSpecialBundleIndex, setDirectionSpecial, numSpecialBundles);
    const handleDragEndSpecialBundle = createDragEndHandler(paginateSpecialBundle, DRAG_BUFFER, VELOCITY_THRESHOLD);

    const paginateGeneralBundle = createPaginator(setCurrentGeneralBundleIndex, setDirectionGeneral, numGeneralBundles);
    const handleDragEndGeneralBundle = createDragEndHandler(paginateGeneralBundle, DRAG_BUFFER, VELOCITY_THRESHOLD);

    useEffect(() => {
        let intervalId = null;
        const updateTimer = () => {
            const nowTs = Date.now();
            const nowUtcDate = new Date(nowTs);
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
        updateTimer();
        return () => { if (intervalId) clearInterval(intervalId); };
    }, []);

    const handleOpenArtifactChest = (chestId, amount = 1) => {
        if (openingChestId) return;
        const chestData = getArtifactChestById(chestId);
        if (!chestData) { console.error(`[Shop] Artifact chest data not found: ${chestId}`); return; }
        const cost = chestData.cost.price * amount;
        if (diamonds < cost) { alert(`Недостаточно алмазов! Нужно ${cost.toLocaleString()}`); return; }
        setOpeningChestId(chestId);
        try {
            if (amount === 10) openArtifactChestX10(chestId); else openArtifactChest(chestId);
        } catch (error) {
             console.error(`[Shop] Error calling open action for artifact chest ${chestId} x${amount}:`, error);
             setOpeningChestId(null);
        }
    };

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
        try {
            if (amount === 10) {
                openGearChestX10(chestId);
            } else {
                openGearChest(chestId);
            }
        } catch (error) {
            console.error(`[Shop] Error calling open action for gear chest ${chestId} x${amount}:`, error);
            setOpeningChestId(null);
        }
    };

    useEffect(() => {
       if (lastChestRewards && openingChestId) {
           setOpeningChestId(null);
       }
    }, [lastChestRewards, openingChestId]);

    const handleShowInfoPopup = useCallback((chestData) => {
        setInfoPopupChestData(chestData);
    }, []);
    const handleCloseInfoPopup = useCallback(() => {
        setInfoPopupChestData(null);
    }, []);
    const handleCloseResultsPopup = useCallback(() => {
        clearLastChestData();
    }, [clearLastChestData]);

    return (
        <>
            <motion.div
                className="shop-screen"
                style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}
            >
                <div className="shop-header-permanent">
                    <div className="player-currency-display-shop">
                        <div className="currency-item">
                            <img src="/assets/coin-icon.png" alt="Золото" className="currency-icon-shop" />
                            <span>{gold !== undefined && gold !== null ? gold.toLocaleString() : '--'}</span>
                        </div>
                        <div className="currency-item">
                            <img src="/assets/diamond-image.png" alt="Алмазы" className="currency-icon-shop" />
                            <span>{diamonds !== undefined && diamonds !== null ? diamonds.toLocaleString() : '--'}</span>
                        </div>
                    </div>
                </div>

                <div className="shop-scrollable-content">

                    {/* --- 2. СПЕЦИАЛЬНЫЕ ПРЕДЛОЖЕНИЯ (Special Bundles) --- */}
                    {activeSpecialDeals && activeSpecialDeals.length > 0 && (
                        <div className="shop-section special-bundles-section">
                            <h3 className="shop-section-title">Особые Наборы</h3>
                            <div className="section-content-box">
                                <div className="bundle-carousel-container special-bundle-carousel">
                                    <AnimatePresence initial={false} custom={directionSpecial} mode="wait">
                                        <motion.div
                                            key={`special-${currentSpecialBundleIndex}`}
                                            className="bundle-slide"
                                            custom={directionSpecial}
                                            variants={slideVariants}
                                            initial="enter" animate="center" exit="exit"
                                            drag="x" dragConstraints={{ left: 0, right: 0 }}
                                            dragElastic={0.6}
                                            onDragEnd={handleDragEndSpecialBundle}
                                            style={{ position: 'absolute', width: '100%' }}
                                        >
                                            {activeSpecialDeals[currentSpecialBundleIndex] && (
                                                <BundleCard
                                                    bundle={activeSpecialDeals[currentSpecialBundleIndex]}
                                                    onPurchase={() => handlePurchaseSpecialBundle(activeSpecialDeals[currentSpecialBundleIndex].id)}
                                                />
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                    {numSpecialBundles > 1 && !openingChestId && (
                                        <>
                                            <button className="carousel-nav-button prev" onClick={() => paginateSpecialBundle(-1)} aria-label="Предыдущий набор">◀</button>
                                            <button className="carousel-nav-button next" onClick={() => paginateSpecialBundle(1)} aria-label="Следующий набор">▶</button>
                                            <div className="carousel-pagination">
                                                {activeSpecialDeals.map((_, index) => (
                                                    <button
                                                        key={`dot-special-${index}`}
                                                        className={`dot ${index === currentSpecialBundleIndex ? 'active' : ''}`}
                                                        onClick={() => {
                                                            if (index !== currentSpecialBundleIndex) {
                                                                setDirectionSpecial(index > currentSpecialBundleIndex ? 1 : -1);
                                                                setCurrentSpecialBundleIndex(index);
                                                            }
                                                        }}
                                                        aria-label={`Перейти к набору ${index + 1}`}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {/* --- КОНЕЦ СПЕЦИАЛЬНЫХ ПРЕДЛОЖЕНИЙ --- */}

                    {/* --- 3. ЕЖЕДНЕВНЫЕ ПРЕДЛОЖЕНИЯ (Daily Deals) --- */}
                    <div className="shop-section">
                        <h3 className="shop-section-title">Ежедневные предложения</h3>
                        <div className="section-content-box">
                            <div className="shop-timer daily-timer">Обновление через: {refreshTimer}</div>
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
                                            return <ShopItemCard key={deal.id} deal={deal} itemData={itemData} onPurchase={purchaseShopItem} purchased={purchased} playerGold={gold} playerDiamonds={diamonds} />;
                                        } else if (deal.type === 'artifact_shard') {
                                            const artifactData = getArtifactById(deal.itemId);
                                            if (!artifactData) {
                                                console.warn(`Артефакт ${deal.itemId} не найден для Daily Shop`);
                                                return <div key={deal.id} className="shop-item-card sold-out"><p>Ошибка: Артефакт не найден</p></div>;
                                            }
                                            return <ArtifactShardCard key={deal.id} deal={deal} artifactData={artifactData} onPurchase={purchaseShopItem} purchased={purchased} playerGold={gold} playerDiamonds={diamonds} />;
                                        } else {
                                            console.warn(`Неизвестный тип товара в Daily Shop: ${deal.type}`);
                                            return null;
                                        }
                                    })
                                ) : ( <p className="no-offers-message">Сегодня нет доступных предложений...</p> )}
                            </div>
                        </div>
                    </div>
                    {/* --- КОНЕЦ ЕЖЕДНЕВНЫХ ПРЕДЛОЖЕНИЙ --- */}


                    {/* --- 4. СУНДУКИ СНАРЯЖЕНИЯ (Gear Chests) --- */}
                    <div className="shop-section">
                        <h3 className="shop-section-title">Сундуки Снаряжения</h3>
                        <div className="section-content-box">
                            <div className="chest-carousel-container gear-carousel">
                                <AnimatePresence initial={false} custom={direction} mode='wait'>
                                    <motion.div
                                        key={`gear-${currentGearChestIndex}`} 
                                        className={`chest-slide gear-chest-slide ${openingChestId === GEAR_CHESTS[currentGearChestIndex]?.id ? 'opening' : ''}`}
                                        custom={direction}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        drag="x"
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={0.6} 
                                        onDragEnd={handleDragEndGear} 
                                        style={{ position: 'absolute', width: '100%' }} 
                                    >
                                        {(() => {
                                            const chest = GEAR_CHESTS[currentGearChestIndex];
                                            if (!chest) {
                                                return <div className="error-placeholder" style={{height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Ошибка загрузки сундука</div>;
                                            }
                                            const isOpeningThis = openingChestId === chest.id;
                                            const costX1 = chest.cost.price;
                                            const costX10 = chest.cost.price * 10;
                                            const currency = chest.cost.currency;
                                            const canAffordX1 = currency === 'gold' ? gold >= costX1 : diamonds >= costX1;
                                            const canAffordX10 = currency === 'gold' ? gold >= costX10 : diamonds >= costX10;
                                            const openDisabledX1 = !!openingChestId || !canAffordX1; 
                                            const openDisabledX10 = !!openingChestId || !canAffordX10;

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
                                                    <div className="chest-pity-info-container">
                                                        {chest.pity && ( // Проверяем, что chest.pity не null
    <div className="chest-pity-info multiple">
        {/* Эта строка нормализует chest.pity к массиву для .map */}
        {(Array.isArray(chest.pity) ? chest.pity : [chest.pity])
            .sort((a, b) => (b.rarity === 'Epic' ? 1 : a.rarity === 'Epic' ? -1 : 0)) // Сортировка (Epic первый)
            .map(p => { // p - это объект гаранта, например { rarity: "Rare", limit: 10 }
                const pityKey = p.rarity.toLowerCase(); // 'rare' или 'epic'
                // Получаем текущий счетчик из useGameStore: state.gearChestPity[ID_сундука][ключ_редкости]
                const currentPityCount = (gearChestPity[chest.id]?.[pityKey]) || 0; 
                const pityRemaining = Math.max(0, p.limit - currentPityCount);
                const text = pityRemaining > 0
                             ? `Гарантированный ${p.rarity} через ${pityRemaining}`
                             : `Гарантированный ${p.rarity} СЛЕДУЮЩИЙ!`;
                return <span key={p.rarity} className={`rarity-${pityKey}`}>{text}</span>;
            })}
    </div>
)}
                                                    </div>
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
                                    </motion.div>
                                </AnimatePresence>
                                {numGearChests > 1 && !openingChestId && ( 
                                    <>
                                        <button className="carousel-nav-button prev" onClick={() => paginateGear(-1)} aria-label="Предыдущий сундук">◀</button>
                                        <button className="carousel-nav-button next" onClick={() => paginateGear(1)} aria-label="Следующий сундук">▶</button>
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
                            </div>
                        </div>
                    </div>
                    {/* --- КОНЕЦ СУНДУКОВ СНАРЯЖЕНИЯ --- */}


                    {/* --- 5. СУНДУКИ АРТЕФАКТОВ (Artifact Chests) --- */}
                        <div className="shop-section">
                            <h3 className="shop-section-title">Сундуки Артефактов</h3>
                            <div className="section-content-box">
                                <div className="chest-carousel-container swiper-mode artifact-carousel">
                                    <AnimatePresence initial={false} custom={directionArtifact} mode='wait'>
                                        <motion.div
                                            key={`artifact-${currentArtifactChestIndex}`}
                                            className={`chest-slide artifact-chest-slide ${openingChestId === ARTIFACT_CHESTS[currentArtifactChestIndex]?.id ? 'opening' : ''}`}
                                            custom={directionArtifact}
                                            variants={slideVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            drag="x"
                                            dragConstraints={{ left: 0, right: 0 }}
                                            dragElastic={0.6}
                                            onDragEnd={handleDragEndArtifact}
                                            style={{ position: 'absolute', width: '100%' }}
                                        >
                                            {(() => {
                                                const chest = ARTIFACT_CHESTS[currentArtifactChestIndex];
                                                if (!chest) {
                                                    return <div className="error-placeholder" style={{height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Ошибка загрузки сундука</div>;
                                                }
                                                const isOpeningThis = openingChestId === chest.id;
                                                const costX1 = chest.cost.price;
                                                const costX10 = chest.cost.price * 10;
                                                const canAffordX1 = diamonds >= costX1;
                                                const canAffordX10 = diamonds >= costX10;
                                                const openDisabledX1 = !!openingChestId || !canAffordX1;
                                                const openDisabledX10 = !!openingChestId || !canAffordX10;
                                                
                                                const currentArtifactPityCount = artifactChestPity[chest.id] || 0; // Используем переменную из предоставленного блока, или вашу currentPityCount, если они идентичны по смыслу. Здесь оставляю как в вашем новом блоке.

                                                // --- >>> НАЧАЛО ИЗМЕНЕНИЙ <<< ---
                                                let displayPityInfo = false; // Флаг, чтобы показать/скрыть блок гаранта
                                                let pityInfoText = '';      // Текст для отображения

                                                // Проверяем, есть ли конфигурация гаранта и лимит в ней
                                                if (chest.pity && typeof chest.pity.triggerLimit === 'number') {
                                                    displayPityInfo = true;
                                                    const pityLimit = chest.pity.triggerLimit;
                                                    const pityRemaining = Math.max(0, pityLimit - currentArtifactPityCount);

                                                    // Так как редкость определяется роллом из pity.guaranteedArtifactRarityPool,
                                                    // мы не можем указать одну конкретную "гарантированную редкость" здесь.
                                                    // Можно просто написать "Гарантированный артефакт" или, для примера,
                                                    // взять самую высокую редкость из pityEnabledRarities (если они отсортированы или вы знаете порядок).
                                                    // Простой вариант:
                                                    const guaranteedItemText = "артефакт"; 
                                                    // Или, если хотите показать возможные редкости (нужен доступ к RarityOrder или аналогичному):
                                                    // const topPityRarity = chest.pity.pityEnabledRarities && chest.pity.pityEnabledRarities.length > 0 
                                                    //     ? chest.pity.pityEnabledRarities.sort((a,b) => (rarityOrder[b] || 0) - (rarityOrder[a] || 0))[0] 
                                                    //     : "артефакт"; // rarityOrder должен быть доступен и содержать числовые значения для сравнения
                                                
                                                    pityInfoText = pityRemaining > 0 
                                                                    ? `Гарантированный ${guaranteedItemText} через ${pityRemaining}` 
                                                                    : `Гарантированный ${guaranteedItemText} СЛЕДУЮЩИЙ!`;
                                                }
                                                // --- >>> КОНЕЦ ИЗМЕНЕНИЙ <<< ---

                                                // Старая логика для pityRemaining, если она еще где-то используется, 
                                                // в противном случае ее можно удалить, если новая полностью заменяет ее.
                                                // const originalPityRemaining = Math.max(0, chest.pityLimit - currentPityCount); 

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
                                                        
                                                        {/* --- ИЗМЕНЕННЫЙ БЛОК ОТОБРАЖЕНИЯ ГАРАНТА --- */}
                                                        <div className="chest-pity-info-container">
                                                            {/* Используем новый флаг displayPityInfo */}
                                                            {displayPityInfo && (
                                                                <div className="chest-pity-info">
                                                                    {/* Класс для стилизации можно сделать общим или, если вы хотите специфичный цвет, 
                                                                        можно выбрать, например, самую высокую редкость из chest.pity.pityEnabledRarities
                                                                        и использовать ее для класса. Для простоты пока оставим 'legendary' как пример.
                                                                    */}
                                                                    <span className={`rarity-legendary`}> {/* <--- Возможно, потребуется более динамичный класс */}
                                                                        {pityInfoText}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* --- КОНЕЦ ИЗМЕНЕННОГО БЛОКА --- */}

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
                                        </motion.div>
                                    </AnimatePresence>
                                    {numArtifactChests > 1 && !openingChestId && (
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
                                </div>
                            </div>
                        </div>
                        {/* --- КОНЕЦ СУНДУКОВ АРТЕФАКТОВ --- */}

                    {/* --- 6. ОБЫЧНЫЕ НАБОРЫ (General Bundles) --- */}
                    {GENERAL_BUNDLES && GENERAL_BUNDLES.length > 0 && (
                        <div className="shop-section general-bundles-section">
                            <h3 className="shop-section-title">Наборы</h3>
                            <div className="section-content-box">
                                 <div className="bundle-carousel-container general-bundle-carousel">
                                    <AnimatePresence initial={false} custom={directionGeneral} mode='wait'>
                                        <motion.div
                                            key={`general-${currentGeneralBundleIndex}`}
                                            className="bundle-slide"
                                            custom={directionGeneral}
                                            variants={slideVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            drag="x"
                                            dragConstraints={{ left: 0, right: 0 }}
                                            dragElastic={0.6}
                                            onDragEnd={handleDragEndGeneralBundle}
                                            style={{ position: 'absolute', width: '100%' }}
                                        >
                                            {GENERAL_BUNDLES[currentGeneralBundleIndex] && (
                                                <BundleCard
                                                    bundle={GENERAL_BUNDLES[currentGeneralBundleIndex]}
                                                    onPurchase={() => {
                                                        const currentBundle = GENERAL_BUNDLES[currentGeneralBundleIndex];
                                                        if (currentBundle && purchaseBundle) {
                                                            purchaseBundle(currentBundle.id);
                                                        } else if (currentBundle) {
                                                            alert(`Покупка набора ${currentBundle.name} в разработке`);
                                                        }
                                                    }}
                                                />
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                    {numGeneralBundles > 1 && !openingChestId && (
                                        <>
                                            <button className="carousel-nav-button prev" onClick={() => paginateGeneralBundle(-1)} aria-label="Предыдущий набор">◀</button>
                                            <button className="carousel-nav-button next" onClick={() => paginateGeneralBundle(1)} aria-label="Следующий набор">▶</button>
                                            <div className="carousel-pagination">
                                                {GENERAL_BUNDLES.map((_, index) => (
                                                    <button
                                                        key={`dot-general-${index}`}
                                                        className={`dot ${index === currentGeneralBundleIndex ? 'active' : ''}`}
                                                        onClick={() => {
                                                            if (index !== currentGeneralBundleIndex) {
                                                                setDirectionGeneral(index > currentGeneralBundleIndex ? 1 : -1);
                                                                setCurrentGeneralBundleIndex(index);
                                                            }
                                                        }}
                                                        aria-label={`Перейти к набору ${index + 1}`}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {/* --- КОНЕЦ ОБЫЧНЫХ НАБОРОВ --- */}

                    {/* --- 7. ПОКУПКА ВАЛЮТЫ (Currency) --- */}
                    {currencyPacks && currencyPacks.length > 0 && (
                        <div className="shop-section">
                            <h3 className="shop-section-title">Валюта</h3>
                            <div className="section-content-box">
                                <div className="daily-shop-grid currency-grid">
                                    {currencyPacks.map(pack => (
                                        <CurrencyPackCard 
                                            key={pack.id} 
                                            pack={pack} 
                                            onPurchase={() => purchaseCurrencyPack ? purchaseCurrencyPack(pack.id) : alert('Покупка валюты в разработке')} 
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {/* --- КОНЕЦ ПОКУПКИ ВАЛЮТЫ --- */}

                </div> {/* Конец .shop-scrollable-content */}
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
        </>
    );
};

export default Shop;