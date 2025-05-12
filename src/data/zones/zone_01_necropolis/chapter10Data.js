const chapterData = {
    id: 10,
    name: "Завеса Между Мирами",
    image: "/assets/zones/necropolis/chapter10.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -100, y: -500 }, // Предполагаем, что карта расширяется или это новая область

    levels: [
        {
            id: 1001,
            name: "Иссохший Переход",
            x: 100, y: 850, nodeSize: 40,
            description: "Древний и нестабильный путь, ведущий к самой границе Некрополя, где ткань реальности истончается.",
            requiredPowerLevel: 90000, // Значительный скачок силы после предыдущих глав
            imageBanner: "/assets/ui/banners/level_banner_withered_crossing.png"
        },
        {
            id: 1002,
            name: "Поля Эктоплазмы",
            x: 250, y: 780, nodeSize: 40,
            description: "Безбрежное пространство, заполненное клубящейся эктоплазмой – сырой энергией заблудших душ и сущностей из-за Завесы.",
            requiredPowerLevel: 93500,
            imageBanner: "/assets/ui/banners/level_banner_ectoplasm_fields.png"
        },
        {
            id: 1003,
            name: "Зеркальные Залы Потерянных Отражений",
            x: 400, y: 820, nodeSize: 45,
            description: "Лабиринт из призрачных зеркал, отражающих не только образы, но и страхи, фрагменты душ и альтернативные реальности.",
            requiredPowerLevel: 97000,
            imageBanner: "/assets/ui/banners/level_banner_mirrored_halls.png"
        },
        {
            id: 1004,
            name: "Тихая Роща Вечных Скорбящих",
            x: 180, y: 650, nodeSize: 40,
            description: "Место упокоения древних духов, чья скорбь настолько сильна, что обрела физическую форму и влияние на окружение.",
            requiredPowerLevel: 101000,
            imageBanner: "/assets/ui/banners/level_banner_silent_mourners_grove.png"
        },
        {
            id: 1005,
            name: "Кристаллизованный Шёпот",
            x: 550, y: 680, nodeSize: 40,
            description: "Пещера, где древние слова силы и отчаяния застыли в виде мерцающих кристаллов, резонирующих с энергией Завесы.",
            requiredPowerLevel: 105500,
            imageBanner: "/assets/ui/banners/level_banner_crystallized_whispers.png"
        },
        {
            id: 1006,
            name: "Разлом Реальностей",
            x: 700, y: 750, nodeSize: 45,
            description: "Видимый разрыв в ткани бытия, пульсирующий чужеродной энергией. Из него могут появляться невообразимые создания.",
            requiredPowerLevel: 110000,
            imageBanner: "/assets/ui/banners/level_banner_reality_tear.png"
        },
        {
            id: 1007,
            name: "Обитель Стражей Завесы",
            x: 850, y: 600, nodeSize: 40,
            description: "Цитадель древних сущностей, тысячелетиями охраняющих хрупкое равновесие между мирами. Они не рады вторжению.",
            requiredPowerLevel: 115000,
            imageBanner: "/assets/ui/banners/level_banner_veil_wardens_abode.png"
        },
        {
            id: 1008,
            name: "Лабиринт Невозможных Геометрий",
            x: 600, y: 450, nodeSize: 45,
            description: "Пространство, искаженное до неузнаваемости, где законы физики не действуют, а каждый поворот ведет в новую ловушку для разума.",
            requiredPowerLevel: 121000,
            imageBanner: "/assets/ui/banners/level_banner_impossible_geometry_labyrinth.png"
        },
        {
            id: 1009,
            name: "Предсердие Пустоты",
            x: 780, y: 300, nodeSize: 40,
            description: "Последний оплот перед безграничной пустотой за Завесой. Здесь ощущается дыхание небытия.",
            requiredPowerLevel: 128000,
            imageBanner: "/assets/ui/banners/level_banner_void_antechamber.png"
        },
        {
            id: 1010,
            name: "Архитектор Завесы",
            x: 950, y: 150, nodeSize: 55, // Финальный босс этой главы (и возможно, зоны Некрополис)
            description: "Древняя и непостижимая сущность, что плетет или контролирует саму Завесу Между Мирами. Его мотивы и силы за гранью понимания.",
            requiredPowerLevel: 140000,
            imageBanner: "/assets/ui/banners/level_banner_veil_architect.png"
        },
    ]
};

export default chapterData;