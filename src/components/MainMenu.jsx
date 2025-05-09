// src/components/MainMenu.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from "../store/useGameStore";
import WorldMap from "./WorldMap"; // Убедитесь, что импорт есть
import Popup from './Popup';
import "./MainMenu.scss";
import { pageVariants, pageTransition } from '../animations';
import { useNavigate, useLocation } // <<< ДОБАВЛЕН useLocation
from 'react-router-dom';
import LevelDetailsPopup from './LevelDetailsPopup';

const INITIAL_CHAPTER_ID = 1;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

// const MainMenu = (props) => { // Стиль из код1
//  const { onStart } = props;
const MainMenu = ({ onStart }) => { // Стиль из код2 сохранен
    const navigate = useNavigate();
    const location = useLocation(); // <<< ИСПОЛЬЗУЕМ useLocation

    // Инициализируем showMap на основе состояния из location или false по умолчанию
    const [showMap, setShowMap] = useState(location.state?.showChaptersMapDirectly || false);
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
        setCurrentChapterInStore, // Используется вместо setCurrentChapterInStoreAction из код1
        isLevelUnlocked,
        getLevelCompletionStatus,
        isHardModeUnlocked,
        resetGame,
        hasClaimableRewardsIndicator
    } = useGameStore(state => ({
        currentChapterIdFromStore: state.currentChapterId,
        setCurrentChapterInStore: state.setCurrentChapter,
        levelsCompleted: state.levelsCompleted,
        isLevelUnlocked: state.isLevelUnlocked,
        getLevelCompletionStatus: state.getLevelCompletionStatus,
        isHardModeUnlocked: state.isHardModeUnlocked,
        resetGame: state.resetGame,
        hasClaimableRewardsIndicator: state.hasClaimableRewardsIndicator
    }));

    const [currentChapterId, setCurrentChapterId] = useState(
        currentChapterIdFromStore || INITIAL_CHAPTER_ID
    );

    const handleFullResetClick = useCallback(() => {
        if (window.confirm('Вы уверены, что хотите сбросить ВЕСЬ прогресс игры? Это действие необратимо!')) {
            if (typeof resetGame === 'function') {
                resetGame();
            } else {
                console.error("Action resetGame не найден в useGameStore!");
            }
        }
    }, [resetGame]);

    // Эффект для синхронизации currentChapterId со стором и для очистки состояния location
    useEffect(() => {
        // Часть 1: Синхронизация currentChapterId со стором (объединенная логика)
        if (currentChapterIdFromStore && currentChapterIdFromStore !== currentChapterId) {
            setCurrentChapterId(currentChapterIdFromStore); // Если стор изменился, обновляем локальный ID
        } else if (currentChapterId && (!currentChapterIdFromStore || currentChapterId !== currentChapterIdFromStore)) {
            // Если локальный currentChapterId изменился (например, через handleGoToChapter или инициализация)
            // и отличается от стора (или стор пуст), обновим стор.
            setCurrentChapterInStore(currentChapterId);
        }

        // Часть 2: Обработка прямого перехода на карту глав из location.state
        // Если мы пришли сюда с флагом showChaptersMapDirectly,
        // и showMap еще не true, установим showMap и очистим состояние в location.
        if (location.state?.showChaptersMapDirectly) {
            if (!showMap) { // Дополнительная проверка, хотя useState выше должен справиться
                setShowMap(true);
            }
            // Очищаем состояние из location, чтобы при обновлении страницы (F5)
            // или возврате назад карта глав не открывалась автоматически снова.
            navigate(location.pathname, { state: {}, replace: true });
        }
    }, [
        location.state, navigate, showMap, /* setShowMap убран из зависимостей, как в код1, т.к. его изменение здесь же вызовет ре-рендер и эффект */
        currentChapterIdFromStore, currentChapterId, setCurrentChapterInStore
    ]);


    // Загрузка данных главы при изменении currentChapterId
    useEffect(() => {
        let isMounted = true;
        const loadChapter = async (id) => {
            if (!isMounted || !id) {
                if (!id) console.warn("[MainMenu] Попытка загрузить главу с ID: null или undefined. Используем INITIAL_CHAPTER_ID.");
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
                    } else { throw new Error(`Invalid export in chapter${id}Data.js`); }
                }
            } catch (error) {
                console.error(`[MainMenu] Failed to load CHAPTER data for ID ${id}:`, error);
                if (isMounted) {
                    alert(`Ошибка загрузки данных Главы ${id}. Проверьте путь и файл. Загружаем Главу ${INITIAL_CHAPTER_ID}.`);
                    if (id !== INITIAL_CHAPTER_ID) {
                        setCurrentChapterId(INITIAL_CHAPTER_ID); // Это вызовет обновление в сторе через другой useEffect
                    } else {
                        setIsLoadingChapter(false); setChapterData(null);
                    }
                }
            } finally {
                if (isMounted && currentChapterId === id) {
                    setIsLoadingChapter(false);
                }
            }
        };

        if (currentChapterId) {
            loadChapter(currentChapterId);
        } else if (!currentChapterIdFromStore) {
            console.log("[MainMenu] currentChapterId не определен, устанавливаем INITIAL_CHAPTER_ID");
            setCurrentChapterId(INITIAL_CHAPTER_ID);
        }
        return () => { isMounted = false; };
    }, [currentChapterId, setCurrentChapterInStore, currentChapterIdFromStore]);

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
    }, [chapterData]);

    const handleMouseDown = useCallback((e) => { if (e.button !== 0) return; setDragging(true); dragStart.current = { x: e.clientX, y: e.clientY }; mapStart.current = { ...position }; if (e.currentTarget) e.currentTarget.style.cursor = 'grabbing'; }, [position]);
    const handleTouchStart = useCallback((e) => { setDragging(true); dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; mapStart.current = { ...position }; }, [position]);
    const handleMouseMove = useCallback((e) => { if (!dragging) return; updatePosition(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y); }, [dragging, updatePosition]);
    const handleTouchMove = useCallback((e) => { if (!dragging) return; updatePosition(e.touches[0].clientX - dragStart.current.x, e.touches[0].clientY - dragStart.current.y); }, [dragging, updatePosition]);
    const stopDrag = useCallback((e) => { if (dragging) { setDragging(false); if (e.currentTarget && e.type === 'mouseup') { e.currentTarget.style.cursor = 'grab'; } } }, [dragging]);

    const handleLevelNodeClick = useCallback((levelUniqueId, e) => {
        e.stopPropagation();
        const currentLevelsArray = chapterData?.levels || [];
        if (!isLevelUnlocked(currentChapterId, levelUniqueId, currentLevelsArray, null, null)) {
            console.log(`[MainMenu] Уровень ${levelUniqueId} (глава ${currentChapterId}) заблокирован.`);
            alert("Уровень пока заблокирован. Пройдите предыдущие!");
            return;
        }
        const levelData = chapterData?.levels?.find(l => l.id === levelUniqueId);
        if (levelData) {
            setSelectedLevelId(levelUniqueId);
            setShowLevelPopup(true);
        } else {
            console.warn(`[MainMenu] Данные уровня не найдены для ID: ${levelUniqueId} после проверки разблокировки.`);
        }
    }, [chapterData, currentChapterId, isLevelUnlocked, setSelectedLevelId, setShowLevelPopup]);


    const handleCloseLevelPopup = useCallback(() => {
        setShowLevelPopup(false);
        setSelectedLevelId(null);
    }, []);

    const handleStartLevelFromDetails = useCallback((levelId, difficulty) => {
        console.log(`[MainMenu] Starting level ${levelId} with difficulty ${difficulty} from details popup`);
        if (!hasStarted.current && chapterData) {
            hasStarted.current = true;
            setIsLoadingLevel(true);
            setShowLevelPopup(false);
            onStart(chapterData.id, levelId, difficulty);
        }
    }, [chapterData, onStart]);

    // Вызывается из WorldMap для выбора главы
    const handleGoToChapter = useCallback((chapterStub) => {
        console.log("[MainMenu] Переключение на главу ID из WorldMap:", chapterStub.id);
        if (chapterStub.id !== currentChapterId) {
            setCurrentChapterId(chapterStub.id); // Обновляем локальный стейт, useEffect обновит стор
        }
        setShowMap(false); // Закрываем карту глав (WorldMap) и показываем детальную карту выбранной главы
    }, [currentChapterId, /* setCurrentChapterInStore - управляется через useEffect */ setShowMap]);


    // Вызывается из WorldMap для перехода на GlobalMap
    const handleNavigateToGlobalMapView = useCallback(() => {
        console.log("MainMenu: Переход на GlobalMap (/global-map)");
        if (showMap) { // Если карта глав (WorldMap) сейчас открыта
            setShowMap(false); // Скрываем ее
        }
        navigate('/global-map');
    }, [navigate, showMap, setShowMap]); // Зависимости из код1 сохранены


    const handleBattlePassClick = useCallback(() => { console.log("Battle Pass clicked"); }, []);
    const handleMailClick = useCallback(() => setActivePopup('mail'), []);
    const handleRewardsChestClick = useCallback(() => { navigate('/rewards'); }, [navigate]);
    const handleDailyGrindClick = useCallback(() => setActivePopup('hunting'), []);
    const handleQuestsClick = useCallback(() => setActivePopup('tasks'), []);
    const handleExchangeClick = useCallback(() => setActivePopup('exchange'), []);

    // Кнопка в MainMenu, которая открывает WorldMap (карту глав)
    const handleWorldMapClick = useCallback(() => {
        // Перед открытием карты глав, убедимся, что currentChapterId в сторе актуален
        if (currentChapterId !== currentChapterIdFromStore) {
            setCurrentChapterInStore(currentChapterId);
        }
        setShowMap(true);
    }, [setShowMap, currentChapterId, currentChapterIdFromStore, setCurrentChapterInStore]);


    const closePopup = useCallback(() => setActivePopup(null), []);
    const handleResetClick = useCallback(() => { if (window.confirm('Сбросить все данные?')) { useGameStore.persist.clearStorage(); window.location.reload(); } }, []);


    const getPopupContent = (popupType) => {
        switch (popupType) {
            case 'mail': return <div>Содержимое почты...</div>;
            case 'hunting': return <div>Содержимое охоты...</div>;
            case 'tasks': return <div>Содержимое заданий...</div>;
            case 'exchange': return <div>Содержимое обмена...</div>;
            default: return null;
        }
    };
    const getPopupTitle = (popupType) => {
        switch (popupType) {
            case 'mail': return "Почта";
            case 'hunting': return "Ежедневная охота";
            case 'tasks': return "Задания";
            case 'exchange': return "Обменник";
            default: return "";
        }
    };

    if (showMap) { // Это показывает WorldMap.jsx (карту глав/островов)
        return (<WorldMap
            goBack={() => setShowMap(false)} // Возврат к детальной карте текущей главы
            goToChapter={handleGoToChapter}    // Выбор главы на карте островов
            currentChapterId={currentChapterId} // Для подсветки текущего острова/главы
            onGoToGlobalMap={handleNavigateToGlobalMapView} // Кнопка на WorldMap для перехода на супер-карту
        />);
    }

    if (isLoadingChapter || !chapterData) {
        return (
            <motion.div className="main-menu" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                <div className="level-loading-overlay">
                    <div className="loading-spinner"></div>
                    <div className="loading-text">Загрузка главы {currentChapterId || INITIAL_CHAPTER_ID}...</div>
                </div>
            </motion.div>
        );
    }

    const selectedLevelData = chapterData.levels?.find(l => l.id === selectedLevelId);

    const getLevelDisplayStatus = (level) => {
        const currentLevelsArray = chapterData?.levels || [];
        const unlocked = isLevelUnlocked(currentChapterId, level.id, currentLevelsArray, null, null);
        const completionStatus = getLevelCompletionStatus(currentChapterId, level.id);

        let levelStatusClass = 'locked';
        if (unlocked) {
            if (completionStatus?.hard) {
                levelStatusClass = 'completed-hard';
            } else if (completionStatus?.normal) {
                levelStatusClass = 'completed-normal';
            } else {
                levelStatusClass = 'active';
            }
        }
        return levelStatusClass;
    };


    return (
        <motion.div className="main-menu" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
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
                            const nextLevelStatus = getLevelDisplayStatus(nextLevel);
                            const isPathActive = currentLevelStatus === 'completed-normal' || currentLevelStatus === 'completed-hard' || (currentLevelStatus === 'active' && nextLevelStatus === 'active');
                            return ( <path key={`path-${level.id}-to-${nextLevel.id}`} d={d} className={`level-connection-path ${isPathActive ? 'active' : ''}`} /> );
                        })}
                    </svg>
                    {chapterData.levels?.map((level) => {
                        const levelStatusClass = getLevelDisplayStatus(level);
                        const levelNumberInChapter = level.id % 100;

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
                                onClick={(e) => {
                                    handleLevelNodeClick(level.id, e);
                                }}
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
                <button className="main-menu-button icon-button mail-button" onClick={handleMailClick}><img src="/assets/icons/mail-icon.png" alt="Почта" /></button>
                <button
                    className={`main-menu-button icon-button rewards-chest-button ${hasClaimableRewardsIndicator ? 'has-indicator' : ''}`}
                    onClick={handleRewardsChestClick}
                >
                    <img src="/assets/icons/gift-icon.png" alt="Награды" />
                </button>
                <button className="main-menu-button icon-button daily-grind-button" onClick={handleDailyGrindClick}><img src="/assets/icons/daily-grind-icon.png" alt="Daily Grind" /></button>
            </div>

            <div className="main-menu-right-column">
                 {/* Кнопка, которая открывает WorldMap.jsx (карту глав), использует обновленный handleWorldMapClick */}
                <button className="main-menu-button icon-button world-map-button" onClick={handleWorldMapClick}><img src="/assets/icons/map-icon.png" alt="Карта Глав" /></button>
                <button className="main-menu-button icon-button quests-button" onClick={handleQuestsClick}><img src="/assets/icons/quests-icon.png" alt="Задания" /></button>
                <button className="main-menu-button icon-button exchange-button" onClick={handleExchangeClick}><img src="/assets/icons/exchange-icon.png" alt="Обмен" /></button>
            </div>

            <AnimatePresence>
                {showLevelPopup && selectedLevelData && chapterData && (
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
            <button className="reset-button" onClick={handleResetClick}>reset</button>

            {activePopup && activePopup !== 'rewards' && (
                <Popup title={getPopupTitle(activePopup)} onClose={closePopup}>
                    {getPopupContent(activePopup)}
                </Popup>
            )}
            <button
                className="main-menu-button reset-progress-button"
                onClick={handleFullResetClick}
                title="Сбросить весь игровой прогресс"
            >
                Сброс
            </button>
        </motion.div>
    );
};

export default MainMenu;