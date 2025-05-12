// src/data/worldMapData.js
import { zoneInfo as necropolisZoneData } from './zones/zone_01_necropolis/zoneData.js';
import { zoneInfo as infernalChasmZoneData } from './zones/zone_02_infernal_chasm/zoneData.js';
// ... импорты zoneInfo для остальных зон

export const ALL_ZONES_CONFIG = [
    necropolisZoneData,   // Содержит id, name, description, startChapterId, globalCoordinates, globalImage и т.д.
    infernalChasmZoneData,
    // ...
];

// Хелперы
export const getZoneConfigById = (zoneId) => ALL_ZONES_CONFIG.find(zone => zone.id === zoneId);

// Эта функция может больше не понадобиться здесь, если ZoneMap.jsx будет динамически импортировать свой chaptersInZone
// export const getChaptersForZoneConfig = (zoneId) => { ... };

export const findZoneIdForChapter = (chapterId) => {
    // Предполагаем, что главы 1-10 в зоне 1, 11-20 в зоне 2 и т.д.
    // Это нужно будет адаптировать под вашу реальную нумерацию глав.
    if (chapterId >= 1 && chapterId <= 10) return 'zone_01_necropolis';
    if (chapterId >= 11 && chapterId <= 20) return 'zone_02_infernal_chasm';
    // ...
    return ALL_ZONES_CONFIG[0]?.id || null; // Первая зона по умолчанию
};