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
            username: state.username, gold: state.gold, diamonds: state.diamonds,
            powerLevel: state.powerLevel, energyCurrent: state.energyCurrent, energyMax: state.energyMax,
            lastEnergyRefillTimestamp: state.lastEnergyRefillTimestamp, refillEnergyOnLoad: state.refillEnergyOnLoad,
            consumeEnergy: state.consumeEnergy, setCurrentChapterInStore: state.setCurrentChapter,
            currentChapterIdFromStore: state.currentChapterId, isFullScreenMapActive: state.isFullScreenMapActive,
            isScreenTransitioning: state.isScreenTransitioning, transitionAction: state.transitionAction,
            onTransitionCloseCompleteCallback: state.onTransitionCloseCompleteCallback,
            onTransitionOpenCompleteCallback: state.onTransitionOpenCompleteCallback,
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
    const tonShards = 0;

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
        console.log("App Mount: Проверка начального состояния (версия 'старый рабочий + логин')...");
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
                console.log("App Mount: initializeCharacterStats called (из селектора).");
            }
            if (initialUsername && setUsernameAction) {
                setUsernameAction(initialUsername);
                console.log("App Mount: setUsername called (из селектора).");
            }
            setNeedsRaceSelection(false);
        }

        if (checkAndRefreshDailyDeals) {
            checkAndRefreshDailyDeals(); console.log("App Mount: checkAndRefreshDailyDeals called.");
        }
        if (checkAndResetTreasureChestAttempts) {
            checkAndResetTreasureChestAttempts(); console.log("App Mount: checkAndResetTreasureChestAttempts called.");
        }
        if (checkAndResetDailyTasks) {
            checkAndResetDailyTasks(); console.log("App Mount: checkAndResetDailyTasks called.");
        }
        if (checkAndResetWeeklyTasks) {
            checkAndResetWeeklyTasks(); console.log("App Mount: checkAndResetWeeklyTasks called.");
        }
        if (checkAndResetMonthlyTasks) {
            checkAndResetMonthlyTasks(); console.log("App Mount: checkAndResetMonthlyTasks called.");
        }
        
        const currentDailyLoginStatus = useGameStore.getState().dailyLoginToday;
        if (currentDailyLoginStatus === false) {
            if (trackTaskEvent) { 
                trackTaskEvent('login');
                console.log("App Mount: trackTaskEvent('login') called.");
            } else {
                 console.warn("App Mount: trackTaskEvent action not found for login event.");
            }
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
        navigate,
        initializeCharacterStats,
        setUsernameAction,
        checkAndRefreshDailyDeals,
        checkAndResetTreasureChestAttempts,
        checkAndResetDailyTasks,
        checkAndResetWeeklyTasks,
        checkAndResetMonthlyTasks,
        trackTaskEvent,
        location.pathname
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
        // Эта функция уже существует в коде 2, убедимся что она используется.
        // В предоставленном коде 2 она определена ниже.
        if (typeof levelId === 'string') levelId = parseInt(levelId, 10); // Добавим парсинг, если levelId строка
        if (typeof levelId === 'number' && levelId >= 100) return Math.floor(levelId / 100);
        if (typeof levelId === 'number' && levelId > 0 && levelId < 100) return 0; // Предположим, что уровни < 100 относятся к главе 0 или специальной главе
        console.warn(`getChapterIdFromLevelId: Не удалось определить ID главы для levelId: ${levelId} (тип: ${typeof levelId}). Возвращен null.`);
        return null;
    };

    const handleLevelComplete = useCallback((levelId, status, difficultyPlayed) => {
        // Захватываем activeLevelData ПЕРЕД тем, как его сбросить, для использования в chapterContext
        const levelDataForContext = activeLevelData; 
        
        setActiveLevelData(null); 
        setIsLoadingLevel(false); 
    
        const store = useGameStore.getState(); // Получаем доступ к стору один раз

        if (status === 'won') {
            const chapterId = getChapterIdFromLevelId(levelId); 
            
            if (chapterId !== null) {
                let chapterContext = undefined;
                // Логика для chapterContext, адаптированная из Кода 2:
                if (levelDataForContext && levelDataForContext.id === parseInt(levelId, 10)) {
                    chapterContext = {
                        isZoneBossChapter: levelDataForContext.isZoneBossChapter || false,
                        currentZoneIdForThisChapter: levelDataForContext.zoneId,
                    };
                } else {
                    console.warn(`handleLevelComplete: levelDataForContext is not available or outdated for levelId: ${levelId}. Chapter context will be undefined. levelDataForContext:`, levelDataForContext);
                }
                
                // Вызов completeLevelAction с проверкой его существования
                if (store.completeLevelAction) {
                    store.completeLevelAction(chapterId, levelId, difficultyPlayed, chapterContext);
                } else {
                     console.error("handleLevelComplete: store.completeLevelAction action is not found in the game store.");
                }
            } else {
                // Сообщение об ошибке уже выводится из getChapterIdFromLevelId, если levelId некорректен.
                // Можно добавить дополнительное логирование здесь при необходимости.
                 console.error(`handleLevelComplete: chapterId is null for levelId: ${levelId}. Cannot complete level action.`);
            }

            // === ОТСЛЕЖИВАЕМ ПРОХОЖДЕНИЕ УРОВНЯ ДЛЯ ЗАДАНИЙ (из Кода 1) ===
            if (store.trackTaskEvent) { 
                store.trackTaskEvent('complete_level', 1); 
                console.log(`App Event: trackTaskEvent('complete_level') called for levelId: ${levelId}`);
            } else {
                console.warn("App Event: store.trackTaskEvent action is not found. Cannot track level completion for tasks.");
            }
            // === КОНЕЦ ===
        }
    
        // Вызов startScreenTransition (используем проверку из Кода 2 для надежности)
        if (store.startScreenTransition) {
            store.startScreenTransition(() => {
                if (status === 'won') {
                    navigate("/main", { state: { completedLevelId: levelId, difficulty: difficultyPlayed, showRewards: true } });
                } else {
                    navigate("/main");
                }
            });
        } else {
            console.warn("startScreenTransition action not found in store. Navigating directly.");
            if (status === 'won') {
                navigate("/main", { state: { completedLevelId: levelId, difficulty: difficultyPlayed, showRewards: true } });
            } else {
                navigate("/main");
            }
        }
    }, [navigate, activeLevelData]); // activeLevelData необходим для levelDataForContext

    const path = location.pathname;
    const showAnyFixedUIBaseConditions = !isInitialLoading && !needsRaceSelection && !isFullScreenMapActive;
    const shouldShowNewGameHeader = showAnyFixedUIBaseConditions && path === '/main';
    const shouldShowBottomNav = showAnyFixedUIBaseConditions && !path.startsWith('/level/') && path !== '/rewards';

    const handleStartGame = useCallback(async (chapterId, levelId, difficultyToPlay) => {
        console.log(`[App.jsx handleStartGame] Запрос: Глава ${chapterId}, Уровень ${levelId}, Сложность: ${difficultyToPlay}`);
        const ENERGY_COST = 6;
        if (!consumeEnergy(ENERGY_COST)) { 
            alert("Недостаточно энергии!"); return;
        }
        setActiveLevelData(null); setIsLoadingLevel(true); setLoadingError(null);
        navigate(`/level/${levelId}`);
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
            setActiveLevelData(null); setIsLoadingLevel(false);
            navigate("/main", { replace: true });
        }
    }, [navigate, consumeEnergy]);

    useEffect(() => {
        if (activeLevelData && isLoadingLevel) setIsLoadingLevel(false);
        if (loadingError && isLoadingLevel) setIsLoadingLevel(false);
    }, [activeLevelData, isLoadingLevel, loadingError]);

    // Функция getChapterIdFromLevelId была перемещена выше для использования в handleLevelComplete,
    // здесь она была в оригинальном коде 2. Убедимся, что она определена только один раз.
    // const getChapterIdFromLevelId = (levelId) => {
    //  if (typeof levelId === 'number' && levelId >= 100) return Math.floor(levelId / 100);
    //  return null;
    // };

    const handleLevelReady = useCallback(() => {}, []);
    const handleRaceSelectionComplete = useCallback(() => {
        setNeedsRaceSelection(false);
        const store = useGameStore.getState();
        if (store.startScreenTransition) {
            store.startScreenTransition(() => navigate('/main', { replace: true }));
        } else {
            console.warn("startScreenTransition action not found. Navigating directly.");
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
            console.warn("startScreenTransition action not found. Navigating directly.");
            if (setCurrentChapterInStore) setCurrentChapterInStore(startChapterIdForFocus);
            navigate('/main', { state: { showChaptersMapDirectly: true, focusOnChapterId: startChapterIdForFocus } });
        }
    }, [navigate, setCurrentChapterInStore]);

    const handleGoBackToMainFromGlobalMap = useCallback(() => {
        const store = useGameStore.getState();
        if (store.startScreenTransition) {
            store.startScreenTransition(() => navigate('/main', { state: { showChaptersMapDirectly: true, focusOnChapterId: currentChapterIdFromStore || 1 } })); 
        } else {
            console.warn("startScreenTransition action not found. Navigating directly.");
            navigate('/main', { state: { showChaptersMapDirectly: true, focusOnChapterId: currentChapterIdFromStore || 1 } });
        }
    }, [navigate, currentChapterIdFromStore]);

    const getEnergyFillColor = (current, max) => {
        if (max === 0) return '#808080'; const ratio = current / max;
        if (ratio > 0.6) return '#4ade80'; else if (ratio > 0.3) return '#facc15'; else return '#ef4444';
    };

    if (isInitialLoading) return <LoadingScreen key="loading_initial" message="Загрузка игры..." />;
    if (needsRaceSelection && location.pathname !== '/race-selection') return <LoadingScreen key="redirecting_to_race" message="Подготовка выбора расы..." />;

    return (
        <div className="app-container" ref={appContainerRef}>
            {shouldShowNewGameHeader && (
                <GameHeader {...{username, powerLevel, avatarUrl, energyCurrent, energyMax, getEnergyFillColor, shouldShowRefillTimer, refillTimerDisplay, gold, diamonds, tonShards, currentChapterName: currentChapterNameForHeader}} />
            )}
            {showAnyFixedUIBaseConditions && !shouldShowNewGameHeader && location.pathname !== '/main' && <UsernamePopup />}
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
                        <Route path="/main" element={<motion.div key="main" {...routeContentVariants}><MainMenu onStart={handleStartGame} onChapterNameChange={handleChapterNameChange} /></motion.div>} />
                        <Route path="*" element={<motion.div key="mainfallback" {...routeContentVariants}><MainMenu onStart={handleStartGame} onChapterNameChange={handleChapterNameChange} /></motion.div>} />
                    </Routes>
                </AnimatePresence>
            </main>
            {shouldShowBottomNav && <BottomNav />}
            <AnimatePresence>
                {isScreenTransitioning && (
                    <motion.div key="app-global-transition-overlay" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.05 } }} style={{position: 'fixed', top:0, left:0, width:'100%', height:'100%', zIndex: 99999, pointerEvents: 'none'}}>
                        <TransitionOverlay playOpen={transitionAction === 'opening'} onOpenComplete={onTransitionOpenCompleteCallback} playClose={transitionAction === 'closing'} onCloseComplete={onTransitionCloseCompleteCallback}/>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default App;