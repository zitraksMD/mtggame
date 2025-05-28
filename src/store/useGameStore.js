// src/store/useGameStore.js
import { create } from "zustand";
import itemsDatabase, { getItemById, getGoldUpgradeCost, getDiamondUpgradeCost, MAX_ITEM_LEVEL, calculateItemStat } from '../data/itemsDatabase.js';

import { LEVEL_CHEST_TYPES, getLevelChestTypeById } from '../data/levelChestData';
import forgeRecipes from "../data/forgeDatabase";
import achievementsData from '../data/achievementsDatabase.js'; // Новая структура ачивок
import trialsData from '../data/trialsData.js'; 

import { RACES, getRaceDataById } from '../config/raceData';
import { ALL_ZONES_CONFIG } from '../data/worldMapData';
import { REWARD_TYPES } from '../data/ShardPassRewardsData.js'; 

import {
    ALL_TASK_DEFINITIONS,
    TASK_TYPES,
    BONUS_REWARDS_CONFIG,
} from '../data/tasksData';

import {
    ARTIFACT_SETS,
    getArtifactById,
    MAX_ARTIFACT_LEVEL,
    BASE_SHARD_COST_PER_LEVEL,
    ALL_ARTIFACTS_ARRAY,
    calculateArtifactStat 
} from '../data/artifactsData';
import { getArtifactChestById, selectWeightedRandomItem as selectWeightedRewardType } from '../data/artifactChestData.js';
import { GEAR_CHESTS, getGearChestById } from '../data/gearChestData';
import { v4 as uuidv4 } from 'uuid';

import { MOCK_SHARD_PASS_DATA_FULL as shardPassSeasonDefinitions } from '../data/ShardPassRewardsData'; 
import { initialTasksData as shardPassTaskDefinitionsByWeek, SHARD_PASS_TASKS_WEEKS } from '../data/ShardPassTasksData'; 
import { SEASON_START_DATE_UTC, getUnlockDateTimeForWeek } from '../data/TimeConstants'; 

const STORAGE_KEY = "gameState";
const ENERGY_REFILL_INTERVAL_MS = 30 * 60 * 1000; 
const DEFAULT_MAX_ENERGY = 30;
export const TON_SHARD_TO_TON_EXCHANGE_RATE = 10;

const ACHIEVEMENT_LEVEL_XP_THRESHOLDS = { 1: 0, 2: 100, 3: 250, 4: 500, 5: 1000, 6: 2000, 7: 3500, 8: 5000, 9: 7500, 10: 10000 }; // Расширим немного для примера
export const ACHIEVEMENT_LEVEL_REWARDS = {
    2: { gold: 50, diamonds: 5 }, 3: { gold: 100, diamonds: 10 },
    4: { gold: 200, diamonds: 15 }, 5: { gold: 500, diamonds: 25 },
    6: { gold: 1000, diamonds: 30, rareChestKeys: 1 },
    7: { gold: 1500, diamonds: 40, epicChestKeys: 1 },
    8: { gold: 2500, diamonds: 50, toncoinShards: 10 },
    9: { gold: 4000, diamonds: 75, toncoinShards: 25 },
    10: { gold: 5000, diamonds: 100, toncoinShards: 50, epicChestKeys: 1 },
};
const getXpNeededForLevel = (level) => ACHIEVEMENT_LEVEL_XP_THRESHOLDS[level + 1] ?? Infinity;


const DEFAULT_BASE_STATS = { hp: 100, attack: 10, attackSpeed: 1.0, critChance: 5, doubleStrikeChance: 0, speed: 5, range: 3, skin: 'default', defense: 0, hpRegen: 0, evasion: 0, maxMana: 0, elementalDmgPercent: 0, goldFind: 0, luck: 0, bossDmg: 0, shardFind: 0, bonusProjectiles: 0, atkPercentBonus: 0, moveSpeedPercentBonus: 0 };

const REFRESH_HOUR_UTC = 2;
const DAILY_TASKS_REFRESH_HOUR_UTC = REFRESH_HOUR_UTC;
const WEEKLY_TASKS_REFRESH_DAY_UTC = 1;
const WEEKLY_TASKS_REFRESH_HOUR_UTC = REFRESH_HOUR_UTC;
const MONTHLY_TASKS_REFRESH_DAY_OF_MONTH_UTC = 1;
const MONTHLY_TASKS_REFRESH_HOUR_UTC = REFRESH_HOUR_UTC;
const RUNE_ATTEMPTS_REFRESH_HOUR_UTC = REFRESH_HOUR_UTC;

const INITIAL_CHAPTER_ID = 1;

const rarityOrder = {
    "Common": 1,
    "Uncommon": 2,
    "Rare": 3,
    "Epic": 4,
    "Legendary": 5,
    "Mythic": 6
    // Добавьте/измените по необходимости
};

// --- Начальное состояние для ShardPass (из КОД1) ---
const getDefaultShardPassState = () => {
    const initialRewardsClaimed = {};
    shardPassSeasonDefinitions.levels.forEach(level => {
        if (level.freeReward) initialRewardsClaimed[`level_${level.level}_free`] = false;
        if (level.premiumReward) initialRewardsClaimed[`level_${level.level}_premium`] = false;
    });

    const initialTaskProgress = {};
    Object.keys(shardPassTaskDefinitionsByWeek).forEach(weekKey => {
        initialTaskProgress[weekKey] = {};
        shardPassTaskDefinitionsByWeek[weekKey].forEach(taskDef => {
            const taskInitialState = {
                progress: 0,
                isClaimed: false,
            };
            if (taskDef.eventTracked === 'login') { // Проверяем тип задачи
                taskInitialState.lastCountedLoginDate = null; // Инициализируем поле для задач на логин
            }
            initialTaskProgress[weekKey][taskDef.id] = taskInitialState;
        });
    });

    return {
        shardPassSeasonId: shardPassSeasonDefinitions.seasonId || `season_${shardPassSeasonDefinitions.seasonNumber}_default`,
        shardPassCurrentLevel: shardPassSeasonDefinitions.defaultStartLevel || 1,
        shardPassCurrentXp: 0,
        shardPassXpPerLevel: shardPassSeasonDefinitions.xpPerLevel || 1000,
        shardPassMaxLevel: shardPassSeasonDefinitions.maxLevel || 50,
        isShardPassPremium: false,
        shardPassRewardsClaimed: initialRewardsClaimed,
        shardPassTasksProgress: initialTaskProgress,
        shardPassSeasonStartDateUTC: SEASON_START_DATE_UTC.toISOString(),
    };
};

const createItemInstance = (itemTemplateInput) => {
    if (!itemTemplateInput) {
        console.warn("Attempted to create instance from null/undefined template");
        return null;
    }

    const actualItemTemplate = Array.isArray(itemTemplateInput) && itemTemplateInput.length > 0
        ? itemTemplateInput[0]
        : itemTemplateInput;

    if (!actualItemTemplate || typeof actualItemTemplate !== 'object' || Array.isArray(actualItemTemplate)) {
        console.warn("Invalid actual item template after processing:", actualItemTemplate, "Original input:", itemTemplateInput);
        return null;
    }

    return {
        ...actualItemTemplate,
        uid: uuidv4(),
        level: actualItemTemplate.level || 1, // Используем уровень из шаблона, если есть, иначе 1
        // ▼▼▼ ДОБАВЛЕННЫЕ СВОЙСТВА ▼▼▼
        isNew: true,        // Помечаем как новый при создании
        receivedTimestamp: Date.now() // Записываем время получения
        // ▲▲▲ КОНЕЦ ДОБАВЛЕННЫХ СВОЙСТВ ▲▲▲
    };
};

const getDefaultEquippedSet = () => {
    const defaultSet = { weapon: null, amulet: null, ring: null, helmet: null, armor: null, boots: null };
    const types = Object.keys(defaultSet);

    types.forEach(type => {
        const commonItemTemplate = itemsDatabase.find(
            item => item.type === type && item.rarity === 'Common'
        );
        if (commonItemTemplate) {
            const instance = createItemInstance(commonItemTemplate);
            if (instance) {
                instance.isNew = false; // Предметы по умолчанию НЕ новые
                instance.receivedTimestamp = 0; // Очень старая метка времени
                defaultSet[type] = instance;
            } else {
                defaultSet[type] = null;
            }
        } else {
            defaultSet[type] = null;
        }
    });
    const missing = types.filter(type => defaultSet[type] === null);
    if (missing.length > 0) {
        console.warn(`Could not find default Common items for types: ${missing.join(', ')}`);
    }
    return defaultSet;
};


// --- Функция Загрузки состояния из localStorage (ОБЪЕДИНЕНА КОД1 и КОД2) ---
const loadFromLocalStorage = () => {
    // VVV ПЕРЕМЕННЫЕ ВЫНЕСЕНЫ В НАЧАЛО ФУНКЦИИ VVV
    const defaultStateForTasks = { 
        dailyTaskProgress: {}, dailyTaskBarXp: 0, dailyBonusClaimed: false, lastDailyReset: null,
        dailyLoginToday: false, killsToday: 0, levelsCompletedToday: 0, gearUpgradedToday: 0, chestsOpenedToday: 0,
        itemsForgedToday: 0, itemsForgedThisWeek: 0, itemsForgedThisMonth: 0, // Добавил из твоей версии resetGame
        lastSeenLoginDateForWeekly: null,
        lastSeenLoginDateForMonthly: null,
        weeklyTaskProgress: {}, weeklyTaskBarXp: 0, weeklyBonusClaimed: false, lastWeeklyReset: null,
        weeklyLoginDays: 0, killsThisWeek: 0, levelsCompletedThisWeek: 0, gearUpgradedThisWeek: 0, chestsOpenedThisWeek: 0,
        monthlyTaskProgress: {}, monthlyTaskBarXp: 0, monthlyBonusClaimed: false, lastMonthlyReset: null,
        monthlyLoginDays: 0, killsThisMonth: 0, levelsCompletedThisMonth: 0, gearUpgradedThisMonth: 0, chestsOpenedThisMonth: 0,
    };
    const defaultShardPass = getDefaultShardPassState();

    const defaultTrialsStatus = {};
    if (trialsData && Array.isArray(trialsData)) {
        trialsData.forEach(trial => {
            defaultTrialsStatus[trial.id] = { actionTaken: false, rewardClaimed: false };
        });
    } else {
        console.warn("[loadFromLocalStorage] trialsData is missing or not an array. Default trialsStatus will be empty.");
    }

    const initialAchStatus = {}; // Определяем здесь
    if (achievementsData && Array.isArray(achievementsData)) {
        achievementsData.forEach(achLine => {
            initialAchStatus[achLine.id] = { highestReachedLevel: 0, claimedRewardsUpToLevel: 0, currentValue: 0 };
        });
    } else {
        console.warn("[loadFromLocalStorage] achievementsData is missing or not an array. Default achievementsStatus will be empty.");
    }
    
    const newDefaultStatsForAchievements = {
        uniqueLoginDaysCount: 0,
        lastLoginDateForUniqueCount: null,
        totalGoldSpent: 0,
        totalDiamondsSpent: 0,
        totalTonShardsEarned: 0,
        totalTonWithdrawn: 0,
    };
    // ^^^ КОНЕЦ ВЫНЕСЕННЫХ ПЕРЕМЕННЫХ ^^^

    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            console.log("No saved state. Initializing with defaults...");
            return {
                equipped: getDefaultEquippedSet(),
                collectedArtifacts: new Set(),
                gold: 100000, diamonds: 10000,
                toncoinShards: 0, toncoinBalance: 0,
                username: null, powerLevel: 0,
                playerBaseStats: { ...DEFAULT_BASE_STATS },
                playerHp: DEFAULT_BASE_STATS.hp,
                playerRace: null,
                inventory: [],
                energyMax: DEFAULT_MAX_ENERGY, energyCurrent: DEFAULT_MAX_ENERGY,
                lastEnergyRefillTimestamp: Date.now(),
                dailyShopPurchases: {}, 
                achievementsStatus: initialAchStatus, // Используем initialAchStatus
                totalGoldCollected: 0, totalKills: 0,
                booleanFlags: {}, levelsCompleted: {},
                achievementLevel: 1, achievementXp: 0,
                artifactLevels: {}, artifactChestPity: {},
                rareChestKeys: 10, epicChestKeys: 25,
                totalArtifactChestsOpened: 0,
                gearChestPity: {}, totalGearChestsOpened: 0,
                dailyDeals: [], dailyDealsLastGenerated: null,
                lastOpenedChestInfo: null, lastChestRewards: null,
                treasureChestAttempts: 3, treasureChestLastReset: null,
                activeDebuffs: [], completedZones: {},
                isAffectedByWeakeningAura: false, userPhotoUrl: null,
                currentChapterId: INITIAL_CHAPTER_ID,
                levelChestStates: {},
                ...defaultStateForTasks,
                ...defaultShardPass,
                trialsStatus: defaultTrialsStatus,
                ...newDefaultStatsForAchievements,
            };
        }

        let parsed = JSON.parse(saved);
        console.log("Saved state found. Processing...");

        // Migration for playerBaseStats (из КОД2)
        if (parsed && parsed.playerBaseStats && (parsed.playerBaseStats.defense !== undefined || parsed.playerBaseStats.health !== undefined)) {
            console.log("Миграция старых playerBaseStats...");
            let updatedStats = { ...parsed.playerBaseStats };
            delete updatedStats.defense;
            if (updatedStats.health !== undefined) { updatedStats.hp = updatedStats.health; delete updatedStats.health; }
            Object.keys(DEFAULT_BASE_STATS).forEach(key => { updatedStats[key] = updatedStats[key] ?? DEFAULT_BASE_STATS[key]; });
            parsed.playerBaseStats = updatedStats;
            console.log("Миграция playerBaseStats завершена.");
        }

        const migrateItem = (item, index = 0, totalItems = 1) => {
            if (!item) return null;
            return {
                ...item,
                level: item.level || 1,
                isNew: typeof item.isNew === 'boolean' ? item.isNew : false, // Старые предметы не новые
                receivedTimestamp: typeof item.receivedTimestamp === 'number' ? item.receivedTimestamp : (Date.now() - (totalItems - index) * 60000) // Старым даем временные метки с разницей в минуту
            };
        };

        if (parsed.inventory && Array.isArray(parsed.inventory)) {
            parsed.inventory = parsed.inventory.map((item, idx, arr) => migrateItem(item, idx, arr.length)).filter(Boolean);
        } else {
            parsed.inventory = [];
        }

        if (parsed.equipped && typeof parsed.equipped === 'object') {
            for (const slot in parsed.equipped) {
                if (parsed.equipped[slot]) {
                    parsed.equipped[slot] = migrateItem(parsed.equipped[slot]);
                }
            }
        }

        const defaultFullStateForNewKeys = {
            equipped: getDefaultEquippedSet(), collectedArtifacts: new Set(), gold: 0, diamonds: 0,
            toncoinShards: 0, toncoinBalance: 0, username: null, powerLevel: 0,
            playerBaseStats: { ...DEFAULT_BASE_STATS }, playerHp: DEFAULT_BASE_STATS.hp, playerRace: null,
            inventory: [], energyMax: DEFAULT_MAX_ENERGY, energyCurrent: DEFAULT_MAX_ENERGY,
            lastEnergyRefillTimestamp: Date.now(), dailyShopPurchases: {}, 
            achievementsStatus: initialAchStatus, // Используем initialAchStatus
            totalGoldCollected: 0, totalKills: 0, booleanFlags: {}, levelsCompleted: {},
            achievementLevel: 1, achievementXp: 0, artifactLevels: {}, artifactChestPity: {},
            rareChestKeys: 10, epicChestKeys: 25, totalArtifactChestsOpened: 0, gearChestPity: {}, totalGearChestsOpened: 0,
            dailyDeals: [], dailyDealsLastGenerated: null, lastOpenedChestInfo: null, lastChestRewards: null,
            treasureChestAttempts: 3, treasureChestLastReset: null, activeDebuffs: [],
            isAffectedByWeakeningAura: false, completedZones: {}, userPhotoUrl: null,
            currentChapterId: INITIAL_CHAPTER_ID,
            levelChestStates: {},
            ...defaultStateForTasks,
            ...defaultShardPass,
            trialsStatus: defaultTrialsStatus,
            ...newDefaultStatsForAchievements,
        };

        // Миграция achievementsStatus, если старая структура
        if (parsed.achievementsStatus) {
            const firstAchKey = Object.keys(parsed.achievementsStatus)[0];
            // Проверяем, существует ли ключ и является ли его значение объектом,
            // а также есть ли у этого объекта свойство 'completed' (признак старой структуры)
            if (firstAchKey && 
                typeof parsed.achievementsStatus[firstAchKey] === 'object' &&
                parsed.achievementsStatus[firstAchKey] !== null && // Доп. проверка на null
                typeof parsed.achievementsStatus[firstAchKey].completed !== 'undefined') {
                console.warn("Old achievementsStatus structure detected. Resetting to new structure.");
                parsed.achievementsStatus = initialAchStatus; 
            }
        } else { // Если achievementsStatus вообще нет в сохраненном состоянии
             parsed.achievementsStatus = initialAchStatus;
        }
        
        // Убедимся, что все ачивки из achievementsData есть в achievementsStatus
        // и имеют правильную структуру, даже если achievementsStatus был загружен
        if (parsed.achievementsStatus && achievementsData && Array.isArray(achievementsData)) {
            achievementsData.forEach(achLine => {
                if (!parsed.achievementsStatus[achLine.id] || 
                    typeof parsed.achievementsStatus[achLine.id].highestReachedLevel === 'undefined') { // Проверка на новую структуру
                    parsed.achievementsStatus[achLine.id] = { highestReachedLevel: 0, claimedRewardsUpToLevel: 0, currentValue: 0 };
                }
            });
        }


        for (const key in defaultFullStateForNewKeys) {
            if (parsed[key] === undefined) {
                if (key === 'collectedArtifacts') parsed[key] = new Set();
                else if (key === 'equipped' && defaultFullStateForNewKeys[key] === null) parsed[key] = getDefaultEquippedSet();
                // achievementsStatus уже должен быть обработан выше или установлен по умолчанию
                else parsed[key] = defaultFullStateForNewKeys[key];
            }
        }
        
        if (!parsed.trialsStatus) { 
            parsed.trialsStatus = defaultTrialsStatus;
        } else { 
            if (trialsData && Array.isArray(trialsData)) {
                trialsData.forEach(trialDef => {
                    if (!parsed.trialsStatus[trialDef.id]) {
                        parsed.trialsStatus[trialDef.id] = { actionTaken: false, rewardClaimed: false };
                    }
                });
            }
        }
        // Ensure equipped is valid or reset (из КОД2)
        const savedEquipped = parsed.equipped;
        const isSavedEquippedInvalid = !savedEquipped || typeof savedEquipped !== 'object' || Object.keys(savedEquipped).length !== 6 || Object.values(savedEquipped).some(v => v === undefined);

        if (isSavedEquippedInvalid) {
            console.warn("Saved 'equipped' state is missing, invalid, or has undefined slots. Initializing with default Common set.");
            parsed.equipped = getDefaultEquippedSet();
        } else {
            let needsFix = false;
            for (const slot in parsed.equipped) {
                if (parsed.equipped[slot] === undefined) {
                    needsFix = true;
                    break;
                }
            }
            if (needsFix) {
                console.warn("Some slots in 'equipped' were undefined. Resetting to default Common set.");
                parsed.equipped = getDefaultEquippedSet();
            }
        }

        if (parsed.toncoinBalance === undefined) { // из КОД2
            parsed.toncoinBalance = 0;
        }
        // Этот цикл уже был выше, но в КОД2 был специфичный для toncoinBalance, оставим общую логику из КОД1
        // for (const key in defaultFullStateForNewKeys) { ... }

        if (parsed.collectedArtifacts && !(parsed.collectedArtifacts instanceof Set)) {
            try {
                parsed.collectedArtifacts = new Set(parsed.collectedArtifacts);
            } catch (e) {
                console.error("Failed to reconstruct Set for collectedArtifacts, resetting.", e);
                parsed.collectedArtifacts = new Set();
            }
        }

        // Убедимся, что структуры ShardPass инициализированы (из КОД1)
        if (!parsed.shardPassSeasonId || typeof parsed.shardPassRewardsClaimed !== 'object' || typeof parsed.shardPassTasksProgress !== 'object') {
            console.warn("ShardPass data missing or malformed in saved state, re-initializing ShardPass part.");
            const defaultSP = getDefaultShardPassState();
            parsed.shardPassSeasonId = defaultSP.shardPassSeasonId;
            parsed.shardPassCurrentLevel = defaultSP.shardPassCurrentLevel;
            parsed.shardPassCurrentXp = defaultSP.shardPassCurrentXp;
            parsed.shardPassXpPerLevel = defaultSP.shardPassXpPerLevel;
            parsed.shardPassMaxLevel = defaultSP.shardPassMaxLevel;
            parsed.isShardPassPremium = parsed.isShardPassPremium || false; // Сохраняем, если уже было куплено
            parsed.shardPassRewardsClaimed = defaultSP.shardPassRewardsClaimed;
            parsed.shardPassTasksProgress = defaultSP.shardPassTasksProgress;
            parsed.shardPassSeasonStartDateUTC = defaultSP.shardPassSeasonStartDateUTC;
        }
        // Ensure other new fields from defaultStateForTasks are present (из КОД2, но покрывается общим циклом выше)
        for (const key in defaultStateForTasks) {
            if (parsed[key] === undefined) {
                parsed[key] = defaultStateForTasks[key];
            }
        }

        return parsed;

    } catch (error) {
        console.error("Critical error during loadFromLocalStorage:", error);
        localStorage.removeItem(STORAGE_KEY);
        const defaultTrialsStatusOnError = {};
        trialsData.forEach(trial => {
            defaultTrialsStatusOnError[trial.id] = { actionTaken: false, rewardClaimed: false };
        });
        const defaultAchStatusOnError = {};
         achievementsData.forEach(achLine => {
            defaultAchStatusOnError[achLine.id] = { highestReachedLevel: 0, claimedRewardsUpToLevel: 0, currentValue: 0 };
        });

        return {
            equipped: getDefaultEquippedSet(), collectedArtifacts: new Set(), gold: 0, diamonds: 0, toncoinShards: 0,
            toncoinBalance: 0, username: null, powerLevel: 0,
            playerBaseStats: { ...DEFAULT_BASE_STATS }, playerHp: DEFAULT_BASE_STATS.hp, playerRace: null, inventory: [],
            energyMax: DEFAULT_MAX_ENERGY, energyCurrent: DEFAULT_MAX_ENERGY, lastEnergyRefillTimestamp: Date.now(),
            dailyShopPurchases: {}, 
            achievementsStatus: defaultAchStatusOnError, // <<< ОБНОВЛЕНО
            achievementLevel: 1, achievementXp: 0, 
            totalGoldCollected: 0, totalKills: 0, booleanFlags: {},
            levelsCompleted: {}, artifactLevels: {}, artifactChestPity: {},
            rareChestKeys: 10, epicChestKeys: 25, totalArtifactChestsOpened: 0, gearChestPity: {}, totalGearChestsOpened: 0, dailyDeals: [],
            dailyDealsLastGenerated: null, lastOpenedChestInfo: null, lastChestRewards: null, treasureChestAttempts: 3,
            treasureChestLastReset: null, activeDebuffs: [], isAffectedByWeakeningAura: false, completedZones: {},
            userPhotoUrl: null, currentChapterId: INITIAL_CHAPTER_ID,
            levelChestStates: {},
            ...getDefaultShardPassState(),
            ...(loadFromLocalStorage.defaultStateForTasks || {}), // Пытаемся получить из контекста функции, если определено
            achievementsStatus: defaultAchStatusOnError,
            trialsStatus: defaultTrialsStatusOnError,
            ...newDefaultStatsForAchievementsOnError,
            ...(loadFromLocalStorage.defaultStateForTasks || defaultStateForTasks)        };
    }
};
loadFromLocalStorage.defaultStateForTasks = {
    dailyTaskProgress: {}, dailyTaskBarXp: 0, dailyBonusClaimed: false, lastDailyReset: null,
    dailyLoginToday: false, killsToday: 0, levelsCompletedToday: 0, gearUpgradedToday: 0, chestsOpenedToday: 0,
    lastSeenLoginDateForWeekly: null,
    lastSeenLoginDateForMonthly: null,
    weeklyTaskProgress: {}, weeklyTaskBarXp: 0, weeklyBonusClaimed: false, lastWeeklyReset: null,
    weeklyLoginDays: 0, killsThisWeek: 0, levelsCompletedThisWeek: 0, gearUpgradedThisWeek: 0, chestsOpenedThisWeek: 0,
    monthlyTaskProgress: {}, monthlyTaskBarXp: 0, monthlyBonusClaimed: false, lastMonthlyReset: null,
    monthlyLoginDays: 0, killsThisMonth: 0, levelsCompletedThisMonth: 0, gearUpgradedThisMonth: 0, chestsOpenedThisMonth: 0,
};

const RARITY_WEIGHTS = { common: 100, uncommon: 50, rare: 25, legendary: 8, mythic: 2 }; // из КОД2 (legendary vs Mythic)
function weightedRandom(itemsWithWeight) { // из КОД2
    if (!itemsWithWeight || itemsWithWeight.length === 0) {
        console.error('[weightedRandom] Получен пустой или невалидный массив!');
        return null;
    }
    let totalWeight = itemsWithWeight.reduce((sum, entry) => {
        const weight = entry?.weight ?? 0;
        if (typeof weight !== 'number' || isNaN(weight) || weight < 0) {
            console.warn('[weightedRandom] Невалидный вес у элемента:', entry, 'Используем 0.');
            return sum;
        }
        return sum + weight;
    }, 0);

    if (totalWeight <= 0) {
        console.warn('[weightedRandom] Общий вес <= 0. Возврат случайного элемента (если есть).');
        return itemsWithWeight.length > 0 ? itemsWithWeight[Math.floor(Math.random() * itemsWithWeight.length)].item : null;
    }
    let random = Math.random() * totalWeight;
    for (let i = 0; i < itemsWithWeight.length; i++) {
        const currentWeight = itemsWithWeight[i]?.weight ?? 0;
        if (random < currentWeight) {
            return itemsWithWeight[i]?.item;
        }
        random -= currentWeight;
    }
    console.error('[weightedRandom] Цикл завершился без выбора! Этого не должно происходить при totalWeight > 0. Возврат последнего элемента.');
    return itemsWithWeight.length > 0 ? itemsWithWeight[itemsWithWeight.length - 1]?.item : null;
}
const DAILY_DEAL_RARITY_WEIGHTS = { common: 70, uncommon: 25, rare: 5 }; // из КОД2
const _selectWeightedArtifactIdFromSet_ByRarity = (setId) => { // из КОД2
    const targetSet = ARTIFACT_SETS.find(s => s.id === setId);
    if (!targetSet || !targetSet.artifacts || targetSet.artifacts.length === 0) {
        console.error(`[SelectWeightedArtifact] Сет ${setId} не найден или пуст!`);
        return null;
    }
    const weightedArtifactPool = targetSet.artifacts.map(artifact => ({
        id: artifact.id,
        weight: RARITY_WEIGHTS[artifact.rarity.toLowerCase()] || 1
    }));
    const totalWeight = weightedArtifactPool.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight <= 0) {
        console.warn(`[SelectWeightedArtifact] Все веса для сета ${setId} нулевые, выбор случайный.`);
        const randomIndex = Math.floor(Math.random() * weightedArtifactPool.length);
        return weightedArtifactPool[randomIndex].id;
    }
    let randomValue = Math.random() * totalWeight;
    for (const item of weightedArtifactPool) {
        if (randomValue < item.weight) {
            return item.id;
        }
        randomValue -= item.weight;
    }
    console.warn(`[SelectWeightedArtifact] Ошибка взвешенного выбора для сета ${setId}, возврат последнего элемента.`);
    return weightedArtifactPool[weightedArtifactPool.length - 1].id;
};
const _selectRandomArtifactIdOfGivenRarity = (targetRarity) => {
    if (!ALL_ARTIFACTS_ARRAY || ALL_ARTIFACTS_ARRAY.length === 0) {
        console.error("[SelectRandomArtifact] Глобальный список артефактов (ALL_ARTIFACTS_ARRAY) не определен или пуст.");
        return null;
    }
    if (!targetRarity || typeof targetRarity !== 'string') {
        console.error("[SelectRandomArtifact] Целевая редкость (targetRarity) не предоставлена или имеет неверный формат.", targetRarity);
        return null;
    }
    const normalizedTargetRarity = targetRarity.toLowerCase();
    const possibleArtifacts = ALL_ARTIFACTS_ARRAY.filter(artifact => artifact.rarity === normalizedTargetRarity);
    if (possibleArtifacts.length === 0) {
        console.warn(`[SelectRandomArtifact] Не найдено артефактов для редкости: ${normalizedTargetRarity}.`);
        return null;
    }
    const randomIndex = Math.floor(Math.random() * possibleArtifacts.length);
    return possibleArtifacts[randomIndex].id;
};

const _rollWeightedRarity_Gear = (rarityChances) => { // из КОД2
    if (!rarityChances || Object.keys(rarityChances).length === 0) {
        console.error("[RollRarityGear] Объект шансов пуст!");
        return 'Common';
    }
    const totalWeight = Object.values(rarityChances).reduce((sum, chance) => sum + (chance || 0), 0);
    if (totalWeight <= 0) {
        console.warn("[RollRarityGear] Сумма шансов равна нулю, возвращаем первую редкость.");
        return Object.keys(rarityChances)[0] || 'Common';
    }
    const randomValue = Math.random() * totalWeight;
    let cumulativeWeight = 0;
    for (const [rarity, chance] of Object.entries(rarityChances)) {
        cumulativeWeight += (chance || 0);
        if (randomValue < cumulativeWeight) {
            return rarity;
        }
    }
    console.warn("[RollRarityGear] Не удалось выбрать редкость по весу, возврат последнего.");
    return Object.keys(rarityChances).pop() || 'Common';
};
const _selectRandomGearItemByRarity_Gear = (targetRarity) => { // из КОД2
    const possibleItems = itemsDatabase.filter(item => item.rarity === targetRarity);
    if (possibleItems.length === 0) {
        console.error(`[SelectGearByRarity] Нет предметов снаряжения с редкостью ${targetRarity} в itemsDatabase! Попытка найти Common.`);
        const commonItems = itemsDatabase.filter(item => item.rarity === 'Common');
        if (commonItems.length > 0) {
            const randomIndex = Math.floor(Math.random() * commonItems.length);
            return { ...commonItems[randomIndex] };
        }
        console.error(`[SelectGearByRarity] Нет даже Common предметов! Возврат null.`);
        return null;
    }
    const randomIndex = Math.floor(Math.random() * possibleItems.length);
    return { ...possibleItems[randomIndex] };
};

