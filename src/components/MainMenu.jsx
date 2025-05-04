// src/components/MainMenu.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion } from 'framer-motion';
import useGameStore from "../store/useGameStore"; // Может понадобиться для прогресса и статуса уровней
import WorldMap from "./WorldMap"; // Компонент карты мира
import "./MainMenu.scss"; // Подключаем стили
import { pageVariants, pageTransition } from '../animations'; // Анимации

// ID главы по умолчанию (или из последнего сохранения)
const INITIAL_CHAPTER_ID = 1; // Или загружать из useGameStore

// Вспомогательная функция clamp
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

// --- Основной компонент Главного Меню ---
const MainMenu = ({ onStart }) => { // onStart - функция из App.jsx

    // --- Состояния Компонента (Карта Главы + Новое) ---
    const [showMap, setShowMap] = useState(false); // Показать карту мира?
    const [selectedLevelId, setSelectedLevelId] = useState(null);
    const [showLevelPopup, setShowLevelPopup] = useState(false);
    const [isLoadingLevel, setIsLoadingLevel] = useState(false); // Запуск уровня ИЗ ЭТОГО ЭКРАНА

    const [currentChapterId, setCurrentChapterId] = useState(INITIAL_CHAPTER_ID);
    const [chapterData, setChapterData] = useState(null);
    const [isLoadingChapter, setIsLoadingChapter] = useState(true); // Загрузка данных ТЕКУЩЕЙ ГЛАВЫ

    // Рефы и состояния для панорамирования карты главы
    const mapContainerRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const mapStart = useRef({ x: 0, y: 0 });
    const hasStarted = useRef(false); // Предотвращение двойного запуска уровня

    // --- Загрузка Данных Главы (остается как было) ---
    useEffect(() => {
        let isMounted = true;
        const loadChapter = async (id) => {
             if (!isMounted) return;
             console.log(`[MainMenu] Attempting to load CHAPTER data for chapter ${id}...`);
             setIsLoadingChapter(true); setChapterData(null); setPosition({ x: 0, y: 0 }); // Сброс при смене главы

            try {
                const chapterModule = await import(`../data/chapters/chapter${id}/chapter${id}Data.js`);
                if (isMounted) {
                    if (chapterModule.default && typeof chapterModule.default.id === 'number') {
                        setChapterData(chapterModule.default);
                        console.log("[MainMenu] Successfully loaded CHAPTER data:", chapterModule.default);
                    } else { throw new Error(`Invalid export in chapter${id}Data.js`); }
                }
            } catch (error) {
                console.error(`[MainMenu] Failed to load CHAPTER data for ID ${id}:`, error);
                if (isMounted) {
                     alert(`Ошибка загрузки данных Главы ${id}. Проверьте путь и файл. Загружаем Главу 1.`);
                     if (id !== 1) { setCurrentChapterId(1); /* Рекурсивный вызов сработает через useEffect */ }
                     else { setIsLoadingChapter(false); setChapterData(null); /* Ошибка даже с главой 1 */ }
                }
            } finally {
                // Убедимся, что isLoadingChapter сбрасывается только для текущего запрошенного ID
                 if (isMounted && currentChapterId === id) { setIsLoadingChapter(false); }
            }
        };
        loadChapter(currentChapterId);
        return () => { isMounted = false; };
    }, [currentChapterId]); // Зависимость только от currentChapterId

     // --- Центрирование карты Главы (остается как было) ---
     useEffect(() => {
         if (!chapterData || isLoadingChapter || !mapContainerRef.current) return;
         if (typeof chapterData.imageWidth !== 'number' || typeof chapterData.imageHeight !== 'number') {
            console.warn("[MainMenu] Chapter data missing image dimensions.");
            return;
         }

         const containerWidth = mapContainerRef.current.offsetWidth;
         const containerHeight = mapContainerRef.current.offsetHeight;
         const mapWidth = chapterData.imageWidth;
         const mapHeight = chapterData.imageHeight;

         // Используем initialView из данных главы, если есть, иначе центрируем
         let initialX = chapterData.initialView?.x ?? clamp(containerWidth / 2 - mapWidth / 2, containerWidth - mapWidth, 0);
         let initialY = chapterData.initialView?.y ?? clamp(containerHeight / 2 - mapHeight / 2, containerHeight - mapHeight, 0);

         setPosition({ x: initialX, y: initialY });
         hasStarted.current = false; // Сбрасываем флаг запуска уровня при смене/загрузке главы
         setIsLoadingLevel(false); // Сбрасываем индикатор загрузки уровня

        }, [chapterData, isLoadingChapter]); // Зависит от данных главы и статуса загрузки

    // --- Логика Перетаскивания Карты Главы (остается как было) ---
    const updatePosition = useCallback((dx, dy) => {
        if (!mapContainerRef.current || !chapterData?.imageWidth || !chapterData?.imageHeight) return;
        const containerWidth = mapContainerRef.current.offsetWidth;
        const containerHeight = mapContainerRef.current.offsetHeight;
        const mapWidth = chapterData.imageWidth;
        const mapHeight = chapterData.imageHeight;
        const minX = Math.min(0, containerWidth - mapWidth);
        const minY = Math.min(0, containerHeight - mapHeight);
        const newX = clamp(mapStart.current.x + dx, minX, 0);
        const newY = clamp(mapStart.current.y + dy, minY, 0);
        setPosition({ x: newX, y: newY });
    }, [chapterData]); // Зависит от chapterData для размеров

    const handleMouseDown = useCallback((e) => { if (e.button !== 0) return; setDragging(true); dragStart.current = { x: e.clientX, y: e.clientY }; mapStart.current = { ...position }; if (e.currentTarget) e.currentTarget.style.cursor = 'grabbing'; }, [position]);
    const handleTouchStart = useCallback((e) => { setDragging(true); dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; mapStart.current = { ...position }; }, [position]);
    const handleMouseMove = useCallback((e) => { if (!dragging) return; updatePosition(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y); }, [dragging, updatePosition]);
    const handleTouchMove = useCallback((e) => { if (!dragging) return; updatePosition(e.touches[0].clientX - dragStart.current.x, e.touches[0].clientY - dragStart.current.y); }, [dragging, updatePosition]);
    const stopDrag = useCallback((e) => { if (dragging) { setDragging(false); if (e.currentTarget && e.type === 'mouseup') { e.currentTarget.style.cursor = 'grab'; } } }, [dragging]);

    // --- Обработчики Уровней и Навигации (остаются + новые) ---
    const handleStartLevel = useCallback(() => {
        if (!hasStarted.current && selectedLevelId && chapterData) {
            console.log(`[MainMenu] Calling onStart for Chapter ${chapterData.id}, Level ${selectedLevelId}`);
            hasStarted.current = true; setIsLoadingLevel(true);
            onStart(chapterData.id, selectedLevelId); // Вызываем колбэк из App.jsx
        }
    }, [selectedLevelId, chapterData, onStart]);

    const handleCloseLevelPopup = useCallback(() => { setShowLevelPopup(false); setSelectedLevelId(null); }, []);

    const handleLevelNodeClick = useCallback((levelUniqueId, e) => {
        e.stopPropagation(); // Предотвратить срабатывание drag на клике по ноде
        // TODO: Добавить проверку, доступен ли уровень (например, на основе пройденных уровней из useGameStore)
        // const progress = useGameStore.getState().progress; // Пример доступа к состоянию
        // if (!isLevelUnlocked(levelUniqueId, progress)) return;
        setSelectedLevelId(levelUniqueId);
        setShowLevelPopup(true);
    }, []); // Пустой массив зависимостей, если isLevelUnlocked не используется или берется извне

    // Переход на ДРУГУЮ главу (вызывается из WorldMap)
    const handleGoToChapter = useCallback((chapterStub) => {
        console.log("[MainMenu] Switching to chapter ID:", chapterStub.id);
        if (chapterStub.id !== currentChapterId) {
            setCurrentChapterId(chapterStub.id); // Это инициирует useEffect для загрузки новой главы
        }
        setShowMap(false); // Скрываем карту мира после выбора главы
    }, [currentChapterId]); // Зависит от currentChapterId для проверки

    // --- Обработчики НОВЫХ кнопок (пока заглушки) ---
    const handleBattlePassClick = useCallback(() => { console.log("Battle Pass clicked"); }, []);
    const handleMailClick = useCallback(() => { console.log("Mail clicked"); }, []);
    const handleRewardsChestClick = useCallback(() => { console.log("Rewards Chest clicked"); }, []);
    const handleQuestsClick = useCallback(() => { console.log("Quests clicked"); }, []);
    const handleExchangeClick = useCallback(() => { console.log("Exchange clicked"); }, []);
    const handleResetClick = useCallback(() => { if (window.confirm('Сбросить все данные?')) { localStorage.clear(); window.location.reload(); } }, []);
    const handleWorldMapClick = useCallback(() => { setShowMap(true); }, []); // Просто показать карту мира


    // --- Рендер Компонента ---

    // 1. Показываем Карту Мира (если showMap = true)
    if (showMap) {
        return (
             <WorldMap
                goBack={() => setShowMap(false)}
                goToChapter={handleGoToChapter} // Передаем обработчик выбора главы
                currentChapterId={currentChapterId} // Передаем ID текущей главы для подсветки/инфы
             />
        );
    }

    // 2. Показываем Загрузку данных ГЛАВЫ (если данные еще не загружены)
    if (isLoadingChapter || !chapterData) {
        return (
            <motion.div className="main-menu" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                <div className="level-loading-overlay"> {/* Используем тот же стиль для загрузки */}
                    <div className="loading-spinner"></div>
                    <div className="loading-text">Загрузка главы {currentChapterId}...</div>
                </div>
                {/* Можно добавить и новые кнопки сюда, но неактивные, если нужно */}
            </motion.div>
        );
    }

    // 3. Основной рендер: Карта Главы + Новые Кнопки UI
    return (
        <motion.div
            className="main-menu" // Основной контейнер с фоном
            initial="initial" animate="in" exit="out"
            variants={pageVariants} transition={pageTransition}
        >
            {/* Контейнер для просмотра и панорамирования карты главы */}
            <div className="chapter-view-container" ref={mapContainerRef}>
                <div
                    className={`chapter-map-content ${dragging ? 'dragging' : ''}`}
                    style={{
                        backgroundImage: `url(${chapterData.image})`,
                        width: `${chapterData.imageWidth}px`,
                        height: `${chapterData.imageHeight}px`,
                        transform: `translate(${position.x}px, ${position.y}px)`,
                        transition: dragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                    onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={stopDrag}
                    onMouseLeave={stopDrag} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
                    onTouchEnd={stopDrag}
                >
                    {/* SVG со связями (как было) */}
                    <svg className="chapter-level-svg-connections" width={chapterData.imageWidth} height={chapterData.imageHeight} xmlns="http://www.w3.org/2000/svg">
                        {chapterData.levels?.map((level, i, arr) => {
                            // Логика отрисовки связей остается прежней
                            const nextLevel = arr[i + 1]; if (!nextLevel) return null;
                            const nodeSize = level.nodeSize || 40; const nextNodeSize = nextLevel.nodeSize || 40;
                            const x1 = level.x + nodeSize / 2; const y1 = level.y + nodeSize / 2;
                            const x2 = nextLevel.x + nextNodeSize / 2; const y2 = nextLevel.y + nextNodeSize / 2;
                            const dx = x2 - x1; const dy = y2 - y1; const midpointX = x1 + dx * 0.5; const midpointY = y1 + dy * 0.5;
                            const curveOffset = Math.min(60, Math.sqrt(dx*dx + dy*dy) * 0.2); // Динамический изгиб
                            const angle = Math.atan2(dy, dx) - Math.PI / 2;
                            const controlX = midpointX + curveOffset * Math.cos(angle); const controlY = midpointY + curveOffset * Math.sin(angle);
                            const d = `M ${x1} ${y1} Q ${controlX} ${controlY}, ${x2} ${y2}`;
                            // TODO: Добавить класс для активной/пройденной связи?
                            return ( <path key={`path-${level.id}-to-${nextLevel.id}`} d={d} className="level-connection-path" /> );
                        })}
                    </svg>

                    {/* Узлы уровней (как было) */}
                    {chapterData.levels?.map((level) => {
                        // TODO: Получить статус уровня из useGameStore
                        const isCompleted = false; // Заглушка
                        const isActive = true;     // Заглушка - определить логику доступности
                        const levelStatusClass = isCompleted ? 'completed' : (isActive ? 'active' : 'locked');
                        const levelNumberInChapter = level.id % 100; // Простой номер уровня в главе

                        return (
                            <div
                                key={level.id}
                                className={`level-node ${levelStatusClass}`}
                                style={{
                                    top: `${level.y}px`, left: `${level.x}px`,
                                    width: `${level.nodeSize || 40}px`, height: `${level.nodeSize || 40}px`,
                                }}
                                onClick={(e) => handleLevelNodeClick(level.id, e)}
                            >
                                {levelNumberInChapter}
                            </div>
                        );
                    })}
                </div> {/* Конец .chapter-map-content */}
            </div> {/* Конец .chapter-view-container */}

            {/* --- НОВЫЕ ЭЛЕМЕНТЫ UI (Поверх карты) --- */}

            {/* Название главы */}
            <h2 className="chapter-name">{chapterData.name}</h2>

            {/* Верхний ряд */}
            <button className="main-menu-button battle-pass-button" onClick={handleBattlePassClick}>
                BattlePass
            </button>

            {/* Левая колонка */}
            <div className="main-menu-left-column">
                <button className="main-menu-button icon-button mail-button" onClick={handleMailClick}>
                    <img src="/assets/icons/mail-icon.png" alt="Почта" />
                </button>
                <button className="main-menu-button icon-button rewards-chest-button" onClick={handleRewardsChestClick}>
                    <img src="/assets/icons/gift-icon.png" alt="Награды" />
                </button>
            </div>

            {/* Правая колонка */}
            <div className="main-menu-right-column">
                 {/* Эта кнопка ТЕПЕРЬ открывает WorldMap */}
                <button className="main-menu-button icon-button world-map-button" onClick={handleWorldMapClick}>
                    <img src="/assets/icons/map-icon.png" alt="Карта Мира" />
                </button>
                <button className="main-menu-button icon-button quests-button" onClick={handleQuestsClick}>
                    <img src="/assets/icons/quests-icon.png" alt="Задания" />
                </button>
                <button className="main-menu-button icon-button exchange-button" onClick={handleExchangeClick}>
                    <img src="/assets/icons/exchange-icon.png" alt="Обмен" />
                </button>
            </div>

            {/* --- КОНЕЦ НОВЫХ ЭЛЕМЕНТОВ UI --- */}


            {/* Попап Выбора Уровня (остается как было) */}
            {showLevelPopup && selectedLevelId !== null && (
                <div className="level-popup" onClick={handleCloseLevelPopup}>
                    <div className="level-popup-box" onClick={(e) => e.stopPropagation()}>
                        <h3>{chapterData.levels?.find(l => l.id === selectedLevelId)?.name || `Уровень ${selectedLevelId % 100}`}</h3>
                        {/* TODO: Добавить инфо и проверку доступности */}
                        <p>Готов начать?</p>
                        <div className="popup-buttons">
                            <button onClick={handleStartLevel} disabled={isLoadingLevel}>В бой!</button>
                            <button onClick={handleCloseLevelPopup} disabled={isLoadingLevel}>Отмена</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Оверлей Загрузки при ЗАПУСКЕ уровня */}
            {isLoadingLevel && ( <div className="level-loading-overlay"><div className="loading-spinner"></div><div className="loading-text">Загрузка уровня...</div></div> )}

            {/* Кнопка сброса */}
            <button className="reset-button" onClick={handleResetClick}>
                reset
            </button>

        </motion.div>
    );
};

export default MainMenu;