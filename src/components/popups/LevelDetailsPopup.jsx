// src/components/LevelDetailsPopup.jsx
import React, { useState, useMemo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../../store/useGameStore.js';
import './LevelDetailsPopup.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // <<< Из код1: Для иконки замка
import { faLock } from '@fortawesome/free-solid-svg-icons';      // <<< Из код1: Иконка замка

// --- ВАРИАНТЫ АНИМАЦИИ (остаются из код2, т.к. в код1 "как было") ---
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

// ... хелперы formatStatValue, statNames, getRewardIcon, rarityColors (если они нужны, могут быть здесь) ...

// Добавляем isHardUnlocked и completionStatus (из код1) в пропсы
const LevelDetailsPopup = forwardRef(({ level, chapterId, onClose, onStartLevel, isHardUnlocked, completionStatus }, ref) => {
  const playerPowerLevel = useGameStore(state => state.powerLevel);
  const [selectedDifficulty, setSelectedDifficulty] = useState('Normal');

  const displayLevelInfo = useMemo(() => {
    // Логика из код1 (идентична код2, но оставим одну версию для ясности)
    const defaultInfo = { title: 'Неизвестный Уровень', number: 'Уровень ?-?' };
    if (!level || typeof level.id !== 'number') return defaultInfo;

    const chapterNum = chapterId || Math.floor(level.id / 100);
    const levelNumInChapter = level.id % 100;
    const levelNumberString = `Уровень ${chapterNum}-${levelNumInChapter}`;
    const levelTitle = level.name || `Уровень ${chapterNum}-${levelNumInChapter}`;
    return { title: levelTitle, number: levelNumberString };
  }, [level, chapterId]);

  // Логика requiredPL из код1
  const requiredPL = useMemo(() => {
    const basePL = level?.requiredPowerLevel || 0;
    if (selectedDifficulty === 'Hard') {
        // Используем множитель из данных уровня или дефолтный (4 из код1)
        return Math.floor(basePL * (level?.hardModeMultiplierPL || 4));
    }
    return basePL;
  }, [level, selectedDifficulty]);

  const canStartLevel = playerPowerLevel >= requiredPL;

  // Функция handleDifficultySelect из код1
  const handleDifficultySelect = (difficulty) => {
    if (difficulty === 'Hard' && !isHardUnlocked) {
        return; // Не даем выбрать заблокированный Hard
    }
    setSelectedDifficulty(difficulty);
  };

  // Обновленная функция handleStartClick из код1
  const handleStartClick = () => {
    // На Normal можно стартовать всегда, если PL не хватает, но предупреждение останется (из комментария код1)
    // Однако, код1 потом блокирует кнопку старта если selectedDifficulty !== 'Normal' И !canStartLevel.
    // Применим логику блокировки кнопки как основную.
    if (!canStartLevel && selectedDifficulty !== 'Normal') {
        alert("Ваш Powerlevel ниже минимального для этой сложности!");
        return;
    }
    if (selectedDifficulty === 'Hard' && !isHardUnlocked) {
        alert("Hard режим для этого уровня еще не открыт!");
        return;
    }
    onStartLevel(level.id, selectedDifficulty);
  };


  if (!level) return null;

  return (
    <motion.div
      className="level-details-popup-overlay"
      onClick={onClose}
      ref={ref}
      variants={popupOverlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="level-details-popup-wrapper"
        onClick={(e) => e.stopPropagation()}
        variants={popupContentVariants}
      >
        <div className="popup-title-banner"> {/* Из код2 */}
          <h3>{displayLevelInfo.title}</h3>
        </div>

        <div className="level-details-popup-content">
          <div className="level-id-display"> {/* Из код2 */}
            {displayLevelInfo.number}
          </div>

          {/* === БЛОК СЛОЖНОСТИ из код1 === */}
          <div className="mode-selection-section">
            <h4 className="mode-title">Mode</h4>
            <div className="difficulty-buttons-container">
              <motion.button
                className={`difficulty-button normal ${selectedDifficulty === 'Normal' ? 'selected' : ''}`}
                onClick={() => handleDifficultySelect('Normal')}
                animate={{ scale: selectedDifficulty === 'Normal' ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                Normal
              </motion.button>
              <motion.button
                className={`difficulty-button hard ${selectedDifficulty === 'Hard' ? 'selected' : ''} ${!isHardUnlocked ? 'locked' : ''}`}
                onClick={() => handleDifficultySelect('Hard')}
                disabled={!isHardUnlocked}
                animate={{ scale: selectedDifficulty === 'Hard' && isHardUnlocked ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                Hard
                {!isHardUnlocked && <FontAwesomeIcon icon={faLock} className="lock-icon" />}
              </motion.button>
            </div>
          </div>
          {/* === КОНЕЦ БЛОКА СЛОЖНОСТИ === */}

          <div className="level-description"> {/* Из код2 */}
            <p>{level.description || "Описание для этого уровня еще не добавлено."}</p>
          </div>

          {/* Требуемый PowerLevel с toLocaleString() из код1 */}
          <div className={`required-powerlevel ${canStartLevel ? 'sufficient' : 'insufficient'}`}>
            <span>Требуемый Power Level: <span className="power-value">{requiredPL.toLocaleString()}</span></span>
            <span className="power-warning">
              (Ваш PL: {playerPowerLevel.toLocaleString()})
            </span>
          </div>

          {/* Кнопки действий с обновленной логикой disabled/className из код1 */}
          <div className="popup-actions">
            <button className="button-back" onClick={onClose}>Назад</button>
            <button
              className={`button-start ${(!canStartLevel && selectedDifficulty !== 'Normal') || (selectedDifficulty === 'Hard' && !isHardUnlocked) ? 'disabled' : ''}`}
              onClick={handleStartClick}
              disabled={(!canStartLevel && selectedDifficulty !== 'Normal') || (selectedDifficulty === 'Hard' && !isHardUnlocked)}
            >
              Начать уровень
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

// displayName из код1
LevelDetailsPopup.displayName = 'LevelDetailsPopup';

export default LevelDetailsPopup;