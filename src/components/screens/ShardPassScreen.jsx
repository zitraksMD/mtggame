// src/components/screens/ShardPassScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import './ShardPassScreen.scss';
import { MOCK_SHARD_PASS_DATA_FULL } from '../../data/ShardPassRewardsData';

// import useGameStore from '../../store/useGameStore';

const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 19L8 12L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const ShardPassScreen = ({ onClose }) => {
    const [shardPassData, setShardPassData] = useState(MOCK_SHARD_PASS_DATA_FULL);
    const [isTasksViewVisible, setIsTasksViewVisible] = useState(false);
    const [activeTaskWeek, setActiveTaskWeek] = useState(1);

    // === НОВОЕ: Моковые данные и состояние для заданий (из код1) ===
    const initialTasksData = {
        1: [
            { id: 'w1t1', name: 'Собрать 10 кристаллов энергии', currentProgress: 5, targetProgress: 10, rewardXP: 100, isClaimed: false },
            { id: 'w1t2', name: 'Выиграть 3 арены', currentProgress: 3, targetProgress: 3, rewardXP: 150, isClaimed: false },
            { id: 'w1t3', name: 'Завершить ежедневный квест', currentProgress: 1, targetProgress: 1, rewardXP: 50, isClaimed: true }, // Пример уже полученного
        ],
        2: [
            { id: 'w2t1', name: 'Улучшить артефакт 5 раз', currentProgress: 2, targetProgress: 5, rewardXP: 200, isClaimed: false },
            { id: 'w2t2', name: 'Потратить 10000 золота', currentProgress: 10000, targetProgress: 10000, rewardXP: 75, isClaimed: false },
        ],
        // Добавь задачи для Week 3-8 или оставь пустыми
        3: [], 4: [], 5: [], 6: [], 7: [], 8: [],
    };
    const [tasksByWeek, setTasksByWeek] = useState(initialTasksData);
    // -------------------------------------------------

    // === НОВЫЙ СТЕЙТ ИЗ КОД1 ===
    const [animatingClaimTasks, setAnimatingClaimTasks] = useState({}); // Новый стейт для ID задач в процессе анимации получения
    // ===========================

    const weeks = Array.from({ length: 8 }, (_, i) => i + 1);

    const seasonNumber = shardPassData.seasonNumber || 1;
    const daysRemaining = shardPassData.daysRemaining === undefined ? 45 : shardPassData.daysRemaining;
    const currentLevelXp = shardPassData.currentLevelXp || 0;
    const xpPerLevel = shardPassData.xpPerLevel || 1000;

    const screenVariants = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: 0.2 } }
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

        // Recalculate positions only if rewards view is visible
        if (!isTasksViewVisible) {
            calculatePositions();
            window.addEventListener('resize', calculatePositions);
        }
        return () => {
            if (!isTasksViewVisible) {
                 window.removeEventListener('resize', calculatePositions);
            }
        };
    }, [shardPassData, isTasksViewVisible]); // Recalculate on data change or view toggle

    const overallCurrentProgress = (xpPerLevel > 0 && currentLevelXp <= xpPerLevel)
                                     ? (currentLevelXp / xpPerLevel) * 100
                                     : (currentLevelXp > xpPerLevel ? 100 : 0);

    const nextLevel = shardPassData.currentLevel < shardPassData.maxLevel
        ? shardPassData.currentLevel + 1
        : shardPassData.maxLevel;

    const handleBuyPremium = () => {
        console.log("Buy Premium button clicked!");
        setShardPassData(prevData => {
            const newData = {
                ...prevData,
                isPremium: true,
            };
            console.log("New shardPassData state:", newData);
            return newData;
        });
    };

    const handleToggleTasksView = () => {
        setIsTasksViewVisible(prev => !prev);
    };

    // === ОБНОВЛЕННАЯ ФУНКЦИЯ: Получение награды за задание (из код1) ===
    const handleClaimTaskReward = (weekKey, taskId) => {
        const taskToClaim = tasksByWeek[weekKey]?.find(t => t.id === taskId);

        // Проверяем, что задание действительно можно забрать (выполнено и еще не получено)
        if (!taskToClaim || !(taskToClaim.currentProgress >= taskToClaim.targetProgress) || taskToClaim.isClaimed) {
            return; // Ничего не делаем, если условие не выполняется
        }

        // 1. Добавляем ID задачи в стейт анимируемых (это добавит класс .is-claiming-animation)
        setAnimatingClaimTasks(prev => ({ ...prev, [taskId]: true }));

        // 2. Обновляем основное состояние задачи на isClaimed: true
        setTasksByWeek(prevTasksByWeek => {
            const updatedWeekTasks = prevTasksByWeek[weekKey].map(task => {
                if (task.id === taskId) {
                    console.log(`Claimed reward for task ${taskId} from week ${weekKey}: ${task.rewardXP} XP`);
                    // Здесь в будущем может быть логика добавления XP к общему прогрессу ShardPass
                    // setShardPassData(prevShardData => ({
                    //  ...prevShardData,
                    //  currentLevelXp: prevShardData.currentLevelXp + task.rewardXP
                    // }));
                    return { ...task, isClaimed: true };
                }
                return task;
            });
            return { ...prevTasksByWeek, [weekKey]: updatedWeekTasks };
        });

        // 3. Убираем задачу из стейта анимируемых ПОСЛЕ завершения анимаций
        // Общее время анимации: wipe 0.7s + задержка оверлея 0.6s + появление оверлея 0.3s.
        // Самое долгое здесь - wipe 0.7s. Оверлей начнет появляться к концу этого.
        // Пусть общая видимая анимация будет около 0.7s + 0.3s = 1s.
        const animationDuration = 1000; // 1 секунда (0.7s для wipe + 0.3s для fade-in оверлея)
        setTimeout(() => {
            setAnimatingClaimTasks(prev => {
                const newState = { ...prev };
                delete newState[taskId];
                return newState;
            });
        }, animationDuration);
    };
    // --------------------------------------------------

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
                        {currentLevelXp}/{xpPerLevel}
                    </span>
                </div>
                <div className="level-indicator-diamond next-level-diamond">
                    <div className="level-indicator-diamond-inner-content">
                        <span className="level-indicator-diamond-number">{nextLevel}</span>
                    </div>
                </div>
            </div>

            {!isTasksViewVisible ? (
                <div className="shard-pass-rewards-section">
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
                                        } else if (isNextLevelNode && overallCurrentProgress >= 50 && shardPassData.currentLevel !== shardPassData.maxLevel) {
                                            fillPercentForBeforeLine = Math.min(100, (overallCurrentProgress - 50) * 2);
                                        }

                                        let fillPercentForAfterLine = 0;
                                        let afterLineIsFilledClass = '';

                                        if (levelData.level < shardPassData.currentLevel) {
                                            afterLineIsFilledClass = 'filled';
                                        } else if (isCurrentLevelNode && shardPassData.currentLevel !== shardPassData.maxLevel) {
                                            if (overallCurrentProgress >= 50) {
                                                afterLineIsFilledClass = 'filled';
                                            } else if (overallCurrentProgress > 0) {
                                                fillPercentForAfterLine = Math.min(100, overallCurrentProgress * 2);
                                            }
                                        }

                                        return (
                                            <div key={`level-node-${levelData.level}`} className="level-progress-node">
                                                <div className={`progress-line before ${beforeLineIsFilledClass}`}>
                                                    {fillPercentForBeforeLine > 0 && (
                                                        <div className="progress-line-fill" style={{ width: `${fillPercentForBeforeLine}%` }}></div>
                                                    )}
                                                </div>
                                                <div className={`level-indicator-badge ${levelData.level <= shardPassData.currentLevel ? 'achieved' : ''}`}>
                                                    Ур. {levelData.level}
                                                </div>
                                                <div className={`progress-line after ${afterLineIsFilledClass}`}>
                                                    {fillPercentForAfterLine > 0 && (
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
                </div>
            ) : (
                // === Обновленный блок отображения заданий с изменениями из код1 ===
                <div className="shard-pass-tasks-overlay">
                    <div className="tasks-tabs-container">
                        {weeks.map(weekNum => (
                            <button
                                key={`week-${weekNum}`}
                                className={`task-tab-button ${activeTaskWeek === weekNum ? 'active' : ''}`}
                                onClick={() => setActiveTaskWeek(weekNum)}
                            >
                                Неделя {weekNum}
                            </button>
                        ))}
                    </div>
                    <div className="tasks-list-scroll-container">
                        {(tasksByWeek[activeTaskWeek] && tasksByWeek[activeTaskWeek].length > 0) ? (
                            tasksByWeek[activeTaskWeek].map(task => {
                                const isCompleted = task.currentProgress >= task.targetProgress;
                                const progressPercent = Math.min((task.currentProgress / task.targetProgress) * 100, 100);

                                return (
                                    <div
                                        key={task.id}
                                        className={`
                                            task-item
                                            ${task.isClaimed ? 'claimed' : (isCompleted ? 'completed' : 'not-completed')}
                                            ${animatingClaimTasks[task.id] ? 'is-claiming-animation' : ''} {/* Временный класс для анимации */}
                                        `}
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
                                                disabled={!isCompleted || task.isClaimed || animatingClaimTasks[task.id]} // Добавлено условие animatingClaimTasks для disabled
                                            >
                                                {task.isClaimed ? 'Получено' : 'Забрать'}
                                                <span className="task-claim-reward-xp">+{task.rewardXP} XP</span>
                                            </button>
                                        </div>

                                        {/* Оверлей "Выполнено" рендерится если task.isClaimed */}
                                        {/* Его анимация появления будет управляться через .is-claiming-animation */}
                                        {task.isClaimed && (
                                            <div className="task-claimed-overlay">
                                                <span className="checkmark-icon">✔</span> {/* Or your SVG checkmark */}
                                                <span className="claimed-text">Completed</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="no-tasks-message">Заданий на эту неделю нет.</div>
                        )}
                    </div>
                </div>
            )}

            <div className="shard-pass-tasks-section">
                <button className="tasks-button" onClick={handleToggleTasksView}>
                    {/* Обновленный текст кнопки из код1 */}
                    {isTasksViewVisible ? 'К наградам' : 'К заданиям'}
                </button>
            </div>

            <div className="shard-pass-footer">
                <button className="shard-pass-action-button claim-all-btn">
                    Claim all ({/* счетчик */})
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