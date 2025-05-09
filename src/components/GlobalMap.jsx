// src/components/GlobalMap.jsx
import React from 'react';
import './GlobalMap.scss';
import useGameStore from '../store/useGameStore';
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
    chapters: [1], // Главы этого континента
    startChapterId: 1, // Стартовая глава для фокуса
    isImplemented: true, // <<< НОВЫЙ ФЛАГ: Контент готов
  },
  {
    id: 'inferno_continent',
    name: 'Инферно',
    image: '/assets/continents/inferno_map_icon.png',
    x: 600, y: 400,
    chapters: [2], // Предположим, глава 2 - это Инферно
    startChapterId: 2,
    isImplemented: false, // <<< НОВЫЙ ФЛАГ: Контент НЕ готов
  },
  // ... другие континенты ...
];

const GlobalMap = ({
  onSelectContinent,
  onGoBackToChapterMap,
}) => {
  const isChapterCompleted = useGameStore(state => state.isChapterCompleted);

  const handleContinentClick = (continent) => {
    // Сначала проверяем, реализован ли контент континента
    if (!continent.isImplemented) {
      alert(`Контент для континента "${continent.name}" находится в разработке.`);
      return;
    }

    // Затем проверяем, разблокирован ли он (isUnlockedCalculated добавляется при клике)
    if (!continent.isUnlockedCalculated) {
      alert(`Континент "${continent.name}" пока не доступен! Пройдите предыдущие главы.`);
      return;
    }

    // Если все в порядке, вызываем onSelectContinent
    if (typeof onSelectContinent === 'function') {
      onSelectContinent(continent.startChapterId);
    }
  };

  return (
    <div className="global-map-screen">
      <div className="global-map-header">
        <h1>Карта Мира</h1>
        <button onClick={onGoBackToChapterMap} className="map-back-button">&#x21A9; Назад к главе</button>
      </div>

      <div className="global-map-background"> {/* Убедитесь, что фон стилизован для позиционирования */}
        {continentsData.map((continent, continentIndex) => {
          let isCurrentContinentUnlocked = false;
          if (continentIndex === 0) {
            isCurrentContinentUnlocked = true;
          } else {
            const prevContinent = continentsData[continentIndex - 1];
            let prevContinentAllChaptersCompleted = true;

            // Предыдущий континент должен быть реализован, чтобы его можно было пройти
            if (prevContinent && prevContinent.isImplemented && prevContinent.chapters && Array.isArray(prevContinent.chapters)) {
              for (const chapterId of prevContinent.chapters) {
                const levelsOfThisChapter = allChaptersLevelData[chapterId];
                if (typeof isChapterCompleted !== 'function' || !levelsOfThisChapter || !isChapterCompleted(chapterId, levelsOfThisChapter)) {
                  prevContinentAllChaptersCompleted = false;
                  break;
                }
              }
            } else {
              // Если предыдущий континент не реализован или не имеет глав, он не может быть "завершен"
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
                position: 'absolute', // Убедитесь, что у родительского .global-map-background есть position: relative
                top: `${continent.y}px`,
                left: `${continent.x}px`,
                // Задайте размеры, если они не заданы в SCSS
                // width: '150px',
                // height: '120px',
              }}
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
    </div>
  );
};

export default GlobalMap;