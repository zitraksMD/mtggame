// src/data/chapters/chapter3/chapter3Data.js

const chapterData = {
    id: 3,
    name: "Некрополь Вечной Ночи",
    image: "/assets/zones/necropolis/chapter3.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -80, y: -220 },

    levels: [
        {
            id: 301,
            name: "Ворота Забвения",
            x: 120, y: 780, nodeSize: 40,
            description: "Массивные ворота, ведущие в глубины некрополя. Говорят, прошедшие через них уже не помнят солнечного света.",
            requiredPowerLevel: 5000,
            imageBanner: "/assets/ui/banners/level_banner_oblivion_gates.png"
        },
        {
            id: 302,
            name: "Аллея Скорбящих Статуй",
            x: 250, y: 700, nodeSize: 40,
            description: "Каменные изваяния, застывшие в вечной скорби. Кажется, их глаза следят за каждым твоим шагом.",
            requiredPowerLevel: 5400,
            imageBanner: "/assets/ui/banners/level_banner_mourning_statues_alley.png"
        },
        {
            id: 303,
            name: "Мавзолей Проклятых Родов",
            x: 400, y: 760, nodeSize: 40,
            description: "Здесь покоятся останки целых династий, навлекших на себя древние проклятия. Их духи не знают покоя.",
            requiredPowerLevel: 5850,
            imageBanner: "/assets/ui/banners/level_banner_cursed_kin_mausoleum.png"
        },
        {
            id: 304,
            name: "Колодец Потерянных Душ",
            x: 320, y: 580, nodeSize: 40,
            description: "Бездонный колодец, куда, по преданиям, сбрасывали неугодных. Из его глубин доносятся стоны и шепот.",
            requiredPowerLevel: 6300,
            imageBanner: "/assets/ui/banners/level_banner_well_of_lost_souls.png"
        },
        {
            id: 305,
            name: "Покои Вечного Сна",
            x: 500, y: 500, nodeSize: 40,
            description: "Роскошные, но мрачные усыпальницы, где знатные мертвецы спят вечным сном, охраняемые призрачной стражей.",
            requiredPowerLevel: 6800,
            imageBanner: "/assets/ui/banners/level_banner_eternal_slumber_chambers.png"
        },
        {
            id: 306,
            name: "Хрустальные Гробницы",
            x: 680, y: 620, nodeSize: 40,
            description: "Тела, заключенные в хрустальные саркофаги, выглядят так, словно уснули лишь мгновение назад. Но не дайте себя обмануть их безмятежностью.",
            requiredPowerLevel: 7350,
            imageBanner: "/assets/ui/banners/level_banner_crystal_tombs.png"
        },
        {
            id: 307,
            name: "Лаборатория Безумного Алхимика",
            x: 820, y: 530, nodeSize: 40,
            description: "Место, где проводились чудовищные эксперименты по созданию гомункулов и оживлению мертвых. Остатки опытов все еще опасны.",
            requiredPowerLevel: 7900,
            imageBanner: "/assets/ui/banners/level_banner_mad_alchemist_lab.png"
        },
        {
            id: 308,
            name: "Башня Погребальных Костров",
            x: 600, y: 380, nodeSize: 45,
            description: "Высокая башня, на вершине которой когда-то сжигали тела умерших. Пепел и копоть здесь смешались с темной магией.",
            requiredPowerLevel: 8500,
            imageBanner: "/assets/ui/banners/level_banner_funeral_pyre_tower.png"
        },
        {
            id: 309,
            name: "Святилище Тихого Ужаса",
            x: 750, y: 280, nodeSize: 40,
            description: "Место, где тишина давит сильнее любого крика. Здесь обитает нечто, питающееся страхом.",
            requiredPowerLevel: 9100,
            imageBanner: "/assets/ui/banners/level_banner_silent_horror_shrine.png"
        },
        {
            id: 310,
            name: "Тронный Зал Королевы Личей",
            x: 900, y: 180, nodeSize: 50, // Босс главы
            description: "Сердце некрополя, где правит могущественная Королева Личей, повелительница бесчисленных армий нежити.",
            requiredPowerLevel: 9800,
            imageBanner: "/assets/ui/banners/level_banner_lich_queen_throne.png"
        },
    ]
};

export default chapterData;