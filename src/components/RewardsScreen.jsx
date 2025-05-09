// src/components/RewardsScreen.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import './RewardsScreen.scss';
import initialRewardDataFromFile from '../data/rewardStagesData.js';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../store/useGameStore'; // Убедитесь, что путь верный

// --- Компонент для отображения ОДНОЙ награды --- (без изменений)
const RewardItem = React.memo(({ reward, isClaimed, isClaimable, isLocked, onClaim }) => {
    if (!reward) return <div className="reward-slot empty"></div>;
    const { type, amount } = reward;
    const handleClick = useCallback(() => {
        if (isClaimable && !isLocked) {
            onClaim(reward);
        }
    }, [isClaimable, isLocked, onClaim, reward]);
    const slotClasses = `reward-slot reward-type-${type} ${isClaimed ? 'claimed' : ''} ${isClaimable ? 'claimable' : ''} ${isLocked ? 'locked' : ''}`;
    return (
        <div className={slotClasses} onClick={handleClick} title={isLocked ? 'Требуется покупка Фонда' : (isClaimable ? `Забрать ${type} x ${amount}` : '')}>
            <div className="reward-icon">
                {amount > 0 && <span className="reward-amount">{amount}</span>}
            </div>
            {isClaimed && <div className="checkmark">✔</div>}
            {isLocked && !isClaimed && <div className="lock-icon">🔒</div>}
            {!isClaimed && isClaimable && !isLocked && <div className="claim-indicator">Забрать</div>}
        </div>
    );
});

