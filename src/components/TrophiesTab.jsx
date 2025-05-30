// src/components/TrophiesTab.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../store/useGameStore.js';
import globalTrackRewardsData from '../data/globalTrackRewards.js';
import achievementsData from '../data/achievementsDatabase.js';
import { pageTransition } from '../animations';
import { REWARD_TYPES } from '../data/ShardPassRewardsData.js';

import './TrophiesTab.scss';

// ОБНОВЛЕННАЯ ФУНКЦИЯ ДЛЯ ИКОНОК: возвращает объект { iconJsx, quantity }
const getIconForMilestoneMarker = (rewardsObject) => {
    // ... (ваш существующий код getIconForMilestoneMarker) ...
    const imgSize = '40px'; // Новый увеличенный размер для самих картинок (контейнер будет больше)
    const commonImageStyle = { width: imgSize, height: imgSize, objectFit: 'contain' };
    // Для эмодзи будем полагаться на font-size из CSS, но можем также вернуть объект

    if (!rewardsObject || Object.keys(rewardsObject).length === 0) {
        return { iconJsx: '🎁', quantity: null };
    }

    // Приоритетный порядок для определения основной иконки и ее количества
    if (rewardsObject.bnb) {
        return { iconJsx: <img src="/assets/bnb-icon.png" alt="BNB" style={commonImageStyle} />, quantity: rewardsObject.bnb };
    }
    if (rewardsObject.toncoin) {
        return { iconJsx: <img src="/assets/ton-image.png" alt="Toncoin" style={commonImageStyle} />, quantity: rewardsObject.toncoin };
    }
    if (rewardsObject.mythicItemChoiceChest) {
        return { iconJsx: <img src="/assets/mythicItemChoiceChest.png" alt="Mythic Chest" style={commonImageStyle} />, quantity: rewardsObject.mythicItemChoiceChest };
    }
    if (rewardsObject.legendaryItemChoiceChest) {
        return { iconJsx: <img src="/assets/legendaryItemChoiceChest.png" alt="Legendary Chest" style={commonImageStyle} />, quantity: rewardsObject.legendaryItemChoiceChest };
    }
    if (rewardsObject.epicItemChoiceChest) {
        return { iconJsx: <img src="/assets/epicItemChoiceChest.png" alt="Epic Chest" style={commonImageStyle} />, quantity: rewardsObject.epicItemChoiceChest };
    }
    if (rewardsObject.epicChestKeys) {
        return { iconJsx: <img src="/assets/key-image.png" alt="Epic Key" style={commonImageStyle} />, quantity: rewardsObject.epicChestKeys };
    }
    if (rewardsObject.rareChestKeys) {
        return { iconJsx: <img src="/assets/key-image.png" alt="Rare Key" style={commonImageStyle} />, quantity: rewardsObject.rareChestKeys };
    }
    if (rewardsObject.toncoinShards) {
        return { iconJsx: <img src="/assets/toncoin-icon.png" alt="Toncoin Shards" style={commonImageStyle} />, quantity: rewardsObject.toncoinShards };
    }
    if (rewardsObject.diamonds) {
        return { iconJsx: <img src="/assets/diamond-image.png" alt="Diamonds" style={commonImageStyle} />, quantity: rewardsObject.diamonds };
    }
    if (rewardsObject.gold) {
        return { iconJsx: <img src="/assets/coin-icon.png" alt="Gold" style={commonImageStyle} />, quantity: rewardsObject.gold };
    }

    // Если нет специфической картинки, но награды есть, берем первую и показываем с общей иконкой
    const firstKey = Object.keys(rewardsObject)[0];
    if (firstKey && typeof rewardsObject[firstKey] === 'number') {
         return { iconJsx: '🏆', quantity: rewardsObject[firstKey] };
    }

    return { iconJsx: '🏆', quantity: null }; // Общий случай / фолбэк
};

