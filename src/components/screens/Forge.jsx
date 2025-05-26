// src/components/Forge.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// --- >>> Подключаем навигацию (из код 1) <<< ---
import { useNavigate } from 'react-router-dom';

// --- Импорты Swiper (без изменений) ---
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

// --- Импорт попапа ---
import CraftingSuccessPopup from '../popups/CraftingSuccessPopup.jsx';

// --- Остальные импорты (из код 2, проверены на соответствие) ---
import useGameStore from '../../store/useGameStore'; // Убедитесь, что useGameStore экспортирует startScreenTransition, если используется
import itemsDatabase, { getItemById } from '../../data/itemsDatabase';
import forgeRecipes from '../../data/forgeDatabase';
import CompactRecipeCard from '../CompactRecipeCard';
import './Forge.scss';
import ForgeItemInfoPopup from '../popups/ForgeItemInfoPopup.jsx';


// --- >>> Путь к видео (из код 1) <<< ---
const FORGE_VIDEO_PATH = '/assets/videos/forge_animation.mp4'; // <-- УКАЖИ ПРАВИЛЬНЫЙ ПУТЬ К ВИДЕО!

// --- Варианты анимации (из код 2, itemAppearVariants оставлен) ---
const itemAppearVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

// Основной компонент Кузницы
const Forge = () => {
    // --- Стор и данные (из код 2) ---
    const { inventory, gold, diamonds, executeForgeRecipe } = useGameStore((state) => ({
        inventory: state.inventory,
        gold: state.gold,
        diamonds: state.diamonds,
        executeForgeRecipe: state.executeForgeRecipe,
    }));

    // --- >>> Хук навигации (из код 1) <<< ---
    const navigate = useNavigate();

    // --- Состояния и Refs (объединены из код 1 и код 2) ---
    const OUTPUT_RARITIES = ["Uncommon", "Rare", "Epic", "Legendary", "Mythic"];
    const [activeForgeTab, setActiveForgeTab] = useState(OUTPUT_RARITIES.length > 0 ? OUTPUT_RARITIES[0] : "");
    const [selectedRecipeData, setSelectedRecipeData] = useState(null);
    const [swiperInstance, setSwiperInstance] = useState(null);
    const [isCrafting, setIsCrafting] = useState(false); // Состояние для показа видео (из код 1)
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [lastCraftedItem, setLastCraftedItem] = useState(null);
    const [showItemInfoPopup, setShowItemInfoPopup] = useState(false);
    const [itemForInfoPopup, setItemForInfoPopup] = useState(null);
    const videoRef = useRef(null); // Ref для видео (из код 1)
    const recipeToCraftRef = useRef(null); // Ref для рецепта во время видео (из код 1)
    const timerIdRef = useRef(null); // Ref для ID таймера (из код 1 и 2)


    const handleOutputItemClick = useCallback((itemData) => {
    if (isCrafting) return;
    if (itemData) {
        setItemForInfoPopup(itemData);
        setShowItemInfoPopup(true);
    }
}, [isCrafting, showItemInfoPopup]); // Добавлена зависимость showItemInfoPopup, хотя она может быть не нужна если логика не зависит от её текущего значения для установки

    const handleCloseItemInfoPopup = useCallback(() => {
    setShowItemInfoPopup(false);
    // setItemForInfoPopup(null); // Опционально: сбросить данные при закрытии
}, []);

    // useEffect для логгирования (из код 2)
    useEffect(() => {
        console.log("Forge Re-render Triggered. Inv Length:", inventory.length, "Gold:", gold, "Diamonds:", diamonds);
    }, [inventory, gold, diamonds]);


const playerInventoryCounts = {};
    inventory.forEach(item => {
        if (item?.id && item?.rarity) {
            const key = `${item.id}_${item.rarity}`;
            playerInventoryCounts[key] = (playerInventoryCounts[key] || 0) + (item.quantity || 1);
        }
    });

    const availableForges = forgeRecipes.map(recipe => {
        const outputItemData = getItemById(recipe.outputItemId);
        if (!outputItemData) {
            console.warn(`Forge: Output item data not found for ID: ${recipe.outputItemId} in recipe: ${recipe.id}`);
            return {
                ...recipe,
                id: recipe.id || `unknown_${recipe.outputItemId}`,
                canCraft: false,
                allInputItemsAvailable: false,
                outputItemData: null,
                inputItemsData: [],
                cost: recipe.cost || { gold: 0, diamonds: 0 }
            };
        }

        const tempAvailablePlayerItems = { ...playerInventoryCounts };
        
        let allRecipeInputSlotsFilled = true;

        const inputItemsDataForDisplay = (recipe.inputItems || []).map(inputSlotRecipe => {
            const itemKey = `${inputSlotRecipe.itemId}_${inputSlotRecipe.rarity}`;
            const requiredQuantityForThisSlot = inputSlotRecipe.quantity; 

            let ownedForThisSlotDisplay = 0; 
            let isThisSlotSatisfied = false;  

            if (tempAvailablePlayerItems[itemKey] && tempAvailablePlayerItems[itemKey] >= requiredQuantityForThisSlot) {
                tempAvailablePlayerItems[itemKey] -= requiredQuantityForThisSlot; 
                ownedForThisSlotDisplay = requiredQuantityForThisSlot; 
                isThisSlotSatisfied = true;
            } else {
                allRecipeInputSlotsFilled = false; 
            }

            const itemDataFromDb = getItemById(inputSlotRecipe.itemId);
            return {
                ...inputSlotRecipe, 
                ownedCountDisplay: ownedForThisSlotDisplay,      
                totalRequiredDisplay: requiredQuantityForThisSlot, 
                isAvailable: isThisSlotSatisfied, 
                data: itemDataFromDb || { name: 'Unknown', image: '/assets/default-item.png', rarity: 'Common' }
            };
        });

        const hasEnoughCurrency = (gold >= (recipe.cost?.gold || 0) && diamonds >= (recipe.cost?.diamonds || 0));
        const canCraftOverall = allRecipeInputSlotsFilled && hasEnoughCurrency; 

        return {
            ...recipe,
            canCraft: canCraftOverall,
            allInputItemsAvailable: allRecipeInputSlotsFilled, 
            outputItemData,
            inputItemsData: inputItemsDataForDisplay, 
            cost: recipe.cost || { gold: 0, diamonds: 0 }
        };
    }).filter(recipe => recipe && recipe.outputItemData);

    const filteredUpgrades = availableForges.filter(recipe => recipe.outputItemData?.rarity === activeForgeTab);

    useEffect(() => {
        const needsInitialSelectionForTab = !selectedRecipeData || selectedRecipeData.outputItemData?.rarity !== activeForgeTab;

        if (needsInitialSelectionForTab && filteredUpgrades.length > 0) {
            const initialIndex = 0;
            const recipeToSelectInitial = filteredUpgrades[initialIndex];
            if (selectedRecipeData?.id !== recipeToSelectInitial?.id) {
                setSelectedRecipeData(recipeToSelectInitial);
            }
            if (swiperInstance && !swiperInstance.destroyed) {
                 if (swiperInstance.params.loop && filteredUpgrades.length > 1) {
                    swiperInstance.slideToLoop(initialIndex, 0);
                } else {
                    swiperInstance.slideTo(initialIndex, 0);
                }
            }
        } else if (filteredUpgrades.length === 0 && selectedRecipeData !== null) {
            setSelectedRecipeData(null); 
        }
    }, [activeForgeTab, filteredUpgrades, swiperInstance, selectedRecipeData]);


    const checkCraftableInTab = useCallback((rarity) => {
        return availableForges.some(recipe => recipe.outputItemData?.rarity === rarity && recipe.canCraft);
    }, [availableForges]);

    const handleTabChange = useCallback((rarity) => {
        if (isCrafting) return; 
        setActiveForgeTab(rarity);
    }, [isCrafting]);

    const handleSlideChange = useCallback((swiper) => {
        if (isCrafting || showItemInfoPopup) return; // Блокируем свайп во время видео или показа попапа информации
        if (filteredUpgrades.length > 0 && swiper) {
            const activeIndex = swiper.realIndex !== undefined ? swiper.realIndex : swiper.activeIndex;
            const validIndex = Math.min(Math.max(0, activeIndex), filteredUpgrades.length - 1);
            const recipeToSelect = filteredUpgrades [validIndex];

            if (recipeToSelect && (!selectedRecipeData || selectedRecipeData.id !== recipeToSelect.id)) {
                setSelectedRecipeData(recipeToSelect);
            }
        } else if (filteredUpgrades.length === 0 && selectedRecipeData !== null) {
            setSelectedRecipeData(null);
        }
    }, [filteredUpgrades, selectedRecipeData, isCrafting, showItemInfoPopup]);


    const handleForgeClick = useCallback((recipe) => {
        if (!recipe || !recipe.canCraft || isCrafting || showItemInfoPopup) { // Добавлена проверка showItemInfoPopup
            console.warn("Attempted to craft with insufficient resources, invalid recipe, already crafting, or info popup is open.");
            return;
        }
        if (!executeForgeRecipe) {
            console.error("Action 'executeForgeRecipe' не найден в сторе!");
            return;
        }
        recipeToCraftRef.current = recipe;
        setLastCraftedItem(null);
        setShowSuccessPopup(false);
        setIsCrafting(true);
    }, [isCrafting, showItemInfoPopup, executeForgeRecipe]); // Добавлена зависимость showItemInfoPopup


    const handleVideoEnd = useCallback(() => {
        const recipe = recipeToCraftRef.current;
        if (!recipe) {
            if (videoRef.current && !videoRef.current.paused) { videoRef.current.pause(); }
            setIsCrafting(false); // Убедимся, что крафтинг сбрасывается
            return;
        }

        if (videoRef.current && !videoRef.current.paused) { videoRef.current.pause(); }
        recipeToCraftRef.current = null;
        if (timerIdRef.current) { clearTimeout(timerIdRef.current); timerIdRef.current = null; }

        let success = false;
        try {
            const recipePayload = {
                id: recipe.id,
                outputItemId: recipe.outputItemId,
                inputItems: recipe.inputItems, // Передаем оригинальные inputItems, а не inputItemsData
                cost: recipe.cost
            };

            if (!recipePayload.id || typeof recipePayload.id !== 'string' ||
                !recipePayload.outputItemId || typeof recipePayload.outputItemId !== 'string' ||
                !Array.isArray(recipePayload.inputItems) ||
                !recipePayload.cost || typeof recipePayload.cost !== 'object')
            {
                console.error("handleVideoEnd: Невалидный payload ПЕРЕД вызовом стора!", recipePayload);
                throw new Error("Invalid payload construction in Forge component.");
            }

            success = executeForgeRecipe(recipePayload);

            if (success) {
                setLastCraftedItem(recipe.outputItemData);
                setShowSuccessPopup(true);
            } else {
                console.error(`Crafting failed in store for recipe: ${recipe.id}`);
            }
        } catch (error) {
            console.error("handleVideoEnd: Ошибка во время или после executeForgeRecipe:", error);
        } finally {
            setIsCrafting(false);
        }
    }, [executeForgeRecipe, setLastCraftedItem, setShowSuccessPopup, setIsCrafting]); // Добавлены зависимости


    useEffect(() => {
        if (timerIdRef.current) {
            clearTimeout(timerIdRef.current);
            timerIdRef.current = null;
        }

        if (isCrafting && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(error => {
                console.error("Video play failed:", error);
                handleVideoEnd(); 
            });

            const videoDurationLimit = 3000; 
            timerIdRef.current = setTimeout(() => {
                console.log("Video timeout reached, calling handleVideoEnd.");
                handleVideoEnd();
            }, videoDurationLimit);
        }

        return () => {
            if (timerIdRef.current) {
                clearTimeout(timerIdRef.current);
                timerIdRef.current = null;
            }
            if (videoRef.current && !videoRef.current.paused) {
                videoRef.current.pause();
            }
        };
    }, [isCrafting, handleVideoEnd]);

    // --- >>> ОБНОВЛЕННЫЙ Обработчик для кнопки в попапе (из код 1) <<< ---
    // Эта функция будет передана в CraftingSuccessPopup
    const handleNavigateToInventory = useCallback(() => {
        setShowSuccessPopup(false); // Сначала скрыть попап
        const store = useGameStore.getState();
        if (store.startScreenTransition) {
            // УКАЖИ ПРАВИЛЬНЫЙ ПУТЬ К ИНВЕНТАРЮ, если он отличается от '/inventory'
            store.startScreenTransition(() => navigate('/inventory'), { preservesBottomNav: true });
        } else {
            // УКАЖИ ПРАВИЛЬНЫЙ ПУТЬ К ИНВЕНТАРЮ, если он отличается от '/inventory'
            navigate('/inventory');
        }
    }, [navigate, setShowSuccessPopup]); // Добавлена setShowSuccessPopup в зависимости

console.log("Rendering popups. showSuccessPopup:", showSuccessPopup, "lastCraftedItem:", lastCraftedItem);

    // --- Рендер компонента (объединенный) ---
    return (
        
        <motion.div
            className="forge-screen"
        >
            {isCrafting && (
                <div className="forge-video-overlay">
                    <video
                        ref={videoRef}
                        src={FORGE_VIDEO_PATH}
                        onEnded={handleVideoEnd} // Используем handleVideoEnd для события onEnded
                        onError={() => { // Добавим обработку ошибок загрузки/воспроизведения видео
                            console.error("Video error occurred.");
                            handleVideoEnd(); // Вызываем handleVideoEnd как fallback
                        }}
                        muted
                        playsInline
                        preload="auto" // Можно изменить на "metadata" если видео тяжелое
                    />
                </div>
            )}

<div style={{ visibility: (isCrafting || showItemInfoPopup) ? 'hidden' : 'visible', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* --- >>> НОВАЯ ШАПКА С ВАЛЮТАМИ <<< --- */}
                <div className="forge-currency-header">
                    <div className="currency-display">
                        <img className="currency-icon" src="/assets/coin-icon.png" alt="Золото" /> {/* Укажите правильный путь к иконке золота */}
                        <span className="currency-amount">{gold.toLocaleString()}</span>
                    </div>
                    <div className="currency-display">
                        <img className="currency-icon" src="/assets/diamond-image.png" alt="Алмазы" /> {/* Укажите правильный путь к иконке алмазов */}
                        <span className="currency-amount">{diamonds.toLocaleString()}</span>
                    </div>
                </div>
                {/* --- >>> КОНЕЦ НОВОЙ ШАПКИ <<< --- */}
                <div className="forge-rarity-tabs">
                    {OUTPUT_RARITIES.map(rarity => (
                        <button
                            key={rarity}
                            className={`rarity-tab-button ${activeForgeTab === rarity ? 'active' : ''} rarity-${rarity.toLowerCase()}`}
                            onClick={() => handleTabChange(rarity)}
                            disabled={isCrafting}
                        >
                            {rarity}
                            {checkCraftableInTab(rarity) && <span className="tab-indicator">!</span>}
                        </button>
                    ))}
                </div>

                <div className="forge-main-content">
                    <div className="forge-swiper-section">
                        <div className="forge-swiper-wrapper">
                             {filteredUpgrades.length === 0 && (
                                    <p className="no-recipes">Нет улучшений до редкости {activeForgeTab}</p>
                             )}
                             {filteredUpgrades.length > 0 && (
                                <Swiper
                                    grabCursor={!isCrafting && !showItemInfoPopup}
                                    centeredSlides={true}
                                    slidesPerView={'auto'}
                                    loop={filteredUpgrades.length > 2} 
                                    spaceBetween={15}
                                    className="forge-recipes-swiper centered-swiper"
                                    onSwiper={setSwiperInstance}
                                    onSlideChange={handleSlideChange}
                                    allowTouchMove={!isCrafting && !showItemInfoPopup}
                                    key={activeForgeTab + "_swiper"} 
                                >
                                    {filteredUpgrades.map((recipe) => (
                                        <SwiperSlide key={recipe.id + "_slide"} style={{ width: 'auto' }}>
                                            <CompactRecipeCard recipe={recipe} />
                                        </SwiperSlide>
                                    ))}
                                </Swiper>
                             )}
                        </div>
                    </div>

                    <div className={`
                            forge-recipe-details-section
                            ${selectedRecipeData?.outputItemData?.rarity ? `rarity-output-${selectedRecipeData.outputItemData.rarity.toLowerCase()}` : ''}
                        `}>
                        {selectedRecipeData ? (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={selectedRecipeData.id + "_details"} 
                                    className={`crafting-area ${selectedRecipeData?.outputItemData?.rarity ? `rarity-output-${selectedRecipeData.outputItemData.rarity.toLowerCase()}` : ''}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >                                       
                                    <div className="crafting-items-grid">
                                        <motion.svg
                                            className="connector-lines-svg"
                                            viewBox="0 0 250 250" 
                                            xmlns="http://www.w3.org/2000/svg"
                                            preserveAspectRatio="xMidYMid meet" 
                                            animate={{ opacity: isCrafting ? 0 : 1 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {(() => {
                                                const gridCenterX = 125; 
                                                const gridCenterY = 125; 

                                                const inputPositionsInGrid = [
                                                    { col: 2, row: 3 }, 
                                                    { col: 1, row: 1 }, 
                                                    { col: 3, row: 1 }, 
                                                ];

                                                const cellWidth = 250 / 3;
                                                const cellHeight = 250 / 3;

                                                const linesAreActive = selectedRecipeData.allInputItemsAvailable; 

                                                return selectedRecipeData.inputItemsData.slice(0, 3).map((_, index) => {
                                                    const pos = inputPositionsInGrid[index];
                                                    if (pos) {
                                                        const inputX = (pos.col - 0.5) * cellWidth;
                                                        const inputY = (pos.row - 0.5) * cellHeight;

                                                        return (
                                                            <line
                                                                key={`line-${index}-${selectedRecipeData.id}`}
                                                                x1={inputX} y1={inputY}
                                                                x2={gridCenterX} y2={gridCenterY} 
                                                                className={`connector-line ${linesAreActive ? 'line-active' : 'line-inactive'}`}
                                                            />
                                                        );
                                                    }
                                                    return null;
                                                });
                                            })()}
                                        </motion.svg>

                                        <div
                                            className="output-item-focus"
                                            onClick={() => handleOutputItemClick(selectedRecipeData.outputItemData)}
                                            style={{ cursor: selectedRecipeData.outputItemData ? 'pointer' : 'default' }} 
                                        >
                                            <div className={`recipe-item-display output focus rarity-${selectedRecipeData.outputItemData.rarity.toLowerCase()}`}>
                                                <img src={selectedRecipeData.outputItemData.image || '/assets/default-item.png'} alt={selectedRecipeData.outputItemData.name} />
                                            </div>
                                        </div>

                                        {(Array.isArray(selectedRecipeData.inputItemsData) ? selectedRecipeData.inputItemsData.slice(0, 3) : []).map((inputDisplayData, inputIndex) => (
        <div
            key={`${selectedRecipeData.id}-input-${inputIndex}`}
            className={`input-item-focus input-pos-${inputIndex}`}
            style={{ '--input-index': inputIndex }}
            onClick={() => inputDisplayData.data && handleOutputItemClick(inputDisplayData.data)} // Добавляем onClick для ингредиентов
        >
            <div className={`recipe-item-display input focus rarity-${inputDisplayData.data?.rarity?.toLowerCase()} ${
                !inputDisplayData.isAvailable ? 'dimmed' : '' 
            }`}>
                <img src={inputDisplayData.data?.image || '/assets/default-item.png'} alt={inputDisplayData.data?.name || 'Input item'} />
            </div>
            <div className={`input-count ${inputDisplayData.isAvailable ? 'enough' : 'not-enough'}`}>
                {`${inputDisplayData.ownedCountDisplay}/${inputDisplayData.totalRequiredDisplay}`}
            </div>
        </div>
    ))}
                                    </div>
                                    <div className="crafting-area-bottom">
                                        <motion.div
                                            className="cost-focus"
                                            variants={itemAppearVariants}
                                            initial="hidden"
                                            animate="visible"
                                        >
                                        {(selectedRecipeData.cost?.gold || 0) > 0 && (
                                            <span className={gold < (selectedRecipeData.cost.gold || 0) ? 'not-enough-currency' : ''}>
                                                <img className="currency-icon" src="/assets/coin-icon.png" alt="gold"/>
                                                {(selectedRecipeData.cost.gold || 0).toLocaleString()}
                                            </span>
                                        )}
                                        {(selectedRecipeData.cost?.diamonds || 0) > 0 && (
                                            <span className={diamonds < (selectedRecipeData.cost.diamonds || 0) ? 'not-enough-currency' : ''}>
                                                <img className="currency-icon" src="/assets/diamond-image.png" alt="diamond"/>
                                                {(selectedRecipeData.cost.diamonds || 0).toLocaleString()}
                                            </span>
                                        )}
                                        </motion.div>

                                        <motion.div
                                            className="action-focus"
                                            variants={itemAppearVariants}
                                            initial="hidden"
                                            animate="visible"
                                        >
                                            <button
                                                className="forge-button focus-button"
                                                onClick={() => handleForgeClick(selectedRecipeData)}
                                                disabled={!selectedRecipeData.canCraft || isCrafting || showItemInfoPopup}
                                            >
                                                {isCrafting ? "Создание..." : "Forge"}
                                            </button>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        ) : (
                            <div className="no-recipe-selected">
                                {filteredUpgrades.length > 0
                                    ? 'Выберите рецепт...'
                                    : `Нет доступных улучшений для редкости ${activeForgeTab}`
                                }
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showSuccessPopup && lastCraftedItem && (
                    <CraftingSuccessPopup
                        key="crafting-success-popup"
                        itemData={lastCraftedItem} 
                        onNavigateToInventory={handleNavigateToInventory} 
                        // onClose={() => setShowSuccessPopup(false)} // Если нужна отдельная кнопка закрытия
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showItemInfoPopup && itemForInfoPopup && (
                    <ForgeItemInfoPopup
                        key="forge-item-info-display-popup" 
                        item={itemForInfoPopup}
                        onClose={handleCloseItemInfoPopup}
                    />
                )}
            </AnimatePresence>
            
        </motion.div>
    );
};

export default Forge;