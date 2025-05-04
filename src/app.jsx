// src/App.jsx
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'; // Добавлен useMemo из Кода 1
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Импорты Компонентов
import MainMenu from "./components/MainMenu";
import Level from "./components/Level";
import Inventory from "./components/Inventory";
import Shop from "./components/Shop";
import BottomNav from "./components/BottomNav";
import UsernamePopup from "./components/UsernamePopup";
// Компоненты PowerLevel и ResourceBar больше не нужны, так как их содержимое интегрировано (комментарий из Кода 2 сохранен)
import Forge from "./components/Forge";
import Achievements from "./components/Achievements";
import RaceSelection from "./components/RaceSelection";
import LoadingScreen from "./components/LoadingScreen";

// Импорты Утилит и Стора
import useGameStore from "./store/useGameStore";
import './App.scss'; // Убедитесь, что здесь есть стили для .app-container, плавающих блоков и их содержимого

// --- Константа времени восстановления (в миллисекундах) --- (Из Кода 1)
const ENERGY_REFILL_INTERVAL_MS = 30 * 60 * 1000; // 30 минут

const App = () => {
    // === Состояния ===
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [needsRaceSelection, setNeedsRaceSelection] = useState(false);
    const [activeLevelData, setActiveLevelData] = useState(null);
    const [loadingError, setLoadingError] = useState(null);
    const [isLoadingLevel, setIsLoadingLevel] = useState(false);

    // === Состояния для таймера энергии (Из Кода 1) ===
    const [refillTimerDisplay, setRefillTimerDisplay] = useState(""); // Строка для отображения (мм:сс)
    const [shouldShowRefillTimer, setShouldShowRefillTimer] = useState(false); // Флаг показа таймера

    // Хуки роутера и реф
    const navigate = useNavigate();
    const location = useLocation();
    const appContainerRef = useRef(null); // Добавлено из Кода 1

    // === Данные из стора (Объединенный подход: useCallback + useMemo из Кода 1) ===
    // Используем useMemo для стабильности объекта-селектора
    const { username, gold, diamonds, powerLevel } = useGameStore(
        useCallback(state => ({
            username: state.username,
            gold: state.gold,
            diamonds: state.diamonds,
            powerLevel: state.powerLevel,
            // energy и avatarUrl не запрашиваются из стора в Коде 1, используем заглушки
        }), []) // Пустой массив зависимостей, т.к. селектор не меняется
    );

    // Actions из стора (остаются как были)
    const setUsername = useGameStore((s) => s.setUsername);
    const initializeCharacterStats = useGameStore((s) => s.initializeCharacterStats);
    const checkAndRefreshDailyDeals = useGameStore((s) => s.checkAndRefreshDailyDeals);

    // === ЗАГЛУШКИ (Из Кода 1, с использованием useMemo для energy) ===
    const energy = useMemo(() => ({ current: 85, max: 100 }), []); // Используем useMemo для стабильности объекта
    const avatarUrl = "/assets/default-avatar.png"; // Как в Коде 1
    const tonShards = 0;                        // Как в Коде 1

    // === Логика таймера энергии (Из Кода 1) ===
    useEffect(() => {
        // Если энергия не полная, запускаем таймер
        if (energy && energy.current < energy.max) {
            setShouldShowRefillTimer(true);

            // --- Упрощенная логика таймера ---
            // В реальной игре здесь нужно использовать timestamp последнего восстановления из стора
            // и рассчитывать точное время до следующего поинта.
            // Пока сделаем простой обратный отсчет от 30 минут для демонстрации.

            // Рассчитываем время окончания текущего 30-минутного интервала
            // Это очень грубый пример!
            const now = Date.now();
            // Представим, что восстановление началось когда-то в прошлом
            // Найдем остаток от деления текущего времени на интервал
            const remainder = now % ENERGY_REFILL_INTERVAL_MS;
            const timeUntilNextRefill = ENERGY_REFILL_INTERVAL_MS - remainder;

            let remainingMs = timeUntilNextRefill;

            const intervalId = setInterval(() => {
                remainingMs -= 1000; // Уменьшаем на секунду

                if (remainingMs <= 0) {
                    // Время вышло (в реальной игре здесь бы сработал refill action из стора)
                    setShouldShowRefillTimer(false); // Скрываем таймер (пока просто скрываем)
                    setRefillTimerDisplay("");
                    clearInterval(intervalId);
                    // TODO: Вызвать функцию восстановления энергии из стора
                    console.log("Время восстановить 1 энергию!");
                    // Перезапускаем таймер (или заставляем useEffect перепроверить)
                    // Для простоты здесь можно было бы обновить `energy` стейт/стор,
                    // но так как он заглушка, просто имитируем перезапуск
                    remainingMs = ENERGY_REFILL_INTERVAL_MS; // Начать новый отсчет
                    setShouldShowRefillTimer(true); // Снова показать таймер
                } else {
                    // Форматируем оставшееся время в мм:сс
                    const totalSeconds = Math.floor(remainingMs / 1000);
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    setRefillTimerDisplay(
                        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                    );
                }
            }, 1000);

            // Функция очистки при размонтировании или изменении energy
            return () => clearInterval(intervalId);

        } else {
            // Если энергия полная, скрываем таймер
            setShouldShowRefillTimer(false);
            setRefillTimerDisplay("");
        }
    }, [energy]); // Запускаем эффект при изменении объекта energy (из Кода 1)


    // === Определение видимости плавающих блоков (Из Кода 1) ===
    const path = location.pathname;
    const showAnyFixedUI = !path.startsWith('/level/') && !isInitialLoading && !needsRaceSelection;
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
    }, [/* Зависимости можно оставить пустыми или добавить стабильные функции */]);

    // === Обработчики действий пользователя (ОСТАВЛЕНЫ ИЗ КОД2, так как они более полные) ===
    const handleStartGame = useCallback(async (chapterId, levelId) => {
        console.log(`🚀 Запрос на старт: Глава ${chapterId}, Уровень ${levelId}`);
        setIsLoadingLevel(true);
        setActiveLevelData(null);
        setLoadingError(null);
        navigate(`/level/${levelId}/loading`);
        try {
            const dataPath = `/data/levels/level${levelId}Data.json`;
            console.log(`Загрузка данных уровня: ${dataPath}`);
            // Имитация задержки сети (можно убрать)
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
            navigate(`/level/${levelId}`, { replace: true }); // Использовать replace для навигации после загрузки
        } catch (error) {
            console.error(`❌ Ошибка загрузки уровня ${levelId}:`, error);
            setLoadingError(`Не удалось загрузить уровень ${levelId}. ${error.message}`);
            setIsLoadingLevel(false);
            navigate("/main", { replace: true }); // Возврат в меню при ошибке
            setActiveLevelData(null);
        }
    }, [navigate]);

    const handleLevelComplete = useCallback(() => {
        console.log("🏁 Уровень завершён, возврат в меню.");
        setActiveLevelData(null); // Сброс данных уровня
        navigate("/main");
    }, [navigate]);

    const handleLevelReady = useCallback(() => {
        console.log("🎮 Компонент Уровня готов к игре!");
        // Можно добавить логику, если нужно что-то сделать когда уровень полностью отрисован и готов
    }, []);

    const handleRaceSelectionComplete = useCallback(() => {
        console.log("Раса выбрана, перенаправление в главное меню.");
        setNeedsRaceSelection(false);
        // Перезагрузка данных пользователя или обновление состояния может потребоваться здесь
        // Например, снова вызвать initializeCharacterStats, если он не был вызван ранее
        // или обновить имя пользователя, если оно устанавливается после выбора расы
        navigate('/main', { replace: true }); // Использовать replace
    }, [navigate]); // Добавлены зависимости


    // === Основной рендер компонента App ===

    // Показываем начальный экран загрузки
    if (isInitialLoading) {
        return <LoadingScreen key="loading_initial" message="Загрузка игры..." />;
    }

    // Редирект на выбор расы, если нужно (до основного рендера)
    // Убрано из основного return, чтобы избежать рендера остального UI во время редиректа
    if (needsRaceSelection && location.pathname !== '/race-selection') {
         // Показываем заглушку пока идет перенаправление
        return <LoadingScreen key="redirecting_to_race" message="Подготовка выбора расы..." />;
    }

    return (
        <div className="app-container" ref={appContainerRef}> {/* Добавлен ref из Кода 1 */}

            {/* --- Плавающие Блоки (Структура и видимость из Кода 1) --- */}
            {/* Блок Информации о Игроке */}
            {showPlayerInfo && (
                <div className="player-info-float">
                    <img src={avatarUrl} alt="Аватар" className="player-avatar-small" /> {/* Класс из Кода 1 */}
                    <div className="player-details">
                        <span className="player-name">{username || "Гость"}</span>
                        <span className="player-power">{powerLevel?.toLocaleString() ?? '...'}</span>
                    </div>
                </div>
            )}
            {/* Блок Ресурсов */}
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
            {/* Блок Энергии (с таймером) */}
            {showEnergyBar && (
                <div className="energy-bar-float">
                    {/* Обертка для самой полоски (Из Кода 1) */}
                    <div className="energy-bar-content">
                        <img src="/assets/icon-energy.png" alt="" className="resource-icon-small energy-icon" />
                        <div className="energy-track">
                            <div
                                className="energy-fill"
                                style={{ width: `${(energy?.current && energy?.max && energy.max > 0) ? (energy.current / energy.max * 100) : 0}%` }}
                            ></div>
                        </div>
                        <span className="energy-text">{`${energy?.current ?? '?'}/${energy?.max ?? '?'}`}</span>
                    </div>
                    {/* Блок для таймера (используем состояния из Кода 1) */}
                    { shouldShowRefillTimer && refillTimerDisplay && ( /* Переменные добавлены выше */
                       <div className="energy-refill-timer">
                           Восполнится через {refillTimerDisplay}
                       </div>
                    )}
                </div>
            )}
            {/* --- Конец Плавающих Блоков --- */}


            {/* Попап для ввода имени пользователя (условия показа из Кода 1, позиционирование зависит от CSS) */}
            {/* Показывается только если НЕ начальная загрузка, НЕ нужен выбор расы и НЕ на уровне */}
            {!isInitialLoading && !needsRaceSelection && !location.pathname.startsWith('/level') && <UsernamePopup />}

            {/* ❌ Удалена старая <header> из Кода 2 (если она была) */}

            {/* Основная область для контента */}
            <main className="content-area">
                <AnimatePresence mode="wait" initial={false}>
                    {/* Routes (Логика из Кода 2, обработка Level немного изменена для ясности) */}
                    <Routes location={location} key={location.pathname}>
                        <Route path="/race-selection" element={<RaceSelection onComplete={handleRaceSelectionComplete} />} />
                        <Route path="/level/:levelId/loading" element={<LoadingScreen message="Загрузка уровня..." />} />
                        <Route path="/level/:levelId" element={
                             // Сначала проверяем, есть ли данные уровня
                             activeLevelData ? (
                                 <Level levelData={activeLevelData} onLevelComplete={handleLevelComplete} onReady={handleLevelReady}/>
                             ) : // Если данных нет, проверяем, идет ли еще загрузка
                             isLoadingLevel ? (
                                 <LoadingScreen message="Загрузка данных..." /> // Показываем лоадер пока грузим данные, если попали сюда напрямую
                             ) : // Если не грузим и данных нет - показываем ошибку
                             (
                                 <motion.div
                                     key="error_level_data"
                                     className="loading-screen" // Используем класс для стилизации под ошибку
                                     initial={{ opacity: 0 }}
                                     animate={{ opacity: 1 }}
                                     exit={{ opacity: 0 }}
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
                        <Route path="/main" element={<MainMenu onStart={handleStartGame} />} />
                        {/* Универсальный маршрут для / или любого другого не найденного пути */}
                        <Route path="*" element={<MainMenu onStart={handleStartGame} />} /> {/* Перенаправляем на MainMenu */}
                    </Routes>
                </AnimatePresence>
            </main>

            {/* Нижняя навигация (условия показа из Кода 1) */}
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