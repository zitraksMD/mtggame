// src/components/ZoneMap.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../store/useGameStore';
import './ZoneMap.scss';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const ZONE_MAP_BACKGROUND_WIDTH = 1800;
const ZONE_MAP_BACKGROUND_HEIGHT = 1000;
const CHAPTER_ISLAND_WIDTH = 180; // Ширина контейнера острова из Код1
const CHAPTER_ISLAND_HEIGHT = 130; // Высота контейнера острова из Код1

const DEFAULT_MAP_ZOOM = 0.7;
const FOCUS_CHAPTER_ZOOM = 1.2;

const ZoneMap = ({
    zoneId,
    currentChapterId,    // Для подсветки текущей активной главы игрока (из Код1)
    chapterToFocus,      // Для анимации приближения при первом показе этой зоны/карты (из Код1)
    chaptersInZoneProp,  // Массив глав, передаваемый из MainMenu (из Код1)
    goToChapter,
    onGoToGlobalMap,
    goBack
}) => {
    const mapContainerRef = useRef(null);
    const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
    const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);
    const [isAnimatingFocus, setIsAnimatingFocus] = useState(false);
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const mapStart = useRef({ x: 0, y: 0 });

    const [chaptersToDisplay, setChaptersToDisplay] = useState([]);
    // isLoadingChapters теперь определяется начальным отсутствием chaptersInZoneProp или активной загрузкой
    const [isLoadingChapters, setIsLoadingChapters] = useState(true); // Изначально true

    const { isChapterCompleted } = useGameStore(state => ({
        isChapterCompleted: state.isChapterCompleted,
    }));

    // Логика загрузки глав: приоритет chaptersInZoneProp, затем fallback на динамический импорт
    useEffect(() => {
        let chaptersSource = [];
        let shouldLoadDynamically = false;

        if (chaptersInZoneProp && chaptersInZoneProp.length > 0) {
            chaptersSource = chaptersInZoneProp;
            // console.log("ZoneMap Data Effect: Using chaptersInZoneProp.");
        } else if (chaptersInZoneProp && chaptersInZoneProp.length === 0) {
            // Prop передан, но пуст (например, зона без глав)
            chaptersSource = [];
            // console.log("ZoneMap Data Effect: chaptersInZoneProp is empty.");
        } else if (zoneId) {
            // chaptersInZoneProp не передан, будем грузить динамически
            shouldLoadDynamically = true;
            // console.log(`ZoneMap Data Effect: zoneId ${zoneId} present, chaptersInZoneProp MISSING. Will load dynamically.`);
        } else {
            // Нет ни prop, ни zoneId
            // console.log("ZoneMap Data Effect: No zoneId and no chaptersInZoneProp.");
            setIsLoadingChapters(false);
            setChaptersToDisplay([]);
            return;
        }

        if (shouldLoadDynamically) {
            setIsLoadingChapters(true); // Устанавливаем загрузку перед импортом
            import(`../data/zones/${zoneId}/zoneData.js`)
                .then(module => {
                    const loadedChapters = module.chaptersInZone || [];
                    // console.log(`ZoneMap Data Effect: Successfully loaded dynamic chapters for zone ${zoneId}:`, loadedChapters);
                    // СОРТИРОВКА ЗДЕСЬ
                    const sortedChapters = [...loadedChapters].sort((a, b) => a.chapterId - b.chapterId);
                    setChaptersToDisplay(sortedChapters);
                })
                .catch(err => {
                    console.error(`ZoneMap: Failed to load chapters for zone ${zoneId}:`, err);
                    setChaptersToDisplay([]); // Очищаем в случае ошибки
                })
                .finally(() => {
                    setIsLoadingChapters(false);
                    // console.log(`ZoneMap Data Effect: Finished dynamic loading for zone ${zoneId}. Loading false.`);
                });
        } else {
            // Используем chaptersSource (из chaptersInZoneProp)
            // СОРТИРОВКА ЗДЕСЬ
            const sortedChapters = [...chaptersSource].sort((a, b) => a.chapterId - b.chapterId);
            setChaptersToDisplay(sortedChapters);
            setIsLoadingChapters(false); // Данные уже есть или пустой массив
            // console.log("ZoneMap Data Effect: Processed chaptersSource. Loading false.");
        }

    }, [zoneId, chaptersInZoneProp]); // chaptersInZoneProp в зависимостях

    const getMapActualDimensions = useCallback(() => ({
        width: ZONE_MAP_BACKGROUND_WIDTH,
        height: ZONE_MAP_BACKGROUND_HEIGHT
    }), []);

    const calculateDragBoundaries = useCallback((contentScaledSize, containerSize) => {
        if (contentScaledSize <= containerSize) {
            const centeredPosition = (containerSize - contentScaledSize) / 2;
            return { minPos: centeredPosition, maxPos: centeredPosition, allowDrag: false };
        } else {
            return { minPos: containerSize - contentScaledSize, maxPos: 0, allowDrag: true };
        }
    }, []);

    // Анимация приближения к chapterToFocus (логика из Код1, адаптированная под chaptersToDisplay)
    useEffect(() => {
        const container = mapContainerRef.current;
        // console.log("ZoneMap Focus Effect: isLoading:", isLoadingChapters, "chaptersToDisplay:", chaptersToDisplay.length, "chapterToFocus:", chapterToFocus);

        if (!container || isLoadingChapters) {
            // console.log("ZoneMap Focus Effect: Exiting - no container or still loading.");
            return;
        }
        
        let targetX, targetY, targetZoom;

        if (chaptersToDisplay.length > 0 && chapterToFocus) {
            const chapterDataToFocusOn = chaptersToDisplay.find(ch => ch.chapterId === chapterToFocus);
            // console.log("ZoneMap Focus Effect: Found chapter to focus on:", chapterDataToFocusOn);

            if (chapterDataToFocusOn && chapterDataToFocusOn.displayCoordinates) {
                setIsAnimatingFocus(true);
                targetZoom = FOCUS_CHAPTER_ZOOM;
                targetX = container.offsetWidth / 2 - (chapterDataToFocusOn.displayCoordinates.x + CHAPTER_ISLAND_WIDTH / 2) * targetZoom;
                targetY = container.offsetHeight / 2 - (chapterDataToFocusOn.displayCoordinates.y + CHAPTER_ISLAND_HEIGHT / 2) * targetZoom;
                // console.log("ZoneMap Focus Effect: Focusing on chapter. Target Zoom:", targetZoom, "TargetX:", targetX, "TargetY:", targetY);
            } else {
                // Глава для фокуса не найдена или нет координат, центрируем карту
                targetZoom = DEFAULT_MAP_ZOOM;
                targetX = (container.offsetWidth - ZONE_MAP_BACKGROUND_WIDTH * targetZoom) / 2;
                targetY = (container.offsetHeight - ZONE_MAP_BACKGROUND_HEIGHT * targetZoom) / 2;
                if (isAnimatingFocus) setIsAnimatingFocus(false); // Сброс, если фокус не удался или не нужен
                // console.log("ZoneMap Focus Effect: Chapter to focus not found or no coords. Defaulting. Target Zoom:", targetZoom, "TargetX:", targetX, "TargetY:", targetY);
            }
        } else {
            // Нет глав для отображения или нет chapterToFocus, просто центрируем карту с дефолтным зумом
            targetZoom = DEFAULT_MAP_ZOOM;
            targetX = (container.offsetWidth - ZONE_MAP_BACKGROUND_WIDTH * targetZoom) / 2;
            targetY = (container.offsetHeight - ZONE_MAP_BACKGROUND_HEIGHT * targetZoom) / 2;
            if (isAnimatingFocus) setIsAnimatingFocus(false);
            // console.log("ZoneMap Focus Effect: No chapters or no chapterToFocus. Defaulting. Target Zoom:", targetZoom, "TargetX:", targetX, "TargetY:", targetY);
        }

        const { width: mapActualWidth, height: mapActualHeight } = getMapActualDimensions(); // Используем getMapActualDimensions
        const scaledMapWidth = mapActualWidth * targetZoom;
        const scaledMapHeight = mapActualHeight * targetZoom;
        const xBounds = calculateDragBoundaries(scaledMapWidth, container.offsetWidth);
        const yBounds = calculateDragBoundaries(scaledMapHeight, container.offsetHeight);

        const clampedTargetX = xBounds.allowDrag ? clamp(targetX, xBounds.minPos, xBounds.maxPos) : xBounds.minPos;
        const clampedTargetY = yBounds.allowDrag ? clamp(targetY, yBounds.minPos, yBounds.maxPos) : yBounds.minPos;
        
        // Установка позиции и зума будет анимирована через motion.div props
        // Если есть анимация фокуса, isAnimatingFocus уже true, и onAnimationComplete её сбросит
        // Если нет (например, chapterToFocus не найден), то isAnimatingFocus либо не был true, либо сброшен выше
        // Прямая установка здесь (setMapPosition, setMapZoom) нужна, чтобы motion.div знал, куда анимироваться
        setMapPosition({ x: clampedTargetX, y: clampedTargetY });
        setMapZoom(targetZoom);
        // console.log("ZoneMap Focus Effect: Final map position and zoom set for animation:", { x: clampedTargetX, y: clampedTargetY }, targetZoom);

    // Зависимости: chaptersToDisplay (вместо chaptersInZoneProp из Код1), chapterToFocus, isLoadingChapters, zoneId (для сброса/перефокусировки при смене зоны).
    // getMapActualDimensions и calculateDragBoundaries - стабильны, но если бы они зависели от пропсов/стейта, их тоже нужно было бы включить.
    }, [chaptersToDisplay, chapterToFocus, isLoadingChapters, zoneId, getMapActualDimensions, calculateDragBoundaries, mapContainerRef]);


    const updatePositionAfterDrag = useCallback((dx, dy) => {
        const container = mapContainerRef.current;
        if (!container || isAnimatingFocus) return;

        const { width: mapActualWidth, height: mapActualHeight } = getMapActualDimensions();
        const scaledMapWidth = mapActualWidth * mapZoom;
        const scaledMapHeight = mapActualHeight * mapZoom;
        const xBounds = calculateDragBoundaries(scaledMapWidth, container.offsetWidth);
        const yBounds = calculateDragBoundaries(scaledMapHeight, container.offsetHeight);

        let targetX = mapStart.current.x + dx;
        let targetY = mapStart.current.y + dy;

        const finalX = xBounds.allowDrag ? clamp(targetX, xBounds.minPos, xBounds.maxPos) : xBounds.minPos;
        const finalY = yBounds.allowDrag ? clamp(targetY, yBounds.minPos, yBounds.maxPos) : yBounds.minPos;
        
        setMapPosition({ x: finalX, y: finalY });
    }, [mapZoom, isAnimatingFocus, getMapActualDimensions, calculateDragBoundaries]);

    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0 || isAnimatingFocus) return;
        const container = mapContainerRef.current;
        if (!container) return;

        const { width: mapActualWidth, height: mapActualHeight } = getMapActualDimensions();
        const scaledMapWidth = mapActualWidth * mapZoom;
        const scaledMapHeight = mapActualHeight * mapZoom;
        const xBounds = calculateDragBoundaries(scaledMapWidth, container.offsetWidth);
        const yBounds = calculateDragBoundaries(scaledMapHeight, container.offsetHeight);
        if (!xBounds.allowDrag && !yBounds.allowDrag && scaledMapWidth <= container.offsetWidth && scaledMapHeight <= container.offsetHeight) {
            return; 
        }
        setDragging(true); // Устанавливаем dragging сразу, как в Код1
        dragStart.current = { x: e.clientX, y: e.clientY };
        mapStart.current = { ...mapPosition };
        e.preventDefault();
    }, [isAnimatingFocus, mapZoom, mapPosition, getMapActualDimensions, calculateDragBoundaries]);

    const handleMouseMoveGlobal = useCallback((e) => {
        if (!dragging || isAnimatingFocus) return;
        updatePositionAfterDrag(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
    }, [dragging, isAnimatingFocus, updatePositionAfterDrag]);
    
    const handleTouchStart = useCallback((e) => {
        if (isAnimatingFocus) return;
        const container = mapContainerRef.current;
        if (!container) return;

        const { width: mapActualWidth, height: mapActualHeight } = getMapActualDimensions();
        const scaledMapWidth = mapActualWidth * mapZoom;
        const scaledMapHeight = mapActualHeight * mapZoom;
        const xBounds = calculateDragBoundaries(scaledMapWidth, container.offsetWidth);
        const yBounds = calculateDragBoundaries(scaledMapHeight, container.offsetHeight);
        if (!xBounds.allowDrag && !yBounds.allowDrag && scaledMapWidth <= container.offsetWidth && scaledMapHeight <= container.offsetHeight) {
            return;
        }
        setDragging(true); // Устанавливаем dragging сразу
        dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        mapStart.current = { ...mapPosition };
        // e.preventDefault(); // Оставляем закомментированным, как в Код2, т.к. может мешать кликам
    }, [isAnimatingFocus, mapZoom, mapPosition, getMapActualDimensions, calculateDragBoundaries]);

    const handleTouchMoveGlobal = useCallback((e) => {
        if (!dragging || isAnimatingFocus) return;
        if (e.cancelable) e.preventDefault();
        updatePositionAfterDrag(e.touches[0].clientX - dragStart.current.x, e.touches[0].clientY - dragStart.current.y);
    }, [dragging, isAnimatingFocus, updatePositionAfterDrag]);

    const stopDrag = useCallback(() => {
        // setTimeout из Код2 для разделения drag и click
        setTimeout(() => {
            if (dragging) { 
                setDragging(false);
            }
        }, 0);
    }, [dragging]);


    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', handleMouseMoveGlobal);
            window.addEventListener('mouseup', stopDrag);
            window.addEventListener('mouseleave', stopDrag);
            window.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false });
            window.addEventListener('touchend', stopDrag);
            window.addEventListener('touchcancel', stopDrag);
        } else {
            window.removeEventListener('mousemove', handleMouseMoveGlobal);
            window.removeEventListener('mouseup', stopDrag);
            window.removeEventListener('mouseleave', stopDrag);
            window.removeEventListener('touchmove', handleTouchMoveGlobal);
            window.removeEventListener('touchend', stopDrag);
            window.removeEventListener('touchcancel', stopDrag);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMoveGlobal);
            window.removeEventListener('mouseup', stopDrag);
            window.removeEventListener('mouseleave', stopDrag);
            window.removeEventListener('touchmove', handleTouchMoveGlobal);
            window.removeEventListener('touchend', stopDrag);
            window.removeEventListener('touchcancel', stopDrag);
        };
    }, [dragging, handleMouseMoveGlobal, stopDrag, handleTouchMoveGlobal]);

    // handleChapterClick из Код1, адаптированный под chaptersToDisplay
    const handleChapterClick = useCallback((chapter) => {
        // console.log(`ZoneMap Chapter Click: dragging: ${dragging}, isAnimatingFocus: ${isAnimatingFocus}, chapter:`, chapter);
        if (isAnimatingFocus || dragging || !chapter || !chapter.data || chaptersToDisplay.length === 0) return;

        const chapterIndex = chaptersToDisplay.findIndex(c => c.chapterId === chapter.chapterId);
        let isActuallyUnlocked = false;
        let reasonForLock = "Глава не найдена в списке отображаемых глав.";

        if (chapterIndex === -1) {
             console.warn(`ZoneMap: Clicked chapter ${chapter.chapterId} not found in chaptersToDisplay.`);
        } else if (chapterIndex === 0) {
            isActuallyUnlocked = true;
            reasonForLock = "Первая глава зоны, всегда доступна.";
        } else if (chapterIndex > 0) {
            const prevChapter = chaptersToDisplay[chapterIndex - 1];
            if (prevChapter && prevChapter.data && Array.isArray(prevChapter.data.levels)) {
                isActuallyUnlocked = isChapterCompleted(prevChapter.chapterId, prevChapter.data.levels);
                reasonForLock = isActuallyUnlocked ? "Предыдущая глава пройдена." : `Предыдущая глава "${prevChapter.nameOnMap || prevChapter.chapterId}" не пройдена.`;
            } else {
                 reasonForLock = `Нет данных или уровней по предыдущей главе "${prevChapter?.nameOnMap || prevChapter?.chapterId}".`;
            }
        }
        
        // console.log(`ZoneMap: Глава ${chapter.chapterId} - isActuallyUnlocked: ${isActuallyUnlocked}. Причина: ${reasonForLock}`);
    
        if (!isActuallyUnlocked) {
            alert(`Глава "${chapter.nameOnMap || chapter.chapterId}" пока заблокирована. \nПричина: ${reasonForLock}`);
            return;
        }
    
        if (typeof goToChapter === 'function') {
            // console.log(`ZoneMap: Вызов goToChapter с ID ${chapter.chapterId}`);
            goToChapter(chapter.chapterId);
        } else {
            console.error("ZoneMap: goToChapter prop is not a function!");
        }
    }, [isAnimatingFocus, dragging, chaptersToDisplay, goToChapter, isChapterCompleted]);
    
    // handleAnimationComplete из Код1 (идентично Код2)
    const handleAnimationComplete = () => {
        // console.log("ZoneMap: Animation complete. isAnimatingFocus was:", isAnimatingFocus);
        if(isAnimatingFocus) {
            setIsAnimatingFocus(false);
        }
    };

    // Условие загрузки из Код1, адаптированное: показываем, если isLoadingChapters true
    // (что означает либо chaptersInZoneProp еще не пришел/пуст ИЛИ идет динамическая загрузка)
    if (isLoadingChapters) {
         // console.log("ZoneMap: Rendering loading state.");
        return <div className="loading-zone-map">Загрузка карты зоны {zoneId ? `для ${zoneId}` : ''}...</div>;
    }
    
    // console.log("ZoneMap: Rendering map. Chapters:", chaptersToDisplay.length);

    return (
        <div className="zone-map-screen">
            <div className="zone-map-header"> {/* Заголовок из Код2 */}
                <h1>{`Карта Зоны ${zoneId || ''}`}</h1>
                {typeof goBack === 'function' && (
                    <button onClick={goBack} className="map-back-button" title="К Главе">
                        &#x21A9; {/* Назад */}
                    </button>
                )}
            </div>

            <div
                className="zone-map-viewport"
                ref={mapContainerRef}
                onMouseDown={handleMouseDown} 
                onTouchStart={handleTouchStart} 
            >
                <motion.div
                    className="zone-map-background"
                    style={{
                        width: `${ZONE_MAP_BACKGROUND_WIDTH}px`,
                        height: `${ZONE_MAP_BACKGROUND_HEIGHT}px`,
                        // backgroundImage: zoneId ? `url(/assets/zones/${zoneId}/zone_background.jpg)` : 'none', // Пример фона зоны
                        cursor: dragging ? 'grabbing' : (isAnimatingFocus ? 'default' : 'grab'),
                        userSelect: dragging ? 'none' : 'auto', // userSelect из Код2
                    }}
                    animate={{ x: mapPosition.x, y: mapPosition.y, scale: mapZoom }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }} // Параметры анимации из Код1
                    onAnimationComplete={handleAnimationComplete} // Для сброса isAnimatingFocus из Код1
                >
                    {(chaptersToDisplay || []).map((chapter) => { // <-- НАЧАЛО map функции
        // -----------------------------------------------------------------
        // Начало твоей существующей логики для определения статуса главы
        // -----------------------------------------------------------------
        if (!chapter || !chapter.data || !chapter.displayCoordinates) {
            console.warn("ZoneMap: Chapter data or displayCoordinates incomplete, skipping render:", chapter?.chapterId);
            return null;
        }
        const isCurrent = chapter.chapterId === currentChapterId; // currentChapterId из пропсов ZoneMap
        
        let statusClass = 'locked';
        const chapterIndex = chaptersToDisplay.findIndex(c => c.chapterId === chapter.chapterId);
        
        // Используем isUnlockedForDisplayLogic, как ты предложил для лога
        let isUnlockedForDisplayLogic = false; 
        let prevChapterIdForLog = 'N/A';
        let prevChapterWasActuallyCompleted = 'N/A'; // Важно инициализировать

        if (chapterIndex === 0) {
            isUnlockedForDisplayLogic = true;
        } else if (chapterIndex > 0) {
            const prevCh = chaptersToDisplay[chapterIndex - 1];
            prevChapterIdForLog = prevCh?.chapterId; // Для лога
            if (prevCh && prevCh.data && Array.isArray(prevCh.data.levels)) {
                 // Проверяем, есть ли уровни, прежде чем вызывать isChapterCompleted,
                 // или как isChapterCompleted обрабатывает пустой массив уровней.
                if (prevCh.data.levels.length > 0) {
                    prevChapterWasActuallyCompleted = isChapterCompleted(prevCh.chapterId, prevCh.data.levels);
                    isUnlockedForDisplayLogic = prevChapterWasActuallyCompleted;
                } else {
                    // Если у предыдущей главы нет уровней, считать ли ее пройденной?
                    // Для разблокировки следующей, обычно да.
                    prevChapterWasActuallyCompleted = true; // Предположение, уточни, если логика другая
                    isUnlockedForDisplayLogic = true;
                }
            } else {
                // Если нет данных о предыдущей главе, считаем ее не пройденной
                prevChapterWasActuallyCompleted = false;
                isUnlockedForDisplayLogic = false;
            }
        }

        let currentChapterIsActuallyCompleted = false; // Для статуса 'completed'
        if (isUnlockedForDisplayLogic && chapter.data && Array.isArray(chapter.data.levels)) {
            // Проверяем на completed только если глава вообще разблокирована
            currentChapterIsActuallyCompleted = isChapterCompleted(chapter.chapterId, chapter.data.levels);
        }

        if (isUnlockedForDisplayLogic) {
            statusClass = currentChapterIsActuallyCompleted ? 'completed' : 'unlocked';
        }
        // Если isUnlockedForDisplayLogic остался false, statusClass будет 'locked'

        if (isCurrent && !isAnimatingFocus && statusClass !== 'locked') {
             statusClass += ' current-chapter-on-zone';
        }
        // -----------------------------------------------------------------
        // Конец твоей существующей логики для определения статуса главы
        // -----------------------------------------------------------------

        // ++++++++++++++++ ВОТ СЮДА ВСТАВЛЯЕМ БЛОК ЛОГИРОВАНИЯ ++++++++++++++++
        console.log(
            `>>> ZoneMap Chapter Processing:
            ID: ${chapter.chapterId}, Name: ${chapter.nameOnMap || 'N/A'}, Index: ${chapterIndex}
            Prev Chapter ID: ${prevChapterIdForLog}, Prev Chapter Completed: ${String(prevChapterWasActuallyCompleted)}
            isUnlockedForDisplayLogic (должна ли быть доступна): ${isUnlockedForDisplayLogic}
            Current Chapter Actually Completed (для статуса 'completed'): ${currentChapterIsActuallyCompleted}
            Is Player's Current Active Chapter: ${isCurrent}
            Final statusClass: "${statusClass}"`
        );
        // Дополнительные отладочные логи, если первая глава не разблокируется:
        if (chapterIndex === 0 && !isUnlockedForDisplayLogic) {
            console.error(`ERROR ZoneMap: First chapter (ID: ${chapter.chapterId}) has index 0 BUT isUnlockedForDisplayLogic is FALSE!`);
        }
        if (chapterIndex === 0 && statusClass.includes('locked')) {
             console.error(`ERROR ZoneMap: First chapter (ID: ${chapter.chapterId}) has index 0 BUT statusClass is "${statusClass}" (includes 'locked')!`);
        }
        // ++++++++++++++++++++++++ КОНЕЦ БЛОКА ЛОГИРОВАНИЯ ++++++++++++++++++++++++

        const imagePath = chapter.data?.image || chapter.data?.mapImage;

                        return (
                            <div
                                key={chapter.chapterId}
                                className={`chapter-island ${statusClass}`}
                                style={{
                                    position: 'absolute',
                                    top: `${chapter.displayCoordinates.y}px`,
                                    left: `${chapter.displayCoordinates.x}px`,
                                    width: `${CHAPTER_ISLAND_WIDTH}px`,
                                    height: `${CHAPTER_ISLAND_HEIGHT}px`,
                                    backgroundImage: imagePath ? `url(${imagePath})` : `url(/assets/default_island_placeholder.png)`, // Фон из Код1
                                    backgroundSize: 'cover', 
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    // Стили для отображения текста и общего вида из Код1
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end', // Текст внизу
                                    padding: '5px',
                                    boxSizing: 'border-box',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                }}
                                // Проверка !dragging перед кликом из Код1
                                onClick={(e) => { if (!dragging) handleChapterClick(chapter);}}
                                title={chapter.nameOnMap || `Глава ${chapter.chapterId}`}
                            >
                                <span className="island-label">{chapter.nameOnMap || `Глава ${chapter.chapterId}`}</span>
                                {statusClass === 'locked' && <div className="island-lock-icon">🔒</div>}
                                </div>
                        );
                    })}
                </motion.div>
            </div>

            <div className="zone-map-controls"> {/* Контролы из Код2 */}
                {onGoToGlobalMap && (
                    <button
                        className="map-action-button go-to-global-map-button"
                        onClick={onGoToGlobalMap}
                    >
                        Карта Земли
                    </button>
                )}
            </div>
        </div>
    );
};

export default ZoneMap;