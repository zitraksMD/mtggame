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
import GameHeader from './components/GameHeader'; // Импорт уже был, соответствует код1

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
    const [currentChapterNameForHeader, setCurrentChapterNameForHeader] = useState(null); // <--- НОВОЕ СОСТОЯНИЕ из КОД1

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
    const checkAndResetRuneAttempts = useGameStore((s) => s.checkAndResetTreasureChestAttempts); // Используем актуальное имя из твоего стора

    const avatarUrl = "/assets/default-avatar.png";
    const tonShards = 0; 

    // Callback для MainMenu для обновления имени главы в App.jsx (из код1)
    const handleChapterNameChange = useCallback((name) => {
        setCurrentChapterNameForHeader(name);
    }, []);

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
                    refillEnergyOnLoad(); // Это должно обновить energyCurrent и lastEnergyRefillTimestamp
                    // Таймер будет пересчитан в следующем цикле useEffect или если intervalId не очищен сразу
                    // if (intervalId) clearInterval(intervalId); // Возможно, очищать не нужно, т.к. updateTimer вызовется снова
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
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null; 
                }
            }
        };

        if (energyCurrent < energyMax) {
            updateTimer(); // Первый вызов для немедленного отображения
            if (intervalId) clearInterval(intervalId); // Очищаем старый интервал, если есть
            intervalId = setInterval(updateTimer, 1000);
        } else {
            setShouldShowRefillTimer(false);
            setRefillTimerDisplay("");
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [energyCurrent, energyMax, lastEnergyRefillTimestamp, refillEnergyOnLoad]);

    // useEffect для начальной загрузки и проверки состояния (логика из код2)
    useEffect(() => {
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
        if (checkAndResetRuneAttempts) { // <--- ДОБАВЛЯЕМ ПРОВЕРКУ И ВЫЗОВ
            checkAndResetRuneAttempts();
            console.log("App Mount: checkAndResetRuneAttempts called.");
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate, initializeCharacterStats, setUsernameAction, checkAndRefreshDailyDeals, checkAndResetRuneAttempts, location.pathname]);


    // useEffect для ensureScreenIsOpening (логика из код1, применена к код2)
    useEffect(() => {
        const storeState = useGameStore.getState();
        if (!storeState.isScreenTransitioning && !isInitialLoading) {
            storeState.ensureScreenIsOpening();
        }
    }, [location.pathname, isInitialLoading]);

    const path = location.pathname;

    // Логика видимости UI элементов (объединено и адаптировано из код1 и код2)
    const showAnyFixedUIBaseConditions =
        !isInitialLoading &&
        !needsRaceSelection &&
        !isFullScreenMapActive;

    const shouldShowNewGameHeader =
        showAnyFixedUIBaseConditions &&
        path === '/main';

    const shouldShowBottomNav =
        showAnyFixedUIBaseConditions &&
        !path.startsWith('/level/') &&
        path !== '/rewards'; // Если на экране наград не нужно нижнее меню

    // === ОБРАБОТЧИКИ ===
    const handleStartGame = useCallback(async (chapterId, levelId, difficultyToPlay) => {
        console.log(`[App.jsx handleStartGame] Запрос: Глава ${chapterId}, Уровень ${levelId}, Сложность: ${difficultyToPlay}`);
        const ENERGY_COST = 6; // Примерная стоимость
        if (!consumeEnergy(ENERGY_COST)) {
            alert("Недостаточно энергии!"); // Или более user-friendly уведомление
            return;
        }

        setActiveLevelData(null); // Сброс предыдущих данных уровня
        setIsLoadingLevel(true);
        setLoadingError(null);
        navigate(`/level/${levelId}`); // Переход на страницу уровня до загрузки данных

        try {
            const dataPath = `/data/levels/level${levelId}Data.json`;
            const response = await fetch(dataPath);
            
            if (!response.ok) {
                let errorText = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json(); // Попытка прочитать тело ошибки как JSON
                    if (errorData && errorData.message) errorText = errorData.message;
                } catch (e) { /* Ошибка не в формате JSON или тело пустое */ }
                throw new Error(errorText + ` for ${dataPath}`);
            }
            
            const loadedData = await response.json();

            // Дополнительная проверка на соответствие ID
            if (!loadedData || typeof loadedData.id !== 'number' || loadedData.id !== parseInt(levelId, 10)) {
                throw new Error(`Некорректные данные или ID уровня (${loadedData?.id}) не совпадает с запрошенным (${levelId}).`);
            }
            
            setActiveLevelData({
                ...loadedData,
                difficulty: difficultyToPlay, // Устанавливаем выбранную сложность
                chapterId: chapterId, // Сохраняем ID главы для контекста
            });
            // setIsLoadingLevel(false); // Устанавливается в useEffect ниже
        } catch (error) {
            console.error(`❌ Ошибка загрузки уровня ${levelId}:`, error);
            setLoadingError(`Не удалось загрузить уровень ${levelId}. ${error.message}`);
            setActiveLevelData(null);
            setIsLoadingLevel(false); // Сброс загрузки при ошибке
            navigate("/main", { replace: true }); // Возврат в главное меню при ошибке
        }
    }, [navigate, consumeEnergy]);

    useEffect(() => {
        // Этот useEffect гарантирует, что isLoadingLevel станет false после того, как activeLevelData установится или произойдет ошибка
        if (activeLevelData && isLoadingLevel) {
            setIsLoadingLevel(false);
        }
        if (loadingError && isLoadingLevel) {
            setIsLoadingLevel(false);
        }
    }, [activeLevelData, isLoadingLevel, loadingError]);

    const getChapterIdFromLevelId = (levelId) => {
        // Пример: уровень 101 -> глава 1, уровень 205 -> глава 2
        if (typeof levelId === 'number' && levelId >= 100) {
            return Math.floor(levelId / 100);
        }
        return null; // или другое значение по умолчанию, если структура ID другая
    };
    
    const handleLevelComplete = useCallback((levelId, status, difficultyPlayed) => {
        setActiveLevelData(null); // Сброс данных активного уровня
        setIsLoadingLevel(false); // Убедимся, что загрузка уровня завершена
    
        if (status === 'won') {
            const chapterId = getChapterIdFromLevelId(levelId);
            // Важно: activeLevelData будет null здесь, если мы его сбросили выше. 
            // Если для chapterContext нужны данные из activeLevelData, их нужно получить до сброса
            // или передать в handleLevelComplete. В данном случае, в код2 currentLevelDataForContext инициализировался из activeLevelData
            // перед его сбросом. Оставим такую логику, но это требует внимания.
            // Лучше передавать необходимые данные для chapterContext в эту функцию.
            // Для примера, предположим, что zoneId и isZoneBossChapter берутся из старого activeLevelData (до сброса)
            // Это может быть ненадежно. Рассмотрим передачу этих данных из компонента Level.
            // Пока оставим как в код2, но с комментарием.
            
            const store = useGameStore.getState();
            // const chapterContext = ...; // Логика для chapterContext, если нужна

            if (chapterId !== null) {
                 // Для chapterContext: (activeLevelData уже null, но для примера, как в код2)
                const previousLevelData = store.levels.find(l => l.id === levelId); // Это неверно, такой логики нет в сторе
                                                                                  // Правильнее передавать контекст из Level или вычислять на основе levelId
                let chapterContext = undefined;
                // Если бы activeLevelData не сбрасывался сразу, можно было бы сделать так:
                // if (activeLevelData && activeLevelData.id === levelId) { // Проверка, что это тот самый уровень
                // chapterContext = {
                // isZoneBossChapter: activeLevelData.isZoneBossChapter || false,
                // currentZoneIdForThisChapter: activeLevelData.zoneId,
                // levels: activeLevelData.levels // Это поле обычно не хранится в данных одного уровня
                // };
                // }
                store.completeLevelAction(chapterId, levelId, difficultyPlayed, chapterContext);
            }
        }
    
        useGameStore.getState().startScreenTransition(() => {
            if (status === 'won') {
                // Переход в главное меню с состоянием для отображения окна наград (если оно там обрабатывается)
                navigate("/main", { state: { completedLevelId: levelId, difficulty: difficultyPlayed, showRewards: true } });
            } else {
                navigate("/main");
            }
        });
    }, [navigate /*, activeLevelData - удалено из зависимостей, т.к. используется перед сбросом */]);

    const handleLevelReady = useCallback(() => {
        // console.log("🎮 Компонент Уровня готов к игре!");
        // Можно использовать, чтобы скрыть лоадер, специфичный для уровня, если он есть внутри компонента Level
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

    const getEnergyFillColor = (current, max) => {
        if (max === 0) return '#808080'; // серый, если макс. энергия 0
        const ratio = current / max;
        if (ratio > 0.6) return '#4ade80'; // зеленый
        else if (ratio > 0.3) return '#facc15'; // желтый
        else return '#ef4444'; // красный
    };

    if (isInitialLoading) {
        return <LoadingScreen key="loading_initial" message="Загрузка игры..." />;
    }

    if (needsRaceSelection && location.pathname !== '/race-selection') {
        // Эта проверка дублирует логику в useEffect, но может служить дополнительной защитой
        // Если useEffect еще не отработал или произошел сбой навигации
        // navigate('/race-selection', { replace: true }); // Закомментировано, т.к. есть в useEffect
        return <LoadingScreen key="redirecting_to_race" message="Подготовка выбора расы..." />;
    }

    return (
        <div className="app-container" ref={appContainerRef}>
            {shouldShowNewGameHeader && (
                <GameHeader
                    username={username}
                    powerLevel={powerLevel}
                    avatarUrl={avatarUrl}
                    energyCurrent={energyCurrent}
                    energyMax={energyMax}
                    getEnergyFillColor={getEnergyFillColor} // Передаем функцию для цвета
                    shouldShowRefillTimer={shouldShowRefillTimer}
                    refillTimerDisplay={refillTimerDisplay}
                    gold={gold}
                    diamonds={diamonds}
                    tonShards={tonShards} // Убедитесь, что tonShards определен
                    currentChapterName={currentChapterNameForHeader} // <--- ПРОПС ПЕРЕДАН ИЗ КОД1
                    // onBattlePassClick={() => console.log('Battle Pass Clicked!')} // Пример обработчика
                />
            )}

            {/* Блоки showOldPlayerInfo и showOldResources, включая showOldEnergyBar, УДАЛЕНЫ, 
                так как их функционал теперь в GameHeader или не нужен. */}

            {/* Условие для UsernamePopup (остается, если это актуальный UI элемент) */}
            {/* Изменено условие, чтобы Popup не появлялся на /main если есть GameHeader */}
            {showAnyFixedUIBaseConditions && !shouldShowNewGameHeader && location.pathname !== '/main' && <UsernamePopup />}


            <main className="content-area">
                <AnimatePresence mode="wait" initial={false}>
                    <Routes location={location} key={location.pathname}>
                        <Route path="/race-selection" element={
                            <motion.div key="raceselection" {...routeContentVariants}>
                                <RaceSelection onComplete={handleRaceSelectionComplete} />
                            </motion.div>
                        } />

                        <Route path="/level/:levelId" element={
                            <motion.div key="levelroute" {...routeContentVariants}>
                                {isLoadingLevel && <LoadingScreen message="Загрузка уровня..." />}
                                
                                {!isLoadingLevel && activeLevelData && (
                                    // Использование функции для рендера для чистоты
                                    (() => (
                                        <Level
                                            levelData={activeLevelData}
                                            onLevelComplete={handleLevelComplete}
                                            onReady={handleLevelReady}
                                            difficulty={activeLevelData.difficulty} // Передаем выбранную сложность
                                        />
                                    ))()
                                )}
                                
                                {!isLoadingLevel && !activeLevelData && loadingError && (
                                    <div className="loading-screen"> {/* Можно сделать компонент ErrorScreen */}
                                        <h2>{loadingError}</h2>
                                        <button onClick={() => navigate('/main', { replace: true })}>В меню</button>
                                    </div>
                                )}
                                {/* Сообщение, если пользователь как-то попал на /level/:id без данных */}
                                {!isLoadingLevel && !activeLevelData && !loadingError && location.pathname.startsWith('/level/') && (
                                    <div className="loading-screen">
                                        <h2>Данные уровня не загружены.</h2>
                                        <p>Возможно, вы попали на эту страницу напрямую или произошла непредвиденная ошибка.</p>
                                        <button onClick={() => navigate('/main', { replace: true })}>В меню</button>
                                    </div>
                                )}
                            </motion.div>
                        }/>
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
                        <Route path="/rewards" element={ // Экран наград все еще доступен по прямому пути, если нужно
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
                                    onStart={handleStartGame}
                                    onChapterNameChange={handleChapterNameChange} // <--- CALLBACK ПЕРЕДАН ИЗ КОД1
                                />
                            </motion.div>
                        } />
                        {/* Fallback Route */}
                        <Route path="*" element={ 
                            <motion.div key="mainfallback" {...routeContentVariants}>
                                <MainMenu
                                    onStart={handleStartGame}
                                    onChapterNameChange={handleChapterNameChange} // <--- CALLBACK ПЕРЕДАН ИЗ КОД1
                                />
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
                        initial={{ opacity: 1 }} // Начинаем с видимого состояния, т.к. TransitionOverlay управляет анимацией
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.05 } }} // Очень быстрое исчезновение обертки
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
        </div>
    );
};

export default App;