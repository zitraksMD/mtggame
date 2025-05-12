const chapterData = {
    id: 11, // Первая глава зоны "Инфернальный Хаос"
    name: "Преддверие Ада",
    image: "/assets/zones/infernal_chaos/chapter11.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -50, y: -200 },

    levels: [
        {
            id: 1101, // Уровни для главы 1 начинаются с 101
            name: "Выжженные Равнины",
            x: 150, y: 750, nodeSize: 40,
            description: "Земля здесь растрескалась и дымится, воздух пропитан запахом серы. Первые слуги Хаоса уже чуют твое приближение.",
            requiredPowerLevel: 5000,
            imageBanner: "/assets/ui/banners/level_banner_scorched_plains.png"
        },
        {
            id: 1102,
            name: "Врата Обреченности",
            x: 280, y: 680, nodeSize: 40,
            description: "Огромные базальтовые врата, украшенные страдающими душами. За ними начинается истинное безумие.",
            requiredPowerLevel: 5800,
            imageBanner: "/assets/ui/banners/level_banner_gates_of_doom.png"
        },
        {
            id: 1103,
            name: "Тропа Стенаний",
            x: 400, y: 600, nodeSize: 40,
            description: "Узкая тропа, вьющаяся меж скал, откуда доносятся бесконечные стоны и вопли проклятых.",
            requiredPowerLevel: 6700,
            imageBanner: "/assets/ui/banners/level_banner_path_of_wails.png"
        },
        {
            id: 1104,
            name: "Логово Огненных Бесов",
            x: 250, y: 480, nodeSize: 40,
            description: "Кишащая мелкими, но злобными огненными бесами пещера. Они быстры и многочисленны.",
            requiredPowerLevel: 7800,
            imageBanner: "/assets/ui/banners/level_banner_imp_lair.png"
        },
        {
            id: 1105,
            name: "Разрушенный Караульный Пост",
            x: 520, y: 520, nodeSize: 40,
            description: "Когда-то здесь стояла стража, но теперь лишь обугленные руины и неупокоенные духи охранников.",
            requiredPowerLevel: 9000,
            imageBanner: "/assets/ui/banners/level_banner_ruined_outpost.png"
        },
        {
            id: 1106,
            name: "Кровавые Холмы",
            x: 650, y: 650, nodeSize: 40,
            description: "Земля здесь пропитана кровью павших в бесконечных битвах Хаоса. Ходят слухи о скрытых под ними катакомбах.",
            requiredPowerLevel: 10500,
            imageBanner: "/assets/ui/banners/level_banner_blood_hills.png"
        },
        {
            id: 1107,
            name: "Ущелье Отчаяния",
            x: 780, y: 550, nodeSize: 40,
            description: "Глубокое ущелье, где эхо усиливает крики отчаяния доводя до безумия неосторожных путников.",
            requiredPowerLevel: 12000,
            imageBanner: "/assets/ui/banners/level_banner_despair_gorge.png"
        },
        {
            id: 1108,
            name: "Аванпост Пожирателей Душ",
            x: 900, y: 420, nodeSize: 45,
            description: "Укрепленный пункт, где демоны-пожиратели собирают свою жуткую жатву.",
            requiredPowerLevel: 13800,
            imageBanner: "/assets/ui/banners/level_banner_soul_eater_outpost.png"
        },
        {
            id: 1109,
            name: "Предвестник Боли",
            x: 700, y: 300, nodeSize: 40,
            description: "Место обитания младшего демона, чья задача – испытывать новоприбывших на прочность.",
            requiredPowerLevel: 15500,
            imageBanner: "/assets/ui/banners/level_banner_pain_harbinger.png"
        },
        {
            id: 1110,
            name: "Страж Врат Ада",
            x: 850, y: 180, nodeSize: 50, // Босс главы 1
            description: "Первый серьезный противник – могучий демон, охраняющий проход в более глубокие слои Инфернального Хаоса.",
            requiredPowerLevel: 18000,
            imageBanner: "/assets/ui/banners/level_banner_hellgate_warden.png"
        },
    ]
};

export default chapterData;