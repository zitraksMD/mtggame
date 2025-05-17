// src/components/GameHeader.jsx
import React from 'react';
import './GameHeader.scss'; // Стили для этого компонента

const GameHeader = ({
    username,
    powerLevel,
    avatarUrl,
    energyCurrent,
    energyMax,
    getEnergyFillColor,
    shouldShowRefillTimer,
    refillTimerDisplay,
    gold,
    diamonds,
    tonShards,
    currentChapterName,
    // onBattlePassClick, // Оставим для будущей кнопки Battle Pass
}) => {
    return (
        <div className="game-header-container">
            {/* Полоса энергии остается наверху (код из код2 сохранен) */}
            <div className="game-header-energy-bar-placement">
                <div className="game-header-energy-bar">
                    <img src="/assets/energy-icon.png" alt="" className="energy-icon" />
                    <div className="energy-track">
                        <div
                            className="energy-fill"
                            style={{
                                width: `${(energyMax > 0) ? (energyCurrent / energyMax * 100) : 0}%`,
                                backgroundColor: getEnergyFillColor(energyCurrent, energyMax),
                            }}
                        ></div>
                        <span className="energy-text">{`${energyCurrent ?? '?'}/${energyMax ?? '?'}`}</span>
                    </div>
                </div>
                {shouldShowRefillTimer && refillTimerDisplay && (
                    <div className="energy-refill-timer-header">
                        Восполнится через {refillTimerDisplay}
                    </div>
                )}
            </div>

            {/* Основное тело шапки (структура из код1) */}
            <div className="game-header-body">
                <div className="header-left-wing">
                    {/* Аватар, Ник/Уровень, Battle Pass (код из код2 сохранен) */}
                    <div className="player-identification-block">
                        <img src={avatarUrl} alt="Аватар" className="header-avatar" />
                        <div className="header-player-details">
                            <span className="header-player-name">{username || "Гость"}</span>
                            <span className="header-player-power">
                                <span className="power-icon">⚡</span>{powerLevel?.toLocaleString() ?? '...'}
                            </span>
                        </div>
                    </div>
                    <button className="header-battle-pass-button" /* onClick={onBattlePassClick} */>
                        BATTLE PASS
                    </button>
                </div>
                
                {/* Центральная часть .game-header-body теперь для фона/формы или пустая (из код1) */}
                <div className="header-center-spacer"></div>
                
                <div className="header-right-wing">
                    {/* Ресурсы (код из код2 сохранен) */}
                    <div className="header-resource-item">
                        <img src="/assets/coin-icon.png" alt="Золото" className="header-resource-icon" />
                        <span>{gold?.toLocaleString() ?? '0'}</span>
                    </div>
                    <div className="header-resource-item">
                        <img src="/assets/diamond-image.png" alt="Алмазы" className="header-resource-icon" />
                        <span>{diamonds?.toLocaleString() ?? '0'}</span>
                    </div>
                    <div className="header-resource-item">
                        <img src="/assets/toncoin-icon.png" alt="Осколки" className="header-resource-icon" />
                        <span>{tonShards?.toLocaleString() ?? '0'}</span>
                    </div>
                </div>
            </div>

            {/* Нависающий баннер с названием главы (из код1) */}
            {currentChapterName && (
                <div className="chapter-name-banner">
                    <h2 className="header-chapter-name">{currentChapterName}</h2>
                </div>
            )}
        </div>
    );
};

export default GameHeader;