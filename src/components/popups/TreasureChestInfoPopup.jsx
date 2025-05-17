// src/components/popups/TreasureChestInfoPopup.jsx
import React, { useState, useEffect, useCallback } from 'react'; // Добавили useCallback и useState, useEffect
import useGameStore from '../../store/useGameStore';
// Убедись, что путь к SCSS файлу правильный и он содержит стили для классов, используемых ниже
import './TreasureChestInfoPopup.scss'; 

const TreasureChestInfoPopup = ({ onStartChest }) => {
    // Логика для получения количества попыток из стора
    const { treasureChestAttempts, treasureChestLastReset } = useGameStore(state => ({
        treasureChestAttempts: state.treasureChestAttempts,
        treasureChestLastReset: state.treasureChestLastReset,
    }));

    // Состояние и логика для таймера (как в предыдущем моем ответе)
    const [timeToReset, setTimeToReset] = useState("");

    const calculateTimeToNextReset = useCallback(() => {
        const now = new Date();
        const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 
                                now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
        let nextResetUTC = new Date(nowUTC);
        nextResetUTC.setUTCHours(2, 0, 0, 0); // Следующий сброс в 2:00:00.000 UTC
        if (nowUTC >= nextResetUTC.getTime()) {
            nextResetUTC.setUTCDate(nextResetUTC.getUTCDate() + 1);
        }
        const diff = nextResetUTC.getTime() - nowUTC;
        if (diff <= 0) return "00:00:00";
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, []);

    useEffect(() => {
        setTimeToReset(calculateTimeToNextReset());
        const intervalId = setInterval(() => {
            setTimeToReset(calculateTimeToNextReset());
        }, 1000);
        return () => clearInterval(intervalId);
    }, [calculateTimeToNextReset, treasureChestLastReset]);

    // Обработчик для кнопки "Активировать"
    const handleStart = () => {
        if (treasureChestAttempts > 0) {
            onStartChest(); 
        } else {
            alert("Энергия для активации рун иссякла на сегодня!"); // Используем текст для рун
        }
    };

    const canStart = treasureChestAttempts > 0;
    const TOTAL_ATTEMPTS = 3; // Общее количество попыток в день

    return (
        // Твой корневой div с классом treasure-chest-info-content
        <div className="treasure-chest-info-content"> 
            <div className="treasure-banner-image"> 
                <img src="/assets/runes_banner.png" alt="Древние Руны" /> {/* Картинка рун */}
            </div>
            
            <p className="description">
                Коснись древних рун и высвободи их скрытую силу! Быстро нажимай, чтобы расколоть руну и собрать ценные осколки и артефакты.
            </p>
            
            {/* Оставляем ОДНУ кнопку "Активировать" */}
            {/* Обертка для кнопки и информации под ней, чтобы управлять их общим расположением, если нужно */}
            <div className="activation-section"> 
                <button 
                    className="popup-button primary activate-button" // Используем твои классы или добавь "activate-button"
                    onClick={handleStart}
                    disabled={!canStart}
                >
                    Активировать
                </button>

                {/* Блок для информации о лимите и таймере ПОД кнопкой */}
                <div className="attempts-timer-info"> 
                    <p className="attempts-count"> {/* Переименовал класс для ясности */}
                        Лимит: <strong>{treasureChestAttempts}/{TOTAL_ATTEMPTS}</strong>
                    </p>
                    <p className="reset-timer"> {/* Новый класс для таймера */}
                        Обновление через: <strong>{timeToReset}</strong>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TreasureChestInfoPopup;