// src/components/screens/ShardPassScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ShardPassScreen.scss';

// Используем определения наград и задач из файлов данных (как в код1)
import { MOCK_SHARD_PASS_DATA_FULL as shardPassSeasonDefinitions } from '../../data/ShardPassRewardsData';
import { initialTasksData as shardPassTaskDefinitionsByWeek, SHARD_PASS_TASKS_WEEKS } from '../../data/ShardPassTasksData';

import {
    SEASON_START_DATE_UTC, // Используется для определения доступности недель
    getUnlockDateTimeForWeek,
    formatTimeRemaining,
    MS_PER_SECOND
} from '../../data/TimeConstants';

import useGameStore from '../../store/useGameStore'; // <<< ИМПОРТ ХРАНИЛИЩА из код1

const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 19L8 12L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const ShardPassScreen = ({ onClose }) => {
    // --- Получаем данные и действия из useGameStore (как в код1) ---
    const {
        shardPassCurrentLevel,
        shardPassCurrentXp,
        shardPassXpPerLevel,
        shardPassMaxLevel,
        isShardPassPremium,
        shardPassRewardsClaimed, // Объект состояния полученных наград { "level_1_free": true, ... }
        shardPassTasksProgress,   // Объект состояния прогресса задач { "1": { "sp_w1_kill_10_any": { progress: 5, isClaimed: false } } }
        
        purchaseShardPassPremium,
        claimShardPassReward,
        claimAllShardPassRewards,
        claimShardPassTaskReward,
    } = useGameStore(state => ({
        shardPassCurrentLevel: state.shardPassCurrentLevel,
        shardPassCurrentXp: state.shardPassCurrentXp,
        shardPassXpPerLevel: state.shardPassXpPerLevel,
        shardPassMaxLevel: state.shardPassMaxLevel,
        isShardPassPremium: state.isShardPassPremium,
        shardPassRewardsClaimed: state.shardPassRewardsClaimed,
        shardPassTasksProgress: state.shardPassTasksProgress,

        purchaseShardPassPremium: state.purchaseShardPassPremium,
        claimShardPassReward: state.claimShardPassReward,
        claimAllShardPassRewards: state.claimAllShardPassRewards,
        claimShardPassTaskReward: state.claimShardPassTaskReward,
    }));

    // Локальное состояние для UI (из код1 и код2)
    const [isTasksViewVisible, setIsTasksViewVisible] = useState(false);
    const [activeTaskWeek, setActiveTaskWeek] = useState(1); // Пользователь может выбирать неделю
    const [animatingClaimTasks, setAnimatingClaimTasks] = useState({});
    const [timeRemainingForWeek, setTimeRemainingForWeek] = useState('');
    const [isCurrentWeekLocked, setIsCurrentWeekLocked] = useState(true);
    const [isBuyPremiumPopupVisible, setIsBuyPremiumPopupVisible] = useState(false);
    const [isPaymentOptionsPopupVisible, setIsPaymentOptionsPopupVisible] = useState(false);
    const [isRewardClaimedPopupVisible, setIsRewardClaimedPopupVisible] = useState(false);
    const [lastClaimedReward, setLastClaimedReward] = useState(null); // { icon: string, name: string, amount: number | string }
    const [claimableRewardsCount, setClaimableRewardsCount] = useState(0);
    const [isMultiRewardsClaimPopupVisible, setIsMultiRewardsClaimPopupVisible] = useState(false);
    const [claimedAllRewardsList, setClaimedAllRewardsList] = useState([]); // Список для отображения в попапе

    const PASS_PRICE = shardPassSeasonDefinitions.premiumPriceUSD || "14.99"; // Из определений (код1)
    const weeks = Array.from({ length: SHARD_PASS_TASKS_WEEKS }, (_, i) => i + 1);
    const seasonNumber = shardPassSeasonDefinitions.seasonNumber || 1;
    
    // Расчет дней до конца сезона (из код1)
    const calculateDaysRemaining = () => {
        if (!shardPassSeasonDefinitions.endDateUTC) return null;
        const now = new Date();
        const endDate = new Date(shardPassSeasonDefinitions.endDateUTC);
        const diffTime = endDate - now;
        if (diffTime <= 0) return 0;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };
    const [daysRemaining, setDaysRemaining] = useState(calculateDaysRemaining());

    useEffect(() => { // Обновление дней до конца сезона (из код1)
        const timer = setInterval(() => {
            setDaysRemaining(calculateDaysRemaining());
        }, 1000 * 60 * 60); // Обновлять раз в час
        return () => clearInterval(timer);
    }, []);

    // --- ВАРИАНТЫ АНИМАЦИИ (из код2) ---
    const screenVariants = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: 0.2 } }
    };
    const sectionAppearVariant = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeInOut" } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.2, ease: "easeInOut" } }
    };
    const tabsContainerVariant = {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut", delay: 0.15 } }
    };
    const taskListAreaVariant = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.3, delay: 0.3 } },
        exit: { opacity: 0, transition: { duration: 0.2 } }
    };
    const lockOverlayAppearVariant = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.3, delay: 0.1 } },
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

    useEffect(() => { // Расчет позиций для sticky labels (из код2, адаптировано)
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
            const timerId = setTimeout(calculatePositions, 450); // Recalculate after animations might have settled
            window.addEventListener('resize', calculatePositions);
            return () => {
                clearTimeout(timerId);
                window.removeEventListener('resize', calculatePositions);
            };
        }
    }, [isTasksViewVisible]); // Зависимость от shardPassData удалена, так как структура не должна так часто меняться

    useEffect(() => { // Подсчет доступных для клейма наград ShardPass (из код1, использует данные стора)
        let count = 0;
        shardPassSeasonDefinitions.levels.forEach(levelDef => {
            if (levelDef.level <= shardPassCurrentLevel) {
                // Free reward
                if (levelDef.freeReward && !shardPassRewardsClaimed[`level_${levelDef.level}_free`]) {
                    count++;
                }
                // Premium reward
                if (isShardPassPremium && levelDef.premiumReward && !shardPassRewardsClaimed[`level_${levelDef.level}_premium`]) {
                    count++;
                }
            }
        });
        setClaimableRewardsCount(count);
    }, [shardPassSeasonDefinitions.levels, shardPassCurrentLevel, isShardPassPremium, shardPassRewardsClaimed]);

    useEffect(() => { // Таймер и статус блокировки для недель заданий (из код1, адаптировано)
        if (!isTasksViewVisible) return;
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
        (shardPassXpPerLevel > 0 && shardPassCurrentXp <= shardPassXpPerLevel) ? (shardPassCurrentXp / shardPassXpPerLevel) * 100 :
        (shardPassCurrentXp > shardPassXpPerLevel && shardPassCurrentLevel < shardPassMaxLevel) ? 100 :
        (shardPassCurrentLevel === shardPassMaxLevel && shardPassCurrentXp >= shardPassXpPerLevel) ? 100 :
        0;

    const nextLevel = shardPassCurrentLevel < shardPassMaxLevel
        ? shardPassCurrentLevel + 1
        : shardPassMaxLevel;

    const handleToggleTasksView = () => setIsTasksViewVisible(prev => !prev);

    const openBuyPremiumPopup = () => {
        setIsBuyPremiumPopupVisible(true);
        setIsPaymentOptionsPopupVisible(false);
        setIsRewardClaimedPopupVisible(false);
        setIsMultiRewardsClaimPopupVisible(false);
    };
    const closeBuyPremiumPopup = () => setIsBuyPremiumPopupVisible(false);

    const openPaymentOptionsPopup = () => {
        closeBuyPremiumPopup();
        setIsPaymentOptionsPopupVisible(true);
    };
    const closePaymentOptionsPopup = () => setIsPaymentOptionsPopupVisible(false);

    const closeRewardClaimedPopup = () => {
        setIsRewardClaimedPopupVisible(false);
        setLastClaimedReward(null);
    };
    const closeMultiRewardsClaimPopup = () => {
        setIsMultiRewardsClaimPopupVisible(false);
        setClaimedAllRewardsList([]);
    };

    const handleActualPremiumPurchase = async () => { // (из код1)
        const result = await purchaseShardPassPremium(); // Это действие из useGameStore
        if (result.success) {
            console.log('ShardPass Premium successfully activated via store!');
        } else {
            console.error('Failed to activate ShardPass Premium:', result.message);
        }
        closePaymentOptionsPopup();
        // setIsBuyPremiumPopupVisible(false); // Можно и основной закрыть, если нужно
    };
    
    const handlePaymentOptionSelected = (method) => { // (из код1)
        console.log(`Payment method selected: ${method}. Price: $${PASS_PRICE}`);
        handleActualPremiumPurchase();
    };

    const handleClaimAll = async () => { // (из код1)
        if (claimableRewardsCount === 0) return;
        const newlyClaimedResult = await claimAllShardPassRewards(); // Действие из стора
        if (newlyClaimedResult.success && newlyClaimedResult.claimedRewards && newlyClaimedResult.claimedRewards.length > 0) {
            setClaimedAllRewardsList(newlyClaimedResult.claimedRewards.map(r => ({ // Адаптируем для попапа
                icon: r.icon,
                name: r.name || (r.type === 'item' ? `Item ${r.itemId}` : r.type),
                amount: r.amount
            })));
            setIsMultiRewardsClaimPopupVisible(true);
        }
    };

    const handleRewardCardClick = async (levelData, isPremiumRewardItem) => { // (из код1)
        setIsBuyPremiumPopupVisible(false);
        setIsPaymentOptionsPopupVisible(false);
        setIsMultiRewardsClaimPopupVisible(false);

        let rewardDefinitionOnClick;
        const levelDef = shardPassSeasonDefinitions.levels.find(l => l.level === levelData.level);

        if (isPremiumRewardItem) {
            rewardDefinitionOnClick = levelDef?.premiumReward;
        } else {
            rewardDefinitionOnClick = levelDef?.freeReward;
        }

        if (!rewardDefinitionOnClick) {
            console.error("Reward definition not found for click.");
            return;
        }

        if (isPremiumRewardItem && !isShardPassPremium) {
            openBuyPremiumPopup();
            return;
        }
        
        const rewardKey = `level_${levelData.level}_${isPremiumRewardItem ? 'premium' : 'free'}`;
        if (levelData.level <= shardPassCurrentLevel && !shardPassRewardsClaimed[rewardKey]) {
            const result = await claimShardPassReward(levelData.level, isPremiumRewardItem); // Действие из стора
            if (result.success && result.reward) {
                setLastClaimedReward({
                    icon: result.reward.icon,
                    name: result.reward.name || (result.reward.type === 'item' ? `Item ${result.reward.itemId}` : result.reward.type),
                    amount: result.reward.amount
                });
                setIsRewardClaimedPopupVisible(true);
            } else {
                console.warn("Failed to claim reward from store:", result.message);
            }
        }
    };

    const handleClaimTaskRewardClick = async (weekNum, taskId) => { // (из код1)
        const taskDef = shardPassTaskDefinitionsByWeek[String(weekNum)]?.find(t => t.id === taskId);
        if (!taskDef) return;

        if (taskDef.isPremium && !isShardPassPremium) {
            openBuyPremiumPopup();
            return;
        }

        const taskProgressData = shardPassTasksProgress[String(weekNum)]?.[taskId];
        if (!taskProgressData || taskProgressData.isClaimed || (taskProgressData.progress || 0) < taskDef.targetProgress) {
            return; // Нельзя получить или уже получено
        }
        
        setAnimatingClaimTasks(prev => ({ ...prev, [taskId]: true }));
        const result = await claimShardPassTaskReward(weekNum, taskId); // Действие из стора
        
        if (!result.success) {
            console.warn("Failed to claim task reward:", result.message);
        }
        // Анимация завершится и кнопка обновится через re-render из-за изменения store
         setTimeout(() => {
            setAnimatingClaimTasks(prev => {
                const newState = { ...prev };
                delete newState[taskId];
                return newState;
            });
        }, 1000);
    };

    // --- DEBUG Кнопка для быстрого выполнения и клейма задачи (из код1) ---
    const handleDebugCompleteAndClaimTask = async (weekNum, taskId) => {
        const taskDef = shardPassTaskDefinitionsByWeek[String(weekNum)]?.find(t => t.id === taskId);
        if (!taskDef) return;

        if (taskDef.isPremium && !isShardPassPremium) {
            openBuyPremiumPopup(); // Сначала предложим купить премиум
            return;
        }
        
        // Это упрощенный дебаг-метод. В реальном сценарии, trackTaskEvent должен был бы вызываться.
        // Здесь мы просто пытаемся забрать награду, если store позволит (например, если бы был debug action для установки прогресса).
        console.log(`[DEBUG] Attempting to force claim task ${taskId} in week ${weekNum}`);
        
        // Искусственно "выполняем" задачу, если в сторе есть такой метод (для дебага).
        // if (useGameStore.getState().debugSetTaskProgress) {
        //    useGameStore.getState().debugSetTaskProgress(weekNum, taskId, taskDef.targetProgress);
        // }
        // Затем пытаемся забрать
        await handleClaimTaskRewardClick(weekNum, taskId); 
    };

    return (
        <motion.div
            className="shard-pass-screen-wrapper"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            {/* ShardPass Header */}
            <div className="shard-pass-header">
                <div className="header-level-badge">
                    <div className="header-level-badge-inner-content">
                        <span className="header-level-number">{shardPassCurrentLevel}</span> {/* ИЗ СТОРА */}
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
                    {daysRemaining !== null && (
                         <div className="season-ends-info-display">
                             <span className="season-ends-text">
                                 {daysRemaining > 0 ? `Season will end in ${daysRemaining} days` : "Season has ended"}
                             </span>
                         </div>
                     )}
                </div>
            </div>

            {/* Overall Progress Bar Section */}
            <div className="overall-progress-bar-section">
                <div className="level-indicator-diamond current-level-diamond">
                    <div className="level-indicator-diamond-inner-content">
                        <span className="level-indicator-diamond-number">{shardPassCurrentLevel}</span> {/* ИЗ СТОРА */}
                    </div>
                </div>
                <div className="progress-bar-container">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${overallCurrentProgress}%` }} /* Расчет на основе данных стора */
                        aria-valuenow={overallCurrentProgress}
                        aria-valuemin="0"
                        aria-valuemax="100"
                        role="progressbar"
                        aria-label={`Прогресс к следующему уровню: ${overallCurrentProgress}%`}
                    ></div>
                    <span className="progress-bar-text">
                        {/* ИЗ СТОРА */}
                        {shardPassCurrentLevel === shardPassMaxLevel && overallCurrentProgress >= 100 
                            ? "MAX" 
                            : `${shardPassCurrentXp}/${shardPassXpPerLevel}`} 
                    </span>
                </div>
                <div className="level-indicator-diamond next-level-diamond">
                    <div className="level-indicator-diamond-inner-content">
                        <span className="level-indicator-diamond-number">{nextLevel}</span> {/* Расчет на основе данных стора */}
                    </div>
                </div>
            </div>

            {/* Rewards/Tasks View Toggle Area */}
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
                                    <div className="side-label sticky premium-side-label" style={stickyLabelStyles.paid}>PREMIUM</div>
                                </div>
                                <div className="rewards-grid-container" ref={rewardsGridContainerRef}>
                                    {/* Free Rewards Track */}
                                    <div className="rewards-track free-rewards-track" ref={freeTrackRef}>
                                        {shardPassSeasonDefinitions.levels.map(levelData => {
                                            const rewardKey = `level_${levelData.level}_free`;
                                            const isClaimed = shardPassRewardsClaimed[rewardKey];
                                            const isAvailable = levelData.level <= shardPassCurrentLevel && !isClaimed;
                                            const isFuture = levelData.level > shardPassCurrentLevel;
                                            const rewardDef = levelData.freeReward;

                                            return (
                                                <div key={`free-${levelData.level}`} className="reward-cell">
                                                    <div
                                                        className={`reward-card free-reward ${isClaimed ? 'claimed' : ''} ${isFuture ? 'future' : ''} ${isAvailable ? 'available' : ''}`}
                                                        onClick={() => handleRewardCardClick(levelData, false)}
                                                    >
                                                        {rewardDef?.icon && <img src={rewardDef.icon} alt={rewardDef.name} className="reward-icon"/>}
                                                        {rewardDef?.amount != null && <span className="reward-card-quantity">
                                                            {typeof rewardDef.amount === 'number' && rewardDef.name && (rewardDef.name.toLowerCase().includes('энергия') || rewardDef.name.toLowerCase().includes('energy')) ? `+${rewardDef.amount}` : 
                                                             typeof rewardDef.amount === 'number' ? `x${rewardDef.amount}` : rewardDef.amount}
                                                        </span>}
                                                        {isClaimed && <div className="claimed-overlay">CLAIMED</div>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Levels and Progress Track (визуализация) */}
                                    <div className="levels-and-progress-track">
                                        {shardPassSeasonDefinitions.levels.map((levelData) => {
                                            const isCurrentLevelNode = levelData.level === shardPassCurrentLevel;
                                            let fillPercentForBeforeLine = 0;
                                            let beforeLineIsFilledClass = '';
                                            if (levelData.level <= shardPassCurrentLevel) {
                                                beforeLineIsFilledClass = 'filled';
                                                fillPercentForBeforeLine = 100;
                                            } else if (levelData.level === (shardPassCurrentLevel + 1) && shardPassCurrentLevel !== shardPassMaxLevel) {
                                                if (overallCurrentProgress > 50) fillPercentForBeforeLine = Math.min(100, (overallCurrentProgress - 50) * 2);
                                            }
                                            
                                            let fillPercentForAfterLine = 0;
                                            let afterLineIsFilledClass = '';
                                            if (levelData.level < shardPassCurrentLevel) {
                                                afterLineIsFilledClass = 'filled';
                                                fillPercentForAfterLine = 100;
                                            } else if (isCurrentLevelNode && shardPassCurrentLevel !== shardPassMaxLevel) {
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
                                                    <div className={`level-indicator-badge ${levelData.level <= shardPassCurrentLevel ? 'achieved' : ''}`}>
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
                                        {shardPassSeasonDefinitions.levels.map(levelData => {
                                            const rewardKey = `level_${levelData.level}_premium`;
                                            const isClaimed = isShardPassPremium && shardPassRewardsClaimed[rewardKey];
                                            const isFuture = levelData.level > shardPassCurrentLevel;
                                            const isPremiumLockedForUser = !isShardPassPremium;
                                            // Доступна для клейма, если премиум есть, уровень достигнут и еще не получена
                                            const isAvailable = isShardPassPremium && levelData.level <= shardPassCurrentLevel && !isClaimed;
                                            const rewardDef = levelData.premiumReward;
                                            
                                            return (
                                                <div key={`premium-${levelData.level}`} className="reward-cell">
                                                    <div
                                                        className={`reward-card premium-reward 
                                                            ${isClaimed ? 'claimed' : ''} 
                                                            ${isFuture && isShardPassPremium ? 'future' : ''} 
                                                            ${isPremiumLockedForUser && levelData.level <= shardPassCurrentLevel && !shardPassRewardsClaimed[rewardKey] ? 'premium-locked-highlight' : ''}
                                                            ${isAvailable ? 'available' : ''}
                                                        `}
                                                        onClick={() => handleRewardCardClick(levelData, true)}
                                                    >
                                                        {rewardDef?.icon && <img src={rewardDef.icon} alt={rewardDef.name} className="reward-icon"/>}
                                                        {rewardDef?.amount != null && <span className="reward-card-quantity">
                                                             {typeof rewardDef.amount === 'number' && rewardDef.name && (rewardDef.name.toLowerCase().includes('энергия') || rewardDef.name.toLowerCase().includes('energy')) ? `+${rewardDef.amount}` : 
                                                              typeof rewardDef.amount === 'number' ? `x${rewardDef.amount}` : rewardDef.amount}
                                                        </span>}
                                                        {isPremiumLockedForUser && <div className="premium-lock-overlay"><span className="lock-icon-display">🔒</span></div>}
                                                        {isClaimed && <div className="claimed-overlay">CLAIMED</div>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : ( // Tasks View
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
                                    Week {weekNum}
                                </button>
                            ))}
                        </motion.div>

                        <div className="tasks-content-viewport">
                            <AnimatePresence mode="out-in">
                                <motion.div
                                    key={activeTaskWeek} // Ключ для анимации при смене недели
                                    className="tasks-list-scroll-container"
                                    variants={taskListAreaVariant}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                >
                                    {!isCurrentWeekLocked && (
                                        (shardPassTaskDefinitionsByWeek[String(activeTaskWeek)] && shardPassTaskDefinitionsByWeek[String(activeTaskWeek)].length > 0) ? (
                                            shardPassTaskDefinitionsByWeek[String(activeTaskWeek)].map(taskDef => {
                                                const taskState = shardPassTasksProgress[String(activeTaskWeek)]?.[taskDef.id] || { progress: 0, isClaimed: false };
                                                const currentProgress = taskState.progress || 0;
                                                const isClaimed = taskState.isClaimed;
                                                const isCompleted = currentProgress >= taskDef.targetProgress;
                                                const progressPercent = Math.min((currentProgress / taskDef.targetProgress) * 100, 100);
                                                const isPremiumTaskAndLocked = taskDef.isPremium && !isShardPassPremium;

                                                return (
                                                    <motion.div
                                                        layout key={taskDef.id}
                                                        className={`task-item ${isClaimed ? 'claimed' : (isCompleted ? 'completed' : 'not-completed')} ${animatingClaimTasks[taskDef.id] ? 'is-claiming-animation' : ''} ${isPremiumTaskAndLocked ? 'premium-task-locked-styling' : ''}`}
                                                        onClick={isPremiumTaskAndLocked ? openBuyPremiumPopup : undefined}
                                                        initial={{ opacity: 0 }} 
                                                        animate={{ opacity: 1 }} 
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        <div className="task-info">
                                                            <span className="task-name">{taskDef.name}</span>
                                                            <div className="task-progress-bar-container">
                                                                <div className="task-progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                                                                <span className="task-progress-text">{currentProgress}/{taskDef.targetProgress}</span>
                                                            </div>
                                                        </div>
                                                        <div className="task-actions">
                                                            <button
                                                                className={`task-claim-button ${isCompleted && !isClaimed && !isPremiumTaskAndLocked ? 'ready-to-claim' : ''}`}
                                                                onClick={(e) => {
                                                                    if (isPremiumTaskAndLocked) { e.stopPropagation(); openBuyPremiumPopup(); } 
                                                                    else { handleClaimTaskRewardClick(activeTaskWeek, taskDef.id); }
                                                                }}
                                                                disabled={!isCompleted || isClaimed || isPremiumTaskAndLocked || animatingClaimTasks[taskDef.id]}
                                                            >
                                                                {isClaimed ? 'Получено' : 'Забрать'}
                                                                <span className="task-claim-reward-xp">+{taskDef.rewardXP} XP</span>
                                                            </button>
                                                           
                                                        </div>
                                                        {isPremiumTaskAndLocked && <div className="task-premium-lock-overlay"><span className="lock-icon-display">🔒</span></div>}
                                                        {isClaimed && <div className="task-claimed-overlay"><span className="checkmark-icon">✔</span><span className="claimed-text">Completed</span></div>}
                                                    </motion.div>
                                                );
                                            })
                                        ) : ( <div className="no-tasks-message">Заданий на эту неделю нет.</div> )
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            <AnimatePresence>
                                {isCurrentWeekLocked && (
                                    <motion.div
                                        key={`lock-overlay-${activeTaskWeek}`}
                                        className="tasks-week-lock-overlay"
                                        variants={lockOverlayAppearVariant}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                    >
                                        <div className="tasks-locked-container">
                                            <div className="locked-message-content">
                                                Tasks for Week {activeTaskWeek} will be available in:
                                                <div className="locked-countdown-timer">{timeRemainingForWeek}</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tasks/Rewards Toggle Button */}
            <div className="shard-pass-tasks-section">
                <button className="tasks-button" onClick={handleToggleTasksView}>
                    {isTasksViewVisible ? 'Rewards' : 'Challenges'}
                </button>
            </div>

            {/* Footer */}
            <div className="shard-pass-footer">
                <button
                    className="shard-pass-action-button claim-all-btn"
                    onClick={handleClaimAll}
                    disabled={claimableRewardsCount === 0}
                >
                    {/* Показываем кол-во даже если 1 (из код1) */}
                    Claim all {claimableRewardsCount >= 1 ? `(${claimableRewardsCount})` : ''} 
                </button>
                {!isShardPassPremium && (
                    <button
                        className="shard-pass-action-button buy-shardpass-btn"
                        onClick={openBuyPremiumPopup}
                    >
                        Buy Premium
                    </button>
                )}
            </div>

            {/* --- ПОПАП (Предложение купить премиум) --- */}
            <AnimatePresence>
                {isBuyPremiumPopupVisible && (
                    <motion.div
                        className="buy-premium-popup-backdrop"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={closeBuyPremiumPopup}
                    >
                        <motion.div
                            className="buy-premium-popup-content"
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3>Разблокировать ShardPass Premium?</h3>
                            <p>
                                Получите доступ ко всем премиум наградам и заданиям!
                                <br />
                                Стоимость: <strong>${PASS_PRICE}</strong>
                            </p>
                            <div className="popup-buttons">
                                <button onClick={openPaymentOptionsPopup} className="popup-buy-btn">
                                    Выбрать способ оплаты
                                </button>
                                <button onClick={closeBuyPremiumPopup} className="popup-close-btn">Закрыть</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- ПОПАП (Выбор способа оплаты) --- */}
            <AnimatePresence>
                {isPaymentOptionsPopupVisible && (
                    <motion.div
                        className="payment-options-popup-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closePaymentOptionsPopup}
                    >
                        <motion.div
                            className="payment-options-popup-content"
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3>Выберите способ оплаты</h3>
                            <p className="payment-price">Стоимость ShardPass: <strong>${PASS_PRICE}</strong></p>
                            <div className="payment-methods">
                                <button
                                    className="payment-method-btn usdt-ton"
                                    onClick={() => handlePaymentOptionSelected('USDT_TON')}
                                >
                                    <img src="/assets/icons/usdt-icon.png" alt="USDT" className="crypto-icon" />
                                    <span className="crypto-name">USDT</span>
                                    <span className="crypto-network">(TON Network)</span>
                                </button>
                                <button
                                    className="payment-method-btn usdc-bnb"
                                    onClick={() => handlePaymentOptionSelected('USDC_BNB')}
                                >
                                    <img src="/assets/icons/usdc-icon.png" alt="USDC" className="crypto-icon" />
                                    <span className="crypto-name">USDC</span>
                                    <span className="crypto-network">(BNB Chain)</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- ПОПАП "НАГРАДА ПОЛУЧЕНА" (ДЛЯ ОДИНОЧНОЙ НАГРАДЫ) --- */}
            <AnimatePresence>
                {isRewardClaimedPopupVisible && lastClaimedReward && (
                    <motion.div
                        className="reward-claimed-popup-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeRewardClaimedPopup}
                    >
                        <motion.div
                            className="reward-claimed-popup-content"
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3>Награда получена!</h3>
                            {lastClaimedReward.icon ? (
                                <img
                                    src={lastClaimedReward.icon}
                                    alt={lastClaimedReward.name}
                                    className="claimed-reward-icon-large"
                                />
                            ) : (
                                <div className="claimed-reward-icon-placeholder">?</div>
                            )}
                            <p className="claimed-reward-name-popup">{lastClaimedReward.name}</p>
                            {lastClaimedReward.amount != null && (
                                <p className="claimed-reward-amount-popup">
                                     {typeof lastClaimedReward.amount === 'number' && lastClaimedReward.name && (lastClaimedReward.name.toLowerCase().includes('энергия') || lastClaimedReward.name.toLowerCase().includes('energy')) ? `+${lastClaimedReward.amount}` :
                                      typeof lastClaimedReward.amount === 'number' ? `x${lastClaimedReward.amount}` : lastClaimedReward.amount}
                                </p>
                            )}
                            <div className="popup-buttons">
                                <button
                                    onClick={closeRewardClaimedPopup}
                                    className="popup-close-btn"
                                >
                                    Отлично!
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- ПОПАП "НАГРАДЫ ПОЛУЧЕНЫ" (ДЛЯ CLAIM ALL) --- */}
            <AnimatePresence>
                {isMultiRewardsClaimPopupVisible && claimedAllRewardsList.length > 0 && (
                    <motion.div
                        className="multi-reward-popup-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeMultiRewardsClaimPopup}
                    >
                        <motion.div
                            className="multi-reward-popup-content"
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3>Награды получены!</h3>
                            <div className="multi-reward-icons-grid">
                                {claimedAllRewardsList.map((reward, index) => (
                                    <div key={index} className="multi-reward-item">
                                        {reward.icon ? (
                                            <img 
                                                src={reward.icon} 
                                                alt={reward.name} 
                                                className="multi-reward-icon" 
                                            />
                                        ) : (
                                            <div className="multi-reward-icon-placeholder">?</div>
                                        )}
                                        {reward.amount != null && <span className="multi-reward-item-quantity">
                                            {typeof reward.amount === 'number' && reward.name && (reward.name.toLowerCase().includes('энергия') || reward.name.toLowerCase().includes('energy')) ? `+${reward.amount}` : 
                                             typeof reward.amount === 'number' ? `x${reward.amount}` : reward.amount}
                                        </span>}
                                    </div>
                                ))}
                            </div>
                            <div className="popup-buttons">
                                <button
                                    onClick={closeMultiRewardsClaimPopup}
                                    className="popup-close-btn"
                                >
                                    Отлично!
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </motion.div>
    );
};

export default ShardPassScreen;