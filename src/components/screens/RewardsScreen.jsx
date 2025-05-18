// src/components/RewardsScreen.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import './RewardsScreen.scss';
import initialRewardDataFromFile from '../../data/rewardStagesData.js'; // Данные о наградах по этапам
import { useNavigate } from 'react-router-dom';
import useGameStore from '../../store/useGameStore.js';

// --- Компонент для отображения ОДНОЙ награды ---
const RewardItem = React.memo(({ reward, isClaimed, isClaimable, isLocked, onClaim }) => {
    if (!reward) return <div className="reward-slot empty"></div>; // Пустой слот, если награды нет

    const { type, amount, name, icon } = reward; // 'name' и 'icon' для предметов

    const handleClick = useCallback(() => {
        if (isClaimable && !isLocked) {
            onClaim(reward);
        }
    }, [isClaimable, isLocked, onClaim, reward]);

    let rewardDisplayName = type;
    if (name) rewardDisplayName = name; // Если есть имя (для предметов), используем его
    else if (type === 'gold') rewardDisplayName = 'Золото';
    else if (type === 'diamonds') rewardDisplayName = 'Алмазы';
    else if (type === 'toncoin_shards') rewardDisplayName = 'Осколки TON';
    // Добавьте другие типы по необходимости

    const slotClasses = `reward-slot reward-type-${type} ${isClaimed ? 'claimed' : ''} ${isClaimable ? 'claimable' : ''} ${isLocked ? 'locked' : ''}`;

    // Определяем путь к иконке (может быть в CSS через type или напрямую в reward.icon)
    const iconStyle = reward.icon ? { backgroundImage: `url(${reward.icon})` } : {};

    return (
        <div
            className={slotClasses}
            onClick={handleClick}
            title={isLocked ? 'Требуется покупка Фонда' : (isClaimable ? `Забрать ${rewardDisplayName} x ${amount || ''}` : `${rewardDisplayName} ${amount || ''}`)}
        >
            <div className="reward-icon" style={iconStyle}> {/* Иконка управляется через reward.icon или CSS */}
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
    const booleanFlags = useGameStore(state => state.booleanFlags);
    const setHasClaimableRewardsIndicator = useGameStore(state => state.setHasClaimableRewardsIndicator);
    const setBooleanFlag = useGameStore(state => state.setBooleanFlag);

    // Получаем actions из стора для добавления наград
    const addGold = useGameStore(state => state.addGold);
    const addDiamonds = useGameStore(state => state.addDiamonds);
    const addToncoinShards = useGameStore(state => state.addToncoinShards);
    const addItemToInventory = useGameStore(state => state.addItemToInventory); // Для предметов

    const processStagesWithCompletion = useCallback((stagesData, gameCompletionData) => {
        const processedStages = {};
        // Глубокое копирование, чтобы не мутировать исходные данные из файла
        const stagesDataCopy = JSON.parse(JSON.stringify(stagesData));

        for (const stageKey in stagesDataCopy) { // stageKey - это номер этапа наград, например, "1", "2"
            if (stagesDataCopy.hasOwnProperty(stageKey)) {
                processedStages[stageKey] = stagesDataCopy[stageKey].map(rewardLevel => {
                    const chapterForCompletion = rewardLevel.gameChapterId;
                    const levelIdForCompletion = rewardLevel.gameLevelInChapter; // Это должен быть полный ID уровня
                
                    let isGameLevelActuallyCompleted = false;
                    if (typeof chapterForCompletion === 'number' && typeof levelIdForCompletion !== 'undefined') {
                        const levelKeyInStore = `c${chapterForCompletion}_l${levelIdForCompletion}`;
                        // !!! ДОБАВЬТЕ CONSOLE.LOG ЗДЕСЬ !!!
                        console.log(`Checking completion for: Stage ${stageKey}, RewardLevel ${rewardLevel.level}, GameLevelKey: ${levelKeyInStore}`);
                        const completionRecord = gameCompletionData[levelKeyInStore];
                        console.log(`CompletionRecord for ${levelKeyInStore}:`, completionRecord);
                        isGameLevelActuallyCompleted = !!(completionRecord && completionRecord.normal);
                        console.log(`isGameLevelActuallyCompleted for ${levelKeyInStore}: ${isGameLevelActuallyCompleted}`);
                    } else {
                        isGameLevelActuallyCompleted = true; // Награда не привязана к уровню, считаем доступной
                        console.log(`Reward at stage ${stageKey}, level ${rewardLevel.level} has no game level binding. Defaulting to completed: true.`);
                    }
                
                    return {
                        ...rewardLevel,
                        completed: isGameLevelActuallyCompleted,
                    };
                });
            }
        }
        return processedStages;
    }, []);

    // Инициализация stagesProgress с учетом claimed статусов из localStorage, если они там есть
    // или из initialRewardDataFromFile, если это первый запуск/нет сохраненных
    const [stagesProgress, setStagesProgress] = useState(() => {
        const savedRewardProgress = useGameStore.getState().rewardScreenProgress; // Предполагаем, что вы сохраняете это в стор
        const initialData = savedRewardProgress || initialRewardDataFromFile;
        return processStagesWithCompletion(initialData, levelsCompletedFromStore);
    });

    useEffect(() => {
        console.log("АКТУАЛЬНОЕ СОСТОЯНИЕ levelsCompleted:", JSON.stringify(useGameStore.getState().levelsCompleted));
    }, [levelsCompletedFromStore]); // Обновится, когда levelsCompletedFromStore изменится

    // Сохраняем изменения stagesProgress (особенно freeClaimed/paidClaimed) в useGameStore
    useEffect(() => {
        // Этот эффект будет вызываться при каждом изменении stagesProgress
        // Вы можете добавить debounce, если обновлений слишком много
        useGameStore.setState({ rewardScreenProgress: stagesProgress });
    }, [stagesProgress]);


    // Эффект для обновления 'completed' статуса наград при изменении levelsCompletedFromStore
    useEffect(() => {
        setStagesProgress(currentStagesProgress => {
            // Заново обрабатываем ИСХОДНЫЕ данные о наградах с НОВЫМИ данными о прохождении уровней
            const progressFromGameLevels = processStagesWithCompletion(initialRewardDataFromFile, levelsCompletedFromStore);
            const mergedStages = JSON.parse(JSON.stringify(currentStagesProgress)); // Копируем текущее состояние (с claimed статусами)

            for (const stageKey in progressFromGameLevels) {
                if (progressFromGameLevels.hasOwnProperty(stageKey)) {
                    if (mergedStages.hasOwnProperty(stageKey)) {
                        mergedStages[stageKey] = mergedStages[stageKey].map(currentLevelReward => {
                            const updatedLevelInfo = progressFromGameLevels[stageKey].find(
                                newInfo => newInfo.level === currentLevelReward.level
                            );
                            if (updatedLevelInfo) {
                                return {
                                    ...currentLevelReward, // Сохраняем freeClaimed, paidClaimed
                                    completed: updatedLevelInfo.completed, // Обновляем только completed
                                };
                            }
                            return currentLevelReward;
                        });
                    } else {
                        // Если этапа не было в mergedStages, добавляем его (маловероятно при такой логике)
                        mergedStages[stageKey] = progressFromGameLevels[stageKey];
                    }
                }
            }
            return mergedStages;
        });
    }, [levelsCompletedFromStore, processStagesWithCompletion]);


    const [currentStage, setCurrentStage] = useState('1'); // Ключ этапа - строка
    const [isPaidUnlocked, setIsPaidUnlocked] = useState(() => booleanFlags.rewardFundPurchased || false);

    const highestCompletedStageNum = useMemo(() => {
        let maxStage = 0;
        const sortedStageKeys = Object.keys(stagesProgress).map(Number).sort((a, b) => a - b);
        for (const stageNum of sortedStageKeys) {
            const stageLevels = stagesProgress[stageNum.toString()];
            if (stageLevels && stageLevels.every(level => level.completed)) {
                maxStage = stageNum;
            } else {
                break; // Первый же не полностью завершенный этап останавливает подсчет
            }
        }
        return maxStage;
    }, [stagesProgress]);

    const currentStageRewards = useMemo(() => stagesProgress[currentStage] || [], [stagesProgress, currentStage]);

    const applyRewardToStore = useCallback((reward) => {
        if (!reward || !reward.type || typeof reward.amount === 'undefined') {
            console.error("Invalid reward object for store:", reward);
            return;
        }
        console.log(`Applying reward to store: ${reward.type} x ${reward.amount}`);
        switch (reward.type) {
            case 'gold':
                addGold(reward.amount);
                break;
            case 'diamond':
                addDiamonds(reward.amount);
                break;
            case 'ton_shard':
                addToncoinShards(reward.amount);
                break;
            case 'item':
                if (reward.itemId) {
                    addItemToInventory(reward.itemId, reward.amount || 1);
                } else {
                    console.warn("Claimed item reward is missing itemId:", reward);
                }
                break;
            default:
                console.warn(`Unknown reward type to add to store: ${reward.type}`);
        }
    }, [addGold, addDiamonds, addToncoinShards, addItemToInventory]);


    const handleClaim = useCallback((reward, levelOrderInStage, isPaidTrack) => {
        applyRewardToStore(reward); // Применяем награду к стору

        setStagesProgress(prev => {
            const newStages = { ...prev };
            const stageToUpdate = [...(newStages[currentStage] || [])];
            const rewardIndex = stageToUpdate.findIndex(item => item.level === levelOrderInStage);

            if (rewardIndex !== -1) {
                stageToUpdate[rewardIndex] = {
                    ...stageToUpdate[rewardIndex],
                    [isPaidTrack ? 'paidClaimed' : 'freeClaimed']: true
                };
                newStages[currentStage] = stageToUpdate;
                return newStages;
            }
            return prev; // Если награда не найдена, ничего не меняем
        });
    }, [currentStage, applyRewardToStore]);


    const handleClaimAll = useCallback(() => {
        let anythingClaimed = false;
        setStagesProgress(prevData => {
            const updatedData = JSON.parse(JSON.stringify(prevData));
            const rewardsToApplyBatch = [];

            Object.keys(updatedData).forEach(stageKey => {
                const stageNum = parseInt(stageKey);
                // Можно забирать награды с любого этапа, условие completed для которого выполнено,
                // но обычно это этапы до highestCompletedStageNum + 1
                if (stageNum > highestCompletedStageNum + 1 && stageNum > 1) return; // Пропускаем слишком далекие будущие этапы (кроме первого)


                updatedData[stageKey] = updatedData[stageKey].map(levelData => {
                    let newFreeClaimed = levelData.freeClaimed;
                    let newPaidClaimed = levelData.paidClaimed;

                    if (levelData.completed && levelData.freeReward && !levelData.freeClaimed) {
                        newFreeClaimed = true;
                        rewardsToApplyBatch.push(levelData.freeReward);
                        anythingClaimed = true;
                    }
                    if (levelData.completed && levelData.paidReward && !levelData.paidClaimed && isPaidUnlocked) {
                        newPaidClaimed = true;
                        rewardsToApplyBatch.push(levelData.paidReward);
                        anythingClaimed = true;
                    }
                    return { ...levelData, freeClaimed: newFreeClaimed, paidClaimed: newPaidClaimed };
                });
            });

            // Применяем все собранные награды разом
            rewardsToApplyBatch.forEach(reward => applyRewardToStore(reward));

            return updatedData;
        });

        if (anythingClaimed) {
            console.log('Все доступные награды обработаны!');
        } else {
            console.log('Нет доступных наград для сбора.');
        }
    }, [isPaidUnlocked, highestCompletedStageNum, applyRewardToStore]);


    const handlePurchase = useCallback(() => {
        // Здесь должна быть логика реальной покупки
        // После успешной покупки:
        setIsPaidUnlocked(true);
        setBooleanFlag('rewardFundPurchased', true);
        // alert('Платная дорожка разблокирована!'); // Заменить на UI уведомление
    }, [setBooleanFlag]);


    const canClaimAny = useMemo(() => {
        return Object.entries(stagesProgress).some(([stageKey, levels]) => {
            const stageNum = parseInt(stageKey);
            if (stageNum > highestCompletedStageNum + 1 && stageNum > 1) return false;

            return levels.some(level =>
                (level.completed && level.freeReward && !level.freeClaimed) ||
                (level.completed && level.paidReward && isPaidUnlocked && !level.paidClaimed)
            );
        });
    }, [stagesProgress, isPaidUnlocked, highestCompletedStageNum]);


    useEffect(() => {
        setHasClaimableRewardsIndicator(canClaimAny);
    }, [canClaimAny, setHasClaimableRewardsIndicator]);

    const handleGoBack = useCallback(() => navigate(-1), [navigate]);

    return (
        <div className="rewards-screen">
            <button className="popup-close-button" onClick={handleGoBack} aria-label="Закрыть">×</button>
            <div className="rewards-screen-header">
                <div className="header-placeholder-left"></div> {/* Для выравнивания заголовка по центру, если кнопка абсолютна */}
                <h1>Награды Фонда</h1>
            </div>

            <div className="stage-tabs">
                {Object.keys(initialRewardDataFromFile).map(stageNumStr => {
                    const stageNum = parseInt(stageNumStr);
                    const isLocked = stageNum > 1 && stageNum > (highestCompletedStageNum + 1);
                    return (
                        <button
                            key={stageNumStr}
                            className={`stage-tab ${stageNumStr === currentStage ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                            onClick={() => !isLocked && setCurrentStage(stageNumStr)}
                            disabled={isLocked}
                            title={isLocked ? `Завершите предыдущие этапы` : `Этап ${stageNumStr}`}
                        >
                            {isLocked && <span className="stage-lock-icon">🔒</span>}
                            Этап {stageNumStr}
                        </button>
                    );
                })}
            </div>

            <div className="rewards-track-titles">
                <div className="title-column title-free">БЕСПЛАТНО</div>
                <div className="title-column-spacer"></div> {/* Разделитель или лейбл уровня */}
                <div className="title-column title-paid">ФОНД</div>
            </div>

            <div className="rewards-track-wrapper">
                <div className="rewards-track-container">
                    {currentStageRewards.length === 0 ? (
                        <p className="no-rewards-message">Награды для этого этапа скоро появятся!</p>
                    ) : (
                        currentStageRewards.map((levelData) => (
                            <div key={`${currentStage}-${levelData.level}`} className={`reward-row ${levelData.completed ? 'row-completed' : ''}`}>
                                <RewardItem
                                    reward={levelData.freeReward}
                                    isClaimed={!!levelData.freeClaimed}
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
                                    isClaimed={!!levelData.paidClaimed}
                                    isClaimable={levelData.completed && !!levelData.paidReward && !levelData.paidClaimed && isPaidUnlocked}
                                    isLocked={!isPaidUnlocked && !!levelData.paidReward}
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
                    title={!canClaimAny ? "Нет доступных наград" : "Забрать все доступные награды"}
                >
                    Забрать все
                </button>
                {!isPaidUnlocked && (
                    <button className="purchase-button" onClick={handlePurchase}>
                        Купить Фонд {/* <span className="price">$?.??</span> TODO: Динамическая цена */}
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