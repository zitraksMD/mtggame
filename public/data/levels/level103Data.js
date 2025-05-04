// src/data/chapters/chapter3Level2Data.js
export default {
    id: 302,
    name: "Ур. 3-2: Натиск",
    levelType: 'survival', // <<< Тип уровня
    width: 1500, height: 1500,
    backgroundTexture: "/assets/wasteland_floor.png",
    playerStart: { x: 0, y: 750 },
    layers: [ { name: "Walls", objects: [/* ...редкие препятствия... */] } ],
    survivalDuration: 120, // <<< Время выживания в секундах
    // VVV Описание волн VVV
    waves: [
        // Время (в секундах), тип врага, количество, точка спавна ('random_edge', 'corners', 'center', {x,y})
        { time: 0, enemies: [{ type: 'melee_fast', count: 5, spawnPoint: 'random_edge' }] },
        { time: 15, enemies: [{ type: 'melee_fast', count: 8, spawnPoint: 'random_edge' }, {type: 'ranged_weak', count: 3, spawnPoint: 'corners'}] },
        { time: 35, enemies: [{ type: 'melee_strong', count: 4, spawnPoint: 'random_edge' }, {type: 'mage_fire', count: 1, spawnPoint: 'center'}] },
        // ... больше волн ...
    ],
    winCondition: { type: 'survive_duration' } // <<< Новое условие победы
};