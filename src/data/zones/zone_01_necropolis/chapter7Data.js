const chapterData = {
    id: 7,
    name: "Город Призраков",
    image: "/assets/zones/necropolis/chapter7.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -150, y: -200 },

    levels: [
        {
            id: 701,
            name: "Призрачные Врата",
            x: 80, y: 680, nodeSize: 40,
            description: "Вход в город, существующий на грани миров. Только те, кто не боится духов, могут пройти.",
            requiredPowerLevel: 60500,
            imageBanner: "/assets/ui/banners/level_banner_ghostly_gates.png"
        },
        {
            id: 702,
            name: "Улица Теней",
            x: 200, y: 750, nodeSize: 40,
            description: "По этой улице бродят тени бывших жителей, повторяя свои последние мгновения жизни.",
            requiredPowerLevel: 62500,
            imageBanner: "/assets/ui/banners/level_banner_street_of_shadows.png"
        },
        {
            id: 703,
            name: "Рыночная Площадь Фантомов",
            x: 350, y: 650, nodeSize: 45,
            description: "Когда-то оживленное место, ныне заполненное призрачными торговцами, предлагающими свой невидимый товар.",
            requiredPowerLevel: 64800,
            imageBanner: "/assets/ui/banners/level_banner_phantom_market.png"
        },
        {
            id: 704,
            name: "Покинутая Таверна 'Смеющийся Череп'",
            x: 250, y: 550, nodeSize: 40,
            description: "В этой таверне до сих пор слышны призрачные смех и звон кружек, но радости в них нет.",
            requiredPowerLevel: 67300,
            imageBanner: "/assets/ui/banners/level_banner_abandoned_tavern.png"
        },
        {
            id: 705,
            name: "Библиотека Забытых Знаний",
            x: 480, y: 500, nodeSize: 40,
            description: "Призрачные библиотекари охраняют книги, содержащие знания, которые лучше бы оставались забытыми.",
            requiredPowerLevel: 70000,
            imageBanner: "/assets/ui/banners/level_banner_forgotten_library.png"
        },
        {
            id: 706,
            name: "Особняк Спектрального Аристократа",
            x: 650, y: 600, nodeSize: 45,
            description: "Величественный, но полупрозрачный особняк, хозяин которого не рад незваным гостям из мира живых.",
            requiredPowerLevel: 72900,
            imageBanner: "/assets/ui/banners/level_banner_spectral_mansion.png"
        },
        {
            id: 707,
            name: "Театр Эфемерных Драм",
            x: 780, y: 700, nodeSize: 40,
            description: "На сцене этого театра вечно разыгрываются трагедии прошлого, с участием актеров-призраков.",
            requiredPowerLevel: 75900,
            imageBanner: "/assets/ui/banners/level_banner_ephemeral_theater.png"
        },
        {
            id: 708,
            name: "Ратуша Вечного Совета",
            x: 900, y: 550, nodeSize: 40,
            description: "Здесь призрачный совет продолжает вершить суд над душами, не нашедшими покоя.",
            requiredPowerLevel: 79000,
            imageBanner: "/assets/ui/banners/level_banner_eternal_council_hall.png"
        },
        {
            id: 709,
            name: "Вершина Башни Иллюзий",
            x: 700, y: 400, nodeSize: 40,
            description: "С этой башни открывается вид на весь призрачный город, но не всему, что видно, можно верить.",
            requiredPowerLevel: 82200,
            imageBanner: "/assets/ui/banners/level_banner_illusion_tower_peak.png"
        },
        {
            id: 710,
            name: "Хранитель Города Призраков",
            x: 850, y: 250, nodeSize: 50, // Босс главы
            description: "Могущественный дух, связанный с этим городом, он решает, кому суждено покинуть его пределы.",
            requiredPowerLevel: 85500,
            imageBanner: "/assets/ui/banners/level_banner_ghost_city_guardian.png"
        },
    ]
};

export default chapterData;