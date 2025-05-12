// src/components/GlobalMap.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion'; // animate из framer-motion, useTransform удален, если не используется где-то еще
import './GlobalMap.scss';
import { ALL_ZONES_CONFIG as allZones } from '../data/worldMapData'; // Используем данные зон напрямую как в код1

// Размеры всей "подложки" карты (из код1)
const GLOBAL_MAP_CONTENT_WIDTH = 1200;
const GLOBAL_MAP_CONTENT_HEIGHT = 800;

const GlobalMap = ({
    initialFocusZoneId,   // ID зоны для начального фокуса
    onSelectZone,         // (zoneId, startChapterId) => void
    onGoBack,             // () => void, для кнопки "назад"
    // allZonesData больше не нужен в props, так как импортируется напрямую
}) => {
    // const isChapterCompleted = useGameStore(state => state.isChapterCompleted); // Оставляем на случай, если понадобится для логики разблокировки

    const viewportRef = useRef(null); // Используем viewportRef как в код1
    const [isAnimatingToFocus, setIsAnimatingToFocus] = useState(false);

    const mapX = useMotionValue(0);
    const mapY = useMotionValue(0);
    const mapScale = useMotionValue(0.8); // Начальный зум

    useEffect(() => {
        if (!viewportRef.current) return;

        setIsAnimatingToFocus(true);
        const viewportWidth = viewportRef.current.offsetWidth;
        const viewportHeight = viewportRef.current.offsetHeight;

        let targetX = (viewportWidth - GLOBAL_MAP_CONTENT_WIDTH * 0.8) / 2; // Центрирование по умолчанию
        let targetY = (viewportHeight - GLOBAL_MAP_CONTENT_HEIGHT * 0.8) / 2;
        let targetZoom = 0.8;

        if (initialFocusZoneId && allZones) { // Используем allZones (импортированные)
            const targetZone = allZones.find(z => z.id === initialFocusZoneId);
            if (targetZone?.globalCoordinates) {
                targetZoom = 1.2; // Зум на зону
                const zoneIconWidth = targetZone.iconWidth || 100;
                const zoneIconHeight = targetZone.iconHeight || 80;
                // Центрируем выбранную зону в viewport'е
                targetX = viewportWidth / 2 - (targetZone.globalCoordinates.x + zoneIconWidth / 2) * targetZoom;
                targetY = viewportHeight / 2 - (targetZone.globalCoordinates.y + zoneIconHeight / 2) * targetZoom;
            } else if (targetZone) { // Добавлено из код2, если зона есть, но нет координат
                console.warn(`GlobalMap: Zone with id "${initialFocusZoneId}" has no globalCoordinates.`);
            } else {
                console.warn(`GlobalMap: Zone with id "${initialFocusZoneId}" not found.`);
            }
        }
        
        // Параметры и логика анимации из код1
        const animOptions = { type: 'spring', stiffness: 120, damping: 20 };
        const animX = animate(mapX, targetX, animOptions);
        const animY = animate(mapY, targetY, animOptions);
        const animScale = animate(mapScale, targetZoom, { 
            ...animOptions, 
            onComplete: () => {
                setIsAnimatingToFocus(false);
                console.log("GlobalMap: Animation to zone complete."); // Добавлено для ясности
            }
        });

        return () => { 
            animX.stop(); 
            animY.stop(); 
            animScale.stop(); 
            // clearTimeout(timer) больше не нужен, так как onComplete используется
        };
    }, [initialFocusZoneId, /* allZones - удалено из зависимостей, если он не меняется */ mapX, mapY, mapScale]); // allZones можно добавить, если он может меняться динамически

    const handleZoneClick = useCallback((zone) => {
        // Логика из код1
        if (isAnimatingToFocus || typeof onSelectZone !== 'function') return;

        // TODO: Проверки isImplemented и unlockCondition для зоны, если они есть в zone объекте
        // Это место для вашей логики проверки доступности зоны, как в комментариях из обоих кодов
        // if (!zone.isImplemented) { alert("Эта зона еще не реализована."); return; }
        // let isUnlocked = !zone.unlockCondition; // Пример
        // if (zone.unlockCondition?.type === 'zone_completed') {
        //     // isUnlocked = useGameStore.getState().isZoneCompleted(zone.unlockCondition.requiredZoneId);
        // }
        // if (!isUnlocked) { alert("Эта зона пока заблокирована."); return; }

        onSelectZone(zone.id, zone.startChapterId);
    }, [onSelectZone, isAnimatingToFocus]);

    const handleBackClick = useCallback(() => {
        // Логика из код1
        if (isAnimatingToFocus || typeof onGoBack !== 'function') return;
        onGoBack();
    }, [onGoBack, isAnimatingToFocus]);
    
    // dragConstraintsRef больше не нужен отдельно, viewportRef используется напрямую

    return (
        <motion.div className="global-map-screen"> {/* Корневой элемент экрана */}
            <div className="global-map-header">
                <h1>Карта Мира</h1>
                {onGoBack && (
                    <button onClick={handleBackClick} className="map-back-button">
                        &#x21A9; Назад
                    </button>
                )}
            </div>

            {/* Viewport: область, в которой видна карта. Имеет overflow: hidden */}
            <div className="global-map-viewport" ref={viewportRef}>
                <motion.div
                    className="global-map-pannable-content" // Имя класса из код1
                    style={{
                        width: `${GLOBAL_MAP_CONTENT_WIDTH}px`, // Константы из код1
                        height: `${GLOBAL_MAP_CONTENT_HEIGHT}px`,
                        x: mapX,
                        y: mapY,
                        scale: mapScale,
                        // backgroundImage: `url('/assets/maps/earth_texture.jpg')`, // Пример фона
                        // backgroundSize: '100% 100%', 
                    }}
                    drag
                    dragConstraints={viewportRef} // Ограничиваем перетаскивание границами viewportRef (из код1)
                    // onDragStart={() => console.log("Drag Start")}
                    // onDragEnd={() => console.log("Drag End")}
                >
                    {(allZones || []).map((zone) => {
                        // Логика классов для зоны из код1 (с небольшим уточнением для isUnlocked)
                        // TODO: Реализуйте вашу функцию isZoneLocked(zone) или аналогичную логику
                        const isZoneLocked = (z) => {
                            // Примерная логика, адаптируйте под ваши нужды:
                            // if (z.unlockCondition?.type === 'zone_completed') {
                            // return !useGameStore.getState().isZoneCompleted(z.unlockCondition.requiredZoneId);
                            // }
                            // return !!z.unlockCondition; // Если просто есть условие, то залочено пока
                            return false; // Пока заглушка как в код1
                        };
                        const zoneClasses = `zone-node ${!zone.isImplemented ? 'not-implemented' : (isZoneLocked(zone) ? 'locked' : 'unlocked')}`;
                        
                        return (
                            <motion.div
                                key={zone.id}
                                className={zoneClasses}
                                style={{
                                    position: 'absolute',
                                    top: `${zone.globalCoordinates?.y || 0}px`,
                                    left: `${zone.globalCoordinates?.x || 0}px`,
                                    width: `${zone.iconWidth || 100}px`, // Размеры из данных (как в код1)
                                    height: `${zone.iconHeight || 80}px`,
                                }}
                                onClick={() => handleZoneClick(zone)}
                                title={zone.name}
                                whileHover={{ scale: 1.1, zIndex: 10 }} // zIndex из код1
                                whileTap={{ scale: 0.95 }}
                            >
                                <img src={zone.globalImage || '/assets/icons/default_zone_icon.png'} alt={zone.name} className="zone-image" />
                                <span className="zone-label">{zone.name}</span>
                                {/* Иконки замка и статуса, если нужны, можно добавить здесь */}
                                {/* {!zone.isImplemented && <div className="zone-status-label">В разработке</div>} */}
                                {/* {isZoneLocked(zone) && zone.isImplemented && <div className="zone-lock-icon">🔒</div>} */}
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </motion.div>
    );
};

export default GlobalMap;