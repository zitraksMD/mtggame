// src/components/GameOverPopup.jsx (или ./GameOverPopup.jsx)
import React from 'react';
import './GameOverPopup.scss'; // Подключаем стили (создадим файл ниже)

// Компонент принимает один пропс: onGoToMenu - это функция,
// которая будет вызвана при нажатии на кнопку
const GameOverPopup = ({ onGoToMenu }) => {
  return (
    // Оверлей на весь экран
    <div className="game-over-overlay">
      {/* Сам блок попапа */}
      <div className="game-over-content">
        <h2>Вы умерли!</h2>
        <p>Уровень провален.</p>
        <button onClick={onGoToMenu}>
          В главное меню
        </button>
      </div>
    </div>
  );
};

export default GameOverPopup;