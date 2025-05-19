// src/components/screens/DiscoveryScreen.jsx
import React, { useState } from 'react';
import './DiscoveryScreen.scss';
import TaskCenterModal from './TaskCenterModal';
import EventDetailModal from './EventDetailModal';
import { useNavigate } from 'react-router-dom';

// Placeholder иконки (в реальном проекте используйте SVG или библиотеку иконок)
import { FaArrowLeft, FaTasks, FaRobot } from 'react-icons/fa'; // Пример с react-icons

// Компонент TaskItem (без изменений)
const TaskItem = ({ name, progress, reward, isCompleted, onClaim }) => (
  <li className={`task-item ${isCompleted ? 'completed' : ''}`}>
    <div className="task-details">
      <span className="task-name">{name}</span>
      <span className="task-progress">{progress}</span>
    </div>
    {isCompleted ? (
      <button className="claim-button" onClick={onClaim}>Забрать: {reward}</button>
    ) : (
      <span className="task-reward">Награда: {reward}</span>
    )}
  </li>
);

const DiscoveryScreen = () => {
  const navigate = useNavigate(); // <--- ADD THIS LINE

  const [activeTab, setActiveTab] = useState('Task HUB');
  const [isTasksPopupOpen, setIsTasksPopupOpen] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState(null);

  // Плейсхолдеры для данных пользователя (в реальном приложении они будут из стейта/пропсов)
  const userNickname = "User123";
  const currentUserXP = 75; // Пример текущего опыта
  const maxXPForLevel = 100; // Пример максимального опыта для уровня
  const xpProgressPercent = (currentUserXP / maxXPForLevel) * 100;


    // --- НОВЫЕ ДАННЫЕ ДЛЯ УРОВНЕЙ ---
    const currentLevel = 10;
    const nextLevel = 11;

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
  };

  // Данные для задач (оставляем как есть)
  const allTasksData = {
    daily: [
      { id: 'd1_login', name: 'Вход в кошелек', progress: '0/1', reward: '20 опыта', isCompleted: false },
      { id: 'd2_balance_check', name: 'Проверка баланса Simplecoin', progress: '0/1', reward: '20 опыта', isCompleted: false },
      { id: 'd3_market_view', name: 'Минутка на рынке (просмотр курса)', progress: '0/1', reward: '20 опыта', isCompleted: false },
      { id: 'd4_simplecoin_shop', name: 'Новинки за Simplecoin (проверка магазина)', progress: '0/1', reward: '20 опыта', isCompleted: false },
      { id: 'd5_weekly_swap_prep', name: 'Подготовка к Викли: 1 крипто-своп ($5-10)', progress: '0/1', reward: '20 опыта', isCompleted: false },
    ],
    weekly: [
      { id: 'w1_login_streak', name: 'Стрик Входов "Викли" (7 дней)', progress: '0/7 дней', reward: '20 опыта', isCompleted: false },
      { id: 'w2_swaps_volume', name: 'Неделя Свопов (5+ свопов или объем $35-70)', progress: '0/5 свопов', reward: '20 опыта', isCompleted: false },
      { id: 'w3_financial_activity', name: 'Финансовая Активность (2 операции депозит/вывод от $10)', progress: '0/2 операции', reward: '20 опыта', isCompleted: false },
      { id: 'w4_simplecoin_spending', name: 'Покупки за Simplecoin (потратить 50-100 SC)', progress: '0/100 SC', reward: '20 опыта', isCompleted: false },
      { id: 'w5_wallet_features', name: 'Освоение Кошелька (3 разные функции)', progress: '0/3 функции', reward: '20 опыта', isCompleted: false },
    ],
    monthly: [
      { id: 'm1_login_marathon', name: 'Марафон Входов "Монсли" (28 дней)', progress: '0/28 дней', reward: '20 опыта', isCompleted: false },
      { id: 'm2_monthly_swaps_volume', name: 'Месячный Объем Свопов (20+ свопов или объем $140-280)', progress: '0/20 свопов', reward: '20 опыта', isCompleted: false },
      { id: 'm3_large_financial_ops', name: 'Крупные Финансовые Операции (5 операций, общая сумма от $100)', progress: '0/5 операций', reward: '20 опыта', isCompleted: false },
      { id: 'm4_generous_simplecoin_spending', name: 'Щедрые Траты Simplecoin (300-500 SC / 3-5 покупок)', progress: '0/500 SC', reward: '20 опыта', isCompleted: false },
      { id: 'm5_advanced_wallet_user', name: 'Продвинутый Пользователь (1 adv. функция / 5 разных функций)', progress: '0/1', reward: '20 опыта', isCompleted: false },
    ],
  };

  // Данные для событий (из код1)
  const events = [
    {
      id: 'e1',
      title: 'USDC Форсаж',
      description: 'Свопни 200+ USDC и забери 20 USDC!',
      howItWorks: [
        'Нажмите "Участвовать" ниже.',
        'Совершите обмен (своп) от 200 USDC на любую другую криптовалюту.',
        'Готово – ваш бонус 20 USDC будет зачислен в течение 24 часов после окончания акции!'
      ],
      endsIn: 'Заканчивается через 3 дня в 3:00 по UTC'
    },
    {
      id: 'e2',
      title: 'Своп-Спринт',
      description: 'Соверши 5+ свопов (каждый от $50) за неделю и раздели призовой фонд в $500!',
      howItWorks: [
        'Присоединяйтесь к акции.',
        'Сделайте как минимум 5 обменов криптовалют (свопов) в течение акционной недели.',
        'Каждый своп должен быть на сумму от $50 в эквиваленте.',
        'Все участники, выполнившие условия, разделят призовой фонд в $500.'
      ],
      endsIn: 'Заканчивается через 7 дней в 3:00 по UTC'
    },
    {
      id: 'e3',
      title: 'Карта в Крипту',
      description: 'Купи любую криптовалюту на $100+ с карты и получи бонус $10 в BTC!',
      howItWorks: [
        'Нажмите кнопку "Принять участие".',
        'Купите любую криптовалюту с помощью банковской карты на сумму от $100.',
        'Бонус в размере $10 в BTC будет начислен на ваш счет.'
      ],
      endsIn: 'Заканчивается через 5 дней в 3:00 по UTC'
    },
    {
      id: 'e4',
      title: 'Фиатный Рывок',
      description: 'Покупай крипту картой Visa/Mastercard от $200 и участвуй в розыгрыше Ledger Nano S Plus!',
      howItWorks: [
        'Убедитесь, что вы участвуете в акции.',
        'Совершите покупку любой криптовалюты с использованием карты Visa или Mastercard на сумму от $200.',
        'Вы автоматически становитесь участником розыгрыша аппаратного кошелька Ledger Nano S Plus.'
      ],
      endsIn: 'Заканчивается через 10 дней в 3:00 по UTC'
    },
    {
      id: 'e5',
      title: 'Крипто-Шопинг Уикенд',
      description: 'Покупай крипту с карты в субботу или воскресенье (от $75) и получи скидку 50% на торговые комиссии на следующей неделе!',
      howItWorks: [
        'Активируйте участие в акции.',
        'Совершите покупку криптовалюты с банковской карты на сумму от $75 в субботу или воскресенье.',
        'Получите скидку 50% на все торговые комиссии на протяжении следующей недели.'
      ],
      endsIn: 'Заканчивается в это воскресенье в 3:00 по UTC'
    },
    {
      id: 'e6',
      title: 'Активный Трейдер',
      description: 'Соверши 10+ любых операций (своп, покупка с карты, депозит от $50) и получи долю из призового пула в $1000!',
      howItWorks: [
        'Присоединитесь к промоакции.',
        'Выполните не менее 10 операций: это могут быть свопы, покупки криптовалюты с карты или депозиты (каждый на сумму от $50).',
        'Участники, выполнившие условия, разделят призовой фонд в $1000.'
      ],
      endsIn: 'Заканчивается через 14 дней в 3:00 по UTC'
    },
    {
      id: 'e7',
      title: 'Ходл & Своп',
      description: 'Держи от 0.1 BTC на балансе И соверши своп на $100+ в течение недели, чтобы выиграть $50!',
      howItWorks: [
        'Убедитесь, что вы зарегистрированы в акции.',
        'Поддерживайте баланс не менее 0.1 BTC на вашем счету в течение всей акционной недели.',
        'Совершите хотя бы один обмен (своп) на сумму от $100 в течение той же недели.',
        'Получите шанс выиграть $50.'
      ],
      endsIn: 'Заканчивается через 6 дней в 3:00 по UTC'
    }
  ];


  const openTasksPopup = () => setIsTasksPopupOpen(true);
  const closeTasksPopup = () => setIsTasksPopupOpen(false);

  const openEventDetailView = (eventData) => {
    setSelectedEventForView(eventData);
  };
  const closeEventDetailView = () => {
    setSelectedEventForView(null);
  };

  const handleGoBack = () => {
    // Логика кнопки "Назад"
    // Если открыты детали события, закрываем их
    if (selectedEventForView) {
      closeEventDetailView();
    } else {
      // Иначе, например, навигация на предыдущий экран (если DiscoveryScreen не корневой)
      // Для примера просто выведем в консоль
      console.log('Back button clicked from Discovery main screen');
      navigate('/main'); // Пример навигации
    }
  };

  if (selectedEventForView) {
    return (
      <EventDetailModal
        event={selectedEventForView}
        onClose={closeEventDetailView}
      />
    );
  }

  return (
    <div className="discovery-screen"> {/* Фон будет задан в SCSS */}
      {/* --- НОВАЯ ШАПКА --- */}
      <header className="discovery-main-header">
        <div className="header-left-content">
          <h1 className="main-title">Discovery</h1>
          <p className="user-nickname">{userNickname}</p>
          {/* --- ИЗМЕНЕННЫЙ БЛОК С XP И УРОВНЯМИ --- */}
          <div className="level-xp-progress-wrapper">
            <span className="level-badge current-level-badge">Lv. {currentLevel}</span>
            <div className="xp-bar-container">
              <div className="xp-bar-fill" style={{ width: `${xpProgressPercent}%` }}></div>
              {/* Текст на самом прогресс-баре, как на вашем скриншоте */}
              <span className="xp-bar-text-on-bar">{currentUserXP} / {maxXPForLevel} XP</span>
            </div>
            <span className="level-badge next-level-badge">Lv. {nextLevel}</span>
          </div>
          {/* --- КОНЕЦ ИЗМЕНЕННОГО БЛОКА --- */}
        </div>
        <div className="header-right-content">
          <button className="back-button" onClick={handleGoBack}>
            <FaArrowLeft /> {/* Иконка "назад" */}
          </button>
        </div>
      </header>
      {/* --- КОНЕЦ НОВОЙ ШАПКИ --- */}

      <nav className="discovery-tabs-container">
        <button
          className={`tab-button ${activeTab === 'Task HUB' ? 'active' : ''}`}
          onClick={() => handleTabClick('Task HUB')}
        >
          Task HUB
        </button>
        <button
          className={`tab-button ${activeTab === 'Simplecoin' ? 'active' : ''}`}
          onClick={() => handleTabClick('Simplecoin')}
        >
          Simplecoin
        </button>
        <button
          className={`tab-button ${activeTab === 'Character' ? 'active' : ''}`}
          onClick={() => handleTabClick('Character')}
        >
          Character
        </button>
      </nav>

      <main className="discovery-tab-content">
        {activeTab === 'Task HUB' && (
          <div className="tab-pane" id="task-hub-pane">
            {/* --- НОВЫЕ КНОПКИ ДЛЯ TASK HUB --- */}
            <section className="hub-actions-section">
              <div className="action-item" onClick={openTasksPopup}>
                <div className="action-button-square">
                  <FaTasks className="action-icon" /> {/* Иконка для Quest Center */}
                </div>
                <p className="action-label">Quest Center</p>
              </div>
              <div className="action-item" onClick={() => console.log('Bot Zone clicked')}>
                <div className="action-button-square">
                  <FaRobot className="action-icon" /> {/* Иконка для Bot Zone */}
                </div>
                <p className="action-label">Bot Zone</p>
              </div>
            </section>
            {/* --- КОНЕЦ НОВЫХ КНОПОК --- */}

            <section className="events-section">
              {/* Используем "Live Promos:" как вы просили */}
              <h2 className="section-title">Live Promos:</h2> 
              <div className="live-events-grid">
                {events.map(event => (
                  <button
                    key={event.id}
                    className="live-event-button"
                    onClick={() => openEventDetailView(event)}
                  >
                    {event.title}
                  </button>
                ))}
                {events.length === 0 && <p className="no-events-info">There are no live promos currently.</p>}
              </div>
            </section>
          </div>
        )}
        {activeTab === 'Simplecoin' && (
          <div className="tab-pane" id="simplecoin-pane">
            <p>Содержимое вкладки Simplecoin будет здесь.</p>
          </div>
        )}
        {activeTab === 'Character' && (
          <div className="tab-pane" id="character-pane">
            <p>Содержимое вкладки Character будет здесь.</p>
          </div>
        )}
      </main>

      {isTasksPopupOpen && (
        <TaskCenterModal
          isOpen={isTasksPopupOpen}
          onClose={closeTasksPopup}
          tasksData={allTasksData}
          TaskItemComponent={TaskItem}
        />
      )}
      {/* EventDetailModal теперь рендерится в начале, если selectedEventForView не null */}
    </div>
  );
};

export default DiscoveryScreen;