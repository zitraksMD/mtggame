import React, { useState, useEffect, useCallback } from 'react';
import useGameStore from '../../store/useGameStore';
import { TASK_TYPES, ALL_TASK_DEFINITIONS, BONUS_REWARDS_CONFIG, getTaskDescription } from '../../data/tasksData'; // Убедись, что пути правильные
import './TasksPopup.scss'; // Создадим этот файл для стилей

// Маленький компонент для одного задания
const TaskItem = ({ taskDefinition, taskProgress, taskType, onClaim }) => {
    if (!taskDefinition) return null;

    const progress = taskProgress?.progress || 0;
    const target = taskDefinition.target;
    const isCompleted = taskProgress?.completed || false;
    const isClaimed = taskProgress?.claimed || false;
    
    // Получаем описание задачи
    const description = getTaskDescription(taskDefinition); 

    const progressPercentage = target > 0 ? Math.min((progress / target) * 100, 100) : (isCompleted ? 100 : 0);
    const showXp = taskDefinition.xp > 0 && !isClaimed;

    return (
        <div 
            className={`task-item ${isCompleted ? 'completed' : ''} ${isClaimed ? 'claimed' : ''}`}
            style={{ '--task-item-height': 'auto' }} 
        >
            <div className="task-icon-container">
                <span>📜</span> {/* Placeholder-иконка */}
            </div>

            <div className="task-info-wrapper">
                {description && (
                    <p className="task-item-description">{description}</p>
                )}
                <div className="task-progress-bar-container">
                    <div 
                        className="task-progress-bar-fill" 
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
                <div className="task-progress-text-display">{progress}/{target}</div>
            </div>
            
            {showXp && (
                 <div className="task-xp-display">
                     <span>+{taskDefinition.xp} XP</span>
                 </div>
            )}

            <div className="task-action-area">
                {isCompleted && !isClaimed && (
                    <button 
                        className="task-claim-button" 
                        onClick={() => onClaim(taskType, taskDefinition.id)}
                        title={`Забрать награду: ${taskDefinition.reward.diamonds} алмазов`}
                    >
                        <span className="claim-button-text">Claim</span>
                        <span className="claim-button-reward">
                            +{taskDefinition.reward.diamonds}💎
                        </span>
                    </button>
                )}
                {isClaimed && (
                    <div className="task-status-claimed">
                        <span>ПОЛУЧЕНО</span>
                    </div>
                )}
                {!isCompleted && !showXp && <div className="task-action-placeholder"></div>}
            </div>
        </div>
    );
};


