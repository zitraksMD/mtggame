// src/components/ChestResultsPopup.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../store/useGameStore.js';
import './ChestResultsPopup.scss'; // Убедись, что стили обновлены для flip-анимации

// --- Анимации ---
// Анимация появления слота/карточки
const rewardItemSlotVariants = {
    hidden: { opacity: 0, scale: 0.5, y: 20 },
    visible: (i) => ({
        opacity: 1, scale: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.25, ease: "easeOut" }
    }),
    exit: { opacity: 0, scale: 0.8 }
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
            return !reward.isNew && reward.shardAmount > 0 ? `x${reward.shardAmount}` : null;
        default: return null;
    }
};

// --- Компонент попапа ---
const ChestResultsPopup = ({ rewards, onClose, lastOpenInfo }) => {
    // Состояния
    const [visibleSlots, setVisibleSlots] = useState(0);
    const [revealState, setRevealState] = useState({});
    const [revealIndex, setRevealIndex] = useState(-1);
    const [allowClose, setAllowClose] = useState(false);
    const [activeTooltipIndex, setActiveTooltipIndex] = useState(null);

    // Тайминги
    const slotAppearInterval = 80;
    const revealDelay = 300;
    const revealInterval = 200;
    const finalCloseDelay = 300;

    // Управление таймерами
    const timersRef = useRef([]);
    const clearAllTimers = () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    };
     useEffect(() => { return () => clearAllTimers(); }, []); // Очистка при размонтировании

    // Эффект №1: Запуск анимации появления слотов и начала раскрытия
     useEffect(() => {
        clearAllTimers();
        setVisibleSlots(0); setRevealState({}); setRevealIndex(-1); setAllowClose(false); setActiveTooltipIndex(null);

        if (!rewards || rewards.length === 0) { setAllowClose(true); return; };

        const isX10 = lastOpenInfo?.amount === 10 && rewards.length > 1;
        const totalRewards = rewards.length;

        if (isX10) {
            const initialReveal = {}; rewards.forEach((_, i) => initialReveal[i] = 'placeholder'); setRevealState(initialReveal);
            for (let i = 0; i < totalRewards; i++) { timersRef.current.push(setTimeout(() => setVisibleSlots(c => c + 1), i * slotAppearInterval)); }
            const totalAppearDuration = (totalRewards > 0 ? (totalRewards - 1) : 0) * slotAppearInterval;
            const revealStartDelay = totalAppearDuration + revealDelay;
            timersRef.current.push(setTimeout(() => { setRevealIndex(0); }, revealStartDelay));
        } else { // Логика для x1
            timersRef.current.push(setTimeout(() => {
                setVisibleSlots(1); setRevealState({ 0: 'placeholder' });
                timersRef.current.push(setTimeout(() => {
                    setRevealState({ 0: 'revealed' });
                    timersRef.current.push(setTimeout(() => setAllowClose(true), finalCloseDelay));
                }, revealDelay));
            }, slotAppearInterval));
        }
    }, [rewards, lastOpenInfo]);


    // Эффект №2: Последовательный ПЕРЕВОРОТ карточек для x10
    useEffect(() => {
        const isX10 = lastOpenInfo?.amount === 10;
        if (!isX10 || revealIndex < 0 || !rewards || revealIndex >= rewards.length) return;

        setRevealState(prev => ({ ...prev, [revealIndex]: 'revealed' })); // Запускаем переворот

        if (revealIndex < rewards.length - 1) { // Планируем следующий
            const nextRevealTimer = setTimeout(() => { setRevealIndex(prev => prev + 1); }, revealInterval);
            timersRef.current.push(nextRevealTimer);
        } else { // Если последний, разрешаем закрытие
            const closeTimer = setTimeout(() => setAllowClose(true), finalCloseDelay + 300);
            timersRef.current.push(closeTimer);
        }
    }, [revealIndex]); // Зависит только от индекса раскрытия

    // --- Обработчики ---
    const handleClose = () => {
        setActiveTooltipIndex(null);
        if (allowClose) { clearAllTimers(); onClose(); }
    };
    const handleItemClick = (index, event) => {
        event.stopPropagation();
        if (revealState[index] === 'revealed') { setActiveTooltipIndex(prevIndex => (prevIndex === index ? null : index)); }
    };
    const handlePopupBackgroundClick = () => { setActiveTooltipIndex(null); };
    const handleOpenAgain = () => {
        if (!lastOpenInfo || !allowClose) return;
        const { chestId, amount, type } = lastOpenInfo;
        const actions = useGameStore.getState();
        clearAllTimers(); onClose();
        setTimeout(() => {
            try {
                const action = (type === 'artifact')
                  ? (amount === 10 ? actions.openArtifactChestX10 : actions.openArtifactChest)
                  : (type === 'gear')
                      ? (amount === 10 ? actions.openGearChestX10 : actions.openGearChest)
                      : null;
                if (action) action(chestId); else console.error("Unknown chest type:", type);
            } catch (error) { console.error("Ошибка при повторном открытии:", error); }
        }, 50);
    };

    // Определяем, одна награда или несколько
    const isSingleReward = rewards?.length === 1;

    // --- JSX Рендеринг ---
    return (
        <div className="popup-overlay chest-results-overlay" onClick={handleClose}>
            <div className="popup-content chest-results-popup" onClick={handlePopupBackgroundClick} >
                {/* Крестик */}
                <button className="popup-close-icon" onClick={handleClose} aria-label="Закрыть" disabled={!allowClose}>
                    &times;
                </button>

                <h3>Полученные награды!</h3>

                 {/* Сетка наград */}
                <div className={`rewards-grid ${isSingleReward ? 'single-item' : ''}`}>
                    {rewards && rewards.slice(0, visibleSlots).map((reward, index) => {
                        const quantityText = getRewardQuantityText(reward);
                        const isTooltipActive = activeTooltipIndex === index;
const baseIdentifier = reward.id || reward.artifactId || reward.name || 'reward'; // Базовый идентификатор, если есть
const itemKey = reward.uid || `${reward.type}-${baseIdentifier}-${index}`;                        const currentRevealState = revealState[index] || 'placeholder';
                        const rarityClass = `rarity-${(reward.rarity || 'common').toLowerCase()}`;

                        return (
                            // Контейнер слота с анимацией появления и переворота
                            <motion.div
                                layout
                                key={itemKey}
                                className={`reward-item`} // Рамка/фон теперь на обратной стороне
                                variants={rewardItemSlotVariants}
                                initial="hidden" animate="visible" exit="exit" custom={index}
                                // Анимация переворота
                                animate={currentRevealState === 'revealed' ? 'revealed' : 'placeholder'}
                                variants={flipVariants}
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                onClick={(e) => handleItemClick(index, e)}
                                style={{ perspective: '1000px' }} // Можно и здесь задать
                            >
                                {/* Внутренняя обертка для 3D */}
                                <div className="reward-item-flipper-inner" style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}>
                                    {/* Сторона Заглушки */}
                                    <div className="reward-flipper reward-face reward-placeholder">?</div>

                                    {/* Сторона Контента (с классом редкости) */}
                                    <div className={`reward-flipper reward-face reward-content-wrapper ${rarityClass}`}>
                                        <img
                                            src={reward.icon || '/assets/default-item.png'}
                                            alt={reward.name || reward.type}
                                            className="reward-icon"
onError={(e) => {
    e.target.src = '/assets/default-item.png';
}}                                        />
                                        {quantityText && ( <span className="reward-quantity">{quantityText}</span> )}
                                        {reward.type === 'full_artifact' && reward.isNew && ( <span className="reward-new-indicator">!</span> )}
                                        {/* Тултип рендерится всегда, когда активен, поверх карточки */}
                                    </div>
                                </div>
                                 {/* Тултип вынесен из флиппера, чтобы он не переворачивался */}
                                 {isTooltipActive && ( <div className="reward-tooltip">{reward.name || reward.type}</div> )}
                            </motion.div>
                        );
                    })}
                </div>

                 {/* Кнопки внизу */}
                 {allowClose && (
                     <div className="popup-actions">
                         {/* Кнопка "Открыть еще" */}
                         {lastOpenInfo && (
                             <button className="open-again-button" onClick={handleOpenAgain} disabled={!allowClose}>
                                 Открыть ещё {lastOpenInfo.amount > 1 ? `x${lastOpenInfo.amount}` : 'x1'}
                             </button>
                         )}
                         {/* Кнопка OK/Закрыть УБРАНА по твоему запросу */}
                     </div>
                 )}

            </div>
        </div>
    );
};

export default ChestResultsPopup;