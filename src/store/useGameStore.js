// src/store/useGameStore.js
import { create } from "zustand";
import itemsDatabase, { getItemById } from '../data/itemsDatabase'; // <<< Добавь или убедись, что есть itemsDatabase и getItemById
import { LEVEL_CHEST_TYPES, getLevelChestTypeById } from '../data/levelChestData';
import forgeRecipes from "../data/forgeDatabase";     // Данные рецептов ковки
import { dailyShopDeals } from "../data/shopData";       // Данные магазина
import achievementsData from '../data/achievementsDatabase'; // Импорт определений достижений
import { RACES, getRaceDataById } from '../config/raceData';
// <<< НОВОЕ >>> Импорты для артефактов
import {
    ARTIFACT_SETS,
    getArtifactById,
    MAX_ARTIFACT_LEVEL,
    BASE_SHARD_COST_PER_LEVEL,
    ALL_ARTIFACTS_ARRAY // <<< Импортируем массив
} from '../data/artifactsData';
import { getArtifactChestById, selectWeightedRandom as selectWeightedRewardType } from '../data/artifactChestData.js'; // Переименовал импорт для ясности
import { GEAR_CHESTS, getGearChestById } from '../data/gearChestData'; // <<< Добавь это
import { v4 as uuidv4 } from 'uuid'; // <<<--- ДОБАВЬ ИМПОРТ uuid


const STORAGE_KEY = "gameState";
const ENERGY_REFILL_INTERVAL_MS = 30 * 60 * 1; // 30 минут (исправлено с 1 на 1000)
const DEFAULT_MAX_ENERGY = 1000000; // Максимум энергии по умолчанию

// --- Конфигурация уровней достижений (без изменений) ---
const ACHIEVEMENT_LEVEL_XP_THRESHOLDS = { /* ... */ };
export const ACHIEVEMENT_LEVEL_REWARDS = { /* ... */ };
const getXpNeededForLevel = (level) => ACHIEVEMENT_LEVEL_XP_THRESHOLDS[level + 1] ?? Infinity;

// --- Начальные базовые статы (без изменений) ---
const DEFAULT_BASE_STATS = { hp: 100, attack: 10, attackSpeed: 1.0, critChance: 5, doubleStrikeChance: 0, speed: 5, range: 3, skin: 'default', defense: 0, hpRegen: 0, evasion: 0, maxMana: 0, elementalDmgPercent: 0, goldFind: 0, luck: 0, bossDmg: 0, shardFind: 0, bonusProjectiles: 0, atkPercentBonus: 0, moveSpeedPercentBonus: 0 }; // Добавил все возможные статы для полноты

// <<<--- ДОБАВЛЕН ХЕЛПЕР ДЛЯ СОЗДАНИЯ ЭКЗЕМПЛЯРА ПРЕДМЕТА ---<<<
const createItemInstance = (itemTemplate) => {
    if (!itemTemplate) {
        console.warn("Attempted to create instance from null/undefined template");
        return null;
    }
    return {
        ...itemTemplate,
        uid: uuidv4(),     // Уникальный ID
        currentLevel: 0,   // Начальный уровень (или level, если используешь это поле)
        // Добавь другие свойства экземпляра, если они нужны
    };
};

// <<<--- ДОБАВЛЕНА ФУНКЦИЯ ПОЛУЧЕНИЯ ДЕФОЛТНОГО НАБОРА ---<<<
const getDefaultEquippedSet = () => {
    const defaultSet = {
        weapon: null, amulet: null, ring: null, helmet: null, armor: null, boots: null,
    };
    const types = Object.keys(defaultSet);

    types.forEach(type => {
        const commonItemTemplate = itemsDatabase.find(
            item => item.type === type && item.rarity === 'Common' // Убедись, что 'Common' с большой буквы в базе
        );
        // Создаем экземпляр найденного предмета
        defaultSet[type] = createItemInstance(commonItemTemplate);
    });

    // Проверяем, все ли слоты заполнены
    const missing = types.filter(type => defaultSet[type] === null);
    if (missing.length > 0) {
        console.warn(`Could not find default Common items for types: ${missing.join(', ')}`);
    }
    console.log("Default common equipped set created for initialization/reset:", defaultSet);
    return defaultSet;
};


// --- Функция Загрузки состояния из localStorage (ИЗМЕНЕНА) ---
const loadFromLocalStorage = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            // --- Первый запуск ---
            console.log("No saved state found. Initializing with default Common gear.");
            return { // Возвращаем объект с дефолтными значениями
                equipped: getDefaultEquippedSet(), // <<< Устанавливаем дефолтную экипировку
                collectedArtifacts: new Set(), // Инициализируем пустой Set
                // ... установи другие дефолтные значения для полей, которых не будет в {}
                gold: 100000,
                diamonds: 10000,
                username: null,
                powerLevel: 0, // Пересчитается позже
                playerBaseStats: { ...DEFAULT_BASE_STATS },
                playerHp: DEFAULT_BASE_STATS.hp,
                playerRace: null,
                inventory: [],
                energyMax: DEFAULT_MAX_ENERGY,
                energyCurrent: DEFAULT_MAX_ENERGY, // Начинаем с полной энергии
                lastEnergyRefillTimestamp: Date.now(), // Текущее время
                dailyShopPurchases: {},
                achievementsStatus: {},
                totalGoldCollected: 0,
                totalKills: 0,
                booleanFlags: {},
                levelsCompleted: {},
                achievementLevel: 1,
                achievementXp: 0,
                artifactLevels: {},
                artifactChestPity: {},
                gearKeys: 0,
                totalArtifactChestsOpened: 0,
                gearChestPity: {},
                totalGearChestsOpened: 0,
                dailyDeals: [],
                dailyDealsLastGenerated: null,
                lastOpenedChestInfo: null,
                lastChestRewards: null,
                activeDebuffs: [], // Инициализация дебаффов
            };
        }

        // --- Если есть сохраненные данные ---
        let parsed = JSON.parse(saved);
        console.log("Saved state found. Processing...");

        // --- Миграция старых данных (если нужно) ---
        // ... (твой код миграции playerBaseStats остается) ...
        if (parsed && parsed.playerBaseStats && (parsed.playerBaseStats.defense !== undefined || parsed.playerBaseStats.health !== undefined)) {
            console.log("Миграция старых playerBaseStats...");
            let updatedStats = { ...parsed.playerBaseStats };
            delete updatedStats.defense; // Удаляем старое поле defense, если оно было напрямую в playerBaseStats
            if (updatedStats.health !== undefined) { updatedStats.hp = updatedStats.health; delete updatedStats.health; }
            Object.keys(DEFAULT_BASE_STATS).forEach(key => { updatedStats[key] = updatedStats[key] ?? DEFAULT_BASE_STATS[key]; });
            parsed.playerBaseStats = updatedStats;
            console.log("Миграция playerBaseStats завершена.");
        }


        // --- Инициализация полей по умолчанию, если они отсутствуют В ЗАГРУЖЕННОМ СОСТОЯНИИ ---
        // (Важно делать это ДО проверки equipped)
        if (!parsed.playerBaseStats) parsed.playerBaseStats = { ...DEFAULT_BASE_STATS };
        else { // Убедимся, что все поля из DEFAULT_BASE_STATS есть в playerBaseStats
           Object.keys(DEFAULT_BASE_STATS).forEach(key => {
               if (parsed.playerBaseStats[key] === undefined) {
                   parsed.playerBaseStats[key] = DEFAULT_BASE_STATS[key];
               }
           });
        }

        if (parsed.playerHp === undefined) parsed.playerHp = parsed.playerBaseStats?.hp ?? DEFAULT_BASE_STATS.hp;
        if (parsed.playerRace === undefined) parsed.playerRace = null;
        if (parsed.inventory === undefined) parsed.inventory = [];
        if (parsed.artifactLevels === undefined) parsed.artifactLevels = {};
        if (parsed.artifactChestPity === undefined) parsed.artifactChestPity = {};
        if (parsed.gearKeys === undefined) parsed.gearKeys = 0;
        if (parsed.totalArtifactChestsOpened === undefined) parsed.totalArtifactChestsOpened = 0;
        if (parsed.gearChestPity === undefined) parsed.gearChestPity = {};
        if (parsed.totalGearChestsOpened === undefined) parsed.totalGearChestsOpened = 0;
        if (parsed.dailyShopPurchases === undefined) parsed.dailyShopPurchases = {};
        if (parsed.achievementsStatus === undefined) parsed.achievementsStatus = {};
        if (parsed.totalGoldCollected === undefined) parsed.totalGoldCollected = 0;
        if (parsed.totalKills === undefined) parsed.totalKills = 0;
        if (parsed.booleanFlags === undefined) parsed.booleanFlags = {};
        if (parsed.levelsCompleted === undefined) parsed.levelsCompleted = {};
        if (parsed.achievementLevel === undefined) parsed.achievementLevel = 1;
        if (parsed.achievementXp === undefined) parsed.achievementXp = 0;
        if (parsed.dailyDeals === undefined) parsed.dailyDeals = [];
        if (parsed.dailyDealsLastGenerated === undefined) parsed.dailyDealsLastGenerated = null;
        if (parsed.lastOpenedChestInfo === undefined) parsed.lastOpenedChestInfo = null;
        if (parsed.lastChestRewards === undefined) parsed.lastChestRewards = null;
        if (parsed.energyMax === undefined) parsed.energyMax = DEFAULT_MAX_ENERGY;
        if (parsed.energyCurrent === undefined) parsed.energyCurrent = parsed.energyMax; // Если не сохранено, считаем полным
        if (parsed.lastEnergyRefillTimestamp === undefined) parsed.lastEnergyRefillTimestamp = Date.now(); // Если не сохранено, ставим текущее время
        if (parsed.activeDebuffs === undefined) parsed.activeDebuffs = []; // Инициализация дебаффов если отсутствуют
        // ... добавь инициализацию для других полей, если нужно ...

        // --- Проверка и инициализация 'equipped' ---
        const savedEquipped = parsed.equipped;
        const isSavedEquippedInvalid = !savedEquipped || typeof savedEquipped !== 'object' || Object.keys(savedEquipped).length !== 6; // Простая проверка на объект с 6 слотами

        if (isSavedEquippedInvalid) {
            console.warn("Saved 'equipped' state is missing or invalid. Initializing with default Common set.");
            parsed.equipped = getDefaultEquippedSet(); // <<< Устанавливаем дефолт, если сохраненное некорректно
        } else {
            console.log("Using valid 'equipped' state from storage.");
            // Опционально: можно добавить проверку, что сохраненные предметы валидны
        }

        // --- Восстановление Set для collectedArtifacts ---
        if (parsed.collectedArtifacts && !(parsed.collectedArtifacts instanceof Set)) {
            try {
                parsed.collectedArtifacts = new Set(parsed.collectedArtifacts); // <<< Восстанавливаем Set из массива
                console.log("Reconstructed Set for collectedArtifacts.");
            } catch (e) {
                console.error("Failed to reconstruct Set for collectedArtifacts, resetting.", e);
                parsed.collectedArtifacts = new Set();
            }
        } else if (!parsed.collectedArtifacts) {
            parsed.collectedArtifacts = new Set(); // Инициализируем, если не было
        }

        return parsed; // Возвращаем обработанное состояние

    } catch (error) {
        console.error("Critical error during loadFromLocalStorage:", error);
        localStorage.removeItem(STORAGE_KEY); // Очищаем хранилище при критической ошибке
        // Возвращаем полный дефолтный набор при ошибке
        return {
            equipped: getDefaultEquippedSet(),
            collectedArtifacts: new Set(),
            gold: 0, diamonds: 0, username: null, powerLevel: 0,
            playerBaseStats: { ...DEFAULT_BASE_STATS }, playerHp: DEFAULT_BASE_STATS.hp, playerRace: null,
            inventory: [], dailyShopPurchases: {}, achievementsStatus: {}, totalGoldCollected: 0, totalKills: 0,
            booleanFlags: {}, levelsCompleted: {}, achievementLevel: 1, achievementXp: 0, artifactLevels: {},
            artifactChestPity: {}, gearKeys: 0, totalArtifactChestsOpened: 0, gearChestPity: {}, totalGearChestsOpened: 0,
            dailyDeals: [], dailyDealsLastGenerated: null, lastOpenedChestInfo: null, lastChestRewards: null,
            energyMax: DEFAULT_MAX_ENERGY,
            energyCurrent: DEFAULT_MAX_ENERGY,
            lastEnergyRefillTimestamp: Date.now(),
            activeDebuffs: [], // Инициализация дебаффов
            isAffectedByWeakeningAura: false, // <<< НОВОЕ Состояние для ауры
        };
    }
};


const RARITY_WEIGHTS = {
    common: 100,
    uncommon: 50, // Оставь, если планируешь Uncommon артефакты
    rare: 25,
    legendary: 8,
    mythic: 2
};

// Хелпер для взвешенного случайного выбора
// Хелпер для взвешенного случайного выбора
function weightedRandom(itemsWithWeight) { // itemsWithWeight = [{ item: data, weight: number }, ...]
    // --- >>> ЛОГ 5: Вход в функцию <<< ---
    // console.log('[weightedRandom] Функция вызвана. Входных элементов:', itemsWithWeight?.length ?? 'undefined/null');
    if (!itemsWithWeight || itemsWithWeight.length === 0) {
        console.error('[weightedRandom] Получен пустой или невалидный массив!');
        return null;
    }

    // --- >>> ЛОГ 6: Перед вычислением веса <<< ---
    // console.log('[weightedRandom] Вычисление totalWeight...');
    let totalWeight = itemsWithWeight.reduce((sum, entry) => {
        const weight = entry?.weight ?? 0; // Безопасное получение веса, default 0
        if (typeof weight !== 'number' || isNaN(weight) || weight < 0) {
            console.warn('[weightedRandom] Невалидный вес у элемента:', entry, 'Используем 0.');
            return sum;
        }
        return sum + weight;
    }, 0);
    // --- >>> ЛОГ 7: После вычисления веса <<< ---
    // console.log('[weightedRandom] Общий вес:', totalWeight);

    if (totalWeight <= 0) {
        console.warn('[weightedRandom] Общий вес <= 0. Возврат случайного элемента (если есть).');
        // Fallback на случайный выбор, если массив не пуст
        return itemsWithWeight.length > 0 ? itemsWithWeight[Math.floor(Math.random() * itemsWithWeight.length)].item : null;
    }

    let random = Math.random() * totalWeight;
    // --- >>> ЛОГ 8: Случайное значение <<< ---
    // console.log('[weightedRandom] Случайное значение * вес:', random);

    for (let i = 0; i < itemsWithWeight.length; i++) {
        const currentWeight = itemsWithWeight[i]?.weight ?? 0; // Безопасное получение веса
        // --- >>> ЛОГ 9: Внутри цикла <<< ---
        // console.log(`[weightedRandom] Цикл ${i}. Проверка ${random} < ${currentWeight} (Вес элемента: ${currentWeight})`);
        if (random < currentWeight) {
            // --- >>> ЛОГ 10: Успешный выбор <<< ---
            // console.log('[weightedRandom] Условие выполнено, возврат item:', itemsWithWeight[i]?.item);
            return itemsWithWeight[i]?.item; // Безопасный доступ к item
        }
        random -= currentWeight; // Вычитаем корректный вес
    }

    // --- >>> ЛОГ 11: Ошибка/Fallback <<< ---
    console.error('[weightedRandom] Цикл завершился без выбора! Этого не должно происходить при totalWeight > 0. Возврат последнего элемента.');
    // Fallback на всякий случай (но сюда не должно доходить)
    return itemsWithWeight.length > 0 ? itemsWithWeight[itemsWithWeight.length - 1]?.item : null;
}

