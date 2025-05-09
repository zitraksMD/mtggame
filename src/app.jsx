// src/App.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
import GlobalMap from "./components/GlobalMap";

// Импорты Утилит и Стора
import useGameStore from "./store/useGameStore";
import './App.scss';

// 30 минут в миллисекундах
const ENERGY_REFILL_INTERVAL_MS = 30 * 60 * 1000;

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
        setCurrentChapterInStore,
        currentChapterIdFromStore
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
            setCurrentChapterInStore: state.setCurrentChapter,
            currentChapterIdFromStore: state.currentChapterId,
        }), [])
    );

    const setUsernameAction = useGameStore((s) => s.setUsername);
    const initializeCharacterStats = useGameStore((s) => s.initializeCharacterStats);
    const checkAndRefreshDailyDeals = useGameStore((s) => s.checkAndRefreshDailyDeals);
    const completeLevelActionInStore = useGameStore((s) => s.completeLevelAction);

    const avatarUrl = "/assets/default-avatar.png";
    const tonShards = 0;

    useEffect(() => {
        let intervalId = null;
        const updateTimer = () => {
            if (energyCurrent < energyMax) {
                setShouldShowRefillTimer(true);
                const nextRefillTimestamp = lastEnergyRefillTimestamp + ENERGY_REFILL_INTERVAL_MS;
                const now = Date.now();
                let remainingMs = nextRefillTimestamp - now;

                if (remainingMs <= 0) {
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

    const path = location.pathname;
    const showAnyFixedUI = !path.startsWith('/level/') &&
        !isInitialLoading &&
        !needsRaceSelection &&
        path !== '/rewards' &&
        path !== '/global-map';

    const showPlayerInfo = showAnyFixedUI && (path === '/main' || path === '/inventory');
    const showResources = showAnyFixedUI && (path === '/main' || path === '/inventory' || path === '/shop' || path === '/forge');
    const showEnergyBar = showAnyFixedUI && (path === '/main');

    useEffect(() => {
        console.log("App Mount: Проверка начального состояния...");
        let initialUsernameStored = null;
        let chosenRaceStored = null;
        let raceIsChosenStored = false;

        try {
            initialUsernameStored = localStorage.getItem('username');
            chosenRaceStored = localStorage.getItem('chosenRace');
            raceIsChosenStored = localStorage.getItem('raceChosen') === 'true';
        } catch (e) { console.error("Ошибка чтения localStorage:", e); }

        console.log(`Данные из localStorage: raceChosen=${raceIsChosenStored}, chosenRace=${chosenRaceStored}, username=${initialUsernameStored}`);

        let shouldGoToRaceSelection = false;
        if (!raceIsChosenStored || !chosenRaceStored) {
            console.log("Нужен выбор расы.");
            shouldGoToRaceSelection = true;
            setNeedsRaceSelection(true);
        } else {
            console.log(`Инициализация стора: Раса=${chosenRaceStored}, Имя=${initialUsernameStored || 'нет'}`);
            if (initializeCharacterStats) initializeCharacterStats(chosenRaceStored);
            if (initialUsernameStored && setUsernameAction) setUsernameAction(initialUsernameStored);
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

    const getChapterIdFromLevelId = (levelId) => {
        const numericLevelId = parseInt(levelId, 10);
        if (typeof numericLevelId === 'number' && numericLevelId >= 100) {
            return Math.floor(numericLevelId / 100);
        }
        console.warn("[getChapterIdFromLevelId] Не удалось определить ID главы для levelId:", levelId);
        return null;
    };

    const handleStartGame = useCallback(async (chapterId, levelId) => {
        const ENERGY_COST = 10;
        if (!consumeEnergy(ENERGY_COST)) {
            alert("Недостаточно энергии!");
            console.log("Старт уровня отменен из-за нехватки энергии.");
            return;
        }

        console.log(`🚀 Запрос на старт: Глава ${chapterId}, Уровень ${levelId}`);
        setIsLoadingLevel(true);
        setActiveLevelData(null);
        setLoadingError(null);
        navigate(`/level/${levelId}/loading`);

        try {
            const levelModule = await import(`./data/levels/level${levelId}Data.json`);
            const loadedData = levelModule.default;

            if (!loadedData || typeof loadedData.id !== 'number' || loadedData.id !== parseInt(levelId, 10)) {
                throw new Error(`Некорректные данные или ID (${loadedData?.id}) не совпадает с запрошенным (${levelId})`);
            }
            console.log(`✅ Данные для уровня ${levelId} загружены.`);
            setActiveLevelData({ ...loadedData, chapterId: chapterId });
            setIsLoadingLevel(false);
            navigate(`/level/${levelId}`, { replace: true });
        } catch (error) {
            console.error(`❌ Ошибка загрузки уровня ${levelId}:`, error);
            setLoadingError(`Не удалось загрузить уровень ${levelId}. ${error.message}`);
            setIsLoadingLevel(false);
            navigate("/main", { replace: true });
            setActiveLevelData(null);
        }
    }, [navigate, consumeEnergy, setIsLoadingLevel, setActiveLevelData, setLoadingError]);


    const handleLevelComplete = useCallback((levelId, status, difficultyPlayed) => {
        console.log(`🏁 Уровень ${levelId} (сложность: ${difficultyPlayed}) завершён со статусом: ${status}`);
        setActiveLevelData(null);

        if (status === 'won') {
            const chapterId = getChapterIdFromLevelId(levelId);
            if (chapterId !== null && completeLevelActionInStore) {
                completeLevelActionInStore(chapterId, parseInt(levelId, 10), difficultyPlayed);
                console.log(`Прогресс для уровня ${levelId} (Глава ${chapterId}) на сложности '${difficultyPlayed}' сохранен.`);
            } else {
                console.error("Не удалось определить ID главы или completeLevelActionInStore не доступен для сохранения прогресса уровня.");
            }
            console.log("Переход на экран наград...");
            navigate("/rewards");
        } else {
            console.log("Переход в главное меню...");
            navigate("/main");
        }
    }, [navigate, setActiveLevelData, completeLevelActionInStore]);

    const handleLevelReady = useCallback(() => {
        console.log("🎮 Компонент Уровня готов к игре!");
    }, []);

    const handleRaceSelectionComplete = useCallback(() => {
        console.log("Раса выбрана, перенаправление в главное меню.");
        setNeedsRaceSelection(false);
        navigate('/main', { replace: true });
    }, [navigate]);

    // --- ИЗМЕНЕННЫЕ КОЛЛБЭКИ ДЛЯ GlobalMap ИЗ КОДА 1 ---
    const handleSelectContinentOnGlobalMap = useCallback((startChapterId) => {
        console.log(`App: Выбран континент на GlobalMap, переход к главе ${startChapterId}, показываем карту глав.`); // Изменено сообщение
        if (setCurrentChapterInStore) {
            setCurrentChapterInStore(startChapterId);
        } else {
            console.warn("setCurrentChapterInStore is not available from useGameStore");
        }
        // Передаем состояние, чтобы MainMenu сразу показал WorldMap.jsx (карта глав)
        navigate('/main', { state: { showChaptersMapDirectly: true } }); // Изменена навигация
    }, [navigate, setCurrentChapterInStore]);

    const handleGoBackToChapterMapFromGlobalMap = useCallback(() => {
        console.log(`App: Возврат на карту глав с GlobalMap (последняя глава: ${currentChapterIdFromStore || 1})`); // Сообщение соответствует коду 1
        if (!currentChapterIdFromStore && setCurrentChapterInStore) { // Изменена логика установки главы по умолчанию
            setCurrentChapterInStore(1);
        }
        // Просто возвращаемся в MainMenu, он покажет детальную карту текущей главы
        navigate('/main');
    }, [navigate, currentChapterIdFromStore, setCurrentChapterInStore]);
    // --- КОНЕЦ ИЗМЕНЕННЫХ КОЛЛБЭКОВ ---


    if (isInitialLoading) {
        return <LoadingScreen key="loading_initial" message="Загрузка игры..." />;
    }
    if (needsRaceSelection && location.pathname !== '/race-selection') {
        return <LoadingScreen key="redirecting_to_race" message="Подготовка выбора расы..." />;
    }

    return (
        <div className="app-container" ref={appContainerRef}>
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
                        <img src="/assets/energy-icon.png" alt="Энергия" className="resource-icon-small energy-icon" />
                        <div className="energy-track">
                            <div
                                className="energy-fill"
                                style={{ width: `${(energyMax > 0) ? (energyCurrent / energyMax * 100) : 0}%` }}
                            ></div>
                        </div>
                        <span className="energy-text">{`${energyCurrent ?? '?'}/${energyMax ?? '?'}`}</span>
                    </div>
                    {shouldShowRefillTimer && refillTimerDisplay && (
                        <div className="energy-refill-timer">
                            Восполнится через {refillTimerDisplay}
                        </div>
                    )}
                </div>
            )}

            {!isInitialLoading && !needsRaceSelection && !location.pathname.startsWith('/level') && !location.pathname.startsWith('/rewards') && !location.pathname.startsWith('/global-map') && <UsernamePopup />}

            <main className="content-area">
                <AnimatePresence mode="wait" initial={false}>
                    <Routes location={location} key={location.pathname}>
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
                            ) : isLoadingLevel ? (
                                <LoadingScreen message="Загрузка данных уровня..." />
                            ) : (
                                <motion.div
                                    key="error_level_data_not_found"
                                    className="loading-screen"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                >
                                    <h2>Ошибка: Данные уровня не найдены!</h2>
                                    <p>Возможно, уровень не существует или произошла ошибка при загрузке.</p>
                                    <button onClick={() => navigate('/main', { replace: true })}>В меню</button>
                                </motion.div>
                            )
                        }/>
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/shop" element={<Shop />} />
                        <Route path="/forge" element={<Forge />} />
                        <Route path="/achievements" element={<Achievements />} />
                        <Route path="/rewards" element={<RewardsScreen />} />

                        {/* Маршрут для Глобальной Карты (уже был, использует обновленные коллбэки) */}
                        <Route
                            path="/global-map"
                            element={
                                <GlobalMap
                                    onSelectContinent={handleSelectContinentOnGlobalMap}
                                    onGoBackToChapterMap={handleGoBackToChapterMapFromGlobalMap}
                                />
                            }
                        />

                        <Route path="/main" element={<MainMenu onStart={handleStartGame} />} />
                        <Route path="*" element={<MainMenu onStart={handleStartGame} />} />
                    </Routes>
                </AnimatePresence>
            </main>

            {!isInitialLoading && !needsRaceSelection && !location.pathname.startsWith('/level') && !location.pathname.startsWith('/rewards') && !location.pathname.startsWith('/global-map') && (
                <BottomNav />
            )}

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