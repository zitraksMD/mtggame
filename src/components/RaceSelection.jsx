// RaceSelection.jsx
import React, { useState } from 'react';
import useGameStore from '../store/useGameStore'; // Убедись, что путь верный
import { RACES } from '../config/raceData'; // Импорт данных о расах (Проверь путь!)
import RaceModelViewer from './RaceModelViewer'; // Импорт вьювера 3D моделей (Проверь путь!)
// --- >>> ВОЗВРАЩАЕМ ИМПОРТ useSwipeable <<< ---
    import { useSwipeable } from 'react-swipeable';
// --- ---
import { motion, AnimatePresence } from 'framer-motion'; // Импорт Framer Motion
import './RaceSelection.scss'; // Импорт стилей

// --- Варианты анимации для Framer Motion (остаются) ---
const slideVariants = {
    enter: (direction) => ({
        x: direction > 0 ? '100%' : '-100%',
        opacity: 0,
        scale: 0.95,
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        scale: 1,
        transition: { duration: 0.6, ease: "easeOut" }
    },
    exit: (direction) => ({
        zIndex: 0,
        x: direction < 0 ? '100%' : '-100%',
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.7, ease: "easeIn" }
    })
};
// --- Конец вариантов анимации ---

// Компонент принимает onComplete проп из App.jsx для смены вида
const RaceSelection = ({ onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0); // Индекс текущей расы
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [direction, setDirection] = useState(0); // Направление анимации

    // Получаем actions из стора
    const setPlayerRace = useGameStore(state => state.setPlayerRace);
    const initializeCharacterStats = useGameStore(state => state.initializeCharacterStats);

    // Обработчики смены расы (для кнопок и свайпов)
    const handleNextRace = () => {
        setDirection(1); // Анимация вправо
        setCurrentIndex((prevIndex) => (prevIndex + 1) % RACES.length);
    };
    const handlePrevRace = () => {
        setDirection(-1); // Анимация влево
        setCurrentIndex((prevIndex) => (prevIndex - 1 + RACES.length) % RACES.length);
    };

    // --- >>> ИНИЦИАЛИЗИРУЕМ useSwipeable ДЛЯ ВСЕГО ЭКРАНА <<< ---
    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => handleNextRace(),    // Вызываем те же функции, что и кнопки
        onSwipedRight: () => handlePrevRace(),
        preventScrollOnSwipe: true,             // Предотвращаем скролл страницы
        trackMouse: true                        // Разрешаем свайп мышью
    });
    // --- ---

    // Функции модального окна и подтверждения
    const handleOpenConfirmModal = () => { /* ... как было ... */
        if (RACES[currentIndex]) {
            setShowConfirmModal(true);
        }
     };
    const handleConfirmRace = () => { /* ... как было ... */
        const confirmedRaceId = RACES[currentIndex]?.id;
        if (!confirmedRaceId) return;
        console.log(`Выбрана раса: ${confirmedRaceId}`);
        if (typeof setPlayerRace === 'function' && typeof initializeCharacterStats === 'function') {
             setPlayerRace(confirmedRaceId);
             initializeCharacterStats(confirmedRaceId);
        } else { console.error("Actions setPlayerRace или initializeCharacterStats не найдены!"); }
        try {
             localStorage.setItem('chosenRace', confirmedRaceId);
             localStorage.setItem('raceChosen', 'true');
             console.log("Выбор расы сохранен.");
        } catch (e) { console.error("Ошибка сохранения в localStorage:", e); }
        setShowConfirmModal(false);
        if (typeof onComplete === 'function') {
             onComplete();
        } else { console.error("onComplete prop не предоставлен!"); }
     };
    const handleCancelConfirm = () => { setShowConfirmModal(false); };

    // Данные текущей расы
    const currentRace = RACES[currentIndex];
    if (!currentRace) { return <div className="race-selection-screen">Ошибка: Данные о расах не найдены!</div>; }

    // Форматирование ключей статов
    const formatStatKey = (key) => { /* ... как было ... */
        const result = key.replace(/([A-Z])/g, ' $1'); return result.charAt(0).toUpperCase() + result.slice(1);
     };

    // Стиль фона
    const backgroundStyle = { /* ... как было ... */
        backgroundImage: `url(${currentRace.backgroundUrl || ''})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        transition: 'background-image 0.4s ease-in-out'
     };

    return (
        // --- >>> ПРИМЕНЯЕМ swipeHandlers ЗДЕСЬ <<< ---
        <div className="race-selection-screen" style={backgroundStyle} {...swipeHandlers}>
            <h1>Выберите вашу расу</h1>

            <div className="carousel-container">
                <button onClick={handlePrevRace} className="arrow-button prev-button">&lt;</button>

                <div className="race-display-area-wrapper">
                    <AnimatePresence initial={false} custom={direction}>
                        <motion.div
                            key={currentIndex}
                            className="race-display-area"
                            variants={slideVariants}
                            custom={direction}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            // --- >>> УБРАНЫ ПРОПСЫ drag, dragConstraints, dragElastic, onDragEnd <<< ---
                        >
                            {/* Внутреннее содержимое (header, model) */}
                            <div className="race-header">
                               <img src={currentRace.icon} alt="" className="race-title-icon" />
                               <h2>{currentRace.name}</h2>
                            </div>
                            <div className="race-model-container">
                               <RaceModelViewer modelPath={currentRace.initialStats.skin} key={currentRace.id} />
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <button onClick={handleNextRace} className="arrow-button next-button">&gt;</button>
            </div>
               {/* Кнопка подтверждения */}
               <button className="confirm-button" onClick={handleOpenConfirmModal} >
                Выбрать {currentRace.name}
            </button>
            {/* --- Отдельный Блок статистики --- */}
            <div className="race-stats-container">
                <h3>Начальные Характеристики:</h3>
                <ul className="stats-list">
                    {(() => {
                        const percentStatKeys = new Set(['crit', 'doubleStrike']);
                        return Object.entries(currentRace.initialStats)
                            .filter(([key]) => !['skin'].includes(key))
                            .map(([key, value]) => (
                            <li key={key}>
                                <span className="stat-key">{formatStatKey(key)}:</span>
                                <span className="stat-value">
                                    {value}{percentStatKeys.has(key) ? '%' : ''}
                                </span>
                            </li>
                        ));
                    })()}
                </ul>
            </div>
            {/* --- Конец блока статистики --- */}

            {/* Модальное окно подтверждения */}
            {showConfirmModal && currentRace && (
                 <div className="confirm-modal-overlay">
                    {/* ... содержимое модалки ... */}
                     <div className="confirm-modal">
                         <h2>Подтверждение выбора</h2>
                         <p>Вы уверены, что хотите выбрать расу "{currentRace.name}"?</p>
                         <p className="warning">Изменить расу потом будет невозможно!</p>
                         <div className="modal-buttons">
                             <button onClick={handleConfirmRace} className="yes-button">Да, уверен</button>
                             <button onClick={handleCancelConfirm} className="no-button">Нет, вернуться</button>
                         </div>
                     </div>
                 </div>
             )}
        </div> // Конец race-selection-screen
    );
};

export default RaceSelection;