const savedState = loadFromLocalStorage();

const useGameStore = create((set, get) => ({
    // ================== Состояние (State) - Объединенное из КОД1 и КОД2 ==================
    gold: savedState.gold,
    diamonds: savedState.diamonds,
    toncoinShards: savedState.toncoinShards || 0,
    toncoinBalance: savedState.toncoinBalance || 0,
    rareChestKeys: savedState.rareChestKeys ?? 0,    // Если в старом сохранении нет, будет 0 (или 10, если хотите дать их старым игрокам)
    epicChestKeys: savedState.epicChestKeys ?? 0,
    username: savedState.username,
    userPhotoUrl: savedState.userPhotoUrl,
    powerLevel: savedState.powerLevel,
    energyMax: savedState.energyMax,
    energyCurrent: savedState.energyCurrent,
    lastEnergyRefillTimestamp: savedState.lastEnergyRefillTimestamp,
    lastOpenedLevelChestRewards: savedState.lastOpenedLevelChestRewards, // из КОД2, было null
    levelChestStates: savedState.levelChestStates || {}, // из КОД1, также в КОД2
    currentLevelRewards: savedState.currentLevelRewards || { gold: 0, diamonds: 0, items: [] }, // из КОД2
    currentChapterId: savedState.currentChapterId,
    completedZones: savedState.completedZones,
    hasClaimableRewardsIndicator: savedState.hasClaimableRewardsIndicator || false, // из КОД2
    playerHp: savedState.playerHp,
    playerRace: savedState.playerRace,
    playerBaseStats: savedState.playerBaseStats,
    inventory: savedState.inventory,
    equipped: savedState.equipped,
    collectedArtifacts: savedState.collectedArtifacts, // Should be a Set
    artifactLevels: savedState.artifactLevels,
    dailyShopPurchases: savedState.dailyShopPurchases,
   achievementsStatus: savedState.achievementsStatus, 
    trialsStatus: savedState.trialsStatus,
    // VVV НОВЫЕ СТАТЫ VVV
    uniqueLoginDaysCount: savedState.uniqueLoginDaysCount || 0,
    lastLoginDateForUniqueCount: savedState.lastLoginDateForUniqueCount || null,
    totalGoldSpent: savedState.totalGoldSpent || 0,
    totalDiamondsSpent: savedState.totalDiamondsSpent || 0,
    totalTonShardsEarned: savedState.totalTonShardsEarned || 0, // Добавляем это, если его не было
    totalTonWithdrawn: savedState.totalTonWithdrawn || 0,
    totalGoldCollected: savedState.totalGoldCollected,
    totalKills: savedState.totalKills,
    booleanFlags: savedState.booleanFlags,
    levelsCompleted: savedState.levelsCompleted,
    achievementLevel: savedState.achievementLevel,
    achievementXp: savedState.achievementXp,
    artifactChestPity: savedState.artifactChestPity,
    totalArtifactChestsOpened: savedState.totalArtifactChestsOpened,
    gearChestPity: savedState.gearChestPity,
    totalGearChestsOpened: savedState.totalGearChestsOpened,
    lastOpenedChestInfo: savedState.lastOpenedChestInfo,
    lastChestRewards: savedState.lastChestRewards,
    dailyDeals: savedState.dailyDeals,
    dailyDealsLastGenerated: savedState.dailyDealsLastGenerated,
    isFullScreenMapActive: savedState.isFullScreenMapActive || false, // из КОД2
    activeDebuffs: savedState.activeDebuffs,
    isScreenTransitioning: savedState.isScreenTransitioning || false, // из КОД2
    transitionAction: savedState.transitionAction || null, // из КОД2
    onTransitionCloseCompleteCallback: null, // из КОД2
    onTransitionOpenCompleteCallback: null, // из КОД2
    treasureChestAttempts: savedState.treasureChestAttempts,
    treasureChestLastReset: savedState.treasureChestLastReset,
    isAffectedByWeakeningAura: savedState.isAffectedByWeakeningAura,

    // Состояния для задач (из КОД1, также в КОД2)
    dailyTaskProgress: savedState.dailyTaskProgress,
    dailyTaskBarXp: savedState.dailyTaskBarXp,
    dailyBonusClaimed: savedState.dailyBonusClaimed,
    lastDailyReset: savedState.lastDailyReset,
    dailyLoginToday: savedState.dailyLoginToday,
    killsToday: savedState.killsToday,
    levelsCompletedToday: savedState.levelsCompletedToday,
    gearUpgradedToday: savedState.gearUpgradedToday,
    chestsOpenedToday: savedState.chestsOpenedToday,
    lastSeenLoginDateForWeekly: savedState.lastSeenLoginDateForWeekly,
    lastSeenLoginDateForMonthly: savedState.lastSeenLoginDateForMonthly,
    weeklyTaskProgress: savedState.weeklyTaskProgress,
    weeklyTaskBarXp: savedState.weeklyTaskBarXp,
    weeklyBonusClaimed: savedState.weeklyBonusClaimed,
    lastWeeklyReset: savedState.lastWeeklyReset,
    weeklyLoginDays: savedState.weeklyLoginDays,
    killsThisWeek: savedState.killsThisWeek,
    levelsCompletedThisWeek: savedState.levelsCompletedThisWeek,
    gearUpgradedThisWeek: savedState.gearUpgradedThisWeek,
    chestsOpenedThisWeek: savedState.chestsOpenedThisWeek,
    monthlyTaskProgress: savedState.monthlyTaskProgress,
    monthlyTaskBarXp: savedState.monthlyTaskBarXp,
    monthlyBonusClaimed: savedState.monthlyBonusClaimed,
    lastMonthlyReset: savedState.lastMonthlyReset,
    monthlyLoginDays: savedState.monthlyLoginDays,
    killsThisMonth: savedState.killsThisMonth,
    levelsCompletedThisMonth: savedState.levelsCompletedThisMonth,
    gearUpgradedThisMonth: savedState.gearUpgradedThisMonth,
    chestsOpenedThisMonth: savedState.chestsOpenedThisMonth,

    // <<< НОВОЕ СОСТОЯНИЕ ДЛЯ SHARDPASS (из КОД1) >>>
    shardPassSeasonId: savedState.shardPassSeasonId,
    shardPassCurrentLevel: savedState.shardPassCurrentLevel,
    shardPassCurrentXp: savedState.shardPassCurrentXp,
    shardPassXpPerLevel: savedState.shardPassXpPerLevel,
    shardPassMaxLevel: savedState.shardPassMaxLevel,
    isShardPassPremium: savedState.isShardPassPremium,
    shardPassRewardsClaimed: savedState.shardPassRewardsClaimed,
    shardPassTasksProgress: savedState.shardPassTasksProgress,
    shardPassSeasonStartDateUTC: savedState.shardPassSeasonStartDateUTC,

    // ================== Селекторы (Computed/Getters) ==================
    computedStats: () => {
        const state = get();
        const now = Date.now();
        const currentActiveDebuffs = (state.activeDebuffs || []).filter(debuff => now < debuff.endTime);
        let totalWeakenDamageReductionPercent = 0;
        let totalWeakenMaxHpReductionPercent = 0;
        let totalOtherDamageReductionPercent = 0;
        let totalOtherMaxHpReductionPercent = 0;

        currentActiveDebuffs.forEach(debuff => {
            if (debuff.type === 'weaken') {
                totalWeakenDamageReductionPercent += (debuff.strength || 0);
                totalWeakenMaxHpReductionPercent += (debuff.strength || 0);
            } else {
                if (debuff.hasOwnProperty('damageReductionPercent')) {
                    totalOtherDamageReductionPercent += (debuff.damageReductionPercent || 0);
                }
                if (debuff.hasOwnProperty('maxHpReductionPercent')) {
                    totalOtherMaxHpReductionPercent += (debuff.maxHpReductionPercent || 0);
                }
            }
        });

        totalWeakenDamageReductionPercent = Math.min(totalWeakenDamageReductionPercent, 80);
        totalWeakenMaxHpReductionPercent = Math.min(totalWeakenMaxHpReductionPercent, 80);
        totalOtherDamageReductionPercent = Math.min(totalOtherDamageReductionPercent, 80);
        totalOtherMaxHpReductionPercent = Math.min(totalOtherMaxHpReductionPercent, 80);

        let finalStats = { ...DEFAULT_BASE_STATS, ...(state.playerBaseStats || {}) };

        // Аккумулятор для суммарного ДЕСЯТИЧНОГО бонуса скорости атаки (от снаряжения, артефактов, сетов)
        let totalDecimalAttackSpeedBonus = 0;

        // --- ОБНОВЛЕННАЯ ЛОГИКА ДЛЯ СТАТОВ ОТ ЭКИПИРОВКИ ---
        for (const slot in state.equipped) {
            const itemInstance = state.equipped[slot];
            if (itemInstance) {
                const itemType = itemInstance.type;
                const itemRarity = itemInstance.rarity;
                const itemLevel = itemInstance.level || 1;

                finalStats.hp = (finalStats.hp || 0) + calculateItemStat(itemType, "hpBonus", itemRarity, itemLevel);
                finalStats.attack = (finalStats.attack || 0) + calculateItemStat(itemType, "attackBonus", itemRarity, itemLevel);

                totalDecimalAttackSpeedBonus += calculateItemStat(itemType, "attackSpeedBonus", itemRarity, itemLevel);

                finalStats.critChance = (finalStats.critChance || 0) + (calculateItemStat(itemType, "critChanceBonus", itemRarity, itemLevel) * 100);
                finalStats.doubleStrikeChance = (finalStats.doubleStrikeChance || 0) + (calculateItemStat(itemType, "doubleStrikeChanceBonus", itemRarity, itemLevel) * 100);

                // Остальные статы от экипировки (speedBonus, rangeBonus, defenseBonus, etc.)
                // теперь НЕ ДОБАВЛЯЮТСЯ здесь напрямую из itemInstance.
                // Они должны обрабатываться через calculateItemStat ИЛИ поступать из других источников (база, артефакты, сеты).
            }
        }
        // --- КОНЕЦ ОБНОВЛЕННОЙ ЛОГИКИ ДЛЯ СТАТОВ ОТ ЭКИПИРОВКИ ---

        const { artifactLevels, collectedArtifacts } = state;
        let totalArtifactHp = 0, totalArtifactAttack = 0, totalArtifactDefense = 0, totalArtifactHpRegen = 0,
            totalArtifactDecimalAttackSpeedBonus = 0, // Для десятичных значений скорости атаки от артефактов
            totalArtifactEvasion = 0, totalArtifactMoveSpeedBonus = 0, // % бонус
            totalArtifactAtkPercentBonus = 0, totalArtifactMaxMana = 0, totalArtifactElementalDmgPercent = 0,
            totalArtifactCritChance = 0, totalArtifactDoubleStrikeChance = 0, totalArtifactGoldFind = 0,
            totalArtifactLuck = 0, totalArtifactBossDmg = 0, totalArtifactShardFind = 0, totalArtifactBonusProjectiles = 0;

        // ▼▼▼ ИЗМЕНЕННАЯ ЛОГИКА ОБРАБОТКИ АРТЕФАКТОВ ▼▼▼
        for (const artifactId in artifactLevels) {
            if (collectedArtifacts.has(artifactId)) {
                const artifactDefinition = getArtifactById(artifactId); // Используем getArtifactById
                const artifactInfo = artifactLevels[artifactId];

                if (artifactDefinition && artifactInfo) {
                    const level = artifactInfo.level;
                    if (level <= 0) continue;

                    // Собираем все возможные ключи статов для данного артефакта
                    const allStatKeysForArtifact = new Set([
                        ...(artifactDefinition.primaryDynamicStats || []),
                        ...(artifactDefinition.baseStats ? Object.keys(artifactDefinition.baseStats) : []),
                        // levelStats ключи обычно совпадают с baseStats, но можно добавить для полноты,
                        // если структура это позволяет. calculateArtifactStat уже учтет levelStats.
                    ]);

                    allStatKeysForArtifact.forEach(statName => {
                        // ПРЕДПОЛАГАЕТСЯ, ЧТО calculateArtifactStat СУЩЕСТВУЕТ И ИМПОРТИРОВАНА
                        const value = calculateArtifactStat(artifactDefinition, statName, level);

                        // Применяем полученное значение к соответствующему аккумулятору
                        switch (statName) {
                            case "hp": totalArtifactHp += value; break;
                            case "attack": totalArtifactAttack += value; break;
                            case "defense": totalArtifactDefense += value; break;
                            case "hpRegen": totalArtifactHpRegen += value; break;
                            case "attackSpeed": totalArtifactDecimalAttackSpeedBonus += value; break; // значение уже десятичное
                            case "evasion": totalArtifactEvasion += value; break;
                            case "moveSpeedPercentBonus": totalArtifactMoveSpeedBonus += value; break;
                            case "atkPercentBonus": totalArtifactAtkPercentBonus += value; break;
                            case "maxMana": totalArtifactMaxMana += value; break;
                            case "elementalDmgPercent": totalArtifactElementalDmgPercent += value; break;
                            case "critChance": totalArtifactCritChance += value; break;
                            case "doubleStrikeChance": totalArtifactDoubleStrikeChance += value; break;
                            case "goldFind": totalArtifactGoldFind += value; break;
                            case "luck": totalArtifactLuck += value; break;
                            case "bossDmg": totalArtifactBossDmg += value; break;
                            case "shardFind": totalArtifactShardFind += value; break;
                            case "bonusProjectiles": totalArtifactBonusProjectiles += value; break;
                            default:
                                if (value !== 0) { // Предупреждаем, только если есть значение для нераспознанного стата
                                    console.warn(`[WARN] Стат артефакта '${artifactId}' ('${statName}') со значением ${value} не добавлен в аккумулятор computedStats.`);
                                }
                                break;
                        }
                    });
                } else {
                    console.warn(`[WARN] Не найдены данные или информация об уровне для артефакта ID: ${artifactId}`);
                }
            }
        }
        // Применяем аккумулированные статы от артефактов к finalStats
        finalStats.hp += totalArtifactHp;
        finalStats.attack += totalArtifactAttack;
        finalStats.defense += totalArtifactDefense;
        finalStats.hpRegen += totalArtifactHpRegen;
        // totalDecimalAttackSpeedBonus УЖЕ содержит значения от экипировки, добавляем от артефактов
        totalDecimalAttackSpeedBonus += totalArtifactDecimalAttackSpeedBonus;

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
        // ▲▲▲ КОНЕЦ ИЗМЕНЕННОЙ ЛОГИКИ ОБРАБОТКИ АРТЕФАКТОВ ▲▲▲


 ARTIFACT_SETS.forEach(setDef => {
        const activeOwnedInSet = setDef.artifacts.filter(artifact => {
            const stateInfo = artifactLevels[artifact.id];
            return collectedArtifacts.has(artifact.id) && stateInfo && stateInfo.level > 0;
        }).length;

        setDef.bonuses.forEach(bonus => { // Теперь каждый 'bonus' - это ОДИН стат
            const conditionMatch = bonus.condition.match(/\[\s*Собрано\s*(\d+)\s*\]/i);
            const requiredCount = conditionMatch ? parseInt(conditionMatch[1], 10) : 0;

            if (requiredCount > 0 && activeOwnedInSet >= requiredCount) {
                const descPart = bonus.description.trim().toLowerCase(); 

                const valueMatch = descPart.match(/([+-]?\d+(\.\d+)?)/);
                const value = valueMatch ? parseFloat(valueMatch[1]) : 0;
                let appliedThisPart = false;

                if (descPart.includes('макс. hp') || (descPart.includes('hp') && !descPart.includes('регенерация hp') && !descPart.includes('hp regen'))) {
                    if (descPart.includes('%')) {
                        finalStats.hp *= (1 + value / 100);
                    } else {
                        finalStats.hp += value; 
                    }
                    appliedThisPart = true;
                // ИСПРАВЛЕНО: Добавлена проверка на английское 'attack'
                } else if (descPart.includes('attack') || descPart.includes('сила атаки') || descPart.includes('урон') || (descPart.includes('атак') && !descPart.includes('скорость атаки'))) {
                    if (descPart.includes('%')) {
                        finalStats.atkPercentBonus = (finalStats.atkPercentBonus || 0) + value;
                    } else {
                        finalStats.attack += value;
                    }
                    appliedThisPart = true;
                } else if (descPart.includes('скорость атаки') || descPart.includes('attack speed')) {
                    if (descPart.includes('%')) {
                        totalDecimalAttackSpeedBonus += value / 100;
                    } else {
                        totalDecimalAttackSpeedBonus += value;
                    }
                    appliedThisPart = true;
                } else if (descPart.includes('регенерация hp') || descPart.includes('hp regen')) {
                    finalStats.hpRegen = (finalStats.hpRegen || 0) + value; appliedThisPart = true;
                } else if (descPart.includes('шанс двойного удара') || descPart.includes('двойной удар') || descPart.includes('double strike chance')) {
                    finalStats.doubleStrikeChance = (finalStats.doubleStrikeChance || 0) + value; appliedThisPart = true;
                } else if (descPart.includes('шанс найти золото') || descPart.includes('поиск золота')) {
                    finalStats.goldFind = (finalStats.goldFind || 0) + value; appliedThisPart = true;
                } else if (descPart.includes('шанс найти осколки') || descPart.includes('поиск осколков')) {
                    finalStats.shardFind = (finalStats.shardFind || 0) + value; appliedThisPart = true;
                } else if (descPart.includes('шанс крит. удара') || descPart.includes('крит. шанс') || descPart.includes('crit chance')) {
                    finalStats.critChance = (finalStats.critChance || 0) + value; appliedThisPart = true;
                } else if (descPart.includes('защита') || descPart.includes('defense')) { // Добавил 'defense' на всякий случай
                    finalStats.defense = (finalStats.defense || 0) + value; appliedThisPart = true;
                } else if (descPart.includes('удача') || descPart.includes('luck')) { // Добавил 'luck'
                    finalStats.luck = (finalStats.luck || 0) + value; appliedThisPart = true;
                } else if (descPart.includes('урон боссам') || descPart.includes('boss dmg')) { // Добавил 'boss dmg'
                    finalStats.bossDmg = (finalStats.bossDmg || 0) + value; appliedThisPart = true;
                } else if (descPart.includes('урон стихиями') || descPart.includes('elemental dmg percent')) { // Добавил 'elemental dmg percent'
                    finalStats.elementalDmgPercent = (finalStats.elementalDmgPercent || 0) + value; appliedThisPart = true;
                } else if (descPart.includes('макс. мана') || descPart.includes('мана') || descPart.includes('max mana')) { // Добавил 'max mana'
                    finalStats.maxMana = (finalStats.maxMana || 0) + value; appliedThisPart = true;
                } else if (descPart.includes('шанс уклонения') || descPart.includes('уклонение') || descPart.includes('evasion')) { // Добавил 'evasion'
                    finalStats.evasion = (finalStats.evasion || 0) + value; appliedThisPart = true;
                } else if (descPart.includes('скорость передвижения') || descPart.includes('move speed percent bonus')) { // Добавил 'move speed'
                    finalStats.moveSpeedPercentBonus = (finalStats.moveSpeedPercentBonus || 0) + value; appliedThisPart = true;
                } else if (descPart.includes('доп. снаряд') || descPart.includes('bonus projectiles')) { // Добавил 'bonus projectiles'
                    finalStats.bonusProjectiles = (finalStats.bonusProjectiles || 0) + (value !== 0 ? value : 1);
                    appliedThisPart = true;
                } else if (descPart.includes('powerlevel')) {
                    appliedThisPart = true; // Логика применения PowerLevel будет позже
                }

                if (!appliedThisPart) {
                    console.warn(`[WARN] Не удалось распознать бонус сета '${setDef.name}': ${bonus.description}`);
                }
            }
        });
    });
// ▲▲▲ КОНЕЦ ИЗМЕНЕННОЙ ЛОГИКИ ОБРАБОТКИ БОНУСОВ СЕТОВ ▲▲▲  
        finalStats.attack = (finalStats.attack || 0) * (1 + (finalStats.atkPercentBonus || 0) / 100);
        finalStats.attackSpeed = (finalStats.attackSpeed || DEFAULT_BASE_STATS.attackSpeed || 1.0) * (1 + totalDecimalAttackSpeedBonus);
        finalStats.speed = (finalStats.speed || DEFAULT_BASE_STATS.speed || 5) * (1 + (finalStats.moveSpeedPercentBonus || 0) / 100);

        let debuffLogMessages = [];
        let attackBeforeModification, hpBeforeModification;

        if (totalOtherDamageReductionPercent > 0 || totalOtherMaxHpReductionPercent > 0) {
            attackBeforeModification = finalStats.attack;
            hpBeforeModification = finalStats.hp;
            if (totalOtherDamageReductionPercent > 0) {
                finalStats.attack *= (1 - totalOtherDamageReductionPercent / 100);
                debuffLogMessages.push(`Attack reduced by ${totalOtherDamageReductionPercent}% (other debuff). (${attackBeforeModification.toFixed(1)} -> ${finalStats.attack.toFixed(1)})`);
            }
            if (totalOtherMaxHpReductionPercent > 0) {
                finalStats.hp *= (1 - totalOtherMaxHpReductionPercent / 100);
                debuffLogMessages.push(`HP reduced by ${totalOtherMaxHpReductionPercent}% (other debuff). (${hpBeforeModification.toFixed(1)} -> ${finalStats.hp.toFixed(1)})`);
            }
        }

        if (totalWeakenDamageReductionPercent > 0 || totalWeakenMaxHpReductionPercent > 0) {
            attackBeforeModification = finalStats.attack;
            hpBeforeModification = finalStats.hp;
            if (totalWeakenDamageReductionPercent > 0) {
                finalStats.attack *= (1 - totalWeakenDamageReductionPercent / 100);
                debuffLogMessages.push(`Attack reduced by ${totalWeakenDamageReductionPercent}% (weaken debuff). (${attackBeforeModification.toFixed(1)} -> ${finalStats.attack.toFixed(1)})`);
            }
            if (totalWeakenMaxHpReductionPercent > 0) {
                finalStats.hp *= (1 - totalWeakenMaxHpReductionPercent / 100);
                debuffLogMessages.push(`HP reduced by ${totalWeakenMaxHpReductionPercent}% (weaken debuff). (${hpBeforeModification.toFixed(1)} -> ${finalStats.hp.toFixed(1)})`);
            }
        }

        const auraIsActive = state.isAffectedByWeakeningAura;
        const auraStrengthPercent = 10;
        if (auraIsActive) {
            attackBeforeModification = finalStats.attack;
            hpBeforeModification = finalStats.hp;
            finalStats.attack *= (1 - auraStrengthPercent / 100);
            debuffLogMessages.push(`Attack reduced by ${auraStrengthPercent}% (aura). (${attackBeforeModification.toFixed(1)} -> ${finalStats.attack.toFixed(1)})`);
            finalStats.hp *= (1 - auraStrengthPercent / 100);
            debuffLogMessages.push(`HP reduced by ${auraStrengthPercent}% (aura). (${hpBeforeModification.toFixed(1)} -> ${finalStats.hp.toFixed(1)})`);
        }

        if (debuffLogMessages.length > 0) {
            // console.log("Debuffs/Aura Applied:", debuffLogMessages.join('; '));
        }

        finalStats.hp = Math.max(1, Math.round(finalStats.hp || 0));
        finalStats.attack = Math.max(0, Math.round(finalStats.attack || 0));
        finalStats.attackSpeed = parseFloat(Math.max(0.1, (finalStats.attackSpeed || 0)).toFixed(2));

        finalStats.critChance = Math.min(100, Math.max(0, parseFloat((finalStats.critChance || 0).toFixed(1))));
        finalStats.doubleStrikeChance = Math.min(100, Math.max(0, parseFloat((finalStats.doubleStrikeChance || 0).toFixed(1))));

        finalStats.speed = parseFloat(Math.max(0.1, (finalStats.speed || 0)).toFixed(2));
        finalStats.range = Math.max(1, Math.round(finalStats.range || 0));
        finalStats.skin = finalStats.skin || DEFAULT_BASE_STATS.skin;
        finalStats.defense = Math.max(0, Math.round(finalStats.defense || 0));
        finalStats.hpRegen = Math.max(0, parseFloat((finalStats.hpRegen || 0).toFixed(1)));
        finalStats.evasion = Math.min(90, Math.max(0, Math.round(finalStats.evasion || 0))); // evasion обычно целое число процентов
        finalStats.maxMana = Math.max(0, Math.round(finalStats.maxMana || 0));
        finalStats.elementalDmgPercent = Math.max(0, Math.round(finalStats.elementalDmgPercent || 0));
        finalStats.goldFind = Math.max(0, Math.round(finalStats.goldFind || 0));
        finalStats.luck = Math.max(0, Math.round(finalStats.luck || 0));
        finalStats.bossDmg = Math.max(0, Math.round(finalStats.bossDmg || 0));
        finalStats.shardFind = Math.max(0, Math.round(finalStats.shardFind || 0));
        finalStats.bonusProjectiles = Math.max(0, Math.round(finalStats.bonusProjectiles || 0));

        for (const key in finalStats) {
            if (finalStats.hasOwnProperty(key) && typeof finalStats[key] === 'number' && isNaN(finalStats[key])) {
                console.warn(`Computed stat ${key} was NaN. Resetting to default or 0.`);
                finalStats[key] = DEFAULT_BASE_STATS[key] === undefined ? 0 : DEFAULT_BASE_STATS[key];
            }
        }
        return finalStats;
    },
    isAnyRecipeCraftable: () => {
        const { inventory, gold, diamonds } = get();
        // import forgeRecipes from "../../data/forgeDatabase";

        // console.log('[isAnyRecipeCraftable] Checking. Gold:', gold, 'Diamonds:', diamonds, 'Inventory items:', inventory.length);

        // 1. Сначала считаем, сколько всего каждого типа предмета есть у игрока
        const playerInventoryCounts = {};
        inventory.forEach(item => {
            if (item?.id && item?.rarity) {
                const key = `${item.id}_${item.rarity}`;
                playerInventoryCounts[key] = (playerInventoryCounts[key] || 0) + (item.quantity || 1);
            } else if (item?.id) {
                playerInventoryCounts[item.id] = (playerInventoryCounts[item.id] || 0) + (item.quantity || 1);
            }
        });

        if (!forgeRecipes || forgeRecipes.length === 0) {
            // console.warn("[isAnyRecipeCraftable] forgeRecipes is empty or not loaded!");
            return false;
        }

        for (const recipe of forgeRecipes) {
            if (!recipe || !recipe.id || !recipe.inputItems || !recipe.cost) {
                // console.warn("[isAnyRecipeCraftable] Skipping invalid recipe:", recipe);
                continue;
            }

            // console.log(`[isAnyRecipeCraftable] Checking recipe ID: ${recipe.id}, Output: ${recipe.outputItemId}`);

            // ▼▼▼ ИЗМЕНЕНИЕ ЗДЕСЬ: Создаем временную копию счетчиков для КАЖДОГО рецепта ▼▼▼
            const tempAvailableItems = { ...playerInventoryCounts };
            let hasEnoughItems = true;
            // ▲▲▲--------------------------------------------------------------------▲▲▲

            if (recipe.inputItems.length === 0) {
                // console.log(`  Recipe ${recipe.id} requires no items.`);
            } else {
                for (const input of recipe.inputItems) {
                    if (!input || !input.itemId || typeof input.quantity !== 'number' || input.quantity <= 0) {
                        // console.warn(`  Recipe ${recipe.id} has invalid input item:`, input);
                        hasEnoughItems = false;
                        break;
                    }
                    const key = input.rarity ? `${input.itemId}_${input.rarity}` : input.itemId;

                    // ▼▼▼ ИЗМЕНЕНИЕ ЗДЕСЬ: Проверяем и "расходуем" из tempAvailableItems ▼▼▼
                    const neededQuantity = input.quantity;
                    if ((tempAvailableItems[key] || 0) >= neededQuantity) {
                        tempAvailableItems[key] -= neededQuantity; // "Расходуем" из временной копии
                        // console.log(`  Input: ${input.itemId} (Rarity: ${input.rarity || 'any'}), Needed: ${neededQuantity}, Available for this slot: YES. Remaining temp: ${tempAvailableItems[key]}`);
                    } else {
                        // console.log(`  Input: ${input.itemId} (Rarity: ${input.rarity || 'any'}), Needed: ${neededQuantity}, Available for this slot: NO. (Player total: ${playerInventoryCounts[key] || 0}, Temp has: ${tempAvailableItems[key] || 0})`);
                        hasEnoughItems = false;
                        break;
                    }
                    // ▲▲▲-----------------------------------------------------------------▲▲▲
                }
            }
            // console.log(`  For recipe ${recipe.id} - Has enough items: ${hasEnoughItems}`);

            if (!hasEnoughItems) {
                continue;
            }

            const recipeGoldCost = recipe.cost.gold || 0;
            const recipeDiamondCost = recipe.cost.diamonds || 0;
            const canAfford = gold >= recipeGoldCost && diamonds >= recipeDiamondCost;

            // console.log(`  For recipe ${recipe.id} - Can afford: ${canAfford} (Player Gold: ${gold}/${recipeGoldCost}, Player Diamonds: ${diamonds}/${recipeDiamondCost})`);

            if (canAfford) { // hasEnoughItems уже true на этом этапе
                // console.log(`  !!! CRAFTABLE RECIPE FOUND: ${recipe.id} !!!`);
                return true;
            }
        }

        // console.log("[isAnyRecipeCraftable] No craftable recipes found after checking all.");
        return false;
    },
    getAchievementXpNeededForNextLevel: () => getXpNeededForLevel(get().achievementLevel), // из КОД1, также в КОД2
    getCurrentLevelXpProgress: () => Math.max(0, get().achievementXp - (ACHIEVEMENT_LEVEL_XP_THRESHOLDS[get().achievementLevel] ?? 0)), // из КОД1, также в КОД2
    getXpNeededForCurrentLevelUp: () => { // из КОД1, также в КОД2
        const lvl = get().achievementLevel;
        const nextThreshold = getXpNeededForLevel(lvl);
        const currentThreshold = ACHIEVEMENT_LEVEL_XP_THRESHOLDS[lvl] ?? 0;
        return nextThreshold === Infinity ? Infinity : nextThreshold - currentThreshold;
    },

    // ================== Действия (Actions) - Объединенные и Дополненные ==================
    setUsername: (name) => set({ username: name }),
    setGold: (amount) => set({ gold: amount }),
    setDiamonds: (amount) => set({ diamonds: amount }),
    setTelegramPhotoUrl: (photoUrl) => set({ userPhotoUrl: photoUrl || null }),
    setPlayerRace: (raceId) => get().initializeCharacterStats(raceId),
    initializeCharacterStats: (raceId) => {
        const raceData = getRaceDataById(raceId);
        const initialStats = raceData ? raceData.initialStats : DEFAULT_BASE_STATS;
        set({
            playerBaseStats: { ...initialStats },
            playerHp: initialStats.hp,
            playerRace: raceId,
        });
        get().updatePowerLevel();
        get().initializeLevelHp();
    },
    playerTakeDamage: (damageAmount) => {
        set((state) => {
            const newHp = Math.max(0, state.playerHp - damageAmount);
            return { playerHp: newHp };
        });
        if (get().playerHp <= 0) {
            console.log("Игрок погиб!");
            // TODO: Handle player death
        }
    },
    initializeLevelHp: () => {
        const maxHp = get().computedStats().hp;
        set({ playerHp: maxHp });
    },
    healPlayer: (amount) => {
        set((state) => {
            const maxHp = get().computedStats().hp;
            const newHp = Math.min(maxHp, state.playerHp + amount);
            return { playerHp: newHp };
        });
    },
 addGold: (amount, isSpending = false) => {
        if (amount === 0) return;
        set((state) => {
            const newGold = state.gold + amount; // amount может быть отрицательным при трате
            let newTotalCollected = state.totalGoldCollected;
            let newTotalSpent = state.totalGoldSpent;

            if (amount > 0 && !isSpending) { // Зарабатываем
                newTotalCollected += amount;
            } else if (amount < 0 || (amount > 0 && isSpending)) { // Тратим (amount здесь должен быть положительным числом, но вычитаться из баланса)
                // Если amount приходит отрицательным для трат, то -amount будет положительным
                newTotalSpent += (amount < 0 ? -amount : amount);
            }
            return {
                gold: newGold,
                totalGoldCollected: newTotalCollected,
                totalGoldSpent: newTotalSpent,
            };
        });
        get().checkAllAchievements();
        if (amount > 0 && !isSpending) get().trackTaskEvent('earn_gold', amount);
        // Событие для траты золота для задач можно добавить тут же, если нужно
    },
    addDiamonds: (amount, isSpending = false) => {
        if (amount === 0) return;
        set((state) => {
            const newDiamonds = state.diamonds + amount;
            let newTotalSpent = state.totalDiamondsSpent;
            // Предполагаем, что нет общего счетчика заработанных алмазов, только траты
            if (amount < 0 || (amount > 0 && isSpending)) {
                 newTotalSpent += (amount < 0 ? -amount : amount);
            }
            return { 
                diamonds: newDiamonds,
                totalDiamondsSpent: newTotalSpent
            };
        });
        get().checkAllAchievements();
         if (amount > 0 && !isSpending) get().trackTaskEvent('earn_diamonds', amount);
    },
    addToncoinShards: (amount, isSpending = false) => { // Добавил isSpending, хотя для осколков он может не использоваться так часто
        if (amount <= 0 && !isSpending) return; // Не добавляем 0 или отрицательное количество, если это не трата
        if (amount === 0 && isSpending) return;

        set((state) => {
            let newToncoinShards = state.toncoinShards;
            let newTotalEarned = state.totalTonShardsEarned;

            if (!isSpending) { // Зарабатываем
                newToncoinShards = (state.toncoinShards || 0) + amount;
                newTotalEarned = (state.totalTonShardsEarned || 0) + amount;
            } else { // Тратим (amount должен быть положительным)
                if (state.toncoinShards < amount) {
                    console.warn("Not enough TON shards to spend");
                    return {}; // Не меняем состояние
                }
                newToncoinShards = state.toncoinShards - amount;
                // Трата осколков не уменьшает totalTonShardsEarned
            }
            return { 
                toncoinShards: newToncoinShards,
                totalTonShardsEarned: newTotalEarned
            };
        });
        if (!isSpending && amount > 0) get().trackTaskEvent('earn_toncoin_shards', amount);
        get().checkAllAchievements(); // Проверяем после изменения баланса или заработка
    },
    spendToncoinShards: (amount) => { // из КОД2
        if (amount <= 0) return false;
        const currentShards = get().toncoinShards || 0;
        if (currentShards < amount) {
            console.warn(`[Currency] Not enough TON Shards to spend. Has: ${currentShards}, Tried to spend: ${amount}`);
            return false;
        }
        set((state) => {
            const newAmount = state.toncoinShards - amount;
            console.log(`[Currency] Spent ${amount} TON Shards. Remaining: ${newAmount}`);
            return { toncoinShards: newAmount };
        });
        return true;
    },
    exchangeShardsToTon: (shardsToSpend) => { // из КОД2
        const currentShards = get().toncoinShards;
        if (typeof shardsToSpend !== 'number' || shardsToSpend <= 0) {
            console.warn("[Exchange] Invalid amount of shards to spend:", shardsToSpend);
            return { success: false, message: "Неверное количество осколков." };
        }
        if (currentShards < shardsToSpend) {
            console.warn(`[Exchange] Not enough TON Shards. Has: ${currentShards}, Tried to spend: ${shardsToSpend}`);
            return { success: false, message: "Недостаточно осколков для обмена." };
        }
        if (TON_SHARD_TO_TON_EXCHANGE_RATE <= 0) {
            console.error("[Exchange] Invalid exchange rate configured.");
            return { success: false, message: "Ошибка конфигурации курса обмена." };
        }
        const tonToReceive = shardsToSpend / TON_SHARD_TO_TON_EXCHANGE_RATE;
        set((state) => ({
            toncoinShards: state.toncoinShards - shardsToSpend,
            toncoinBalance: (state.toncoinBalance || 0) + tonToReceive,
        }));
        console.log(`[Exchange] Exchanged ${shardsToSpend} shards for ${tonToReceive} TON. New shard balance: ${get().toncoinShards}, New TON balance: ${get().toncoinBalance}`);
        return { success: true, message: `Обмен успешно совершен! Вы получили ${tonToReceive.toFixed(4)} TON.` };
    },
    requestToncoinWithdrawal: async (amountToWithdraw, address) => { // из КОД2
        const currentTonBalance = get().toncoinBalance;
        if (typeof amountToWithdraw !== 'number' || amountToWithdraw <= 0) {
            console.warn("[Withdrawal] Invalid amount to withdraw:", amountToWithdraw);
            return { success: false, message: "Неверная сумма для вывода." };
        }
        if (!address || typeof address !== 'string' || address.trim().length < 10) {
            console.warn("[Withdrawal] Invalid address:", address);
            return { success: false, message: "Неверный адрес для вывода." };
        }
        if (currentTonBalance < amountToWithdraw) {
            console.warn(`[Withdrawal] Not enough TON. Has: ${currentTonBalance}, Tried to withdraw: ${amountToWithdraw}`);
            return { success: false, message: "Недостаточно TON для вывода." };
        }
        await new Promise(resolve => setTimeout(resolve, 1500)); 
        set((state) => ({
            toncoinBalance: state.toncoinBalance - amountToWithdraw,
            totalTonWithdrawn: (state.totalTonWithdrawn || 0) + amountToWithdraw, // <<< ОБНОВЛЯЕМ СЧЕТЧИК
        }));
        console.log(`[Withdrawal SIMULATION] Requested withdrawal of ${amountToWithdraw} TON. New TON balance: ${get().toncoinBalance}. Total withdrawn: ${get().totalTonWithdrawn}`);
        get().checkAllAchievements();
        return { success: true, message: `Запрос на вывод ${amountToWithdraw.toFixed(4)} TON ... успешно отправлен (имитация).` };
    },
    incrementKills: (count = 1) => { // из КОД2, trackTaskEvent уже есть в addGold/Diamonds/Shards
        set((state) => ({ totalKills: state.totalKills + count }));
        get().trackTaskEvent('kill_monster', count); // Universal task event tracker from code1
        get().checkAllAchievements();
    },
    refillEnergyOnLoad: () => { // из КОД2
        set((state) => {
            const now = Date.now();
            const { energyCurrent, energyMax, lastEnergyRefillTimestamp } = state;
            if (energyCurrent >= energyMax) {
                return { lastEnergyRefillTimestamp: now };
            }
            const elapsedMs = now - (lastEnergyRefillTimestamp || now);
            if (elapsedMs <= 0) return {};
            const refillIntervalsPassed = Math.floor(elapsedMs / ENERGY_REFILL_INTERVAL_MS);
            if (refillIntervalsPassed <= 0) return {};
            const energyToAdd = refillIntervalsPassed;
            const newEnergy = Math.min(energyMax, energyCurrent + energyToAdd);
            const timeConsumedByRefillMs = (newEnergy - energyCurrent) * ENERGY_REFILL_INTERVAL_MS;
            const newTimestamp = (lastEnergyRefillTimestamp || (now - elapsedMs)) + timeConsumedByRefillMs;
            if (newEnergy === energyCurrent) return {};
            return {
                energyCurrent: newEnergy,
                lastEnergyRefillTimestamp: newTimestamp,
            };
        });
    },
    consumeEnergy: (cost) => { // из КОД2
        if (cost <= 0) return false;
        let success = false;
        set((state) => {
            const { energyCurrent, energyMax, lastEnergyRefillTimestamp } = state;
            if (energyCurrent < cost) {
                console.warn(`Consume Energy: Недостаточно энергии. Нужно: ${cost}, есть: ${energyCurrent}`);
                success = false;
                return {};
            }
            const wasFull = energyCurrent >= energyMax;
            const newEnergy = energyCurrent - cost;
            const newTimestamp = wasFull ? Date.now() : lastEnergyRefillTimestamp;
            success = true;
            return {
                energyCurrent: newEnergy,
                lastEnergyRefillTimestamp: newTimestamp,
            };
        });
        return success;
    },
    addEnergy: (amount) => { // из КОД2
        if (amount <= 0) return;
        set((state) => {
            const newEnergy = Math.min(state.energyMax, state.energyCurrent + amount);
            return { energyCurrent: newEnergy };
        });
    },
    setEquipped: (payload) => set({ equipped: payload }),

    addItemToInventory: (itemId, quantity = 1) => {
        const baseItem = getItemById(itemId);
        if (baseItem) {
            const newItems = Array.from({ length: quantity }).map(() => createItemInstance(baseItem));
            // createItemInstance уже добавляет isNew: true и receivedTimestamp
            set((state) => ({ inventory: [...state.inventory, ...newItems] }));
            get().checkAllAchievements();
            get().trackTaskEvent('collect_item', quantity, { itemId, rarity: baseItem.rarity, type: baseItem.type });
        } else {
            console.warn(`Предмет ${itemId} не найден в базе данных!`);
        }
    },

    // Действие для пометки одного предмета как просмотренного (можно оставить, если нужно)
    markItemAsSeen: (itemUid) => {
        set((state) => {
            let inventoryChanged = false;
            const newInventory = state.inventory.map(item => {
                if (item.uid === itemUid && item.isNew) {
                    inventoryChanged = true;
                    return { ...item, isNew: false };
                }
                return item;
            });

            let equippedChanged = false;
            const newEquipped = { ...state.equipped };
            for (const slot in newEquipped) {
                if (newEquipped[slot] && newEquipped[slot].uid === itemUid && newEquipped[slot].isNew) {
                    equippedChanged = true;
                    newEquipped[slot] = { ...newEquipped[slot], isNew: false };
                }
            }

            if (inventoryChanged || equippedChanged) {
                const changes = {};
                if (inventoryChanged) changes.inventory = newInventory;
                if (equippedChanged) changes.equipped = newEquipped;
                return changes;
            }
            return {};
        });
    },

    // ▼▼▼ НОВОЕ ДЕЙСТВИЕ ДЛЯ СБРОСА ВСЕХ МЕТОК "NEW" ▼▼▼
    markAllDisplayedNewItemsAsOld: () => {
        set((state) => {
            let inventoryNeedsUpdate = false;
            const updatedInventory = state.inventory.map(item => {
                if (item.isNew) {
                    inventoryNeedsUpdate = true;
                    // Важно сохранить остальные свойства предмета
                    return { ...item, isNew: false };
                }
                return item;
            });

            let equippedNeedsUpdate = false;
            const updatedEquipped = { ...state.equipped };
            for (const slot in updatedEquipped) {
                if (updatedEquipped[slot] && updatedEquipped[slot].isNew) {
                    equippedNeedsUpdate = true;
                    updatedEquipped[slot] = { ...updatedEquipped[slot], isNew: false };
                }
            }

            if (inventoryNeedsUpdate || equippedNeedsUpdate) {
                // console.log('[Store] Marking all displayed new items as old.');
                const changes = {};
                if (inventoryNeedsUpdate) changes.inventory = updatedInventory;
                if (equippedNeedsUpdate) changes.equipped = updatedEquipped;
                return changes;
            }
            return {}; // Нет изменений
        });
    },
    // ▲▲▲ КОНЕЦ НОВОГО ДЕЙСТВИЯ ▲▲▲
    removeItemFromInventory: (uid) => {
        set((state) => ({
            inventory: state.inventory.filter(item => item.uid !== uid)
        }));
    },
    equipItem: (itemToEquip) => {
        if (!itemToEquip?.type || !itemToEquip.uid) {
            console.warn("equipItem: itemToEquip невалиден", itemToEquip);
            return;
        }
        const slot = itemToEquip.type;

        // Гарантируем, что у экипируемого предмета есть корректный уровень
        const itemInstanceForSlot = {
            ...itemToEquip,
            level: (itemToEquip.level && typeof itemToEquip.level === 'number' && itemToEquip.level > 0)
                ? itemToEquip.level
                : 1, // По умолчанию уровень 1, если он отсутствует или некорректен
        };

        set((state) => {
            const currentEquippedItem = state.equipped[slot];
            let updatedInventory = state.inventory.filter((i) => i.uid !== itemInstanceForSlot.uid);
            if (currentEquippedItem) {
                // Важно: убедимся, что и снимаемый предмет имеет корректный уровень перед возвратом в инвентарь
                const ensuredCurrentEquippedItem = {
                    ...currentEquippedItem,
                    level: (currentEquippedItem.level && typeof currentEquippedItem.level === 'number' && currentEquippedItem.level > 0)
                        ? currentEquippedItem.level
                        : 1,
                };
                updatedInventory.push(ensuredCurrentEquippedItem);
            }
            let flagUpdate = {};
            if (itemInstanceForSlot.rarity && itemInstanceForSlot.rarity.toLowerCase() === 'epic' && !state.booleanFlags.equippedEpic) {
                flagUpdate = { booleanFlags: { ...state.booleanFlags, equippedEpic: true } };
            }
            return {
                equipped: { ...state.equipped, [slot]: itemInstanceForSlot }, // Экипируем экземпляр с гарантированным уровнем
                inventory: updatedInventory,
                ...flagUpdate
            };
        });
        get().updatePowerLevel();
        get().initializeLevelHp();
    },
    unequipItem: (slot) => {
        set((state) => {
            const itemToUnequip = state.equipped[slot];
            if (!itemToUnequip) return {};
            return {
                equipped: { ...state.equipped, [slot]: null },
                inventory: [...state.inventory, itemToUnequip],
            };
        });
        get().updatePowerLevel();
        get().initializeLevelHp();
    },
executeForgeRecipe: (recipe) => {
        if (!recipe?.inputItems || !recipe.outputItemId || !recipe.cost) {
            console.error("Forge Error: Invalid recipe data received.", recipe);
            return false;
        }

        const state = get(); // Получаем текущее состояние для проверок

        // Проверка наличия достаточного количества валюты
        if (state.gold < (recipe.cost.gold || 0)) { // Добавил || 0 на случай отсутствия ключа
            console.warn(`Forge Warning: Insufficient gold. Needed: ${recipe.cost.gold || 0}, Have: ${state.gold}`);
            return false;
        }
        if (state.diamonds < (recipe.cost.diamonds || 0)) {
            console.warn(`Forge Warning: Insufficient diamonds. Needed: ${recipe.cost.diamonds || 0}, Have: ${state.diamonds}`);
            return false;
        }

        // Проверка наличия достаточного количества предметов для крафта
        const itemsToRemoveUids = new Set();
        let tempInventory = [...state.inventory]; // Создаем копию для безопасного поиска
        for (const input of recipe.inputItems) {
            let foundCount = 0;
            for (let i = 0; i < input.quantity; i++) {
                // Ищем предмет в временной копии инвентаря, чтобы не удалить один и тот же UID дважды, если он нужен в >1 экземпляре
                const itemIndex = tempInventory.findIndex(invItem =>
                    invItem.id === input.itemId &&
                    (input.rarity ? invItem.rarity === input.rarity : true) &&
                    !itemsToRemoveUids.has(invItem.uid) // Убеждаемся, что этот UID еще не выбран для удаления
                );
                if (itemIndex !== -1) {
                    itemsToRemoveUids.add(tempInventory[itemIndex].uid); 
                    // Важно: для корректного поиска следующего такого же предмета,
                    // можно либо удалять из tempInventory, либо помечать как использованный.
                    // Простой способ - удалить, чтобы findIndex не нашел его снова.
                    // Но это может быть неэффективно. Set itemsToRemoveUids должен справиться.
                    foundCount++;
                } else {
                    console.error(`Forge Error: Insufficient items for input: ${input.itemId} (rarity: ${input.rarity || 'any'}), needed ${input.quantity}, found ${foundCount} after considering already marked for removal.`);
                    return false;
                }
            }
        }

        // VVV ИЗМЕНЕНИЕ: Сначала списываем валюту через обновленные экшены VVV
        if (recipe.cost.gold && recipe.cost.gold > 0) {
            get().addGold(-recipe.cost.gold, true); // true означает трату
        }
        if (recipe.cost.diamonds && recipe.cost.diamonds > 0) {
            get().addDiamonds(-recipe.cost.diamonds, true); // true означает трату
        }
        // ^^^ КОНЕЦ ИЗМЕНЕНИЯ ^^^

        const outputItemBaseData = getItemById(recipe.outputItemId);
        if (!outputItemBaseData) {
            console.error(`Forge Error: Output item base data not found for ID: ${recipe.outputItemId}`);
            // ВАЖНО: Если мы уже списали валюту, нужно ее вернуть!
            if (recipe.cost.gold && recipe.cost.gold > 0) get().addGold(recipe.cost.gold);
            if (recipe.cost.diamonds && recipe.cost.diamonds > 0) get().addDiamonds(recipe.cost.diamonds);
            return false;
        }
        const forgedItem = createItemInstance(outputItemBaseData);
        if (!forgedItem) {
            console.error(`Forge Error: Could not create instance for output item ID: ${recipe.outputItemId}`);
            // ВАЖНО: Возвращаем валюту
            if (recipe.cost.gold && recipe.cost.gold > 0) get().addGold(recipe.cost.gold);
            if (recipe.cost.diamonds && recipe.cost.diamonds > 0) get().addDiamonds(recipe.cost.diamonds);
            return false;
        }

        const currentForgeFlag = state.booleanFlags.hasForgedOrUpgraded;
        let flagUpdate = !currentForgeFlag ? { booleanFlags: { ...state.booleanFlags, hasForgedOrUpgraded: true } } : {};

        set((prevState) => {
            const newInventory = prevState.inventory.filter(item => !itemsToRemoveUids.has(item.uid));
            newInventory.push(forgedItem);
            // VVV ИЗМЕНЕНИЕ: Больше не вычитаем золото/алмазы здесь напрямую VVV
            return {
                inventory: newInventory,
                // gold: prevState.gold - recipe.cost.gold, // УДАЛЕНО
                // diamonds: prevState.diamonds - recipe.cost.diamonds, // УДАЛЕНО
                ...flagUpdate
            };
            // ^^^ КОНЕЦ ИЗМЕНЕНИЯ ^^^
        });

        get().trackTaskEvent('forge_item', 1); 
        get().checkAllAchievements(); // Проверяем ачивки после траты и возможного изменения флага

        console.log(`Предмет "${forgedItem.name}" успешно создан по рецепту ID: ${recipe.id}.`);
        return true;
    },
purchaseShopItem: (dealId) => {
        const state = get(); // Получаем текущее состояние для проверок
        const deal = state.dailyDeals.find(d => d.id === dealId);

        if (!deal) {
            console.error("Сделка не найдена в текущих dailyDeals:", dealId);
            return false;
        }
        if (state.dailyShopPurchases[dealId]) {
            console.warn("Товар уже куплен:", dealId);
            return false;
        }

        const currency = deal.currency; // 'gold' или 'diamonds'
        const price = deal.price;

        // Проверка наличия достаточного количества валюты
        if (state[currency] < price) {
            alert(`Недостаточно ${currency}! Нужно: ${price}, есть: ${state[currency]}`);
            return false;
        }

        // VVV ИЗМЕНЕНИЕ: Сначала списываем валюту через обновленные экшены VVV
        if (price > 0) { // Убедимся, что есть что списывать
            if (currency === 'gold') {
                get().addGold(-price, true); // Второй аргумент true означает трату
            } else if (currency === 'diamonds') {
                get().addDiamonds(-price, true); // Второй аргумент true означает трату
            } else {
                // Обработка других валют, если они будут и для них нужен трекинг трат
                console.warn(`[purchaseShopItem] Попытка потратить неизвестную или не отслеживаемую для достижений валюту: ${currency}`);
                // Если другие валюты должны просто вычитаться, можно оставить старую логику для них,
                // но для золота и алмазов теперь используется addGold/addDiamonds.
                // Пока что, если валюта не золото и не алмазы, она не будет списана этим блоком.
                // Если это ошибка, нужно либо добавить обработку, либо вернуть false.
                // Для безопасности, если валюта не gold/diamonds и цена > 0, вернем ошибку.
                // Но если цена 0, то все ок.
                // Однако, если валюта не gold/diamonds, проверка state[currency] < price уже была.
                // Значит, если мы здесь, и это не gold/diamonds, то это нештатная ситуация, если цена > 0.
                // Для простоты, предположим, что магазин продает только за золото/алмазы или бесплатно.
                // Если будет другая платная валюта, нужно будет добавить ее обработку.
                // Пока что, если дошли сюда с неизвестной платной валютой, ничего не делаем с балансом.
                // Но это значит, что предыдущая проверка state[currency] < price могла быть неполной.
                // Безопаснее всего вернуть ошибку, если валюта не распознана и цена > 0
                console.error(`[purchaseShopItem] Неизвестный тип платной валюты для списания: ${currency}`);
                return false; // Прерываем покупку, если валюта не золото/алмазы, а цена есть
            }
        }
        // ^^^ КОНЕЦ ИЗМЕНЕНИЯ ^^^

        // Выдача товара/осколков
        if (deal.type === 'item') {
            get().addItemToInventory(deal.itemId, deal.quantity || 1);
        } else if (deal.type === 'artifact_shard') {
            get().addArtifactShards(deal.itemId, deal.quantity || 1);
        }
        // Добавь обработку других типов товаров, если они есть

        const currentShopFlag = state.booleanFlags.hasMadeShopPurchase;
        let flagUpdate = !currentShopFlag ? { booleanFlags: { ...state.booleanFlags, hasMadeShopPurchase: true } } : {};

        // VVV ИЗМЕНЕНИЕ: Больше не вычитаем валюту здесь напрямую VVV
        set((prevState) => ({
            // [currency]: prevState[currency] - price, // УДАЛЕНО
            dailyShopPurchases: { ...prevState.dailyShopPurchases, [dealId]: true },
            ...flagUpdate
        }));
        // ^^^ КОНЕЦ ИЗМЕНЕНИЯ ^^^

        // get().trackTaskEvent('purchase_item', 1); // Если есть такая задача
        get().checkAllAchievements(); // Проверяем ачивки после траты валюты и возможного изменения флага

        console.log(`Товар "${deal.name}" (ID: ${dealId}) успешно куплен за ${price} ${currency}.`);
        return true;
    },
    setBooleanFlag: (flagName, value = true) => {
        if (get().booleanFlags[flagName] !== value) {
            set((state) => ({
                booleanFlags: { ...state.booleanFlags, [flagName]: value }
            }));
            get().checkAllAchievements();
        }
    },
    completeLevelAction: (chapterId, levelId, difficulty, chapterContextData) => { // из КОД2, добавлен trackTaskEvent
        const levelKey = `c${chapterId}_l${levelId}`;
        const currentCompletion = get().levelsCompleted[levelKey] || { normal: false, hard: false };
        let difficultyKey = difficulty?.toLowerCase() === 'hard' ? 'hard' : 'normal';
        let newLevelsCompleted = get().levelsCompleted;
        let needsUpdate = false;

        if (difficultyKey === 'normal' && !currentCompletion.normal) {
            newLevelsCompleted = {
                ...newLevelsCompleted,
                [levelKey]: { ...currentCompletion, normal: true }
            };
            needsUpdate = true;
        } else if (difficultyKey === 'hard' && !currentCompletion.hard) {
            newLevelsCompleted = {
                ...newLevelsCompleted,
                [levelKey]: { ...currentCompletion, normal: true, hard: true }
            };
            needsUpdate = true;
        }

        if (needsUpdate) {
            set({ levelsCompleted: newLevelsCompleted });
            get().trackTaskEvent('complete_level', 1);
            get().checkAllAchievements();
            if (chapterContextData?.isZoneBossChapter && chapterContextData?.currentZoneIdForThisChapter) {
                const levelsForThisChapter = chapterContextData.levels || [];
                if (get().isChapterCompleted(chapterId, levelsForThisChapter)) {
                    get().completeZone(chapterContextData.currentZoneIdForThisChapter);
                }
            }
        }
    },

    claimAchievementReward: (achievementId, levelToClaim) => {
        const state = get();
        const achLineDefinition = achievementsData.find(a => a.id === achievementId);

        if (!achLineDefinition) {
            console.warn(`[Achievements] Определение ветки достижений не найдено: ${achievementId}`);
            return { success: false, message: "Достижение не найдено." };
        }

        const currentAchievementStatus = state.achievementsStatus[achievementId];
        if (!currentAchievementStatus) {
            console.warn(`[Achievements] Статус для ветки достижений не найден: ${achievementId}`);
            // Этого не должно происходить, если achievementsStatus правильно инициализируется
            return { success: false, message: "Статус достижения не найден." };
        }

        const levelDataToClaim = achLineDefinition.levels.find(l => l.level === levelToClaim);
        if (!levelDataToClaim) {
            console.warn(`[Achievements] Данные для уровня ${levelToClaim} не найдены в ветке: ${achievementId}`);
            return { success: false, message: "Уровень достижения не найден." };
        }

        // Проверки:
        // 1. Достигнут ли этот уровень (highestReachedLevel >= levelToClaim)
        // 2. Не была ли уже получена награда за этот уровень (levelToClaim > claimedRewardsUpToLevel)
        if (levelToClaim > currentAchievementStatus.highestReachedLevel) {
            console.warn(`[Achievements] Попытка получить награду за недостигнутый уровень: ${achievementId}, уровень ${levelToClaim}. Достигнут: ${currentAchievementStatus.highestReachedLevel}`);
            return { success: false, message: "Уровень еще не достигнут." };
        }
        if (levelToClaim <= currentAchievementStatus.claimedRewardsUpToLevel) {
            console.warn(`[Achievements] Попытка повторно получить награду: ${achievementId}, уровень ${levelToClaim}. Уже получено до: ${currentAchievementStatus.claimedRewardsUpToLevel}`);
            return { success: false, message: "Награда за этот или более низкий уровень уже получена." };
        }
        // 3. Дополнительная проверка: если мы хотим забрать награду за уровень > (claimedRewardsUpToLevel + 1),
        //    это означает, что предыдущие уровни не были забраны. Обычно UI должен заставлять забирать по порядку.
        //    Если это не так, можно добавить предупреждение или разрешить забирать только следующий по порядку.
        //    Пока разрешим забирать любой доступный, но не полученный уровень.

        console.log(`[Achievements] Получение награды за "${achLineDefinition.name}" - Уровень ${levelToClaim}`);

        // Выдача наград за конкретный уровень достижения
        let awardedItemsForPopup = []; // Для отображения в попапе, если потребуется
        if (levelDataToClaim.reward) {
            const reward = levelDataToClaim.reward;
            if (reward.gold) {
                get().addGold(reward.gold);
                awardedItemsForPopup.push({ type: 'gold', amount: reward.gold, icon: '💰' });
            }
            if (reward.diamonds) {
                get().addDiamonds(reward.diamonds);
                awardedItemsForPopup.push({ type: 'diamonds', amount: reward.diamonds, icon: '💎' });
            }
            if (reward.toncoinShards) {
                get().addToncoinShards(reward.toncoinShards);
                awardedItemsForPopup.push({ type: 'toncoin_shards', amount: reward.toncoinShards, icon: '💠' });
            }
            if (reward.rareChestKeys) {
                get().addKeys(REWARD_TYPES.RARE_CHEST_KEY, reward.rareChestKeys);
                awardedItemsForPopup.push({ type: REWARD_TYPES.RARE_CHEST_KEY, amount: reward.rareChestKeys, name: 'Редкий ключ', icon: '🔑' });
            }
            if (reward.epicChestKeys) {
                get().addKeys(REWARD_TYPES.EPIC_CHEST_KEY, reward.epicChestKeys);
                awardedItemsForPopup.push({ type: REWARD_TYPES.EPIC_CHEST_KEY, amount: reward.epicChestKeys, name: 'Эпический ключ', icon: '🗝️' });
            }
            // TODO: Обработка награды 'items', если она будет в достижениях
            // if (reward.items && Array.isArray(reward.items)) {
            //     reward.items.forEach(itemReward => {
            //         get().addItemToInventory(itemReward.itemId, itemReward.quantity || 1);
            //         const itemBase = getItemById(itemReward.itemId);
            //         if(itemBase) awardedItemsForPopup.push({ type: 'item', id: itemBase.id, name: itemBase.name, icon: itemBase.image, amount: itemReward.quantity || 1 });
            //     });
            // }
        }

        // Начисление глобального опыта достижений
        let globalLevelUpDetails = null;
        if (levelDataToClaim.xpGain > 0) {
            let currentGlobalXp = state.achievementXp + levelDataToClaim.xpGain;
            let currentGlobalLevel = state.achievementLevel;
            let xpNeededForNextGlobalLevel = getXpNeededForLevel(currentGlobalLevel);
            let globalLevelUpOccurredThisClaim = false;
            let globalRewardsThisClaim = [];

            while (currentGlobalXp >= xpNeededForNextGlobalLevel && xpNeededForNextGlobalLevel !== Infinity) {
                globalLevelUpOccurredThisClaim = true;
                currentGlobalLevel++;
                const globalLevelRewardConfig = ACHIEVEMENT_LEVEL_REWARDS[currentGlobalLevel];
                if (globalLevelRewardConfig) {
                    console.log(`[Achievements] Глобальный Уровень Достижений повышен до ${currentGlobalLevel}! Награда:`, globalLevelRewardConfig);
                    if (globalLevelRewardConfig.gold) {
                         get().addGold(globalLevelRewardConfig.gold);
                         globalRewardsThisClaim.push({type: 'gold', amount: globalLevelRewardConfig.gold});
                    }
                    if (globalLevelRewardConfig.diamonds) {
                        get().addDiamonds(globalLevelRewardConfig.diamonds);
                        globalRewardsThisClaim.push({type: 'diamonds', amount: globalLevelRewardConfig.diamonds});
                    }
                    if (globalLevelRewardConfig.rareChestKeys) {
                        get().addKeys(REWARD_TYPES.RARE_CHEST_KEY, globalLevelRewardConfig.rareChestKeys);
                         globalRewardsThisClaim.push({type: REWARD_TYPES.RARE_CHEST_KEY, amount: globalLevelRewardConfig.rareChestKeys, name: 'Редкий ключ'});
                    }
                    if (globalLevelRewardConfig.epicChestKeys) {
                        get().addKeys(REWARD_TYPES.EPIC_CHEST_KEY, globalLevelRewardConfig.epicChestKeys);
                         globalRewardsThisClaim.push({type: REWARD_TYPES.EPIC_CHEST_KEY, amount: globalLevelRewardConfig.epicChestKeys, name: 'Эпический ключ'});
                    }
                     if (globalLevelRewardConfig.toncoinShards) {
                        get().addToncoinShards(globalLevelRewardConfig.toncoinShards);
                         globalRewardsThisClaim.push({type: 'toncoin_shards', amount: globalLevelRewardConfig.toncoinShards });
                    }
                }
                xpNeededForNextGlobalLevel = getXpNeededForLevel(currentGlobalLevel);
            }
            set({ 
                achievementXp: currentGlobalXp,
                ...(globalLevelUpOccurredThisClaim && { achievementLevel: currentGlobalLevel })
            });
            if(globalLevelUpOccurredThisClaim){
                globalLevelUpDetails = { newLevel: currentGlobalLevel, rewards: globalRewardsThisClaim };
            }
        }
        
        // Обновляем статус конкретного достижения: какой уровень награды получен
        set(prevState => ({
            achievementsStatus: {
                ...prevState.achievementsStatus,
                [achievementId]: {
                    ...prevState.achievementsStatus[achievementId], // Сохраняем highestReachedLevel и currentValue
                    claimedRewardsUpToLevel: levelToClaim
                }
            }
        }));

        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        
        // Возвращаем информацию о полученных наградах для возможного отображения в UI
        return { 
            success: true, 
            message: `Награда за "${achLineDefinition.name} (Ур. ${levelToClaim})" получена!`,
            claimedRewardDetails: awardedItemsForPopup,
            globalLevelUpInfo: globalLevelUpDetails
        };
    },

    setHasClaimableRewardsIndicator: (hasRewards) => {
        // Необязательная проверка, чтобы избежать лишних обновлений, если значение не изменилось
        if (get().hasClaimableRewardsIndicator !== hasRewards) {
            set({ hasClaimableRewardsIndicator: hasRewards });
        }
    },

    checkAllAchievements: () => {
        const state = get();
        let changedInStatus = false;
        // Создаем глубокую копию, чтобы избежать прямых мутаций состояния до вызова set
        const newStatuses = JSON.parse(JSON.stringify(state.achievementsStatus || {}));

        // --- Вспомогательные функции для вычисляемых статов ---
        const getEquippedRarityCount = (rarity) => {
            if (!state.equipped) return 0;
            return Object.values(state.equipped).filter(item => item && item.rarity === rarity).length;
        };

        const getCompletedArtifactSetCount = () => {
            let count = 0;
            if (!ARTIFACT_SETS || !state.collectedArtifacts || !state.artifactLevels) return 0;
            
            ARTIFACT_SETS.forEach(setDef => {
                if (!setDef.artifacts || setDef.artifacts.length === 0) return;
                
                let artifactsInSetOwnedAndActive = 0;
                setDef.artifacts.forEach(artifactInSetDef => {
                    if (state.collectedArtifacts.has(artifactInSetDef.id) && 
                        state.artifactLevels[artifactInSetDef.id] &&
                        state.artifactLevels[artifactInSetDef.id].level > 0) {
                        artifactsInSetOwnedAndActive++;
                    }
                });
                // Сет считается собранным, если все артефакты из его определения есть у игрока и активны
                if (artifactsInSetOwnedAndActive >= setDef.artifacts.length) {
                    count++;
                }
            });
            return count;
        };
        
        const getUniqueLevelsCompletedCount = (difficultyKey) => { // 'normal' или 'hard'
            let count = 0;
            if (!state.levelsCompleted) return 0;
            // Считаем уникальные ключи уровней (например, "c1_l1"), для которых выполнено условие сложности
            const uniqueCompleted = new Set();
            for (const levelKey in state.levelsCompleted) {
                const completionData = state.levelsCompleted[levelKey];
                if (completionData && completionData[difficultyKey]) { // difficultyKey будет 'normal' или 'hard'
                    uniqueCompleted.add(levelKey); // Добавляем сам ключ уровня "c1_l1"
                }
            }
            return uniqueCompleted.size;
        };
        // --- Конец вспомогательных функций ---

        if (!achievementsData || !Array.isArray(achievementsData)) {
            console.warn("[Achievements] achievementsData is not loaded or not an array.");
            return;
        }

        achievementsData.forEach(achLine => {
            if (!achLine || !achLine.id || !Array.isArray(achLine.levels)) {
                console.warn("[Achievements] Invalid achievement line definition:", achLine);
                return; // Пропускаем некорректное определение
            }

            const status = newStatuses[achLine.id] || { highestReachedLevel: 0, claimedRewardsUpToLevel: 0, currentValue: 0 };
            let currentValueForStat = 0;

            if (achLine.stat) {
                switch (achLine.stat) {
                    case 'equippedEpicItemCount': currentValueForStat = getEquippedRarityCount('Epic'); break;
                    case 'equippedLegendaryItemCount': currentValueForStat = getEquippedRarityCount('Legendary'); break;
                    case 'equippedMythicItemCount': currentValueForStat = getEquippedRarityCount('Mythic'); break;
                    case 'completedArtifactSetCount': currentValueForStat = getCompletedArtifactSetCount(); break;
                    case 'uniqueNormalLevelsCompleted': currentValueForStat = getUniqueLevelsCompletedCount('normal'); break;
                    case 'uniqueHardLevelsCompleted': currentValueForStat = getUniqueLevelsCompletedCount('hard'); break;
                    // Прямые статы из useGameStore
                    case 'uniqueLoginDaysCount': currentValueForStat = state.uniqueLoginDaysCount || 0; break;
                    case 'totalKills': currentValueForStat = state.totalKills || 0; break;
                    case 'totalGearChestsOpened': currentValueForStat = state.totalGearChestsOpened || 0; break;
                    case 'totalArtifactChestsOpened': currentValueForStat = state.totalArtifactChestsOpened || 0; break;
                    case 'totalGoldSpent': currentValueForStat = state.totalGoldSpent || 0; break;
                    case 'totalDiamondsSpent': currentValueForStat = state.totalDiamondsSpent || 0; break;
                    case 'totalTonShardsEarned': currentValueForStat = state.totalTonShardsEarned || 0; break;
                    case 'totalTonWithdrawn': currentValueForStat = state.totalTonWithdrawn || 0; break;
                    case 'powerLevel': currentValueForStat = state.powerLevel || 0; break;
                    // Добавь другие прямые статы, если они используются в achievementsData
                    default:
                        currentValueForStat = state[achLine.stat] || 0;
                        if (state[achLine.stat] === undefined) {
                           // console.warn(`[Achievements] Stat "${achLine.stat}" for achievement "${achLine.id}" not found in game state.`);
                        }
                }
            } else if (achLine.flag) {
                currentValueForStat = (state.booleanFlags && state.booleanFlags[achLine.flag]) ? 1 : 0;
            }

            if (status.currentValue !== currentValueForStat) {
                status.currentValue = currentValueForStat;
                changedInStatus = true;
            }

            let newHighestReachedLevel = status.highestReachedLevel;
            achLine.levels.forEach(levelData => {
                // Для флаговых ачивок цель обычно 1 (true), для счетчиков - levelData.target
                const targetForThisLevel = achLine.flag ? 1 : levelData.target;
                if (currentValueForStat >= targetForThisLevel && levelData.level > newHighestReachedLevel) {
                    newHighestReachedLevel = levelData.level;
                }
            });

            if (status.highestReachedLevel !== newHighestReachedLevel) {
                status.highestReachedLevel = newHighestReachedLevel;
                // console.log(`[Achievements] New highest level for ${achLine.id}: ${newHighestReachedLevel} (current value: ${currentValueForStat})`);
                changedInStatus = true;
            }
            newStatuses[achLine.id] = status;
        });

        if (changedInStatus) {
            set({ achievementsStatus: newStatuses });
        }
        
        // Обновление индикатора вынесено в конец и вызывается один раз
        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
    },
    generateDailyDeals: () => {
        console.log("[Shop_GenerateDeals] Starting generation...");
        console.log("[Shop_GenerateDeals] itemsDatabase sample (first 3):", itemsDatabase.slice(0, 3));
        console.log("[Shop_GenerateDeals] ALL_ARTIFACTS_ARRAY sample (first 3):", ALL_ARTIFACTS_ARRAY.slice(0, 3));
        console.log("[Shop_GenerateDeals] DAILY_DEAL_RARITY_WEIGHTS:", DAILY_DEAL_RARITY_WEIGHTS);

        const itemPool = itemsDatabase
            .filter(item => {
                if (!item) return false;
                const rarityKey = String(item.rarity || '').toLowerCase();
                const hasWeight = DAILY_DEAL_RARITY_WEIGHTS[rarityKey] !== undefined;
                // if (!hasWeight) console.log(`[Shop_GenerateDeals] Item filtered out (no weight for rarity '${rarityKey}'):`, item.name);
                return hasWeight;
            })
            .map(item => ({ type: 'item', data: item, rarity: item.rarity }));

        console.log(`[Shop_GenerateDeals] itemPool created. Count: ${itemPool.length}`);
        if (itemPool.length > 0) console.log("[Shop_GenerateDeals] itemPool sample (first item):", itemPool[0]);


        const artifactsForShards = ALL_ARTIFACTS_ARRAY
            .filter(art => {
                if (!art) return false;
                const rarityKey = String(art.rarity || '').toLowerCase();
                const hasWeight = DAILY_DEAL_RARITY_WEIGHTS[rarityKey] !== undefined;
                // if (!hasWeight) console.log(`[Shop_GenerateDeals] Artifact filtered out (no weight for rarity '${rarityKey}'):`, art.name);
                return hasWeight;
            });
        const shardPool = artifactsForShards
            .map(artifact => ({ type: 'artifact_shard', data: artifact, rarity: artifact.rarity }));

        console.log(`[Shop_GenerateDeals] shardPool created. Count: ${shardPool.length}`);
        if (shardPool.length > 0) console.log("[Shop_GenerateDeals] shardPool sample (first item):", shardPool[0]);

        const combinedPool = [...itemPool, ...shardPool];
        console.log(`[Shop_GenerateDeals] combinedPool created. Total items for deals: ${combinedPool.length}`);

        if (combinedPool.length === 0) {
            console.error("[Shop_GenerateDeals] Пул для ежедневных предложений пуст! Проверьте itemsDatabase, ALL_ARTIFACTS_ARRAY и DAILY_DEAL_RARITY_WEIGHTS. Убедитесь, что у предметов/артефактов есть свойство 'rarity' и оно соответствует ключам в DAILY_DEAL_RARITY_WEIGHTS (с учетом .toLowerCase()).");
            set({ dailyDeals: [], dailyDealsLastGenerated: Date.now(), dailyShopPurchases: {} });
            return;
        }

        const weightedPool = combinedPool.map(entry => {
            if (!entry || !entry.rarity || !entry.data) {
                console.warn("[Shop_GenerateDeals] Некорректный entry в combinedPool, пропускаем:", entry);
                return null;
            }
            const rarityKey = String(entry.rarity).toLowerCase();
            const weight = DAILY_DEAL_RARITY_WEIGHTS[rarityKey];

            if (weight === undefined || typeof weight !== 'number' || weight <= 0) {
                console.warn(`[Shop_GenerateDeals] Невалидный или нулевой вес для редкости '${rarityKey}' (оригинал: '${entry.rarity}') у элемента:`, entry.data.name, ". Пропускаем.");
                return null;
            }
            return { item: entry, weight: weight };
        }).filter(Boolean);

        console.log(`[Shop_GenerateDeals] weightedPool created. Count: ${weightedPool.length}`);
        if (weightedPool.length === 0 && combinedPool.length > 0) {
            console.error("[Shop_GenerateDeals] Weighted pool пуст, хотя combinedPool не был пуст. Вероятно, все предметы были отфильтрованы из-за невалидных весов редкости.");
        }


        if (weightedPool.length === 0) {
            console.error("[Shop_GenerateDeals] Weighted pool for daily deals is empty after filtering! Проверьте веса редкостей и доступные предметы/артефакты.");
            set({ dailyDeals: [], dailyDealsLastGenerated: Date.now(), dailyShopPurchases: {} });
            return;
        }

        const numberOfDeals = 6;
        const generatedDeals = [];
        const selectedItemIds = new Set();
        let currentWeightedPool = [...weightedPool];
        let iterations = 0;
        const MAX_ITERATIONS = 1000; // Предохранитель от бесконечного цикла

        console.log(`[Shop_GenerateDeals] Starting selection loop for ${numberOfDeals} deals. Initial pool size: ${currentWeightedPool.length}`);

        while (generatedDeals.length < numberOfDeals && currentWeightedPool.length > 0 && iterations < MAX_ITERATIONS) {
            iterations++;
            // weightedRandom возвращает непосредственно сам элемент {type, data, rarity}
            const selectedDataEntry = weightedRandom(currentWeightedPool); // currentWeightedPool - это массив { item: {type, data, rarity}, weight: X }
            // weightedRandom должен вернуть .item из этого объекта

            // ИЗМЕНЕННАЯ ПРОВЕРКА:
            // selectedDataEntry теперь должно быть объектом вида {type, data, rarity}
            if (!selectedDataEntry || typeof selectedDataEntry.data !== 'object' || selectedDataEntry.data === null) {
                console.warn(`[Shop_GenerateDeals] weightedRandom вернул невалидный элемент (или элемент без data) на итерации ${iterations}. Pool size: ${currentWeightedPool.length}. Selected:`, selectedDataEntry);

                // Попытка удалить проблемный элемент из currentWeightedPool, чтобы избежать бесконечного цикла
                // Эта логика может потребовать доработки в зависимости от того, как именно weightedRandom работает с currentWeightedPool
                // и что он возвращает в случае ошибки. Пока что простой сдвиг, если что-то пошло не так.
                if (currentWeightedPool.length > 0) {
                    // Ищем элемент в currentWeightedPool, чей .item соответствует selectedDataEntry, который вернул weightedRandom
                    const problemIndex = currentWeightedPool.findIndex(poolEntry => poolEntry.item === selectedDataEntry);
                    if (problemIndex !== -1) {
                        currentWeightedPool.splice(problemIndex, 1);
                    } else {
                        // Если не нашли точный объект (маловероятно, если weightedRandom возвращает ссылку на .item),
                        // удаляем первый элемент, чтобы цикл мог продолжиться.
                        currentWeightedPool.shift();
                        console.warn(`[Shop_GenerateDeals] Fallback: removed first element from currentWeightedPool as problematic entry was not found by reference.`);
                    }
                }
                continue;
            }

            // Теперь selectedDataEntry - это и есть наш выбранный элемент {type, data, rarity}
            const selectedEntry = selectedDataEntry;

            const uniqueKey = `${selectedEntry.type}_${selectedEntry.data.id}`;

            // Поиск индекса обертки в currentWeightedPool, соответствующей выбранному selectedEntry (который является .item)
            const selectedIndexInPool = currentWeightedPool.findIndex(poolEntry => poolEntry.item === selectedEntry);

            if (!selectedItemIds.has(uniqueKey)) {
                selectedItemIds.add(uniqueKey);

                let quantity = 1;
                let currency = (Math.random() < 0.7) ? 'gold' : 'diamonds';
                let price = 100; // Базовая цена по умолчанию
                const rarityMultiplier = { common: 1, uncommon: 3, rare: 5, epic: 10, legendary: 25, mythic: 50 }; // Примерные множители, можно настроить

                // Используем basePrice из данных предмета, если оно есть
                const itemBasePrice = selectedEntry.data.basePrice || (selectedEntry.type === 'artifact_shard' ? 50 : 100); // Базовая цена для осколков или предметов

                price = itemBasePrice * (rarityMultiplier[String(selectedEntry.rarity).toLowerCase()] || 1);

                if (selectedEntry.type === 'artifact_shard') {
                    quantity = Math.random() < 0.5 ? 3 : 5; // Осколки продаются пачками
                    // Для дорогих осколков можно сделать валюту алмазы
                    const lowerRarity = String(selectedEntry.rarity).toLowerCase();
                    if (lowerRarity === 'rare' || lowerRarity === 'epic' || lowerRarity === 'legendary' || lowerRarity === 'mythic') {
                        currency = 'diamonds';
                    }
                    // Корректируем цену за пачку и если валюта - алмазы (алмазы "дороже" золота)
                    price = price * quantity / (currency === 'diamonds' ? 10 : 1); // Примерное соотношение стоимости
                } else { // type === 'item'
                    quantity = 1;
                }

                price = Math.max(currency === 'diamonds' ? 1 : 10, Math.round(price * (0.8 + Math.random() * 0.4))); // Колебание цены 80-120%

                const dealId = `daily_${uniqueKey}_${Date.now()}_${generatedDeals.length}`;
                const newDealObject = {
                    id: dealId, type: selectedEntry.type, itemId: selectedEntry.data.id,
                    name: selectedEntry.data.name, icon: selectedEntry.data.image || selectedEntry.data.icon,
                    quantity: quantity, currency: currency, price: price, rarity: selectedEntry.rarity,
                    discount: 0, purchaseLimit: 1,
                };
                generatedDeals.push(newDealObject);
            }

            // Удаляем выбранный элемент (точнее, его обертку) из пула
            if (selectedIndexInPool !== -1) {
                currentWeightedPool.splice(selectedIndexInPool, 1);
            } else {
                // Если элемент был добавлен в deals (т.е. он новый и прошел selectedItemIds.has(uniqueKey)),
                // но мы не нашли его индекс в currentWeightedPool, это может указывать на проблему
                // с тем, как weightedRandom возвращает элементы (например, копии, а не ссылки).
                // Однако, если selectedItemIds.has(uniqueKey) был true (элемент не новый), то selectedIndexInPool мог быть -1,
                // потому что элемент уже удален. В этом случае ничего делать не нужно.
                // Если же он был новый, но индекс -1, это проблема.
                if (!selectedItemIds.has(uniqueKey) && currentWeightedPool.length > 0) {
                    console.warn(`[Shop_GenerateDeals] Item was new but not found in currentWeightedPool by findIndex. This might indicate an issue if pool doesn't shrink. Selected:`, selectedEntry);
                    // В качестве крайней меры, чтобы избежать бесконечного цикла, если selectedEntry был уникальным, но не найден по индексу для удаления:
                    // currentWeightedPool.shift(); // Это рискованно, т.к. удалит не тот элемент.
                }
            }

            if (currentWeightedPool.length === 0 && generatedDeals.length < numberOfDeals) {
                console.warn("[Shop_GenerateDeals] Ran out of unique items for daily deals before filling all slots.");
                break;
            }
        }
        if (iterations >= MAX_ITERATIONS) {
            console.error("[Shop_GenerateDeals] Превышено максимальное количество итераций в цикле выбора товаров!");
        }

        console.log(`[Shop_GenerateDeals] Finished generation. ${generatedDeals.length} deals created.`);
        set({
            dailyDeals: generatedDeals,
            dailyDealsLastGenerated: Date.now(),
            dailyShopPurchases: {}
        });
    },
    checkAndRefreshDailyDeals: () => { // из КОД2
        const state = get();
        const lastGeneratedTs = state.dailyDealsLastGenerated;
        const nowTs = Date.now();
        if (!lastGeneratedTs) {
            get().generateDailyDeals();
            return;
        }
        const nowUtcDate = new Date(nowTs);
        const targetTodayUtcTs = Date.UTC(
            nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate(),
            REFRESH_HOUR_UTC, 0, 0, 0
        );
        let lastRefreshMarkerTs;
        if (nowTs >= targetTodayUtcTs) {
            lastRefreshMarkerTs = targetTodayUtcTs;
        } else {
            const targetYesterdayUtcTs = Date.UTC(
                nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate() - 1,
                REFRESH_HOUR_UTC, 0, 0, 0
            );
            lastRefreshMarkerTs = targetYesterdayUtcTs;
        }
        if (lastGeneratedTs < lastRefreshMarkerTs) {
            get().generateDailyDeals();
        } else {
            if (state.dailyDeals.length === 0 && savedState.dailyDeals && savedState.dailyDeals.length > 0) {
                set({ dailyDeals: savedState.dailyDeals, dailyShopPurchases: savedState.dailyShopPurchases || {} });
            } else if (state.dailyDeals.length === 0) {
                // console.log("Daily deals are empty, but refresh time not yet passed.");
            }
        }
    },
    collectArtifact: (artifactId) => { // из КОД2
        const artifactData = getArtifactById(artifactId);
        if (!artifactData) {
            console.warn(`Artifact data not found for ID: ${artifactId}`);
            return;
        }
        set((state) => {
            if (state.collectedArtifacts.has(artifactId)) {
                return {};
            }
            const newCollected = new Set(state.collectedArtifacts);
            newCollected.add(artifactId);
            const newLevels = { ...state.artifactLevels };
            if (!newLevels[artifactId]) {
                newLevels[artifactId] = { level: 0, shards: 0 };
            }
            return {
                collectedArtifacts: newCollected,
                artifactLevels: newLevels,
            };
        });
        get().updatePowerLevel();
        get().checkAllAchievements();
    },
    addArtifactShards: (artifactId, amount) => { // из КОД2
        if (amount <= 0) return;
        const artifactData = getArtifactById(artifactId);
        if (!artifactData) {
            console.warn(`Попытка добавить осколки для несуществующего артефакта: ${artifactId}`);
            return;
        }
        set((state) => {
            const currentInfo = state.artifactLevels[artifactId] || { level: 0, shards: 0 };
            let newCollectedArtifacts = state.collectedArtifacts;
            if (!state.collectedArtifacts.has(artifactId)) {
                newCollectedArtifacts = new Set(state.collectedArtifacts);
                newCollectedArtifacts.add(artifactId);
            }
            const newShards = currentInfo.shards + amount;
            return {
                artifactLevels: {
                    ...state.artifactLevels,
                    [artifactId]: { ...currentInfo, shards: newShards }
                },
                ...(newCollectedArtifacts !== state.collectedArtifacts && { collectedArtifacts: newCollectedArtifacts })
            };
        });
    },
    activateArtifact: (artifactId) => { // из КОД2
        const artifactData = getArtifactById(artifactId);
        if (!artifactData) { console.error("Арт не найден:", artifactId); return; }
        set((state) => {
            const currentInfo = state.artifactLevels[artifactId] || { level: 0, shards: 0 };
            if (currentInfo.level !== 0) {
                console.warn(`Попытка активировать уже активный/улучшенный (${currentInfo.level}) артефакт: ${artifactId}`);
                return {};
            }
            const shardsNeeded = (0 + 1) * (artifactData.baseShardCost || BASE_SHARD_COST_PER_LEVEL[artifactData.rarity.toLowerCase()] || 10);
            if (currentInfo.shards < shardsNeeded) {
                return {};
            }
            const remainingShards = currentInfo.shards - shardsNeeded;
            const newCollected = new Set(state.collectedArtifacts);
            newCollected.add(artifactId);
            return {
                collectedArtifacts: newCollected,
                artifactLevels: {
                    ...state.artifactLevels,
                    [artifactId]: { level: 0, shards: remainingShards }
                }
            };
        });
        get().updatePowerLevel();
        get().checkAllAchievements();
        get().initializeLevelHp();
    },
    upgradeArtifact: (artifactId) => { // из КОД2
        const artifactData = getArtifactById(artifactId);
        if (!artifactData) { console.error("Арт не найден:", artifactId); return; }
        set((state) => {
            const currentInfo = state.artifactLevels[artifactId];
            if (!currentInfo || currentInfo.level === 0) {
                console.warn(`Попытка улучшить неактивированный или несуществующий артефакт: ${artifactId}`);
                return {};
            }
            const currentLevel = currentInfo.level;
            const maxLevel = artifactData.maxLevel || MAX_ARTIFACT_LEVEL;
            if (currentLevel >= maxLevel) {
                return {};
            }
            const shardsNeeded = (currentLevel + 1) * (artifactData.baseShardCost || BASE_SHARD_COST_PER_LEVEL[artifactData.rarity.toLowerCase()] || 10);
            if (currentInfo.shards < shardsNeeded) {
                return {};
            }
            const newLevel = currentLevel + 1;
            const remainingShards = currentInfo.shards - shardsNeeded;
            return {
                artifactLevels: {
                    ...state.artifactLevels,
                    [artifactId]: { level: newLevel, shards: remainingShards }
                }
            };
        });
        get().updatePowerLevel();
        get().checkAllAchievements();
        get().initializeLevelHp();
    },

    upgradeItem: (itemObjectToUpgrade) => {
        const { gold, diamonds } = get(); // Получаем текущее состояние золота и алмазов для проверки

        if (!itemObjectToUpgrade || !itemObjectToUpgrade.id || !itemObjectToUpgrade.uid) {
            console.warn("upgradeItem: Передан невалидный объект предмета.", itemObjectToUpgrade);
            return false;
        }

        const itemDefinition = getItemById(itemObjectToUpgrade.id);
        if (!itemDefinition) {
            console.error(`Определение предмета не найдено для ID: ${itemObjectToUpgrade.id}`);
            return false;
        }

        const currentLevel = itemObjectToUpgrade.level || 0;
        const actualMaxLevel = (itemObjectToUpgrade.maxLevel !== undefined && itemObjectToUpgrade.maxLevel > 0)
            ? itemObjectToUpgrade.maxLevel
            : (itemDefinition.maxLevel !== undefined && itemDefinition.maxLevel > 0
                ? itemDefinition.maxLevel
                : MAX_ITEM_LEVEL);

        if (currentLevel >= actualMaxLevel) {
            console.log(`Предмет ${itemObjectToUpgrade.name || itemDefinition.name} уже максимального уровня.`);
            return false;
        }

        const itemRarity = itemObjectToUpgrade.rarity || itemDefinition.rarity;
        if (!itemRarity) {
            console.error(`Не определена редкость для предмета: ${itemObjectToUpgrade.name || itemDefinition.name}`);
            return false;
        }

        const goldCost = get().getGoldUpgradeCost ? get().getGoldUpgradeCost(currentLevel, itemRarity) : getGoldUpgradeCost(currentLevel, itemRarity);
        const diamondCost = get().getDiamondUpgradeCost ? get().getDiamondUpgradeCost(currentLevel, itemRarity) : getDiamondUpgradeCost(currentLevel, itemRarity);

        // Проверка наличия достаточного количества валюты
        if (gold < goldCost) {
            console.log(`Недостаточно золота для улучшения ${itemObjectToUpgrade.name || itemDefinition.name}. Нужно: ${goldCost}, есть: ${gold}`);
            return false;
        }
        if (diamonds < diamondCost) {
            console.log(`Недостаточно алмазов для улучшения ${itemObjectToUpgrade.name || itemDefinition.name}. Нужно: ${diamondCost}, есть: ${diamonds}`);
            return false;
        }

        // VVV ИЗМЕНЕНИЕ: Сначала списываем валюту через обновленные экшены VVV
        if (goldCost > 0) {
            get().addGold(-goldCost, true); // Второй аргумент true означает трату
        }
        if (diamondCost > 0) {
            get().addDiamonds(-diamondCost, true); // Второй аргумент true означает трату
        }
        // ^^^ КОНЕЦ ИЗМЕНЕНИЯ ^^^

        const newLevel = currentLevel + 1;
        let itemWasEquipped = false;
        const currentUpgradeFlag = get().booleanFlags.hasForgedOrUpgraded;
        let flagUpdate = !currentUpgradeFlag ? { booleanFlags: { ...get().booleanFlags, hasForgedOrUpgraded: true } } : {};

        set((state) => {
            // Логика обновления уровня предмета в инвентаре или экипировке
            let newEquipped = { ...state.equipped };
            let newInventory = [...state.inventory];
            const slotType = itemObjectToUpgrade.type;

            if (state.equipped[slotType]?.uid === itemObjectToUpgrade.uid) {
                itemWasEquipped = true;
                newEquipped[slotType] = { ...state.equipped[slotType], level: newLevel };
                // Обновляем и в инвентаре, если предмет там каким-то образом дублируется (маловероятно)
                const invIdx = newInventory.findIndex(invItem => invItem.uid === itemObjectToUpgrade.uid);
                if (invIdx !== -1) {
                    newInventory[invIdx] = { ...newInventory[invIdx], level: newLevel };
                }
            } else {
                const itemIndex = newInventory.findIndex(invItem => invItem.uid === itemObjectToUpgrade.uid);
                if (itemIndex !== -1) {
                    newInventory[itemIndex] = { ...newInventory[itemIndex], level: newLevel };
                } else {
                    // Эта ситуация не должна происходить, если объект предмета всегда корректен.
                    // Если дошли сюда, это критическая ошибка, и мы не должны были списывать валюту.
                    // В идеале, проверки на существование предмета должны быть до вызова этой функции
                    // или в самом начале, до списания валюты.
                    // Однако, если мы уже списали валюту, нужно как-то это обработать или залогировать серьезную ошибку.
                    // Сейчас мы просто не обновляем предмет, но валюта уже списана.
                    console.error(`КРИТИЧЕСКАЯ ОШИБКА в upgradeItem: Предмет с UID ${itemObjectToUpgrade.uid} для улучшения не найден ПОСЛЕ списания валюты.`);
                    // Можно вернуть валюту, но это усложнит логику.
                    // get().addGold(goldCost); // Вернуть золото (если это не isSpending)
                    // get().addDiamonds(diamondCost); // Вернуть алмазы
                    // И вернуть false из внешней функции.
                    // Но так как set уже вызывается, лучше прервать операцию раньше.
                    // Для простоты текущего исправления, оставляем как есть, но это проблемное место.
                    return state; // Возвращаем старое состояние предметов, но валюта уже списана.
                }
            }

            // VVV ИЗМЕНЕНИЕ: Больше не вычитаем золото/алмазы здесь напрямую VVV
            return {
                // gold: state.gold - goldCost, // УДАЛЕНО
                // diamonds: state.diamonds - diamondCost, // УДАЛЕНО
                equipped: newEquipped,
                inventory: newInventory,
                ...flagUpdate 
            };
            // ^^^ КОНЕЦ ИЗМЕНЕНИЯ ^^^
        });
        
        // Если была ошибка поиска предмета в set, itemWasEquipped может быть некорректным.
        // Но мы продолжаем, предполагая, что предмет был найден и обновлен.

        if (itemWasEquipped) {
            get().updatePowerLevel();
            get().initializeLevelHp(); // Обновляем HP, так как статы могли измениться
        }

        get().trackTaskEvent('upgrade_gear', 1); 
        get().checkAllAchievements(); // Проверяем ачивки после траты валюты и возможного изменения флага

        console.log(`Предмет ${itemObjectToUpgrade.name || itemDefinition.name} (UID: ${itemObjectToUpgrade.uid}) улучшен до уровня ${newLevel}`);
        return true;
    },

    updatePowerLevel: () => { // из КОД2
        const { equipped, artifactLevels, collectedArtifacts } = get();
        let totalPower = 0;
        Object.values(equipped).filter(Boolean).forEach(item => {
            const itemLevel = item?.currentLevel || item?.level || 0; // Добавил item?.level как fallback
            const basePower = item?.basePowerLevel || 0;
            const powerPerLvl = item?.powerPerLevel || 0;
            const currentItemPower = basePower + (powerPerLvl * itemLevel);
            totalPower += Math.round(currentItemPower);
        });
        for (const artifactId in artifactLevels) {
            if (collectedArtifacts.has(artifactId)) {
                const level = artifactLevels[artifactId]?.level || 0;
                if (level > 0) {
                    const artifactData = getArtifactById(artifactId);
                    if (artifactData) {
                        const artifactBasePower = artifactData.basePowerLevel || 0;
                        const artifactPowerPerLevel = artifactData.powerLevelPerLevel || 0;
                        const currentArtifactPower = artifactBasePower + (artifactPowerPerLevel * (level - 1));
                        totalPower += Math.round(currentArtifactPower);
                    } else {
                        console.warn(`Данные для артефакта ${artifactId} не найдены при расчете PL.`);
                    }
                }
            }
        }
        const finalPowerLevel = Math.max(0, totalPower);
        if (get().powerLevel !== finalPowerLevel) {
            set({ powerLevel: finalPowerLevel });
        }
    },
    addItemToInventoryLogic: (currentInventory, itemData) => {
        const newItemInstance = createItemInstance(itemData); // <<< Прямой вызов, если createItemInstance - хелпер
        if (!newItemInstance) return currentInventory;
        return [...currentInventory, newItemInstance];
    },

    addKeys: (keyType, amount) => set(state => {
        if (keyType === REWARD_TYPES.RARE_CHEST_KEY) {
            return { rareChestKeys: Math.max(0, state.rareChestKeys + amount) };
        }
        if (keyType === REWARD_TYPES.EPIC_CHEST_KEY) {
            return { epicChestKeys: Math.max(0, state.epicChestKeys + amount) };
        }
        console.warn("addKeys: Unknown keyType", keyType);
        return {};
    }),

   openGearChest: (chestId) => {
    const state = get(); // Получаем текущее состояние
    const chestData = getGearChestById(chestId);

    if (!chestData) {
        console.error(`[GearChest] Сундук с ID ${chestId} не найден.`);
        // Добавлено awardedItem: null для консистентности возвращаемого объекта
        return { success: false, error: "Сундук не найден", paymentMethodUsed: null, awardedItem: null };
    }

    let paymentMethodUsed = null;
    let currencyToDeductName = null;
    let currencyAmountToDeduct = 0;
    let keyTypeToDeduct = null;
    let keysAmountToDeduct = 0;

    const keyForFreeOpen = chestData.keyToOpenForFree;
    const currencyCost = chestData.cost; // Например, { currency: 'gold', price: 100 }

    // 1. Проверка возможности оплаты и определение метода
    if (keyForFreeOpen) {
        if (keyForFreeOpen === REWARD_TYPES.RARE_CHEST_KEY && state.rareChestKeys >= 1) {
            keyTypeToDeduct = REWARD_TYPES.RARE_CHEST_KEY;
            keysAmountToDeduct = 1;
            paymentMethodUsed = 'key';
        } else if (keyForFreeOpen === REWARD_TYPES.EPIC_CHEST_KEY && state.epicChestKeys >= 1) {
            keyTypeToDeduct = REWARD_TYPES.EPIC_CHEST_KEY;
            keysAmountToDeduct = 1;
            paymentMethodUsed = 'key';
        }
    }

    if (paymentMethodUsed !== 'key') { // Если ключ не использован, пытаемся оплатить валютой
        if (currencyCost && typeof currencyCost.price === 'number') {
            currencyToDeductName = currencyCost.currency;
            if (currencyCost.price > 0) {
                if (currencyCost.currency === 'gold') {
                    if (state.gold >= currencyCost.price) {
                        currencyAmountToDeduct = currencyCost.price;
                        paymentMethodUsed = 'currency';
                    } else {
                        alert(`Недостаточно золота! Нужно ${currencyCost.price}`);
                        return { success: false, error: "Недостаточно золота", paymentMethodUsed: null, awardedItem: null };
                    }
                } else if (currencyCost.currency === 'diamonds') {
                    if (state.diamonds >= currencyCost.price) {
                        currencyAmountToDeduct = currencyCost.price;
                        paymentMethodUsed = 'currency';
                    } else {
                        alert(`Недостаточно алмазов! Нужно ${currencyCost.price}`);
                        return { success: false, error: "Недостаточно алмазов", paymentMethodUsed: null, awardedItem: null };
                    }
                } else {
                    console.error(`[GearChest] Неизвестная валюта: ${currencyCost.currency} для сундука ${chestId}`);
                    return { success: false, error: "Неизвестная валюта", paymentMethodUsed: null, awardedItem: null };
                }
            } else { // Цена 0 (бесплатный по цене)
                paymentMethodUsed = 'free_by_price_0';
            }
        } else { // Нет конфигурации стоимости (полностью бесплатный)
            paymentMethodUsed = 'free_no_cost_config';
        }
    }

    if (!paymentMethodUsed) {
        // Эта ситуация не должна возникать, если логика выше корректна,
        // но добавим проверку на случай, если сундук бесплатный и не прошел по основным веткам.
        if (!keyForFreeOpen && (!currencyCost || currencyCost.price === 0)) {
             paymentMethodUsed = currencyCost && currencyCost.price === 0 ? 'free_by_price_0' : 'free_no_cost_config';
        } else {
            console.error(`[GearChest] Не удалось определить способ оплаты или не хватает ресурсов для ${chestId}.`);
            return { success: false, error: "Ошибка оплаты или нехватка ресурсов", paymentMethodUsed: null, awardedItem: null };
        }
    }
    
    // VVV ИЗМЕНЕНИЕ: Списание валюты/ключей ПЕРЕД генерацией награды VVV
    if (paymentMethodUsed === 'currency') {
        if (currencyToDeductName === 'gold' && currencyAmountToDeduct > 0) {
            get().addGold(-currencyAmountToDeduct, true); // true для учета в totalGoldSpent
        } else if (currencyToDeductName === 'diamonds' && currencyAmountToDeduct > 0) {
            get().addDiamonds(-currencyAmountToDeduct, true); // true для учета в totalDiamondsSpent
        }
    } else if (paymentMethodUsed === 'key') {
        if (keyTypeToDeduct === REWARD_TYPES.RARE_CHEST_KEY && keysAmountToDeduct > 0) {
            set(prevState => ({ rareChestKeys: prevState.rareChestKeys - keysAmountToDeduct }));
        } else if (keyTypeToDeduct === REWARD_TYPES.EPIC_CHEST_KEY && keysAmountToDeduct > 0) {
            set(prevState => ({ epicChestKeys: prevState.epicChestKeys - keysAmountToDeduct }));
        }
    }
    // ^^^ КОНЕЦ ИЗМЕНЕНИЯ ^^^

    // --- Логика Pity и генерации предмета ---
    const currentPityForChest = get().gearChestPity[chestId] || {};
    let newPityState = { ...currentPityForChest };
    const pityConfigs = chestData.pity ? (Array.isArray(chestData.pity) ? chestData.pity : [chestData.pity]) : [];
    
    // Увеличиваем счетчики pity перед роллом
    pityConfigs.forEach(pConfig => {
        const key = pConfig.rarity.toLowerCase();
        newPityState[key] = (newPityState[key] || 0) + 1;
    });

    let guaranteedRarityByPity = null;
    const sortedPityConfigs = [...pityConfigs].sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));
    for (const pConfig of sortedPityConfigs) {
        const key = pConfig.rarity.toLowerCase();
        if (newPityState[key] >= pConfig.limit) {
            guaranteedRarityByPity = pConfig.rarity;
            console.log(`[GearChest] Сработал гарант для ${pConfig.rarity} (${newPityState[key]}/${pConfig.limit}) для сундука ${chestId}`);
            break;
        }
    }

    const finalRarity = guaranteedRarityByPity || _rollWeightedRarity_Gear(chestData.rarityChances);
    const obtainedItemData = _selectRandomGearItemByRarity_Gear(finalRarity);

    if (!obtainedItemData) {
        console.error(`[GearChest] Не удалось получить предмет редкости ${finalRarity}. Отмена и ВОЗВРАТ ВАЛЮТЫ/КЛЮЧЕЙ.`);
        // ВАЖНО: Возврат ресурсов, если предмет не сгенерирован
        if (paymentMethodUsed === 'currency') {
            if (currencyToDeductName === 'gold' && currencyAmountToDeduct > 0) {
                get().addGold(currencyAmountToDeduct, false); // false - не учитывать как трату
            } else if (currencyToDeductName === 'diamonds' && currencyAmountToDeduct > 0) {
                get().addDiamonds(currencyAmountToDeduct, false); // false - не учитывать как трату
            }
        } else if (paymentMethodUsed === 'key') {
            if (keyTypeToDeduct === REWARD_TYPES.RARE_CHEST_KEY && keysAmountToDeduct > 0) {
                set(prevState => ({ rareChestKeys: prevState.rareChestKeys + keysAmountToDeduct }));
            } else if (keyTypeToDeduct === REWARD_TYPES.EPIC_CHEST_KEY && keysAmountToDeduct > 0) {
                set(prevState => ({ epicChestKeys: prevState.epicChestKeys + keysAmountToDeduct }));
            }
        }
        // Можно рассмотреть откат newPityState к currentPityForChest, если генерация не удалась,
        // но текущая логика сохранит инкрементированный pity.
        return { success: false, error: "Ошибка генерации предмета", paymentMethodUsed, awardedItem: null };
    }
    
    const actualObtainedRarity = obtainedItemData.rarity;

    // Сброс pity, если получен предмет соответствующей или более высокой редкости
    pityConfigs.forEach(pConfig => {
        const pityRarityKey = pConfig.rarity.toLowerCase();
        if (rarityOrder[actualObtainedRarity] >= rarityOrder[pConfig.rarity]) {
            if (newPityState[pityRarityKey] > 0) { // Сбрасываем, только если счетчик был активен
                newPityState[pityRarityKey] = 0;
            }
        }
    });
    // --- Конец логики Pity и генерации ---

    const rewardDetailsForUI = {
        type: 'gear', 
        id: obtainedItemData.id, // ID из шаблона предмета
        name: obtainedItemData.name, 
        icon: obtainedItemData.image, // image из шаблона предмета как иконка
        rarity: actualObtainedRarity, 
        amount: 1,
        // uid и level будут у экземпляра, который создается в addItemToInventoryLogic
    };

    set(prevState => {
        // addItemToInventoryLogic должен сам обработать создание экземпляра из obtainedItemData (шаблона)
        const updatedInventory = get().addItemToInventoryLogic(prevState.inventory, obtainedItemData);
        
        // VVV ИЗМЕНЕНИЕ: Блок resourceUpdates для валюты и ключей удален, так как списание происходит раньше VVV
        // ^^^ КОНЕЦ ИЗМЕНЕНИЯ ^^^
        return {
            totalGearChestsOpened: (prevState.totalGearChestsOpened || 0) + 1,
            gearChestPity: {
                ...prevState.gearChestPity,
                [chestId]: newPityState // Сохраняем обновленное состояние pity
            },
            inventory: updatedInventory,
            lastOpenedChestInfo: { 
                chestId: chestId, 
                amount: 1, 
                type: 'gear', 
                name: chestData.name, 
                icon: chestData.icon 
            },
            lastChestRewards: [rewardDetailsForUI] // Массив с одним элементом для одиночного открытия
        };
    });

    if (chestData.shardPassXp && chestData.shardPassXp > 0) {
        get().addShardPassXp(chestData.shardPassXp);
    }
    // Добавлен type: 'gear'
    get().trackTaskEvent('open_chest', 1, { chestId: chestId, rarity: actualObtainedRarity, type: 'gear' }); 
    get().checkAllAchievements();

    console.log(`[GearChest] Открыт: ${chestData.name} (Оплата: ${paymentMethodUsed}). Получено: ${obtainedItemData.name} (${actualObtainedRarity}). Гарант: ${guaranteedRarityByPity || 'Нет'}`);
    
    // Возвращаем шаблон полученного предмета, как и ранее.
    // Если нужен экземпляр, addItemToInventoryLogic должен его вернуть, и этот код нужно будет скорректировать.
    return { success: true, awardedItem: obtainedItemData, paymentMethodUsed };
},

openGearChestX10: (chestId) => {
    const state = get(); // Получаем текущее состояние
    const chestData = getGearChestById(chestId);
    const countToOpen = 10;

    if (!chestData) {
        console.error(`[GearChestX10] Сундук с ID ${chestId} не найден.`);
        return { success: false, error: "Сундук не найден", awardedItems: [], paymentMethodUsed: null };
    }

    let paymentMethodUsed = null;
    let currencyToDeductName = null;
    let totalCurrencyAmountToDeduct = 0;
    let keyTypeToDeduct = null;
    let totalKeysAmountToDeduct = 0;

    const keyForFreeOpen = chestData.keyToOpenForFree;
    const currencyCost = chestData.cost;

    // 1. Проверка возможности оплаты и определение метода для x10
    if (keyForFreeOpen) {
        if (keyForFreeOpen === REWARD_TYPES.RARE_CHEST_KEY && state.rareChestKeys >= countToOpen) {
            keyTypeToDeduct = REWARD_TYPES.RARE_CHEST_KEY;
            totalKeysAmountToDeduct = countToOpen;
            paymentMethodUsed = 'key';
        } else if (keyForFreeOpen === REWARD_TYPES.EPIC_CHEST_KEY && state.epicChestKeys >= countToOpen) {
            keyTypeToDeduct = REWARD_TYPES.EPIC_CHEST_KEY;
            totalKeysAmountToDeduct = countToOpen;
            paymentMethodUsed = 'key';
        }
    }

    if (paymentMethodUsed !== 'key') {
        if (currencyCost && typeof currencyCost.price === 'number') {
            currencyToDeductName = currencyCost.currency;
            if (currencyCost.price > 0) {
                const totalNeededCurrency = currencyCost.price * countToOpen;
                if (currencyCost.currency === 'gold') {
                    if (state.gold >= totalNeededCurrency) {
                        totalCurrencyAmountToDeduct = totalNeededCurrency;
                        paymentMethodUsed = 'currency';
                    } else {
                        alert(`Недостаточно золота! Нужно ${totalNeededCurrency}`);
                        return { success: false, error: "Недостаточно золота", awardedItems: [], paymentMethodUsed: null };
                    }
                } else if (currencyCost.currency === 'diamonds') {
                    if (state.diamonds >= totalNeededCurrency) {
                        totalCurrencyAmountToDeduct = totalNeededCurrency;
                        paymentMethodUsed = 'currency';
                    } else {
                        alert(`Недостаточно алмазов! Нужно ${totalNeededCurrency}`);
                        return { success: false, error: "Недостаточно алмазов", awardedItems: [], paymentMethodUsed: null };
                    }
                } else {
                    console.error(`[GearChestX10] Неизвестная валюта: ${currencyCost.currency} для ${chestId} с ценой > 0`);
                    return { success: false, error: "Неизвестная валюта", awardedItems: [], paymentMethodUsed: null };
                }
            } else { // Цена 0
                paymentMethodUsed = 'free_by_price_0';
            }
        } else { // Нет конфигурации стоимости
            paymentMethodUsed = 'free_no_cost_config';
        }
    }
    
    if (!paymentMethodUsed) {
        if (!keyForFreeOpen && (!currencyCost || currencyCost.price === 0)) {
             paymentMethodUsed = currencyCost && currencyCost.price === 0 ? 'free_by_price_0' : 'free_no_cost_config';
        } else {
            console.error(`[GearChestX10] Не удалось определить способ оплаты для ${chestId} x10.`);
            return { success: false, error: "Ошибка оплаты x10", awardedItems: [], paymentMethodUsed: null };
        }
    }

    // VVV ИЗМЕНЕНИЕ: Списание валюты/ключей ПЕРЕД циклом генерации VVV
    if (paymentMethodUsed === 'currency') {
        if (currencyToDeductName === 'gold' && totalCurrencyAmountToDeduct > 0) {
            get().addGold(-totalCurrencyAmountToDeduct, true);
        } else if (currencyToDeductName === 'diamonds' && totalCurrencyAmountToDeduct > 0) {
            get().addDiamonds(-totalCurrencyAmountToDeduct, true);
        }
    } else if (paymentMethodUsed === 'key') {
        if (keyTypeToDeduct === REWARD_TYPES.RARE_CHEST_KEY && totalKeysAmountToDeduct > 0) {
            set(prevState => ({ rareChestKeys: prevState.rareChestKeys - totalKeysAmountToDeduct }));
        } else if (keyTypeToDeduct === REWARD_TYPES.EPIC_CHEST_KEY && totalKeysAmountToDeduct > 0) {
            set(prevState => ({ epicChestKeys: prevState.epicChestKeys - totalKeysAmountToDeduct }));
        }
    }
    // ^^^ КОНЕЦ ИЗМЕНЕНИЯ ^^^

    let workingPity = { ...(get().gearChestPity[chestId] || {}) }; // Загружаем pity из состояния
    const rewardsDetailed = []; // Для отображения в UI
    const newItemInstances = []; // Массив для реальных экземпляров предметов
    let accumulatedShardPassXp = 0;
    const pityConfigs = chestData.pity ? (Array.isArray(chestData.pity) ? chestData.pity : [chestData.pity]) : [];
    const sortedPityConfigs = [...pityConfigs].sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));
    let errorDuringGeneration = false; // Флаг для отслеживания ошибок генерации

    console.log(`[GearChestX10] Начало открытия x10 (Оплата: ${paymentMethodUsed}) для ${chestId}. Начальный Pity:`, JSON.parse(JSON.stringify(workingPity)));

    for (let i = 0; i < countToOpen; i++) {
        // Копируем workingPity для текущего ролла, чтобы изменения не влияли на другие роллы в этом же цикле до обновления workingPity
        let currentPullPityCounters = { ...workingPity }; 
        
        // Увеличиваем счетчики pity для текущего ролла
        pityConfigs.forEach(pConfig => {
            const key = pConfig.rarity.toLowerCase();
            currentPullPityCounters[key] = (currentPullPityCounters[key] || 0) + 1;
        });

        let guaranteedRarityThisPull = null;
        for (const pConfig of sortedPityConfigs) {
            const key = pConfig.rarity.toLowerCase();
            if (currentPullPityCounters[key] >= pConfig.limit) {
                guaranteedRarityThisPull = pConfig.rarity;
                console.log(`[GearChestX10 #${i+1}] Сработал гарант для ${pConfig.rarity} (${currentPullPityCounters[key]}/${pConfig.limit})`);
                break;
            }
        }
        
        const finalRarityThisPull = guaranteedRarityThisPull || _rollWeightedRarity_Gear(chestData.rarityChances);
        const obtainedItemData = _selectRandomGearItemByRarity_Gear(finalRarityThisPull);

        if (!obtainedItemData) {
            console.error(`[GearChestX10 #${i+1}] Ошибка генерации предмета редкости ${finalRarityThisPull}.`);
            rewardsDetailed.push({ type: 'error', name: `Ошибка генерации #${i+1}`, rarity: 'Error', icon: '/assets/default-item.png' });
            errorDuringGeneration = true; 
            // Pity для этого неудачного ролла все равно "используется" (счетчики увеличены).
            // Обновляем workingPity этими увеличенными счетчиками.
            workingPity = currentPullPityCounters; 
            continue; // Переходим к следующей итерации
        }
        
        const actualObtainedRarityThisPull = obtainedItemData.rarity;

        // Сбрасываем pity, если получен предмет соответствующей или более высокой редкости
        pityConfigs.forEach(pConfig => {
            const pityRarityKey = pConfig.rarity.toLowerCase();
            if (rarityOrder[actualObtainedRarityThisPull] >= rarityOrder[pConfig.rarity]) {
                if (currentPullPityCounters[pityRarityKey] > 0) {
                    currentPullPityCounters[pityRarityKey] = 0; 
                }
            }
        });
        workingPity = currentPullPityCounters; // Сохраняем измененное состояние pity для следующего ролла

        const newItemInstanceWithUid = createItemInstance(obtainedItemData); // Создаем уникальный экземпляр
        if (!newItemInstanceWithUid) {
            console.error(`[GearChestX10 #${i+1}] Ошибка создания экземпляра для ${obtainedItemData.name}.`);
            rewardsDetailed.push({ type: 'error', name: `Ошибка экз. ${obtainedItemData.name}`, rarity: 'Error', icon: '/assets/default-item.png' });
            errorDuringGeneration = true;
            continue; 
        }
        
        newItemInstances.push(newItemInstanceWithUid);
        rewardsDetailed.push({
            type: 'gear', 
            id: newItemInstanceWithUid.id, 
            uid: newItemInstanceWithUid.uid,
            name: newItemInstanceWithUid.name, 
            icon: newItemInstanceWithUid.image,
            rarity: newItemInstanceWithUid.rarity, 
            level: newItemInstanceWithUid.level || 0, 
            amount: 1
        });

        if (chestData.shardPassXp && chestData.shardPassXp > 0) {
            accumulatedShardPassXp += chestData.shardPassXp;
        }
       
    }
    
    set(prevState => {
        const finalInventory = [...prevState.inventory, ...newItemInstances]; // Добавляем все новые экземпляры в инвентарь
        // VVV ИЗМЕНЕНИЕ: Блок resourceUpdates для валюты и ключей удален VVV
        // ^^^ КОНЕЦ ИЗМЕНЕНИЯ ^^^
        return {
            totalGearChestsOpened: (prevState.totalGearChestsOpened || 0) + countToOpen,
            gearChestPity: { 
                ...prevState.gearChestPity, 
                [chestId]: workingPity // Сохраняем финальное состояние pity после всех 10 открытий
            },
            inventory: finalInventory,
            lastOpenedChestInfo: { 
                chestId: chestId, 
                amount: countToOpen, 
                type: 'gear', 
                name: chestData.name, 
                icon: chestData.icon 
            },
            lastChestRewards: rewardsDetailed
        };
    });

    if (accumulatedShardPassXp > 0) {
        get().addShardPassXp(accumulatedShardPassXp);
    }
    get().trackTaskEvent('open_chest', countToOpen, { chestId: chestId, type: 'gear' }); // Добавлен type: 'gear'
    get().checkAllAchievements();
    
    console.log(`[GearChestX10] Завершено открытие x10 для ${chestId}. Выдано ${newItemInstances.length} из ${countToOpen} предметов. Были ошибки генерации: ${errorDuringGeneration}`);
    // Успех зависит от того, были ли ошибки при генерации предметов
    return { success: !errorDuringGeneration, awardedItems: newItemInstances, paymentMethodUsed };
},

    // processArtifactReward остается без изменений, так как он не относится к проблеме с предметами экипировки
    processArtifactReward: (dropType, targetArtifactId) => {
        if (!targetArtifactId) {
            console.warn("[ProcessArtifact] targetArtifactId не предоставлен.");
            return { details: null, obtainedFullArtifact: false };
        }
        const artifactData = getArtifactById(targetArtifactId); // Убедитесь, что getArtifactById импортирована
        if (!artifactData) {
            console.error(`[ProcessArtifact] Данные для артефакта ${targetArtifactId} не найдены.`);
            return { details: null, obtainedFullArtifact: false };
        }

        let rewardDetails = null;
        let obtainedFullArtifact = false;

        if (dropType === 'artifact_shard') {
            const amount = 1; // Обычно осколок дается по одному
            get().addArtifactShards(targetArtifactId, amount); // Ваша логика добавления осколков
            rewardDetails = {
                uid: uuidv4(), // <--- ДОБАВЛЕН УНИКАЛЬНЫЙ ID
                type: 'artifact_shard',
                amount,
                artifactId: targetArtifactId,
                icon: artifactData.icon,
                name: `${artifactData.name} (осколок)`,
                rarity: artifactData.rarity
            };
        } else if (dropType === 'full_artifact') {
            obtainedFullArtifact = true;
            const currentArtifactState = get().artifactLevels[targetArtifactId];
            const isCollected = get().collectedArtifacts.has(targetArtifactId);
            // Активным считаем, если собран и уровень > 0 (или просто собран, если у вас нет отдельной активации)
            const isActive = isCollected && currentArtifactState && currentArtifactState.level > 0;
            const shardAmountOnDuplicate = artifactData.shardValueOnDuplicate || 10; // Количество осколков за дубликат

            if (isActive) { // Если артефакт уже есть и активен (например, прокачан)
                get().addArtifactShards(targetArtifactId, shardAmountOnDuplicate);
                rewardDetails = {
                    uid: uuidv4(), // <--- ДОБАВЛЕН УНИКАЛЬНЫЙ ID
                    type: 'full_artifact_duplicate', // Тип для дубликата
                    artifactId: targetArtifactId,
                    isNew: false,
                    shardAmount: shardAmountOnDuplicate, // Количество полученных осколков
                    icon: artifactData.icon,
                    name: artifactData.name,
                    rarity: artifactData.rarity
                };
            } else { // Если артефакт новый или еще не был "активирован" (уровень 0)
                if (!isCollected) {
                    // Эта логика может быть частью set ниже или отдельной функцией
                    // get().collectArtifact(targetArtifactId);
                }
                // Обновляем состояние: добавляем в собранные, устанавливаем уровень 1
                set(state => {
                    const newCollected = new Set(state.collectedArtifacts);
                    newCollected.add(targetArtifactId);
                    return {
                        collectedArtifacts: newCollected,
                        artifactLevels: {
                            ...state.artifactLevels,
                            [targetArtifactId]: {
                                shards: (state.artifactLevels[targetArtifactId]?.shards || 0),
                                level: 1, // Устанавливаем уровень 1 при первом получении
                            }
                        }
                    };
                });
                get().updatePowerLevel(); // Обновляем силу игрока
                rewardDetails = {
                    uid: uuidv4(), // <--- ДОБАВЛЕН УНИКАЛЬНЫЙ ID
                    type: 'full_artifact_new', // Тип для нового артефакта
                    artifactId: targetArtifactId,
                    isNew: true,
                    icon: artifactData.icon,
                    name: artifactData.name,
                    rarity: artifactData.rarity
                };
            }
        } else {
            console.warn("[ProcessArtifact] Неизвестный dropType:", dropType);
        }

        return { details: rewardDetails, obtainedFullArtifact: obtainedFullArtifact };
    },
   openArtifactChest: (chestId) => {
    const state = get();
    const chestData = getArtifactChestById(chestId);

    if (!chestData || !chestData.isEnabled) {
        console.error(`[ArtifactChest] Сундук ${chestId} не найден или не активен.`);
        return { success: false, error: `Сундук ${chestId} не найден или не активен.`, awardedItemDetails: null };
    }

    const currencyName = chestData.cost.currency;
    const costAmount = chestData.cost.price;

    // 1. Проверка наличия валюты и ПРЕДВАРИТЕЛЬНОЕ СПИСАНИЕ
    if (currencyName === 'gold') {
        if (state.gold < costAmount) {
            alert(`Недостаточно золота! Нужно ${costAmount}.`);
            return { success: false, error: "Недостаточно золота", awardedItemDetails: null };
        }
        get().addGold(-costAmount, true); // Списываем золото, учитываем в тратах
    } else if (currencyName === 'diamonds') {
        if (state.diamonds < costAmount) {
            alert(`Недостаточно алмазов! Нужно ${costAmount}.`);
            return { success: false, error: "Недостаточно алмазов", awardedItemDetails: null };
        }
        get().addDiamonds(-costAmount, true); // Списываем алмазы, учитываем в тратах
    } else {
        console.error(`[ArtifactChest] Неподдерживаемая валюта для списания: ${currencyName} для сундука ${chestId}.`);
        // Важно: валюта еще не списана, если она не gold/diamonds. Просто выходим.
        return { success: false, error: `Неподдерживаемая валюта: ${currencyName}`, awardedItemDetails: null };
    }

    // 2. Логика Pity и определения награды
    let currentPityCounter = state.artifactChestPity[chestId] || 0;
    currentPityCounter++;

    let chosenRewardFromPool = null;
    let isPityTriggered = false;
    let targetArtifactRarityFromRoll = null;

    if (chestData.pity && currentPityCounter >= chestData.pity.triggerLimit) {
        console.log(`[ArtifactChest] Сработал гарант для ${chestId} (${currentPityCounter}/${chestData.pity.triggerLimit})`);
        isPityTriggered = true;
        const pityRarityObject = selectWeightedRewardType(chestData.pity.guaranteedArtifactRarityPool);
        if (pityRarityObject && pityRarityObject.rarity) {
            targetArtifactRarityFromRoll = pityRarityObject.rarity;
            chosenRewardFromPool = { type: 'full_artifact', rarity: targetArtifactRarityFromRoll };
            console.log(`[ArtifactChest] Гарант дал редкость: ${targetArtifactRarityFromRoll} (для full_artifact)`);
        } else {
            console.error(`[ArtifactChest] Ошибка определения редкости по гаранту для ${chestId}. Возврат к обычному роллу.`);
            chosenRewardFromPool = selectWeightedRewardType(chestData.rewardPool);
            isPityTriggered = false; // Считаем, что гарант не сработал корректно
        }
    } else {
        chosenRewardFromPool = selectWeightedRewardType(chestData.rewardPool);
        console.log(`[ArtifactChest] Обычный ролл:`, chosenRewardFromPool);
    }

    if (!chosenRewardFromPool) {
        console.error("[ArtifactChest] Не удалось определить награду. Возврат валюты.");
        // ВОЗВРАТ валюты, если награда не определена ПОСЛЕ списания
        if (currencyName === 'gold') {
            get().addGold(costAmount, false); // Возврат без учета в тратах
        } else if (currencyName === 'diamonds') {
            get().addDiamonds(costAmount, false); // Возврат без учета в тратах
        }
        // Откатываем инкремент pity
        set(prevState => ({ artifactChestPity: { ...prevState.artifactChestPity, [chestId]: currentPityCounter - 1 } }));
        return { success: false, error: "Ошибка определения награды", awardedItemDetails: null };
    }

    // 3. Обрабатываем выбранную награду
    let rewardProcessingResult = { details: null, obtainedFullArtifact: false };
    const rewardType = chosenRewardFromPool.type;

    if (rewardType === 'gold') {
        const amount = Math.floor(Math.random() * (chosenRewardFromPool.max - chosenRewardFromPool.min + 1)) + chosenRewardFromPool.min;
        get().addGold(amount); // Это получение золота как награды
        rewardProcessingResult.details = { type: 'gold', amount, icon: '/assets/coin-icon.png', name: 'Золото', rarity: 'Common' };
    } else if (rewardType === 'diamonds') {
        const amount = chosenRewardFromPool.amount;
        get().addDiamonds(amount); // Это получение алмазов как награды
        rewardProcessingResult.details = { type: 'diamonds', amount, icon: '/assets/diamond-image.png', name: 'Алмазы', rarity: 'Common' };
    } else if (rewardType === 'full_artifact' || rewardType === 'artifact_shard') {
        targetArtifactRarityFromRoll = chosenRewardFromPool.rarity;
        if (!targetArtifactRarityFromRoll) {
            console.error(`[ArtifactChest] Награда '${rewardType}' не имеет свойства rarity!`, chosenRewardFromPool);
            rewardProcessingResult.details = { type: 'error', name: `Ошибка: ${rewardType} без редкости`, rarity: 'Error' };
        } else {
            const targetArtifactId = _selectRandomArtifactIdOfGivenRarity(targetArtifactRarityFromRoll);
            if (!targetArtifactId) {
                console.error(`[ArtifactChest] Не удалось выбрать ID для ${rewardType} редкости ${targetArtifactRarityFromRoll}. Компенсация.`);
                const compensationAmount = Math.round(costAmount * 0.1); // Пример компенсации от СТОИМОСТИ СУНДУКА
                get().addGold(compensationAmount); // Компенсация золотом
                rewardProcessingResult.details = { type: 'gold', amount: compensationAmount, icon: '/assets/coin-icon.png', name: `Компенсация (${rewardType} ${targetArtifactRarityFromRoll})`, rarity: 'Common' };
            } else {
                rewardProcessingResult = get().processArtifactReward(rewardType, targetArtifactId);
            }
        }
    } else {
        console.warn(`[ArtifactChest] Неизвестный тип награды из пула: ${rewardType}`);
        rewardProcessingResult.details = { type: 'error', name: `Неизвестный тип ${rewardType}`, rarity: 'Error' };
    }

    // 4. Логика сброса гаранта
    if (isPityTriggered) {
        console.log(`[ArtifactChest] Попытка по гаранту была сделана. Сброс гаранта для ${chestId}.`);
        currentPityCounter = 0;
    } else if (rewardType === 'full_artifact' && rewardProcessingResult.obtainedFullArtifact) {
        console.log(`[ArtifactChest] Получен полный артефакт по обычному роллу. Сброс гаранта для ${chestId}.`);
        currentPityCounter = 0;
    }

    // 5. Обновляем состояние (списание валюты УЖЕ произошло)
    set((prevState) => ({
        // [chestData.cost.currency]: prevState[chestData.cost.currency] - costAmount, // <-- ЭТА СТРОКА УДАЛЕНА
        artifactChestPity: { ...prevState.artifactChestPity, [chestId]: currentPityCounter },
        totalArtifactChestsOpened: (prevState.totalArtifactChestsOpened || 0) + 1,
        lastOpenedChestInfo: { chestId: chestId, amount: 1, type: 'artifact', name: chestData.name, icon: chestData.icon },
        lastChestRewards: rewardProcessingResult.details ? [rewardProcessingResult.details] : [],
    }));

    if (chestData.shardPassXp && chestData.shardPassXp > 0) get().addShardPassXp(chestData.shardPassXp);
    get().trackTaskEvent('open_chest', 1, { chestId: chestId, type: 'artifact' });
    get().checkAllAchievements();
    if (rewardProcessingResult.obtainedFullArtifact || rewardType === 'artifact_shard') get().initializeLevelHp();

    console.log(`[ArtifactChest] Открыт: ${chestData.name}. Награда:`, rewardProcessingResult.details);
    return { success: true, awardedItemDetails: rewardProcessingResult.details };
},

