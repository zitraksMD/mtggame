// src/components/GlobalMap.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'; // Добавлены useState, useEffect, useCallback, useRef
import { motion } from 'framer-motion'; // Для анимации основного контента
import './GlobalMap.scss';
import useGameStore from '../store/useGameStore';
import TransitionOverlay from "./TransitionOverlay"; // <<< ИМПОРТ из код1
import chapter1Data from '../data/chapters/chapter1/chapter1Data.js';
import chapter2Data from '../data/chapters/chapter2/chapter2Data.js';
// import chapter3Data from '../data/chapters/chapter3/chapter3Data.js';

// Данные из код2
const allChaptersLevelData = {
  1: chapter1Data?.levels || [],
  2: chapter2Data?.levels || [],
  // 3: chapter3Data?.levels || [],
};

const continentsData = [
  {
    id: 'necroworld_continent',
    name: 'Некромир',
    image: '/assets/continents/necroworld_map_icon.png',
    x: 200, y: 300,
    chapters: [1],
    startChapterId: 1,
    isImplemented: true,
  },
  {
    id: 'inferno_continent',
    name: 'Инферно',
    image: '/assets/continents/inferno_map_icon.png',
    x: 600, y: 400,
    chapters: [2],
    startChapterId: 2,
    isImplemented: false,
  },
  // ... другие континенты ...
];

// Анимационные варианты для GlobalMap (из код1)
const globalMapContentVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, delay: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

