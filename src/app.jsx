// src/App.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import GlobalMap from "./components/GlobalMap";
import TransitionOverlay from './components/TransitionOverlay';

// Импорты Утилит и Стора
import useGameStore from "./store/useGameStore";
import './App.scss';

const ENERGY_REFILL_INTERVAL_MS = 30 * 60 * 1000;

const routeContentVariants = {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: 0.15 } }
};

const App = () => {
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [needsRaceSelection, setNeedsRaceSelection] = useState(false);
    const [activeLevelData, setActiveLevelData] = useState(null); // Из Код 1
    const [loadingError, setLoadingError] = useState(null); // Из Код 1 (и был в Код 2)
    const [isLoadingLevel, setIsLoadingLevel] = useState(false); // Из Код 1 (и был в Код 2)
    const [refillTimerDisplay, setRefillTimerDisplay] = useState("");
    const [shouldShowRefillTimer, setShouldShowRefillTimer] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const appContainerRef = useRef(null);

    const {
        username, gold, diamonds, powerLevel, energyCurrent, energyMax,
        lastEnergyRefillTimestamp, refillEnergyOnLoad, consumeEnergy,
        setCurrentChapterInStore,
        currentChapterIdFromStore,
        isFullScreenMapActive,
        isScreenTransitioning,
        transitionAction,
        onTransitionCloseCompleteCallback,
        onTransitionOpenCompleteCallback
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
            isFullScreenMapActive: state.isFullScreenMapActive,
            isScreenTransitioning: state.isScreenTransitioning,
            transitionAction: state.transitionAction,
            onTransitionCloseCompleteCallback: state.onTransitionCloseCompleteCallback,
            onTransitionOpenCompleteCallback: state.onTransitionOpenCompleteCallback,
        }), [])
    );

    const setUsernameAction = useGameStore((s) => s.setUsername);
    const initializeCharacterStats = useGameStore((s) => s.initializeCharacterStats);
    const checkAndRefreshDailyDeals = useGameStore((s) => s.checkAndRefreshDailyDeals);

    const avatarUrl = "/assets/default-avatar.png";
    const tonShards = 0;

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

    // useEffect для начальной загрузки и проверки состояния (логика из код2)
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

        let shouldGoToRaceSelection = false;
        if (!raceIsChosen || !chosenRace) {
            shouldGoToRaceSelection = true;
            setNeedsRaceSelection(true);
        } else {
            if (initializeCharacterStats) initializeCharacterStats(chosenRace);
            if (initialUsername && setUsernameAction) setUsernameAction(initialUsername);
            setNeedsRaceSelection(false);
        }
        if (checkAndRefreshDailyDeals) checkAndRefreshDailyDeals();

        const loadingDuration = 500;
        const timer = setTimeout(() => {
            setIsInitialLoading(false);
            if (shouldGoToRaceSelection) {
                navigate('/race-selection', { replace: true });
            } else if (location.pathname === '/' || location.pathname.startsWith('/loading') || location.pathname === '/race-selection') {
                 navigate('/main', { replace: true });
            }
        }, loadingDuration);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate, initializeCharacterStats, setUsernameAction, checkAndRefreshDailyDeals]);


    // useEffect для ensureScreenIsOpening (из код1)
    useEffect(() => {
        const storeState = useGameStore.getState();
        if (!storeState.isScreenTransitioning && !isInitialLoading) {
            storeState.ensureScreenIsOpening();
        }
    }, [location.pathname, isInitialLoading]);

    const path = location.pathname;
    const showAnyFixedUI =
        !path.startsWith('/level/') &&
        !isInitialLoading &&
        !needsRaceSelection &&
        path !== '/rewards' &&
        !isFullScreenMapActive;

    const showPlayerInfo = showAnyFixedUI && (path === '/main' || path === '/inventory' || path === '/global-map');
    const showResources = showAnyFixedUI && (path === '/main' || path === '/inventory' || path === '/shop' || path === '/forge' || path === '/global-map');
    const showEnergyBar = showAnyFixedUI && (path === '/main' || path === '/global-map');
    const shouldShowBottomNav = showAnyFixedUI;


    // === ОБРАБОТЧИКИ ===

    // handleStartGame ИЗ КОД 1 (с адаптациями для fetch и зависимостей Код 2)
    const handleStartGame = useCallback(async (chapterId, levelId, difficultyToPlay) => {
        console.log(`[App.jsx handleStartGame] Запрос: Глава ${chapterId}, Уровень ${levelId}, Сложность: ${difficultyToPlay}`);
        const ENERGY_COST = 10; // Пример
        if (!consumeEnergy(ENERGY_COST)) {
            // Используем кастомный alert или модальное окно, если есть
            alert("Недостаточно энергии!");
            return;
        }

        setActiveLevelData(null); // Сбрасываем предыдущие данные уровня
        setIsLoadingLevel(true);  // Включаем флаг общей загрузки уровня
        setLoadingError(null);

        // Сразу переходим на маршрут уровня. Level компонент сам покажет лоадер, если нужно,
        // или App.jsx покажет глобальный лоадер, пока activeLevelData не установится.
        navigate(`/level/${levelId}`);

        try {
            const dataPath = `/data/levels/level${levelId}Data.json`;
            // Имитация задержки сети, если необходимо для тестирования лоадера
            // await new Promise(resolve => setTimeout(resolve, 1000)); 
            const response = await fetch(dataPath);
            
            if (!response.ok) {
                // Попытка получить текст ошибки, если есть
                let errorText = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.message) errorText = errorData.message;
                } catch (e) { /* не удалось получить JSON ошибки, используем стандартный текст */ }
                throw new Error(errorText + ` for ${dataPath}`);
            }
            
            const loadedData = await response.json();

            if (!loadedData || typeof loadedData.id !== 'number' || loadedData.id !== parseInt(levelId, 10)) {
                throw new Error(`Некорректные данные или ID уровня (${loadedData?.id}) не совпадает с запрошенным (${levelId}).`);
            }

            console.log(`[App.jsx handleStartGame] Данные для уровня ${levelId} загружены. Устанавливаем activeLevelData со сложностью: ${difficultyToPlay}`);
            
            setActiveLevelData({
                ...loadedData,
                difficulty: difficultyToPlay, // <<<< ВАЖНО: передаем выбранную сложность
                chapterId: chapterId,      // Если chapterId нужен в levelData
            });
            // setIsLoadingLevel(false); // <- Убираем отсюда, будет в useEffect по Код 1

        } catch (error) {
            console.error(`❌ Ошибка загрузки уровня ${levelId}:`, error);
            setLoadingError(`Не удалось загрузить уровень ${levelId}. ${error.message}`);
            setActiveLevelData(null); // Убедимся, что данных нет
            setIsLoadingLevel(false); // Ошибка, загрузка завершена (неудачно) - Важно для скрытия лоадера
            
            // Возврат в главное меню при ошибке (можно использовать startScreenTransition, если это стандарт)
            // useGameStore.getState().startScreenTransition(() => {
            //     navigate("/main", { replace: true });
            // });
            // Или просто navigate, как в Код 1
            navigate("/main", { replace: true });
        }
        // finally блок не нужен, т.к. setIsLoadingLevel управляется по-другому
    }, [navigate, consumeEnergy]); // Добавьте другие зависимости, если они используются внутри (например, из useGameStore)

    // useEffect из Код 1 для управления isLoadingLevel после установки activeLevelData или ошибки
    useEffect(() => {
        if (activeLevelData && isLoadingLevel) { // Если данные пришли, а мы все еще "грузимся"
            setIsLoadingLevel(false);
        }
        // Если произошла ошибка (loadingError установлен) и мы все еще в состоянии загрузки,
        // то catch в handleStartGame уже должен был установить isLoadingLevel = false.
        // Но для подстраховки можно добавить:
        if (loadingError && isLoadingLevel) {
            setIsLoadingLevel(false);
        }
    }, [activeLevelData, isLoadingLevel, loadingError]);


    const getChapterIdFromLevelId = (levelId) => {
        if (typeof levelId === 'number' && levelId >= 100) {
            return Math.floor(levelId / 100);
        }
        return null;
    };

    const handleLevelComplete = useCallback((levelId, status, difficultyPlayed) => {
        setActiveLevelData(null); // Сбрасываем данные уровня после завершения
        setIsLoadingLevel(false); // Убедимся, что лоадер уровня выключен

        // Логика обновления прогресса в сторе
        if (status === 'won') {
            const chapterId = getChapterIdFromLevelId(levelId);
            if (chapterId !== null) {
                useGameStore.getState().completeLevelAction(chapterId, levelId, difficultyPlayed);
                // Тут можно подготовить данные для RewardsScreen, если он их ожидает через state
            }
        }

        // Навигация после завершения уровня
        useGameStore.getState().startScreenTransition(() => {
            // В Код 1 было: navigate(status === 'won' ? "/rewards" : "/main");
            // В Код 2 всегда на "/main".
            // Давайте сделаем переход на экран наград при победе, это логично.
            if (status === 'won') {
                // Можно передать ID уровня и сложность в RewardsScreen через location.state, если необходимо
                navigate("/main", { state: { completedLevelId: levelId, difficulty: difficultyPlayed } });
            } else {
                navigate("/main");
            }
        });
    }, [navigate]);

    const handleLevelReady = useCallback(() => {
        // console.log("🎮 Компонент Уровня готов к игре!");
        // Можно убрать isLoadingLevel здесь, если компонент Level сам сигнализирует о полной готовности
        // Но по логике Код 1, isLoadingLevel управляется в App.jsx на основе activeLevelData
    }, []);

    const handleRaceSelectionComplete = useCallback(() => {
        setNeedsRaceSelection(false);
        useGameStore.getState().startScreenTransition(() => {
            navigate('/main', { replace: true });
        });
    }, [navigate]);

    const handleSelectContinentOnGlobalMap = useCallback((startChapterIdForFocus) => {
        useGameStore.getState().startScreenTransition(() => {
            if (setCurrentChapterInStore) {
                setCurrentChapterInStore(startChapterIdForFocus);
            }
            navigate('/main', { state: { showChaptersMapDirectly: true, focusOnChapterId: startChapterIdForFocus } });
        });
    }, [navigate, setCurrentChapterInStore]);

    const handleGoBackToMainFromGlobalMap = useCallback(() => {
        useGameStore.getState().startScreenTransition(() => {
            navigate('/main', { state: { showChaptersMapDirectly: true, focusOnChapterId: currentChapterIdFromStore || 1 } });
        });
    }, [navigate, currentChapterIdFromStore]);


    if (isInitialLoading) {
        return <LoadingScreen key="loading_initial" message="Загрузка игры..." />;
    }

    if (needsRaceSelection && location.pathname !== '/race-selection') {
       if (location.pathname !== '/race-selection') {
            navigate('/race-selection', { replace: true });
       }
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
            {showAnyFixedUI && <UsernamePopup />}

            <main className="content-area">
                <AnimatePresence mode="wait" initial={false}>
                    <Routes location={location} key={location.pathname}>
                        <Route path="/race-selection" element={
                            <motion.div key="raceselection" {...routeContentVariants}>
                                <RaceSelection onComplete={handleRaceSelectionComplete} />
                            </motion.div>
                        } />

                        {/* Маршрут для уровня, измененный согласно Код 1 */}
                        <Route path="/level/:levelId" element={
                            <motion.div key="levelroute" {...routeContentVariants}> {/* Обертка для анимации маршрута */}
                                {isLoadingLevel && <LoadingScreen message="Загрузка уровня..." />} {/* Показываем, пока isLoadingLevel */}
                                
                                {!isLoadingLevel && activeLevelData && ( // Показываем Level, ТОЛЬКО когда isLoadingLevel=false И есть данные
                                    () => { // Оборачиваем в функцию для лога, как в Код 1
                                        console.log("[App.jsx] Рендеринг <Level />. activeLevelData.difficulty:", activeLevelData.difficulty);
                                        return (
                                            <Level
                                                levelData={activeLevelData}
                                                onLevelComplete={handleLevelComplete}
                                                onReady={handleLevelReady}
                                                difficulty={activeLevelData.difficulty} // Передаем сложность из activeLevelData
                                            />
                                        );
                                    }
                                )()}
                                
                                {!isLoadingLevel && !activeLevelData && loadingError && ( /* Показ ошибки, как в Код 1 */
                                    <div className="loading-screen"> {/* Можно использовать тот же стиль что и LoadingScreen или кастомный */}
                                        <h2>{loadingError}</h2>
                                        <button onClick={() => navigate('/main', { replace: true })}>В меню</button>
                                    </div>
                                )}

                                {/* Дополнительное состояние: загрузка завершена, данных нет, ошибки нет (маловероятно, но для полноты) */}
                                {!isLoadingLevel && !activeLevelData && !loadingError && location.pathname.startsWith('/level/') && (
                                     <div className="loading-screen">
                                        <h2>Данные уровня не загружены.</h2>
                                        <p>Возможно, вы попали на эту страницу напрямую или произошла непредвиденная ошибка.</p>
                                        <button onClick={() => navigate('/main', { replace: true })}>В меню</button>
                                    </div>
                                )}
                            </motion.div>
                        }/>
                        {/* Маршрут /level/:levelId/loading УДАЛЕН, так как isLoadingLevel теперь управляет этим */}

                        <Route path="/inventory" element={
                            <motion.div key="inventory" {...routeContentVariants}>
                                <Inventory />
                            </motion.div>
                        } />
                        <Route path="/shop" element={
                            <motion.div key="shop" {...routeContentVariants}>
                                <Shop />
                            </motion.div>
                        } />
                        <Route path="/forge" element={
                            <motion.div key="forge" {...routeContentVariants}>
                                <Forge />
                            </motion.div>
                        } />
                        <Route path="/achievements" element={
                            <motion.div key="achievements" {...routeContentVariants}>
                                <Achievements />
                            </motion.div>
                        } />
                        <Route path="/rewards" element={
                            <motion.div key="rewards" {...routeContentVariants}>
                                <RewardsScreen />
                            </motion.div>
                        } />
                         <Route path="/global-map" element={
                            <motion.div key="globalmap" {...routeContentVariants}>
                                <GlobalMap
                                    onSelectContinent={handleSelectContinentOnGlobalMap}
                                    onGoBackToChapterMap={handleGoBackToMainFromGlobalMap}
                                />
                            </motion.div>
                        } />
                        <Route path="/main" element={
                            <motion.div key="main" {...routeContentVariants}>
                                <MainMenu
                                    onStart={handleStartGame} // MainMenu должен теперь передавать chapterId, levelId, difficulty
                                />
                            </motion.div>
                        } />
                        <Route path="*" element={
                            <motion.div key="mainfallback" {...routeContentVariants}>
                                <MainMenu onStart={handleStartGame} />
                            </motion.div>
                        } />
                    </Routes>
                </AnimatePresence>
            </main>

            {shouldShowBottomNav && <BottomNav />}

            <AnimatePresence>
                {isScreenTransitioning && (
                    <motion.div
                        key="app-global-transition-overlay"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.05 } }}
                        style={{position: 'fixed', top:0, left:0, width:'100%', height:'100%', zIndex: 99999, pointerEvents: 'none'}}
                    >
                        <TransitionOverlay
                            playOpen={transitionAction === 'opening'}
                            onOpenComplete={onTransitionOpenCompleteCallback}
                            playClose={transitionAction === 'closing'}
                            onCloseComplete={onTransitionCloseCompleteCallback}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Глобальный попап ошибки теперь не нужен здесь, если loadingError обрабатывается на уровне маршрута /level/:levelId 
                Или если это общий loadingError для других частей приложения, то можно оставить.
                В Код 1 loadingError был специфичен для загрузки уровня.
                Если же loadingError из useGameStore используется для других глобальных ошибок, то оставить.
                Пока что, для консистентности с обработкой ошибки загрузки уровня, я уберу общий попап,
                так как ошибка уровня теперь показывается внутри <Route path="/level/:levelId">
            */}
            {/* {loadingError && !location.pathname.startsWith('/level/') && ( // Показываем только если это не ошибка загрузки уровня
                <div className="error-popup">
                    <p>{loadingError}</p>
                    <button onClick={() => setLoadingError(null)}>OK</button>
                </div>
            )} */}
        </div>
    );
};

export default App;