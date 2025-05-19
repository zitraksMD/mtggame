// src/components/screens/DiscoveryScreen.jsx
import React, { useState } from 'react';
import './DiscoveryScreen.scss';
import TaskCenterModal from './TaskCenterModal';
import EventDetailModal from './EventDetailModal';
import { useNavigate } from 'react-router-dom';

// Обновляем иконки: добавляем FaGift из код1
// Обновляем иконки: добавляем FaCalendarAlt
import {
  FaArrowLeft,
  FaTasks,
  FaRobot,
  FaGift,
  FaUserCircle,
  FaCalendarAlt // Новая иконка календаря
} from 'react-icons/fa';// Если понадобятся другие иконки для новых табов, можно будет добавить сюда

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Task HUB'); // Оставляем Task HUB как активный по умолчанию из код1
  const [isTasksPopupOpen, setIsTasksPopupOpen] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState(null);

  const userNickname = "User123";
  const currentUserXP = 75;
  const maxXPForLevel = 100;
  const xpProgressPercent = (currentUserXP / maxXPForLevel) * 100;
  const currentLevel = 10;
  const nextLevel = 11;

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
  };

  // Данные для задач (оставляем как есть, идентичны в обоих файлах)
  const allTasksData = {
    daily: [
      {
        id: 'd1_login',
        name: 'Вход в кошелек',
        progressCurrent: 0,
        progressTarget: 1,
        progressText: '0/1',
        isCompleted: true,
        isClaimed: false, 
        rewards: {
          points: 25,
          xp: 15
        }
      },
      {
        id: 'd2_swap',
        name: 'Обмен криптовалюты',
        progressCurrent: 0,
        progressTarget: 1,
        progressText: '0/1',
        isCompleted: false,
        isClaimed: false, 
        rewards: {
          points: 25,
          xp: 15
        }
      },
      {
        id: 'd3_simplecoin_spend',
        name: 'Трата Simplecoin',
        progressCurrent: 870,
        progressTarget: 1000,
        progressText: '0/1000',
        isCompleted: false,
        isClaimed: false, 
        rewards: {
          points: 25,
          xp: 15
        }
      },
      {
        id: 'd4_deposit',
        name: 'Депозит в кошелек',
        progressCurrent: 0,
        progressTarget: 1,
        progressText: '0/1',
        isCompleted: false,
        isClaimed: false, 
        rewards: {
          points: 25,
          xp: 15
        }
      }
    ],
    weekly: [
      {
        id: 'w1_login_streak',
        name: 'Вход в кошелек',
        progressCurrent: 0,
        progressTarget: 5,
        progressText: '0/5',
        isCompleted: false,
        isClaimed: false, 
        rewards: {
          points: 25,
          xp: 30
        }
      },
      {
        id: 'w2_swap_volume',
        name: 'Обмен криптовалюты',
        progressCurrent: 0,
        progressTarget: 5,
        progressText: '0/5',
        isCompleted: false,
        isClaimed: false, 
        rewards: {
          points: 25,
          xp: 30
        }
      },
      {
        id: 'w3_simplecoin_spending',
        name: 'Трата Simplecoin',
        progressCurrent: 0,
        progressTarget: 10000,
        progressText: '0/10000',
        isCompleted: false,
        isClaimed: false, 
        rewards: {
          points: 25,
          xp: 30
        }
      },
      {
        id: 'w4_deposit_activity',
        name: 'Депозит в кошелек',
        progressCurrent: 0,
        progressTarget: 2,
        progressText: '0/2',
        isCompleted: false,
        isClaimed: false, 
        rewards: {
          points: 25,
          xp: 30
        }
      }
    ],
    monthly: [
      {
        id: 'm1_login_marathon',
        name: 'Вход в кошелек',
        progressCurrent: 0,
        progressTarget: 30,
        progressText: '0/30',
        isCompleted: false,
        isClaimed: false, 
        rewards: {
          points: 25,
          xp: 50
        }
      },
      {
        id: 'm2_monthly_swaps',
        name: 'Обмен криптовалюты',
        progressCurrent: 0,
        progressTarget: 20,
        progressText: '0/20',
        isCompleted: false,
        isClaimed: false, 
        rewards: {
          points: 25,
          xp: 50
        }
      },
      {
        id: 'm3_big_simplecoin_spending',
        name: 'Трата Simplecoin',
        progressCurrent: 0,
        progressTarget: 50000,
        progressText: '0/50000',
        isCompleted: false,
        isClaimed: false, 
        rewards: {
          points: 30,
          xp: 30
        }
      },
      {
        id: 'm4_deposit_master',
        name: 'Депозит в кошелек',
        progressCurrent: 0,
        progressTarget: 5,
        progressText: '0/5',
        isCompleted: false,
        isClaimed: false, 
        rewards: {
          points: 30,
          xp: 30
        }
      }
    ]
  };
  

  // Данные для событий events переименованы в eventsData из код1
  const eventsData = [
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
    if (selectedEventForView) {
      closeEventDetailView();
    } else {
      // Используем более подробный console.log из код1
      console.log('Back button clicked from Discovery main screen, navigating to /main');
      navigate('/main');
    }
  };

  // Функция из код1
  const handleLevelRewardsClick = () => {
    // TODO: Добавить логику для отображения наград за уровень
    console.log('Level rewards icon clicked');
    // Например, открыть модальное окно с наградами:
    // setIsLevelRewardsModalOpen(true);
  };

   // Новая функция для клика по Activities Calendar
   const handleCalendarClick = () => {
    console.log('Activities Calendar clicked');
    // TODO: Добавить логику для календаря активностей
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
    <div className="discovery-screen">
      {/* Шапка из код1 */}
      <header className="discovery-main-header">
        <div className="header-left-content">
          <h1 className="main-title">Discovery</h1>
          {/* Обертка для никнейма из код1 */}
          <div className="nickname-frame">
            <p className="user-nickname">{userNickname}</p>
          </div>
          <div className="level-xp-progress-wrapper">
            <span className="level-badge current-level-badge">Lv. {currentLevel}</span>
            <div className="xp-bar-container">
              <div className="xp-bar-fill" style={{ width: `${xpProgressPercent}%` }}></div>
              <span className="xp-bar-text-on-bar">{currentUserXP} / {maxXPForLevel} XP</span>
            </div>
            <span className="level-badge next-level-badge">Lv. {nextLevel}</span>
          </div>
        </div>
        <div className="header-right-content">
          {/* Иконка подарка (награды за уровень) из код1 */}
          <button className="header-icon-button level-rewards-button" onClick={handleLevelRewardsClick} aria-label="Level Rewards">
            <FaGift />
          </button>
          {/* Кнопка назад с стилями и aria-label из код1 */}
          <button className="header-icon-button back-button" onClick={handleGoBack} aria-label="Go Back">
            <FaArrowLeft />
          </button>
        </div>
      </header>

      {/* Обновленные табы из код1 */}
      <nav className="discovery-tabs-container">
        {['Task HUB', 'Simplecoin', 'Boosts', 'Events', 'Academy'].map((tabName) => (
          <button
            key={tabName}
            className={`tab-button ${activeTab === tabName ? 'active' : ''}`}
            onClick={() => handleTabClick(tabName)}
          >
            {tabName}
          </button>
        ))}
      </nav>

      <main className="discovery-tab-content">
        {activeTab === 'Task HUB' && (
          <div className="tab-pane" id="task-hub-pane">
            <section className="hub-actions-section">
              {/* Новый элемент "Activities Calendar" */}
              <div className="action-item" onClick={handleCalendarClick}>
                <div className="action-button-square">
                  <FaCalendarAlt className="action-icon" />
                </div>
                <p className="action-label">Calendar</p>
              </div>
              <div className="action-item" onClick={openTasksPopup}>
                <div className="action-button-square">
                  <FaTasks className="action-icon" />
                </div>
                <p className="action-label">Quest Center</p>
              </div>
              <div className="action-item" onClick={() => console.log('Bot Zone clicked')}>
                <div className="action-button-square">
                  <FaRobot className="action-icon" />
                </div>
                <p className="action-label">Bot Zone</p>
              </div>
            </section>
            <section className="events-section">
              <h2 className="section-title">Live Promos:</h2>
              <div className="live-events-grid">
                {/* Используем eventsData здесь (переименовано из events в код2 для соответствия код1) */}
                {eventsData.map(event => (
                  <button
                    key={event.id}
                    className="live-event-button"
                    onClick={() => openEventDetailView(event)}
                  >
                    {event.title}
                  </button>
                ))}
                {eventsData.length === 0 && <p className="no-events-info">There are no live promos currently.</p>}
              </div>
            </section>
          </div>
        )}
        {activeTab === 'Simplecoin' && (
          <div className="tab-pane" id="simplecoin-pane">
            <p>Содержимое вкладки Simplecoin будет здесь.</p>
            {/* TODO: Добавить контент для Simplecoin из код1 */}
          </div>
        )}
        {/* Новый таб "Boosts" из код1 */}
        {activeTab === 'Boosts' && (
          <div className="tab-pane" id="boosts-pane">
            <p>Содержимое вкладки Boosts будет здесь.</p>
            {/* TODO: Добавить контент для Boosts из код1 */}
          </div>
        )}
        {/* Новый таб "Events" из код1 (Отличается от секции "Live Promos" в Task HUB) */}
        {activeTab === 'Events' && (
          <div className="tab-pane" id="events-pane">
            <p>Содержимое вкладки Events будет здесь. Здесь могут быть другие типы событий или календарь.</p>
            {/* TODO: Добавить контент для Events из код1 */}
          </div>
        )}
        {/* Новый таб "Academy" из код1 */}
        {activeTab === 'Academy' && (
          <div className="tab-pane" id="academy-pane">
            <p>Содержимое вкладки Academy будет здесь. Обучающие материалы, гайды и т.д.</p>
            {/* TODO: Добавить контент для Academy из код1 */}
          </div>
        )}
        {/* Удален таб "Character" и его содержимое, так как его нет в код1 */}
      </main>

      {isTasksPopupOpen && (
        <TaskCenterModal
          isOpen={isTasksPopupOpen}
          onClose={closeTasksPopup}
          tasksData={allTasksData}
          TaskItemComponent={TaskItem}
        />
      )}
      {/* EventDetailModal теперь рендерится в начале, если selectedEventForView не null (логика идентична в обоих) */}
    </div>
  );
};

export default DiscoveryScreen;