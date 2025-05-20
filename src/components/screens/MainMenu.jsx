import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../store/useGameStore.js';
import ZoneMap from "../ZoneMap.jsx";
import GlobalMap from "../GlobalMap.jsx";
import TransitionOverlay from "../TransitionOverlay.jsx";
import Popup from '../popups/Popup.jsx';
import "./MainMenu.scss";
import { useNavigate, useLocation } from 'react-router-dom';
import LevelDetailsPopup from '../popups/LevelDetailsPopup.jsx';
import ShardboundRunesGamePopup from '../popups/ShardboundRunesGamePopup.jsx';
import ShardboundRunesResultsPopup from '../popups/ShardboundRunesResultsPopup.jsx';

import { ALL_ZONES_CONFIG, findZoneIdForChapter } from '../../data/worldMapData.js';
import MailPopupContent from '../popups/MailPopupContent.jsx';
import TreasureChestInfoPopup from '../popups/TreasureChestInfoPopup.jsx';
import TasksPopup from '../popups/TasksPopup.jsx'; // Импорт TasksPopup
import TonExchangePopup from '../popups/TonExchangePopup.jsx'; // <--- ДОБАВЬТЕ ЭТОТ ИМПОРТ

// Иконка для ShardPass (пример, если есть)
// import shardPassIcon from '/assets/icons/shardpass-icon.png';

const popupContentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2, ease: "easeIn" } }
};

const mailOverlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2, ease: "easeInOut" } },
    exit: { opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } }
};

const mailPopupFrameVariants = {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25, duration: 0.3 } },
    exit: { opacity: 0, scale: 0.85, transition: { type: "tween", ease: "easeIn", duration: 0.2 } }
};

