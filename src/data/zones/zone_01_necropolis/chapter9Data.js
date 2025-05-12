const chapterData = {
    id: 9,
    name: "Сердце Некрополя",
    image: "/assets/zones/necropolis/chapter9.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: 0, y: -400 },

    levels: [
        {
            id: 901,
            name: "Последний Рубеж",
            x: 100, y: 650, nodeSize: 40,
            description: "Путь к сердцу Некрополя почти открыт. Опасности здесь достигают своего апогея.",
            requiredPowerLevel: 101500,
            imageBanner: "/assets/ui/banners/level_banner_final_frontier.png"
        },
        {
            id: 902,
            name: "Река Забытых Душ",
            x: 250, y: 750, nodeSize: 40,
            description: "Река, текущая сквозь Некрополь, уносящая с собой души, так и не нашедшие покоя.",
            requiredPowerLevel: 102800,
            imageBanner: "/assets/ui/banners/level_banner_river_of_forgotten_souls.png"
        },
        {
            id: 903,
            name: "Мост Костей Дракона",
            x: 400, y: 900, nodeSize: 45,
            description: "Гигантский мост, сложенный из костей древнего дракона, служившего Некрополю.",
            requiredPowerLevel: 104300,
            imageBanner: "/assets/ui/banners/level_banner_dragon_bone_bridge.png"
        },
        {
            id: 904,
            name: "Башня Повелителя Личей",
            x: 280, y: 480, nodeSize: 40,
            description: "Цитадель могущественного лича, одного из главных столпов власти Некрополя.",
            requiredPowerLevel: 106000,
            imageBanner: "/assets/ui/banners/level_banner_lich_lord_tower.png"
        },
        {
            id: 905,
            name: "Кузница Мертвых",
            x: 550, y: 520, nodeSize: 40,
            description: "Здесь создается оружие и доспехи для армий нежити, охраняющих Некрополь.",
            requiredPowerLevel: 107800,
            imageBanner: "/assets/ui/banners/level_banner_forge_of_the_dead.png"
        },
        {
            id: 906,
            name: "Сады Вечного Увядания",
            x: 700, y: 680, nodeSize: 40,
            description: "Мрачные сады, где цветы источают яд, а деревья тянут свои костлявые ветви к живым.",
            requiredPowerLevel: 109700,
            imageBanner: "/assets/ui/banners/level_banner_gardens_of_eternal_withering.png"
        },
        {
            id: 907,
            name: "Некропольский Колизей",
            x: 850, y: 580, nodeSize: 45,
            description: "Арена, где сильнейшие воины нежити сражаются за право служить владыке Некрополя.",
            requiredPowerLevel: 111700,
            imageBanner: "/assets/ui/banners/level_banner_necropolis_coliseum.png"
        },
        {
            id: 908,
            name: "Капище Первородной Тьмы",
            x: 650, y: 350, nodeSize: 40,
            description: "Место, где концентрируется сама суть тьмы, питающая Некрополь.",
            requiredPowerLevel: 113800,
            imageBanner: "/assets/ui/banners/level_banner_shrine_of_primordial_darkness.png"
        },
        {
            id: 909,
            name: "Цитадель Владыки Некрополя",
            x: 800, y: 200, nodeSize: 45,
            description: "Последняя твердыня перед встречей с тем, кто правит этим царством смерти.",
            requiredPowerLevel: 116000,
            imageBanner: "/assets/ui/banners/level_banner_necropolis_lord_citadel.png"
        },
        {
            id: 910,
            name: "Тронный Зал Аидаса, Владыки Мертвых",
            x: 500, y: 100, nodeSize: 55, // Финальный босс
            description: "Источник всей нежити и проклятий Некрополя. Сражение с ним определит судьбу этих земель.",
            requiredPowerLevel: 118300,
            imageBanner: "/assets/ui/banners/level_banner_aidas_throne_room.png"
        },
    ]
};

export default chapterData;