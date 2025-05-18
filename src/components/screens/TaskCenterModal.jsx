// src/components/screens/TaskCenterModal.jsx
import React, { useState, useEffect } from 'react';
import './TaskCenterModal.scss';

// Информация о прогрессе и наградах для каждой категории
const categoryGoalInfo = {
  daily: { targetXP: 100, rewardName: 'Ваучер', rewardIconEmoji: '🎟️' }, // Используем Emoji для иконки-заглушки
  weekly: { targetXP: 100, rewardName: 'Ключ от сундука', rewardIconEmoji: '🔑' },
  monthly: { targetXP: 100, rewardName: '10 USDC', rewardIconEmoji: '💰' }
};

const TaskCenterModal = ({ isOpen, onClose, tasksData, TaskItemComponent }) => {
  const [activeModalTab, setActiveModalTab] = useState('daily');

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
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const activeCategoryKey = activeModalTab; // 'daily', 'weekly', или 'monthly'
  const currentTasks = tasksData[activeCategoryKey] || [];
  const currentCategoryGoal = categoryGoalInfo[activeCategoryKey];

  // Расчет текущего опыта для активной категории
  const calculateCurrentXP = (tasks) => {
    return tasks.reduce((totalXP, task) => {
      if (task.isCompleted) {
        // Извлекаем число из строки "ХХ опыта"
        const xpValue = parseInt(task.reward.match(/\d+/)?.[0], 10);
        return totalXP + (isNaN(xpValue) ? 0 : xpValue);
      }
      return totalXP;
    }, 0);
  };

  const currentXP = calculateCurrentXP(currentTasks);
  const targetXP = currentCategoryGoal.targetXP;
  const progressPercent = targetXP > 0 ? Math.min((currentXP / targetXP) * 100, 100) : 0;

  return (
    <div className="task-center-modal-overlay" onClick={onClose}>
      <div className="task-center-modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="task-center-modal-header">
          <h3 className="task-center-modal-title">Центр Заданий</h3>
          <button className="task-center-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </header>

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
          {/* --- СЕКЦИЯ ПРОГРЕСС-БАРА И НАГРАДЫ ЗА КАТЕГОРИЮ --- */}
          <div className="category-progress-wrapper">
            {/* --- ИЗМЕНЕННАЯ СТРУКТУРА ПРОГРЕСС-БАРА --- */}
            <div className="progress-bar-area"> {/* Этот блок теперь будет содержать бар и текст под ним */}
              <div className="progress-bar-background">
                <div
                  className="progress-bar-foreground"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="progress-bar-text-underneath">{currentXP} / {targetXP} опыта</span> {/* Текст теперь здесь */}
            </div>
            {/* --- КОНЕЦ ИЗМЕНЕННОЙ СТРУКТУРЫ --- */}
            <div className="category-main-reward">
              <span className="reward-icon">{currentCategoryGoal.rewardIconEmoji}</span>
              <span className="reward-text">{currentCategoryGoal.rewardName}</span>
              {/* Можно добавить кнопку "Забрать", если currentXP >= targetXP и награда не забрана */}
            </div>
          </div>
          {/* --- КОНЕЦ СЕКЦИИ ПРОГРЕСС-БАРА --- */}

          {currentTasks.length > 0 ? (
            <ul className="modal-task-list">
              {currentTasks.map(task => (
                <TaskItemComponent
                  key={task.id}
                  name={task.name}
                  progress={task.progress}
                  reward={task.reward} // Это награда за отдельное задание
                  isCompleted={task.isCompleted}
                  onClaim={() => console.log(`Claiming reward for ${task.name} (from modal)`)}
                />
              ))}
            </ul>
          ) : (
            <p className="no-tasks-info">Нет доступных заданий в этой категории.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default TaskCenterModal;