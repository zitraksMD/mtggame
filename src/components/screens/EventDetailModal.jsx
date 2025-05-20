// src/components/screens/EventDetailModal.jsx
import React, { useState } from 'react';
import './EventDetailModal.scss';

const EventDetailModal = ({ event, onClose }) => {
  const [isJoined, setIsJoined] = useState(false);

  if (!event) {
    return null;
  }

  const bannerPath = '/assets/promo-banner.png';

  const handleJoinPromo = () => {
    setIsJoined(true);
    console.log(`User joined promo: ${event.title}`);
  };

  // Обработчик для новой кнопки действия (пока просто выводит в консоль)
  const handlePerformAction = () => {
    console.log(`Action button clicked for event: ${event.title}. Needs implementation.`);
    // Здесь может быть логика перехода на другую страницу, вызов API и т.д.
    // Например: if (event.actionLink) window.location.href = event.actionLink;
  };

  return (
    <div className="event-detail-view-container">
      <header className="event-detail-view-header">
        <button onClick={onClose} className="back-button">
          &lt; 
        </button>
      </header>
      <main className="event-detail-view-main-content">
        <div className="promo-banner-container">
          <img src={bannerPath} alt={event.title || "Промо баннер"} className="promo-banner-image" />
        </div>
        <div className="event-info-content">
          {/* === Общий информационный блок, видимый в обоих состояниях === */}
          <h1 className="event-title">{event.title}</h1>
          <p className="event-description">{event.description}</p>

          {event.howItWorks && event.howItWorks.length > 0 && (
            <div className="how-it-works-section">
              {/* Используем заголовок "Как это работает:" для обоих состояний */}
              <h2 className="section-subtitle">Как это работает:</h2>
              <ul className="how-it-works-list">
                {event.howItWorks.map((step, index) => (
                  <li key={index} className="how-it-works-item">
                    <span className="list-item-number">{index + 1}.</span> {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {event.endsIn && (
            <p className="event-ends-in">
              {event.endsIn}
            </p>
          )}

          {/* === Индикатор "JOINED" === */}
          {/* Видим только во втором состоянии, но занимает место в первом (невидимо) */}
          <div
            className="joined-indicator-wrapper"
            style={!isJoined ? { visibility: 'hidden', pointerEvents: 'none' } : {}}
          >
            <div className="joined-indicator">
              JOINED
            </div>
          </div>
        </div> {/* Конец event-info-content */}
      </main>
      <footer className="event-detail-view-footer">
        {!isJoined ? (
          <button className="join-promo-button" onClick={handleJoinPromo}>
            Join the Promo
          </button>
        ) : (
          // Новая кнопка для второго состояния
          <button className="action-button" onClick={handlePerformAction}>
            Make a Swap {/* Пример текста, можно сделать динамическим */}
          </button>
        )}
      </footer>
    </div>
  );
};

export default EventDetailModal;