// --- Основной компонент ЭКРАНА Наград ---
const RewardsScreen = () => {
    const navigate = useNavigate();
    const levelsCompletedFromStore = useGameStore(state => state.levelsCompleted);
    // Получаем action из стора (ИЗ КОД1)
    const setHasClaimableRewardsIndicator = useGameStore(state => state.setHasClaimableRewardsIndicator);

    const processStagesWithCompletion = useCallback((stagesData, completionData) => {
        const processedStages = {};
        const stagesDataCopy = JSON.parse(JSON.stringify(stagesData));

        for (const stageKey in stagesDataCopy) {
            if (stagesDataCopy.hasOwnProperty(stageKey)) {
                const gameChapterId = parseInt(stageKey);
                processedStages[stageKey] = stagesDataCopy[stageKey].map(rewardLevel => {
                    const chapterForLevel = rewardLevel.gameChapterId || gameChapterId;
                    const levelInChapter = rewardLevel.gameLevelInChapter || rewardLevel.level;
                    const gameLevelFullId = chapterForLevel * 100 + levelInChapter;
                    const levelKeyForCompletion = `c${chapterForLevel}_l${gameLevelFullId}`;
                    const completionRecord = completionData[levelKeyForCompletion];
                    const newCompletedStatus = !!(completionRecord && completionRecord.normal);
                    return {
                        ...rewardLevel,
                        completed: newCompletedStatus
                    };
                });
            }
        }
        return processedStages;
    }, []);

    const [stagesProgress, setStagesProgress] = useState(() =>
        processStagesWithCompletion(initialRewardDataFromFile, levelsCompletedFromStore)
    );

    // Эффект для обновления stagesProgress, если levelsCompletedFromStore изменяется
    useEffect(() => {
        setStagesProgress(currentStages => {
            const newProgressBasedOnCompletion = processStagesWithCompletion(initialRewardDataFromFile, levelsCompletedFromStore);
            const mergedStages = JSON.parse(JSON.stringify(currentStages));

            for (const stageKey in newProgressBasedOnCompletion) {
                if (newProgressBasedOnCompletion.hasOwnProperty(stageKey)) {
                    if (mergedStages.hasOwnProperty(stageKey)) {
                        mergedStages[stageKey] = mergedStages[stageKey].map(currentLevel => {
                            const updatedLevelInfo = newProgressBasedOnCompletion[stageKey].find(nl => nl.level === currentLevel.level);
                            if (updatedLevelInfo) {
                                return {
                                    ...currentLevel,
                                    completed: updatedLevelInfo.completed
                                };
                            }
                            return currentLevel;
                        });
                        newProgressBasedOnCompletion[stageKey].forEach(newLevelFromCompletion => {
                            if (!mergedStages[stageKey].some(existingLevel => existingLevel.level === newLevelFromCompletion.level)) {
                                mergedStages[stageKey].push(JSON.parse(JSON.stringify(newLevelFromCompletion)));
                            }
                        });
                    } else {
                        mergedStages[stageKey] = JSON.parse(JSON.stringify(newProgressBasedOnCompletion[stageKey]));
                    }
                }
            }
            for (const stageKeyInMerged in mergedStages) {
                if (mergedStages.hasOwnProperty(stageKeyInMerged) && !newProgressBasedOnCompletion.hasOwnProperty(stageKeyInMerged)) {
                    delete mergedStages[stageKeyInMerged];
                }
            }
            return mergedStages;
        });
    }, [levelsCompletedFromStore, processStagesWithCompletion, initialRewardDataFromFile]);


    const [currentStage, setCurrentStage] = useState('1');
    const [isPaidUnlocked, setIsPaidUnlocked] = useState(false);

    const highestCompletedStage = useMemo(() => {
        let maxCompleted = 0;
        const sortedStageKeys = Object.keys(stagesProgress).map(Number).sort((a, b) => a - b);
        for (const stageNum of sortedStageKeys) {
            const stageLevels = stagesProgress[stageNum.toString()];
            if (!stageLevels || stageLevels.length === 0) break;
            if (stageLevels.every(level => level.completed)) {
                maxCompleted = stageNum;
            } else {
                break;
            }
        }
        return maxCompleted;
    }, [stagesProgress]);

    const currentStageRewards = useMemo(() => stagesProgress[currentStage] || [], [stagesProgress, currentStage]);

    const handleClaim = useCallback((reward, level, isPaid) => {
        setStagesProgress(prev => {
            const updatedStageLevels = (prev[currentStage] || []).map(item =>
                item.level === level ? { ...item, [isPaid ? 'paidClaimed' : 'freeClaimed']: true } : item
            );
            return { ...prev, [currentStage]: updatedStageLevels };
        });
        alert(`Награда ${reward.type} x ${reward.amount} (типа) получена!`);
    }, [currentStage]);

    const handleClaimAll = useCallback(() => {
        setStagesProgress(prevData => {
            const updatedData = JSON.parse(JSON.stringify(prevData));
            Object.keys(updatedData).forEach(stageKey => {
                const stageNum = parseInt(stageKey);
                const isStageAccessibleForClaimAll = stageNum <= (highestCompletedStage + 1);

                if (!isStageAccessibleForClaimAll) return;

                updatedData[stageKey] = updatedData[stageKey].map(levelData => {
                    let { freeClaimed, paidClaimed } = levelData;
                    if (levelData.completed && levelData.freeReward && !levelData.freeClaimed) {
                        freeClaimed = true;
                    }
                    if (levelData.completed && levelData.paidReward && !levelData.paidClaimed && isPaidUnlocked) {
                        paidClaimed = true;
                    }
                    return { ...levelData, freeClaimed, paidClaimed };
                });
            });
            return updatedData;
        });
        alert('Все доступные награды (типа) получены!');
    }, [isPaidUnlocked, highestCompletedStage]); // stagesProgress убран из зависимостей, так как prevData используется в setStagesProgress

    const handlePurchase = useCallback(() => {
        setIsPaidUnlocked(true);
        alert('Платная дорожка (типа) разблокирована!');
    }, []);

    // Логика canClaimAny из КОД2, она уже была более точной
    const canClaimAny = useMemo(() => {
        return Object.entries(stagesProgress).some(([stageKey, levels]) => {
            const stageNum = parseInt(stageKey);
            const isStageAccessibleForClaim = stageNum <= (highestCompletedStage + 1);
            if (!isStageAccessibleForClaim) return false;

            return levels.some(level =>
                (level.completed && level.freeReward && !level.freeClaimed) ||
                (level.completed && level.paidReward && isPaidUnlocked && !level.paidClaimed)
            );
        });
    }, [stagesProgress, isPaidUnlocked, highestCompletedStage]);

    // <<< НОВЫЙ useEffect для обновления флага в сторе (ИЗ КОД1) >>>
    useEffect(() => {
        if (typeof setHasClaimableRewardsIndicator === 'function') {
            setHasClaimableRewardsIndicator(canClaimAny);
        }
        // При размонтировании экрана Наград можно сбросить индикатор, если это нужно,
        // но лучше, чтобы он оставался, пока награды не будут собраны.
        // return () => {
        //    setHasClaimableRewardsIndicator(false); // Сбрасывать ли при выходе?
        // };
    }, [canClaimAny, setHasClaimableRewardsIndicator]);
    // --------------------------------------------------

    const handleGoBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    return (
        <div className="rewards-screen">
            <button className="popup-close-button" onClick={handleGoBack} aria-label="Закрыть">×</button>
            <div className="rewards-screen-header">
                <div className="header-placeholder-left"></div>
                <h1>Награды</h1>
            </div>

            <div className="stage-tabs">
                {Object.keys(initialRewardDataFromFile).map(stageNumStr => {
                    const stageNum = parseInt(stageNumStr);
                    const isLocked = stageNum > 1 && stageNum > (highestCompletedStage + 1);
                    return (
                        <button
                            key={stageNumStr}
                            className={`stage-tab ${stageNumStr === currentStage ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                            onClick={() => !isLocked && setCurrentStage(stageNumStr)}
                            disabled={isLocked}
                            title={isLocked ? `Завершите Этап ${stageNum - 1}` : `Перейти на Этап ${stageNum}`}
                        >
                            {isLocked && <span className="stage-lock-icon">🔒</span>}
                            Этап {stageNumStr}
                        </button>
                    );
                })}
            </div>

            <div className="rewards-track-titles">
                <div className="title-column title-free">FREE</div>
                <div className="title-column-spacer"></div>
                <div className="title-column title-paid">PAID</div>
            </div>

            <div className="rewards-track-wrapper">
                <div className="rewards-track-container">
                    {currentStageRewards.length === 0 ? (
                        <p className="no-rewards-message">Награды для этого этапа скоро появятся!</p>
                    ) : (
                        currentStageRewards.map((levelData) => (
                            <div key={levelData.level} className={`reward-row ${levelData.completed ? 'row-completed' : ''}`}>
                                <RewardItem
                                    reward={levelData.freeReward}
                                    isClaimed={levelData.freeClaimed}
                                    isClaimable={levelData.completed && !!levelData.freeReward && !levelData.freeClaimed}
                                    isLocked={false}
                                    onClaim={(reward) => handleClaim(reward, levelData.level, false)}
                                />
                                <div className="level-connector">
                                    <div className="grey-line-element"></div>
                                    <div className={`level-number ${levelData.completed ? 'completed' : ''}`}>{levelData.level}</div>
                                    {levelData.completed && (<div className="progress-line-segment"></div>)}
                                </div>
                                <RewardItem
                                    reward={levelData.paidReward}
                                    isClaimed={levelData.paidClaimed}
                                    isClaimable={levelData.completed && !!levelData.paidReward && !levelData.paidClaimed}
                                    isLocked={!isPaidUnlocked}
                                    onClaim={(reward) => handleClaim(reward, levelData.level, true)}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="rewards-footer">
                <button
                    className="claim-all-button"
                    onClick={handleClaimAll}
                    disabled={!canClaimAny}
                    title={!canClaimAny ? "Нет доступных наград для сбора" : "Забрать все доступные награды"}
                >
                    Забрать все
                </button>
                {!isPaidUnlocked && (
                    <button className="purchase-button" onClick={handlePurchase}>
                        Купить Фонд <span className="price">$?.??</span>
                    </button>
                )}
                {isPaidUnlocked && (
                    <div className="paid-unlocked-indicator">Фонд Активен ✔</div>
                )}
            </div>
        </div>
    );
};

export default RewardsScreen;