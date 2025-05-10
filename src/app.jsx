// src/App.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react'; // useMemo убран, так как не используется в итоговом коде
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Импорты Компонентов
import MainMenu from "./components/MainMenu";
import Level from "./components/Level";
import Inventory from "./components/Inventory";
import Shop from "./components/Shop";
import BottomNav from "./components/BottomNav";
import UsernamePopup from "./components/UsernamePopup";
import Forge from "./components/Forge";
import Achievements from "./components/Achievements";
import RaceSelection from "./components/RaceSelection";
import LoadingScreen from "./components/LoadingScreen";
import RewardsScreen from "./components/RewardsScreen";
// import GlobalMap from "./components/GlobalMap"; // НЕ НУЖЕН КАК МАРШРТУТ В APP.JSX (согласно код1)
// WorldMap также не импортируется здесь, предполагается, что MainMenu управляет им

// Импорты Утилит и Стора
import useGameStore from "./store/useGameStore";
import './App.scss';

const ENERGY_REFILL_INTERVAL_MS = 30 * 60 * 1000;

// const pageVariants = { ... }; // Можно оставить или убрать, если не используются глобально
// const pageTransition = { ... };

const App = () => {
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [needsRaceSelection, setNeedsRaceSelection] = useState(false);
    const [activeLevelData, setActiveLevelData] = useState(null);
    const [loadingError, setLoadingError] = useState(null);
    const [isLoadingLevel, setIsLoadingLevel] = useState(false);
    const [refillTimerDisplay, setRefillTimerDisplay] = useState("");
    const [shouldShowRefillTimer, setShouldShowRefillTimer] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const appContainerRef = useRef(null);

    const {
        username, gold, diamonds, powerLevel, energyCurrent, energyMax,
        lastEnergyRefillTimestamp, refillEnergyOnLoad, consumeEnergy,
        // setCurrentChapterInStore, // Удалено, т.к. коллбэки карты переехали в MainMenu
        // currentChapterIdFromStore, // Удалено, т.к. коллбэки карты переехали в MainMenu
        isFullScreenMapActive // Это состояние используется для скрытия UI
    } = useGameStore(
        useCallback(state => ({
            username: state.username,
            gold: state.gold,
            diamonds: state.diamonds,
            powerLevel: state.powerLevel,
            energyCurrent: state.energyCurrent,
            energyMax: state.energyMax,
            lastEnergyRefillTimestamp: state.lastEnergyRefillTimestamp,
            refillEnergyOnLoad: state.refillEnergyOnLoad,
            consumeEnergy: state.consumeEnergy,
            // setCurrentChapterInStore: state.setCurrentChapter, // Логика карты в MainMenu
            // currentChapterIdFromStore: state.currentChapterId, // Логика карты в MainMenu
            isFullScreenMapActive: state.isFullScreenMapActive,
        }), [])
    );

    const setUsernameAction = useGameStore((s) => s.setUsername);
    const initializeCharacterStats = useGameStore((s) => s.initializeCharacterStats);
    const checkAndRefreshDailyDeals = useGameStore((s) => s.checkAndRefreshDailyDeals);

    const avatarUrl = "/assets/default-avatar.png";
    const tonShards = 0; // Пример значения

    // useEffect для таймера энергии (остается как в код2)
    useEffect(() => {
        let intervalId = null;
        const updateTimer = () => {
            if (energyCurrent < energyMax) {
                setShouldShowRefillTimer(true);
                const nextRefillTimestamp = lastEnergyRefillTimestamp + ENERGY_REFILL_INTERVAL_MS;
                const now = Date.now();
                let remainingMs = nextRefillTimestamp - now;

                if (remainingMs <= 0) {
                    console.log("Timer expired, triggering refill check via action...");
                    refillEnergyOnLoad();
                    if (intervalId) clearInterval(intervalId);
                } else {
                    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    setRefillTimerDisplay(
                        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                    );
                }
            } else {
                setShouldShowRefillTimer(false);
                setRefillTimerDisplay("");
                if (intervalId) clearInterval(intervalId);
            }
        };

        if (energyCurrent < energyMax) {
            updateTimer();
            intervalId = setInterval(updateTimer, 1000);
        } else {
            setShouldShowRefillTimer(false);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [energyCurrent, energyMax, lastEnergyRefillTimestamp, refillEnergyOnLoad]);

    // useEffect для начальной загрузки и проверки состояния (остается как в код2, но с учетом переменных из код1)
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
            if (initialUsername && setUsernameAction) setUsernameAction(initialUsername);
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
            } else if (location.pathname === '/' || location.pathname.startsWith('/loading') || location.pathname === '/race-selection') {
                console.log("Переход на /main");
                navigate('/main', { replace: true });
            } else {
                console.log("Остаемся на текущем пути:", location.pathname);
            }
        }, loadingDuration);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate, initializeCharacterStats, setUsernameAction, checkAndRefreshDailyDeals]);

    // Условия видимости UI теперь проще (isFullScreenMapActive будет управлять скрытием UI из MainMenu)
    const path = location.pathname;
    // const { isFullScreenMapActive } = useGameStore(state => ({ isFullScreenMapActive: state.isFullScreenMapActive })); // Уже получено выше

    const showAnyFixedUI =
        !path.startsWith('/level/') &&
        !isInitialLoading &&
        !needsRaceSelection &&
        path !== '/rewards' && // Rewards может быть полноэкранным
        !isFullScreenMapActive; // <<< ГЛАВНОЕ УСЛОВИЕ ОТ СТОРА (из код1)

    const showPlayerInfo = showAnyFixedUI && (path === '/main' || path === '/inventory');
    const showResources = showAnyFixedUI && (path === '/main' || path === '/inventory' || path === '/shop' || path === '/forge');
    const showEnergyBar = showAnyFixedUI && (path === '/main');
    const shouldShowBottomNav = showAnyFixedUI; // BottomNav также зависит от showAnyFixedUI (согласно код1)


    // === ОБРАБОТЧИКИ ДЛЯ НАВИГАЦИИ (остаются как в код2) ===
    const handleStartGame = useCallback(async (chapterId, levelId) => {
        const ENERGY_COST = 10;
        console.log(`Попытка старта уровня ${levelId}. Стоимость: ${ENERGY_COST} энергии.`);
        const hasEnoughEnergy = consumeEnergy(ENERGY_COST);

        if (!hasEnoughEnergy) {
            alert("Недостаточно энергии для старта уровня!");
            console.log("Старт уровня отменен из-за нехватки энергии.");
            return;
        }

        console.log(`🚀 Запрос на старт: Глава ${chapterId}, Уровень ${levelId}`);
        setIsLoadingLevel(true);
        setActiveLevelData(null);
        setLoadingError(null);
        navigate(`/level/${levelId}/loading`);
        try {
            const dataPath = `/data/levels/level${levelId}Data.json`;
            console.log(`Загрузка данных уровня: ${dataPath}`);
            await new Promise(resolve => setTimeout(resolve, 300));
            const response = await fetch(dataPath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${dataPath}`);
            const loadedData = await response.json();

            if (!loadedData || typeof loadedData.id !== 'number' || loadedData.id !== parseInt(levelId, 10)) {
                throw new Error(`Некорректные данные или ID (${loadedData?.id}) не совпадает с запрошенным (${levelId})`);
            }
            console.log(`✅ Данные для уровня ${levelId} загружены.`);
            setActiveLevelData(loadedData);
            setIsLoadingLevel(false);
            navigate(`/level/${levelId}`, { replace: true });
        } catch (error) {
            console.error(`❌ Ошибка загрузки уровня ${levelId}:`, error);
            setLoadingError(`Не удалось загрузить уровень ${levelId}. ${error.message}`);
            setIsLoadingLevel(false);
            navigate("/main", { replace: true });
            setActiveLevelData(null);
        }
    }, [navigate, consumeEnergy]);

    const getChapterIdFromLevelId = (levelId) => {
        if (typeof levelId === 'number' && levelId >= 100) {
            return Math.floor(levelId / 100);
        }
        console.warn("[getChapterIdFromLevelId] Не удалось определить ID главы для levelId:", levelId);
        return null;
    };

    const handleLevelComplete = useCallback((levelId, status, difficultyPlayed) => {
        console.log(`🏁 Уровень ${levelId} (сложность: ${difficultyPlayed}) завершён со статусом: ${status}`);
        setActiveLevelData(null);

        if (status === 'won') {
            const chapterId = getChapterIdFromLevelId(levelId);
            if (chapterId !== null) {
                useGameStore.getState().completeLevelAction(chapterId, levelId, difficultyPlayed);
                console.log(`Прогресс для уровня ${levelId} (Глава ${chapterId}) на сложности '${difficultyPlayed}' сохранен.`);
            } else {
                console.error("Не удалось определить ID главы для сохранения прогресса уровня.");
            }
            console.log("Переход в главное меню...");
            navigate("/main");
        } else if (status === 'lost') {
            console.log("Переход в главное меню...");
            navigate("/main");
        } else {
            console.log("Ошибка уровня или неизвестный статус, переход в главное меню...");
            navigate("/main");
        }
    }, [navigate]);

    const handleLevelReady = useCallback(() => {
        console.log("🎮 Компонент Уровня готов к игре!");
    }, []);

    const handleRaceSelectionComplete = useCallback(() => {
        console.log("Раса выбрана, перенаправление в главное меню.");
        setNeedsRaceSelection(false);
        navigate('/main', { replace: true });
    }, [navigate]);

    // === КОЛЛБЭКИ ДЛЯ GLOBALMAP УДАЛЕНЫ ИЗ APP.JSX (согласно код1, логика переезжает в MainMenu.jsx) ===
    // const handleSelectContinentOnGlobalMap = useCallback(...) // Удалено
    // const handleGoBackToWorldMapFromGlobalMap = useCallback(...) // Удалено


    if (isInitialLoading) {
        return <LoadingScreen key="loading_initial" message="Загрузка игры..." />;
    }

    if (needsRaceSelection && location.pathname !== '/race-selection') {
        return <LoadingScreen key="redirecting_to_race" message="Подготовка выбора расы..." />;
    }

    return (
        <div className="app-container" ref={appContainerRef}>
            {/* Плавающие UI элементы, условия обновлены согласно код1 */}
            {showPlayerInfo && (
                <div className="player-info-float">
                    <img src={avatarUrl} alt="Аватар" className="player-avatar-small" />
                    <div className="player-details">
                        <span className="player-name">{username || "Гость"}</span>
                        <span className="player-power">{powerLevel?.toLocaleString() ?? '...'}</span>
                    </div>
                </div>
            )}
            {showResources && (
                <div className="resources-float">
                    <div className="resource-item-float">
                        <img src="/assets/coin-icon.png" alt="Золото" className="resource-icon-small" />
                        <span>{gold?.toLocaleString() ?? '0'}</span>
                    </div>
                    <div className="resource-item-float">
                        <img src="/assets/diamond-image.png" alt="Алмазы" className="resource-icon-small" />
                        <span>{diamonds?.toLocaleString() ?? '0'}</span>
                    </div>
                    <div className="resource-item-float">
                        <img src="/assets/toncoin-icon.png" alt="Осколки" className="resource-icon-small" />
                        <span>{tonShards?.toLocaleString() ?? '0'}</span>
                    </div>
                </div>
            )}
            {showEnergyBar && (
                <div className="energy-bar-float">
                    <div className="energy-bar-content">
                        <img src="/assets/energy-icon.png" alt="" className="resource-icon-small energy-icon" />
                        <div className="energy-track">
                            <div
                                className="energy-fill"
                                style={{ width: `${(energyMax > 0) ? (energyCurrent / energyMax * 100) : 0}%` }}
                            ></div>
                        </div>
                        <span className="energy-text">{`${energyCurrent ?? '?'}/${energyMax ?? '?'}`}</span>
                    </div>
                    { shouldShowRefillTimer && refillTimerDisplay && (
                       <div className="energy-refill-timer">
                           Восполнится через {refillTimerDisplay}
                       </div>
                    )}
                </div>
            )}
            {/* UsernamePopup с условием, зависящим от showAnyFixedUI */}
            {showAnyFixedUI && <UsernamePopup />}

            <main className="content-area">
                <AnimatePresence mode="wait" initial={false}>
                    <Routes location={location} key={location.pathname}>
                        {/* Маршруты как в код2, но без /global-map */}
                        <Route path="/race-selection" element={<RaceSelection onComplete={handleRaceSelectionComplete} />} />
                        <Route path="/level/:levelId/loading" element={<LoadingScreen message="Загрузка уровня..." />} />
                        <Route path="/level/:levelId" element={
                            activeLevelData ? (
                                <Level
                                    levelData={activeLevelData}
                                    onLevelComplete={handleLevelComplete}
                                    onReady={handleLevelReady}
                                    difficulty={activeLevelData.difficulty || 'normal'}
                                />
                            )
                            : isLoadingLevel ? ( <LoadingScreen message="Загрузка данных уровня..." /> )
                            : (
                                <motion.div
                                    key="error_level_data_not_found"
                                    className="loading-screen"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                >
                                   <h2>Ошибка: Данные уровня не найдены!</h2>
                                   <p>Возможно, вы попали сюда по неверной ссылке или данные уровня не загрузились.</p>
                                   <button onClick={() => navigate('/main', { replace: true })}>В меню</button>
                                </motion.div>
                            )
                        }/>
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/shop" element={<Shop />} />
                        <Route path="/forge" element={<Forge />} />
                        <Route path="/achievements" element={<Achievements />} />
                        <Route path="/rewards" element={<RewardsScreen />} />

                        {/* НЕТ ОТДЕЛЬНОГО МАРШРУТА ДЛЯ /global-map (согласно код1) */}
                        {/* MainMenu будет обрабатывать отображение WorldMap и GlobalMap */}
                        <Route path="/main" element={<MainMenu onStart={handleStartGame} />} />
                        <Route path="*" element={<MainMenu onStart={handleStartGame} />} /> {/* Фоллбэк на главный экран */}
                    </Routes>
                </AnimatePresence>
            </main>

            {/* BottomNav с условием, зависящим от showAnyFixedUI */}
            {shouldShowBottomNav && <BottomNav />}

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