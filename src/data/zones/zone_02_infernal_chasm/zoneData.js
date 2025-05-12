// src/data/zones/zone_02_infernal_chasm/zoneData.js
import chapter11 from './chapter11Data.js';
import chapter12 from './chapter12Data.js';
import chapter13 from './chapter13Data.js';
import chapter14 from './chapter14Data.js';
import chapter15 from './chapter15Data.js';
import chapter16 from './chapter16Data.js';
import chapter17 from './chapter17Data.js';
import chapter18 from './chapter18Data.js';
import chapter19 from './chapter19Data.js';
import chapter20 from './chapter20Data.js'; // Босс зоны

export const zoneInfo = {
    id: 'zone_02_infernal_chasm',
    name: 'Инфернальный Разлом',
    description: 'Выжженные земли и лавовые реки, где правят древние огненные сущности.',
    startChapterId: 11, // Первая глава этой зоны
    unlockCondition: { type: 'zone_completed', requiredZoneId: 'zone_01_necropolis' }, // Пример условия
    isImplemented: true, // Предположим, что эта зона теперь реализована
    // Координаты и иконка этой зоны НА КАРТЕ ЗЕМЛИ (GlobalMap)
    globalCoordinates: { x: 500, y: 250 }, // Пример
    globalImage: '/assets/zones/infernal_chasm.png', // Пример
};

export const chaptersInZone = [
    // Координаты displayCoordinates - для отображения на карте ЗОНЫ (ZoneMap.jsx)
    { chapterId: 11, data: chapter11, nameOnMap: chapter11.name, displayCoordinates: { x: 100, y: 450 } },
    { chapterId: 12, data: chapter12, nameOnMap: chapter12.name, displayCoordinates: { x: 250, y: 500 } },
    { chapterId: 13, data: chapter13, nameOnMap: chapter13.name, displayCoordinates: { x: 150, y: 350 } },
    { chapterId: 14, data: chapter14, nameOnMap: chapter14.name, displayCoordinates: { x: 300, y: 400 } },
    { chapterId: 15, data: chapter15, nameOnMap: chapter15.name, displayCoordinates: { x: 450, y: 350 } },
    { chapterId: 16, data: chapter16, nameOnMap: chapter16.name, displayCoordinates: { x: 200, y: 250 } },
    { chapterId: 17, data: chapter17, nameOnMap: chapter17.name, displayCoordinates: { x: 350, y: 200 } },
    { chapterId: 18, data: chapter18, nameOnMap: chapter18.name, displayCoordinates: { x: 500, y: 280 } },
    { chapterId: 19, data: chapter19, nameOnMap: chapter19.name, displayCoordinates: { x: 400, y: 150 } },
    { chapterId: 20, data: chapter20, nameOnMap: chapter20.name, displayCoordinates: { x: 600, y: 400 }, isZoneBossChapter: true },
];