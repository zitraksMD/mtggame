// src/components/screens/ShardPassScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ShardPassScreen.scss'; // Убедись, что путь правильный
import { MOCK_SHARD_PASS_DATA_FULL } from '../../data/ShardPassRewardsData'; // Убедись, что путь правильный
import {
    initialTasksData as allWeeksTasksData,
    SHARD_PASS_TASKS_WEEKS
} from '../../data/ShardPassTasksData'; // Убедись, что путь правильный
import {
    SEASON_START_DATE_UTC,
    getUnlockDateTimeForWeek,
    formatTimeRemaining,
    MS_PER_SECOND
} from '../../data/TimeConstants'; // Убедись, что путь правильный

const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 19L8 12L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

// Варианты анимации из код1 (объединены и обновлены)
const mainSectionSwitchVariant = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }, exit: { opacity: 0, y: -20, transition: { duration: 0.2, ease: "easeIn" } }};
const tabsContainerAppearanceVariant = { initial: { opacity: 0, x: -30 }, animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut", delay: 0.15 } } }; // delay из код1
const lockOverlayVariant = { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.3, delay: 0.1 } }, exit: { opacity: 0, transition: { duration: 0.2 } }};
const taskListUnlockedVariant = { initial: { opacity: 1 }, animate: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.08 }}}; // exit не нужен здесь, AnimatePresence управляет общим уходом - как в код1
const taskItemUnlockedVariant = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }};
// taskItemVariant из код2 (exit отличается от taskItemUnlockedVariant из код1, если нужен exit для отдельных айтемов при уходе списка, можно использовать его, но код1 не имел такого)
// const taskItemVariant = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }, exit: { opacity: 0, y: -10, transition: { duration: 0.2 } } };


