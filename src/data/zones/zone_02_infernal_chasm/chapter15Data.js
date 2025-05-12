const chapterData = {
    id: 15,
    name: "Бастионы Падших Лордов",
    image: "/assets/zones/infernal_chaos/chapter15.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -50, y: -350 },

    levels: [
        {
            id: 1501,
            name: "Предгорья Отчаяния",
            x: 150, y: 720, nodeSize: 40,
            description: "Склоны, ведущие к цитаделям демонических генералов, усеяны костями тех, кто пытался их штурмовать.",
            requiredPowerLevel: 145000,
            imageBanner: "/assets/ui/banners/level_banner_despair_foothills.png"
        },
        {
            id: 1502,
            name: "Крепость Кровавого Кулака",
            x: 300, y: 650, nodeSize: 45,
            description: "Цитадель безжалостного военачальника, известного своей жестокостью и любовью к ближнему бою.",
            requiredPowerLevel: 152000,
            imageBanner: "/assets/ui/banners/level_banner_bloodfist_stronghold.png"
        },
        {
            id: 1503,
            name: "Башня Шепчущей Тьмы",
            x: 200, y: 530, nodeSize: 40,
            description: "Обитель демона-интригана, мастера обмана и ментальных атак. Его нашептывания сводят с ума.",
            requiredPowerLevel: 160000,
            imageBanner: "/assets/ui/banners/level_banner_whispering_dark_tower.png"
        },
        {
            id: 1504,
            name: "Каменный Двор Гнева",
            x: 420, y: 580, nodeSize: 40,
            description: "Внутренний двор цитадели, где тренируются элитные демонические воины под командованием Лорда Гнева.",
            requiredPowerLevel: 168000,
            imageBanner: "/assets/ui/banners/level_banner_stonecourt_of_wrath.png"
        },
        {
            id: 1505,
            name: "Арсенал Забытых Проклятий",
            x: 580, y: 700, nodeSize: 40,
            description: "Хранилище древних проклятых артефактов, собранных падшими лордами за тысячелетия войн.",
            requiredPowerLevel: 177000,
            imageBanner: "/assets/ui/banners/level_banner_forgotten_curses_armory.png"
        },
        {
            id: 1506,
            name: "Тронный Зал Лорда Боли",
            x: 700, y: 1500, nodeSize: 45,
            description: "Покои одного из самых садистских демонических лордов, чья власть построена на причинении страданий.",
            requiredPowerLevel: 186000,
            imageBanner: "/assets/ui/banners/level_banner_pain_lord_throne_room.png"
        },
        {
            id: 1507,
            name: "Обсидиановые Шпили Презрения",
            x: 850, y: 620, nodeSize: 40,
            description: "Высокие шпили, с которых Лорд Презрения взирает на своих врагов, источая волны чистой ненависти.",
            requiredPowerLevel: 195000,
            imageBanner: "/assets/ui/banners/level_banner_obsidian_spires_contempt.png"
        },
        {
            id: 1508,
            name: "Катакомбы Падших Героев",
            x: 600, y: 380, nodeSize: 40,
            description: "Под бастионами лежат тела героев, павших в битвах с лордами и обращенных в нежить для вечной службы.",
            requiredPowerLevel: 205000,
            imageBanner: "/assets/ui/banners/level_banner_fallen_heroes_catacombs.png"
        },
        {
            id: 1509,
            name: "Святилище Нечестивого Союза",
            x: 780, y: 280, nodeSize: 40,
            description: "Место, где падшие лорды заключают свои темные сделки и приносят жертвы Хаосу.",
            requiredPowerLevel: 215000,
            imageBanner: "/assets/ui/banners/level_banner_unholy_alliance_shrine.png"
        },
        {
            id: 1510,
            name: "Совет Падших Лордов",
            x: 900, y: 150, nodeSize: 50, // Босс главы 5
            description: "Собрание нескольких могущественных демонических лордов, объединивших силы против любого вторженца.",
            requiredPowerLevel: 230000,
            imageBanner: "/assets/ui/banners/level_banner_council_of_fallen_lords.png"
        },
    ]
};

export default chapterData;