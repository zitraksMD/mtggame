const chapterData = {
    id: 14,
    name: "Кузницы Хаоса",
    image: "/assets/zones/infernal_chaos/chapter14.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -150, y: -200 },

    levels: [
        {
            id: 1401,
            name: "Дорога Черного Дыма",
            x: 80, y: 680, nodeSize: 40,
            description: "Путь к кузницам окутан едким дымом, а земля усеяна шлаком и обломками неудачных творений.",
            requiredPowerLevel: 88000,
            imageBanner: "/assets/ui/banners/level_banner_black_smoke_road.png"
        },
        {
            id: 1402,
            name: "Залы Вечного Огня",
            x: 200, y: 750, nodeSize: 40,
            description: "Здесь в гигантских печах неугасимо горит адское пламя, необходимое для ковки.",
            requiredPowerLevel: 92500,
            imageBanner: "/assets/ui/banners/level_banner_eternal_fire_halls.png"
        },
        {
            id: 1403,
            name: "Цех Демонических Механизмов",
            x: 350, y: 650, nodeSize: 45,
            description: "Место сборки ужасающих осадных машин и боевых конструктов Хаоса.",
            requiredPowerLevel: 97000,
            imageBanner: "/assets/ui/banners/level_banner_demon_engine_workshop.png"
        },
        {
            id: 1404,
            name: "Склад Проклятого Металла",
            x: 250, y: 550, nodeSize: 40,
            description: "Здесь хранятся слитки металла, добытого из самых глубин ада и пропитанного чистой злобой.",
            requiredPowerLevel: 102000,
            imageBanner: "/assets/ui/banners/level_banner_cursed_metal_storage.png"
        },
        {
            id: 1405,
            name: "Камеры Закалки Душ",
            x: 480, y: 500, nodeSize: 40,
            description: "Ужасное место, где души используют для закалки демонического оружия, вселяя в него частицу их страданий.",
            requiredPowerLevel: 107500,
            imageBanner: "/assets/ui/banners/level_banner_soul_tempering_chambers.png"
        },
        {
            id: 1406,
            name: "Лаборатория Адских Алхимиков",
            x: 650, y: 600, nodeSize: 45,
            description: "Здесь безумные демоны-алхимики создают яды, взрывчатые вещества и другие мерзости.",
            requiredPowerLevel: 113000,
            imageBanner: "/assets/ui/banners/level_banner_infernal_alchemy_lab.png"
        },
        {
            id: 1407,
            name: "Конвейер Боли",
            x: 780, y: 700, nodeSize: 40,
            description: "Бесконечная линия, где рабов-демонов заставляют трудиться до полного изнеможения.",
            requiredPowerLevel: 119000,
            imageBanner: "/assets/ui/banners/level_banner_pain_conveyor.png"
        },
        {
            id: 1408,
            name: "Испытательный Полигон",
            x: 900, y: 550, nodeSize: 40,
            description: "Место, где испытывают новосозданное оружие и боевые машины на живых мишенях.",
            requiredPowerLevel: 125000,
            imageBanner: "/assets/ui/banners/level_banner_testing_grounds.png"
        },
        {
            id: 1409,
            name: "Литейная Ненависти",
            x: 700, y: 400, nodeSize: 40,
            description: "Сердце кузниц, где жидкая ненависть обретает форму под ударами гигантских молотов.",
            requiredPowerLevel: 132000,
            imageBanner: "/assets/ui/banners/level_banner_hate_foundry.png"
        },
        {
            id: 1410,
            name: "Верховный Кузнец Хаоса",
            x: 850, y: 250, nodeSize: 50, // Босс главы 4
            description: "Древний демон-мастер, чьи руки создали самые смертоносные артефакты Инферно.",
            requiredPowerLevel: 140000,
            imageBanner: "/assets/ui/banners/level_banner_chaos_master_smith.png"
        },
    ]
};

export default chapterData;