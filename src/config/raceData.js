// src/config/RaceSelection.js (Example path)

// Define base stats specific to each race
// These are the absolute starting values when this race is chosen.
export const RACES = [
    {
        id: 'pirate',
        name: 'Пират',
        description: 'Светлые воины небес, благословленные выносливостью и светом.',
        icon: '/assets/pirate-icon.png', // <<<--- УКАЖИ ПРАВИЛЬНЫЙ ПУТЬ
        backgroundUrl: '/assets/pirate-background.png', // <<<--- ADD THIS (Check path)
        bonusDescription: [
            '+20 Макс. HP',
            '+0.1 Регенерации HP/сек', // Пример
            'Светлая аура (визуал?)' // Пример
        ],
        initialStats: {
            hp: 120, // Повышенное HP
            attack: 9,
            attackSpeed: 1.0,
            speed: 3.0,
            crit: 5,
            doubleStrike: 2,
            skin: '/Models/pirate.glb' // Скин для этой расы
        }
    },
    {
        id: 'demon',
        name: 'Демон',
        description: 'Порождения хаоса, сильные в атаке и устойчивые к огню.',
        icon: '/assets/demon-icon.png', // <<<--- УКАЖИ ПРАВИЛЬНЫЙ ПУТЬ
        backgroundUrl: '/assets/demon-background.png',
        bonusDescription: [
            '+15% Урона',
            '+10% Сопротивления огню (Пример)',
            'Демонический облик'
        ],
        initialStats: {
            hp: 90,
            attack: 11, // Повышенная атака (уже учтен бонус 15% от базовых ~9.5?) или применяем множитель? Лучше задать явно.
            attackSpeed: 1.0,
            speed: 3.0,
            crit: 6, // Чуть выше
            doubleStrike: 4, // Небольшой шанс
            skin: '/Models/demon.glb' // Скин для этой расы
        }
    },
    {
        id: 'vampire',
        name: 'Вампир',
        description: 'Ловкие и быстрые дети леса, мастера скорости.',
        icon: '/assets/vampire-icon.png', // <<<--- УКАЖИ ПРАВИЛЬНЫЙ ПУТЬ
        backgroundUrl: '/assets/vampire-background.png',
        bonusDescription: [
            '+15% Скорости атаки',
            '+5% Скорости передвижения',
            'Эльфийская ловкость'
        ],
        initialStats: {
            hp: 100,
            attack: 10,
            attackSpeed: 1.15, // Повышенная скорость атаки
            speed: 3.0,      // Повышенная скорость движения
            crit: 5,
            doubleStrike: 3,
            skin: '/Models/vampire.glb' // Скин для этой расы
        }
    },
];

// Helper function to get race data by ID
export const getRaceDataById = (raceId) => {
    return RACES.find(race => race.id === raceId) || null;
};