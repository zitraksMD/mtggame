// src/components/WorldMap.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import useGameStore from "../store/useGameStore";
import "./WorldMap.scss";

// Импортируем данные глав
import chapter1Data from '../data/chapters/chapter1/chapter1Data.js';
import chapter2Data from '../data/chapters/chapter2/chapter2Data.js';
import chapter3Data from '../data/chapters/chapter3/chapter3Data.js';
import chapter4Data from '../data/chapters/chapter4/chapter4Data.js';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const allChaptersLevelData = {
  1: chapter1Data?.levels || [],
  2: chapter2Data?.levels || [],
  3: chapter3Data?.levels || [],
  4: chapter4Data?.levels || [],
};

const INITIAL_CHAPTER_ID = 1;

const chaptersToDisplay = [
  { id: 1, top: 300, left: 100, imageDefault: "/assets/default_island_image.png", data: chapter1Data },
  { id: 2, top: 500, left: 300, imageDefault: "/assets/default_island_image.png", data: chapter2Data },
  { id: 3, top: 700, left: 150, imageDefault: "/assets/default_island_image.png", data: chapter3Data },
  { id: 4, top: 800, left: 500, imageDefault: "/assets/default_island_image.png", data: chapter4Data },
].map(ch => ({
  ...ch,
  name: ch.data?.name || `Глава ${ch.id}`,
  image: ch.data?.mapImage || ch.data?.image || ch.imageDefault
}));

const ISLAND_RENDERED_WIDTH = 200;
const ISLAND_RENDERED_HEIGHT = 150;

const MAP_BACKGROUND_WIDTH = 2000;
const MAP_BACKGROUND_HEIGHT = 1000;

