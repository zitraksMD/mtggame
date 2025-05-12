const chapterData = {
    id: 20,
    name: "Сердце Хаоса",
    image: "/assets/zones/infernal_chaos/chapter20.png",
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: 0, y: -400 },

    levels: [
        {
            id: 2001, // Уровни для главы 20
            name: "Разлом Небытия",
            x: 100, y: 650, nodeSize: 40,
            description: "После падения Владыки открылся путь к самому источнику Инфернального Хаоса – зияющему разлому в ткани реальности.",
            requiredPowerLevel: 1200000,
            imageBanner: "/assets/ui/banners/level_banner_oblivion_rift.png"
        },
        {
            id: 2002,
            name: "Пульсирующие Вены Хаоса",
            x: 250, y: 750, nodeSize: 40,
            description: "Каналы, по которым течет чистая, неконтролируемая энергия Хаоса, искажая все вокруг.",
            requiredPowerLevel: 1260000,
            imageBanner: "/assets/ui/banners/level_banner_pulsing_chaos_veins.png"
        },
        {
            id: 2003,
            name: "Осколки Первозданной Тьмы",
            x: 400, y: 600, nodeSize: 45,
            description: "Фрагменты тьмы, существовавшей до творения, обладающие собственной волей и невероятной мощью.",
            requiredPowerLevel: 1330000,
            imageBanner: "/assets/ui/banners/level_banner_primordial_darkness_shards.png"
        },
        {
            id: 2004,
            name: "Нексус Нестабильных Реальностей",
            x: 280, y: 480, nodeSize: 40,
            description: "Точка, где сталкиваются и переплетаются бесчисленные альтернативные и разрушающиеся миры.",
            requiredPowerLevel: 1400000,
            imageBanner: "/assets/ui/banners/level_banner_unstable_realities_nexus.png"
        },
        {
            id: 2005,
            name: "Око Вечного Шторма",
            x: 550, y: 520, nodeSize: 40,
            description: "Центр бури из чистой хаотической энергии, где каждую секунду рождаются и умирают новые законы физики.",
            requiredPowerLevel: 1480000,
            imageBanner: "/assets/ui/banners/level_banner_eternal_storm_eye.png"
        },
        {
            id: 2006,
            name: "Хор Безумных Богов",
            x: 700, y: 680, nodeSize: 40,
            description: "Эхо голосов сущностей, сведенных с ума мощью Хаоса, их песни способны разрушать миры.",
            requiredPowerLevel: 1570000,
            imageBanner: "/assets/ui/banners/level_banner_mad_gods_choir.png"
        },
        {
            id: 2007,
            name: "Зародыш Разрушения",
            x: 850, y: 580, nodeSize: 45,
            description: "Место, где концентрируется разрушительный потенциал Хаоса, готовый вырваться и поглотить все сущее.",
            requiredPowerLevel: 1660000,
            imageBanner: "/assets/ui/banners/level_banner_destruction_embryo.png"
        },
        {
            id: 2008,
            name: "Предел Существования",
            x: 650, y: 350, nodeSize: 40,
            description: "Самая граница известной вселенной, за которой лежит лишь непостижимая пустота или чистое безумие Хаоса.",
            requiredPowerLevel: 1750000,
            imageBanner: "/assets/ui/banners/level_banner_existence_limit.png"
        },
        {
            id: 2009,
            name: "Сингулярность Хаоса",
            x: 800, y: 200, nodeSize: 40,
            description: "Точка бесконечной плотности и энергии, откуда берет начало Инфернальный Хаос.",
            requiredPowerLevel: 1850000,
            imageBanner: "/assets/ui/banners/level_banner_chaos_singularity.png"
        },
        {
            id: 2010,
            name: "Первородный Хаос (Воплощение)",
            x: 500, y: 200, nodeSize: 60, // Финальный босс зоны "Инфернальный Хаос"
            description: "Сама суть Хаоса, принявшая форму для противостояния. Его уничтожение может изменить саму структуру реальности... или уничтожить ее.",
            requiredPowerLevel: 2000000,
            imageBanner: "/assets/ui/banners/level_banner_primordial_chaos_avatar.png"
        },
    ]
};

export default chapterData;