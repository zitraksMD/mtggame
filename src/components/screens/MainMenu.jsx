// src/components/MainMenu.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../store/useGameStore.js';
import ZoneMap from "../ZoneMap.jsx";
import GlobalMap from "../GlobalMap.jsx";
import TransitionOverlay from "../TransitionOverlay.jsx";
import Popup from '../popups/Popup.jsx'; // Существующий компонент Popup
import "./MainMenu.scss";
import { useNavigate, useLocation } from 'react-router-dom';
import LevelDetailsPopup from '../popups/LevelDetailsPopup.jsx';
import ShardboundRunesGamePopup from '../popups/ShardboundRunesGamePopup.jsx'; // Новый импорт
import ShardboundRunesResultsPopup from '../popups/ShardboundRunesResultsPopup.jsx'; // Новый импорт



import { ALL_ZONES_CONFIG, findZoneIdForChapter } from '../../data/worldMapData.js';

// Импорт для содержимого всплывающего окна почты
import MailPopupContent from '../popups/MailPopupContent.jsx';

// Импорты для Сокровищницы
import TreasureChestInfoPopup from '../popups/TreasureChestInfoPopup.jsx';
// Позже добавим TreasureChestGamePopup и TreasureChestResultsPopup

const popupContentVariants = {
    initial: { opacity: 0, y: 20 }, // Начинается чуть ниже и прозрачно
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2, ease: "easeIn" } } // Уходит вверх и исчезает
  };

// Варианты анимации для оверлея поп-апа почты
const mailOverlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2, ease: "easeInOut" } },
    exit: { opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } } // Оверлей исчезает
};

// Варианты анимации для основного контейнера поп-апа почты (внешняя рамка)
const mailPopupFrameVariants = {
    hidden: { // Начальное состояние (перед появлением) и конечное (после исчезновения)
        opacity: 0,
        scale: 0.85,
        // y: "10%" // Можно добавить сдвиг по Y для эффекта "выпрыгивания/ухода"
    },
    visible: { // Активное состояние
        opacity: 1,
        scale: 1,
        // y: "0%",
        transition: {
            type: "spring", // Пружинная анимация для появления
            stiffness: 300,
            damping: 25,
            duration: 0.3
        }
    },
    exit: { // Состояние при закрытии
        opacity: 0,
        scale: 0.85,
        // y: "10%",
        transition: {
            type: "tween", // Обычная анимация для закрытия
            ease: "easeIn",
            duration: 0.2
        }
    }
};

const INITIAL_CHAPTER_ID = 1;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
const chapterDataModules = import.meta.glob('../../data/zones/*/chapter*Data.js');
const zoneDataModules = import.meta.glob('../../data/zones/*/zoneData.js');


