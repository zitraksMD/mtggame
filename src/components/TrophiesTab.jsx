// src/components/TrophiesTab.jsx
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../../store/useGameStore.js';
import levelRewardsData, { RewardType as GlobalLevelRewardType } from '../../data/levelRewardsData';
import achievementsData from '../../data/achievementsDatabase.js';
// Анимации можно импортировать, если они используются специфично здесь,
// но если они общие для всех "экранов", то лучше оставить в родительском.
// Для попапов они могут быть нужны.
import { pageTransition } // popupAnimations, например
    from '../../animations'; 
 import './TrophiesTab.scss';

const TrophiesTab = () => {
    const {
        achievementsStatus,
        claimAchievementReward,
        achievementLevel,
        getCurrentLevelXpProgress,
        getXpNeededForCurrentLevelUp,
        getAchievementXpNeededForNextLevel,
        getGlobalStatValue,
    } = useGameStore((state) => ({
        achievementsStatus: state.achievementsStatus || {},
        claimAchievementReward: state.claimAchievementReward,
        achievementLevel: state.achievementLevel,
        getCurrentLevelXpProgress: state.getCurrentLevelXpProgress,
        getXpNeededForCurrentLevelUp: state.getXpNeededForCurrentLevelUp,
        getAchievementXpNeededForNextLevel: state.getAchievementXpNeededForNextLevel,
        getGlobalStatValue: (statName) => state[statName],
    }));

    const [selectedAchId, setSelectedAchId] = useState(null);
    const [isLevelRewardsPopupOpen, setIsLevelRewardsPopupOpen] = useState(false);

    const selectedAchievementLine = useMemo(() => {
        if (!selectedAchId) return null;
        const achLine = achievementsData.find(a => a.id === selectedAchId);
        if (achLine && !Array.isArray(achLine.levels)) {
            console.warn(`TrophiesTab: Achievement line with ID "${achLine.id}" has missing or invalid 'levels' property.`, achLine);
        }
        return achLine;
    }, [selectedAchId]);

    const currentLevelXp = getCurrentLevelXpProgress();
    const xpToLevelUp = getXpNeededForCurrentLevelUp();
    const nextLevelTotalXp = getAchievementXpNeededForNextLevel();
    const xpProgressPercent = (xpToLevelUp === Infinity || xpToLevelUp <= 0)
        ? 100
        : Math.min(100, Math.floor((currentLevelXp / xpToLevelUp) * 100));

    const achievementsToDisplay = useMemo(() => {
        return achievementsData.map(achLine => {
            const status = achievementsStatus[achLine.id] || { highestReachedLevel: 0, claimedRewardsUpToLevel: 0, currentValue: 0 };
            let currentValueForStat = 0;

            if (achLine.stat) {
                currentValueForStat = getGlobalStatValue(achLine.stat) || 0;
            } else if (achLine.flag) {
                const booleanFlags = getGlobalStatValue('booleanFlags') || {};
                currentValueForStat = booleanFlags[achLine.flag] ? 1 : 0;
            }
            
            const currentAchLevels = Array.isArray(achLine.levels) ? achLine.levels : [];
            if (!Array.isArray(achLine.levels)) {
                // console.warn(`TrophiesTab: Achievement line with ID "${achLine.id}" in achievementsData is missing or invalid 'levels'. Defaulting to empty.`, achLine);
            }

            let nextLevelToDisplay = null;
            let canClaimSomething = false;
            let isFullyClaimed = true;
            let nextClaimableLevel = null;

            for (const levelData of currentAchLevels) { 
                if (levelData.level > status.claimedRewardsUpToLevel) {
                    isFullyClaimed = false; 
                    if (!nextLevelToDisplay) { 
                        nextLevelToDisplay = levelData;
                    }
                    const targetMet = (achLine.stat && currentValueForStat >= levelData.target) || 
                                      (achLine.flag && currentValueForStat >= (levelData.target === true ? 1: levelData.target) );
                    if (targetMet) {
                        canClaimSomething = true;
                        if (!nextClaimableLevel) {
                            nextClaimableLevel = levelData;
                        }
                    }
                    if (nextLevelToDisplay && !targetMet && ((achLine.stat && currentValueForStat < nextLevelToDisplay.target) || (achLine.flag && !currentValueForStat))) {
                       break;
                    }
                }
            }
            
            if (!nextLevelToDisplay && currentAchLevels.length > 0) {
                 nextLevelToDisplay = currentAchLevels[currentAchLevels.length -1];
            } else if (!nextLevelToDisplay && currentAchLevels.length === 0) {
                 nextLevelToDisplay = { description: "Нет уровней", reward: {}, xpGain: 0, target: 0, level: 0 };
            }

            return {
                ...achLine, 
                levels: currentAchLevels,
                lineStatus: status, 
                currentValueForStat,
                canClaimOverall: canClaimSomething,
                isFullyCompletedAndClaimed: isFullyClaimed,
                nextLevelForDisplay: nextLevelToDisplay,
                nextClaimableLevelData: nextClaimableLevel 
            };
        }).sort((a, b) => {
            if (a.canClaimOverall && !b.canClaimOverall) return -1;
            if (!a.canClaimOverall && b.canClaimOverall) return 1;
            if (!a.isFullyCompletedAndClaimed && b.isFullyCompletedAndClaimed) return -1;
            if (a.isFullyCompletedAndClaimed && !b.isFullyCompletedAndClaimed) return 1;
            return (a.id < b.id) ? -1 : 1;
        });
    }, [achievementsStatus, getGlobalStatValue]);

    const handleOpenAchPopup = (achId) => setSelectedAchId(achId);
    const handleCloseAchPopup = () => setSelectedAchId(null);
    const openLevelRewardsPopup = () => setIsLevelRewardsPopupOpen(true);
    const closeLevelRewardsPopup = () => setIsLevelRewardsPopupOpen(false);

    const handleClaimListButton = (e, achLine) => {
        e.stopPropagation();
        if (achLine.nextClaimableLevelData) {
            claimAchievementReward(achLine.id, achLine.nextClaimableLevelData.level);
        }
    };
    
    const handleClaimPopupLevelButton = (e, achievementId, level) => {
        e.stopPropagation();
        claimAchievementReward(achievementId, level);
    };

    return (
        <div className="trophies-content"> {/* Оставляем этот класс-обертку */}
            <div className="achievement-level-progress-bar">
                <div className="level-badge"> <span className="level-number">{achievementLevel}</span> </div>
                <div className="xp-bar-container">
                    <div className="xp-bar-bg"> <div className="xp-bar-fg" style={{ width: `${xpProgressPercent}%` }}></div> </div>
                    <div className="xp-text"> {xpToLevelUp === Infinity ? 'Макс. уровень' : `${currentLevelXp} / ${xpToLevelUp} XP`} </div>
                </div>
                <div className="xp-target"> {nextLevelTotalXp !== Infinity ? nextLevelTotalXp : 'МАКС'} </div>
            </div>
            <button className="level-rewards-button" onClick={openLevelRewardsPopup}>
                Награды за Уровень
            </button>

            <div className="achievements-list">
                {achievementsToDisplay.map(achLine => {
                    const displayLevel = achLine.nextLevelForDisplay || { reward: {}, xpGain: 0, description: "Все уровни пройдены", level: achLine.levels.length > 0 ? achLine.levels[achLine.levels.length - 1].level : 0 };
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
                                    Ур. {achLine.lineStatus.claimedRewardsUpToLevel} / {achLine.levels.length}
                                    {achLine.stat && !achLine.isFullyCompletedAndClaimed && displayLevel.target > 0 && ` (${achLine.currentValueForStat}/${displayLevel.target})`}
                                </div>
                            </div>
                            <div className="achievement-reward-condensed">
                                {displayLevel.reward?.gold > 0 && <span>💰<small>{displayLevel.reward.gold}</small></span>}
                                {displayLevel.reward?.diamonds > 0 && <span>💎<small>{displayLevel.reward.diamonds}</small></span>}
                                {displayLevel.reward?.rareChestKeys > 0 && <span>🔑<small>{displayLevel.reward.rareChestKeys}(R)</small></span>}
                                {displayLevel.reward?.epicChestKeys > 0 && <span>🔑<small>{displayLevel.reward.epicChestKeys}(E)</small></span>}
                                {displayLevel.xpGain > 0 && <span className='xp-reward'>💡<small>{displayLevel.xpGain}</small></span>}
                            </div>
                            <button
                                className="claim-button"
                                onClick={(e) => handleClaimListButton(e, achLine)}
                                disabled={!achLine.canClaimOverall}
                            >
                                {achLine.isFullyCompletedAndClaimed ? "✔️" : (achLine.canClaimOverall ? "Забрать" : "...")}
                            </button>
                        </div>
                    );
                })}
            </div>

            {selectedAchievementLine && (
                <motion.div
                    className="achievement-popup-overlay"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={pageTransition} // Можно использовать общую анимацию перехода
                    onClick={handleCloseAchPopup}
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
                                if (selectedAchievementLine.stat) {
                                    currentValueForStat = getGlobalStatValue(selectedAchievementLine.stat) || 0;
                                } else if (selectedAchievementLine.flag) {
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
                                                    <span>{currentValueForStat} / {levelData.target}</span>
                                                </div>
                                            )}
                                            {selectedAchievementLine.flag && (
                                                <p className={`popup-status ${isLevelTargetMet ? 'completed-text' : 'locked-text'}`}>
                                                    Статус: {isLevelTargetMet ? 'Выполнено' : 'Не выполнено'}
                                                </p>
                                            )}
                                            <div className="popup-rewards small-rewards">
                                                {levelData.reward?.gold > 0 && <span>💰 <small>{levelData.reward.gold}</small></span>}
                                                {levelData.reward?.diamonds > 0 && <span>💎 <small>{levelData.reward.diamonds}</small></span>}
                                                {levelData.reward?.rareChestKeys > 0 && <span>🔑 <small>{levelData.reward.rareChestKeys}(R)</small></span>}
                                                {levelData.reward?.epicChestKeys > 0 && <span>🔑 <small>{levelData.reward.epicChestKeys}(E)</small></span>}
                                                {levelData.xpGain > 0 && <span>💡 <small>{levelData.xpGain} XP</small></span>}
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

            {isLevelRewardsPopupOpen && (
                 <motion.div
                    className="level-rewards-popup-overlay"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={pageTransition}
                    onClick={closeLevelRewardsPopup}
                >
                    <div className="level-rewards-popup-content" onClick={(e) => e.stopPropagation()}>
                        <button className="popup-close-btn" onClick={closeLevelRewardsPopup}>×</button>
                        <h2>Награды за Уровни Достижений</h2>
                        <div className="level-rewards-list">
                            {levelRewardsData
                                .map((levelData) => {
                                    const levelNum = levelData.level;
                                    const isUnlocked = achievementLevel >= levelNum;
                                    return (
                                        <div key={levelNum} className={`level-reward-item ${isUnlocked ? 'unlocked' : 'locked'}`}>
                                            <div className="level-badge-area">
                                                {levelData.levelIcon && <span className="level-icon">{levelData.levelIcon}</span>}
                                                <span className="level-badge-text">Ур. {levelNum}</span>
                                                <span className="level-status-text">{isUnlocked ? 'Достигнут' : 'Не достигнут'}</span>
                                            </div>
                                            <div className="reward-details-area">
                                                {levelData.rewards.map((reward, index) => {
                                                    switch (reward.type) {
                                                        case GlobalLevelRewardType.GOLD:
                                                            return <span key={index} className="reward-detail-item">💰 {reward.amount}</span>;
                                                        case GlobalLevelRewardType.DIAMONDS:
                                                            return <span key={index} className="reward-detail-item">💎 {reward.amount}</span>;
                                                        default:
                                                            return null;
                                                    }
                                                })}
                                                {levelData.rewards.length === 0 && <span className="reward-detail-item">(Нет наград)</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default TrophiesTab;