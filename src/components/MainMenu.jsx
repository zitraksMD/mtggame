// src/components/MainMenu.jsx
import React, { useRef, useState, useEffect, useCallback } from "react"; // Добавили useCallback
import { motion } from 'framer-motion';
import useGameStore from "../store/useGameStore"; // Может понадобиться для прогресса
import WorldMap from "./WorldMap"; // Компонент карты мира
import "./MainMenu.scss"; // Подключаем стили
import { pageVariants, pageTransition } from '../animations'; // Анимации

// ID главы по умолчанию (или из последнего сохранения)
const INITIAL_CHAPTER_ID = 1;

// Вспомогательная функция clamp
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

// --- Основной компонент Главного Меню ---
const MainMenu = ({ onStart }) => { // onStart - функция из App.jsx

    // --- Состояния Компонента ---
    const [showMap, setShowMap] = useState(false);
    const [selectedLevelId, setSelectedLevelId] = useState(null); // УНИКАЛЬНЫЙ ID выбранного уровня (101, 102...)
    const [showLevelPopup, setShowLevelPopup] = useState(false);
    const [isLoadingLevel, setIsLoadingLevel] = useState(false); // Идет ЗАПУСК уровня в игру?

    const [currentChapterId, setCurrentChapterId] = useState(INITIAL_CHAPTER_ID);
    const [chapterData, setChapterData] = useState(null); // Данные текущей ГЛАВЫ
    const [isLoadingChapter, setIsLoadingChapter] = useState(true); // Идет загрузка ДАННЫХ ГЛАВЫ?

    // Рефы для панорамирования
    const mapContainerRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const mapStart = useRef({ x: 0, y: 0 });

    const hasStarted = useRef(false); // Предотвращение двойного запуска уровня

    // --- Загрузка Данных Главы (для карты меню) ---
    useEffect(() => {
        let isMounted = true;
        const loadChapter = async (id) => {
            if (!isMounted) return;
            console.log(`[MainMenu] Attempting to load CHAPTER data for chapter ${id}...`);
            setIsLoadingChapter(true); setChapterData(null); setPosition({ x: 0, y: 0 });

            try {
                // Динамический импорт файла данных ГЛАВЫ
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
                     if (id !== 1) { setCurrentChapterId(1); return; }
                     else { setIsLoadingChapter(false); setChapterData(null); }
                 }
            } finally {
                if (isMounted && currentChapterId === id) { setIsLoadingChapter(false); }
            }
        };
        loadChapter(currentChapterId);
        return () => { isMounted = false; };
    }, [currentChapterId]);

    // --- Центрирование карты Главы после загрузки ---
    useEffect(() => {
        if (!chapterData || isLoadingChapter || !mapContainerRef.current) return;
        if (typeof chapterData.imageWidth !== 'number' || typeof chapterData.imageHeight !== 'number') return;

        const containerWidth = mapContainerRef.current.offsetWidth; const containerHeight = mapContainerRef.current.offsetHeight;
        const mapWidth = chapterData.imageWidth; const mapHeight = chapterData.imageHeight;
        let initialX = chapterData.initialView?.x ?? clamp(containerWidth / 2 - mapWidth / 2, containerWidth - mapWidth, 0);
        let initialY = chapterData.initialView?.y ?? clamp(containerHeight / 2 - mapHeight / 2, containerHeight - mapHeight, 0);
        setPosition({ x: initialX, y: initialY });
        hasStarted.current = false; setIsLoadingLevel(false);

     }, [chapterData, isLoadingChapter]);

    // --- Логика Перетаскивания Карты Главы ---
    const updatePosition = useCallback((dx, dy) => {
        if (!mapContainerRef.current || !chapterData?.imageWidth || !chapterData?.imageHeight) return;
        const containerWidth = mapContainerRef.current.offsetWidth; const containerHeight = mapContainerRef.current.offsetHeight;
        const mapWidth = chapterData.imageWidth; const mapHeight = chapterData.imageHeight;
        const minX = Math.min(0, containerWidth - mapWidth); const minY = Math.min(0, containerHeight - mapHeight);
        const newX = clamp(mapStart.current.x + dx, minX, 0); const newY = clamp(mapStart.current.y + dy, minY, 0);
        setPosition({ x: newX, y: newY });
    }, [chapterData]); // Зависит от chapterData для размеров

    const handleMouseDown = useCallback((e) => { if (e.button !== 0) return; setDragging(true); dragStart.current = { x: e.clientX, y: e.clientY }; mapStart.current = { ...position }; if (e.currentTarget) e.currentTarget.style.cursor = 'grabbing'; }, [position]);
    const handleTouchStart = useCallback((e) => { setDragging(true); dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; mapStart.current = { ...position }; }, [position]);
    const handleMouseMove = useCallback((e) => { if (!dragging) return; updatePosition(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y); }, [dragging, updatePosition]); // Зависит от updatePosition
    const handleTouchMove = useCallback((e) => { if (!dragging) return; updatePosition(e.touches[0].clientX - dragStart.current.x, e.touches[0].clientY - dragStart.current.y); }, [dragging, updatePosition]);
    const stopDrag = useCallback((e) => { if (dragging) { setDragging(false); if (e.currentTarget && e.type === 'mouseup') { e.currentTarget.style.cursor = 'grab'; } } }, [dragging]);

    // --- Другие Обработчики ---
    const handleStartLevel = useCallback(() => {
        if (!hasStarted.current && selectedLevelId && chapterData) {
            console.log(`[MainMenu] Calling onStart for Chapter ${chapterData.id}, Level ${selectedLevelId}`);
            hasStarted.current = true; setIsLoadingLevel(true);
            // Вызываем колбэк из App.jsx
            onStart(chapterData.id, selectedLevelId);
            // Состояние isLoadingLevel сбросится при возврате в MainMenu или смене главы
        }
    }, [selectedLevelId, chapterData, onStart]); // Зависимости

    const handleCloseLevelPopup = useCallback(() => { setShowLevelPopup(false); setSelectedLevelId(null); }, []);

    const handleLevelNodeClick = useCallback((levelUniqueId, e) => {
        e.stopPropagation();
        // TODO: Добавить проверку, доступен ли уровень (например, на основе пройденных уровней из useGameStore)
        // if (!isLevelUnlocked(levelUniqueId)) return;
        setSelectedLevelId(levelUniqueId);
        setShowLevelPopup(true);
    }, []); // Пустой массив зависимостей, если isLevelUnlocked не используется

    const handleGoToChapter = useCallback((chapterStub) => {
        console.log("[MainMenu] Switching to chapter ID:", chapterStub.id);
        if (chapterStub.id !== currentChapterId) { setCurrentChapterId(chapterStub.id); }
        setShowMap(false);
    }, [currentChapterId]);

    // --- Рендер Компонента ---

    // Карта мира
    if (showMap) {
        return ( <WorldMap goBack={() => setShowMap(false)} goToChapter={handleGoToChapter} currentChapterId={currentChapterId} /> );
    }

    // Загрузка данных главы
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

    // Основной рендер карты главы
    return (
        <motion.div className="main-menu" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} >
            {/* Контейнер для просмотра карты */}
            <div className="chapter-view-container" ref={mapContainerRef}>
                {/* Перетаскиваемый контент карты */}
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
                    {/* SVG со связями */}
                    <svg className="chapter-level-svg-connections" width={chapterData.imageWidth} height={chapterData.imageHeight} xmlns="http://www.w3.org/2000/svg">
                        {chapterData.levels?.map((level, i) => {
                            const nextLevel = chapterData.levels[i + 1]; if (!nextLevel) return null;
                            const nodeSize = level.nodeSize || 40; const nextNodeSize = nextLevel.nodeSize || 40;
                            const x1 = level.x + nodeSize / 2; const y1 = level.y + nodeSize / 2;
                            const x2 = nextLevel.x + nextNodeSize / 2; const y2 = nextLevel.y + nextNodeSize / 2;
                            const dx = x2 - x1; const dy = y2 - y1; const midpointX = x1 + dx * 0.5; const midpointY = y1 + dy * 0.5;
                            const curveOffset = 40; const angle = Math.atan2(dy, dx) - Math.PI / 2;
                            const controlX = midpointX + curveOffset * Math.cos(angle); const controlY = midpointY + curveOffset * Math.sin(angle);
                            const d = `M ${x1} ${y1} Q ${controlX} ${controlY}, ${x2} ${y2}`;
                            return ( <path key={`path-${level.id}`} d={d} className="level-connection-path" /> );
                        })}
                    </svg>

                    {/* Узлы уровней */}
                    {chapterData.levels?.map((level) => {
                         // TODO: Получить статус уровня из useGameStore (например, state.levelsCompleted[`c${chapterData.id}_l${level.id}`])
                         const isCompleted = false; // Заглушка
                         const isActive = true; // Заглушка - определить логику доступности
                         const levelStatusClass = isCompleted ? 'completed' : (isActive ? 'active' : 'locked');
                         const levelNumberInChapter = level.id % 100 !== 0 ? level.id % 100 : (level.id / 100) * 10 ; // Пример: 101->1, 110->10, 201->1

                         return (
                            <div
                                key={level.id} // Ключ - уникальный ID
                                className={`level-node ${levelStatusClass}`} // Классы для стилизации статуса
                                style={{
                                    top: `${level.y}px`, left: `${level.x}px`,
                                    width: `${level.nodeSize || 40}px`, height: `${level.nodeSize || 40}px`,
                                }}
                                // Передаем УНИКАЛЬНЫЙ ID в обработчик
                                onClick={(e) => handleLevelNodeClick(level.id, e)}
                            >
                                {levelNumberInChapter} {/* Отображаем порядковый номер */}
                            </div>
                        );
                    })}
                </div> {/* Конец .chapter-map-content */}
            </div> {/* Конец .chapter-view-container */}

             {/* UI Элементы поверх карты */}
             <button className="map-button-floating icon-only" onClick={() => setShowMap(true)}> <img src="/assets/map-icon.png" alt="Карта мира" className="map-icon" /> </button>
             <h2 className="chapter-name">{chapterData.name}</h2>

            {/* Попап Выбора Уровня */}
            {showLevelPopup && selectedLevelId !== null && (
                <div className="level-popup" onClick={handleCloseLevelPopup}>
                   <div className="level-popup-box" onClick={(e) => e.stopPropagation()}>
                      {/* Отображаем имя уровня из данных главы */}
                      <h3>{chapterData.levels?.find(l => l.id === selectedLevelId)?.name || `Уровень ${selectedLevelId}`}</h3>
                       {/* TODO: Добавить инфо и проверку доступности */}
                       <p>Готов начать?</p>
                       <div className="popup-buttons">
                           <button onClick={handleStartLevel} disabled={isLoadingLevel}>В бой!</button>
                           <button onClick={handleCloseLevelPopup} disabled={isLoadingLevel}>Отмена</button>
                       </div>
                   </div>
                </div>
            )}

            {/* Оверлей Загрузки при запуске уровня */}
            {isLoadingLevel && ( <div className="level-loading-overlay"><div className="loading-spinner"></div><div className="loading-text">Загрузка уровня...</div></div> )}

             {/* Кнопка сброса */}
             <button className="reset-button" onClick={() => { if(window.confirm('Сбросить все данные?')){ localStorage.clear(); window.location.reload();} }}> reset </button>
        </motion.div>
    );
};

export default MainMenu;