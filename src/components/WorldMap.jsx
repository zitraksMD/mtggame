// src/components/WorldMap.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
// useLocation и useNavigate здесь НЕ НУЖНЫ, если навигация полностью через пропсы от MainMenu
// import { useLocation, useNavigate } from 'react-router-dom';
import useGameStore from "../store/useGameStore";
import "./WorldMap.scss";

// Импорты данных глав (из код2)
import chapter1Data from '../data/chapters/chapter1/chapter1Data.js';
import chapter2Data from '../data/chapters/chapter2/chapter2Data.js';
import chapter3Data from '../data/chapters/chapter3/chapter3Data.js';
import chapter4Data from '../data/chapters/chapter4/chapter4Data.js';

// Константы и начальные данные (из код2, согласованы с код1)
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const INITIAL_CHAPTER_ID = 1; // Используется для определения начальной разблокированной главы

const TARGET_MAP_ZOOM = 0.7; // <<< Добавлено из Код 1: Ваш целевой масштаб для карты глав

const allChaptersLevelData = {
  1: chapter1Data?.levels || [],
  2: chapter2Data?.levels || [],
  3: chapter3Data?.levels || [],
  4: chapter4Data?.levels || [],
};

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

const WorldMap = ({
  goBack,
  goToChapter,
  currentChapterId,
  onGoToGlobalMap
}) => {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [isIntro, setIsIntro] = useState(true);

  const dragStart = useRef({ x: 0, y: 0 });
  const mapStart = useRef({ x: 0, y: 0 });

  // ИЗМЕНЕНО В СООТВЕТСТВИИ С КОД1: focusedChapterId теперь просто currentChapterId
  const focusedChapterId = currentChapterId;

  const isChapterCompleted = useGameStore(state => state.isChapterCompleted);

  const getMapActualDimensions = useCallback(() => {
    return { width: MAP_BACKGROUND_WIDTH, height: MAP_BACKGROUND_HEIGHT };
  }, []);

  const calculateDragBoundaries = useCallback((contentScaledSize, containerSize) => {
    if (contentScaledSize <= containerSize) {
      const centeredPosition = (containerSize - contentScaledSize) / 2;
      return { minPos: centeredPosition, maxPos: centeredPosition, allowDrag: false };
    } else {
      return { minPos: containerSize - contentScaledSize, maxPos: 0, allowDrag: true };
    }
  }, []);

  // Эффект для интро-анимации и центрирования (ИНТЕГРИРОВАН Код 1)
  useEffect(() => {
    const container = containerRef.current;
    // focusedChapterId может быть undefined, если currentChapterId не передан.
    // Это обработается ниже и анимация не запустится, если focusedChapterId не валиден.
    if (!container) {
        setIsIntro(false);
        return;
    }
    
    // Если focusedChapterId не определен (например, currentChapterId не передан),
    // анимация центрирования на конкретной главе не произойдет.
    // Можно либо центрировать на INITIAL_CHAPTER_ID, либо ничего не делать.
    // Текущая логика попытается найти chapterToFocus, и если не найдет, то интро не будет "умным".
    if (!focusedChapterId && focusedChapterId !== 0) { // Добавим проверку на 0, если id может быть 0
        // Если currentChapterId не передан, focusedChapterId будет undefined.
        // В этом случае, chapterToFocus ниже попытается использовать INITIAL_CHAPTER_ID.
        // Если и это нежелательно, то здесь можно просто setIsIntro(false) и return.
        // Для текущей логики, где chapterToFocus имеет фолбэки, это нормально.
    }


    // Используем улучшенный поиск главы из Код 2.
    // Если focusedChapterId (из currentChapterId) невалиден или отсутствует,
    // будет использован INITIAL_CHAPTER_ID или первая глава из списка.
    const chapterToFocus = chaptersToDisplay.find(c => c.id === focusedChapterId) ||
                           chaptersToDisplay.find(c => c.id === INITIAL_CHAPTER_ID) ||
                           chaptersToDisplay[0];

    if (!chapterToFocus) { // Если даже фолбэки не сработали (маловероятно, если chaptersToDisplay не пуст)
        setIsIntro(false);
        return;
    }
    
    // Если !focusedChapterId (т.е. currentChapterId не был передан), но chapterToFocus был найден (например, INITIAL_CHAPTER_ID),
    // анимация все равно произойдет на этот chapterToFocus.
    // Если требуется, чтобы анимация НЕ происходила при отсутствии currentChapterId,
    // то проверка `if (!focusedChapterId)` должна быть строже и вести к setIsIntro(false) и return.
    // Однако, Код1 подразумевает, что focusedChapterId = currentChapterId, и если он есть, то используется.
    // Если currentChapterId нет, то поведение анимации здесь будет зависеть от chapterToFocus, найденного по INITIAL_CHAPTER_ID.

    setIsIntro(true);
    setZoom(TARGET_MAP_ZOOM); // Устанавливаем целевой зум СРАЗУ (из Код 1)

    const { width: mapActualWidth, height: mapActualHeight } = getMapActualDimensions();

    const finalTargetX = container.offsetWidth / 2 - (chapterToFocus.left + ISLAND_RENDERED_WIDTH / 2) * TARGET_MAP_ZOOM;
    const finalTargetY = container.offsetHeight / 2 - (chapterToFocus.top + ISLAND_RENDERED_HEIGHT / 2) * TARGET_MAP_ZOOM;

    const scaledMapWidthAtTargetZoom = mapActualWidth * TARGET_MAP_ZOOM;
    const scaledMapHeightAtTargetZoom = mapActualHeight * TARGET_MAP_ZOOM;
    const xBounds = calculateDragBoundaries(scaledMapWidthAtTargetZoom, container.offsetWidth);
    const yBounds = calculateDragBoundaries(scaledMapHeightAtTargetZoom, container.offsetHeight);

    const clampedFinalX = xBounds.allowDrag ? clamp(finalTargetX, xBounds.minPos, xBounds.maxPos) : xBounds.minPos;
    const clampedFinalY = yBounds.allowDrag ? clamp(finalTargetY, yBounds.minPos, yBounds.maxPos) : yBounds.minPos;

    let initialAnimatedX = (container.offsetWidth - scaledMapWidthAtTargetZoom) / 2;
    let initialAnimatedY = (container.offsetHeight - scaledMapHeightAtTargetZoom) / 2;

    if (scaledMapWidthAtTargetZoom > container.offsetWidth) {
        initialAnimatedX = xBounds.maxPos;
    }
    if (scaledMapHeightAtTargetZoom > container.offsetHeight) {
        initialAnimatedY = yBounds.maxPos;
    }

    setPosition({ x: initialAnimatedX, y: initialAnimatedY });

    let startTimestamp = null;
    const duration = 1000;
    const animatePan = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const eased = 0.5 - 0.5 * Math.cos(progress * Math.PI);

        const newX = initialAnimatedX + (clampedFinalX - initialAnimatedX) * eased;
        const newY = initialAnimatedY + (clampedFinalY - initialAnimatedY) * eased;

        setPosition({ x: newX, y: newY });

        if (progress < 1) {
            requestAnimationFrame(animatePan);
        } else {
            setPosition({ x: clampedFinalX, y: clampedFinalY });
            setIsIntro(false);
        }
    };
    requestAnimationFrame(animatePan);

  }, [currentChapterId, getMapActualDimensions, calculateDragBoundaries]); // Зависимость изменена на currentChapterId


  const updatePosition = useCallback((dx, dy) => {
    const scale = zoom;
    const container = containerRef.current;
    if (!container || isIntro) return;
    const { width: mapActualWidth, height: mapActualHeight } = getMapActualDimensions();
    const scaledMapWidth = mapActualWidth * scale;
    const scaledMapHeight = mapActualHeight * scale;
    const xBounds = calculateDragBoundaries(scaledMapWidth, container.offsetWidth);
    const yBounds = calculateDragBoundaries(scaledMapHeight, container.offsetHeight);
    let targetX = mapStart.current.x + dx;
    let targetY = mapStart.current.y + dy;
    const finalX = xBounds.allowDrag ? clamp(targetX, xBounds.minPos, xBounds.maxPos) : xBounds.minPos;
    const finalY = yBounds.allowDrag ? clamp(targetY, yBounds.minPos, yBounds.maxPos) : yBounds.minPos;
    setPosition({ x: finalX, y: finalY });
  }, [zoom, isIntro, getMapActualDimensions, calculateDragBoundaries, clamp]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !==0 || isIntro) return;
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
  }, [isIntro, zoom, position, getMapActualDimensions, calculateDragBoundaries]);

  const handleTouchStart = useCallback((e) => {
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
  }, [isIntro, zoom, position, getMapActualDimensions, calculateDragBoundaries]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging || isIntro) return;
    updatePosition(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
  }, [dragging, isIntro, updatePosition]);

  const handleTouchMove = useCallback((e) => {
    if (!dragging || isIntro) return;
    updatePosition(e.touches[0].clientX - dragStart.current.x, e.touches[0].clientY - dragStart.current.y);
  }, [dragging, isIntro, updatePosition]);

  const stopDrag = useCallback(() => {
    if (dragging) {
      setDragging(false);
    }
  }, [dragging]);

  const handleIslandClick = useCallback((chapter) => {
    if (isIntro || dragging) return;

    let isChapterActuallyUnlocked = false;
    if (chapter.id === INITIAL_CHAPTER_ID) {
      isChapterActuallyUnlocked = true;
    } else {
      const prevChapterId = chapter.id - 1;
      if (prevChapterId > 0) {
        const prevChapterAssociatedLevels = allChaptersLevelData[prevChapterId] || [];
        if (isChapterCompleted(prevChapterId, prevChapterAssociatedLevels)) {
          isChapterActuallyUnlocked = true;
        }
      }
    }

    if (!isChapterActuallyUnlocked) {
      alert(`Глава "${chapter.name}" заблокирована. Пройдите предыдущую главу.`);
      return;
    }

    if (typeof goToChapter === 'function') {
      goToChapter(chapter); // Соответствует Код1
    } else {
      console.error("WorldMap: goToChapter prop is not a function!");
    }
  }, [goToChapter, isIntro, dragging, isChapterCompleted, allChaptersLevelData]);

  const handleGoToGlobalMapClick = useCallback(() => {
    console.log("WorldMap: Кнопка 'Общая Карта Мира' нажата.");
    if (typeof onGoToGlobalMap === 'function') {
      console.log("WorldMap: Вызываю пропс onGoToGlobalMap.");
      onGoToGlobalMap(); // Соответствует Код1
    } else {
      console.error("WorldMap: Пропс onGoToGlobalMap не передан или не является функцией!");
    }
  }, [onGoToGlobalMap]);

  const handleBackButtonClick = useCallback(() => {
    console.log("WorldMap: Кнопка 'Назад' нажата.");
    if (typeof goBack === 'function') {
      goBack(); // Соответствует Код1
    } else {
      console.error("WorldMap: goBack prop is not a function!");
    }
  }, [goBack]);

  const mapMovableContentStyle = {
    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
    transformOrigin: 'top left',
    width: `${MAP_BACKGROUND_WIDTH}px`,
    height: `${MAP_BACKGROUND_HEIGHT}px`,
    position: 'absolute',
  };

  return (
    <div className="world-map" ref={containerRef}>
      <h1 className="worldmap-title">Карта Глав</h1>
      <button
        className="map-back-button"
        onClick={handleBackButtonClick}
        title="В Меню Главы"
      >
        &#x21B5; {/* Иконка "назад" */}
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

            // focusedChapterId здесь используется для стилизации 'current'
            const isThisChapterCurrentlyFocused = focusedChapterId === chapter.id;
            const thisChapterAllLevels = allChaptersLevelData[chapter.id] || [];
            const isThisChapterCompletedByPlayer = isChapterCompleted(chapter.id, thisChapterAllLevels);

            let isChapterConsideredUnlocked = false;
            if (chapter.id === INITIAL_CHAPTER_ID) {
              isChapterConsideredUnlocked = true;
            } else {
              const prevChapterId = chapter.id - 1;
              if (prevChapterId > 0) {
                const prevChapterAssociatedLevels = allChaptersLevelData[prevChapterId] || [];
                if (isChapterCompleted(prevChapterId, prevChapterAssociatedLevels)) {
                  isChapterConsideredUnlocked = true;
                }
              }
            }

            if (isChapterConsideredUnlocked) {
              chapterStatusClass = isThisChapterCompletedByPlayer ? 'completed' : 'unlocked';
            } else {
              chapterStatusClass = 'locked';
              isLockedForDisplay = true;
            }

            if (isThisChapterCurrentlyFocused && !isIntro) {
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

      <div className="global-map-controls">
        <button
          className="map-action-button go-to-global-map-button"
          onClick={handleGoToGlobalMapClick}
        >
          Общая Карта Мира
        </button>
      </div>
    </div>
  );
};

export default WorldMap;