openArtifactChestX10: (chestId) => {
    const state = get();
    const chestData = getArtifactChestById(chestId);

    if (!chestData || !chestData.isEnabled) {
        console.error(`[ArtifactChestX10] Сундук ${chestId} не найден или не активен.`);
        return { success: false, error: `Сундук ${chestId} не найден или не активен.`, awardedItemsDetails: [] };
    }

    const currencyName = chestData.cost.currency;
    const pricePerChest = chestData.cost.price;
    const totalCost = pricePerChest * 10;

    // 1. Проверка наличия валюты и ПРЕДВАРИТЕЛЬНОЕ СПИСАНИЕ ОБЩЕЙ СТОИМОСТИ
    if (currencyName === 'gold') {
        if (state.gold < totalCost) {
            alert(`Недостаточно золота! Нужно ${totalCost}.`);
            return { success: false, error: "Недостаточно золота", awardedItemsDetails: [] };
        }
        get().addGold(-totalCost, true); // Списываем золото, учитываем в тратах
    } else if (currencyName === 'diamonds') {
        if (state.diamonds < totalCost) {
            alert(`Недостаточно алмазов! Нужно ${totalCost}.`);
            return { success: false, error: "Недостаточно алмазов", awardedItemsDetails: [] };
        }
        get().addDiamonds(-totalCost, true); // Списываем алмазы, учитываем в тратах
    } else {
        console.error(`[ArtifactChestX10] Неподдерживаемая валюта для списания: ${currencyName} для сундука ${chestId}.`);
        return { success: false, error: `Неподдерживаемая валюта: ${currencyName}`, awardedItemsDetails: [] };
    }

    let workingPityCounter = state.artifactChestPity[chestId] || 0;
    const rewardsDetailed = [];
    let accumulatedShardPassXp = 0;
    let hasObtainedAnyArtifactMaterialInBatch = false;
    let anyErrorInBatch = false; // Флаг для отслеживания ошибок в процессе открытия пачки

    for (let i = 0; i < 10; i++) {
        workingPityCounter++;
        let currentPullChosenReward = null;
        let isThisPullPityTriggered = false;
        let targetArtifactRarityThisPull = null;

        // 2.1. Определяем награду для текущего открытия
        if (chestData.pity && workingPityCounter >= chestData.pity.triggerLimit) {
            console.log(`[ArtifactChestX10 Pull ${i + 1}] Сработал гарант (${workingPityCounter}/${chestData.pity.triggerLimit})`);
            isThisPullPityTriggered = true;
            const pityRarityObject = selectWeightedRewardType(chestData.pity.guaranteedArtifactRarityPool);
            if (pityRarityObject && pityRarityObject.rarity) {
                targetArtifactRarityThisPull = pityRarityObject.rarity;
                currentPullChosenReward = { type: 'full_artifact', rarity: targetArtifactRarityThisPull };
                 console.log(`[ArtifactChestX10 Pull ${i + 1}] Гарант дал редкость: ${targetArtifactRarityThisPull} (для full_artifact)`);
            } else {
                console.error(`[ArtifactChestX10 Pull ${i + 1}] Ошибка определения редкости по гаранту. Возврат к обычному роллу.`);
                currentPullChosenReward = selectWeightedRewardType(chestData.rewardPool);
                isThisPullPityTriggered = false; // Считаем, что гарант не сработал корректно
            }
        } else {
            currentPullChosenReward = selectWeightedRewardType(chestData.rewardPool);
             console.log(`[ArtifactChestX10 Pull ${i + 1}] Обычный ролл:`, currentPullChosenReward);
        }

        if (!currentPullChosenReward) {
            console.error(`[ArtifactChestX10 Pull ${i + 1}] Не удалось определить награду.`);
            rewardsDetailed.push({ type: 'error', name: `Ошибка ролла #${i + 1}`, rarity: 'Error', icon: '/assets/icons/error.png' }); // Пример иконки ошибки
            anyErrorInBatch = true;
            // Важно: если награда не определилась, но это был pity-триггер, pity все равно сбрасывается.
            // Это соответствует вашей исходной логике.
            if (isThisPullPityTriggered) {
                console.log(`[ArtifactChestX10 Pull ${i + 1}] Гарант должен был сработать, но награда не определена. Гарант сброшен.`);
                workingPityCounter = 0;
            }
            continue; // Переходим к следующему сундуку в пачке
        }

        // 2.2. Обрабатываем выбранную награду
        let currentPullProcessingResult = { details: null, obtainedFullArtifact: false };
        const rewardType = currentPullChosenReward.type;

        if (rewardType === 'gold') {
            const amount = Math.floor(Math.random() * (currentPullChosenReward.max - currentPullChosenReward.min + 1)) + currentPullChosenReward.min;
            get().addGold(amount);
            currentPullProcessingResult.details = { type: 'gold', amount, icon: '/assets/coin-icon.png', name: 'Золото', rarity: 'Common' };
        } else if (rewardType === 'diamonds') {
            const amount = currentPullChosenReward.amount;
            get().addDiamonds(amount);
            currentPullProcessingResult.details = { type: 'diamonds', amount, icon: '/assets/diamond-image.png', name: 'Алмазы', rarity: 'Common' };
        } else if (rewardType === 'full_artifact' || rewardType === 'artifact_shard') {
            targetArtifactRarityThisPull = currentPullChosenReward.rarity;
            if (!targetArtifactRarityThisPull) {
                console.error(`[ArtifactChestX10 Pull ${i + 1}] Награда '${rewardType}' не имеет свойства rarity!`, currentPullChosenReward);
                currentPullProcessingResult.details = { type: 'error', name: `Артефакт/осколок без редкости #${i + 1}`, rarity: 'Error', icon: '/assets/icons/error.png' };
                anyErrorInBatch = true;
            } else {
                const targetArtifactId = _selectRandomArtifactIdOfGivenRarity(targetArtifactRarityThisPull);
                if (!targetArtifactId) {
                    console.error(`[ArtifactChestX10 Pull ${i + 1}] Не удалось выбрать ID для ${rewardType} редкости ${targetArtifactRarityThisPull}. Компенсация.`);
                    // Компенсация от СТОИМОСТИ ОДНОГО СУНДУКА (pricePerChest)
                    const compensationAmount = Math.round(pricePerChest * 0.1); 
                    get().addGold(compensationAmount);
                    currentPullProcessingResult.details = { type: 'gold', amount: compensationAmount, icon: '/assets/icons/currency/gold.png', name: `Компенсация (${rewardType} ${targetArtifactRarityThisPull}) #${i + 1}`, rarity: 'Common' };
                } else {
                    currentPullProcessingResult = get().processArtifactReward(rewardType, targetArtifactId);
                    if (!currentPullProcessingResult.details) { // Если processArtifactReward вернул что-то не то
                        anyErrorInBatch = true;
                         console.error(`[ArtifactChestX10 Pull ${i + 1}] Ошибка в processArtifactReward для ${rewardType} ID ${targetArtifactId}.`);
                         currentPullProcessingResult.details = { type: 'error', name: `Ошибка обработки арт. #${i + 1}`, rarity: 'Error', icon: '/assets/icons/error.png' };
                    }
                }
            }
        } else {
            console.warn(`[ArtifactChestX10 Pull ${i + 1}] Неизвестный тип награды: ${rewardType}`);
            currentPullProcessingResult.details = { type: 'error', name: `Неизв. тип #${i + 1}`, rarity: 'Error', icon: '/assets/icons/error.png' };
            anyErrorInBatch = true;
        }

        rewardsDetailed.push(currentPullProcessingResult.details);

        // 2.3. Логика сброса гаранта
        if (isThisPullPityTriggered) {
            console.log(`[ArtifactChestX10 Pull ${i + 1}] Попытка по гаранту была сделана. Сброс рабочего счетчика гаранта.`);
            workingPityCounter = 0;
        } else if (rewardType === 'full_artifact' && currentPullProcessingResult.obtainedFullArtifact) {
            console.log(`[ArtifactChestX10 Pull ${i + 1}] Получен полный артефакт по обычному роллу. Сброс рабочего счетчика гаранта.`);
            workingPityCounter = 0;
        }

        if (currentPullProcessingResult.obtainedFullArtifact || rewardType === 'artifact_shard') {
            hasObtainedAnyArtifactMaterialInBatch = true;
        }
        if (chestData.shardPassXp && chestData.shardPassXp > 0) {
            accumulatedShardPassXp += chestData.shardPassXp;
        }
    } // Конец цикла 10 открытий

    // 3. Обновляем состояние (списание общей валюты УЖЕ произошло)
    set((prevState) => ({
        // [chestData.cost.currency]: prevState[chestData.cost.currency] - totalCost, // <-- ЭТА СТРОКА УДАЛЕНА
        artifactChestPity: { ...prevState.artifactChestPity, [chestId]: workingPityCounter },
        totalArtifactChestsOpened: (prevState.totalArtifactChestsOpened || 0) + 10, // Увеличиваем на 10
        lastOpenedChestInfo: { chestId: chestId, amount: 10, type: 'artifact', name: chestData.name, icon: chestData.icon },
        lastChestRewards: rewardsDetailed,
    }));

    if (accumulatedShardPassXp > 0) get().addShardPassXp(accumulatedShardPassXp);
    get().trackTaskEvent('open_chest', 10, { chestId: chestId, type: 'artifact' });
    get().checkAllAchievements();
    if (hasObtainedAnyArtifactMaterialInBatch) get().initializeLevelHp();

    console.log(`[ArtifactChestX10] Открыт: ${chestData.name}. Награды (${rewardsDetailed.length}): ${rewardsDetailed.map(r => r ? r.name : 'Ошибка').join(', ')}`);
    return { success: !anyErrorInBatch, awardedItemsDetails: rewardsDetailed }; // Успех, если не было ошибок в процессе
},

    clearLastChestData: () => set({ lastChestRewards: null, lastOpenedChestInfo: null }),
    resetLevelRewards: () => { set({ currentLevelRewards: { gold: 0, diamonds: 0, items: [] } }); },
    addLevelReward: (type, amountOrItem) => { // из КОД2
        if (!type || amountOrItem === undefined || amountOrItem === null) return;
        if ((type === 'gold' || type === 'diamonds') && typeof amountOrItem === 'number' && amountOrItem > 0) {
            set((state) => {
                const currentAmount = state.currentLevelRewards[type] || 0;
                const newAmount = currentAmount + amountOrItem;
                return {
                    currentLevelRewards: { ...state.currentLevelRewards, [type]: newAmount }
                };
            });
        }
        else if (type === 'item' && typeof amountOrItem === 'object' && amountOrItem.id) {
            const itemInfo = {
                id: amountOrItem.id, name: amountOrItem.name || 'Предмет',
                rarity: amountOrItem.rarity || 'Common',
                icon: amountOrItem.image || amountOrItem.icon || '/assets/icons/item_default.png'
            };
            set((state) => ({
                currentLevelRewards: {
                    ...state.currentLevelRewards,
                    items: [...state.currentLevelRewards.items, itemInfo],
                }
            }));
        } else {
            console.warn(`[addLevelReward] Неверный тип или значение: ${type}`, amountOrItem);
        }
    },
    openLevelChest: (chestInstanceId, chestTypeId) => { // из КОД2, добавлен trackTaskEvent
        const state = get();
        if (state.levelChestStates[chestInstanceId]) {
            return;
        }
        const chestTypeData = getLevelChestTypeById(chestTypeId);
        if (!chestTypeData) {
            console.error(`[openLevelChest] Не найдены данные для типа сундука: ${chestTypeId}`);
            return;
        }
        const lootTable = chestTypeData.lootTable;
        const generatedRewardsForPopup = [];
        let collectedGoldThisChest = 0;
        let collectedDiamondsThisChest = 0;
        lootTable.guaranteed?.forEach(rewardEntry => {
            if (rewardEntry.type === 'gold' || rewardEntry.type === 'diamonds') {
                const amount = Math.floor(Math.random() * (rewardEntry.max - rewardEntry.min + 1)) + rewardEntry.min;
                if (amount > 0) {
                    if (rewardEntry.type === 'gold') {
                        get().addGold(amount); // Uses modified addGold
                        collectedGoldThisChest += amount;
                    }
                    if (rewardEntry.type === 'diamonds') {
                        get().addDiamonds(amount); // Uses modified addDiamonds
                        collectedDiamondsThisChest += amount;
                    }
                    generatedRewardsForPopup.push({
                        type: rewardEntry.type, amount: amount,
                        name: rewardEntry.type === 'gold' ? 'Золото' : 'Алмазы',
                        icon: rewardEntry.type === 'gold' ? '/assets/icons/currency/gold.png' : '/assets/icons/currency/diamond.png'
                    });
                }
            }
        });
        if (collectedGoldThisChest > 0) get().addLevelReward('gold', collectedGoldThisChest);
        if (collectedDiamondsThisChest > 0) get().addLevelReward('diamonds', collectedDiamondsThisChest);
        if (lootTable.itemDrop && Math.random() < (lootTable.itemDrop.chance || 1.0)) {
            const rarityChances = lootTable.itemDrop.rarityChances;
            try {
                const chosenRarity = _rollWeightedRarity_Gear(rarityChances);
                const itemTemplate = _selectRandomGearItemByRarity_Gear(chosenRarity);
                if (itemTemplate) {
                    get().addItemToInventory(itemTemplate.id, 1); // Uses modified addItemToInventory
                    const itemRewardInfo = {
                        type: 'item', id: itemTemplate.id, name: itemTemplate.name,
                        rarity: itemTemplate.rarity, icon: itemTemplate.image
                    };
                    generatedRewardsForPopup.push(itemRewardInfo);
                    get().addLevelReward('item', itemTemplate);
                } else {
                    console.warn(`  - [Loot] Не удалось выбрать предмет редкости ${chosenRarity} для сундука уровня.`);
                }
            } catch (e) {
                console.error("Ошибка при генерации предмета из сундука уровня:", e);
            }
        }
        set({
            lastOpenedLevelChestRewards: generatedRewardsForPopup,
            levelChestStates: { ...get().levelChestStates, [chestInstanceId]: true }
        });
        get().trackTaskEvent('open_chest', 1);
        const popupDuration = 4000;
        setTimeout(() => {
            get().clearLastLevelChestRewards();
        }, popupDuration);
    },
    clearLastLevelChestRewards: () => { // из КОД2
        if (get().lastOpenedLevelChestRewards !== null) {
            set({ lastOpenedLevelChestRewards: null });
        }
    },
    addDebuff: (debuff) => { // из КОД2
        const newDebuff = {
            ...debuff,
            id: debuff.id || uuidv4(),
            endTime: Date.now() + debuff.durationMs,
        };
        set(state => ({
            activeDebuffs: [...state.activeDebuffs, newDebuff]
        }));
        get().updatePowerLevel();
        get().initializeLevelHp();
    },
    removeDebuff: (debuffId) => { // из КОД2
        let changed = false;
        set(state => {
            const newDebuffs = state.activeDebuffs.filter(d => d.id !== debuffId);
            if (newDebuffs.length !== state.activeDebuffs.length) changed = true;
            return { activeDebuffs: newDebuffs };
        });
        if (changed) {
            get().updatePowerLevel();
            get().initializeLevelHp();
        }
    },
    clearExpiredDebuffs: () => { // из КОД2
        const now = Date.now();
        const currentDebuffs = get().activeDebuffs;
        const activeDebuffs = currentDebuffs.filter(debuff => now < debuff.endTime);
        if (activeDebuffs.length < currentDebuffs.length) {
            set({ activeDebuffs });
            get().updatePowerLevel();
            get().initializeLevelHp();
        }
    },
    setWeakeningAuraStatus: (isActive) => { // из КОД2
        if (get().isAffectedByWeakeningAura !== isActive) {
            set({ isAffectedByWeakeningAura: isActive });
            get().initializeLevelHp();
            get().updatePowerLevel();
        }
    },
    isZoneUnlocked: (zoneId) => { // из КОД2
        const zoneConfig = ALL_ZONES_CONFIG.find(z => z.id === zoneId);
        if (!zoneConfig) {
            console.warn(`[useGameStore] isZoneUnlocked: Конфигурация для зоны ${zoneId} не найдена.`);
            return false;
        }
        if (ALL_ZONES_CONFIG[0]?.id === zoneId || !zoneConfig.unlockCondition) {
            return true;
        }
        const { type, requiredZoneId } = zoneConfig.unlockCondition;
        if (type === 'zone_completed') {
            if (!requiredZoneId) {
                console.warn(`[useGameStore] isZoneUnlocked: Для зоны ${zoneId} условие 'zone_completed' не имеет requiredZoneId.`);
                return false;
            }
            return !!get().completedZones[requiredZoneId];
        }
        return false;
    },
    completeZone: (zoneId) => { // из КОД2
        const zoneConfig = ALL_ZONES_CONFIG.find(z => z.id === zoneId);
        if (!zoneConfig) {
            console.warn(`[useGameStore] completeZone: Конфигурация для зоны ${zoneId} не найдена.`);
            return;
        }
        if (get().completedZones[zoneId]) {
            return;
        }
        set(state => ({
            completedZones: {
                ...state.completedZones,
                [zoneId]: true,
            }
        }));
        console.log(`[useGameStore] Зона ${zoneConfig.name || zoneId} отмечена как пройденная.`);
        get().checkAllAchievements();
    },
    getLevelCompletionStatus: (chapterId, levelId) => { // из КОД2
        const levelKey = `c${chapterId}_l${levelId}`;
        return get().levelsCompleted[levelKey] || { normal: false, hard: false };
    },
    isChapterCompleted: (chapterId, allLevelsInChapter) => { // из КОД2
        if (!allLevelsInChapter || allLevelsInChapter.length === 0) {
            return false;
        }
        for (const level of allLevelsInChapter) {
            const levelKey = `c${chapterId}_l${level.id}`;
            const status = get().levelsCompleted[levelKey];
            if (!status || !status.normal) {
                return false;
            }
        }
        return true;
    },
    isLevelUnlocked: (chapterId, levelId, allLevelsInChapter, allLevelsInPrevChapter = null, prevChapterId = null) => { // из КОД2
        if (!allLevelsInChapter || allLevelsInChapter.length === 0) return false;
        const levelIndex = allLevelsInChapter.findIndex(l => l.id === levelId);
        if (levelIndex === -1) return false;
        if (chapterId === INITIAL_CHAPTER_ID && levelIndex === 0) {
            return true;
        }
        if (levelIndex > 0) {
            const prevLevelInChapter = allLevelsInChapter[levelIndex - 1];
            const prevLevelKey = `c${chapterId}_l${prevLevelInChapter.id}`;
            const prevLevelStatus = get().levelsCompleted[prevLevelKey];
            return !!(prevLevelStatus && prevLevelStatus.normal);
        }
        if (levelIndex === 0 && chapterId !== INITIAL_CHAPTER_ID) {
            if (allLevelsInPrevChapter && prevChapterId !== null) {
                return get().isChapterCompleted(prevChapterId, allLevelsInPrevChapter);
            }
            return false;
        }
        return false;
    },
    isHardModeUnlocked: (chapterId, levelId) => { // из КОД2
        const levelKey = `c${chapterId}_l${levelId}`;
        const status = get().levelsCompleted[levelKey];
        return !!(status && status.normal);
    },
    setIsFullScreenMapActive: (isActive) => { // из КОД2
        set({ isFullScreenMapActive: isActive });
    },
    startScreenTransition: (navigationOrContentChangeCallback, options = {}) => {
        // options может содержать:
        // options.preservesBottomNav: boolean (по умолчанию false)
        // options.onScreenOpened: function (колбэк после полного открытия экрана)

        const { isScreenTransitioning, transitionAction: currentAction } = get();

        // Если уже идет закрытие, и мы пытаемся начать новое закрытие - игнорируем, чтобы не было конфликтов.
        if (isScreenTransitioning && currentAction === 'closing') {
            console.warn("startScreenTransition: Transition 'closing' already in progress. New request ignored.");
            return;
        }

        // Если идет открытие, новый вызов startScreenTransition (который всегда начинает с 'closing')
        // должен его прервать и начать новый цикл закрытия-открытия.
        // Framer Motion AnimatePresence и ключи должны помочь справиться с этим,
        // но важно правильно управлять состоянием в сторе.

        // console.log("startScreenTransition: Phase 1 - Setting to 'closing'. Options:", options);
        set({
            isScreenTransitioning: true,
            transitionAction: 'closing',
            transitionPreservesBottomNav: !!options.preservesBottomNav, // Приводим к boolean
            onTransitionOpenCompleteCallback: null, // Сбрасываем предыдущий колбэк открытия
            onTransitionCloseCompleteCallback: () => { // Этот колбэк будет вызван из TransitionOverlay
                // console.log("startScreenTransition: Phase 2 - 'closing' complete. Navigating.");

                // Получаем актуальный объект колбэка из состояния перед его сбросом
                const currentCloseCallback = get().onTransitionCloseCompleteCallback;
                if (currentCloseCallback) { // Проверяем, что он еще существует (на случай быстрых последовательных вызовов)
                    set({ onTransitionCloseCompleteCallback: null }); // Сбрасываем колбэк в состоянии
                }

                if (typeof navigationOrContentChangeCallback === 'function') {
                    navigationOrContentChangeCallback(); // Выполняем навигацию или смену контента
                }

                // Небольшая задержка перед началом фазы открытия,
                // чтобы React успел обработать изменения после навигации.
                setTimeout(() => {
                    // console.log("startScreenTransition: Phase 3 - Setting to 'opening'.");
                    set({
                        isScreenTransitioning: true, // Переход все еще активен
                        transitionAction: 'opening',
                        // onTransitionCloseCompleteCallback уже null
                        onTransitionOpenCompleteCallback: () => { // Этот колбэк будет вызван из TransitionOverlay
                            // console.log("startScreenTransition: Phase 4 - 'opening' complete.");

                            const currentOpenCallback = get().onTransitionOpenCompleteCallback;
                            if (currentOpenCallback) {
                                set({ onTransitionOpenCompleteCallback: null }); // Сбрасываем колбэк
                            }

                            if (typeof options.onScreenOpened === 'function') {
                                // console.log("startScreenTransition: Calling options.onScreenOpened");
                                options.onScreenOpened();
                            }

                            // console.log("startScreenTransition: Resetting transition state flags.");
                            set({
                                isScreenTransitioning: false,
                                transitionAction: null,
                                // transitionPreservesBottomNav: false, // Сбрасываем, если нужно (или пусть остается до следующего вызова startScreenTransition)
                            });
                        }
                    });
                }, 50); // 50ms задержка, можно подобрать
            }
        });
    },

    ensureScreenIsOpening: (options = {}) => {
        // options может содержать:
        // options.onScreenOpened: function (колбэк после полного открытия экрана)

        const state = get();

        // Если экран не в процессе перехода ИЛИ если он "застрял" в закрытом состоянии,
        // ИЛИ если он уже открывается, но мы хотим "присоединить" или "переопределить" onScreenOpened.
        // Эта функция полезна, если нужно убедиться, что шторки открыты, например, при первой загрузке экрана.

        if (state.isScreenTransitioning && state.transitionAction === 'opening') {
            // console.log("ensureScreenIsOpening: Screen is already in the process of opening.");
            // Если уже открывается, и есть новый options.onScreenOpened,
            // то текущая логика set() ниже переопределит onTransitionOpenCompleteCallback.
            // Это может быть желаемым поведением, если ensureScreenIsOpening вызывается позже
            // и его колбэк более актуален.
        } else if (state.isScreenTransitioning && state.transitionAction === 'closing') {
            // console.warn("ensureScreenIsOpening: Screen is currently closing. Cannot force open yet.");
            // Не стоит пытаться открыть, пока идет закрытие, это может вызвать конфликт.
            // Лучше дождаться завершения закрытия.
            return;
        }

        // console.log("ensureScreenIsOpening: Setting to 'opening'. Options:", options);
        set({
            isScreenTransitioning: true,
            transitionAction: 'opening',
            onTransitionCloseCompleteCallback: null, // Закрытие не предполагается
            onTransitionOpenCompleteCallback: () => {
                // console.log("ensureScreenIsOpening: 'opening' complete.");
                const currentOpenCallback = get().onTransitionOpenCompleteCallback;
                if (currentOpenCallback) {
                    set({ onTransitionOpenCompleteCallback: null }); // Сбрасываем
                }

                if (typeof options.onScreenOpened === 'function') {
                    // console.log("ensureScreenIsOpening: Calling options.onScreenOpened");
                    options.onScreenOpened();
                }

                // console.log("ensureScreenIsOpening: Resetting transition state flags.");
                set({
                    isScreenTransitioning: false,
                    transitionAction: null,
                });
            }
        });
    },

    checkAndResetTreasureChestAttempts: () => set((state) => { // из КОД2
        const nowTs = Date.now();
        const lastResetTs = state.treasureChestLastReset;
        if (!lastResetTs) {
            return { treasureChestAttempts: 3, treasureChestLastReset: nowTs };
        }
        const nowUtcDate = new Date(nowTs);
        let lastRefreshMarkerUtcTs = Date.UTC(
            nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate(),
            RUNE_ATTEMPTS_REFRESH_HOUR_UTC, 0, 0, 0
        );
        if (nowTs < lastRefreshMarkerUtcTs) {
            lastRefreshMarkerUtcTs = Date.UTC(
                nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate() - 1,
                RUNE_ATTEMPTS_REFRESH_HOUR_UTC, 0, 0, 0
            );
        }
        if (lastResetTs < lastRefreshMarkerUtcTs) {
            return {
                treasureChestAttempts: 3,
                treasureChestLastReset: nowTs
            };
        }
        return {};
    }),
    useTreasureChestAttempt: () => set((state) => { // из КОД2
        if (state.treasureChestAttempts > 0) {
            return { treasureChestAttempts: state.treasureChestAttempts - 1 };
        }
        return {};
    }),
    initializeUserFromTelegram: (tgUserData) => { // из КОД2
        if (tgUserData && tgUserData.photo_url) {
            set({ userPhotoUrl: tgUserData.photo_url });
        } else {
            set(state => {
                if (state.userPhotoUrl !== null) {
                    return { userPhotoUrl: null };
                }
                return {};
            });
        }
    },

    // --- Функции сброса задач (из КОД1/КОД2) ---
    checkAndResetDailyTasks: () => set((state) => { // из КОД2, логика идентична КОД1
        const nowTs = Date.now();
        const lastResetTs = state.lastDailyReset;
        if (!lastResetTs) {
            const initialProgress = {};
            (ALL_TASK_DEFINITIONS[TASK_TYPES.DAILY] || []).forEach(task => {
                initialProgress[task.id] = { progress: 0, completed: false, claimed: false };
            });
            return {
                dailyTaskProgress: initialProgress, dailyTaskBarXp: 0, dailyBonusClaimed: false,
                lastDailyReset: nowTs, dailyLoginToday: false, killsToday: 0,
                levelsCompletedToday: 0, gearUpgradedToday: 0, chestsOpenedToday: 0,
            };
        }
        const nowUtcDate = new Date(nowTs);
        let lastRefreshMarkerUtcTs = Date.UTC(
            nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate(),
            DAILY_TASKS_REFRESH_HOUR_UTC, 0, 0, 0
        );
        if (nowTs < lastRefreshMarkerUtcTs) {
            const yesterdayUtcDate = new Date(nowTs - 24 * 60 * 60 * 1000);
            lastRefreshMarkerUtcTs = Date.UTC(
                yesterdayUtcDate.getUTCFullYear(), yesterdayUtcDate.getUTCMonth(), yesterdayUtcDate.getUTCDate(),
                DAILY_TASKS_REFRESH_HOUR_UTC, 0, 0, 0
            );
        }
        if (lastResetTs < lastRefreshMarkerUtcTs) {
            const initialProgress = {};
            (ALL_TASK_DEFINITIONS[TASK_TYPES.DAILY] || []).forEach(task => {
                initialProgress[task.id] = { progress: 0, completed: false, claimed: false };
            });
            return {
                dailyTaskProgress: initialProgress, dailyTaskBarXp: 0, dailyBonusClaimed: false,
                lastDailyReset: nowTs,
                dailyLoginToday: false, killsToday: 0, levelsCompletedToday: 0,
                gearUpgradedToday: 0, chestsOpenedToday: 0,
            };
        }
        return {};
    }),
    checkAndResetWeeklyTasks: () => set((state) => { // из КОД2, логика идентична КОД1
        const nowTs = Date.now();
        const lastResetTs = state.lastWeeklyReset;
        if (!lastResetTs) {
            const initialProgress = {};
            (ALL_TASK_DEFINITIONS[TASK_TYPES.WEEKLY] || []).forEach(task => {
                initialProgress[task.id] = { progress: 0, completed: false, claimed: false };
            });
            return {
                weeklyTaskProgress: initialProgress, weeklyTaskBarXp: 0, weeklyBonusClaimed: false,
                lastWeeklyReset: nowTs, weeklyLoginDays: 0, killsThisWeek: 0,
                levelsCompletedThisWeek: 0, gearUpgradedThisWeek: 0, chestsOpenedThisWeek: 0,
                lastSeenLoginDateForWeekly: null,
            };
        }
        const nowUtcDate = new Date(nowTs);
        const currentUtcDay = nowUtcDate.getUTCDay();
        let daysToLastRefreshDay = (currentUtcDay - WEEKLY_TASKS_REFRESH_DAY_UTC + 7) % 7;
        const lastRefreshDayDate = new Date(Date.UTC(
            nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate() - daysToLastRefreshDay
        ));
        let lastRefreshMarkerUtcTs = Date.UTC(
            lastRefreshDayDate.getUTCFullYear(), lastRefreshDayDate.getUTCMonth(), lastRefreshDayDate.getUTCDate(),
            WEEKLY_TASKS_REFRESH_HOUR_UTC, 0, 0, 0
        );
        if (currentUtcDay === WEEKLY_TASKS_REFRESH_DAY_UTC && nowTs < lastRefreshMarkerUtcTs) {
            const prevRefreshWeekDate = new Date(Date.UTC(
                nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate() - 7
            ));
            lastRefreshMarkerUtcTs = Date.UTC(
                prevRefreshWeekDate.getUTCFullYear(), prevRefreshWeekDate.getUTCMonth(), prevRefreshWeekDate.getUTCDate(),
                WEEKLY_TASKS_REFRESH_HOUR_UTC, 0, 0, 0
            );
        }
        if (lastResetTs < lastRefreshMarkerUtcTs) {
            const initialProgress = {};
            (ALL_TASK_DEFINITIONS[TASK_TYPES.WEEKLY] || []).forEach(task => {
                initialProgress[task.id] = { progress: 0, completed: false, claimed: false };
            });
            return {
                weeklyTaskProgress: initialProgress, weeklyTaskBarXp: 0, weeklyBonusClaimed: false,
                lastWeeklyReset: nowTs, weeklyLoginDays: 0, killsThisWeek: 0,
                levelsCompletedThisWeek: 0, gearUpgradedThisWeek: 0, chestsOpenedThisWeek: 0,
                lastSeenLoginDateForWeekly: null,
            };
        }
        return {};
    }),
    checkAndResetMonthlyTasks: () => set((state) => { // из КОД2, логика идентична КОД1
        const nowTs = Date.now();
        const lastResetTs = state.lastMonthlyReset;
        if (!lastResetTs) {
            const initialProgress = {};
            (ALL_TASK_DEFINITIONS[TASK_TYPES.MONTHLY] || []).forEach(task => {
                initialProgress[task.id] = { progress: 0, completed: false, claimed: false };
            });
            return {
                monthlyTaskProgress: initialProgress, monthlyTaskBarXp: 0, monthlyBonusClaimed: false,
                lastMonthlyReset: nowTs, monthlyLoginDays: 0, killsThisMonth: 0,
                levelsCompletedThisMonth: 0, gearUpgradedThisMonth: 0, chestsOpenedThisMonth: 0,
                lastSeenLoginDateForMonthly: null,
            };
        }
        const nowUtcDate = new Date(nowTs);
        let currentMonthRefreshMarkerUtcTs = Date.UTC(
            nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(),
            MONTHLY_TASKS_REFRESH_DAY_OF_MONTH_UTC,
            MONTHLY_TASKS_REFRESH_HOUR_UTC, 0, 0, 0
        );
        let lastRefreshMarkerUtcTs;
        if (nowTs >= currentMonthRefreshMarkerUtcTs) {
            lastRefreshMarkerUtcTs = currentMonthRefreshMarkerUtcTs;
        } else {
            const prevMonthDate = new Date(Date.UTC(nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth() - 1, 1));
            lastRefreshMarkerUtcTs = Date.UTC(
                prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth(),
                MONTHLY_TASKS_REFRESH_DAY_OF_MONTH_UTC,
                MONTHLY_TASKS_REFRESH_HOUR_UTC, 0, 0, 0
            );
        }
        if (lastResetTs < lastRefreshMarkerUtcTs) {
            const initialProgress = {};
            (ALL_TASK_DEFINITIONS[TASK_TYPES.MONTHLY] || []).forEach(task => {
                initialProgress[task.id] = { progress: 0, completed: false, claimed: false };
            });
            return {
                monthlyTaskProgress: initialProgress, monthlyTaskBarXp: 0, monthlyBonusClaimed: false,
                lastMonthlyReset: nowTs, monthlyLoginDays: 0, killsThisMonth: 0,
                levelsCompletedThisMonth: 0, gearUpgradedThisMonth: 0, chestsOpenedThisMonth: 0,
                lastSeenLoginDateForMonthly: null,
            };
        }
        return {};
    }),

    // trackTaskEvent (из КОД1 - расширенная версия для ShardPass и стандартных задач)
    // trackTaskEvent (расширенная версия)
    trackTaskEvent: (eventType, amount = 1, eventDetails = {}) => {
        // console.log(`[Tasks_TrackEvent_Store] Event: ${eventType}, Amount: ${amount}, Details:`, eventDetails); // Можно оставить для отладки
        const state = get();
        let counterChanges = {};
        const nowForCounters = new Date(); 
        const todayDateString = nowForCounters.toISOString().split('T')[0]; // Формат ГГГГ-ММ-ДД

        // 1. Обновляем периодические счетчики и счетчики для достижений в состоянии (state)
        switch (eventType) {
            case 'login':
                if (!state.dailyLoginToday) {
                    counterChanges.dailyLoginToday = true;
                }
                // Для еженедельных задач
                if (state.lastSeenLoginDateForWeekly !== todayDateString) {
                    counterChanges.weeklyLoginDays = (state.weeklyLoginDays || 0) + 1;
                    counterChanges.lastSeenLoginDateForWeekly = todayDateString;
                }
                // Для ежемесячных задач
                if (state.lastSeenLoginDateForMonthly !== todayDateString) {
                    counterChanges.monthlyLoginDays = (state.monthlyLoginDays || 0) + 1;
                    counterChanges.lastSeenLoginDateForMonthly = todayDateString;
                }

                // VVV НОВОЕ: Логика для уникальных дней входа (для достижений) VVV
                if (state.lastLoginDateForUniqueCount !== todayDateString) {
                    counterChanges.uniqueLoginDaysCount = (state.uniqueLoginDaysCount || 0) + 1;
                    counterChanges.lastLoginDateForUniqueCount = todayDateString;
                    console.log(`[LoginTracker] Unique login day ${counterChanges.uniqueLoginDaysCount} recorded on ${todayDateString}`);
                }
                // ^^^ КОНЕЦ НОВОЙ ЛОГИКИ ^^^
                break;
            // ... (остальные case остаются без изменений) ...
            case 'kill_monster':
                counterChanges.killsToday = (state.killsToday || 0) + amount;
                counterChanges.killsThisWeek = (state.killsThisWeek || 0) + amount;
                counterChanges.killsThisMonth = (state.killsThisMonth || 0) + amount;
                // state.totalKills обновляется в incrementKills, здесь не дублируем
                break;
            case 'complete_level':
                counterChanges.levelsCompletedToday = (state.levelsCompletedToday || 0) + amount;
                counterChanges.levelsCompletedThisWeek = (state.levelsCompletedThisWeek || 0) + amount;
                counterChanges.levelsCompletedThisMonth = (state.levelsCompletedThisMonth || 0) + amount;
                // state.levelsCompleted (для уникальных уровней) обновляется в completeLevelAction
                break;
            case 'upgrade_gear':
                counterChanges.gearUpgradedToday = (state.gearUpgradedToday || 0) + amount;
                counterChanges.gearUpgradedThisWeek = (state.gearUpgradedThisWeek || 0) + amount;
                counterChanges.gearUpgradedThisMonth = (state.gearUpgradedThisMonth || 0) + amount;
                break;
            case 'open_chest':
                counterChanges.chestsOpenedToday = (state.chestsOpenedToday || 0) + amount;
                counterChanges.chestsOpenedThisWeek = (state.chestsOpenedThisWeek || 0) + amount;
                counterChanges.chestsOpenedThisMonth = (state.chestsOpenedThisMonth || 0) + amount;
                // state.totalGearChestsOpened и totalArtifactChestsOpened обновляются в open...Chest функциях
                break;
            case 'forge_item':
                counterChanges.itemsForgedToday = (state.itemsForgedToday || 0) + amount;
                counterChanges.itemsForgedThisWeek = (state.itemsForgedThisWeek || 0) + amount;
                counterChanges.itemsForgedThisMonth = (state.itemsForgedThisMonth || 0) + amount;
                break;
            // Можно добавить case 'spend_gold', 'spend_diamonds' и т.д., если задачи будут это отслеживать напрямую,
            // либо эти события будут триггериться из addGold/addDiamonds, если isSpending=true.
            // Сейчас эти траты для достижений отслеживаются через отдельные статы totalGoldSpent и т.д.
        }

        if (Object.keys(counterChanges).length > 0) {
            set(counterChanges);
        }

        const updatedState = get(); 
        // 2. Обновляем прогресс Daily/Weekly/Monthly задач
        let newDailyProgress = { ...updatedState.dailyTaskProgress };
        let newWeeklyProgress = { ...updatedState.weeklyTaskProgress };
        let newMonthlyProgress = { ...updatedState.monthlyTaskProgress };
        let anyStandardTaskProgressChanged = false;

        const standardTaskProcessingLogic = (taskDef, progressObject, taskType) => {
            // ... (ваша существующая логика standardTaskProcessingLogic, она должна корректно работать
            //      с новыми счетчиками itemsForgedToday и т.д., если задачи на них ссылаются,
            //      ИЛИ если задачи на 'forge_item' являются инкрементальными)
            // Пример условия из вашего кода, которое нужно проверить и дополнить при необходимости:
            const taskState = progressObject[taskDef.id] || { progress: 0, completed: false, initialStatValue: 0 };
            if (taskState.completed) return false;
            let currentEventValueForTask = 0;
            let taskAffectedByThisEvent = false;

            if (taskDef.eventTracked === eventType ||
                (eventType === 'login' && (taskDef.eventTracked === 'dailyLoginToday' || taskDef.eventTracked === 'weeklyLoginDays' || taskDef.eventTracked === 'monthlyLoginDays')) ||
                (eventType === 'kill_monster' && (taskDef.eventTracked === 'killsToday' || taskDef.eventTracked === 'killsThisWeek' || taskDef.eventTracked === 'killsThisMonth' || taskDef.eventTracked === 'totalKills')) ||
                (eventType === 'complete_level' && (taskDef.eventTracked === 'levelsCompletedToday' || taskDef.eventTracked === 'levelsCompletedThisWeek' || taskDef.eventTracked === 'levelsCompletedThisMonth')) ||
                (eventType === 'upgrade_gear' && (taskDef.eventTracked === 'gearUpgradedToday' || taskDef.eventTracked === 'gearUpgradedThisWeek' || taskDef.eventTracked === 'gearUpgradedThisMonth')) ||
                (eventType === 'open_chest' && (taskDef.eventTracked === 'chestsOpenedToday' || taskDef.eventTracked === 'chestsOpenedThisWeek' || taskDef.eventTracked === 'chestsOpenedThisMonth')) ||
                (eventType === 'forge_item' && (taskDef.eventTracked === 'itemsForgedToday' || taskDef.eventTracked === 'itemsForgedThisWeek' || taskDef.eventTracked === 'itemsForgedThisMonth'))
            ) {
                taskAffectedByThisEvent = true;
                if (updatedState.hasOwnProperty(taskDef.eventTracked)) {
                    currentEventValueForTask = updatedState[taskDef.eventTracked] || 0;
                    if (taskDef.eventTracked === 'dailyLoginToday') {
                        currentEventValueForTask = updatedState.dailyLoginToday ? 1 : 0;
                    }
                } else if (taskDef.eventTracked === eventType && taskDef.countIncrementally) {
                    currentEventValueForTask = (taskState.progress || 0) + amount;
                } else if (taskDef.eventTracked === eventType) {
                    currentEventValueForTask = amount;
                }
            }

            if (taskAffectedByThisEvent) {
                currentEventValueForTask = Number(currentEventValueForTask) || 0;
                const newProgress = Math.min(currentEventValueForTask, taskDef.target);
                if (newProgress !== taskState.progress || (newProgress >= taskDef.target && !taskState.completed)) {
                    progressObject[taskDef.id] = {
                        ...taskState,
                        progress: newProgress,
                        completed: newProgress >= taskDef.target
                    };
                    if (progressObject[taskDef.id].completed && !taskState.completed) {
                        console.log(`[Tasks_Standard] ${taskType} task '${taskDef.id}' COMPLETED!`);
                    }
                    return true;
                }
            }
            return false;
        };
        // Применение standardTaskProcessingLogic (ваш существующий цикл)
        [TASK_TYPES.DAILY, TASK_TYPES.WEEKLY, TASK_TYPES.MONTHLY].forEach(taskType => {
            const definitions = ALL_TASK_DEFINITIONS[taskType] || []; // Убедитесь, что ALL_TASK_DEFINITIONS и TASK_TYPES доступны
            let progressMap;
            if (taskType === TASK_TYPES.DAILY) progressMap = newDailyProgress;
            else if (taskType === TASK_TYPES.WEEKLY) progressMap = newWeeklyProgress;
            else if (taskType === TASK_TYPES.MONTHLY) progressMap = newMonthlyProgress;
            else return;

            definitions.forEach(taskDef => {
                if (taskDef.eventTracked) {
                    if (standardTaskProcessingLogic(taskDef, progressMap, taskType)) {
                        anyStandardTaskProgressChanged = true;
                    }
                }
            });
        });
        if (anyStandardTaskProgressChanged) {
            set({
                dailyTaskProgress: newDailyProgress,
                weeklyTaskProgress: newWeeklyProgress,
                monthlyTaskProgress: newMonthlyProgress,
            });
        }


        // 3. Обновляем прогресс ShardPass задач
        let newShardPassTasksProgressFromEvent = JSON.parse(JSON.stringify(updatedState.shardPassTasksProgress)); // Используем другое имя переменной, чтобы не было конфликта имен
        let anyShardPassTaskProgressChangedThisEvent = false; // Аналогично

        const currentTimeMs = new Date().getTime(); // Текущее время для сравнения

        Object.keys(shardPassTaskDefinitionsByWeek).forEach(weekKeyString => {
            const weekNumInt = parseInt(weekKeyString, 10);

            // --- ОСНОВНОЕ ИЗМЕНЕНИЕ ЛОГИКИ ЗДЕСЬ ---
            // Получаем время начала текущей недели в цикле
            const weekUnlockTimestamp = getUnlockDateTimeForWeek(weekNumInt, SEASON_START_DATE_UTC).getTime();

            // Пропускаем обработку задач для недель, которые еще не начались
            if (currentTimeMs < weekUnlockTimestamp) {
                // console.log(`[Tasks_ShardPass] Week ${weekKeyString} has not unlocked yet. Skipping.`);
                return; // Переходим к следующей неделе в цикле forEach
            }
            // --- КОНЕЦ ОСНОВНОГО ИЗМЕНЕНИЯ ЛОГИКИ ---

            // Если мы дошли сюда, значит неделя weekKeyString уже активна или прошла
            // и ее задачи могут быть выполнены или "довыполнены".

            if (!newShardPassTasksProgressFromEvent[weekKeyString]) {
                newShardPassTasksProgressFromEvent[weekKeyString] = {};
            }

            if (shardPassTaskDefinitionsByWeek[weekKeyString]) {
                shardPassTaskDefinitionsByWeek[weekKeyString].forEach(taskDef => {
                    let spTaskState = newShardPassTasksProgressFromEvent[weekKeyString][taskDef.id];
                    if (!spTaskState) {
                        spTaskState = {
                            progress: 0,
                            isClaimed: false,
                            ...(taskDef.eventTracked === 'login' && { lastCountedLoginDate: null })
                        };
                        newShardPassTasksProgressFromEvent[weekKeyString][taskDef.id] = spTaskState;
                    } else if (taskDef.eventTracked === 'login' && spTaskState.lastCountedLoginDate === undefined) {
                        spTaskState.lastCountedLoginDate = null;
                    }

                    if (spTaskState.isClaimed) return;

                    if (taskDef.eventTracked === eventType) {
                        let matchCondition = true;
                        if (taskDef.condition) {
                            matchCondition = Object.keys(taskDef.condition).every(key =>
                                eventDetails.hasOwnProperty(key) && eventDetails[key] === taskDef.condition[key]
                            );
                        }

                        if (matchCondition) {
                            if (taskDef.eventTracked === 'login') {
                                if ((spTaskState.progress || 0) < taskDef.targetProgress) {
                                    const todayForLoginTask = new Date().toISOString().split('T')[0];
                                    if (spTaskState.lastCountedLoginDate !== todayForLoginTask) {
                                        const newProgressLogin = (spTaskState.progress || 0) + 1;
                                        newShardPassTasksProgressFromEvent[weekKeyString][taskDef.id] = {
                                            ...spTaskState,
                                            progress: newProgressLogin,
                                            lastCountedLoginDate: todayForLoginTask,
                                        };
                                        anyShardPassTaskProgressChangedThisEvent = true;
                                        console.log(`[Tasks_ShardPass_Login] Task '${taskDef.id}' (Week ${weekKeyString}) progress: ${newProgressLogin}/${taskDef.targetProgress}`);
                                    }
                                }
                            } else {
                                const currentProgress = spTaskState.progress || 0;
                                const newProgress = Math.min(currentProgress + amount, taskDef.targetProgress);

                                if (newProgress !== currentProgress || (newProgress === taskDef.targetProgress && currentProgress < taskDef.targetProgress)) {
                                    newShardPassTasksProgressFromEvent[weekKeyString][taskDef.id] = {
                                        ...spTaskState,
                                        progress: newProgress,
                                    };
                                    anyShardPassTaskProgressChangedThisEvent = true;
                                    console.log(`[Tasks_ShardPass] Task '${taskDef.id}' (Week ${weekKeyString}) progress: ${newProgress}/${taskDef.targetProgress}`);
                                }
                            }
                        }
                    }
                });
            }
        });

        if (anyShardPassTaskProgressChangedThisEvent) {
            set({ shardPassTasksProgress: newShardPassTasksProgressFromEvent });
        }

        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
    },
    claimTaskReward: (taskType, taskId) => { // из КОД2/КОД1
        const state = get();
        let progressObjectKey, taskBarXpKey, taskDefinitionsForType;
        let changesToSet = {};

        if (taskType === TASK_TYPES.DAILY) {
            progressObjectKey = 'dailyTaskProgress'; taskBarXpKey = 'dailyTaskBarXp';
            taskDefinitionsForType = ALL_TASK_DEFINITIONS[TASK_TYPES.DAILY];
        } else if (taskType === TASK_TYPES.WEEKLY) {
            progressObjectKey = 'weeklyTaskProgress'; taskBarXpKey = 'weeklyTaskBarXp';
            taskDefinitionsForType = ALL_TASK_DEFINITIONS[TASK_TYPES.WEEKLY];
        } else if (taskType === TASK_TYPES.MONTHLY) {
            progressObjectKey = 'monthlyTaskProgress'; taskBarXpKey = 'monthlyTaskBarXp';
            taskDefinitionsForType = ALL_TASK_DEFINITIONS[TASK_TYPES.MONTHLY];
        } else {
            console.error(`[Tasks] Unknown taskType for claim: ${taskType}`); return;
        }

        const currentTaskProgressMap = state[progressObjectKey];
        const taskState = currentTaskProgressMap ? currentTaskProgressMap[taskId] : null;
        const taskDef = taskDefinitionsForType ? taskDefinitionsForType.find(t => t.id === taskId) : null;

        if (taskState && taskDef && taskState.completed && !taskState.claimed) {
            console.log(`[Tasks] Claiming reward for ${taskType} task: ${taskId}`);
            if (taskDef.reward) {
                if (taskDef.reward.diamonds) get().addDiamonds(taskDef.reward.diamonds); // Uses modified addDiamonds
                if (taskDef.reward.gold) get().addGold(taskDef.reward.gold); // Uses modified addGold
                // Add item rewards if defined
            }
            const newProgressMap = { ...state[progressObjectKey], [taskId]: { ...taskState, claimed: true } };
            changesToSet[progressObjectKey] = newProgressMap;
            const newXp = (state[taskBarXpKey] || 0) + (taskDef.xp || 0);
            changesToSet[taskBarXpKey] = newXp;
            if (Object.keys(changesToSet).length > 0) set(changesToSet);
            get().checkAllAchievements();
            get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        }
    },
    claimBonusReward: (taskType) => { // из КОД2/КОД1
        const state = get();
        const bonusConfig = BONUS_REWARDS_CONFIG[taskType];
        if (!bonusConfig) { console.error(`[Tasks] No bonus config for taskType: ${taskType}`); return; }
        let taskBarXpKey, bonusClaimedKey;
        if (taskType === TASK_TYPES.DAILY) {
            taskBarXpKey = 'dailyTaskBarXp'; bonusClaimedKey = 'dailyBonusClaimed';
        } else if (taskType === TASK_TYPES.WEEKLY) {
            taskBarXpKey = 'weeklyTaskBarXp'; bonusClaimedKey = 'weeklyBonusClaimed';
        } else if (taskType === TASK_TYPES.MONTHLY) {
            taskBarXpKey = 'monthlyTaskBarXp'; bonusClaimedKey = 'monthlyBonusClaimed';
        } else {
            console.error(`[Tasks] Unknown taskType for bonus reward: ${taskType}`); return;
        }
        let changesToSet = {};
        if ((state[taskBarXpKey] || 0) >= bonusConfig.xpRequired && !state[bonusClaimedKey]) {
            console.log(`[Tasks] Claiming BONUS reward for ${taskType} tasks!`);
            const reward = bonusConfig.reward;
            if (reward.type === 'item_key' && reward.itemId) {
                // get().addItemToInventory(reward.itemId, reward.quantity || 1); // Uses modified addItemToInventory
                console.warn(`[Tasks] Bonus item_key: ${reward.name || reward.itemId} x${reward.quantity || 1}. Implement properly`);
            } else if (reward.type === 'currency' && reward.currencyId) {
                if (reward.currencyId === 'diamonds') get().addDiamonds(reward.quantity); // Uses modified addDiamonds
                else if (reward.currencyId === 'gold') get().addGold(reward.quantity); // Uses modified addGold
                else if (reward.currencyId === 'toncoin_shards') get().addToncoinShards(reward.quantity); // Uses modified addToncoinShards
            }
            changesToSet[bonusClaimedKey] = true;
            set(changesToSet);
            get().checkAllAchievements();
            get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        }
    },

    // --- НОВЫЕ ACTIONS ДЛЯ SHARDPASS (из КОД1) ---
    purchaseShardPassPremium: () => {
        const currentPremiumStatus = get().isShardPassPremium;
        if (currentPremiumStatus) {
            console.log("ShardPass Premium is already active.");
            return { success: false, message: "Премиум уже активен." };
        }
        // Logic for currency deduction can be added here
        set({ isShardPassPremium: true });
        console.log("ShardPass Premium purchased and activated!");
        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        return { success: true, message: "ShardPass Premium успешно активирован!" };
    },
    addShardPassXp: (xpToAdd) => { // Используем одну версию addShardPassXp (более подробную)
        set((state) => {
            if (state.shardPassCurrentLevel >= state.shardPassMaxLevel) {
                console.log("[ShardPass] Max level reached. No XP added.");
                return {};
            }

            let newCurrentXp = state.shardPassCurrentXp + xpToAdd;
            let newCurrentLevel = state.shardPassCurrentLevel;
            let levelsGained = 0;

            while (newCurrentXp >= state.shardPassXpPerLevel && newCurrentLevel < state.shardPassMaxLevel) {
                newCurrentXp -= state.shardPassXpPerLevel;
                newCurrentLevel++;
                levelsGained++;
                console.log(`[ShardPass] Leveled up! New level: ${newCurrentLevel}`);
            }

            if (newCurrentLevel >= state.shardPassMaxLevel) {
                newCurrentXp = 0; // Или state.shardPassXpPerLevel, если хотите показывать полную полоску
                if (newCurrentLevel > state.shardPassMaxLevel) newCurrentLevel = state.shardPassMaxLevel; // Убедимся, что не превышаем макс. уровень
                console.log(`[ShardPass] Max level ${state.shardPassMaxLevel} reached.`);
            }

            const changes = {
                shardPassCurrentXp: newCurrentXp,
                shardPassCurrentLevel: newCurrentLevel,
            };
            return changes;
        });

        if (get().setHasClaimableRewardsIndicator && get().checkIfAnyTaskOrAchievementIsClaimable) {
            get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        }
    },

    claimShardPassReward: (level, isPremiumTrack) => {
        const state = get();
        const rewardKey = `level_${level}_${isPremiumTrack ? 'premium' : 'free'}`;
        if (level > state.shardPassCurrentLevel) {
            return { success: false, message: "Уровень еще не достигнут." };
        }
        if (isPremiumTrack && !state.isShardPassPremium) {
            return { success: false, message: "Требуется ShardPass Premium." };
        }
        if (state.shardPassRewardsClaimed[rewardKey]) {
            return { success: false, message: "Награда уже получена." };
        }
        const levelDefinition = shardPassSeasonDefinitions.levels.find(l => l.level === level);
        if (!levelDefinition) {
            return { success: false, message: "Ошибка определения награды." };
        }
        const rewardToClaim = isPremiumTrack ? levelDefinition.premiumReward : levelDefinition.freeReward;
        if (!rewardToClaim) {
            return { success: false, message: "Награда не определена для этого уровня/типа." };
        }
        console.log(`[ShardPass] Claiming reward: ${rewardToClaim.name || 'Reward'} (Level ${level}, ${isPremiumTrack ? 'Premium' : 'Free'})`);
        if (rewardToClaim.type === 'gold') get().addGold(rewardToClaim.amount);
        else if (rewardToClaim.type === 'diamonds') get().addDiamonds(rewardToClaim.amount);
        else if (rewardToClaim.type === 'toncoin_shards') get().addToncoinShards(rewardToClaim.amount);
        else if (rewardToClaim.type === 'item' && rewardToClaim.itemId) get().addItemToInventory(rewardToClaim.itemId, rewardToClaim.amount || 1);
        else if (rewardToClaim.type === 'energy') get().addEnergy(rewardToClaim.amount);
        else if (rewardToClaim.type === REWARD_TYPES.RARE_CHEST_KEY) get().addKeys(REWARD_TYPES.RARE_CHEST_KEY, rewardToClaim.amount || 1);
        else if (rewardToClaim.type === REWARD_TYPES.EPIC_CHEST_KEY) get().addKeys(REWARD_TYPES.EPIC_CHEST_KEY, rewardToClaim.amount || 1);
        else {
            console.warn(`[ShardPass] Unknown reward type or missing data for ${rewardKey}:`, rewardToClaim);
        }
        set(prevState => ({
            shardPassRewardsClaimed: {
                ...prevState.shardPassRewardsClaimed,
                [rewardKey]: true,
            }
        }));
        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        return { success: true, message: `Награда "${rewardToClaim.name || 'N/A'}" получена!`, reward: rewardToClaim };
    },
    claimAllShardPassRewards: () => {
        const state = get();
        const claimedRewardsList = [];
        let changesMade = false;
        shardPassSeasonDefinitions.levels.forEach(levelDef => {
            if (levelDef.level <= state.shardPassCurrentLevel) {
                const freeRewardKey = `level_${levelDef.level}_free`;
                if (levelDef.freeReward && !state.shardPassRewardsClaimed[freeRewardKey]) {
                    const result = get().claimShardPassReward(levelDef.level, false);
                    if (result.success && result.reward) {
                        claimedRewardsList.push(result.reward);
                        changesMade = true;
                    }
                }
                if (state.isShardPassPremium) {
                    const premiumRewardKey = `level_${levelDef.level}_premium`;
                    if (levelDef.premiumReward && !state.shardPassRewardsClaimed[premiumRewardKey]) {
                        const result = get().claimShardPassReward(levelDef.level, true);
                        if (result.success && result.reward) {
                            claimedRewardsList.push(result.reward);
                            changesMade = true;
                        }
                    }
                }
            }
        });
        if (!changesMade) {
            console.log("[ShardPass] No new rewards to claim with Claim All.");
        }
        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        return claimedRewardsList;
    },
    claimShardPassTaskReward: (weekNumber, taskId) => {
        const state = get();
        const weekKey = String(weekNumber);
        const taskDef = shardPassTaskDefinitionsByWeek[weekKey]?.find(t => t.id === taskId);
        if (!taskDef) {
            return { success: false, message: "Задача не найдена." };
        }
        const taskProgressState = state.shardPassTasksProgress[weekKey]?.[taskId];
        if (!taskProgressState) {
            return { success: false, message: "Состояние задачи не найдено." };
        }
        if (taskDef.isPremium && !state.isShardPassPremium) {
            return { success: false, message: "Требуется ShardPass Premium для получения награды за это задание." };
        }
        if (taskProgressState.isClaimed) {
            return { success: false, message: "Награда за задание уже получена." };
        }
        if (taskProgressState.progress < taskDef.targetProgress) {
            return { success: false, message: "Задание еще не выполнено." };
        }
        get().addShardPassXp(taskDef.rewardXP);
        set(prevState => {
            const newTasksProgress = JSON.parse(JSON.stringify(prevState.shardPassTasksProgress));
            if (!newTasksProgress[weekKey]) newTasksProgress[weekKey] = {};
            newTasksProgress[weekKey][taskId] = {
                ...newTasksProgress[weekKey][taskId],
                isClaimed: true,
            };
            return { shardPassTasksProgress: newTasksProgress };
        });
        console.log(`[ShardPass_Tasks] Reward claimed for Task ID ${taskId} (Week ${weekKey}). XP: +${taskDef.rewardXP}`);
        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        return { success: true, message: `Награда за задание "${taskDef.name}" получена! (+${taskDef.rewardXP} XP)` };
    },

    // VVV НОВЫЕ ACTIONS ДЛЯ TRIALS VVV
    markTrialActionTaken: (trialId) => {
        const trialDef = trialsData.find(t => t.id === trialId);
        if (!trialDef) {
            console.warn(`[Trials] Trial definition not found for ID: ${trialId}`);
            return;
        }
        set(state => {
            const currentTrialStatus = state.trialsStatus[trialId] || { actionTaken: false, rewardClaimed: false };
            if (currentTrialStatus.actionTaken && !trialDef.isRecurring) { // Если действие уже предпринято и триал не повторяемый
                console.log(`[Trials] Action for trial ${trialId} already taken.`);
                return {}; // Не меняем состояние
            }
            return {
                trialsStatus: {
                    ...state.trialsStatus,
                    [trialId]: { ...currentTrialStatus, actionTaken: true }
                }
            };
        });
        // После отметки действия, проверяем, не стали ли доступны награды
        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
    },

    claimTrialReward: (trialId) => {
        const trialDef = trialsData.find(t => t.id === trialId);
        if (!trialDef) {
            console.warn(`[Trials] Trial definition not found for ID: ${trialId} during claim.`);
            return { success: false, message: "Испытание не найдено." };
        }

        const state = get();
        const currentTrialStatus = state.trialsStatus[trialId] || { actionTaken: false, rewardClaimed: false };

        if (!currentTrialStatus.actionTaken) {
            console.warn(`[Trials] Cannot claim reward for ${trialId}: action not yet taken.`);
            return { success: false, message: "Сначала выполните действие." };
        }
        if (currentTrialStatus.rewardClaimed && !trialDef.isRecurring) { // Если награда уже получена и триал не повторяемый
            console.warn(`[Trials] Reward for ${trialId} already claimed.`);
            return { success: false, message: "Награда уже получена." };
        }

        // Выдача награды
        const reward = trialDef.reward;
        let rewardGiven = false;
        if (reward) {
            console.log(`[Trials] Claiming reward for ${trialId}:`, reward);
            if (reward.type === 'gold') { get().addGold(reward.amount); rewardGiven = true; }
            else if (reward.type === 'diamonds') { get().addDiamonds(reward.amount); rewardGiven = true; }
            else if (reward.type === 'toncoin_shards') { get().addToncoinShards(reward.amount); rewardGiven = true; }
            else if (reward.type === REWARD_TYPES.RARE_CHEST_KEY || reward.type === 'rareChestKeys') { get().addKeys(REWARD_TYPES.RARE_CHEST_KEY, reward.amount || 1); rewardGiven = true; }
            else if (reward.type === REWARD_TYPES.EPIC_CHEST_KEY || reward.type === 'epicChestKeys') { get().addKeys(REWARD_TYPES.EPIC_CHEST_KEY, reward.amount || 1); rewardGiven = true; }
            // Добавь другие типы наград, если они есть (например, предметы, специальные сундуки)
            // else if (reward.type === 'item' && reward.itemId) { get().addItemToInventory(reward.itemId, reward.amount || 1); rewardGiven = true; }
            else {
                console.warn(`[Trials] Unknown reward type or missing data for trial ${trialId}:`, reward);
            }
        }
        
        if (!rewardGiven && !trialDef.isRecurring) { // Если нет награды или она не была распознана, и триал не повторяемый, не меняем статус claimed
             console.warn(`[Trials] No reward processed for non-recurring trial ${trialId}. Status not changed to claimed.`);
             return { success: false, message: "Награда не определена или не обработана." };
        }


        set(prevState => {
            const newStatus = {
                ...prevState.trialsStatus,
                [trialId]: {
                    ...currentTrialStatus,
                    // Для повторяемых заданий, actionTaken можно сбросить, если это подразумевается логикой
                    actionTaken: trialDef.isRecurring ? false : true, 
                    rewardClaimed: true
                }
            };
             // Если задание повторяемое и должно полностью сбрасываться после получения награды
            if (trialDef.isRecurring && trialDef.resetsAfterClaim) {
                 newStatus[trialId] = { actionTaken: false, rewardClaimed: false };
            }

            return { trialsStatus: newStatus };
        });
        
        // Опыт за Trials не добавляется, как было указано.
        // if (trialDef.xpGain) { get().addAchievementXp(trialDef.xpGain); } // Глобальный опыт достижений

        get().checkAllAchievements(); // На всякий случай, если награда триала влияет на ачивки
        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        return { success: true, message: `Награда за "${trialDef.name}" получена!` };
    },
    // ^^^ КОНЕЦ НОВЫХ ACTIONS ДЛЯ TRIALS ^^^

    // checkIfAnyTaskOrAchievementIsClaimable (из КОД1 - расширенная версия)
