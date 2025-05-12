const chapterData = {
    id: 13,
    name: "Город Цепей и Стенаний",
    image: "/assets/zones/infernal_chaos/chapter13.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: 0, y: -300 },

    levels: [
        {
            id: 1301,
            name: "Окраины Мучений",
            x: 120, y: 800, nodeSize: 40,
            description: "Подступы к демоническому городу, где звон цепей и крики жертв слышны задолго до его появления.",
            requiredPowerLevel: 45000,
            imageBanner: "/assets/ui/banners/level_banner_torment_outskirts.png"
        },
        {
            id: 1302,
            name: "Квартал Рабов",
            x: 250, y: 720, nodeSize: 40,
            description: "Здесь томятся бесчисленные души, обреченные на вечный труд и страдания под гнетом демонов.",
            requiredPowerLevel: 48500,
            imageBanner: "/assets/ui/banners/level_banner_slave_quarters.png"
        },
        {
            id: 1303,
            name: "Площадь Вечной Казни",
            x: 180, y: 600, nodeSize: 45,
            description: "Центральная площадь, где демоны устраивают показательные казни для устрашения непокорных.",
            requiredPowerLevel: 52000,
            imageBanner: "/assets/ui/banners/level_banner_execution_square.png"
        },
        {
            id: 1304,
            name: "Казематы Отчаяния",
            x:1380, y: 650, nodeSize: 40,
            description: "Мрачные тюрьмы, где содержатся особо важные или сопротивляющиеся пленники Хаоса.",
            requiredPowerLevel: 56000,
            imageBanner: "/assets/ui/banners/level_banner_despair_dungeons.png"
        },
        {
            id: 1305,
            name: "Арсенал Надсмотрщиков",
            x: 500, y: 750, nodeSize: 40,
            description: "Место, где хранятся орудия пыток и оружие демонов-надсмотрщиков.",
            requiredPowerLevel: 60000,
            imageBanner: "/assets/ui/banners/level_banner_overseer_armory.png"
        },
        {
            id: 1306,
            name: "Рынок Душ",
            x: 620, y: 600, nodeSize: 40,
            description: "Жуткий рынок, где демоны торгуют душами смертных, словно обычным товаром.",
            requiredPowerLevel: 64500,
            imageBanner: "/assets/ui/banners/level_banner_soul_market.png"
        },
        {
            id: 1307,
            name: "Башня Главного Палача",
            x: 450, y: 480, nodeSize: 40,
            description: "Обитель садиста-демона, ответственного за самые изощренные пытки в городе.",
            requiredPowerLevel: 69000,
            imageBanner: "/assets/ui/banners/level_banner_chief_torturer_tower.png"
        },
        {
            id: 1308,
            name: "Канализация Скорби",
            x: 750, y: 520, nodeSize: 45,
            description: "Под городом протекают реки слез и отчаяния, где обитают мутировавшие твари.",
            requiredPowerLevel: 74000,
            imageBanner: "/assets/ui/banners/level_banner_sorrow_sewers.png"
        },
        {
            id: 1309,
            name: "Цитадель Костяного Лорда",
            x: 850, y:1380, nodeSize: 40,
            description: "Крепость одного из могущественных демонов, управляющих этим городом страданий.",
            requiredPowerLevel: 79000,
            imageBanner: "/assets/ui/banners/level_banner_bone_lord_citadel.png"
        },
        {
            id: 1310,
            name: "Мэр Города Стенаний",
            x: 600, y: 250, nodeSize: 50, // Босс главы13
            description: "Жестокий демон-правитель, наслаждающийся каждым криком и стоном в своем адском городе.",
            requiredPowerLevel: 85000,
            imageBanner: "/assets/ui/banners/level_banner_wailing_city_mayor.png"
        },
    ]
};

export default chapterData;