const getGlobalRewardTextForMilestoneDisplay = (milestone) => {
    // ... (ваш существующий код getGlobalRewardTextForMilestoneDisplay) ...
    if (!milestone || !milestone.rewards) return "Награда";
    const rewardEntries = Object.entries(milestone.rewards);
    if (rewardEntries.length === 0) return "Особая награда";
    return rewardEntries.map(([type, amount]) => {
        let typeText = type;
        if (type === 'gold') typeText = "золота";
        else if (type === 'diamonds') typeText = "алмазов";
        else if (type === 'toncoinShards') typeText = "осколков TON";
        else if (type === 'rareChestKeys') typeText = "редких ключей";
        else if (type === 'epicChestKeys') typeText = "эпических ключей";
        else if (type === 'epicItemChoiceChest') typeText = "сундука эпик. выбора";
        else if (type === 'legendaryItemChoiceChest') typeText = "сундука легенд. выбора";
        else if (type === 'mythicItemChoiceChest') typeText = "сундука миф. выбора";
        else if (type === 'toncoin') typeText = "TON";
        else if (type === 'bnb') typeText = "BNB";
        return `${amount} ${typeText}`;
    }).join(' и ');
};

const getRarityClassByLevel = (claimedLevel) => {
    // ... (ваш существующий код getRarityClassByLevel) ...
    if (claimedLevel >= 6) return 'rarity-mythic';
    if (claimedLevel === 5) return 'rarity-legendary';
    if (claimedLevel === 4) return 'rarity-epic';
    if (claimedLevel === 3) return 'rarity-epic'; // Уровни 3 и 4 могут делить один цвет редкости
    if (claimedLevel === 2) return 'rarity-rare';
    if (claimedLevel === 1) return 'rarity-uncommon';
    return 'rarity-common'; // Для уровня 0 (серый)
};