const WorldMap = ({ goBack, goToChapter, currentChapterId }) => {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isIntro, setIsIntro] = useState(true);

  const dragStart = useRef({ x: 0, y: 0 });
  const mapStart = useRef({ x: 0, y: 0 });

  const isChapterCompleted = useGameStore(state => state.isChapterCompleted);

  const getMapActualDimensions = useCallback(() => {
    return { width: MAP_BACKGROUND_WIDTH, height: MAP_BACKGROUND_HEIGHT };
  }, []);

  // Изменения из код1: Оберните в useCallback и добавьте console.log
  const calculateDragBoundaries = useCallback((contentScaledSize, containerSize) => {
    console.log('[DragBoundsFn] Inputs:', { contentScaledSize, containerSize }); // <--- ОТЛАДКА из код1
    if (contentScaledSize <= containerSize) {
      const centeredPosition = (containerSize - contentScaledSize) / 2;
      const bounds = { minPos: centeredPosition, maxPos: centeredPosition, allowDrag: false };
      console.log('[DragBoundsFn] Result (no drag):', bounds); // <--- ОТЛАДКА из код1
      return bounds;
    } else {
      const bounds = { minPos: containerSize - contentScaledSize, maxPos: 0, allowDrag: true };
      console.log('[DragBoundsFn] Result (allow drag):', bounds); // <--- ОТЛАДКА из код1
      return bounds;
    }
  }, []); // Зависимости пусты, так как функция не зависит от внешних переменных из области видимости компонента

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    console.log('[Effect] Container dimensions:', { width: container.offsetWidth, height: container.offsetHeight }); // <--- ОТЛАДКА из код1

    const chapterToFocus = chaptersToDisplay.find(c => c.id === currentChapterId) || chaptersToDisplay[0];
    if (!chapterToFocus) {
      setIsIntro(false);
      return;
    }

    setIsIntro(true);
    const { width: mapActualWidth, height: mapActualHeight } = getMapActualDimensions();
    const finalZoom = 0.7;
    const initialZoomForAnimation = 0.2;
    let idealTargetX = container.offsetWidth / 2 - (chapterToFocus.left + ISLAND_RENDERED_WIDTH / 2) * finalZoom;
    let idealTargetY = container.offsetHeight / 2 - (chapterToFocus.top + ISLAND_RENDERED_HEIGHT / 2) * finalZoom;
    const scaledMapWidthTarget = mapActualWidth * finalZoom;
    const scaledMapHeightTarget = mapActualHeight * finalZoom;
    const xBoundsTarget = calculateDragBoundaries(scaledMapWidthTarget, container.offsetWidth);
    const yBoundsTarget = calculateDragBoundaries(scaledMapHeightTarget, container.offsetHeight);
    const clampedTargetX = xBoundsTarget.allowDrag ? clamp(idealTargetX, xBoundsTarget.minPos, xBoundsTarget.maxPos) : xBoundsTarget.minPos;
    const clampedTargetY = yBoundsTarget.allowDrag ? clamp(idealTargetY, yBoundsTarget.minPos, yBoundsTarget.maxPos) : yBoundsTarget.minPos;

    console.log('[Effect] Bounds Calc:', { // <--- ОТЛАДКА из код1
        scaledMapWidthTarget,
        containerWidth: container.offsetWidth, // Добавлено container.offsetWidth для полноты картины как в код1
        xBoundsTarget,
        idealTargetX, // Добавлено для полноты
        clampedTargetX, // Добавлено для полноты
        // Для Y (аналогично X, если нужно)
        scaledMapHeightTarget,
        containerHeight: container.offsetHeight,
        yBoundsTarget,
        idealTargetY,
        clampedTargetY
    });

    const initialScaledMapWidth = mapActualWidth * initialZoomForAnimation;
    const initialScaledMapHeight = mapActualHeight * initialZoomForAnimation;
    const initialPosX = (container.offsetWidth - initialScaledMapWidth) / 2 ;
    const initialPosY = (container.offsetHeight - initialScaledMapHeight) / 2 ;

    setZoom(initialZoomForAnimation);
    setPosition({ x: initialPosX, y: initialPosY });
    // console.log('[Effect] Initial position set for animation:', { x: initialPosX, y: initialPosY }); // Лог перед анимацией

    let startTimestamp = null;
    const duration = 1500;
    const animate = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const eased = 0.5 - 0.5 * Math.cos(progress * Math.PI);
      const newZoom = initialZoomForAnimation + (finalZoom - initialZoomForAnimation) * eased;
      const newX = initialPosX + (clampedTargetX - initialPosX) * eased;
      const newY = initialPosY + (clampedTargetY - initialPosY) * eased;
      setZoom(newZoom);
      setPosition({ x: newX, y: newY });
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setZoom(finalZoom);
        setPosition({ x: clampedTargetX, y: clampedTargetY });
        console.log('[Effect] Initial position set to (after animation):', { x: clampedTargetX, y: clampedTargetY }); // <--- ОТЛАДКА из код1 (после анимации)
        setIsIntro(false);
      }
    };
    requestAnimationFrame(animate);
  }, [currentChapterId, getMapActualDimensions, calculateDragBoundaries]); // Добавили calculateDragBoundaries в зависимости, т.к. он теперь useCallback

  const updatePosition = (dx, dy) => {
    const scale = zoom;
    const container = containerRef.current;
    if (!container || isIntro) return;
    const { width: mapActualWidth, height: mapActualHeight } = getMapActualDimensions();
    const scaledMapWidth = mapActualWidth * scale;
    const scaledMapHeight = mapActualHeight * scale;
    const xBounds = calculateDragBoundaries(scaledMapWidth, container.offsetWidth);
    const yBounds = calculateDragBoundaries(scaledMapHeight, container.offsetHeight); // В код2 Y-перемещение включено
    let targetX = mapStart.current.x + dx;
    let targetY = mapStart.current.y + dy; // В код2 Y-перемещение включено
    const finalX = xBounds.allowDrag ? clamp(targetX, xBounds.minPos, xBounds.maxPos) : xBounds.minPos;
    const finalY = yBounds.allowDrag ? clamp(targetY, yBounds.minPos, yBounds.maxPos) : yBounds.minPos; // В код2 Y-перемещение включено
    
    // Изменения из код1: Добавлен console.log
    console.log('[UpdatePosition] Dragging:', { // Расширил лог для X и Y
        currentMapX: mapStart.current.x,
        currentMapY: mapStart.current.y,
        dx,
        dy,
        targetX,
        targetY,
        xBounds,
        yBounds,
        finalX,
        finalY
    });

    setPosition({ x: finalX, y: finalY }); // В код2 используется finalY
  };

  const handleMouseDown = (e) => {
    if (isIntro) return;
    const container = containerRef.current;
    if (!container) return;
    const { width: mapActualWidth, height: mapActualHeight } = getMapActualDimensions();
    const scaledMapWidth = mapActualWidth * zoom;
    const scaledMapHeight = mapActualHeight * zoom;
    const xBounds = calculateDragBoundaries(scaledMapWidth, container.offsetWidth);
    const yBounds = calculateDragBoundaries(scaledMapHeight, container.offsetHeight);
    if (!xBounds.allowDrag && !yBounds.allowDrag && scaledMapWidth <= container.offsetWidth && scaledMapHeight <= container.offsetHeight) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    mapStart.current = { ...position };
  };

  const handleTouchStart = (e) => {
    if (isIntro) return;
    const container = containerRef.current;
    if (!container) return;
    const { width: mapActualWidth, height: mapActualHeight } = getMapActualDimensions();
    const scaledMapWidth = mapActualWidth * zoom;
    const scaledMapHeight = mapActualHeight * zoom;
    const xBounds = calculateDragBoundaries(scaledMapWidth, container.offsetWidth);
    const yBounds = calculateDragBoundaries(scaledMapHeight, container.offsetHeight);
    if (!xBounds.allowDrag && !yBounds.allowDrag && scaledMapWidth <= container.offsetWidth && scaledMapHeight <= container.offsetHeight) return;
    setDragging(true);
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    mapStart.current = { ...position };
  };

  const handleMouseMove = (e) => {
    if (!dragging || isIntro) return;
    updatePosition(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
  };

  const handleTouchMove = (e) => {
    if (!dragging || isIntro) return;
    updatePosition(e.touches[0].clientX - dragStart.current.x, e.touches[0].clientY - dragStart.current.y);
  };

  const stopDrag = () => {
    if (dragging) {
      setDragging(false);
    }
  };
  
  const handleIslandClick = (chapter) => {
    if (isIntro || dragging) return;
    let isUnlocked = false;
    if (chapter.id === INITIAL_CHAPTER_ID) {
      isUnlocked = true;
    } else {
      const prevChapterId = chapter.id - 1;
      const prevChapterLevels = allChaptersLevelData[prevChapterId];
      if (prevChapterLevels && prevChapterLevels.length > 0) {
        isUnlocked = isChapterCompleted(prevChapterId, prevChapterLevels);
      } else if (prevChapterLevels && prevChapterLevels.length === 0 && prevChapterId < INITIAL_CHAPTER_ID) { 
        isUnlocked = true; 
      }
    }
    if (!isUnlocked) {
      alert(`Глава "${chapter.name}" заблокирована. Пройдите предыдущую главу.`);
      return;
    }
    setSelectedChapter(chapter);
    setShowPopup(true);
  };

  const handleConfirm = () => {
    if (goToChapter && selectedChapter) goToChapter(selectedChapter);
    setShowPopup(false);
    setSelectedChapter(null);
  };

  const handleCancel = () => {
    setShowPopup(false);
    setSelectedChapter(null);
  };

  const mapMovableContentStyle = {
    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
    transformOrigin: 'top left',
    width: `${MAP_BACKGROUND_WIDTH}px`,
    height: `${MAP_BACKGROUND_HEIGHT}px`,
    background: 'linear-gradient(160deg, #1a2a4a 0%, #0f1a30 100%)',
    position: 'absolute',
  };

  return (
    <div className="world-map" ref={containerRef}>
      <h1 className="worldmap-title">Карта Мира</h1>
      <button className="map-back-button" onClick={goBack} title="Назад">
        &#x21B5;
      </button>

      <div
        className="map-drag-container"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchEnd={stopDrag}
        onTouchCancel={stopDrag}
      >
        <div className="map-background-content" style={mapMovableContentStyle}>
          {chaptersToDisplay.map((chapter) => {
            let chapterStatusClass = '';
            let isLockedForDisplay = false;
            const isThisChapterCurrentlySelected = currentChapterId === chapter.id;
            const thisChapterAllLevels = allChaptersLevelData[chapter.id] || [];
            const isThisChapterCompletedByPlayer = isChapterCompleted(chapter.id, thisChapterAllLevels);

            if (chapter.id === INITIAL_CHAPTER_ID) {
              chapterStatusClass = isThisChapterCompletedByPlayer ? 'completed' : 'unlocked';
            } else {
              const prevChapterId = chapter.id - 1;
              const prevChapterLevels = allChaptersLevelData[prevChapterId];
              if (prevChapterLevels && prevChapterLevels.length > 0 && isChapterCompleted(prevChapterId, prevChapterLevels)) {
                chapterStatusClass = isThisChapterCompletedByPlayer ? 'completed' : 'unlocked';
              } else if (prevChapterLevels && prevChapterLevels.length === 0 && prevChapterId < chapter.id ) {
                chapterStatusClass = isThisChapterCompletedByPlayer ? 'completed' : 'unlocked';
              }
              else {
                chapterStatusClass = 'locked';
                isLockedForDisplay = true;
              }
            }
            if (isThisChapterCurrentlySelected && !isIntro) {
              chapterStatusClass += ' current';
            }
            
            return (
              <div
                key={chapter.id}
                className={`map-island ${chapterStatusClass}`}
                style={{
                  top: `${chapter.top}px`,
                  left: `${chapter.left}px`,
                  width: `${ISLAND_RENDERED_WIDTH}px`,
                  height: `${ISLAND_RENDERED_HEIGHT}px`,
                  position: 'absolute',
                }}
                onClick={() => handleIslandClick(chapter)}
              >
                <img src={chapter.image} alt={chapter.name} className="island-image" />
                <span className="island-label">{chapter.name}</span>
                {isLockedForDisplay && <div className="island-lock-icon">🔒</div>}
              </div>
            );
          })}
        </div>
      </div>

      {showPopup && selectedChapter && (
        <div className="map-popup-backdrop">
          <div className="map-popup">
            <div className="popup-box">
              <p>Отправиться в <strong>{selectedChapter.name}</strong>?</p>
              <div className="popup-buttons">
                <button onClick={handleConfirm}>Да</button>
                <button onClick={handleCancel}>Нет</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldMap;