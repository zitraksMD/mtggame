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
import useGameStore from '../../store/useGameStore';
import itemsDatabase, { getItemById } from '../../data/itemsDatabase';
import forgeRecipes from '../../data/forgeDatabase';
import CompactRecipeCard from '../CompactRecipeCard';
import './Forge.scss';

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
    const videoRef = useRef(null); // Ref для видео (из код 1)
    const recipeToCraftRef = useRef(null); // Ref для рецепта во время видео (из код 1)
    const timerIdRef = useRef(null); // Ref для ID таймера (из код 1 и 2)

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

        // 2. Для КАЖДОГО рецепта создаем ВРЕМЕННУЮ копию инвентаря игрока.
        // Мы будем "расходовать" предметы из этой копии для текущего рецепта.
        const tempAvailablePlayerItems = { ...playerInventoryCounts };
        
        let allRecipeInputSlotsFilled = true; // Флаг, что все СЛОТЫ ИНГРЕДИЕНТОВ для этого рецепта могут быть заполнены

        // 3. Обрабатываем каждый СЛОТ ингредиента из recipe.inputItems индивидуально
        const inputItemsDataForDisplay = (recipe.inputItems || []).map(inputSlotRecipe => {
            const itemKey = `${inputSlotRecipe.itemId}_${inputSlotRecipe.rarity}`;
            const requiredQuantityForThisSlot = inputSlotRecipe.quantity; // В вашем случае это всегда 1

            let ownedForThisSlotDisplay = 0; // Сколько показывать как "имеется" для этого слота (0 или 1)
            let isThisSlotSatisfied = false;  // Удовлетворен ли этот конкретный слот

            // Проверяем, можем ли мы взять предмет для ЭТОГО слота из временного инвентаря
            if (tempAvailablePlayerItems[itemKey] && tempAvailablePlayerItems[itemKey] >= requiredQuantityForThisSlot) {
                tempAvailablePlayerItems[itemKey] -= requiredQuantityForThisSlot; // "Расходуем" предмет из временного инвентаря
                ownedForThisSlotDisplay = requiredQuantityForThisSlot; // Для отображения "1/1"
                isThisSlotSatisfied = true;
            } else {
                allRecipeInputSlotsFilled = false; // Если хотя бы один слот не может быть заполнен
                // ownedForThisSlotDisplay остается 0 для отображения "0/1"
            }

            const itemDataFromDb = getItemById(inputSlotRecipe.itemId);
            return {
                ...inputSlotRecipe, // itemId, rarity, quantity (которое = 1)
                ownedCountDisplay: ownedForThisSlotDisplay,    // Будет 0 или 1
                totalRequiredDisplay: requiredQuantityForThisSlot, // Будет 1
                isAvailable: isThisSlotSatisfied, // Флаг для затемнения этой конкретной иконки
                data: itemDataFromDb || { name: 'Unknown', image: '/assets/default-item.png', rarity: 'Common' }
            };
        });

        const hasEnoughCurrency = (gold >= (recipe.cost?.gold || 0) && diamonds >= (recipe.cost?.diamonds || 0));
        const canCraftOverall = allRecipeInputSlotsFilled && hasEnoughCurrency; // Общая возможность крафта

        return {
            ...recipe,
            canCraft: canCraftOverall,
            allInputItemsAvailable: allRecipeInputSlotsFilled, // Используется для активности линий
            outputItemData,
            inputItemsData: inputItemsDataForDisplay, // Теперь каждый элемент здесь имеет own/total для отображения 0/1 или 1/1
            cost: recipe.cost || { gold: 0, diamonds: 0 }
        };
    }).filter(recipe => recipe && recipe.outputItemData);

    // Фильтруем по активной вкладке (из код 2)
    const filteredUpgrades = availableForges.filter(recipe => recipe.outputItemData?.rarity === activeForgeTab);


    // --- Эффект для установки/обновления selectedRecipeData (из код 2, логика код 1 по isCrafting удалена) ---
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
            setSelectedRecipeData(null); // Если на текущей вкладке нет рецептов, сбрасываем выбранный
        }
    }, [activeForgeTab, filteredUpgrades, swiperInstance, selectedRecipeData]);


    // --- Обработчики ---

    // Проверка крафтабельности во вкладке (из код 2)
    const checkCraftableInTab = useCallback((rarity) => {
        return availableForges.some(recipe => recipe.outputItemData?.rarity === rarity && recipe.canCraft);
    }, [availableForges]);

    // Смена вкладки (из код 2, проверка isCrafting оставлена)
    const handleTabChange = useCallback((rarity) => {
        if (isCrafting) return; // Не меняем вкладку во время видео
        setActiveForgeTab(rarity);
    }, [isCrafting]);

    // Обновление selectedRecipeData при свайпе (из код 2, блокировка isCrafting добавлена)
    const handleSlideChange = useCallback((swiper) => {
        if (isCrafting) return; // Блокируем свайп во время видео
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
    }, [filteredUpgrades, selectedRecipeData, isCrafting]); // Добавлена зависимость isCrafting


    // --- >>> ОБНОВЛЕННЫЙ handleForgeClick (запускает видео, из код 1, с проверками из код 2) <<< ---
    const handleForgeClick = useCallback((recipe) => {
        if (!recipe || !recipe.canCraft || isCrafting) {
            console.warn("Attempted to craft with insufficient resources, invalid recipe, or already crafting.");
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
    }, [isCrafting, executeForgeRecipe]);


    // --- >>> Обработчик конца видео ИЛИ таймера (из код 2, но триггерит показ попапа из код 1) <<< ---
    const handleVideoEnd = useCallback(() => {
        const recipe = recipeToCraftRef.current;
        if (!recipe) {
            if (videoRef.current && !videoRef.current.paused) { videoRef.current.pause(); }
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
                inputItems: recipe.inputItems,
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
    }, [executeForgeRecipe]);


    // --- >>> Эффект для запуска видео и таймера (из код 2, использует handleVideoEnd) <<< ---
    useEffect(() => {
        if (timerIdRef.current) {
            clearTimeout(timerIdRef.current);
            timerIdRef.current = null;
        }

        if (isCrafting && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(error => {
                console.error("Video play failed:", error);
                handleVideoEnd(); // Fallback
            });

            const videoDurationLimit = 3000; // 3 секунды
            timerIdRef.current = setTimeout(() => {
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

    // --- >>> НОВЫЙ Обработчик для кнопки в попапе (из код 1) <<< ---
    const handleNavigateToInventory = useCallback(() => {
         navigate('/inventory'); // <-- УКАЖИ ПРАВИЛЬНЫЙ ПУТЬ К ИНВЕНТАРЮ
    }, [navigate]);


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
                        onEnded={handleVideoEnd}
                        muted
                        playsInline
                        preload="auto"
                    />
                </div>
            )}

            <div style={{ visibility: isCrafting ? 'hidden' : 'visible', height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                                     grabCursor={!isCrafting}
                                     centeredSlides={true}
                                     slidesPerView={'auto'}
                                     loop={filteredUpgrades.length > 2} // Loop if more than 2 slides (Swiper best practice for loop with centered slides)
                                     spaceBetween={15}
                                     className="forge-recipes-swiper centered-swiper"
                                     onSwiper={setSwiperInstance}
                                     onSlideChange={handleSlideChange}
                                     allowTouchMove={!isCrafting}
                                     key={activeForgeTab + "_swiper"} // More specific key
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
                                    key={selectedRecipeData.id + "_details"} // More specific key
                                    className={`crafting-area ${selectedRecipeData?.outputItemData?.rarity ? `rarity-output-${selectedRecipeData.outputItemData.rarity.toLowerCase()}` : ''}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >                                       
                                    <div className="crafting-items-grid">
                                        <motion.svg
                                           className="connector-lines-svg"
                                           // Координаты viewBox должны охватывать всю область сетки
                                           // Если сетка max-width: 250px, aspect-ratio: 1/1, то viewBox ~ "0 0 250 250"
                                           // Точные значения зависят от паддингов и размеров иконок внутри сетки
                                           viewBox="0 0 250 250" // Пример, нужно будет подстроить
                                           xmlns="http://www.w3.org/2000/svg"
                                           preserveAspectRatio="xMidYMid meet" // или none, если не нужно сохранять пропорции
                                           animate={{ opacity: isCrafting ? 0 : 1 }}
                                           transition={{ duration: 0.3 }}
                                        >
                                            {(() => {
                                                // Центр сетки (output)
                                                const gridCenterX = 125; // 250 / 2
                                                const gridCenterY = 125; // 250 / 2

                                                // Примерные относительные позиции для входов (в процентах от размеров сетки)
                                                // Их нужно будет точно рассчитать исходя из grid-template-columns/rows и gap
                                                const inputPositionsInGrid = [
                                                    { col: 2, row: 3 }, // input-pos-0 (нижний центральный)
                                                    { col: 1, row: 1 }, // input-pos-1 (верхний левый)
                                                    { col: 3, row: 1 }, // input-pos-2 (верхний правый)
                                                ];

                                                // Размеры ячейки (примерные, без учета gap)
                                                const cellWidth = 250 / 3;
                                                const cellHeight = 250 / 3;

                                                const linesAreActive = selectedRecipeData.allInputItemsAvailable; 

                                                return selectedRecipeData.inputItemsData.slice(0, 3).map((_, index) => {
                                                    const pos = inputPositionsInGrid[index];
                                                    if (pos) {
                                                        // Координаты центра входной ячейки
                                                        const inputX = (pos.col - 0.5) * cellWidth;
                                                        const inputY = (pos.row - 0.5) * cellHeight;

                                                        return (
                                                            <line
                                                                key={`line-${index}-${selectedRecipeData.id}`}
                                                                x1={inputX} y1={inputY}
                                                                x2={gridCenterX} y2={gridCenterY} // Линия к центру сетки (где выход)
                                                                className={`connector-line ${linesAreActive ? 'line-active' : 'line-inactive'}`}
                                                            />
                                                        );
                                                    }
                                                    return null;
                                                });
                                            })()}
                                        </motion.svg>

                                        <div className="output-item-focus">
                                            <div className={`recipe-item-display output focus rarity-${selectedRecipeData.outputItemData.rarity.toLowerCase()}`}>
                                                <img src={selectedRecipeData.outputItemData.image || '/assets/default-item.png'} alt={selectedRecipeData.outputItemData.name} />
                                            </div>
                                        </div>

                                        {(Array.isArray(selectedRecipeData.inputItemsData) ? selectedRecipeData.inputItemsData.slice(0, 3) : []).map((inputDisplayData, inputIndex) => (
                <div
                    key={`${selectedRecipeData.id}-input-${inputIndex}`}
                    className={`input-item-focus input-pos-${inputIndex}`}
                    style={{ '--input-index': inputIndex }}
                >
                    <div className={`recipe-item-display input focus rarity-${inputDisplayData.data?.rarity?.toLowerCase()} ${
                        !inputDisplayData.isAvailable ? 'dimmed' : '' // Используем isAvailable из inputDisplayData
                    }`}>
                        <img src={inputDisplayData.data?.image || '/assets/default-item.png'} alt={inputDisplayData.data?.name || 'Input item'} />
                    </div>
                    {/* Используем новые поля для отображения 0/1 или 1/1 */}
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
                                                disabled={!selectedRecipeData.canCraft || isCrafting}
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
                    />
                )}
            </AnimatePresence>

        </motion.div>
    );
};

export default Forge;