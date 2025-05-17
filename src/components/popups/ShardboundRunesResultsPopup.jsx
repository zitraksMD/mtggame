import React from 'react';
import './TreasureChestInfoPopup'; // Будем использовать тот же SCSS для консистентности

const ShardboundRunesResultsPopup = ({ rewards, onClose }) => {
    if (!rewards) {
        // На случай, если rewards еще не переданы или null
        return (
            <div className="runes-results-content">
                <p>Ошибка отображения наград.</p>
                <button className="popup-button primary" onClick={onClose}>ОК</button>
            </div>
        );
    }

    const { gold = 0, diamonds = 0 } = rewards; // Убрали item из деструктуризации

    return (
        // Используем свой класс для стилизации этого конкретного контента
        <div className="runes-results-content">
            {/* Заголовок "Ваша Добыча!" будет в .shardbound-runes-title-banner в MainMenu.jsx */}
            
            <img src="/assets/runes_banner.png" alt="Добыча из Рун" className="results-banner-image" /> {/* Новая картинка для результатов */}

            <p className="results-title">Энергия руны иссякла!</p>

            <div className="results-loot-list">
                {gold > 0 && (
                    <div className="loot-item-result">
                        <img src="/assets/coin-icon.png" alt="Золото" className="loot-icon-result" />
                        <span className="loot-text-result">Золото: <span className="loot-amount">{gold}</span></span>
                    </div>
                )}
                {diamonds > 0 && (
                    <div className="loot-item-result">
                        <img src="/assets/diamond-image.png" alt="Алмазы" className="loot-icon-result" />
                        <span className="loot-text-result">Алмазы: <span className="loot-amount">{diamonds}</span></span>
                    </div>
                )}
                {/* Убрали отображение предмета, так как его больше нет в дропе */}
            </div>

            <button className="popup-button primary ok-button" onClick={onClose}>
                Забрать
            </button>
        </div>
    );
};

export default ShardboundRunesResultsPopup;