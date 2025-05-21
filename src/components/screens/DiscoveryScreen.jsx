import React, { useState } from 'react';
import './DiscoveryScreen.scss';
import TaskCenterModal from './TaskCenterModal';
import EventDetailModal from './EventDetailModal';
import { useNavigate } from 'react-router-dom';


/// Импортируем CryptoPurchaseScreen и его стили
import CryptoPurchaseScreen from './CryptoPurchaseScreen';
import './CryptoPurchaseScreen.scss'; // Убедитесь, что этот файл существует и содержит SCSS из предыдущего ответа

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
  FaInfoCircle
} from 'react-icons/fa';

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
  const [activeTab, setActiveTab] = useState('Task HUB');
  const [isTasksPopupOpen, setIsTasksPopupOpen] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState(null);

  const userNickname = "User123";
  const currentUserXP = 75;
  const maxXPForLevel = 100;
  const xpProgressPercent = (currentUserXP / maxXPForLevel) * 100;
  const currentLevel = 10;
  const nextLevel = 11;
  const userVoucherCount = 3;
  const userSimplecoinCount = 1250;
  const userSimpleCashbackAmount = 50;

  const handleTabClick = (tabName) => setActiveTab(tabName);
  const openTasksPopup = () => setIsTasksPopupOpen(true);
  const closeTasksPopup = () => setIsTasksPopupOpen(false);
  const openEventDetailView = (eventData) => setSelectedEventForView(eventData);
  const closeEventDetailView = () => setSelectedEventForView(null);
  const handleMascotProfileClick = () => console.log('Mascot/Profile icon clicked');
  const handleSimpleCashbackDisplayClick = () => {
      console.log('Simple Cashback display button in header clicked. Amount:', userSimpleCashbackAmount);
      // Возможно, здесь вы захотите переключиться на вкладку, где отображается CryptoPurchaseScreen,
      // или открыть его другим способом, если он не на вкладке 'Simplecoin'
      // Например: setActiveTab('Simplecoin');
  }

  const handleWeeklyCalendarClick = () => console.log('Weekly Calendar clicked');
  const handleBotZoneClick = () => console.log('Bot Zone clicked');
  const handleLuckyDrawClick = () => console.log('Lucky Draw clicked');
  const handleAchievementsClick = () => console.log('Achievements clicked');
  const handleMerchClick = () => console.log('Merch clicked');
  const handleLeaderboardClick = () => console.log('Leaderboard icon clicked');
  const handleLevelRewardsClick = () => console.log('Level rewards icon clicked');

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

  const eventsData = [
    { id: 'e1', title: 'USDC Fast Lane', description: 'Swap 200+ USDC and get 20 USDC!', howItWorks: [ 'Click "Participate" below.', 'Make an exchange (swap) of 200+ USDC for any other cryptocurrency.', 'Done – your 20 USDC bonus will be credited within 24 hours after the promotion ends!' ], endsIn: 'Ends in 3 days at 3:00 UTC' },
    { id: 'e2', title: 'Swap Sprint', description: 'Make 5+ swaps (each from $50) within a week and share a $500 prize pool!', howItWorks: [ 'Join the promotion.', 'Make at least 5 cryptocurrency exchanges (swaps) during the promotion week.', 'Each swap must be for an amount of $50 or more (equivalent).', 'All participants who meet the conditions will share the $500 prize pool.' ], endsIn: 'Ends in 7 days at 3:00 UTC' },
    // ... (остальные данные eventsData)
  ];

  const handleGoBack = () => {
    if (selectedEventForView) {
      closeEventDetailView();
    } else {
      console.log('Back button clicked from Discovery main screen, navigating to /main');
      navigate('/main');
    }
  };

  const hubActionItems = [
    { id: 'weeklyCalendar', label: 'Weekly Calendar', icon: FaCalendarAlt, handler: handleWeeklyCalendarClick },
    { id: 'taskCenter', label: 'Task Center', icon: FaTasks, handler: openTasksPopup },
    { id: 'botZone', label: 'Bot Zone', icon: FaRobot, handler: handleBotZoneClick },
    { id: 'luckyDraw', label: 'Lucky Draw', icon: FaDice, handler: handleLuckyDrawClick },
    { id: 'achievements', label: 'Achievements', icon: FaCertificate, handler: handleAchievementsClick },
    { id: 'merch', label: 'Merch', icon: FaShoppingCart, handler: handleMerchClick },
    { id: 'leaderboard', label: 'Leaderboard', icon: FaTrophy, handler: handleLeaderboardClick },
    { id: 'levelRewards', label: 'Level Rewards', icon: FaGift, handler: handleLevelRewardsClick },
  ];


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

        <div
          className="header-center-cashback-button"
          onClick={handleSimpleCashbackDisplayClick}
          role="button"
          tabIndex={0}
          aria-label={`Simple Cashback: ${userSimpleCashbackAmount}`}
        >
          <FaCoins className="cashback-icon" />
          <span className="cashback-separator">:</span>
          <span className="cashback-amount">{userSimpleCashbackAmount}</span>
        </div>

        <div className="header-right-counters-display">
          <div
            className="central-info-framed"
            aria-label={`Информация: Ваучеры ${userVoucherCount}, Симплкоины ${userSimplecoinCount}`}
          >
            <div className="info-line">
              <FaInfoCircle className="info-tooltip-trigger" aria-label="Информация о ваучерах"/>
              <img
                src="/assets/voucher-icon.png" // Убедитесь, что этот путь правильный
                alt=""
                className="info-line-icon"
              />
              <span>:</span>
              <span className="info-count">{userVoucherCount}</span>
            </div>
            <div className="info-line">
              <FaInfoCircle className="info-tooltip-trigger" aria-label="Информация о симплкоинах"/>
              <img
                src="/assets/simplecoin-icon.png" // Убедитесь, что этот путь правильный
                alt=""
                className="info-line-icon"
              />
              <span>:</span>
              <span className="info-count">{userSimplecoinCount}</span>
            </div>
          </div>
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
              {hubActionItems.map(item => (
                <div key={item.id} className="action-item" onClick={item.handler} role="button" tabIndex={0}>
                  <div className="action-button-square">
                    <item.icon className="action-icon" />
                  </div>
                  <p className="action-label">{item.label}</p>
                </div>
              ))}
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
        {activeTab === 'Simplecoin' && (
          // Здесь мы отображаем CryptoPurchaseScreen вместо плейсхолдера
          // <div className="tab-pane" id="simplecoin-pane"> {/* Оборачивающий div может быть не нужен, зависит от стилей CryptoPurchaseScreen */}
             <CryptoPurchaseScreen />
          // </div>
        )}
        {activeTab === 'Boosts' && ( <div className="tab-pane" id="boosts-pane"><p>Содержимое вкладки Boosts будет здесь.</p></div> )}
        {activeTab === 'Events' && ( <div className="tab-pane" id="events-pane"><p>Содержимое вкладки Events будет здесь. Здесь могут быть другие типы событий или календарь.</p></div> )}
        {activeTab === 'Academy' && ( <div className="tab-pane" id="academy-pane"><p>Содержимое вкладки Academy будет здесь. Обучающие материалы, гайды и т.д.</p></div> )}
      </main>

      {isTasksPopupOpen && ( <TaskCenterModal isOpen={isTasksPopupOpen} onClose={closeTasksPopup} tasksData={allTasksData} TaskItemComponent={TaskItem}/> )}

      {/* Если вы хотите, чтобы CryptoPurchaseScreen отображался внизу всегда, а не на вкладке: */}
      {/* <div style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
           <p>--- Crypto Purchase Section (Always Visible Example) ---</p>
           <CryptoPurchaseScreen />
         </div> */}
    </div>
  );
};

export default DiscoveryScreen;