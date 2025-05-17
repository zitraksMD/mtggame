// src/components/GlobalMap.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import './GlobalMap.scss';
// Импортируем ALL_ZONES_CONFIG как allZones И findZoneIdForChapter
import { ALL_ZONES_CONFIG as allZones, findZoneIdForChapter } from '../data/worldMapData';
import useGameStore from '../store/useGameStore';

// Размеры всей "подложки" карты
const GLOBAL_MAP_CONTENT_WIDTH = 1200;
const GLOBAL_MAP_CONTENT_HEIGHT = 800;

// НОВЫЕ КОНСТАНТЫ для размеров иконок зон на GlobalMap (из код1, если отличаются, или оставляем из код2)
const ZONE_ICON_WIDTH = 400; // Стандартная ширина иконки зоны (может быть переопределена в zone.iconWidth)
const ZONE_ICON_HEIGHT = 280; // Стандартная высота иконки зоны (может быть переопределена в zone.iconHeight)

const GlobalMap = ({
    initialFocusZoneId,   // ID зоны для начального фокуса
    onSelectZone,         // (zoneId, startChapterId) => void
    onGoBack,             // () => void, для кнопки "назад"
}) => {
    const isZoneUnlocked = useGameStore(state => state.isZoneUnlocked);
    // Получаем ID текущей главы игрока из стора (из код1)
    const currentPlayerChapterId = useGameStore(state => state.currentChapterId);

    const viewportRef = useRef(null);
    const [isAnimatingToFocus, setIsAnimatingToFocus] = useState(false);
    const mapX = useMotionValue(0);
    const mapY = useMotionValue(0);
    const mapScale = useMotionValue(0.8); // Начальный зум

    // Определяем ID текущей активной зоны игрока (из код1)
    const currentPlayerZoneId = findZoneIdForChapter(currentPlayerChapterId);

    useEffect(() => {
        if (!viewportRef.current) return;

        setIsAnimatingToFocus(true);
        const viewportWidth = viewportRef.current.offsetWidth;
        const viewportHeight = viewportRef.current.offsetHeight;

        let targetX = (viewportWidth - GLOBAL_MAP_CONTENT_WIDTH * 0.8) / 2; // Центрирование по умолчанию
        let targetY = (viewportHeight - GLOBAL_MAP_CONTENT_HEIGHT * 0.8) / 2;
        let targetZoom = 0.8;

        if (initialFocusZoneId && allZones) {
            const targetZone = allZones.find(z => z.id === initialFocusZoneId);
            if (targetZone?.globalCoordinates) {
                targetZoom = 1.2; // Зум на зону
                const zoneIconWidth = targetZone.iconWidth || ZONE_ICON_WIDTH; // Используем константу, если нет в объекте зоны
                const zoneIconHeight = targetZone.iconHeight || ZONE_ICON_HEIGHT; // Используем константу
                // Центрируем выбранную зону в viewport'е
                targetX = viewportWidth / 2 - (targetZone.globalCoordinates.x + zoneIconWidth / 2) * targetZoom;
                targetY = viewportHeight / 2 - (targetZone.globalCoordinates.y + zoneIconHeight / 2) * targetZoom;
            } else if (targetZone) {
                console.warn(`GlobalMap: Zone with id "${initialFocusZoneId}" has no globalCoordinates.`);
            } else {
                console.warn(`GlobalMap: Zone with id "${initialFocusZoneId}" not found.`);
            }
        }
        
        const animOptions = { type: 'spring', stiffness: 120, damping: 20 };
        const animX = animate(mapX, targetX, animOptions);
        const animY = animate(mapY, targetY, animOptions);
        const animScale = animate(mapScale, targetZoom, { 
            ...animOptions, 
            onComplete: () => {
                setIsAnimatingToFocus(false);
                console.log("GlobalMap: Animation to zone complete.");
            }
        });

        return () => { 
            animX.stop(); 
            animY.stop(); 
            animScale.stop(); 
        };
    }, [initialFocusZoneId, mapX, mapY, mapScale]);

    const handleZoneClick = useCallback((zone) => {
        if (isAnimatingToFocus || typeof onSelectZone !== 'function') return;
    
        if (!zone.isImplemented) {
            alert(`Зона "${zone.name || zone.id}" еще не в игре!`);
            return;
        }
    
        if (!isZoneUnlocked(zone.id)) {
            let unlockMessage = `Зона "${zone.name || zone.id}" пока заблокирована.`;
            if (zone.unlockCondition?.type === 'zone_completed' && zone.unlockCondition?.requiredZoneId) {
                const prevZoneConf = allZones.find(z => z.id === zone.unlockCondition.requiredZoneId); 
                unlockMessage += `\nНеобходимо пройти зону "${prevZoneConf?.name || zone.unlockCondition.requiredZoneId}".`;
            }
            alert(unlockMessage);
            return;
        }
    
        onSelectZone(zone.id, zone.startChapterId);
    }, [onSelectZone, isAnimatingToFocus, isZoneUnlocked]); // allZones удален из зависимостей, если он статичен

    const handleBackClick = useCallback(() => {
        if (isAnimatingToFocus || typeof onGoBack !== 'function') return;
        onGoBack();
    }, [onGoBack, isAnimatingToFocus]);
    
    return (
        <motion.div className="global-map-screen">
            <div className="global-map-title-plate">
                <h1>Карта Мира</h1>
            </div>

            {typeof onGoBack === 'function' && (
                <button
                    onClick={handleBackClick}
                    className="global-map-back-button"
                    title="Назад"
                >
                    &larr;
                </button>
            )}

            <div className="global-map-viewport" ref={viewportRef}>
                <motion.div
                    className="global-map-pannable-content"
                    style={{
                        width: `${GLOBAL_MAP_CONTENT_WIDTH}px`,
                        height: `${GLOBAL_MAP_CONTENT_HEIGHT}px`,
                        x: mapX,
                        y: mapY,
                        scale: mapScale,
                        // backgroundImage: `url('/assets/maps/earth_texture.jpg')`,
                        // backgroundSize: '100% 100%', 
                    }}
                    drag
                    dragConstraints={viewportRef}
                >
                    {(allZones || []).map((zone) => {
                        const locked = !isZoneUnlocked(zone.id);
                        // Определяем, является ли эта зона текущей активной зоной игрока (из код1)
                        const isCurrentPlayerZone = zone.id === currentPlayerZoneId;

                        let zoneClasses = `zone-node ${!zone.isImplemented ? 'not-implemented' : (locked ? 'locked' : 'unlocked')}`;
                        
                        // Добавляем класс, если это текущая зона игрока и она не заблокирована/не реализована (из код1)
                        if (isCurrentPlayerZone && !locked && zone.isImplemented) {
                            zoneClasses += ' current-player-zone';
                        }
                        
                        const currentZoneIconWidth = zone.iconWidth || ZONE_ICON_WIDTH;
                        const currentZoneIconHeight = zone.iconHeight || ZONE_ICON_HEIGHT;

                        return (
                            <motion.div
                                key={zone.id}
                                className={zoneClasses} // Применяем классы (из код1)
                                style={{
                                    position: 'absolute',
                                    top: `${zone.globalCoordinates?.y || 0}px`,
                                    left: `${zone.globalCoordinates?.x || 0}px`,
                                    width: `${currentZoneIconWidth}px`,
                                    height: `${currentZoneIconHeight}px`,
                                }}
                                onClick={() => handleZoneClick(zone)}
                                title={zone.name}
                                // Условные whileHover и whileTap (из код1)
                                whileHover={!locked && zone.isImplemented ? { scale: 1.05, zIndex: 10 } : {}}
                                whileTap={!locked && zone.isImplemented ? { scale: 0.95 } : {}}
                            >
                                <img 
                                    src={zone.globalImage || '/assets/icons/default_zone_icon.png'} 
                                    alt={zone.name} 
                                    className="zone-image"
                                />
                                <span className="zone-label">{zone.name}</span>
                                {locked && zone.isImplemented && <div className="global-map-zone-lock-icon">🔒</div>}
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </motion.div>
    );
};

export default GlobalMap;