checkIfAnyTaskOrAchievementIsClaimable: () => {
        const state = get();

        // 1. Проверка стандартных задач (Daily, Weekly, Monthly) и их бонусных наград
        const taskTypes = [TASK_TYPES.DAILY, TASK_TYPES.WEEKLY, TASK_TYPES.MONTHLY];
        for (const taskType of taskTypes) {
            const progressKey = `${taskType.toLowerCase()}TaskProgress`;
            const taskProgressMap = state[progressKey];
            if (taskProgressMap) {
                for (const taskId in taskProgressMap) {
                    if (taskProgressMap[taskId].completed && !taskProgressMap[taskId].claimed) {
                        // console.log(`[ClaimableCheck] Standard Task: ${taskType} - ${taskId}`);
                        return true;
                    }
                }
            }
            const bonusConfig = BONUS_REWARDS_CONFIG[taskType];
            if (bonusConfig) {
                const xpKey = `${taskType.toLowerCase()}TaskBarXp`;
                const claimedKey = `${taskType.toLowerCase()}BonusClaimed`;
                if ((state[xpKey] || 0) >= bonusConfig.xpRequired && !state[claimedKey]) {
                    // console.log(`[ClaimableCheck] Standard Task Bonus: ${taskType}`);
                    return true;
                }
            }
        }

        // 2. Проверка Достижений (Trophies - многоуровневые)
        // achievementsData должен быть импортирован и содержать новую структуру
        if (achievementsData && state.achievementsStatus) {
            for (const achLine of achievementsData) { // achLine - это линия достижений
                const status = state.achievementsStatus[achLine.id];
                // Достижение можно забрать, если самый высокий достигнутый уровень выше, чем последний забраный
                if (status && status.highestReachedLevel > status.claimedRewardsUpToLevel) {
                    // console.log(`[ClaimableCheck] Trophy: ${achLine.id} (Level ${status.claimedRewardsUpToLevel + 1} or higher)`);
                    return true;
                }
            }
        }

        // 3. Проверка Испытаний (Trials)
        // trialsData должен быть импортирован
        if (trialsData && state.trialsStatus) {
            for (const trial of trialsData) {
                const status = state.trialsStatus[trial.id];
                // Испытание можно забрать, если действие выполнено и награда еще не получена
                if (status && status.actionTaken && !status.rewardClaimed) {
                    // console.log(`[ClaimableCheck] Trial: ${trial.id}`);
                    return true;
                }
            }
        }

        // 4. Проверка наград ShardPass (уровни)
        if (shardPassSeasonDefinitions && state.shardPassRewardsClaimed) {
            for (const levelDef of shardPassSeasonDefinitions.levels) {
                if (levelDef.level <= state.shardPassCurrentLevel) {
                    const freeKey = `level_${levelDef.level}_free`;
                    if (levelDef.freeReward && !state.shardPassRewardsClaimed[freeKey]) {
                        // console.log(`[ClaimableCheck] ShardPass Level Free: ${levelDef.level}`);
                        return true;
                    }
                    if (state.isShardPassPremium) {
                        const premiumKey = `level_${levelDef.level}_premium`;
                        if (levelDef.premiumReward && !state.shardPassRewardsClaimed[premiumKey]) {
                            // console.log(`[ClaimableCheck] ShardPass Level Premium: ${levelDef.level}`);
                            return true;
                        }
                    }
                }
            }
        }

        // 5. Проверка задач ShardPass (еженедельные)
        if (shardPassTaskDefinitionsByWeek && state.shardPassTasksProgress) {
            for (const weekKey in shardPassTaskDefinitionsByWeek) {
                // Убедимся, что неделя активна (если такая логика есть, если нет - проверяем все)
                // const weekNumInt = parseInt(weekKey, 10);
                // const weekUnlockTimestamp = getUnlockDateTimeForWeek(weekNumInt, new Date(state.shardPassSeasonStartDateUTC)).getTime();
                // if (Date.now() < weekUnlockTimestamp) continue; // Пропускаем еще не активные недели

                const weekTasks = shardPassTaskDefinitionsByWeek[weekKey];
                const weekProgress = state.shardPassTasksProgress[weekKey];
                if (weekTasks && weekProgress) {
                    for (const taskDef of weekTasks) {
                        const taskState = weekProgress[taskDef.id];
                        if (taskState && !taskState.isClaimed && (taskState.progress || 0) >= taskDef.targetProgress) {
                            if (taskDef.isPremium && !state.isShardPassPremium) {
                                continue; // Пропускаем премиум задачи, если нет премиума
                            }
                            // console.log(`[ClaimableCheck] ShardPass Task: Week ${weekKey} - ${taskDef.id}`);
                            return true;
                        }
                    }
                }
            }
        }
        
        return false; // Если ничего нельзя забрать
    },

