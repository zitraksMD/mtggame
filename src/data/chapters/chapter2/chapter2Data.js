// src/data/chapters/chapter2/chapter2Data.js

const chapterData = {
    id: 2,
    name: "Могильные Холмы",
    image: "/assets/chapter2.png", // Предполагаемый путь к изображению главы
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -100, y: -150 }, // Начальная позиция обзора карты

    levels: [
        {
            id: 201,
            name: "Склеп Вечного Плача",
            x: 180, y: 700, nodeSize: 40,
            description: "Сырые стены этого склепа словно пропитаны слезами давно усопших. Каждый шорох отдается эхом скорби.",
            requiredPowerLevel: 1600,
            imageBanner: "/assets/ui/banners/level_banner_weeping_crypt.png"
        },
        {
            id: 202,
            name: "Костяной Сад",
            x: 320, y: 620, nodeSize: 40,
            description: "Бесчисленные кости усеивают землю, словно жуткие цветы. Некоторые утверждают, что по ночам они движутся.",
            requiredPowerLevel: 1850,
            imageBanner: "/assets/ui/banners/level_banner_bone_garden.png"
        },
        {
            id: 203,
            name: "Поля Погребенных Заживо",
            x: 450, y: 750, nodeSize: 40,
            description: "Легенды гласят, что на этих полях хоронили тех, кто еще дышал. Их отчаяние до сих пор витает в воздухе.",
            requiredPowerLevel: 2100,
            imageBanner: "/assets/ui/banners/level_banner_buried_alive_fields.png"
        },
        {
            id: 204,
            name: "Катакомбы Забытых Душ",
            x: 300, y: 500, nodeSize: 40,
            description: "Лабиринт подземных ходов, где легко потерять не только путь, но и рассудок. Здесь обитают души, о которых забыл мир.",
            requiredPowerLevel: 2400,
            imageBanner: "/assets/ui/banners/level_banner_forgotten_souls_catacombs.png"
        },
        {
            id: 205,
            name: "Гробница Безымянного Короля",
            x: 550, y: 480, nodeSize: 40,
            description: "Могущественный правитель, чье имя стерлось из истории, но чья гробница все еще хранит древние секреты и проклятия.",
            requiredPowerLevel: 2750,
            imageBanner: "/assets/ui/banners/level_banner_nameless_king_tomb.png"
        },
        {
            id: 206,
            name: "Озеро Мертвых Вод",
            x: 700, y: 600, nodeSize: 40,
            description: "Темные, неподвижные воды, скрывающие под своей гладью утопленников и их неупокоенные души.",
            requiredPowerLevel: 3100,
            imageBanner: "/assets/ui/banners/level_banner_dead_waters_lake.png"
        },
        {
            id: 207,
            name: "Мертвецкая Трясина",
            x: 850, y: 500, nodeSize: 40,
            description: "Коварная топь, затягивающая неосторожных путников в свои зловонные глубины. Здесь каждый шаг может стать последним.",
            requiredPowerLevel: 3500,
            imageBanner: "/assets/ui/banners/level_banner_corpse_bog.png"
        },
        {
            id: 208,
            name: "Храм Костяного Жреца",
            x: 650, y: 350, nodeSize: 45, // Немного больше, как предвестник босса
            description: "Древний храм, где проводятся ужасающие ритуалы воскрешения. Костяной Жрец ревностно охраняет свои тайны.",
            requiredPowerLevel: 3900,
            imageBanner: "/assets/ui/banners/level_banner_bone_priest_temple.png"
        },
        {
            id: 209,
            name: "Преддверие Царства Теней",
            x: 800, y: 250, nodeSize: 40,
            description: "Граница между миром живых и царством мертвых истончилась. Здесь тени обретают форму и силу.",
            requiredPowerLevel: 4300,
            imageBanner: "/assets/ui/banners/level_banner_shadow_realm_gate.png"
        },
        {
            id: 210,
            name: "Цитадель Повелителя Умертвий",
            x: 950, y: 150, nodeSize: 50, // Босс главы
            description: "Оплот могущественного существа, командующего легионами нежити. Его сила ощущается задолго до входа в цитадель.",
            requiredPowerLevel: 4800,
            imageBanner: "/assets/ui/banners/level_banner_undead_lord_citadel.png"
        },
    ]
};

export default chapterData;