// src/components/RewardsPopupContent.jsx
import React, { useState, useMemo, useCallback } from 'react';
import './RewardsPopupContent.scss'; // Убедитесь, что этот файл существует и содержит стили для новых классов
import initialRewardData from '../data/rewardStagesData.js';

// --- Компонент для отображения одной награды ---
// (Остается без изменений из кода 2)
const RewardItem = React.memo(({ reward, isClaimed, isClaimable, isLocked, onClaim }) => {
  if (!reward) return <div className="reward-slot empty"></div>;
  const { type, amount } = reward;
  const handleClick = useCallback(() => {
    if (isClaimable && !isLocked) {
      onClaim(reward);
    }
  }, [isClaimable, isLocked, onClaim, reward]);
  const slotClasses = `reward-slot reward-type-${type} ${isClaimed ? 'claimed' : ''} ${isClaimable ? 'claimable' : ''} ${isLocked ? 'locked' : ''}`;
  return (
    <div className={slotClasses} onClick={handleClick} title={isLocked ? 'Требуется покупка Фонда' : (isClaimable ? `Забрать ${type} x ${amount}` : '')}>
      <div className="reward-icon">
        <span className="reward-amount">{amount}</span>
      </div>
      {isClaimed && <div className="checkmark">✔</div>}
      {isLocked && !isClaimed && <div className="lock-icon">🔒</div>}
      {!isClaimed && isClaimable && !isLocked && <div className="claim-indicator">Забрать</div>}
    </div>
  );
});

