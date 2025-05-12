const chapterData = {
    id: 19,
    name: "Трон Инфернального Владыки",
    image: "/assets/zones/infernal_chaos/chapter19.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -50, y: -350 },

    levels: [
        {
            id: 1901,
            name: "Последний Подъем",
            x: 150, y: 720, nodeSize: 40,
            description: "Путь к трону усеян самыми могущественными воинами и ловушками Инфернального Владыки.",
            requiredPowerLevel: 770000,
            imageBanner: "/assets/ui/banners/level_banner_final_ascent.png"
        },
        {
            id: 1902,
            name: "Залы Элитной Гвардии",
            x: 300, y: 650, nodeSize: 45,
            description: "Здесь несут службу личные телохранители Владыки – демоны невероятной силы и преданности.",
            requiredPowerLevel: 800000,
            imageBanner: "/assets/ui/banners/level_banner_elite_guard_halls.png"
        },
        {
            id: 1903,
            name: "Сокровищница Проклятий",
            x: 200, y: 530, nodeSize: 40,
            description: "Личная коллекция самых мощных проклятых артефактов и реликвий Инфернального Владыки.",
            requiredPowerLevel: 835000,
            imageBanner: "/assets/ui/banners/level_banner_curses_treasury.png"
        },
        {
            id: 1904,
            name: "Башня Нечестивых Ритуалов",
            x: 420, y: 580, nodeSize: 40,
            description: "Место, где Владыка проводит свои самые темные ритуалы, черпая силу из страданий и смерти.",
            requiredPowerLevel: 870000,
            imageBanner: "/assets/ui/banners/level_banner_unholy_rituals_tower.png"
        },
        {
            id: 1905,
            name: "Приемные Покои Отчаяния",
            x: 580, y: 700, nodeSize: 40,
            description: "Здесь Владыка принимает своих самых верных слуг и выслушивает доклады о завоеваниях Хаоса.",
            requiredPowerLevel: 910000,
            imageBanner: "/assets/ui/banners/level_banner_despair_audience_chamber.png"
        },
        {
            id: 1906,
            name: "Балкон Вечного Заката",
            x: 700, y: 500, nodeSize: 45,
            description: "С этого балкона Владыка взирает на свои владения, купающиеся в багровом свете вечного адского заката.",
            requiredPowerLevel: 950000,
            imageBanner: "/assets/ui/banners/level_banner_eternal_sunset_balcony.png"
        },
        {
            id: 1907,
            name: "Внутреннее Святилище Владыки",
            x: 850, y: 620, nodeSize: 40,
            description: "Самое сокровенное место в цитадели, куда доступ имеют лишь единицы.",
            requiredPowerLevel: 995000,
            imageBanner: "/assets/ui/banners/level_banner_overlord_inner_sanctum.png"
        },
        {
            id: 1908,
            name: "Коридор Предков Хаоса",
            x: 600, y: 380, nodeSize: 40,
            description: "Украшен статуями и реликвиями предыдущих Владык Хаоса, чья сила все еще ощущается здесь.",
            requiredPowerLevel: 1040000,
            imageBanner: "/assets/ui/banners/level_banner_chaos_ancestors_corridor.png"
        },
        {
            id: 1909,
            name: "Предтронье",
            x: 780, y: 280, nodeSize: 40,
            description: "Последнее пространство перед тронным залом, охраняемое самыми могущественными чемпионами Владыки.",
            requiredPowerLevel: 1090000,
            imageBanner: "/assets/ui/banners/level_banner_ante_throne_room.png"
        },
        {
            id: 1910,
            name: "Инфернальный Владыка Азморот",
            x: 900, y: 150, nodeSize: 55, // Босс главы 9
            description: "Правитель Инфернального Хаоса, воплощение разрушения и тирании. Его сила способна сотрясать миры.",
            requiredPowerLevel: 1150000,
            imageBanner: "/assets/ui/banners/level_banner_infernal_overlord_azmoroth.png"
        },
    ]
};

export default chapterData;