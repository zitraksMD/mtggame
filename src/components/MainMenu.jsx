// src/components/MainMenu.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from "../store/useGameStore";
import ZoneMap from "./ZoneMap"; // В код2 это WorldMap, отображающий главы зоны. Переименован для соответствия с код1.
import GlobalMap from "./GlobalMap";
import TransitionOverlay from "./TransitionOverlay"; // <<< ИЗ КОД1
import Popup from './Popup';
import "./MainMenu.scss";
import { useNavigate, useLocation } from 'react-router-dom';
import LevelDetailsPopup from './LevelDetailsPopup';

// Импорт из код1, используется в код2 (findZoneIdForChapter вместо findZoneForChapter)
import { ALL_ZONES_CONFIG, findZoneIdForChapter } from '../data/worldMapData.js';


const INITIAL_CHAPTER_ID = 1;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const MainMenu = ({ onStart }) => {
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
    }));

    const [activeView, setActiveView] = useState('detailed'); 

    const [currentChapterId, setCurrentChapterId] = useState(
        location.state?.focusOnChapterId || currentChapterIdFromStore || INITIAL_CHAPTER_ID
    );

    // currentZoneId управляет текущей активной зоной (логика из КОД1)
    const [currentZoneId, setCurrentZoneId] = useState(() => {
        const initialChapterZoneId = findZoneIdForChapter(currentChapterId); // Используем findZoneIdForChapter
        // findZoneIdForChapter возвращает ID зоны (строку) или null.
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
    const mapContainerRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const mapStart = useRef({ x: 0, y: 0 });
    const hasStarted = useRef(false);
    const levelDetailsPopupRef = useRef(null);

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
        setIsFullScreenMapActive(activeView === 'zone' || activeView === 'global');
    }, [activeView, setIsFullScreenMapActive]);

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
        
        // Используем findZoneIdForChapter, который возвращает ID или null
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
    }, [location.state, navigate, activeView, isOverlayActive, triggerCloseOverlay, triggerOpenOverlay, currentChapterId, currentChapterIdFromStore, setCurrentChapterInStore, currentZoneId /* performViewChange */]);

    useEffect(() => {
        let isMounted = true;
        const loadChapter = async (chapterIdToLoad) => {
            if (!isMounted || !chapterIdToLoad) return;

            // Получаем ID зоны (имя папки) для данной главы
            const zoneIdForPath = findZoneIdForChapter(chapterIdToLoad);

            if (!zoneIdForPath) {
                if (isMounted) {
                    console.error(`[MainMenu] Не удалось определить зону для главы ${chapterIdToLoad}. Загрузка отменена.`);
                    alert(`Критическая ошибка: не удалось определить зону для главы ${chapterIdToLoad}.`);
                    // Возможно, стоит сбросить состояние загрузки или перенаправить на начальную главу,
                    // если это не INITIAL_CHAPTER_ID
                    if (chapterIdToLoad !== INITIAL_CHAPTER_ID) {
                         // Попробуем загрузить начальную главу
                        setCurrentChapterId(INITIAL_CHAPTER_ID);
                        if(currentChapterIdFromStore !== INITIAL_CHAPTER_ID) setCurrentChapterInStore(INITIAL_CHAPTER_ID);
                    } else {
                        setChapterData(null); // Очищаем данные, если даже начальная не может определить зону
                    }
                    setIsLoadingChapter(false);
                }
                return;
            }

            console.log(`[MainMenu] Attempting to load CHAPTER data for chapter ${chapterIdToLoad} in zone ${zoneIdForPath}...`);
            setIsLoadingChapter(true);
            setChapterData(null);
            setPosition({ x: 0, y: 0 });

            try {
                // Обновленный путь для динамического импорта:
                // Убедитесь, что '../data/' - это правильный относительный путь от MainMenu.jsx к папке, содержащей 'zones'
                const chapterModule = await import(`../data/zones/${zoneIdForPath}/chapter${chapterIdToLoad}Data.js`);
                
                if (isMounted) {
                    if (chapterModule.default && typeof chapterModule.default.id === 'number') {
                        setChapterData(chapterModule.default);
                        console.log("[MainMenu] Successfully loaded CHAPTER data:", chapterModule.default);
                    } else {
                        throw new Error(`Invalid chapter data structure or missing ID in chapter${chapterIdToLoad}Data.js (zone: ${zoneIdForPath})`);
                    }
                }
            } catch (error) {
                if (isMounted) {
                    console.error(`[MainMenu] Failed to load CHAPTER data for ID ${chapterIdToLoad} (zone: ${zoneIdForPath}):`, error);
                    if (chapterIdToLoad !== INITIAL_CHAPTER_ID) {
                        alert(`Ошибка загрузки данных Главы ${chapterIdToLoad} из зоны ${zoneIdForPath}. Загружаем Главу ${INITIAL_CHAPTER_ID}.`);
                        // Эта логика вызовет повторный запуск useEffect с INITIAL_CHAPTER_ID
                        if (activeView === 'detailed') {
                            setCurrentChapterId(INITIAL_CHAPTER_ID);
                        } else {
                            // performViewChange должен корректно обработать переход на INITIAL_CHAPTER_ID,
                            // включая определение его зоны
                            performViewChange('detailed', { chapterId: INITIAL_CHAPTER_ID });
                        }
                        if (currentChapterIdFromStore !== INITIAL_CHAPTER_ID) {
                            setCurrentChapterInStore(INITIAL_CHAPTER_ID);
                        }
                    } else {
                        alert(`Критическая ошибка: не удалось загрузить даже начальную Главу ${INITIAL_CHAPTER_ID} (зона: ${zoneIdForPath}).`);
                        setChapterData(null); // Очищаем данные, если загрузка провалилась
                    }
                }
            } finally {
                if (isMounted) {
                    // Устанавливаем isLoadingChapter(false) только если текущая глава совпадает с той, что загружали,
                    // чтобы избежать гонки состояний, если currentChapterId изменился во время загрузки.
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
            // Если currentChapterId не установлен, но мы на детальном виде, устанавливаем начальную главу.
            // Это также вызовет loadChapter для INITIAL_CHAPTER_ID при следующем рендере/эффекте.
            setCurrentChapterId(INITIAL_CHAPTER_ID);
            if (currentChapterIdFromStore !== INITIAL_CHAPTER_ID) {
                setCurrentChapterInStore(INITIAL_CHAPTER_ID);
            }
        } else if (activeView !== 'detailed') {
            // Опционально: если мы не на детальном виде, можно сбросить данные главы
            // if (chapterData) setChapterData(null);
            // setIsLoadingChapter(true); // Чтобы при возврате на детальный вид была индикация загрузки
        }

        return () => {
            isMounted = false;
        };
    }, [currentChapterId, activeView, setCurrentChapterInStore, currentChapterIdFromStore, performViewChange, findZoneIdForChapter]);

    useEffect(() => {
        let isMounted = true;
        if (activeView === 'zone' && currentZoneId) {
            setIsLoadingZoneChapters(true);
            setChaptersForCurrentZone([]); 
            console.log(`MainMenu: Loading chapters for zone ${currentZoneId}... Path: ../data/zones/${currentZoneId}/zoneData.js`);
            import(`../data/zones/${currentZoneId}/zoneData.js`)
                .then(module => {
                    if (isMounted) {
                        if (module.chaptersInZone) {
                            setChaptersForCurrentZone(module.chaptersInZone);
                            console.log(`MainMenu: Successfully loaded ${module.chaptersInZone.length} chapters for zone ${currentZoneId}.`);
                        } else {
                            console.error(`chaptersInZone not found in zoneData.js for zone ${currentZoneId}`);
                            setChaptersForCurrentZone([]);
                        }
                    }
                })
                .catch(err => {
                    if (isMounted) {
                        console.error(`MainMenu: Failed to load chapters for zone ${currentZoneId}:`, err);
                        setChaptersForCurrentZone([]);
                    }
                })
                .finally(() => {
                    if (isMounted) {
                        setIsLoadingZoneChapters(false);
                    }
                });
        } else if (activeView !== 'zone') {
            // if (chaptersForCurrentZone.length > 0) setChaptersForCurrentZone([]);
        }
        return () => { isMounted = false; };
    }, [activeView, currentZoneId]);

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
                // Используем findZoneIdForChapter, который возвращает ID или null
                const newZoneIdForChapter = findZoneIdForChapter(focus.chapterId);
                if (newZoneIdForChapter && newZoneIdForChapter !== finalZoneId) {
                    finalZoneId = newZoneIdForChapter; 
                }
            }
        }
        
        if (finalZoneId && finalZoneId !== currentZoneId) {
             setCurrentZoneId(finalZoneId);
        }

        if (targetView === 'detailed' && !focus.chapterId && !currentChapterId) { // currentChapterId здесь - это старый currentChapterId перед setCurrentChapterId(INITIAL_CHAPTER_ID)
            const defaultChapterId = INITIAL_CHAPTER_ID;
            setCurrentChapterId(defaultChapterId);
            if(currentChapterIdFromStore !== defaultChapterId) setCurrentChapterInStore(defaultChapterId);
            
            const zoneForDefaultChapter = findZoneIdForChapter(defaultChapterId); // Используем findZoneIdForChapter
            if (zoneForDefaultChapter && zoneForDefaultChapter !== currentZoneId) { // Обновляем currentZoneId если нужно
                setCurrentZoneId(zoneForDefaultChapter);
            }
            // finalChapterId = defaultChapterId; // Уже должен быть установлен или будет установлен setCurrentChapterId
            // if (zoneForDefaultChapter) finalZoneId = zoneForDefaultChapter; // finalZoneId тоже должен обновиться
        }
        else if (targetView === 'zone' && !finalZoneId) {
            // Используем ALL_ZONES_CONFIG как в инициализации currentZoneId
            const fallbackZoneId = ALL_ZONES_CONFIG[0]?.id || null;
            setCurrentZoneId(fallbackZoneId);
            // Логика для chapters и firstChapterInZone остается, но getBaseChaptersForZoneConfig должна быть доступна или заменена
            // const chapters = getBaseChaptersForZoneConfig(fallbackZoneId); 
            // if (chapters && chapters.length > 0) {
            //     const firstChapterInZone = chapters[0].id;
            //     if (firstChapterInZone !== finalChapterId) setCurrentChapterId(firstChapterInZone);
            // }
        }

        setActiveView(targetView); 

        setTriggerCloseOverlay(false);
        setTriggerOpenOverlay(true); 
    }, [currentChapterId, currentZoneId, setActiveView, setCurrentChapterId, setCurrentZoneId, currentChapterIdFromStore, setCurrentChapterInStore /* getBaseChaptersForZoneConfig - если используется */]);

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
        console.log(`MainMenu: openGlobalMapView. Current chapter ${currentChapterId}, current zone ${currentZoneId}.`);
        performViewChange('global', { zoneIdForFocus: currentZoneId, chapterForZoneContext: currentChapterId });
    }, [currentChapterId, currentZoneId, performViewChange]);

    const openZoneMapView = useCallback((selectedZoneId, chapterIdForFocus) => {
        console.log(`MainMenu: openZoneMapView. Target zone ${selectedZoneId}, chapter for focus ${chapterIdForFocus}.`);
        performViewChange('zone', { zoneId: selectedZoneId, chapterId: chapterIdForFocus });
    }, [performViewChange]);

    const openDetailedChapterView = useCallback((selectedChapterId) => {
        console.log(`MainMenu: openDetailedChapterView. Target chapter ${selectedChapterId}.`);
        // Используем findZoneIdForChapter, который возвращает ID или null
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

    const handleGoBackToZoneMapFromGlobal = useCallback(() => {
        console.log(`[MainMenu] Возврат с GlobalMap на ZoneMap для зоны ${currentZoneId} и главы ${currentChapterId}.`);
        openZoneMapView(currentZoneId, currentChapterId);
    }, [currentZoneId, currentChapterId, openZoneMapView]);

    const handleGoBackToDetailedViewFromZone = useCallback(() => {
        console.log(`[MainMenu] Возврат с ZoneMap на детальный вид главы ${currentChapterId}.`);
        openDetailedChapterView(currentChapterId);
    }, [currentChapterId, openDetailedChapterView]);

    const handleRewardsChestClick = useCallback(() => {
        console.log("[MainMenu] Переход на экран Наград");
        startScreenTransition(() => navigate('/rewards'));
    }, [navigate, startScreenTransition]);
    
    const updatePosition = useCallback((dx, dy) => { if (activeView !== 'detailed' || !mapContainerRef.current || !chapterData?.imageWidth || !chapterData?.imageHeight) return; const cw=mapContainerRef.current.offsetWidth; const ch=mapContainerRef.current.offsetHeight; const mw=chapterData.imageWidth; const mh=chapterData.imageHeight; setPosition({ x: clamp(mapStart.current.x+dx, Math.min(0,cw-mw),0), y: clamp(mapStart.current.y+dy, Math.min(0,ch-mh),0) }); }, [chapterData, activeView]);
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
            const targetChapterId = INITIAL_CHAPTER_ID;
            // Используем findZoneIdForChapter, который возвращает ID или null
            const targetZoneId = findZoneIdForChapter(targetChapterId);
            
            setCurrentChapterInStore(targetChapterId); 

            performViewChange('detailed', { chapterId: targetChapterId, zoneId: targetZoneId });
            
            setShowLevelPopup(false);
            setSelectedLevelId(null);
            setActivePopup(null);
        }
    }, [resetGame, performViewChange, setCurrentChapterInStore]);

    const handleBattlePassClick = useCallback(() => { if (activeView === 'detailed') setActivePopup('battlepass'); }, [activeView]);
    const handleMailClick = useCallback(() => { if (activeView === 'detailed') setActivePopup('mail');}, [activeView]);
    const handleDailyGrindClick = useCallback(() => { if (activeView === 'detailed') setActivePopup('hunting');}, [activeView]);
    const handleQuestsClick = useCallback(() => { if (activeView === 'detailed') setActivePopup('tasks');}, [activeView]);
    const handleExchangeClick = useCallback(() => { if (activeView === 'detailed') setActivePopup('exchange');}, [activeView]);
    const closePopup = useCallback(() => setActivePopup(null), []);
    const getPopupContent = (popupType) => { switch (popupType) { case 'mail': return <div>Содержимое почты...</div>; case 'hunting': return <div>Содержимое охоты...</div>; case 'tasks': return <div>Содержимое заданий...</div>; case 'exchange': return <div>Содержимое обмена...</div>; case 'battlepass': return <div>Содержимое Battle Pass...</div>; default: return null; } };
    const getPopupTitle = (popupType) => { switch (popupType) { case 'mail': return "Почта"; case 'hunting': return "Ежедневная охота"; case 'tasks': return "Задания"; case 'exchange': return "Обменник"; case 'battlepass': return "Боевой Пропуск"; default: return ""; } };

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

    // getBaseChaptersForZoneConfig может быть не определена здесь, если она не импортирована или не передана.
    // Если GlobalMap требует getBaseChaptersForZoneConfig, ее нужно будет импортировать из worldMapData.js (если она там есть)
    // или определить/передать соответствующим образом. Для данного рефакторинга, я предполагаю, что 
    // GlobalMap либо не критично зависит от неё, либо она будет добавлена отдельно.
    // Если она не используется, то можно удалить передачу этого пропа.
    // const getBaseChaptersForZoneConfig = (zoneId) => { /* ... implementation from worldMapData or similar ... */ };


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
                            onGoBack={handleGoBackToZoneMapFromGlobal} 
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
                                onSelectChapter={handleChapterSelectedOnZoneMap}
                                onGoToGlobalMapView={openGlobalMapView} 
                                onGoBack={handleGoBackToDetailedViewFromZone} 
                                isLevelUnlocked={isLevelUnlocked} 
                                getLevelCompletionStatus={getLevelCompletionStatus} 
                                currentChapterIdFromStore={currentChapterIdFromStore} 
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
                                            {console.log("MainMenu - Rendering detailed view with chapterData:", chapterData)} {/* <--- ВОТ ЭТОТ ЛОГ */}

                                <div className="chapter-view-container" ref={mapContainerRef} style={{overflow: 'hidden', width: '100%', height: '100%', position: 'relative', background: chapterData.backgroundColor || 'transparent' }}>
                                    <div
                                        className={`chapter-map-content ${dragging ? 'dragging' : ''}`}
                                        style={{
                                            // ИЗМЕНЕНО: Убран process.env.PUBLIC_URL
                                            // Убедитесь, что chapterData.image содержит абсолютный путь от корня public, например, "/images/maps/chapter1_bg.jpg"
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
                                                    {/* ИЗМЕНЕНО: Убран process.env.PUBLIC_URL. Убедитесь, что level.icon - абсолютный путь от /public */}
                                                    {level.icon ? <img src={`${level.icon}`} alt="" className="level-node-icon" /> : levelNumberInChapter}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <h2 className="chapter-name">
    {chapterData.name}
</h2>
                                <button className="main-menu-button battle-pass-button" onClick={handleBattlePassClick} >BattlePass</button>
                                <div className="main-menu-left-column" style={{position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 5}}>
                                    {/* ИЗМЕНЕНО: Убран process.env.PUBLIC_URL. Используется прямой абсолютный путь от /public */}
                                    <button className="main-menu-button icon-button mail-button" onClick={handleMailClick} title="Почта"><img src="/assets/icons/mail-icon.png" alt="Почта" /></button>
                                    <button className={`main-menu-button icon-button rewards-chest-button ${hasClaimableRewardsIndicator ? 'has-indicator' : ''}`} onClick={handleRewardsChestClick} title="Награды" >
                                        <img src="/assets/icons/gift-icon.png" alt="Награды" />
                                    </button>
                                    <button className="main-menu-button icon-button daily-grind-button" onClick={handleDailyGrindClick} title="Ежедневная охота"><img src="/assets/icons/daily-grind-icon.png" alt="Daily Grind" /></button>
                                </div>
                                <div className="main-menu-right-column" style={{position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 5}}>
                                    <button className="main-menu-button icon-button world-map-button" onClick={handleOpenMapSystemClick} title="Карта Мира">
                                        <img src="/assets/icons/map-icon.png" alt="Карта Мира" />
                                    </button>
                                    <button className="main-menu-button icon-button quests-button" onClick={handleQuestsClick} title="Задания"><img src="/assets/icons/quests-icon.png" alt="Задания" /></button>
                                    <button className="main-menu-button icon-button exchange-button" onClick={handleExchangeClick} title="Обмен"><img src="/assets/icons/exchange-icon.png" alt="Обмен" /></button>
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

            {activeView === 'detailed' && activePopup && activePopup !== 'rewards' && (
                <Popup title={getPopupTitle(activePopup)} onClose={closePopup}>
                    {getPopupContent(activePopup)}
                </Popup>
            )}
            {!isOverlayActive && (
                <button className="reset-button" onClick={handleFullResetClick} title="Сбросить весь игровой прогресс" >
                     Сброс
                </button>
            )}
        </motion.div>
    );
}

export default MainMenu;