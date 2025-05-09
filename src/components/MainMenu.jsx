// src/components/MainMenu.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion'; // <<< ИМПОРТИРУЕМ AnimatePresence
import useGameStore from "../store/useGameStore";
import WorldMap from "./WorldMap";
import Popup from './Popup';
import "./MainMenu.scss";
import { pageVariants, pageTransition } from '../animations';
import { useNavigate } from 'react-router-dom';
import LevelDetailsPopup from './LevelDetailsPopup';

const INITIAL_CHAPTER_ID = 1;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const MainMenu = ({ onStart }) => {
    const navigate = useNavigate();

    const [showMap, setShowMap] = useState(false);
    const [selectedLevelId, setSelectedLevelId] = useState(null);
    const [showLevelPopup, setShowLevelPopup] = useState(false); // Используется для LevelDetailsPopup
    const [isLoadingLevel, setIsLoadingLevel] = useState(false);
    const [currentChapterId, setCurrentChapterId] = useState(INITIAL_CHAPTER_ID);
    const [chapterData, setChapterData] = useState(null);
    const [isLoadingChapter, setIsLoadingChapter] = useState(true);
    const [activePopup, setActivePopup] = useState(null);

    const mapContainerRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const mapStart = useRef({ x: 0, y: 0 });
    const hasStarted = useRef(false);

    // <<< ДОБАВЛЯЕМ REF ДЛЯ LevelDetailsPopup из код1 >>>
    const levelDetailsPopupRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        const loadChapter = async (id) => {
            if (!isMounted) return;
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
                    alert(`Ошибка загрузки данных Главы ${id}. Проверьте путь и файл. Загружаем Главу 1.`);
                    if (id !== 1) { setCurrentChapterId(1); }
                    else { setIsLoadingChapter(false); setChapterData(null); }
                }
            } finally {
                if (isMounted && currentChapterId === id) { setIsLoadingChapter(false); }
            }
        };
        loadChapter(currentChapterId);
        return () => { isMounted = false; };
    }, [currentChapterId]);

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

    // <<< Функция открытия попапа деталей уровня (аналог handleOpenLevelDetails из код1) >>>
    const handleLevelNodeClick = useCallback((levelUniqueId, e) => {
        e.stopPropagation();
        // TODO: Добавить проверку, доступен ли уровень
        const levelData = chapterData?.levels?.find(l => l.id === levelUniqueId);
        if (levelData) {
            setSelectedLevelId(levelUniqueId); // Или можно setSelectedLevelForDetails(levelData) если нужно хранить весь объект
            setShowLevelPopup(true);
        } else {
            console.warn(`Level data not found for ID: ${levelUniqueId}`);
        }
    }, [chapterData]);

    // <<< Функция закрытия попапа деталей уровня (аналог handleCloseLevelDetails из код1) >>>
    const handleCloseLevelPopup = useCallback(() => {
        setShowLevelPopup(false);
        // Поведение из код1: небольшая задержка перед сбросом selectedLevelForDetails
        // Для AnimatePresence, обычно данные не нужно сбрасывать с задержкой,
        // так как компонент будет анимированно исчезать с текущими props.
        // Но если LevelDetailsPopup зависит от selectedLevelId для своей exit-анимации,
        // и selectedLevelId сбрасывается мгновенно, это может вызвать проблемы.
        // Если анимация выхода не зависит от `level` prop или корректно обрабатывает его изменение на null/undefined,
        // то задержка не нужна.
        // Оставляем мгновенный сброс, как в оригинальном код2.
        // При необходимости можно добавить setTimeout:
        // setTimeout(() => setSelectedLevelId(null), 300);
        setSelectedLevelId(null);
    }, []);

    // <<< Функция старта уровня из попапа деталей (аналог handleStartLevelFromDetails из код1) >>>
    const handleStartLevelFromDetails = useCallback((levelId, difficulty) => {
        console.log(`[MainMenu] Starting level ${levelId} with difficulty ${difficulty} from details popup`);
        if (!hasStarted.current && chapterData) {
            hasStarted.current = true;
            setIsLoadingLevel(true);
            // Закрываем попап перед стартом или после? Код1 закрывает после.
            // Код2 (старая версия попапа) вызывал onStart и неявно попап исчезал.
            // Логично закрыть попап.
            setShowLevelPopup(false); // Закрываем попап
            // setSelectedLevelId(null); // Опционально сбросить здесь или в handleCloseLevelPopup

            onStart(chapterData.id, levelId, difficulty); // Передаем onStart из App.jsx
        }
    }, [chapterData, onStart]);


    const handleGoToChapter = useCallback((chapterStub) => {
        console.log("[MainMenu] Switching to chapter ID:", chapterStub.id);
        if (chapterStub.id !== currentChapterId) {
            setCurrentChapterId(chapterStub.id);
        }
        setShowMap(false);
    }, [currentChapterId]);

    const handleBattlePassClick = useCallback(() => {
        console.log("Battle Pass clicked - likely navigates to a new screen, not a popup");
    }, []);
    const handleMailClick = useCallback(() => setActivePopup('mail'), []);
    const handleRewardsChestClick = useCallback(() => {
        console.log("Navigating to Rewards Screen...");
        navigate('/rewards');
    }, [navigate]);
    const handleDailyGrindClick = useCallback(() => setActivePopup('hunting'), []);
    const handleQuestsClick = useCallback(() => setActivePopup('tasks'), []);
    const handleExchangeClick = useCallback(() => setActivePopup('exchange'), []);
    const handleWorldMapClick = useCallback(() => setShowMap(true), []);
    const closePopup = useCallback(() => setActivePopup(null), []);
    const handleResetClick = useCallback(() => { if (window.confirm('Сбросить все данные?')) { localStorage.clear(); window.location.reload(); } }, []);

    const getPopupContent = (popupType) => {
        switch (popupType) {
            case 'mail': return (<><p>Писем нет.</p><p>Здесь будут отображаться входящие сообщения и награды.</p></>);
            case 'hunting': return (<><p>Энергия для охоты: 10/10</p><p>Выберите зону для охоты.</p></>);
            case 'tasks': return (<><p>Ежедневные задачи:</p><ul><li>Пройти 3 уровня (0/3)</li><li>Потратить 50 энергии (15/50)</li></ul></>);
            case 'exchange': return (<><p>Обмен осколков Toncoin:</p><p>Ваш баланс: 150 осколков</p><input type="number" placeholder="Количество" /><button style={{ marginLeft: '10px' }}>Обменять</button></>);
            default: return null;
        }
    };

    const getPopupTitle = (popupType) => {
        switch (popupType) {
            case 'mail': return 'Почта';
            case 'hunting': return 'Ежедневная Охота';
            case 'tasks': return 'Задачи';
            case 'exchange': return 'Обмен Валют';
            default: return 'Окно';
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
                    <div className="loading-text">Загрузка главы {currentChapterId}...</div>
                </div>
            </motion.div>
        );
    }

    // <<< Получаем данные для LevelDetailsPopup >>>
    const selectedLevelData = chapterData.levels?.find(l => l.id === selectedLevelId);

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
                            return ( <path key={`path-${level.id}-to-${nextLevel.id}`} d={d} className="level-connection-path" /> );
                        })}
                    </svg>
                    {chapterData.levels?.map((level) => {
                        const isCompleted = false;
                        const isActive = true;
                        const levelStatusClass = isCompleted ? 'completed' : (isActive ? 'active' : 'locked');
                        const levelNumberInChapter = level.id % 100;
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
                </div>
            </div>

            <h2 className="chapter-name">{chapterData.name}</h2>
            <button className="main-menu-button battle-pass-button" onClick={handleBattlePassClick}>BattlePass</button>

            <div className="main-menu-left-column">
                <button className="main-menu-button icon-button mail-button" onClick={handleMailClick}><img src="/assets/icons/mail-icon.png" alt="Почта" /></button>
                <button className="main-menu-button icon-button rewards-chest-button" onClick={handleRewardsChestClick}><img src="/assets/icons/gift-icon.png" alt="Награды" /></button>
                <button className="main-menu-button icon-button daily-grind-button" onClick={handleDailyGrindClick}><img src="/assets/icons/daily-grind-icon.png" alt="Daily Grind" /></button>
            </div>

            <div className="main-menu-right-column">
                <button className="main-menu-button icon-button world-map-button" onClick={handleWorldMapClick}><img src="/assets/icons/map-icon.png" alt="Карта Мира" /></button>
                <button className="main-menu-button icon-button quests-button" onClick={handleQuestsClick}><img src="/assets/icons/quests-icon.png" alt="Задания" /></button>
                <button className="main-menu-button icon-button exchange-button" onClick={handleExchangeClick}><img src="/assets/icons/exchange-icon.png" alt="Обмен" /></button>
            </div>

            {/* <<< ИСПОЛЬЗУЕМ AnimatePresence ДЛЯ LevelDetailsPopup КАК В код1 >>> */}
            <AnimatePresence>
                {showLevelPopup && selectedLevelData && (
                    <LevelDetailsPopup
                        key="levelDetailsPopup" // Ключ важен для AnimatePresence
                        ref={levelDetailsPopupRef} // Передаем ref (Убедитесь, что LevelDetailsPopup использует forwardRef, если это необходимо)
                        level={selectedLevelData}
                        chapterId={chapterData.id}
                        onClose={handleCloseLevelPopup}
                        onStartLevel={handleStartLevelFromDetails} // Используем новый обработчик
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
        </motion.div>
    );
};

export default MainMenu;