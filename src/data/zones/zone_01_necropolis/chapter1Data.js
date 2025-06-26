// src/data/zones/zone_01_necropolis/chapter1Data.js

const chapterData = {
    id: 1,
    name: "Planet Python",
    image: "/assets/zones/necropolis/chapter1.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -50, y: -200 },

    levels: [
        {
            id: 101,
            name: "Python Module 1",
            x: 150, y: 750, nodeSize: 40,
            description: "Первый склеп на пути к древним захоронениям. Воздух здесь тяжел, а тишину нарушает лишь скрип костей.",
            requiredPowerLevel: 600,
            imageBanner: "/assets/ui/banners/level_banner_crypt1.png"
        },
        {
            id: 102,
            name: "Шепчущий Лес",
            x: 280, y: 680, nodeSize: 40,
            description: "Деревья здесь будто живые, их ветви тянутся к тебе, а в шелесте листвы слышатся зловещие предупреждения.",
            requiredPowerLevel: 700,
            imageBanner: "/assets/ui/banners/level_banner_whispering_woods.png"
        },
        {
            id: 103,
            name: "Кладбищенские Тропы",
            x: 400, y: 600, nodeSize: 40,
            description: "Извилистые тропы ведут вглубь старого кладбища. Будь начеку, здесь легко заблудиться и нарваться на неприятности.",
            requiredPowerLevel: 850,
            imageBanner: "/assets/ui/banners/level_banner_cemetery_paths.png"
        },
        {
            id: 104,
            name: "Разрушенная Часовня",
            x: 250, y: 480, nodeSize: 40,
            description: "Когда-то святое место, ныне оскверненное темными силами. Тени прошлого все еще бродят среди руин.",
            requiredPowerLevel: 1000,
            imageBanner: "/assets/ui/banners/level_banner_ruined_chapel.png"
        },
        {
            id: 105,
            name: "Усыпальница Падших",
            x: 520, y: 520, nodeSize: 40,
            description: "Здесь покоятся воины былых времен. Говорят, их дух все еще охраняет это место.",
            requiredPowerLevel: 1150,
            imageBanner: "/assets/ui/banners/level_banner_fallen_tomb.png"
        },
        {
            id: 106,
            name: "Топи Отчаяния",
            x: 650, y: 650, nodeSize: 40,
            description: "Зловонные болота, где каждый шаг может стать последним. Туман скрывает как сокровища, так и смертельные опасности.",
            requiredPowerLevel: 1300,
            imageBanner: "/assets/ui/banners/level_banner_despair_swamp.png"
        },
        {
            id: 107,
            name: "Заброшенная Шахта",
            x: 780, y: 550, nodeSize: 40,
            description: "Мрачные туннели, пронизывающие землю. Говорят, здесь обитает нечто, что не любит чужаков.",
            requiredPowerLevel: 1450,
            imageBanner: "/assets/ui/banners/level_banner_abandoned_mine.png"
        },
        {
            id: 108,
            name: "Логово Зверя",
            x: 900, y: 420, nodeSize: 45, // Немного больше, как предвестник босса
            description: "Пещера, от которой веет первобытным ужасом. Хозяин этого места не рад гостям.",
            requiredPowerLevel: 1600,
            imageBanner: "/assets/ui/banners/level_banner_beast_lair.png"
        },
        {
            id: 109,
            name: "Преддверие Проклятия",
            x: 700, y: 300, nodeSize: 40,
            description: "Последний рубеж перед сердцем тьмы. Здесь ощущается концентрация злой магии.",
            requiredPowerLevel: 1750,
            imageBanner: "/assets/ui/banners/level_banner_curse_antechamber.png"
        },
        {
            id: 110,
            name: "Алтарь Некроманта",
            x: 850, y: 180, nodeSize: 50, // Босс главы
            description: "Сердце тьмы этой главы. Могущественный некромант проводит здесь свои ритуалы.",
            requiredPowerLevel: 1900,
            imageBanner: "/assets/ui/banners/level_banner_necromancer_altar.png"
        },
    ]
};

export default chapterData;