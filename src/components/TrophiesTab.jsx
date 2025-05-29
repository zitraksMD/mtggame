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

// Вспомогательная функция для определения класса редкости на основе полученного уровня
const getRarityClassByLevel = (claimedLevel) => {
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

    const {
        achievementsStatus,
        claimAchievementReward,
        achievementXp,
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

    const globalXpProgressPercent = (typeof totalXpOfTrack === 'number' && totalXpOfTrack > 0)
        ? Math.min(100, (achievementXp / totalXpOfTrack) * 100)
        : 0;

    const handleClaimGlobalMilestone = (e, milestoneIdentifier) => {
        e.stopPropagation();
        if (claimGlobalTrackReward) {
            claimGlobalTrackReward(milestoneIdentifier);
        } else {
            console.warn("claimGlobalTrackReward action is not available on the store.");
        }
    };
    
    const getGlobalRewardText = (reward) => {
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

    // Обновляем obtainedAchievementIcons для отображения ВСЕХ ачивок с динамическим классом редкости
 const obtainedAchievementIcons = useMemo(() => {
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

        // Сортировка:
        // 1. Сначала те, по которым есть прогресс (hasAnyProgress = true)
        // 2. Среди тех, по которым есть прогресс, сначала полностью завершенные (isFullyCompletedAndClaimed = true)
        // 3. Затем по убыванию текущего уровня
        // 4. В остальных случаях по имени
        const sortedIcons = mappedIcons.sort((a, b) => {
            if (a.hasAnyProgress && !b.hasAnyProgress) return -1;
            if (!a.hasAnyProgress && b.hasAnyProgress) return 1;

            if (a.hasAnyProgress && b.hasAnyProgress) { // Обе с прогрессом или обе без
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
        const predefinedOrder = ["Летопись Героя", "Арсенал Завоевателя", "Искусство Кузни"];
        const dynamicCategories = Object.keys(allCategorizedAchievements)
            .filter(cat => !predefinedOrder.includes(cat) && cat !== "Прочие")
            .sort();
        const otherCategory = allCategorizedAchievements["Прочие"] ? ["Прочие"] : [];
        return [...predefinedOrder.filter(cat => allCategorizedAchievements[cat]), ...dynamicCategories, ...otherCategory];
    }, [allCategorizedAchievements]);

    const achievementsForRendering = useMemo(() => { 
        if (activeTrophyCategory !== 'Overview' && allCategorizedAchievements[activeTrophyCategory]) {
            return { [activeTrophyCategory]: allCategorizedAchievements[activeTrophyCategory] };
        }
        return {};
    }, [activeTrophyCategory, allCategorizedAchievements]);

    const handleOpenAchPopup = (achId) => setSelectedAchId(achId);
    const handleCloseAchPopup = () => setSelectedAchId(null);

    const handleClaimListButton = (e, achLine) => {
        e.stopPropagation();
        if (achLine.nextClaimableLevelData && claimAchievementReward) {
            claimAchievementReward(achLine.id, achLine.nextClaimableLevelData.level);
        }
    };

    const handleClaimPopupLevelButton = (e, achievementId, level) => {
        e.stopPropagation();
        if (claimAchievementReward) {
            claimAchievementReward(achievementId, level);
        }
    };
    
    const xpTrackRef = useRef(null);
    useEffect(() => { 
        if (activeTrophyCategory === 'Overview' && xpTrackRef.current && totalXpOfTrack > 0 && typeof trackPixelWidth === 'number') {
            const scrollContainer = xpTrackRef.current;
            const currentProgressPx = (achievementXp / totalXpOfTrack) * trackPixelWidth;
            const targetScrollLeft = Math.max(0, currentProgressPx - scrollContainer.offsetWidth / 3); 

            if (typeof scrollContainer.scrollTo === 'function') {
                scrollContainer.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
            }
        }
    }, [achievementXp, totalXpOfTrack, trackPixelWidth, activeTrophyCategory]);


    const processMilestone = (milestone) => {
        const milestoneIdStr = milestone.xpThreshold.toString();
        const isReached = achievementXp >= milestone.xpThreshold;
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
                    Обзор
                </button>
                {categoryOrder.map(categoryName => (
                    allCategorizedAchievements[categoryName] && 
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

                                <div className="global-xp-progress-bar-visual">
                                    <div className="global-xp-bar-fill-visual" style={{ width: `${globalXpProgressPercent}%` }}></div>
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

                    {/* Обновленная секция "Мои Трофеи" */}
<div className="obtained-achievements-overview">
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
        {/* Новый внутренний div для контента и заливки */}
        <div className="icon-inner-content">
            {ach.icon} {/* ach.icon содержит JSX для <img> или строку эмодзи */}
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
                    {achievementsForRendering[activeTrophyCategory] && Array.isArray(achievementsForRendering[activeTrophyCategory]) && achievementsForRendering[activeTrophyCategory].length > 0 ? (
                        <div className="achievement-category-section">
                            <h3 className="achievement-category-title">{activeTrophyCategory}</h3>
                            {achievementsForRendering[activeTrophyCategory].map(achLine => {
                                const displayLevel = achLine.nextLevelForDisplay || (achLine.levels && achLine.levels.length > 0 ? achLine.levels[achLine.levels.length -1] : { reward: {}, xpGain: 0, description: "Все уровни пройдены", level: 0 });
                                const currentProgressText = achLine.stat && !achLine.isFullyCompletedAndClaimed && displayLevel.target > 0 
                                    ? ` (${achLine.currentValueForStat.toLocaleString()}/${displayLevel.target.toLocaleString()})`
                                    : (achLine.flag && !achLine.isFullyCompletedAndClaimed && displayLevel.target > 0 
                                        ? (achLine.currentValueForStat >= (displayLevel.target === true ? 1 : displayLevel.target) ? ' (✓)' : ' (✗)')
                                        : '');
                                return (
                                    <div
                                        key={achLine.id}
                                        className={`achievement-item ${achLine.canClaimOverall ? 'claimable' : ''} ${achLine.isFullyCompletedAndClaimed ? 'claimed' : ''}`}
                                        onClick={() => handleOpenAchPopup(achLine.id)}
                                    >
                                        <div className="achievement-icon">{achLine.icon || '🏆'}</div>
                                        <div className="achievement-details-condensed">
                                            <div className="achievement-name">{achLine.name}</div>
                                            <div className="achievement-level-info">
                                                Ур. {achLine.lineStatus.claimedRewardsUpToLevel} / {achLine.levels?.length || 0}
                                                {currentProgressText}
                                            </div>
                                        </div>
                                        <div className="achievement-reward-condensed">
                                            {displayLevel.reward?.gold > 0 && <span>💰<small>{displayLevel.reward.gold.toLocaleString()}</small></span>}
                                            {displayLevel.reward?.diamonds > 0 && <span>💎<small>{displayLevel.reward.diamonds.toLocaleString()}</small></span>}
                                            {displayLevel.reward?.rareChestKeys > 0 && <span>🔑<small>{displayLevel.reward.rareChestKeys}(R)</small></span>}
                                            {displayLevel.reward?.epicChestKeys > 0 && <span>🔑<small>{displayLevel.reward.epicChestKeys}(E)</small></span>}
                                            {displayLevel.xpGain > 0 && <span className='xp-reward'>💡<small>{displayLevel.xpGain.toLocaleString()}</small></span>}
                                        </div>
                                        <button
                                            className="claim-button"
                                            onClick={(e) => handleClaimListButton(e, achLine)}
                                            disabled={!achLine.canClaimOverall || achLine.isFullyCompletedAndClaimed}
                                        >
                                            {achLine.isFullyCompletedAndClaimed ? "✔️" : (achLine.canClaimOverall ? "Забрать" : "...")}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="no-achievements-message">Нет достижений в этой категории или категория не найдена.</p>
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

                                    return (
                                        <div key={levelData.level} className={`achievement-popup-level-item ${isLevelClaimed ? 'claimed' : ''} ${canClaimThisLevel ? 'claimable' : ''}`}>
                                            <div className="level-number-badge">Ур. {levelData.level}</div>
                                            <div className="level-details">
                                                <p className="popup-description">{levelData.description}</p>
                                                {(selectedAchievementLine.stat && !isLevelClaimed && levelData.target > 0) && (
                                                    <div className="popup-progress">
                                                        <div className="progress-bar-bg">
                                                            <div className="progress-bar-fg" style={{ width: `${progressPercent}%` }}></div>
                                                        </div>
                                                        <span>{currentValueForStat.toLocaleString()} / {levelData.target.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {selectedAchievementLine.flag && (
                                                    <p className={`popup-status ${isLevelTargetMet ? 'completed-text' : 'locked-text'}`}>
                                                        Статус: {isLevelTargetMet ? 'Выполнено' : 'Не выполнено'}
                                                    </p>
                                                )}
                                                <div className="popup-rewards small-rewards">
                                                    {levelData.reward?.gold > 0 && <span>💰 <small>{levelData.reward.gold.toLocaleString()}</small></span>}
                                                    {levelData.reward?.diamonds > 0 && <span>💎 <small>{levelData.reward.diamonds.toLocaleString()}</small></span>}
                                                    {levelData.reward?.rareChestKeys > 0 && <span>🔑 <small>{levelData.reward.rareChestKeys}(R)</small></span>}
                                                    {levelData.reward?.epicChestKeys > 0 && <span>🔑 <small>{levelData.reward.epicChestKeys}(E)</small></span>}
                                                    {levelData.xpGain > 0 && <span>💡 <small>{levelData.xpGain.toLocaleString()} XP</small></span>}
                                                </div>
                                            </div>
                                            <button
                                                className="claim-button-popup"
                                                onClick={(e) => handleClaimPopupLevelButton(e, selectedAchievementLine.id, levelData.level)}
                                                disabled={!canClaimThisLevel}
                                            >
                                                {isLevelClaimed ? "✔️" : (canClaimThisLevel ? "Забрать" : "...")}
                                            </button>
                                        </div>
                                    );
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