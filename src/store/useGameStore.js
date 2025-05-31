// src/store/useGameStore.js
import { create } from "zustand";
import itemsDatabase, { getItemById, getGoldUpgradeCost, getDiamondUpgradeCost, MAX_ITEM_LEVEL, calculateItemStat } from '../data/itemsDatabase.js';

import { LEVEL_CHEST_TYPES, getLevelChestTypeById } from '../data/levelChestData';
import forgeRecipes from "../data/forgeDatabase";
import achievementsData from '../data/achievementsDatabase.js'; // Новая структура ачивок
import trialsData from '../data/trialsData.js';

import { RACES, getRaceDataById } from '../config/raceData';
import { ALL_ZONES_CONFIG } from '../data/worldMapData';
import { REWARD_TYPES }from '../data/ShardPassRewardsData.js';

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

// ▼▼▼ НОВОЕ ▼▼▼
// Вспомогательные функции для JSON.stringify/parse для Set'ов в объекте
const RARETIES_FOR_UNIQUE_TRACKING = ["Epic", "Legendary", "Mythic"]; // Редкости, которые будем отслеживать
const serializePreviouslyEquipped = (previouslyEquipped) => {
    const serialized = {};
    for (const rarity of RARETIES_FOR_UNIQUE_TRACKING) {
        if (previouslyEquipped && previouslyEquipped[rarity] instanceof Set) { // Added null check for previouslyEquipped
            serialized[rarity] = Array.from(previouslyEquipped[rarity]);
        } else {
            serialized[rarity] = []; // если нет или не Set
        }
    }
    return serialized;
};

