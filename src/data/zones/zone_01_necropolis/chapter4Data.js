// src/data/chapters/chapter4/chapter4Data.js

const chapterData = {
    id: 4,
    name: "Бездна Отчаяния",
    image: "/assets/zones/necropolis/chapter4.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -120, y: -250 },

    levels: [
        {
            id: 401,
            name: "Край Вечной Скорби",
            x: 200, y: 800, nodeSize: 40,
            description: "Самая граница мира живых, где отчаяние обретает физическую форму, а земля пропитана слезами тысячелетий.",
            requiredPowerLevel: 10000,
            imageBanner: "/assets/ui/banners/level_banner_edge_of_sorrow.png"
        },
        {
            id: 402,
            name: "Река Застывших Душ",
            x: 350, y: 720, nodeSize: 40,
            description: "Ледяная река, в которой навеки застыли души грешников. Их безмолвные крики можно почувствовать кожей.",
            requiredPowerLevel: 10500,
            imageBanner: "/assets/ui/banners/level_banner_frozen_souls_river.png"
        },
        {
            id: 403,
            name: "Долина Сломанных Обетoв",
            x: 500, y: 800, nodeSize: 40,
            description: "Место, где нарушенные клятвы и предательства оставляют неизгладимый след, притягивая мстительных духов.",
            requiredPowerLevel: 11100,
            imageBanner: "/assets/ui/banners/level_banner_broken_vows_valley.png"
        },
        {
            id: 404,
            name: "Подземный Город Трупов",
            x: 300, y: 600, nodeSize: 40,
            description: "Целый город, выстроенный из костей и плоти, населенный ожившими мертвецами, которые продолжают свою жуткую рутину.",
            requiredPowerLevel: 11800,
            imageBanner: "/assets/ui/banners/level_banner_corpse_city_underground.png"
        },
        {
            id: 405,
            name: "Склеп Последнего Вздоха",
            x: 580, y: 550, nodeSize: 40,
            description: "Считается, что именно здесь души испускают свой последний вздох перед тем, как отправиться в небытие или вечные муки.",
            requiredPowerLevel: 12600,
            imageBanner: "/assets/ui/banners/level_banner_last_breath_crypt.png"
        },
        {
            id: 406,
            name: "Обелиск Забытых Богов Смерти",
            x: 750, y: 650, nodeSize: 40,
            description: "Древний обелиск, посвященный божествам смерти, о которых давно забыли. Их сила все еще дремлет здесь.",
            requiredPowerLevel: 13500,
            imageBanner: "/assets/ui/banners/level_banner_death_gods_obelisk.png"
        },
        {
            id: 407,
            name: "Амфитеатр Вечных Мук",
            x: 900, y: 580, nodeSize: 40,
            description: "Место, где грешники бесконечно переживают свои худшие кошмары на потеху темным сущностям Бездны.",
            requiredPowerLevel: 14500,
            imageBanner: "/assets/ui/banners/level_banner_eternal_torment_amphitheater.png"
        },
        {
            id: 408,
            name: "Сердце Пустоты",
            x: 650, y: 400, nodeSize: 45,
            description: "Область, где реальность истончается, а пустота начинает поглощать все вокруг. Здесь обитают самые древние и ужасные твари.",
            requiredPowerLevel: 15600,
            imageBanner: "/assets/ui/banners/level_banner_heart_of_the_void.png"
        },
        {
            id: 409,
            name: "Тюрьма Архидемона",
            x: 800, y: 300, nodeSize: 40,
            description: "Место заточения могущественного архидемона, чье влияние просачивается сквозь стены, искажая все вокруг.",
            requiredPowerLevel: 16800,
            imageBanner: "/assets/ui/banners/level_banner_archdemon_prison.png"
        },
        {
            id: 410,
            name: "Престол Владыки Бездны",
            x: 950, y: 200, nodeSize: 55, // Финальный босс, самый большой узел
            description: "Конечная точка этого кошмарного путешествия. Здесь восседает сам Владыка Бездны, источник всего отчаяния и смерти.",
            requiredPowerLevel: 18000,
            imageBanner: "/assets/ui/banners/level_banner_abyss_lord_throne.png"
        },
    ]
};

export default chapterData;