const ShardPassScreen = ({ onClose }) => {
    const [shardPassData, setShardPassData] = useState(MOCK_SHARD_PASS_DATA_FULL);
    const [isTasksViewVisible, setIsTasksViewVisible] = useState(false);
    const [activeTaskWeek, setActiveTaskWeek] = useState(1);
    const [tasksByWeek, setTasksByWeek] = useState(allWeeksTasksData);
    const [animatingClaimTasks, setAnimatingClaimTasks] = useState({});
    const [timeRemainingForWeek, setTimeRemainingForWeek] = useState('');
    const [isCurrentWeekLocked, setIsCurrentWeekLocked] = useState(true);

    const seasonNumber = shardPassData.seasonNumber || 1;
    const daysRemaining = shardPassData.daysRemaining === undefined ? 45 : shardPassData.daysRemaining;
    const currentLevelXp = shardPassData.currentLevelXp;
    const xpPerLevel = shardPassData.xpPerLevel;

    const screenVariants = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0.2 } } };
    const stickyLabelsLayerRef = useRef(null);
    const freeTrackRef = useRef(null);
    const premiumTrackRef = useRef(null);
    const rewardsGridContainerRef = useRef(null);
    const [stickyLabelStyles, setStickyLabelStyles] = useState({ free: { top: '50%', transform: 'translateY(-50%) rotate(180deg)' }, paid: { top: '50%', transform: 'translateY(-50%) rotate(180deg)' }});

    useEffect(() => { // Логика для позиционирования sticky labels (из код1)
        const calculatePositions = () => {
            if (stickyLabelsLayerRef.current && freeTrackRef.current && premiumTrackRef.current && rewardsGridContainerRef.current) {
                const scrollContainer = stickyLabelsLayerRef.current.offsetParent;
                if (!scrollContainer) return;
                const freeTrackTopInWrapper = freeTrackRef.current.offsetTop + (freeTrackRef.current.offsetHeight / 2);
                const premiumTrackTopInWrapper = premiumTrackRef.current.offsetTop + (premiumTrackRef.current.offsetHeight / 2);
                setStickyLabelStyles({
                    free: { top: `${freeTrackTopInWrapper}px`, transform: 'translateY(-50%) rotate(180deg)'},
                    paid: { top: `${premiumTrackTopInWrapper}px`, transform: 'translateY(-50%) rotate(180deg)'}
                });
            }
        };
        if (!isTasksViewVisible) { // Пересчитываем только если видна секция наград (как в код1)
            calculatePositions();
            // Убрал setTimeout из код2, так как код1 не имел его и полагался на useEffect deps
            window.addEventListener('resize', calculatePositions);
            return () => window.removeEventListener('resize', calculatePositions);
        }
    }, [shardPassData, isTasksViewVisible]); // Добавили isTasksViewVisible (как в код1)

    useEffect(() => { // Логика для таймера и статуса блокировки недели (из код1)
        if (!isTasksViewVisible) return; // Не запускаем таймер, если секция задач не видна

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
        const intervalId = setInterval(calculateWeekLockStatus, MS_PER_SECOND || 1000); // MS_PER_SECOND or fallback
        return () => clearInterval(intervalId);
    }, [activeTaskWeek, isTasksViewVisible, SEASON_START_DATE_UTC]); // Добавлен SEASON_START_DATE_UTC для полноты, если он может меняться

    const overallCurrentProgress = (xpPerLevel > 0 && currentLevelXp <= xpPerLevel) ? (currentLevelXp / xpPerLevel) * 100 : (currentLevelXp > xpPerLevel && shardPassData.currentLevel < shardPassData.maxLevel) ? 100 : (shardPassData.currentLevel === shardPassData.maxLevel && currentLevelXp >= xpPerLevel) ? 100 : 0;
    const nextLevel = shardPassData.currentLevel < shardPassData.maxLevel ? shardPassData.currentLevel + 1 : shardPassData.maxLevel;

    const handleToggleTasksView = () => setIsTasksViewVisible(prev => !prev);

    const handleBuyPremium = () => {
        // console.log("Buy Premium button clicked!"); // Можно оставить для дебага
        setShardPassData(prevData => ({ ...prevData, isPremium: true }));
    };

    const handleClaimTaskReward = (weekKey, taskId) => {
        const taskToClaim = tasksByWeek[weekKey]?.find(t => t.id === taskId);
        if (!taskToClaim || !(taskToClaim.currentProgress >= taskToClaim.targetProgress) || taskToClaim.isClaimed) return;

        setShardPassData(prevData => {
            let newCurrentLevelXp = prevData.currentLevelXp + taskToClaim.rewardXP;
            let newCurrentLevel = prevData.currentLevel;
            const xpNeededForLevelUp = prevData.xpPerLevel || 1000; // Добавлено || 1000 как в код1, на случай если xpPerLevel может быть 0/undefined
            while (newCurrentLevel < prevData.maxLevel && newCurrentLevelXp >= xpNeededForLevelUp) {
                newCurrentLevel += 1;
                newCurrentLevelXp -= xpNeededForLevelUp;
            }
            if (newCurrentLevel === prevData.maxLevel && newCurrentLevelXp > xpNeededForLevelUp) {
                newCurrentLevelXp = xpNeededForLevelUp;
            }
            return { ...prevData, currentLevel: newCurrentLevel, currentLevelXp: newCurrentLevelXp };
        });
        
        setTasksByWeek(prevTasksByWeek => { 
            const updatedWeekTasks = prevTasksByWeek[weekKey].map(task => task.id === taskId ? { ...task, isClaimed: true } : task);
            return { ...prevTasksByWeek, [weekKey]: updatedWeekTasks };
        });

        setAnimatingClaimTasks(prev => ({ ...prev, [taskId]: true }));
        const animationDuration = 1000; // Match with CSS or desired effect
        setTimeout(() => {
            setAnimatingClaimTasks(prev => { const newState = { ...prev }; delete newState[taskId]; return newState; });
        }, animationDuration); // Используем animationDuration как в код2, 1000ms
    };
    
    const weeks = Array.from({ length: SHARD_PASS_TASKS_WEEKS }, (_, i) => i + 1);

    return (
        <motion.div className="shard-pass-screen-wrapper" variants={screenVariants} initial="initial" animate="animate" exit="exit">
            <div className="shard-pass-header">
                <div className="header-level-badge"> 
                    <div className="header-level-badge-inner-content"> 
                        {/* <span className="header-level-text">Level</span> */} {/* Убрал текст "Level" для компактности, как в код1 */}
                        <span className="header-level-number">{shardPassData.currentLevel}</span>
                    </div>
                </div>
                <div className="header-main-title"><h2>ShardPass</h2></div>
                <button onClick={onClose} className="shard-pass-back-btn" aria-label="Назад"><BackArrowIcon /></button>
                <div className="header-hanging-info-container"> 
                    <div className="season-banner-display"><span className="season-banner-text">Season {seasonNumber}</span></div>
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
                        <span className="level-indicator-diamond-text">Ур.</span> {/* Текст "Ур." из код1 */}
                        <span className="level-indicator-diamond-number">{shardPassData.currentLevel}</span>
                    </div>
                </div>
                <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${overallCurrentProgress}%` }} role="progressbar" aria-valuenow={overallCurrentProgress} aria-valuemin="0" aria-valuemax="100" aria-label={`Прогресс к следующему уровню: ${overallCurrentProgress}%`}></div>
                    <span className="progress-bar-text">{shardPassData.currentLevelXp}/{shardPassData.xpPerLevel}</span>
                </div>
                <div className="level-indicator-diamond next-level-diamond">
                    <div className="level-indicator-diamond-inner-content">
                        <span className="level-indicator-diamond-text">Ур.</span> {/* Текст "Ур." из код1 */}
                        <span className="level-indicator-diamond-number">{nextLevel}</span>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {!isTasksViewVisible ? (
                    <motion.div key="rewardsSection" className="shard-pass-rewards-section" variants={mainSectionSwitchVariant} initial="initial" animate="animate" exit="exit"> {/* Используем mainSectionSwitchVariant из код1 */}
                        <div className="shard-pass-rewards-horizontal-scroll">
                            <div className="sticky-labels-and-grid-wrapper"> 
                                <div className="sticky-labels-layer" ref={stickyLabelsLayerRef}> 
                                    <div className="side-label sticky free-side-label" style={stickyLabelStyles.free}>FREE</div>
                                    <div className="side-label sticky premium-side-label" style={stickyLabelStyles.paid}>PAID</div>
                                </div>
                                <div className="rewards-grid-container" ref={rewardsGridContainerRef}>
                                    <div className="rewards-track free-rewards-track" ref={freeTrackRef}>
                                        {/* Код отображения Free наград из код2 остается */}
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
                                    <div className="levels-and-progress-track"> {/* Логика progress-line из код1 */}
                                        {shardPassData.levels.map((levelData) => {
                                            const isCurrentLevelNode = levelData.level === shardPassData.currentLevel;
                                            const isNextLevelNode = levelData.level === (shardPassData.currentLevel + 1);
                                            let fillPercentForBeforeLine = 0; let beforeLineIsFilledClass = '';
                                            if (levelData.level <= shardPassData.currentLevel) { beforeLineIsFilledClass = 'filled'; fillPercentForBeforeLine = 100;}
                                            else if (isNextLevelNode && shardPassData.currentLevel !== shardPassData.maxLevel) { if (overallCurrentProgress > 50) fillPercentForBeforeLine = Math.min(100, (overallCurrentProgress - 50) * 2);}
                                            
                                            let fillPercentForAfterLine = 0; let afterLineIsFilledClass = '';
                                            if (levelData.level < shardPassData.currentLevel) { afterLineIsFilledClass = 'filled'; fillPercentForAfterLine = 100;}
                                            else if (isCurrentLevelNode && shardPassData.currentLevel !== shardPassData.maxLevel) { 
                                                if (overallCurrentProgress >= 50) { 
                                                    // В код1 здесь было: afterLineIsFilledClass = 'filled-start-cap'; fillPercentForAfterLine = 100;
                                                    // В код2 (и в объединенной версии):
                                                    afterLineIsFilledClass = 'filled'; //  Это означает, что линия заполнена, если прогресс > 50%
                                                    fillPercentForAfterLine = 100; 
                                                } else if (overallCurrentProgress > 0) {
                                                     fillPercentForAfterLine = Math.min(100, overallCurrentProgress * 2);
                                                }
                                            }
                                            // Логика с cap-left/cap-right из код1 для .progress-line-fill, если она важна для стилей, можно вернуть.
                                            // Для простоты я использую вариант из код2 для progress-line-fill, но классы beforeLineIsFilledClass/afterLineIsFilledClass берутся из код1.
                                            return (
                                                <div key={`level-node-${levelData.level}`} className="level-progress-node">
                                                    <div className={`progress-line before ${beforeLineIsFilledClass}`}>
                                                      {/* Условный рендеринг fill из код1, но без cap классов, если они не нужны или управляются CSS иначе */}
                                                      {(fillPercentForBeforeLine > 0 && !beforeLineIsFilledClass.includes('filled')) && (
                                                          <div className="progress-line-fill" style={{ width: `${fillPercentForBeforeLine}%` }}></div>
                                                      )}
                                                    </div>
                                                    <div className={`level-indicator-badge ${levelData.level <= shardPassData.currentLevel ? 'achieved' : ''}`}>Ур. {levelData.level}</div>
                                                    <div className={`progress-line after ${afterLineIsFilledClass}`}>
                                                      {(fillPercentForAfterLine > 0 && !afterLineIsFilledClass.includes('filled')) && (
                                                          <div className="progress-line-fill" style={{ width: `${fillPercentForAfterLine}%` }}></div>
                                                      )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="rewards-track premium-rewards-track" ref={premiumTrackRef}>
                                        {/* Код отображения Premium наград из код2 остается */}
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
                    <motion.div key="tasksOverlay" className="shard-pass-tasks-overlay" variants={mainSectionSwitchVariant} initial="initial" animate="animate" exit="exit"> {/* Используем mainSectionSwitchVariant из код1 */}
                        <motion.div className="tasks-tabs-container" variants={tabsContainerAppearanceVariant} initial="initial" animate="animate"> {/* Используем tabsContainerAppearanceVariant из код1 */}
                            {weeks.map(weekNum => (
                                <button key={`week-${weekNum}`} className={`task-tab-button ${activeTaskWeek === weekNum ? 'active' : ''}`} onClick={() => setActiveTaskWeek(weekNum)}>
                                    {/* В код1 было "Неделя {weekNum}", в код2 "Week {weekNum}". Оставляю "Неделя" для консистентности с другими русскими текстами */}
                                    Неделя {weekNum} 
                                </button>
                            ))}
                        </motion.div>
                        {/* tasks-content-viewport из код1, который оборачивает AnimatePresence */}
                        <div className="tasks-content-viewport"> 
                            <AnimatePresence mode="out-in"> {/* mode="out-in" из код1 */}
                                {isCurrentWeekLocked ? (
                                    <motion.div key={`locked-${activeTaskWeek}`} className="tasks-locked-container-wrapper" variants={lockOverlayVariant} initial="initial" animate="animate" exit="exit"> {/* Используем lockOverlayVariant из код1 и wrapper класс */}
                                        <div className="tasks-locked-container">
                                            <div className="locked-message-content">
                                                Задания для Недели {activeTaskWeek} откроются через:
                                                <div className="locked-countdown-timer">{timeRemainingForWeek}</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    // variants={!isCurrentWeekLocked ? taskListUnlockedVariant : {}} из код1
                                    // В код2 был taskListContainerVariantStagger, но taskListUnlockedVariant из код1 более специфичен для этого случая
                                    <motion.div key={`unlocked-${activeTaskWeek}`} className="tasks-list-scroll-container" variants={taskListUnlockedVariant} initial="initial" animate="animate"> 
                                        {(tasksByWeek[activeTaskWeek] && tasksByWeek[activeTaskWeek].length > 0) ? (
                                            tasksByWeek[activeTaskWeek].map(task => {
                                                const isCompleted = task.currentProgress >= task.targetProgress;
                                                const progressPercent = Math.min((task.currentProgress / task.targetProgress) * 100, 100);
                                                return (
                                                    // variants={!isCurrentWeekLocked ? taskItemUnlockedVariant : {}} из код1
                                                    // В код2 был taskItemVariant, taskItemUnlockedVariant из код1 более специфичен
                                                    <motion.div 
                                                        key={task.id} 
                                                        className={`task-item ${task.isClaimed ? 'claimed' : (isCompleted ? 'completed' : 'not-completed')} ${animatingClaimTasks[task.id] ? 'is-claiming-animation' : ''} ${isCurrentWeekLocked ? 'task-view-when-locked' : ''}`} // Добавлен класс task-view-when-locked из код1
                                                        variants={taskItemUnlockedVariant} // Используем taskItemUnlockedVariant из код1
                                                        // exit не указываем здесь, т.к. staggerChildren управляет появлением, а общий exit на taskListUnlockedVariant
                                                    >
                                                        <div className="task-info">
                                                            <span className="task-name">{task.name}</span>
                                                            <div className="task-progress-bar-container">
                                                                <div className="task-progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                                                                <span className="task-progress-text">{task.currentProgress}/{task.targetProgress}</span>
                                                            </div>
                                                        </div>
                                                        <div className="task-actions">
                                                            <button 
                                                                className={`task-claim-button ${isCompleted && !task.isClaimed ? 'ready-to-claim' : ''}`} 
                                                                onClick={() => handleClaimTaskReward(activeTaskWeek, task.id)} 
                                                                disabled={!isCompleted || task.isClaimed || animatingClaimTasks[task.id]}> {/* Добавлен animatingClaimTasks[task.id] в disabled */}
                                                                {task.isClaimed ? 'Получено' : 'Забрать'} <span className="task-claim-reward-xp">+{task.rewardXP} XP</span>
                                                            </button>
                                                        </div>
                                                        {task.isClaimed && (<div className="task-claimed-overlay"><span className="checkmark-icon">✔</span><span className="claimed-text">Completed</span></div>)}
                                                    </motion.div>
                                                );
                                            })
                                        ) : ( 
                                            // Анимация для no-tasks-message из код1
                                            <motion.div 
                                                className={`no-tasks-message ${isCurrentWeekLocked ? 'task-view-when-locked' : ''}`} // Добавлен класс task-view-when-locked из код1
                                                variants={taskItemUnlockedVariant} // Можно использовать тот же вариант для консистентности или создать отдельный. Код1 использовал taskItemUnlockedVariant.
                                                initial="initial" 
                                                animate="animate"
                                            >
                                                Заданий на эту неделю нет.
                                            </motion.div> 
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <div className="shard-pass-tasks-section">
                <button className="tasks-button" onClick={handleToggleTasksView}>
                    {isTasksViewVisible ? 'К наградам' : 'К заданиям'}
                </button>
            </div>
            <div className="shard-pass-footer">
                <button className="shard-pass-action-button claim-all-btn">Claim all ({/* count TODO*/ 0})</button>
                {!shardPassData.isPremium && (
                    <button className="shard-pass-action-button buy-shardpass-btn" onClick={handleBuyPremium}>Buy Premium</button>
                )}
            </div>
        </motion.div>
    );
};

export default ShardPassScreen;