// src/components/ResourceBar.jsx
import React from 'react';
import useGameStore from '../store/useGameStore';

// Можно импортировать стили, если вынесешь их в отдельный ResourceBar.scss
// import './ResourceBar.scss';

const ResourceBar = () => {
  // Получаем актуальные значения прямо из стора
  const { gold, diamonds } = useGameStore((state) => ({
    gold: state.gold,
    diamonds: state.diamonds,
  }));

  return (
    // Используем новый класс для стилизации из App.scss
    <div className="resource-bar-fixed">
      <div className="resource-item">
        <img src="/assets/coin-icon.png" alt="Gold" className="resource-icon" />
        {/* Используем ?? 0 для случая, если значение null или undefined */}
        <span className="gold-amount">{gold ?? 0}</span>
      </div>
      <div className="resource-item">
        <img src="/assets/diamond-image.png" alt="Diamonds" className="resource-icon" />
        <span className="diamond-amount">{diamonds ?? 0}</span>
      </div>
    </div>
  );
};

export default ResourceBar;