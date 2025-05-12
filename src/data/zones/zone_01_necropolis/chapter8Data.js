const chapterData = {
    id: 8,
    name: "Гробница Вечной Ночи",
    image: "/assets/zones/necropolis/chapter8.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -50, y: -350 },

    levels: [
        {
            id: 801,
            name: "Печать Мрака",
            x: 150, y: 720, nodeSize: 40,
            description: "Древняя печать, сдерживающая силы, заключенные в гробнице. Она слабеет с каждым днем.",
            requiredPowerLevel: 17000,
            imageBanner: "/assets/ui/banners/level_banner_seal_of_darkness.png"
        },
        {
            id: 802,
            name: "Преддверие Вечной Ночи",
            x: 300, y: 650, nodeSize: 40,
            description: "Здесь свет не проникает, а тьма кажется осязаемой. Лишь самые отважные решатся идти дальше.",
            requiredPowerLevel: 17800,
            imageBanner: "/assets/ui/banners/level_banner_eternal_night_antechamber.png"
        },
        {
            id: 803,
            name: "Залы Спящих Ужасов",
            x: 200, y: 530, nodeSize: 45,
            description: "В этих залах дремлют кошмары, которые лучше не будить. Каждый шорох может стать последним.",
            requiredPowerLevel: 18800,
            imageBanner: "/assets/ui/banners/level_banner_halls_of_sleeping_horrors.png"
        },
        {
            id: 804,
            name: "Хрустальные Пещеры Теней",
            x: 420, y: 580, nodeSize: 40,
            description: "Кристаллы здесь поглощают свет, создавая причудливые игры теней, которые могут свести с ума.",
            requiredPowerLevel: 19900,
            imageBanner: "/assets/ui/banners/level_banner_crystal_shadow_caves.png"
        },
        {
            id: 805,
            name: "Святилище Лунного Затмения",
            x: 580, y: 700, nodeSize: 40,
            description: "Место, где вечно царит лунное затмение, наделяя его обитателей особой силой.",
            requiredPowerLevel: 21000,
            imageBanner: "/assets/ui/banners/level_banner_lunar_eclipse_shrine.png"
        },
        {
            id: 806,
            name: "Усыпальница Звездного Странника",
            x: 700, y: 500, nodeSize: 45,
            description: "Гробница сущности, пришедшей из далеких звезд и нашедшей свой конец в этой вечной ночи.",
            requiredPowerLevel: 22500,
            imageBanner: "/assets/ui/banners/level_banner_star_wanderer_tomb.png"
        },
        {
            id: 807,
            name: "Покои Повелителя Снов",
            x: 850, y: 620, nodeSize: 40,
            description: "Здесь реальность переплетается со сном, и не всегда можно понять, где заканчивается одно и начинается другое.",
            requiredPowerLevel: 24000,
            imageBanner: "/assets/ui/banners/level_banner_dream_lord_chambers.png"
        },
        {
            id: 808,
            name: "Обсидиановый Трон",
            x: 600, y: 380, nodeSize: 40,
            description: "Трон, высеченный из чистого обсидиана, источает ауру древней и могущественной тьмы.",
            requiredPowerLevel: 25800,
            imageBanner: "/assets/ui/banners/level_banner_obsidian_throne.png"
        },
        {
            id: 809,
            name: "Внутренний Круг Тьмы",
            x: 780, y: 280, nodeSize: 40,
            description: "Самая глубокая часть гробницы, где концентрация темной энергии достигает своего пика.",
            requiredPowerLevel: 27500,
            imageBanner: "/assets/ui/banners/level_banner_inner_circle_of_darkness.png"
        },
        {
            id: 810,
            name: "Хранитель Вечной Ночи",
            x: 900, y: 150, nodeSize: 50, // Босс главы
            description: "Древнее существо, обреченное вечно сторожить эту гробницу и поглощать любой свет.",
            requiredPowerLevel: 30000,
            imageBanner: "/assets/ui/banners/level_banner_eternal_night_keeper.png"
        },
    ]
};

export default chapterData;