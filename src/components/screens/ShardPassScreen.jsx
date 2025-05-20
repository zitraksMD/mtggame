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

        calculatePositions();
        window.addEventListener('resize', calculatePositions);
        return () => window.removeEventListener('resize', calculatePositions);
    }, [shardPassData]);

    const overallCurrentProgress = (xpPerLevel > 0 && currentLevelXp <= xpPerLevel) 
                                   ? (currentLevelXp / xpPerLevel) * 100 
                                   : (currentLevelXp > xpPerLevel ? 100 : 0);

    const nextLevel = shardPassData.currentLevel < shardPassData.maxLevel
        ? shardPassData.currentLevel + 1
        : shardPassData.maxLevel;

    // --- НОВАЯ ФУНКЦИЯ-ОБРАБОТЧИК ДЛЯ ПОКУПКИ ПРЕМИУМА ---
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
    // ----------------------------------------------------

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
                                    // Это линия ПЕРЕД значком СЛЕДУЮЩЕГО уровня, и мы прошли >50%
                                    fillPercentForBeforeLine = Math.min(100, (overallCurrentProgress - 50) * 2);
                                    if (fillPercentForBeforeLine > 0) {
                                      // beforeLineIsFilledClass = 'partially-filled'; // Можно не добавлять, сама заливка покажет
                                    }
                                }

                                let fillPercentForAfterLine = 0;
                                let afterLineIsFilledClass = '';

                                if (levelData.level < shardPassData.currentLevel) {
                                    afterLineIsFilledClass = 'filled';
                                } else if (isCurrentLevelNode && shardPassData.currentLevel !== shardPassData.maxLevel) {
                                    // Это линия ПОСЛЕ значка ТЕКУЩЕГО уровня
                                    if (overallCurrentProgress >= 50) {
                                        afterLineIsFilledClass = 'filled';
                                    } else if (overallCurrentProgress > 0) {
                                        fillPercentForAfterLine = Math.min(100, overallCurrentProgress * 2);
                                        // if (fillPercentForAfterLine > 0) {
                                        //  afterLineIsFilledClass = 'partially-filled';
                                        // }
                                    }
                                }

                                return (
                                    <div key={`level-node-${levelData.level}`} className="level-progress-node">
                                        {/* Линия ПЕРЕД значком уровня */}
                                        <div className={`progress-line before ${beforeLineIsFilledClass}`}>
                                            {fillPercentForBeforeLine > 0 && (
                                                <div className="progress-line-fill" style={{ width: `${fillPercentForBeforeLine}%` }}></div>
                                            )}
                                        </div>
                                        
                                        <div className={`level-indicator-badge ${levelData.level <= shardPassData.currentLevel ? 'achieved' : ''}`}>
                                            Ур. {levelData.level}
                                        </div>

                                        {/* Линия ПОСЛЕ значка уровня */}
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

            <div className="shard-pass-tasks-section">
                <button className="tasks-button">
                    View Tasks
                </button>
            </div>

            <div className="shard-pass-footer"> 
                <button className="shard-pass-action-button claim-all-btn">
                    Claim all ({/* счетчик */})
                </button>
                {!shardPassData.isPremium && (
                    <button 
                        className="shard-pass-action-button buy-shardpass-btn"
                        onClick={handleBuyPremium} // <--- ПРИВЯЗЫВАЕМ ОБРАБОТЧİK К КНОПКЕ
                    >
                        Buy Premium 
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export default ShardPassScreen;