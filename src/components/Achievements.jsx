// src/components/Achievements.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
// VVV ИЗМЕНЕНИЕ 1: Импортируем стор отдельно, а данные наград - из нового файла VVV
import useGameStore from '../store/useGameStore';
import levelRewards, { RewardType } from '../data/levelRewardsData'; // <<< Используем данные из levelRewardsData.js
// ^^^ КОНЕЦ ИЗМЕНЕНИЯ 1 ^^^
import achievementsData from '../data/achievementsDatabase';
import { pageVariants, pageTransition } from '../animations';
import './Achievements.scss';

const Achievements = () => {
    // --- Получение данных из стора ---
    // Убрали ACHIEVEMENT_LEVEL_REWARDS из импорта стора, т.к. берем из файла
    const {
        achievementsStatus,
        claimAchievementReward,
        achievementLevel,
        getCurrentLevelXpProgress,
        getXpNeededForCurrentLevelUp,
        getAchievementXpNeededForNextLevel
    } = useGameStore((state) => ({
        achievementsStatus: state.achievementsStatus || {},
        claimAchievementReward: state.claimAchievementReward,
        achievementLevel: state.achievementLevel,
        getCurrentLevelXpProgress: state.getCurrentLevelXpProgress,
        getXpNeededForCurrentLevelUp: state.getXpNeededForCurrentLevelUp,
        getAchievementXpNeededForNextLevel: state.getAchievementXpNeededForNextLevel,
    }));

    // --- Состояния для попапов ---
    const [selectedAchId, setSelectedAchId] = useState(null);
    const [isLevelRewardsPopupOpen, setIsLevelRewardsPopupOpen] = useState(false);

    const selectedAchievement = selectedAchId ? achievementsData.find(a => a.id === selectedAchId) : null;

    // --- Расчет данных для XP бара ---
    const currentLevelXp = getCurrentLevelXpProgress();
    const xpToLevelUp = getXpNeededForCurrentLevelUp();
    const nextLevelTotalXp = getAchievementXpNeededForNextLevel();
    const xpProgressPercent = (xpToLevelUp === Infinity || xpToLevelUp <= 0)
        ? 100
        : Math.min(100, Math.floor((currentLevelXp / xpToLevelUp) * 100));

    // --- Подготовка данных для списка ачивок ---
    const achievementsToDisplay = achievementsData.map(ach => {
        const status = achievementsStatus[ach.id] || { progress: 0, completed: false, claimed: false };
        const currentProgressValue = status.progress || 0;
        const isCompleted = status.completed;
        const canClaim = isCompleted && !status.claimed;
        return {
            ...ach,
            progress: currentProgressValue,
            isCompleted,
            canClaim,
            claimed: status.claimed || false,
        };
     }).sort((a, b) => {
        // Сортировка: сначала забираемые, потом невыполненные, потом полученные
        if (a.canClaim && !b.canClaim) return -1;
        if (!a.canClaim && b.canClaim) return 1;
        // Невыполненные выше выполненных (которые еще не получены)
        if (!a.isCompleted && b.isCompleted && !b.claimed) return -1;
        if (a.isCompleted && !b.isCompleted && !a.claimed) return 1;
        // Выполненные (не полученные) выше полученных
        if (!a.claimed && b.claimed) return -1;
        if (a.claimed && !b.claimed) return 1;
        // Если статусы одинаковые, можно добавить сортировку по ID или имени
        return (a.id < b.id) ? -1 : 1;
     });

    // --- ОБРАБОТЧИКИ ПОПАПОВ ---
    const handleOpenAchPopup = (achId) => setSelectedAchId(achId);
    const handleCloseAchPopup = () => setSelectedAchId(null);

    const openLevelRewardsPopup = () => setIsLevelRewardsPopupOpen(true);
    const closeLevelRewardsPopup = () => setIsLevelRewardsPopupOpen(false);
    // -----------------------------

    return (
        <motion.div
            className="achievements-screen"
            initial="initial" animate="in" exit="out"
            variants={pageVariants} transition={pageTransition}
        >
            {/* === БЛОК УРОВНЯ И XP === */}
            <div className="achievement-level-progress-bar">
                 <div className="level-badge"> <span className="level-number">{achievementLevel}</span> </div>
                 <div className="xp-bar-container">
                    <div className="xp-bar-bg"> <div className="xp-bar-fg" style={{ width: `${xpProgressPercent}%` }}></div> </div>
                    <div className="xp-text"> {xpToLevelUp === Infinity ? 'Макс. уровень' : `${currentLevelXp} / ${xpToLevelUp} XP`} </div>
                 </div>
                 <div className="xp-target"> {nextLevelTotalXp !== Infinity ? nextLevelTotalXp : 'МАКС'} </div>
            </div>

            {/* === КНОПКА ОТКРЫТИЯ ПОПАПА НАГРАД ЗА УРОВЕНЬ === */}
            <button className="level-rewards-button" onClick={openLevelRewardsPopup}>
                Награды за Уровень
            </button>

            {/* === СПИСОК ДОСТИЖЕНИЙ === */}
            <div className="achievements-list">
                {achievementsToDisplay.map(ach => (
                    <div
                        key={ach.id}
                        className={`achievement-item ${ach.isCompleted ? 'completed' : ''} ${ach.claimed ? 'claimed' : ''} ${ach.canClaim ? 'claimable' : ''}`}
                        onClick={() => handleOpenAchPopup(ach.id)}
                    >
                        <div className="achievement-icon">{ach.icon || '🏆'}</div>
                        <div className="achievement-details-condensed"> <div className="achievement-name">{ach.name}</div> </div>
                        <div className="achievement-reward-condensed">
                            {ach.reward?.gold > 0 && <span>💰<small>{ach.reward.gold}</small></span>}
                            {ach.reward?.diamonds > 0 && <span>💎<small>{ach.reward.diamonds}</small></span>}
                            {ach.xpGain > 0 && <span className='xp-reward'>💡<small>{ach.xpGain}</small></span>}
                        </div>
                        <button
                            className="claim-button"
                             onClick={(e) => {
                                e.stopPropagation();
                                if (claimAchievementReward) {
                                  claimAchievementReward(ach.id);
                                } else {
                                  console.error("Экшен 'claimAchievementReward' не определен в сторе!");
                                }
                              }}
                            disabled={!ach.canClaim}
                        >
                            {ach.claimed ? "✔️" : (ach.isCompleted ? "Забрать" : "...")}
                        </button>
                    </div>
                ))}
            </div>

            {/* === ПОПАП ДЕТАЛЕЙ ДОСТИЖЕНИЯ === */}
            {selectedAchievement && (
                 <motion.div
                      className="achievement-popup-overlay"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={handleCloseAchPopup}
                 >
                     <div className="achievement-popup-content" onClick={(e) => e.stopPropagation()}>
                        <button className="popup-close-btn" onClick={handleCloseAchPopup}>×</button>
                         <div className="popup-header">
                             <div className="popup-icon">{selectedAchievement.icon || '🏆'}</div>
                             <h3 className="popup-name">{selectedAchievement.name}</h3>
                         </div>
                         <p className="popup-description">{selectedAchievement.description}</p>
                          {selectedAchievement.condition.type === 'counter' && (
                            <div className="popup-progress">
                                <div className="progress-bar-bg">
                                    <div className="progress-bar-fg" style={{ width: `${Math.min(100, Math.floor(((achievementsStatus[selectedAchievement.id]?.progress || 0) / selectedAchievement.condition.target) * 100))}%` }}></div>
                                </div>
                                <span>{achievementsStatus[selectedAchievement.id]?.progress || 0} / {selectedAchievement.condition.target}</span>
                            </div>
                          )}
                          {selectedAchievement.condition.type !== 'counter' && (
                              <p className={`popup-status ${achievementsStatus[selectedAchievement.id]?.completed ? 'completed-text' : 'locked-text'}`}>
                                   Статус: {achievementsStatus[selectedAchievement.id]?.completed ? 'Выполнено' : 'Не выполнено'}
                              </p>
                          )}
                         <div className="popup-rewards">
                             <h4>Награда:</h4>
                             {selectedAchievement.reward?.gold > 0 && <span>💰 {selectedAchievement.reward.gold} Золота</span>}
                             {selectedAchievement.reward?.diamonds > 0 && <span>💎 {selectedAchievement.reward.diamonds} Алмазов</span>}
                             {selectedAchievement.xpGain > 0 && <span>💡 {selectedAchievement.xpGain} Опыта</span>}
                             {!(selectedAchievement.reward?.gold > 0) && !(selectedAchievement.reward?.diamonds > 0) && !(selectedAchievement.xpGain > 0) && !(selectedAchievement.reward?.items?.length > 0) && <span>(Нет специфической награды)</span>}
                         </div>
                     </div>
                 </motion.div>
            )}

            {/* === ПОПАП НАГРАД ЗА УРОВЕНЬ === */}
            {isLevelRewardsPopupOpen && (
                <motion.div
                    className="level-rewards-popup-overlay"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={closeLevelRewardsPopup}
                >
                    <div className="level-rewards-popup-content" onClick={(e) => e.stopPropagation()}>
                        <button className="popup-close-btn" onClick={closeLevelRewardsPopup}>×</button>
                        <h2>Награды за Уровни Достижений</h2>
                        <div className="level-rewards-list">
                            {/* VVV ИЗМЕНЕНИЕ 2: Используем levelRewards и новую логику VVV */}
                            {levelRewards // <<< Итерируем по массиву из levelRewardsData.js
                                .map((levelData) => { // levelData содержит { level, levelIcon, description, rewards }
                                    const levelNum = levelData.level;
                                    const isUnlocked = achievementLevel >= levelNum;
                                    return (
                                        <div key={levelNum} className={`level-reward-item ${isUnlocked ? 'unlocked' : 'locked'}`}>
                                            {/* Блок уровня */}
                                            <div className="level-badge-area">
                                                {/* Отображаем иконку уровня из данных */}
                                                {levelData.levelIcon && <span className="level-icon">{levelData.levelIcon}</span>}
                                                <span className="level-badge-text">Ур. {levelNum}</span>
                                                <span className="level-status-text">{isUnlocked ? 'Достигнут' : 'Не достигнут'}</span>
                                            </div>
                                            {/* Блок наград */}
                                            <div className="reward-details-area">
                                                {/* Итерируем по массиву наград этого уровня */}
                                                {levelData.rewards.map((reward, index) => {
                                                    switch (reward.type) {
                                                        case RewardType.GOLD:
                                                            return <span key={index} className="reward-detail-item">💰 {reward.amount}</span>;
                                                        case RewardType.DIAMONDS:
                                                            return <span key={index} className="reward-detail-item">💎 {reward.amount}</span>;
                                                        case RewardType.SKIN:
                                                            return <span key={index} className="reward-detail-item">🎨 {reward.name || reward.skinId}</span>;
                                                        case RewardType.ITEM:
                                                            return <span key={index} className="reward-detail-item">📦 {reward.itemId}</span>; // Отображаем ID, т.к. детали предмета не загружаем здесь
                                                        default:
                                                            return null;
                                                    }
                                                })}
                                                {levelData.rewards.length === 0 && <span className="reward-detail-item">(Нет наград)</span>}
                                            </div>
                                        </div>
                                    );
                            })}
                            {/* ^^^ КОНЕЦ ИЗМЕНЕНИЯ 2 ^^^ */}
                        </div>
                    </div>
                </motion.div>
            )}
             {/* === КОНЕЦ ПОПАПА НАГРАД ЗА УРОВЕНЬ === */}

        </motion.div>
    );
};

export default Achievements;