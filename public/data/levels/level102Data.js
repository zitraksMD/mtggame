// src/data/chapters/chapter2Level5Data.js
export default {
    id: 205,
    name: "Ур. 2-5: Арена Титанов",
    levelType: 'boss_rush', // <<< Тип уровня
    width: 1000, height: 800,
    backgroundTexture: "/assets/arena_floor.png",
    playerStart: { x: 0, y: 100 },
    layers: [ { name: "Walls", objects: [/* ...стены арены... */] } ], // Только стены
    // VVV Последовательность боссов VVV
    bossSequence: [
        { bossType: 'rock_elemental', spawnX: 0, spawnY: 500, healthMultiplier: 1.0, reward: {gold: 100} },
        { bossType: 'ice_golem', spawnX: 0, spawnY: 500, healthMultiplier: 1.2, reward: {diamonds: 50} },
        // ... другие боссы ...
    ],
    winCondition: { type: 'defeat_all_bosses' } // <<< Новое условие победы
};