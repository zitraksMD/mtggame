// src/App.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Импорты Компонентов
import MainMenu from "./components/MainMenu";
import Level from "./components/Level";
import Inventory from "./components/Inventory";
import Shop from "./components/Shop";
import BottomNav from "./components/BottomNav";
import UsernamePopup from "./components/UsernamePopup";
// import PowerLevel from "./components/PowerLevel"; // Компонент силы - БОЛЬШЕ НЕ НУЖЕН ОТДЕЛЬНО
// import ResourceBar from "./components/ResourceBar"; // Компонент ресурсов - БОЛЬШЕ НЕ НУЖЕН ОТДЕЛЬНО
import Forge from "./components/Forge";
import Achievements from "./components/Achievements";
import RaceSelection from "./components/RaceSelection";
import LoadingScreen from "./components/LoadingScreen";

// Импорты Утилит и Стора
import useGameStore from "./store/useGameStore"; // <--- Убедитесь, что импорт есть
import './App.scss'; // Убедитесь, что здесь есть стили для .app-header, .header-left, .header-right, .player-avatar, .player-info и т.д. и padding для .app-container с env()


  
const App = () => {
    // === Состояния ===
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [needsRaceSelection, setNeedsRaceSelection] = useState(false);
    const [activeLevelData, setActiveLevelData] = useState(null);
    const [loadingError, setLoadingError] = useState(null);
    const [isLoadingLevel, setIsLoadingLevel] = useState(false);

    // === Данные из стора (ЗАМЕНЕНО согласно код1) ===
    // Получаем ВСЕ необходимые данные одним селектором
    const { username, gold, diamonds, powerLevel /*, energy, avatarUrl */ } = useGameStore((state) => ({
        username: state.username,
        gold: state.gold,
        diamonds: state.diamonds,
        powerLevel: state.powerLevel, // <--- УБЕДИТЕСЬ, ЧТО ЭТА СТРОКА ЕСТЬ И РАБОТАЕТ
        // energy: state.energy,         // <--- ОСТАВИТЬ ЗАКОММЕНТИРОВАННЫМ / УДАЛИТЬ, если нет в сторе
        // avatarUrl: state.avatarUrl    // <--- ОСТАВИТЬ ЗАКОММЕНТИРОВАННЫМ / УДАЛИТЬ, если нет в сторе
    }));

    // Actions из стора (остаются как были, если нужны)
    const setUsername = useGameStore((s) => s.setUsername);
    const initializeCharacterStats = useGameStore((s) => s.initializeCharacterStats);
    const checkAndRefreshDailyDeals = useGameStore((s) => s.checkAndRefreshDailyDeals);

    // Хуки роутера
    const navigate = useNavigate();
    const location = useLocation();

    // === ЗАГЛУШКИ ТОЛЬКО ДЛЯ ТОГО, ЧЕГО НЕТ В СТОРЕ (ДОБАВЛЕНО из код1) ===
    const avatarUrl = "/assets/default-avatar.png";   // Заглушка для аватара (используем, т.к. avatarUrl закомментирован в селекторе)
    const energy = { current: "??", max: "??" };    // Заглушка для энергии (используем, т.к. energy закомментирован в селекторе)
    const tonShards = 0; // <--- ДОБАВЬТЕ ЭТУ СТРОКУ (или null, или '???' - любое значение-заглушка)


    // ❗ Убедитесь, что нет других объявлений `const powerLevel = ...`, `const gold = ...` и т.д. вне useGameStore

    // === Эффект для проверки начального состояния (ОСТАВЛЕН ИЗ КОД2) ===
    useEffect(() => {
        console.log("App Mount: Проверка начального состояния...");
        let initialUsername = null;
        let chosenRace = null;
        let raceIsChosen = false;

        try {
            initialUsername = localStorage.getItem('username');
            chosenRace = localStorage.getItem('chosenRace');
            raceIsChosen = localStorage.getItem('raceChosen') === 'true';
        } catch (e) { console.error("Ошибка чтения localStorage:", e); }

        console.log(`Данные из localStorage: raceChosen=${raceIsChosen}, chosenRace=${chosenRace}, username=${initialUsername}`);

        let shouldGoToRaceSelection = false;
        if (!raceIsChosen || !chosenRace) {
            console.log("Нужен выбор расы.");
            shouldGoToRaceSelection = true;
            setNeedsRaceSelection(true);
        } else {
            console.log(`Инициализация стора: Раса=${chosenRace}, Имя=${initialUsername || 'нет'}`);
            // Проверяем наличие функций перед вызовом
            if (initializeCharacterStats) initializeCharacterStats(chosenRace);
            if (initialUsername && setUsername) setUsername(initialUsername);
            setNeedsRaceSelection(false);
        }
        if (checkAndRefreshDailyDeals) checkAndRefreshDailyDeals();

        const loadingDuration = 500;
        console.log(`Показ экрана загрузки на ${loadingDuration}ms...`);

        const timer = setTimeout(() => {
            console.log("Таймер сработал. Завершение начальной загрузки.");
            setIsInitialLoading(false);
            if (shouldGoToRaceSelection) {
                console.log("Переход на /race-selection");
                navigate('/race-selection', { replace: true });
            } else if (location.pathname === '/' || location.pathname.startsWith('/loading')) {
                console.log("Переход на /main");
                navigate('/main', { replace: true });
            } else {
                console.log("Остаемся на текущем пути:", location.pathname);
            }
        }, loadingDuration);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [/* initializeCharacterStats, setUsername, checkAndRefreshDailyDeals, navigate, location.pathname */]); // Зависимости можно уточнить, если эти функции стабильны


    // === Обработчики действий пользователя (ОСТАВЛЕНЫ ИЗ КОД2) ===
    const handleStartGame = useCallback(async (chapterId, levelId) => {
        console.log(`🚀 Запрос на старт: Глава ${chapterId}, Уровень ${levelId}`);
        setIsLoadingLevel(true);
        setActiveLevelData(null);
        setLoadingError(null);
        navigate(`/level/${levelId}/loading`);
        try {
            const dataPath = `/data/levels/level${levelId}Data.json`;
            console.log(`Загрузка данных уровня: ${dataPath}`);
            const response = await fetch(dataPath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${dataPath}`);
            const loadedData = await response.json();
            // Добавим проверку на соответствие levelId
            if (!loadedData || typeof loadedData.id !== 'number' || loadedData.id !== parseInt(levelId, 10)) { // Сравнение с числом
                throw new Error(`Некорректные данные или ID (${loadedData?.id}) не совпадает с запрошенным (${levelId})`);
             }
            console.log(`✅ Данные для уровня ${levelId} загружены.`);
            setActiveLevelData(loadedData);
            setIsLoadingLevel(false);
            navigate(`/level/${levelId}`);
        } catch (error) {
            console.error(`❌ Ошибка загрузки уровня ${levelId}:`, error);
            setLoadingError(`Не удалось загрузить уровень ${levelId}. ${error.message}`);
            setIsLoadingLevel(false);
            navigate("/main");
            setActiveLevelData(null);
        }
    }, [navigate]);

    const handleLevelComplete = useCallback(() => {
        console.log("🏁 Уровень завершён, возврат в меню.");
        setActiveLevelData(null);
        navigate("/main");
    }, [navigate]);

    const handleLevelReady = useCallback(() => {
        console.log("🎮 Компонент Уровня готов к игре!");
    }, []);

    const handleRaceSelectionComplete = useCallback(() => {
        setNeedsRaceSelection(false);
        navigate('/main');
    }, [navigate]);


    // === Основной рендер компонента App ===

    // Показываем начальный экран загрузки
    if (isInitialLoading) {
        return <LoadingScreen key="loading_initial" message="Загрузка игры..." />;
    }

    // Редирект на выбор расы, если нужно (как в код2)
    if (needsRaceSelection && location.pathname !== '/race-selection') {
         return <LoadingScreen key="redirecting_to_race" message="Подготовка выбора расы..." />;
    }

    return (
        // ▼ Убедитесь, что у .app-container есть padding с env(...) в App.scss ▼
        <div className="app-container">

            {/* Попап для ввода имени пользователя (остается здесь) */}
            {!isInitialLoading && !needsRaceSelection && !location.pathname.startsWith('/level') && <UsernamePopup />}

            {/* ▼▼▼ ШАПКА (ОБНОВЛЕНО согласно код1) ▼▼▼ */}
            {/* Условие показа шапки */}
            {!isInitialLoading && !needsRaceSelection && !location.pathname.startsWith('/level') && (
                 <header className="app-header">

                 {/* Левая часть */}
                 <div className="header-left">
                   <img src={avatarUrl} alt="Аватар" className="player-avatar" />
                   <div className="player-info">
                     <span className="player-name">{username || "Гость"}</span>
                     <span className="player-power">{powerLevel?.toLocaleString() ?? '...'}</span>
                   </div>
                 </div>
             
                 {/* Центральная часть (Ресурсы) */}
                 <div className="header-center resource-group">
                     {/* Золото */}
                     <div className="resource-item gold-item">
                       <img src="/assets/coin-icon.png" alt="Золото" className="resource-icon" />
                       <span>{gold?.toLocaleString() ?? '0'}</span>
                     </div>
                     {/* Алмазы */}
                     <div className="resource-item diamond-item">
                       <img src="/assets/diamond-image.png" alt="Алмазы" className="resource-icon" />
                       <span>{diamonds?.toLocaleString() ?? '0'}</span>
                     </div>
                     {/* Осколки TON (Пример) */}
                     <div className="resource-item toncoin-item">
                       <img src="/assets/toncoin-icon.png" alt="Осколки" className="resource-icon" />
                       {/* Замените tonShards на вашу переменную из стора */}
                       <span>{tonShards?.toLocaleString() ?? '0'}</span>
                     </div>
                 </div>
             
                 {/* Правая часть (Энергия) */}
                 <div className="header-right">
                     <div className="resource-item energy-item">
                       <img src="/assets/icon-energy.png" alt="Энергия" className="resource-icon" />
                       <span>{`${energy?.current ?? '?'}/${energy?.max ?? '?'}`}</span>
                     </div>
                 </div>
               </header>
            )}
            {/* ▲▲▲ КОНЕЦ ШАПКИ ▲▲▲ */}

            {/* ❗ Старые компоненты PowerLevel, ResourceBar удалены из рендера, их данные теперь в <header> */}

            {/* Основная область для контента */}
            <main className="content-area">
                <AnimatePresence mode="wait" initial={false}>
                    {/* Routes (ОСТАВЛЕНЫ ИЗ КОД2) */}
                    <Routes location={location} key={location.pathname}>
                        <Route path="/race-selection" element={<RaceSelection onComplete={handleRaceSelectionComplete} />} />
                        <Route path="/level/:levelId/loading" element={<LoadingScreen message="Загрузка уровня..." />} />
                        <Route path="/level/:levelId" element={
                            activeLevelData ? (
                                <Level levelData={activeLevelData} onLevelComplete={handleLevelComplete} onReady={handleLevelReady}/>
                            ) : isLoadingLevel ? (
                                <LoadingScreen message="Загрузка данных..." />
                            ) : (
                                <motion.div key="error_level_data" className="loading-screen">
                                    <h2>Ошибка: Данные уровня не найдены!</h2>
                                    <button onClick={() => navigate('/main')}>В меню</button>
                                </motion.div>
                            )
                        }/>
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/shop" element={<Shop />} />
                        <Route path="/forge" element={<Forge />} />
                        <Route path="/achievements" element={<Achievements />} />
                        <Route path="/main" element={<MainMenu onStart={handleStartGame} />} />
                        <Route path="*" element={<MainMenu onStart={handleStartGame} />} /> {/* Или страница 404 */}
                    </Routes>
                </AnimatePresence>
            </main>

            {/* Нижняя навигация */}
            {!isInitialLoading && !needsRaceSelection && !location.pathname.startsWith('/level') && (
                <BottomNav />
            )}

            {/* Попап для отображения ошибок загрузки */}
            {loadingError && (
                <div className="error-popup">
                    <p>{loadingError}</p>
                    <button onClick={() => setLoadingError(null)}>OK</button>
                </div>
            )}
        </div>
    );
};

export default App;