const deserializePreviouslyEquipped = (serializedPreviouslyEquipped) => {
    const deserialized = {};
    for (const rarity of RARETIES_FOR_UNIQUE_TRACKING) {
        if (Array.isArray(serializedPreviouslyEquipped?.[rarity])) {
            deserialized[rarity] = new Set(serializedPreviouslyEquipped[rarity]);
        } else {
            deserialized[rarity] = new Set(); // инициализируем пустым Set, если нет данных
        }
    }
    return deserialized;
};
// ▲▲▲ КОНЕЦ НОВОГО ▲▲▲


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
        isNew: true,        // Помечаем как новый при создании
        receivedTimestamp: Date.now() // Записываем время получения
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
        totalGearUpgradesPerformed: 0, // Новый стат для достижений
        totalItemsCrafted: 0,        // Новый стат для достижений
        // ▼▼▼ НОВОЕ ▼▼▼
        previouslyEquippedUniqueTypesByRarity: deserializePreviouslyEquipped(null), // { Epic: new Set(), Legendary: new Set(), Mythic: new Set() }
        // ▲▲▲ КОНЕЦ НОВОГО ▲▲▲
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
                ...newDefaultStatsForAchievements, // Includes previouslyEquippedUniqueTypesByRarity
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
            ...newDefaultStatsForAchievements, // Includes previouslyEquippedUniqueTypesByRarity
        };

        // Миграция achievementsStatus, если старая структура
        if (parsed.achievementsStatus) {
            const firstAchKey = Object.keys(parsed.achievementsStatus)[0];
            if (firstAchKey &&
                typeof parsed.achievementsStatus[firstAchKey] === 'object' &&
                parsed.achievementsStatus[firstAchKey] !== null && // Доп. проверка на null
                typeof parsed.achievementsStatus[firstAchKey].completed !== 'undefined') {
                console.warn("Old achievementsStatus structure detected. Resetting to new structure.");
                parsed.achievementsStatus = initialAchStatus;
            }
        } else {
            parsed.achievementsStatus = initialAchStatus;
        }

        if (parsed.achievementsStatus && achievementsData && Array.isArray(achievementsData)) {
            achievementsData.forEach(achLine => {
                if (!parsed.achievementsStatus[achLine.id] ||
                    typeof parsed.achievementsStatus[achLine.id].highestReachedLevel === 'undefined') {
                    parsed.achievementsStatus[achLine.id] = { highestReachedLevel: 0, claimedRewardsUpToLevel: 0, currentValue: 0 };
                }
            });
        }

        // ▼▼▼ НОВОЕ: Десериализация для previouslyEquippedUniqueTypesByRarity ▼▼▼
        if (parsed.previouslyEquippedUniqueTypesByRarity) {
            parsed.previouslyEquippedUniqueTypesByRarity = deserializePreviouslyEquipped(parsed.previouslyEquippedUniqueTypesByRarity);
        } else {
            // Если в сохранении нет, инициализируем по умолчанию
            parsed.previouslyEquippedUniqueTypesByRarity = deserializePreviouslyEquipped(null);
        }
        // ▲▲▲ КОНЕЦ НОВОГО ▲▲▲


        // Убедимся, что все ключи из defaultFullStateForNewKeys есть в parsed
        for (const key in defaultFullStateForNewKeys) {
            if (parsed[key] === undefined) {
                if (key === 'collectedArtifacts' && !(defaultFullStateForNewKeys[key] instanceof Set)) { // Проверка, чтобы не перезаписать уже созданный Set
                     parsed[key] = new Set(); // Для collectedArtifacts если он undefined
                } else if (key === 'previouslyEquippedUniqueTypesByRarity') {
                     parsed[key] = deserializePreviouslyEquipped(defaultFullStateForNewKeys[key]);
                }
                // ... (другие специфичные проверки, если нужны) ...
                else if (key === 'equipped' && defaultFullStateForNewKeys[key] === null) { // Added from existing code
                    parsed[key] = getDefaultEquippedSet();
                }
                else {
                     parsed[key] = defaultFullStateForNewKeys[key];
                }
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

        if (parsed.toncoinBalance === undefined) {
            parsed.toncoinBalance = 0;
        }

        if (parsed.collectedArtifacts && !(parsed.collectedArtifacts instanceof Set)) {
            try {
                parsed.collectedArtifacts = new Set(parsed.collectedArtifacts);
            } catch (e) {
                console.error("Failed to reconstruct Set for collectedArtifacts, resetting.", e);
                parsed.collectedArtifacts = new Set();
            }
        }

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
        for (const key in defaultStateForTasks) {
            if (parsed[key] === undefined) {
                parsed[key] = defaultStateForTasks[key];
            }
        }

        if (parsed.totalGearUpgradesPerformed === undefined) {
            parsed.totalGearUpgradesPerformed = 0;
        }
        if (parsed.totalItemsCrafted === undefined) {
            parsed.totalItemsCrafted = 0;
        }

        return parsed;

    } catch (error) {
        console.error("Critical error during loadFromLocalStorage:", error);
        localStorage.removeItem(STORAGE_KEY);
        const defaultTrialsStatusOnError = {};
        if (trialsData && Array.isArray(trialsData)) { // Added check for trialsData
            trialsData.forEach(trial => {
                defaultTrialsStatusOnError[trial.id] = { actionTaken: false, rewardClaimed: false };
            });
        }
        const defaultAchStatusOnError = {};
        if (achievementsData && Array.isArray(achievementsData)) { // Added check for achievementsData
            achievementsData.forEach(achLine => {
                defaultAchStatusOnError[achLine.id] = { highestReachedLevel: 0, claimedRewardsUpToLevel: 0, currentValue: 0 };
            });
        }

        const newDefaultStatsForAchievementsOnError = { // Переопределяем, чтобы быть уверенным
            uniqueLoginDaysCount: 0, lastLoginDateForUniqueCount: null,
            totalGoldSpent: 0, totalDiamondsSpent: 0,
            totalTonShardsEarned: 0, totalTonWithdrawn: 0,
            totalGearUpgradesPerformed: 0,
            totalItemsCrafted: 0,
            // ▼▼▼ НОВОЕ ▼▼▼
            previouslyEquippedUniqueTypesByRarity: deserializePreviouslyEquipped(null),
            // ▲▲▲ КОНЕЦ НОВОГО ▲▲▲
        };

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
            ...(loadFromLocalStorage.defaultStateForTasks || defaultStateForTasks),
            trialsStatus: defaultTrialsStatusOnError,
            ...newDefaultStatsForAchievementsOnError, // Includes previouslyEquippedUniqueTypesByRarity
        };
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
    totalGearUpgradesPerformed: savedState.totalGearUpgradesPerformed || 0,
    // gearItemsAtMaxLevelCount будет вычисляемым, не хранится в состоянии напрямую
    totalItemsCrafted: savedState.totalItemsCrafted || 0,
    // ▼▼▼ НОВОЕ ▼▼▼
    previouslyEquippedUniqueTypesByRarity: savedState.previouslyEquippedUniqueTypesByRarity || deserializePreviouslyEquipped(null),
    // ▲▲▲ КОНЕЦ НОВОГО ▲▲▲
    // ▲▲▲ END NEW/MODIFIED ▲▲▲
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
    itemsForgedToday: savedState.itemsForgedToday, // Added
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
    itemsForgedThisWeek: savedState.itemsForgedThisWeek, // Added
    monthlyTaskProgress: savedState.monthlyTaskProgress,
    monthlyTaskBarXp: savedState.monthlyTaskBarXp,
    monthlyBonusClaimed: savedState.monthlyBonusClaimed,
    lastMonthlyReset: savedState.lastMonthlyReset,
    monthlyLoginDays: savedState.monthlyLoginDays,
    killsThisMonth: savedState.killsThisMonth,
    levelsCompletedThisMonth: savedState.levelsCompletedThisMonth,
    gearUpgradedThisMonth: savedState.gearUpgradedThisMonth,
    chestsOpenedThisMonth: savedState.chestsOpenedThisMonth,
    itemsForgedThisMonth: savedState.itemsForgedThisMonth, // Added

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

        let totalDecimalAttackSpeedBonus = 0;

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
            }
        }

        const { artifactLevels, collectedArtifacts } = state;
        let totalArtifactHp = 0, totalArtifactAttack = 0, totalArtifactDefense = 0, totalArtifactHpRegen = 0,
            totalArtifactDecimalAttackSpeedBonus = 0,
            totalArtifactEvasion = 0, totalArtifactMoveSpeedBonus = 0,
            totalArtifactAtkPercentBonus = 0, totalArtifactMaxMana = 0, totalArtifactElementalDmgPercent = 0,
            totalArtifactCritChance = 0, totalArtifactDoubleStrikeChance = 0, totalArtifactGoldFind = 0,
            totalArtifactLuck = 0, totalArtifactBossDmg = 0, totalArtifactShardFind = 0, totalArtifactBonusProjectiles = 0;

        for (const artifactId in artifactLevels) {
            if (collectedArtifacts.has(artifactId)) {
                const artifactDefinition = getArtifactById(artifactId);
                const artifactInfo = artifactLevels[artifactId];

                if (artifactDefinition && artifactInfo) {
                    const level = artifactInfo.level;
                    if (level <= 0) continue;

                    const allStatKeysForArtifact = new Set([
                        ...(artifactDefinition.primaryDynamicStats || []),
                        ...(artifactDefinition.baseStats ? Object.keys(artifactDefinition.baseStats) : []),
                    ]);

                    allStatKeysForArtifact.forEach(statName => {
                        const value = calculateArtifactStat(artifactDefinition, statName, level);
                        switch (statName) {
                            case "hp": totalArtifactHp += value; break;
                            case "attack": totalArtifactAttack += value; break;
                            case "defense": totalArtifactDefense += value; break;
                            case "hpRegen": totalArtifactHpRegen += value; break;
                            case "attackSpeed": totalArtifactDecimalAttackSpeedBonus += value; break;
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
                                if (value !== 0) {
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
        finalStats.hp += totalArtifactHp;
        finalStats.attack += totalArtifactAttack;
        finalStats.defense += totalArtifactDefense;
        finalStats.hpRegen += totalArtifactHpRegen;
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

        ARTIFACT_SETS.forEach(setDef => {
            const activeOwnedInSet = setDef.artifacts.filter(artifact => {
                const stateInfo = artifactLevels[artifact.id];
                return collectedArtifacts.has(artifact.id) && stateInfo && stateInfo.level > 0;
            }).length;

            setDef.bonuses.forEach(bonus => {
                const conditionMatch = bonus.condition.match(/\[\s*Собрано\s*(\d+)\s*\]/i);
                const requiredCount = conditionMatch ? parseInt(conditionMatch[1], 10) : 0;

                if (requiredCount > 0 && activeOwnedInSet >= requiredCount) {
                    const descPart = bonus.description.trim().toLowerCase();
                    const valueMatch = descPart.match(/([+-]?\d+(\.\d+)?)/);
                    const value = valueMatch ? parseFloat(valueMatch[1]) : 0;
                    let appliedThisPart = false;

                    if (descPart.includes('макс. hp') || (descPart.includes('hp') && !descPart.includes('регенерация hp') && !descPart.includes('hp regen'))) {
                        if (descPart.includes('%')) { finalStats.hp *= (1 + value / 100); } else { finalStats.hp += value; }
                        appliedThisPart = true;
                    } else if (descPart.includes('attack') || descPart.includes('сила атаки') || descPart.includes('урон') || (descPart.includes('атак') && !descPart.includes('скорость атаки'))) {
                        if (descPart.includes('%')) { finalStats.atkPercentBonus = (finalStats.atkPercentBonus || 0) + value; } else { finalStats.attack += value; }
                        appliedThisPart = true;
                    } else if (descPart.includes('скорость атаки') || descPart.includes('attack speed')) {
                        if (descPart.includes('%')) { totalDecimalAttackSpeedBonus += value / 100; } else { totalDecimalAttackSpeedBonus += value; }
                        appliedThisPart = true;
                    } else if (descPart.includes('регенерация hp') || descPart.includes('hp regen')) { finalStats.hpRegen = (finalStats.hpRegen || 0) + value; appliedThisPart = true;
                    } else if (descPart.includes('шанс двойного удара') || descPart.includes('двойной удар') || descPart.includes('double strike chance')) { finalStats.doubleStrikeChance = (finalStats.doubleStrikeChance || 0) + value; appliedThisPart = true;
                    } else if (descPart.includes('шанс найти золото') || descPart.includes('поиск золота')) { finalStats.goldFind = (finalStats.goldFind || 0) + value; appliedThisPart = true;
                    } else if (descPart.includes('шанс найти осколки') || descPart.includes('поиск осколков')) { finalStats.shardFind = (finalStats.shardFind || 0) + value; appliedThisPart = true;
                    } else if (descPart.includes('шанс крит. удара') || descPart.includes('крит. шанс') || descPart.includes('crit chance')) { finalStats.critChance = (finalStats.critChance || 0) + value; appliedThisPart = true;
                    } else if (descPart.includes('защита') || descPart.includes('defense')) { finalStats.defense = (finalStats.defense || 0) + value; appliedThisPart = true;
                    } else if (descPart.includes('удача') || descPart.includes('luck')) { finalStats.luck = (finalStats.luck || 0) + value; appliedThisPart = true;
                    } else if (descPart.includes('урон боссам') || descPart.includes('boss dmg')) { finalStats.bossDmg = (finalStats.bossDmg || 0) + value; appliedThisPart = true;
                    } else if (descPart.includes('урон стихиями') || descPart.includes('elemental dmg percent')) { finalStats.elementalDmgPercent = (finalStats.elementalDmgPercent || 0) + value; appliedThisPart = true;
                    } else if (descPart.includes('макс. мана') || descPart.includes('мана') || descPart.includes('max mana')) { finalStats.maxMana = (finalStats.maxMana || 0) + value; appliedThisPart = true;
                    } else if (descPart.includes('шанс уклонения') || descPart.includes('уклонение') || descPart.includes('evasion')) { finalStats.evasion = (finalStats.evasion || 0) + value; appliedThisPart = true;
                    } else if (descPart.includes('скорость передвижения') || descPart.includes('move speed percent bonus')) { finalStats.moveSpeedPercentBonus = (finalStats.moveSpeedPercentBonus || 0) + value; appliedThisPart = true;
                    } else if (descPart.includes('доп. снаряд') || descPart.includes('bonus projectiles')) { finalStats.bonusProjectiles = (finalStats.bonusProjectiles || 0) + (value !== 0 ? value : 1); appliedThisPart = true;
                    } else if (descPart.includes('powerlevel')) { appliedThisPart = true; }

                    if (!appliedThisPart) {
                        console.warn(`[WARN] Не удалось распознать бонус сета '${setDef.name}': ${bonus.description}`);
                    }
                }
            });
        });
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
        finalStats.evasion = Math.min(90, Math.max(0, Math.round(finalStats.evasion || 0)));
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
            return false;
        }

        for (const recipe of forgeRecipes) {
            if (!recipe || !recipe.id || !recipe.inputItems || !recipe.cost) {
                continue;
            }
            const tempAvailableItems = { ...playerInventoryCounts };
            let hasEnoughItems = true;
            if (recipe.inputItems.length > 0) {
                for (const input of recipe.inputItems) {
                    if (!input || !input.itemId || typeof input.quantity !== 'number' || input.quantity <= 0) {
                        hasEnoughItems = false;
                        break;
                    }
                    const key = input.rarity ? `${input.itemId}_${input.rarity}` : input.itemId;
                    const neededQuantity = input.quantity;
                    if ((tempAvailableItems[key] || 0) >= neededQuantity) {
                        tempAvailableItems[key] -= neededQuantity;
                    } else {
                        hasEnoughItems = false;
                        break;
                    }
                }
            }
            if (!hasEnoughItems) {
                continue;
            }
            const recipeGoldCost = recipe.cost.gold || 0;
            const recipeDiamondCost = recipe.cost.diamonds || 0;
            const canAfford = gold >= recipeGoldCost && diamonds >= recipeDiamondCost;
            if (canAfford) {
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
            const newGold = state.gold + amount;
            let newTotalCollected = state.totalGoldCollected;
            let newTotalSpent = state.totalGoldSpent;

            if (amount > 0 && !isSpending) {
                newTotalCollected += amount;
            } else if (amount < 0 || (amount > 0 && isSpending)) {
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
    },
    addDiamonds: (amount, isSpending = false) => {
        if (amount === 0) return;
        set((state) => {
            const newDiamonds = state.diamonds + amount;
            let newTotalSpent = state.totalDiamondsSpent;
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
    addToncoinShards: (amount, isSpending = false) => {
        if (amount <= 0 && !isSpending) return;
        if (amount === 0 && isSpending) return;

        set((state) => {
            let newToncoinShards = state.toncoinShards;
            let newTotalEarned = state.totalTonShardsEarned;

            if (!isSpending) {
                newToncoinShards = (state.toncoinShards || 0) + amount;
                newTotalEarned = (state.totalTonShardsEarned || 0) + amount;
            } else {
                if (state.toncoinShards < amount) {
                    console.warn("Not enough TON shards to spend");
                    return {};
                }
                newToncoinShards = state.toncoinShards - amount;
            }
            return {
                toncoinShards: newToncoinShards,
                totalTonShardsEarned: newTotalEarned
            };
        });
        if (!isSpending && amount > 0) get().trackTaskEvent('earn_toncoin_shards', amount);
        get().checkAllAchievements();
    },
    spendToncoinShards: (amount) => {
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
    exchangeShardsToTon: (shardsToSpend) => {
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
    requestToncoinWithdrawal: async (amountToWithdraw, address) => {
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
            totalTonWithdrawn: (state.totalTonWithdrawn || 0) + amountToWithdraw,
        }));
        console.log(`[Withdrawal SIMULATION] Requested withdrawal of ${amountToWithdraw} TON. New TON balance: ${get().toncoinBalance}. Total withdrawn: ${get().totalTonWithdrawn}`);
        get().checkAllAchievements();
        return { success: true, message: `Запрос на вывод ${amountToWithdraw.toFixed(4)} TON ... успешно отправлен (имитация).` };
    },
    incrementKills: (count = 1) => {
        set((state) => ({ totalKills: state.totalKills + count }));
        get().trackTaskEvent('kill_monster', count);
        get().checkAllAchievements();
    },
    refillEnergyOnLoad: () => {
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
    consumeEnergy: (cost) => {
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
    addEnergy: (amount) => {
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
            set((state) => ({ inventory: [...state.inventory, ...newItems] }));
            get().checkAllAchievements();
            get().trackTaskEvent('collect_item', quantity, { itemId, rarity: baseItem.rarity, type: baseItem.type });
        } else {
            console.warn(`Предмет ${itemId} не найден в базе данных!`);
        }
    },

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

    markAllDisplayedNewItemsAsOld: () => {
        set((state) => {
            let inventoryNeedsUpdate = false;
            const updatedInventory = state.inventory.map(item => {
                if (item.isNew) {
                    inventoryNeedsUpdate = true;
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
                const changes = {};
                if (inventoryNeedsUpdate) changes.inventory = updatedInventory;
                if (equippedNeedsUpdate) changes.equipped = updatedEquipped;
                return changes;
            }
            return {};
        });
    },
    removeItemFromInventory: (uid) => {
        set((state) => ({
            inventory: state.inventory.filter(item => item.uid !== uid)
        }));
    },
    equipItem: (itemToEquip) => {
        if (!itemToEquip?.type || !itemToEquip.uid || !itemToEquip.id || !itemToEquip.rarity) { // Добавил проверку id и rarity
            console.warn("equipItem: itemToEquip невалиден или не хватает id/rarity", itemToEquip);
            return;
        }
        console.log(`[equipItem] Equipping item: ID=${itemToEquip.id}, Name=${itemToEquip.name}, UID=${itemToEquip.uid}, Rarity="${itemToEquip.rarity}", Level=${itemToEquip.level}`);

        const slot = itemToEquip.type;
        let itemAddedToUniqueTracker = false;

        set((state) => {
            const currentEquippedItem = state.equipped[slot];
            let updatedInventory = state.inventory.filter((i) => i.uid !== itemToEquip.uid);
            if (currentEquippedItem) {
                updatedInventory.push({ // Гарантируем корректный объект при снятии
                    ...currentEquippedItem,
                    level: currentEquippedItem.level || 1
                });
            }

            let flagUpdate = {};
            // Этот флаг (equippedEpic) был для старой логики, возможно, он больше не нужен или его смысл поменялся
            // if (itemToEquip.rarity && itemToEquip.rarity.toLowerCase() === 'epic' && !state.booleanFlags.equippedEpic) {
            // flagUpdate = { booleanFlags: { ...state.booleanFlags, equippedEpic: true } };
            // }

            // ▼▼▼ НОВОЕ: Обновление previouslyEquippedUniqueTypesByRarity ▼▼▼
            let newPreviouslyEquipped = { ...state.previouslyEquippedUniqueTypesByRarity };
            const rarityKey = itemToEquip.rarity; // Берем редкость как есть, например "Epic"

            if (RARETIES_FOR_UNIQUE_TRACKING.includes(rarityKey)) {
                if (!newPreviouslyEquipped[rarityKey]) { // На всякий случай, если ключ не был инициализирован
                    newPreviouslyEquipped[rarityKey] = new Set();
                }
                if (!newPreviouslyEquipped[rarityKey].has(itemToEquip.id)) {
                    newPreviouslyEquipped[rarityKey] = new Set(newPreviouslyEquipped[rarityKey]); // Создаем новый Set для иммутабельности
                    newPreviouslyEquipped[rarityKey].add(itemToEquip.id);
                    itemAddedToUniqueTracker = true;
                    console.log(`[equipItem] Added ${rarityKey} item type ${itemToEquip.id} to unique tracker. Total unique ${rarityKey}: ${newPreviouslyEquipped[rarityKey].size}`);
                }
            }
            // ▲▲▲ КОНЕЦ НОВОГО ▲▲▲

            return {
                equipped: { ...state.equipped, [slot]: itemToEquip },
                inventory: updatedInventory,
                ...flagUpdate,
                ...(itemAddedToUniqueTracker && { previouslyEquippedUniqueTypesByRarity: newPreviouslyEquipped }) // Обновляем, только если были изменения
            };
        });

        get().updatePowerLevel();
        get().initializeLevelHp();
        if (itemAddedToUniqueTracker) { // Проверяем ачивки, только если трекер обновился
            get().checkAllAchievements();
        }
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
        if (!recipe?.id || !recipe.inputItems || !recipe.outputItemId || !recipe.cost) {
            console.error("Forge Error: Invalid recipe data received.", recipe);
            return false;
        }

        const state = get();

        const goldCost = recipe.cost.gold || 0;
        const diamondCost = recipe.cost.diamonds || 0;

        if (state.gold < goldCost) {
            console.warn(`Forge Warning: Insufficient gold for recipe ${recipe.id}. Needed: ${goldCost}, Have: ${state.gold}`);
            return false;
        }
        if (state.diamonds < diamondCost) {
            console.warn(`Forge Warning: Insufficient diamonds for recipe ${recipe.id}. Needed: ${diamondCost}, Have: ${state.diamonds}`);
            return false;
        }

        const itemsToRemoveUids = new Set();
        let tempInventoryForCheck = [...state.inventory];

        for (const input of recipe.inputItems) {
            if (!input || !input.itemId || typeof input.quantity !== 'number' || input.quantity <= 0) {
                console.error(`Forge Error: Invalid input item definition in recipe ${recipe.id}:`, input);
                return false;
            }

            let foundCountForThisInput = 0;
            for (let i = 0; i < input.quantity; i++) {
                const itemIndexInTemp = tempInventoryForCheck.findIndex(invItem =>
                    invItem.id === input.itemId &&
                    (input.rarity ? invItem.rarity === input.rarity : true) &&
                    !itemsToRemoveUids.has(invItem.uid)
                );

                if (itemIndexInTemp !== -1) {
                    itemsToRemoveUids.add(tempInventoryForCheck[itemIndexInTemp].uid);
                    foundCountForThisInput++;
                } else {
                    console.error(`Forge Error: Insufficient items for input: ${input.itemId} (rarity: ${input.rarity || 'any'}) in recipe ${recipe.id}. Needed: ${input.quantity}, found available for this specific requirement: ${foundCountForThisInput}.`);
                    return false;
                }
            }
        }

        const outputItemBaseData = getItemById(recipe.outputItemId);
        if (!outputItemBaseData) {
            console.error(`Forge Error: Output item base data not found for ID: ${recipe.outputItemId} in recipe ${recipe.id}.`);
            return false;
        }

        const forgedItem = createItemInstance(outputItemBaseData);
        if (!forgedItem) {
            console.error(`Forge Error: Could not create instance for output item ID: ${recipe.outputItemId} in recipe ${recipe.id}.`);
            return false;
        }

        if (goldCost > 0) {
            get().addGold(-goldCost, true);
        }
        if (diamondCost > 0) {
            get().addDiamonds(-diamondCost, true);
        }

        const currentForgeFlag = state.booleanFlags.hasForgedOrUpgraded;
        let flagUpdate = !currentForgeFlag ? { booleanFlags: { ...state.booleanFlags, hasForgedOrUpgraded: true } } : {};
        const newTotalItemsCrafted = (state.totalItemsCrafted || 0) + 1;

        set((prevState) => {
            const newInventory = prevState.inventory.filter(item => !itemsToRemoveUids.has(item.uid));
            newInventory.push(forgedItem);

            return {
                inventory: newInventory,
                ...flagUpdate,
                totalItemsCrafted: newTotalItemsCrafted,
            };
        });

        get().trackTaskEvent('forge_item', 1);
        get().checkAllAchievements();

        console.log(`Forge Success: Item "${forgedItem.name}" (UID: ${forgedItem.uid}) created by recipe ID: ${recipe.id}. Total items crafted: ${newTotalItemsCrafted}.`);
        return true;
    },
    purchaseShopItem: (dealId) => {
        const state = get();
        const deal = state.dailyDeals.find(d => d.id === dealId);

        if (!deal) {
            console.error("Сделка не найдена в текущих dailyDeals:", dealId);
            return false;
        }
        if (state.dailyShopPurchases[dealId]) {
            console.warn("Товар уже куплен:", dealId);
            return false;
        }

        const currency = deal.currency;
        const price = deal.price;

        if (state[currency] < price) {
            alert(`Недостаточно ${currency}! Нужно: ${price}, есть: ${state[currency]}`);
            return false;
        }

        if (price > 0) {
            if (currency === 'gold') {
                get().addGold(-price, true);
            } else if (currency === 'diamonds') {
                get().addDiamonds(-price, true);
            } else {
                console.error(`[purchaseShopItem] Неизвестный тип платной валюты для списания: ${currency}`);
                return false;
            }
        }

        if (deal.type === 'item') {
            get().addItemToInventory(deal.itemId, deal.quantity || 1);
        } else if (deal.type === 'artifact_shard') {
            get().addArtifactShards(deal.itemId, deal.quantity || 1);
        }

        const currentShopFlag = state.booleanFlags.hasMadeShopPurchase;
        let flagUpdate = !currentShopFlag ? { booleanFlags: { ...state.booleanFlags, hasMadeShopPurchase: true } } : {};

        set((prevState) => ({
            dailyShopPurchases: { ...prevState.dailyShopPurchases, [dealId]: true },
            ...flagUpdate
        }));
        get().checkAllAchievements();
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
    completeLevelAction: (chapterId, levelId, difficulty, chapterContextData) => {
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
            return { success: false, message: "Статус достижения не найден." };
        }

        const levelDataToClaim = achLineDefinition.levels.find(l => l.level === levelToClaim);
        if (!levelDataToClaim) {
            console.warn(`[Achievements] Данные для уровня ${levelToClaim} не найдены в ветке: ${achievementId}`);
            return { success: false, message: "Уровень достижения не найден." };
        }

        if (levelToClaim > currentAchievementStatus.highestReachedLevel) {
            console.warn(`[Achievements] Попытка получить награду за недостигнутый уровень: ${achievementId}, уровень ${levelToClaim}. Достигнут: ${currentAchievementStatus.highestReachedLevel}`);
            return { success: false, message: "Уровень еще не достигнут." };
        }
        if (levelToClaim <= currentAchievementStatus.claimedRewardsUpToLevel) {
            console.warn(`[Achievements] Попытка повторно получить награду: ${achievementId}, уровень ${levelToClaim}. Уже получено до: ${currentAchievementStatus.claimedRewardsUpToLevel}`);
            return { success: false, message: "Награда за этот или более низкий уровень уже получена." };
        }

        console.log(`[Achievements] Получение награды за "${achLineDefinition.name}" - Уровень ${levelToClaim}`);
        let awardedItemsForPopup = [];
        if (levelDataToClaim.reward) {
            const reward = levelDataToClaim.reward;
            if (reward.gold) { get().addGold(reward.gold); awardedItemsForPopup.push({ type: 'gold', amount: reward.gold, icon: '💰' }); }
            if (reward.diamonds) { get().addDiamonds(reward.diamonds); awardedItemsForPopup.push({ type: 'diamonds', amount: reward.diamonds, icon: '💎' }); }
            if (reward.toncoinShards) { get().addToncoinShards(reward.toncoinShards); awardedItemsForPopup.push({ type: 'toncoin_shards', amount: reward.toncoinShards, icon: '💠' }); }
            if (reward.rareChestKeys) { get().addKeys(REWARD_TYPES.RARE_CHEST_KEY, reward.rareChestKeys); awardedItemsForPopup.push({ type: REWARD_TYPES.RARE_CHEST_KEY, amount: reward.rareChestKeys, name: 'Редкий ключ', icon: '🔑' }); }
            if (reward.epicChestKeys) { get().addKeys(REWARD_TYPES.EPIC_CHEST_KEY, reward.epicChestKeys); awardedItemsForPopup.push({ type: REWARD_TYPES.EPIC_CHEST_KEY, amount: reward.epicChestKeys, name: 'Эпический ключ', icon: '🗝️' }); }
        }

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
                    if (globalLevelRewardConfig.gold) { get().addGold(globalLevelRewardConfig.gold); globalRewardsThisClaim.push({type: 'gold', amount: globalLevelRewardConfig.gold}); }
                    if (globalLevelRewardConfig.diamonds) { get().addDiamonds(globalLevelRewardConfig.diamonds); globalRewardsThisClaim.push({type: 'diamonds', amount: globalLevelRewardConfig.diamonds}); }
                    if (globalLevelRewardConfig.rareChestKeys) { get().addKeys(REWARD_TYPES.RARE_CHEST_KEY, globalLevelRewardConfig.rareChestKeys); globalRewardsThisClaim.push({type: REWARD_TYPES.RARE_CHEST_KEY, amount: globalLevelRewardConfig.rareChestKeys, name: 'Редкий ключ'}); }
                    if (globalLevelRewardConfig.epicChestKeys) { get().addKeys(REWARD_TYPES.EPIC_CHEST_KEY, globalLevelRewardConfig.epicChestKeys); globalRewardsThisClaim.push({type: REWARD_TYPES.EPIC_CHEST_KEY, amount: globalLevelRewardConfig.epicChestKeys, name: 'Эпический ключ'}); }
                    if (globalLevelRewardConfig.toncoinShards) { get().addToncoinShards(globalLevelRewardConfig.toncoinShards); globalRewardsThisClaim.push({type: 'toncoin_shards', amount: globalLevelRewardConfig.toncoinShards });}
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

        set(prevState => ({
            achievementsStatus: {
                ...prevState.achievementsStatus,
                [achievementId]: {
                    ...prevState.achievementsStatus[achievementId],
                    claimedRewardsUpToLevel: levelToClaim
                }
            }
        }));

        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());

        return {
            success: true,
            message: `Награда за "${achLineDefinition.name} (Ур. ${levelToClaim})" получена!`,
            claimedRewardDetails: awardedItemsForPopup,
            globalLevelUpInfo: globalLevelUpDetails
        };
    },

    setHasClaimableRewardsIndicator: (hasRewards) => {
        if (get().hasClaimableRewardsIndicator !== hasRewards) {
            set({ hasClaimableRewardsIndicator: hasRewards });
        }
    },

    checkAllAchievements: () => {
        const state = get();
        let changedInStatus = false;
        const newStatuses = JSON.parse(JSON.stringify(state.achievementsStatus || {}));

        // const getEquippedRarityCount = (rarityToFilter) => { ... }; // ЭТА ФУНКЦИЯ БОЛЬШЕ НЕ НУЖНА для этих ачивок
        // (Если она вам больше нигде не нужна, ее можно удалить из checkAllAchievements, чтобы не загромождать код. Если нужна для чего-то еще, оставьте.)

        const getCompletedArtifactSetCount = () => {
            let count = 0;
            if (!ARTIFACT_SETS || !state.collectedArtifacts || !state.artifactLevels) {
                return 0;
            }
            ARTIFACT_SETS.forEach(setDef => {
                if (!setDef.artifacts || setDef.artifacts.length === 0) return;
                let artifactsInSetOwnedAndActive = 0;
                setDef.artifacts.forEach(artifactInSetDef => {
                    const isCollected = state.collectedArtifacts.has(artifactInSetDef.id);
                    const levelInfo = state.artifactLevels[artifactInSetDef.id];
                    const isActive = levelInfo && levelInfo.level > 0;
                    if (isCollected && isActive) {
                        artifactsInSetOwnedAndActive++;
                    }
                });
                if (setDef.artifacts.length > 0 && artifactsInSetOwnedAndActive >= setDef.artifacts.length) {
                    count++;
                }
            });
            return count;
        };

        const getUniqueLevelsCompletedCount = (difficultyKey) => {
            if (!state.levelsCompleted) return 0;
            const uniqueCompleted = new Set();
            for (const levelKey in state.levelsCompleted) {
                const completionData = state.levelsCompleted[levelKey];
                if (completionData && completionData[difficultyKey]) {
                    uniqueCompleted.add(levelKey);
                }
            }
            return uniqueCompleted.size;
        };

        const getGearItemsAtMaxLevelCount = () => {
            const uniqueMaxLevelItemIds = new Set();
            const checkItemInstance = (itemInstance) => {
                if (!itemInstance || !itemInstance.id) return;
                const itemDefinition = getItemById(itemInstance.id);
                if (!itemDefinition) return;
                const currentLevel = itemInstance.level || 0;
                const actualMaxLevel = (itemInstance.maxLevel !== undefined && itemInstance.maxLevel > 0)
                    ? itemInstance.maxLevel
                    : (itemDefinition.maxLevel !== undefined && itemDefinition.maxLevel > 0
                        ? itemDefinition.maxLevel
                        : MAX_ITEM_LEVEL);
                if (currentLevel >= actualMaxLevel) {
                    uniqueMaxLevelItemIds.add(itemInstance.id);
                }
            };
            if (state.equipped && typeof state.equipped === 'object') {
                Object.values(state.equipped).forEach(checkItemInstance);
            }
            if (state.inventory && Array.isArray(state.inventory)) {
                state.inventory.forEach(checkItemInstance);
            }
            return uniqueMaxLevelItemIds.size;
        };

        if (!achievementsData || !Array.isArray(achievementsData)) {
            console.warn("[Achievements] achievementsData is not loaded or not an array.");
            return;
        }

        achievementsData.forEach(achLine => {
            if (!achLine || !achLine.id || !Array.isArray(achLine.levels)) {
                console.warn("[Achievements] Invalid achievement line definition:", achLine);
                return;
            }

            const status = newStatuses[achLine.id] || { highestReachedLevel: 0, claimedRewardsUpToLevel: 0, currentValue: 0 };
            let currentValueForStat = 0;

            if (achLine.stat) {
                switch (achLine.stat) {
                    // ▼▼▼ ИЗМЕНЕННАЯ ЛОГИКА ▼▼▼
                    case 'equippedEpicItemCount':
                        currentValueForStat = state.previouslyEquippedUniqueTypesByRarity?.Epic?.size || 0;
                        break;
                    case 'equippedLegendaryItemCount':
                        currentValueForStat = state.previouslyEquippedUniqueTypesByRarity?.Legendary?.size || 0;
                        break;
                    case 'equippedMythicItemCount':
                        currentValueForStat = state.previouslyEquippedUniqueTypesByRarity?.Mythic?.size || 0;
                        break;
                    // ▲▲▲ КОНЕЦ ИЗМЕНЕННОЙ ЛОГИКИ ▲▲▲
                    case 'completedArtifactSetCount': currentValueForStat = getCompletedArtifactSetCount(); break;
                    case 'uniqueNormalLevelsCompleted': currentValueForStat = getUniqueLevelsCompletedCount('normal'); break;
                    case 'uniqueHardLevelsCompleted': currentValueForStat = getUniqueLevelsCompletedCount('hard'); break;
                    case 'uniqueLoginDaysCount': currentValueForStat = state.uniqueLoginDaysCount || 0; break;
                    case 'totalKills': currentValueForStat = state.totalKills || 0; break;
                    case 'totalGearChestsOpened': currentValueForStat = state.totalGearChestsOpened || 0; break;
                    case 'totalArtifactChestsOpened': currentValueForStat = state.totalArtifactChestsOpened || 0; break;
                    case 'totalGoldSpent': currentValueForStat = state.totalGoldSpent || 0; break;
                    case 'totalDiamondsSpent': currentValueForStat = state.totalDiamondsSpent || 0; break;
                    case 'totalTonShardsEarned': currentValueForStat = state.totalTonShardsEarned || 0; break;
                    case 'totalTonWithdrawn': currentValueForStat = state.totalTonWithdrawn || 0; break;
                    case 'powerLevel': currentValueForStat = state.powerLevel || 0; break;
                    case 'totalGearUpgradesPerformed': currentValueForStat = state.totalGearUpgradesPerformed || 0; break;
                    case 'gearItemsAtMaxLevelCount': currentValueForStat = getGearItemsAtMaxLevelCount(); break;
                    case 'totalItemsCrafted': currentValueForStat = state.totalItemsCrafted || 0; break;
                    default:
                        currentValueForStat = state[achLine.stat] || 0;
                        if (state[achLine.stat] === undefined && typeof state[achLine.stat] !== 'function') {
                            // console.warn(`[Achievements] Stat "${achLine.stat}" for achievement "${achLine.id}" not found directly in game state or is not a simple value.`);
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
                const targetForThisLevel = achLine.flag ? 1 : levelData.target;
                if (currentValueForStat >= targetForThisLevel && levelData.level > newHighestReachedLevel) {
                    newHighestReachedLevel = levelData.level;
                }
            });

            if (status.highestReachedLevel !== newHighestReachedLevel) {
                status.highestReachedLevel = newHighestReachedLevel;
                changedInStatus = true;
            }
            newStatuses[achLine.id] = status;
        });

        if (changedInStatus) {
            set({ achievementsStatus: newStatuses });
        }
        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
    },
    generateDailyDeals: () => {
        const itemPool = itemsDatabase
            .filter(item => {
                if (!item) return false;
                const rarityKey = String(item.rarity || '').toLowerCase();
                return DAILY_DEAL_RARITY_WEIGHTS[rarityKey] !== undefined;
            })
            .map(item => ({ type: 'item', data: item, rarity: item.rarity }));

        const artifactsForShards = ALL_ARTIFACTS_ARRAY
            .filter(art => {
                if (!art) return false;
                const rarityKey = String(art.rarity || '').toLowerCase();
                return DAILY_DEAL_RARITY_WEIGHTS[rarityKey] !== undefined;
            });
        const shardPool = artifactsForShards
            .map(artifact => ({ type: 'artifact_shard', data: artifact, rarity: artifact.rarity }));

        const combinedPool = [...itemPool, ...shardPool];
        if (combinedPool.length === 0) {
            console.error("[Shop_GenerateDeals] Пул для ежедневных предложений пуст!");
            set({ dailyDeals: [], dailyDealsLastGenerated: Date.now(), dailyShopPurchases: {} });
            return;
        }

        const weightedPool = combinedPool.map(entry => {
            if (!entry || !entry.rarity || !entry.data) return null;
            const rarityKey = String(entry.rarity).toLowerCase();
            const weight = DAILY_DEAL_RARITY_WEIGHTS[rarityKey];
            if (weight === undefined || typeof weight !== 'number' || weight <= 0) return null;
            return { item: entry, weight: weight };
        }).filter(Boolean);

        if (weightedPool.length === 0) {
            console.error("[Shop_GenerateDeals] Weighted pool for daily deals is empty after filtering!");
            set({ dailyDeals: [], dailyDealsLastGenerated: Date.now(), dailyShopPurchases: {} });
            return;
        }

        const numberOfDeals = 6;
        const generatedDeals = [];
        const selectedItemIds = new Set();
        let currentWeightedPool = [...weightedPool];
        let iterations = 0;
        const MAX_ITERATIONS = 1000;

        while (generatedDeals.length < numberOfDeals && currentWeightedPool.length > 0 && iterations < MAX_ITERATIONS) {
            iterations++;
            const selectedDataEntry = weightedRandom(currentWeightedPool);
            if (!selectedDataEntry || typeof selectedDataEntry.data !== 'object' || selectedDataEntry.data === null) {
                if (currentWeightedPool.length > 0) {
                    const problemIndex = currentWeightedPool.findIndex(poolEntry => poolEntry.item === selectedDataEntry);
                    if (problemIndex !== -1) { currentWeightedPool.splice(problemIndex, 1); } else { currentWeightedPool.shift(); }
                }
                continue;
            }
            const selectedEntry = selectedDataEntry;
            const uniqueKey = `${selectedEntry.type}_${selectedEntry.data.id}`;
            const selectedIndexInPool = currentWeightedPool.findIndex(poolEntry => poolEntry.item === selectedEntry);

            if (!selectedItemIds.has(uniqueKey)) {
                selectedItemIds.add(uniqueKey);
                let quantity = 1;
                let currency = (Math.random() < 0.7) ? 'gold' : 'diamonds';
                let price = 100;
                const rarityMultiplier = { common: 1, uncommon: 3, rare: 5, epic: 10, legendary: 25, mythic: 50 };
                const itemBasePrice = selectedEntry.data.basePrice || (selectedEntry.type === 'artifact_shard' ? 50 : 100);
                price = itemBasePrice * (rarityMultiplier[String(selectedEntry.rarity).toLowerCase()] || 1);

                if (selectedEntry.type === 'artifact_shard') {
                    quantity = Math.random() < 0.5 ? 3 : 5;
                    const lowerRarity = String(selectedEntry.rarity).toLowerCase();
                    if (['rare', 'epic', 'legendary', 'mythic'].includes(lowerRarity)) { currency = 'diamonds'; }
                    price = price * quantity / (currency === 'diamonds' ? 10 : 1);
                } else { quantity = 1; }
                price = Math.max(currency === 'diamonds' ? 1 : 10, Math.round(price * (0.8 + Math.random() * 0.4)));
                const dealId = `daily_${uniqueKey}_${Date.now()}_${generatedDeals.length}`;
                generatedDeals.push({
                    id: dealId, type: selectedEntry.type, itemId: selectedEntry.data.id,
                    name: selectedEntry.data.name, icon: selectedEntry.data.image || selectedEntry.data.icon,
                    quantity: quantity, currency: currency, price: price, rarity: selectedEntry.rarity,
                    discount: 0, purchaseLimit: 1,
                });
            }
            if (selectedIndexInPool !== -1) { currentWeightedPool.splice(selectedIndexInPool, 1); }
            if (currentWeightedPool.length === 0 && generatedDeals.length < numberOfDeals) { break; }
        }
        if (iterations >= MAX_ITERATIONS) { console.error("[Shop_GenerateDeals] Превышено максимальное количество итераций!"); }
        set({ dailyDeals: generatedDeals, dailyDealsLastGenerated: Date.now(), dailyShopPurchases: {} });
    },
    checkAndRefreshDailyDeals: () => {
        const state = get();
        const lastGeneratedTs = state.dailyDealsLastGenerated;
        const nowTs = Date.now();
        if (!lastGeneratedTs) { get().generateDailyDeals(); return; }
        const nowUtcDate = new Date(nowTs);
        const targetTodayUtcTs = Date.UTC(nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate(), REFRESH_HOUR_UTC, 0, 0, 0);
        let lastRefreshMarkerTs = (nowTs >= targetTodayUtcTs) ? targetTodayUtcTs : Date.UTC(nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate() - 1, REFRESH_HOUR_UTC, 0, 0, 0);
        if (lastGeneratedTs < lastRefreshMarkerTs) {
            get().generateDailyDeals();
        } else {
            if (state.dailyDeals.length === 0 && savedState.dailyDeals && savedState.dailyDeals.length > 0) {
                set({ dailyDeals: savedState.dailyDeals, dailyShopPurchases: savedState.dailyShopPurchases || {} });
            }
        }
    },
    collectArtifact: (artifactId) => {
        const artifactData = getArtifactById(artifactId);
        if (!artifactData) { console.warn(`Artifact data not found for ID: ${artifactId}`); return; }
        set((state) => {
            if (state.collectedArtifacts.has(artifactId)) return {};
            const newCollected = new Set(state.collectedArtifacts);
            newCollected.add(artifactId);
            const newLevels = { ...state.artifactLevels };
            if (!newLevels[artifactId]) { newLevels[artifactId] = { level: 0, shards: 0 }; }
            return { collectedArtifacts: newCollected, artifactLevels: newLevels, };
        });
        get().updatePowerLevel(); get().checkAllAchievements();
    },
    addArtifactShards: (artifactId, amount) => {
        if (amount <= 0) return;
        const artifactData = getArtifactById(artifactId);
        if (!artifactData) { console.warn(`Попытка добавить осколки для несуществующего артефакта: ${artifactId}`); return; }
        set((state) => {
            const currentInfo = state.artifactLevels[artifactId] || { level: 0, shards: 0 };
            let newCollectedArtifacts = state.collectedArtifacts;
            if (!state.collectedArtifacts.has(artifactId)) {
                newCollectedArtifacts = new Set(state.collectedArtifacts);
                newCollectedArtifacts.add(artifactId);
            }
            const newShards = currentInfo.shards + amount;
            return {
                artifactLevels: { ...state.artifactLevels, [artifactId]: { ...currentInfo, shards: newShards } },
                ...(newCollectedArtifacts !== state.collectedArtifacts && { collectedArtifacts: newCollectedArtifacts })
            };
        });
    },
    activateArtifact: (artifactId) => {
        const artifactData = getArtifactById(artifactId);
        if (!artifactData) { console.error("Арт не найден:", artifactId); return; }
        set((state) => {
            const currentInfo = state.artifactLevels[artifactId] || { level: 0, shards: 0 };
            if (currentInfo.level !== 0) { return {}; }
            const shardsNeeded = (0 + 1) * (artifactData.baseShardCost || BASE_SHARD_COST_PER_LEVEL[artifactData.rarity.toLowerCase()] || 10);
            if (currentInfo.shards < shardsNeeded) { return {}; }
            const remainingShards = currentInfo.shards - shardsNeeded;
            const newCollected = new Set(state.collectedArtifacts);
            newCollected.add(artifactId);
            return {
                collectedArtifacts: newCollected,
                artifactLevels: { ...state.artifactLevels, [artifactId]: { level: 0, shards: remainingShards } } // Should be level 1, not 0
            };
        });
        get().updatePowerLevel(); get().checkAllAchievements(); get().initializeLevelHp();
    },
    upgradeArtifact: (artifactId) => {
        const artifactData = getArtifactById(artifactId);
        if (!artifactData) { console.error("Арт не найден:", artifactId); return; }
        set((state) => {
            const currentInfo = state.artifactLevels[artifactId];
            if (!currentInfo || currentInfo.level === 0) { return {}; } // Should be currentInfo.level < 1 for not activated
            const currentLevel = currentInfo.level;
            const maxLevel = artifactData.maxLevel || MAX_ARTIFACT_LEVEL;
            if (currentLevel >= maxLevel) { return {}; }
            const shardsNeeded = (currentLevel + 1) * (artifactData.baseShardCost || BASE_SHARD_COST_PER_LEVEL[artifactData.rarity.toLowerCase()] || 10);
            if (currentInfo.shards < shardsNeeded) { return {}; }
            const newLevel = currentLevel + 1;
            const remainingShards = currentInfo.shards - shardsNeeded;
            return { artifactLevels: { ...state.artifactLevels, [artifactId]: { level: newLevel, shards: remainingShards } } };
        });
        get().updatePowerLevel(); get().checkAllAchievements(); get().initializeLevelHp();
    },

    upgradeItem: (itemObjectToUpgrade) => {
        const { gold, diamonds } = get();
        if (!itemObjectToUpgrade || !itemObjectToUpgrade.id || !itemObjectToUpgrade.uid) {
            console.warn("upgradeItem: Invalid item object passed.", itemObjectToUpgrade);
            return false;
        }
        const itemDefinition = getItemById(itemObjectToUpgrade.id);
        if (!itemDefinition) {
            console.error(`upgradeItem: Item definition not found for ID: ${itemObjectToUpgrade.id}`);
            return false;
        }
        const currentLevel = itemObjectToUpgrade.level || 0;
        const actualMaxLevel = (itemObjectToUpgrade.maxLevel !== undefined && itemObjectToUpgrade.maxLevel > 0)
            ? itemObjectToUpgrade.maxLevel
            : (itemDefinition.maxLevel !== undefined && itemDefinition.maxLevel > 0
                ? itemDefinition.maxLevel
                : MAX_ITEM_LEVEL);
        if (currentLevel >= actualMaxLevel) { return false; }
        const itemRarity = itemObjectToUpgrade.rarity || itemDefinition.rarity;
        if (!itemRarity) { console.error(`upgradeItem: Rarity not defined for item: ${itemObjectToUpgrade.name || itemDefinition.name}`); return false; }
        const goldCost = get().getGoldUpgradeCost ? get().getGoldUpgradeCost(currentLevel, itemRarity) : getGoldUpgradeCost(currentLevel, itemRarity);
        const diamondCost = get().getDiamondUpgradeCost ? get().getDiamondUpgradeCost(currentLevel, itemRarity) : getDiamondUpgradeCost(currentLevel, itemRarity);
        if (gold < goldCost) { return false; }
        if (diamonds < diamondCost) { return false; }

        let itemWasEquipped = false;
        let itemIsInInventory = false;
        let inventoryItemIndex = -1;
        const slotType = itemObjectToUpgrade.type;
        const stateBeforeUpdate = get();

        if (stateBeforeUpdate.equipped[slotType]?.uid === itemObjectToUpgrade.uid) {
            itemWasEquipped = true;
        } else {
            inventoryItemIndex = stateBeforeUpdate.inventory.findIndex(invItem => invItem.uid === itemObjectToUpgrade.uid);
            if (inventoryItemIndex !== -1) { itemIsInInventory = true; }
        }
        if (!itemWasEquipped && !itemIsInInventory) {
            console.error(`upgradeItem: CRITICAL ERROR - Item with UID ${itemObjectToUpgrade.uid} not found. Upgrade aborted.`);
            return false;
        }

        if (goldCost > 0) { get().addGold(-goldCost, true); }
        if (diamondCost > 0) { get().addDiamonds(-diamondCost, true); }

        const newLevel = currentLevel + 1;
        const currentUpgradeFlag = stateBeforeUpdate.booleanFlags.hasForgedOrUpgraded;
        let flagUpdate = !currentUpgradeFlag ? { booleanFlags: { ...stateBeforeUpdate.booleanFlags, hasForgedOrUpgraded: true } } : {};
        const newTotalGearUpgradesPerformed = (stateBeforeUpdate.totalGearUpgradesPerformed || 0) + 1;

        set((state) => {
            let newEquipped = { ...state.equipped };
            let newInventory = [...state.inventory];
            if (itemWasEquipped) {
                newEquipped[slotType] = { ...state.equipped[slotType], level: newLevel };
                const invIdxPotentially = state.inventory.findIndex(invItem => invItem.uid === itemObjectToUpgrade.uid);
                if (invIdxPotentially !== -1) { newInventory[invIdxPotentially] = { ...newInventory[invIdxPotentially], level: newLevel };}
            } else {
                newInventory[inventoryItemIndex] = { ...state.inventory[inventoryItemIndex], level: newLevel };
            }
            return {
                equipped: newEquipped, inventory: newInventory, ...flagUpdate,
                totalGearUpgradesPerformed: newTotalGearUpgradesPerformed,
            };
        });
        if (itemWasEquipped) { get().updatePowerLevel(); get().initializeLevelHp(); }
        get().trackTaskEvent('upgrade_gear', 1); get().checkAllAchievements();
        return true;
    },

    updatePowerLevel: () => {
        const { equipped, artifactLevels, collectedArtifacts } = get();
        let totalPower = 0;
        Object.values(equipped).filter(Boolean).forEach(item => {
            const itemLevel = item?.currentLevel || item?.level || 0;
            const basePower = item?.basePowerLevel || 0;
            const powerPerLvl = item?.powerPerLevel || 0;
            totalPower += Math.round(basePower + (powerPerLvl * itemLevel));
        });
        for (const artifactId in artifactLevels) {
            if (collectedArtifacts.has(artifactId)) {
                const level = artifactLevels[artifactId]?.level || 0;
                if (level > 0) {
                    const artifactData = getArtifactById(artifactId);
                    if (artifactData) {
                        const artifactBasePower = artifactData.basePowerLevel || 0;
                        const artifactPowerPerLevel = artifactData.powerLevelPerLevel || 0;
                        totalPower += Math.round(artifactBasePower + (artifactPowerPerLevel * (level - 1)));
                    }
                }
            }
        }
        const finalPowerLevel = Math.max(0, totalPower);
        if (get().powerLevel !== finalPowerLevel) { set({ powerLevel: finalPowerLevel }); }
    },
    addItemToInventoryLogic: (currentInventory, itemData) => {
        const newItemInstance = createItemInstance(itemData);
        if (!newItemInstance) return currentInventory;
        return [...currentInventory, newItemInstance];
    },

    addKeys: (keyType, amount) => set(state => {
        if (keyType === REWARD_TYPES.RARE_CHEST_KEY) return { rareChestKeys: Math.max(0, state.rareChestKeys + amount) };
        if (keyType === REWARD_TYPES.EPIC_CHEST_KEY) return { epicChestKeys: Math.max(0, state.epicChestKeys + amount) };
        return {};
    }),

    openGearChest: (chestId) => {
        const state = get();
        const chestData = getGearChestById(chestId);
        if (!chestData) return { success: false, error: "Сундук не найден", paymentMethodUsed: null, awardedItem: null };

        let paymentMethodUsed = null;
        let currencyToDeductName = null;
        let currencyAmountToDeduct = 0;
        let keyTypeToDeduct = null;
        let keysAmountToDeduct = 0;
        const keyForFreeOpen = chestData.keyToOpenForFree;
        const currencyCost = chestData.cost;

        if (keyForFreeOpen) {
            if (keyForFreeOpen === REWARD_TYPES.RARE_CHEST_KEY && state.rareChestKeys >= 1) { keyTypeToDeduct = REWARD_TYPES.RARE_CHEST_KEY; keysAmountToDeduct = 1; paymentMethodUsed = 'key'; }
            else if (keyForFreeOpen === REWARD_TYPES.EPIC_CHEST_KEY && state.epicChestKeys >= 1) { keyTypeToDeduct = REWARD_TYPES.EPIC_CHEST_KEY; keysAmountToDeduct = 1; paymentMethodUsed = 'key'; }
        }
        if (paymentMethodUsed !== 'key') {
            if (currencyCost && typeof currencyCost.price === 'number') {
                currencyToDeductName = currencyCost.currency;
                if (currencyCost.price > 0) {
                    if (currencyCost.currency === 'gold') { if (state.gold >= currencyCost.price) { currencyAmountToDeduct = currencyCost.price; paymentMethodUsed = 'currency'; } else { return { success: false, error: "Недостаточно золота", paymentMethodUsed: null, awardedItem: null }; } }
                    else if (currencyCost.currency === 'diamonds') { if (state.diamonds >= currencyCost.price) { currencyAmountToDeduct = currencyCost.price; paymentMethodUsed = 'currency'; } else { return { success: false, error: "Недостаточно алмазов", paymentMethodUsed: null, awardedItem: null }; } }
                    else { return { success: false, error: "Неизвестная валюта", paymentMethodUsed: null, awardedItem: null }; }
                } else { paymentMethodUsed = 'free_by_price_0'; }
            } else { paymentMethodUsed = 'free_no_cost_config'; }
        }
        if (!paymentMethodUsed) {
            if (!keyForFreeOpen && (!currencyCost || currencyCost.price === 0)) { paymentMethodUsed = currencyCost && currencyCost.price === 0 ? 'free_by_price_0' : 'free_no_cost_config'; }
            else { return { success: false, error: "Ошибка оплаты или нехватка ресурсов", paymentMethodUsed: null, awardedItem: null }; }
        }

        if (paymentMethodUsed === 'currency') {
            if (currencyToDeductName === 'gold' && currencyAmountToDeduct > 0) get().addGold(-currencyAmountToDeduct, true);
            else if (currencyToDeductName === 'diamonds' && currencyAmountToDeduct > 0) get().addDiamonds(-currencyAmountToDeduct, true);
        } else if (paymentMethodUsed === 'key') {
            if (keyTypeToDeduct === REWARD_TYPES.RARE_CHEST_KEY && keysAmountToDeduct > 0) set(prevState => ({ rareChestKeys: prevState.rareChestKeys - keysAmountToDeduct }));
            else if (keyTypeToDeduct === REWARD_TYPES.EPIC_CHEST_KEY && keysAmountToDeduct > 0) set(prevState => ({ epicChestKeys: prevState.epicChestKeys - keysAmountToDeduct }));
        }

        const currentPityForChest = get().gearChestPity[chestId] || {};
        let newPityState = { ...currentPityForChest };
        const pityConfigs = chestData.pity ? (Array.isArray(chestData.pity) ? chestData.pity : [chestData.pity]) : [];
        pityConfigs.forEach(pConfig => { newPityState[pConfig.rarity.toLowerCase()] = (newPityState[pConfig.rarity.toLowerCase()] || 0) + 1; });
        let guaranteedRarityByPity = null;
        const sortedPityConfigs = [...pityConfigs].sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));
        for (const pConfig of sortedPityConfigs) {
            const key = pConfig.rarity.toLowerCase();
            if (newPityState[key] >= pConfig.limit) { guaranteedRarityByPity = pConfig.rarity; break; }
        }
        const finalRarity = guaranteedRarityByPity || _rollWeightedRarity_Gear(chestData.rarityChances);
        const obtainedItemData = _selectRandomGearItemByRarity_Gear(finalRarity);
        if (!obtainedItemData) {
            if (paymentMethodUsed === 'currency') {
                if (currencyToDeductName === 'gold' && currencyAmountToDeduct > 0) get().addGold(currencyAmountToDeduct, false);
                else if (currencyToDeductName === 'diamonds' && currencyAmountToDeduct > 0) get().addDiamonds(currencyAmountToDeduct, false);
            } else if (paymentMethodUsed === 'key') {
                if (keyTypeToDeduct === REWARD_TYPES.RARE_CHEST_KEY && keysAmountToDeduct > 0) set(prevState => ({ rareChestKeys: prevState.rareChestKeys + keysAmountToDeduct }));
                else if (keyTypeToDeduct === REWARD_TYPES.EPIC_CHEST_KEY && keysAmountToDeduct > 0) set(prevState => ({ epicChestKeys: prevState.epicChestKeys + keysAmountToDeduct }));
            }
            return { success: false, error: "Ошибка генерации предмета", paymentMethodUsed, awardedItem: null };
        }
        const actualObtainedRarity = obtainedItemData.rarity;
        pityConfigs.forEach(pConfig => {
            if (rarityOrder[actualObtainedRarity] >= rarityOrder[pConfig.rarity]) {
                if (newPityState[pConfig.rarity.toLowerCase()] > 0) newPityState[pConfig.rarity.toLowerCase()] = 0;
            }
        });
        const rewardDetailsForUI = { type: 'gear', id: obtainedItemData.id, name: obtainedItemData.name, icon: obtainedItemData.image, rarity: actualObtainedRarity, amount: 1 };
        set(prevState => {
            const updatedInventory = get().addItemToInventoryLogic(prevState.inventory, obtainedItemData);
            return {
                totalGearChestsOpened: (prevState.totalGearChestsOpened || 0) + 1,
                gearChestPity: { ...prevState.gearChestPity, [chestId]: newPityState },
                inventory: updatedInventory,
                lastOpenedChestInfo: { chestId: chestId, amount: 1, type: 'gear', name: chestData.name, icon: chestData.icon },
                lastChestRewards: [rewardDetailsForUI]
            };
        });
        if (chestData.shardPassXp && chestData.shardPassXp > 0) get().addShardPassXp(chestData.shardPassXp);
        get().trackTaskEvent('open_chest', 1, { chestId: chestId, rarity: actualObtainedRarity, type: 'gear' });
        get().checkAllAchievements();
        return { success: true, awardedItem: obtainedItemData, paymentMethodUsed };
    },

    openGearChestX10: (chestId) => {
        const state = get();
        const chestData = getGearChestById(chestId);
        const countToOpen = 10;
        if (!chestData) return { success: false, error: "Сундук не найден", awardedItems: [], paymentMethodUsed: null };

        let paymentMethodUsed = null;
        let currencyToDeductName = null;
        let totalCurrencyAmountToDeduct = 0;
        let keyTypeToDeduct = null;
        let totalKeysAmountToDeduct = 0;
        const keyForFreeOpen = chestData.keyToOpenForFree;
        const currencyCost = chestData.cost;

        if (keyForFreeOpen) {
            if (keyForFreeOpen === REWARD_TYPES.RARE_CHEST_KEY && state.rareChestKeys >= countToOpen) { keyTypeToDeduct = REWARD_TYPES.RARE_CHEST_KEY; totalKeysAmountToDeduct = countToOpen; paymentMethodUsed = 'key'; }
            else if (keyForFreeOpen === REWARD_TYPES.EPIC_CHEST_KEY && state.epicChestKeys >= countToOpen) { keyTypeToDeduct = REWARD_TYPES.EPIC_CHEST_KEY; totalKeysAmountToDeduct = countToOpen; paymentMethodUsed = 'key'; }
        }
        if (paymentMethodUsed !== 'key') {
            if (currencyCost && typeof currencyCost.price === 'number') {
                currencyToDeductName = currencyCost.currency;
                if (currencyCost.price > 0) {
                    const totalNeededCurrency = currencyCost.price * countToOpen;
                    if (currencyCost.currency === 'gold') { if (state.gold >= totalNeededCurrency) { totalCurrencyAmountToDeduct = totalNeededCurrency; paymentMethodUsed = 'currency'; } else { return { success: false, error: "Недостаточно золота", awardedItems: [], paymentMethodUsed: null }; } }
                    else if (currencyCost.currency === 'diamonds') { if (state.diamonds >= totalNeededCurrency) { totalCurrencyAmountToDeduct = totalNeededCurrency; paymentMethodUsed = 'currency'; } else { return { success: false, error: "Недостаточно алмазов", awardedItems: [], paymentMethodUsed: null }; } }
                    else { return { success: false, error: "Неизвестная валюта", awardedItems: [], paymentMethodUsed: null }; }
                } else { paymentMethodUsed = 'free_by_price_0'; }
            } else { paymentMethodUsed = 'free_no_cost_config'; }
        }
        if (!paymentMethodUsed) {
            if (!keyForFreeOpen && (!currencyCost || currencyCost.price === 0)) { paymentMethodUsed = currencyCost && currencyCost.price === 0 ? 'free_by_price_0' : 'free_no_cost_config'; }
            else { return { success: false, error: "Ошибка оплаты x10", awardedItems: [], paymentMethodUsed: null }; }
        }

        if (paymentMethodUsed === 'currency') {
            if (currencyToDeductName === 'gold' && totalCurrencyAmountToDeduct > 0) get().addGold(-totalCurrencyAmountToDeduct, true);
            else if (currencyToDeductName === 'diamonds' && totalCurrencyAmountToDeduct > 0) get().addDiamonds(-totalCurrencyAmountToDeduct, true);
        } else if (paymentMethodUsed === 'key') {
            if (keyTypeToDeduct === REWARD_TYPES.RARE_CHEST_KEY && totalKeysAmountToDeduct > 0) set(prevState => ({ rareChestKeys: prevState.rareChestKeys - totalKeysAmountToDeduct }));
            else if (keyTypeToDeduct === REWARD_TYPES.EPIC_CHEST_KEY && totalKeysAmountToDeduct > 0) set(prevState => ({ epicChestKeys: prevState.epicChestKeys - totalKeysAmountToDeduct }));
        }

        let workingPity = { ...(get().gearChestPity[chestId] || {}) };
        const rewardsDetailed = [];
        const newItemInstances = [];
        let accumulatedShardPassXp = 0;
        const pityConfigs = chestData.pity ? (Array.isArray(chestData.pity) ? chestData.pity : [chestData.pity]) : [];
        const sortedPityConfigs = [...pityConfigs].sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));
        let errorDuringGeneration = false;

        for (let i = 0; i < countToOpen; i++) {
            let currentPullPityCounters = { ...workingPity };
            pityConfigs.forEach(pConfig => { currentPullPityCounters[pConfig.rarity.toLowerCase()] = (currentPullPityCounters[pConfig.rarity.toLowerCase()] || 0) + 1; });
            let guaranteedRarityThisPull = null;
            for (const pConfig of sortedPityConfigs) {
                const key = pConfig.rarity.toLowerCase();
                if (currentPullPityCounters[key] >= pConfig.limit) { guaranteedRarityThisPull = pConfig.rarity; break; }
            }
            const finalRarityThisPull = guaranteedRarityThisPull || _rollWeightedRarity_Gear(chestData.rarityChances);
            const obtainedItemData = _selectRandomGearItemByRarity_Gear(finalRarityThisPull);
            if (!obtainedItemData) {
                rewardsDetailed.push({ type: 'error', name: `Ошибка генерации #${i+1}`, rarity: 'Error', icon: '/assets/default-item.png' });
                errorDuringGeneration = true;
                workingPity = currentPullPityCounters;
                continue;
            }
            const actualObtainedRarityThisPull = obtainedItemData.rarity;
            pityConfigs.forEach(pConfig => {
                if (rarityOrder[actualObtainedRarityThisPull] >= rarityOrder[pConfig.rarity]) {
                    if (currentPullPityCounters[pConfig.rarity.toLowerCase()] > 0) currentPullPityCounters[pConfig.rarity.toLowerCase()] = 0;
                }
            });
            workingPity = currentPullPityCounters;
            const newItemInstanceWithUid = createItemInstance(obtainedItemData);
            if (!newItemInstanceWithUid) {
                rewardsDetailed.push({ type: 'error', name: `Ошибка экз. ${obtainedItemData.name}`, rarity: 'Error', icon: '/assets/default-item.png' });
                errorDuringGeneration = true;
                continue;
            }
            newItemInstances.push(newItemInstanceWithUid);
            rewardsDetailed.push({ type: 'gear', id: newItemInstanceWithUid.id, uid: newItemInstanceWithUid.uid, name: newItemInstanceWithUid.name, icon: newItemInstanceWithUid.image, rarity: newItemInstanceWithUid.rarity, level: newItemInstanceWithUid.level || 0, amount: 1 });
            if (chestData.shardPassXp && chestData.shardPassXp > 0) accumulatedShardPassXp += chestData.shardPassXp;
        }

        set(prevState => {
            const finalInventory = [...prevState.inventory, ...newItemInstances];
            return {
                totalGearChestsOpened: (prevState.totalGearChestsOpened || 0) + countToOpen,
                gearChestPity: { ...prevState.gearChestPity, [chestId]: workingPity },
                inventory: finalInventory,
                lastOpenedChestInfo: { chestId: chestId, amount: countToOpen, type: 'gear', name: chestData.name, icon: chestData.icon },
                lastChestRewards: rewardsDetailed
            };
        });
        if (accumulatedShardPassXp > 0) get().addShardPassXp(accumulatedShardPassXp);
        get().trackTaskEvent('open_chest', countToOpen, { chestId: chestId, type: 'gear' });
        get().checkAllAchievements();
        return { success: !errorDuringGeneration, awardedItems: newItemInstances, paymentMethodUsed };
    },

    processArtifactReward: (dropType, targetArtifactId) => {
        if (!targetArtifactId) return { details: null, obtainedFullArtifact: false };
        const artifactData = getArtifactById(targetArtifactId);
        if (!artifactData) return { details: null, obtainedFullArtifact: false };
        let rewardDetails = null;
        let obtainedFullArtifact = false;
        if (dropType === 'artifact_shard') {
            const amount = 1;
            get().addArtifactShards(targetArtifactId, amount);
            rewardDetails = { uid: uuidv4(), type: 'artifact_shard', amount, artifactId: targetArtifactId, icon: artifactData.icon, name: `${artifactData.name} (осколок)`, rarity: artifactData.rarity };
        } else if (dropType === 'full_artifact') {
            obtainedFullArtifact = true;
            const currentArtifactState = get().artifactLevels[targetArtifactId];
            const isCollected = get().collectedArtifacts.has(targetArtifactId);
            const isActive = isCollected && currentArtifactState && currentArtifactState.level > 0;
            const shardAmountOnDuplicate = artifactData.shardValueOnDuplicate || 10;
            if (isActive) {
                get().addArtifactShards(targetArtifactId, shardAmountOnDuplicate);
                rewardDetails = { uid: uuidv4(), type: 'full_artifact_duplicate', artifactId: targetArtifactId, isNew: false, shardAmount: shardAmountOnDuplicate, icon: artifactData.icon, name: artifactData.name, rarity: artifactData.rarity };
            } else {
                set(state => {
                    const newCollected = new Set(state.collectedArtifacts); newCollected.add(targetArtifactId);
                    return { collectedArtifacts: newCollected, artifactLevels: { ...state.artifactLevels, [targetArtifactId]: { shards: (state.artifactLevels[targetArtifactId]?.shards || 0), level: 1, } } };
                });
                get().updatePowerLevel();
                rewardDetails = { uid: uuidv4(), type: 'full_artifact_new', artifactId: targetArtifactId, isNew: true, icon: artifactData.icon, name: artifactData.name, rarity: artifactData.rarity };
            }
        }
        return { details: rewardDetails, obtainedFullArtifact: obtainedFullArtifact };
    },
    openArtifactChest: (chestId) => {
        const state = get();
        const chestData = getArtifactChestById(chestId);
        if (!chestData || !chestData.isEnabled) return { success: false, error: `Сундук ${chestId} не найден или не активен.`, awardedItemDetails: null };
        const currencyName = chestData.cost.currency;
        const costAmount = chestData.cost.price;
        if (currencyName === 'gold') { if (state.gold < costAmount) return { success: false, error: "Недостаточно золота", awardedItemDetails: null }; get().addGold(-costAmount, true); }
        else if (currencyName === 'diamonds') { if (state.diamonds < costAmount) return { success: false, error: "Недостаточно алмазов", awardedItemDetails: null }; get().addDiamonds(-costAmount, true); }
        else { return { success: false, error: `Неподдерживаемая валюта: ${currencyName}`, awardedItemDetails: null }; }

        let currentPityCounter = state.artifactChestPity[chestId] || 0; currentPityCounter++;
        let chosenRewardFromPool = null; let isPityTriggered = false; let targetArtifactRarityFromRoll = null;
        if (chestData.pity && currentPityCounter >= chestData.pity.triggerLimit) {
            isPityTriggered = true;
            const pityRarityObject = selectWeightedRewardType(chestData.pity.guaranteedArtifactRarityPool);
            if (pityRarityObject && pityRarityObject.rarity) { targetArtifactRarityFromRoll = pityRarityObject.rarity; chosenRewardFromPool = { type: 'full_artifact', rarity: targetArtifactRarityFromRoll }; }
            else { chosenRewardFromPool = selectWeightedRewardType(chestData.rewardPool); isPityTriggered = false; }
        } else { chosenRewardFromPool = selectWeightedRewardType(chestData.rewardPool); }
        if (!chosenRewardFromPool) {
            if (currencyName === 'gold') get().addGold(costAmount, false); else if (currencyName === 'diamonds') get().addDiamonds(costAmount, false);
            set(prevState => ({ artifactChestPity: { ...prevState.artifactChestPity, [chestId]: currentPityCounter - 1 } }));
            return { success: false, error: "Ошибка определения награды", awardedItemDetails: null };
        }
        let rewardProcessingResult = { details: null, obtainedFullArtifact: false };
        const rewardType = chosenRewardFromPool.type;
        if (rewardType === 'gold') { const amount = Math.floor(Math.random() * (chosenRewardFromPool.max - chosenRewardFromPool.min + 1)) + chosenRewardFromPool.min; get().addGold(amount); rewardProcessingResult.details = { type: 'gold', amount, icon: '/assets/coin-icon.png', name: 'Золото', rarity: 'Common' }; }
        else if (rewardType === 'diamonds') { const amount = chosenRewardFromPool.amount; get().addDiamonds(amount); rewardProcessingResult.details = { type: 'diamonds', amount, icon: '/assets/diamond-image.png', name: 'Алмазы', rarity: 'Common' }; }
        else if (rewardType === 'full_artifact' || rewardType === 'artifact_shard') {
            targetArtifactRarityFromRoll = chosenRewardFromPool.rarity;
            if (!targetArtifactRarityFromRoll) { rewardProcessingResult.details = { type: 'error', name: `Ошибка: ${rewardType} без редкости`, rarity: 'Error' }; }
            else {
                const targetArtifactId = _selectRandomArtifactIdOfGivenRarity(targetArtifactRarityFromRoll);
                if (!targetArtifactId) { const compensationAmount = Math.round(costAmount * 0.1); get().addGold(compensationAmount); rewardProcessingResult.details = { type: 'gold', amount: compensationAmount, icon: '/assets/coin-icon.png', name: `Компенсация (${rewardType} ${targetArtifactRarityFromRoll})`, rarity: 'Common' }; }
                else { rewardProcessingResult = get().processArtifactReward(rewardType, targetArtifactId); }
            }
        } else { rewardProcessingResult.details = { type: 'error', name: `Неизвестный тип ${rewardType}`, rarity: 'Error' }; }
        if (isPityTriggered || (rewardType === 'full_artifact' && rewardProcessingResult.obtainedFullArtifact)) { currentPityCounter = 0; }
        set((prevState) => ({ artifactChestPity: { ...prevState.artifactChestPity, [chestId]: currentPityCounter }, totalArtifactChestsOpened: (prevState.totalArtifactChestsOpened || 0) + 1, lastOpenedChestInfo: { chestId: chestId, amount: 1, type: 'artifact', name: chestData.name, icon: chestData.icon }, lastChestRewards: rewardProcessingResult.details ? [rewardProcessingResult.details] : [], }));
        if (chestData.shardPassXp && chestData.shardPassXp > 0) get().addShardPassXp(chestData.shardPassXp);
        get().trackTaskEvent('open_chest', 1, { chestId: chestId, type: 'artifact' }); get().checkAllAchievements();
        if (rewardProcessingResult.obtainedFullArtifact || rewardType === 'artifact_shard') get().initializeLevelHp();
        return { success: true, awardedItemDetails: rewardProcessingResult.details };
    },

    openArtifactChestX10: (chestId) => {
        const state = get(); const chestData = getArtifactChestById(chestId);
        if (!chestData || !chestData.isEnabled) return { success: false, error: `Сундук ${chestId} не найден или не активен.`, awardedItemsDetails: [] };
        const currencyName = chestData.cost.currency; const pricePerChest = chestData.cost.price; const totalCost = pricePerChest * 10;
        if (currencyName === 'gold') { if (state.gold < totalCost) return { success: false, error: "Недостаточно золота", awardedItemsDetails: [] }; get().addGold(-totalCost, true); }
        else if (currencyName === 'diamonds') { if (state.diamonds < totalCost) return { success: false, error: "Недостаточно алмазов", awardedItemsDetails: [] }; get().addDiamonds(-totalCost, true); }
        else { return { success: false, error: `Неподдерживаемая валюта: ${currencyName}`, awardedItemsDetails: [] }; }
        let workingPityCounter = state.artifactChestPity[chestId] || 0; const rewardsDetailed = []; let accumulatedShardPassXp = 0; let hasObtainedAnyArtifactMaterialInBatch = false; let anyErrorInBatch = false;
        for (let i = 0; i < 10; i++) {
            workingPityCounter++; let currentPullChosenReward = null; let isThisPullPityTriggered = false; let targetArtifactRarityThisPull = null;
            if (chestData.pity && workingPityCounter >= chestData.pity.triggerLimit) {
                isThisPullPityTriggered = true; const pityRarityObject = selectWeightedRewardType(chestData.pity.guaranteedArtifactRarityPool);
                if (pityRarityObject && pityRarityObject.rarity) { targetArtifactRarityThisPull = pityRarityObject.rarity; currentPullChosenReward = { type: 'full_artifact', rarity: targetArtifactRarityThisPull }; }
                else { currentPullChosenReward = selectWeightedRewardType(chestData.rewardPool); isThisPullPityTriggered = false; }
            } else { currentPullChosenReward = selectWeightedRewardType(chestData.rewardPool); }
            if (!currentPullChosenReward) { rewardsDetailed.push({ type: 'error', name: `Ошибка ролла #${i + 1}`, rarity: 'Error', icon: '/assets/icons/error.png' }); anyErrorInBatch = true; if (isThisPullPityTriggered) workingPityCounter = 0; continue; }
            let currentPullProcessingResult = { details: null, obtainedFullArtifact: false }; const rewardType = currentPullChosenReward.type;
            if (rewardType === 'gold') { const amount = Math.floor(Math.random() * (currentPullChosenReward.max - currentPullChosenReward.min + 1)) + currentPullChosenReward.min; get().addGold(amount); currentPullProcessingResult.details = { type: 'gold', amount, icon: '/assets/coin-icon.png', name: 'Золото', rarity: 'Common' }; }
            else if (rewardType === 'diamonds') { const amount = currentPullChosenReward.amount; get().addDiamonds(amount); currentPullProcessingResult.details = { type: 'diamonds', amount, icon: '/assets/diamond-image.png', name: 'Алмазы', rarity: 'Common' }; }
            else if (rewardType === 'full_artifact' || rewardType === 'artifact_shard') {
                targetArtifactRarityThisPull = currentPullChosenReward.rarity;
                if (!targetArtifactRarityThisPull) { currentPullProcessingResult.details = { type: 'error', name: `Артефакт/осколок без редкости #${i + 1}`, rarity: 'Error', icon: '/assets/icons/error.png' }; anyErrorInBatch = true; }
                else {
                    const targetArtifactId = _selectRandomArtifactIdOfGivenRarity(targetArtifactRarityThisPull);
                    if (!targetArtifactId) { const compensationAmount = Math.round(pricePerChest * 0.1); get().addGold(compensationAmount); currentPullProcessingResult.details = { type: 'gold', amount: compensationAmount, icon: '/assets/icons/currency/gold.png', name: `Компенсация (${rewardType} ${targetArtifactRarityThisPull}) #${i + 1}`, rarity: 'Common' }; }
                    else { currentPullProcessingResult = get().processArtifactReward(rewardType, targetArtifactId); if (!currentPullProcessingResult.details) { anyErrorInBatch = true; currentPullProcessingResult.details = { type: 'error', name: `Ошибка обработки арт. #${i + 1}`, rarity: 'Error', icon: '/assets/icons/error.png' };}}
                }
            } else { currentPullProcessingResult.details = { type: 'error', name: `Неизв. тип #${i + 1}`, rarity: 'Error', icon: '/assets/icons/error.png' }; anyErrorInBatch = true; }
            rewardsDetailed.push(currentPullProcessingResult.details);
            if (isThisPullPityTriggered || (rewardType === 'full_artifact' && currentPullProcessingResult.obtainedFullArtifact)) workingPityCounter = 0;
            if (currentPullProcessingResult.obtainedFullArtifact || rewardType === 'artifact_shard') hasObtainedAnyArtifactMaterialInBatch = true;
            if (chestData.shardPassXp && chestData.shardPassXp > 0) accumulatedShardPassXp += chestData.shardPassXp;
        }
        set((prevState) => ({ artifactChestPity: { ...prevState.artifactChestPity, [chestId]: workingPityCounter }, totalArtifactChestsOpened: (prevState.totalArtifactChestsOpened || 0) + 10, lastOpenedChestInfo: { chestId: chestId, amount: 10, type: 'artifact', name: chestData.name, icon: chestData.icon }, lastChestRewards: rewardsDetailed, }));
        if (accumulatedShardPassXp > 0) get().addShardPassXp(accumulatedShardPassXp);
        get().trackTaskEvent('open_chest', 10, { chestId: chestId, type: 'artifact' }); get().checkAllAchievements();
        if (hasObtainedAnyArtifactMaterialInBatch) get().initializeLevelHp();
        return { success: !anyErrorInBatch, awardedItemsDetails: rewardsDetailed };
    },

    clearLastChestData: () => set({ lastChestRewards: null, lastOpenedChestInfo: null }),
    resetLevelRewards: () => { set({ currentLevelRewards: { gold: 0, diamonds: 0, items: [] } }); },
    addLevelReward: (type, amountOrItem) => {
        if (!type || amountOrItem === undefined || amountOrItem === null) return;
        if ((type === 'gold' || type === 'diamonds') && typeof amountOrItem === 'number' && amountOrItem > 0) {
            set((state) => ({ currentLevelRewards: { ...state.currentLevelRewards, [type]: (state.currentLevelRewards[type] || 0) + amountOrItem } }));
        }
        else if (type === 'item' && typeof amountOrItem === 'object' && amountOrItem.id) {
            const itemInfo = { id: amountOrItem.id, name: amountOrItem.name || 'Предмет', rarity: amountOrItem.rarity || 'Common', icon: amountOrItem.image || amountOrItem.icon || '/assets/icons/item_default.png' };
            set((state) => ({ currentLevelRewards: { ...state.currentLevelRewards, items: [...state.currentLevelRewards.items, itemInfo], } }));
        }
    },
    openLevelChest: (chestInstanceId, chestTypeId) => {
        const state = get(); if (state.levelChestStates[chestInstanceId]) return;
        const chestTypeData = getLevelChestTypeById(chestTypeId); if (!chestTypeData) return;
        const lootTable = chestTypeData.lootTable; const generatedRewardsForPopup = [];
        let collectedGoldThisChest = 0; let collectedDiamondsThisChest = 0;
        lootTable.guaranteed?.forEach(rewardEntry => {
            if (rewardEntry.type === 'gold' || rewardEntry.type === 'diamonds') {
                const amount = Math.floor(Math.random() * (rewardEntry.max - rewardEntry.min + 1)) + rewardEntry.min;
                if (amount > 0) {
                    if (rewardEntry.type === 'gold') { get().addGold(amount); collectedGoldThisChest += amount; }
                    if (rewardEntry.type === 'diamonds') { get().addDiamonds(amount); collectedDiamondsThisChest += amount; }
                    generatedRewardsForPopup.push({ type: rewardEntry.type, amount: amount, name: rewardEntry.type === 'gold' ? 'Золото' : 'Алмазы', icon: rewardEntry.type === 'gold' ? '/assets/icons/currency/gold.png' : '/assets/icons/currency/diamond.png' });
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
                    get().addItemToInventory(itemTemplate.id, 1);
                    generatedRewardsForPopup.push({ type: 'item', id: itemTemplate.id, name: itemTemplate.name, rarity: itemTemplate.rarity, icon: itemTemplate.image });
                    get().addLevelReward('item', itemTemplate);
                }
            } catch (e) { console.error("Ошибка при генерации предмета из сундука уровня:", e); }
        }
        set({ lastOpenedLevelChestRewards: generatedRewardsForPopup, levelChestStates: { ...get().levelChestStates, [chestInstanceId]: true } });
        get().trackTaskEvent('open_chest', 1);
        setTimeout(() => { get().clearLastLevelChestRewards(); }, 4000);
    },
    clearLastLevelChestRewards: () => { if (get().lastOpenedLevelChestRewards !== null) set({ lastOpenedLevelChestRewards: null }); },
    addDebuff: (debuff) => {
        const newDebuff = { ...debuff, id: debuff.id || uuidv4(), endTime: Date.now() + debuff.durationMs, };
        set(state => ({ activeDebuffs: [...state.activeDebuffs, newDebuff] }));
        get().updatePowerLevel(); get().initializeLevelHp();
    },
    removeDebuff: (debuffId) => {
        let changed = false;
        set(state => { const newDebuffs = state.activeDebuffs.filter(d => d.id !== debuffId); if (newDebuffs.length !== state.activeDebuffs.length) changed = true; return { activeDebuffs: newDebuffs }; });
        if (changed) { get().updatePowerLevel(); get().initializeLevelHp(); }
    },
    clearExpiredDebuffs: () => {
        const now = Date.now(); const currentDebuffs = get().activeDebuffs;
        const activeDebuffs = currentDebuffs.filter(debuff => now < debuff.endTime);
        if (activeDebuffs.length < currentDebuffs.length) { set({ activeDebuffs }); get().updatePowerLevel(); get().initializeLevelHp(); }
    },
    setWeakeningAuraStatus: (isActive) => { if (get().isAffectedByWeakeningAura !== isActive) { set({ isAffectedByWeakeningAura: isActive }); get().initializeLevelHp(); get().updatePowerLevel(); } },
    isZoneUnlocked: (zoneId) => {
        const zoneConfig = ALL_ZONES_CONFIG.find(z => z.id === zoneId); if (!zoneConfig) return false;
        if (ALL_ZONES_CONFIG[0]?.id === zoneId || !zoneConfig.unlockCondition) return true;
        const { type, requiredZoneId } = zoneConfig.unlockCondition;
        if (type === 'zone_completed') { if (!requiredZoneId) return false; return !!get().completedZones[requiredZoneId]; }
        return false;
    },
    completeZone: (zoneId) => {
        const zoneConfig = ALL_ZONES_CONFIG.find(z => z.id === zoneId); if (!zoneConfig || get().completedZones[zoneId]) return;
        set(state => ({ completedZones: { ...state.completedZones, [zoneId]: true, } }));
        get().checkAllAchievements();
    },
    getLevelCompletionStatus: (chapterId, levelId) => { const levelKey = `c${chapterId}_l${levelId}`; return get().levelsCompleted[levelKey] || { normal: false, hard: false }; },
    isChapterCompleted: (chapterId, allLevelsInChapter) => {
        if (!allLevelsInChapter || allLevelsInChapter.length === 0) return false;
        for (const level of allLevelsInChapter) { const levelKey = `c${chapterId}_l${level.id}`; const status = get().levelsCompleted[levelKey]; if (!status || !status.normal) return false; }
        return true;
    },
    isLevelUnlocked: (chapterId, levelId, allLevelsInChapter, allLevelsInPrevChapter = null, prevChapterId = null) => {
        if (!allLevelsInChapter || allLevelsInChapter.length === 0) return false;
        const levelIndex = allLevelsInChapter.findIndex(l => l.id === levelId); if (levelIndex === -1) return false;
        if (chapterId === INITIAL_CHAPTER_ID && levelIndex === 0) return true;
        if (levelIndex > 0) { const prevLevelInChapter = allLevelsInChapter[levelIndex - 1]; const prevLevelKey = `c${chapterId}_l${prevLevelInChapter.id}`; const prevLevelStatus = get().levelsCompleted[prevLevelKey]; return !!(prevLevelStatus && prevLevelStatus.normal); }
        if (levelIndex === 0 && chapterId !== INITIAL_CHAPTER_ID) { if (allLevelsInPrevChapter && prevChapterId !== null) return get().isChapterCompleted(prevChapterId, allLevelsInPrevChapter); return false; }
        return false;
    },
    isHardModeUnlocked: (chapterId, levelId) => { const levelKey = `c${chapterId}_l${levelId}`; const status = get().levelsCompleted[levelKey]; return !!(status && status.normal); },
    setIsFullScreenMapActive: (isActive) => { set({ isFullScreenMapActive: isActive }); },
    startScreenTransition: (navigationOrContentChangeCallback, options = {}) => {
        const { isScreenTransitioning, transitionAction: currentAction } = get();
        if (isScreenTransitioning && currentAction === 'closing') return;
        set({
            isScreenTransitioning: true, transitionAction: 'closing', transitionPreservesBottomNav: !!options.preservesBottomNav,
            onTransitionOpenCompleteCallback: null,
            onTransitionCloseCompleteCallback: () => {
                const currentCloseCallback = get().onTransitionCloseCompleteCallback;
                if (currentCloseCallback) set({ onTransitionCloseCompleteCallback: null });
                if (typeof navigationOrContentChangeCallback === 'function') navigationOrContentChangeCallback();
                setTimeout(() => {
                    set({
                        isScreenTransitioning: true, transitionAction: 'opening',
                        onTransitionOpenCompleteCallback: () => {
                            const currentOpenCallback = get().onTransitionOpenCompleteCallback;
                            if (currentOpenCallback) set({ onTransitionOpenCompleteCallback: null });
                            if (typeof options.onScreenOpened === 'function') options.onScreenOpened();
                            set({ isScreenTransitioning: false, transitionAction: null, });
                        }
                    });
                }, 50);
            }
        });
    },
    ensureScreenIsOpening: (options = {}) => {
        const state = get();
        if (state.isScreenTransitioning && state.transitionAction === 'closing') return;
        set({
            isScreenTransitioning: true, transitionAction: 'opening', onTransitionCloseCompleteCallback: null,
            onTransitionOpenCompleteCallback: () => {
                const currentOpenCallback = get().onTransitionOpenCompleteCallback;
                if (currentOpenCallback) set({ onTransitionOpenCompleteCallback: null });
                if (typeof options.onScreenOpened === 'function') options.onScreenOpened();
                set({ isScreenTransitioning: false, transitionAction: null, });
            }
        });
    },
    checkAndResetTreasureChestAttempts: () => set((state) => {
        const nowTs = Date.now(); const lastResetTs = state.treasureChestLastReset;
        if (!lastResetTs) return { treasureChestAttempts: 3, treasureChestLastReset: nowTs };
        const nowUtcDate = new Date(nowTs);
        let lastRefreshMarkerUtcTs = Date.UTC(nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate(), RUNE_ATTEMPTS_REFRESH_HOUR_UTC, 0, 0, 0);
        if (nowTs < lastRefreshMarkerUtcTs) { lastRefreshMarkerUtcTs = Date.UTC(nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate() - 1, RUNE_ATTEMPTS_REFRESH_HOUR_UTC, 0, 0, 0); }
        if (lastResetTs < lastRefreshMarkerUtcTs) return { treasureChestAttempts: 3, treasureChestLastReset: nowTs };
        return {};
    }),
    useTreasureChestAttempt: () => set((state) => { if (state.treasureChestAttempts > 0) return { treasureChestAttempts: state.treasureChestAttempts - 1 }; return {}; }),
    initializeUserFromTelegram: (tgUserData) => {
        if (tgUserData && tgUserData.photo_url) { set({ userPhotoUrl: tgUserData.photo_url }); }
        else { set(state => { if (state.userPhotoUrl !== null) return { userPhotoUrl: null }; return {}; }); }
    },
    checkAndResetDailyTasks: () => set((state) => {
        const nowTs = Date.now(); const lastResetTs = state.lastDailyReset;
        if (!lastResetTs) {
            const initialProgress = {}; (ALL_TASK_DEFINITIONS[TASK_TYPES.DAILY] || []).forEach(task => { initialProgress[task.id] = { progress: 0, completed: false, claimed: false }; });
            return { dailyTaskProgress: initialProgress, dailyTaskBarXp: 0, dailyBonusClaimed: false, lastDailyReset: nowTs, dailyLoginToday: false, killsToday: 0, levelsCompletedToday: 0, gearUpgradedToday: 0, chestsOpenedToday: 0, itemsForgedToday: 0 };
        }
        const nowUtcDate = new Date(nowTs);
        let lastRefreshMarkerUtcTs = Date.UTC(nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate(), DAILY_TASKS_REFRESH_HOUR_UTC, 0, 0, 0);
        if (nowTs < lastRefreshMarkerUtcTs) { const yesterdayUtcDate = new Date(nowTs - 24 * 60 * 60 * 1000); lastRefreshMarkerUtcTs = Date.UTC(yesterdayUtcDate.getUTCFullYear(), yesterdayUtcDate.getUTCMonth(), yesterdayUtcDate.getUTCDate(), DAILY_TASKS_REFRESH_HOUR_UTC, 0, 0, 0); }
        if (lastResetTs < lastRefreshMarkerUtcTs) {
            const initialProgress = {}; (ALL_TASK_DEFINITIONS[TASK_TYPES.DAILY] || []).forEach(task => { initialProgress[task.id] = { progress: 0, completed: false, claimed: false }; });
            return { dailyTaskProgress: initialProgress, dailyTaskBarXp: 0, dailyBonusClaimed: false, lastDailyReset: nowTs, dailyLoginToday: false, killsToday: 0, levelsCompletedToday: 0, gearUpgradedToday: 0, chestsOpenedToday: 0, itemsForgedToday: 0 };
        }
        return {};
    }),
    checkAndResetWeeklyTasks: () => set((state) => {
        const nowTs = Date.now(); const lastResetTs = state.lastWeeklyReset;
        if (!lastResetTs) {
            const initialProgress = {}; (ALL_TASK_DEFINITIONS[TASK_TYPES.WEEKLY] || []).forEach(task => { initialProgress[task.id] = { progress: 0, completed: false, claimed: false }; });
            return { weeklyTaskProgress: initialProgress, weeklyTaskBarXp: 0, weeklyBonusClaimed: false, lastWeeklyReset: nowTs, weeklyLoginDays: 0, killsThisWeek: 0, levelsCompletedThisWeek: 0, gearUpgradedThisWeek: 0, chestsOpenedThisWeek: 0, itemsForgedThisWeek: 0, lastSeenLoginDateForWeekly: null, };
        }
        const nowUtcDate = new Date(nowTs); const currentUtcDay = nowUtcDate.getUTCDay();
        let daysToLastRefreshDay = (currentUtcDay - WEEKLY_TASKS_REFRESH_DAY_UTC + 7) % 7;
        const lastRefreshDayDate = new Date(Date.UTC(nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate() - daysToLastRefreshDay));
        let lastRefreshMarkerUtcTs = Date.UTC(lastRefreshDayDate.getUTCFullYear(), lastRefreshDayDate.getUTCMonth(), lastRefreshDayDate.getUTCDate(), WEEKLY_TASKS_REFRESH_HOUR_UTC, 0, 0, 0);
        if (currentUtcDay === WEEKLY_TASKS_REFRESH_DAY_UTC && nowTs < lastRefreshMarkerUtcTs) { const prevRefreshWeekDate = new Date(Date.UTC(nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), nowUtcDate.getUTCDate() - 7)); lastRefreshMarkerUtcTs = Date.UTC(prevRefreshWeekDate.getUTCFullYear(), prevRefreshWeekDate.getUTCMonth(), prevRefreshWeekDate.getUTCDate(), WEEKLY_TASKS_REFRESH_HOUR_UTC, 0, 0, 0); }
        if (lastResetTs < lastRefreshMarkerUtcTs) {
            const initialProgress = {}; (ALL_TASK_DEFINITIONS[TASK_TYPES.WEEKLY] || []).forEach(task => { initialProgress[task.id] = { progress: 0, completed: false, claimed: false }; });
            return { weeklyTaskProgress: initialProgress, weeklyTaskBarXp: 0, weeklyBonusClaimed: false, lastWeeklyReset: nowTs, weeklyLoginDays: 0, killsThisWeek: 0, levelsCompletedThisWeek: 0, gearUpgradedThisWeek: 0, chestsOpenedThisWeek: 0, itemsForgedThisWeek: 0, lastSeenLoginDateForWeekly: null, };
        }
        return {};
    }),
    checkAndResetMonthlyTasks: () => set((state) => {
        const nowTs = Date.now(); const lastResetTs = state.lastMonthlyReset;
        if (!lastResetTs) {
            const initialProgress = {}; (ALL_TASK_DEFINITIONS[TASK_TYPES.MONTHLY] || []).forEach(task => { initialProgress[task.id] = { progress: 0, completed: false, claimed: false }; });
            return { monthlyTaskProgress: initialProgress, monthlyTaskBarXp: 0, monthlyBonusClaimed: false, lastMonthlyReset: nowTs, monthlyLoginDays: 0, killsThisMonth: 0, levelsCompletedThisMonth: 0, gearUpgradedThisMonth: 0, chestsOpenedThisMonth: 0, itemsForgedThisMonth: 0, lastSeenLoginDateForMonthly: null, };
        }
        const nowUtcDate = new Date(nowTs);
        let currentMonthRefreshMarkerUtcTs = Date.UTC(nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth(), MONTHLY_TASKS_REFRESH_DAY_OF_MONTH_UTC, MONTHLY_TASKS_REFRESH_HOUR_UTC, 0, 0, 0);
        let lastRefreshMarkerUtcTs = (nowTs >= currentMonthRefreshMarkerUtcTs) ? currentMonthRefreshMarkerUtcTs : Date.UTC(new Date(Date.UTC(nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth() - 1, 1)).getUTCFullYear(), new Date(Date.UTC(nowUtcDate.getUTCFullYear(), nowUtcDate.getUTCMonth() - 1, 1)).getUTCMonth(), MONTHLY_TASKS_REFRESH_DAY_OF_MONTH_UTC, MONTHLY_TASKS_REFRESH_HOUR_UTC, 0, 0, 0);
        if (lastResetTs < lastRefreshMarkerUtcTs) {
            const initialProgress = {}; (ALL_TASK_DEFINITIONS[TASK_TYPES.MONTHLY] || []).forEach(task => { initialProgress[task.id] = { progress: 0, completed: false, claimed: false }; });
            return { monthlyTaskProgress: initialProgress, monthlyTaskBarXp: 0, monthlyBonusClaimed: false, lastMonthlyReset: nowTs, monthlyLoginDays: 0, killsThisMonth: 0, levelsCompletedThisMonth: 0, gearUpgradedThisMonth: 0, chestsOpenedThisMonth: 0, itemsForgedThisMonth: 0, lastSeenLoginDateForMonthly: null, };
        }
        return {};
    }),

    trackTaskEvent: (eventType, amount = 1, eventDetails = {}) => {
        const state = get(); let counterChanges = {}; const nowForCounters = new Date(); const todayDateString = nowForCounters.toISOString().split('T')[0];
        switch (eventType) {
            case 'login':
                if (!state.dailyLoginToday) counterChanges.dailyLoginToday = true;
                if (state.lastSeenLoginDateForWeekly !== todayDateString) { counterChanges.weeklyLoginDays = (state.weeklyLoginDays || 0) + 1; counterChanges.lastSeenLoginDateForWeekly = todayDateString; }
                if (state.lastSeenLoginDateForMonthly !== todayDateString) { counterChanges.monthlyLoginDays = (state.monthlyLoginDays || 0) + 1; counterChanges.lastSeenLoginDateForMonthly = todayDateString; }
                if (state.lastLoginDateForUniqueCount !== todayDateString) { counterChanges.uniqueLoginDaysCount = (state.uniqueLoginDaysCount || 0) + 1; counterChanges.lastLoginDateForUniqueCount = todayDateString; }
                break;
            case 'kill_monster': counterChanges.killsToday = (state.killsToday || 0) + amount; counterChanges.killsThisWeek = (state.killsThisWeek || 0) + amount; counterChanges.killsThisMonth = (state.killsThisMonth || 0) + amount; break;
            case 'complete_level': counterChanges.levelsCompletedToday = (state.levelsCompletedToday || 0) + amount; counterChanges.levelsCompletedThisWeek = (state.levelsCompletedThisWeek || 0) + amount; counterChanges.levelsCompletedThisMonth = (state.levelsCompletedThisMonth || 0) + amount; break;
            case 'upgrade_gear': counterChanges.gearUpgradedToday = (state.gearUpgradedToday || 0) + amount; counterChanges.gearUpgradedThisWeek = (state.gearUpgradedThisWeek || 0) + amount; counterChanges.gearUpgradedThisMonth = (state.gearUpgradedThisMonth || 0) + amount; break;
            case 'open_chest': counterChanges.chestsOpenedToday = (state.chestsOpenedToday || 0) + amount; counterChanges.chestsOpenedThisWeek = (state.chestsOpenedThisWeek || 0) + amount; counterChanges.chestsOpenedThisMonth = (state.chestsOpenedThisMonth || 0) + amount; break;
            case 'forge_item': counterChanges.itemsForgedToday = (state.itemsForgedToday || 0) + amount; counterChanges.itemsForgedThisWeek = (state.itemsForgedThisWeek || 0) + amount; counterChanges.itemsForgedThisMonth = (state.itemsForgedThisMonth || 0) + amount; break;
        }
        if (Object.keys(counterChanges).length > 0) set(counterChanges);
        const updatedState = get();
        let newDailyProgress = { ...updatedState.dailyTaskProgress }; let newWeeklyProgress = { ...updatedState.weeklyTaskProgress }; let newMonthlyProgress = { ...updatedState.monthlyTaskProgress };
        let anyStandardTaskProgressChanged = false;
        const standardTaskProcessingLogic = (taskDef, progressObject, taskType) => {
            const taskState = progressObject[taskDef.id] || { progress: 0, completed: false, initialStatValue: 0 }; if (taskState.completed) return false;
            let currentEventValueForTask = 0; let taskAffectedByThisEvent = false;
            if (taskDef.eventTracked === eventType || (eventType === 'login' && ['dailyLoginToday', 'weeklyLoginDays', 'monthlyLoginDays'].includes(taskDef.eventTracked)) || (eventType === 'kill_monster' && ['killsToday', 'killsThisWeek', 'killsThisMonth', 'totalKills'].includes(taskDef.eventTracked)) || (eventType === 'complete_level' && ['levelsCompletedToday', 'levelsCompletedThisWeek', 'levelsCompletedThisMonth'].includes(taskDef.eventTracked)) || (eventType === 'upgrade_gear' && ['gearUpgradedToday', 'gearUpgradedThisWeek', 'gearUpgradedThisMonth'].includes(taskDef.eventTracked)) || (eventType === 'open_chest' && ['chestsOpenedToday', 'chestsOpenedThisWeek', 'chestsOpenedThisMonth'].includes(taskDef.eventTracked)) || (eventType === 'forge_item' && ['itemsForgedToday', 'itemsForgedThisWeek', 'itemsForgedThisMonth'].includes(taskDef.eventTracked))) {
                taskAffectedByThisEvent = true;
                if (updatedState.hasOwnProperty(taskDef.eventTracked)) { currentEventValueForTask = updatedState[taskDef.eventTracked] || 0; if (taskDef.eventTracked === 'dailyLoginToday') currentEventValueForTask = updatedState.dailyLoginToday ? 1 : 0; }
                else if (taskDef.eventTracked === eventType && taskDef.countIncrementally) { currentEventValueForTask = (taskState.progress || 0) + amount; }
                else if (taskDef.eventTracked === eventType) { currentEventValueForTask = amount; }
            }
            if (taskAffectedByThisEvent) {
                currentEventValueForTask = Number(currentEventValueForTask) || 0; const newProgress = Math.min(currentEventValueForTask, taskDef.target);
                if (newProgress !== taskState.progress || (newProgress >= taskDef.target && !taskState.completed)) { progressObject[taskDef.id] = { ...taskState, progress: newProgress, completed: newProgress >= taskDef.target }; if (progressObject[taskDef.id].completed && !taskState.completed) console.log(`[Tasks_Standard] ${taskType} task '${taskDef.id}' COMPLETED!`); return true; }
            } return false;
        };
        [TASK_TYPES.DAILY, TASK_TYPES.WEEKLY, TASK_TYPES.MONTHLY].forEach(taskType => {
            const definitions = ALL_TASK_DEFINITIONS[taskType] || []; let progressMap;
            if (taskType === TASK_TYPES.DAILY) progressMap = newDailyProgress; else if (taskType === TASK_TYPES.WEEKLY) progressMap = newWeeklyProgress; else if (taskType === TASK_TYPES.MONTHLY) progressMap = newMonthlyProgress; else return;
            definitions.forEach(taskDef => { if (taskDef.eventTracked && standardTaskProcessingLogic(taskDef, progressMap, taskType)) anyStandardTaskProgressChanged = true; });
        });
        if (anyStandardTaskProgressChanged) set({ dailyTaskProgress: newDailyProgress, weeklyTaskProgress: newWeeklyProgress, monthlyTaskProgress: newMonthlyProgress, });

        let newShardPassTasksProgressFromEvent = JSON.parse(JSON.stringify(updatedState.shardPassTasksProgress));
        let anyShardPassTaskProgressChangedThisEvent = false;
        const currentTimeMs = new Date().getTime();
        Object.keys(shardPassTaskDefinitionsByWeek).forEach(weekKeyString => {
            const weekNumInt = parseInt(weekKeyString, 10);
            const weekUnlockTimestamp = getUnlockDateTimeForWeek(weekNumInt, SEASON_START_DATE_UTC).getTime();
            if (currentTimeMs < weekUnlockTimestamp) return;
            if (!newShardPassTasksProgressFromEvent[weekKeyString]) newShardPassTasksProgressFromEvent[weekKeyString] = {};
            if (shardPassTaskDefinitionsByWeek[weekKeyString]) {
                shardPassTaskDefinitionsByWeek[weekKeyString].forEach(taskDef => {
                    let spTaskState = newShardPassTasksProgressFromEvent[weekKeyString][taskDef.id];
                    if (!spTaskState) { spTaskState = { progress: 0, isClaimed: false, ...(taskDef.eventTracked === 'login' && { lastCountedLoginDate: null }) }; newShardPassTasksProgressFromEvent[weekKeyString][taskDef.id] = spTaskState; }
                    else if (taskDef.eventTracked === 'login' && spTaskState.lastCountedLoginDate === undefined) spTaskState.lastCountedLoginDate = null;
                    if (spTaskState.isClaimed) return;
                    if (taskDef.eventTracked === eventType) {
                        let matchCondition = true; if (taskDef.condition) matchCondition = Object.keys(taskDef.condition).every(key => eventDetails.hasOwnProperty(key) && eventDetails[key] === taskDef.condition[key]);
                        if (matchCondition) {
                            if (taskDef.eventTracked === 'login') { if ((spTaskState.progress || 0) < taskDef.targetProgress) { const todayForLoginTask = new Date().toISOString().split('T')[0]; if (spTaskState.lastCountedLoginDate !== todayForLoginTask) { const newProgressLogin = (spTaskState.progress || 0) + 1; newShardPassTasksProgressFromEvent[weekKeyString][taskDef.id] = { ...spTaskState, progress: newProgressLogin, lastCountedLoginDate: todayForLoginTask, }; anyShardPassTaskProgressChangedThisEvent = true;}}}
                            else { const currentProgress = spTaskState.progress || 0; const newProgress = Math.min(currentProgress + amount, taskDef.targetProgress); if (newProgress !== currentProgress || (newProgress === taskDef.targetProgress && currentProgress < taskDef.targetProgress)) { newShardPassTasksProgressFromEvent[weekKeyString][taskDef.id] = { ...spTaskState, progress: newProgress, }; anyShardPassTaskProgressChangedThisEvent = true; }}
                        }
                    }
                });
            }
        });
        if (anyShardPassTaskProgressChangedThisEvent) set({ shardPassTasksProgress: newShardPassTasksProgressFromEvent });
        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
    },
    claimTaskReward: (taskType, taskId) => {
        const state = get(); let progressObjectKey, taskBarXpKey, taskDefinitionsForType; let changesToSet = {};
        if (taskType === TASK_TYPES.DAILY) { progressObjectKey = 'dailyTaskProgress'; taskBarXpKey = 'dailyTaskBarXp'; taskDefinitionsForType = ALL_TASK_DEFINITIONS[TASK_TYPES.DAILY]; }
        else if (taskType === TASK_TYPES.WEEKLY) { progressObjectKey = 'weeklyTaskProgress'; taskBarXpKey = 'weeklyTaskBarXp'; taskDefinitionsForType = ALL_TASK_DEFINITIONS[TASK_TYPES.WEEKLY]; }
        else if (taskType === TASK_TYPES.MONTHLY) { progressObjectKey = 'monthlyTaskProgress'; taskBarXpKey = 'monthlyTaskBarXp'; taskDefinitionsForType = ALL_TASK_DEFINITIONS[TASK_TYPES.MONTHLY]; }
        else return;
        const currentTaskProgressMap = state[progressObjectKey]; const taskState = currentTaskProgressMap ? currentTaskProgressMap[taskId] : null; const taskDef = taskDefinitionsForType ? taskDefinitionsForType.find(t => t.id === taskId) : null;
        if (taskState && taskDef && taskState.completed && !taskState.claimed) {
            if (taskDef.reward) { if (taskDef.reward.diamonds) get().addDiamonds(taskDef.reward.diamonds); if (taskDef.reward.gold) get().addGold(taskDef.reward.gold); }
            const newProgressMap = { ...state[progressObjectKey], [taskId]: { ...taskState, claimed: true } }; changesToSet[progressObjectKey] = newProgressMap;
            const newXp = (state[taskBarXpKey] || 0) + (taskDef.xp || 0); changesToSet[taskBarXpKey] = newXp;
            if (Object.keys(changesToSet).length > 0) set(changesToSet);
            get().checkAllAchievements(); get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        }
    },
    claimBonusReward: (taskType) => {
        const state = get(); const bonusConfig = BONUS_REWARDS_CONFIG[taskType]; if (!bonusConfig) return;
        let taskBarXpKey, bonusClaimedKey;
        if (taskType === TASK_TYPES.DAILY) { taskBarXpKey = 'dailyTaskBarXp'; bonusClaimedKey = 'dailyBonusClaimed'; }
        else if (taskType === TASK_TYPES.WEEKLY) { taskBarXpKey = 'weeklyTaskBarXp'; bonusClaimedKey = 'weeklyBonusClaimed'; }
        else if (taskType === TASK_TYPES.MONTHLY) { taskBarXpKey = 'monthlyTaskBarXp'; bonusClaimedKey = 'monthlyBonusClaimed'; }
        else return;
        let changesToSet = {};
        if ((state[taskBarXpKey] || 0) >= bonusConfig.xpRequired && !state[bonusClaimedKey]) {
            const reward = bonusConfig.reward;
            if (reward.type === 'item_key' && reward.itemId) { console.warn(`[Tasks] Bonus item_key: ${reward.name || reward.itemId} x${reward.quantity || 1}. Implement properly`); }
            else if (reward.type === 'currency' && reward.currencyId) { if (reward.currencyId === 'diamonds') get().addDiamonds(reward.quantity); else if (reward.currencyId === 'gold') get().addGold(reward.quantity); else if (reward.currencyId === 'toncoin_shards') get().addToncoinShards(reward.quantity); }
            changesToSet[bonusClaimedKey] = true; set(changesToSet);
            get().checkAllAchievements(); get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        }
    },
    purchaseShardPassPremium: () => {
        const currentPremiumStatus = get().isShardPassPremium; if (currentPremiumStatus) return { success: false, message: "Премиум уже активен." };
        set({ isShardPassPremium: true }); get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        return { success: true, message: "ShardPass Premium успешно активирован!" };
    },
    addShardPassXp: (xpToAdd) => {
        set((state) => {
            if (state.shardPassCurrentLevel >= state.shardPassMaxLevel) return {};
            let newCurrentXp = state.shardPassCurrentXp + xpToAdd; let newCurrentLevel = state.shardPassCurrentLevel;
            while (newCurrentXp >= state.shardPassXpPerLevel && newCurrentLevel < state.shardPassMaxLevel) { newCurrentXp -= state.shardPassXpPerLevel; newCurrentLevel++; }
            if (newCurrentLevel >= state.shardPassMaxLevel) { newCurrentXp = 0; if (newCurrentLevel > state.shardPassMaxLevel) newCurrentLevel = state.shardPassMaxLevel; }
            return { shardPassCurrentXp: newCurrentXp, shardPassCurrentLevel: newCurrentLevel, };
        });
        if (get().setHasClaimableRewardsIndicator && get().checkIfAnyTaskOrAchievementIsClaimable) get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
    },
    claimShardPassReward: (level, isPremiumTrack) => {
        const state = get(); const rewardKey = `level_${level}_${isPremiumTrack ? 'premium' : 'free'}`;
        if (level > state.shardPassCurrentLevel) return { success: false, message: "Уровень еще не достигнут." };
        if (isPremiumTrack && !state.isShardPassPremium) return { success: false, message: "Требуется ShardPass Premium." };
        if (state.shardPassRewardsClaimed[rewardKey]) return { success: false, message: "Награда уже получена." };
        const levelDefinition = shardPassSeasonDefinitions.levels.find(l => l.level === level); if (!levelDefinition) return { success: false, message: "Ошибка определения награды." };
        const rewardToClaim = isPremiumTrack ? levelDefinition.premiumReward : levelDefinition.freeReward; if (!rewardToClaim) return { success: false, message: "Награда не определена для этого уровня/типа." };
        if (rewardToClaim.type === 'gold') get().addGold(rewardToClaim.amount);
        else if (rewardToClaim.type === 'diamonds') get().addDiamonds(rewardToClaim.amount);
        else if (rewardToClaim.type === 'toncoin_shards') get().addToncoinShards(rewardToClaim.amount);
        else if (rewardToClaim.type === 'item' && rewardToClaim.itemId) get().addItemToInventory(rewardToClaim.itemId, rewardToClaim.amount || 1);
        else if (rewardToClaim.type === 'energy') get().addEnergy(rewardToClaim.amount);
        else if (rewardToClaim.type === REWARD_TYPES.RARE_CHEST_KEY) get().addKeys(REWARD_TYPES.RARE_CHEST_KEY, rewardToClaim.amount || 1);
        else if (rewardToClaim.type === REWARD_TYPES.EPIC_CHEST_KEY) get().addKeys(REWARD_TYPES.EPIC_CHEST_KEY, rewardToClaim.amount || 1);
        set(prevState => ({ shardPassRewardsClaimed: { ...prevState.shardPassRewardsClaimed, [rewardKey]: true, } }));
        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        return { success: true, message: `Награда "${rewardToClaim.name || 'N/A'}" получена!`, reward: rewardToClaim };
    },
    claimAllShardPassRewards: () => {
        const state = get(); const claimedRewardsList = []; let changesMade = false;
        shardPassSeasonDefinitions.levels.forEach(levelDef => {
            if (levelDef.level <= state.shardPassCurrentLevel) {
                const freeRewardKey = `level_${levelDef.level}_free`;
                if (levelDef.freeReward && !state.shardPassRewardsClaimed[freeRewardKey]) { const result = get().claimShardPassReward(levelDef.level, false); if (result.success && result.reward) { claimedRewardsList.push(result.reward); changesMade = true; } }
                if (state.isShardPassPremium) { const premiumRewardKey = `level_${levelDef.level}_premium`; if (levelDef.premiumReward && !state.shardPassRewardsClaimed[premiumRewardKey]) { const result = get().claimShardPassReward(levelDef.level, true); if (result.success && result.reward) { claimedRewardsList.push(result.reward); changesMade = true; } } }
            }
        });
        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        return claimedRewardsList;
    },
    claimShardPassTaskReward: (weekNumber, taskId) => {
        const state = get(); const weekKey = String(weekNumber);
        const taskDef = shardPassTaskDefinitionsByWeek[weekKey]?.find(t => t.id === taskId); if (!taskDef) return { success: false, message: "Задача не найдена." };
        const taskProgressState = state.shardPassTasksProgress[weekKey]?.[taskId]; if (!taskProgressState) return { success: false, message: "Состояние задачи не найдено." };
        if (taskDef.isPremium && !state.isShardPassPremium) return { success: false, message: "Требуется ShardPass Premium для получения награды за это задание." };
        if (taskProgressState.isClaimed) return { success: false, message: "Награда за задание уже получена." };
        if (taskProgressState.progress < taskDef.targetProgress) return { success: false, message: "Задание еще не выполнено." };
        get().addShardPassXp(taskDef.rewardXP);
        set(prevState => { const newTasksProgress = JSON.parse(JSON.stringify(prevState.shardPassTasksProgress)); if (!newTasksProgress[weekKey]) newTasksProgress[weekKey] = {}; newTasksProgress[weekKey][taskId] = { ...newTasksProgress[weekKey][taskId], isClaimed: true, }; return { shardPassTasksProgress: newTasksProgress }; });
        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        return { success: true, message: `Награда за задание "${taskDef.name}" получена! (+${taskDef.rewardXP} XP)` };
    },
    markTrialActionTaken: (trialId) => {
        const trialDef = trialsData.find(t => t.id === trialId); if (!trialDef) return;
        set(state => { const currentTrialStatus = state.trialsStatus[trialId] || { actionTaken: false, rewardClaimed: false }; if (currentTrialStatus.actionTaken && !trialDef.isRecurring) return {}; return { trialsStatus: { ...state.trialsStatus, [trialId]: { ...currentTrialStatus, actionTaken: true } } }; });
        get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
    },
    claimTrialReward: (trialId) => {
        const trialDef = trialsData.find(t => t.id === trialId); if (!trialDef) return { success: false, message: "Испытание не найдено." };
        const state = get(); const currentTrialStatus = state.trialsStatus[trialId] || { actionTaken: false, rewardClaimed: false };
        if (!currentTrialStatus.actionTaken) return { success: false, message: "Сначала выполните действие." };
        if (currentTrialStatus.rewardClaimed && !trialDef.isRecurring) return { success: false, message: "Награда уже получена." };
        const reward = trialDef.reward; let rewardGiven = false;
        if (reward) {
            if (reward.type === 'gold') { get().addGold(reward.amount); rewardGiven = true; }
            else if (reward.type === 'diamonds') { get().addDiamonds(reward.amount); rewardGiven = true; }
            else if (reward.type === 'toncoin_shards') { get().addToncoinShards(reward.amount); rewardGiven = true; }
            else if (reward.type === REWARD_TYPES.RARE_CHEST_KEY || reward.type === 'rareChestKeys') { get().addKeys(REWARD_TYPES.RARE_CHEST_KEY, reward.amount || 1); rewardGiven = true; }
            else if (reward.type === REWARD_TYPES.EPIC_CHEST_KEY || reward.type === 'epicChestKeys') { get().addKeys(REWARD_TYPES.EPIC_CHEST_KEY, reward.amount || 1); rewardGiven = true; }
        }
        if (!rewardGiven && !trialDef.isRecurring) return { success: false, message: "Награда не определена или не обработана." };
        set(prevState => { const newStatus = { ...prevState.trialsStatus, [trialId]: { ...currentTrialStatus, actionTaken: trialDef.isRecurring ? false : true, rewardClaimed: true } }; if (trialDef.isRecurring && trialDef.resetsAfterClaim) newStatus[trialId] = { actionTaken: false, rewardClaimed: false }; return { trialsStatus: newStatus }; });
        get().checkAllAchievements(); get().setHasClaimableRewardsIndicator(get().checkIfAnyTaskOrAchievementIsClaimable());
        return { success: true, message: `Награда за "${trialDef.name}" получена!` };
    },
    checkIfAnyTaskOrAchievementIsClaimable: () => {
        const state = get();
        const taskTypes = [TASK_TYPES.DAILY, TASK_TYPES.WEEKLY, TASK_TYPES.MONTHLY];
        for (const taskType of taskTypes) {
            const progressKey = `${taskType.toLowerCase()}TaskProgress`; const taskProgressMap = state[progressKey];
            if (taskProgressMap) { for (const taskId in taskProgressMap) { if (taskProgressMap[taskId].completed && !taskProgressMap[taskId].claimed) return true; } }
            const bonusConfig = BONUS_REWARDS_CONFIG[taskType];
            if (bonusConfig) { const xpKey = `${taskType.toLowerCase()}TaskBarXp`; const claimedKey = `${taskType.toLowerCase()}BonusClaimed`; if ((state[xpKey] || 0) >= bonusConfig.xpRequired && !state[claimedKey]) return true; }
        }
        if (achievementsData && state.achievementsStatus) { for (const achLine of achievementsData) { const status = state.achievementsStatus[achLine.id]; if (status && status.highestReachedLevel > status.claimedRewardsUpToLevel) return true; } }
        if (trialsData && state.trialsStatus) { for (const trial of trialsData) { const status = state.trialsStatus[trial.id]; if (status && status.actionTaken && !status.rewardClaimed) return true; } }
        if (shardPassSeasonDefinitions && state.shardPassRewardsClaimed) {
            for (const levelDef of shardPassSeasonDefinitions.levels) {
                if (levelDef.level <= state.shardPassCurrentLevel) {
                    const freeKey = `level_${levelDef.level}_free`; if (levelDef.freeReward && !state.shardPassRewardsClaimed[freeKey]) return true;
                    if (state.isShardPassPremium) { const premiumKey = `level_${levelDef.level}_premium`; if (levelDef.premiumReward && !state.shardPassRewardsClaimed[premiumKey]) return true; }
                }
            }
        }
        if (shardPassTaskDefinitionsByWeek && state.shardPassTasksProgress) {
            for (const weekKey in shardPassTaskDefinitionsByWeek) {
                const weekTasks = shardPassTaskDefinitionsByWeek[weekKey]; const weekProgress = state.shardPassTasksProgress[weekKey];
                if (weekTasks && weekProgress) {
                    for (const taskDef of weekTasks) {
                        const taskState = weekProgress[taskDef.id];
                        if (taskState && !taskState.isClaimed && (taskState.progress || 0) >= taskDef.targetProgress) { if (taskDef.isPremium && !state.isShardPassPremium) continue; return true; }
                    }
                }
            }
        }
        return false;
    },

    resetGame: () => {
        const defaultEquipped = getDefaultEquippedSet();
        const defaultStateForTasksOnReset = {
            dailyTaskProgress: {}, dailyTaskBarXp: 0, dailyBonusClaimed: false, lastDailyReset: null,
            dailyLoginToday: false, killsToday: 0, levelsCompletedToday: 0, gearUpgradedToday: 0, chestsOpenedToday: 0, itemsForgedToday: 0,
            lastSeenLoginDateForWeekly: null, lastSeenLoginDateForMonthly: null,
            weeklyTaskProgress: {}, weeklyTaskBarXp: 0, weeklyBonusClaimed: false, lastWeeklyReset: null,
            weeklyLoginDays: 0, killsThisWeek: 0, levelsCompletedThisWeek: 0, gearUpgradedThisWeek: 0, chestsOpenedThisWeek: 0, itemsForgedThisWeek: 0,
            monthlyTaskProgress: {}, monthlyTaskBarXp: 0, monthlyBonusClaimed: false, lastMonthlyReset: null,
            monthlyLoginDays: 0, killsThisMonth: 0, levelsCompletedThisMonth: 0, gearUpgradedThisMonth: 0, chestsOpenedThisMonth: 0, itemsForgedThisMonth: 0,
        };
        const defaultShardPassOnReset = getDefaultShardPassState();
        const defaultTrialsStatusOnReset = {};
        if (trialsData && Array.isArray(trialsData)) { trialsData.forEach(trial => { defaultTrialsStatusOnReset[trial.id] = { actionTaken: false, rewardClaimed: false }; }); }
        const defaultAchStatusOnReset = {};
        if (achievementsData && Array.isArray(achievementsData)) { achievementsData.forEach(achLine => { defaultAchStatusOnReset[achLine.id] = { highestReachedLevel: 0, claimedRewardsUpToLevel: 0, currentValue: 0 }; }); }

        const newDefaultStatsForAchievementsOnReset = {
            uniqueLoginDaysCount: 0, lastLoginDateForUniqueCount: null,
            totalGoldSpent: 0, totalDiamondsSpent: 0,
            totalTonShardsEarned: 0, totalTonWithdrawn: 0,
            totalGearUpgradesPerformed: 0,
            totalItemsCrafted: 0,
            // ▼▼▼ НОВОЕ ▼▼▼
            previouslyEquippedUniqueTypesByRarity: deserializePreviouslyEquipped(null),
            // ▲▲▲ КОНЕЦ НОВОГО ▲▲▲
        };

        set({
            gold: 100000, diamonds: 10000, toncoinShards: 0, toncoinBalance: 0,
            rareChestKeys: 10, epicChestKeys: 25,
            username: null, powerLevel: 0, userPhotoUrl: null,
            playerBaseStats: { ...DEFAULT_BASE_STATS },
            playerHp: DEFAULT_BASE_STATS.hp,
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
            energyMax: DEFAULT_MAX_ENERGY, energyCurrent: DEFAULT_MAX_ENERGY, lastEnergyRefillTimestamp: Date.now(),
            treasureChestAttempts: 3, treasureChestLastReset: null,
            completedZones: {}, currentChapterId: INITIAL_CHAPTER_ID,
            levelChestStates: {}, lastOpenedLevelChestRewards: null,
            hasClaimableRewardsIndicator: false,
            ...defaultStateForTasksOnReset,
            ...defaultShardPassOnReset,
            ...newDefaultStatsForAchievementsOnReset, // Includes previouslyEquippedUniqueTypesByRarity
        });
        localStorage.removeItem(STORAGE_KEY);
        const storeActions = get();
        if (storeActions.updatePowerLevel) storeActions.updatePowerLevel();
        if (storeActions.checkAndRefreshDailyDeals) storeActions.checkAndRefreshDailyDeals();
        if (storeActions.initializeLevelHp) storeActions.initializeLevelHp();
        if (storeActions.checkAndResetDailyTasks) storeActions.checkAndResetDailyTasks();
        if (storeActions.checkAndResetWeeklyTasks) storeActions.checkAndResetWeeklyTasks();
        if (storeActions.checkAndResetMonthlyTasks) storeActions.checkAndResetMonthlyTasks();
        console.log("Game has been reset to default state including ShardPass and new achievement stats.");
    },
}));

useGameStore.subscribe((state) => {
    const {
        gold, diamonds, toncoinShards, toncoinBalance, username, inventory, equipped, powerLevel,
        playerBaseStats, playerHp, playerRace,
        energyCurrent, energyMax, lastEnergyRefillTimestamp,
        dailyDeals, rareChestKeys, epicChestKeys, dailyDealsLastGenerated, dailyShopPurchases,
        achievementsStatus,
        trialsStatus,
        totalGoldCollected, totalKills,
        booleanFlags, levelsCompleted,
        achievementLevel, achievementXp,
        collectedArtifacts, artifactLevels, artifactChestPity,
        totalArtifactChestsOpened, gearChestPity, totalGearChestsOpened,
        activeDebuffs, treasureChestAttempts, treasureChestLastReset,
        userPhotoUrl, currentChapterId, completedZones, isAffectedByWeakeningAura,
        levelChestStates,
        dailyTaskProgress, dailyTaskBarXp, dailyBonusClaimed, lastDailyReset,
        dailyLoginToday, killsToday, levelsCompletedToday, gearUpgradedToday, chestsOpenedToday, itemsForgedToday,
        lastSeenLoginDateForWeekly, lastSeenLoginDateForMonthly,
        weeklyTaskProgress, weeklyTaskBarXp, weeklyBonusClaimed, lastWeeklyReset,
        weeklyLoginDays, killsThisWeek, levelsCompletedThisWeek, gearUpgradedThisWeek, chestsOpenedThisWeek, itemsForgedThisWeek,
        monthlyTaskProgress, monthlyTaskBarXp, monthlyBonusClaimed, lastMonthlyReset,
        monthlyLoginDays, killsThisMonth, levelsCompletedThisMonth, gearUpgradedThisMonth, chestsOpenedThisMonth, itemsForgedThisMonth,
        shardPassSeasonId, shardPassCurrentLevel, shardPassCurrentXp, shardPassXpPerLevel, shardPassMaxLevel,
        isShardPassPremium, shardPassRewardsClaimed, shardPassTasksProgress, shardPassSeasonStartDateUTC,
        uniqueLoginDaysCount,
        lastLoginDateForUniqueCount,
        totalGoldSpent,
        totalDiamondsSpent,
        totalTonShardsEarned,
        totalTonWithdrawn,
        totalGearUpgradesPerformed,
        totalItemsCrafted,
        // ▼▼▼ НОВОЕ ▼▼▼
        previouslyEquippedUniqueTypesByRarity,
        // ▲▲▲ КОНЕЦ НОВОГО ▲▲▲
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
        totalArtifactChestsOpened, gearChestPity, totalGearChestsOpened,
        activeDebuffs, treasureChestAttempts, treasureChestLastReset,
        userPhotoUrl, currentChapterId, completedZones, isAffectedByWeakeningAura,
        levelChestStates,
        dailyTaskProgress, dailyTaskBarXp, dailyBonusClaimed, lastDailyReset,
        dailyLoginToday, killsToday, levelsCompletedToday, gearUpgradedToday, chestsOpenedToday, itemsForgedToday,
        lastSeenLoginDateForWeekly, lastSeenLoginDateForMonthly,
        weeklyTaskProgress, weeklyTaskBarXp, weeklyBonusClaimed, lastWeeklyReset,
        weeklyLoginDays, killsThisWeek, levelsCompletedThisWeek, gearUpgradedThisWeek, chestsOpenedThisWeek, itemsForgedThisWeek,
        monthlyTaskProgress, monthlyTaskBarXp, monthlyBonusClaimed, lastMonthlyReset,
        monthlyLoginDays, killsThisMonth, levelsCompletedThisMonth, gearUpgradedThisMonth, chestsOpenedThisMonth, itemsForgedThisMonth,
        shardPassSeasonId, shardPassCurrentLevel, shardPassCurrentXp, shardPassXpPerLevel, shardPassMaxLevel,
        isShardPassPremium, shardPassRewardsClaimed, shardPassTasksProgress, shardPassSeasonStartDateUTC,
        uniqueLoginDaysCount,
        lastLoginDateForUniqueCount,
        totalGoldSpent,
        totalDiamondsSpent,
        totalTonShardsEarned,
        totalTonWithdrawn,
        totalGearUpgradesPerformed,
        totalItemsCrafted,
        // ▼▼▼ НОВОЕ ▼▼▼
        previouslyEquippedUniqueTypesByRarity: serializePreviouslyEquipped(previouslyEquippedUniqueTypesByRarity),
        // ▲▲▲ КОНЕЦ НОВОГО ▲▲▲
    };

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
        console.error("Ошибка сохранения состояния в localStorage:", error);
    }
});

setInterval(() => {
    const storeState = useGameStore.getState();
    if (storeState && storeState.clearExpiredDebuffs) {
        storeState.clearExpiredDebuffs();
    }
}, 5000);

setTimeout(() => {
    console.log("Performing initial checks for tasks, deals, energy, achievements, and ShardPass...");
    const store = useGameStore.getState();
    if (store) {
        if (store.checkAndResetDailyTasks) store.checkAndResetDailyTasks();
        if (store.checkAndResetWeeklyTasks) store.checkAndResetWeeklyTasks();
        if (store.checkAndResetMonthlyTasks) store.checkAndResetMonthlyTasks();
        if (store.checkAndRefreshDailyDeals) store.checkAndRefreshDailyDeals();
        if (store.checkAndResetTreasureChestAttempts) store.checkAndResetTreasureChestAttempts();
        if (store.refillEnergyOnLoad) store.refillEnergyOnLoad();
        if (store.checkAllAchievements) store.checkAllAchievements();
        if (store.setHasClaimableRewardsIndicator && store.checkIfAnyTaskOrAchievementIsClaimable) {
            store.setHasClaimableRewardsIndicator(store.checkIfAnyTaskOrAchievementIsClaimable());
        }
    }
}, 100);

export default useGameStore;
