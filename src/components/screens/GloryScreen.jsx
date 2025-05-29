// GloryScreen.jsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../store/useGameStore.js'; // Нужен в основном для Trials и общих данных, если есть
import trialsData from '../../data/trialsData.js';
import TrophiesTab from '../TrophiesTab'; // <<< УБЕДИСЬ, ЧТО ПУТЬ ВЕРНЫЙ (оставлено из вашего кода)
import './GloryScreen.scss';

// import { pageVariants, pageTransition } from '../../animations'; // Закомментировано, как и было

const tabContentVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { opacity: 0, x: -20, position: 'absolute', width: '100%', transition: { duration: 0.2, ease: "easeInOut" } },
};

const GloryScreen = () => {
    const [activeTab, setActiveTab] = useState('Trials');
    const [expandedTrialId, setExpandedTrialId] = useState(null);

    // Данные из стора, необходимые для GloryScreen (в основном для Trials)
    // Логика для Trophies теперь предполагается внутри TrophiesTab
    const {
        trialsStatus,
        markTrialActionTaken,
        claimTrialReward,
        // Функции и состояния для Trophies (achievements) удалены отсюда,
        // так как TrophiesTab должен сам их получать из стора или через props.
    } = useGameStore((state) => ({
        trialsStatus: state.trialsStatus || {},
        markTrialActionTaken: state.markTrialActionTaken,
        claimTrialReward: state.claimTrialReward,
        // Убедись, что TrophiesTab получает нужные ему данные из useGameStore самостоятельно
    }));

    // --- Логика, относящаяся ТОЛЬКО к Trials, остается здесь ---
    const toggleTrialExpansion = (trialId) => {
        setExpandedTrialId(prevId => (prevId === trialId ? null : trialId));
    };

    const getTrialRewardPreviewText = (reward) => {
        if (!reward) return "";
        let text = "";
        if (reward.type === 'gold') text = `${reward.amount} Gold`;
        else if (reward.type === 'diamonds') text = `${reward.amount} Diamonds`;
        else if (reward.type === 'toncoin_shards') text = `${reward.amount} TON Shards`;
        else if (reward.type === 'rareChestKeys') text = `${reward.amount} Rare Key${reward.amount > 1 ? 's' : ''}`;
        else if (reward.type === 'epicChestKeys') text = `${reward.amount} Epic Key${reward.amount > 1 ? 's' : ''}`;
        // Добавь другие типы наград, если они есть в trialsData
        return text;
    };

    const trialsToDisplay = useMemo(() => {
        return trialsData.map(trial => {
            const status = trialsStatus[trial.id] || { actionTaken: false, rewardClaimed: false };
            return {
                ...trial,
                actionTaken: status.actionTaken,
                rewardClaimed: status.rewardClaimed,
                canClaimReward: status.actionTaken && !status.rewardClaimed,
            };
        });
    }, [trialsStatus]); // trialsData убран из зависимостей, т.к. он статичен

    const handleTrialMainAction = (e, trial) => {
        e.stopPropagation();
        if (trial.rewardClaimed) return;

        if (trial.canClaimReward) {
            if(claimTrialReward) claimTrialReward(trial.id);
        } else if (!trial.actionTaken) {
            if (trial.actionUrl) {
                window.open(trial.actionUrl, '_blank');
            }
            if(markTrialActionTaken) markTrialActionTaken(trial.id);
        }
    };
    // --- Конец логики для Trials ---

    // --- Логика для Trophies (Достижений) удалена отсюда ---
    // Предполагается, что TrophiesTab самостоятельно управляет своим состоянием и данными,
    // включая selectedAchId, isLevelRewardsPopupOpen, achievementsToDisplay, обработчики и т.д.

    return (
        <motion.div
            className="glory-screen"
            initial="initial" animate="in" exit="out"
            // variants и transition для всей страницы закомментированы, как и было
        >
            <div className="tabs-navigation">
                <button
                    className={`tab-button ${activeTab === 'Trophies' ? 'active' : ''}`}
                    onClick={() => setActiveTab('Trophies')}
                >
                    🏆 Trophies
                </button>
                <button
                    className={`tab-button ${activeTab === 'Trials' ? 'active' : ''}`}
                    onClick={() => setActiveTab('Trials')}
                >
                    🎯 Trials
                </button>
            </div>

            <div className="tab-content">
                <AnimatePresence mode="wait">
                    {activeTab === 'Trophies' && (
                        <motion.div
                            key="trophies"
                            className="trophies-content-motion-wrapper" // Используем класс из первого сниппета для обертки motion.div
                            variants={tabContentVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                        >
                            {/* VVV ПРОСТО РЕНДЕРИМ КОМПОНЕНТ TrophiesTab VVV */}
                            <TrophiesTab />
                            {/* ^^^ КОМПОНЕНТ TrophiesTab ТЕПЕРЬ САМ ЗАБОТИТСЯ О СВОЕМ СОДЕРЖИМОМ ^^^ */}
                        </motion.div>
                    )}

                    {activeTab === 'Trials' && (
                        <motion.div
                            key="trials"
                            className="trials-content" // Используем существующий класс
                            variants={tabContentVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                        >
                            <img src="/assets/trials-banner.png" alt="Trials Banner" className="trials-banner-image" />
                            <p className="trials-main-description">
                                Unlock amazing and valuable rewards with Trials! It's your chance to earn great prizes by completing simple actions. Don't miss out on these easy opportunities to get rewarded!
                            </p>
                            <div className="available-trials-title-container">
                                <h4 className="available-trials-title">Available Trials:</h4>
                            </div>
                            <div className="trials-list">
                                {trialsToDisplay.map(trial => {
                                    const isExpanded = expandedTrialId === trial.id;
                                    return (
                                        <div
                                            key={trial.id}
                                            className={`trial-item ${trial.rewardClaimed ? 'claimed' : ''} ${trial.canClaimReward ? 'claimable' : ''} ${isExpanded ? 'expanded' : ''}`}
                                            onClick={() => toggleTrialExpansion(trial.id)}
                                        >
                                            <div className="trial-content-wrapper">
                                                <div className="trial-reward-icon-display">
                                                    {trial.reward?.icon || '🎁'}
                                                </div>
                                                <div className="trial-details-area">
                                                    <div className="trial-name">{trial.name}</div>
                                                    <div className="trial-rewards-summary">
                                                        Rewards: <span className="reward-icon-inline">{trial.reward?.icon}</span> {getTrialRewardPreviewText(trial.reward)}
                                                    </div>
                                                </div>
                                                <div className="trial-action-button-container">
                                                    <button
                                                        className={`trial-button ${trial.canClaimReward ? 'claim-type' : 'action-type'}`}
                                                        onClick={(e) => handleTrialMainAction(e, trial)}
                                                        disabled={trial.rewardClaimed}
                                                    >
                                                        {trial.rewardClaimed ? "✔️" : (trial.canClaimReward ? trial.actionTextClaim : trial.actionTextDefault)}
                                                    </button>
                                                </div>
                                            </div>
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        className="trial-description-expanded"
                                                        initial={{ opacity: 0, height: 0, y: -10, borderTopWidth: 0 }}
                                                        animate={{ opacity: 1, height: 'auto', y: 0, borderTopWidth: '1px',
                                                                  paddingTop:'12px', paddingBottom:'12px', marginTop: '12px' }}
                                                        exit={{ opacity: 0, height: 0, y: -10, borderTopWidth: 0,
                                                                paddingTop:0, paddingBottom:0, marginTop:0 }}
                                                        transition={{ duration: 0.25, ease: "easeInOut" }}
                                                    >
                                                        <p>{trial.description}</p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                                {trialsToDisplay.length === 0 && <p>Пока нет доступных испытаний.</p>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default GloryScreen;