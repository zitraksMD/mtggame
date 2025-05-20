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

    const [isBuyPremiumPopupVisible, setIsBuyPremiumPopupVisible] = useState(false);

    const weeks = Array.from({ length: SHARD_PASS_TASKS_WEEKS }, (_, i) => i + 1);

    const seasonNumber = shardPassData.seasonNumber || 1;
    const daysRemaining = shardPassData.daysRemaining === undefined ? 45 : shardPassData.daysRemaining;

    const currentLevelXp = shardPassData.currentLevelXp;
    const xpPerLevel = shardPassData.xpPerLevel;

    // --- ВАРИАНТЫ АНИМАЦИИ ---
    const screenVariants = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: 0.2 } }
    };

    const sectionAppearVariant = { // Для rewards <-> tasks
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeInOut" } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.2, ease: "easeInOut" } }
    };

    const tabsContainerVariant = { // Для табов
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut", delay: 0.15 } }
    };

    // Для ПОЯВЛЕНИЯ/ИСЧЕЗАНИЯ ВСЕГО СПИСКА ЗАДАЧ разом (без ступенек)
    // или для области, где будет сообщение "нет задач" (из код1)
    const taskListAreaVariant = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.3, delay: 0.3 } }, // Задержка после табов (0.15 + 0.15 = 0.3)
        exit: { opacity: 0, transition: { duration: 0.2 } }
    };

    // Для ОВЕРЛЕЯ БЛОКИРОВКИ (простой fade) (из код1)
    const lockOverlayAppearVariant = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.3, delay: 0.1 } }, // Появляется почти сразу
        exit: { opacity: 0, transition: { duration: 0.2 } }
    };
    // --- КОНЕЦ ВАРИАНТОВ АНИМАЦИИ ---

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
            const timerId = setTimeout(calculatePositions, 450); // Задержка для учета анимации появления секции
            window.addEventListener('resize', calculatePositions);
            return () => {
                clearTimeout(timerId);
                window.removeEventListener('resize', calculatePositions);
            };
        }
    }, [shardPassData, isTasksViewVisible]);

    useEffect(() => {
        if (!isTasksViewVisible) {
            return;
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

        calculateWeekLockStatus();
        const intervalId = setInterval(calculateWeekLockStatus, MS_PER_SECOND || 1000);
        return () => clearInterval(intervalId);
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

    const openBuyPremiumPopup = () => setIsBuyPremiumPopupVisible(true);
    const closeBuyPremiumPopup = () => setIsBuyPremiumPopupVisible(false);

    const handleConfirmBuyPremiumFromPopup = () => {
        handleBuyPremium();
        closeBuyPremiumPopup();
    };

    const handleClaimTaskReward = (weekKey, taskId) => {
        const taskToClaim = tasksByWeek[weekKey]?.find(t => t.id === taskId);
        
        const isPremiumTaskAndLocked = taskToClaim && taskToClaim.isPremium && !shardPassData.isPremium;
        if (isPremiumTaskAndLocked) {
            openBuyPremiumPopup();
            return;
        }

        const taskIsCompletable = taskToClaim && (taskToClaim.currentProgress >= taskToClaim.targetProgress);

        if (!taskToClaim || !taskIsCompletable || taskToClaim.isClaimed) {
            return;
        }

        setShardPassData(prevData => {
            let newCurrentLevelXp = prevData.currentLevelXp + taskToClaim.rewardXP;
            let newCurrentLevel = prevData.currentLevel;
            const xpNeededForLevelUp = prevData.xpPerLevel || 1000; 
            while (newCurrentLevel < prevData.maxLevel && newCurrentLevelXp >= xpNeededForLevelUp) {
                newCurrentLevel += 1;
                newCurrentLevelXp -= xpNeededForLevelUp;
            }
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
            let weekTasks = prevTasksByWeek[weekKey].map(task => {
                if (task.id === taskId) {
                    return { ...task, isClaimed: true }; 
                }
                return task;
            });

            weekTasks.sort((a, b) => {
                const aIsCompleted = a.currentProgress >= a.targetProgress;
                const bIsCompleted = b.currentProgress >= b.targetProgress;

                if (a.isClaimed && !b.isClaimed) return 1;  
                if (!a.isClaimed && b.isClaimed) return -1; 

                if (a.isClaimed === b.isClaimed) {
                    if (!aIsCompleted && bIsCompleted) return -1; 
                    if (aIsCompleted && !bIsCompleted) return 1;  
                }
                return 0;
            });

            return { ...prevTasksByWeek, [weekKey]: weekTasks };
        });

        setAnimatingClaimTasks(prev => ({ ...prev, [taskId]: true }));
        const animationDuration = 1000; 
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
                                                if (overallCurrentProgress > 50) {
                                                    fillPercentForBeforeLine = Math.min(100, (overallCurrentProgress - 50) * 2);
                                                }
                                            }

                                            let fillPercentForAfterLine = 0;
                                            let afterLineIsFilledClass = '';
                                            if (levelData.level < shardPassData.currentLevel) {
                                                afterLineIsFilledClass = 'filled';
                                                fillPercentForAfterLine = 100;
                                            } else if (isCurrentLevelNode && shardPassData.currentLevel !== shardPassData.maxLevel) {
                                                if (overallCurrentProgress >= 50) {
                                                    afterLineIsFilledClass = 'filled';
                                                    fillPercentForAfterLine = 100;
                                                } else if (overallCurrentProgress > 0) {
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
                        className="shard-pass-tasks-overlay"
                        variants={sectionAppearVariant}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <motion.div
                            className="tasks-tabs-container"
                            variants={tabsContainerVariant}
                            initial="initial"
                            animate="animate"
                        >
                            {weeks.map(weekNum => (
                                <button
                                    key={`week-${weekNum}`}
                                    className={`task-tab-button ${activeTaskWeek === weekNum ? 'active' : ''}`}
                                    onClick={() => setActiveTaskWeek(weekNum)}
                                >
                                    Неделя {weekNum}
                                </button>
                            ))}
                        </motion.div>

                        {/* ИЗМЕНЕННАЯ СТРУКТУРА ДЛЯ СООТВЕТСТВИЯ АНИМАЦИЯМ И ЛОГИКЕ КОД1 */}
                        <div className="tasks-content-viewport"> {/* Обертка для позиционирования оверлея, как в код1 */}
                            <AnimatePresence mode="out-in"> {/* Для смены содержимого списка при смене недели */}
                                <motion.div
                                    key={activeTaskWeek} // Ключ по неделе, как в код1
                                    className="tasks-list-scroll-container" // Контейнер для списка задач или сообщения "нет задач"
                                    variants={taskListAreaVariant} // Анимация из код1
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                >
                                    {/* Рендерим список задач или "нет задач", ТОЛЬКО ЕСЛИ НЕДЕЛЯ НЕ ЗАБЛОКИРОВАНА */}
                                    {!isCurrentWeekLocked && (
                                        (tasksByWeek[activeTaskWeek] && tasksByWeek[activeTaskWeek].length > 0) ? (
                                            tasksByWeek[activeTaskWeek].map(task => {
                                                const isCompleted = task.currentProgress >= task.targetProgress;
                                                const progressPercent = Math.min((task.currentProgress / task.targetProgress) * 100, 100);
                                                const isPremiumTaskAndLocked = task.isPremium && !shardPassData.isPremium;

                                                return (
                                                    <motion.div
                                                        layout
                                                        key={task.id}
                                                        className={`
                                                            task-item
                                                            ${task.isClaimed ? 'claimed' : (isCompleted ? 'completed' : 'not-completed')}
                                                            ${animatingClaimTasks[task.id] ? 'is-claiming-animation' : ''}
                                                            ${isCurrentWeekLocked ? 'task-view-when-locked' : ''} // Этот класс может быть не нужен здесь, если оверлей блокировки покрывает все
                                                            ${isPremiumTaskAndLocked ? 'premium-task-locked-styling' : ''}
                                                        `}
                                                        onClick={isPremiumTaskAndLocked ? openBuyPremiumPopup : undefined}
                                                        initial={{ opacity: 0 }} 
                                                        animate={{ opacity: 1 }} 
                                                        exit={{ opacity: 0 }} 
                                                        transition={{ duration: 0.3 }}
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
                                                                className={`task-claim-button ${isCompleted && !task.isClaimed && !isPremiumTaskAndLocked ? 'ready-to-claim' : ''}`}
                                                                onClick={(e) => {
                                                                    if (isPremiumTaskAndLocked) {
                                                                        e.stopPropagation();
                                                                        openBuyPremiumPopup();
                                                                    } else {
                                                                        handleClaimTaskReward(activeTaskWeek, task.id);
                                                                    }
                                                                }}
                                                                disabled={!isCompleted || task.isClaimed || isPremiumTaskAndLocked || animatingClaimTasks[task.id]}
                                                            >
                                                                {task.isClaimed ? 'Получено' : 'Забрать'}
                                                                <span className="task-claim-reward-xp">+{task.rewardXP} XP</span>
                                                            </button>
                                                            {!task.isClaimed && !isPremiumTaskAndLocked && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (task.currentProgress < task.targetProgress) {
                                                                            setTasksByWeek(prevTasksByWeek => {
                                                                                const updatedWeekTasks = prevTasksByWeek[activeTaskWeek].map(t => {
                                                                                    if (t.id === task.id) {
                                                                                        return { ...t, currentProgress: t.targetProgress };
                                                                                    }
                                                                                    return t;
                                                                                });
                                                                                return { ...prevTasksByWeek, [activeTaskWeek]: updatedWeekTasks };
                                                                            });
                                                                            setTimeout(() => {
                                                                                handleClaimTaskReward(activeTaskWeek, task.id);
                                                                            }, 50); 
                                                                        } else {
                                                                            handleClaimTaskReward(activeTaskWeek, task.id);
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        backgroundColor: '#FF9800', color: 'white', border: 'none',
                                                                        padding: '4px 8px', fontSize: '0.7em', borderRadius: '4px',
                                                                        marginTop: '5px', cursor: 'pointer', display: 'block'
                                                                    }}
                                                                    title="Debug: Завершить и Забрать"
                                                                >
                                                                    Dbg Claim
                                                                </button>
                                                            )}
                                                        </div>
                                                        {isPremiumTaskAndLocked && (
                                                            <div className="task-premium-lock-overlay">
                                                                <span className="lock-icon-display">🔒</span>
                                                            </div>
                                                        )}
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
                                            // Сообщение "нет задач", если неделя не заблокирована, но задач нет
                                            <div className={`no-tasks-message`}> 
                                                Заданий на эту неделю нет.
                                            </div>
                                        )
                                    )}
                                    {/* Если неделя заблокирована, этот блок будет пуст или скроется из-за exit анимации,
                                        а оверлей блокировки появится поверх */}
                                </motion.div>
                            </AnimatePresence>

                            {/* Оверлей блокировки (как в код1) */}
                            <AnimatePresence>
                                {isCurrentWeekLocked && (
                                    <motion.div
                                        key={`lock-overlay-${activeTaskWeek}`} // Уникальный ключ для анимации при смене недели
                                        className="tasks-week-lock-overlay" // Класс из код1, убедитесь, что стили для него есть (position: absolute, etc.)
                                        variants={lockOverlayAppearVariant} // Анимация из код1
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                    >
                                        {/* Содержимое из tasks-locked-container-wrapper код2 */}
                                        <div className="tasks-locked-container">
                                            <div className="locked-message-content">
                                                Задания для Недели {activeTaskWeek} откроются через:
                                                <div className="locked-countdown-timer">{timeRemainingForWeek}</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                         {/* КОНЕЦ ИЗМЕНЕННОЙ СТРУКТУРЫ */}
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
                    Claim all ({0}) {/* TODO */}
                </button>
                {!shardPassData.isPremium && (
                    <button
                        className="shard-pass-action-button buy-shardpass-btn"
                        onClick={openBuyPremiumPopup} // Изменено на открытие попапа, как было в код1 для аналогичных случаев
                    >
                        Buy Premium
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isBuyPremiumPopupVisible && (
                    <motion.div
                        className="buy-premium-popup-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeBuyPremiumPopup}
                    >
                        <motion.div
                            className="buy-premium-popup-content"
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3>Премиум Задание!</h3>
                            <p>Купите ShardPass Premium, чтобы разблокировать это задание и его награды.</p>
                            <div className="popup-buttons">
                                <button onClick={handleConfirmBuyPremiumFromPopup} className="popup-buy-btn">Купить Premium</button>
                                <button onClick={closeBuyPremiumPopup} className="popup-close-btn">Закрыть</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ShardPassScreen;