const chapterData = {
    id: 5,
    name: "Царство Забытых Королей",
    image: "/assets/zones/necropolis/chapter5.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -100, y: -250 },

    levels: [
        {
            id: 501,
            name: "Королевский Тракт",
            x: 100, y: 700, nodeSize: 40,
            description: "Некогда величественная дорога, ведущая к гробницам монархов, ныне поросшая терновником и страхом.",
            requiredPowerLevel: 1600,
            imageBanner: "/assets/ui/banners/level_banner_royal_road.png"
        },
        {
            id: 502,
            name: "Склеп Безымянного Регента",
            x: 220, y: 630, nodeSize: 40,
            description: "Скромная усыпальница того, кто правил недолго, но оставил после себя тревожную ауру.",
            requiredPowerLevel: 1750,
            imageBanner: "/assets/ui/banners/level_banner_regent_crypt.png"
        },
        {
            id: 503,
            name: "Мавзолей Плачущей Королевы",
            x: 350, y: 720, nodeSize: 45,
            description: "Говорят, призрак королевы до сих пор оплакивает свою судьбу в стенах этого мрачного мавзолея.",
            requiredPowerLevel: 1950,
            imageBanner: "/assets/ui/banners/level_banner_queen_mausoleum.png"
        },
        {
            id: 504,
            name: "Залы Вечной Стражи",
            x: 480, y: 600, nodeSize: 40,
            description: "Окаменевшие воины стоят на страже покоя королей. Не каждый осмелится пройти мимо них.",
            requiredPowerLevel: 2200,
            imageBanner: "/assets/ui/banners/level_banner_eternal_guard_halls.png"
        },
        {
            id: 505,
            name: "Сокровищница Проклятого Князя",
            x: 300, y: 500, nodeSize: 40,
            description: "Богатства, собранные жестоким правителем, теперь охраняются его неупокоенным духом.",
            requiredPowerLevel: 2500,
            imageBanner: "/assets/ui/banners/level_banner_cursed_prince_treasury.png"
        },
        {
            id: 506,
            name: "Тайный Проход Советника",
            x: 600, y: 520, nodeSize: 40,
            description: "Скрытый ход, которым пользовался коварный советник. Кто знает, какие тайны он хранит?",
            requiredPowerLevel: 2800,
            imageBanner: "/assets/ui/banners/level_banner_advisor_passage.png"
        },
        {
            id: 507,
            name: "Погребальные Камеры Династии",
            x: 750, y: 650, nodeSize: 40,
            description: "Здесь покоятся целые поколения королевской крови. Их коллективная воля ощущается в каждом камне.",
            requiredPowerLevel: 3100,
            imageBanner: "/assets/ui/banners/level_banner_dynasty_chambers.png"
        },
        {
            id: 508,
            name: "Дворцовые Руины",
            x: 880, y: 450, nodeSize: 45,
            description: "Остатки некогда величественного дворца, ставшие частью некрополя. Призраки прошлого танцуют в лунном свете.",
            requiredPowerLevel: 3500,
            imageBanner: "/assets/ui/banners/level_banner_palace_ruins.png"
        },
        {
            id: 509,
            name: "Святилище Основателя",
            x: 650, y: 350, nodeSize: 40,
            description: "Место упокоения первого короля, основавшего династию. Его дух – ключ к древней силе.",
            requiredPowerLevel: 3900,
            imageBanner: "/assets/ui/banners/level_banner_founder_shrine.png"
        },
        {
            id: 510,
            name: "Тронный Зал Последнего Короля",
            x: 800, y: 220, nodeSize: 50, // Босс главы
            description: "Здесь восседает призрак последнего монарха, не желающий расставаться со своей властью даже после смерти.",
            requiredPowerLevel: 4400,
            imageBanner: "/assets/ui/banners/level_banner_last_king_throne_room.png"
        },
    ]
};

export default chapterData;