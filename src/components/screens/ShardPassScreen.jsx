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

    // Используем данные из shardPassData, которые были добавлены в MOCK_SHARD_PASS_DATA_FULL
    // Фоллбэки на случай, если данные по какой-то причине отсутствуют.
    const seasonNumber = shardPassData.seasonNumber || 1;
    const daysRemaining = shardPassData.daysRemaining === undefined ? 45 : shardPassData.daysRemaining; // Используем undefined для проверки, т.к. 0 дней - валидное значение


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

        calculatePositions();
        window.addEventListener('resize', calculatePositions);
        return () => window.removeEventListener('resize', calculatePositions);
    }, [shardPassData]);


    const nextLevel = shardPassData.currentLevel < shardPassData.maxLevel
        ? shardPassData.currentLevel + 1
        : shardPassData.maxLevel;

    // Определяем прогресс для текущего уровня.
    // Если это максимальный уровень и он достигнут (100%), то currentProgress может быть 100.
    // Если currentLevel < maxLevel, то currentProgress - это прогресс к следующему уровню.
    // Если currentLevel === maxLevel, то currentProgress может показывать "заполненность" этого уровня,
    // или всегда быть 100, если дополнительных очков сверх максимума не бывает.
    // MOCK_SHARD_PASS_DATA_FULL.currentProgress должен быть прогрессом к следующему уровню.
    const overallCurrentProgress = (shardPassData.currentLevel === shardPassData.maxLevel && shardPassData.currentProgress === 100)
                                    ? 100 // Если макс. уровень и 100% прогресс, показываем полный бар
                                    : shardPassData.currentProgress;


    return (
        <motion.div
            className="shard-pass-screen-wrapper"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <div className="shard-pass-header">
            <div className="header-level-badge"> {/* Внешний контейнер, который станет ромбом */}
  <div className="header-level-badge-inner-content"> {/* Новый внутренний контейнер для контента */}
    <span className="header-level-number">{shardPassData.currentLevel}</span>
  </div>
</div>
                <div className="header-main-title">
                    <h2>ShardPass</h2>
                </div>
                <button onClick={onClose} className="shard-pass-back-btn" aria-label="Назад">
                    <BackArrowIcon />
                </button>

                {/* Обновленные нависающие элементы из код1 (заменяют level-banner-container) */}
                <div className="header-hanging-info-container">
                    <div className="season-banner-display">
                        <span className="season-banner-text">Season {seasonNumber}</span>
                    </div>
                    {daysRemaining !== null && daysRemaining !== undefined && ( // Показываем, только если есть данные
                        <div className="season-ends-info-display">
                            <span className="season-ends-text">
                                {daysRemaining > 0 ? `Season will end in ${daysRemaining} days` : "Season has ended"}
                            </span>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Раздел с общим прогресс-баром (содержимое идентично в код1 и код2) */}
            <div className="overall-progress-bar-section">
                <span className="level-text current-level-text">
                    Ур. {shardPassData.currentLevel}
                </span>
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
                </div>
                <span className="level-text next-level-text">
                    Ур. {nextLevel}
                </span>
            </div>

            <div className="shard-pass-rewards-section"> {/* Содержимое сохранено из код2 */}
                <div className="shard-pass-rewards-horizontal-scroll">
                    <div className="sticky-labels-and-grid-wrapper"> 
                        <div className="sticky-labels-layer" ref={stickyLabelsLayerRef}> 
                            <div className="side-label sticky free-side-label" style={stickyLabelStyles.free}>FREE</div>
                            <div className="side-label sticky premium-side-label" style={stickyLabelStyles.paid}>PAID</div>
                        </div>

                        <div className="rewards-grid-container" ref={rewardsGridContainerRef}>
                            {/* 1. Free Rewards Track */}
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

                            {/* 2. Levels and Progress Track */}
                            <div className="levels-and-progress-track">
                                {shardPassData.levels.map((levelData) => (
                                    <div key={`level-node-${levelData.level}`}
                                        className="level-progress-node"
                                    >
                                        <div className={`progress-line before ${levelData.level <= shardPassData.currentLevel ? 'filled' : ''}`}></div>
                                        
                                        <div className={`level-indicator-badge ${levelData.level <= shardPassData.currentLevel ? 'achieved' : ''}`}>
                                            Ур. {levelData.level}
                                        </div>

                                        <div
                                            className={`progress-line after ${levelData.level < shardPassData.currentLevel ? 'filled' : 
                                                            (levelData.level === shardPassData.currentLevel && shardPassData.currentProgress > 0 ? 'partially-filled' : '')
                                                        }`}
                                        >
                                            {levelData.level === shardPassData.currentLevel && shardPassData.currentProgress > 0 && shardPassData.currentLevel !== shardPassData.maxLevel && (
                                                <div
                                                    className="progress-line-fill"
                                                    style={{ width: `${shardPassData.currentProgress}%` }}
                                                ></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 3. Premium Rewards Track */}
                            <div className="rewards-track premium-rewards-track" ref={premiumTrackRef}>
                                {shardPassData.levels.map(levelData => (
                                    <div key={`premium-${levelData.level}`} className="reward-cell">
                                        <div
                                            className={`reward-card premium-reward ${levelData.premiumReward.claimed && shardPassData.isPremium ? 'claimed' : ''} ${!shardPassData.isPremium ? 'premium-locked' : ''} ${levelData.level > shardPassData.currentLevel && shardPassData.isPremium ? 'future' : ''}`}
                                        >
                                            {levelData.premiumReward.icon && <img src={levelData.premiumReward.icon} alt={levelData.premiumReward.name} className="reward-icon"/>}
                                            <span className="reward-name">{levelData.premiumReward.name}</span>
                                            {!shardPassData.isPremium && <div className="premium-lock-icon">👑</div>}
                                            {levelData.premiumReward.claimed && shardPassData.isPremium && <div className="claimed-overlay">ПОЛУЧЕНО</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* НОВАЯ КНОПКА ЗАДАНИЙ (из код1) */}
            <div className="shard-pass-tasks-section">
                <button className="tasks-button">
                    View Tasks {/* Или "Задания" */}
                </button>
            </div>

            <div className="shard-pass-footer"> {/* Содержимое сохранено из код2 */}
                <button className="shard-pass-action-button claim-all-btn">
                    Забрать все ({/* счетчик */})
                </button>
                {!shardPassData.isPremium && (
                    <button className="shard-pass-action-button buy-shardpass-btn">
                        Купить Premium 
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export default ShardPassScreen;