const chapterData = {
    id: 17,
    name: "Залы Вечного Наказания",
    image: "/assets/zones/infernal_chaos/chapter17.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -100, y: -250 },

    levels: [
        {
            id: 1701,
            name: "Долина Ледяного Огня",
            x: 100, y: 700, nodeSize: 40,
            description: "Место наказания предателей и клятвопреступников, где ледяное пламя обжигает хуже обычного.",
            requiredPowerLevel: 365000,
            imageBanner: "/assets/ui/banners/level_banner_ice_fire_valley.png"
        },
        {
            id: 1702,
            name: "Болота Вечной Жажды",
            x: 220, y: 630, nodeSize: 40,
            description: "Проклятые души здесь обречены на вечную жажду посреди гниющих, ядовитых вод.",
            requiredPowerLevel: 378000,
            imageBanner: "/assets/ui/banners/level_banner_eternal_thirst_swamps.png"
        },
        {
            id: 1703,
            name: "Лес Игл и Крючьев",
            x: 350, y: 720, nodeSize: 45,
            description: "Деревья в этом лесу усеяны острыми иглами и крючьями, терзающими плоть грешников.",
            requiredPowerLevel: 392000,
            imageBanner: "/assets/ui/banners/level_banner_needle_hook_forest.png"
        },
        {
            id: 1704,
            name: "Пустыня Стеклянных Осколков",
            x: 480, y: 600, nodeSize: 40,
            description: "Бескрайняя пустыня, где вместо песка – острые как бритва осколки стекла, раздирающие ноги.",
            requiredPowerLevel: 408000,
            imageBanner: "/assets/ui/banners/level_banner_glass_shard_desert.png"
        },
        {
            id: 1705,
            name: "Клетки Вечного Одиночества",
            x: 300, y: 500, nodeSize: 40,
            description: "Души, наказанные за эгоизм, заключены здесь в полной изоляции, медленно сходя с ума.",
            requiredPowerLevel: 425000,
            imageBanner: "/assets/ui/banners/level_banner_eternal_loneliness_cages.png"
        },
        {
            id: 1706,
            name: "Колесо Бесконечных Превращений",
            x: 600, y: 520, nodeSize: 40,
            description: "Гигантское колесо, вращающее души и подвергающее их мучительным трансформациям.",
            requiredPowerLevel: 440000,
            imageBanner: "/assets/ui/banners/level_banner_endless_transformation_wheel.png"
        },
        {
            id: 1707,
            name: "Гора Вечного Труда",
            x: 750, y: 650, nodeSize: 40,
            description: "Проклятые здесь обречены вечно катить в гору огромные валуны, которые срываются у самой вершины.",
            requiredPowerLevel: 458000,
            imageBanner: "/assets/ui/banners/level_banner_eternal_labor_mountain.png"
        },
        {
            id: 1708,
            name: "Амфитеатр Мучений",
            x: 880, y: 450, nodeSize: 45,
            description: "Здесь демоны наблюдают за изощренными пытками, устроенными для их развлечения.",
            requiredPowerLevel: 477000,
            imageBanner: "/assets/ui/banners/level_banner_torment_amphitheater.png"
        },
        {
            id: 1709,
            name: "Зал Судей Преисподней",
            x: 650, y: 350, nodeSize: 40,
            description: "Место, где могущественные демоны-судьи выносят свои вердикты и определяют меру наказания.",
            requiredPowerLevel: 498000,
            imageBanner: "/assets/ui/banners/level_banner_infernal_judges_hall.png"
        },
        {
            id: 1710,
            name: "Вершитель Правосудия Хаоса",
            x: 800, y: 220, nodeSize: 50, // Босс главы 7
            description: "Главный палач и исполнитель наказаний в этих залах, чья жестокость не знает границ.",
            requiredPowerLevel: 520000,
            imageBanner: "/assets/ui/banners/level_banner_chaos_justice_executor.png"
        },
    ]
};

export default chapterData;