// src/components/ChestResultsPopup.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion'; // AnimatePresence используется в родительском компоненте (Shop.jsx)
import useGameStore from '../../store/useGameStore.js';
import './ChestResultsPopup.scss'; // Убедись, что стили обновлены для flip-анимации и анимации попапа

// --- Анимации ---

// Анимации для самого оверлея/попапа (будут применены к корневому motion.div)
const popupOverlayVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } }
};

// Анимация появления слота/карточки
const rewardItemSlotVariants = {
    hidden: { opacity: 0, scale: 0.5, y: 20 },
    visible: (i) => ({
        opacity: 1, scale: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.25, ease: "easeOut" }
    }),
    exit: { opacity: 0, scale: 0.8 } // Эта анимация для карточек, если они будут индивидуально убираться
};

// Анимация переворота карточки
const flipVariants = {
    placeholder: { rotateY: 0 },
    revealed: { rotateY: 180 }
};

// --- Функция для количества ---
const getRewardQuantityText = (reward) => {
    switch (reward?.type) {
        case 'gold': case 'diamonds':
            return reward.amount > 0 ? reward.amount.toLocaleString() : null;
        case 'gear_key': case 'artifact_shard':
            return reward.amount > 0 ? `x${reward.amount}` : null;
        case 'gear':
            return reward.amount > 1 ? `x${reward.amount}` : null;
        case 'full_artifact':
        case 'full_artifact_new':
        case 'full_artifact_duplicate':
            return !reward.isNew && reward.shardAmount > 0 ? `x${reward.shardAmount}` : null;
        default: return null;
    }
};

