// src/App.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react'; // Добавлен useRef
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Импорты Компонентов
import MainMenu from "./components/MainMenu";
import Level from "./components/Level";
import Inventory from "./components/Inventory";
import Shop from "./components/Shop";
import BottomNav from "./components/BottomNav";
import UsernamePopup from "./components/UsernamePopup";
// Компоненты PowerLevel и ResourceBar больше не нужны, так как их содержимое интегрировано
import Forge from "./components/Forge";
import Achievements from "./components/Achievements";
import RaceSelection from "./components/RaceSelection";
import LoadingScreen from "./components/LoadingScreen";

// Импорты Утилит и Стора
import useGameStore from "./store/useGameStore";
import './App.scss'; // Убедитесь, что здесь есть стили для .app-container, плавающих блоков и их содержимого

const App = () => {
    // === Состояния ===
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [needsRaceSelection, setNeedsRaceSelection] = useState(false);
    const [activeLevelData, setActiveLevelData] = useState(null);
    const [loadingError, setLoadingError] = useState(null);
    const [isLoadingLevel, setIsLoadingLevel] = useState(false);

    // Хуки роутера и реф
    const navigate = useNavigate();
    const location = useLocation();
    const appContainerRef = useRef(null); // Добавлено из Кода 1

    // === Данные из стора ===
    const { username, gold, diamonds, powerLevel } = useGameStore((state) => ({
        username: state.username,
        gold: state.gold,
        diamonds: state.diamonds,
        powerLevel: state.powerLevel,
        // energy и avatarUrl не запрашиваются из стора в Коде 1, используем заглушки
    }));

    // Actions из стора (остаются как были, если нужны)
    const setUsername = useGameStore((s) => s.setUsername);
    const initializeCharacterStats = useGameStore((s) => s.initializeCharacterStats);
    const checkAndRefreshDailyDeals = useGameStore((s) => s.checkAndRefreshDailyDeals);

    // === ЗАГЛУШКИ (Из Кода 1) ===
    const avatarUrl = "/assets/default-avatar.png"; // Как в Коде 1
    const energy = { current: 85, max: 100 };      // Как в Коде 1
    const tonShards = 0;                          // Как в Коде 1

    // === Определение видимости плавающих блоков (Из Кода 1) ===
    const path = location.pathname;
    // Общее условие показа UI поверх (исключая уровень, начальную загрузку, выбор расы)
    const showAnyFixedUI = !path.startsWith('/level/') && !isInitialLoading && !needsRaceSelection;

    // Правила видимости для каждого блока
    const showPlayerInfo = showAnyFixedUI && (path === '/main' || path === '/inventory');
    const showResources = showAnyFixedUI && (path === '/main' || path === '/inventory' || path === '/shop' || path === '/forge');
    const showEnergyBar = showAnyFixedUI && (path === '/main');

    // === Эффект для проверки начального состояния (ОСТАВЛЕН ИЗ КОД2, без изменений логики) ===
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
    }, [/* Зависимости можно оставить пустыми или добавить стабильные функции */]);

    // === Обработчики действий пользователя (ОСТАВЛЕНЫ ИЗ КОД2, без изменений) ===
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
            if (!loadedData || typeof loadedData.id !== 'number' || loadedData.id !== parseInt(levelId, 10)) {
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

    // Показываем начальный экран загрузки (без изменений)
    if (isInitialLoading) {
        return <LoadingScreen key="loading_initial" message="Загрузка игры..." />;
    }

    // Редирект на выбор расы, если нужно (без изменений)
    if (needsRaceSelection && location.pathname !== '/race-selection') {
         return <LoadingScreen key="redirecting_to_race" message="Подготовка выбора расы..." />;
    }

    return (
        <div className="app-container" ref={appContainerRef}> {/* Добавлен ref из Кода 1 */}

            {/* --- Плавающие Блоки (Из Кода 1) --- */}

            {/* Блок Информации о Игроке (Слева) */}
            {showPlayerInfo && (
                <div className="player-info-float">
                    <img src={avatarUrl} alt="Аватар" className="player-avatar-small" /> {/* Класс из Кода 1 */}
                    <div className="player-details">
                        <span className="player-name">{username || "Гость"}</span>
                        <span className="player-power">{powerLevel?.toLocaleString() ?? '...'}</span>
                    </div>
                </div>
            )}

            {/* Блок Ресурсов (Справа) */}
            {showResources && (
                <div className="resources-float">
                    {/* Золото */}
                    <div className="resource-item-float">
                        <img src="/assets/coin-icon.png" alt="Золото" className="resource-icon-small" /> {/* Класс из Кода 1 */}
                        <span>{gold?.toLocaleString() ?? '0'}</span>
                    </div>
                    {/* Алмазы */}
                    <div className="resource-item-float">
                        <img src="/assets/diamond-image.png" alt="Алмазы" className="resource-icon-small" /> {/* Класс из Кода 1 */}
                        <span>{diamonds?.toLocaleString() ?? '0'}</span>
                    </div>
                    {/* Осколки TON */}
                    <div className="resource-item-float">
                        <img src="/assets/icon-toncoin.png" alt="Осколки" className="resource-icon-small" /> {/* Класс из Кода 1 */}
                        <span>{tonShards?.toLocaleString() ?? '0'}</span>
                    </div>
                </div>
            )}

            {/* Блок Энергии (Центр Сверху) */}
            {showEnergyBar && (
                <div className="energy-bar-float">
                    <img src="/assets/icon-energy.png" alt="" className="resource-icon-small energy-icon" /> {/* Класс из Кода 1 */}
                    <div className="energy-track"> {/* Структура из Кода 1 */}
                       <div
                            className="energy-fill"
                            style={{ width: `${(energy?.current && energy?.max && energy.max > 0) ? (energy.current / energy.max * 100) : 0}%` }}
                        ></div>
                    </div>
                    <span className="energy-text">{`${energy?.current ?? '?'}/${energy?.max ?? '?'}`}</span>
                </div>
            )}

            {/* --- Конец Плавающих Блоков --- */}


            {/* Попап для ввода имени пользователя (остается здесь) */}
            {/* Условия показа попапа не меняем, но теперь он будет под плавающими блоками */}
            {!isInitialLoading && !needsRaceSelection && !location.pathname.startsWith('/level') && <UsernamePopup />}

            {/* ❌ Удалена старая <header> из Кода 2 */}

            {/* Основная область для контента (без изменений) */}
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

            {/* Нижняя навигация (условия показа без изменений) */}
            {!isInitialLoading && !needsRaceSelection && !location.pathname.startsWith('/level') && (
                <BottomNav />
            )}

            {/* Попап для отображения ошибок загрузки (без изменений) */}
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