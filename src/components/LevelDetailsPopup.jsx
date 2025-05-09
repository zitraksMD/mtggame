// src/components/LevelDetailsPopup.jsx
import React, { useState, useMemo, forwardRef } from 'react';
import { motion } from 'framer-motion'; // Добавлено из код1
import useGameStore from '../store/useGameStore';
import './LevelDetailsPopup.scss';

// --- ВАРИАНТЫ АНИМАЦИИ (из код1) ---
const popupOverlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }
};

const popupContentVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 18, stiffness: 260, delay: 0.1 }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 15,
    transition: { duration: 0.15, ease: 'easeIn' }
  }
};
// ---

// ... хелперы formatStatValue, statNames, getRewardIcon, rarityColors (как упомянуто в код1, если они нужны) ...

const LevelDetailsPopup = forwardRef(({ level, chapterId, onClose, onStartLevel }, ref) => {
  const playerPowerLevel = useGameStore(state => state.powerLevel);
  const [selectedDifficulty, setSelectedDifficulty] = useState('Normal');

  const displayLevelInfo = useMemo(() => {
    const defaultInfo = { title: 'Неизвестный Уровень', number: 'Уровень ?-?' };
    if (!level || typeof level.id !== 'number') return defaultInfo;

    const chapterNum = chapterId || Math.floor(level.id / 100);
    const levelNumInChapter = level.id % 100;

    // Используем полное слово "Уровень"
    // Не добавляем ведущий ноль к levelNumInChapter
    const levelNumberString = `Уровень ${chapterNum}-${levelNumInChapter}`;

    const levelTitle = level.name || `Уровень ${chapterNum}-${levelNumInChapter}`;

    return {
      title: levelTitle,
      number: levelNumberString
    };
  }, [level, chapterId]);

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
    // ОВЕРЛЕЙ ТЕПЕРЬ motion.div (из код1)
    <motion.div
      className="level-details-popup-overlay"
      onClick={onClose}
      ref={ref} // ref передается на оверлей
      variants={popupOverlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* ОБЕРТКА КОНТЕНТА ТЕПЕРЬ motion.div (из код1) */}
      <motion.div
        className="level-details-popup-wrapper"
        onClick={(e) => e.stopPropagation()}
        variants={popupContentVariants} // Анимация применяется к обертке
      >
        {/* Нависающий баннер (из код2) */}
        <div className="popup-title-banner">
          <h3>{displayLevelInfo.title}</h3>
        </div>

        <div className="level-details-popup-content"> {/* Этот блок уже внутри анимированного wrapper'а */}
          {/* Номер уровня (из код2) */}
          <div className="level-id-display">
            {displayLevelInfo.number}
          </div>

          {/* Переключатель сложности (из код2) */}
          <div className="difficulty-switcher">
            <button className={selectedDifficulty === 'Normal' ? 'active' : ''} onClick={() => setSelectedDifficulty('Normal')}>Normal</button>
            <button className={selectedDifficulty === 'Hard' ? 'active' : ''} onClick={() => setSelectedDifficulty('Hard')}>Hard</button>
          </div>

          {/* Описание уровня (из код2) */}
          <div className="level-description">
            <p>{level.description || "Описание для этого уровня еще не добавлено."}</p>
          </div>

          {/* Требуемый PowerLevel (из код2, с классами sufficient/insufficient) */}
          <div className={`required-powerlevel ${canStartLevel ? 'sufficient' : 'insufficient'}`}>
            <span>Требуемый Power Level: <span className="power-value">{requiredPL}</span></span>
            <span className="power-warning">
              (Ваш PL: {playerPowerLevel})
            </span>
          </div>

          {/* Кнопки действий (из код2) */}
          <div className="popup-actions">
            <button className="button-back" onClick={onClose}>Назад</button>
            <button className={`button-start ${!canStartLevel ? 'disabled' : ''}`} onClick={handleStartClick} disabled={!canStartLevel}>Начать уровень</button>
          </div>
        </div>
      </motion.div> {/* Конец level-details-popup-wrapper */}
    </motion.div> /* Конец level-details-popup-overlay */
  );
});

// displayName (как упомянуто в код1, хорошая практика для forwardRef)
LevelDetailsPopup.displayName = 'LevelDetailsPopup';

export default LevelDetailsPopup;