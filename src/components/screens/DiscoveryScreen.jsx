import React, { useState } from 'react';
import './DiscoveryScreen.scss';
import TaskCenterModal from './TaskCenterModal';
import EventDetailModal from './EventDetailModal';
import { useNavigate } from 'react-router-dom';

import {
  FaTasks,
  FaRobot,
  FaGift,
  FaUserCircle,
  FaCalendarAlt,
  FaTrophy,
  FaCoins,
  FaDice,
  FaCertificate,
  FaShoppingCart,
  FaInfoCircle // Добавлено из код1
} from 'react-icons/fa';

// Компонент TaskItem (без изменений из код1, соответствует код2)
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
  const [activeTab, setActiveTab] = useState('Task HUB');
  const [isTasksPopupOpen, setIsTasksPopupOpen] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState(null);

  const userNickname = "highroller"; // Изменено из код1
  const currentUserXP = 75;
  const maxXPForLevel = 100;
  const xpProgressPercent = (currentUserXP / maxXPForLevel) * 100;
  const currentLevel = 10;
  const nextLevel = 11;
  const userVoucherCount = 3;
  const userSimplecoinCount = 1250;

  const handleTabClick = (tabName) => setActiveTab(tabName);
  const openTasksPopup = () => setIsTasksPopupOpen(true);
  const closeTasksPopup = () => setIsTasksPopupOpen(false);
  const openEventDetailView = (eventData) => setSelectedEventForView(eventData);
  const closeEventDetailView = () => setSelectedEventForView(null);
  const handleMascotProfileClick = () => console.log('Mascot/Profile icon clicked');
  const handleLeaderboardClick = () => console.log('Leaderboard icon clicked');
  const handleLevelRewardsClick = () => console.log('Level rewards icon clicked');
  const handleSimpleCashbackClick = () => console.log('Simple Cashback icon clicked');
  const handleWeeklyCalendarClick = () => console.log('Weekly Calendar clicked');
  const handleBotZoneClick = () => console.log('Bot Zone clicked');
  const handleLuckyDrawClick = () => console.log('Lucky Draw clicked');
  const handleAchievementsClick = () => console.log('Achievements clicked');
  const handleMerchClick = () => console.log('Merch clicked');

  // handleCentralInfoClick больше не нужен, так как блок не кликабельный (из код1)
  // const handleCentralInfoClick = () => {
  //   console.log('Central info block clicked (Vouchers/Simplecoin)');
  //   // TODO: Логика для отображения деталей по ваучерам/симплкоинам
  // };

  // Данные для задач (остаются подробными из код2, как подразумевалось в код1)
  const allTasksData = {
    daily: [
      { id: 'd1_login', name: 'Вход в кошелек', progressCurrent: 1, progressTarget: 1, progressText: '1/1', isCompleted: true, isClaimed: false, rewards: { points: 25, xp: 15 } },
      { id: 'd2_swap', name: 'Обмен криптовалюты', progressCurrent: 0, progressTarget: 1, progressText: '0/1', isCompleted: false, isClaimed: false, rewards: { points: 25, xp: 15 } },
      { id: 'd3_simplecoin_spend', name: 'Трата Simplecoin', progressCurrent: 870, progressTarget: 1000, progressText: '0/1000', isCompleted: false, isClaimed: false, rewards: { points: 25, xp: 15 } },
      { id: 'd4_deposit', name: 'Депозит в кошелек', progressCurrent: 0, progressTarget: 1, progressText: '0/1', isCompleted: false, isClaimed: false, rewards: { points: 25, xp: 15 } }
    ],
    weekly: [
      { id: 'w1_login_streak', name: 'Вход в кошелек', progressCurrent: 0, progressTarget: 5, progressText: '0/5', isCompleted: false, isClaimed: false, rewards: { points: 25, xp: 30 } },
      { id: 'w2_swap_volume', name: 'Обмен криптовалюты', progressCurrent: 0, progressTarget: 5, progressText: '0/5', isCompleted: false, isClaimed: false, rewards: { points: 25, xp: 30 } },
      { id: 'w3_simplecoin_spending', name: 'Трата Simplecoin', progressCurrent: 0, progressTarget: 10000, progressText: '0/10000', isCompleted: false, isClaimed: false, rewards: { points: 25, xp: 30 } },
      { id: 'w4_deposit_activity', name: 'Депозит в кошелек', progressCurrent: 0, progressTarget: 2, progressText: '0/2', isCompleted: false, isClaimed: false, rewards: { points: 25, xp: 30 } }
    ],
    monthly: [
      { id: 'm1_login_marathon', name: 'Вход в кошелек', progressCurrent: 0, progressTarget: 30, progressText: '0/30', isCompleted: false, isClaimed: false, rewards: { points: 25, xp: 50 } },
      { id: 'm2_monthly_swaps', name: 'Обмен криптовалюты', progressCurrent: 0, progressTarget: 20, progressText: '0/20', isCompleted: false, isClaimed: false, rewards: { points: 25, xp: 50 } },
      { id: 'm3_big_simplecoin_spending', name: 'Трата Simplecoin', progressCurrent: 0, progressTarget: 50000, progressText: '0/50000', isCompleted: false, isClaimed: false, rewards: { points: 30, xp: 30 } },
      { id: 'm4_deposit_master', name: 'Депозит в кошелек', progressCurrent: 0, progressTarget: 5, progressText: '0/5', isCompleted: false, isClaimed: false, rewards: { points: 30, xp: 30 } }
    ]
  };

  // Данные для событий (остаются подробными из код2, как подразумевалось в код1)
  const eventsData = [
    { id: 'e1', title: 'USDC Fast Lane', description: 'Swap 200+ USDC and get 20 USDC!', howItWorks: [ 'Click "Participate" below.', 'Make an exchange (swap) of 200+ USDC for any other cryptocurrency.', 'Done – your 20 USDC bonus will be credited within 24 hours after the promotion ends!' ], endsIn: 'Ends in 3 days at 3:00 UTC' },
    { id: 'e2', title: 'Swap Sprint', description: 'Make 5+ swaps (each from $50) within a week and share a $500 prize pool!', howItWorks: [ 'Join the promotion.', 'Make at least 5 cryptocurrency exchanges (swaps) during the promotion week.', 'Each swap must be for an amount of $50 or more (equivalent).', 'All participants who meet the conditions will share the $500 prize pool.' ], endsIn: 'Ends in 7 days at 3:00 UTC' },
    { id: 'e3', title: 'Card to Crypto', description: 'Buy any cryptocurrency for $100+ with a card and get a $10 bonus in BTC!', howItWorks: [ 'Click the "Participate" button.', 'Purchase any cryptocurrency using a bank card for an amount of $100 or more.', 'A bonus of $10 in BTC will be credited to your account.' ], endsIn: 'Ends in 5 days at 3:00 UTC' },
    { id: 'e4', title: 'Fiat Rush', description: 'Buy crypto with a Visa/Mastercard (from $200) and participate in a Ledger Nano S Plus giveaway!', howItWorks: [ 'Make sure you are participating in the promotion.', 'Make a purchase of any cryptocurrency using a Visa or Mastercard for an amount of $200 or more.', 'You automatically become a participant in the Ledger Nano S Plus hardware wallet giveaway.' ], endsIn: 'Ends in 10 days at 3:00 UTC' },
    { id: 'e5', title: 'Crypto Shopping Weekend', description: 'Buy crypto with a card on Saturday or Sunday (from $75) and get a 50% discount on trading fees next week!', howItWorks: [ 'Activate your participation in the promotion.', 'Make a cryptocurrency purchase with a bank card for $75 or more on Saturday or Sunday.', 'Get a 50% discount on all trading fees throughout the next week.' ], endsIn: 'Ends this Sunday at 3:00 UTC' },
    { id: 'e6', title: 'Active Trader', description: 'Complete 10+ any operations (swap, card purchase, deposit from $50) and get a share of the $1000 prize pool!', howItWorks: [ 'Join the promotion.', 'Complete at least 10 operations: these can be swaps, cryptocurrency purchases with a card, or deposits (each for $50 or more).', 'Participants who meet the conditions will share the $1000 prize pool.' ], endsIn: 'Ends in 14 days at 3:00 UTC' },
    { id: 'e7', title: 'HODL & Swap', description: 'Hold at least 0.1 BTC in your balance AND make a swap of $100+ within the week to win $50!', howItWorks: [ 'Ensure you are registered for the promotion.', 'Maintain a balance of at least 0.1 BTC in your account throughout the entire promotion week.', 'Make at least one exchange (swap) for $100 or more during the same week.', 'Get a chance to win $50.' ], endsIn: 'Ends in 6 days at 3:00 UTC' }
  ];

  const handleGoBack = () => {
    if (selectedEventForView) {
      closeEventDetailView();
    } else {
      console.log('Back button clicked from Discovery main screen, navigating to /main');
      navigate('/main');
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
    <div className="discovery-screen">
      <header className="discovery-main-header">
        {/* Левая часть хедера */}
        <div className="header-left-content">
          <button className="header-icon-button mascot-profile-button" onClick={handleMascotProfileClick} aria-label="Profile">
            <FaUserCircle />
          </button>
          <div className="user-info-group">
            <div className="nickname-frame">
              <p className="user-nickname">{userNickname}</p>
            </div>
            <div className="level-xp-progress-wrapper">
              <span className="level-badge current-level-badge">{currentLevel}</span>
              <div className="xp-bar-container">
                <div className="xp-bar-fill" style={{ width: `${xpProgressPercent}%` }}></div>
                <span className="xp-bar-text-on-bar">{currentUserXP} / {maxXPForLevel} XP</span>
              </div>
              <span className="level-badge next-level-badge">{nextLevel}</span>
            </div>
          </div>
        </div>

        {/* Центральная часть хедера - НЕ КНОПКА, с иконками "i" (изменения из код1) */}
        <div className="header-center-content">
          <div
            className="central-info-framed"
            // Удалены: onClick, role, tabIndex (из код1)
            aria-label={`Информация: Ваучеры ${userVoucherCount}, Симплкоины ${userSimplecoinCount}`} // Обновлено из код1
          >
            <div className="info-line">
              <FaInfoCircle className="info-tooltip-trigger" aria-label="Информация о ваучерах"/> {/* Добавлено из код1 */}
              <img
                src="/assets/voucher-icon.png"
                alt="" // Изменено из код1 (пустой alt, так как FaInfoCircle предоставляет инфо)
                className="info-line-icon"
              />
              <span>:</span>
              <span className="info-count">{userVoucherCount}</span>
            </div>
            <div className="info-line">
              <FaInfoCircle className="info-tooltip-trigger" aria-label="Информация о симплкоинах"/> {/* Добавлено из код1 */}
              <img
                src="/assets/simplecoin-icon.png"
                alt="" // Изменено из код1 (пустой alt, так как FaInfoCircle предоставляет инфо)
                className="info-line-icon"
              />
              <span>:</span>
              <span className="info-count">{userSimplecoinCount}</span>
            </div>
          </div>
        </div>

        {/* Правая часть хедера */}
        <div className="header-right-content">
          <button className="header-icon-button leaderboard-button" onClick={handleLeaderboardClick} aria-label="Leaderboard">
            <FaTrophy />
          </button>
          <button className="header-icon-button level-rewards-button" onClick={handleLevelRewardsClick} aria-label="Level Rewards">
            <FaGift />
          </button>
          <button className="header-icon-button simple-cashback-button" onClick={handleSimpleCashbackClick} aria-label="Simple Cashback">
            <FaCoins />
          </button>
        </div>
      </header>

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
              <div className="action-item" onClick={handleWeeklyCalendarClick}><div className="action-button-square"><FaCalendarAlt className="action-icon" /></div><p className="action-label">Weekly Calendar</p></div>
              <div className="action-item" onClick={openTasksPopup}><div className="action-button-square"><FaTasks className="action-icon" /></div><p className="action-label">Task Center</p></div>
              <div className="action-item" onClick={handleBotZoneClick}><div className="action-button-square"><FaRobot className="action-icon" /></div><p className="action-label">Bot Zone</p></div>
              <div className="action-item" onClick={handleLuckyDrawClick}><div className="action-button-square"><FaDice className="action-icon" /></div><p className="action-label">Lucky Draw</p></div>
              <div className="action-item" onClick={handleAchievementsClick}><div className="action-button-square"><FaCertificate className="action-icon" /></div><p className="action-label">Achievements</p></div>
              <div className="action-item" onClick={handleMerchClick}><div className="action-button-square"><FaShoppingCart className="action-icon" /></div><p className="action-label">Merch</p></div>
            </section>
            <section className="events-section">
              <h2 className="section-title">Live Promos:</h2>
              <div className="live-events-grid">
                {eventsData.map(event => ( <button key={event.id} className="live-event-button" onClick={() => openEventDetailView(event)}> {event.title} </button> ))}
                {eventsData.length === 0 && <p className="no-events-info">There are no live promos currently.</p>}
              </div>
            </section>
          </div>
        )}
        {activeTab === 'Simplecoin' && ( <div className="tab-pane" id="simplecoin-pane"><p>Содержимое вкладки Simplecoin будет здесь.</p></div> )}
        {activeTab === 'Boosts' && ( <div className="tab-pane" id="boosts-pane"><p>Содержимое вкладки Boosts будет здесь.</p></div> )}
        {activeTab === 'Events' && ( <div className="tab-pane" id="events-pane"><p>Содержимое вкладки Events будет здесь. Здесь могут быть другие типы событий или календарь.</p></div> )}
        {activeTab === 'Academy' && ( <div className="tab-pane" id="academy-pane"><p>Содержимое вкладки Academy будет здесь. Обучающие материалы, гайды и т.д.</p></div> )}
      </main>

      {isTasksPopupOpen && ( <TaskCenterModal isOpen={isTasksPopupOpen} onClose={closeTasksPopup} tasksData={allTasksData} TaskItemComponent={TaskItem}/> )}
    </div>
  );
};

export default DiscoveryScreen;