resetGame: () => { // Объединенный из КОД1 и КОД2
    const defaultEquipped = getDefaultEquippedSet();
    const defaultStateForTasksOnReset = {
      dailyTaskProgress: {}, dailyTaskBarXp: 0, dailyBonusClaimed: false, lastDailyReset: null,
      dailyLoginToday: false, killsToday: 0, levelsCompletedToday: 0, gearUpgradedToday: 0, chestsOpenedToday: 0,
      lastSeenLoginDateForWeekly: null, lastSeenLoginDateForMonthly: null,
      weeklyTaskProgress: {}, weeklyTaskBarXp: 0, weeklyBonusClaimed: false, lastWeeklyReset: null,
      weeklyLoginDays: 0, killsThisWeek: 0, levelsCompletedThisWeek: 0, gearUpgradedThisWeek: 0, chestsOpenedThisWeek: 0,
      monthlyTaskProgress: {}, monthlyTaskBarXp: 0, monthlyBonusClaimed: false, lastMonthlyReset: null,
      monthlyLoginDays: 0, killsThisMonth: 0, levelsCompletedThisMonth: 0, gearUpgradedThisMonth: 0, chestsOpenedThisMonth: 0,
      itemsForgedToday: 0, itemsForgedThisWeek: 0, itemsForgedThisMonth: 0, // Добавлено для консистентности с trackTaskEvent
    };
    const defaultShardPassOnReset = getDefaultShardPassState(); // из КОД1
    const defaultTrialsStatusOnReset = {};
    // Убедимся, что trialsData существует и является массивом
    if (trialsData && Array.isArray(trialsData)) {
        trialsData.forEach(trial => {
            defaultTrialsStatusOnReset[trial.id] = { actionTaken: false, rewardClaimed: false };
        });
    }
    // ^^^ КОНЕЦ ДОБАВЛЕНИЯ ^^^ // Это ваш комментарий

    // VVV ДОБАВЛЕНО: Сброс achievementsStatus в новой структуре VVV // Это ваш комментарий
    const defaultAchStatusOnReset = {};
    // Убедимся, что achievementsData существует и является массивом
    if (achievementsData && Array.isArray(achievementsData)) {
        achievementsData.forEach(achLine => {
            defaultAchStatusOnReset[achLine.id] = { highestReachedLevel: 0, claimedRewardsUpToLevel: 0, currentValue: 0 };
        });
    }
    // VVV ИЗМЕНЕНИЯ СОГЛАСНО ВАШЕМУ ЗАПРОСУ VVV
    const newDefaultStatsForAchievementsOnReset = {
        uniqueLoginDaysCount: 0, lastLoginDateForUniqueCount: null,
        totalGoldSpent: 0, totalDiamondsSpent: 0,
        totalTonShardsEarned: 0, totalTonWithdrawn: 0,
    };
    // ^^^ КОНЕЦ ИЗМЕНЕНИЙ ^^^

    set({ // Предполагаем, что `set` и `get` доступны из контекста Zustand
      gold: 100000, diamonds: 10000, toncoinShards: 0, toncoinBalance: 0,
      rareChestKeys: 10, epicChestKeys: 25,
      username: null, powerLevel: 0, userPhotoUrl: null,
      playerBaseStats: { ...DEFAULT_BASE_STATS }, // Убедитесь, что DEFAULT_BASE_STATS определен
      playerHp: DEFAULT_BASE_STATS.hp, // Убедитесь, что DEFAULT_BASE_STATS определен
      playerRace: null,
      inventory: [],
      equipped: defaultEquipped,
      dailyShopPurchases: {},
      achievementsStatus: defaultAchStatusOnReset,
      trialsStatus: defaultTrialsStatusOnReset,
      totalGoldCollected: 0, totalKills: 0,
      booleanFlags: {}, levelsCompleted: {}, achievementLevel: 1, achievementXp: 0,
      collectedArtifacts: new Set(), artifactLevels: {}, artifactChestPity: {},
      totalArtifactChestsOpened: 0, gearChestPity: {}, totalGearChestsOpened: 0,
      dailyDeals: [], dailyDealsLastGenerated: null, lastOpenedChestInfo: null, lastChestRewards: null,
      activeDebuffs: [], isAffectedByWeakeningAura: false,
      energyMax: DEFAULT_MAX_ENERGY, energyCurrent: DEFAULT_MAX_ENERGY, lastEnergyRefillTimestamp: Date.now(), // Убедитесь, что DEFAULT_MAX_ENERGY определен
      treasureChestAttempts: 3, treasureChestLastReset: null,
      completedZones: {}, currentChapterId: INITIAL_CHAPTER_ID, // Убедитесь, что INITIAL_CHAPTER_ID определен
      levelChestStates: {}, lastOpenedLevelChestRewards: null,
      hasClaimableRewardsIndicator: false,
      ...defaultStateForTasksOnReset,
      ...defaultShardPassOnReset, // Сброс ShardPass (из КОД1)
      // VVV ИЗМЕНЕНИЯ СОГЛАСНО ВАШЕМУ ЗАПРОСУ VVV
      ...newDefaultStatsForAchievementsOnReset, // Сброс новых статов
      // ^^^ КОНЕЦ ИЗМЕНЕНИЙ ^^^
    });
    localStorage.removeItem(STORAGE_KEY); // Убедитесь, что STORAGE_KEY определен
    // Убедитесь, что get() и последующие методы существуют и доступны
    if (get && typeof get === 'function') {
        const storeActions = get();
        if (storeActions.updatePowerLevel) storeActions.updatePowerLevel();
        if (storeActions.checkAndRefreshDailyDeals) storeActions.checkAndRefreshDailyDeals();
        if (storeActions.initializeLevelHp) storeActions.initializeLevelHp();
        if (storeActions.checkAndResetDailyTasks) storeActions.checkAndResetDailyTasks();
        if (storeActions.checkAndResetWeeklyTasks) storeActions.checkAndResetWeeklyTasks();
        if (storeActions.checkAndResetMonthlyTasks) storeActions.checkAndResetMonthlyTasks();
    }
    console.log("Game has been reset to default state including ShardPass and new achievement stats.");
  },
}));

