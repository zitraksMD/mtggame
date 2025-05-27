// src/data/artifactsData.js

// Определение возможных редкостей (без изменений)
export const Rarity = {
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic',
    LEGENDARY: 'legendary',
    MYTHIC: 'mythic',
};

// --- Параметры прокачки --- (без изменений)
export const MAX_ARTIFACT_LEVEL = 20;
export const BASE_SHARD_COST_PER_LEVEL = 15;

// --- КОНСТАНТЫ ДЛЯ ДИНАМИЧЕСКОГО РАСЧЕТА СТАТОВ АРТЕФАКТОВ --- (без изменений)
const MYTHIC_L20_MAX_PRIMARY_STATS = {
    hp: 13000,
    attack: 8000,
};
const ARTIFACT_PRIMARY_STAT_L1_RATIOS = {
    hp: 3000 / 13000,
    attack: 1600 / 8000,
};
const ARTIFACT_STAT_RARITY_MULTIPLIERS = {
    [Rarity.UNCOMMON]: 0.15,
    [Rarity.RARE]: 0.35,
    [Rarity.EPIC]: 0.5,
    [Rarity.LEGENDARY]: 0.7,
    [Rarity.MYTHIC]: 1.0,
};

// --- ФУНКЦИЯ РАСЧЕТА СТАТОВ АРТЕФАКТА --- (без изменений)
export function calculateArtifactStat(artifactDefinition, statName, currentLevel) {
    const level = Math.max(1, Math.min(currentLevel, artifactDefinition.maxLevel || MAX_ARTIFACT_LEVEL));

    if (statName === "hp" || statName === "attack") {
        const maxStatMythicL20 = MYTHIC_L20_MAX_PRIMARY_STATS[statName];
        const l1Ratio = ARTIFACT_PRIMARY_STAT_L1_RATIOS[statName];
        const rarityKey = artifactDefinition.rarity.toLowerCase();
        const rarityMultiplier = ARTIFACT_STAT_RARITY_MULTIPLIERS[rarityKey] || ARTIFACT_STAT_RARITY_MULTIPLIERS[Rarity.UNCOMMON];

        if (maxStatMythicL20 === undefined || l1Ratio === undefined) {
            console.warn(`Динамический расчет для стата "${statName}" не определен.`);
            return 0;
        }
        const maxStatForRarityAtL20 = maxStatMythicL20 * rarityMultiplier;
        let statValue;
        if ((artifactDefinition.maxLevel || MAX_ARTIFACT_LEVEL) === 1) {
            statValue = maxStatForRarityAtL20 * l1Ratio;
        } else if (level === 1) {
            statValue = maxStatForRarityAtL20 * l1Ratio;
        } else {
            statValue = maxStatForRarityAtL20 * (l1Ratio + (1 - l1Ratio) * (level - 1) / ((artifactDefinition.maxLevel || MAX_ARTIFACT_LEVEL) - 1));
        }
        return Math.round(statValue);
    } else {
        const baseStat = artifactDefinition.baseStats?.[statName] || 0;
        const perLevelStat = artifactDefinition.levelStats?.[statName] || 0;
        return baseStat + (level - 1) * perLevelStat;
    }
}

// --- Определение артефактов ---
// КАЖДЫЙ артефакт теперь будет давать ТОЛЬКО динамически рассчитываемые HP и Урон.
// baseStats и levelStats очищены от уникальных статов.

