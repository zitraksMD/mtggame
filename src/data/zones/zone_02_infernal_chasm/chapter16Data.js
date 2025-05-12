const chapterData = {
    id: 16,
    name: "Лабиринт Искаженных Душ",
    image: "/assets/zones/infernal_chaos/chapter16.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: 0, y: -400 },

    levels: [
        {
            id: 1601,
            name: "Вход в Безумие",
            x: 100, y: 650, nodeSize: 40,
            description: "Границы этого места размыты, а коридоры меняются, подчиняясь воле его безумных обитателей.",
            requiredPowerLevel: 238000,
            imageBanner: "/assets/ui/banners/level_banner_madness_entrance.png"
        },
        {
            id: 1602,
            name: "Коридоры Ложных Воспоминаний",
            x: 250, y: 750, nodeSize: 40,
            description: "Здесь на путников обрушиваются фальшивые воспоминания, призванные сломить их волю и разум.",
            requiredPowerLevel: 248000,
            imageBanner: "/assets/ui/banners/level_banner_false_memories_corridors.png"
        },
        {
            id: 1603,
            name: "Залы Вечного Сомнения",
            x: 400, y: 600, nodeSize: 45,
            description: "В этих залах каждая мысль подвергается сомнению, а уверенность обращается в прах.",
            requiredPowerLevel: 259000,
            imageBanner: "/assets/ui/banners/level_banner_eternal_doubt_halls.png"
        },
        {
            id: 1604,
            name: "Зеркала Искаженной Сущности",
            x: 280, y: 480, nodeSize: 40,
            description: "Отражения в этих зеркалах показывают самые темные стороны души, стремясь поглотить оригинал.",
            requiredPowerLevel: 270000,
            imageBanner: "/assets/ui/banners/level_banner_distorted_essence_mirrors.png"
        },
        {
            id: 1605,
            name: "Библиотека Утраченных Истин",
            x: 550, y: 520, nodeSize: 40,
            description: "Бесконечные стеллажи книг, содержащих ложь, полуправду и знания, способные свести с ума.",
            requiredPowerLevel: 282000,
            imageBanner: "/assets/ui/banners/level_banner_lost_truths_library.png"
        },
        {
            id: 1606,
            name: "Сад Расколотых Идентичностей",
            x: 700, y: 680, nodeSize: 40,
            description: "Призрачные фигуры бродят здесь, потеряв понимание того, кем они были, являются или будут.",
            requiredPowerLevel: 295000,
            imageBanner: "/assets/ui/banners/level_banner_shattered_identities_garden.png"
        },
        {
            id: 1607,
            name: "Обитель Коллективного Кошмара",
            x: 850, y: 580, nodeSize: 45,
            description: "Место, где сливаются воедино кошмары всех душ, попавших в лабиринт, порождая чудовищные сущности.",
            requiredPowerLevel: 308000,
            imageBanner: "/assets/ui/banners/level_banner_collective_nightmare_abode.png"
        },
        {
            id: 1608,
            name: "Тюрьма Разума",
            x: 650, y: 350, nodeSize: 40,
            description: "Невидимые стены этой тюрьмы сковывают мысли и волю, превращая пленников в безвольных марионеток.",
            requiredPowerLevel: 322000,
            imageBanner: "/assets/ui/banners/level_banner_prison_of_mind.png"
        },
        {
            id: 1609,
            name: "Эхо Бесконечного Крика",
            x: 800, y: 200, nodeSize: 40,
            description: "Здесь вечно звучит крик первой души, потерявшей рассудок в этом лабиринте.",
            requiredPowerLevel: 337000,
            imageBanner: "/assets/ui/banners/level_banner_endless_scream_echo.png"
        },
        {
            id: 1610,
            name: "Архитектор Безумия",
            x: 500, y: 100, nodeSize: 50, // Босс главы 6
            description: "Сущность, что создала и поддерживает этот лабиринт, питаясь безумием своих жертв.",
            requiredPowerLevel: 355000,
            imageBanner: "/assets/ui/banners/level_banner_architect_of_madness.png"
        },
    ]
};

export default chapterData;