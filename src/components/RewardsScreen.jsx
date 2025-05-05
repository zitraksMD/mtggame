// src/components/RewardsScreen.jsx
import React, { useState, useMemo, useCallback } from 'react';
import './RewardsScreen.scss'; // Убедитесь, что путь к стилям верный
import initialRewardData from '../data/rewardStagesData.js'; // Путь к данным
// <<< ИМПОРТИРУЕМ ХУК НАВИГАЦИИ (из код1) >>>
import { useNavigate } from 'react-router-dom';

// --- Компонент для отображения ОДНОЙ награды ---
// (Оставляем как в код2)
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
// <<< УБИРАЕМ goBack из пропсов (как в код1) >>>
const RewardsScreen = () => {
    // <<< ИСПОЛЬЗУЕМ ХУК НАВИГАЦИИ (из код1) >>>
    const navigate = useNavigate();

    // --- Вся остальная логика состояния и обработчики из код2 ---
    const [currentStage, setCurrentStage] = useState('1');
    const [stagesProgress, setStagesProgress] = useState(initialRewardData);
    const [isPaidUnlocked, setIsPaidUnlocked] = useState(false);

    // Логика определения максимального пройденного этапа (из код2)
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

    // Награды для текущего выбранного этапа (из код2)
    const currentStageRewards = useMemo(() => stagesProgress[currentStage] || [], [stagesProgress, currentStage]);

    // Обработчик получения ОДНОЙ награды (из код2)
    const handleClaim = useCallback((reward, level, isPaid) => {
        console.log(`Claiming ${isPaid ? 'paid' : 'free'} reward for stage ${currentStage} level ${level}:`, reward);
        setStagesProgress(prev => {
            const updatedStage = (prev[currentStage] || []).map(item =>
                item.level === level ? { ...item, [isPaid ? 'paidClaimed' : 'freeClaimed']: true } : item
            );
            return { ...prev, [currentStage]: updatedStage };
        });
        alert(`Награда ${reward.type} x ${reward.amount} (типа) получена!`);
    }, [currentStage]);

    // Обработчик кнопки "Забрать все" (из код2)
    const handleClaimAll = useCallback(() => {
        console.log('Claiming all available rewards...');
        setStagesProgress(prev => {
            const updatedData = { ...prev };
            Object.keys(updatedData).forEach(stageKey => {
                const stageNum = parseInt(stageKey);
                const isStageAccessible = stageNum === 1 || stageNum <= (highestCompletedStage + 1);
                if (!isStageAccessible) return;

                updatedData[stageKey] = updatedData[stageKey].map(levelData => {
                    let { freeClaimed, paidClaimed } = levelData;
                    if (levelData.completed && !levelData.freeClaimed) {
                        freeClaimed = true;
                        console.log(`Claiming all: Free reward stage ${stageKey} level ${levelData.level}`);
                    }
                    if (levelData.completed && !levelData.paidClaimed && isPaidUnlocked) {
                        paidClaimed = true;
                        console.log(`Claiming all: Paid reward stage ${stageKey} level ${levelData.level}`);
                    }
                    return { ...levelData, freeClaimed, paidClaimed };
                });
            });
            return updatedData;
        });
        alert('Все доступные награды (типа) получены!');
    }, [isPaidUnlocked, highestCompletedStage]);

    // Обработчик покупки платной дорожки (из код2)
    const handlePurchase = useCallback(() => {
        console.log('Purchasing Advanced Fund...');
        setIsPaidUnlocked(true);
        alert('Платная дорожка (типа) разблокирована!');
    }, []);

    // Проверка, есть ли что забирать кнопкой "Забрать все" (из код2)
    const canClaimAny = useMemo(() => {
        return Object.entries(stagesProgress).some(([stageKey, levels]) => {
            const stageNum = parseInt(stageKey);
            const isStageAccessible = stageNum === 1 || stageNum <= (highestCompletedStage + 1);
            if (!isStageAccessible) return false;
            return levels.some(level =>
                (level.completed && !level.freeClaimed) ||
                (level.completed && isPaidUnlocked && !level.paidClaimed)
            );
        });
    }, [stagesProgress, isPaidUnlocked, highestCompletedStage]);

    // <<< Обработчик для кнопки "Назад" (из код1) >>>
    const handleGoBack = useCallback(() => {
        // Можно перейти на конкретный роут или просто на шаг назад
        // navigate('/main');
        navigate(-1); // Вернуться на предыдущий экран
    }, [navigate]);

    // --- Рендер ЭКРАНА (из код2, но с обновленной кнопкой назад) ---
    return (
        // Основной контейнер экрана
        <div className="rewards-screen">
             {/* === КНОПКА ЗАКРЫТИЯ (ТЕПЕРЬ ЗДЕСЬ) === */}
        {/* Используем класс popup-close-button для стилей */}
        <button className="popup-close-button" onClick={handleGoBack} aria-label="Закрыть">×</button>

            {/* Шапка Экрана */}
            <div className="rewards-screen-header">
        {/* Пустое место слева (вместо кнопки Назад) */}
        <div className="header-placeholder-left"></div>
        {/* Заголовок (или место для видео) */}
        <h1>Награды</h1>

      </div>

            {/* Табы Этапов (из код2) */}
            <div className="stage-tabs">
                {Object.keys(initialRewardData).map(stageNumStr => {
                    const stageNum = parseInt(stageNumStr);
                    const isLocked = stageNum > 1 && stageNum > (highestCompletedStage + 1);
                    return (
                        <button
                            key={stageNumStr}
                            className={`stage-tab ${stageNumStr === currentStage ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                            onClick={() => !isLocked && setCurrentStage(stageNumStr)}
                            disabled={isLocked}
                            title={isLocked ? `Завершите Этап ${stageNum - 1}`: `Перейти на Этап ${stageNum}`}
                        >
                            {isLocked && <span className="stage-lock-icon">🔒</span>}
                            Этап {stageNumStr}
                        </button>
                    );
                })}
            </div>
             {/* === НОВЫЙ БЛОК ДЛЯ ЗАГОЛОВКОВ === */}
             <div className="rewards-track-titles">
        {/* Колонка для "FREE" */}
        <div className="title-column title-free">FREE</div>
        {/* Пустая колонка для центрального разделителя */}
        <div className="title-column-spacer"></div>
        {/* Колонка для "PAID" */}
        <div className="title-column title-paid">PAID</div>
      </div>
      {/* === КОНЕЦ НОВОГО БЛОКА === */}
            {/* Обертка для Скроллируемой области Наград (из код2) */}
            <div className="rewards-track-wrapper">
                {/* Начальная линия прогресса */}

                {/* Контейнер, который будет скроллиться вертикально (из код2) */}
                <div className="rewards-track-container">
                    {currentStageRewards.length === 0 ? (
                        <p className="no-rewards-message">Награды для этого этапа скоро появятся!</p>
                    ) : (
                        currentStageRewards.map((levelData) => (
                            // Рендер одного ряда (уровня)
                            <div key={levelData.level} className={`reward-row ${levelData.completed ? 'row-completed' : ''}`}>
                                <RewardItem reward={levelData.freeReward} isClaimed={levelData.freeClaimed} isClaimable={levelData.completed && !levelData.freeClaimed} isLocked={false} onClaim={(reward) => handleClaim(reward, levelData.level, false)} />
                                <div className="level-connector">
                                    <div className="grey-line-element"></div>
                                    <div className={`level-number ${levelData.completed ? 'completed' : ''}`}>{levelData.level}</div>
                                    {levelData.completed && ( <div className="progress-line-segment"></div> )}
                                </div>
                                <RewardItem reward={levelData.paidReward} isClaimed={levelData.paidClaimed} isClaimable={levelData.completed && !levelData.paidClaimed} isLocked={!isPaidUnlocked} onClaim={(reward) => handleClaim(reward, levelData.level, true)} />
                            </div>
                        ))
                    )}
                </div> {/* Конец .rewards-track-container */}
            </div> {/* Конец .rewards-track-wrapper */}

            {/* Футер с кнопками (из код2) */}
            <div className="rewards-footer">
                <button className="claim-all-button" onClick={handleClaimAll} disabled={!canClaimAny} title={!canClaimAny ? "Нет доступных наград для сбора" : "Забрать все доступные награды"}>Забрать все</button>
                {!isPaidUnlocked && ( <button className="purchase-button" onClick={handlePurchase}>Купить Фонд <span className="price">$?.??</span></button> )}
                {isPaidUnlocked && ( <div className="paid-unlocked-indicator">Фонд Активен ✔</div> )}
            </div> {/* Конец .rewards-footer */}

        </div> // Конец .rewards-screen
    );
};

export default RewardsScreen;