// Добавляем onChapterNameChange в пропсы
const MainMenu = ({ onStart, onChapterNameChange }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        currentChapterIdFromStore,
        setCurrentChapterInStore,
        isLevelUnlocked,
        getLevelCompletionStatus,
        isHardModeUnlocked,
        resetGame,
        hasClaimableRewardsIndicator,
        setIsFullScreenMapActive,
        startScreenTransition,
        ensureScreenIsOpening,
        isZoneUnlocked,
        treasureChestAttempts, // Добавлено из код1
        useTreasureChestAttempt: consumeChestAttempt, // Добавлено и переименовано из код1
    } = useGameStore(state => ({
        currentChapterIdFromStore: state.currentChapterId,
        setCurrentChapterInStore: state.setCurrentChapter,
        isLevelUnlocked: state.isLevelUnlocked,
        getLevelCompletionStatus: state.getLevelCompletionStatus,
        isHardModeUnlocked: state.isHardModeUnlocked,
        resetGame: state.resetGame,
        hasClaimableRewardsIndicator: state.hasClaimableRewardsIndicator,
        setIsFullScreenMapActive: state.setIsFullScreenMapActive,
        startScreenTransition: state.startScreenTransition,
        ensureScreenIsOpening: state.ensureScreenIsOpening,
        isZoneUnlocked: state.isZoneUnlocked,
        treasureChestAttempts: state.treasureChestAttempts, // Добавлено из код1
        useTreasureChestAttempt: state.useTreasureChestAttempt, // Добавлено из код1
    }));

    const [activeView, setActiveView] = useState('detailed');
    const [currentChapterId, setCurrentChapterId] = useState(
        location.state?.focusOnChapterId || currentChapterIdFromStore || INITIAL_CHAPTER_ID
    );

    const [currentZoneId, setCurrentZoneId] = useState(() => {
        const initialChapterZoneId = findZoneIdForChapter(currentChapterId);
        return initialChapterZoneId || (ALL_ZONES_CONFIG[0]?.id || null);
    });

    const [chaptersForCurrentZone, setChaptersForCurrentZone] = useState([]);
    const [isLoadingZoneChapters, setIsLoadingZoneChapters] = useState(false);

    const [isOverlayActive, setIsOverlayActive] = useState(false);
    const [triggerCloseOverlay, setTriggerCloseOverlay] = useState(false);
    const [triggerOpenOverlay, setTriggerOpenOverlay] = useState(false);
    const nextViewAfterOverlayRef = useRef({ view: 'detailed', focus: { chapterId: currentChapterId, zoneId: currentZoneId } });

    const [selectedLevelId, setSelectedLevelId] = useState(null);
    const [showLevelPopup, setShowLevelPopup] = useState(false);
    const [isLoadingLevel, setIsLoadingLevel] = useState(false);
    const [chapterData, setChapterData] = useState(null);
    const [isLoadingChapter, setIsLoadingChapter] = useState(true);
    const [activePopup, setActivePopup] = useState(null); // Состояние для активного попапа
    
    // Состояния для Сокровищницы из код1
    const [treasureChestState, setTreasureChestState] = useState('info'); // 'info', 'game', 'results'
    const [lastChestRewards, setLastChestRewards] = useState(null);

    const mapContainerRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const mapStart = useRef({ x: 0, y: 0 });
    const hasStarted = useRef(false);
    const levelDetailsPopupRef = useRef(null);
    const [resetTrigger, setResetTrigger] = useState(0);

    // ... (остальные хуки useEffect и функции без изменений до performViewChange) ...
    const performViewChange = useCallback((targetView, focusData = null) => {
        if (activeView === targetView && !isOverlayActive && !focusData) {
            console.log(`MainMenu: performViewChange - Already on view '${targetView}'. Skipping.`);
            return;
        }
        if (activeView === targetView && focusData &&
            (!focusData.chapterId || focusData.chapterId === currentChapterId) &&
            (!focusData.zoneId || focusData.zoneId === currentZoneId) &&
            (!focusData.chapterIdForInitialZoneFocus || focusData.chapterIdForInitialZoneFocus === currentChapterId) &&
            (!focusData.zoneIdForFocus || focusData.zoneIdForFocus === currentZoneId) &&
            !isOverlayActive) {
            console.log(`MainMenu: performViewChange - Already on view '${targetView}' with same effective focus. Skipping.`);
            return;
        }

        if (isOverlayActive && (triggerCloseOverlay || triggerOpenOverlay)) {
            console.warn("MainMenu: performViewChange called while overlay transition is already in progress. Ignoring.");
            return;
        }
        console.log(`MainMenu: performViewChange - Requesting transition to view '${targetView}'. FocusData:`, focusData);

        nextViewAfterOverlayRef.current = { view: targetView, focus: focusData || {} };
        setIsOverlayActive(true);
        setTriggerOpenOverlay(false);
        setTriggerCloseOverlay(true);
    }, [activeView, isOverlayActive, triggerCloseOverlay, triggerOpenOverlay, currentChapterId, currentZoneId]);

    useEffect(() => {
        // Если мы не в детальном виде, имя главы в шапке нерелевантно или должно быть очищено
        if (activeView !== 'detailed' && onChapterNameChange) {
            onChapterNameChange(null);
        }
        setIsFullScreenMapActive(activeView === 'zone' || activeView === 'global');
    }, [activeView, setIsFullScreenMapActive, onChapterNameChange]); // Добавляем onChapterNameChange в зависимости

    useEffect(() => {
        const stateFromLocation = location.state || {};
        const chapterIdToFocus = stateFromLocation.focusOnChapterId;
        const zoneIdToFocus = stateFromLocation.zoneIdForMap;
        const viewToOpen = stateFromLocation.initialMapView;
        let stateNeedsClearing = false;

        let finalChapterId = currentChapterId;
        let finalZoneId = currentZoneId;

        if (chapterIdToFocus && chapterIdToFocus !== finalChapterId) {
            finalChapterId = chapterIdToFocus;
            stateNeedsClearing = true;
        }

        if (finalChapterId && finalChapterId !== currentChapterIdFromStore) {
            setCurrentChapterInStore(finalChapterId);
        }
        if (finalChapterId !== currentChapterId) {
            setCurrentChapterId(finalChapterId);
        }

        const derivedZoneIdFromChapter = findZoneIdForChapter(finalChapterId);

        if (zoneIdToFocus && zoneIdToFocus !== finalZoneId) {
            finalZoneId = zoneIdToFocus;
            stateNeedsClearing = true;
        } else if (derivedZoneIdFromChapter && derivedZoneIdFromChapter !== finalZoneId && !zoneIdToFocus) {
            finalZoneId = derivedZoneIdFromChapter;
        }

        if (finalZoneId && finalZoneId !== currentZoneId) {
            setCurrentZoneId(finalZoneId);
        }

        if (viewToOpen && viewToOpen !== activeView && !isOverlayActive && !triggerCloseOverlay && !triggerOpenOverlay) {
            console.log(`MainMenu: useEffect[location.state] - Requesting view change to '${viewToOpen}' with chapterId: ${finalChapterId}, zoneId: ${finalZoneId}`);
            performViewChange(viewToOpen, {
                zoneId: finalZoneId || derivedZoneIdFromChapter,
                chapterId: finalChapterId
            });
            stateNeedsClearing = true;
        }

        if (stateNeedsClearing && Object.keys(stateFromLocation).length > 0) {
            console.log("MainMenu: useEffect - Clearing location.state:", location.state);
            navigate(location.pathname, { state: {}, replace: true });
        }
    }, [location.state, navigate, activeView, isOverlayActive, triggerCloseOverlay, triggerOpenOverlay, currentChapterId, currentChapterIdFromStore, setCurrentChapterInStore, currentZoneId, performViewChange]);

    useEffect(() => {
        let isMounted = true;
        const loadChapter = async (chapterIdToLoad) => {
            if (!isMounted || !chapterIdToLoad) {
                if (isMounted && onChapterNameChange) onChapterNameChange(null); // Очищаем, если нет chapterIdToLoad
                return;
            }
            const zoneIdForPath = findZoneIdForChapter(chapterIdToLoad);

            if (!zoneIdForPath) {
                if (isMounted) {
                    console.error(`[MainMenu] Не удалось определить зону для главы ${chapterIdToLoad}. Загрузка отменена.`);
                    if (onChapterNameChange) onChapterNameChange(null); // Очищаем имя
                    setIsLoadingChapter(false);
                }
                return;
            }

            console.log(`[MainMenu] Attempting to load CHAPTER data for chapter ${chapterIdToLoad} in zone ${zoneIdForPath}...`);
            setIsLoadingChapter(true);
            setChapterData(null);
            if (onChapterNameChange) onChapterNameChange(null); // Очищаем имя перед загрузкой новой главы
            setPosition({ x: 0, y: 0 });

            try {
                const modulePath = `../../data/zones/${zoneIdForPath}/chapter${chapterIdToLoad}Data.js`;

                if (chapterDataModules[modulePath]) {
                    const chapterModule = await chapterDataModules[modulePath]();
                    if (isMounted) {
                        if (chapterModule.default && typeof chapterModule.default.id === 'number') {
                            setChapterData(chapterModule.default);
                            if (onChapterNameChange) { // <--- ВЫЗЫВАЕМ CALLBACK
                                onChapterNameChange(chapterModule.default.name);
                            }
                            console.log("[MainMenu] Successfully loaded CHAPTER data:", chapterModule.default);
                        } else {
                            if (onChapterNameChange) onChapterNameChange(null); // Очищаем имя при ошибке структуры
                            throw new Error(`Invalid chapter data structure or missing ID in ${modulePath}`);
                        }
                    }
                } else {
                    if (isMounted && onChapterNameChange) onChapterNameChange(null); // Очищаем имя, если модуль не найден
                    console.error(`[MainMenu] Module not found for key: ${modulePath}`);
                    console.log('[MainMenu] Available module keys from glob:', Object.keys(chapterDataModules));
                    throw new Error(`Module for chapter ${chapterIdToLoad} in zone ${zoneIdForPath} not found. Path: ${modulePath}`);
                }
            } catch (error) {
                if (isMounted) {
                    if (onChapterNameChange) onChapterNameChange(null); // Очищаем имя при ошибке загрузки
                    console.error(`[MainMenu] Failed to load CHAPTER data for ID ${chapterIdToLoad} (zone: ${zoneIdForPath}):`, error);
                }
            } finally {
                if (isMounted) {
                    if (currentChapterId === chapterIdToLoad) {
                        setIsLoadingChapter(false);
                    } else {
                        console.log(`[MainMenu] Chapter ID changed during load (from ${chapterIdToLoad} to ${currentChapterId}). Not setting isLoadingChapter for ${chapterIdToLoad}.`);
                    }
                }
            }
        };

        if (activeView === 'detailed' && currentChapterId) {
            loadChapter(currentChapterId);
        } else if (activeView === 'detailed' && !currentChapterId && isMounted) {
            setCurrentChapterId(INITIAL_CHAPTER_ID);
            if (currentChapterIdFromStore !== INITIAL_CHAPTER_ID) {
                setCurrentChapterInStore(INITIAL_CHAPTER_ID);
            }
            // Если нет currentChapterId и не грузим, очищаем имя
            if (onChapterNameChange) onChapterNameChange(null);
        } else if (activeView !== 'detailed') {
            // Если мы не в детальном виде, имя главы в шапке нерелевантно
            if (onChapterNameChange) onChapterNameChange(null);
        }

        return () => { isMounted = false; };
    }, [currentChapterId, activeView, setCurrentChapterInStore, currentChapterIdFromStore, /* performViewChange, */ resetTrigger, /* findZoneIdForChapter, */ /* setIsLoadingChapter, setChapterData, setPosition, */ /* INITIAL_CHAPTER_ID, */ onChapterNameChange]);
    // Убрал некоторые зависимости из loadChapter, так как они передаются в саму функцию или являются константами/импортами
    // findZoneIdForChapter, setIsLoadingChapter, setChapterData, setPosition, INITIAL_CHAPTER_ID - используются внутри loadChapter и самого useEffect, но не должны вызывать его перезапуск сами по себе, если не меняются внешне.
    // performViewChange - также убрал, т.к. его вызов не должен напрямую влиять на перезагрузку данных главы в этом хуке.

    useEffect(() => {
        let isMounted = true;
        if (activeView === 'zone' && currentZoneId) {
            setIsLoadingZoneChapters(true);
            setChaptersForCurrentZone([]);

            const modulePath = `../../data/zones/${currentZoneId}/zoneData.js`;
            console.log(`MainMenu: Attempting to load chapters for zone ${currentZoneId} using module path: ${modulePath}`);

            if (zoneDataModules[modulePath]) {
                zoneDataModules[modulePath]()
                    .then(module => {
                        if (isMounted) {
                            if (module.chaptersInZone) {
                                setChaptersForCurrentZone(module.chaptersInZone);
                                console.log(`MainMenu: Successfully loaded ${module.chaptersInZone.length} chapters for zone ${currentZoneId}.`);
                            } else {
                                console.error(`MainMenu: Property 'chaptersInZone' not found in loaded module from ${modulePath}. Module content:`, module);
                                setChaptersForCurrentZone([]);
                            }
                        }
                    })
                    .catch(err => {
                        if (isMounted) {
                            console.error(`MainMenu: Failed to load module for zone ${currentZoneId} from ${modulePath}:`, err);
                            setChaptersForCurrentZone([]);
                        }
                    })
                    .finally(() => {
                        if (isMounted) {
                            setIsLoadingZoneChapters(false);
                        }
                    });
            } else {
                console.error(`MainMenu: Module path ${modulePath} not found in zoneDataModules. This likely means an issue with the glob pattern, the file path construction, or the file doesn't exist at the expected location.`);
                console.log('[MainMenu] Available keys in zoneDataModules:', Object.keys(zoneDataModules));
                if (isMounted) {
                    setChaptersForCurrentZone([]);
                    setIsLoadingZoneChapters(false);
                }
            }
        }
        return () => { isMounted = false; };
    }, [activeView, currentZoneId, setIsLoadingZoneChapters, setChaptersForCurrentZone]);

    useEffect(() => {
        if (activeView !== 'detailed' || !chapterData || isLoadingChapter || !mapContainerRef.current) return;
        const containerWidth = mapContainerRef.current.offsetWidth;
        const containerHeight = mapContainerRef.current.offsetHeight;
        const mapWidth = chapterData.imageWidth;
        const mapHeight = chapterData.imageHeight;
        let initialX = chapterData.initialView?.x ?? clamp(containerWidth / 2 - mapWidth / 2, containerWidth - mapWidth, 0);
        let initialY = chapterData.initialView?.y ?? clamp(containerHeight / 2 - mapHeight / 2, containerHeight - mapHeight, 0);
        setPosition({ x: initialX, y: initialY });
        hasStarted.current = false;
        setIsLoadingLevel(false);
    }, [chapterData, isLoadingChapter, activeView]);

    const handleOverlayCloseComplete = useCallback(() => {
        const { view: targetView, focus } = nextViewAfterOverlayRef.current;
        console.log(`MainMenu: OverlayCloseComplete. Setting up for view '${targetView}'. Focus:`, focus);
        let finalChapterId = focus.chapterId || currentChapterId;
        let finalZoneId = focus.zoneId || currentZoneId;
        if (targetView === 'zone' && focus.chapterIdForInitialZoneFocus) {
            finalChapterId = focus.chapterIdForInitialZoneFocus;
        }
        if (targetView === 'global' && focus.zoneIdForFocus) {
            finalZoneId = focus.zoneIdForFocus;
        }
        if (focus.chapterId && focus.chapterId !== currentChapterId) {
            setCurrentChapterId(focus.chapterId);
            if (focus.chapterId !== currentChapterIdFromStore) {
                setCurrentChapterInStore(focus.chapterId);
            }
            if (!focus.zoneId) {
                const newZoneIdForChapter = findZoneIdForChapter(focus.chapterId);
                if (newZoneIdForChapter && newZoneIdForChapter !== finalZoneId) {
                    finalZoneId = newZoneIdForChapter;
                }
            }
        }
        if (finalZoneId && finalZoneId !== currentZoneId) {
            setCurrentZoneId(finalZoneId);
        }
        if (targetView === 'detailed' && !focus.chapterId && !currentChapterId) {
            const defaultChapterId = INITIAL_CHAPTER_ID;
            setCurrentChapterId(defaultChapterId);
            if (currentChapterIdFromStore !== defaultChapterId) setCurrentChapterInStore(defaultChapterId);
            const zoneForDefaultChapter = findZoneIdForChapter(defaultChapterId);
            if (zoneForDefaultChapter && zoneForDefaultChapter !== currentZoneId) {
                setCurrentZoneId(zoneForDefaultChapter);
            }
        }
        else if (targetView === 'zone' && !finalZoneId) {
            const fallbackZoneId = ALL_ZONES_CONFIG[0]?.id || null;
            setCurrentZoneId(fallbackZoneId);
        }
        setActiveView(targetView);
        setTriggerCloseOverlay(false);
        setTriggerOpenOverlay(true);
    }, [currentChapterId, currentZoneId, /* setActiveView, setCurrentChapterId, setCurrentZoneId, */ currentChapterIdFromStore, setCurrentChapterInStore, /* findZoneIdForChapter */]); // setActiveView, setCurrentChapterId, setCurrentZoneId, findZoneIdForChapter убраны для предотвращения циклов, т.к. они сеттеры или чистые функции

    const RaceDisplay = () => { /* ... без изменений ... */ };
    const EnergyDisplay = () => { /* ... без изменений ... */ };

    const handleOverlayOpenComplete = useCallback(() => {
        console.log("MainMenu: OverlayOpenComplete. Transition finished.");
        setTriggerOpenOverlay(false);
        setIsOverlayActive(false);
        if (location.state && (location.state.initialMapView || location.state.focusOnChapterId || location.state.zoneIdForMap)) {
            console.log("MainMenu: OverlayOpenComplete - Clearing location.state as part of transition aftermath:", location.state);
            navigate(location.pathname, { state: {}, replace: true });
        }
    }, [location.pathname, navigate, location.state]);

    const openGlobalMapView = useCallback(() => {
        performViewChange('global', { zoneIdForFocus: currentZoneId, chapterForZoneContext: currentChapterId });
    }, [currentChapterId, currentZoneId, performViewChange]);

    const openZoneMapView = useCallback((selectedZoneId, chapterIdForFocus) => {
        console.log(`MainMenu: openZoneMapView. Target zone ${selectedZoneId}, chapter for focus ${chapterIdForFocus}.`);
        performViewChange('zone', { zoneId: selectedZoneId, chapterId: chapterIdForFocus });
    }, [performViewChange]);

    const openDetailedChapterView = useCallback((selectedChapterId) => {
        console.log(`MainMenu: openDetailedChapterView. Target chapter ${selectedChapterId}.`);
        const zoneIdForChapter = findZoneIdForChapter(selectedChapterId);
        performViewChange('detailed', { chapterId: selectedChapterId, zoneId: zoneIdForChapter });
    }, [performViewChange /*, findZoneIdForChapter */]); // findZoneIdForChapter - чистая функция

    const handleOpenMapSystemClick = useCallback(() => {
        console.log("[MainMenu] Клик на 'Карта Мира' из детального вида. Открываем GlobalMap.");
        openGlobalMapView();
    }, [openGlobalMapView]);

    const handleZoneSelectedOnGlobalMap = useCallback((selectedZoneId, chapterToFocusInZone) => {
        console.log(`[MainMenu] Выбрана зона ${selectedZoneId} на GlobalMap. Глава для фокуса: ${chapterToFocusInZone}. Показываем ZoneMap.`);
        openZoneMapView(selectedZoneId, chapterToFocusInZone);
    }, [openZoneMapView]);

    const handleChapterSelectedOnZoneMap = useCallback((selectedChapterId) => {
        console.log("[MainMenu] Выбрана глава " + selectedChapterId + " из ZoneMap. Показываем детальный вид.");
        openDetailedChapterView(selectedChapterId);
    }, [openDetailedChapterView]);

    const handleReturnToMainFromGlobalMap = useCallback(() => {
        console.log(`[MainMenu] Возврат с GlobalMap на детальный вид главы ${currentChapterId || INITIAL_CHAPTER_ID}.`);
        openDetailedChapterView(currentChapterId || INITIAL_CHAPTER_ID);
    }, [currentChapterId, openDetailedChapterView]);

    const handleGoBackToDetailedViewFromZone = useCallback(() => {
        console.log(`[MainMenu] Возврат с ZoneMap на детальный вид главы ${currentChapterId}.`);
        openDetailedChapterView(currentChapterId);
    }, [currentChapterId, openDetailedChapterView]);

    const handleRewardsChestClick = useCallback(() => {
        console.log("[MainMenu] Переход на экран Наград");
        startScreenTransition(() => navigate('/rewards'));
    }, [navigate, startScreenTransition]);

    const updatePosition = useCallback((dx, dy) => { if (activeView !== 'detailed' || !mapContainerRef.current || !chapterData?.imageWidth || !chapterData?.imageHeight) return; const cw=mapContainerRef.current.offsetWidth; const ch=mapContainerRef.current.offsetHeight; const mw=chapterData.imageWidth; const mh=chapterData.imageHeight; setPosition(prevPos => ({ x: clamp(mapStart.current.x+dx, Math.min(0,cw-mw),0), y: clamp(mapStart.current.y+dy, Math.min(0,ch-mh),0) })); }, [chapterData, activeView]); // Добавил prevPos для setPosition
    const handleMouseDown = useCallback((e) => { if (activeView !== 'detailed' || e.button !== 0) return; setDragging(true); dragStart.current = { x: e.clientX, y: e.clientY }; mapStart.current = { ...position }; if (e.currentTarget) e.currentTarget.style.cursor = 'grabbing'; }, [position, activeView]);
    const handleTouchStart = useCallback((e) => { if (activeView !== 'detailed') return; setDragging(true); dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; mapStart.current = { ...position }; }, [position, activeView]);
    const handleMouseMove = useCallback((e) => { if (activeView !== 'detailed' || !dragging) return; updatePosition(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y); }, [dragging, updatePosition, activeView]);
    const handleTouchMove = useCallback((e) => { if (activeView !== 'detailed' || !dragging) return; updatePosition(e.touches[0].clientX - dragStart.current.x, e.touches[0].clientY - dragStart.current.y); }, [dragging, updatePosition, activeView]);
    const stopDrag = useCallback((e) => { if (activeView !== 'detailed' || !dragging) return; setDragging(false); if (e.currentTarget && e.type === 'mouseup') { e.currentTarget.style.cursor = 'grab'; } }, [dragging, activeView]);

    const handleLevelNodeClick = useCallback((levelUniqueId, e) => {
        if (activeView !== 'detailed' || !chapterData) return;
        e.stopPropagation();
        const currentLevelsArray = chapterData?.levels || [];
        if (!isLevelUnlocked(currentChapterId, levelUniqueId, currentLevelsArray)) {
            alert("Уровень пока заблокирован. Пройдите предыдущие!"); return;
        }
        const levelData = chapterData?.levels?.find(l => l.id === levelUniqueId);
        if (levelData) { setSelectedLevelId(levelUniqueId); setShowLevelPopup(true); }
    }, [chapterData, currentChapterId, isLevelUnlocked, activeView]);

    const handleCloseLevelPopup = useCallback(() => { setShowLevelPopup(false); setSelectedLevelId(null); }, []);

    const handleStartLevelFromDetails = useCallback((levelId, difficulty) => {
        if (activeView !== 'detailed' || !chapterData) return;
        if (!hasStarted.current) {
            hasStarted.current = true;
            setIsLoadingLevel(true);
            setShowLevelPopup(false);
            console.log(`Starting level: Chapter ${currentChapterId}, Level ${levelId}, Difficulty ${difficulty}`);
            onStart(currentChapterId, levelId, difficulty);
        }
    }, [chapterData, onStart, activeView, currentChapterId]);

    const handleFullResetClick = useCallback(() => {
        if (window.confirm('Вы уверены, что хотите сбросить ВЕСЬ прогресс игры? Это действие необратимо!')) {
            resetGame();
            console.log("После сброса:", useGameStore.getState().playerRace, useGameStore.getState().equipped);
            setResetTrigger(prev => prev + 1);
            const targetChapterId = INITIAL_CHAPTER_ID;
            const targetZoneId = findZoneIdForChapter(targetChapterId);
            setCurrentChapterInStore(targetChapterId);
            performViewChange('detailed', { chapterId: targetChapterId, zoneId: targetZoneId });
            setShowLevelPopup(false);
            setSelectedLevelId(null);
            setActivePopup(null);
            if (onChapterNameChange) onChapterNameChange(null); // Сбрасываем имя главы при полном сбросе
        }
    }, [resetGame, performViewChange, setCurrentChapterInStore, /*findZoneIdForChapter,*/ onChapterNameChange]); // findZoneIdForChapter - чистая функция

    const handleBattlePassClick = useCallback(() => { if (activeView === 'detailed') setActivePopup('battlepass'); }, [activeView]);
    
    const handleMailClick = useCallback(() => {
        console.log("handleMailClick called. activeView:", activeView);
        if (activeView === 'detailed') {
            setActivePopup('mail');
            console.log("activePopup set to 'mail'");
        } else {
            console.log("Mail popup not opened because activeView is not 'detailed'.");
        }
    }, [activeView]);
    
    // Обработчик для Сокровищницы из код1 (обновлен)
    const handleTreasureChestClick = useCallback(() => {
        if (activeView === 'detailed') {
            useGameStore.getState().checkAndResetTreasureChestAttempts();
            setTreasureChestState('info'); 
            setActivePopup('treasure_chest'); // Просто 'treasure_chest', без '_main'
        }
    }, [activeView]);;

    // Новые обработчики для Сокровищницы из код1
    const handleStartChestGame = useCallback(() => {
        // Перед началом игры списываем попытку
        consumeChestAttempt(); 
        setTreasureChestState('game');
        // setActivePopup остается 'treasure_chest_main', но внутреннее состояние изменится
    }, [consumeChestAttempt, setTreasureChestState]);

    const handleChestGameEnd = useCallback((rewards) => {
        setLastChestRewards(rewards);
        setTreasureChestState('results');
    }, [setLastChestRewards, setTreasureChestState]);

    const handleCloseTreasureChest = useCallback(() => { // Общая функция закрытия для сокровищницы
        setLastChestRewards(null);
        // setActivePopup(null); // Просто закрываем, возврата к 'info' нет, если не нужно
        // Если нужно возвращаться к инфо-окну после результатов:
        // if (treasureChestState === 'results') {
        //  setTreasureChestState('info');
        // } else {
        //  setActivePopup(null);
        // }
        setActivePopup(null); // Пока просто закрываем
    }, [/* treasureChestState */]);
    
    const handleCloseTreasureChestResults = useCallback(() => {
        setLastChestRewards(null);
        setTreasureChestState('info'); // Возвращаемся к инфо или закрываем совсем
        // Если хотим закрыть совсем после результатов:
        // setActivePopup(null); 
    }, [setLastChestRewards, setTreasureChestState]);

    const handleQuestsClick = useCallback(() => { if (activeView === 'detailed') setActivePopup('tasks'); }, [activeView]);
    const handleExchangeClick = useCallback(() => { if (activeView === 'detailed') setActivePopup('exchange'); }, [activeView]);
    // Заглушка для handleDailyGrindClick, если она используется в JSX, но не определена
    const handleDailyGrindClick = useCallback(() => { 
        if (activeView === 'detailed') {
            // Логика для daily grind, например setActivePopup('daily_grind');
            console.log("Daily Grind clicked - popup to be implemented");
        }
    }, [activeView]);


    const closePopup = useCallback(() => setActivePopup(null), [setActivePopup]);

    const getPopupContent = (popupType) => {
        switch (popupType) {
            case 'treasure_chest_main': // Добавлено из код1
                if (treasureChestState === 'info') {
                    return <TreasureChestInfoPopup onStartChest={handleStartChestGame} onClose={closePopup} />;
                } else if (treasureChestState === 'game') {
                    // return <TreasureChestGamePopup onGameEnd={handleChestGameEnd} />; // Создадим позже
                    return <div>Игровой процесс Сокровищницы (кликалка)... <button onClick={() => handleChestGameEnd({gold: 100, diamonds: 2})}>Завершить (тест)</button></div>;
                } else if (treasureChestState === 'results') {
                    // return <TreasureChestResultsPopup rewards={lastChestRewards} onClose={handleCloseTreasureChestResults} />; // Создадим позже
                    return <div>Результаты: Золото - {lastChestRewards?.gold}, Алмазы - {lastChestRewards?.diamonds} <button onClick={handleCloseTreasureChestResults}>OK</button></div>;
                }
                return null;
            // ... другие ваши case из код2, если они там были (в примере не показаны)
            case 'battlepass':
                return <div>Содержимое Боевого Пропуска... <button onClick={closePopup}>Закрыть</button></div>;
            case 'tasks':
                return <div>Содержимое Заданий... <button onClick={closePopup}>Закрыть</button></div>;
            case 'exchange':
                return <div>Содержимое Обмена... <button onClick={closePopup}>Закрыть</button></div>;
            default:
                return null;
        }
    };

    const getPopupTitle = (popupType) => {
        switch (popupType) {
            case 'treasure_chest_main': // Добавлено из код1
                if (treasureChestState === 'info') return "Руны Древних";
                if (treasureChestState === 'game') return "Открываем Сундук!";
                if (treasureChestState === 'results') return "Ваша Добыча!";
                return "Сокровищница";
            // ... другие ваши case из код2, если они там были
            case 'battlepass':
                return "Боевой Пропуск";
            case 'tasks':
                return "Задания";
            case 'exchange':
                return "Обмен Валют";
            default:
                return "";
        }
    };

    const internalScreenVariants = { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0.1 } } };
    const loadingScreenVariants = { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.3 } }, exit: { opacity: 0, transition: { duration: 0.2 } } };

    const selectedLevelData = activeView === 'detailed' && chapterData?.levels?.find(l => l.id === selectedLevelId);
    const getLevelDisplayStatus = useCallback((level) => {
        if (activeView !== 'detailed' || !chapterData) return 'locked';
        const currentLevelsArray = chapterData.levels || [];
        const unlocked = isLevelUnlocked(currentChapterId, level.id, currentLevelsArray);
        const completionStatus = getLevelCompletionStatus(currentChapterId, level.id);
        let levelStatusClass = 'locked';
        if (unlocked) {
            if (completionStatus?.hard) levelStatusClass = 'completed-hard';
            else if (completionStatus?.normal) levelStatusClass = 'completed-normal';
            else levelStatusClass = 'active';
        }
        return levelStatusClass;
    }, [chapterData, currentChapterId, isLevelUnlocked, getLevelCompletionStatus, activeView]);

    return (
        <motion.div className="main-menu"
            key="mainmenu-screen-container"
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}
        >
            {isOverlayActive && (
                <TransitionOverlay
                    playOpen={triggerOpenOverlay} onOpenComplete={handleOverlayOpenComplete}
                    playClose={triggerCloseOverlay} onCloseComplete={handleOverlayCloseComplete}
                />
            )}

            <AnimatePresence mode="wait">
                {activeView === 'global' && (
                    <motion.div key="global-map-content" {...internalScreenVariants} style={{width: '100%', height: '100%', position: 'absolute', top:0, left:0, zIndex: 1}}>
                        <GlobalMap
                            initialFocusZoneId={currentZoneId}
                            onSelectZone={handleZoneSelectedOnGlobalMap}
                            onGoBack={handleReturnToMainFromGlobalMap}
                            allZonesData={ALL_ZONES_CONFIG}
                            findZoneForChapter={findZoneIdForChapter}
                        />
                    </motion.div>
                )}
                {activeView === 'zone' && (
                    <motion.div key="zone-map-content" {...internalScreenVariants} style={{width: '100%', height: '100%', position: 'absolute', top:0, left:0, zIndex: 1}}>
                        {isLoadingZoneChapters ? (
                            <motion.div key="loading-zone-view" variants={loadingScreenVariants} initial="initial" animate="animate" exit="exit"
                                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--main-bg-color, #1c1f22)', color: 'white' }}>
                                Загрузка карты зоны {currentZoneId}...
                            </motion.div>
                        ) : (
                            <ZoneMap
                                zoneId={currentZoneId}
                                chaptersInZone={chaptersForCurrentZone}
                                chapterToFocus={currentChapterId}
                                goToChapter={handleChapterSelectedOnZoneMap}
                                onGoToGlobalMap={openGlobalMapView}
                                onGoBack={handleGoBackToDetailedViewFromZone}
                                isLevelUnlocked={isLevelUnlocked}
                                getLevelCompletionStatus={getLevelCompletionStatus}
                                isZoneUnlocked={currentZoneId ? isZoneUnlocked(currentZoneId) : false}
                                currentChapterId={currentChapterId}
                            />
                        )}
                    </motion.div>
                )}
                {activeView === 'detailed' && (
                    <motion.div key="detailed-chapter-content" {...internalScreenVariants} style={{width: '100%', height: '100%', zIndex: 1, position: 'relative', }}>
                        {isLoadingChapter || !chapterData ? (
                            <motion.div key="loading-chapter-view" variants={loadingScreenVariants} initial="initial" animate="animate" exit="exit"
                                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 0, left: 0, background: 'var(--main-bg-color, #282c34)', zIndex: 10 }}>
                                <div className="level-loading-overlay" style={{ position: 'static', background: 'transparent', color: 'white' }}>
                                    <div className="loading-spinner"></div>
                                    <div className="loading-text">Загрузка главы {currentChapterId || INITIAL_CHAPTER_ID}...</div>
                                </div>
                            </motion.div>
                        ) : (
                            <>
                                <div className="chapter-view-container" ref={mapContainerRef} style={{overflow: 'hidden', width: '100%', height: '100%', position: 'relative', background: chapterData.backgroundColor || 'transparent' }}>
                                    <div
                                        className={`chapter-map-content ${dragging ? 'dragging' : ''}`}
                                        style={{
                                            backgroundImage: `url(${chapterData.image})`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'center center',
                                            backgroundSize: chapterData.backgroundSize || 'cover',
                                            width: `${chapterData.imageWidth}px`,
                                            height: `${chapterData.imageHeight}px`,
                                            transform: `translate(${position.x}px, ${position.y}px)`,
                                            transition: dragging ? 'none' : 'transform 0.1s ease-out',
                                            cursor: dragging ? 'grabbing' : 'grab',
                                            position: 'relative'
                                        }}
                                        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={stopDrag}
                                        onMouseLeave={stopDrag} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
                                        onTouchEnd={stopDrag}
                                    >
                                        <svg className="chapter-level-svg-connections" width={chapterData.imageWidth} height={chapterData.imageHeight} xmlns="http://www.w3.org/2000/svg" style={{position: 'absolute', top:0, left: 0, pointerEvents: 'none'}}>
                                            {chapterData.levels?.map((level) => {
                                                return level.unlocks?.map(nextLevelId => {
                                                    const nextLevel = chapterData.levels.find(nl => nl.id === nextLevelId);
                                                    if (!nextLevel) return null;
                                                    const nodeSize = level.nodeSize || 40; const nextNodeSize = nextLevel.nodeSize || 40;
                                                    const x1=level.x+nodeSize/2; const y1=level.y+nodeSize/2; const x2=nextLevel.x+nextNodeSize/2; const y2=nextLevel.y+nextNodeSize/2;
                                                    const dx = x2 - x1; const dy = y2 - y1; const midpointX = x1 + dx * 0.5; const midpointY = y1 + dy * 0.5;
                                                    const curveOffset = level.pathCurveOffset !== undefined ? level.pathCurveOffset : Math.min(Math.max(15,Math.abs(dx)*0.1 + Math.abs(dy)*0.1), Math.sqrt(dx*dx + dy*dy) * 0.2);
                                                    const angle = Math.atan2(dy, dx) - Math.PI / 2;
                                                    const controlX = midpointX + curveOffset * Math.cos(angle); const controlY = midpointY + curveOffset * Math.sin(angle);
                                                    const d = `M ${x1} ${y1} Q ${controlX} ${controlY}, ${x2} ${y2}`;
                                                    const currentLevelStatus = getLevelDisplayStatus(level);
                                                    const nextLevelStatus = getLevelDisplayStatus(nextLevel);
                                                    const isPathActive = (currentLevelStatus === 'completed-normal' || currentLevelStatus === 'completed-hard' || currentLevelStatus === 'active') && nextLevelStatus !== 'locked';
                                                    return ( <path key={`path-${level.id}-to-${nextLevel.id}`} d={d} className={`level-connection-path ${isPathActive ? 'active' : ''}`} /> );
                                                });
                                            })}
                                        </svg>
                                        {chapterData.levels?.map((level) => {
                                            const levelStatusClass = getLevelDisplayStatus(level);
                                            const levelNumberInChapter = level.number !== undefined ? level.number : (level.id % 100);
                                            return (
                                                <div key={level.id} className={`level-node ${levelStatusClass}`}
                                                    style={{ position: 'absolute', left: `${level.x}px`, top: `${level.y}px`, width: `${level.nodeSize || 40}px`, height: `${level.nodeSize || 40}px` }}
                                                    onClick={(e) => { handleLevelNodeClick(level.id, e); }}
                                                    title={level.name || `Уровень ${levelNumberInChapter}`}
                                                >
                                                    {level.icon ? <img src={`${level.icon}`} alt="" className="level-node-icon" /> : levelNumberInChapter}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {/* ЭТОТ H2 БОЛЬШЕ НЕ НУЖЕН ЗДЕСЬ, ЕСЛИ ИМЯ ОТОБРАЖАЕТСЯ В GameHeader
                                <h2 className="chapter-name">
                                    {chapterData.name}
                                </h2>
                                */}
                                <div className="main-menu-left-column">
                                    <button className="main-menu-button icon-button mail-button" onClick={handleMailClick} title="Почта"><img src="/assets/icons/mail-icon.png" alt="Почта" /></button>
                                    <button className={`main-menu-button icon-button rewards-chest-button ${hasClaimableRewardsIndicator ? 'has-indicator' : ''}`} onClick={handleRewardsChestClick} title="Награды" >
                                        <img src="/assets/icons/gift-icon.png" alt="Награды" />
                                    </button>
                                    {/* Добавление кнопки сокровищницы, если она должна быть здесь */}
                                    {/* <button className="main-menu-button icon-button treasure-chest-button" onClick={handleTreasureChestClick} title="Сокровищница"><img src="/assets/icons/treasure-chest-icon.png" alt="Сокровищница" /></button> */}
                                    <button className="main-menu-button icon-button" onClick={handleTreasureChestClick} title="Руны Древних">
                                       <img src="/assets/icons/runes-icon.png" alt="Руны" /> {/* Замените на актуальную иконку */}
                                    </button>                                </div>
                                <div className="main-menu-right-column">
                                    <button className="main-menu-button icon-button world-map-button" onClick={handleOpenMapSystemClick} title="Карта Мира">
                                        <img src="/assets/icons/map-icon.png" alt="Карта Мира" />
                                    </button>
                                    <button className="main-menu-button icon-button quests-button" onClick={handleQuestsClick} title="Задания"><img src="/assets/icons/quests-icon.png" alt="Задания" /></button>
                                    <button className="main-menu-button icon-button exchange-button" onClick={handleExchangeClick} title="Обмен"><img src="/assets/icons/exchange-icon.png" alt="Обмен" /></button>
                                    {/* Кнопка для вызова попапа сокровищницы (если нужна отдельная кнопка) */}
                                    {/* Если сокровищница - это другой тип "сундука", можно создать отдельную кнопку. Если это тот же, что и "Награды", то не нужно. */}
                                    {/* По код1, handleTreasureChestClick - это отдельная логика */}
                                    {/* Предположим, нужна отдельная кнопка: */}
                                </div>
                                <AnimatePresence>
                                    {showLevelPopup && selectedLevelData && (
                                        <LevelDetailsPopup key="levelDetailsPopup" ref={levelDetailsPopupRef} level={selectedLevelData} chapterId={currentChapterId}
                                            completionStatus={getLevelCompletionStatus(currentChapterId, selectedLevelData.id)}
                                            isHardUnlocked={isHardModeUnlocked(currentChapterId, selectedLevelData.id)}
                                            onClose={handleCloseLevelPopup} onStartLevel={handleStartLevelFromDetails} />
                                    )}
                                </AnimatePresence>
                                {isLoadingLevel && ( <div className="level-loading-overlay" style={{position: 'absolute', top:0, left:0, width:'100%', height:'100%', background: 'rgba(0,0,0,0.7)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex: 20}}><div className="loading-spinner"></div><div className="loading-text" style={{color:'white'}}>Загрузка уровня...</div></div> )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
 {/* === НАЧАЛО ИЗМЕНЕНИЙ: Логика отображения попапов === */}
 <AnimatePresence>
                {/* Попап Почты (кастомный) */}
                {activeView === 'detailed' && activePopup === 'mail' && (
                    <motion.div
                        key="mail-popup-overlay"
                        className="popup-overlay-for-mail" // Стили для оверлея почты
                        variants={mailOverlayVariants}
                        initial="hidden" animate="visible" exit="exit"
                        onClick={closePopup} 
                    >
                        <motion.div
                            className="mail-popup-outer-frame" // Стили для рамки почты
                            variants={mailPopupFrameVariants}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Содержимое попапа почты, включая его заголовок-баннер и кнопку закрытия */}
                            <div className="mail-title-banner">Почта</div>
                            <div className="mail-main-content-body">
                                <button onClick={closePopup} className="mail-interface-close-button" aria-label="Закрыть почту">&times;</button>
                                <MailPopupContent onCloseRequest={closePopup} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* КАСТОМНЫЙ ПОПАП "СОКРОВИЩНИЦА" */}
    {activeView === 'detailed' && activePopup === 'treasure_chest' && (
        <motion.div
            key="treasure-chest-overlay"
            // === ИСПОЛЬЗУЕМ НОВЫЕ КЛАССЫ ДЛЯ СОКРОВИЩНИЦЫ ===
            className="treasure-chest-backdrop"  // Этот класс будет в TreasureChestInfoPopup.scss
            variants={mailOverlayVariants}       // Анимацию можно оставить ту же или сделать свою
            initial="hidden" animate="visible" exit="exit"
            onClick={handleCloseTreasureChest}   // Своя функция закрытия
        >
            <motion.div
                // === ИСПОЛЬЗУЕМ НОВЫЕ КЛАССЫ ДЛЯ СОКРОВИЩНИЦЫ ===
                className="treasure-chest-popup-box" // Этот класс будет в TreasureChestInfoPopup.scss
                variants={mailPopupFrameVariants}    // Анимацию можно оставить ту же или сделать свою
                onClick={(e) => e.stopPropagation()}
            >
                {/* Заголовок-баннер для Сокровищницы (часть .treasure-chest-popup-box) */}
                <div className="treasure-chest-title-banner">
                {treasureChestState === 'info' && "Древние Руны"}
                {treasureChestState === 'game' && "Активация Руны!"}
                {treasureChestState === 'results' && "Итоги Активации"}
            </div>
            
            <button onClick={handleCloseTreasureChest} className="treasure-chest-close-button">&times;</button>
            
            {/* AnimatePresence для ВНУТРЕННЕГО контента попапа */}
            <AnimatePresence mode="wait"> {/* mode="wait" дождется окончания exit анимации перед тем как показать новый */}
            {treasureChestState === 'info' && (
                                    <motion.div
                                        key="treasure-info-content" // Уникальный ключ
                                        className="popup-content-area-for-treasure" // Общий класс для области контента
                                        variants={popupContentVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                    >
                                        <TreasureChestInfoPopup 
                                            onStartChest={handleStartChestGame} 
                                        />
                    </motion.div>
                )}
                {treasureChestState === 'game' && (
                    <motion.div
                        key="runes-game" // Уникальный ключ
                        variants={popupContentVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="popup-content-area-wrapper"
                    >
                        <ShardboundRunesGamePopup onGameEnd={handleChestGameEnd} />
                    </motion.div>
                )}
                {treasureChestState === 'results' && lastChestRewards && (
                    <motion.div
                        key="runes-results" // Уникальный ключ
                        variants={popupContentVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="popup-content-area-wrapper"
                    >
                        <ShardboundRunesResultsPopup 
                            rewards={lastChestRewards} 
                            onClose={handleCloseTreasureChest} 
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>

                {/* Содержимое в зависимости от состояния Сокровищницы */}
                {treasureChestState === 'info' && (
                    // TreasureChestInfoPopup теперь НЕ должен иметь свой корневой div 
                    // с классом .treasure-chest-info-content, если этот класс уже
                    // является частью .treasure-chest-popup-box или его дочерним элементом
                    // для основного контента.
                    // Правильнее, если TreasureChestInfoPopup возвращает только ВНУТРЕННЕЕ содержимое.
                    <TreasureChestInfoPopup 
                        onStartChest={handleStartChestGame} 
                    />
                )}
                {/* ОБЩИЙ КОМПОНЕНТ POPUP ДЛЯ ОСТАЛЬНЫХ ТИПОВ (ЗАДАНИЯ, ОБМЕН, БАТЛПАСС-ПОПАП) */}
                {activeView === 'detailed' && 
                 activePopup && 
                 activePopup !== 'mail' &&
                 activePopup !== 'treasure_chest' && // <--- УБЕДИТЕСЬ, ЧТО 'treasure_chest' ЗДЕСЬ ИСКЛЮЧЕН
                 activePopup !== 'rewards' && // 'rewards' обрабатывается переходом на другой экран/компонент
                 (
                    <motion.div 
                        key={activePopup} // Используем activePopup как ключ для корректной анимации смены попапов
                        // Анимации и стили из вашего код2 для общих попапов:
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20, transition: {duration: 0.2} }}
                        style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.5)'}}
                        onClick={closePopup} // Закрытие по клику на оверлей
                    >
                        <Popup // Ваш ОБЩИЙ компонент Popup.jsx
                            title={getPopupTitle(activePopup)} // getPopupTitle ТЕПЕРЬ НЕ ДОЛЖЕН ОБРАБАТЫВАТЬ 'treasure_chest'
                            onClose={closePopup}
                            // bannerStyle={activePopup === 'treasure_chest_main' && treasureChestState === 'info'} // Этот prop больше не нужен здесь, т.к. сокровищница кастомная
                        >
                            {getPopupContent(activePopup)} {/* getPopupContent ТЕПЕРЬ НЕ ДОЛЖЕН ОБРАБАТЫВАТЬ 'treasure_chest' */}
                        </Popup>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* === КОНЕЦ ИЗМЕНЕНИЙ === */} 

            {!isOverlayActive && (
                <button className="reset-button" onClick={handleFullResetClick} title="Сбросить весь игровой прогресс" >
                    Сброс
                </button>
            )}
        </motion.div>
    );
}

export default MainMenu;