// Веса для редкостей (примерные, можно настроить)
const DAILY_DEAL_RARITY_WEIGHTS = {
    common: 70,
    uncommon: 25,
    rare: 5,
    // Epic/Epic/Mythic тут не участвуют по условию
};

// <<< НОВЫЙ ХЕЛПЕР: Выбор ID артефакта из сета С УЧЕТОМ РЕДКОСТИ >>>
const _selectWeightedArtifactIdFromSet_ByRarity = (setId) => {
    // Находим нужный сет в импортированных ARTIFACT_SETS
    const targetSet = ARTIFACT_SETS.find(s => s.id === setId);
    if (!targetSet || !targetSet.artifacts || targetSet.artifacts.length === 0) {
        console.error(`[SelectWeightedArtifact] Сет ${setId} не найден или пуст!`);
        return null; // Возвращаем null, если выбрать не из чего
    }

    // Создаем взвешенный пул ID артефактов из этого сета
    const weightedArtifactPool = targetSet.artifacts.map(artifact => ({
        id: artifact.id,
        // Берем вес из RARITY_WEIGHTS по редкости артефакта (приводим к нижнему регистру)
        // Если редкости нет в RARITY_WEIGHTS, ставим вес 1 по умолчанию
        weight: RARITY_WEIGHTS[artifact.rarity.toLowerCase()] || 1
    }));

    // Считаем общий вес для этого сета
    const totalWeight = weightedArtifactPool.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight <= 0) { // Если все веса 0, выбираем случайно
        console.warn(`[SelectWeightedArtifact] Все веса для сета ${setId} нулевые, выбор случайный.`);
        const randomIndex = Math.floor(Math.random() * weightedArtifactPool.length);
        return weightedArtifactPool[randomIndex].id;
    }

    // Выбираем ID по весу
    let randomValue = Math.random() * totalWeight;
    for (const item of weightedArtifactPool) {
        if (randomValue < item.weight) {
            return item.id; // Возвращаем ID выбранного артефакта
        }
        randomValue -= item.weight;
    }

    // Fallback на всякий случай
    console.warn(`[SelectWeightedArtifact] Ошибка взвешенного выбора для сета ${setId}, возврат последнего элемента.`);
    return weightedArtifactPool[weightedArtifactPool.length - 1].id;
};


const _rollWeightedRarity_Gear = (rarityChances) => {
    if (!rarityChances || Object.keys(rarityChances).length === 0) {
        console.error("[RollRarityGear] Объект шансов пуст!");
        return 'Common'; // Возвращаем Common по умолчанию в случае ошибки
    }
    // Считаем сумму всех шансов (на случай если она не равна 1)
    const totalWeight = Object.values(rarityChances).reduce((sum, chance) => sum + (chance || 0), 0);
    if (totalWeight <= 0) {
        console.warn("[RollRarityGear] Сумма шансов равна нулю, возвращаем первую редкость.");
        return Object.keys(rarityChances)[0] || 'Common';
    }

    const randomValue = Math.random() * totalWeight;
    let cumulativeWeight = 0;
    // Проходим по шансам и выбираем нужный
    for (const [rarity, chance] of Object.entries(rarityChances)) {
        cumulativeWeight += (chance || 0);
        if (randomValue < cumulativeWeight) {
            return rarity; // Возвращаем строку с редкостью (e.g., "Rare")
        }
    }
    // Fallback на случай ошибок округления
    console.warn("[RollRarityGear] Не удалось выбрать редкость по весу, возврат последнего.");
    return Object.keys(rarityChances).pop() || 'Common';
};


// <<< ПОЛНЫЙ КОД: Хелпер для выбора СЛУЧАЙНОГО предмета СНАРЯЖЕНИЯ заданной редкости >>>
const _selectRandomGearItemByRarity_Gear = (targetRarity) => {
    // Фильтруем базу данных предметов по нужной редкости
    const possibleItems = itemsDatabase.filter(item => item.rarity === targetRarity);

    if (possibleItems.length === 0) {
        console.error(`[SelectGearByRarity] Нет предметов снаряжения с редкостью ${targetRarity} в itemsDatabase! Попытка найти Common.`);
        // Пытаемся вернуть случайный Common предмет как fallback
        const commonItems = itemsDatabase.filter(item => item.rarity === 'Common');
        if (commonItems.length > 0) {
            const randomIndex = Math.floor(Math.random() * commonItems.length);
            // Возвращаем копию данных Common предмета
            return { ...commonItems[randomIndex] };
        }
        console.error(`[SelectGearByRarity] Нет даже Common предметов! Возврат null.`);
        return null; // Если даже Common нет
    }
    // Выбираем случайный индекс из отфильтрованного списка
    const randomIndex = Math.floor(Math.random() * possibleItems.length);
    // Возвращаем копию данных выбранного предмета
    return { ...possibleItems[randomIndex] };
};

const REFRESH_HOUR_UTC = 2;


// --- Инициализация ---
const savedState = loadFromLocalStorage();

