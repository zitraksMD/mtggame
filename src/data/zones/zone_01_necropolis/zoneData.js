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

// Размеры острова и карты (из комментариев в код1)
const CHAPTER_ISLAND_WIDTH = 220;
const CHAPTER_ISLAND_HEIGHT = 160;
const ZONE_MAP_BACKGROUND_WIDTH = 1620;
const ZONE_MAP_BACKGROUND_HEIGHT = 850;

// Вариант 3: Более широкое использование пространства (из код1)
// Карта 1620x850. Остров 220x160.
const offsetX = 50; // отступ от края карты
const offsetY = 50;

// Ширина для 4х колонок (с учетом центра острова)
const colWidth = (ZONE_MAP_BACKGROUND_WIDTH - 2 * offsetX) / 4;
// Высота для 3х рядов
const rowHeight = (ZONE_MAP_BACKGROUND_HEIGHT - 2 * offsetY) / 3;

const chaptersInZone_final = [
    // Ряд 1 (центрируем 4 острова)
    { chapterId: 1, data: chapter1, nameOnMap: chapter1.name, displayCoordinates: { x: offsetX + colWidth * 0.5 - CHAPTER_ISLAND_WIDTH / 2, y: offsetY + rowHeight * 0.5 - CHAPTER_ISLAND_HEIGHT / 2 } },
    { chapterId: 2, data: chapter2, nameOnMap: chapter2.name, displayCoordinates: { x: offsetX + colWidth * 1.5 - CHAPTER_ISLAND_WIDTH / 2, y: offsetY + rowHeight * 0.5 - CHAPTER_ISLAND_HEIGHT / 2 } },
    { chapterId: 3, data: chapter3, nameOnMap: chapter3.name, displayCoordinates: { x: offsetX + colWidth * 2.5 - CHAPTER_ISLAND_WIDTH / 2, y: offsetY + rowHeight * 0.5 - CHAPTER_ISLAND_HEIGHT / 2 } },
    { chapterId: 4, data: chapter4, nameOnMap: chapter4.name, displayCoordinates: { x: offsetX + colWidth * 3.5 - CHAPTER_ISLAND_WIDTH / 2, y: offsetY + rowHeight * 0.5 - CHAPTER_ISLAND_HEIGHT / 2 } },

    // Ряд 2 (центрируем 3 острова, можно со смещением для "пути")
    { chapterId: 5, data: chapter5, nameOnMap: chapter5.name, displayCoordinates: { x: offsetX + colWidth * 1.0 - CHAPTER_ISLAND_WIDTH / 2, y: offsetY + rowHeight * 1.5 - CHAPTER_ISLAND_HEIGHT / 2 } }, // Сдвинут левее
    { chapterId: 6, data: chapter6, nameOnMap: chapter6.name, displayCoordinates: { x: offsetX + colWidth * 2.0 - CHAPTER_ISLAND_WIDTH / 2, y: offsetY + rowHeight * 1.5 - CHAPTER_ISLAND_HEIGHT / 2 } }, // По центру
    { chapterId: 7, data: chapter7, nameOnMap: chapter7.name, displayCoordinates: { x: offsetX + colWidth * 3.0 - CHAPTER_ISLAND_WIDTH / 2, y: offsetY + rowHeight * 1.5 - CHAPTER_ISLAND_HEIGHT / 2 } }, // Сдвинут правее

    // Ряд 3 (центрируем 3 острова)
    { chapterId: 8, data: chapter8, nameOnMap: chapter8.name, displayCoordinates: { x: offsetX + colWidth * 1.0 - CHAPTER_ISLAND_WIDTH / 2, y: offsetY + rowHeight * 2.5 - CHAPTER_ISLAND_HEIGHT / 2 } },
    { chapterId: 9, data: chapter9, nameOnMap: chapter9.name, displayCoordinates: { x: offsetX + colWidth * 2.0 - CHAPTER_ISLAND_WIDTH / 2, y: offsetY + rowHeight * 2.5 - CHAPTER_ISLAND_HEIGHT / 2 } },
    { chapterId: 10, data: chapter10, nameOnMap: chapter10.name, displayCoordinates: { x: offsetX + colWidth * 3.0 - CHAPTER_ISLAND_WIDTH / 2, y: offsetY + rowHeight * 2.5 - CHAPTER_ISLAND_HEIGHT / 2 }, isZoneBossChapter: true },
];

// Экспортируем обновленный массив глав
export const chaptersInZone = chaptersInZone_final;