import React, { useState, useEffect, useMemo } from 'react';
// ▼▼▼ ДОБАВЬТЕ ИМПОРТЫ ИЗ FRAMER-MOTION ▼▼▼
import { motion, AnimatePresence } from 'framer-motion';
// ▲▲▲ КОНЕЦ ИМПОРТОВ FRAMER-MOTION ▲▲▲
// import useGameStore from '../store/useGameStore';
import './ReferralsTab.scss';

const MOCK_REFERRAL_DATA = {
    level1: { count: 7, activeLast24h: 5 },
    level2: { count: 23, activeLast24h: 15 },
    level3: { count: 120, activeLast24h: 50 },
    referralLink: 'https://mygame.com/join?ref=USER123XYZ',
    lastTributeCollectionTime: null,
    totalReferralsOverall: 7 + 23 + 120,
    chestsClaimedCount: 14,
};

const TRIBUTE_COOLDOWN_HOURS = 24;
const TRIBUTE_COOLDOWN_MS = TRIBUTE_COOLDOWN_HOURS * 60 * 60 * 1000;
const REFERRALS_PER_CHEST = 10;

const ReferralLevelDisplay = ({ level, count, activeLast24h, className }) => (
    <div className={`referral-level-block ${className || ''}`}>
        <h3>Level {level}</h3>
        <div className="referral-counter">
            <span>{count.toLocaleString()}</span> members
        </div>
        <div className="referral-active-count">
            Active last 24h: <span>{activeLast24h.toLocaleString()}</span>
        </div>
    </div>
);

