// src/data/zones/zone_01_necropolis/zoneData.js
import chapter1 from './chapter1Data.js';
import chapter2 from './chapter2Data.js';
import chapter3 from './chapter3Data.js';
import chapter4 from './chapter4Data.js';
import chapter5 from './chapter5Data.js';
import chapter6 from './chapter6Data.js';
import chapter7 from './chapter7Data.js';
import chapter8 from './chapter8Data.js';
import chapter9 from './chapter9Data.js';
import chapter10 from './chapter10Data.js';


export const zoneInfo = {
    id: 'zone_01_necropolis',
    name: 'Некрополь Забвения',
    description: 'Древние гробницы и склепы, хранящие тайны ушедших эпох и остатки первых технологий.',
    startChapterId: 1,
    unlockCondition: null, // Первая зона
    isImplemented: true,
    globalCoordinates: { x: 100, y: 100 }, // Пример
    globalImage: '/assets/zones/necropolis.png', // Пример
};

export const chaptersInZone = [
    // Каждая глава имеет displayCoordinates для WorldMap (карты зоны)
    { chapterId: 1,  data: chapter1,  nameOnMap: chapter1.name,  displayCoordinates: { x: 100, y: 150 } },
    { chapterId: 2,  data: chapter2,  nameOnMap: chapter2.name,  displayCoordinates: { x: 250, y: 100 } },
    { chapterId: 3,  data: chapter3,  nameOnMap: chapter3.name,  displayCoordinates: { x: 150, y: 250 } },
    { chapterId: 4,  data: chapter4,  nameOnMap: chapter4.name,  displayCoordinates: { x: 300, y: 220 } },
    { chapterId: 5,  data: chapter5,  nameOnMap: chapter5.name,  displayCoordinates: { x: 200, y: 350 } },
    { chapterId: 6,  data: chapter6,  nameOnMap: chapter6.name,  displayCoordinates: { x: 350, y: 320 } },
    { chapterId: 7,  data: chapter7,  nameOnMap: chapter7.name,  displayCoordinates: { x: 280, y: 450 } },
    { chapterId: 8,  data: chapter8,  nameOnMap: chapter8.name,  displayCoordinates: { x: 420, y: 420 } },
    { chapterId: 9,  data: chapter9,  nameOnMap: chapter9.name,  displayCoordinates: { x: 350, y: 550 } },
    { chapterId: 10, data: chapter10, nameOnMap: chapter10.name, displayCoordinates: { x: 500, y: 500 }, isZoneBossChapter: true },
];