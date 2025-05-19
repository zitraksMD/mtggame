// src/App.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Импорты Компонентов
import MainMenu from "./components/screens/MainMenu";
import Level from "./components/Level";
import Inventory from "./components/screens/Inventory";
import Shop from "./components/screens/Shop";
import BottomNav from "./components/BottomNav";
import UsernamePopup from "./components/popups/UsernamePopup";
import Forge from "./components/screens/Forge";
import Achievements from "./components/screens/Achievements";
import RaceSelection from "./components/RaceSelection";
import LoadingScreen from "./components/LoadingScreen";
import RewardsScreen from "./components/screens/RewardsScreen";
import GlobalMap from "./components/GlobalMap";
import TransitionOverlay from './components/TransitionOverlay';
import GameHeader from './components/GameHeader';
import DiscoveryScreen from "./components/screens/DiscoveryScreen";
import ShardPassScreen from './components/screens/ShardPassScreen'; // ИМПОРТ ДЛЯ НОВОГО SHARDPASS

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
    const [activeLevelData, setActiveLevelData] = useState(null);
    const [loadingError, setLoadingError] = useState(null);
    const [isLoadingLevel, setIsLoadingLevel] = useState(false);
    const [refillTimerDisplay, setRefillTimerDisplay] = useState("");
    const [shouldShowRefillTimer, setShouldShowRefillTimer] = useState(false);
    const [currentChapterNameForHeader, setCurrentChapterNameForHeader] = useState(null);
    // Состояние isBattlePassVisible и функции для него удалены, т.к. ShardPassScreen его заменяет

    const navigate = useNavigate();
    const location = useLocation();
    const appContainerRef = useRef(null);

    const {
        username, gold, diamonds, toncoinShards, powerLevel, energyCurrent, energyMax,
        lastEnergyRefillTimestamp, refillEnergyOnLoad, consumeEnergy,
        setCurrentChapterInStore,
        currentChapterIdFromStore,
        isFullScreenMapActive,
        isScreenTransitioning,
        transitionAction,
        onTransitionCloseCompleteCallback,
        onTransitionOpenCompleteCallback,
        startScreenTransition
    } = useGameStore(
        useCallback(state => ({
            username: state.username, gold: state.gold, diamonds: state.diamonds, toncoinShards: state.toncoinShards,
            powerLevel: state.powerLevel, energyCurrent: state.energyCurrent, energyMax: state.energyMax,
            lastEnergyRefillTimestamp: state.lastEnergyRefillTimestamp, refillEnergyOnLoad: state.refillEnergyOnLoad,
            consumeEnergy: state.consumeEnergy, setCurrentChapterInStore: state.setCurrentChapter,
            currentChapterIdFromStore: state.currentChapterId, isFullScreenMapActive: state.isFullScreenMapActive,
            isScreenTransitioning: state.isScreenTransitioning, transitionAction: state.transitionAction,
            onTransitionCloseCompleteCallback: state.onTransitionCloseCompleteCallback,
            onTransitionOpenCompleteCallback: state.onTransitionOpenCompleteCallback,
            startScreenTransition: state.startScreenTransition,
        }), [])
    );

    const setUsernameAction = useGameStore((s) => s.setUsername);
    const initializeCharacterStats = useGameStore((s) => s.initializeCharacterStats);
    const checkAndRefreshDailyDeals = useGameStore((s) => s.checkAndRefreshDailyDeals);
    const checkAndResetTreasureChestAttempts = useGameStore((s) => s.checkAndResetTreasureChestAttempts);
    const checkAndResetDailyTasks = useGameStore((s) => s.checkAndResetDailyTasks);
    const checkAndResetWeeklyTasks = useGameStore((s) => s.checkAndResetWeeklyTasks);
    const checkAndResetMonthlyTasks = useGameStore((s) => s.checkAndResetMonthlyTasks);
    const trackTaskEvent = useGameStore((s) => s.trackTaskEvent);

    const avatarUrl = "/assets/default-avatar.png";

    // Функции для ShardPass (маршрут)
    const handleOpenShardPass = useCallback(() => {
        const store = useGameStore.getState();
        if (store.startScreenTransition) {
            store.startScreenTransition(() => navigate('/shardpass'));
        } else {
            console.warn("startScreenTransition action not found in store for ShardPass. Navigating directly.");
            navigate('/shardpass');
        }
    }, [navigate]);

    const handleCloseShardPass = useCallback(() => {
        const store = useGameStore.getState();
        if (store.startScreenTransition) {
            store.startScreenTransition(() => navigate(-1)); // Или navigate('/main')
        } else {
            console.warn("startScreenTransition action not found in store for ShardPass. Navigating directly.");
            navigate(-1); // Или navigate('/main')
        }
    }, [navigate]);

    const handleChapterNameChange = useCallback((name) => {
        setCurrentChapterNameForHeader(name);
    }, []);

    useEffect(() => {
        let intervalId = null;
        const updateTimer = () => {
            if (energyCurrent < energyMax) {
                setShouldShowRefillTimer(true);
                const nextRefillTimestamp = lastEnergyRefillTimestamp + ENERGY_REFILL_INTERVAL_MS;
                const now = Date.now();
                let remainingMs = nextRefillTimestamp - now;
                if (remainingMs <= 0) {
                    if (refillEnergyOnLoad) refillEnergyOnLoad();
                } else {
                    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    setRefillTimerDisplay(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
                }
            } else {
                setShouldShowRefillTimer(false); setRefillTimerDisplay("");
                if (intervalId) { clearInterval(intervalId); intervalId = null; }
            }
        };
        if (energyCurrent < energyMax) {
            updateTimer(); if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(updateTimer, 1000);
        } else {
            setShouldShowRefillTimer(false); setRefillTimerDisplay("");
            if (intervalId) { clearInterval(intervalId); intervalId = null;}
        }
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [energyCurrent, energyMax, lastEnergyRefillTimestamp, refillEnergyOnLoad]);

    useEffect(() => {
        console.log("App Mount: Проверка начального состояния.");
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
            if (initializeCharacterStats) {
                initializeCharacterStats(chosenRace);
            }
            if (initialUsername && setUsernameAction) {
                setUsernameAction(initialUsername);
            }
            setNeedsRaceSelection(false);
        }

        if (checkAndRefreshDailyDeals) checkAndRefreshDailyDeals();
        if (checkAndResetTreasureChestAttempts) checkAndResetTreasureChestAttempts();
        if (checkAndResetDailyTasks) checkAndResetDailyTasks();
        if (checkAndResetWeeklyTasks) checkAndResetWeeklyTasks();
        if (checkAndResetMonthlyTasks) checkAndResetMonthlyTasks();
        
        const currentDailyLoginStatus = useGameStore.getState().dailyLoginToday;
        if (currentDailyLoginStatus === false && trackTaskEvent) { 
            trackTaskEvent('login');
        }

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
    }, [
        navigate, initializeCharacterStats, setUsernameAction, checkAndRefreshDailyDeals,
        checkAndResetTreasureChestAttempts, checkAndResetDailyTasks, checkAndResetWeeklyTasks,
        checkAndResetMonthlyTasks, trackTaskEvent, location.pathname
    ]);

    useEffect(() => {
        const storeState = useGameStore.getState();
        if (!storeState.isScreenTransitioning && !isInitialLoading) {
            if (storeState.ensureScreenIsOpening) {
                storeState.ensureScreenIsOpening();
            } else {
                console.warn("ensureScreenIsOpening action not found in store via getState().");
            }
        }
    }, [location.pathname, isInitialLoading]);

    const getChapterIdFromLevelId = (levelId) => {
        if (typeof levelId === 'string') levelId = parseInt(levelId, 10); 
        if (typeof levelId === 'number' && levelId >= 100) return Math.floor(levelId / 100);
        if (typeof levelId === 'number' && levelId > 0 && levelId < 100) return 0; 
        console.warn(`getChapterIdFromLevelId: Не удалось определить ID главы для levelId: ${levelId} (тип: ${typeof levelId}). Возвращен null.`);
        return null;
    };

    const handleLevelComplete = useCallback((levelId, status, difficultyPlayed) => {
        const levelDataForContext = activeLevelData; 
        setActiveLevelData(null); 
        setIsLoadingLevel(false); 
        const store = useGameStore.getState(); 

        if (status === 'won') {
            const chapterId = getChapterIdFromLevelId(levelId); 
            if (chapterId !== null) {
                let chapterContext = undefined;
                if (levelDataForContext && levelDataForContext.id === parseInt(levelId, 10)) {
                    chapterContext = {
                        isZoneBossChapter: levelDataForContext.isZoneBossChapter || false,
                        currentZoneIdForThisChapter: levelDataForContext.zoneId,
                    };
                }
                if (store.completeLevelAction) {
                    store.completeLevelAction(chapterId, levelId, difficultyPlayed, chapterContext);
                }
            }
            if (store.trackTaskEvent) { 
                store.trackTaskEvent('complete_level', 1); 
            }
        }
    
        if (store.startScreenTransition) {
            store.startScreenTransition(() => {
                if (status === 'won') {
                    navigate("/main", { state: { completedLevelId: levelId, difficulty: difficultyPlayed, showRewards: true } });
                } else {
                    navigate("/main");
                }
            });
        } else {
            if (status === 'won') {
                navigate("/main", { state: { completedLevelId: levelId, difficulty: difficultyPlayed, showRewards: true } });
            } else {
                navigate("/main");
            }
        }
    }, [navigate, activeLevelData]); 

    const handleStartGame = useCallback(async (chapterId, levelId, difficultyToPlay) => {
        const ENERGY_COST = 6;
        if (!consumeEnergy(ENERGY_COST)) { 
            alert("Недостаточно энергии!"); return;
        }
        setActiveLevelData(null); setIsLoadingLevel(true); setLoadingError(null);
        const store = useGameStore.getState();
        if (store.startScreenTransition) {
             store.startScreenTransition(() => navigate(`/level/${levelId}`));
        } else {
            navigate(`/level/${levelId}`);
        }
        try {
            const dataPath = `/data/levels/level${levelId}Data.json`;
            const response = await fetch(dataPath);
            if (!response.ok) {
                let errorText = `HTTP error! status: ${response.status}`;
                try { const errorData = await response.json(); if (errorData && errorData.message) errorText = errorData.message; } catch (e) {}
                throw new Error(errorText + ` for ${dataPath}`);
            }
            const loadedData = await response.json();
            if (!loadedData || typeof loadedData.id !== 'number' || loadedData.id !== parseInt(levelId, 10)) {
                throw new Error(`Некорректные данные или ID уровня (${loadedData?.id}) не совпадает с запрошенным (${levelId}).`);
            }
            setActiveLevelData({ ...loadedData, difficulty: difficultyToPlay, chapterId: chapterId });
        } catch (error) {
            console.error(`❌ Ошибка загрузки уровня ${levelId}:`, error);
            setLoadingError(`Не удалось загрузить уровень ${levelId}. ${error.message}`);
            setActiveLevelData(null);
            const errorNavStore = useGameStore.getState(); // Re-get store for this specific call
            if (errorNavStore.startScreenTransition) {
                errorNavStore.startScreenTransition(() => navigate("/main", { replace: true }));
            } else {
                navigate("/main", { replace: true });
            }
        }
    }, [navigate, consumeEnergy]);

    useEffect(() => {
        if (activeLevelData && isLoadingLevel) setIsLoadingLevel(false);
        if (loadingError && isLoadingLevel) setIsLoadingLevel(false);
    }, [activeLevelData, isLoadingLevel, loadingError]);

    const handleLevelReady = useCallback(() => {}, []);
    const handleRaceSelectionComplete = useCallback(() => {
        setNeedsRaceSelection(false);
        const store = useGameStore.getState();
        if (store.startScreenTransition) {
            store.startScreenTransition(() => navigate('/main', { replace: true }));
        } else {
            navigate('/main', { replace: true });
        }
    }, [navigate]);

    const handleSelectContinentOnGlobalMap = useCallback((startChapterIdForFocus) => {
        const store = useGameStore.getState();
        if (store.startScreenTransition) {
            store.startScreenTransition(() => {
                if (setCurrentChapterInStore) setCurrentChapterInStore(startChapterIdForFocus); 
                navigate('/main', { state: { showChaptersMapDirectly: true, focusOnChapterId: startChapterIdForFocus } });
            });
        } else {
            if (setCurrentChapterInStore) setCurrentChapterInStore(startChapterIdForFocus);
            navigate('/main', { state: { showChaptersMapDirectly: true, focusOnChapterId: startChapterIdForFocus } });
        }
    }, [navigate, setCurrentChapterInStore]);

    const handleGoBackToMainFromGlobalMap = useCallback(() => {
        const store = useGameStore.getState();
        if (store.startScreenTransition) {
            store.startScreenTransition(() => navigate('/main', { state: { showChaptersMapDirectly: true, focusOnChapterId: currentChapterIdFromStore || 1 } })); 
        } else {
            navigate('/main', { state: { showChaptersMapDirectly: true, focusOnChapterId: currentChapterIdFromStore || 1 } });
        }
    }, [navigate, currentChapterIdFromStore]);

    const getEnergyFillColor = (current, max) => {
        if (max === 0) return '#808080'; const ratio = current / max;
        if (ratio > 0.6) return '#4ade80'; else if (ratio > 0.3) return '#facc15'; else return '#ef4444';
    };

    const path = location.pathname;
    const showAnyFixedUIBaseConditions = !isInitialLoading && !needsRaceSelection && !isFullScreenMapActive;

    // Обновленные условия видимости с учетом ShardPassScreen и других экранов
    const screensWithoutHeader = ['/shardpass', '/level', '/rewards', '/race-selection', '/loading', '/discovery'];
    const shouldShowNewGameHeaderUpdated = showAnyFixedUIBaseConditions && 
                                        !screensWithoutHeader.some(p => path.startsWith(p) || path === p) &&
                                        path !== '/global-map';

    const screensWithoutBottomNav = ['/shardpass', '/level', '/rewards', '/race-selection', '/loading'];
    const shouldShowBottomNavUpdated = showAnyFixedUIBaseConditions &&
                                    !screensWithoutBottomNav.some(p => path.startsWith(p) || path === p) &&
                                    path !== '/global-map';

    if (isInitialLoading) return <LoadingScreen key="loading_initial" message="Загрузка игры..." />;
    if (needsRaceSelection && location.pathname !== '/race-selection') return <LoadingScreen key="redirecting_to_race" message="Подготовка выбора расы..." />;

    return (
        <div className="app-container" ref={appContainerRef}>
            {shouldShowNewGameHeaderUpdated && (
                <GameHeader 
                    {...{
                        username, powerLevel, avatarUrl, energyCurrent, energyMax, 
                        getEnergyFillColor, shouldShowRefillTimer, refillTimerDisplay, 
                        gold, diamonds, tonShards: toncoinShards, 
                        currentChapterName: currentChapterNameForHeader
                    }}
                    onShardPassClick={handleOpenShardPass} // Заменено: onBattlePassClick -> onShardPassClick
                />
            )}
            {showAnyFixedUIBaseConditions && !shouldShowNewGameHeaderUpdated && location.pathname !== '/main' && <UsernamePopup />}
            <main className="content-area">
                <AnimatePresence mode="wait" initial={false}>
                    <Routes location={location} key={location.pathname}>
                        <Route path="/race-selection" element={<motion.div key="raceselection" {...routeContentVariants}><RaceSelection onComplete={handleRaceSelectionComplete} /></motion.div>} />
                        <Route path="/level/:levelId" element={
                            <motion.div key="levelroute" {...routeContentVariants}>
                                {isLoadingLevel && <LoadingScreen message="Загрузка уровня..." />}
                                {!isLoadingLevel && activeLevelData && (<Level levelData={activeLevelData} onLevelComplete={handleLevelComplete} onReady={handleLevelReady} difficulty={activeLevelData.difficulty}/>)}
                                {!isLoadingLevel && !activeLevelData && loadingError && (<div className="loading-screen"><h2>{loadingError}</h2><button onClick={() => navigate('/main', { replace: true })}>В меню</button></div>)}
                                {!isLoadingLevel && !activeLevelData && !loadingError && location.pathname.startsWith('/level/') && (<div className="loading-screen"><h2>Данные уровня не загружены.</h2><p>Возможно, вы попали на эту страницу напрямую или произошла непредвиденная ошибка.</p><button onClick={() => navigate('/main', { replace: true })}>В меню</button></div>)}
                            </motion.div>
                        }/>
                        <Route path="/inventory" element={<motion.div key="inventory" {...routeContentVariants}><Inventory /></motion.div>} />
                        <Route path="/shop" element={<motion.div key="shop" {...routeContentVariants}><Shop /></motion.div>} />
                        <Route path="/forge" element={<motion.div key="forge" {...routeContentVariants}><Forge /></motion.div>} />
                        <Route path="/achievements" element={<motion.div key="achievements" {...routeContentVariants}><Achievements /></motion.div>} />
                        <Route path="/rewards" element={<motion.div key="rewards" {...routeContentVariants}><RewardsScreen /></motion.div>} />
                        <Route path="/global-map" element={<motion.div key="globalmap" {...routeContentVariants}><GlobalMap onSelectContinent={handleSelectContinentOnGlobalMap} onGoBackToChapterMap={handleGoBackToMainFromGlobalMap} /></motion.div>} />
                        <Route path="/discovery" element={<motion.div key="discovery" {...routeContentVariants}><DiscoveryScreen /></motion.div>} />

                        {/* ▼▼▼ НОВЫЙ МАРШРУТ ДЛЯ SHARDPASS ▼▼▼ */}
                        <Route path="/shardpass" element={
                            <motion.div key="shardpass" {...routeContentVariants}>
                                <ShardPassScreen onClose={handleCloseShardPass} />
                            </motion.div>
                        } />
                        {/* ▲▲▲ КОНЕЦ НОВОГО МАРШРУТА ▲▲▲ */}

                        <Route path="/main" element={<motion.div key="main" {...routeContentVariants}><MainMenu onStart={handleStartGame} onChapterNameChange={handleChapterNameChange} /></motion.div>} />
                        <Route path="*" element={<motion.div key="mainfallback" {...routeContentVariants}><MainMenu onStart={handleStartGame} onChapterNameChange={handleChapterNameChange} /></motion.div>} />
                    </Routes>
                </AnimatePresence>
            </main>
            {shouldShowBottomNavUpdated && <BottomNav />}
            
            <AnimatePresence>
                {isScreenTransitioning && (
                    <motion.div key="app-global-transition-overlay" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.05 } }} style={{position: 'fixed', top:0, left:0, width:'100%', height:'100%', zIndex: 99999, pointerEvents: 'none'}}>
                        <TransitionOverlay playOpen={transitionAction === 'opening'} onOpenComplete={onTransitionOpenCompleteCallback} playClose={transitionAction === 'closing'} onCloseComplete={onTransitionCloseCompleteCallback}/>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Логика для BattlePassScreen (модальное окно) удалена */}

        </div>
    );
};

export default App;