const INITIAL_CHAPTER_ID = 1;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
const chapterDataModules = import.meta.glob('../../data/zones/*/chapter*Data.js');
const zoneDataModules = import.meta.glob('../../data/zones/*/zoneData.js');


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
        startScreenTransition, // Убедимся, что он есть (был и в код2)
        ensureScreenIsOpening,
        isZoneUnlocked,
        treasureChestAttempts,
        useTreasureChestAttempt: consumeChestAttempt,
    } = useGameStore(state => ({
        currentChapterIdFromStore: state.currentChapterId,
        setCurrentChapterInStore: state.setCurrentChapter,
        isLevelUnlocked: state.isLevelUnlocked,
        getLevelCompletionStatus: state.getLevelCompletionStatus,
        isHardModeUnlocked: state.isHardModeUnlocked,
        resetGame: state.resetGame,
        hasClaimableRewardsIndicator: state.hasClaimableRewardsIndicator,
        setIsFullScreenMapActive: state.setIsFullScreenMapActive,
        startScreenTransition: state.startScreenTransition, // Важно для перехода (был и в код2)
        ensureScreenIsOpening: state.ensureScreenIsOpening,
        isZoneUnlocked: state.isZoneUnlocked,
        treasureChestAttempts: state.treasureChestAttempts,
        useTreasureChestAttempt: state.useTreasureChestAttempt,
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
    const [activePopup, setActivePopup] = useState(null);

    const [treasureChestState, setTreasureChestState] = useState('info');
    const [lastChestRewards, setLastChestRewards] = useState(null);

    const mapContainerRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const mapStart = useRef({ x: 0, y: 0 });
    const hasStarted = useRef(false);
    const levelDetailsPopupRef = useRef(null);
    const [resetTrigger, setResetTrigger] = useState(0);

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
        if (activeView !== 'detailed' && onChapterNameChange) {
            onChapterNameChange(null);
        }
        setIsFullScreenMapActive(activeView === 'zone' || activeView === 'global');
    }, [activeView, setIsFullScreenMapActive, onChapterNameChange]);

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
                if (isMounted && onChapterNameChange) onChapterNameChange(null);
                return;
            }
            const zoneIdForPath = findZoneIdForChapter(chapterIdToLoad);

            if (!zoneIdForPath) {
                if (isMounted) {
                    console.error(`[MainMenu] Не удалось определить зону для главы ${chapterIdToLoad}. Загрузка отменена.`);
                    if (onChapterNameChange) onChapterNameChange(null);
                    setIsLoadingChapter(false);
                }
                return;
            }

            console.log(`[MainMenu] Attempting to load CHAPTER data for chapter ${chapterIdToLoad} in zone ${zoneIdForPath}...`);
            setIsLoadingChapter(true);
            setChapterData(null);
            if (onChapterNameChange) onChapterNameChange(null);
            setPosition({ x: 0, y: 0 });

            try {
                const modulePath = `../../data/zones/${zoneIdForPath}/chapter${chapterIdToLoad}Data.js`;

                if (chapterDataModules[modulePath]) {
                    const chapterModule = await chapterDataModules[modulePath]();
                    if (isMounted) {
                        if (chapterModule.default && typeof chapterModule.default.id === 'number') {
                            setChapterData(chapterModule.default);
                            if (onChapterNameChange) {
                                onChapterNameChange(chapterModule.default.name);
                            }
                            console.log("[MainMenu] Successfully loaded CHAPTER data:", chapterModule.default);
                        } else {
                            if (onChapterNameChange) onChapterNameChange(null);
                            throw new Error(`Invalid chapter data structure or missing ID in ${modulePath}`);
                        }
                    }
                } else {
                    if (isMounted && onChapterNameChange) onChapterNameChange(null);
                    console.error(`[MainMenu] Module not found for key: ${modulePath}`);
                    console.log('[MainMenu] Available module keys from glob:', Object.keys(chapterDataModules));
                    throw new Error(`Module for chapter ${chapterIdToLoad} in zone ${zoneIdForPath} not found. Path: ${modulePath}`);
                }
            } catch (error) {
                if (isMounted) {
                    if (onChapterNameChange) onChapterNameChange(null);
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
            if (onChapterNameChange) onChapterNameChange(null);
        } else if (activeView !== 'detailed') {
            if (onChapterNameChange) onChapterNameChange(null);
        }

        return () => { isMounted = false; };
    }, [currentChapterId, activeView, setCurrentChapterInStore, currentChapterIdFromStore, onChapterNameChange, resetTrigger]);

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
    }, [currentChapterId, currentZoneId, currentChapterIdFromStore, setCurrentChapterInStore]);

    const RaceDisplay = () => { /* ... без изменений ... */ return null; };
    const EnergyDisplay = () => { /* ... без изменений ... */ return null; };

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
    }, [performViewChange]);

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

    const updatePosition = useCallback((dx, dy) => { if (activeView !== 'detailed' || !mapContainerRef.current || !chapterData?.imageWidth || !chapterData?.imageHeight) return; const cw=mapContainerRef.current.offsetWidth; const ch=mapContainerRef.current.offsetHeight; const mw=chapterData.imageWidth; const mh=chapterData.imageHeight; setPosition(prevPos => ({ x: clamp(mapStart.current.x+dx, Math.min(0,cw-mw),0), y: clamp(mapStart.current.y+dy, Math.min(0,ch-mh),0) })); }, [chapterData, activeView]);
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
            if (onChapterNameChange) onChapterNameChange(null);
        }
    }, [resetGame, performViewChange, setCurrentChapterInStore, onChapterNameChange]);

    // Удаляем handleBattlePassClick, так как кнопка теперь ведет на отдельный экран
    // const handleBattlePassClick = useCallback(() => { if (activeView === 'detailed') setActivePopup('battlepass'); }, [activeView]);

    // ОБРАБОТЧИК ДЛЯ НОВОЙ КНОПКИ SHARDPASS
    const handleShardPassButtonClick = useCallback(() => {
        console.log("ShardPass button clicked, navigating to /shardpass");
        // Используем startScreenTransition для анимации перехода
        startScreenTransition(() => navigate('/shardpass'));
    }, [navigate, startScreenTransition]);

    const handleMailClick = useCallback(() => {
        console.log("handleMailClick called. activeView:", activeView);
        if (activeView === 'detailed') {
            setActivePopup('mail');
            console.log("activePopup set to 'mail'");
        } else {
            console.log("Mail popup not opened because activeView is not 'detailed'.");
        }
    }, [activeView]);

    const handleTreasureChestClick = useCallback(() => {
        if (activeView === 'detailed') {
            useGameStore.getState().checkAndResetTreasureChestAttempts();
            setTreasureChestState('info');
            setActivePopup('treasure_chest');
        }
    }, [activeView]);

    const handleStartChestGame = useCallback(() => {
        consumeChestAttempt();
        setTreasureChestState('game');
    }, [consumeChestAttempt]);

    const handleChestGameEnd = useCallback((rewards) => {
        setLastChestRewards(rewards);
        setTreasureChestState('results');
    }, []);

    const handleCloseTreasureChest = useCallback(() => {
        setLastChestRewards(null);
        setActivePopup(null);
    }, []);

    const handleQuestsClick = useCallback(() => { if (activeView === 'detailed') setActivePopup('tasks'); }, [activeView]);
    const handleExchangeClick = useCallback(() => {
        console.log("[MainMenu] handleExchangeClick вызван. Текущий activeView:", activeView);
        if (activeView === 'detailed') {
            setActivePopup('exchange');
            console.log("[MainMenu] setActivePopup('exchange') был вызван. activePopup должен стать 'exchange'.");
        } else {
            console.log("[MainMenu] Поп-ап обмена не открыт, т.к. activeView не 'detailed'.");
        }
    }, [activeView, setActivePopup]);
    const handleDailyGrindClick = useCallback(() => {
        if (activeView === 'detailed') {
            console.log("Daily Grind clicked - popup to be implemented");
        }
    }, [activeView]);

    const closePopup = useCallback(() => setActivePopup(null), []);

    useEffect(() => {
        console.log("[MainMenu] Состояние activePopup изменилось на:", activePopup);
    }, [activePopup]);

    // Удаляем 'battlepass' из getPopupContent, так как теперь это отдельный экран
    const getPopupContent = (popupType) => {
        switch (popupType) {
            // case 'battlepass': // Больше не нужен здесь
            //     return <div>Содержимое Боевого Пропуска... <button onClick={closePopup}>Закрыть</button></div>;
            // case 'tasks': // TasksPopup теперь обрабатывается отдельно
            //     return <TasksPopup onClose={closePopup} />;
            default:
                // Можно оставить для других общих попапов, если они будут
                return <div>Неизвестный тип попапа: {popupType}</div>;
        }
    };

    // Удаляем 'battlepass' из getPopupTitle, так как теперь это отдельный экран
    const getPopupTitle = (popupType) => {
        switch (popupType) {
            // case 'battlepass': // Больше не нужен здесь
            //     return "Боевой Пропуск";
            case 'tasks':
                return "Задания";
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

                                {/* --- Существующие боковые колонки с кнопками --- */}
                                <div className="main-menu-left-column">
                                    <button className="main-menu-button icon-button mail-button" onClick={handleMailClick} title="Почта"><img src="/assets/icons/mail-icon.png" alt="Почта" /></button>
                                    <button className={`main-menu-button icon-button rewards-chest-button ${hasClaimableRewardsIndicator ? 'has-indicator' : ''}`} onClick={handleRewardsChestClick} title="Награды" >
                                        <img src="/assets/icons/gift-icon.png" alt="Награды" />
                                    </button>
                                    <button className="main-menu-button icon-button" onClick={handleTreasureChestClick} title="Руны Древних">
                                        <img src="/assets/icons/runes-icon.png" alt="Руны" />
                                    </button>
                                </div>
                                <div className="main-menu-right-column">
                                    <button className="main-menu-button icon-button world-map-button" onClick={handleOpenMapSystemClick} title="Карта Мира">
                                        <img src="/assets/icons/map-icon.png" alt="Карта Мира" />
                                    </button>
                                    <button className="main-menu-button icon-button quests-button" onClick={handleQuestsClick} title="Задания"><img src="/assets/icons/quests-icon.png" alt="Задания" /></button>
                                    <button className="main-menu-button icon-button exchange-button" onClick={handleExchangeClick} title="Обмен"><img src="/assets/icons/exchange-icon.png" alt="Обмен" /></button>
                                </div>

                                {/* ▼▼▼ НОВАЯ КНОПКА SHARDPASS (BATTLE PASS) ▼▼▼ */}
                                <button
                                    className="mainmenu-shardpass-button" // Новый класс для стилей
                                    onClick={handleShardPassButtonClick}
                                    title="ShardPass"
                                >
                                    {/* <img src={shardPassIcon} alt="" />  // Если есть иконка */}
                                    ShardPass
                                </button>
                                {/* ▲▲▲ КОНЕЦ НОВОЙ КНОПКИ SHARDPASS ▲▲▲ */}


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

            {/* === Логика отображения попапов === */}
            <AnimatePresence>
                {/* Попап Почты (кастомный) */}
                {activeView === 'detailed' && activePopup === 'mail' && (
                    <motion.div
                        key="mail-popup-overlay"
                        className="popup-overlay-for-mail"
                        variants={mailOverlayVariants}
                        initial="hidden" animate="visible" exit="exit"
                        onClick={closePopup}
                    >
                        <motion.div
                            className="mail-popup-outer-frame"
                            variants={mailPopupFrameVariants}
                            onClick={(e) => e.stopPropagation()}
                        >
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
                        className="treasure-chest-backdrop"
                        variants={mailOverlayVariants}
                        initial="hidden" animate="visible" exit="exit"
                        onClick={handleCloseTreasureChest}
                    >
                        <motion.div
                            className="treasure-chest-popup-box"
                            variants={mailPopupFrameVariants}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="treasure-chest-title-banner">
                                {treasureChestState === 'info' && "Древние Руны"}
                                {treasureChestState === 'game' && "Активация Руны!"}
                                {treasureChestState === 'results' && "Итоги Активации"}
                            </div>
                            <button onClick={handleCloseTreasureChest} className="treasure-chest-close-button">&times;</button>
                            <AnimatePresence mode="wait">
                                {treasureChestState === 'info' && (
                                    <motion.div
                                        key="treasure-info-content"
                                        className="popup-content-area-for-treasure" // Убедитесь, что этот класс имеет нужные отступы
                                        variants={popupContentVariants}
                                        initial="initial" animate="animate" exit="exit"
                                    >
                                        <TreasureChestInfoPopup onStartChest={handleStartChestGame} />
                                    </motion.div>
                                )}
                                {treasureChestState === 'game' && (
                                    <motion.div
                                        key="runes-game"
                                        variants={popupContentVariants} initial="initial" animate="animate" exit="exit"
                                        className="popup-content-area-wrapper" // Убедитесь, что этот класс имеет нужные отступы
                                    >
                                        {/* Замените на ваш компонент игры */}
                                        <ShardboundRunesGamePopup onGameEnd={handleChestGameEnd} />
                                    </motion.div>
                                )}
                                {treasureChestState === 'results' && lastChestRewards && (
                                    <motion.div
                                        key="runes-results"
                                        variants={popupContentVariants} initial="initial" animate="animate" exit="exit"
                                        className="popup-content-area-wrapper" // Убедитесь, что этот класс имеет нужные отступы
                                    >
                                        {/* Замените на ваш компонент результатов */}
                                        <ShardboundRunesResultsPopup rewards={lastChestRewards} onClose={handleCloseTreasureChest} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}

                {activeView === 'detailed' && activePopup === 'tasks' && (
                    <motion.div
                        key="tasks-popup-overlay"
                        className="tasks-popup-backdrop" // Фон
                        variants={mailOverlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={closePopup} // Закрытие по клику на фон
                    >
                        <motion.div
                            className="tasks-popup-box" // Основной контейнер попапа (с фиксированной высотой 380px)
                            variants={mailPopupFrameVariants}
                            onClick={(e) => e.stopPropagation()} // Предотвратить закрытие при клике внутри окна
                        >
                            {/* Заголовок-баннер для Заданий */}
                            <div className="tasks-title-banner">
                                {getPopupTitle('tasks')}
                            </div>

                            {/* Кнопка закрытия */}
                            <button
                                onClick={closePopup}
                                className="tasks-close-button"
                                aria-label="Закрыть задания"
                            >
                                &times;
                            </button>

                            {/* Контейнер для контента TasksPopup, обеспечивающий отступ от баннера */}
                            <div className="tasks-inner-scroll-container">
                                {/* motion.div для анимации содержимого TasksPopup */}
                                {/* Важно: этот div должен быть flex-контейнером, чтобы TasksPopup мог расти */}
                                <motion.div
                                    key="tasks-popup-motion-wrapper"
                                    style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, width: '100%' }}
                                    variants={popupContentVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                >
                                    <TasksPopup onClose={closePopup} />
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                {/* ========== КОНЕЦ: КАСТОМНЫЙ ПОПАП "ЗАДАНИЯ" ========== */}
                {/* ▼▼▼ КАСТОМНЫЙ ПОПАП "ОБМЕН TON" (Структура как для других кастомных) ▼▼▼ */}
                {activeView === 'detailed' && activePopup === 'exchange' && (
                    <motion.div
                        key="ton-exchange-popup-overlay"
                        className="ton-exchange-popup-backdrop" // Общий класс для фона затемнения
                        variants={mailOverlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={closePopup} // Закрытие по клику на фон
                    >
                        {/* ▼▼▼ НОВАЯ ОБЕРТКА для позиционирования баннера и основного блока ▼▼▼ */}
                        <div
                            className="ton-exchange-popup-container-for-header-and-box"
                            onClick={(e) => e.stopPropagation()} // Предотвратить закрытие при клике на этот контейнер
                        >
                            {/* 1. ОТДЕЛЬНЫЙ "НАВИСАЮЩИЙ" БАННЕР "Биржа TON" */}
                            <div className="ton-exchange-floating-header">
                                TONCHANGE
                            </div>

                            {/* 2. ОСНОВНОЙ БЛОК ПОПАПА (с градиентом, отступами и табами внутри) */}
                            <motion.div
                                className="ton-exchange-popup-main-box" // Основное видимое окно
                                variants={mailPopupFrameVariants} // Анимации для этого блока
                            >
                                <TonExchangePopup onClose={closePopup} />
                            </motion.div>
                        </div>
                    </motion.div>
                )}
                {/* ▲▲▲ КОНЕЦ: КАСТОМНЫЙ ПОПАП "ОБМЕН TON" ▲▲▲ */}


            </AnimatePresence>

            <AnimatePresence>
                {activeView === 'detailed' &&
                    activePopup &&
                    activePopup !== 'exchange' &&
                    activePopup !== 'mail' &&
                    activePopup !== 'treasure_chest' &&
                    activePopup !== 'tasks' && // 'tasks' теперь исключен
                    activePopup !== 'rewards' && // 'rewards' также кастомный, здесь не обрабатывается
                    activePopup !== 'battlepass' && // Battlepass/Shardpass теперь отдельный экран
                    (
                        <motion.div
                            key={activePopup} // Ключ по типу попапа
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20, transition: {duration: 0.2} }}
                            style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.5)'}}
                            onClick={closePopup} // Закрытие по клику на оверлей
                        >
                            {/* Используем общий Popup для остальных */}
                            <Popup
                                title={getPopupTitle(activePopup)}
                                onClose={closePopup}
                            >
                                {getPopupContent(activePopup)}
                            </Popup>
                        </motion.div>
                    )}
            </AnimatePresence>

            {!isOverlayActive && (
                <button className="reset-button" onClick={handleFullResetClick} title="Сбросить весь игровой прогресс" >
                    Сброс
                </button>
            )}
        </motion.div>
    );
}

export default MainMenu;