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

    // --- Логика определения доступных этапов (Объединена и уточнена из Кода 1 и Кода 2) ---
    const highestCompletedStage = useMemo(() => {
      let maxCompleted = 0; // Этап 0 считается пройденным по умолчанию для разблокировки Этапа 1
      const sortedStageKeys = Object.keys(stagesProgress)
                                .map(Number) // Конвертируем ключи в числа
                                .sort((a, b) => a - b); // Сортируем номера этапов

      for (const stageNum of sortedStageKeys) {
        const stageLevels = stagesProgress[stageNum.toString()]; // Доступ по строковому ключу
        // Если нет данных для этапа или он пуст, считаем его непройденным
        if (!stageLevels || stageLevels.length === 0) {
          // Если мы дошли до этапа без уровней, предыдущий был последним пройденным
          break;
        }
        // Проверяем, все ли уровни на ЭТОМ этапе пройдены
        const allLevelsCompleted = stageLevels.every(level => level.completed);

        if (allLevelsCompleted) {
          maxCompleted = stageNum; // Если все уровни пройдены, обновляем максимальный пройденный этап
        } else {
          // Как только встретили этап с хотя бы одним непройденным уровнем, останавливаемся
          break;
        }
      }
      return maxCompleted;
    }, [stagesProgress]); // Пересчитываем при изменении прогресса

    const currentStageRewards = useMemo(() => stagesProgress[currentStage] || [], [stagesProgress, currentStage]);

    // --- Обработчики (Остаются из Кода 2, без изменений) ---
    const handleClaim = useCallback((reward, level, isPaid) => {
      console.log(`Attempting to claim ${isPaid ? 'paid' : 'free'} reward for stage ${currentStage} level ${level}:`, reward);
      // !!! Логика обновления состояния (пример) !!!
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
      // !!! Логика обновления состояния (пример) !!!
      setStagesProgress(prev => {
          const updatedData = { ...prev };
          Object.keys(updatedData).forEach(stageKey => {
            // Проверяем, доступен ли этап для сбора наград (не заблокирован ли он)
            const stageNum = parseInt(stageKey);
            const isStageLocked = stageNum > 1 && stageNum > (highestCompletedStage + 1);
            if (isStageLocked) return; // Пропускаем заблокированные этапы

            updatedData[stageKey] = updatedData[stageKey].map(levelData => {
              let freeClaimed = levelData.freeClaimed;
              let paidClaimed = levelData.paidClaimed;
              // Забираем бесплатную, если уровень пройден и она не забрана
              if (levelData.completed && !levelData.freeClaimed) {
                freeClaimed = true;
                console.log(`Claiming all: Free reward for stage ${stageKey} level ${levelData.level}`);
              }
              // Забираем платную, если уровень пройден, она не забрана И фонд куплен
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
    }, [isPaidUnlocked, highestCompletedStage]); // Добавили highestCompletedStage в зависимости

    const handlePurchase = useCallback(() => {
      console.log('Attempting to purchase Advanced Fund...');
      setIsPaidUnlocked(true);
      alert('Платная дорожка (типа) разблокирована!');
    }, []);

    // Проверяем, есть ли что забирать кнопкой "Забрать все" (Из Кода 2, но с учетом блокировки этапов)
    const canClaimAny = useMemo(() => {
      return Object.entries(stagesProgress).some(([stageKey, levels]) => {
          const stageNum = parseInt(stageKey);
          // Этап доступен если это первый этап или он не дальше чем (highestCompletedStage + 1)
          const isStageAccessible = stageNum === 1 || stageNum <= (highestCompletedStage + 1);
          if (!isStageAccessible) return false; // Нельзя забрать с заблокированных этапов

          return levels.some(level =>
              (level.completed && !level.freeClaimed) ||
              (level.completed && isPaidUnlocked && !level.paidClaimed)
          );
      });
    }, [stagesProgress, isPaidUnlocked, highestCompletedStage]); // Добавили highestCompletedStage в зависимости


    return (
      <div className="rewards-popup-content">
        {/* Переключатели Этапов (Объединяем логику из Кода 1 и итерацию из Кода 2) */}
        <div className="stage-tabs">
          {/* Итерируем по ключам исходных данных, чтобы показать все вкладки */}
          {Object.keys(initialRewardData).map(stageNumStr => {
              const stageNum = parseInt(stageNumStr);
              // Логика блокировки из Кода 1:
              // Этап заблокирован, если его номер БОЛЬШЕ, чем (максимальный ПОЛНОСТЬЮ пройденный этап + 1).
              // Этап 1 никогда не блокируется.
              const isLocked = stageNum > 1 && stageNum > (highestCompletedStage + 1);

              return (
                  <button
                      key={stageNumStr}
                      // Классы: активный, заблокированный
                      className={`stage-tab ${stageNumStr === currentStage ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                      // Не переключаемся на заблокированный
                      onClick={() => !isLocked && setCurrentStage(stageNumStr)}
                      // Делаем кнопку неактивной
                      disabled={isLocked}
                      // Подсказка
                      title={isLocked ? `Завершите Этап ${stageNum - 1}`: `Перейти на Этап ${stageNum}`}
                  >
                      {/* Иконка замка */}
                      {isLocked && <span className="stage-lock-icon">🔒</span>}
                      Этап {stageNumStr}
                  </button>
              );
          })}
        </div>

        {/* Контейнер с дорожками наград */}
        {/* Добавляем обертку для позиционирования начальной линии (из Кода 1) */}
        <div className="rewards-track-wrapper">
          {/* Элемент для начальной желтой линии (до уровня 1) (из Кода 1) */}
          {currentStageRewards.length > 0 && (
            <div className="initial-progress-line"></div>
        )}
        {/* ================================================= */}


        <div className="rewards-track-container">
          {currentStageRewards.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px' }}>Награды для этого этапа скоро появятся!</p>
          ) : (
              currentStageRewards.map((levelData) => (
                  // Добавляем класс row-completed, если уровень пройден (из Кода 1)
                  <div key={levelData.level} className={`reward-row ${levelData.completed ? 'row-completed' : ''}`}>

                      {/* Бесплатная награда (логика из Кода 2) */}
                      <RewardItem
                          reward={levelData.freeReward}
                          isClaimed={levelData.freeClaimed}
                          isClaimable={levelData.completed && !levelData.freeClaimed}
                          isLocked={false}
                          onClaim={(reward) => handleClaim(reward, levelData.level, false)}
                      />

                      {/* Центральный разделитель */}
                      <div className="level-connector">
    {/* <<< ДОБАВЛЕНО: div для серой линии >>> */}
    <div className="grey-line-element"></div>

    {/* Номер уровня */}
    <div className={`level-number ${levelData.completed ? 'completed' : ''}`}>
        {levelData.level}
    </div>

    {/* Желтый сегмент (остается как есть) */}
    {levelData.completed && (
        <div className="progress-line-segment"></div>
    )}
</div>

                      {/* Платная награда (логика из Кода 2) */}
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
          </div>
        </div> {/* Конец rewards-track-wrapper */}

        {/* Нижняя панель (Остается из Кода 2) */}
        <div className="rewards-footer">
          <button
              className="claim-all-button"
              onClick={handleClaimAll}
              disabled={!canClaimAny} // Используем обновленный canClaimAny
              title={!canClaimAny ? "Нет доступных наград для сбора" : "Забрать все доступные награды"}
          >
              Забрать все
          </button>

          {!isPaidUnlocked && (
              <button className="purchase-button" onClick={handlePurchase}>
                  Купить Фонд
                  <span className="price">$?.??</span> {/* Заменить на реальную цену */}
              </button>
          )}
          {isPaidUnlocked && (
              <div className="paid-unlocked-indicator">Фонд Активен ✔</div>
          )}
        </div>
      </div>
    );
  };

  export default RewardsPopupContent;