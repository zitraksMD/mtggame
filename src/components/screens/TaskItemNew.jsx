// src/components/items/TaskItemNew.jsx
import React from 'react';
import './TaskItemNew.scss'; // Стили, которые мы обновили на предыдущем шаге
import { FaStar, FaArrowUp, FaCheckCircle } from 'react-icons/fa';

// Helper для отображения прогресс-бара (одинаковый в обоих кодах, оставляем)
const ProgressBar = ({ current, target }) => {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="task-item-progress-bar-container">
      <div
        className="task-item-progress-bar-fill"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const TaskItemNew = ({ task, onClaim }) => {
  // Деструктуризация пропсов, включая isClaimed
  const { name, progressCurrent, progressTarget, progressText, isCompleted, rewards, isClaimed } = task;

  return (
    // Классы 'completed' и 'claimed' добавляются в зависимости от состояния задачи
    <li className={`task-item-new ${isCompleted ? 'completed' : ''} ${isClaimed ? 'claimed' : ''}`}>
      <div className="task-item-main-content">
        {/* Левая сторона (название, прогресс-бар, текст прогресса) */}
        <div className="task-item-details">
          <span className="task-item-name">{name}</span>
          <ProgressBar current={progressCurrent} target={progressTarget} />
          <span className="task-item-progress-text">{progressText}</span>
        </div>

        {/* Правая сторона (награды и кнопка/индикатор) */}
        <div className="task-item-rewards-area">
          <span className="rewards-label">Награда:</span>
          <div className="rewards-icons-container">
            {/* Изменение: Проверка на null или undefined для отображения наград, как в код1 */}
            {rewards?.points != null && (
              <div className="reward-icon-wrapper">
                <FaStar className="reward-icon points" />
                <span className="reward-amount">{rewards.points}</span>
              </div>
            )}
            {rewards?.xp != null && (
              <div className="reward-icon-wrapper">
                <FaArrowUp className="reward-icon xp" />
                <span className="reward-amount">{rewards.xp}</span>
              </div>
            )}
            {/* Изменение: Условие для текста "нет награды", как в код1 */}
            {(rewards?.points == null && rewards?.xp == null) && (
              <span className="no-specific-reward-text">-</span>
            )}
          </div>

          {/* Изменение: Добавлен task-item-action-placeholder как в код1 */}
          <div className="task-item-action-placeholder">
            {isCompleted && !isClaimed && ( // Показываем кнопку, если выполнено, но НЕ забрано
              <button className="task-item-claim-button" onClick={onClaim}>
                Забрать
              </button>
            )}
            {isClaimed && ( // Если забрано, показываем индикатор "Забрано"
              <div className="task-item-claimed-indicator">
                <FaCheckCircle /> Забрано
              </div>
            )}
            {/* Если не выполнено и не забрано, плейсхолдер будет пустым, но займет место благодаря стилям SCSS */}
          </div>
        </div>
      </div>
    </li>
  );
};

export default TaskItemNew;