// ================== Сохранение в localStorage (ОБЪЕДИНЕНО КОД1 и КОД2) ==================
useGameStore.subscribe((state) => {
    const {
        gold, diamonds, toncoinShards, toncoinBalance, username, inventory, equipped, powerLevel,
        playerBaseStats, playerHp, playerRace,
        energyCurrent, energyMax, lastEnergyRefillTimestamp,
        dailyDeals, rareChestKeys, epicChestKeys, dailyDealsLastGenerated, dailyShopPurchases,
        achievementsStatus, // Уже в новой структуре (согласно вашему комментарию)
        trialsStatus,
        totalGoldCollected, totalKills,
        booleanFlags, levelsCompleted,
        achievementLevel, achievementXp,
        collectedArtifacts, artifactLevels, artifactChestPity,
        // gearKeys, // gearKeys не используется в stateToSave, но есть в деструктуризации. Если не нужен, можно убрать. (ваш комментарий)
        totalArtifactChestsOpened, gearChestPity, totalGearChestsOpened,
        activeDebuffs, treasureChestAttempts, treasureChestLastReset,
        userPhotoUrl, currentChapterId, completedZones, isAffectedByWeakeningAura,
        levelChestStates,
        // Поля для задач
        dailyTaskProgress, dailyTaskBarXp, dailyBonusClaimed, lastDailyReset,
        dailyLoginToday, killsToday, levelsCompletedToday, gearUpgradedToday, chestsOpenedToday,
        lastSeenLoginDateForWeekly, lastSeenLoginDateForMonthly,
        weeklyTaskProgress, weeklyTaskBarXp, weeklyBonusClaimed, lastWeeklyReset,
        weeklyLoginDays, killsThisWeek, levelsCompletedThisWeek, gearUpgradedThisWeek, chestsOpenedThisWeek,
        monthlyTaskProgress, monthlyTaskBarXp, monthlyBonusClaimed, lastMonthlyReset,
        monthlyLoginDays, killsThisMonth, levelsCompletedThisMonth, gearUpgradedThisMonth, chestsOpenedThisMonth,
        itemsForgedToday, itemsForgedThisWeek, itemsForgedThisMonth, // Добавлено для сохранения (ваш комментарий)
        // Поля ShardPass
        shardPassSeasonId, shardPassCurrentLevel, shardPassCurrentXp, shardPassXpPerLevel, shardPassMaxLevel,
        isShardPassPremium, shardPassRewardsClaimed, shardPassTasksProgress, shardPassSeasonStartDateUTC,
        // VVV НОВЫЕ СТАТЫ ДЛЯ СОХРАНЕНИЯ (ИЗМЕНЕНИЯ СОГЛАСНО ВАШЕМУ ЗАПРОСУ) VVV
        uniqueLoginDaysCount,
        lastLoginDateForUniqueCount,
        totalGoldSpent,
        totalDiamondsSpent,
        totalTonShardsEarned,
        totalTonWithdrawn,
        // ^^^ КОНЕЦ НОВЫХ СТАТОВ ДЛЯ СОХРАНЕНИЯ ^^^
    } = state;

    const stateToSave = {
        gold, diamonds, toncoinShards, toncoinBalance, rareChestKeys, epicChestKeys, username, inventory, equipped, powerLevel,
        playerBaseStats, playerHp, playerRace,
        energyCurrent, energyMax, lastEnergyRefillTimestamp,
        dailyDeals, dailyDealsLastGenerated, dailyShopPurchases,
        achievementsStatus,
        trialsStatus,
        totalGoldCollected, totalKills,
        booleanFlags, levelsCompleted,
        achievementLevel, achievementXp,
        collectedArtifacts: Array.from(collectedArtifacts),
        artifactLevels, artifactChestPity,
        // gearKeys, // Если не нужен, убираем и отсюда (ваш комментарий)
        totalArtifactChestsOpened, gearChestPity, totalGearChestsOpened,
        activeDebuffs, treasureChestAttempts, treasureChestLastReset,
        userPhotoUrl, currentChapterId, completedZones, isAffectedByWeakeningAura,
        levelChestStates,
        // Поля для задач
        dailyTaskProgress, dailyTaskBarXp, dailyBonusClaimed, lastDailyReset,
        dailyLoginToday, killsToday, levelsCompletedToday, gearUpgradedToday, chestsOpenedToday,
        lastSeenLoginDateForWeekly, lastSeenLoginDateForMonthly,
        weeklyTaskProgress, weeklyTaskBarXp, weeklyBonusClaimed, lastWeeklyReset,
        weeklyLoginDays, killsThisWeek, levelsCompletedThisWeek, gearUpgradedThisWeek, chestsOpenedThisWeek,
        monthlyTaskProgress, monthlyTaskBarXp, monthlyBonusClaimed, lastMonthlyReset,
        monthlyLoginDays, killsThisMonth, levelsCompletedThisMonth, gearUpgradedThisMonth, chestsOpenedThisMonth,
        itemsForgedToday, itemsForgedThisWeek, itemsForgedThisMonth, // Добавлено для сохранения (ваш комментарий)
        // Поля ShardPass
        shardPassSeasonId, shardPassCurrentLevel, shardPassCurrentXp, shardPassXpPerLevel, shardPassMaxLevel,
        isShardPassPremium, shardPassRewardsClaimed, shardPassTasksProgress, shardPassSeasonStartDateUTC,
        // VVV НОВЫЕ СТАТЫ ДЛЯ СОХРАНЕНИЯ (ИЗМЕНЕНИЯ СОГЛАСНО ВАШЕМУ ЗАПРОСУ) VVV
        uniqueLoginDaysCount,
        lastLoginDateForUniqueCount,
        totalGoldSpent,
        totalDiamondsSpent,
        totalTonShardsEarned,
        totalTonWithdrawn,
        // ^^^ КОНЕЦ НОВЫХ СТАТОВ ДЛЯ СОХРАНЕНИЯ ^^^
    };

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave)); // Убедитесь, что STORAGE_KEY определен
    } catch (error) {
        console.error("Ошибка сохранения состояния в localStorage:", error);
    }
});

