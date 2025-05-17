// src/components/GameOverPopup.jsx
import React from 'react';
import './GameOverPopup.scss'; // Подключаем стили

// Вспомогательная функция для форматирования секунд в MM:SS
const formatTime = (totalSeconds) => {
  // Проверка на валидность
  if (typeof totalSeconds !== 'number' || totalSeconds < 0 || isNaN(totalSeconds)) {
    return '00:00';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60); // Убираем дроби, если были
  // Добавляем ведущий ноль, если число меньше 10
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');
  return `${paddedMinutes}:${paddedSeconds}`;
};

// Компонент теперь принимает timePlayed
const GameOverPopup = ({ onGoToMenu, timePlayed = 0 }) => { // Добавлен timePlayed, по умолчанию 0
  return (
    <div className="game-over-overlay">
      <div className="game-over-content">
        <h2>Вы умерли!</h2>
        <p>Уровень провален.</p>
        {/* Отображаем время игры */}
        <p className="time-played">Время в игре: {formatTime(timePlayed)}</p>
        <button onClick={onGoToMenu}>
          В главное меню
        </button>
      </div>
    </div>
  );
};

export default GameOverPopup;