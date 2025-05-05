// src/App.jsx
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// <<< useNavigate и useLocation импортированы (как в Коде 1 и Коде 2) >>>
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
import RewardsScreen from "./components/RewardsScreen"; // <<< ДОБАВЛЕН ИМПОРТ НОВОГО ЭКРАНА из Кода 1

// Импорты Утилит и Стора
import useGameStore from "./store/useGameStore";
import './App.scss'; // Убедитесь, что здесь есть стили для .app-container, плавающих блоков и их содержимого

// --- Константа времени восстановления (в миллисекундах) --- (Из Кода 1)
const ENERGY_REFILL_INTERVAL_MS = 30 * 60 * 1000; // 30 минут

const App = () => {
    // === Состояния === (Из Кода 2, они более полные)
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [needsRaceSelection, setNeedsRaceSelection] = useState(false);
    const [activeLevelData, setActiveLevelData] = useState(null);
    const [loadingError, setLoadingError] = useState(null);
    const [isLoadingLevel, setIsLoadingLevel] = useState(false);

    // === Состояния для таймера энергии (Из Кода 1/Кода 2) ===
    const [refillTimerDisplay, setRefillTimerDisplay] = useState(""); // Строка для отображения (мм:сс)
    const [shouldShowRefillTimer, setShouldShowRefillTimer] = useState(false); // Флаг показа таймера

    // Хуки роутера и реф
    const navigate = useNavigate();
    const location = useLocation();
    const appContainerRef = useRef(null); // Добавлено из Кода 1

    // === Данные из стора (Объединенный подход из Кода 2, с селектором из Кода 1) ===
    const { username, gold, diamonds, powerLevel,  energyCurrent, energyMax, lastEnergyRefillTimestamp, refillEnergyOnLoad, consumeEnergy } = useGameStore(
        useCallback(state => ({
            username: state.username,
            gold: state.gold,
            diamonds: state.diamonds,
            powerLevel: state.powerLevel,
            energyCurrent: state.energyCurrent,
            energyMax: state.energyMax,
            lastEnergyRefillTimestamp: state.lastEnergyRefillTimestamp,
            refillEnergyOnLoad: state.refillEnergyOnLoad,
            consumeEnergy: state.consumeEnergy, // Добавлено из Кода 1 / Кода 2
        }), []) // Пустой массив зависимостей, т.к. селектор не меняется
    );

    // Actions из стора (остаются как были)
    const setUsername = useGameStore((s) => s.setUsername);
    const initializeCharacterStats = useGameStore((s) => s.initializeCharacterStats);
    const checkAndRefreshDailyDeals = useGameStore((s) => s.checkAndRefreshDailyDeals);

    // === ЗАГЛУШКИ (Из Кода 1, с использованием useMemo для energy) ===
    // energy из useMemo используется в Коде 1 как заглушка, но в Коде 2/Store есть реальные energyCurrent/energyMax
    // Оставим заглушки avatarUrl и tonShards из Кода 1
    const avatarUrl = "/assets/default-avatar.png";
    const tonShards = 0;
    // Заглушка energy больше не нужна, так как используем energyCurrent/energyMax из стора
    // const energy = useMemo(() => ({ current: 85, max: 100 }), []);

    // === Логика таймера энергии (Из Кода 1 / Кода 2 - они идентичны) ===
    useEffect(() => {
        let intervalId = null;

        const updateTimer = () => {
            // Используем значения из замыкания useEffect (energyCurrent, energyMax, lastEnergyRefillTimestamp)
            if (energyCurrent < energyMax) {
                setShouldShowRefillTimer(true);
                const nextRefillTimestamp = lastEnergyRefillTimestamp + ENERGY_REFILL_INTERVAL_MS;
                const now = Date.now();
                let remainingMs = nextRefillTimestamp - now;

                if (remainingMs <= 0) {
                    // Время потенциально вышло. Вызываем refillEnergyOnLoad, чтобы стор сам пересчитал.
                    console.log("Timer expired, triggering refill check via action...");
                    refillEnergyOnLoad(); // Вызов action изменит состояние и перезапустит этот useEffect
                    if (intervalId) clearInterval(intervalId); // Останавливаем текущий интервал
                } else {
                    // Время еще есть, форматируем
                    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    setRefillTimerDisplay(
                        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                    );
                }
            } else {
                // Энергия полная
                setShouldShowRefillTimer(false);
                setRefillTimerDisplay("");
                if (intervalId) clearInterval(intervalId);
            }
        };

        // Запускаем таймер только если энергия не полная
        if (energyCurrent < energyMax) {
            updateTimer(); // Первый вызов для немедленного отображения
            intervalId = setInterval(updateTimer, 1000); // Обновление каждую секунду
        } else {
            setShouldShowRefillTimer(false); // Убедимся, что таймер скрыт, если энергия полная
        }

        // Функция очистки
        return () => {
            if (intervalId) clearInterval(intervalId);
        };

    // Перезапускаем useEffect, когда меняются ключевые данные энергии из стора
    }, [energyCurrent, energyMax, lastEnergyRefillTimestamp, refillEnergyOnLoad]);

    // === Определение видимости плавающих блоков (ОБНОВЛЕНО из Кода 1) ===
    const path = location.pathname;
    // НЕ показывать UI на уровне, при загрузке, выборе расы И НА ЭКРАНЕ НАГРАД
    const showAnyFixedUI = !path.startsWith('/level/') && !isInitialLoading && !needsRaceSelection && path !== '/rewards'; // <<< ДОБАВЛЕНО && path !== '/rewards' из Кода 1
    // Остальные условия видимости теперь зависят от showAnyFixedUI
    const showPlayerInfo = showAnyFixedUI && (path === '/main' || path === '/inventory');
    const showResources = showAnyFixedUI && (path === '/main' || path === '/inventory' || path === '/shop' || path === '/forge');
    const showEnergyBar = showAnyFixedUI && (path === '/main');

    // === Эффект для проверки начального состояния (ОСТАВЛЕН ИЗ КОД2, так как он более полный) ===
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
            } else if (location.pathname === '/' || location.pathname.startsWith('/loading') || location.pathname === '/race-selection') { // Добавлена проверка /race-selection
                console.log("Переход на /main");
                navigate('/main', { replace: true });
            } else {
                console.log("Остаемся на текущем пути:", location.pathname);
            }
        }, loadingDuration);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [/* Зависимости можно оставить пустыми или добавить стабильные функции navigate, initialize*, setUsername, checkAndRefresh* */]);

    // === Обработчики действий пользователя (ОСТАВЛЕНЫ ИЗ КОД2, но с изменениями из Кода 1) ===
    const handleStartGame = useCallback(async (chapterId, levelId) => {
        const ENERGY_COST = 10; // Пример стоимости старта уровня
        console.log(`Попытка старта уровня ${levelId}. Стоимость: ${ENERGY_COST} энергии.`);

        // Используем consumeEnergy из стора (как в Коде 1 и Коде 2)
        const hasEnoughEnergy = consumeEnergy(ENERGY_COST); // Вызываем action стора

        if (!hasEnoughEnergy) {
            alert("Недостаточно энергии для старта уровня!");
            console.log("Старт уровня отменен из-за нехватки энергии.");
            return; // Прерываем старт
        }

        console.log(`🚀 Запрос на старт: Глава ${chapterId}, Уровень ${levelId}`);
        setIsLoadingLevel(true);
        setActiveLevelData(null);
        setLoadingError(null);
        navigate(`/level/${levelId}/loading`);
        try {
            const dataPath = `/data/levels/level${levelId}Data.json`;
            console.log(`Загрузка данных уровня: ${dataPath}`);
            await new Promise(resolve => setTimeout(resolve, 300)); // Имитация сети
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
    }, [navigate, consumeEnergy]); // <<< Добавлен consumeEnergy в зависимости (как в Коде 1/Коде 2)

    const handleLevelComplete = useCallback(() => {
        console.log("🏁 Уровень завершён, переход на экран наград.");
        setActiveLevelData(null); // Сброс данных уровня
        navigate("/rewards"); // <<< ИЗМЕНЕНО: Переход на /rewards согласно логике добавления экрана в Коде 1
    }, [navigate]);

    const handleLevelReady = useCallback(() => {
        console.log("🎮 Компонент Уровня готов к игре!");
        // Логика из Кода 2
    }, []);

    const handleRaceSelectionComplete = useCallback(() => {
        console.log("Раса выбрана, перенаправление в главное меню.");
        setNeedsRaceSelection(false);
        // Логика из Кода 2
        navigate('/main', { replace: true });
    }, [navigate]); // Добавлена зависимость navigate


    // === Основной рендер компонента App ===

    // Начальный экран загрузки (из Кода 2)
    if (isInitialLoading) {
        return <LoadingScreen key="loading_initial" message="Загрузка игры..." />;
    }

    // Редирект на выбор расы (из Кода 2)
    if (needsRaceSelection && location.pathname !== '/race-selection') {
        return <LoadingScreen key="redirecting_to_race" message="Подготовка выбора расы..." />;
    }

    return (
        <div className="app-container" ref={appContainerRef}> {/* ref из Кода 1 */}

            {/* --- Плавающие Блоки (Структура из Кода 2, видимость из Кода 1) --- */}
            {/* Блок Информации о Игроке */}
            {showPlayerInfo && (
                <div className="player-info-float">
                    <img src={avatarUrl} alt="Аватар" className="player-avatar-small" />
                    <div className="player-details">
                        <span className="player-name">{username || "Гость"}</span>
                        {/* Отображаем powerLevel из стора */}
                        <span className="player-power">{powerLevel?.toLocaleString() ?? '...'}</span>
                    </div>
                </div>
            )}
            {/* Блок Ресурсов */}
            {showResources && (
                <div className="resources-float">
                    {/* Золото */}
                    <div className="resource-item-float">
                        <img src="/assets/coin-icon.png" alt="Золото" className="resource-icon-small" />
                        {/* Отображаем gold из стора */}
                        <span>{gold?.toLocaleString() ?? '0'}</span>
                    </div>
                    {/* Алмазы */}
                    <div className="resource-item-float">
                        <img src="/assets/diamond-image.png" alt="Алмазы" className="resource-icon-small" />
                        {/* Отображаем diamonds из стора */}
                        <span>{diamonds?.toLocaleString() ?? '0'}</span>
                    </div>
                    {/* Осколки TON (используем заглушку) */}
                    <div className="resource-item-float">
                        <img src="/assets/toncoin-icon.png" alt="Осколки" className="resource-icon-small" />
                        <span>{tonShards?.toLocaleString() ?? '0'}</span>
                    </div>
                </div>
            )}
            {/* Блок Энергии (с таймером) */}
            {showEnergyBar && (
                <div className="energy-bar-float">
                    <div className="energy-bar-content">
                        <img src="/assets/energy-icon.png" alt="" className="resource-icon-small energy-icon" />
                        <div className="energy-track">
                            <div
                                className="energy-fill"
                                // <<< ИСПОЛЬЗУЕМ ДАННЫЕ ИЗ СТОРА (energyCurrent, energyMax) >>>
                                style={{ width: `${(energyMax > 0) ? (energyCurrent / energyMax * 100) : 0}%` }}
                            ></div>
                        </div>
                         {/* <<< ИСПОЛЬЗУЕМ ДАННЫЕ ИЗ СТОРА (energyCurrent, energyMax) >>> */}
                        <span className="energy-text">{`${energyCurrent ?? '?'}/${energyMax ?? '?'}`}</span>
                    </div>
                    {/* Блок для таймера (как в Коде 2) */}
                    { shouldShowRefillTimer && refillTimerDisplay && (
                       <div className="energy-refill-timer">
                            Восполнится через {refillTimerDisplay}
                       </div>
                    )}
                </div>
            )}
            {/* --- Конец Плавающих Блоков --- */}


            {/* Попап для ввода имени пользователя (условия показа из Кода 1) */}
            {/* Показывается только если НЕ начальная загрузка, НЕ нужен выбор расы, НЕ на уровне И НЕ на экране наград */}
            {!isInitialLoading && !needsRaceSelection && !location.pathname.startsWith('/level') && !location.pathname.startsWith('/rewards') && <UsernamePopup />} {/* <<< Добавлено && !location.pathname.startsWith('/rewards') из Кода 1 */}

            {/* Основная область для контента */}
            <main className="content-area">
                <AnimatePresence mode="wait" initial={false}>
                    {/* Routes (Логика из Кода 2, с добавлением маршрута из Кода 1) */}
                    <Routes location={location} key={location.pathname}>
                        {/* Маршруты из Кода 2 */}
                        <Route path="/race-selection" element={<RaceSelection onComplete={handleRaceSelectionComplete} />} />
                        <Route path="/level/:levelId/loading" element={<LoadingScreen message="Загрузка уровня..." />} />
                        <Route path="/level/:levelId" element={
                            // Логика рендера Level или Loading/Error из Кода 2
                            activeLevelData ? (
<Level
      levelData={activeLevelData}
      onLevelComplete={handleLevelComplete}
      onReady={handleLevelReady}
      difficulty={'normal'} // <<< ВОТ ЭТО ДОБАВЛЕНО
    />                            ) : isLoadingLevel ? (
                                <LoadingScreen message="Загрузка данных..." />
                            ) : (
                                <motion.div
                                    key="error_level_data"
                                    className="loading-screen" // Используем класс для стилизации под ошибку
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                >
                                    <h2>Ошибка: Данные уровня не найдены!</h2>
                                    <p>Возможно, вы попали сюда по неверной ссылке.</p>
                                    <button onClick={() => navigate('/main', { replace: true })}>В меню</button>
                                </motion.div>
                            )
                        }/>
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/shop" element={<Shop />} />
                        <Route path="/forge" element={<Forge />} />
                        <Route path="/achievements" element={<Achievements />} />

                        {/* === НОВЫЙ МАРШРУТ ДЛЯ ЭКРАНА НАГРАД (из Кода 1) === */}
                        <Route path="/rewards" element={<RewardsScreen />} />

                        {/* Главное меню и путь по умолчанию (из Кода 2) */}
                        <Route path="/main" element={<MainMenu onStart={handleStartGame} />} />
                        <Route path="*" element={<MainMenu onStart={handleStartGame} />} />
                    </Routes>
                </AnimatePresence>
            </main>

            {/* Нижняя навигация (условия показа из Кода 1) */}
            {/* НЕ показывается на уровне и экране наград */}
             {!isInitialLoading && !needsRaceSelection && !location.pathname.startsWith('/level') && !location.pathname.startsWith('/rewards') && ( // <<< Добавлено && !location.pathname.startsWith('/rewards') из Кода 1
                <BottomNav />
            )}

            {/* Попап для отображения ошибок загрузки (из Кода 2) */}
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