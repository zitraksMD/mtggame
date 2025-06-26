import React, { useState, useMemo } from 'react';
import './DiscoveryScreen.scss';
import { FaCheckCircle, FaGift } from 'react-icons/fa';

// --- Компоненты для лучшей структуры ---

// Компонент одной онбординг-задачи
const OnboardingTask = ({ task, onComplete }) => (
    <div className={`onboarding-task ${task.completed ? 'completed' : ''}`} onClick={() => onComplete(task.id)}>
        <div className="task-icon-container">
            {task.completed ? <FaCheckCircle className="task-icon completed-icon" /> : <div className="task-icon-placeholder"></div>}
        </div>
        <span className="task-name">{task.name}</span>
    </div>
);

// Компонент для повторяющихся задач (Daily/Weekly/Monthly)
const RecurringTasks = () => {
    const [activeTab, setActiveTab] = useState('Daily');
    const tabs = ['Daily', 'Weekly', 'Monthly'];

    // Здесь должны быть ваши данные для задач
    const tasks = {
        Daily: [{ id: 1, name: 'Daily Task 1' }, { id: 2, name: 'Daily Task 2' }],
        Weekly: [{ id: 3, name: 'Weekly Task 1' }],
        Monthly: [{ id: 4, name: 'Monthly Task 1' }],
    };

    return (
        <div className="recurring-tasks-container">
            <nav className="tasks-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        className={`task-tab-button ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </nav>
            <div className="tasks-list">
                {tasks[activeTab].map(task => (
                    <div key={task.id} className="task-item">{task.name}</div>
                ))}
            </div>
        </div>
    );
};

// --- Основной компонент экрана ---

const DiscoveryScreen = () => {
    // Начальное состояние онбординг-задач
    const [onboardingTasks, setOnboardingTasks] = useState([
        { id: 1, name: 'Сделать первый депозит', completed: false },
        { id: 2, name: 'Сделать первый свап', completed: false },
        { id: 3, name: 'Сделать первую покупку крипты с карты', completed: false },
        { id: 4, name: 'Сделать первый вывод', completed: false },
    ]);

    // Состояние, показывающее, завершен ли онбординг и получена ли награда
    const [onboardingCompleted, setOnboardingCompleted] = useState(false);

    // Проверяем, все ли задачи выполнены
    const allTasksCompleted = useMemo(() => onboardingTasks.every(task => task.completed), [onboardingTasks]);

    // Функция для "выполнения" задачи (для демонстрации)
    const handleCompleteTask = (taskId) => {
        // В реальном приложении это будет управляться состоянием извне
        setOnboardingTasks(tasks =>
            tasks.map(task =>
                task.id === taskId ? { ...task, completed: true } : task
            )
        );
    };

    // Функция для получения награды
    const handleClaimReward = () => {
        console.log('Reward Claimed!');
        setOnboardingCompleted(true);
    };
    
    // Данные для баннеров конкурсов
    const contestsData = [
        { id: 1, name: 'Trading Competition', prizePool: '$50,000', imageUrl: 'https://via.placeholder.com/350x200/6A5ACD/FFFFFF?text=Contest+1' },
        { id: 2, name: 'Swap Sprint', prizePool: '$10,000', imageUrl: 'https://via.placeholder.com/350x200/483D8B/FFFFFF?text=Contest+2' },
        { id: 3, name: 'Deposit Rush', prizePool: '$5,000', imageUrl: 'https://via.placeholder.com/350x200/9370DB/FFFFFF?text=Contest+3' },
    ];


    return (
        <div className="discovery-screen">
            <div className="task-hub-wrapper">
                <h1 className="hub-title">Task HUB</h1>

                {/* Условный рендеринг: показываем онбординг ИЛИ повторяющиеся задачи */}
                {!onboardingCompleted ? (
                    <div className="onboarding-container">
                        <div className="onboarding-tasks-list">
                            {onboardingTasks.map(task => (
                                <OnboardingTask key={task.id} task={task} onComplete={handleCompleteTask} />
                            ))}
                        </div>
                        {allTasksCompleted && (
                            <div className="claim-overlay">
                                <button className="claim-button" onClick={handleClaimReward}>
                                    <FaGift />
                                    <span>Claim Reward</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <RecurringTasks />
                )}
            </div>

            <div className="contests-wrapper">
                 <h2 className="contests-title">Contests</h2>
                 <div className="contests-scroll-area">
                    {contestsData.map(contest => (
                        <div key={contest.id} className="contest-banner" style={{backgroundImage: `url(${contest.imageUrl})`}}>
                           <div className="prize-pool">{contest.prizePool}</div>
                           <div className="contest-name">{contest.name}</div>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );
};

export default DiscoveryScreen;