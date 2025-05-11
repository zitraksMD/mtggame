// src/components/MainMenu.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from "../store/useGameStore";
import WorldMap from "./WorldMap";
import GlobalMap from "./GlobalMap";
// НЕТ импорта TransitionOverlay здесь (как в код1)
import Popup from './Popup';
import "./MainMenu.scss";
import { pageVariants, pageTransition } from '../animations';
import { useNavigate, useLocation } from 'react-router-dom';
import LevelDetailsPopup from './LevelDetailsPopup';

const INITIAL_CHAPTER_ID = 1;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const MainMenu = ({ onStart }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Состояния для условного рендеринга внутренних видов (инициализация как в код1, если location.state не диктует иное через useEffect)
    const [showDetailedChapterView, setShowDetailedChapterView] = useState(true);
    const [showWorldMapView, setShowWorldMapView] = useState(false); // Инициализируем false, useEffect[location.state] обработает переход если нужно
    const [showGlobalMapView, setShowGlobalMapView] = useState(false);

    // --- Локальный Overlay и его состояния/логика УДАЛЕНЫ (согласно код1) ---

    // Состояния из код2, относящиеся к детальному виду и UI (остаются)
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
        setIsFullScreenMapActive,
        startScreenTransition,     // Получаем из стора (как в код1)
        ensureScreenIsOpening,     // Получаем из стора (как в код1)
    } = useGameStore(state => ({
        currentChapterIdFromStore: state.currentChapterId,
        setCurrentChapterInStore: state.setCurrentChapter,
        isLevelUnlocked: state.isLevelUnlocked,
        getLevelCompletionStatus: state.getLevelCompletionStatus,
        isHardModeUnlocked: state.isHardModeUnlocked,
        resetGame: state.resetGame,
        hasClaimableRewardsIndicator: state.hasClaimableRewardsIndicator,
        setIsFullScreenMapActive: state.setIsFullScreenMapActive,
        startScreenTransition: state.startScreenTransition,
        ensureScreenIsOpening: state.ensureScreenIsOpening, // Добавлено из код1
    }));

    const [currentChapterId, setCurrentChapterId] = useState(
        location.state?.focusOnChapterId || currentChapterIdFromStore || INITIAL_CHAPTER_ID
    );

    // При монтировании этого экрана, убедимся, что шторки откроются (из код1)
    useEffect(() => {
        if (ensureScreenIsOpening) { // Добавим проверку на случай если action не определен в сторе
          ensureScreenIsOpening();
        }
    }, [ensureScreenIsOpening]);

    // Управление флагом isFullScreenMapActive
    useEffect(() => {
        setIsFullScreenMapActive(showWorldMapView || showGlobalMapView);
    }, [showWorldMapView, showGlobalMapView, setIsFullScreenMapActive]);

    // useEffect для обработки location.state и синхронизации currentChapterId
    useEffect(() => {
        const stateFromLocation = location.state || {};
        const chapterIdFromLocation = stateFromLocation.focusOnChapterId;
        const shouldShowWorldMapDirectly = stateFromLocation.showChaptersMapDirectly;
        let stateNeedsClearing = false;

        if (chapterIdFromLocation) {
            if (chapterIdFromLocation !== currentChapterId) setCurrentChapterId(chapterIdFromLocation);
            if (chapterIdFromLocation !== currentChapterIdFromStore) setCurrentChapterInStore(chapterIdFromLocation);
            stateNeedsClearing = true;
        } else if (currentChapterIdFromStore && currentChapterIdFromStore !== currentChapterId) {
            setCurrentChapterId(currentChapterIdFromStore);
        } else if (currentChapterId && currentChapterId !== currentChapterIdFromStore) {
            setCurrentChapterInStore(currentChapterId);
        }

        if (shouldShowWorldMapDirectly) {
            stateNeedsClearing = true;
            const chapterIdForWorldMap = chapterIdFromLocation || currentChapterId;
            if (chapterIdForWorldMap !== currentChapterIdFromStore) setCurrentChapterInStore(chapterIdForWorldMap);
            if (chapterIdForWorldMap !== currentChapterId) setCurrentChapterId(chapterIdForWorldMap);

            // Если нужно показать WorldMap и он еще не показан (т.е. активен detailed или global view)
            // Используем startScreenTransition для смены вида
            if (showDetailedChapterView || showGlobalMapView) { // Проверяем, что не находимся уже на WorldMap
                console.log("MainMenu: useEffect location.state - target is WorldMap. Starting transition via store.");
                startScreenTransition(() => {
                    setShowDetailedChapterView(false);
                    setShowGlobalMapView(false);
                    setShowWorldMapView(true);
                });
            }
        }

        if (stateNeedsClearing && Object.keys(stateFromLocation).length > 0) {
            console.log("MainMenu: useEffect - Clearing location.state:", location.state);
            navigate(location.pathname, { state: {}, replace: true });
        }
    }, [location.state, navigate, currentChapterId, currentChapterIdFromStore, setCurrentChapterInStore, showWorldMapView, showGlobalMapView, showDetailedChapterView, startScreenTransition]);


    // Загрузка данных главы
    useEffect(() => {
        let isMounted = true;
        const loadChapter = async (id) => {
            if (!isMounted || !id) return;
            console.log(`[MainMenu] Attempting to load CHAPTER data for chapter ${id}...`);
            setIsLoadingChapter(true); setChapterData(null); setPosition({ x: 0, y: 0 });
            try {
                const chapterModule = await import(`../data/chapters/chapter${id}/chapter${id}Data.js`);
                if (isMounted) {
                    if (chapterModule.default && typeof chapterModule.default.id === 'number') {
                        setChapterData(chapterModule.default);
                        console.log("[MainMenu] Successfully loaded CHAPTER data:", chapterModule.default);
                    } else { throw new Error(`Invalid chapter data structure or missing ID in chapter${id}Data.js`); }
                }
            } catch (error) {
                if (isMounted) {
                    console.error(`[MainMenu] Failed to load CHAPTER data for ID ${id}:`, error);
                    if (id !== INITIAL_CHAPTER_ID) {
                        alert(`Ошибка загрузки данных Главы ${id}. Загружаем Главу ${INITIAL_CHAPTER_ID}.`);
                        setCurrentChapterId(INITIAL_CHAPTER_ID);
                        setCurrentChapterInStore(INITIAL_CHAPTER_ID);
                    } else {
                        alert(`Критическая ошибка: не удалось загрузить даже начальную Главу ${INITIAL_CHAPTER_ID}.`);
                        setChapterData(null);
                    }
                }
            } finally {
                if (isMounted && currentChapterId === id) { setIsLoadingChapter(false); }
                else if (isMounted) { console.log(`[MainMenu] Chapter ID changed during load from ${id} to ${currentChapterId}. Aborting setIsLoadingChapter(false) for ${id}.`);}
            }
        };
        if (currentChapterId) { loadChapter(currentChapterId); }
        else if (isMounted) {
            setCurrentChapterId(INITIAL_CHAPTER_ID);
            if (currentChapterIdFromStore !== INITIAL_CHAPTER_ID) {
                 setCurrentChapterInStore(INITIAL_CHAPTER_ID);
            }
        }
        return () => { isMounted = false; };
    }, [currentChapterId, setCurrentChapterInStore, currentChapterIdFromStore]); // Добавлены currentChapterIdFromStore и setCurrentChapterInStore для полноты

    // useEffect для установки начальной позиции карты
    useEffect(() => {
        if (!chapterData || isLoadingChapter || !mapContainerRef.current) return;
        const containerWidth = mapContainerRef.current.offsetWidth;
        const containerHeight = mapContainerRef.current.offsetHeight;
        const mapWidth = chapterData.imageWidth;
        const mapHeight = chapterData.imageHeight;
        let initialX = chapterData.initialView?.x ?? clamp(containerWidth / 2 - mapWidth / 2, containerWidth - mapWidth, 0);
        let initialY = chapterData.initialView?.y ?? clamp(containerHeight / 2 - mapHeight / 2, containerHeight - mapHeight, 0);
        setPosition({ x: initialX, y: initialY });
        hasStarted.current = false; setIsLoadingLevel(false);
    }, [chapterData, isLoadingChapter]);

    // Коллбэк для смены вида, использующий startScreenTransition (из код1)
    const changeActiveView = useCallback((targetView) => {
        console.log(`MainMenu: Changing view to ${targetView} using global transition.`);
        startScreenTransition(() => {
            if (targetView === 'detailed') {
                setShowDetailedChapterView(true); setShowWorldMapView(false); setShowGlobalMapView(false);
            } else if (targetView === 'world') {
                setShowDetailedChapterView(false); setShowWorldMapView(true); setShowGlobalMapView(false);
            } else if (targetView === 'global') {
                setShowDetailedChapterView(false); setShowWorldMapView(false); setShowGlobalMapView(true);
            }
        });
    }, [startScreenTransition, setShowDetailedChapterView, setShowWorldMapView, setShowGlobalMapView]);

    // Навигационные хендлеры, использующие changeActiveView
    const handleChapterSelectFromWorldMap = useCallback((chapterStub) => {
        console.log("[MainMenu] Выбрана глава из WorldMap:", chapterStub.id);
        if (chapterStub.id !== currentChapterId) {
            setCurrentChapterId(chapterStub.id);
            // setCurrentChapterInStore не нужен здесь напрямую, useEffect[currentChapterId] позаботится об этом
        }
        changeActiveView('detailed');
    }, [currentChapterId, changeActiveView]); // Убран setCurrentChapterId из зависимостей, т.к. он есть в currentChapterId

    const handleNavigateToGlobalMapFromWorld = useCallback(() => {
        console.log("[MainMenu] Переход с WorldMap на GlobalMap");
        changeActiveView('global');
    }, [changeActiveView]);

    const handleWorldMapClick = useCallback(() => {
        console.log("[MainMenu] Клик на 'Карта Глав' из детального вида.");
        if (currentChapterId !== currentChapterIdFromStore) {
            setCurrentChapterInStore(currentChapterId);
        }
        changeActiveView('world');
    }, [currentChapterId, currentChapterIdFromStore, setCurrentChapterInStore, changeActiveView]);

    const handleContinentSelectFromGlobalMap = useCallback((startChapterId) => {
        console.log(`[MainMenu] Выбран континент (глава ${startChapterId}) на GlobalMap. Показываем WorldMap.`);
        if (startChapterId !== currentChapterId) {
            setCurrentChapterId(startChapterId);
        }
        changeActiveView('world');
    }, [currentChapterId, changeActiveView]); // Убран setCurrentChapterId

    const handleGoBackToWorldMapFromGlobal = useCallback(() => {
        console.log("[MainMenu] Возврат с GlobalMap на WorldMap.");
        changeActiveView('world');
    }, [changeActiveView]);

    // Хендлер для перехода на другой маршрут (например, /rewards), используя startScreenTransition (из код1)
    const handleRewardsChestClick = useCallback(() => {
        console.log("[MainMenu] Переход на экран Наград");
        startScreenTransition(() => navigate('/rewards'));
    }, [navigate, startScreenTransition]);

    // Остальные useCallback хуки (управление картой, попапами и т.д.) из код2
    const updatePosition = useCallback((dx, dy) => { if (!mapContainerRef.current || !chapterData?.imageWidth || !chapterData?.imageHeight) return; const containerWidth = mapContainerRef.current.offsetWidth; const containerHeight = mapContainerRef.current.offsetHeight; const mapWidth = chapterData.imageWidth; const mapHeight = chapterData.imageHeight; const minX = Math.min(0, containerWidth - mapWidth); const minY = Math.min(0, containerHeight - mapHeight); const newX = clamp(mapStart.current.x + dx, minX, 0); const newY = clamp(mapStart.current.y + dy, minY, 0); setPosition({ x: newX, y: newY }); }, [chapterData]);
    const handleMouseDown = useCallback((e) => { if (e.button !== 0) return; setDragging(true); dragStart.current = { x: e.clientX, y: e.clientY }; mapStart.current = { ...position }; if (e.currentTarget) e.currentTarget.style.cursor = 'grabbing'; }, [position]);
    const handleTouchStart = useCallback((e) => { setDragging(true); dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; mapStart.current = { ...position }; }, [position]);
    const handleMouseMove = useCallback((e) => { if (!dragging) return; updatePosition(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y); }, [dragging, updatePosition]);
    const handleTouchMove = useCallback((e) => { if (!dragging) return; updatePosition(e.touches[0].clientX - dragStart.current.x, e.touches[0].clientY - dragStart.current.y); }, [dragging, updatePosition]);
    const stopDrag = useCallback((e) => { if (dragging) { setDragging(false); if (e.currentTarget && e.type === 'mouseup') { e.currentTarget.style.cursor = 'grab'; } } }, [dragging]);
    const handleLevelNodeClick = useCallback((levelUniqueId, e) => { e.stopPropagation(); const currentLevelsArray = chapterData?.levels || []; if (!isLevelUnlocked(currentChapterId, levelUniqueId, currentLevelsArray, null, null)) { alert("Уровень пока заблокирован. Пройдите предыдущие!"); return; } const levelData = chapterData?.levels?.find(l => l.id === levelUniqueId); if (levelData) { setSelectedLevelId(levelUniqueId); setShowLevelPopup(true); } }, [chapterData, currentChapterId, isLevelUnlocked]);
    const handleCloseLevelPopup = useCallback(() => { setShowLevelPopup(false); setSelectedLevelId(null); }, []);
    const handleStartLevelFromDetails = useCallback((levelId, difficulty) => { if (!hasStarted.current && chapterData) { hasStarted.current = true; setIsLoadingLevel(true); setShowLevelPopup(false); onStart(chapterData.id, levelId, difficulty); } }, [chapterData, onStart]);
    
    const handleFullResetClick = useCallback(() => {
        if (window.confirm('Вы уверены, что хотите сбросить ВЕСЬ прогресс игры? Это действие необратимо!')) {
            resetGame();
            const targetChapterId = INITIAL_CHAPTER_ID;
            setCurrentChapterId(targetChapterId); 
            setCurrentChapterInStore(targetChapterId);
            
            if (showWorldMapView || showGlobalMapView) {
                changeActiveView('detailed'); // Используем changeActiveView для возврата к детальному виду через глобальную шторку
            }
            // Если уже на детальном виде, useEffect[currentChapterId] позаботится о перезагрузке данных
        }
    }, [resetGame, showWorldMapView, showGlobalMapView, changeActiveView, setCurrentChapterInStore, setCurrentChapterId]);

    const handleBattlePassClick = useCallback(() => { console.log("Battle Pass clicked"); setActivePopup('battlepass'); }, []);
    const handleMailClick = useCallback(() => setActivePopup('mail'), []);
    // handleRewardsChestClick уже определен выше с startScreenTransition
    const handleDailyGrindClick = useCallback(() => setActivePopup('hunting'), []);
    const handleQuestsClick = useCallback(() => setActivePopup('tasks'), []);
    const handleExchangeClick = useCallback(() => setActivePopup('exchange'), []);
    const closePopup = useCallback(() => setActivePopup(null), []);
    const getPopupContent = (popupType) => { switch (popupType) { case 'mail': return <div>Содержимое почты...</div>; case 'hunting': return <div>Содержимое охоты...</div>; case 'tasks': return <div>Содержимое заданий...</div>; case 'exchange': return <div>Содержимое обмена...</div>; case 'battlepass': return <div>Содержимое Battle Pass...</div>; default: return null; } };
    const getPopupTitle = (popupType) => { switch (popupType) { case 'mail': return "Почта"; case 'hunting': return "Ежедневная охота"; case 'tasks': return "Задания"; case 'exchange': return "Обменник"; case 'battlepass': return "Боевой Пропуск"; default: return ""; } };

    // Анимация для внутреннего контента (из код1)
    const screenContentVariants = {
        initial: { opacity: 1 }, // Контент должен быть виден сразу, шторки анимируются поверх
        animate: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: 0.05 } } // Быстро исчезает перед сменой контента (0.1 в код1, 0.05 здесь для еще более быстрой смены)
    };
    const loadingScreenVariants = { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.3 } }, exit: { opacity: 0, transition: { duration: 0.2 } } };

    const selectedLevelData = chapterData?.levels?.find(l => l.id === selectedLevelId);
    const getLevelDisplayStatus = (level) => { const currentLevelsArray = chapterData?.levels || []; const unlocked = isLevelUnlocked(currentChapterId, level.id, currentLevelsArray, null, null); const completionStatus = getLevelCompletionStatus(currentChapterId, level.id); let levelStatusClass = 'locked'; if (unlocked) { if (completionStatus?.hard) levelStatusClass = 'completed-hard'; else if (completionStatus?.normal) levelStatusClass = 'completed-normal'; else levelStatusClass = 'active'; } return levelStatusClass; };

    return (
        <motion.div
            className="main-menu" // Убедитесь, что .main-menu { width: 100%; height: 100%; position: absolute; top: 0; left: 0; } (из код1)
            key="mainmenu-screen" // Ключ для AnimatePresence в App.jsx (из код1)
            initial="initial"     // Используем pageVariants для анимации самого MainMenu (fade "под" шторками)
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
        >
            {/* Глобальный TransitionOverlay управляется из App.jsx */}
            
            <AnimatePresence mode="wait">
                {showGlobalMapView && (
                    <motion.div key="globalmap-view" {...screenContentVariants} style={{width: '100%', height: '100%', position: 'absolute', top:0, left:0, zIndex: 1}}>
                        <GlobalMap
                            onSelectContinent={handleContinentSelectFromGlobalMap}
                            onGoBackToChapterMap={handleGoBackToWorldMapFromGlobal}
                        />
                    </motion.div>
                )}
                {showWorldMapView && !showGlobalMapView && (
                    <motion.div key="worldmap-view" {...screenContentVariants} style={{width: '100%', height: '100%', position: 'absolute', top:0, left:0, zIndex: 1}}>
                        <WorldMap
                            goBack={() => changeActiveView('detailed')}
                            goToChapter={handleChapterSelectFromWorldMap}
                            currentChapterId={currentChapterId}
                            onGoToGlobalMap={handleNavigateToGlobalMapFromWorld}
                        />
                    </motion.div>
                )}
                {showDetailedChapterView && !showWorldMapView && !showGlobalMapView && (
                    <motion.div key="detailed-chapter-view" {...screenContentVariants} style={{width: '100%', height: '100%', zIndex: 1}}>
                        {isLoadingChapter || !chapterData ? (
                            <motion.div key="loading-view-content" variants={loadingScreenVariants} initial="initial" animate="animate" exit="exit"
                                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 0, left: 0, background: 'var(--main-bg-color, #282c34)', zIndex: 2 }}>
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
                                                const curveOffset = Math.min(Math.max(15,Math.abs(dx)*0.1 + Math.abs(dy)*0.1), Math.sqrt(dx*dx + dy*dy) * 0.2); 
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
                                                <div key={level.id} className={`level-node ${levelStatusClass}`}
                                                    style={{ position: 'absolute', left: `${level.x}px`, top: `${level.y}px`, width: `${level.nodeSize || 40}px`, height: `${level.nodeSize || 40}px` }}
                                                    onClick={(e) => { handleLevelNodeClick(level.id, e); }} >
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
                                    <button className={`main-menu-button icon-button rewards-chest-button ${hasClaimableRewardsIndicator ? 'has-indicator' : ''}`} onClick={handleRewardsChestClick} title="Награды" >
                                        <img src="/assets/icons/gift-icon.png" alt="Награды" />
                                    </button>
                                    <button className="main-menu-button icon-button daily-grind-button" onClick={handleDailyGrindClick} title="Ежедневная охота"><img src="/assets/icons/daily-grind-icon.png" alt="Daily Grind" /></button>
                                </div>
                                <div className="main-menu-right-column">
                                    <button className="main-menu-button icon-button world-map-button" onClick={handleWorldMapClick} title="Карта Глав"> <img src="/assets/icons/map-icon.png" alt="Карта Глав" /> </button>
                                    <button className="main-menu-button icon-button quests-button" onClick={handleQuestsClick} title="Задания"><img src="/assets/icons/quests-icon.png" alt="Задания" /></button>
                                    <button className="main-menu-button icon-button exchange-button" onClick={handleExchangeClick} title="Обмен"><img src="/assets/icons/exchange-icon.png" alt="Обмен" /></button>
                                </div>
                                <AnimatePresence>
                                    {showLevelPopup && selectedLevelData && (
                                        <LevelDetailsPopup key="levelDetailsPopup" ref={levelDetailsPopupRef} level={selectedLevelData} chapterId={chapterData.id}
                                            completionStatus={getLevelCompletionStatus(chapterData.id, selectedLevelData.id)} isHardUnlocked={isHardModeUnlocked(chapterData.id, selectedLevelData.id)}
                                            onClose={handleCloseLevelPopup} onStartLevel={handleStartLevelFromDetails} />
                                    )}
                                </AnimatePresence>
                                {isLoadingLevel && ( <div className="level-loading-overlay"><div className="loading-spinner"></div><div className="loading-text">Загрузка уровня...</div></div> )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Попапы и кнопка сброса */}
            {!showGlobalMapView && (
                <>
                    {showDetailedChapterView && activePopup && activePopup !== 'rewards' && (
                        <Popup title={getPopupTitle(activePopup)} onClose={closePopup}>
                            {getPopupContent(activePopup)}
                        </Popup>
                    )}
                    {(showDetailedChapterView || showWorldMapView) && (
                         <button className="reset-button" style={{position: 'fixed', bottom: '10px', right: '10px', zIndex: 100}} onClick={handleFullResetClick} title="Сбросить весь игровой прогресс" >
                            Полный Сброс
                        </button>
                    )}
                </>
            )}
        </motion.div>
    );
};

export default MainMenu;