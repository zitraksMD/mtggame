// src/components/screens/ShardPassScreen.jsx
import React, { useState, useEffect, useRef } from 'react'; // useEffect и useRef уже были
import { motion } from 'framer-motion';
import './ShardPassScreen.scss';
// import useGameStore from '../../store/useGameStore'; // Если нужны данные из стора

// Пример иконки "назад" (из код2)
const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 19L8 12L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

// Пример данных для ShardPass (из код2)
const MOCK_SHARD_PASS_DATA = {
    currentLevel: 5,
    currentProgress: 60, // в процентах до следующего уровня
    maxLevel: 50,
    isPremium: false,
    levels: Array.from({ length: 50 }, (_, i) => ({
        level: i + 1,
        freeReward: { name: `Free Reward ${i + 1}`, claimed: i < 4, type: 'shards', amount: (i + 1) * 100, icon: '/assets/ton-image.png' },
        premiumReward: { name: `Premium Reward ${i + 1}`, claimed: i < 2 && true, type: 'diamonds', amount: (i+1) * 5, icon: '/assets/diamond-image.png' },
    })),
};


const ShardPassScreen = ({ onClose }) => {
    // const { shardPassData, claimReward, buyPremium } = useGameStore(state => ({ ... })); // Пример
    const [shardPassData, setShardPassData] = useState(MOCK_SHARD_PASS_DATA); // Используем моковые данные

    // Анимационные варианты для всего экрана (из код2)
    const screenVariants = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: 0.2 } }
    };

    // Refs из код1
    const stickyLabelsLayerRef = useRef(null); // Ref для слоя с sticky-метками
    const freeTrackRef = useRef(null);
    const premiumTrackRef = useRef(null);
    const rewardsGridContainerRef = useRef(null); // Ref для общего контейнера дорожек (в код2 был rewardsGridRef)

    // Начальные значения stickyLabelStyles из код1
    const [stickyLabelStyles, setStickyLabelStyles] = useState({
        free: { top: '50%', transform: 'translateY(-50%) rotate(0deg)' },
        paid: { top: '50%', transform: 'translateY(-50%) rotate(0deg)' }
    });

    // useEffect из код1 (с адаптацией под структуру refs из код1)
    useEffect(() => {
        const calculatePositions = () => {
            if (stickyLabelsLayerRef.current && freeTrackRef.current && premiumTrackRef.current && rewardsGridContainerRef.current) {
                
                const scrollContainer = stickyLabelsLayerRef.current.offsetParent; // Это .sticky-labels-and-grid-wrapper
                if (!scrollContainer) return;

                // const scrollContainerTop = scrollContainer.getBoundingClientRect().top; // В код1 это не использовалось напрямую для вычисления top меток

                // Позиция дорожки относительно ВЕРХА .sticky-labels-and-grid-wrapper (логика из код1)
                const freeTrackTopInWrapper = freeTrackRef.current.offsetTop + (freeTrackRef.current.offsetHeight / 2);
                const premiumTrackTopInWrapper = premiumTrackRef.current.offsetTop + (premiumTrackRef.current.offsetHeight / 2);
                
                setStickyLabelStyles({
                    free: {
                        top: `${freeTrackTopInWrapper}px`,
                        transform: 'translateY(-50%) rotate(180deg)' // Убираем rotate(180deg) если текст повернут CSS
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
        // Если shardPassData или другие факторы влияют на высоты, их тоже можно добавить в зависимости
        return () => window.removeEventListener('resize', calculatePositions);
    }, [shardPassData]); // Зависимость от shardPassData как в код1


    return (
        <motion.div
            className="shard-pass-screen-wrapper"
            variants={screenVariants} // из код2
            initial="initial"         // из код2
            animate="animate"       // из код2
            exit="exit"             // из код2
        >
            {/* Header из код2 */}
            <div className="shard-pass-header">
    {/* Заголовок "ShardPass" - теперь он может быть основным элементом или частью нового title-wrapper */}
    <div className="header-main-title">
        <h2>ShardPass</h2>
    </div>

    {/* Кнопка "Назад" теперь справа */}
    <button onClick={onClose} className="shard-pass-back-btn" aria-label="Назад">
        <BackArrowIcon />
    </button>

    {/* Новый "нависающий" баннер с уровнем - будет позиционироваться абсолютно */}
    <div className="level-banner-container">
        <div className="level-banner-badge">
            <span className="level-banner-text">Level</span>
            <span className="level-banner-number">{shardPassData.currentLevel}</span>
        </div>
    </div>
</div>
            
            {/* Секция наград с использованием структуры из код1 для sticky меток и refs */}
            <div className="shard-pass-rewards-section">
                <div className="shard-pass-rewards-horizontal-scroll">
                    {/* padding-left здесь создаст начальный отступ (комментарий из код1) */}
                    <div className="sticky-labels-and-grid-wrapper"> 
                        
                        {/* Этот слой будет sticky (из код1) */}
                        <div className="sticky-labels-layer" ref={stickyLabelsLayerRef}> 
                            <div className="side-label sticky free-side-label" style={stickyLabelStyles.free}>FREE</div>
                            <div className="side-label sticky premium-side-label" style={stickyLabelStyles.paid}>PREMIUM</div>
                        </div>

                        {/* Контейнер для всех дорожек с ref из код1 */}
                        <div className="rewards-grid-container" ref={rewardsGridContainerRef}>
                            {/* 1. Free Rewards Track (с ref из код1) */}
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
                                            {levelData.freeReward.icon && <img src={levelData.freeReward.icon} alt={levelData.freeReward.type} className="reward-icon"/>}
                                            <span className="reward-name">{levelData.freeReward.name}</span>
                                            {levelData.freeReward.claimed && <div className="claimed-overlay">ПОЛУЧЕНО</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 2. Levels and Progress Track (структура из код2, обернута в контейнер из код1) */}
                            <div className="levels-and-progress-track">
    {shardPassData.levels.map((levelData, index) => (
        <div key={`level-node-${levelData.level}`}
            className="level-progress-node"
            // Атрибуты data-first и data-last больше не нужны для управления видимостью линий
        >
            {/* Линия ДО индикатора уровня - всегда рендерим */}
            <div className={`progress-line before ${levelData.level <= shardPassData.currentLevel ? 'filled' : ''}`}></div>
            
            {/* Сам индикатор уровня "Ур. X" */}
            <div className={`level-indicator-badge ${levelData.level <= shardPassData.currentLevel ? 'achieved' : ''}`}>
                Ур. {levelData.level}
            </div>

            {/* Линия ПОСЛЕ индикатора уровня - всегда рендерим */}
            <div
                className={`progress-line after ${levelData.level < shardPassData.currentLevel ? 'filled' : 
                                (levelData.level === shardPassData.currentLevel && shardPassData.currentProgress > 0 ? 'partially-filled' : '') // Добавим класс для частичного заполнения
                            }`}
            >
                {/* Заполняющаяся часть линии для текущего уровня */}
                {levelData.level === shardPassData.currentLevel && shardPassData.currentProgress > 0 && (
                    <div
                        className="progress-line-fill"
                        style={{ width: `${shardPassData.currentProgress}%` }}
                    ></div>
                )}
            </div>
        </div>
    ))}
</div>

                            {/* 3. Premium Rewards Track (с ref из код1) */}
                            <div className="rewards-track premium-rewards-track" ref={premiumTrackRef}>
                                {shardPassData.levels.map(levelData => (
                                    <div key={`premium-${levelData.level}`} className="reward-cell">
                                        <div
                                            className={`reward-card premium-reward ${levelData.premiumReward.claimed && shardPassData.isPremium ? 'claimed' : ''} ${!shardPassData.isPremium ? 'premium-locked' : ''} ${levelData.level > shardPassData.currentLevel && shardPassData.isPremium ? 'future' : ''}`}
                                        >
                                            {levelData.premiumReward.icon && <img src={levelData.premiumReward.icon} alt={levelData.premiumReward.type} className="reward-icon"/>}
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

            {/* Footer из код2 */}
            <div className="shard-pass-footer">
                <button className="shard-pass-action-button claim-all-btn">
                    Забрать все ({/* счетчик доступных наград */})
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