const ReferralsTab = () => {
    const [referralData, setReferralData] = useState(MOCK_REFERRAL_DATA);
    const [lastCollectionTime, setLastCollectionTime] = useState(referralData.lastTributeCollectionTime);
    const [collectedAmount, setCollectedAmount] = useState(0);
    const [isCollecting, setIsCollecting] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState('');
    const [showCopiedMessage, setShowCopiedMessage] = useState(false);
    const [allianceChestReward, setAllianceChestReward] = useState(null);
    const [isClaimingChest, setIsClaimingChest] = useState(false);
    const [showInfoPopup, setShowInfoPopup] = useState(false); // Состояние для попапа

    const totalReferrals = useMemo(() => referralData.totalReferralsOverall, [referralData.totalReferralsOverall]);
    const chestsClaimed = useMemo(() => referralData.chestsClaimedCount, [referralData.chestsClaimedCount]);

    const nextChestMilestone = useMemo(() => (chestsClaimed + 1) * REFERRALS_PER_CHEST, [chestsClaimed]);
    const referralsSinceLastChest = useMemo(() => totalReferrals - (chestsClaimed * REFERRALS_PER_CHEST), [totalReferrals, chestsClaimed]);
    const progressToNextChest = useMemo(() => Math.max(0, referralsSinceLastChest), [referralsSinceLastChest]);
    const canClaimAllianceChest = useMemo(() => totalReferrals >= nextChestMilestone, [totalReferrals, nextChestMilestone]);

    const canCollectTribute = useMemo(() => {
        if (!lastCollectionTime) return true;
        return Date.now() - lastCollectionTime >= TRIBUTE_COOLDOWN_MS;
    }, [lastCollectionTime]);

    useEffect(() => {
        if (canCollectTribute) {
            setCooldownRemaining('');
            return;
        }
        const interval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastCollection = now - (lastCollectionTime || 0);
            const remaining = TRIBUTE_COOLDOWN_MS - timeSinceLastCollection;
            if (remaining <= 0) {
                setCooldownRemaining('');
                // Не вызываем clearInterval здесь, чтобы canCollectTribute стало true и useEffect пересчитался
                return;
            }
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            setCooldownRemaining(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [lastCollectionTime, canCollectTribute]);

    const handleCollectTribute = () => {
        if (!canCollectTribute || isCollecting) return;
        setIsCollecting(true);
        setCollectedAmount(0);
        setTimeout(() => {
            let totalGoldCollected = 0;
            if (referralData.level1.activeLast24h > 0) {
                for (let i = 0; i < referralData.level1.activeLast24h; i++) {
                    totalGoldCollected += Math.floor(Math.random() * (200 - 50 + 1)) + 50;
                }
            }
            if (referralData.level2.activeLast24h > 0) {
                for (let i = 0; i < referralData.level2.activeLast24h; i++) {
                    totalGoldCollected += Math.floor(Math.random() * (80 - 30 + 1)) + 30;
                }
            }
            if (referralData.level3.activeLast24h > 0) {
                for (let i = 0; i < referralData.level3.activeLast24h; i++) {
                    totalGoldCollected += Math.floor(Math.random() * (20 - 5 + 1)) + 5;
                }
            }
            if (totalGoldCollected > 0) {
                console.log(`Collected ${totalGoldCollected} gold from referrals.`);
                setCollectedAmount(totalGoldCollected);
                const now = Date.now();
                setLastCollectionTime(now);
                setReferralData(prev => ({ ...prev, lastTributeCollectionTime: now }));
                setTimeout(() => setCollectedAmount(0), 3000);
            } else {
                console.log("No active referrals to collect tribute from or no gold generated.");
                setCollectedAmount(-1);
                setTimeout(() => setCollectedAmount(0), 3000);
            }
            setIsCollecting(false);
        }, 1000);
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralData.referralLink)
            .then(() => {
                setShowCopiedMessage(true);
                setTimeout(() => setShowCopiedMessage(false), 2000);
            })
            .catch(err => console.error('Failed to copy referral link: ', err));
    };

    const handleRecruit = () => {
        if (window.Telegram && window.Telegram.WebApp) {
            const webApp = window.Telegram.WebApp;
            const referralLink = referralData.referralLink;
            const recruitMessage = `Hey! 👋 Join me in this awesome game and let's conquer together! Use my link to get started: ${referralLink}`;
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(recruitMessage)}`;
            webApp.openTelegramLink(shareUrl);
        } else {
            console.warn("Telegram WebApp SDK not found. Recruitment will fallback to copy link.");
            handleCopyLink();
        }
    };

    const handleClaimAllianceChest = () => {
        if (!canClaimAllianceChest || isClaimingChest) return;
        setIsClaimingChest(true);

        setTimeout(() => {
            const possibleRewards = [
                { type: 'gold', amount: Math.floor(Math.random() * 1000) + 500, name: 'Gold' },
                { type: 'diamonds', amount: Math.floor(Math.random() * 50) + 10, name: 'Diamonds' },
                { type: 'rareKey', amount: 1, name: 'Rare Key' }
            ];
            const randomReward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)];

            console.log('Claimed Alliance Chest! Reward:', randomReward);
            setAllianceChestReward(randomReward);

            setReferralData(prev => ({
                ...prev,
                chestsClaimedCount: prev.chestsClaimedCount + 1,
            }));

            setTimeout(() => setAllianceChestReward(null), 3000);
            setIsClaimingChest(false);
        }, 1000);
    };

    return (
        <div className="referrals-tab-container">
            <div className="referrals-content">
 

                
                <div className="alliance-chest-section">
                    <div className="alliance-chest-title-container">
                        <h4>Alliance Growth Rewards</h4>
                        <button
                            className="info-button"
                            onClick={() => setShowInfoPopup(prev => !prev)} // Переключаем состояние попапа
                            aria-label="More information"
                        >
                            &#x24D8; {/* Символ "i" в кружочке (ⓘ) */}
                        </button>
                    </div>
                    {/* Старый инфо-попап удален отсюда */}

                    <div className="chest-progress-bar-container">
                        <div
                            className="chest-progress-bar-fill"
                            style={{ width: `${Math.min(100, (progressToNextChest / REFERRALS_PER_CHEST) * 100)}%` }}
                        ></div>
                        <span className="chest-progress-text">
                            {progressToNextChest} / {REFERRALS_PER_CHEST}
                        </span>
                    </div>
                    <div className="chest-info">
                        <span className="chest-icon">🎁</span>
                        <span>Next chest at {nextChestMilestone} total referrals</span>
                    </div>
                    <button
                        className="claim-chest-button"
                        onClick={handleClaimAllianceChest}
                        disabled={!canClaimAllianceChest || isClaimingChest}
                    >
                        {isClaimingChest ? 'Claiming...' : (canClaimAllianceChest ? 'Claim Chest' : `Need ${REFERRALS_PER_CHEST - progressToNextChest} more`)}
                    </button>
                    {allianceChestReward && (
                        <p className="alliance-chest-reward-message">
                            You got: {allianceChestReward.amount} {allianceChestReward.name}!
                        </p>
                    )}
                </div>

                <div className="referral-levels-container">
                    <div className="referral-level-row">
                        <ReferralLevelDisplay
                            level={1}
                            count={referralData.level1.count}
                            activeLast24h={referralData.level1.activeLast24h}
                            className="level-1-block"
                        />
                    </div>
                    <div className="referral-level-row two-column">
                        <ReferralLevelDisplay
                            level={2}
                            count={referralData.level2.count}
                            activeLast24h={referralData.level2.activeLast24h}
                            className="level-2-block"
                        />
                        <ReferralLevelDisplay
                            level={3}
                            count={referralData.level3.count}
                            activeLast24h={referralData.level3.activeLast24h}
                            className="level-3-block"
                        />
                    </div>
                </div>
                    <div className="tribute-section">
                    <button
                        className="collect-tribute-button"
                        onClick={handleCollectTribute}
                        disabled={!canCollectTribute || isCollecting}
                    >
                        {isCollecting ? 'Collecting...' : (canCollectTribute ? 'Collect Tribute' : `Cooldown: ${cooldownRemaining}`)}
                    </button>
                    {collectedAmount > 0 && (
                        <p className="tribute-collected-message">
                            Collected {collectedAmount.toLocaleString()} gold!
                        </p>
                    )}
                    {collectedAmount === -1 && (
                        <p className="tribute-collected-message no-tribute">
                            No active referrals to collect from.
                        </p>
                    )}
                </div>

                <div className="recruitment-section">
                    <h4>Your Referral Link:</h4>
                    <div className="referral-link-display">
                        <input type="text" value={referralData.referralLink} readOnly />
                        <button onClick={handleCopyLink}>
                            {showCopiedMessage ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <button
                        className="recruit-button"
                        onClick={handleRecruit}
                    >
                        Recruit Members
                    </button>
                </div>
            </div>

            {/* ▼▼▼ МОДАЛЬНОЕ ОКНО ИНФОРМАЦИИ (теперь здесь) ▼▼▼ */}
            <AnimatePresence>
                {showInfoPopup && (
                    <>
                        <motion.div
                            className="info-popup-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setShowInfoPopup(false)} // Закрытие по клику на фон
                        />
                        <motion.div
                            className="info-popup modal-style" // Добавлен класс modal-style
                            initial={{ opacity: 0, y: -30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "circOut" }}
                        >
                            <button
                                className="info-popup-close-button"
                                onClick={() => setShowInfoPopup(false)}
                                aria-label="Close popup"
                            >
                                &times; {/* Символ "X" */}
                            </button>
                            <h3>Alliance & Tribute Info</h3>
                            <p><strong>Alliance Chests:</strong> Earn a reward chest for every {REFERRALS_PER_CHEST} members you recruit! Each chest contains a random valuable prize.</p>
                            <p><strong>Tribute:</strong> Collect tribute from your active referrals (online in the last 24h) every {TRIBUTE_COOLDOWN_HOURS} hours. The more active members, the greater the reward!</p>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            {/* ▲▲▲ КОНЕЦ МОДАЛЬНОГО ОКНА ▲▲▲ */}
        </div>
    );
};

export default ReferralsTab;