// --- Основной компонент контента поп-апа ---
const RewardsPopupContent = () => {
  const [currentStage, setCurrentStage] = useState('1');
  const [stagesProgress, setStagesProgress] = useState(initialRewardData);
  const [isPaidUnlocked, setIsPaidUnlocked] = useState(false);

  // --- Логика определения доступных этапов (Остается без изменений) ---
  const highestCompletedStage = useMemo(() => {
    let maxCompleted = 0;
    const sortedStageKeys = Object.keys(stagesProgress)
                              .map(Number)
                              .sort((a, b) => a - b);

    for (const stageNum of sortedStageKeys) {
      const stageLevels = stagesProgress[stageNum.toString()];
      if (!stageLevels || stageLevels.length === 0) {
        break;
      }
      const allLevelsCompleted = stageLevels.every(level => level.completed);
      if (allLevelsCompleted) {
        maxCompleted = stageNum;
      } else {
        break;
      }
    }
    return maxCompleted;
  }, [stagesProgress]);

  const currentStageRewards = useMemo(() => stagesProgress[currentStage] || [], [stagesProgress, currentStage]);

  // --- Обработчики (Остаются без изменений) ---
  const handleClaim = useCallback((reward, level, isPaid) => {
    console.log(`Attempting to claim ${isPaid ? 'paid' : 'free'} reward for stage ${currentStage} level ${level}:`, reward);
    setStagesProgress(prev => {
      const updatedStage = prev[currentStage].map(item => {
        if (item.level === level) {
          return {
            ...item,
            [isPaid ? 'paidClaimed' : 'freeClaimed']: true
          };
        }
        return item;
      });
      return {
        ...prev,
        [currentStage]: updatedStage
      };
    });
    alert(`Награда ${reward.type} x ${reward.amount} (типа) получена!`);
  }, [currentStage]);

  const handleClaimAll = useCallback(() => {
    console.log('Attempting to claim all available rewards...');
    setStagesProgress(prev => {
        const updatedData = { ...prev };
        Object.keys(updatedData).forEach(stageKey => {
          const stageNum = parseInt(stageKey);
          const isStageLocked = stageNum > 1 && stageNum > (highestCompletedStage + 1);
          if (isStageLocked) return;

          updatedData[stageKey] = updatedData[stageKey].map(levelData => {
            let freeClaimed = levelData.freeClaimed;
            let paidClaimed = levelData.paidClaimed;
            if (levelData.completed && !levelData.freeClaimed) {
              freeClaimed = true;
              console.log(`Claiming all: Free reward for stage ${stageKey} level ${levelData.level}`);
            }
            if (levelData.completed && !levelData.paidClaimed && isPaidUnlocked) {
              paidClaimed = true;
              console.log(`Claiming all: Paid reward for stage ${stageKey} level ${levelData.level}`);
            }
            return { ...levelData, freeClaimed, paidClaimed };
          });
        });
        return updatedData;
      });
    alert('Все доступные награды (типа) получены!');
  }, [isPaidUnlocked, highestCompletedStage]);

  const handlePurchase = useCallback(() => {
    console.log('Attempting to purchase Advanced Fund...');
    setIsPaidUnlocked(true);
    alert('Платная дорожка (типа) разблокирована!');
  }, []);

  // Проверяем, есть ли что забирать кнопкой "Забрать все" (Остается без изменений)
  const canClaimAny = useMemo(() => {
    return Object.entries(stagesProgress).some(([stageKey, levels]) => {
        const stageNum = parseInt(stageKey);
        const isStageAccessible = stageNum === 1 || stageNum <= (highestCompletedStage + 1);
        if (!isStageAccessible) return false;

        return levels.some(level =>
            (level.completed && !level.freeClaimed) ||
            (level.completed && isPaidUnlocked && !level.paidClaimed)
        );
    });
  }, [stagesProgress, isPaidUnlocked, highestCompletedStage]);


  return (
    <div className="rewards-popup-content"> {/* Корневой элемент */}
      {/* Переключатели Этапов */}
      <div className="stage-tabs">
        {Object.keys(initialRewardData).map(stageNumStr => {
            const stageNum = parseInt(stageNumStr);
            const isLocked = stageNum > 1 && stageNum > (highestCompletedStage + 1);
            return (
                <button
                    key={stageNumStr}
                    className={`stage-tab ${stageNumStr === currentStage ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => !isLocked && setCurrentStage(stageNumStr)}
                    disabled={isLocked}
                    title={isLocked ? `Завершите Этап ${stageNum - 1}`: `Перейти на Этап ${stageNum}`}
                >
                    {isLocked && <span className="stage-lock-icon">🔒</span>}
                    Этап {stageNumStr}
                </button>
            );
        })}
      </div>

      {/* <<< ИЗМЕНЕНИЕ НАЧАЛО: Обертка .rewards-track-wrapper УДАЛЕНА >>> */}

      {/* Контейнер с дорожками наград (теперь основной скролл-контейнер) */}
      <div className="rewards-track-container">

          {/* <<< ИЗМЕНЕНИЕ: .initial-progress-line ПЕРЕМЕЩЕНА ВНУТРЬ .rewards-track-container >>> */}
          {/* Элемент для начальной желтой линии (до уровня 1) */}
          {currentStageRewards.length > 0 && (
            <div className="initial-progress-line"></div>
          )}
          {/* <<< КОНЕЦ ИЗМЕНЕНИЯ >>> */}


          {/* Рендеринг рядов наград */}
          {currentStageRewards.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px' }}>Награды для этого этапа скоро появятся!</p>
          ) : (
              currentStageRewards.map((levelData) => (
                  // Добавляем класс row-completed, если уровень пройден (из Кода 1)
                  <div key={levelData.level} className={`reward-row ${levelData.completed ? 'row-completed' : ''}`}>

                      {/* Бесплатная награда */}
                      <RewardItem
                          reward={levelData.freeReward}
                          isClaimed={levelData.freeClaimed}
                          isClaimable={levelData.completed && !levelData.freeClaimed}
                          isLocked={false}
                          onClaim={(reward) => handleClaim(reward, levelData.level, false)}
                      />

                      {/* Центральный разделитель */}
                      <div className="level-connector">
                        {/* div для серой линии */}
                        <div className="grey-line-element"></div>

                        {/* Номер уровня */}
                        <div className={`level-number ${levelData.completed ? 'completed' : ''}`}>
                          {levelData.level}
                        </div>

                        {/* Желтый сегмент */}
                        {levelData.completed && (
                          <div className="progress-line-segment"></div>
                        )}
                      </div>

                      {/* Платная награда */}
                      <RewardItem
                          reward={levelData.paidReward}
                          isClaimed={levelData.paidClaimed}
                          isClaimable={levelData.completed && !levelData.paidClaimed}
                          isLocked={!isPaidUnlocked} // Блокируется, если фонд не куплен
                          onClaim={(reward) => handleClaim(reward, levelData.level, true)}
                      />
                  </div>
                ))
            )}
      </div> {/* Конец .rewards-track-container */}

      {/* <<< ИЗМЕНЕНИЕ КОНЕЦ: Закрывающий тег для .rewards-track-wrapper УДАЛЕН >>> */}


      {/* Нижняя панель */}
      <div className="rewards-footer">
        <button
          className="claim-all-button"
          onClick={handleClaimAll}
          disabled={!canClaimAny}
          title={!canClaimAny ? "Нет доступных наград для сбора" : "Забрать все доступные награды"}
        >
          Забрать все
        </button>

        {!isPaidUnlocked && (
          <button className="purchase-button" onClick={handlePurchase}>
            <span className="purchase-icon">&#127873;</span> {/* Иконка подарка */}
            <div className="purchase-details">
              <span className="purchase-text">Купить Фонд</span>
              <span className="price">$9.99</span> {/* Заменить на реальную цену */}
            </div>
          </button>
        )}
        {isPaidUnlocked && (
          <div className="paid-unlocked-indicator">Фонд Активен ✔</div>
        )}
      </div> {/* Конец .rewards-footer */}

    </div> /* Конец .rewards-popup-content */
  );
};

export default RewardsPopupContent;