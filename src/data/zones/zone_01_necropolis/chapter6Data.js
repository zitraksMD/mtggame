const chapterData = {
    id: 6,
    name: "Катакомбы Плача",
    image: "/assets/zones/necropolis/chapter6.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: 0, y: -600 },

    levels: [
        {
            id: 601,
            name: "Вход в Безысходность",
            x: 120, y: 800, nodeSize: 40,
            description: "Узкий лаз, ведущий в глубины катакомб. Стены сочатся влагой, а в воздухе витает отчаяние.",
            requiredPowerLevel: 4500,
            imageBanner: "/assets/ui/banners/level_banner_despair_entrance.png"
        },
        {
            id: 602,
            name: "Коридоры Забвения",
            x: 250, y: 720, nodeSize: 40,
            description: "Бесконечные, переплетающиеся туннели, где легко потерять не только путь, но и рассудок.",
            requiredPowerLevel: 4800,
            imageBanner: "/assets/ui/banners/level_banner_oblivion_corridors.png"
        },
        {
            id: 603,
            name: "Камера Пыток Инквизитора",
            x: 180, y: 600, nodeSize: 45,
            description: "Мрачное место, где когда-то вершились жестокие обряды. Эхо криков до сих пор не утихает.",
            requiredPowerLevel: 5200,
            imageBanner: "/assets/ui/banners/level_banner_inquisitor_chamber.png"
        },
        {
            id: 604,
            name: "Затопленные Ниши",
            x: 380, y: 650, nodeSize: 40,
            description: "Часть катакомб, поглощенная подземными водами. В мутной воде скрываются не только останки, но и их хранители.",
            requiredPowerLevel: 5600,
            imageBanner: "/assets/ui/banners/level_banner_flooded_niches.png"
        },
        {
            id: 605,
            name: "Кладбище Нерожденных",
            x: 500, y: 750, nodeSize: 40,
            description: "Место упокоения тех, кто так и не увидел света. Их тихий плач пробирает до костей.",
            requiredPowerLevel: 6000,
            imageBanner: "/assets/ui/banners/level_banner_unborn_cemetery.png"
        },
        {
            id: 606,
            name: "Лабиринт Костяных Сводов",
            x: 620, y: 600, nodeSize: 40,
            description: "Своды этого лабиринта сложены из костей бесчисленных жертв. Каждый поворот может стать ловушкой.",
            requiredPowerLevel: 6500,
            imageBanner: "/assets/ui/banners/level_banner_bone_vault_labyrinth.png"
        },
        {
            id: 607,
            name: "Обитель Молчаливых Монахов",
            x: 450, y: 480, nodeSize: 40,
            description: "Здесь когда-то жили отшельники, давшие обет молчания. Теперь их призраки охраняют свои секреты.",
            requiredPowerLevel: 7000,
            imageBanner: "/assets/ui/banners/level_banner_silent_monks_abode.png"
        },
        {
            id: 608,
            name: "Колодец Душ",
            x: 750, y: 520, nodeSize: 45,
            description: "Бездонный колодец, куда, по легенде, сбрасывали тела проклятых. Их стоны доносятся из глубины.",
            requiredPowerLevel: 7600,
            imageBanner: "/assets/ui/banners/level_banner_well_of_souls.png"
        },
        {
            id: 609,
            name: "Хранилище Запретных Реликвий",
            x: 850, y: 380, nodeSize: 40,
            description: "Секретная комната, где спрятаны артефакты слишком опасные для мира живых.",
            requiredPowerLevel: 8200,
            imageBanner: "/assets/ui/banners/level_banner_forbidden_relics_vault.png"
        },
        {
            id: 610,
            name: "Сердце Плача",
            x: 600, y: 250, nodeSize: 50, // Босс главы
            description: "Центральная камера катакомб, где обитает сущность, порождающая скорбь и отчаяние этого места.",
            requiredPowerLevel: 9000,
            imageBanner: "/assets/ui/banners/level_banner_heart_of_wailing.png"
        },
    ]
};

export default chapterData;