// src/components/Forge.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// --- >>> Подключаем навигацию (из код 1) <<< ---
import { useNavigate } from 'react-router-dom';

// --- Импорты Swiper (без изменений) ---
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

// --- Импорт попапа ---
import CraftingSuccessPopup from './CraftingSuccessPopup'; // <-- Убедись, что импортируешь измененный

// --- Остальные импорты (из код 2, проверены на соответствие) ---
import useGameStore from '../store/useGameStore';
import itemsDatabase, { getItemById } from '../data/itemsDatabase';
import forgeRecipes from '../data/forgeDatabase';
import CompactRecipeCard from './CompactRecipeCard';
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
    const [activeForgeTab, setActiveForgeTab] = useState(OUTPUT_RARITIES[0]);
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


    // --- ПРЯМОЙ РАСЧЕТ ДОСТУПНЫХ РЕЦЕПТОВ (из код 2) ---
    console.log("Forge Render/Recalculate availableForges. Gold:", gold, "Inv Length:", inventory.length);
    const currentCounts = {};
    inventory.forEach(item => {
        if (item?.id && item?.rarity) {
            const key = `${item.id}_${item.rarity}`;
            currentCounts[key] = (currentCounts[key] || 0) + (item.quantity || 1);
        }
    });

    const availableForges = forgeRecipes.map(recipe => {
        const outputItemData = getItemById(recipe.outputItemId);
        if (!outputItemData) {
            console.warn(`Forge: Output item data not found for ID: ${recipe.outputItemId} in recipe: ${recipe.id}`);
             return { ...recipe, id: recipe.id || `unknown_${recipe.outputItemId}`, canCraft: false, outputItemData: null, inputItemsData: [], cost: recipe.cost || { gold: 0, diamonds: 0 } };
        }

        let hasEnoughItems = true;
        let hasEnoughCurrency = (gold >= (recipe.cost?.gold || 0) && diamonds >= (recipe.cost?.diamonds || 0));

        const requiredCounts = {};
        (recipe.inputItems || []).forEach(input => {
            const key = `${input.itemId}_${input.rarity}`;
            requiredCounts[key] = (requiredCounts[key] || 0) + input.quantity;
        });

        for (const key in requiredCounts) {
            const ownedCount = currentCounts[key] || 0;
            const requiredCount = requiredCounts[key];
            if (ownedCount < requiredCount) {
                hasEnoughItems = false;
                break;
            }
        }

        const inputItemsDataForDisplay = (recipe.inputItems || []).map((input) => {
            const key = `${input.itemId}_${input.rarity}`;
            const ownedCountTotal = currentCounts[key] || 0;
            const totalRequiredForKey = requiredCounts[key] || 0;
            const inputData = getItemById(input.itemId);
            return {
                ...input,
                ownedCount: ownedCountTotal,
                totalRequired: totalRequiredForKey,
                data: inputData || { name: 'Unknown', image: '/assets/default-item.png', rarity: 'Common' }
            };
        });

        const canCraft = hasEnoughItems && hasEnoughCurrency;

        return {
            ...recipe,
            canCraft,
            outputItemData,
            inputItemsData: inputItemsDataForDisplay,
            cost: recipe.cost || { gold: 0, diamonds: 0 }
        };
       }).filter(recipe => recipe && recipe.outputItemData);

    // Фильтруем по активной вкладке (из код 2)
    const filteredUpgrades = availableForges.filter(recipe => recipe.outputItemData?.rarity === activeForgeTab);


    // --- Эффект для установки/обновления selectedRecipeData (из код 2, логика код 1 по isCrafting удалена) ---
    useEffect(() => {
        console.log(`Effect running. Tab: ${activeForgeTab}. Filtered: ${filteredUpgrades.length}. Selected: ${selectedRecipeData?.id}`);
        const needsInitialSelectionForTab = !selectedRecipeData || selectedRecipeData.outputItemData?.rarity !== activeForgeTab;

        if (needsInitialSelectionForTab) {
            console.log(`>>> Needs initial selection for tab ${activeForgeTab}`);
            const initialIndex = 0;
            const recipeToSelectInitial = filteredUpgrades.length > 0 ? filteredUpgrades[initialIndex] : null;
            if (selectedRecipeData?.id !== recipeToSelectInitial?.id) {
                console.log(`   Setting selectedRecipeData to initial: ${recipeToSelectInitial?.id}`);
                setSelectedRecipeData(recipeToSelectInitial);
            } else {
                console.log(`   Initial recipe ${recipeToSelectInitial?.id} is already selected.`);
            }
            if (swiperInstance && !swiperInstance.destroyed) {
                console.log(`   Syncing swiper to initial index ${initialIndex} for tab ${activeForgeTab}`);
                // Использовать slideToLoop если loop активен, иначе slideTo
                if (swiperInstance.params.loop && filteredUpgrades.length > 1) {
                    swiperInstance.slideToLoop(initialIndex, 0);
                } else {
                    swiperInstance.slideTo(initialIndex, 0);
                }
            }
        } else {
             console.log(`<<< Tab ${activeForgeTab} matches selected recipe ${selectedRecipeData?.id}. No initial selection needed.`);
        }
    // isCrafting убрано из зависимостей
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
             // Используем реальный индекс (важно для loop)
            const activeIndex = swiper.realIndex !== undefined ? swiper.realIndex : swiper.activeIndex;
            const validIndex = Math.min(Math.max(0, activeIndex), filteredUpgrades.length - 1);
            const recipeToSelect = filteredUpgrades[validIndex];

            if (recipeToSelect && (!selectedRecipeData || selectedRecipeData.id !== recipeToSelect.id)) {
                console.log(`Setting selectedRecipeData from handleSlideChange to index ${validIndex}, ID: ${recipeToSelect.id}`);
                setSelectedRecipeData(recipeToSelect);
            }
        } else if (filteredUpgrades.length === 0 && selectedRecipeData !== null) {
            console.log("Resetting selectedRecipeData from handleSlideChange because filteredUpgrades is empty");
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
        console.log("Forge button clicked, preparing video for recipe:", recipe.id);
        recipeToCraftRef.current = recipe; // Сохраняем рецепт для обработчика конца видео
        setLastCraftedItem(null);
        setShowSuccessPopup(false);
        setIsCrafting(true); // Показываем видео оверлей
    }, [isCrafting, executeForgeRecipe]);


    // --- >>> Обработчик конца видео ИЛИ таймера (из код 2, но триггерит показ попапа из код 1) <<< ---
    const handleVideoEnd = useCallback(() => {
        const recipe = recipeToCraftRef.current;
        if (!recipe) {
            console.log("handleVideoEnd called, but craft already processed or no recipe.");
            if (videoRef.current && !videoRef.current.paused) { videoRef.current.pause(); }
            //setIsCrafting(false); // <-- Важно: Не сбрасывать здесь, finally сделает это
            return;
        }
        console.log("handleVideoEnd: Рецепт из ref:", JSON.stringify(recipe, null, 2));

        // Останавливаем видео и чистим рефы/таймеры
        if (videoRef.current && !videoRef.current.paused) { videoRef.current.pause(); }
        recipeToCraftRef.current = null; // Очищаем СРАЗУ
        if (timerIdRef.current) { clearTimeout(timerIdRef.current); timerIdRef.current = null; }

        // --- Выполняем логику крафта ---
        let success = false;
        try {
            const recipePayload = {
                id: recipe.id,
                outputItemId: recipe.outputItemId,
                // Используем оригинальные inputItems из recipe, сохраненного в ref
                inputItems: recipe.inputItems,
                cost: recipe.cost
            };
            console.log("handleVideoEnd: Вызываем executeForgeRecipe с payload:", JSON.stringify(recipePayload, null, 2));

            // Валидация payload (из код 2)
            if (!recipePayload.id || typeof recipePayload.id !== 'string' ||
                !recipePayload.outputItemId || typeof recipePayload.outputItemId !== 'string' ||
                !Array.isArray(recipePayload.inputItems) ||
                !recipePayload.cost || typeof recipePayload.cost !== 'object')
            {
                console.error("handleVideoEnd: Невалидный payload ПЕРЕД вызовом стора!", recipePayload);
                console.error(`ID: ${recipePayload.id}, OutputID: ${recipePayload.outputItemId}, InputItems: ${JSON.stringify(recipePayload.inputItems)}, Cost: ${JSON.stringify(recipePayload.cost)}`);
                throw new Error("Invalid payload construction in Forge component.");
            }

            success = executeForgeRecipe(recipePayload);

            if (success) {
                console.log(`Craft successful: ${recipe.outputItemData.name}`);
                setLastCraftedItem(recipe.outputItemData);
                setShowSuccessPopup(true); // <--- ПОКАЗЫВАЕМ ПОПАП (логика из код 1)
            } else {
                 console.error(`Crafting failed in store for recipe: ${recipe.id}`);
                 // TODO: Показать юзеру сообщение об ошибке
            }
        } catch (error) {
            console.error("handleVideoEnd: Ошибка во время или после executeForgeRecipe:", error);
            // TODO: Показать юзеру сообщение об ошибке
        } finally {
            console.log("Hiding video overlay in handleVideoEnd.");
            setIsCrafting(false); // Скрываем видео оверлей В ЛЮБОМ СЛУЧАЕ
        }
    // executeForgeRecipe должен быть стабильным, если он из Zustand/Redux
    }, [executeForgeRecipe]); // Убираем isCrafting из зависимостей


    // --- >>> Эффект для запуска видео и таймера (из код 2, использует handleVideoEnd) <<< ---
    useEffect(() => {
        if (timerIdRef.current) {
            clearTimeout(timerIdRef.current);
            timerIdRef.current = null;
        }

        if (isCrafting && videoRef.current) {
            console.log("Attempting to play video and start 3s timer...");
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(error => {
                console.error("Video play failed:", error);
                console.warn("Autoplay failed, proceeding with craft logic immediately...");
                handleVideoEnd(); // Fallback
            });

            const videoDurationLimit = 3000; // 3 секунды
            timerIdRef.current = setTimeout(() => {
                console.log("Timer finished (3 seconds). Triggering handleVideoEnd.");
                handleVideoEnd();
            }, videoDurationLimit);

        }

        // Функция очистки
        return () => {
            if (timerIdRef.current) {
                console.log("Cleaning up timer on effect cleanup.");
                clearTimeout(timerIdRef.current);
                timerIdRef.current = null;
            }
            if (videoRef.current && !videoRef.current.paused) {
                console.log("Stopping video on effect cleanup.");
                videoRef.current.pause();
            }
        };
    }, [isCrafting, handleVideoEnd]); // handleVideoEnd добавлена как зависимость

    // --- >>> УДАЛЯЕМ handleCloseSuccessPopup из код 1 <<< ---
    // const handleCloseSuccessPopup = useCallback(() => { ... }, []); // НЕ НУЖЕН

    // --- >>> НОВЫЙ Обработчик для кнопки в попапе (из код 1) <<< ---
    const handleNavigateToInventory = useCallback(() => {
         console.log("Navigating to inventory...");
         // Сброс состояния попапа здесь, если Forge НЕ размонтируется
         // setShowSuccessPopup(false);
         // setLastCraftedItem(null);
         navigate('/inventory'); // <-- УКАЖИ ПРАВИЛЬНЫЙ ПУТЬ К ИНВЕНТАРЮ
    }, [navigate]); // Зависит от navigate


    // --- Рендер компонента (объединенный) ---
    return (
        <motion.div
            className="forge-screen"
        >
            {/* --- >>> Видео Оверлей (из код 1) <<< --- */}
            {isCrafting && (
                <div className="forge-video-overlay"> {/* Добавь стили в Forge.scss */}
                    <video
                        ref={videoRef}
                        src={FORGE_VIDEO_PATH}
                        onEnded={handleVideoEnd} // Обработчик конца видео
                        muted // Часто нужно для автоплея
                        playsInline // Для iOS
                        preload="auto"
                        // Не используем autoPlay
                    />
                </div>
            )}

            {/* --- Основной интерфейс Кузницы (скрывается во время видео, из код 1) --- */}
            {/* Используем visibility: hidden чтобы сохранить разметку */}
            <div style={{ visibility: isCrafting ? 'hidden' : 'visible', height: isCrafting ? '0' : 'auto', overflow: isCrafting ? 'hidden' : 'visible' }}>
                {/* Шапка (из код 2) */}
                {/* Вкладки (из код 2, добавлена блокировка disabled={isCrafting}) */}
                <div className="forge-rarity-tabs">
                    {OUTPUT_RARITIES.map(rarity => (
                        <button
                            key={rarity}
                            className={`rarity-tab-button ${activeForgeTab === rarity ? 'active' : ''} rarity-${rarity.toLowerCase()}`}
                            onClick={() => handleTabChange(rarity)}
                            disabled={isCrafting} // <-- Блокируем во время видео (из код 1/2)
                        >
                            {rarity}
                            {checkCraftableInTab(rarity) && <span className="tab-indicator">!</span>}
                        </button>
                    ))}
                </div>

                {/* Основной контент (из код 2) */}
                <div className="forge-main-content">
                    {/* Swiper Section (из код 2, добавлена блокировка свайпа) */}
                    <div className="forge-swiper-section">
                        <div className="forge-swiper-wrapper">
                            {/* Сообщение об отсутствии рецептов (из код 2) */}
                             {filteredUpgrades.length === 0 && (
                                 <p className="no-recipes">Нет улучшений до редкости {activeForgeTab}</p>
                             )}
                            {/* Swiper (из код 2, добавлены grabCursor, allowTouchMove) */}
                            {filteredUpgrades.length > 0 && (
                                <Swiper
                                    grabCursor={!isCrafting} // Отключаем во время видео
                                    centeredSlides={true}
                                    slidesPerView={'auto'}
                                    // Loop включается только если слайдов > 1 для предотвращения ошибок
                                    loop={filteredUpgrades.length > 1}
                                    spaceBetween={15}
                                    className="forge-recipes-swiper centered-swiper"
                                    onSwiper={setSwiperInstance}
                                    onSlideChange={handleSlideChange}
                                    allowTouchMove={!isCrafting} // Запрещаем свайп во время видео
                                    key={activeForgeTab} // Ключ для реинициализации
                                >
                                    {filteredUpgrades.map((recipe) => (
                                        <SwiperSlide key={recipe.id} style={{ width: 'auto' }}>
                                            {/* Карточка рецепта (из код 2) */}
                                            <CompactRecipeCard recipe={recipe} />
                                        </SwiperSlide>
                                    ))}
                                </Swiper>
                            )}
                        </div>
                    </div>

                    {/* --- Секция Деталей Рецепта (структура из код 2, без анимаций крафта из код 2) --- */}
                    {/* --- Секция Деталей Рецепта ... --- */}
                    <div className={`
                        forge-recipe-details-section
                        ${selectedRecipeData?.outputItemData?.rarity ? `rarity-output-${selectedRecipeData.outputItemData.rarity.toLowerCase()}` : ''}
                    `}>
                        {selectedRecipeData ? (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={selectedRecipeData.id}
                                    className={`crafting-area ${selectedRecipeData?.outputItemData?.rarity ? `rarity-output-${selectedRecipeData.outputItemData.rarity.toLowerCase()}` : ''}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {/* ================================================= */}
                                    {/* ▼▼▼ НАЧАЛО ОБЛАСТИ ИЗМЕНЕНИЙ ▼▼▼ */}
                                    {/* ================================================= */}

                                    {/* ▼▼▼ ДОБАВЛЯЕМ НОВЫЙ КОНТЕЙНЕР ДЛЯ СЕТКИ ▼▼▼ */}
                                    <div className="crafting-items-grid">

                                        {/* SVG ЛИНИИ (теперь внутри grid-контейнера) */}
                                        <motion.svg
                                     className="connector-lines-svg"
                                     viewBox="0 0 360 400"
                                     xmlns="http://www.w3.org/2000/svg"
                                     preserveAspectRatio="xMidYMid meet"
                                     animate={{ opacity: isCrafting ? 0 : 1 }}
                                     transition={{ duration: 0.3 }}
                                 >
                                     {(() => {
                                         const outputCenterX = 180; const outputCenterY = 140;
                                         const inputCenters = [ { x: 180, y: 223 }, { x: 85, y: 85 }, { x: 275, y: 85 } ];
                                         const linesAreActive = selectedRecipeData.canCraft;
                                         return selectedRecipeData.inputItemsData.slice(0, 3).map((_, index) => {
                                             if (inputCenters[index]) {
                                                 return (
                                                     <line
                                                         key={`line-${index}-${selectedRecipeData.id}`}
                                                         x1={inputCenters[index].x} y1={inputCenters[index].y}
                                                         x2={outputCenterX} y2={outputCenterY}
                                                         className={`connector-line ${linesAreActive ? 'line-active' : 'line-inactive'}`}
                                                     />
                                                 );
                                             }
                                             return null;
                                         });
                                     })()}
                                        </motion.svg>

                                        {/* Выходной предмет (теперь внутри grid-контейнера) */}
                                        <div className="output-item-focus">
                                            <div className={`recipe-item-display output focus rarity-${selectedRecipeData.outputItemData.rarity.toLowerCase()}`}>
                                                <img src={selectedRecipeData.outputItemData.image || '/assets/default-item.png'} alt={selectedRecipeData.outputItemData.name} />
                                            </div>
                                        </div>

                                        {/* Входные предметы (теперь внутри grid-контейнера) */}
                                        {(Array.isArray(selectedRecipeData.inputItemsData) ? selectedRecipeData.inputItemsData.slice(0, 3) : []).map((inputDisplayData, inputIndex) => (
                                            <div
                                                key={`${selectedRecipeData.id}-input-${inputIndex}`}
                                                // Класс input-pos-* ОСТАВЛЯЕМ, будем использовать его для grid-area
                                                className={`input-item-focus input-pos-${inputIndex}`}
                                            >
                                                <div className={`recipe-item-display input focus rarity-${inputDisplayData.data?.rarity?.toLowerCase()} ${!selectedRecipeData.canCraft ? 'dimmed' : ''}`}>
                                                    <img src={inputDisplayData.data?.image || '/assets/default-item.png'} alt={inputDisplayData.data?.name || 'Input item'} />
                                                </div>
                                                <div className={`input-count ${selectedRecipeData.canCraft ? 'enough' : 'not-enough'}`}>
                                                    {`${inputDisplayData.ownedCount.toLocaleString()}/${inputDisplayData.totalRequired.toLocaleString()}`}
                                                </div>
                                            </div>
                                        ))}

                                     </div> {/* ▲▲▲ КОНЕЦ НОВОГО КОНТЕЙНЕРА .crafting-items-grid ▲▲▲ */}

                                    {/* Название предмета (из код 2) */}
                                    <div className="crafting-area-title-wrapper">
                                         <h3 className={`output-name-focus rarity-text-${selectedRecipeData.outputItemData.rarity.toLowerCase()}`}>
                                             {selectedRecipeData.outputItemData.name}
                                         </h3>
                                    </div>


                                    {/* Входные предметы (из код 2, без motion.div для анимации крафта) */}

                                    {/* Нижняя область (из код 2, без motion.div для скрытия во время крафта) */}
                                    <div className="crafting-area-bottom">
                                        {/* Стоимость (из код 2, оставлен motion для появления) */}
                                        <motion.div
                                            className="cost-focus"
                                            variants={itemAppearVariants}
                                            initial="hidden"
                                            animate="visible" // Всегда visible если рецепт выбран
                                        >
                                            {(selectedRecipeData.cost?.gold || 0) > 0 && <span><img className="currency-icon" src="/assets/coin-icon.png" alt="gold"/> {(selectedRecipeData.cost.gold || 0).toLocaleString()}</span>}
                                            {(selectedRecipeData.cost?.diamonds || 0) > 0 && <span><img className="currency-icon" src="/assets/diamond-image.png" alt="diamond"/> {(selectedRecipeData.cost.diamonds || 0).toLocaleString()}</span>}
                                        </motion.div>

                                        {/* Кнопка крафта (из код 2, оставлен motion для появления, добавлена логика isCrafting) */}
                                        <motion.div
                                            className="action-focus"
                                            variants={itemAppearVariants}
                                            initial="hidden"
                                            animate="visible" // Всегда visible если рецепт выбран
                                            >
                                            <button
                                                className="forge-button focus-button"
                                                onClick={() => handleForgeClick(selectedRecipeData)}
                                                disabled={!selectedRecipeData.canCraft || isCrafting} // <-- Блокируем кнопку во время видео
                                            >
                                                {/* Текст кнопки зависит от isCrafting (из код 1) */}
                                                {isCrafting ? "Создание..." : "Создать!"}
                                            </button>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        ) : (
                            // Сообщение если рецепт не выбран (из код 2)
                            <div className="no-recipe-selected">
                                {filteredUpgrades.length > 0
                                    ? 'Выберите рецепт...'
                                    : `Нет доступных улучшений до ${activeForgeTab}`
                                }
                            </div>
                        )}
                    </div> {/* Конец .forge-recipe-details-section */}
                </div> {/* Конец .forge-main-content */}
            </div> {/* Конец обертки для скрытия UI */}

            {/* --- >>> РЕНДЕР ПОПАПА УСПЕХА (передаем новый обработчик из код 1) <<< --- */}
            <AnimatePresence>
                {showSuccessPopup && lastCraftedItem && (
                    <CraftingSuccessPopup
                        key="crafting-success-popup"
                        itemData={lastCraftedItem}
                        // Вместо onClose передаем новый обработчик для навигации
                        onNavigateToInventory={handleNavigateToInventory}
                    />
                )}
            </AnimatePresence>

        </motion.div> // Конец .forge-screen
    );
};

export default Forge;