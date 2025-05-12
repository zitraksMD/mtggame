const chapterData = {
    id: 12,
    name: "Реки Горящей Серы",
    image: "/assets/zones/infernal_chaos/chapter12.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -100, y: -250 },

    levels: [
        {
            id: 1201,
            name: "Серные Берега",
            x: 100, y: 700, nodeSize: 40,
            description: "Зловонные берега, где кипящая сера пузырится и выплескивается, обжигая все живое и неживое.",
            requiredPowerLevel: 19000,
            imageBanner: "/assets/ui/banners/level_banner_sulfur_shores.png"
        },
        {
            id: 1202,
            name: "Лавовые Водопады",
            x: 220, y: 630, nodeSize: 40,
            description: "Каскады расплавленной породы обрушиваются вниз, создавая смертельно опасные преграды.",
            requiredPowerLevel: 21500,
            imageBanner: "/assets/ui/banners/level_banner_lava_falls.png"
        },
        {
            id: 1203,
            name: "Мост из Обсидиана",
            x: 350, y: 720, nodeSize: 45,
            description: "Тонкий и хрупкий мост из застывшей лавы над кипящей рекой. Обитающие здесь твари обожают засады.",
            requiredPowerLevel: 23000,
            imageBanner: "/assets/ui/banners/level_banner_obsidian_bridge.png"
        },
        {
            id: 1204,
            name: "Пещеры Огненных Элементалей",
            x: 480, y: 600, nodeSize: 40,
            description: "Жаркие пещеры, где обитают духи чистого пламени, враждебные ко всему, что не горит.",
            requiredPowerLevel: 25500,
            imageBanner: "/assets/ui/banners/level_banner_fire_elemental_caves.png"
        },
        {
            id: 1205,
            name: "Острова Застывшего Пепла",
            x: 300, y: 500, nodeSize: 40,
            description: "Небольшие участки суши посреди серных рек, покрытые толстым слоем ядовитого пепла.",
            requiredPowerLevel: 28000,
            imageBanner: "/assets/ui/banners/level_banner_ash_isles.png"
        },
        {
            id: 1206,
            name: "Проклятые Топи",
            x: 600, y: 520, nodeSize: 40,
            description: "Вязкие болота из кипящей грязи и серы, где каждый шаг может стать последним.",
            requiredPowerLevel: 30500,
            imageBanner: "/assets/ui/banners/level_banner_cursed_mires.png"
        },
        {
            id: 1207,
            name: "Гейзеры Ненависти",
            x: 750, y: 650, nodeSize: 40,
            description: "Из-под земли вырываются столбы обжигающего пара и концентрированной злобы.",
            requiredPowerLevel: 33000,
            imageBanner: "/assets/ui/banners/level_banner_hate_geysers.png"
        },
        {
            id: 1208,
            name: "Застава Адских Гончих",
            x: 880, y: 450, nodeSize: 45,
            description: "Здесь обитают стаи свирепых адских гончих, выслеживающих заблудшие души.",
            requiredPowerLevel: 36000,
            imageBanner: "/assets/ui/banners/level_banner_hellhound_outpost.png"
        },
        {
            id: 1209,
            name: "Сердце Вулкана",
            x: 650, y: 350, nodeSize: 40,
            description: "Самое пекло этого региона, где температура достигает немыслимых пределов.",
            requiredPowerLevel: 39000,
            imageBanner: "/assets/ui/banners/level_banner_volcano_heart.png"
        },
        {
            id: 1210,
            name: "Барон Пепла и Пламени",
            x: 800, y: 220, nodeSize: 50, // Босс главы 2
            description: "Могущественный демон, повелевающий огнем и серой в этих землях. Его гнев подобен извержению вулкана.",
            requiredPowerLevel: 43000,
            imageBanner: "/assets/ui/banners/level_banner_ashflame_baron.png"
        },
    ]
};

export default chapterData;