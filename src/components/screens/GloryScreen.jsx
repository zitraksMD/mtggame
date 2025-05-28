// Предположим, файл теперь называется GloryScreen.jsx
// import './GloryScreen.scss'; // и SCSS файл тоже переименован

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../../store/useGameStore.js';
import levelRewardsData, { RewardType as GlobalLevelRewardType } from '../../data/levelRewardsData'; // Награды за общий уровень достижений
import achievementsData from '../../data/achievementsDatabase.js'; // Достижения (Trophies)
import trialsData from '../../data/trialsData.js'; // Новый файл для Испытаний (Trials)
import { pageVariants, pageTransition } from '../../animations';
import './GloryScreen.scss';

const GloryScreen = () => {
const [activeTab, setActiveTab] = useState('Trials'); // 'Trophies' или 'Trials'

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
        console.warn(`Achievement line with ID "${achLine.id}" has missing or invalid 'levels' property.`, achLine);
        // Можно вернуть achLine с пустым массивом levels, чтобы попап не падал, но показал что-то
        // return { ...achLine, levels: [] }; 
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
            
            // VVV ИЗМЕНЕНИЕ: Защитная проверка для achLine.levels VVV
            const currentAchLevels = Array.isArray(achLine.levels) ? achLine.levels : [];
            if (!Array.isArray(achLine.levels)) {
                console.warn(`Achievement line with ID "${achLine.id}" in achievementsData is missing or has an invalid 'levels' property. Defaulting to empty array.`, achLine);
            }
            // ^^^ КОНЕЦ ИЗМЕНЕНИЯ ^^^

            let nextLevelToDisplay = null;
            let canClaimSomething = false;
            let isFullyClaimed = true;
            let nextClaimableLevel = null;

            // VVV ИЗМЕНЕНИЕ: Используем currentAchLevels VVV
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
                    // Небольшое изменение в условии break для большей ясности
                    if (nextLevelToDisplay && !targetMet && ((achLine.stat && currentValueForStat < nextLevelToDisplay.target) || (achLine.flag && !currentValueForStat))) {
                       break;
                    }
                }
            }
            
            // VVV ИЗМЕНЕНИЕ: Используем currentAchLevels VVV
            if (!nextLevelToDisplay && currentAchLevels.length > 0) {
                 nextLevelToDisplay = currentAchLevels[currentAchLevels.length -1];
            } else if (!nextLevelToDisplay && currentAchLevels.length === 0) {
                 nextLevelToDisplay = { description: "Нет уровней", reward: {}, xpGain: 0, target: 0, level: 0 }; // добавил level:0 для консистентности
            }


            return {
                ...achLine, 
                levels: currentAchLevels, // Передаем проверенный или пустой массив уровней
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

    const trialsToDisplay = useMemo(() => {
        return trialsData.map(trial => ({
            ...trial,
            isCompleted: false, 
            isClaimed: false,   
            canClaim: false,    
        }));
    }, []); 

    const handleTrialAction = (trial) => {
        if (trial.actionUrl) {
            window.open(trial.actionUrl, '_blank');
        }
        console.log("Trial action for:", trial.name);
    };

    const handleClaimTrial = (trialId) => {
        console.log("Claiming trial:", trialId);
    };

    return (
        <motion.div
            className="glory-screen"
            initial="initial" animate="in" exit="out"
            variants={pageVariants} transition={pageTransition}
        >
            <div className="tabs-navigation">
                <button
                    className={`tab-button ${activeTab === 'Trials' ? 'active' : ''}`}
                    onClick={() => setActiveTab('Trials')}
                >
                    🎯 Trials
                </button>
                <button
                    className={`tab-button ${activeTab === 'Trophies' ? 'active' : ''}`}
                    onClick={() => setActiveTab('Trophies')}
                >
                    🏆 Trophies
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'Trophies' && (
                    <div className="trophies-content">
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
                                // achLine.levels здесь уже должен быть массивом из-за useMemo
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
                                                Ур. {achLine.lineStatus.claimedRewardsUpToLevel} / {achLine.levels.length} {/* Используем achLine.levels.length */}
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
                                onClick={handleCloseAchPopup}
                            >
                                 <div className="achievement-popup-content" onClick={(e) => e.stopPropagation()}>
                                    <button className="popup-close-btn" onClick={handleCloseAchPopup}>×</button>
                                    <div className="popup-header">
                                        <div className="popup-icon">{selectedAchievementLine.icon || '🏆'}</div>
                                        <h3 className="popup-name">{selectedAchievementLine.name}</h3>
                                    </div>
                                    
                                    <div className="achievement-levels-in-popup">
                                        {/* VVV ИЗМЕНЕНИЕ: Проверка selectedAchievementLine.levels перед map VVV */}
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
                                        {/* ^^^ КОНЕЦ ИЗМЕНЕНИЯ ^^^ */}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {isLevelRewardsPopupOpen && (
                             <motion.div
                                className="level-rewards-popup-overlay"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                )}

                {activeTab === 'Trials' && (
                    <div className="trials-content">
                        <h3>Испытания (Trials)</h3>
                        <div className="trials-list">
                            {trialsToDisplay.map(trial => (
                                <div key={trial.id} className={`trial-item ${trial.isClaimed ? 'claimed' : ''} ${trial.canClaim ? 'claimable' : ''}`}>
                                    <div className="trial-icon">{trial.icon || '🎯'}</div>
                                    <div className="trial-info">
                                        <div className="trial-name">{trial.name}</div>
                                        <p className="trial-description">{trial.description}</p>
                                    </div>
                                    <div className="trial-rewards">
                                        {trial.reward?.gold > 0 && <span>💰<small>{trial.reward.gold}</small></span>}
                                        {trial.reward?.diamonds > 0 && <span>💎<small>{trial.reward.diamonds}</small></span>}
                                        {trial.reward?.rareChestKeys > 0 && <span>🔑<small>{trial.reward.rareChestKeys}(R)</small></span>}
                                        {trial.xpGain > 0 && <span className='xp-reward'>💡<small>{trial.xpGain}</small></span>}
                                    </div>
                                    <div className="trial-actions">
                                        {!trial.isCompleted && trial.actionText && (
                                            <button className="action-button" onClick={() => handleTrialAction(trial)}>
                                                {trial.actionText}
                                            </button>
                                        )}
                                        {trial.isCompleted && !trial.isClaimed && ( 
                                            <button 
                                                className="claim-button"
                                                onClick={() => handleClaimTrial(trial.id)}
                                                disabled={!trial.canClaim}
                                            >
                                                Забрать
                                            </button>
                                        )}
                                         {trial.isCompleted && trial.isClaimed && (
                                            <button className="claim-button" disabled>✔️</button>
                                        )}
                                        {!trial.isCompleted && !trial.actionText && trial.verificationType === 'button_confirm' && (
                                             <button className="action-button" onClick={() => handleTrialAction(trial)}>
                                               Подтвердить
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {trialsToDisplay.length === 0 && <p>Пока нет доступных испытаний.</p>}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default GloryScreen;