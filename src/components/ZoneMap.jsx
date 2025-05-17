// src/components/ZoneMap.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../store/useGameStore';
import './ZoneMap.scss';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const ZONE_MAP_BACKGROUND_WIDTH = 1620;
const ZONE_MAP_BACKGROUND_HEIGHT = 850;

const CHAPTER_ISLAND_WIDTH = 220;
const CHAPTER_ISLAND_HEIGHT = 160;

const DEFAULT_MAP_ZOOM = 0.7;
const FOCUS_CHAPTER_ZOOM = 1.2;

const ZoneMap = ({
    zoneId,
    currentChapterId,
    chapterToFocus,
    chaptersInZoneProp, // Этот проп УЖЕ содержит главы, но не информацию о зоне
    goToChapter,
    onGoToGlobalMap,
    isZoneUnlocked, // <--- НОВЫЙ ПРОП: булево значение (true/false)
}) => {
    console.log('ZoneMap received onGoToGlobalMap type:', typeof onGoToGlobalMap, onGoToGlobalMap);
    const mapContainerRef = useRef(null);
    const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
    const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);
    const [isAnimatingFocus, setIsAnimatingFocus] = useState(false);
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const mapStart = useRef({ x: 0, y: 0 });

    const [chaptersToDisplay, setChaptersToDisplay] = useState([]);
    const [isLoadingChapters, setIsLoadingChapters] = useState(true); // Изначально true, пока данные не загружены

    // Новое состояние для информации о зоне (из код1)
    const [currentZoneInfo, setCurrentZoneInfo] = useState(null);

    const { isChapterCompleted } = useGameStore(state => ({
        isChapterCompleted: state.isChapterCompleted,
    }));

    useEffect(() => {
        console.log(`ZoneMap - Current received currentChapterId prop: ${currentChapterId}`);
    }, [currentChapterId]);

    // Логика загрузки глав И ИНФОРМАЦИИ О ЗОНЕ (объединенная логика из код1 и код2)
    useEffect(() => {
        let chaptersSource = [];
        let shouldLoadZoneDataDynamically = false; // Флаг для загрузки всего zoneData.js (из код1)

        if (chaptersInZoneProp && chaptersInZoneProp.length > 0) {
            chaptersSource = chaptersInZoneProp;
            // Если chaptersInZoneProp передан, информация о зоне (zoneInfo) должна приходить
            // ИЗ РОДИТЕЛЬСКОГО КОМПОНЕНТА (MainMenu) вместе с chaptersInZoneProp.
            // Либо, если MainMenu не передает zoneInfo, то ZoneMap всегда будет его грузить.
            // Пока предположим, что ZoneMap сам загрузит zoneInfo, если chaptersInZoneProp не содержит его.
            // Это может быть неоптимально, если MainMenu уже имеет zoneInfo.
            if (zoneId && (!currentZoneInfo || currentZoneInfo.id !== zoneId)) { // Загружаем инфо о зоне, если ее нет или сменился zoneId
                shouldLoadZoneDataDynamically = true;
            }
        } else if (chaptersInZoneProp && chaptersInZoneProp.length === 0) {
            chaptersSource = [];
            if (zoneId && (!currentZoneInfo || currentZoneInfo.id !== zoneId)) {
                shouldLoadZoneDataDynamically = true;
            }
        } else if (zoneId) {
            shouldLoadZoneDataDynamically = true;
        } else {
            setIsLoadingChapters(false);
            setChaptersToDisplay([]);
            setCurrentZoneInfo(null); // Сброс информации о зоне
            return;
        }

        if (shouldLoadZoneDataDynamically) {
            setIsLoadingChapters(true); // Можно использовать один флаг загрузки
            import(`../data/zones/${zoneId}/zoneData.js`)
                .then(module => {
                    const loadedChapters = module.chaptersInZone || [];
                    const sortedChapters = [...loadedChapters].sort((a, b) => a.chapterId - b.chapterId);
                    setChaptersToDisplay(sortedChapters);

                    if (module.zoneInfo) { // Загружаем и сохраняем zoneInfo (из код1)
                        setCurrentZoneInfo(module.zoneInfo);
                    } else {
                        console.warn(`ZoneMap: zoneInfo not found in zoneData.js for zone ${zoneId}`);
                        setCurrentZoneInfo({ id: zoneId, name: zoneId }); // Фолбэк на ID, если имя не найдено (из код1)
                    }
                })
                .catch(err => {
                    console.error(`ZoneMap: Failed to load data for zone ${zoneId}:`, err);
                    setChaptersToDisplay([]);
                    setCurrentZoneInfo({ id: zoneId, name: zoneId }); // Фолбэк (из код1)
                })
                .finally(() => {
                    setIsLoadingChapters(false);
                });
        } else {
            // Используем chaptersSource (из chaptersInZoneProp)
            const sortedChapters = [...chaptersSource].sort((a, b) => a.chapterId - b.chapterId);
            setChaptersToDisplay(sortedChapters);
            // Если chaptersInZoneProp передан, предполагаем, что MainMenu
            // МОГ БЫ передать и zoneInfo. Если нет, и currentZoneInfo не для текущего zoneId,
            // то мы должны были попасть в shouldLoadZoneDataDynamically.
            // Этот блок else теперь только для установки глав, если shouldLoadZoneDataDynamically false.
            if (!currentZoneInfo || currentZoneInfo.id !== zoneId) {
                // Этого не должно произойти, если shouldLoadZoneDataDynamically было false
                // Но на всякий случай - фолбэк.
                // Если MainMenu должен передавать zoneInfo вместе с chaptersInZoneProp,
                // то здесь нужно будет получать это zoneInfo из пропсов.
                // Пока оставим фолбэк, если currentZoneInfo не соответствует.
                setCurrentZoneInfo({ id: zoneId, name: zoneId }); // Фолбэк, если zoneInfo не пришло с chaptersInZoneProp
            }
            setIsLoadingChapters(false);
        }
    // Добавили currentZoneInfo в зависимости (из код1)
    }, [zoneId, chaptersInZoneProp, currentZoneInfo]);

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

    useEffect(() => {
        const container = mapContainerRef.current;
        if (!container || isLoadingChapters || !currentZoneInfo) { // Добавлено !currentZoneInfo для ожидания загрузки данных зоны
            return;
        }
        
        let targetX, targetY, targetZoom;

        if (chaptersToDisplay.length > 0 && chapterToFocus) {
            const chapterDataToFocusOn = chaptersToDisplay.find(ch => ch.chapterId === chapterToFocus);
            if (chapterDataToFocusOn && chapterDataToFocusOn.displayCoordinates) {
                setIsAnimatingFocus(true);
                targetZoom = FOCUS_CHAPTER_ZOOM;
                targetX = container.offsetWidth / 2 - (chapterDataToFocusOn.displayCoordinates.x + CHAPTER_ISLAND_WIDTH / 2) * targetZoom;
                targetY = container.offsetHeight / 2 - (chapterDataToFocusOn.displayCoordinates.y + CHAPTER_ISLAND_HEIGHT / 2) * targetZoom;
            } else {
                targetZoom = DEFAULT_MAP_ZOOM;
                targetX = (container.offsetWidth - ZONE_MAP_BACKGROUND_WIDTH * targetZoom) / 2;
                targetY = (container.offsetHeight - ZONE_MAP_BACKGROUND_HEIGHT * targetZoom) / 2;
                if (isAnimatingFocus) setIsAnimatingFocus(false);
            }
        } else {
            targetZoom = DEFAULT_MAP_ZOOM;
            targetX = (container.offsetWidth - ZONE_MAP_BACKGROUND_WIDTH * targetZoom) / 2;
            targetY = (container.offsetHeight - ZONE_MAP_BACKGROUND_HEIGHT * targetZoom) / 2;
            if (isAnimatingFocus) setIsAnimatingFocus(false);
        }

        const { width: mapActualWidth, height: mapActualHeight } = getMapActualDimensions();
        const scaledMapWidth = mapActualWidth * targetZoom;
        const scaledMapHeight = mapActualHeight * targetZoom;
        const xBounds = calculateDragBoundaries(scaledMapWidth, container.offsetWidth);
        const yBounds = calculateDragBoundaries(scaledMapHeight, container.offsetHeight);

        const clampedTargetX = xBounds.allowDrag ? clamp(targetX, xBounds.minPos, xBounds.maxPos) : xBounds.minPos;
        const clampedTargetY = yBounds.allowDrag ? clamp(targetY, yBounds.minPos, yBounds.maxPos) : yBounds.minPos;
        
        setMapPosition({ x: clampedTargetX, y: clampedTargetY });
        setMapZoom(targetZoom);
    // Добавили currentZoneInfo в зависимости, т.к. его загрузка может влиять на начало анимации
    }, [chaptersToDisplay, chapterToFocus, isLoadingChapters, zoneId, getMapActualDimensions, calculateDragBoundaries, mapContainerRef, currentZoneInfo]);


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
        setDragging(true);
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
        setDragging(true);
        dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        mapStart.current = { ...mapPosition };
    }, [isAnimatingFocus, mapZoom, mapPosition, getMapActualDimensions, calculateDragBoundaries]);

    const handleTouchMoveGlobal = useCallback((e) => {
        if (!dragging || isAnimatingFocus) return;
        if (e.cancelable) e.preventDefault();
        updatePositionAfterDrag(e.touches[0].clientX - dragStart.current.x, e.touches[0].clientY - dragStart.current.y);
    }, [dragging, isAnimatingFocus, updatePositionAfterDrag]);

    const stopDrag = useCallback(() => {
        if (dragging) {
            setDragging(false);
        }
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

    const handleChapterClick = useCallback((chapter) => {
        console.log(`--- handleChapterClick CALLED for chapter ID: ${chapter?.chapterId} ---`);
        console.log(`isAnimatingFocus: ${isAnimatingFocus}, dragging: ${dragging}, chapter valid: ${!!(chapter && chapter.data)}, chaptersToDisplay length: ${chaptersToDisplay.length}`);
        if (isAnimatingFocus || dragging || !chapter || !chapter.data || chaptersToDisplay.length === 0) {
            return;
        }
    
        const chapterIndex = chaptersToDisplay.findIndex(c => c.chapterId === chapter.chapterId);
        let isActuallyUnlocked = false;
        let reasonForLock = "Глава не найдена в списке отображаемых глав.";
        
        if (!isZoneUnlocked) { // <--- НОВАЯ ПРОВЕРКА: Если вся зона заблокирована
            isActuallyUnlocked = false;
            reasonForLock = `Зона "${currentZoneInfo?.name || zoneId}" еще не открыта.`; // Обновляем причину
        } else if (chapterIndex === -1) {
            console.warn(`ZoneMap Click: Clicked chapter ${chapter.chapterId} not found in chaptersToDisplay.`);
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
        
        if (!isActuallyUnlocked) {
            alert(`Глава "${chapter.nameOnMap || chapter.chapterId}" пока заблокирована. \nПричина: ${reasonForLock}`);
            return;
        }
    
        if (typeof goToChapter === 'function') {
            goToChapter(chapter.chapterId);
        } else {
            console.error("ZoneMap: goToChapter prop is not a function!");
        }
    }, [isAnimatingFocus, dragging, chaptersToDisplay, goToChapter, isChapterCompleted, isZoneUnlocked, currentZoneInfo, zoneId]); // Добавили isZoneUnlocked и др. в зависимости
    
    const handleAnimationComplete = () => {
        if(isAnimatingFocus) {
            setIsAnimatingFocus(false);
        }
    };

    // Показываем загрузку, пока не загружены главы ИЛИ информация о зоне (из код1)
    if (isLoadingChapters || !currentZoneInfo) {
        return <div className="loading-zone-map">Загрузка данных зоны {zoneId ? `${zoneId}` : ''}...</div>;
    }
    
    return (
        <div className="zone-map-screen">
            <div className="zone-name-plate">
                {/* ИСПОЛЬЗУЕМ ИМЯ ИЗ currentZoneInfo (из код1) */}
                <h1>{currentZoneInfo.name || `Карта Зоны: ${zoneId}`}</h1>
            </div>

            {typeof onGoToGlobalMap === 'function' && (
                <button
                    onClick={onGoToGlobalMap}
                    className="zone-map-back-button"
                    title="К Карте Мира"
                >
                    &larr; 
                </button>
            )}
            
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
                        // backgroundImage: currentZoneInfo?.backgroundImage ? `url(${currentZoneInfo.backgroundImage})` : (zoneId ? `url(/assets/zones/${zoneId}/zone_background.jpg)` : 'none'), // Пример фона зоны из currentZoneInfo
                        cursor: dragging ? 'grabbing' : (isAnimatingFocus ? 'default' : 'grab'),
                        userSelect: dragging ? 'none' : 'auto',
                    }}
                    animate={{ x: mapPosition.x, y: mapPosition.y, scale: mapZoom }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                    onAnimationComplete={handleAnimationComplete}
                >
                    {(chaptersToDisplay || []).map((chapter) => {
                        if (!chapter || !chapter.data || !chapter.displayCoordinates) {
                            console.warn("ZoneMap: Chapter data or displayCoordinates incomplete, skipping render:", chapter?.chapterId);
                            return null;
                        }
                        const isCurrent = chapter.chapterId === currentChapterId;
                        
                        let statusClass = 'locked';
                        const chapterIndex = chaptersToDisplay.findIndex(c => c.chapterId === chapter.chapterId);
                        
                        let isUnlockedForDisplayLogic = false; 
                        let prevChapterIdForLog = 'N/A';
                        let prevChapterWasActuallyCompleted = 'N/A';

                        if (!isZoneUnlocked) { // <--- НОВАЯ ПРОВЕРКА: Если вся зона заблокирована
                            isUnlockedForDisplayLogic = false; // То все главы в ней недоступны для отображения как unlocked/completed
                            // statusClass останется 'locked'
                        } else if (chapterIndex === 0) { // Зона разблокирована, И это первая глава зоны
                            isUnlockedForDisplayLogic = true;
                        } else if (chapterIndex > 0) { // Зона разблокирована, И это не первая глава
                            const prevCh = chaptersToDisplay[chapterIndex - 1];
                            if (prevCh && prevCh.data && Array.isArray(prevCh.data.levels)) {
                                isUnlockedForDisplayLogic = prevCh.data.levels.length === 0 || isChapterCompleted(prevCh.chapterId, prevCh.data.levels);
                            }
                        }

                        if (chapterIndex === 0) {
                            isUnlockedForDisplayLogic = true;
                        } else if (chapterIndex > 0) {
                            const prevCh = chaptersToDisplay[chapterIndex - 1];
                            prevChapterIdForLog = prevCh?.chapterId;
                            if (prevCh && prevCh.data && Array.isArray(prevCh.data.levels)) {
                                if (prevCh.data.levels.length > 0) {
                                    prevChapterWasActuallyCompleted = isChapterCompleted(prevCh.chapterId, prevCh.data.levels);
                                    isUnlockedForDisplayLogic = prevChapterWasActuallyCompleted;
                                } else {
                                    prevChapterWasActuallyCompleted = true; 
                                    isUnlockedForDisplayLogic = true;
                                }
                            } else {
                                prevChapterWasActuallyCompleted = false;
                                isUnlockedForDisplayLogic = false;
                            }
                        }

                        let currentChapterIsActuallyCompleted = false;
                        if (isUnlockedForDisplayLogic && chapter.data && Array.isArray(chapter.data.levels)) {
                            currentChapterIsActuallyCompleted = isChapterCompleted(chapter.chapterId, chapter.data.levels);
                        }


                        if (isUnlockedForDisplayLogic) {
                            statusClass = currentChapterIsActuallyCompleted ? 'completed' : 'unlocked';
                        }

                        if (isCurrent && !isAnimatingFocus && statusClass !== 'locked') {
                            statusClass += ' current-chapter-on-zone';
                        }

                        console.log(
                            `>>> ZoneMap Chapter Processing:
                             ID: ${chapter.chapterId}, Name: ${chapter.nameOnMap || 'N/A'}, Index: ${chapterIndex}
                             Prev Chapter ID: ${prevChapterIdForLog}, Prev Chapter Completed: ${String(prevChapterWasActuallyCompleted)}
                             isUnlockedForDisplayLogic (должна ли быть доступна): ${isUnlockedForDisplayLogic}
                             Current Chapter Actually Completed (для статуса 'completed'): ${currentChapterIsActuallyCompleted}
                             Is Player's Current Active Chapter: ${isCurrent}
                             Final statusClass: "${statusClass}"`
                        );
                        if (chapterIndex === 0) {
                            const currentStatusClassValue = statusClass;
                            const stringToSearch = 'locked';
                            const includesResult = currentStatusClassValue.includes(stringToSearch);

                            console.log(
                                `DEBUG FOR FIRST CHAPTER (ID: ${chapter.chapterId}):
                                 Current statusClass value: "${currentStatusClassValue}"
                                 String we are searching for: "${stringToSearch}"
                                 Result of "${currentStatusClassValue}".includes("${stringToSearch}"): ${includesResult}`
                            );
                        }

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
                                    backgroundImage: imagePath ? `url(${imagePath})` : `url(/assets/default_island_placeholder.png)`,
                                    backgroundSize: 'contain',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    padding: '5px',
                                    boxSizing: 'border-box',
                                    borderRadius: '8px',
                                    border: '2px solid transparent',
                                }}  
                                onClick={(e) => {
                                    console.log(`Island Click Attempt: chapterId=${chapter.chapterId}, dragging=${dragging}, isAnimatingFocus=${isAnimatingFocus}`);
                                    if (!dragging && !isAnimatingFocus) {
                                        handleChapterClick(chapter);
                                    } else {
                                        console.log(`Island Click Prevented: dragging=${dragging}, isAnimatingFocus=${isAnimatingFocus}`);
                                    }
                                }}                                
                                title={chapter.nameOnMap || `Глава ${chapter.chapterId}`}
                            >
                                <span className="island-label">{chapter.nameOnMap || `Глава ${chapter.chapterId}`}</span>
                                {statusClass === 'locked' && <div className="island-lock-icon">🔒</div>}
                            </div>
                        );
                    })}
                </motion.div>
            </div>
        </div>
    );
};

export default ZoneMap;