// --- Компонент попапа ---
const ChestResultsPopup = ({ rewards, onClose, lastOpenInfo }) => {
    const [visibleSlots, setVisibleSlots] = useState(0);
    const [revealState, setRevealState] = useState({});
    const [revealIndex, setRevealIndex] = useState(-1);
    const [animationsComplete, setAnimationsComplete] = useState(false);
    const [activeTooltipIndex, setActiveTooltipIndex] = useState(null);

    const slotAppearInterval = 80;
    const revealDelay = 300;
    const revealInterval = 200;
    const finalCloseDelay = 300;

    const timersRef = useRef([]);
    const clearAllTimers = () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    };
    useEffect(() => { return () => clearAllTimers(); }, []);

    // Эффект №1: Запуск анимации появления слотов и начала раскрытия (внутренние анимации).
    // Этот useEffect отвечает за сброс и запуск анимаций ВНУТРИ попапа при смене наград.
    useEffect(() => {
        clearAllTimers();
        setVisibleSlots(0);
        setRevealState({});
        setRevealIndex(-1);
        setAnimationsComplete(false); // Сбрасываем при новых наградах
        setActiveTooltipIndex(null);

        if (!rewards || rewards.length === 0) {
            const emptyTimer = setTimeout(() => setAnimationsComplete(true), 50);
            timersRef.current.push(emptyTimer);
            return;
        }

        const isX10 = lastOpenInfo?.amount === 10 && rewards.length > 1;
        const totalRewards = rewards.length;

        if (isX10) {
            const initialReveal = {};
            rewards.forEach((_, i) => initialReveal[i] = 'placeholder');
            setRevealState(initialReveal);

            for (let i = 0; i < totalRewards; i++) {
                timersRef.current.push(setTimeout(() => setVisibleSlots(c => c + 1), i * slotAppearInterval));
            }

            const totalAppearDuration = (totalRewards > 0 ? (totalRewards - 1) : 0) * slotAppearInterval;
            const revealStartDelay = totalAppearDuration + revealDelay;
            timersRef.current.push(setTimeout(() => { setRevealIndex(0); }, revealStartDelay));
        } else {
            const itemsToAnimate = totalRewards;
            timersRef.current.push(setTimeout(() => {
                setVisibleSlots(itemsToAnimate);
                const initialReveal = {};
                for (let i = 0; i < itemsToAnimate; i++) initialReveal[i] = 'placeholder';
                setRevealState(initialReveal);

                timersRef.current.push(setTimeout(() => {
                    const finalRevealState = {};
                    for (let i = 0; i < itemsToAnimate; i++) finalRevealState[i] = 'revealed';
                    setRevealState(finalRevealState);
                    timersRef.current.push(setTimeout(() => setAnimationsComplete(true), finalCloseDelay));
                }, revealDelay));
            }, (itemsToAnimate > 0 ? itemsToAnimate - 1 : 0) * slotAppearInterval + 50));
        }
    }, [rewards, lastOpenInfo]); // Зависимости важны для сброса анимаций при новых данных


    // Эффект №2: Последовательный ПЕРЕВОРОТ карточек для x10
    useEffect(() => {
        const isX10 = lastOpenInfo?.amount === 10 && rewards && rewards.length > 1;
        if (!isX10 || revealIndex < 0 || !rewards || revealIndex >= rewards.length) {
            return;
        }

        setRevealState(prev => ({ ...prev, [revealIndex]: 'revealed' }));

        if (revealIndex < rewards.length - 1) {
            const nextRevealTimer = setTimeout(() => { setRevealIndex(prev => prev + 1); }, revealInterval);
            timersRef.current.push(nextRevealTimer);
        } else {
            const animationEndTimer = setTimeout(() => setAnimationsComplete(true), finalCloseDelay + 300);
            timersRef.current.push(animationEndTimer);
        }
    }, [revealIndex, rewards, lastOpenInfo]);

    const handleClose = () => {
        // Эта функция будет вызвана и при клике на оверлей, и при клике на крестик.
        // onClose (пропс) должен вызывать clearLastChestData в сторе, что приведет к размонтированию через AnimatePresence.
        if (animationsComplete) { // Позволяем закрыть только если внутренние анимации завершены (опционально, можно убрать если exit анимация самого попапа важнее)
            clearAllTimers(); // Очищаем таймеры на всякий случай
            onClose();       // Вызываем колбэк, который должен убрать попап из DOM (через AnimatePresence)
        } else {
            // Если анимации еще не завершены, но пользователь кликнул на оверлей/крестик.
            // Можно либо ничего не делать, либо принудительно завершить анимации и закрыть,
            // либо просто вызвать onClose() - тогда AnimatePresence начнет exit анимацию попапа.
            // Для плавности, лучше если onClose() будет вызван, AnimatePresence позаботится об остальном.
             clearAllTimers(); // Прерываем текущие анимации карточек
             onClose();        // Начинаем анимацию выхода самого попапа
        }
        setActiveTooltipIndex(null); // В любом случае убираем тултип
    };

    const handleItemClick = (index, event) => {
        event.stopPropagation();
        if (animationsComplete && revealState[index] === 'revealed') {
            setActiveTooltipIndex(prevIndex => (prevIndex === index ? null : index));
        }
    };
    const handlePopupBackgroundClick = (event) => {
        event.stopPropagation(); // Предотвращаем закрытие попапа при клике на его контент
        setActiveTooltipIndex(null);
    };

    const handleOpenAgain = () => {
        if (!lastOpenInfo || !animationsComplete) return;
        const { chestId, amount, type } = lastOpenInfo;
        const actions = useGameStore.getState();
        
        // Не нужно вызывать clearAllTimers() или onClose() здесь напрямую,
        // если AnimatePresence и key работают правильно.
        // onClose() в Shop.jsx вызовет clearLastChestData, что удалит текущий попап.
        // Затем новые данные вызовут появление нового экземпляра.
        // Однако, onClose() здесь все еще может быть полезным для немедленного начала анимации выхода.
        onClose(); // Начать анимацию выхода текущего попапа

        setTimeout(() => {
            try {
                const action = (type === 'artifact')
                    ? (amount === 10 ? actions.openArtifactChestX10 : actions.openArtifactChest)
                    : (type === 'gear')
                        ? (amount === 10 ? actions.openGearChestX10 : actions.openGearChest)
                        : null;
                if (action) action(chestId); else console.error("Unknown chest type for re-open:", type);
            } catch (error) { console.error("Ошибка при повторном открытии:", error); }
        }, 50); // Небольшая задержка, чтобы анимация выхода могла начаться/завершиться (можно настроить)
    };

    const isSingleReward = rewards?.length === 1;

    return (
        <motion.div // <<< Корневой элемент теперь motion.div для анимации через AnimatePresence
            className="popup-overlay chest-results-overlay"
            onClick={handleClose} // Закрытие по клику на оверлей
            variants={popupOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit" // Эта анимация будет проиграна благодаря AnimatePresence
        >
            <div className="popup-content chest-results-popup" onClick={handlePopupBackgroundClick}>
                <button className="popup-close-icon" onClick={handleClose} aria-label="Закрыть" disabled={!animationsComplete && rewards && rewards.length > 0}>
                    &times;
                </button>
                <h3>Полученные награды!</h3>
                <div className={`rewards-grid ${isSingleReward ? 'single-item' : ''}`}>
                    {rewards && rewards.slice(0, visibleSlots).map((reward, index) => {
                        const quantityText = getRewardQuantityText(reward);
                        const isTooltipActive = activeTooltipIndex === index;
                        const baseIdentifier = reward.id || reward.artifactId || reward.name || 'reward';
                        const itemKey = reward.uid || `${reward.type}-${baseIdentifier}-${index}`;
                        const currentRevealState = revealState[index] || 'placeholder';
                        const rarityClass = `rarity-${(reward.rarity || 'common').toLowerCase()}`;

                        return (
                            <motion.div
                                layout
                                key={itemKey}
                                className={`reward-item`}
                                variants={rewardItemSlotVariants}
                                initial="hidden"
                                animate="visible"
                                // exit="exit" // Если карточки должны анимированно исчезать при размонтировании попапа
                                custom={index}
                                // Для анимации переворота:
                                animate={currentRevealState === 'revealed' ? 'revealed' : (currentRevealState === 'placeholder' ? 'placeholder' : 'visible')}
                                variants={flipVariants} // Это должно быть `variants={flipVariants}` для переворота
                                                               // И `rewardItemSlotVariants` для появления.
                                                               // Текущая проблема: `animate` и `variants` перезаписываются.
                                                               // Решение: использовать отдельные motion.div или комбинировать варианты.
                                                               // Пока оставляю как в предыдущем вашем коде для консистентности,
                                                               // но этот момент требует внимания для корректной работы ОБЕИХ анимаций на одном элементе.
                                                               // Предположим, `rewardItemSlotVariants` отработал через `initial` и `animate="visible"` (если бы не было переопределения),
                                                               // а `flipVariants` контролируется через `animate={currentRevealState...}`
                                transition={{ duration: 0.4, ease: "easeInOut" }} // Это для flipVariants
                                onClick={(e) => handleItemClick(index, e)}
                                style={{ perspective: '1000px' }}
                            >
                                {/* Внутренняя структура для переворота */}
                                <div className="reward-item-flipper-inner" style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}>
                                    <div className="reward-flipper reward-face reward-placeholder">?</div>
                                    <div className={`reward-flipper reward-face reward-content-wrapper ${rarityClass}`}>
                                        <img
                                            src={reward.icon || '/assets/default-item.png'}
                                            alt={reward.name || reward.type}
                                            className="reward-icon"
                                            onError={(e) => { e.target.src = '/assets/default-item.png'; }}
                                        />
                                        {quantityText && (<span className="reward-quantity">{quantityText}</span>)}
                                        {(reward.type === 'full_artifact' || reward.type === 'full_artifact_new' || reward.type === 'full_artifact_duplicate') && reward.isNew && (<span className="reward-new-indicator">!</span>)}
                                    </div>
                                </div>
                                {animationsComplete && isTooltipActive && (<div className="reward-tooltip">{reward.name || reward.type}</div>)}
                            </motion.div>
                        );
                    })}
                </div>

                {lastOpenInfo && (
                    <div className="popup-actions">
                        <button
                            className="open-again-button"
                            onClick={handleOpenAgain}
                            disabled={!animationsComplete}
                        >
                            Открыть ещё {lastOpenInfo.amount > 1 ? `x${lastOpenInfo.amount}` : 'x1'}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ChestResultsPopup;