const GlobalMap = ({
  onSelectContinent,    // от MainMenu (будет handleContinentSelectFromGlobalMap)
  onGoBackToChapterMap, // от MainMenu (будет handleGoBackToWorldMapFromGlobal)
}) => {
  const isChapterCompleted = useGameStore(state => state.isChapterCompleted);

  // Состояния для управления TransitionOverlay (из код1)
  const [isOverlayActive, setIsOverlayActive] = useState(true);
  const [triggerOpenOverlay, setTriggerOpenOverlay] = useState(false);
  const [triggerCloseOverlay, setTriggerCloseOverlay] = useState(false);

  // Состояние для коллбэка навигации (из код1)
  const pendingNavigationCallbackRef = useRef(null);

  // При монтировании GlobalMap запускаем анимацию открытия шторок (из код1)
  useEffect(() => {
    console.log("GlobalMap: Mounted. Triggering OPEN overlay animation.");
    setIsOverlayActive(true);
    setTriggerCloseOverlay(false);
    setTriggerOpenOverlay(true);
  }, []);

  const handleOverlayOpenComplete = useCallback(() => {
    console.log("GlobalMap: Overlay OPEN complete. Hiding overlay component.");
    setTriggerOpenOverlay(false);
    setIsOverlayActive(false);
  }, []);

  const handleOverlayCloseComplete = useCallback(() => {
    console.log("GlobalMap: Overlay CLOSE complete.");
    if (pendingNavigationCallbackRef.current) {
      console.log("GlobalMap: Executing pending navigation.");
      pendingNavigationCallbackRef.current();
      pendingNavigationCallbackRef.current = null;
    }
    setTriggerCloseOverlay(false);
    // setIsOverlayActive(false); // Оверлей скроется при размонтировании из-за навигации
  }, []);

  // Оборачиваем вызовы навигации в анимацию закрытия шторок (из код1)
  const navigateWithTransition = useCallback((navigationAction) => {
    pendingNavigationCallbackRef.current = navigationAction;
    setIsOverlayActive(true);
    setTriggerOpenOverlay(false);
    setTriggerCloseOverlay(true);
  }, []);

  const handleContinentClick = useCallback((continent) => {
    // Логика проверки из код2
    if (!continent.isImplemented) {
      alert(`Контент для континента "${continent.name}" находится в разработке.`);
      return;
    }
    if (!continent.isUnlockedCalculated) {
      alert(`Континент "${continent.name}" пока не доступен! Пройдите предыдущие главы.`);
      return;
    }

    // Навигация с переходом из код1
    if (typeof onSelectContinent === 'function') {
      console.log("GlobalMap: Continent clicked, preparing transition...");
      navigateWithTransition(() => onSelectContinent(continent.startChapterId));
    }
  }, [onSelectContinent, navigateWithTransition]); // Добавлен navigateWithTransition в зависимости

  const handleBackToWorldMapClick = useCallback(() => {
    // Навигация с переходом из код1
    if (typeof onGoBackToChapterMap === 'function') {
      console.log("GlobalMap: Back button clicked, preparing transition...");
      navigateWithTransition(onGoBackToChapterMap);
    }
  }, [onGoBackToChapterMap, navigateWithTransition]); // Добавлен navigateWithTransition в зависимости

  return (
    <motion.div // Обертка из код1
      className="global-map-screen"
      key="globalmap-screen-content"
      variants={globalMapContentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {isOverlayActive && ( // Отображение TransitionOverlay из код1
        <TransitionOverlay
          playOpen={triggerOpenOverlay}
          onOpenComplete={handleOverlayOpenComplete}
          playClose={triggerCloseOverlay}
          onCloseComplete={handleOverlayCloseComplete}
        />
      )}

      <div className="global-map-header">
        <h1>Карта Мира</h1>
        {/* Используем handleBackToWorldMapClick из код1 для кнопки назад */}
        <button onClick={handleBackToWorldMapClick} className="map-back-button">
          &#x21A9; Назад к Карте Глав
        </button>
      </div>

      <div className="global-map-background">
        {continentsData.map((continent, continentIndex) => {
          // Логика разблокировки континентов из код2
          let isCurrentContinentUnlocked = false;
          if (continentIndex === 0) {
            isCurrentContinentUnlocked = true;
          } else {
            const prevContinent = continentsData[continentIndex - 1];
            let prevContinentAllChaptersCompleted = true;

            if (prevContinent && prevContinent.isImplemented && prevContinent.chapters && Array.isArray(prevContinent.chapters)) {
              for (const chapterId of prevContinent.chapters) {
                const levelsOfThisChapter = allChaptersLevelData[chapterId];
                if (typeof isChapterCompleted !== 'function' || !levelsOfThisChapter || !isChapterCompleted(chapterId, levelsOfThisChapter)) {
                  prevContinentAllChaptersCompleted = false;
                  break;
                }
              }
            } else {
              prevContinentAllChaptersCompleted = false;
              if (prevContinent && !prevContinent.isImplemented) {
                console.warn(`Предыдущий континент (id: ${prevContinent.id}) не реализован. Континент "${continent.name}" будет заблокирован.`);
              } else if (prevContinent) {
                console.warn(`Предыдущий континент (id: ${prevContinent.id}) не имеет списка глав. Континент "${continent.name}" будет заблокирован.`);
              }
            }
            isCurrentContinentUnlocked = prevContinentAllChaptersCompleted;
          }

          const continentClasses = `continent-node ${isCurrentContinentUnlocked ? 'unlocked' : 'locked'} ${!continent.isImplemented ? 'not-implemented' : ''}`;

          return (
            <div
              key={continent.id}
              className={continentClasses}
              style={{
                position: 'absolute',
                top: `${continent.y}px`,
                left: `${continent.x}px`,
              }}
              // Передаем isUnlockedCalculated в handleContinentClick
              onClick={() => handleContinentClick({ ...continent, isUnlockedCalculated: isCurrentContinentUnlocked })}
              title={continent.name}
            >
              <img src={continent.image} alt={continent.name} className="continent-image" />
              <span className="continent-label">{continent.name}</span>
              {!isCurrentContinentUnlocked && continent.isImplemented && <div className="continent-lock-icon">🔒</div>}
              {!continent.isImplemented && <div className="continent-status-label">В разработке</div>}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default GlobalMap;