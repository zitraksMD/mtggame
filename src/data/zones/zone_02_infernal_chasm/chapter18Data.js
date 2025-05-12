const chapterData = {
    id: 18,
    name: "Око Бездны",
    image: "/assets/zones/infernal_chaos/chapter18.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -150, y: -200 },

    levels: [
        {
            id: 1801,
            name: "Пустоши Искаженной Реальности",
            x: 80, y: 680, nodeSize: 40,
            description: "Земли вокруг Ока Бездны искажены его влиянием, реальность здесь нестабильна и опасна.",
            requiredPowerLevel: 535000,
            imageBanner: "/assets/ui/banners/level_banner_warped_reality_wastes.png"
        },
        {
            id: 1802,
            name: "Храм Нечестивых Откровений",
            x: 200, y: 750, nodeSize: 40,
            description: "Здесь демоны получают видения и указания от Ока, погружаясь в еще большее безумие.",
            requiredPowerLevel: 552000,
            imageBanner: "/assets/ui/banners/level_banner_unholy_revelations_temple.png"
        },
        {
            id: 1803,
            name: "Поля Энтропии",
            x: 350, y: 650, nodeSize: 45,
            description: "Место, где все стремится к разрушению и распаду под воздействием чистой энергии Хаоса.",
            requiredPowerLevel: 570000,
            imageBanner: "/assets/ui/banners/level_banner_entropy_fields.png"
        },
        {
            id: 1804,
            name: "Обитель Прорицателей Рока",
            x: 250, y: 550, nodeSize: 40,
            description: "Демоны-оракулы, черпающие силу из Ока, предсказывают будущее и направляют легионы Хаоса.",
            requiredPowerLevel: 590000,
            imageBanner: "/assets/ui/banners/level_banner_doom_seers_abode.png"
        },
        {
            id: 1805,
            name: "Колодцы Небытия",
            x: 480, y: 500, nodeSize: 40,
            description: "Бездонные провалы, ведущие в саму Бездну, источающие ауру абсолютной пустоты.",
            requiredPowerLevel: 612000,
            imageBanner: "/assets/ui/banners/level_banner_oblivion_wells.png"
        },
        {
            id: 1806,
            name: "Кристаллический Лабиринт Хаоса",
            x: 650, y: 600, nodeSize: 45,
            description: "Лабиринт, стены которого состоят из кристаллов, отражающих и преломляющих энергию Ока.",
            requiredPowerLevel: 635000,
            imageBanner: "/assets/ui/banners/level_banner_chaos_crystal_labyrinth.png"
        },
        {
            id: 1807,
            name: "Залы Вечного Голода Ока",
            x: 780, y: 700, nodeSize: 40,
            description: "Око Бездны постоянно поглощает энергию, души и материю, стремясь поглотить все сущее.",
            requiredPowerLevel: 660000,
            imageBanner: "/assets/ui/banners/level_banner_eye_eternal_hunger_halls.png"
        },
        {
            id: 1808,
            name: "Стражи Ока",
            x: 900, y: 550, nodeSize: 40,
            description: "Могущественные конструкты или демоны, созданные для защиты самого Ока Бездны.",
            requiredPowerLevel: 688000,
            imageBanner: "/assets/ui/banners/level_banner_eye_wardens.png"
        },
        {
            id: 1809,
            name: "Зрачок Бездны",
            x: 700, y: 400, nodeSize: 40,
            description: "Самая центральная часть Ока, где концентрация энергии Хаоса максимальна и почти невыносима.",
            requiredPowerLevel: 715000,
            imageBanner: "/assets/ui/banners/level_banner_abyss_pupil.png"
        },
        {
            id: 1810,
            name: "Аватар Ока Бездны",
            x: 850, y: 250, nodeSize: 50, // Босс главы 8
            description: "Физическое воплощение воли Ока Бездны, обладающее колоссальной разрушительной силой.",
            requiredPowerLevel: 750000,
            imageBanner: "/assets/ui/banners/level_banner_abyssal_eye_avatar.png"
        },
    ]
};

export default chapterData;