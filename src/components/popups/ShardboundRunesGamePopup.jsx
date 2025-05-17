// src/components/popups/ShardboundRunesGamePopup.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import './TreasureChestInfoPopup'; // Изменено из код1

const GAME_DURATION_SECONDS = 15;
const DIAMOND_CHANCE_PERCENT = 5;
const CRITICAL_TIME_SECONDS = 5; // Добавлено из код1 (Когда таймер становится красным)

const ShardboundRunesGamePopup = ({ onGameEnd }) => {
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS);
    const collectedRewardsRef = useRef({ gold: 0, diamonds: 0 });
    const [displayGold, setDisplayGold] = useState(0);
    const [displayDiamonds, setDisplayDiamonds] = useState(0); // Счетчик алмазов теперь всегда будет в состоянии

    const runeImageRef = useRef(null);
    const gameStoreActions = useGameStore.getState();

    useEffect(() => {
        if (timeLeft <= 0) {
            if (collectedRewardsRef.current.gold > 0) {
                gameStoreActions.addGold(collectedRewardsRef.current.gold);
            }
            if (collectedRewardsRef.current.diamonds > 0) {
                gameStoreActions.addDiamonds(collectedRewardsRef.current.diamonds);
            }
            onGameEnd(collectedRewardsRef.current);
            return;
        }
        const timerId = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);
        return () => clearInterval(timerId);
    }, [timeLeft, onGameEnd, gameStoreActions]);

    const handleRuneClick = useCallback(() => {
        if (timeLeft <= 0) return;

        if (runeImageRef.current) {
            runeImageRef.current.classList.add('clicked');
            setTimeout(() => {
                if (runeImageRef.current) {
                    runeImageRef.current.classList.remove('clicked');
                }
            }, 100);
        }

        const chance = Math.random() * 100;

        if (chance < DIAMOND_CHANCE_PERCENT) {
            const diamondsAmount = Math.floor(Math.random() * 3) + 1;
            collectedRewardsRef.current.diamonds += diamondsAmount;
            setDisplayDiamonds(collectedRewardsRef.current.diamonds);
        } else {
            const goldAmount = Math.floor(Math.random() * 10) + 1;
            collectedRewardsRef.current.gold += goldAmount;
            setDisplayGold(collectedRewardsRef.current.gold);
        }
    }, [timeLeft]);

    return (
        <div className="runes-game-content">
            {/* Обновлен класс и структура таймера из код1 */}
            <div className={`game-timer animating-timer ${timeLeft <= CRITICAL_TIME_SECONDS && timeLeft > 0 ? 'critical-time' : ''}`}>
                <img src="/assets/icons/timer_icon.png" alt="Время" className="timer-icon" />
                {/* Добавляем класс 'critical-time-text' к тексту таймера из код1 */}
                <span className={timeLeft <= CRITICAL_TIME_SECONDS && timeLeft > 0 ? 'critical-time-text' : ''}>
                    {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                </span>
            </div>
            
            <div 
                className={`rune-clickable-area ${timeLeft <= 0 ? 'inactive' : ''}`}
                onClick={handleRuneClick}
                ref={runeImageRef}
            >
                {/* Изменен src изображения руны из код1 */}
                <img src="/assets/icons/runes-icon.png" alt="Активируемая Руна" />
            </div>

            {/* Отображение добычи остается как в код2, так как код1 не предоставлял альтернативной реализации */}
            <div className="current-loot-feedback">
                <div className="loot-item">
                    <img src="/assets/coin-icon.png" alt="Золото" className="loot-icon" />
                    <span className="loot-count">{displayGold}</span>
                </div>
                {/* Блок алмазов отображается всегда */}
                <div className="loot-item">
                    <img src="/assets/diamond-image.png" alt="Алмазы" className="loot-icon" />
                    <span className="loot-count">{displayDiamonds}</span>
                </div>
            </div>
        </div>
    );
};

export default ShardboundRunesGamePopup;