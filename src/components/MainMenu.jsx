// src/components/MainMenu.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from "../store/useGameStore"; // Убедись, что импорт есть
import WorldMap from "./WorldMap";
import Popup from './Popup';
import "./MainMenu.scss";
import { pageVariants, pageTransition } from '../animations';
import { useNavigate } from 'react-router-dom';
import LevelDetailsPopup from './LevelDetailsPopup';

const INITIAL_CHAPTER_ID = 1; // Это будет использоваться, если в сторе ничего нет
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const MainMenu = ({ onStart }) => {
    const navigate = useNavigate();

    const [showMap, setShowMap] = useState(false);
    const [selectedLevelId, setSelectedLevelId] = useState(null);
    const [showLevelPopup, setShowLevelPopup] = useState(false);
    const [isLoadingLevel, setIsLoadingLevel] = useState(false);
    // const [currentChapterId, setCurrentChapterId] = useState(INITIAL_CHAPTER_ID); // Удалено, будет управляться через стор и синхронизированный локальный стейт
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

    // +++ ИЗМЕНЕНИЯ ИЗ КОД1: Получаем данные и селекторы из стора +++
    const {
        currentChapterIdFromStore, // Переименовываем, чтобы не конфликтовать с useState
        setCurrentChapterInStore,   // Action из стора
        isLevelUnlocked,
        getLevelCompletionStatus,
        isHardModeUnlocked,
        resetGame,
        hasClaimableRewardsIndicator // <<< ПОЛУЧАЕМ ФЛАГ ИЗ СТОРА (добавлено из код1)
        // levelsCompleted, // Раскомментируй, если нужно напрямую
    } = useGameStore(state => ({
        currentChapterIdFromStore: state.currentChapterId,
        setCurrentChapterInStore: state.setCurrentChapter,
        levelsCompleted: state.levelsCompleted,
        isLevelUnlocked: state.isLevelUnlocked,
        getLevelCompletionStatus: state.getLevelCompletionStatus,
        isHardModeUnlocked: state.isHardModeUnlocked,
        resetGame: state.resetGame,
        hasClaimableRewardsIndicator: state.hasClaimableRewardsIndicator // <<< Связываем (добавлено из код1)
    }));

    // Используем локальный стейт, который инициализируется из стора или дефолтом
    const [currentChapterId, setCurrentChapterId] = useState(
        currentChapterIdFromStore || INITIAL_CHAPTER_ID
    );

    const handleFullResetClick = useCallback(() => {
        if (window.confirm('Вы уверены, что хотите сбросить ВЕСЬ прогресс игры? Это действие необратимо!')) {
            if (typeof resetGame === 'function') {
                resetGame();
                // После сброса может потребоваться перезагрузка страницы или переход на начальный экран,
                // чтобы игра корректно инициализировалась с чистого состояния.
                // resetGame в сторе уже делает localStorage.clear() и window.location.reload();
            } else {
                console.error("Action resetGame не найден в useGameStore!");
            }
        }
    }, [resetGame]);

    // Синхронизируем локальный стейт со стором и наоборот при необходимости
    useEffect(() => {
        // Если в сторе значение изменилось (например, загрузилось из localStorage)
        // и оно отличается от текущего локального значения
        if (currentChapterIdFromStore && currentChapterIdFromStore !== currentChapterId) {
            setCurrentChapterId(currentChapterIdFromStore);
        } else if (!currentChapterIdFromStore && currentChapterId) {
            // Если в сторе пусто, а у нас есть значение (например, INITIAL_CHAPTER_ID или измененное пользователем),
            // запишем в стор. Это важно при первой загрузке, если стор пуст.
            setCurrentChapterInStore(currentChapterId);
        }
        // Этот эффект должен реагировать на изменения из стора и на инициализацию
    }, [currentChapterIdFromStore, currentChapterId, setCurrentChapterInStore]);
    // +++ КОНЕЦ ИЗМЕНЕНИЙ ИЗ КОД1 для currentChapterId +++

    useEffect(() => {
        let isMounted = true;
        const loadChapter = async (id) => {
            if (!isMounted || !id) { // Добавлена проверка на id
                if (!id) console.warn("[MainMenu] Попытка загрузить главу с ID: null или undefined. Используем INITIAL_CHAPTER_ID.");
                // Если id невалидный, но мы хотим попытаться загрузить дефолтную главу:
                // if (!id && isMounted) {
                //      setCurrentChapterId(INITIAL_CHAPTER_ID); // Это вызовет перезапуск useEffect
                //      if (!currentChapterIdFromStore) setCurrentChapterInStore(INITIAL_CHAPTER_ID);
                // }
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
                        // Обновляем и локальный стейт и стор
                        setCurrentChapterId(INITIAL_CHAPTER_ID);
                        setCurrentChapterInStore(INITIAL_CHAPTER_ID);
                    } else {
                        // Если уже пытались загрузить INITIAL_CHAPTER_ID и не вышло
                        setIsLoadingChapter(false); setChapterData(null);
                    }
                }
            } finally {
                // Проверяем, что текущий загружаемый id все еще актуален
                if (isMounted && currentChapterId === id) { setIsLoadingChapter(false); }
            }
        };

        if (currentChapterId) { // Убедимся, что currentChapterId определен перед загрузкой
             loadChapter(currentChapterId);
        } else if (!currentChapterIdFromStore) {
            // Если currentChapterId еще не установлен (например, при первом рендере и пустом сторе)
            // Устанавливаем INITIAL_CHAPTER_ID, что вызовет useEffect для currentChapterId и loadChapter
            console.log("[MainMenu] currentChapterId не определен, устанавливаем INITIAL_CHAPTER_ID");
            setCurrentChapterId(INITIAL_CHAPTER_ID);
            setCurrentChapterInStore(INITIAL_CHAPTER_ID); // Также обновить стор
        }


        return () => { isMounted = false; };
    }, [currentChapterId, setCurrentChapterInStore]); // Добавили setCurrentChapterInStore в зависимости, хотя он не должен меняться часто

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
            setShowLevelPopup(false); // Закрываем попап перед стартом
            onStart(chapterData.id, levelId, difficulty);
        }
    }, [chapterData, onStart]);

    // +++ ОБНОВЛЕННЫЙ handleGoToChapter ИЗ КОД1 +++
    const handleGoToChapter = useCallback((chapterStub) => {
        console.log("[MainMenu] Switching to chapter ID from map:", chapterStub.id);
        if (chapterStub.id !== currentChapterId) {
            setCurrentChapterId(chapterStub.id); // Обновляем локальный стейт
            setCurrentChapterInStore(chapterStub.id); // Обновляем стейт в сторе (он сохранится)
        }
        setShowMap(false);
    }, [currentChapterId, setCurrentChapterInStore, setShowMap]); // Убрали setCurrentChapterId из зависимостей, так как он сам является useState setter

    const handleBattlePassClick = useCallback(() => { console.log("Battle Pass clicked"); }, []);
    const handleMailClick = useCallback(() => setActivePopup('mail'), []);
    const handleRewardsChestClick = useCallback(() => { navigate('/rewards'); }, [navigate]);
    const handleDailyGrindClick = useCallback(() => setActivePopup('hunting'), []);
    const handleQuestsClick = useCallback(() => setActivePopup('tasks'), []);
    const handleExchangeClick = useCallback(() => setActivePopup('exchange'), []);
    const handleWorldMapClick = useCallback(() => setShowMap(true), []);
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

    if (showMap) {
        return (<WorldMap goBack={() => setShowMap(false)} goToChapter={handleGoToChapter} currentChapterId={currentChapterId} />);
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

    // Функция getLevelDisplayStatus обновлена согласно логике из код1
    const getLevelDisplayStatus = (level) => {
        // ... (получение unlocked, completionStatus) ...
        const currentLevelsArray = chapterData?.levels || []; // Предполагаем, что это нужно для isLevelUnlocked
        const unlocked = isLevelUnlocked(currentChapterId, level.id, currentLevelsArray, null, null);
        const completionStatus = getLevelCompletionStatus(currentChapterId, level.id);

        let levelStatusClass = 'locked'; // По умолчанию заблокирован
        if (unlocked) { // Если уровень разблокирован
            if (completionStatus?.hard) { // Проверяем, пройден ли на Hard
                levelStatusClass = 'completed-hard'; // Пройден на Hard
            } else if (completionStatus?.normal) { // Если не Hard, проверяем Normal
                levelStatusClass = 'completed-normal'; // Пройден на Normal
            } else {
                levelStatusClass = 'active'; // Разблокирован, но не пройден ни на одной сложности
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
                        const levelStatusClass = getLevelDisplayStatus(level); // Используем обновленную функцию
                        const levelNumberInChapter = level.id % 100; // Предполагается, что ID уровня это chapterId * 100 + levelNumber

                        return (
                            <div
                                key={level.id}
                                className={`level-node ${levelStatusClass}`} // className устанавливается здесь
                                style={{
                                    position: 'absolute',
                                    left: `${level.x}px`,
                                    top: `${level.y}px`,
                                    width: `${level.nodeSize || 40}px`,
                                    height: `${level.nodeSize || 40}px`,
                                    // backgroundImage: level.icon ? `url(${level.icon})` : undefined, // Если есть иконки
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
                {/* ИЗМЕНЕНИЕ ИЗ КОД1: Добавляем класс has-indicator */}
                <button
                    className={`main-menu-button icon-button rewards-chest-button ${hasClaimableRewardsIndicator ? 'has-indicator' : ''}`}
                    onClick={handleRewardsChestClick}
                >
                    <img src="/assets/icons/gift-icon.png" alt="Награды" />
                    {/* Индикатор можно добавить и как отдельный элемент, если CSS псевдоэлемент не подходит */}
                    {/* {hasClaimableRewardsIndicator && <div className="notification-dot"></div>} */}
                </button>
                 {/* КОНЕЦ ИЗМЕНЕНИЯ ИЗ КОД1 */}
                <button className="main-menu-button icon-button daily-grind-button" onClick={handleDailyGrindClick}><img src="/assets/icons/daily-grind-icon.png" alt="Daily Grind" /></button>
            </div>

            <div className="main-menu-right-column">
                <button className="main-menu-button icon-button world-map-button" onClick={handleWorldMapClick}><img src="/assets/icons/map-icon.png" alt="Карта Мира" /></button>
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
                        onStartLevel={handleStartLevelFromDetails} // Используем существующий обработчик
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
                className="main-menu-button reset-progress-button" // Новый класс для стилизации
                onClick={handleFullResetClick}
                title="Сбросить весь игровой прогресс"
            >
                Сброс
            </button>
        </motion.div>
    );
};

export default MainMenu;