// --- Сет 1: Протокол "Ветеран" ---
const art_tactical_chip_veteran = {
    id: 'art_tactical_chip_veteran', name: 'Тактический Чип "Ветеран"', icon: '/assets/artifacts/hero_talisman_worn.png', rarity: Rarity.UNCOMMON,
    description: "Интегрированный чип с боевыми алгоритмами. Повышает показатели жизнеспособности и огневой мощи.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    basePowerLevel: 1400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_kinetic_boosters_will = {
    id: 'art_kinetic_boosters_will', name: 'Кинетические Усилители "Воля"', icon: '/assets/artifacts/hero_gauntlets_crude.png', rarity: Rarity.UNCOMMON,
    description: "Усиливают конечности, повышая физическую мощь и устойчивость оператора.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    basePowerLevel: 1400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_maneuvering_accelerators_dash = {
    id: 'art_maneuvering_accelerators_dash', name: 'Маневровые Ускорители "Рывок"', icon: '/assets/artifacts/hero_boots_reinforced.png', rarity: Rarity.RARE,
    description: "Сервоприводы для повышения мобильности. Увеличивают боевой потенциал и живучесть.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {}, levelStats: {},
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_field_stabilizer_steadfast = {
    id: 'art_field_stabilizer_steadfast', name: 'Полевой Стабилизатор "Стойкость"', icon: '/assets/artifacts/hero_amulet_simple.png', rarity: Rarity.RARE,
    description: "Генерирует локальное поле, повышающее атакующие и защитные характеристики.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {}, levelStats: {},
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Сет 2: Резонанс Энергопотоков ---
const art_aerodynamic_converter = {
    id: 'art_aerodynamic_converter', name: 'Аэродинамический Конвертер', icon: '/assets/artifacts/elemental_stone_wind.png', rarity: Rarity.UNCOMMON,
    description: "Преобразует потоки энергии для усиления систем. Дает прирост к энергоемкости и выходной мощности.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {}, levelStats: {},
    basePowerLevel: 1400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_plasma_inductor_ignis = {
    id: 'art_plasma_inductor_ignis', name: 'Плазменный Индуктор "Игнис"', icon: '/assets/artifacts/elemental_orb_fire.png', rarity: Rarity.RARE,
    description: "Накапливает и высвобождает плазменную энергию, повышая боевые параметры.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_hydrostatic_regenerator = {
    id: 'art_hydrostatic_regenerator', name: 'Гидростатический Регенератор', icon: '/assets/artifacts/elemental_waters.png', rarity: Rarity.RARE,
    description: "Система жизнеобеспечения, оптимизирующая ресурсы. Увеличивает прочность и урон.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {}, levelStats: {},
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_geothermal_stabilizer_terra = {
    id: 'art_geothermal_stabilizer_terra', name: 'Геотермальный Стабилизатор "Терра"', icon: '/assets/artifacts/elemental_earth.png', rarity: Rarity.EPIC,
    description: "Модуль, использующий геотермальную энергию для укрепления систем. Повышает целостность и атаку.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};

// --- Сет 3: Архивы Предтеч ---
const art_data_scroll_insight = {
    id: 'art_data_scroll_insight', name: 'Дата-Скрипт "Прозрение"', icon: '/assets/artifacts/ancient_scroll.png', rarity: Rarity.UNCOMMON,
    description: "Древний носитель информации, содержащий забытые боевые техники. Усиливает базовые параметры.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {}, levelStats: {},
    basePowerLevel: 1400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_access_masterkey_enigma = {
    id: 'art_access_masterkey_enigma', name: 'Мастер-Ключ Доступа "Энигма"', icon: '/assets/artifacts/ancient_key.png', rarity: Rarity.RARE,
    description: "Открывает скрытые системные ресурсы, улучшая общую производительность.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_info_slate_glyph = {
    id: 'art_info_slate_glyph', name: 'Инфо-Планшет "Глиф"', icon: '/assets/artifacts/ancient_tablet.png', rarity: Rarity.EPIC,
    description: "Планшет с зашифрованными данными, повышающими боевую эффективность.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    baseStats: {}, levelStats: {},
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_chrono_analyzer_foresight = {
    id: 'art_chrono_analyzer_foresight', name: 'Хроно-Анализатор "Предвидение"', icon: '/assets/artifacts/ancient_astrolabe.png', rarity: Rarity.EPIC,
    description: "Устройство, анализирующее временные потоки для оптимизации действий. Увеличивает атаку и защиту.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    baseStats: {}, levelStats: {},
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Сет 4: Кинетический Авангард ---
const art_calibration_servo_vector = {
    id: 'art_calibration_servo_vector', name: 'Калибровочный Сервопривод "Вектор"', icon: '/assets/artifacts/tech_gear_precision.png', rarity: Rarity.RARE,
    description: "Высокоточный механизм, улучшающий наведение и силовые показатели.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL,
    baseStats: {}, levelStats: {},
    basePowerLevel: 2100, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_stabilized_power_unit = {
    id: 'art_stabilized_power_unit', name: 'Стабилизированный Энергоблок', icon: '/assets/artifacts/tech_core_energy.png', rarity: Rarity.EPIC,
    description: "Обеспечивает стабильное питание систем, повышая их общую мощность и отказоустойчивость.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_kinetic_barrier_aegis = {
    id: 'art_kinetic_barrier_aegis', name: 'Кинетический Барьер "Эгида"', icon: '/assets/artifacts/tech_field_magnetic.png', rarity: Rarity.EPIC,
    description: "Генератор защитного поля, повышающий живучесть и боевой потенциал.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_cognitive_enhancer_synapse = {
    id: 'art_cognitive_enhancer_synapse', name: 'Когнитивный Усилитель "Синапс"', icon: '/assets/artifacts/tech_interface_neural.png', rarity: Rarity.LEGENDARY,
    description: "Нейро-интерфейс, ускоряющий реакции и оптимизирующий боевые алгоритмы. Усиливает атаку и защиту.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    baseStats: {}, levelStats: {},
    basePowerLevel: 5400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Сет 5: Проект "Апекс" ---
const art_adaptive_neurocircuitry_matrix = {
    id: 'art_adaptive_neurocircuitry_matrix', name: 'Адаптивная Нейросхема "Матрица"', icon: '/assets/artifacts/tech_circuit_advanced.png', rarity: Rarity.EPIC,
    description: "Сложная нейронная сеть, динамически перераспределяющая ресурсы для максимальной эффективности.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 1.5,
    baseStats: {}, levelStats: {},
    basePowerLevel: 3200, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_reality_projector_mirage = {
    id: 'art_reality_projector_mirage', name: 'Проектор Иллюзорной Реальности "Мираж"', icon: '/assets/artifacts/tech_projector_holo.png', rarity: Rarity.LEGENDARY,
    description: "Создает тактические иллюзии, дезориентируя противника и усиливая владельца.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    baseStats: {}, levelStats: {},
    basePowerLevel: 5400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_superposition_computer_apex = {
    id: 'art_superposition_computer_apex', name: 'Суперпозиционный Вычислитель "Апекс"', icon: '/assets/artifacts/tech_processor_quantum.png', rarity: Rarity.LEGENDARY,
    description: "Вычислительный модуль, работающий на принципах квантовой суперпозиции, значительно повышает боевые характеристики.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    basePowerLevel: 5400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_gravity_manipulator_collapse = {
    id: 'art_gravity_manipulator_collapse', name: 'Гравитационный Манипулятор "Коллапс"', icon: '/assets/artifacts/tech_emitter_graviton.png', rarity: Rarity.MYTHIC,
    description: "Устройство, изменяющее локальные гравитационные поля для усиления атаки и защиты.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 3,
    baseStats: {}, levelStats: {},
    basePowerLevel: 8000, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Сет 6: Звездные Навигаторы ---
const art_hyperdrive_engine_voyager = {
    id: 'art_hyperdrive_engine_voyager', name: 'Гипердвигатель "Вояджер"', icon: '/assets/artifacts/cosmic_drive_interstellar.png', rarity: Rarity.LEGENDARY,
    description: "Двигатель, позволяющий совершать сверхсветовые переходы, наделяя владельца невероятной мощью.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    basePowerLevel: 5400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_exotic_matter_reactor_void = {
    id: 'art_exotic_matter_reactor_void', name: 'Реактор Экзотической Материи "Пустота"', icon: '/assets/artifacts/cosmic_core_darkmatter.png', rarity: Rarity.LEGENDARY,
    description: "Источник энергии, использующий свойства экзотической материи для усиления всех систем.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 2,
    basePowerLevel: 5400, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"], baseStats: {}, levelStats: {}
};
const art_spacetime_rift_fragment = {
    id: 'art_spacetime_rift_fragment', name: 'Фрагмент Пространственного Разлома', icon: '/assets/artifacts/cosmic_shard_singularity.png', rarity: Rarity.MYTHIC,
    description: "Осколок нестабильной реальности, излучающий энергию, которая повышает боевой потенциал.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 3,
    baseStats: {}, levelStats: {},
    basePowerLevel: 8000, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};
const art_ftl_particle_injector_horizon = {
    id: 'art_ftl_particle_injector_horizon', name: 'Сверхсветовой Инжектор Частиц "Горизонт"', icon: '/assets/artifacts/cosmic_accelerator_tachyon.png', rarity: Rarity.MYTHIC,
    description: "Ускоряет частицы до сверхсветовых скоростей, наделяя системы разрушительной мощью и прочностью.",
    maxLevel: MAX_ARTIFACT_LEVEL, baseShardCost: BASE_SHARD_COST_PER_LEVEL * 3,
    baseStats: {}, levelStats: {},
    basePowerLevel: 8000, powerPerLevelMultiplier: 0.04,
    primaryDynamicStats: ["hp", "attack"]
};

// --- Определение СЕТОВ ---
export const ARTIFACT_SETS = [
    {
        id: 'set_protocol_veteran', name: "Протокол 'Ветеран'", rarity: Rarity.UNCOMMON,
        artifacts: [art_tactical_chip_veteran, art_kinetic_boosters_will, art_maneuvering_accelerators_dash, art_field_stabilizer_steadfast],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +2.5%' },
            { condition: '[Собрано 2]', description: 'HP +1.5%' },
            { condition: '[Собрано 4]', description: 'HP +1.5%' },
            { condition: '[Собрано 4]', description: 'Crit Chance +0.5%' },
            { condition: '[Собрано 4]', description: 'PowerLevel +3%' }
        ]
    },
    {
        id: 'set_energy_flow_resonance', name: "Резонанс Энергопотоков", rarity: Rarity.RARE,
        artifacts: [art_aerodynamic_converter, art_plasma_inductor_ignis, art_hydrostatic_regenerator, art_geothermal_stabilizer_terra],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +3.5%' },
            { condition: '[Собрано 2]', description: 'HP +2.0%' },
            { condition: '[Собрано 2]', description: 'HP Regen +3' },
            { condition: '[Собрано 4]', description: 'Attack +3.5%' },
            { condition: '[Собрано 4]', description: 'Attack Speed +1.5%' },
            { condition: '[Собрано 4]', description: 'PowerLevel +4%' }
        ]
    },
    {
        id: 'set_precursor_archives', name: "Архивы Предтеч", rarity: Rarity.EPIC,
        artifacts: [art_data_scroll_insight, art_access_masterkey_enigma, art_info_slate_glyph, art_chrono_analyzer_foresight],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +4.5%' },
            { condition: '[Собрано 2]', description: 'HP +2.5%' },
            { condition: '[Собрано 2]', description: 'Crit Chance +1.8%' },
            { condition: '[Собрано 2]', description: 'Double Strike Chance +0.8%' },
            { condition: '[Собрано 4]', description: 'Attack +4.5%' },
            { condition: '[Собрано 4]', description: 'HP +2.5%' },
            { condition: '[Собрано 4]', description: 'PowerLevel +5%' }
        ]
    },
    {
        id: 'set_kinetic_vanguard', name: "Кинетический Авангард", rarity: Rarity.EPIC,
        artifacts: [art_calibration_servo_vector, art_stabilized_power_unit, art_kinetic_barrier_aegis, art_cognitive_enhancer_synapse],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +5.5%' },
            { condition: '[Собрано 2]', description: 'HP +3.0%' },
            { condition: '[Собрано 2]', description: 'Crit Chance +1.2%' },
            { condition: '[Собрано 4]', description: 'Attack +5.5%' },
            { condition: '[Собрано 4]', description: 'Attack Speed +2.5%' },
            { condition: '[Собрано 4]', description: 'PowerLevel +5%' }
        ]
    },
    {
        id: 'set_project_apex', name: "Проект 'Апекс'", rarity: Rarity.LEGENDARY,
        artifacts: [art_adaptive_neurocircuitry_matrix, art_reality_projector_mirage, art_superposition_computer_apex, art_gravity_manipulator_collapse],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +6.5%' },
            { condition: '[Собрано 2]', description: 'HP +3.5%' },
            { condition: '[Собрано 2]', description: 'Double Strike Chance +1.8%' },
            { condition: '[Собрано 2]', description: 'Crit Chance +2.5%' },
            { condition: '[Собрано 4]', description: 'HP +3.5%' },
            { condition: '[Собрано 4]', description: 'Attack Speed +3.5%' },
            { condition: '[Собрано 4]', description: 'PowerLevel +6%' }
        ]
    },
    {
        id: 'set_star_navigators', name: "Звездные Навигаторы", rarity: Rarity.MYTHIC,
        artifacts: [art_hyperdrive_engine_voyager, art_exotic_matter_reactor_void, art_spacetime_rift_fragment, art_ftl_particle_injector_horizon],
        bonuses: [
            { condition: '[Собрано 2]', description: 'Attack +6.0%' },
            { condition: '[Собрано 2]', description: 'HP +4.0%' },
            { condition: '[Собрано 4]', description: 'Crit Chance +4.0%' },
            { condition: '[Собрано 4]', description: 'Attack Speed +4.5%' },
            { condition: '[Собрано 4]', description: 'PowerLevel +7%' }
        ]
    },
];

// --- Карта для быстрого доступа к данным артефакта по ID --- (без изменений логики, но с новыми именами)
const ALL_ARTIFACTS_MAP = new Map();
ARTIFACT_SETS.forEach(set => {
    set.artifacts.forEach(artifact => {
        // Убедимся, что все поля артефакта определены, даже если они пустые в индивидуальных объектах
        const hydratedArtifact = {
            description: "Описание по умолчанию...", // Это будет перезаписано из объекта артефакта
            maxLevel: MAX_ARTIFACT_LEVEL,
            baseShardCost: BASE_SHARD_COST_PER_LEVEL,
            baseStats: {},
            levelStats: {},
            basePowerLevel: 0,
            powerPerLevelMultiplier: 0,
            primaryDynamicStats: ["hp", "attack"],
            ...artifact // Деструктуризация индивидуального объекта артефакта
        };
        ALL_ARTIFACTS_MAP.set(hydratedArtifact.id, hydratedArtifact);
    });
});

// --- Экспорт массива всех артефактов --- (без изменений)
export const ALL_ARTIFACTS_ARRAY = Array.from(ALL_ARTIFACTS_MAP.values());

// --- Экспорт функции для получения данных артефакта по ID --- (без изменений)
export const getArtifactById = (id) => ALL_ARTIFACTS_MAP.get(id);