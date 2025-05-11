// src/components/GlobalMap.jsx
import React, { useEffect, useCallback } from 'react'; // useState и useRef удалены, так как overlay и его состояние больше не управляются здесь
import { motion } from 'framer-motion';
import './GlobalMap.scss'; // Предполагаем, что стили все еще нужны
import useGameStore from '../store/useGameStore';
// НЕТ TransitionOverlay здесь и его импорта
// useLocation и useNavigate удалены, так как навигация инициируется через пропсы и управляется выше
import chapter1Data from '../data/chapters/chapter1/chapter1Data.js';
import chapter2Data from '../data/chapters/chapter2/chapter2Data.js';
// import chapter3Data from '../data/chapters/chapter3/chapter3Data.js';

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

// globalMapContentVariants удалены, так как анимация контента экрана теперь управляется "шторками" извне
// const globalMapContentVariants = {
//   hidden: { opacity: 0 },
//   visible: { opacity: 1, transition: { duration: 0.3, delay: 0.1 } },
//   exit: { opacity: 0, transition: { duration: 0.15 } }
// };

const GlobalMap = ({
  onSelectContinent,
  onGoBackToChapterMap,
}) => {
  const isChapterCompleted = useGameStore(state => state.isChapterCompleted);
  // location и navigate удалены

  // Логика Overlay (isOverlayActive, triggerOpenOverlay, triggerCloseOverlay, pendingNavigationCallbackRef) удалена

  // useEffect из код1: При монтировании, если нужно, запускаем анимацию открытия шторок через стор
  useEffect(() => {
    const store = useGameStore.getState();
    // Если мы пришли на этот экран и шторки не открываются уже
    if (!store.isScreenTransitioning || store.transitionAction !== 'opening') {
      // console.log("GlobalMap: Mounted, ensuring screen is opening.");
      store.ensureScreenIsOpening();
    }
  }, []); // Пустой массив зависимостей, выполняется один раз при монтировании

  // handleOverlayOpenComplete и handleOverlayCloseComplete удалены

  // navigateWithTransition удален

  // handleContinentClick из код1:
  const handleContinentClick = useCallback((continent) => {
    // Проверки isImplemented и isUnlockedCalculated остаются из код2
    if (!continent.isImplemented) {
      alert(`Контент для континента "${continent.name}" находится в разработке.`);
      return;
    }
    if (!continent.isUnlockedCalculated) {
      alert(`Континент "${continent.name}" пока не доступен! Пройдите предыдущие главы.`);
      return;
    }

    if (typeof onSelectContinent === 'function') {
      // onSelectContinent в App.jsx УЖЕ ВЫЗОВЕТ startScreenTransition (или аналогичную функцию из store)
      onSelectContinent(continent.startChapterId);
    }
  }, [onSelectContinent]); // Зависимость navigateWithTransition удалена

  // handleBackToWorldMapClick из код1:
  const handleBackToWorldMapClick = useCallback(() => {
    if (typeof onGoBackToChapterMap === 'function') {
      // onGoBackToChapterMap в App.jsx УЖЕ ВЫЗОВЕТ startScreenTransition (или аналогичную функцию из store)
      onGoBackToChapterMap();
    }
  }, [onGoBackToChapterMap]); // Зависимость navigateWithTransition удалена

  return (
    // Атрибуты variants, initial, animate, exit для самого экрана удалены,
    // так как анимацией управляют "шторки" из App.jsx или глобального состояния.
    // Контент должен быть видим сразу.
    <motion.div className="global-map-screen">
      {/* НЕТ TransitionOverlay ЗДЕСЬ */}

      <div className="global-map-header">
        <h1>Карта Мира</h1>
        <button onClick={handleBackToWorldMapClick} className="map-back-button">
          &#x21A9; Назад к Карте Глав
        </button>
      </div>

      <div className="global-map-background">
        {continentsData.map((continent, continentIndex) => {
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
              // Передаем isUnlockedCalculated в объект континента при клике
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