const TasksPopup = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState(TASK_TYPES.DAILY);

    const {
        dailyTaskProgress, dailyTaskBarXp, dailyBonusClaimed,
        weeklyTaskProgress, weeklyTaskBarXp, weeklyBonusClaimed,
        monthlyTaskProgress, monthlyTaskBarXp, monthlyBonusClaimed,
        claimTaskReward,
        claimBonusReward,
        lastDailyReset, lastWeeklyReset, lastMonthlyReset,
    } = useGameStore(state => ({
        dailyTaskProgress: state.dailyTaskProgress,
        dailyTaskBarXp: state.dailyTaskBarXp,
        dailyBonusClaimed: state.dailyBonusClaimed,
        weeklyTaskProgress: state.weeklyTaskProgress,
        weeklyTaskBarXp: state.weeklyTaskBarXp,
        weeklyBonusClaimed: state.weeklyBonusClaimed,
        monthlyTaskProgress: state.monthlyTaskProgress,
        monthlyTaskBarXp: state.monthlyTaskBarXp,
        monthlyBonusClaimed: state.monthlyBonusClaimed,
        claimTaskReward: state.claimTaskReward,
        claimBonusReward: state.claimBonusReward,
        lastDailyReset: state.lastDailyReset,
        lastWeeklyReset: state.lastWeeklyReset,
        lastMonthlyReset: state.lastMonthlyReset,
    }));

    const [timeToDailyReset, setTimeToDailyReset] = useState("");
    const [timeToWeeklyReset, setTimeToWeeklyReset] = useState("");
    const [timeToMonthlyReset, setTimeToMonthlyReset] = useState("");

    const calculateTimeToNextReset = useCallback((lastResetTimestamp, periodType) => {
        const now = new Date(); // Текущее локальное время
        // Получаем текущее время в UTC как timestamp (число)
        const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
        
        // 'nextResetDateObj' будет объектом Date, представляющим время следующего сброса в UTC
        let nextResetDateObj = new Date(nowUTC); // Инициализируем текущим временем UTC (как объект Date)

        if (periodType === TASK_TYPES.DAILY) {
            nextResetDateObj.setUTCHours(2, 0, 0, 0); // Устанавливаем время сброса на 2:00 UTC текущего дня (UTC)
            if (nowUTC >= nextResetDateObj.getTime()) { // Если 2:00 UTC сегодня уже прошло
                nextResetDateObj.setUTCDate(nextResetDateObj.getUTCDate() + 1); // то следующий сброс завтра в 2:00 UTC
            }
        } else if (periodType === TASK_TYPES.WEEKLY) {
            const R_DAY_OF_WEEK_UTC = 1; // Понедельник (0 = Вс, 1 = Пн, ..., 6 = Сб для getUTCDay())
            const R_HOUR_UTC = 2; // 2:00 UTC

            let daysUntilTargetDay = (R_DAY_OF_WEEK_UTC - nextResetDateObj.getUTCDay() + 7) % 7;
            
            // Если сегодня и есть целевой день недели, проверяем, не прошло ли уже время сброса
            if (daysUntilTargetDay === 0 && 
                (nextResetDateObj.getUTCHours() > R_HOUR_UTC ||
                 (nextResetDateObj.getUTCHours() === R_HOUR_UTC && (nextResetDateObj.getUTCMinutes() > 0 || nextResetDateObj.getUTCSeconds() > 0 || nextResetDateObj.getUTCMilliseconds() > 0 /* Проверка на мс для точности */)))) {
                daysUntilTargetDay = 7; // Если время прошло, то до следующей недели
            }
            nextResetDateObj.setUTCDate(nextResetDateObj.getUTCDate() + daysUntilTargetDay);
            nextResetDateObj.setUTCHours(R_HOUR_UTC, 0, 0, 0);
        } else if (periodType === TASK_TYPES.MONTHLY) {
            const R_HOUR_UTC = 2; // 2:00 UTC
            
            const currentUTCFullYear = now.getUTCFullYear();
            const currentUTCMonth = now.getUTCMonth(); // 0-11

            // Время сброса для 1-го числа текущего месяца в R_HOUR_UTC
            let firstOfThisMonthReset = new Date(Date.UTC(currentUTCFullYear, currentUTCMonth, 1, R_HOUR_UTC, 0, 0, 0));

            if (nowUTC >= firstOfThisMonthReset.getTime()) {
                // Если время сброса для 1-го числа текущего месяца уже прошло,
                // то следующий сброс будет 1-го числа СЛЕДУЮЩЕГО месяца в R_HOUR_UTC.
                nextResetDateObj = new Date(Date.UTC(currentUTCFullYear, currentUTCMonth + 1, 1, R_HOUR_UTC, 0, 0, 0));
            } else {
                // Если время сброса для 1-го числа текущего месяца еще не наступило,
                // то это и есть время следующего сброса.
                nextResetDateObj = firstOfThisMonthReset;
            }
        }

        const diff = nextResetDateObj.getTime() - nowUTC; // Разница в миллисекундах
        if (diff <= 0) return "Reshreshing..";

        // Вычисляем компоненты времени
        const totalSecondsRemaining = Math.floor(diff / 1000);
        const seconds = totalSecondsRemaining % 60;
        const totalMinutesRemaining = Math.floor(totalSecondsRemaining / 60);
        const minutes = totalMinutesRemaining % 60;
        const totalHoursRemaining = Math.floor(totalMinutesRemaining / 60);
        const hours = totalHoursRemaining % 24;
        const days = Math.floor(totalHoursRemaining / 24);

        // Форматируем строку в зависимости от наличия дней
        if (days > 0) {
            // Формат: ДНИд ЧАСЫч МИНУТЫм СЕКУНДЫс
            return `${days}д ${String(hours).padStart(2, '0')}ч ${String(minutes).padStart(2, '0')}м ${String(seconds).padStart(2, '0')}с`;
        } else {
            // Формат: ЧАСЫч МИНУТЫм СЕКУНДЫс (для Daily и <1 дня для Weekly/Monthly)
            return `${String(hours).padStart(2, '0')}ч ${String(minutes).padStart(2, '0')}м ${String(seconds).padStart(2, '0')}с`;
        }
    }, []);
    
    // useEffect для обновления таймеров каждую секунду остается таким же
    useEffect(() => {
        const dailyTimerId = setInterval(() => setTimeToDailyReset(calculateTimeToNextReset(lastDailyReset, TASK_TYPES.DAILY)), 1000);
        const weeklyTimerId = setInterval(() => setTimeToWeeklyReset(calculateTimeToNextReset(lastWeeklyReset, TASK_TYPES.WEEKLY)), 1000); 
        const monthlyTimerId = setInterval(() => setTimeToMonthlyReset(calculateTimeToNextReset(lastMonthlyReset, TASK_TYPES.MONTHLY)), 1000);
        
        setTimeToDailyReset(calculateTimeToNextReset(lastDailyReset, TASK_TYPES.DAILY));
        setTimeToWeeklyReset(calculateTimeToNextReset(lastWeeklyReset, TASK_TYPES.WEEKLY));
        setTimeToMonthlyReset(calculateTimeToNextReset(lastMonthlyReset, TASK_TYPES.MONTHLY));
        
        return () => { clearInterval(dailyTimerId); clearInterval(weeklyTimerId); clearInterval(monthlyTimerId); };
    }, [calculateTimeToNextReset, lastDailyReset, lastWeeklyReset, lastMonthlyReset]);
    
    useEffect(() => {
        // Обновляем все таймеры каждую секунду
        const dailyTimerId = setInterval(() => setTimeToDailyReset(calculateTimeToNextReset(lastDailyReset, TASK_TYPES.DAILY)), 1000);
        const weeklyTimerId = setInterval(() => setTimeToWeeklyReset(calculateTimeToNextReset(lastWeeklyReset, TASK_TYPES.WEEKLY)), 1000); 
        const monthlyTimerId = setInterval(() => setTimeToMonthlyReset(calculateTimeToNextReset(lastMonthlyReset, TASK_TYPES.MONTHLY)), 1000);
        
        setTimeToDailyReset(calculateTimeToNextReset(lastDailyReset, TASK_TYPES.DAILY));
        setTimeToWeeklyReset(calculateTimeToNextReset(lastWeeklyReset, TASK_TYPES.WEEKLY));
        setTimeToMonthlyReset(calculateTimeToNextReset(lastMonthlyReset, TASK_TYPES.MONTHLY));
        
        return () => { clearInterval(dailyTimerId); clearInterval(weeklyTimerId); clearInterval(monthlyTimerId); };
    }, [calculateTimeToNextReset, lastDailyReset, lastWeeklyReset, lastMonthlyReset]);


    const handleClaimTask = (taskType, taskId) => {
        claimTaskReward(taskType, taskId);
    };

    const handleClaimBonus = (taskType) => {
        claimBonusReward(taskType);
    };

    const renderTasksForType = (taskType) => {
        const definitions = ALL_TASK_DEFINITIONS[taskType] || [];
        let progressMap, barXp, bonusClaimed, timeToResetStr;

        if (taskType === TASK_TYPES.DAILY) {
            progressMap = dailyTaskProgress; barXp = dailyTaskBarXp; bonusClaimed = dailyBonusClaimed; timeToResetStr = timeToDailyReset;
        } else if (taskType === TASK_TYPES.WEEKLY) {
            progressMap = weeklyTaskProgress; barXp = weeklyTaskBarXp; bonusClaimed = weeklyBonusClaimed; timeToResetStr = timeToWeeklyReset;
        } else { // Monthly
            progressMap = monthlyTaskProgress; barXp = monthlyTaskBarXp; bonusClaimed = monthlyBonusClaimed; timeToResetStr = timeToMonthlyReset;
        }
        
        const bonusConfig = BONUS_REWARDS_CONFIG[taskType];
        const xpPercentage = bonusConfig ? Math.min((barXp / bonusConfig.xpRequired) * 100, 100) : 0;
        const isBonusProgressBarFull = xpPercentage >= 100;
        const bonusIconUrl = bonusConfig?.reward?.icon;
        const bonusQuantity = bonusConfig?.reward?.quantity; 
        const bonusName = bonusConfig?.reward?.name; 
        
        const handleIconClick = () => {
            if (isBonusProgressBarFull && !bonusClaimed) {
                handleClaimBonus(taskType);
            }
        };
        
        return (
            <div className="tasks-category-content">
                <div className="tasks-header-info">
                    <p>Refresh in: <span className="timer-value">{timeToResetStr}</span></p>
                </div>
        
                <div 
                    className={`bonus-progress-bar-area 
                        ${bonusClaimed ? 'bonus-is-claimed' : (isBonusProgressBarFull ? 'bonus-ready-to-claim' : '')}
                    `}
                >
                    <div className="bonus-progress-bar-container">
                        <div className="bonus-progress-bar" style={{ width: `${xpPercentage}%` }}></div>
                        <span className="bonus-progress-text">{barXp} / {bonusConfig?.xpRequired || '?'} XP</span>
                    </div>
        
                    {bonusIconUrl && (
                        <div 
                            className={`bonus-reward-icon-wrapper 
                                ${bonusClaimed ? 'claimed' : (isBonusProgressBarFull ? 'glowing' : 'dimmed')}
                                ${isBonusProgressBarFull && !bonusClaimed ? 'clickable' : ''}
                            `}
                            onClick={handleIconClick}
                            title={bonusClaimed ? `${bonusName} (Получено)` : (isBonusProgressBarFull ? `Забрать бонус: ${bonusName}${bonusQuantity && bonusQuantity > 1 ? ' x' + bonusQuantity : ''}` : bonusName)}
                        >
                            <img src={bonusIconUrl} alt={bonusName || "Бонусная награда"} />
                            {bonusClaimed && (
                                <div className="bonus-reward-checkmark">
                                    <svg viewBox="0 0 24 24"> 
                                        <path fill="currentColor" d="M9,16.17L4.83,12l-1.42,1.41L9,19L21,7l-1.41-1.41L9,16.17z"/>
                                    </svg>
                                </div>
                            )}
                            {!bonusClaimed && bonusQuantity && bonusQuantity > 1 && (
                                <span className="bonus-reward-quantity">x{bonusQuantity}</span>
                            )}
                        </div>
                    )}
                </div>
    
                <div className="task-list">
                    {definitions.map(taskDef => (
                        <TaskItem 
                            key={taskDef.id}
                            taskDefinition={taskDef}
                            taskProgress={progressMap[taskDef.id]}
                            taskType={taskType}
                            onClaim={handleClaimTask}
                        />
                    ))}
                </div>
            </div>
        );
    };

    // Корневой элемент TasksPopup имеет класс tasks-popup-content-wrapper
    // Отступы для него управляются из MainMenu.jsx через tasks-inner-scroll-container
    return (
        <div className="tasks-popup-content-wrapper"> 
            <div className="tasks-tabs">
                <button 
                    className={`tab-button ${activeTab === TASK_TYPES.DAILY ? 'active' : ''}`} 
                    onClick={() => setActiveTab(TASK_TYPES.DAILY)}
                >
                    Daily
                </button>
                <button 
                    className={`tab-button ${activeTab === TASK_TYPES.WEEKLY ? 'active' : ''}`} 
                    onClick={() => setActiveTab(TASK_TYPES.WEEKLY)}
                >
                    Weekly
                </button>
                <button 
                    className={`tab-button ${activeTab === TASK_TYPES.MONTHLY ? 'active' : ''}`} 
                    onClick={() => setActiveTab(TASK_TYPES.MONTHLY)}
                >
                    Monthly
                </button>
            </div>
            <div className="tasks-active-tab-content">
                {renderTasksForType(activeTab)}
            </div>
        </div>
    );
};

export default TasksPopup;