// --- Создание стора Zustand ---
const useGameStore = create((set, get) => ({
    // ================== Состояние (State) - Объединенное ==================
    gold: savedState.gold ?? 0,
    diamonds: savedState.diamonds ?? 0,
    username: savedState.username || null,
    powerLevel: savedState.powerLevel ?? 0, // Пересчитывается при изменении статов/экипировки/артефактов
    energyMax: savedState.energyMax ?? DEFAULT_MAX_ENERGY,
    energyCurrent: savedState.energyCurrent ?? DEFAULT_MAX_ENERGY,
    lastEnergyRefillTimestamp: savedState.lastEnergyRefillTimestamp ?? Date.now(),
    lastOpenedLevelChestRewards: null, // <<< НОВОЕ: Массив с наградами [{ type, amount?, id?, name?, icon?, rarity? }] или null
    levelChestStates: {}, // <<< НОВОЕ (Опционально): для сохранения статуса открытых сундуков между сессиями { instanceId: true }

    // --- Игрок ---
    playerHp: savedState.playerHp ?? DEFAULT_BASE_STATS.hp,
    playerRace: savedState.playerRace || null,
    playerBaseStats: savedState.playerBaseStats || { ...DEFAULT_BASE_STATS },

    // --- Инвентарь и Экипировка ---
    inventory: savedState.inventory || [],
    equipped: savedState.equipped || { weapon: null, amulet: null, ring: null, helmet: null, armor: null, boots: null },

    // --- Артефакты <<< НОВОЕ >>> ---
    collectedArtifacts: new Set(savedState.collectedArtifacts || []), // Храним Set, загружаем из массива
    artifactLevels: savedState.artifactLevels || {}, // { artifactId: { level: number, shards: number } }
    // playerShards: savedState.playerShards ?? 0, // Если бы использовали общие осколки

    // --- Магазин ---
    dailyShopPurchases: savedState.dailyShopPurchases || {},

    // --- Достижения ---
    achievementsStatus: savedState.achievementsStatus || {},
    totalGoldCollected: savedState.totalGoldCollected || 0,
    totalKills: savedState.totalKills || 0,
    booleanFlags: savedState.booleanFlags || {},
    levelsCompleted: savedState.levelsCompleted || {},
    achievementLevel: savedState.achievementLevel || 1,
    achievementXp: savedState.achievementXp || 0,
    artifactChestPity: savedState.artifactChestPity || {}, // { chestId: count }
    gearKeys: savedState.gearKeys || 0,                  // Счетчик ключей для сундуков снаряжения
    totalArtifactChestsOpened: savedState.totalArtifactChestsOpened || 0, // Счетчик для ачивок
    gearChestPity: savedState.gearChestPity || {}, // <<< Убедись, что она есть и написана ТОЧНО ТАК ЖЕ
    // --- КОНЕЦ ПРОВЕРКИ ---

    totalGearChestsOpened: savedState.totalGearChestsOpened || 0,
    lastOpenedChestInfo: null, // null | { chestId: string, amount: 1 | 10, type: 'artifact' | 'gear' }
    lastChestRewards: null, // null | Array<{type: string, icon?: string, name?: string, amount?: number, rarity?: string, isNew?: boolean}>
    dailyDeals: savedState.dailyDeals ?? [], // Массив текущих сделок
    dailyDealsLastGenerated: savedState.dailyDealsLastGenerated ?? null, // Timestamp
    activeDebuffs: savedState.activeDebuffs || [], // NEW STATE: Array to hold { id, type, strength, endTime }


    // ---------------------------------

    // ================== Селекторы (Computed/Getters) ==================

// Внутри useGameStore.js
// Убедись, что импорты getArtifactById, ARTIFACT_SETS и DEFAULT_BASE_STATS корректны

computedStats: () => {
    const state = get(); // Функция доступа к состоянию (например, из Zustand)
    const now = Date.now();

    // --- Фильтрация активных дебаффов ---
    const currentActiveDebuffs = (state.activeDebuffs || []).filter(debuff => now < debuff.endTime);

    // --- Расчет суммарных эффектов от дебаффов ---
    let totalWeakenDamageReductionPercent = 0;  // Для дебаффов типа 'weaken' (из логики код2)
    let totalWeakenMaxHpReductionPercent = 0;   // Для дебаффов типа 'weaken' (из логики код2)

    let totalOtherDamageReductionPercent = 0;  // Для ДРУГИХ дебаффов (из структуры код1)
    let totalOtherMaxHpReductionPercent = 0;   // Для ДРУГИХ дебаффов (из структуры код1)

    currentActiveDebuffs.forEach(debuff => {
        if (debuff.type === 'weaken') {
            totalWeakenDamageReductionPercent += (debuff.strength || 0);
            totalWeakenMaxHpReductionPercent += (debuff.strength || 0);
        } else {
            // Обработка ДРУГИХ типов дебаффов (согласно структуре из код1)
            // В код1 было: "// ... (цикл по currentOtherActiveDebuffs для расчета других эффектов, если они есть) ..."
            // Так как конкретная логика расчета отсутствовала, здесь приведено предположение,
            // что "другие" дебаффы могут иметь свойства damageReductionPercent или maxHpReductionPercent.
            // Эту часть нужно будет адаптировать под реальную структуру "других" дебаффов.
            if (debuff.hasOwnProperty('damageReductionPercent')) {
                 totalOtherDamageReductionPercent += (debuff.damageReductionPercent || 0);
            }
            if (debuff.hasOwnProperty('maxHpReductionPercent')) {
                 totalOtherMaxHpReductionPercent += (debuff.maxHpReductionPercent || 0);
            }
            // Другие типы дебаффов и их эффекты можно добавить здесь
            // Например: else if (debuff.type === 'slow') { totalSlowPercent += debuff.strength; }
        }
    });

    // Ограничение максимального снижения (клемпинг)
    totalWeakenDamageReductionPercent = Math.min(totalWeakenDamageReductionPercent, 80);
    totalWeakenMaxHpReductionPercent = Math.min(totalWeakenMaxHpReductionPercent, 80);

    totalOtherDamageReductionPercent = Math.min(totalOtherDamageReductionPercent, 80); // Предполагаем аналогичный лимит
    totalOtherMaxHpReductionPercent = Math.min(totalOtherMaxHpReductionPercent, 80);  // Предполагаем аналогичный лимит

    

    // 1. Начинаем с базовых статов (раса или дефолт)
    let finalStats = { ...DEFAULT_BASE_STATS, ...(state.playerBaseStats || {}) };

    // 2. Применяем бонусы от экипировки
    let totalGearAttackSpeedPercentBonus = 0;
    for (const slot in state.equipped) {
        const item = state.equipped[slot];
        if (item) {
            finalStats.hp = (finalStats.hp || 0) + (item.hpBonus || 0);
            finalStats.attack = (finalStats.attack || 0) + (item.attackBonus || 0);
            totalGearAttackSpeedPercentBonus += item.attackSpeedBonus || 0;
            finalStats.critChance = (finalStats.critChance || 0) + (item.critChanceBonus || 0);
            finalStats.doubleStrikeChance = (finalStats.doubleStrikeChance || 0) + (item.doubleStrikeChanceBonus || 0);
            finalStats.speed = (finalStats.speed || 0) + (item.speedBonus || 0);
            finalStats.range = (finalStats.range || 0) + (item.rangeBonus || 0);
            finalStats.defense = (finalStats.defense || 0) + (item.defenseBonus || 0);
            finalStats.luck = (finalStats.luck || 0) + (item.luckBonus || 0);
            finalStats.hpRegen = (finalStats.hpRegen || 0) + (item.hpRegenBonus || 0);
            finalStats.evasion = (finalStats.evasion || 0) + (item.evasionBonus || 0);
            finalStats.maxMana = (finalStats.maxMana || 0) + (item.maxManaBonus || 0);
            finalStats.elementalDmgPercent = (finalStats.elementalDmgPercent || 0) + (item.elementalDmgPercentBonus || 0);
            finalStats.goldFind = (finalStats.goldFind || 0) + (item.goldFindBonus || 0);
            finalStats.bossDmg = (finalStats.bossDmg || 0) + (item.bossDmgBonus || 0);
            finalStats.shardFind = (finalStats.shardFind || 0) + (item.shardFindBonus || 0);
            finalStats.atkPercentBonus = (finalStats.atkPercentBonus || 0) + (item.atkPercentBonus || 0);
            finalStats.moveSpeedPercentBonus = (finalStats.moveSpeedPercentBonus || 0) + (item.moveSpeedPercentBonus || 0);
            finalStats.bonusProjectiles = (finalStats.bonusProjectiles || 0) + (item.bonusProjectiles || 0);
        }
    }
    // console.log("  Stats after items:", JSON.stringify(finalStats), `Gear AS Bonus: ${totalGearAttackSpeedPercentBonus}%`);

    // 3. Применяем бонусы от артефактов (уровни)
    const { artifactLevels, collectedArtifacts } = state;
    let totalArtifactHp = 0, totalArtifactAttack = 0, totalArtifactDefense = 0, totalArtifactHpRegen = 0,
        totalArtifactAttackSpeed = 0, totalArtifactEvasion = 0, totalArtifactMoveSpeedBonus = 0,
        totalArtifactAtkPercentBonus = 0, totalArtifactMaxMana = 0, totalArtifactElementalDmgPercent = 0,
        totalArtifactCritChance = 0, totalArtifactDoubleStrikeChance = 0, totalArtifactGoldFind = 0,
        totalArtifactLuck = 0, totalArtifactBossDmg = 0, totalArtifactShardFind = 0, totalArtifactBonusProjectiles = 0;

    for (const artifactId in artifactLevels) {
        if (collectedArtifacts.has(artifactId)) {
            const artifactData = getArtifactById(artifactId); // Предполагается, что эта функция существует
            const artifactInfo = artifactLevels[artifactId];
            if (artifactData && artifactInfo) {
                const level = artifactInfo.level;
                if (level <= 0) continue;
                if (artifactData.baseStats) {
                    for (const [statName, baseValue] of Object.entries(artifactData.baseStats)) {
                        switch (statName) {
                            case "hp": totalArtifactHp += baseValue; break;
                            case "attack": totalArtifactAttack += baseValue; break;
                            case "defense": totalArtifactDefense += baseValue; break;
                            case "hpRegen": totalArtifactHpRegen += baseValue; break;
                            case "attackSpeed": totalArtifactAttackSpeed += baseValue; break;
                            case "evasion": totalArtifactEvasion += baseValue; break;
                            case "moveSpeedPercentBonus": totalArtifactMoveSpeedBonus += baseValue; break;
                            case "atkPercentBonus": totalArtifactAtkPercentBonus += baseValue; break;
                            case "maxMana": totalArtifactMaxMana += baseValue; break;
                            case "elementalDmgPercent": totalArtifactElementalDmgPercent += baseValue; break;
                            case "critChance": totalArtifactCritChance += baseValue; break;
                            case "doubleStrikeChance": totalArtifactDoubleStrikeChance += baseValue; break;
                            case "goldFind": totalArtifactGoldFind += baseValue; break;
                            case "luck": totalArtifactLuck += baseValue; break;
                            case "bossDmg": totalArtifactBossDmg += baseValue; break;
                            case "shardFind": totalArtifactShardFind += baseValue; break;
                            case "bonusProjectiles": totalArtifactBonusProjectiles += baseValue; break;
                            default: console.warn(`[WARN] Неизвестный БАЗОВЫЙ стат артефакта '${artifactId}': ${statName}`); break;
                        }
                    }
                }
                if (artifactData.levelStats) {
                    for (const [statName, levelValue] of Object.entries(artifactData.levelStats)) {
                        const bonus = levelValue * level;
                        if (bonus === 0) continue;
                        switch (statName) {
                            case "hp": totalArtifactHp += bonus; break;
                            case "attack": totalArtifactAttack += bonus; break;
                            case "defense": totalArtifactDefense += bonus; break;
                            case "hpRegen": totalArtifactHpRegen += bonus; break;
                            case "attackSpeed": totalArtifactAttackSpeed += bonus; break;
                            case "evasion": totalArtifactEvasion += bonus; break;
                            case "moveSpeedPercentBonus": totalArtifactMoveSpeedBonus += bonus; break;
                            case "atkPercentBonus": totalArtifactAtkPercentBonus += bonus; break;
                            case "maxMana": totalArtifactMaxMana += bonus; break;
                            case "elementalDmgPercent": totalArtifactElementalDmgPercent += bonus; break;
                            case "critChance": totalArtifactCritChance += bonus; break;
                            case "doubleStrikeChance": totalArtifactDoubleStrikeChance += bonus; break;
                            case "goldFind": totalArtifactGoldFind += bonus; break;
                            case "luck": totalArtifactLuck += bonus; break;
                            case "bossDmg": totalArtifactBossDmg += bonus; break;
                            case "shardFind": totalArtifactShardFind += bonus; break;
                            case "bonusProjectiles": totalArtifactBonusProjectiles += bonus; break;
                            default: console.warn(`[WARN] Неизвестный стат УРОВНЯ артефакта '${artifactId}': ${statName}`); break;
                        }
                    }
                }
            } else {
                console.warn(`[WARN] Не найдены данные или информация об уровне для артефакта ID: ${artifactId}`);
            }
        }
    }

    // 4. Применяем СУММАРНЫЕ бонусы от артефактов (из п.3) к finalStats
    finalStats.hp += totalArtifactHp;
    finalStats.attack += totalArtifactAttack;
    finalStats.defense += totalArtifactDefense;
    finalStats.hpRegen += totalArtifactHpRegen;
    totalGearAttackSpeedPercentBonus += totalArtifactAttackSpeed; // Процентный бонус к скорости атаки суммируется
    finalStats.critChance += totalArtifactCritChance;
    finalStats.doubleStrikeChance += totalArtifactDoubleStrikeChance;
    finalStats.evasion += totalArtifactEvasion;
    finalStats.moveSpeedPercentBonus = (finalStats.moveSpeedPercentBonus || 0) + totalArtifactMoveSpeedBonus;
    finalStats.atkPercentBonus = (finalStats.atkPercentBonus || 0) + totalArtifactAtkPercentBonus;
    finalStats.maxMana += totalArtifactMaxMana;
    finalStats.elementalDmgPercent += totalArtifactElementalDmgPercent;
    finalStats.goldFind += totalArtifactGoldFind;
    finalStats.luck += totalArtifactLuck;
    finalStats.bossDmg += totalArtifactBossDmg;
    finalStats.shardFind += totalArtifactShardFind;
    finalStats.bonusProjectiles += totalArtifactBonusProjectiles;
    // console.log("  Stats after Artifact Level bonuses:", JSON.stringify(finalStats));

    // 5. Применяем бонусы от АКТИВНЫХ сетов артефактов
    ARTIFACT_SETS.forEach(set => { // Предполагается, что ARTIFACT_SETS определен
        const activeOwnedInSet = set.artifacts.filter(artifact => {
            const stateInfo = artifactLevels[artifact.id];
            return collectedArtifacts.has(artifact.id) && stateInfo && stateInfo.level > 0;
        }).length;

        set.bonuses.forEach(bonus => {
            const match = bonus.condition.match(/\[\s*Собрано\s*(\d+)\s*\]/i);
            const requiredCount = match ? parseInt(match[1], 10) : 0;
            if (requiredCount > 0 && activeOwnedInSet >= requiredCount) {
                const desc = bonus.description.toLowerCase();
                const valueMatch = desc.match(/([+-]?\d+(\.\d+)?)/);
                const value = valueMatch ? parseFloat(valueMatch[1]) : 0;
                let applied = false;

                if (desc.includes('макс. hp') || desc.includes('hp')) {
                    if (desc.includes('%')) finalStats.hp *= (1 + value / 100); else finalStats.hp += value;
                    applied = true;
                } else if (desc.includes('сила атаки') || desc.includes('урон') || desc.includes('атак')) {
                    if (desc.includes('%')) finalStats.atkPercentBonus = (finalStats.atkPercentBonus || 0) + value; else finalStats.attack += value;
                    applied = true;
                } else if (desc.includes('скорость атаки')) {
                    if (desc.includes('%')) totalGearAttackSpeedPercentBonus += value; applied = true;
                } else if (desc.includes('регенерация hp')) {
                    finalStats.hpRegen = (finalStats.hpRegen || 0) + value; applied = true;
                } else if (desc.includes('шанс двойного удара') || desc.includes('двойной удар')) {
                    finalStats.doubleStrikeChance = (finalStats.doubleStrikeChance || 0) + value; applied = true;
                } else if (desc.includes('шанс найти золото') || desc.includes('поиск золота')) {
                    finalStats.goldFind = (finalStats.goldFind || 0) + value; applied = true;
                } else if (desc.includes('шанс найти осколки') || desc.includes('поиск осколков')) {
                    finalStats.shardFind = (finalStats.shardFind || 0) + value; applied = true;
                } else if (desc.includes('шанс крит. удара') || desc.includes('крит. шанс')) {
                    finalStats.critChance = (finalStats.critChance || 0) + value; applied = true;
                } else if (desc.includes('защита')) {
                    finalStats.defense = (finalStats.defense || 0) + value; applied = true;
                } else if (desc.includes('удача')) {
                    finalStats.luck = (finalStats.luck || 0) + value; applied = true;
                } else if (desc.includes('урон боссам')) {
                    finalStats.bossDmg = (finalStats.bossDmg || 0) + value; applied = true;
                } else if (desc.includes('урон стихиями')) {
                    finalStats.elementalDmgPercent = (finalStats.elementalDmgPercent || 0) + value; applied = true;
                } else if (desc.includes('макс. мана') || desc.includes('мана')) {
                    finalStats.maxMana = (finalStats.maxMana || 0) + value; applied = true;
                } else if (desc.includes('шанс уклонения') || desc.includes('уклонение')) {
                    finalStats.evasion = (finalStats.evasion || 0) + value; applied = true;
                } else if (desc.includes('скорость передвижения')) {
                    finalStats.moveSpeedPercentBonus = (finalStats.moveSpeedPercentBonus || 0) + value; applied = true;
                } else if (desc.includes('+1 доп. снаряд при атаке')) {
                    finalStats.bonusProjectiles = (finalStats.bonusProjectiles || 0) + 1; applied = true;
                }
                if (!applied) console.warn(`[WARN] Не удалось распознать бонус сета '${set.name}': ${bonus.description}`);
            }
        });
    });
    // console.log("  Stats after set bonuses:", JSON.stringify(finalStats));

    // 6. Применяем процентные бонусы (кроме дебаффов)
    finalStats.attack = (finalStats.attack || 0) * (1 + (finalStats.atkPercentBonus || 0) / 100);
    finalStats.attackSpeed = (finalStats.attackSpeed || DEFAULT_BASE_STATS.attackSpeed || 1) * (1 + totalGearAttackSpeedPercentBonus / 100);
    finalStats.speed = (finalStats.speed || DEFAULT_BASE_STATS.speed || 1) * (1 + (finalStats.moveSpeedPercentBonus || 0) / 100);


    // --- >>> ПРИМЕНЯЕМ ДЕБАФФЫ И ЭФФЕКТ АУРЫ <<< ---
    let debuffLogMessages = [];

    // Сохраняем статы перед применением каждой группы модификаторов для логгирования
    let attackBeforeModification, hpBeforeModification;

    // 6.1 Применяем ДРУГИЕ дебаффы (из структуры код1, если есть)
    if (totalOtherDamageReductionPercent > 0 || totalOtherMaxHpReductionPercent > 0) {
        attackBeforeModification = finalStats.attack;
        hpBeforeModification = finalStats.hp;

        if (totalOtherDamageReductionPercent > 0) {
            finalStats.attack *= (1 - totalOtherDamageReductionPercent / 100);
            debuffLogMessages.push(`Attack reduced by ${totalOtherDamageReductionPercent}% (other debuff). (${attackBeforeModification.toFixed(1)} -> ${finalStats.attack.toFixed(1)})`);
        }
        if (totalOtherMaxHpReductionPercent > 0) {
            // Если атака уже была изменена, hpBeforeModification все еще корректен для исходного значения HP перед этой группой дебаффов
            finalStats.hp *= (1 - totalOtherMaxHpReductionPercent / 100);
            debuffLogMessages.push(`HP reduced by ${totalOtherMaxHpReductionPercent}% (other debuff). (${hpBeforeModification.toFixed(1)} -> ${finalStats.hp.toFixed(1)})`);
        }
    }

    // 6.2 Применяем дебаффы типа 'weaken' (из логики код2)
    if (totalWeakenDamageReductionPercent > 0 || totalWeakenMaxHpReductionPercent > 0) {
        attackBeforeModification = finalStats.attack; // Значение после "other" дебаффов
        hpBeforeModification = finalStats.hp;       // Значение после "other" дебаффов

        if (totalWeakenDamageReductionPercent > 0) {
            finalStats.attack *= (1 - totalWeakenDamageReductionPercent / 100);
            debuffLogMessages.push(`Attack reduced by ${totalWeakenDamageReductionPercent}% (weaken debuff). (${attackBeforeModification.toFixed(1)} -> ${finalStats.attack.toFixed(1)})`);
        }
        if (totalWeakenMaxHpReductionPercent > 0) {
            finalStats.hp *= (1 - totalWeakenMaxHpReductionPercent / 100);
            debuffLogMessages.push(`HP reduced by ${totalWeakenMaxHpReductionPercent}% (weaken debuff). (${hpBeforeModification.toFixed(1)} -> ${finalStats.hp.toFixed(1)})`);
        }
    }

    // 6.3 Применяем эффект от АУРЫ ослабления (из код1, если активен)
    const auraIsActive = state.isAffectedByWeakeningAura; // <<< ПРОВЕРКА ФЛАГА АУРЫ из код1 >>>
    const auraStrengthPercent = 10; // 10% снижение от ауры (из код1)

    if (auraIsActive) {
        attackBeforeModification = finalStats.attack; // Значение после всех предыдущих дебаффов
        hpBeforeModification = finalStats.hp;       // Значение после всех предыдущих дебаффов

        finalStats.attack *= (1 - auraStrengthPercent / 100);
        debuffLogMessages.push(`Attack reduced by ${auraStrengthPercent}% (aura). (${attackBeforeModification.toFixed(1)} -> ${finalStats.attack.toFixed(1)})`);

        finalStats.hp *= (1 - auraStrengthPercent / 100);
        debuffLogMessages.push(`HP reduced by ${auraStrengthPercent}% (aura). (${hpBeforeModification.toFixed(1)} -> ${finalStats.hp.toFixed(1)})`);
    }

    // Выводим итоговый лог о примененных дебаффах/ауре
    if (debuffLogMessages.length > 0) {
    } else {
    }
    // --- >>> КОНЕЦ БЛОКА ПРИМЕНЕНИЯ ДЕБАФФОВ И АУРЫ <<< ---

    // --- Финальное округление и клемпинг ---
    finalStats.hp = Math.max(1, Math.round(finalStats.hp || 0));
    finalStats.attack = Math.max(0, Math.round(finalStats.attack || 0));
    finalStats.attackSpeed = parseFloat(Math.max(0.1, (finalStats.attackSpeed || 0)).toFixed(2));
    finalStats.critChance = Math.min(100, Math.max(0, Math.round(finalStats.critChance || 0)));
    finalStats.doubleStrikeChance = Math.min(100, Math.max(0, Math.round(finalStats.doubleStrikeChance || 0)));
    finalStats.speed = parseFloat(Math.max(0.1, (finalStats.speed || 0)).toFixed(2));
    finalStats.range = Math.max(1, Math.round(finalStats.range || 0));
    finalStats.skin = finalStats.skin || DEFAULT_BASE_STATS.skin;
    finalStats.defense = Math.max(0, Math.round(finalStats.defense || 0));
    finalStats.hpRegen = Math.max(0, parseFloat((finalStats.hpRegen || 0).toFixed(1)));
    finalStats.evasion = Math.min(90, Math.max(0, Math.round(finalStats.evasion || 0)));
    finalStats.maxMana = Math.max(0, Math.round(finalStats.maxMana || 0));
    finalStats.elementalDmgPercent = Math.max(0, Math.round(finalStats.elementalDmgPercent || 0));
    finalStats.goldFind = Math.max(0, Math.round(finalStats.goldFind || 0));
    finalStats.luck = Math.max(0, Math.round(finalStats.luck || 0));
    finalStats.bossDmg = Math.max(0, Math.round(finalStats.bossDmg || 0));
    finalStats.shardFind = Math.max(0, Math.round(finalStats.shardFind || 0));
    finalStats.bonusProjectiles = Math.max(0, Math.round(finalStats.bonusProjectiles || 0));

    // Проверка на NaN
    for (const key in finalStats) {
        if (typeof finalStats[key] === 'number' && isNaN(finalStats[key])) {
            finalStats[key] = DEFAULT_BASE_STATS[key] ?? 0;
        }
    }

    return finalStats;
},

    // --- Остальные селекторы (без изменений) ---
    isAnyRecipeCraftable: () => { /* ... */ },
    getAchievementXpNeededForNextLevel: () => { /* ... */ },
    getCurrentLevelXpProgress: () => { /* ... */ },
    getXpNeededForCurrentLevelUp: () => { /* ... */ },
    // ... (код isAnyRecipeCraftable и селекторов достижений без изменений) ...
    isAnyRecipeCraftable: () => {
        const { inventory, gold, diamonds } = get();
        const inventoryCounts = {};
        inventory.forEach(item => {
            if (item?.id && item?.rarity) {
                const key = `${item.id}_${item.rarity}`;
                inventoryCounts[key] = (inventoryCounts[key] || 0) + 1;
            } else if (item?.id) {
                inventoryCounts[item.id] = (inventoryCounts[item.id] || 0) + 1;
            }
        });

        for (const recipe of forgeRecipes) {
            let hasEnoughItems = true;
            for (const input of recipe.inputItems) {
                const key = input.rarity ? `${input.itemId}_${input.rarity}` : input.itemId;
                if ((inventoryCounts[key] || 0) < input.quantity) {
                    hasEnoughItems = false;
                    break;
                }
            }
            if (!hasEnoughItems) continue;
            if (gold >= recipe.cost.gold && diamonds >= recipe.cost.diamonds) {
                return true;
            }
        }
        return false;
    },
    getAchievementXpNeededForNextLevel: () => getXpNeededForLevel(get().achievementLevel),
    getCurrentLevelXpProgress: () => Math.max(0, get().achievementXp - (ACHIEVEMENT_LEVEL_XP_THRESHOLDS[get().achievementLevel] ?? 0)),
    getXpNeededForCurrentLevelUp: () => {
        const lvl = get().achievementLevel;
        const nextThreshold = getXpNeededForLevel(lvl);
        const currentThreshold = ACHIEVEMENT_LEVEL_XP_THRESHOLDS[lvl] ?? 0;
        return nextThreshold === Infinity ? Infinity : nextThreshold - currentThreshold;
    },

    // ================== Действия (Actions) - Объединенные и Дополненные ==================

    // --- Базовые действия (без изменений) ---
    setUsername: (name) => set({ username: name }),
    setGold: (amount) => set({ gold: amount }),
    setDiamonds: (amount) => set({ diamonds: amount }),

    // --- Действия с Расой и Статами (без изменений, но вызывают updatePowerLevel) ---
    setPlayerRace: (raceId) => get().initializeCharacterStats(raceId),
    initializeCharacterStats: (raceId) => { /* ... */
        const raceData = getRaceDataById(raceId);
        const initialStats = raceData ? raceData.initialStats : DEFAULT_BASE_STATS;
        set({
            playerBaseStats: { ...initialStats },
            playerHp: initialStats.hp, // Устанавливаем текущее HP равным максимальному при смене расы
            playerRace: raceId,
        });
        get().updatePowerLevel(); // Пересчет PL при смене расы/статов
        get().initializeLevelHp(); // Обновляем playerHp до вычисленного максимума
    },

    // --- Действия с HP (без изменений) --
    // ... (код действий с HP без изменений) ...
    playerTakeDamage: (damageAmount) => {
        set((state) => {
            const newHp = Math.max(0, state.playerHp - damageAmount);
            // console.log(`Игрок получает ${damageAmount} урона. HP: ${state.playerHp} -> ${newHp}`);
            return { playerHp: newHp };
        });
        if (get().playerHp <= 0) {
            console.log("Игрок погиб!");
        }
    },
    initializeLevelHp: () => {
        const maxHp = get().computedStats().hp;
        // console.log(`Инициализация HP уровня: ${maxHp}`);
        set({ playerHp: maxHp });
    },
    healPlayer: (amount) => {
        set((state) => {
            const maxHp = get().computedStats().hp;
            const newHp = Math.min(maxHp, state.playerHp + amount);
            // console.log(`Игрок лечится на ${amount}. HP: ${state.playerHp} -> ${newHp}`);
            return { playerHp: newHp };
        });
    },



    // ... (код действий с валютой и киллами без изменений) ...
    addGold: (amount) => {
        set((state) => ({
            gold: state.gold + amount,
            totalGoldCollected: amount > 0 ? state.totalGoldCollected + amount : state.totalGoldCollected,
        }));
        get().checkAllAchievements();
    },
    addDiamonds: (amount) => {
        set((state) => ({ diamonds: state.diamonds + amount }));
        get().checkAllAchievements();
    },
    incrementKills: (count = 1) => {
        set((state) => ({ totalKills: state.totalKills + count }));
        get().checkAllAchievements();
    },

refillEnergyOnLoad: () => {
    set((state) => {
        const now = Date.now();
        const { energyCurrent, energyMax, lastEnergyRefillTimestamp } = state;

        // Если энергия уже полная, ничего не делаем, просто возвращаем текущее состояние
        if (energyCurrent >= energyMax) {
            // Можно на всякий случай обновить timestamp, если он сильно в прошлом
            // Но это необязательно, если consumeEnergy его обновляет при трате с полного бака.
            // return { lastEnergyRefillTimestamp: now };
            return {}; // Нет изменений
        }

        const elapsedMs = now - lastEnergyRefillTimestamp;
        if (elapsedMs <= 0) return {}; // Время не прошло или timestamp в будущем

        const refillIntervalsPassed = Math.floor(elapsedMs / ENERGY_REFILL_INTERVAL_MS);

        if (refillIntervalsPassed <= 0) return {}; // Не прошло ни одного полного интервала

        const energyToAdd = refillIntervalsPassed;
        const newEnergy = Math.min(energyMax, energyCurrent + energyToAdd);
        const pointsAdded = newEnergy - energyCurrent; // Сколько реально добавилось

        // Если энергия не восполнилась до максимума, то новый timestamp
        // это время последнего добавленного поинта.
        // Если восполнилась до максимума, timestamp остается от последнего добавленного
        // поинта, НЕ сдвигается на "now", чтобы не дарить лишнее время.
        const newTimestamp = lastEnergyRefillTimestamp + pointsAdded * ENERGY_REFILL_INTERVAL_MS;

        // console.log(`Refill Check: Прошло ${Math.floor(elapsedMs / 1000)} сек. Интервалов: ${refillIntervalsPassed}. Добавлено: ${pointsAdded}. Новая энергия: ${newEnergy}. Новый timestamp: ${new Date(newTimestamp).toLocaleTimeString()}`);

        return {
            energyCurrent: newEnergy,
            lastEnergyRefillTimestamp: newTimestamp,
        };
    });
},

// <<< НОВОЕ: Action для траты энергии >>>
consumeEnergy: (cost) => {
    if (cost <= 0) return false; // Нельзя потратить 0 или меньше

    let success = false;
    set((state) => {
        const { energyCurrent, energyMax, lastEnergyRefillTimestamp } = state;

        if (energyCurrent < cost) {
            console.warn(`Consume Energy: Недостаточно энергии. Нужно: ${cost}, есть: ${energyCurrent}`);
            success = false;
            return {}; // Не меняем состояние
        }

        const wasFull = energyCurrent >= energyMax; // Была ли энергия полной ДО траты
        const newEnergy = energyCurrent - cost;

        // Если энергия была полной, то таймер следующего восстановления
        // должен начаться с момента траты (сейчас).
        // Если не была полной, timestamp не меняем, т.к. он уже отсчитывает
        // время до следующего поинта.
        const newTimestamp = wasFull ? Date.now() : lastEnergyRefillTimestamp;

        // console.log(`Consume Energy: Потрачено ${cost}. Осталось: ${newEnergy}. Timestamp ${wasFull ? 'обновлен на текущее' : 'не изменен'}.`);
        success = true;
        return {
            energyCurrent: newEnergy,
            lastEnergyRefillTimestamp: newTimestamp,
        };
    });
    return success; // Возвращаем true, если энергия потрачена, false если нет
},

// (Опционально) Action для добавления энергии (награды и т.п.)
addEnergy: (amount) => {
    if (amount <= 0) return;
    set((state) => {
        const newEnergy = Math.min(state.energyMax, state.energyCurrent + amount);
        // console.log(`Add Energy: Добавлено ${amount}. Текущее: ${newEnergy}`);
        // Timestamp НЕ меняем принудительно, пусть refillOnLoad разберется
        return { energyCurrent: newEnergy };
    });
},


    setEquipped: (payload) => set({ equipped: payload }),
    // ... (код действий с инвентарем и экипировкой без изменений) ...
    addItemToInventory: (itemId, quantity = 1) => {
        const baseItem = getItemById(itemId); // Используем твой импортированный хелпер
        if (baseItem) {
            const newItems = Array.from({ length: quantity }).map(() => createItemInstance(baseItem)); // <<< Создаем экземпляры
            set((state) => ({ inventory: [...state.inventory, ...newItems] }));
            get().checkAllAchievements();
        } else {
            console.warn(`Предмет ${itemId} не найден в базе данных!`);
        }
    },
    removeItemFromInventory: (uid) => { // Удаляем по uid
        set((state) => ({
            inventory: state.inventory.filter(item => item.uid !== uid)
        }));
    },
    equipItem: (itemToEquip) => { // Принимает экземпляр
        if (!itemToEquip?.type || !itemToEquip.uid) return;
        const slot = itemToEquip.type;
        set((state) => {
            const currentEquipped = state.equipped[slot];
            let updatedInventory = state.inventory.filter((i) => i.uid !== itemToEquip.uid);
            if (currentEquipped) updatedInventory.push(currentEquipped); // Возвращаем старый экземпляр

            let flagUpdate = {};
            if (itemToEquip.rarity.toLowerCase() === 'epic' && !state.booleanFlags.equippedEpic) {
                flagUpdate = { booleanFlags: { ...state.booleanFlags, equippedEpic: true } };
            }

            return {
                equipped: { ...state.equipped, [slot]: itemToEquip }, // Кладем новый экземпляр
                inventory: updatedInventory,
                ...flagUpdate
            };
        });
        get().updatePowerLevel();
        get().initializeLevelHp(); // Обновляем playerHp, так как максимальное HP могло измениться
    },
    unequipItem: (slot) => { // Снимает по имени слота
        set((state) => {
            const itemToUnequip = state.equipped[slot]; // Получаем экземпляр
            if (!itemToUnequip) return {};
            return {
                equipped: { ...state.equipped, [slot]: null },
                inventory: [...state.inventory, itemToUnequip], // Возвращаем экземпляр
            };
        });
        get().updatePowerLevel();
        get().initializeLevelHp(); // Обновляем playerHp
    },


    executeForgeRecipe: (recipe) => {
        if (!recipe?.inputItems || !recipe.outputItemId || !recipe.cost) {
            console.error("Forge Error: Invalid recipe data received.", recipe);
            return false;
        }
        const state = get(); // Get current state

        // Check currency first (quick check)
        if (state.gold < recipe.cost.gold || state.diamonds < recipe.cost.diamonds) {
            console.warn("Forge Warning: Insufficient currency.");
            return false;
        }

        const itemsToRemoveUids = new Set(); // Store UIDs of items to be consumed
        let canSatisfyAllInputs = true;      // Assume true initially

        // --- Refined item finding logic ---
        for (const input of recipe.inputItems) { // Iterate through each required input slot {itemId, rarity, quantity: 1}
            let foundMatchingItemForThisInput = false; // Flag for this specific input slot

            // Search the entire current inventory for a suitable item that hasn't been marked yet
            for (const invItem of state.inventory) {
                // Check criteria: matching ID, matching rarity, and NOT already marked for removal
                const rarityMatch = input.rarity ? invItem.rarity === input.rarity : true; // Handle potential undefined rarity? Though your db has it.
                if (
                    invItem.id === input.itemId &&
                    rarityMatch &&
                    invItem.uid && // <-- Проверка наличия UID у предмета в инвентаре
                    !itemsToRemoveUids.has(invItem.uid) // <-- Проверка, что ЭТОТ UID еще не помечен
                ) {
                    // Found a suitable, available item instance for this input requirement
                    itemsToRemoveUids.add(invItem.uid);       // Mark this item instance (by UID) for removal
                    foundMatchingItemForThisInput = true;     // Mark that we satisfied this input slot
                    // console.log(`Marked item UID ${invItem.uid} (${invItem.id}) for removal.`);
                    break; // Stop searching the inventory for THIS input slot, move to the next required input
                }
            }

            // If after searching the whole inventory, we couldn't find a suitable item for THIS input slot
            if (!foundMatchingItemForThisInput) {
                console.error(`Forge Error: Could not find an available item instance for input:`, input);
                canSatisfyAllInputs = false; // Mark that the recipe cannot be satisfied
                break; // Stop checking other input requirements
            }
        }
        // --- End of refined logic ---

        // If any input requirement wasn't met, stop the process
        if (!canSatisfyAllInputs) {
            console.error("Forge Error: Failed to satisfy all input item requirements.");
            return false;
        }

        // --- Proceed with crafting if all inputs satisfied ---

        // Find output item base data (using itemsDatabase directly might be less safe than getItemById)
        // const outputItemBaseData = itemsDatabase.find(item => item.id === recipe.outputItemId); // Original
        const outputItemBaseData = getItemById(recipe.outputItemId); // Safer using helper
        if (!outputItemBaseData) {
            console.error(`Forge Error: Output item base data not found for ID: ${recipe.outputItemId}`);
            return false; // Cannot craft if output definition is missing
        }

        // Create the new item instance
        const forgedItem = createItemInstance(outputItemBaseData); // Используем хелпер
        if (!forgedItem) {
             console.error(`Forge Error: Could not create instance for output item ID: ${recipe.outputItemId}`);
             return false;
        }


        // Handle boolean flags (seems okay)
        const currentForgeFlag = state.booleanFlags.hasForgedOrUpgraded;
        let flagUpdate = !currentForgeFlag ? { booleanFlags: { ...state.booleanFlags, hasForgedOrUpgraded: true } } : {};

        // --- Update the state ---
        set((prevState) => {
            // Filter the *previous* inventory state based on the collected UIDs
            const newInventory = prevState.inventory.filter(item => !itemsToRemoveUids.has(item.uid));
            // Add the newly forged item
            newInventory.push(forgedItem);

            // console.log("Updating state. Items removed:", itemsToRemoveUids.size, "New item added:", forgedItem.id);

            return {
                inventory: newInventory,
                gold: prevState.gold - recipe.cost.gold,
                diamonds: prevState.diamonds - recipe.cost.diamonds,
                ...flagUpdate
            };
        });

        // Optional: Trigger other actions after state update
        get().checkAllAchievements();

        // console.log("Forge Success!");
        return true; // Indicate success
    },


    // --- Магазин (без изменений) ---
    purchaseShopItem: (dealId) => {
        // const deal = dailyShopDeals.find(d => d.id === dealId); // --- УДАЛИТЬ ЭТУ СТРОКУ ---
        const state = get();
        // --- НОВОЕ: Ищем сделку в состоянии ---
        const deal = state.dailyDeals.find(d => d.id === dealId);
        // --- КОНЕЦ НОВОГО ---

        if (!deal) {
            console.error("Сделка не найдена в текущих dailyDeals:", dealId);
            return false;
        }
        // const state = get(); // Уже получили выше
        if (state.dailyShopPurchases[dealId]) {
            console.warn("Товар уже куплен:", dealId);
            return false; // Уже куплено
        }
        const currency = deal.currency;
        const price = deal.price;
        if (state[currency] < price) {
            alert(`Недостаточно ${currency}!`); // Или другой фидбек
            return false; // Не хватает валюты
        }

        // --- НОВОЕ: Логика добавления в инвентарь/осколки ---
        let inventoryUpdate = {};
        let artifactLevelUpdate = {};

        if (deal.type === 'item') {
            // Вызываем существующий action добавления предмета
            // Он должен сам найти baseItem и создать экземпляр с uid
            get().addItemToInventory(deal.itemId, deal.quantity || 1);
            // Не нужно менять inventory напрямую здесь, т.к. addItemToInventory сделает set()
        } else if (deal.type === 'artifact_shard') {
            // Вызываем существующий action добавления осколков
            get().addArtifactShards(deal.itemId, deal.quantity || 1);
            // addArtifactShards сам обновит artifactLevels через set()
        }
        // --- КОНЕЦ НОВОГО ---

        // Отмечаем покупку и списываем валюту
        const currentShopFlag = state.booleanFlags.hasMadeShopPurchase;
        let flagUpdate = !currentShopFlag ? { booleanFlags: { ...state.booleanFlags, hasMadeShopPurchase: true } } : {};

        // Обновляем только валюту и статус покупки (инвентарь/осколки обновляются в вызванных actions)
        set((prevState) => ({
            [currency]: prevState[currency] - price,
            dailyShopPurchases: { ...prevState.dailyShopPurchases, [dealId]: true },
            ...flagUpdate
            // inventory: ..., // Не обновляем инвентарь здесь напрямую
            // artifactLevels: ..., // Не обновляем осколки здесь напрямую
        }));

        get().checkAllAchievements(); // Проверяем ачивки
        return true; // Покупка успешна
    },
    // ... (код флагов и уровней без изменений) ...
    setBooleanFlag: (flagName, value = true) => {
        if (get().booleanFlags[flagName] !== true) {
            set((state) => ({ booleanFlags: { ...state.booleanFlags, [flagName]: value } }));
            get().checkAllAchievements();
        }
    },
    completeLevelAction: (chapterId, levelId) => {
        const levelKey = `c${chapterId}_l${levelId}`;
        if (get().levelsCompleted[levelKey] !== true) {
            set((state) => ({ levelsCompleted: { ...state.levelsCompleted, [levelKey]: true } }));
            get().checkAllAchievements();
        }
    },

    claimAchievementReward: (achievementId) => {
        const state = get();
        const currentStatuses = state.achievementsStatus;
        const status = currentStatuses[achievementId] || { completed: false, claimed: false, progress: 0 };
        const definition = achievementsData.find(ach => ach.id === achievementId);
        if (!definition) return;

        let isCompleted = status.completed;
        // Re-check completion just in case
        if (!isCompleted) {
            if (definition.condition.type === 'counter') { isCompleted = (state[definition.condition.stat] ?? 0) >= definition.condition.target; }
            else if (definition.condition.type === 'boolean') { isCompleted = state.booleanFlags[definition.condition.flag] === true; }
            else if (definition.condition.type === 'level_complete') { isCompleted = state.levelsCompleted[`c${definition.condition.chapterId}_l${definition.condition.levelId}`] === true; }
        }

        if (!isCompleted || status.claimed) return;

        let newStateChanges = {
            achievementsStatus: { ...currentStatuses, [achievementId]: { ...status, completed: true, claimed: true } }
        };
        let finalGold = state.gold;
        let finalDiamonds = state.diamonds;
        let finalInventoryAdditions = []; // Собираем новые предметы здесь
        let finalTotalGoldCollected = state.totalGoldCollected;

        // Achievement reward
        if (definition.reward?.gold > 0) { finalGold += definition.reward.gold; finalTotalGoldCollected += definition.reward.gold; }
        if (definition.reward?.diamonds > 0) { finalDiamonds += definition.reward.diamonds; }
        if (definition.reward?.items?.length > 0) {
            definition.reward.items.forEach(rewardItem => {
                const itemBase = getItemById(rewardItem.itemId); // Используем getItemById
                if (itemBase) {
                    for (let i = 0; i < (rewardItem.quantity || 1); i++) {
                         const newItem = createItemInstance(itemBase); // Создаем экземпляр
                         if(newItem) finalInventoryAdditions.push(newItem);
                    }
                }
            });
        }

        // XP gain and level up
        const xpGained = definition.xpGain || 0;
        if (xpGained > 0) {
            let currentXp = state.achievementXp + xpGained;
            let currentLevel = state.achievementLevel;
            let xpNeededForNext = getXpNeededForLevel(currentLevel);
            let levelUpOccurred = false;
            let totalLevelUpRewardGold = 0;
            let totalLevelUpRewardDiamonds = 0;

            while (currentXp >= xpNeededForNext && xpNeededForNext !== Infinity) {
                levelUpOccurred = true; currentLevel++;
                const levelReward = ACHIEVEMENT_LEVEL_REWARDS[currentLevel];
                if (levelReward) {
                    if (levelReward.gold) totalLevelUpRewardGold += levelReward.gold;
                    if (levelReward.diamonds) totalLevelUpRewardDiamonds += levelReward.diamonds;
                }
                xpNeededForNext = getXpNeededForLevel(currentLevel);
            }

            finalGold += totalLevelUpRewardGold;
            finalDiamonds += totalLevelUpRewardDiamonds;
            if (totalLevelUpRewardGold > 0) finalTotalGoldCollected += totalLevelUpRewardGold;

            newStateChanges.achievementXp = currentXp;
            if (levelUpOccurred) { newStateChanges.achievementLevel = currentLevel; }
        }

        newStateChanges.gold = finalGold;
        newStateChanges.diamonds = finalDiamonds;
        newStateChanges.totalGoldCollected = finalTotalGoldCollected;

        // Применяем изменения к состоянию
        set(prevState => ({
            ...newStateChanges,
            inventory: [...prevState.inventory, ...finalInventoryAdditions] // Добавляем предметы в инвентарь
        }));
        get().checkAllAchievements();
    },
    checkAllAchievements: () => {
        const state = get();
        let changed = false;
        const currentStatuses = state.achievementsStatus;
        const newStatuses = { ...currentStatuses };

        for (const achDef of achievementsData) {
            const status = newStatuses[achDef.id] || { progress: 0, completed: false, claimed: false };
            if (!status.claimed) {
                let isNowCompleted = status.completed;
                let currentProgress = status.progress;

                if (achDef.condition.type === 'counter') {
                    currentProgress = state[achDef.condition.stat] ?? 0;
                    isNowCompleted = currentProgress >= achDef.condition.target;
                } else if (achDef.condition.type === 'boolean') {
                    isNowCompleted = state.booleanFlags[achDef.condition.flag] === true;
                    currentProgress = isNowCompleted ? 1 : 0;
                } else if (achDef.condition.type === 'level_complete') {
                    const levelKey = `c${achDef.condition.chapterId}_l${achDef.condition.levelId}`;
                    isNowCompleted = state.levelsCompleted[levelKey] === true;
                    currentProgress = isNowCompleted ? 1 : 0;
                }

                if ((isNowCompleted && !status.completed) || (achDef.condition.type === 'counter' && currentProgress !== status.progress)) {
                    newStatuses[achDef.id] = { ...status, progress: currentProgress, completed: isNowCompleted };
                    changed = true;
                }
            }
        }
        if (changed) {
            set({ achievementsStatus: newStatuses });
        }
    },

    generateDailyDeals: () => {
        // console.log("Генерация новых ежедневных предложений...");
        const state = get();

        // --- Шаг 1: itemPool ---
        // console.log("Создание itemPool...");
        const itemPool = itemsDatabase.filter(item => item && DAILY_DEAL_RARITY_WEIGHTS[item.rarity.toLowerCase()] !== undefined) // Приводим к нижнему регистру для надежности
            .map(item => ({ type: 'item', data: item, rarity: item.rarity }));
        // console.log(`itemPool создан. Размер: ${itemPool.length}`); // <-- ЛОГ A

        // --- Шаг 2: artifactsForShards ---
        // console.log("Создание artifactsForShards...");
        const artifactsForShards = ALL_ARTIFACTS_ARRAY.filter(art => art && DAILY_DEAL_RARITY_WEIGHTS[art.rarity.toLowerCase()] !== undefined); // Приводим к нижнему регистру
        // console.log(`artifactsForShards создан. Размер: ${artifactsForShards.length}`); // <-- ЛОГ B

        // --- Шаг 3: shardPool ---
        // console.log("Создание shardPool...");
        const shardPool = artifactsForShards.map(artifact => ({ type: 'artifact_shard', data: artifact, rarity: artifact.rarity }));
        // console.log(`shardPool создан. Размер: ${shardPool.length}`); // <-- ЛОГ C

        // --- Шаг 4: combinedPool ---
        // console.log("Создание combinedPool...");
        const combinedPool = [...itemPool, ...shardPool];
        // console.log(`combinedPool создан. Размер: ${combinedPool.length}`); // <-- ЛОГ D

        if (combinedPool.length === 0) {
            console.error("Пул для ежедневных предложений пуст!");
            set({ dailyDeals: [], dailyDealsLastGenerated: Date.now(), dailyShopPurchases: {} });
            return;
        }

        // --- Шаг 5: weightedPool ---
        const weightedPool = combinedPool.map(entry => {
            if (!entry || !entry.rarity || !entry.data) {
                console.warn("Некорректный entry в combinedPool:", entry);
                return null;
            }
            return {
                item: entry, // item здесь - это { type, data, rarity }
                weight: DAILY_DEAL_RARITY_WEIGHTS[entry.rarity.toLowerCase()] || 1 // Приводим к нижнему регистру
            };
        }).filter(Boolean);
        // console.log(`weightedPool создан. Размер: ${weightedPool.length}`);

        const numberOfDeals = 6;
        const generatedDeals = [];
        const selectedItemIds = new Set(); // Отслеживаем УЖЕ ДОБАВЛЕННЫЕ в deals (тип_id)
        let currentWeightedPool = [...weightedPool]; // Копия пула для изменения
        let iterations = 0;

        // console.log(`[generateDailyDeals] Начинаем цикл. Цель: ${numberOfDeals} сделок. Пул: ${currentWeightedPool.length}`);

        while (generatedDeals.length < numberOfDeals && currentWeightedPool.length > 0 && iterations < 1000) {
            iterations++;
            // console.log(`[generateDailyDeals] Итерация ${iterations}. Пул: ${currentWeightedPool.length}. Сделок: ${generatedDeals.length}. Перед weightedRandom.`);

            const selectedEntry = weightedRandom(currentWeightedPool);
            // console.log(`[generateDailyDeals] Результат weightedRandom (selectedEntry):`, selectedEntry);

            if (!selectedEntry || !selectedEntry.data) {
                // console.warn("[generateDailyDeals] weightedRandom вернул некорректный entry или нет data. Прерываем итерацию.");
                const problemIndex = currentWeightedPool.findIndex(poolEntry => poolEntry.item === selectedEntry);
                if (problemIndex !== -1) {
                    // console.warn(`[generateDailyDeals] Удаляем некорректный/null элемент из пула, индекс: ${problemIndex}`);
                    currentWeightedPool.splice(problemIndex, 1);
                } else {
                    // console.warn(`[generateDailyDeals] Не удалось найти индекс для некорректного/null элемента.`);
                }
                continue;
            }

            const selectedIndex = currentWeightedPool.findIndex(poolEntry => poolEntry.item === selectedEntry);
            // console.log(`[generateDailyDeals] Найден индекс выбранного элемента: ${selectedIndex}`);


            const uniqueKey = `${selectedEntry.type}_${selectedEntry.data.id}`;
            // console.log(`[generateDailyDeals] Проверяем ключ: ${uniqueKey}. Уже добавлен в deals? ${selectedItemIds.has(uniqueKey)}`);

            if (!selectedItemIds.has(uniqueKey)) {
                selectedItemIds.add(uniqueKey);
                // console.log(`[generateDailyDeals] Ключ ${uniqueKey} добавлен.`);

                let quantity = 1;
                let currency = (Math.random() < 0.7) ? 'gold' : 'diamonds';
                let price = 100;
                const rarityMultiplier = { common: 1, uncommon: 3, rare: 10 }; // Убедись, что ключи в нижнем регистре

                if (selectedEntry.type === 'item') {
                    price = (selectedEntry.data.basePrice || 100) * (rarityMultiplier[selectedEntry.rarity.toLowerCase()] || 1);
                    quantity = 1;
                } else if (selectedEntry.type === 'artifact_shard') {
                    price = (selectedEntry.data.baseShardCost || 50) * (rarityMultiplier[selectedEntry.rarity.toLowerCase()] || 1) * 3;
                    quantity = Math.random() < 0.5 ? 3 : 5;
                    if (selectedEntry.rarity.toLowerCase() === 'rare') currency = 'diamonds';
                    price = Math.round(price / (currency === 'diamonds' ? 10 : 1));
                }
                price = Math.max(10, Math.round(price * (0.8 + Math.random() * 0.4)));

                const dealId = `daily_${uniqueKey}_${Date.now()}_${generatedDeals.length}`;
                const newDealObject = {
                    id: dealId,
                    type: selectedEntry.type,
                    itemId: selectedEntry.data.id,
                    quantity: quantity,
                    currency: currency,
                    price: price,
                    rarity: selectedEntry.rarity,
                    discount: 0,
                    purchaseLimit: 1,
                };
                // console.log("[generateDailyDeals] Создан объект сделки для push:", JSON.stringify(newDealObject));
                generatedDeals.push(newDealObject);
                // console.log(`[generateDailyDeals] Сделка добавлена: ${dealId}. Всего сделок: ${generatedDeals.length}`);

            } else {
                // console.log(`[generateDailyDeals] Ключ ${uniqueKey} уже был добавлен в deals ранее, пропускаем элемент.`);
            }

            if (selectedIndex !== -1) {
                // console.log(`[generateDailyDeals] Удаляем элемент с индексом ${selectedIndex} из currentWeightedPool.`);
                currentWeightedPool.splice(selectedIndex, 1);
            } else {
                console.error("[generateDailyDeals] Не удалось найти индекс выбранного элемента для удаления! Прерываем.");
                break;
            }

            if (currentWeightedPool.length === 0 && generatedDeals.length < numberOfDeals) {
                console.warn("[generateDailyDeals] Пул закончился раньше, чем набралось нужное количество сделок.");
                break;
            }
            if (iterations >= 999) {
                console.error("[generateDailyDeals] Превышено максимальное количество итераций!");
                break;
            }

        } // Конец while

        // console.log(`[generateDailyDeals] Цикл завершен. Итераций: ${iterations}. Сгенерировано сделок: ${generatedDeals.length}`);
        // console.log("[generateDailyDeals] Финальные сделки ПЕРЕД записью в стейт:", JSON.stringify(generatedDeals, null, 2));

        set({
            dailyDeals: generatedDeals,
            dailyDealsLastGenerated: Date.now(),
            dailyShopPurchases: {}
        });
        // console.log("Ежедневные предложения обновлены:", generatedDeals);
    }, // Конец generateDailyDeals

    checkAndRefreshDailyDeals: () => {
        const state = get();
        const lastGeneratedTs = state.dailyDealsLastGenerated;
        const nowTs = Date.now();

        if (!lastGeneratedTs) {
            // console.log("Первая генерация ежедневных предложений.");
            get().generateDailyDeals();
            return;
        }

        const nowUtcDate = new Date(nowTs);
        const targetTodayUtcTs = Date.UTC(
            nowUtcDate.getUTCFullYear(),
            nowUtcDate.getUTCMonth(),
            nowUtcDate.getUTCDate(),
            REFRESH_HOUR_UTC, 0, 0, 0
        );

        let lastRefreshMarkerTs;
        if (nowTs >= targetTodayUtcTs) {
            lastRefreshMarkerTs = targetTodayUtcTs;
            // console.log(`Последний маркер обновления: СЕГОДНЯ в ${REFRESH_HOUR_UTC}:00 UTC`);
        } else {
            const targetYesterdayUtcTs = Date.UTC(
                nowUtcDate.getUTCFullYear(),
                nowUtcDate.getUTCMonth(),
                nowUtcDate.getUTCDate() - 1,
                REFRESH_HOUR_UTC, 0, 0, 0
            );
            lastRefreshMarkerTs = targetYesterdayUtcTs;
            // console.log(`Последний маркер обновления: ВЧЕРА в ${REFRESH_HOUR_UTC}:00 UTC`);
        }

        if (lastGeneratedTs < lastRefreshMarkerTs) {
            // console.log(`Время обновить ежедневные предложения (последняя генерация ${new Date(lastGeneratedTs).toLocaleString()} была до маркера ${new Date(lastRefreshMarkerTs).toLocaleString()}).`);
            get().generateDailyDeals();
        } else {
            const timeSinceLastGenerate = nowTs - lastGeneratedTs;
            // console.log(`Ежедневные предложения еще актуальны (сгенерированы ${Math.round(timeSinceLastGenerate / 1000 / 60)} мин. назад).`);
            if (state.dailyDeals.length === 0 && savedState.dailyDeals && savedState.dailyDeals.length > 0) {
                // console.log("Загрузка сохраненных dailyDeals...");
                set({ dailyDeals: savedState.dailyDeals });
            }
        }
    }, // Конец checkAndRefreshDailyDeals

    // <<< НОВОЕ >>> Действия для Артефактов
    collectArtifact: (artifactId) => {
        const artifactData = getArtifactById(artifactId);
        if (!artifactData) return;
        set((state) => {
            if (state.collectedArtifacts.has(artifactId)) return {};
            const newCollected = new Set(state.collectedArtifacts);
            newCollected.add(artifactId);
            const newLevels = { ...state.artifactLevels };
            if (!newLevels[artifactId]) {
                newLevels[artifactId] = { level: 0, shards: 0 };
            }
            // console.log(`Артефакт ${artifactData.name} получен (не активирован).`);
            return {
                collectedArtifacts: newCollected,
                artifactLevels: newLevels,
            };
        });
        get().updatePowerLevel();
        get().checkAllAchievements();
    },

    addArtifactShards: (artifactId, amount) => {
        if (amount <= 0) return;
        const artifactData = getArtifactById(artifactId);
        if (!artifactData) {
            console.warn(`Попытка добавить осколки для несуществующего артефакта: ${artifactId}`);
            return;
        }

        set((state) => {
            const currentInfo = state.artifactLevels[artifactId] || { level: 0, shards: 0 };
            const newShards = currentInfo.shards + amount;

            // console.log(`Добавлено ${amount} осколков для ${artifactId}. Итого: ${newShards}`);
            return {
                artifactLevels: {
                    ...state.artifactLevels,
                    [artifactId]: { ...currentInfo, shards: newShards }
                }
            };
        });
    },

    activateArtifact: (artifactId) => {
        const artifactData = getArtifactById(artifactId);
        if (!artifactData) { console.error("Арт не найден:", artifactId); return; }

        set((state) => {
            const currentInfo = state.artifactLevels[artifactId] || { level: 0, shards: 0 };
            const currentLevel = currentInfo.level;
            const currentShards = currentInfo.shards;

            if (currentLevel !== 0) {
                console.warn(`Попытка активировать уже активный/улучшенный артефакт: ${artifactId}`);
                return {};
            }

            const shardsNeeded = (0 + 1) * artifactData.baseShardCost;

            if (currentShards < shardsNeeded) {
                // console.log(`Недостаточно осколков для активации ${artifactId}. Нужно ${shardsNeeded}, есть ${currentShards}`);
                return {};
            }

            const remainingShards = currentShards - shardsNeeded;
            const newCollected = new Set(state.collectedArtifacts);
            newCollected.add(artifactId);

            // console.log(`Активируем ${artifactData.name} (Уровень 1). Потрачено ${shardsNeeded} осколков. Осталось осколков: ${remainingShards}`);

            return {
                collectedArtifacts: newCollected,
                artifactLevels: {
                    ...state.artifactLevels,
                    [artifactId]: { level: 1, shards: remainingShards }
                }
            };
        });
        get().updatePowerLevel();
        get().checkAllAchievements();
        get().initializeLevelHp(); // Обновляем HP, так как активация могла изменить статы
    },


    upgradeArtifact: (artifactId) => {
        const artifactData = getArtifactById(artifactId);
        if (!artifactData) { console.error("Арт не найден:", artifactId); return; }

        set((state) => {
            const currentInfo = state.artifactLevels[artifactId];

            if (!currentInfo || currentInfo.level === 0) {
                console.warn(`Попытка улучшить неактивированный или несуществующий артефакт: ${artifactId}`);
                return {};
            }

            const currentLevel = currentInfo.level;
            const currentShards = currentInfo.shards;

            if (currentLevel >= artifactData.maxLevel) {
                // console.log("Арт уже макс. уровня.");
                return {};
            }

            const shardsNeeded = (currentLevel + 1) * artifactData.baseShardCost;

            if (currentShards < shardsNeeded) {
                // console.log(`Недостаточно осколков для ${artifactId}. Нужно ${shardsNeeded}, есть ${currentShards}`);
                return {};
            }

            const newLevel = currentLevel + 1;
            const remainingShards = currentShards - shardsNeeded;

            // console.log(`Улучшаем ${artifactData.name} до уровня ${newLevel}. Потрачено ${shardsNeeded} осколков. Осталось осколков: ${remainingShards}`);

            return {
                artifactLevels: {
                    ...state.artifactLevels,
                    [artifactId]: { level: newLevel, shards: remainingShards }
                }
            };
        });
        get().updatePowerLevel();
        get().checkAllAchievements();
        get().initializeLevelHp(); // Обновляем HP, так как улучшение могло изменить статы
    },


    updatePowerLevel: () => {
        const { equipped, artifactLevels, collectedArtifacts } = get();
        let totalPower = 0;
        // console.log("updatePowerLevel: Начало расчета.");

        // console.log("updatePowerLevel: Расчет силы от ЭКИПИРОВКИ:");
        Object.values(equipped).filter(Boolean).forEach(item => {
            const itemLevel = item?.currentLevel || 0; // Используем currentLevel
            const basePower = item?.basePowerLevel || 0;
            const powerPerLvl = item?.powerPerLevel || 0;
            const currentItemPower = basePower + (powerPerLvl * itemLevel);
            // console.log(` - Предмет: ${item?.id}, Уровень: ${itemLevel}, Баз.сила: ${basePower}, Сила/ур: ${powerPerLvl} => Тек.сила: ${currentItemPower}`);
            totalPower += Math.round(currentItemPower);
        });
        // console.log("updatePowerLevel: totalPower ПОСЛЕ экипировки:", totalPower);

        // console.log("updatePowerLevel: Расчет силы от АРТЕФАКТОВ:");
        for (const artifactId in artifactLevels) {
            if (collectedArtifacts.has(artifactId)) {
                const level = artifactLevels[artifactId]?.level || 0;
                const artifactData = getArtifactById(artifactId);
                if (artifactData) {
                    const artifactBasePower = artifactData.basePowerLevel || 0;
                    const artifactPowerPerLevel = artifactData.powerLevelPerLevel || 0;
                    const currentArtifactPower = artifactBasePower + (artifactPowerPerLevel * level);
                    // console.log(` - Артефакт: ${artifactId}, Уровень: ${level}, Баз.сила: ${artifactBasePower}, Сила/ур: ${artifactPowerPerLevel} => Тек.сила: ${currentArtifactPower}`);
                    totalPower += Math.round(currentArtifactPower);
                } else {
                    console.warn(`Данные для артефакта ${artifactId} не найдены при расчете PL.`);
                }
            }
        }
        // console.log("updatePowerLevel: totalPower ПОСЛЕ артефактов:", totalPower);

        const finalPowerLevel = Math.max(0, totalPower);
        // console.log(`updatePowerLevel: Установка итогового powerLevel: ${finalPowerLevel}`);
        set({ powerLevel: finalPowerLevel });
    },

    addItemToInventoryLogic: (currentInventory, itemData) => { // Этот хелпер используется в openGearChest
        // console.log(`[addItemToInventoryLogic] Добавление ${itemData.name} в инвентарь...`);
        const newItemInstance = createItemInstance(itemData); // Используем основной хелпер
        if(!newItemInstance) return currentInventory;
        return [...currentInventory, newItemInstance];
    },

    openGearChest: (chestId) => {
        const state = get();
        const chestData = getGearChestById(chestId);

        if (!chestData) {
            console.error(`[GearChest] Сундук с ID ${chestId} не найден в gearChestData.js.`);
            return;
        }

        const cost = chestData.cost;
        if (state[cost.currency] < cost.price) {
            alert(`Недостаточно ${cost.currency}! Нужно ${cost.price}`);
            return;
        }

        const currentPity = state.gearChestPity[chestId] || {};
        let nextPity = { ...currentPity };
        let guaranteedRarity = null;
        let finalRarity = null;

        if (chestData.pity) {
            const pityConfigs = Array.isArray(chestData.pity) ? chestData.pity : [chestData.pity];
            pityConfigs.forEach(p => {
                const key = p.rarity.toLowerCase(); // Используем lowercase
                nextPity[key] = (nextPity[key] || 0) + 1;
                // console.log(`[GearChest ${chestId}] Pity for ${p.rarity} incremented to ${nextPity[key]}/${p.limit}`);
            });
            // Проверяем гаранты в порядке убывания редкости (или как определено логикой)
            const epicPityConfig = pityConfigs.find(p => p.rarity === 'Epic'); // Проверяем Epic
            if (epicPityConfig && nextPity.epic >= epicPityConfig.limit) {
                guaranteedRarity = 'Epic';
                // console.log(`[GearChest ${chestId}] Epic Pity Triggered!`);
            } else {
                const rarePityConfig = pityConfigs.find(p => p.rarity === 'Rare'); // Затем Rare
                if (rarePityConfig && nextPity.rare >= rarePityConfig.limit) {
                    guaranteedRarity = 'Rare';
                    // console.log(`[GearChest ${chestId}] Rare Pity Triggered!`);
                }
            }
        }

        if (guaranteedRarity) {
            finalRarity = guaranteedRarity;
            // console.log(`[GearChest ${chestId}] Awarding guaranteed ${finalRarity}`);
        } else {
            finalRarity = _rollWeightedRarity_Gear(chestData.rarityChances);
            // console.log(`[GearChest ${chestId}] Rolled rarity: ${finalRarity}`);
        }

        const obtainedItemData = _selectRandomGearItemByRarity_Gear(finalRarity);
        if (!obtainedItemData) {
            console.error(`[GearChest] Не удалось получить предмет редкости ${finalRarity}. Отмена.`);
            return;
        }
        const obtainedRarity = obtainedItemData.rarity; // Это строка, например "Epic"

        if (chestData.pity) {
            const pityConfigs = Array.isArray(chestData.pity) ? chestData.pity : [chestData.pity];
            // Сбрасываем pity для полученной редкости и всех более низких (если такая логика)
            // Или только для полученной, или для полученной и более высоких, если так задумано
            // Текущая логика из кода: если выпал Epic, сбрасываем Epic и Rare. Если Rare, сбрасываем Rare.
            if (obtainedRarity === 'Epic') {
                if (pityConfigs.some(p => p.rarity === 'Epic')) nextPity.epic = 0;
                if (pityConfigs.some(p => p.rarity === 'Rare')) nextPity.rare = 0; // Сброс Rare при Epic
                // console.log(`[GearChest ${chestId}] Resetting Epic and Rare pity due to Epic drop.`);
            } else if (obtainedRarity === 'Rare') {
                if (pityConfigs.some(p => p.rarity === 'Rare')) nextPity.rare = 0;
                // console.log(`[GearChest ${chestId}] Resetting Rare pity due to Rare drop.`);
            }
            // Добавить сброс для других редкостей, если они есть в pity
        }
        // console.log(`[GearChest ${chestId}] Final pity state for next save:`, nextPity);

        const rewardDetails = {
            type: 'gear',
            id: obtainedItemData.id,
            name: obtainedItemData.name,
            icon: obtainedItemData.image,
            rarity: obtainedItemData.rarity,
            amount: 1,
        };

        set(prevState => {
            if (!prevState) {
                console.error("[GearChest] prevState is undefined in set function!");
                return {};
            }
            return {
                [cost.currency]: prevState[cost.currency] - cost.price,
                totalGearChestsOpened: prevState.totalGearChestsOpened + 1,
                gearChestPity: {
                    ...prevState.gearChestPity,
                    [chestId]: nextPity
                },
                inventory: get().addItemToInventoryLogic(prevState.inventory, obtainedItemData),
                lastOpenedChestInfo: {
                    chestId: chestId,
                    amount: 1,
                    type: 'gear'
                },
                lastChestRewards: [rewardDetails]
            };
        });

        // console.log(`[GearChest ${chestId}] Opened! Received: ${obtainedItemData.name} (${obtainedItemData.rarity})`);
        get().checkAllAchievements();
    },
    openGearChestX10: (chestId) => {
        const state = get();
        const chestData = getGearChestById(chestId);

        if (!chestData) {
            console.error(`[GearChestX10] Сундук с ID ${chestId} не найден.`);
            return;
        }

        const cost = chestData.cost;
        const totalCost = cost.price * 10;
        if (state[cost.currency] < totalCost) {
            alert(`Недостаточно ${cost.currency}! Нужно ${totalCost}`);
            return;
        }

        const currentPityForChest = state.gearChestPity[chestId] || {};
        let workingPity = { ...currentPityForChest }; // Pity будет меняться ВНУТРИ цикла
        const rewardsDetailed = [];
        const newItemInstances = [];

        // console.log(`[GearChestX10 ${chestId}] Starting batch open. Initial pity:`, JSON.stringify(workingPity));

        for (let i = 0; i < 10; i++) {
            let guaranteedRarity = null;
            let finalRarity = null;
            let obtainedItemData = null;
            let obtainedRarity = null; // Строка с редкостью

            if (chestData.pity) {
                const pityConfigs = Array.isArray(chestData.pity) ? chestData.pity : [chestData.pity];
                pityConfigs.forEach(p => {
                    const key = p.rarity.toLowerCase();
                    workingPity[key] = (workingPity[key] || 0) + 1;
                });

                const epicPityConfig = pityConfigs.find(p => p.rarity === 'Epic');
                if (epicPityConfig && workingPity.epic >= epicPityConfig.limit) {
                    guaranteedRarity = 'Epic';
                } else {
                    const rarePityConfig = pityConfigs.find(p => p.rarity === 'Rare');
                    if (rarePityConfig && workingPity.rare >= rarePityConfig.limit) {
                        guaranteedRarity = 'Rare';
                    }
                }
            }

            if (guaranteedRarity) {
                finalRarity = guaranteedRarity;
            } else {
                finalRarity = _rollWeightedRarity_Gear(chestData.rarityChances);
            }

            obtainedItemData = _selectRandomGearItemByRarity_Gear(finalRarity);
            if (!obtainedItemData) {
                console.error(`  [Pull ${i+1}] Не удалось получить предмет редкости ${finalRarity}! Пропускаем.`);
                // Важно: Pity инкрементировался. Если предмет не получен, нужно решить, что делать с pity.
                // Для простоты, если предмет не найден, можно откатить инкремент pity или выдать Common.
                // Пока пропускаем и pity остается инкрементированным.
                rewardsDetailed.push({ type: 'error', name: `Ошибка получения ${finalRarity}` });
                continue;
            }
            obtainedRarity = obtainedItemData.rarity; // Например, "Epic"

            // Сброс Pity счетчиков СРАЗУ ЖЕ
            if (chestData.pity) {
                const pityConfigs = Array.isArray(chestData.pity) ? chestData.pity : [chestData.pity];
                if (obtainedRarity === 'Epic') {
                    if (pityConfigs.some(p => p.rarity === 'Epic')) workingPity.epic = 0;
                    if (pityConfigs.some(p => p.rarity === 'Rare')) workingPity.rare = 0;
                } else if (obtainedRarity === 'Rare') {
                    if (pityConfigs.some(p => p.rarity === 'Rare')) workingPity.rare = 0;
                }
            }

            const rewardDetails = { type: 'gear', ...obtainedItemData, amount: 1, icon: obtainedItemData.image };
            rewardsDetailed.push(rewardDetails);

            const newItem = createItemInstance(obtainedItemData);
            if(newItem) newItemInstances.push(newItem);

            // console.log(`  [Pull ${i+1}] Received: ${obtainedItemData.name} (${obtainedRarity}). Current pity state:`, JSON.stringify(workingPity));
        }

        
        // console.log(`[GearChestX10 ${chestId}] Finished batch. Final pity state for save:`, JSON.stringify(workingPity));
        // console.log(`[GearChestX10 ${chestId}] Items to add:`, newItemInstances.length);

        set(prevState => {
            if (!prevState) return {};
            return {
                [cost.currency]: prevState[cost.currency] - totalCost,
                totalGearChestsOpened: prevState.totalGearChestsOpened + 10,
                gearChestPity: {
                    ...prevState.gearChestPity,
                    [chestId]: workingPity // Сохраняем измененный pity
                },
                inventory: [...prevState.inventory, ...newItemInstances],
                lastOpenedChestInfo: {
                    chestId: chestId,
                    amount: 10,
                    type: 'gear'
                },
                lastChestRewards: rewardsDetailed
            };
        });

        // console.log(`[GearChestX10 ${chestId}] Opened! Received ${rewardsDetailed.length} items.`);
        get().checkAllAchievements();
    },

    processArtifactReward: (dropType, targetArtifactId) => {
        if (!targetArtifactId) return { details: null, obtainedFullArtifact: false }; // Добавил obtainedFullArtifact
        const artifactData = getArtifactById(targetArtifactId);
        if (!artifactData) { console.error(`[ProcessArtifact] Data not found for ${targetArtifactId}`); return { details: null, obtainedFullArtifact: false }; } // Добавил obtainedFullArtifact
        let rewardDetails = null;
        let obtainedFullArtifact = false; // Этот флаг будет возвращен

        if (dropType === 'artifact_shard') {
            const amount = 1; // Всегда 1 осколок по текущей логике
            get().addArtifactShards(targetArtifactId, amount);
            rewardDetails = { type: 'artifact_shard', amount, artifactId: targetArtifactId, icon: artifactData.icon, name: `${artifactData.name} (осколок)`, rarity: artifactData.rarity };
        }
        else if (dropType === 'full_artifact') {
            obtainedFullArtifact = true; // Устанавливаем флаг
            const currentArtifactState = get().artifactLevels[targetArtifactId];
            const isActive = currentArtifactState && currentArtifactState.level > 0;
            const shardAmountOnDuplicate = artifactData.shardValueOnDuplicate || 10;
            let isNew = false;
            if (isActive) { // Если артефакт уже активен (есть уровень > 0)
                get().addArtifactShards(targetArtifactId, shardAmountOnDuplicate);
            } else { // Артефакт не активен (уровень 0 или его нет в artifactLevels)
                // Сначала "собираем" его, если он еще не известен (для UI, чтобы он появился в списке)
                if (!get().collectedArtifacts.has(targetArtifactId)) {
                    get().collectArtifact(targetArtifactId); // Это установит level 0, shards 0
                }
                // Затем активируем его (переводим на уровень 1, если достаточно осколков - в данном случае осколки не тратятся при получении целого)
                // Если активация требует осколков, и мы хотим, чтобы первый "целый" артефакт активировался бесплатно:
                // Вместо get().activateArtifact(targetArtifactId) можно сделать:
                 set(state => {
                     const newCollected = new Set(state.collectedArtifacts);
                     newCollected.add(targetArtifactId);
                     return {
                         collectedArtifacts: newCollected,
                         artifactLevels: {
                             ...state.artifactLevels,
                             [targetArtifactId]: {
                                 level: 1, // Сразу уровень 1
                                 shards: (state.artifactLevels[targetArtifactId]?.shards || 0) // Сохраняем имеющиеся осколки
                             }
                         }
                     };
                 });
                 get().updatePowerLevel(); // Важно после изменения уровня
                 isNew = true; // Считаем новым, если он не был активен
            }
            rewardDetails = { type: 'full_artifact', artifactId: targetArtifactId, isNew, shardAmount: isActive ? shardAmountOnDuplicate : undefined, icon: artifactData.icon, name: artifactData.name, rarity: artifactData.rarity };
        } else { console.warn("Unknown dropType in processArtifactReward:", dropType); }
        return { details: rewardDetails, obtainedFullArtifact }; // Возвращаем флаг
    },


openArtifactChest: (chestId) => {
    const state = get();
    const chestData = getArtifactChestById(chestId);
    if (!chestData || !chestData.isEnabled) { console.error(`Сундук ${chestId} не найден или не активен.`); return; }
    if (state[chestData.cost.currency] < chestData.cost.price) { alert(`Недостаточно ${chestData.cost.currency}!`); return; }

    const currentPity = state.artifactChestPity[chestId] || 0;
    let newPity = currentPity + 1; // Инкремент pity для этого открытия
    const newTotalOpened = state.totalArtifactChestsOpened + 1;

    let rewardTypeObj = null;
    let rewardProcessingResult = { details: null, obtainedFullArtifact: false }; // Используем результат processArtifactReward
    let finalPityValue = newPity; // Pity после этого открытия

    // 1. Определяем ТИП награды (Pity или Ролл)
    if (newPity >= chestData.pityLimit) { // Сначала проверяем, сработал ли pity
        rewardTypeObj = chestData.rewardPool.find(r => r.type === 'full_artifact'); // Pity всегда дает full_artifact
        // console.log(`[ArtifactChest ${chestId}] Pity! Type: ${rewardTypeObj?.type}`);
        if (rewardTypeObj) { // Если найден тип full_artifact для pity
             rewardProcessingResult.obtainedFullArtifact = true; // Устанавливаем флаг, что это гарантированный артефакт
        }
    } else {
        rewardTypeObj = selectWeightedRewardType(chestData.rewardPool);
        // console.log(`[ArtifactChest ${chestId}] Rolled type object:`, rewardTypeObj);
    }

    if (!rewardTypeObj) { console.error("Не удалось определить тип награды."); return; }
    const rewardType = rewardTypeObj.type; // Тип награды, который будет обработан

    // Если по pity или роллу должен выпасть full_artifact, устанавливаем флаг для сброса pity
    if (rewardType === 'full_artifact' || rewardProcessingResult.obtainedFullArtifact) {
        finalPityValue = 0; // Сбрасываем pity, если выпал целый артефакт
        // console.log(`[ArtifactChest ${chestId}] Full artifact obtained, pity reset to 0.`);
    }


    // 2. Обрабатываем награду
    if (rewardType === 'gold') {
        const amount = Math.floor(Math.random() * (rewardTypeObj.max - rewardTypeObj.min + 1)) + rewardTypeObj.min;
        get().addGold(amount);
        rewardProcessingResult.details = { type: 'gold', amount, icon: '/assets/coin-icon.png', name: 'Золото' };
    } else if (rewardType === 'diamonds') {
        const amount = rewardTypeObj.amount;
        get().addDiamonds(amount);
        rewardProcessingResult.details = { type: 'diamonds', amount, icon: '/assets/diamond-image.png', name: 'Алмазы' };
    } else if (rewardType === 'artifact_shard' || rewardType === 'full_artifact') {
        const targetArtifactId = _selectWeightedArtifactIdFromSet_ByRarity(chestData.setId);
        if (!targetArtifactId) { console.error("Не удалось выбрать артефакт из сета."); return; }
        // console.log(`[ArtifactChest ${chestId}] Selected weighted artifact ID: ${targetArtifactId}`);
        // Передаем rewardType, который был определен (pity или ролл)
        rewardProcessingResult = get().processArtifactReward(rewardType, targetArtifactId);
        // Если processArtifactReward подтвердил, что это был full_artifact, pity сбросится
        if (rewardProcessingResult.obtainedFullArtifact) {
            finalPityValue = 0;
        }
    } else {
        console.warn(`Неизвестный тип награды из пула: ${rewardType}`);
    }

    // 3. Обновляем состояние
    set((prevState) => {
        if (!prevState) return {};
        return {
            [chestData.cost.currency]: prevState[chestData.cost.currency] - chestData.cost.price,
            artifactChestPity: { ...prevState.artifactChestPity, [chestId]: finalPityValue },
            totalArtifactChestsOpened: newTotalOpened,
            lastOpenedChestInfo: { chestId: chestId, amount: 1, type: 'artifact' },
            lastChestRewards: rewardProcessingResult.details ? [rewardProcessingResult.details] : [],
        };
    });
    get().checkAllAchievements();
    if(rewardProcessingResult.obtainedFullArtifact || rewardType === 'artifact_shard'){
        get().initializeLevelHp(); // Обновляем HP, если был получен артефакт/осколок
    }
},


openArtifactChestX10: (chestId) => {
    const state = get();
    const chestData = getArtifactChestById(chestId);
    if (!chestData || !chestData.isEnabled) { console.error(`Сундук ${chestId} не найден или не активен.`); return; }
    const totalCost = chestData.cost.price * 10;
    if (state[chestData.cost.currency] < totalCost) { alert(`Недостаточно ${chestData.cost.currency}!`); return; }

    let workingPity = state.artifactChestPity[chestId] || 0; // Pity на начало серии из 10
    const newTotalOpened = state.totalArtifactChestsOpened + 10;
    const rewardsDetailed = []; // Собираем детали всех 10 наград
    let hasObtainedArtifactInBatch = false; // Флаг, если в этой пачке был артефакт/осколок

    // Цикл 10 открытий
    for (let i = 0; i < 10; i++) {
        workingPity++; // Инкремент pity для ТЕКУЩЕГО открытия в серии
        let rewardTypeObj = null;
        let rewardProcessingResultCurrentPull = { details: null, obtainedFullArtifact: false };

        // 1. Определяем ТИП награды для текущего пулла
        if (workingPity >= chestData.pityLimit) {
            rewardTypeObj = chestData.rewardPool.find(r => r.type === 'full_artifact');
            if (rewardTypeObj) rewardProcessingResultCurrentPull.obtainedFullArtifact = true;
        } else {
            rewardTypeObj = selectWeightedRewardType(chestData.rewardPool);
        }

        if (!rewardTypeObj) { console.error(`[X10 Pull ${i+1}] Failed type roll!`); rewardsDetailed.push({ type: 'error', name: 'Ошибка ролла типа' }); continue; }
        const rewardType = rewardTypeObj.type;

        // Если по pity или роллу должен выпасть full_artifact
        if (rewardType === 'full_artifact' || rewardProcessingResultCurrentPull.obtainedFullArtifact) {
             // Флаг obtainedFullArtifact уже должен быть установлен в rewardProcessingResultCurrentPull, если это pity
             // Если это ролл full_artifact, то processArtifactReward это подтвердит
        }

        // 2. Обрабатываем награду для текущего пулла
        if (rewardType === 'gold') {
            const amount = Math.floor(Math.random() * (rewardTypeObj.max - rewardTypeObj.min + 1)) + rewardTypeObj.min;
            get().addGold(amount); // Сразу добавляем золото
            rewardProcessingResultCurrentPull.details = { type: 'gold', amount, icon: '/assets/coin-icon.png', name: 'Золото' };
        } else if (rewardType === 'diamonds') {
            const amount = rewardTypeObj.amount;
            get().addDiamonds(amount); // Сразу добавляем алмазы
            rewardProcessingResultCurrentPull.details = { type: 'diamonds', amount, icon: '/assets/diamond-image.png', name: 'Алмазы' };
        } else if (rewardType === 'artifact_shard' || rewardType === 'full_artifact') {
            const targetArtifactId = _selectWeightedArtifactIdFromSet_ByRarity(chestData.setId);
            if (!targetArtifactId) { console.error(`[X10 Pull ${i+1}] Failed artifact selection!`); rewardsDetailed.push({ type: 'error', name: 'Ошибка выбора артефакта' }); continue; }
            // processArtifactReward добавит осколки/артефакт и вернет детали
            rewardProcessingResultCurrentPull = get().processArtifactReward(rewardType, targetArtifactId);
            hasObtainedArtifactInBatch = true; // Отмечаем, что в этой пачке был артефакт/осколок
        } else {
            console.warn(`[X10 Pull ${i+1}] Unknown type: ${rewardType}`);
            rewardProcessingResultCurrentPull.details = { type: 'error', name: `Неизвестный тип ${rewardType}` };
        }

        // Добавляем детали в массив
        if (rewardProcessingResultCurrentPull.details) {
            rewardsDetailed.push(rewardProcessingResultCurrentPull.details);
        } else {
            rewardsDetailed.push({ type: 'error', name: 'Ошибка обработки награды' }); // Заглушка на всякий случай
        }

        // 3. Сбрасываем pity, если выпал целый артефакт в ЭТОМ пулле
        if (rewardProcessingResultCurrentPull.obtainedFullArtifact) {
            workingPity = 0;
        }
    } // Конец цикла

    const finalPityValueForChest = workingPity; // Pity, который будет сохранен после всей серии

    // Обновляем состояние ОДИН РАЗ после всех 10 открытий
    set((prevState) => ({
        [chestData.cost.currency]: prevState[chestData.cost.currency] - totalCost,
        artifactChestPity: { ...prevState.artifactChestPity, [chestId]: finalPityValueForChest },
        totalArtifactChestsOpened: newTotalOpened,
        lastOpenedChestInfo: { chestId: chestId, amount: 10, type: 'artifact' },
        lastChestRewards: rewardsDetailed,
    }));

    get().checkAllAchievements();
    if(hasObtainedArtifactInBatch){
        get().initializeLevelHp(); // Обновляем HP, если в пачке был артефакт/осколок
    }
},

    clearLastChestData: () => set({
        lastChestRewards: null,
        lastOpenedChestInfo: null
    }),

    openLevelChest: (chestInstanceId, chestTypeId) => {
        console.log(`[Store Action] Попытка открыть сундук уровня: ${chestInstanceId} (Тип: ${chestTypeId})`);
        const chestTypeData = getLevelChestTypeById(chestTypeId); // Получаем данные типа сундука
        if (!chestTypeData) {
            console.error(`[openLevelChest] Не найдены данные для типа сундука: ${chestTypeId}`);
            return;
        }

        // Опционально: Проверка, не был ли этот сундук уже открыт (если используем levelChestStates для сохранения)
        // if (get().levelChestStates[chestInstanceId]) {
        //     console.log(`Сундук ${chestInstanceId} уже был открыт ранее.`);
        //     return;
        // }

        const lootTable = chestTypeData.lootTable; // Получаем таблицу лута
        const generatedRewards = []; // Собираем сюда все сгенерированные награды для попапа

        // 1. Гарантированная валюта
        lootTable.guaranteed?.forEach(rewardEntry => {
            if (rewardEntry.type === 'gold' || rewardEntry.type === 'diamonds') {
                // Генерируем случайное количество в заданном диапазоне
                const amount = Math.floor(Math.random() * (rewardEntry.max - rewardEntry.min + 1)) + rewardEntry.min;
                if (amount > 0) {
                    if (rewardEntry.type === 'gold') get().addGold(amount); // Добавляем золото
                    if (rewardEntry.type === 'diamonds') get().addDiamonds(amount); // Добавляем алмазы
                    // Добавляем информацию о награде для попапа
                    generatedRewards.push({ type: rewardEntry.type, amount: amount });
                    console.log(`  - [Loot] Добавлено ${amount} ${rewardEntry.type}`);
                }
            }
        });

        // 2. Выпадение предмета
        if (lootTable.itemDrop && Math.random() < (lootTable.itemDrop.chance || 1.0)) {
            const rarityChances = lootTable.itemDrop.rarityChances;
            // Убедись, что хелперы _rollWeightedRarity_Gear и _selectRandomGearItemByRarity_Gear доступны
            // Они у тебя были в коде стора ранее
            try {
                const chosenRarity = _rollWeightedRarity_Gear(rarityChances); // Определяем редкость
                console.log(`  - [Loot] Ролл редкости предмета: ${chosenRarity}`);
                const itemTemplate = _selectRandomGearItemByRarity_Gear(chosenRarity); // Выбираем предмет этой редкости

                if (itemTemplate) {
                    console.log(`  - [Loot] Выбран предмет: ${itemTemplate.name} (${itemTemplate.id})`);
                    // Добавляем предмет в инвентарь (addItemToInventory сама создаст экземпляр)
                    get().addItemToInventory(itemTemplate.id, 1);
                    // Добавляем информацию о предмете для попапа
                    generatedRewards.push({
                        type: 'item',
                        id: itemTemplate.id,
                        name: itemTemplate.name,
                        rarity: itemTemplate.rarity,
                        icon: itemTemplate.image // Используем image как иконку
                    });
                } else {
                    console.error(`  - [Loot] Не удалось выбрать предмет редкости ${chosenRarity}`);
                }
            } catch (e) {
                 console.error("Ошибка при генерации предмета из сундука:", e);
            }
        }

        // 3. Обновляем состояние: сохраняем награды для попапа и помечаем сундук открытым (опционально)
        set({
            lastOpenedLevelChestRewards: generatedRewards, // Сохраняем сгенерированные награды
            levelChestStates: { ...get().levelChestStates, [chestInstanceId]: true } // Помечаем этот экземпляр сундука как открытый
        });

        // 4. Запускаем таймер для автоматического скрытия попапа с наградами
        const popupDuration = 4000; // Показываем награду 4 секунды (мс)
        console.log(`  - Запланирована очистка наград через ${popupDuration}ms`);
        setTimeout(() => {
            get().clearLastLevelChestRewards(); // Вызываем action очистки по таймеру
        }, popupDuration);

    }, // Конец openLevelChest

    // --- >>> НОВЫЙ ACTION: Очистка информации о последнем луте <<< ---
    clearLastLevelChestRewards: () => {
        // Проверяем, есть ли что очищать, чтобы не вызывать лишний set
        if (get().lastOpenedLevelChestRewards !== null) {
            console.log("[Store Action] Очистка информации о последнем луте из сундука уровня.");
            set({ lastOpenedLevelChestRewards: null });
        }
    },
    
    resetGame: () => {
        const defaultEquipped = getDefaultEquippedSet();
        // console.log("Resetting game state with default gear...");
        set({
            gold: 0, diamonds: 0, username: null, powerLevel: 0,
            playerBaseStats: { ...DEFAULT_BASE_STATS },
            playerHp: DEFAULT_BASE_STATS.hp,
            playerRace: null,
            inventory: [],
            equipped: defaultEquipped,
            dailyShopPurchases: {}, achievementsStatus: {}, totalGoldCollected: 0, totalKills: 0,
            booleanFlags: {}, levelsCompleted: {}, achievementLevel: 1, achievementXp: 0,
            collectedArtifacts: new Set(), artifactLevels: {}, artifactChestPity: {},
            gearKeys: 0, totalArtifactChestsOpened: 0, gearChestPity: {}, totalGearChestsOpened: 0,
            dailyDeals: [], dailyDealsLastGenerated: null, lastOpenedChestInfo: null, lastChestRewards: null,
            activeDebuffs: [], // Сброс дебаффов
            isAffectedByWeakeningAura: false, // <<< НОВОЕ Состояние для ауры
            energyMax: DEFAULT_MAX_ENERGY, // Сброс энергии
            energyCurrent: DEFAULT_MAX_ENERGY,
            lastEnergyRefillTimestamp: Date.now(),
        });
        localStorage.removeItem(STORAGE_KEY);
        // console.log("Game reset complete.");
        get().updatePowerLevel();
        get().checkAndRefreshDailyDeals();
        get().initializeLevelHp(); // Инициализируем HP после сброса
    },

    // --- Действия для дебаффов ---
    addDebuff: (debuff) => { // debuff: { id (optional, for unique tracking), type, strength, durationMs }
        const newDebuff = {
            ...debuff,
            id: debuff.id || uuidv4(), // Генерируем id, если не предоставлен
            endTime: Date.now() + debuff.durationMs,
        };
        set(state => ({
            activeDebuffs: [...state.activeDebuffs, newDebuff]
        }));
        get().updatePowerLevel(); // Дебаффы влияют на статы, значит и на PL
        get().initializeLevelHp(); // Максимальное HP могло измениться
        // console.log("Debuff added:", newDebuff, "Current debuffs:", get().activeDebuffs);
    },

    removeDebuff: (debuffId) => {
        set(state => ({
            activeDebuffs: state.activeDebuffs.filter(d => d.id !== debuffId)
        }));
        get().updatePowerLevel();
        get().initializeLevelHp();
        // console.log("Debuff removed:", debuffId, "Current debuffs:", get().activeDebuffs);
    },

    clearExpiredDebuffs: () => {
        const now = Date.now();
        const currentDebuffs = get().activeDebuffs;
        const activeDebuffs = currentDebuffs.filter(debuff => now < debuff.endTime);
        if (activeDebuffs.length < currentDebuffs.length) {
            set({ activeDebuffs });
            get().updatePowerLevel();
            get().initializeLevelHp();
            // console.log("Expired debuffs cleared. Remaining:", activeDebuffs);
        }
    },

    applyDebuff: (type, duration, strength) => {
        const now = Date.now();
        const endTime = now + duration * 1000;
        const newDebuff = {
            id: uuidv4(), // Use uuid for unique ID
            type,
            strength,
            endTime,
        };
        console.log("Applying Debuff:", newDebuff);
        set((state) => ({
            // Add the new debuff to the existing array
            // Consider logic for stacking or refreshing durations if needed
            // For now, just add it as a new instance
            activeDebuffs: [...state.activeDebuffs, newDebuff],
        }));
        // Optional: Schedule a cleanup check slightly after the debuff expires
        // setTimeout(() => get().cleanupExpiredDebuffs(), duration * 1000 + 500);
    },

    setWeakeningAuraStatus: (isActive) => {
        // Обновляем состояние, только если статус действительно изменился
        if (get().isAffectedByWeakeningAura !== isActive) {
            console.log(`[Store Action] Setting Weakening Aura Status to: ${isActive}`);
            set({ isAffectedByWeakeningAura: isActive });
        }
    },

    // --- NEW ACTION: Cleanup Expired Debuffs ---
    // This should be called periodically or when needed, e.g., from Level.jsx
    cleanupExpiredDebuffs: () => {
        const now = Date.now();
        let changed = false;
        set((state) => {
            const stillActive = state.activeDebuffs.filter(debuff => now < debuff.endTime);
            if (stillActive.length !== state.activeDebuffs.length) {
                changed = true;
                console.log(`[Debuff Cleanup] Removed ${state.activeDebuffs.length - stillActive.length} expired debuffs.`);
                return { activeDebuffs: stillActive };
            }
            return {}; // No changes needed
        });
        // If debuffs were removed, stats might change implicitly on next computedStats call.
        // No need to call updatePowerLevel here unless debuffs directly contribute to it.
    },

})); // Конец create

