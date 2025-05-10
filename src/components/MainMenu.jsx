// src/components/MainMenu.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from "../store/useGameStore";
import WorldMap from "./WorldMap";
import GlobalMap from "./GlobalMap"; // <<< НОВЫЙ ИМПОРТ из код1
import TransitionOverlay from "./TransitionOverlay";
import Popup from './Popup';
import "./MainMenu.scss";
import { pageVariants, pageTransition } from '../animations'; // Предполагаем, что pageVariants и pageTransition нужны для корневого motion.div
import { useNavigate, useLocation } from 'react-router-dom';
import LevelDetailsPopup from './LevelDetailsPopup';

const INITIAL_CHAPTER_ID = 1;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const MainMenu = ({ onStart }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Состояния для отображения карт из код1
    const [showDetailedChapterView, setShowDetailedChapterView] = useState(true); // Показываем по умолчанию
    const [showWorldMapView, setShowWorldMapView] = useState(location.state?.showChaptersMapDirectly || false);
    const [showGlobalMapView, setShowGlobalMapView] = useState(false);

    // Состояния для анимации шторок из код1
    const [isOverlayActive, setIsOverlayActive] = useState(false);
    const [triggerCloseOverlay, setTriggerCloseOverlay] = useState(false);
    const [triggerOpenOverlay, setTriggerOpenOverlay] = useState(false);
    
    // Ref для хранения целевого состояния вида после анимации шторок из код1
    const nextViewConfigRef = useRef({ detailed: true, world: false, global: false });

    // Состояния из код2 (остальные)
    const [selectedLevelId, setSelectedLevelId] = useState(null);
    const [showLevelPopup, setShowLevelPopup] = useState(false);
    const [isLoadingLevel, setIsLoadingLevel] = useState(false);
    const [chapterData, setChapterData] = useState(null);
    const [isLoadingChapter, setIsLoadingChapter] = useState(true);
    const [activePopup, setActivePopup] = useState(null);

    const mapContainerRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const mapStart = useRef({ x: 0, y: 0 });
    const hasStarted = useRef(false);
    const levelDetailsPopupRef = useRef(null);

    const {
        currentChapterIdFromStore,
        setCurrentChapterInStore,
        isLevelUnlocked,
        getLevelCompletionStatus,
        isHardModeUnlocked,
        resetGame,
        hasClaimableRewardsIndicator,
        setIsFullScreenMapActive
    } = useGameStore(state => ({
        currentChapterIdFromStore: state.currentChapterId,
        setCurrentChapterInStore: state.setCurrentChapter,
        isLevelUnlocked: state.isLevelUnlocked,
        getLevelCompletionStatus: state.getLevelCompletionStatus,
        isHardModeUnlocked: state.isHardModeUnlocked,
        resetGame: state.resetGame,
        hasClaimableRewardsIndicator: state.hasClaimableRewardsIndicator,
        setIsFullScreenMapActive: state.setIsFullScreenMapActive
    }));

    const [currentChapterId, setCurrentChapterId] = useState(
        location.state?.focusOnChapterId || currentChapterIdFromStore || INITIAL_CHAPTER_ID
    );

    // Управление флагом isFullScreenMapActive в сторе (из код1)
    useEffect(() => {
        // Если активна карта мира или глобальная карта - это полноэкранный режим
        if (showWorldMapView || showGlobalMapView) {
            setIsFullScreenMapActive(true);
        } else {
            setIsFullScreenMapActive(false); // Активен детальный вид главы
        }
        // Очистка при размонтировании MainMenu не нужна, т.к. флаг сбросится при уходе из карт,
        // или если MainMenu полностью размонтируется, то в App.jsx можно сбросить.
        // Однако, если это единственный компонент, управляющий этим флагом, то очистка при размонтировании здесь может быть полезна:
        return () => {
             setIsFullScreenMapActive(false);
        };
    }, [showWorldMapView, showGlobalMapView, setIsFullScreenMapActive]);

    // Синхронизация currentChapterId и обработка location.state (из код1, адаптировано)
    useEffect(() => {
        const targetChapterFromLocation = location.state?.focusOnChapterId;
        const shouldShowWorldMapDirectly = location.state?.showChaptersMapDirectly;

        if (targetChapterFromLocation && targetChapterFromLocation !== currentChapterId) {
            setCurrentChapterId(targetChapterFromLocation);
        } else if (!targetChapterFromLocation && currentChapterIdFromStore && currentChapterIdFromStore !== currentChapterId) {
            setCurrentChapterId(currentChapterIdFromStore);
        } else if (currentChapterId && currentChapterId !== currentChapterIdFromStore) {
            setCurrentChapterInStore(currentChapterId);
        }

        if (shouldShowWorldMapDirectly && !showWorldMapView && !isOverlayActive && !showGlobalMapView && showDetailedChapterView) {
            // Если нужно сразу показать WorldMap (например, после выбора континента на GlobalMap или при прямой навигации)
            // Убедимся, что мы не переходим с GlobalMap на WorldMap таким образом, 
            // так как это должно управляться через performViewTransition
            console.log("MainMenu: useEffect detected showChaptersMapDirectly, initiating transition to WorldMap.");
            nextViewConfigRef.current = { detailed: false, world: true, global: false };
            setIsOverlayActive(true);
            setTriggerOpenOverlay(false); // Убедимся, что сначала закрываем, если уже открыты
            setTriggerCloseOverlay(true); // Запускаем анимацию закрытия шторок
        }
        
        if (location.state && (location.state.showChaptersMapDirectly || location.state.focusOnChapterId)) {
            navigate(location.pathname, { state: {}, replace: true }); // Очищаем state
        }
    }, [location.state, navigate, showWorldMapView, showDetailedChapterView, showGlobalMapView, currentChapterIdFromStore, currentChapterId, setCurrentChapterInStore, isOverlayActive]);

    // Загрузка данных главы (из код2, с мелкими правками по логам из код1)
    useEffect(() => {
        let isMounted = true;
        const loadChapter = async (id) => {
            if (!isMounted || !id) {
                if (isMounted) {
                    console.warn(`[MainMenu] Попытка загрузить главу с невалидным ID: ${id}.`);
                    const fallbackId = currentChapterIdFromStore || INITIAL_CHAPTER_ID;
                    if (id !== fallbackId) {
                        setCurrentChapterId(fallbackId);
                    } else {
                        setIsLoadingChapter(false);
                        setChapterData(null);
                    }
                }
                return;
            }
            console.log(`[MainMenu] Attempting to load CHAPTER data for chapter ${id}...`);
            setIsLoadingChapter(true); setChapterData(null); setPosition({ x: 0, y: 0 });

            try {
                const chapterModule = await import(`../data/chapters/chapter${id}/chapter${id}Data.js`);
                if (isMounted) {
                    if (chapterModule.default && typeof chapterModule.default.id === 'number') {
                        setChapterData(chapterModule.default);
                        console.log("[MainMenu] Successfully loaded CHAPTER data:", chapterModule.default);
                        if (id !== currentChapterIdFromStore) {
                            setCurrentChapterInStore(id);
                        }
                    } else {
                        throw new Error(`Invalid chapter data structure or missing ID in chapter${id}Data.js`);
                    }
                }
            } catch (error) {
                if (isMounted) {
                    console.error(`[MainMenu] Failed to load CHAPTER data for ID ${id}:`, error);
                    if (id !== INITIAL_CHAPTER_ID) {
                        alert(`Ошибка загрузки данных Главы ${id}. Загружаем Главу ${INITIAL_CHAPTER_ID}.`);
                        setCurrentChapterId(INITIAL_CHAPTER_ID);
                    } else {
                        alert(`Критическая ошибка: не удалось загрузить даже начальную Главу ${INITIAL_CHAPTER_ID}.`);
                        setChapterData(null);
                    }
                }
            } finally {
                if (isMounted && currentChapterId === id) { // Убедимся, что ID не изменился во время загрузки
                    setIsLoadingChapter(false);
                } else if (isMounted) {
                    console.log(`[MainMenu] Chapter ID changed during load from ${id} to ${currentChapterId}. Aborting setIsLoadingChapter(false) for ${id}.`);
                }
            }
        };

        if (currentChapterId) {
            loadChapter(currentChapterId);
        } else if (isMounted) {
            console.log("[MainMenu] currentChapterId не определен, устанавливаем INITIAL_CHAPTER_ID.");
            setCurrentChapterId(INITIAL_CHAPTER_ID);
        }

        return () => { isMounted = false; };
    }, [currentChapterId, currentChapterIdFromStore, setCurrentChapterInStore]); // Зависимости как в код2

    // useEffect для установки начальной позиции карты (из код2)
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
        let initialX = chapterData.initialView?.x ?? clamp(containerWidth / 2 - mapWidth / 2, containerWidth - mapWidth, 0);
        let initialY = chapterData.initialView?.y ?? clamp(containerHeight / 2 - mapHeight / 2, containerHeight - mapHeight, 0);

        setPosition({ x: initialX, y: initialY });
        hasStarted.current = false;
        setIsLoadingLevel(false);
    }, [chapterData, isLoadingChapter]);

    // --- Управление переходами между видами с анимацией шторок (из код1) ---
    const performViewTransition = useCallback((targetView) => {
        // targetView: 'detailed', 'world', 'global'
        let currentView = 'detailed';
        if (showWorldMapView) currentView = 'world';
        else if (showGlobalMapView) currentView = 'global';

        if (targetView === currentView && !isOverlayActive) return; // Не переходим, если уже в этом виде и нет активной анимации

        console.log(`MainMenu: Perform transition FROM ${currentView} TO ${targetView}`);
        
        if (targetView === 'detailed') nextViewConfigRef.current = { detailed: true, world: false, global: false };
        else if (targetView === 'world') nextViewConfigRef.current = { detailed: false, world: true, global: false };
        else if (targetView === 'global') nextViewConfigRef.current = { detailed: false, world: false, global: true };
        
        setIsOverlayActive(true);
        setTriggerOpenOverlay(false); // Убедимся, что шторки не пытаются открыться, если они уже открыты или в процессе
        setTriggerCloseOverlay(true); // Запускаем анимацию закрытия шторок
    }, [showWorldMapView, showGlobalMapView, isOverlayActive]); // Добавил isOverlayActive в зависимости

    const handleOverlayCloseComplete = useCallback(() => {
        console.log("MainMenu: Overlay CLOSE complete. Swapping views.");
        setShowDetailedChapterView(nextViewConfigRef.current.detailed);
        setShowWorldMapView(nextViewConfigRef.current.world);
        setShowGlobalMapView(nextViewConfigRef.current.global);
        
        setTriggerCloseOverlay(false);
        setTriggerOpenOverlay(true); // Сразу запускаем анимацию открытия шторок
    }, []); // Зависимости setShow... являются стейт-сеттерами и не меняются

    const handleOverlayOpenComplete = useCallback(() => {
        console.log("MainMenu: Overlay OPEN complete. Hiding overlay component's active state.");
        setTriggerOpenOverlay(false);
        setIsOverlayActive(false); // Теперь скрываем компонент оверлея (или его активное состояние)
    }, []);

    // --- Коллбэки для дочерних карт (из код1, адаптированы) ---
    // Из WorldMap при выборе главы (заменяет handleGoToChapter из код2)
    const handleChapterSelectFromWorldMap = useCallback((chapterStub) => {
        console.log("[MainMenu] Выбрана глава из WorldMap:", chapterStub.id);
        if (chapterStub.id !== currentChapterId) {
            setCurrentChapterId(chapterStub.id); // Обновит стор через useEffect [currentChapterId]
        }
        performViewTransition('detailed'); // Показать детальный вид выбранной главы
    }, [currentChapterId, performViewTransition]); // setCurrentChapterId убрал, т.к. он сеттер

    // Из WorldMap для перехода на GlobalMap (заменяет handleNavigateToGlobalMapView из код2)
    const handleNavigateToGlobalMapFromWorld = useCallback(() => {
        console.log("[MainMenu] Переход с WorldMap на GlobalMap");
        performViewTransition('global');
    }, [performViewTransition]);

    // Из GlobalMap при выборе континента (переход на WorldMap с фокусом)
    const handleContinentSelectFromGlobalMap = useCallback((startChapterId) => {
        console.log(`[MainMenu] Выбран континент (глава ${startChapterId}) на GlobalMap. Показываем WorldMap.`);
        if (startChapterId !== currentChapterId) { // Обновляем текущую главу для фокуса
            setCurrentChapterId(startChapterId);
        }
        performViewTransition('world'); // Показать WorldMap
    }, [currentChapterId, performViewTransition]); // setCurrentChapterId убрал

    // Из GlobalMap для возврата на WorldMap
    const handleGoBackToWorldMapFromGlobal = useCallback(() => {
        console.log("[MainMenu] Возврат с GlobalMap на WorldMap.");
        // Можно также передавать currentChapterId, если нужно вернуться к той же главе, на которой были в WorldMap
        performViewTransition('world');
    }, [performViewTransition]);

    // Кнопка "Карта Глав" в детальном виде главы (заменяет handleWorldMapClick из код2)
    const handleWorldMapClick = useCallback(() => {
        if (currentChapterId !== currentChapterIdFromStore) {
            setCurrentChapterInStore(currentChapterId);
        }
        performViewTransition('world');
    }, [currentChapterId, currentChapterIdFromStore, setCurrentChapterInStore, performViewTransition]);

    // Остальные useCallback хуки (управление картой, попапами и т.д.) из код2
    const updatePosition = useCallback((dx, dy) => { if (!mapContainerRef.current || !chapterData?.imageWidth || !chapterData?.imageHeight) return; const containerWidth = mapContainerRef.current.offsetWidth; const containerHeight = mapContainerRef.current.offsetHeight; const mapWidth = chapterData.imageWidth; const mapHeight = chapterData.imageHeight; const minX = Math.min(0, containerWidth - mapWidth); const minY = Math.min(0, containerHeight - mapHeight); const newX = clamp(mapStart.current.x + dx, minX, 0); const newY = clamp(mapStart.current.y + dy, minY, 0); setPosition({ x: newX, y: newY }); }, [chapterData]);
    const handleMouseDown = useCallback((e) => { if (e.button !== 0) return; setDragging(true); dragStart.current = { x: e.clientX, y: e.clientY }; mapStart.current = { ...position }; if (e.currentTarget) e.currentTarget.style.cursor = 'grabbing'; }, [position]);
    const handleTouchStart = useCallback((e) => { setDragging(true); dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; mapStart.current = { ...position }; }, [position]);
    const handleMouseMove = useCallback((e) => { if (!dragging) return; updatePosition(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y); }, [dragging, updatePosition]);
    const handleTouchMove = useCallback((e) => { if (!dragging) return; updatePosition(e.touches[0].clientX - dragStart.current.x, e.touches[0].clientY - dragStart.current.y); }, [dragging, updatePosition]);
    const stopDrag = useCallback((e) => { if (dragging) { setDragging(false); if (e.currentTarget && e.type === 'mouseup') { e.currentTarget.style.cursor = 'grab'; } } }, [dragging]);

    const handleLevelNodeClick = useCallback((levelUniqueId, e) => { e.stopPropagation(); const currentLevelsArray = chapterData?.levels || []; if (!isLevelUnlocked(currentChapterId, levelUniqueId, currentLevelsArray, null, null)) { console.log(`[MainMenu] Уровень ${levelUniqueId} (глава ${currentChapterId}) заблокирован.`); alert("Уровень пока заблокирован. Пройдите предыдущие!"); return; } const levelData = chapterData?.levels?.find(l => l.id === levelUniqueId); if (levelData) { setSelectedLevelId(levelUniqueId); setShowLevelPopup(true); } else { console.warn(`[MainMenu] Данные уровня не найдены для ID: ${levelUniqueId} после проверки разблокировки.`); } }, [chapterData, currentChapterId, isLevelUnlocked]); // setSelectedLevelId, setShowLevelPopup убраны
    const handleCloseLevelPopup = useCallback(() => { setShowLevelPopup(false); setSelectedLevelId(null); }, []); // setSelectedLevelId, setShowLevelPopup убраны
    const handleStartLevelFromDetails = useCallback((levelId, difficulty) => { console.log(`[MainMenu] Starting level ${levelId} with difficulty ${difficulty} from details popup`); if (!hasStarted.current && chapterData) { hasStarted.current = true; setIsLoadingLevel(true); setShowLevelPopup(false); onStart(chapterData.id, levelId, difficulty); } }, [chapterData, onStart]); // setIsLoadingLevel, setShowLevelPopup убраны

    const handleFullResetClick = useCallback(() => {
        if (window.confirm('Вы уверены, что хотите сбросить ВЕСЬ прогресс игры? Это действие необратимо!')) {
            resetGame();
            setCurrentChapterId(INITIAL_CHAPTER_ID); 
            // Если были на карте мира или глобальной, переключить на детальный вид
            if (showWorldMapView || showGlobalMapView) { 
                performViewTransition('detailed'); 
            }
        }
    }, [resetGame, showWorldMapView, showGlobalMapView, performViewTransition]); // setCurrentChapterId убран

    const handleBattlePassClick = useCallback(() => { console.log("Battle Pass clicked"); }, []);
    const handleMailClick = useCallback(() => setActivePopup('mail'), []); // setActivePopup убран
    const handleRewardsChestClick = useCallback(() => { navigate('/rewards'); }, [navigate]);
    const handleDailyGrindClick = useCallback(() => setActivePopup('hunting'), []); // setActivePopup убран
    const handleQuestsClick = useCallback(() => setActivePopup('tasks'), []); // setActivePopup убран
    const handleExchangeClick = useCallback(() => setActivePopup('exchange'), []); // setActivePopup убран
    const closePopup = useCallback(() => setActivePopup(null), []); // setActivePopup убран
    const handleResetClick = useCallback(() => { if (window.confirm('Сбросить данные Zustand (локальный прогресс сессии)?')) { useGameStore.persist.clearStorage(); window.location.reload(); } }, []);

    const getPopupContent = (popupType) => { switch (popupType) { case 'mail': return <div>Содержимое почты...</div>; case 'hunting': return <div>Содержимое охоты...</div>; case 'tasks': return <div>Содержимое заданий...</div>; case 'exchange': return <div>Содержимое обмена...</div>; default: return null; } };
    const getPopupTitle = (popupType) => { switch (popupType) { case 'mail': return "Почта"; case 'hunting': return "Ежедневная охота"; case 'tasks': return "Задания"; case 'exchange': return "Обменник"; default: return ""; } };

    // Анимация для смены контента внутри MainMenu (из код1)
    const screenContentVariants = {
        initial: { opacity: 1 }, // Контент сразу видимый "под" шторками
        animate: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: 0.05 } } // Очень быстро исчезает
    };
    
    // Варианты для загрузочного экрана (из код2, можно оставить если нужен другой эффект для лоадера)
    const loadingScreenVariants = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.3 } },
        exit: { opacity: 0, transition: { duration: 0.2 } }
    };

    const selectedLevelData = chapterData?.levels?.find(l => l.id === selectedLevelId);
    const getLevelDisplayStatus = (level) => {
        const currentLevelsArray = chapterData?.levels || [];
        const unlocked = isLevelUnlocked(currentChapterId, level.id, currentLevelsArray, null, null);
        const completionStatus = getLevelCompletionStatus(currentChapterId, level.id);
        let levelStatusClass = 'locked';
        if (unlocked) {
            if (completionStatus?.hard) levelStatusClass = 'completed-hard';
            else if (completionStatus?.normal) levelStatusClass = 'completed-normal';
            else levelStatusClass = 'active';
        }
        return levelStatusClass;
    };
    
    return (
        <motion.div className="main-menu" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
            {/* TransitionOverlay рендерится первым, чтобы быть "над" контентом во время анимации */}
            {isOverlayActive && (
                <TransitionOverlay
                    playOpen={triggerOpenOverlay}
                    onOpenComplete={handleOverlayOpenComplete}
                    playClose={triggerCloseOverlay}
                    onCloseComplete={handleOverlayCloseComplete}
                />
            )}

            <AnimatePresence mode="wait">
                {showGlobalMapView && (
                    <motion.div key="globalmap-view" {...screenContentVariants} style={{width: '100%', height: '100%', position: 'absolute', top:0, left:0, zIndex: 1}}>
                        <GlobalMap
                            onSelectContinent={handleContinentSelectFromGlobalMap}
                            onGoBackToChapterMap={handleGoBackToWorldMapFromGlobal} // Может быть кнопка "назад" на WorldMap
                        />
                    </motion.div>
                )}
                {showWorldMapView && !showGlobalMapView && ( // Показываем WorldMap только если не активен GlobalMap
                    <motion.div key="worldmap-view" {...screenContentVariants} style={{width: '100%', height: '100%', position: 'absolute', top:0, left:0, zIndex: 1}}>
                        <WorldMap
                            goBack={() => performViewTransition('detailed')} // Возврат на детальный вид текущей главы
                            goToChapter={handleChapterSelectFromWorldMap}
                            currentChapterId={currentChapterId}
                            onGoToGlobalMap={handleNavigateToGlobalMapFromWorld}
                        />
                    </motion.div>
                )}
                {showDetailedChapterView && !showWorldMapView && !showGlobalMapView && ( // Показываем детальный вид
                    <motion.div key="detailed-chapter-view" {...screenContentVariants} style={{width: '100%', height: '100%', zIndex: 1}}> {/* position: 'absolute', top:0, left:0 можно добавить для консистентности, если нужно */}
                        {isLoadingChapter || !chapterData ? (
                            <motion.div // Используем loadingScreenVariants для экрана загрузки
                                key="loading-view-content"
                                variants={loadingScreenVariants} 
                                initial="initial" animate="animate" exit="exit"
                                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 0, left: 0, background: 'var(--main-bg-color, #282c34)', zIndex: 2 /* Выше чем zIndex:1 у карт */ }}
                            >
                                <div className="level-loading-overlay" style={{ position: 'static', background: 'transparent', color: 'white' }}>
                                    <div className="loading-spinner"></div>
                                    <div className="loading-text">Загрузка главы {currentChapterId || INITIAL_CHAPTER_ID}...</div>
                                </div>
                            </motion.div>
                        ) : (
                            <>
                                <div className="chapter-view-container" ref={mapContainerRef}>
                                    <div
                                        className={`chapter-map-content ${dragging ? 'dragging' : ''}`}
                                        style={{ 
                                            backgroundImage: `url(${chapterData.image})`, 
                                            width: `${chapterData.imageWidth}px`, 
                                            height: `${chapterData.imageHeight}px`,
                                            transform: `translate(${position.x}px, ${position.y}px)`,
                                            transition: dragging ? 'none' : 'transform 0.1s ease-out',
                                            cursor: dragging ? 'grabbing' : 'grab'
                                        }}
                                        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={stopDrag}
                                        onMouseLeave={stopDrag} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
                                        onTouchEnd={stopDrag}
                                    >
                                        <svg className="chapter-level-svg-connections" width={chapterData.imageWidth} height={chapterData.imageHeight} xmlns="http://www.w3.org/2000/svg">
                                            {chapterData.levels?.map((level, i, arr) => {
                                                const nextLevel = arr[i + 1]; if (!nextLevel) return null;
                                                const nodeSize = level.nodeSize || 40; const nextNodeSize = nextLevel.nodeSize || 40;
                                                const x1 = level.x + nodeSize / 2; const y1 = level.y + nodeSize / 2;
                                                const x2 = nextLevel.x + nextNodeSize / 2; const y2 = nextLevel.y + nextNodeSize / 2;
                                                const dx = x2 - x1; const dy = y2 - y1; const midpointX = x1 + dx * 0.5; const midpointY = y1 + dy * 0.5;
                                                const curveOffset = Math.min(60, Math.sqrt(dx*dx + dy*dy) * 0.2);
                                                const angle = Math.atan2(dy, dx) - Math.PI / 2;
                                                const controlX = midpointX + curveOffset * Math.cos(angle); const controlY = midpointY + curveOffset * Math.sin(angle);
                                                const d = `M ${x1} ${y1} Q ${controlX} ${controlY}, ${x2} ${y2}`;
                                                const currentLevelStatus = getLevelDisplayStatus(level);
                                                const isPathActive = currentLevelStatus === 'completed-normal' || currentLevelStatus === 'completed-hard' || currentLevelStatus === 'active';
                                                return ( <path key={`path-${level.id}-to-${nextLevel.id}`} d={d} className={`level-connection-path ${isPathActive ? 'active' : ''}`} /> );
                                            })}
                                        </svg>
                                        {chapterData.levels?.map((level) => {
                                            const levelStatusClass = getLevelDisplayStatus(level);
                                            const levelNumberInChapter = level.number !== undefined ? level.number : (level.id % 100);
                                            return (
                                                <div
                                                    key={level.id}
                                                    className={`level-node ${levelStatusClass}`}
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${level.x}px`,
                                                        top: `${level.y}px`,
                                                        width: `${level.nodeSize || 40}px`,
                                                        height: `${level.nodeSize || 40}px`,
                                                    }}
                                                    onClick={(e) => { handleLevelNodeClick(level.id, e); }}
                                                >
                                                    {levelNumberInChapter}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <h2 className="chapter-name">{chapterData.name}</h2>
                                <button className="main-menu-button battle-pass-button" onClick={handleBattlePassClick}>BattlePass</button>

                                <div className="main-menu-left-column">
                                    <button className="main-menu-button icon-button mail-button" onClick={handleMailClick} title="Почта"><img src="/assets/icons/mail-icon.png" alt="Почта" /></button>
                                    <button
                                        className={`main-menu-button icon-button rewards-chest-button ${hasClaimableRewardsIndicator ? 'has-indicator' : ''}`}
                                        onClick={handleRewardsChestClick}
                                        title="Награды"
                                    >
                                        <img src="/assets/icons/gift-icon.png" alt="Награды" />
                                    </button>
                                    <button className="main-menu-button icon-button daily-grind-button" onClick={handleDailyGrindClick} title="Ежедневная охота"><img src="/assets/icons/daily-grind-icon.png" alt="Daily Grind" /></button>
                                </div>

                                <div className="main-menu-right-column">
                                    <button className="main-menu-button icon-button world-map-button" onClick={handleWorldMapClick} title="Карта Глав">
                                        <img src="/assets/icons/map-icon.png" alt="Карта Глав" />
                                    </button>
                                    <button className="main-menu-button icon-button quests-button" onClick={handleQuestsClick} title="Задания"><img src="/assets/icons/quests-icon.png" alt="Задания" /></button>
                                    <button className="main-menu-button icon-button exchange-button" onClick={handleExchangeClick} title="Обмен"><img src="/assets/icons/exchange-icon.png" alt="Обмен" /></button>
                                </div>
                                {/* Попапы для детального вида */}
                                <AnimatePresence>
                                    {showLevelPopup && selectedLevelData && (
                                        <LevelDetailsPopup
                                            key="levelDetailsPopup"
                                            ref={levelDetailsPopupRef}
                                            level={selectedLevelData}
                                            chapterId={chapterData.id}
                                            completionStatus={getLevelCompletionStatus(chapterData.id, selectedLevelData.id)}
                                            isHardUnlocked={isHardModeUnlocked(chapterData.id, selectedLevelData.id)}
                                            onClose={handleCloseLevelPopup}
                                            onStartLevel={handleStartLevelFromDetails}
                                        />
                                    )}
                                </AnimatePresence>
                                {isLoadingLevel && ( <div className="level-loading-overlay"><div className="loading-spinner"></div><div className="loading-text">Загрузка уровня...</div></div> )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Общие попапы и кнопка сброса, которые должны быть видны вне зависимости от текущего вида (детальный, карта мира, глобальная карта), если оверлей не активен */}
            {/* Однако, кнопки сброса и общие попапы, вероятно, должны быть доступны только в детальном виде или на карте глав, но не на глобальной карте. */}
            {/* Разместим их так, чтобы они не перекрывались с TransitionOverlay, если isOverlayActive */}
            {/* И возможно, их стоит показывать только если не активна глобальная карта */}
            {!isOverlayActive && !showGlobalMapView && (
                <>
                    {/* Попапы, такие как mail, hunting, tasks, exchange. Их лучше показывать только если активен детальный вид. */}
                    {showDetailedChapterView && activePopup && activePopup !== 'rewards' && (
                        <Popup title={getPopupTitle(activePopup)} onClose={closePopup}>
                            {getPopupContent(activePopup)}
                        </Popup>
                    )}
                    {/* Кнопка полного сброса может быть доступна, когда детальный вид или карта глав */}
                    {(showDetailedChapterView || showWorldMapView) && (
                         <button
                            className="reset-button"
                            style={{position: 'fixed', bottom: '10px', right: '10px', zIndex: 100}} // Пример позиционирования
                            onClick={handleFullResetClick}
                            title="Сбросить весь игровой прогресс"
                        >
                            Полный Сброс
                        </button>
                    )}
                     {/* Кнопка сброса Zustand, если нужна */}
                     {/* <button onClick={handleResetClick} style={{position: 'fixed', bottom: '50px', right: '10px', zIndex: 100}}>Сброс Zustand</button> */}
                </>
            )}
        </motion.div>
    );
};

export default MainMenu;