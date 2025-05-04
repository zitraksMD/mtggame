import React, { useRef, useState, useEffect } from "react";
import "./WorldMap.scss";

const chapters = [
  { id: 1, name: "Глава 1", top: 300, left: 100, image: "/assets/chapter1.png" },
  { id: 2, name: "Глава 2", top: 500, left: 300, image: "/assets/chapter2.png" },
  { id: 3, name: "Глава 3", top: 700, left: 150, image: "/assets/chapter3.png" },
  { id: 4, name: "Глава 4", top: 800, left: 500, image: "/assets/chapter4.png" },
];

const WorldMap = ({ goBack, goToChapter, currentChapterId }) => {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(0.3);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isIntro, setIsIntro] = useState(true);

  const dragStart = useRef({ x: 0, y: 0 });
  const mapStart = useRef({ x: 0, y: 0 });

  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

  useEffect(() => {
    const container = containerRef.current;
    const chapter = chapters.find(c => c.id === currentChapterId) || chapters[0];

    const finalZoom = 1;

    const targetX = -chapter.left + container.offsetWidth / 2 - 100;
    const targetY = -chapter.top + container.offsetHeight / 2 - 100;

    let start = null;
    const duration = 2000;

    const initialZoom = 0.3;
    const initialPos = { x: 0, y: 0 };

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);

      const eased = easeInOutCubic(progress);

      const newZoom = initialZoom + (finalZoom - initialZoom) * eased;
      const newX = initialPos.x + (targetX - initialPos.x) * eased;
      const newY = initialPos.y + (targetY - initialPos.y) * eased;

      setZoom(newZoom);
      setPosition({ x: newX, y: newY });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsIntro(false);
      }
    };

    requestAnimationFrame(animate);
  }, [currentChapterId]);

  const easeInOutCubic = (t) => t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const updatePosition = (dx, dy) => {
    const scale = zoom;
    const container = containerRef.current;
    const mapWidth = 1500 * scale;
    const mapHeight = 1500 * scale;

    const maxX = 0;
    const maxY = 0;
    const minX = container.offsetWidth - mapWidth;
    const minY = container.offsetHeight - mapHeight;

    const newX = clamp(mapStart.current.x + dx, minX, maxX);
    const newY = clamp(mapStart.current.y + dy, minY, maxY);

    setPosition({ x: newX, y: newY });
  };

  const handleMouseDown = (e) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    mapStart.current = { ...position };
  };

  const handleTouchStart = (e) => {
    setDragging(true);
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    mapStart.current = { ...position };
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    updatePosition(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
  };

  const handleTouchMove = (e) => {
    if (!dragging) return;
    updatePosition(e.touches[0].clientX - dragStart.current.x, e.touches[0].clientY - dragStart.current.y);
  };

  const stopDrag = () => setDragging(false);

  const handleIslandClick = (chapter) => {
    setSelectedChapter(chapter);
    setShowPopup(true);
  };

  const handleConfirm = () => {
    if (goToChapter) goToChapter(selectedChapter);
    setShowPopup(false);
    setSelectedChapter(null);
  };

  const handleCancel = () => {
    setShowPopup(false);
    setSelectedChapter(null);
  };

  const transformStyle = {
    transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
    transition: isIntro ? 'none' : 'transform 0.1s ease-out',
  };

  return (
    <div className="world-map" ref={containerRef}>
      {isIntro && <h1 className="worldmap-title">World Map</h1>}

      <button className="map-back-button" onClick={goBack}>Назад</button>

      <div
        className="map-background"
        style={transformStyle}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchEnd={stopDrag}
      >
        {chapters.map((chapter) => (
          <div
            key={chapter.id}
            className="map-island"
            style={{ top: `${chapter.top}px`, left: `${chapter.left}px` }}
            onClick={() => handleIslandClick(chapter)}
          >
            <img src={chapter.image} alt={chapter.name} className="island-image" />
            <span className="island-label">{chapter.name}</span>
          </div>
        ))}
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