// ================== Сохранение в localStorage <<< ИЗМЕНЕНО >>> ==================
useGameStore.subscribe((state) => {


    const {
        gold, diamonds, username, inventory, equipped, powerLevel,
        playerBaseStats, playerHp, playerRace,
        energyCurrent, energyMax, lastEnergyRefillTimestamp,
        dailyDeals,             // <<< ДОБАВЛЕНО
        dailyDealsLastGenerated,// <<< ДОБАВЛЕНО
        dailyShopPurchases,
        achievementsStatus, totalGoldCollected, totalKills,
        booleanFlags, levelsCompleted,
        achievementLevel, achievementXp,
        artifactChestPity,      // <<< ДОБАВЛЕНО
        gearKeys,               // <<< ДОБАВЛЕНО
        totalArtifactChestsOpened, // <<< ДОБАВЛЕНО
        // <<< НОВОЕ >>> Добавляем поля артефактов для сохранения
        collectedArtifacts, artifactLevels, // playerShards (если бы были)
        gearChestPity,
        totalGearChestsOpened,
        activeDebuffs, // Сохраняем активные дебаффы
    } = state;

    const stateToSave = {
        gold, diamonds, username, inventory, equipped, powerLevel,
        playerBaseStats, playerHp, playerRace,
        energyCurrent, energyMax, lastEnergyRefillTimestamp,
        dailyDeals,             // <<< ДОБАВЛЕНО
        dailyDealsLastGenerated,// <<< ДОБАВЛЕНО
        dailyShopPurchases,
        achievementsStatus, totalGoldCollected, totalKills,
        booleanFlags, levelsCompleted,
        achievementLevel, achievementXp,
        collectedArtifacts: Array.from(collectedArtifacts), // Сохраняем Set как массив
        artifactLevels,
        artifactChestPity,
        gearKeys,
        totalArtifactChestsOpened,
        gearChestPity,
        totalGearChestsOpened,
        activeDebuffs, // Сохраняем активные дебаффы
        // playerShards, // Если бы были
    };

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
        console.error("Ошибка сохранения состояния в localStorage:", error);
    }
});

// Периодическая очистка истекших дебаффов (например, каждые 5 секунд)
setInterval(() => {
    useGameStore.getState().clearExpiredDebuffs();
}, 5000);


export default useGameStore;