const TrophiesTab = () => {
    const [activeTrophyCategory, setActiveTrophyCategory] = useState('Overview');
    const [selectedAchId, setSelectedAchId] = useState(null);

    // ВСТАВЛЕННЫЙ КОД: Состояние для развернутых наград
    const [expandedRewardsForLevel, setExpandedRewardsForLevel] = useState({}); // { levelNumber: true/false }

    // ВСТАВЛЕННЫЙ КОД: Функция для переключения видимости наград
    const toggleRewardsVisibility = (levelNumber) => {
        setExpandedRewardsForLevel(prev => ({
            ...prev,
            [levelNumber]: !prev[levelNumber]
        }));
    };

    const {
        achievementsStatus,
        claimAchievementReward,
        achievementXp, // Оригинальное значение из стора
        getGlobalStatValue,
        claimedGlobalTrackRewards,
        claimGlobalTrackReward,
    } = useGameStore((state) => ({
        achievementsStatus: state.achievementsStatus || {},
        claimAchievementReward: state.claimAchievementReward,
        achievementXp: state.achievementXp || 0,
        getGlobalStatValue: (statName) => state[statName],
        claimedGlobalTrackRewards: state.claimedGlobalTrackRewards || {},
        claimGlobalTrackReward: state.claimGlobalTrackReward,
    }));

    const selectedAchievementLine = useMemo(() => {
        // ... (ваш существующий код selectedAchievementLine) ...
        if (!selectedAchId) return null;
        const achLine = achievementsData.find(a => a.id === selectedAchId);
        if (achLine && !Array.isArray(achLine.levels)) {
            console.warn(`TrophiesTab: Achievement line with ID "${achLine.id}" has missing or invalid 'levels' property.`, achLine);
        }
        return achLine;
    }, [selectedAchId]);

    const totalXpOfTrack = useMemo(() => {
        let trackMaxXp = 5500;
        if (globalTrackRewardsData && globalTrackRewardsData.length > 0) {
            trackMaxXp = Math.max(...globalTrackRewardsData.map(m => m.xpThreshold));
        }
        return trackMaxXp;
    }, []);

    const trackPixelWidth = useMemo(() => {
        const safeTotalXp = (typeof totalXpOfTrack === 'number' && totalXpOfTrack > 0) ? totalXpOfTrack : 5500;
        return Math.max(1200, safeTotalXp * 0.7);
    }, [totalXpOfTrack]);

    // Обеспечиваем, что achievementXp является числом, по умолчанию 0.
    const currentAchievementXp = typeof achievementXp === 'number' ? achievementXp : 0;

    const rawGlobalXpProgressPercent = (typeof totalXpOfTrack === 'number' && totalXpOfTrack > 0)
        ? Math.min(100, (currentAchievementXp / totalXpOfTrack) * 100)
        : 0;

    // Обеспечиваем, что globalXpProgressPercent является числом, по умолчанию 0.
    const currentGlobalXpProgressPercent = typeof rawGlobalXpProgressPercent === 'number' ? rawGlobalXpProgressPercent : 0;


    const handleClaimGlobalMilestone = (e, milestoneIdentifier) => {
        // ... (ваш существующий код handleClaimGlobalMilestone) ...
        e.stopPropagation();
        if (claimGlobalTrackReward) {
            claimGlobalTrackReward(milestoneIdentifier);
        } else {
            console.warn("claimGlobalTrackReward action is not available on the store.");
        }
    };
    
    const getGlobalRewardText = (reward) => {
        // ... (ваш существующий код getGlobalRewardText) ...
        if (!reward) return "";
        let text = reward.amount;
        if (reward.type === REWARD_TYPES?.GOLD || reward.type === 'gold') text += " золота";
        else if (reward.type === REWARD_TYPES?.DIAMONDS || reward.type === 'diamonds') text += " алмазов";
        else if (reward.type === REWARD_TYPES?.TONCOIN_SHARDS || reward.type === 'toncoinShards') text += ` TON Shards`;
        else if (reward.type === REWARD_TYPES?.RARE_CHEST_KEY || reward.type === 'rareChestKeys') text += ` ${reward.name || 'Редкий ключ'}`;
        else if (reward.type === REWARD_TYPES?.EPIC_CHEST_KEY || reward.type === 'epicChestKeys') text += ` ${reward.name || 'Эпический ключ'}`;
        else if (reward.type === REWARD_TYPES?.MYTHIC_ITEM_CHOICE_CHEST || reward.type === 'mythicItemChoiceChest') text += ` ${reward.name || 'Сундук миф. выбора'}`;
        else if (reward.type === REWARD_TYPES?.LEGENDARY_ITEM_CHOICE_CHEST || reward.type === 'legendaryItemChoiceChest') text += ` ${reward.name || 'Сундук легенд. выбора'}`;
        else if (reward.type === REWARD_TYPES?.EPIC_ITEM_CHOICE_CHEST || reward.type === 'epicItemChoiceChest') text += ` ${reward.name || 'Сундук эпик. выбора'}`;
        else if (reward.type === 'toncoin') text += " TON";
        else if (reward.type === 'bnb') text += " BNB";
        else text += ` ${reward.type}`;
        return `${reward.icon || '🏆'} ${text}`;
    };

    const obtainedAchievementIcons = useMemo(() => {
        // ... (ваш существующий код obtainedAchievementIcons) ...
        if (!achievementsData || !Array.isArray(achievementsData)) {
            return [];
        }
        const mappedIcons = achievementsData.map(achLine => {
            const status = achievementsStatus[achLine.id] || { claimedRewardsUpToLevel: 0 };
            const rarityClass = getRarityClassByLevel(status.claimedRewardsUpToLevel);
            
            const maxLevelForAch = achLine.levels ? achLine.levels.length : 0;
            const isFullyCompletedAndClaimed = maxLevelForAch > 0 && status.claimedRewardsUpToLevel >= maxLevelForAch;
            const hasAnyProgress = status.claimedRewardsUpToLevel > 0;

            return { 
                id: achLine.id, 
                icon: achLine.icon || '🏆',
                name: achLine.name,
                rarityClass: rarityClass, // Для фона
                currentLevel: status.claimedRewardsUpToLevel,
                maxLevel: maxLevelForAch,
                isFullyCompletedAndClaimed: isFullyCompletedAndClaimed, // Для возможной доп. логики или сортировки
                hasAnyProgress: hasAnyProgress // Для золотой рамки и затемнения/сортировки
            };
        });

        const sortedIcons = mappedIcons.sort((a, b) => {
            if (a.hasAnyProgress && !b.hasAnyProgress) return -1;
            if (!a.hasAnyProgress && b.hasAnyProgress) return 1;

            if (a.hasAnyProgress && b.hasAnyProgress) { 
                if (a.isFullyCompletedAndClaimed && !b.isFullyCompletedAndClaimed) return -1;
                if (!a.isFullyCompletedAndClaimed && b.isFullyCompletedAndClaimed) return 1;
                
                if (a.currentLevel > b.currentLevel) return -1;
                if (a.currentLevel < b.currentLevel) return 1;
            }
            
            return a.name.localeCompare(b.name);
        });

        return sortedIcons;
    }, [achievementsData, achievementsStatus]);

    const allCategorizedAchievements = useMemo(() => { 
        // ... (ваш существующий код allCategorizedAchievements) ...
        const categories = {};
        if (!achievementsData || !Array.isArray(achievementsData)) return categories;

        achievementsData.forEach(achLine => {
            const categoryName = achLine.category || "Прочие";
            if (!categories[categoryName]) {
                categories[categoryName] = [];
            }
            const status = achievementsStatus[achLine.id] || { highestReachedLevel: 0, claimedRewardsUpToLevel: 0, currentValue: 0 };
            let currentValueForStat = 0;
            if (achLine.stat && getGlobalStatValue) { 
                currentValueForStat = getGlobalStatValue(achLine.stat) || 0;
            } else if (achLine.flag && getGlobalStatValue) { 
                const booleanFlags = getGlobalStatValue('booleanFlags') || {};
                currentValueForStat = booleanFlags[achLine.flag] ? 1 : 0;
            }

            const currentAchLevels = Array.isArray(achLine.levels) ? achLine.levels : [];
            let nextLevelToDisplay = null;
            let canClaimSomething = false;
            let isFullyClaimed = true; 
            let nextClaimableLevel = null;

            if (currentAchLevels.length === 0) {
                isFullyClaimed = true; 
                nextLevelToDisplay = { description: "Нет уровней", reward: {}, xpGain: 0, target: 0, level: 0 };
            } else {
                isFullyClaimed = status.claimedRewardsUpToLevel >= currentAchLevels[currentAchLevels.length -1].level;
            }

            for (const levelData of currentAchLevels) {
                if (levelData.level > status.claimedRewardsUpToLevel) {
                    if (!nextLevelToDisplay) {
                        nextLevelToDisplay = levelData; 
                    }
                    const targetMet = (achLine.stat && currentValueForStat >= levelData.target) ||
                                      (achLine.flag && currentValueForStat >= (levelData.target === true ? 1 : levelData.target));
                    if (targetMet) {
                        canClaimSomething = true;
                        if (!nextClaimableLevel) {
                            nextClaimableLevel = levelData; 
                        }
                    }
                }
            }
            
            if (!nextLevelToDisplay && currentAchLevels.length > 0) { 
                nextLevelToDisplay = currentAchLevels[currentAchLevels.length - 1];
            }
            
            categories[categoryName].push({
                ...achLine,
                levels: currentAchLevels,
                lineStatus: status,
                currentValueForStat,
                canClaimOverall: canClaimSomething,
                isFullyCompletedAndClaimed: isFullyClaimed && currentAchLevels.length > 0, 
                nextLevelForDisplay: nextLevelToDisplay,
                nextClaimableLevelData: nextClaimableLevel
            });
        });

        for (const categoryName in categories) {
            categories[categoryName].sort((a, b) => {
                if (a.canClaimOverall && !b.canClaimOverall) return -1;
                if (!a.canClaimOverall && b.canClaimOverall) return 1;
                if (!a.isFullyCompletedAndClaimed && b.isFullyCompletedAndClaimed) return -1;
                if (a.isFullyCompletedAndClaimed && !b.isFullyCompletedAndClaimed) return 1;
                return (a.order ?? Infinity) - (b.order ?? Infinity) || a.id.localeCompare(b.id);
            });
        }
        return categories;
    }, [achievementsStatus, getGlobalStatValue]);

    const categoryOrder = useMemo(() => {
        // ... (ваш существующий код categoryOrder) ...
        const predefinedOrder = ["Hero's Path", "Relic Hunter", "Anvil Master"];
        const dynamicCategories = Object.keys(allCategorizedAchievements)
            .filter(cat => !predefinedOrder.includes(cat) && cat !== "Other")
            .sort(); 
        
        const finalOrder = [];
        predefinedOrder.forEach(catName => {
            if (allCategorizedAchievements[catName]) {
                finalOrder.push(catName);
            }
        });
        dynamicCategories.forEach(catName => {
            if (!finalOrder.includes(catName) && allCategorizedAchievements[catName]) { 
                finalOrder.push(catName);
            }
        });
        if (allCategorizedAchievements["Other"]) {
            finalOrder.push("Other");
        }
        return finalOrder;
    }, [allCategorizedAchievements]);

    const handleOpenAchPopup = (achId) => setSelectedAchId(achId);
    const handleCloseAchPopup = () => setSelectedAchId(null);

    const handleClaimListButton = (e, achLine) => {
        // ... (ваш существующий код handleClaimListButton) ...
        e.stopPropagation();
        if (achLine.nextClaimableLevelData && claimAchievementReward) {
            claimAchievementReward(achLine.id, achLine.nextClaimableLevelData.level);
        }
    };

    const handleClaimPopupLevelButton = (e, achievementId, level) => {
        // ... (ваш существующий код handleClaimPopupLevelButton) ...
        e.stopPropagation();
        if (claimAchievementReward) {
            claimAchievementReward(achievementId, level);
        }
    };
    
    const xpTrackRef = useRef(null);
    useEffect(() => { 
        if (activeTrophyCategory === 'Overview' && xpTrackRef.current && totalXpOfTrack > 0 && typeof trackPixelWidth === 'number') {
            const scrollContainer = xpTrackRef.current;
            const currentProgressPx = (currentAchievementXp / totalXpOfTrack) * trackPixelWidth;
            const targetScrollLeft = Math.max(0, currentProgressPx - scrollContainer.offsetWidth / 3); 

            if (typeof scrollContainer.scrollTo === 'function') {
                scrollContainer.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
            }
        }
    }, [currentAchievementXp, totalXpOfTrack, trackPixelWidth, activeTrophyCategory]);


    const processMilestone = (milestone) => {
        const milestoneIdStr = milestone.xpThreshold.toString();
        const isReached = currentAchievementXp >= milestone.xpThreshold;
        const isClaimed = claimedGlobalTrackRewards && claimedGlobalTrackRewards[milestoneIdStr];
        const canClaimThisMilestone = isReached && !isClaimed;
        const positionPercent = totalXpOfTrack > 0 ? (milestone.xpThreshold / totalXpOfTrack) * 100 : 0;
        
        const iconData = getIconForMilestoneMarker(milestone.rewards); 
        const primaryIconJsx = iconData.iconJsx;
        const primaryRewardQuantity = (typeof iconData.quantity === 'number' && iconData.quantity > 0) 
                                        ? iconData.quantity 
                                        : null;

        const titleText = `${milestone.xpThreshold.toLocaleString()} XP: ${milestone.description || getGlobalRewardTextForMilestoneDisplay(milestone)}`;
        
        return { 
            milestoneIdStr, isReached, isClaimed, canClaimThisMilestone, 
            positionPercent, primaryIconJsx, titleText, primaryRewardQuantity 
        };
    };

    return (
        <div className="trophies-content">
            <p className="trophies-tab-description">
                Your legend awaits in the Hall of Fame! Display your glorious achievements, claim rightful rewards for each milestone, and challenge other players for supremacy on the leaderboards.
            </p>
            
            <div className="trophy-category-navigation">
                <button
                    className={`trophy-category-button ${activeTrophyCategory === 'Overview' ? 'active' : ''}`}
                    onClick={() => setActiveTrophyCategory('Overview')}
                >
                    Overview
                </button>
                {categoryOrder.map(categoryName => (
                    <button
                        key={categoryName}
                        className={`trophy-category-button ${activeTrophyCategory === categoryName ? 'active' : ''}`}
                        onClick={() => setActiveTrophyCategory(categoryName)}
                    >
                        {categoryName} 
                    </button>
                ))}
            </div>

            {activeTrophyCategory === 'Overview' && (
                <>
                    <div className="global-xp-track-outer-container">
                        <div className="global-xp-track-scroll-container" ref={xpTrackRef}>
                            <div className="global-xp-track-content" style={{ width: `${trackPixelWidth}px` }}>
                                
                                <div className="reward-markers-area above">
                                    {globalTrackRewardsData.map((milestone, index) => {
                                        const { 
                                            milestoneIdStr, isReached, canClaimThisMilestone, isClaimed, 
                                            positionPercent, primaryIconJsx, titleText, primaryRewardQuantity
                                        } = processMilestone(milestone);

                                        if (index % 2 !== 0) { // Нечетный индекс: ИКОНКА СВЕРХУ
                                            return (
                                                <div
                                                    key={`${milestoneIdStr}-icon-above`} 
                                                    className={`reward-milestone-marker icon-marker ${isReached ? 'reached' : ''} ${canClaimThisMilestone ? 'claimable' : ''} ${isClaimed ? 'claimed' : ''}`}
                                                    style={{ left: `${positionPercent}%` }} 
                                                    title={titleText}
                                                    onClick={(e) => canClaimThisMilestone && handleClaimGlobalMilestone(e, milestoneIdStr)}
                                                >
                                                    <span className="reward-marker-icon-graphic">{primaryIconJsx}</span>
                                                    {primaryRewardQuantity && (
                                                        <span className="reward-marker-quantity">{primaryRewardQuantity}</span>
                                                    )}
                                                    {canClaimThisMilestone && <div className="claim-indicator-dot"></div>}
                                                </div>
                                            );
                                        } else { // Четный индекс: ТЕКСТ XP СВЕРХУ
                                            return (
                                                <div
                                                    key={`${milestoneIdStr}-xp-above`}
                                                    className={`reward-milestone-marker xp-label-marker ${isReached ? 'reached' : ''} ${canClaimThisMilestone ? 'claimable-text' : ''} ${isClaimed ? 'claimed-text' : ''}`}
                                                    style={{ left: `${positionPercent}%` }}
                                                    title={titleText}
                                                >
                                                    {milestone.xpThreshold.toLocaleString()}&nbsp;XP
                                                </div>
                                            );
                                        }
                                    })}
                                </div>

                                <div className="global-xp-progress-bar-visual"> {/* Ensure this has position: relative and a defined height in CSS */}
                                    <div className="global-xp-bar-fill-visual" style={{ width: `${currentGlobalXpProgressPercent}%` }}></div>
                                    
                                    {/* == UPDATED: Current XP Value Label == */}
                                    {currentGlobalXpProgressPercent > 0 && currentAchievementXp >= 0 && (
                                        <div
                                            className="current-xp-value-label"
                                            style={{
                                                position: 'absolute',
                                                left: `${currentGlobalXpProgressPercent}%`,
                                                bottom: '100%', // Positions the bottom of the label at the top of the bar
                                                transform: 'translateX(-50%)', // Horizontally centers the label on the progress point
                                                marginBottom: '4px', // Adds a small gap above the bar
                                                zIndex: 1000, 
                                                pointerEvents: 'none',
                                            }}
                                        >
                                            {currentAchievementXp.toLocaleString()}&nbsp;XP
                                        </div>
                                    )}
                                    {/* == END: Current XP Value Label == */}
                                </div>

                                <div className="reward-markers-area below">
                                    {globalTrackRewardsData.map((milestone, index) => {
                                        const { 
                                            milestoneIdStr, isReached, canClaimThisMilestone, isClaimed, 
                                            positionPercent, primaryIconJsx, titleText, primaryRewardQuantity
                                        } = processMilestone(milestone);

                                        if (index % 2 !== 0) { // Нечетный индекс: ТЕКСТ XP СНИЗУ
                                            return (
                                                <div
                                                    key={`${milestoneIdStr}-xp-below`}
                                                    className={`reward-milestone-marker xp-label-marker ${isReached ? 'reached' : ''} ${canClaimThisMilestone ? 'claimable-text' : ''} ${isClaimed ? 'claimed-text' : ''}`}
                                                    style={{ left: `${positionPercent}%` }}
                                                    title={titleText}
                                                >
                                                    {milestone.xpThreshold.toLocaleString()}&nbsp;XP
                                                </div>
                                            );
                                        } else { // Четный индекс: ИКОНКА СНИЗУ
                                            return (
                                                <div
                                                    key={`${milestoneIdStr}-icon-below`} 
                                                    className={`reward-milestone-marker icon-marker ${isReached ? 'reached' : ''} ${canClaimThisMilestone ? 'claimable' : ''} ${isClaimed ? 'claimed' : ''}`}
                                                    style={{ left: `${positionPercent}%` }} 
                                                    title={titleText}
                                                    onClick={(e) => canClaimThisMilestone && handleClaimGlobalMilestone(e, milestoneIdStr)}
                                                >
                                                    <span className="reward-marker-icon-graphic">{primaryIconJsx}</span>
                                                    {primaryRewardQuantity && (
                                                        <span className="reward-marker-quantity">{primaryRewardQuantity}</span>
                                                    )}
                                                    {canClaimThisMilestone && <div className="claim-indicator-dot"></div>}
                                                </div>
                                            );
                                        }
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="obtained-achievements-overview">
                        {/* ... (ваш существующий код obtained-achievements-overview) ... */}
                        <div className="overview-header-label-container">
                            <div className="overview-header-label">
                                Trophies
                            </div>
                        </div>

                        {obtainedAchievementIcons.length > 0 ? (
                            <div className="obtained-icons-grid">
                                {obtainedAchievementIcons.map(ach => (
                                        <div 
                                        key={ach.id} 
                                        className={
                                            `obtained-achievement-icon ${ach.rarityClass}` +
                                            `${!ach.hasAnyProgress ? ' is-unachieved' : ''}`
                                        }
                                        title={`${ach.name} (Уровень: ${ach.currentLevel}${ach.maxLevel > 0 ? `/${ach.maxLevel}` : ''})`}
                                    >
                                    <div className="icon-inner-content">
                                        {ach.icon}
                                    </div>
                                </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-obtained-achievements-message">
                                Список достижений пуст или данные загружаются.
                            </p>
                        )}
                    </div>
                </>
            )}

            {activeTrophyCategory !== 'Overview' && (
                <div className="achievements-list">
                    {/* ... (ваш существующий код для списка ачивок по категориям) ... */}
                    {allCategorizedAchievements[activeTrophyCategory] && Array.isArray(allCategorizedAchievements[activeTrophyCategory]) && allCategorizedAchievements[activeTrophyCategory].length > 0 ? (
                        <div className="achievement-category-section">
                            {allCategorizedAchievements[activeTrophyCategory].map(achLine => {
                                const levelProgressString = `Level ${achLine.lineStatus.claimedRewardsUpToLevel}/${achLine.levels?.length || 0}`;
                                const levelLabelRarityClass = getRarityClassByLevel(achLine.lineStatus.claimedRewardsUpToLevel);
                                let cardStateClasses = '';
                                if (achLine.isFullyCompletedAndClaimed) {
                                    cardStateClasses += ' claimed-item';
                                } else if (achLine.canClaimOverall) {
                                    cardStateClasses += ' claimable-item';
                                }
                                if (!achLine.hasAnyProgress) { // Проверяем, есть ли вообще прогресс
                                    cardStateClasses += ' is-unachieved';
                                }
                                
                                return (
                                    <div
                                        key={achLine.id}
                                        className={`achievement-item ${cardStateClasses.trim()}`}
                                        onClick={() => handleOpenAchPopup(achLine.id)}
                                    >
                                        <div className={`achievement-level-label ${levelLabelRarityClass}`}>
                                            {levelProgressString}
                                        </div>
                                        <div className="achievement-card-main-content">
                                            <div className="achievement-icon-wrapper">
                                                {achLine.icon || '🏆'}
                                            </div>
                                            <div className="achievement-info-wrapper">
                                                <div className="achievement-name">{achLine.name}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="no-achievements-message">Нет достижений в этой категории.</p>
                    )}
                </div>
            )}
            
            <AnimatePresence>
                {selectedAchievementLine && (
                    <motion.div
                        className="achievement-popup-overlay"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={pageTransition}
                        onClick={handleCloseAchPopup}
                        key="achPopup"
                    >
                        <div className="achievement-popup-content" onClick={(e) => e.stopPropagation()}>
                            {/* ... (ваш существующий код для попапа ачивки) ... */}
                            <button className="popup-close-btn" onClick={handleCloseAchPopup}>×</button>
                            <div className="popup-header">
                                <div className="popup-icon">{selectedAchievementLine.icon || '🏆'}</div>
                                <h3 className="popup-name">{selectedAchievementLine.name}</h3>
                            </div>
                            <div className="achievement-levels-in-popup">
                                {Array.isArray(selectedAchievementLine.levels) && selectedAchievementLine.levels.map(levelData => {
                                    const status = achievementsStatus[selectedAchievementLine.id] || { highestReachedLevel: 0, claimedRewardsUpToLevel: 0, currentValue: 0 };
                                    let currentValueForStat = 0;
                                    if (selectedAchievementLine.stat && getGlobalStatValue) {
                                        currentValueForStat = getGlobalStatValue(selectedAchievementLine.stat) || 0;
                                    } else if (selectedAchievementLine.flag && getGlobalStatValue) {
                                        const booleanFlags = getGlobalStatValue('booleanFlags') || {};
                                        currentValueForStat = booleanFlags[selectedAchievementLine.flag] ? 1 : 0;
                                    }

                                    const isLevelTargetMet = (selectedAchievementLine.stat && currentValueForStat >= levelData.target) ||
                                                             (selectedAchievementLine.flag && currentValueForStat >= (levelData.target === true ? 1 : levelData.target) );
                                    const isLevelClaimed = levelData.level <= status.claimedRewardsUpToLevel;
                                    const canClaimThisLevel = isLevelTargetMet && !isLevelClaimed;
                                    const progressPercent = (selectedAchievementLine.stat && levelData.target > 0)
                                        ? Math.min(100, Math.floor((currentValueForStat / levelData.target) * 100))
                                        : (isLevelTargetMet ? 100 : 0);

                                    // НАЧАЛО ЗАМЕНЕННОГО БЛОКА
                                    return (
                                        <div
                                            key={levelData.level}
                                            className={`achievement-popup-level-item ${isLevelClaimed ? 'claimed' : ''} ${canClaimThisLevel ? 'claimable' : ''} ${!isLevelTargetMet && !isLevelClaimed ? 'locked' : ''}`}
                                            style={{ /* Можно будет задать min-height для фиксации начальной высоты */ }}
                                        >
                                            {/* 1. Нависающий лейбл уровня */}
                                            <div className={`popup-level-badge ${getRarityClassByLevel(levelData.level) /* или другой класс для цвета */}`}>
                                                Ур. {levelData.level}
                                            </div>

                                            <div className="popup-level-main-content">
                                                {/* 2. Описание задания */}
                                                <p className="popup-level-description">{levelData.description}</p>

                                                {/* 3. Прогресс-бар и Claim-кнопка */}
                                                <div className="popup-level-progress-claim-wrapper">
                                                    {(selectedAchievementLine.stat && levelData.target > 0) && (
                                                        <div className="popup-level-progress">
                                                            <div className="progress-bar-bg">
                                                                <div className="progress-bar-fg" style={{ width: `${progressPercent}%` }}></div>
                                                            </div>
                                                            <span className="progress-text">{currentValueForStat.toLocaleString()} / {levelData.target.toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    {selectedAchievementLine.flag && (
                                                            <div className="popup-level-progress"> {/* Используем тот же класс для выравнивания */}
                                                                <p className={`popup-level-status-flag ${isLevelTargetMet ? 'completed-text' : 'locked-text'}`}>
                                                                    {isLevelTargetMet ? 'Выполнено' : 'Не выполнено'}
                                                                </p>
                                                            </div>
                                                    )}
                                                    {/* Пустой div для выравнивания, если нет прогресс-бара, чтобы кнопка была справа */}
                                                    {!(selectedAchievementLine.stat && levelData.target > 0) && !selectedAchievementLine.flag && (
                                                        <div className="popup-level-progress"></div> // Пустышка для flex-grow
                                                    )}

                                                    <button
                                                        className={`popup-level-claim-button ${canClaimThisLevel ? 'active-green' : 'dull-gray'}`}
                                                        onClick={(e) => handleClaimPopupLevelButton(e, selectedAchievementLine.id, levelData.level)}
                                                        disabled={!canClaimThisLevel && !isLevelClaimed} // Блокируем если нечего забирать или уже забрано (кроме случая, когда просто "забрано")
                                                    >
                                                        {isLevelClaimed ? "✔️" : (canClaimThisLevel ? "Claim" : "Claim")}
                                                    </button>
                                                </div>

                                                {/* 4. Кнопка Rewards */}
                                                <div className="popup-level-rewards-toggle-wrapper">
                                                    <button
                                                        className="rewards-toggle-button"
                                                        onClick={() => toggleRewardsVisibility(levelData.level)}
                                                    >
                                                        Награды {expandedRewardsForLevel[levelData.level]}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Выезжающий список наград */}
                                            <AnimatePresence>
                                                {expandedRewardsForLevel[levelData.level] && (
                                                    <motion.div
                                                        className="popup-level-rewards-list"
                                                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                                        animate={{ height: 'auto', opacity: 1, marginTop: '10px' }}
                                                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        {levelData.reward?.gold > 0 && <span>💰 <small>{levelData.reward.gold.toLocaleString()} золота</small></span>}
                                                        {levelData.reward?.diamonds > 0 && <span>💎 <small>{levelData.reward.diamonds.toLocaleString()} алмазов</small></span>}
                                                        {levelData.reward?.rareChestKeys > 0 && <span>🔑 <small>{levelData.reward.rareChestKeys} редких ключа</small></span>}
                                                        {levelData.reward?.epicChestKeys > 0 && <span>🔑 <small>{levelData.reward.epicChestKeys} эпик. ключа</small></span>}
                                                        {/* Добавьте другие возможные награды из levelData.reward */}
                                                        {levelData.xpGain > 0 && <span>💡 <small>{levelData.xpGain.toLocaleString()} XP</small></span>}
                                                        {Object.keys(levelData.reward || {}).length === 0 && !levelData.xpGain && (
                                                            <small>Нет особых наград за этот уровень.</small>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                    // КОНЕЦ ЗАМЕНЕННОГО БЛОКА
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TrophiesTab;