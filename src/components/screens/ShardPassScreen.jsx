// src/components/screens/ShardPassScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ShardPassScreen.scss';
import { MOCK_SHARD_PASS_DATA_FULL } from '../../data/ShardPassRewardsData';
import { initialTasksData as allWeeksTasksData, SHARD_PASS_TASKS_WEEKS } from '../../data/ShardPassTasksData';
import {
    SEASON_START_DATE_UTC,
    getUnlockDateTimeForWeek,
    formatTimeRemaining,
    MS_PER_SECOND
} from '../../data/TimeConstants';

const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 19L8 12L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const ShardPassScreen = ({ onClose }) => {
    const [shardPassData, setShardPassData] = useState(MOCK_SHARD_PASS_DATA_FULL);
    const [isTasksViewVisible, setIsTasksViewVisible] = useState(false);
    const [activeTaskWeek, setActiveTaskWeek] = useState(1);
    const [tasksByWeek, setTasksByWeek] = useState(allWeeksTasksData);
    const [animatingClaimTasks, setAnimatingClaimTasks] = useState({});

    const [timeRemainingForWeek, setTimeRemainingForWeek] = useState('');
    const [isCurrentWeekLocked, setIsCurrentWeekLocked] = useState(true);

    const weeks = Array.from({ length: SHARD_PASS_TASKS_WEEKS }, (_, i) => i + 1);

    const seasonNumber = shardPassData.seasonNumber || 1;
    const daysRemaining = shardPassData.daysRemaining === undefined ? 45 : shardPassData.daysRemaining;

    const currentLevelXp = shardPassData.currentLevelXp;
    const xpPerLevel = shardPassData.xpPerLevel;

    const screenVariants = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: 0.2 } }
    };

    const sectionAppearVariant = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeInOut" } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeInOut" } }
    };

    const tabsContainerVariant = {
        initial: { opacity: 0, x: -30 },
        animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut", delay: 0.2 } }
    };

    // Новый вариант анимации из код1 для сообщения о блокировке
    const lockedTaskMessageVariant = {
        initial: { opacity: 0 }, // Начинаем только с прозрачности
        animate: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }, // Только появление
        exit: { opacity: 0, transition: { duration: 0.1, ease: "easeIn" } } // Только исчезание
    };
    // Обновленный вариант из код1 для контейнера списка задач (добавлен exit, изменено initial)
    const taskListContainerVariantStagger = {
        initial: { opacity: 1 }, // Изменено с opacity: 0 на opacity: 1 как в код1
        animate: {
            opacity: 1,
            transition: {
                delayChildren: 0.05,
                staggerChildren: 0.08
            }
        },
        exit: { opacity: 0, transition: { duration: 0.05 } } // Добавлено из код1
    };

    const taskItemVariant = {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
        exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
    };

    const stickyLabelsLayerRef = useRef(null);
    const freeTrackRef = useRef(null);
    const premiumTrackRef = useRef(null);
    const rewardsGridContainerRef = useRef(null);

    const [stickyLabelStyles, setStickyLabelStyles] = useState({
        free: { top: '50%', transform: 'translateY(-50%) rotate(180deg)' },
        paid: { top: '50%', transform: 'translateY(-50%) rotate(180deg)' }
    });

    useEffect(() => {
        const calculatePositions = () => {
            if (stickyLabelsLayerRef.current && freeTrackRef.current && premiumTrackRef.current && rewardsGridContainerRef.current) {
                const scrollContainer = stickyLabelsLayerRef.current.offsetParent;
                if (!scrollContainer) return;

                const freeTrackTopInWrapper = freeTrackRef.current.offsetTop + (freeTrackRef.current.offsetHeight / 2);
                const premiumTrackTopInWrapper = premiumTrackRef.current.offsetTop + (premiumTrackRef.current.offsetHeight / 2);

                setStickyLabelStyles({
                    free: {
                        top: `${freeTrackTopInWrapper}px`,
                        transform: 'translateY(-50%) rotate(180deg)'
                    },
                    paid: {
                        top: `${premiumTrackTopInWrapper}px`,
                        transform: 'translateY(-50%) rotate(180deg)'
                    }
                });
            }
        };

        if (!isTasksViewVisible) {
            calculatePositions();
            const timerId = setTimeout(calculatePositions, 450); // Recalculate after animations might complete
            window.addEventListener('resize', calculatePositions);
            return () => {
                clearTimeout(timerId);
                window.removeEventListener('resize', calculatePositions);
            };
        }
    }, [shardPassData, isTasksViewVisible]);

    useEffect(() => {
        if (!isTasksViewVisible) {
            return; // Не запускаем таймер, если секция задач не видна
        }
        const calculateWeekLockStatus = () => {
            const nowUtc = new Date();
            const unlockTimeForActiveWeek = getUnlockDateTimeForWeek(activeTaskWeek, SEASON_START_DATE_UTC);

            if (nowUtc.getTime() >= unlockTimeForActiveWeek.getTime()) {
                setIsCurrentWeekLocked(false);
                setTimeRemainingForWeek('');
            } else {
                setIsCurrentWeekLocked(true);
                const remainingMs = unlockTimeForActiveWeek.getTime() - nowUtc.getTime();
                setTimeRemainingForWeek(formatTimeRemaining(remainingMs));
            }
        };

        calculateWeekLockStatus(); // Initial check
        const intervalId = setInterval(calculateWeekLockStatus, MS_PER_SECOND || 1000);
        return () => clearInterval(intervalId); // Cleanup interval on component unmount or when deps change
    }, [activeTaskWeek, isTasksViewVisible, SEASON_START_DATE_UTC]);


    const overallCurrentProgress =
        (xpPerLevel > 0 && currentLevelXp <= xpPerLevel) ? (currentLevelXp / xpPerLevel) * 100 :
        (currentLevelXp > xpPerLevel && shardPassData.currentLevel < shardPassData.maxLevel) ? 100 :
        (shardPassData.currentLevel === shardPassData.maxLevel && currentLevelXp >= xpPerLevel) ? 100 :
        0;

    const nextLevel = shardPassData.currentLevel < shardPassData.maxLevel
        ? shardPassData.currentLevel + 1
        : shardPassData.maxLevel;

    const handleBuyPremium = () => {
        console.log("Buy Premium button clicked!");
        setShardPassData(prevData => ({
            ...prevData,
            isPremium: true,
        }));
    };

    const handleToggleTasksView = () => {
        setIsTasksViewVisible(prev => !prev);
    };

    const handleClaimTaskReward = (weekKey, taskId) => {
        const taskToClaim = tasksByWeek[weekKey]?.find(t => t.id === taskId);

        if (!taskToClaim || !(taskToClaim.currentProgress >= taskToClaim.targetProgress) || taskToClaim.isClaimed) {
            return;
        }

        setShardPassData(prevData => {
            let newCurrentLevelXp = prevData.currentLevelXp + taskToClaim.rewardXP;
            let newCurrentLevel = prevData.currentLevel;
            const xpNeededForLevelUp = prevData.xpPerLevel;

            while (newCurrentLevel < prevData.maxLevel && newCurrentLevelXp >= xpNeededForLevelUp) {
                newCurrentLevel += 1;
                newCurrentLevelXp -= xpNeededForLevelUp;
            }
            // Cap XP at max level if it exceeds
            if (newCurrentLevel === prevData.maxLevel && newCurrentLevelXp > xpNeededForLevelUp) {
                newCurrentLevelXp = xpNeededForLevelUp;
            }
            return {
                ...prevData,
                currentLevel: newCurrentLevel,
                currentLevelXp: newCurrentLevelXp,
            };
        });

        setTasksByWeek(prevTasksByWeek => {
            const updatedWeekTasks = prevTasksByWeek[weekKey].map(task => {
                if (task.id === taskId) {
                    return { ...task, isClaimed: true };
                }
                return task;
            });
            return { ...prevTasksByWeek, [weekKey]: updatedWeekTasks };
        });

        // Animation for claiming (visual feedback)
        setAnimatingClaimTasks(prev => ({ ...prev, [taskId]: true }));
        const animationDuration = 1000; // Match with CSS animation or desired effect time
        setTimeout(() => {
            setAnimatingClaimTasks(prev => {
                const newState = { ...prev };
                delete newState[taskId];
                return newState;
            });
        }, animationDuration);
    };

    return (
        <motion.div
            className="shard-pass-screen-wrapper"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <div className="shard-pass-header">
                <div className="header-level-badge">
                    <div className="header-level-badge-inner-content">
                        <span className="header-level-number">{shardPassData.currentLevel}</span>
                    </div>
                </div>
                <div className="header-main-title">
                    <h2>ShardPass</h2>
                </div>
                <button onClick={onClose} className="shard-pass-back-btn" aria-label="Назад">
                    <BackArrowIcon />
                </button>
                <div className="header-hanging-info-container">
                    <div className="season-banner-display">
                        <span className="season-banner-text">Season {seasonNumber}</span>
                    </div>
                    <div className="inter-banner-decorative-line"></div>
                    {daysRemaining !== null && daysRemaining !== undefined && (
                        <div className="season-ends-info-display">
                            <span className="season-ends-text">
                                {daysRemaining > 0 ? `Season will end in ${daysRemaining} days` : "Season has ended"}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="overall-progress-bar-section">
                <div className="level-indicator-diamond current-level-diamond">
                    <div className="level-indicator-diamond-inner-content">
                        <span className="level-indicator-diamond-number">{shardPassData.currentLevel}</span>
                    </div>
                </div>
                <div className="progress-bar-container">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${overallCurrentProgress}%` }}
                        aria-valuenow={overallCurrentProgress}
                        aria-valuemin="0"
                        aria-valuemax="100"
                        role="progressbar"
                        aria-label={`Прогресс к следующему уровню: ${overallCurrentProgress}%`}
                    ></div>
                    <span className="progress-bar-text">
                        {shardPassData.currentLevelXp}/{shardPassData.xpPerLevel}
                    </span>
                </div>
                <div className="level-indicator-diamond next-level-diamond">
                    <div className="level-indicator-diamond-inner-content">
                        <span className="level-indicator-diamond-number">{nextLevel}</span>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {!isTasksViewVisible ? (
                    <motion.div
                        key="rewardsSection"
                        className="shard-pass-rewards-section"
                        variants={sectionAppearVariant}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <div className="shard-pass-rewards-horizontal-scroll">
                            <div className="sticky-labels-and-grid-wrapper">
                                <div className="sticky-labels-layer" ref={stickyLabelsLayerRef}>
                                    <div className="side-label sticky free-side-label" style={stickyLabelStyles.free}>FREE</div>
                                    <div className="side-label sticky premium-side-label" style={stickyLabelStyles.paid}>PAID</div>
                                </div>
                                <div className="rewards-grid-container" ref={rewardsGridContainerRef}>
                                    {/* Free Rewards Track */}
                                    <div className="rewards-track free-rewards-track" ref={freeTrackRef}>
                                        {shardPassData.levels.map(levelData => (
                                            <div key={`free-${levelData.level}`} className="reward-cell">
                                                <div
                                                    className={`
                                                        reward-card
                                                        free-reward
                                                        ${levelData.freeReward.claimed ? 'claimed' : ''}
                                                        ${levelData.level > shardPassData.currentLevel ? 'future' : ''}
                                                        ${(levelData.level <= shardPassData.currentLevel && !levelData.freeReward.claimed) ? 'available' : ''}
                                                    `}
                                                >
                                                    {levelData.freeReward.icon && <img src={levelData.freeReward.icon} alt={levelData.freeReward.name} className="reward-icon"/>}
                                                    <span className="reward-name">{levelData.freeReward.name}</span>
                                                    {levelData.freeReward.claimed && <div className="claimed-overlay">ПОЛУЧЕНО</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Levels and Progress Track */}
                                    <div className="levels-and-progress-track">
                                        {shardPassData.levels.map((levelData, index) => {
                                            const isCurrentLevelNode = levelData.level === shardPassData.currentLevel;
                                            const isNextLevelNode = levelData.level === (shardPassData.currentLevel + 1);

                                            let fillPercentForBeforeLine = 0;
                                            let beforeLineIsFilledClass = '';
                                            if (levelData.level <= shardPassData.currentLevel) {
                                                beforeLineIsFilledClass = 'filled';
                                                fillPercentForBeforeLine = 100;
                                            } else if (isNextLevelNode && shardPassData.currentLevel !== shardPassData.maxLevel) {
                                                if (overallCurrentProgress > 50) { // Fill second half of line to next node
                                                    fillPercentForBeforeLine = Math.min(100, (overallCurrentProgress - 50) * 2);
                                                }
                                            }

                                            let fillPercentForAfterLine = 0;
                                            let afterLineIsFilledClass = '';
                                            if (levelData.level < shardPassData.currentLevel) {
                                                afterLineIsFilledClass = 'filled';
                                                fillPercentForAfterLine = 100;
                                            } else if (isCurrentLevelNode && shardPassData.currentLevel !== shardPassData.maxLevel) {
                                                if (overallCurrentProgress >= 50) { // If past half, current node to half line is filled
                                                    afterLineIsFilledClass = 'filled'; // This implies the line is full if progress > 50%
                                                    fillPercentForAfterLine = 100;
                                                } else if (overallCurrentProgress > 0) { // Fill first half of line from current node
                                                    fillPercentForAfterLine = Math.min(100, overallCurrentProgress * 2);
                                                }
                                            }
                                            return (
                                                <div key={`level-node-${levelData.level}`} className="level-progress-node">
                                                    <div className={`progress-line before ${beforeLineIsFilledClass}`}>
                                                        {(fillPercentForBeforeLine > 0 && !beforeLineIsFilledClass.includes('filled')) && (
                                                            <div className="progress-line-fill" style={{ width: `${fillPercentForBeforeLine}%` }}></div>
                                                        )}
                                                    </div>
                                                    <div className={`level-indicator-badge ${levelData.level <= shardPassData.currentLevel ? 'achieved' : ''}`}>
                                                        Ур. {levelData.level}
                                                    </div>
                                                    <div className={`progress-line after ${afterLineIsFilledClass}`}>
                                                        {(fillPercentForAfterLine > 0 && !afterLineIsFilledClass.includes('filled')) && (
                                                            <div className="progress-line-fill" style={{ width: `${fillPercentForAfterLine}%` }}></div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Premium Rewards Track */}
                                    <div className="rewards-track premium-rewards-track" ref={premiumTrackRef}>
                                        {shardPassData.levels.map(levelData => (
                                            <div key={`premium-${levelData.level}`} className="reward-cell">
                                                <div
                                                    className={`
                                                        reward-card
                                                        premium-reward
                                                        ${levelData.premiumReward.claimed && shardPassData.isPremium ? 'claimed' : ''}
                                                        ${levelData.level > shardPassData.currentLevel && shardPassData.isPremium ? 'future' : ''}
                                                        ${(!shardPassData.isPremium && levelData.level <= shardPassData.currentLevel && !levelData.premiumReward.claimed) ? 'premium-locked-highlight' : ''}
                                                        ${(shardPassData.isPremium && levelData.level <= shardPassData.currentLevel && !levelData.premiumReward.claimed) ? 'available' : ''}
                                                    `}
                                                >
                                                    {levelData.premiumReward.icon && <img src={levelData.premiumReward.icon} alt={levelData.premiumReward.name} className="reward-icon"/>}
                                                    <span className="reward-name">{levelData.premiumReward.name}</span>
                                                    {!shardPassData.isPremium && (
                                                        <div className="premium-lock-overlay">
                                                            <span className="lock-icon-display">🔒</span>
                                                        </div>
                                                    )}
                                                    {levelData.premiumReward.claimed && shardPassData.isPremium && (
                                                        <div className="claimed-overlay">ПОЛУЧЕНО</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="tasksOverlay"
                        className="shard-pass-tasks-overlay" // This class should handle flex column, flex-grow etc. for the whole tasks area
                        variants={sectionAppearVariant}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <motion.div
                            className="tasks-tabs-container"
                            variants={tabsContainerVariant}
                            initial="initial" // Already part of variant, but explicit is fine
                            animate="animate" // Already part of variant
                        >
                            {weeks.map(weekNum => (
                                <button
                                    key={`week-${weekNum}`}
                                    className={`task-tab-button ${activeTaskWeek === weekNum ? 'active' : ''}`}
                                    onClick={() => setActiveTaskWeek(weekNum)}
                                >
                                    Week {weekNum}
                                </button>
                            ))}
                        </motion.div>

                        {/* Изменения из код1: AnimatePresence для смены контента (заблокировано/список) */}
                        <AnimatePresence mode="out-in">
                            {isCurrentWeekLocked ? (
                                <motion.div
                                    key={`locked-week-${activeTaskWeek}`}
                                    className="tasks-locked-container-wrapper" // Новый класс-обертка, должен обеспечивать нужные стили (flex-grow, etc.)
                                    variants={lockedTaskMessageVariant}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    // style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }} // Можно добавить стили сюда или в CSS
                                >
                                    <div className="tasks-locked-container"> {/* Содержимое как в код2 */}
                                        <div className="locked-message-content">
                                            Задания для Week {activeTaskWeek} откроются через:
                                            <div className="locked-countdown-timer">{timeRemainingForWeek}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={`unlocked-week-${activeTaskWeek}`}
                                    className="tasks-list-scroll-container" // Этот класс должен обеспечивать нужные стили (flex-grow, overflow-y, etc.)
                                    variants={taskListContainerVariantStagger}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit" // exit для всего списка задач разом
                                    // style={{ flexGrow: 1, overflowY: 'auto' }} // Можно добавить стили сюда или в CSS
                                >
                                    {(tasksByWeek[activeTaskWeek] && tasksByWeek[activeTaskWeek].length > 0) ? (
                                        tasksByWeek[activeTaskWeek].map(task => {
                                            const isCompleted = task.currentProgress >= task.targetProgress;
                                            const progressPercent = Math.min((task.currentProgress / task.targetProgress) * 100, 100);
                                            return (
                                                <motion.div
                                                    key={task.id}
                                                    className={`
                                                        task-item
                                                        ${task.isClaimed ? 'claimed' : (isCompleted ? 'completed' : 'not-completed')}
                                                        ${animatingClaimTasks[task.id] ? 'is-claiming-animation' : ''}
                                                    `}
                                                    variants={taskItemVariant} // Анимация для каждого элемента списка
                                                >
                                                    <div className="task-info">
                                                        <span className="task-name">{task.name}</span>
                                                        <div className="task-progress-bar-container">
                                                            <div
                                                                className="task-progress-bar-fill"
                                                                style={{ width: `${progressPercent}%` }}
                                                            ></div>
                                                            <span className="task-progress-text">{task.currentProgress}/{task.targetProgress}</span>
                                                        </div>
                                                    </div>
                                                    <div className="task-actions">
                                                        <button
                                                            className={`task-claim-button ${isCompleted && !task.isClaimed ? 'ready-to-claim' : ''}`}
                                                            onClick={() => handleClaimTaskReward(activeTaskWeek, task.id)}
                                                            disabled={!isCompleted || task.isClaimed || animatingClaimTasks[task.id]}
                                                        >
                                                            {task.isClaimed ? 'Получено' : 'Забрать'}
                                                            <span className="task-claim-reward-xp">+{task.rewardXP} XP</span>
                                                        </button>
                                                    </div>
                                                    {task.isClaimed && (
                                                        <div className="task-claimed-overlay">
                                                            <span className="checkmark-icon">✔</span>
                                                            <span className="claimed-text">Completed</span>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            );
                                        })
                                    ) : (
                                        <motion.div className="no-tasks-message" variants={taskItemVariant}>
                                            Заданий на эту неделю нет.
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="shard-pass-tasks-section">
                <button className="tasks-button" onClick={handleToggleTasksView}>
                    {isTasksViewVisible ? 'К наградам' : 'К заданиям'}
                </button>
            </div>

            <div className="shard-pass-footer">
                <button className="shard-pass-action-button claim-all-btn">
                    Claim all ({/* TODO: счетчик доступных для сбора наград */ 0})
                </button>
                {!shardPassData.isPremium && (
                    <button
                        className="shard-pass-action-button buy-shardpass-btn"
                        onClick={handleBuyPremium}
                    >
                        Buy Premium
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export default ShardPassScreen;