// src/components/LevelDetailsPopup.jsx
import React, { useState, useMemo, forwardRef } from 'react';
import useGameStore from '../store/useGameStore';
import './LevelDetailsPopup.scss';

const LevelDetailsPopup = forwardRef(({ level, chapterId, onClose, onStartLevel }, ref) => {
  const playerPowerLevel = useGameStore(state => state.powerLevel);
  const [selectedDifficulty, setSelectedDifficulty] = useState('Normal');

  const displayLevelInfo = useMemo(() => {
    const defaultInfo = { title: 'Неизвестный Уровень', number: 'Уровень ?-?' };
    if (!level || typeof level.id !== 'number') return defaultInfo;

    const chapterNum = chapterId || Math.floor(level.id / 100);
    const levelNumInChapter = level.id % 100;

    // --- ИЗМЕНЕНИЯ ЗДЕСЬ ---
    // 1. Используем полное слово "Уровень"
    // 2. Не добавляем ведущий ноль к levelNumInChapter
    const levelNumberString = `Уровень ${chapterNum}-${levelNumInChapter}`;
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

    // Название уровня берем из level.name или генерируем
    const levelTitle = level.name || `Уровень ${chapterNum}-${levelNumInChapter}`;

    return {
      title: levelTitle,
      number: levelNumberString // Теперь содержит "Уровень X-Y"
    };
  }, [level, chapterId]);

  // Расчет требуемого PL и возможности старта (остается)
  const requiredPL = level?.requiredPowerLevel ? (selectedDifficulty === 'Hard' ? Math.floor(level.requiredPowerLevel * 4) : level.requiredPowerLevel) : 0;
  const canStartLevel = playerPowerLevel >= requiredPL;

  const handleStartClick = () => {
    if (!canStartLevel) {
      alert("Ваш Powerlevel ниже минимального!");
      return;
    }
    onStartLevel(level.id, selectedDifficulty);
  };

  if (!level) return null;

  return (
    <div className="level-details-popup-overlay" onClick={onClose} ref={ref}>
      <div className="level-details-popup-wrapper" onClick={(e) => e.stopPropagation()}>
        {/* Нависающий баннер */}
        <div className="popup-title-banner">
          <h3>{displayLevelInfo.title}</h3>
        </div>

        <div className="level-details-popup-content">
          {/* Номер уровня */}
          <div className="level-id-display">
            {displayLevelInfo.number} {/* Отображаем "Уровень X-Y" */}
          </div>

          {/* Переключатель сложности */}
          <div className="difficulty-switcher">
            <button className={selectedDifficulty === 'Normal' ? 'active' : ''} onClick={() => setSelectedDifficulty('Normal')}>Normal</button>
            <button className={selectedDifficulty === 'Hard' ? 'active' : ''} onClick={() => setSelectedDifficulty('Hard')} /* disabled={...} */ >Hard</button>
          </div>

          {/* Описание уровня */}
          <div className="level-description">
            <p>{level.description || "Описание для этого уровня еще не добавлено."}</p>
          </div>

          {/* --- НАЧАЛО ИЗМЕНЕНИЙ ИЗ КОД1 --- */}
          {/* Требуемый PowerLevel */}
          <div className={`required-powerlevel ${canStartLevel ? 'sufficient' : 'insufficient'}`}> {/* Изменен класс: 'sufficient' при true, 'insufficient' при false */}
            {/* Основной текст обернут в span */}
            <span>Требуемый Power Level: <span className="power-value">{requiredPL}</span></span>

            {/* Предупреждение ВСЕГДА рендерится, видимость управляется CSS */}
            <span className="power-warning">
              (Ваш PL: {playerPowerLevel})
            </span>
          </div>
          {/* --- КОНЕЦ ИЗМЕНЕНИЙ ИЗ КОД1 --- */}

          {/* Кнопки действий */}
          <div className="popup-actions">
            <button className="button-back" onClick={onClose}>Назад</button>
            <button className={`button-start ${!canStartLevel ? 'disabled' : ''}`} onClick={handleStartClick} disabled={!canStartLevel}>Начать уровень</button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default LevelDetailsPopup;