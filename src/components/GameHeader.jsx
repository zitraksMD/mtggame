// src/components/GameHeader.jsx
import React from 'react';
import './GameHeader.scss'; // Стили для этого компонента

// Функция formatPower (определена здесь или может быть импортирована из другого файла)
const formatPower = (power) => {
  if (power == null || isNaN(power)) return '...'; // Обработка null, undefined, NaN

  if (power < 1000) {
    // Для чисел меньше 1000 можно использовать toLocaleString, если нужны разделители тысяч,
    // или просто power.toString(), если нет.
    // Для примера "600" просто вернем строку.
    return power.toString();
  }

  // Форматирование в "K" с одним знаком после запятой (округление вниз)
  const valueInK = power / 1000;
  // Округляем до одного знака после запятой вниз (1150 -> 1.1, 55500 -> 55.5)
  const truncatedToOneDecimal = Math.floor(valueInK * 10) / 10;

  // Преобразуем в строку с одним знаком после запятой (например, 1.0, а не 1)
  let formattedNumber = truncatedToOneDecimal.toFixed(1);

  // Заменяем точку на запятую для отображения "1,1K"
  formattedNumber = formattedNumber.replace('.', ',');

  return `${formattedNumber}K`;
};

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
    // onShardPassClick, // Проп оставляем, но он временно не используется активным элементом
}) => {
    return (
        <div className="game-header-container">
            {/* Полоса энергии остается наверху */}
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

            {/* Основное тело шапки */}
            <div className="game-header-body">
                {/* header-left-wing обновлен согласно изменениям */}
                <div className="header-left-wing">
                    {/* Блок идентификации игрока */}
                    <div className="player-identification-block">
                        <img src={avatarUrl} alt="Аватар" className="header-avatar" />
                        {/* Этот div теперь будет иметь рамку и обновленный формат powerLevel */}
                        <div className="header-player-details framed-box">
                            <span className="header-player-name">{username || "Гость"}</span>
                            <span className="header-player-power">
                                <span className="power-label">Power: </span>
                                <span className="power-value">{formatPower(powerLevel)}</span>
                            </span>
                        </div>
                    </div>

                    {/* Информация о главе */}
                    <div className="header-chapter-info-wrapper">
                        <span className="chapter-info-label">Chapter:</span>
                        {currentChapterName ? (
                            <div className="chapter-info-name-banner" title={currentChapterName}> {/* title для всплывающей подсказки полного имени */}
                                <span className="chapter-info-name-text">{currentChapterName}</span>
                            </div>
                        ) : (
                            <div className="chapter-info-name-banner">
                                <span className="chapter-info-name-text">---</span> {/* Плейсхолдер, если имя главы не передано */}
                            </div>
                        )}
                    </div>
                </div>

                <div className="header-center-spacer">
                    {/* Этот блок остается для центрирования или будущего использования */}
                </div>

                <div className="header-right-wing">
                    {/* Ресурсы */}
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
        </div>
    );
};

export default GameHeader;