// Interval for clearing expired debuffs (из КОД2) (ваш код)
setInterval(() => {
    // Убедитесь, что useGameStore.getState().clearExpiredDebuffs() существует и доступна
    const storeState = useGameStore.getState();
    if (storeState && storeState.clearExpiredDebuffs) {
        storeState.clearExpiredDebuffs();
    }
}, 5000);

// Initial checks (Объединенные из КОД1 и КОД2) (ваш код)
setTimeout(() => {
    console.log("Performing initial checks for tasks, deals, energy, achievements, and ShardPass...");
    const store = useGameStore.getState();
    // Убедитесь, что все эти методы существуют в вашем сторе
    if (store) {
        if (store.checkAndResetDailyTasks) store.checkAndResetDailyTasks();
        if (store.checkAndResetWeeklyTasks) store.checkAndResetWeeklyTasks();
        if (store.checkAndResetMonthlyTasks) store.checkAndResetMonthlyTasks();
        // if (store.checkAndUnlockShardPassWeeklyTasks) store.checkAndUnlockShardPassWeeklyTasks(); // (ваш комментарий)
        if (store.checkAndRefreshDailyDeals) store.checkAndRefreshDailyDeals();
        if (store.checkAndResetTreasureChestAttempts) store.checkAndResetTreasureChestAttempts();
        if (store.refillEnergyOnLoad) store.refillEnergyOnLoad();
        if (store.checkAllAchievements) store.checkAllAchievements(); // <-- ВАШ ЗАПРОС: убедись, что get().checkAllAchievements() вызывается.
        if (store.setHasClaimableRewardsIndicator && store.checkIfAnyTaskOrAchievementIsClaimable) {
            store.setHasClaimableRewardsIndicator(store.checkIfAnyTaskOrAchievementIsClaimable());
        }
    }
}, 100);

export default useGameStore;

