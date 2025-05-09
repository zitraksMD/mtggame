// src/data/chapters/chapter1/chapter1Data.js

const chapterData = {
    id: 1,
    name: "Проклятые Земли", // Можно и название главы сделать более тематическим
    image: "/assets/chapter1.png", 
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -50, y: -200 },

    levels: [
        { 
            id: 101, 
            name: "Затхлый Склеп", // <<< НОВОЕ: Тематическое название
            x: 250, y: 500, nodeSize: 40, // Старые поля для карты остаются
            // --- НОВЫЕ ПОЛЯ ДЛЯ ПОПАПА ---
            description: "Первый склеп на пути к древним захоронениям. Воздух здесь тяжел, а тишину нарушает лишь скрип костей.",
            requiredPowerLevel: 10, // Пример требуемой силы
            imageBanner: "/assets/ui/banners/level_banner_crypt1.png" // Опциональный путь к картинке для баннера
            // -----------------------------
        },
        { 
            id: 102, 
            name: "Кладбищенские Тропы", // <<< Тематическое название
            x: 450, y: 580, nodeSize: 40,
            // --- НОВЫЕ ПОЛЯ ДЛЯ ПОПАПА ---
            description: "Извилистые тропы ведут вглубь старого кладбища. Будь начеку, здесь легко заблудиться и нарваться на неприятности.",
            requiredPowerLevel: 250,
            imageBanner: "/assets/ui/banners/level_banner_cemetery.png"
            // -----------------------------
        },
        { 
            id: 103, 
            name: "Усыпальница Падших", 
            x: 680, y: 620, nodeSize: 40,
            description: "Здесь покоятся воины былых времен. Говорят, их дух все еще охраняет это место.",
            requiredPowerLevel: 450,
            // imageBanner: "..."
        },
        // ... и так далее для остальных уровней (104-110) ...
        // Для каждого нужно придумать название, описание и требуемый PowerLevel
        { 
            id: 110, // Босс главы?
            name: "Алтарь Некроманта", 
            x: 850, y: 180, nodeSize: 50,
            description: "Сердце тьмы этой главы. Могущественный некромант проводит здесь свои ритуалы.",
            requiredPowerLevel: 1500,
            // imageBanner: "..."
        },
    ]
};

export default chapterData;