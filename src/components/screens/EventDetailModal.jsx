// src/components/screens/EventDetailModal.jsx
import React, { useState } from 'react'; // Добавляем useState
import './EventDetailModal.scss';
// import promoBannerPath from '../../assets/promo-banner.png'; // Если баннер в src/assets
// const bannerPath = promoBannerPath; // Если импортирован

const EventDetailModal = ({ event, onClose }) => {
  const [isJoined, setIsJoined] = useState(false); // Новое состояние для отслеживания участия

  if (!event) {
    return null;
  }

  // Прямой путь к баннеру, если он в public/assets/
  const bannerPath = '/assets/promo-banner.png';

  const handleJoinPromo = () => {
    setIsJoined(true);
    // Здесь также может быть логика отправки запроса на сервер о присоединении к акции
    console.log(`User joined promo: ${event.title}`);
  };

  return (
    <div className="event-detail-view-container">
      <header className="event-detail-view-header">
        <button onClick={onClose} className="back-button">
          &lt; Назад
        </button>
      </header>
      <main className="event-detail-view-main-content">
        <div className="promo-banner-container">
          <img src={bannerPath} alt={event.title || "Promo Banner"} className="promo-banner-image" />
        </div>
        <div className="event-info-content">
          {!isJoined ? (
            // Контент ДО присоединения к акции
            <>
              <h1 className="event-title">{event.title}</h1>
              <p className="event-description">{event.description}</p>

              {event.howItWorks && event.howItWorks.length > 0 && (
                <div className="how-it-works-section">
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
            </>
          ) : (
            // Контент ПОСЛЕ присоединения к акции
            <div className="promo-joined-content">
              <h2 className="joined-title">Поздравляем!</h2>
              <p className="joined-message">
              Вы успешно зарегистрировались в промо акции <strong>{event.title}</strong>              </p>
              <div className="how-it-works-section">
                <h3 className="section-subtitle-joined">Чтобы участвовать в розыгрыше, выполните следующие действия:</h3>
                {event.howItWorks && event.howItWorks.length > 0 && (
                  <ul className="how-it-works-list">
                    {event.howItWorks.map((step, index) => (
                      <li key={index} className="how-it-works-item">
                        <span className="list-item-number">{index + 1}.</span> {step}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <footer className="event-detail-view-footer">
        {!isJoined ? (
          <button className="join-promo-button" onClick={handleJoinPromo}>
            Join the Promo
          </button>
        ) : (
          <button className="join-promo-button joined" disabled>
            Joined
          </button>
        )}
      </footer>
    </div>
  );
};

export default EventDetailModal;