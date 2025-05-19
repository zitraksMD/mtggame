// src/components/screens/TaskCenterModal.jsx
import React, { useState, useEffect, useCallback } from 'react'; // Добавлен useCallback из код1
import './TaskCenterModal.scss'; // Оставлен импорт стилей из код2
import TaskItemNew from './TaskItemNew'; // Используем путь из код1, убедитесь, что он корректен для вашей структуры

// categoryGoalInfo из код1 (они идентичны, но возьмем версию из код1 для полноты)
const categoryGoalInfo = {
  daily: { targetXP: 100, rewardIconEmoji: '🎟️', rewardQuantity: null },
  weekly: { targetXP: 100, rewardIconEmoji: '🔑', rewardQuantity: null },
  monthly: { targetXP: 100, rewardIconEmoji: '💰', rewardQuantity: '10' }
  // Если для USDC нужна сама валюта, можно добавить: rewardCurrency: 'USDC' (комментарий из код2)
};

const TaskCenterModal = ({ isOpen, onClose, tasksData: initialTasksData }) => { // tasksData переименован в initialTasksData (из код1)
  const [activeModalTab, setActiveModalTab] = useState('daily');
  // Локальное состояние для задач, чтобы мы могли обновлять их статус isClaimed (из код1)
  const [tasks, setTasks] = useState(initialTasksData);
  // Состояние для отслеживания, какие награды уже были зачислены в прогресс категории (из код1)
  const [claimedForCategoryProgress, setClaimedForCategoryProgress] = useState({}); // { taskId: boolean }

  useEffect(() => {
    // При открытии модалки или смене initialTasksData, сбрасываем/обновляем локальные задачи
    // и сбрасываем информацию о том, что было заклеймлено для прогресса категории (из код1)
    setTasks(initialTasksData);
    setClaimedForCategoryProgress({});
  }, [isOpen, initialTasksData]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]); // Этот хук был в обоих файлах, оставляем

  if (!isOpen) {
    return null;
  }

  // Получаем задачи для активной вкладки из локального состояния tasks (из код1)
  const currentTasksForTab = tasks[activeModalTab] || [];
  const currentCategoryGoal = categoryGoalInfo[activeModalTab];

  // Эта функция теперь будет считать прогресс НА ОСНОВЕ claimedForCategoryProgress (из код1)
  const calculateCurrentCategoryXP = useCallback(() => {
    let totalXPForCategory = 0;
    (tasks[activeModalTab] || []).forEach(task => {
      // Если награда за задачу была заклеймлена И УЧТЕНА в прогрессе категории
      if (task.isCompleted && task.isClaimed && claimedForCategoryProgress[task.id]) {
        if (task.rewards && typeof task.rewards.points === 'number') {
          totalXPForCategory += task.rewards.points;
        }
        // Если нужно учитывать xp:
        // if (task.rewards && typeof task.rewards.xp === 'number') {
        //   totalXPForCategory += task.rewards.xp;
        // }
      }
    });
    return totalXPForCategory;
  }, [tasks, activeModalTab, claimedForCategoryProgress]); // Зависимости для useCallback (из код1)

  const currentXPForCategory = calculateCurrentCategoryXP(); // Используем функцию и имя из код1
  const targetXPForCategory = currentCategoryGoal.targetXP;
  const progressPercentCategory = targetXPForCategory > 0 ? Math.min((currentXPForCategory / targetXPForCategory) * 100, 100) : 0; // Используем имя из код1

  // Функция handleClaimTask из код1
  const handleClaimTask = (taskId, taskCategory) => {
    // 1. Обновляем локальное состояние задач, помечая задачу как "заклеймленную"
    setTasks(prevTasks => {
      const updatedCategoryTasks = (prevTasks[taskCategory] || []).map(task =>
        task.id === taskId ? { ...task, isClaimed: true } : task
      );
      return {
        ...prevTasks,
        [taskCategory]: updatedCategoryTasks
      };
    });

    // 2. Помечаем, что награда за эту задачу теперь должна быть учтена в прогрессе категории
    setClaimedForCategoryProgress(prev => ({ ...prev, [taskId]: true }));

    console.log(`Claimed reward for task ${taskId} in category ${taskCategory}. Progress points will be added.`);
    // Здесь может быть логика отправки на сервер, если нужно
  };

  return (
    <div className="task-center-modal-overlay" onClick={onClose}>
      <div className="task-center-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Шапка и кнопка закрытия из код2 */}
        <header className="task-center-modal-header">
          <h3 className="task-center-modal-title">Quests Center</h3>
        </header>
        <button className="task-center-modal-close-btn" onClick={onClose}>
          &times;
        </button>

        {/* Навигация по вкладкам из код2 */}
        <nav className="task-center-modal-tabs-nav">
          <button
            className={`modal-tab-btn ${activeModalTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveModalTab('daily')}>
            Daily
          </button>
          <button
            className={`modal-tab-btn ${activeModalTab === 'weekly' ? 'active' : ''}`}
            onClick={() => setActiveModalTab('weekly')}>
            Weekly
          </button>
          <button
            className={`modal-tab-btn ${activeModalTab === 'monthly' ? 'active' : ''}`}
            onClick={() => setActiveModalTab('monthly')}>
            Monthly
          </button>
        </nav>

        <section className="task-center-modal-body">
          <div className="category-progress-wrapper">
            <div className="progress-bar-area">
              <div className="progress-bar-background">
                <div
                  className="progress-bar-foreground"
                  style={{ width: `${progressPercentCategory}%` }} // Используем progressPercentCategory из код1
                />
              </div>
              <span className="progress-bar-text-underneath">
                {/* Используем переменные для очков/опыта из код1 */}
                {currentXPForCategory} / {targetXPForCategory} points {/* или "опыта" / "поинтов" как в код2 */}
              </span>
            </div>
            {/* Обновленный блок награды, как в код2 (он соответствует логике код1) */}
            <div className="category-main-reward-box">
              <span className="reward-icon">{currentCategoryGoal.rewardIconEmoji}</span>
              {currentCategoryGoal.rewardQuantity && (
                <span className="reward-quantity">{currentCategoryGoal.rewardQuantity}</span>
              )}
              {/* Если нужно отобразить валюту, например, USDC для 10 USDC (комментарий из код2)
              currentCategoryGoal.rewardQuantity && currentCategoryGoal.rewardCurrency && (
                <span className="reward-currency">{currentCategoryGoal.rewardCurrency}</span>
              )
              */}
            </div>
          </div>

          {currentTasksForTab.length > 0 ? ( // Используем currentTasksForTab из код1
            <ul className="modal-task-list">
              {currentTasksForTab.map(task => ( // Используем currentTasksForTab из код1
                <TaskItemNew
                  key={task.id}
                  task={task} // Передаем весь объект task, включая isCompleted и isClaimed
                  onClaim={() => handleClaimTask(task.id, activeModalTab)} // Используем handleClaimTask из код1
                />
              ))}
            </ul>
          ) : (
            // Сообщение об отсутствии задач из код2
            <p className="no-tasks-info">Нет доступных заданий в этой категории.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default TaskCenterModal;