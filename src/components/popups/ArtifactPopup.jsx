import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../store/useGameStore.js';
import './ArtifactPopup.scss'; // Убедитесь, что стили адаптированы под новую структуру
import { calculateArtifactStat } from '../../data/artifactsData.js'; // Убедитесь, что путь верный

// Анимации (без изменений)
const popupBackdropVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
};
const popupContentVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.2, delay: 0.05 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
};
const contentSwitchVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.2, ease: "easeInOut" } },
};

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
const formatStatValueForTable = (value, isPercent, addSign = false, isLevelValue = false) => {
    if (value === undefined || value === null) return '-';

    if (isLevelValue) {
        return String(value);
    }

    const numValue = Number(value);
    if (isNaN(numValue)) return '-';

    const sign = addSign && numValue > 0 ? '+' : '';

    let fixedValue;
    if (isPercent) {
        fixedValue = (numValue * 100).toFixed(1);
        if (fixedValue.endsWith('.0')) {
            fixedValue = (numValue * 100).toFixed(0);
        }
    } else {
        fixedValue = Number.isInteger(numValue) ? numValue.toString() : numValue.toFixed(1);
        if (fixedValue.endsWith('.0')) {
            fixedValue = Math.round(numValue).toString();
        }
    }
    return `${sign}${fixedValue}${isPercent ? '%' : ''}`;
};

const renderStatComparisonRow = (labelWithIcon, currentValue, nextValue, showNextValueColumn, isPercent = false, isLevelRow = false) => {
    let currentDisplay;
    if (isLevelRow) {
        currentDisplay = `Ур. ${formatStatValueForTable(currentValue, false, false, true)}`;
    } else {
        currentDisplay = formatStatValueForTable(currentValue, isPercent, false);
    }

    let nextDisplayContent = "-";
    let arrowContent = "";
    let nextValueExtraClass = "no-value";

    if (showNextValueColumn) {
        if (nextValue !== null && nextValue !== undefined) {
            let formattedNextValue;
            if (isLevelRow) {
                formattedNextValue = `Ур. ${formatStatValueForTable(nextValue, false, false, true)}`;
            } else {
                formattedNextValue = formatStatValueForTable(nextValue, isPercent, false);
            }

            if (formattedNextValue !== "-") {
                nextDisplayContent = formattedNextValue;
                if (currentDisplay !== nextDisplayContent || (isLevelRow && nextValue !== null)) {
                    arrowContent = "→";
                }
                const numCurrentValue = Number(String(currentValue).replace(/[^0-9.-]+/g,""));
                const numNextValue = Number(nextValue);

                if (!isLevelRow && !isNaN(numCurrentValue) && !isNaN(numNextValue) && numNextValue > numCurrentValue) {
                    nextValueExtraClass = "has-value positive-change";
                } else {
                    nextValueExtraClass = "has-value";
                }
            }
        } else if (isLevelRow) {
            nextDisplayContent = "Макс.";
            arrowContent = "";
            nextValueExtraClass = "no-upgrade max-level";
        }
    } else if (isLevelRow) {
        nextDisplayContent = "Макс.";
        nextValueExtraClass = "no-upgrade max-level";
        arrowContent = "";
    }

    const key = typeof labelWithIcon === 'string' ? labelWithIcon : JSON.stringify(labelWithIcon);
    const currentValCellClasses = `current-value-cell ${isLevelRow ? 'is-level-value' : ''}`;
    const nextValCellClasses = `next-value-cell ${nextValueExtraClass} ${isLevelRow ? 'is-level-value' : ''}`;

    return (
        <React.Fragment key={key}>
            <div className="stat-name-cell">{labelWithIcon}</div>
            <div className={currentValCellClasses}>{currentDisplay}</div>
            <div className="arrow-cell">{arrowContent}</div>
            <div className={nextValCellClasses}>{nextDisplayContent}</div>
        </React.Fragment>
    );
};

const getStatDisplayNameAndType = (statKey) => {
    const keyLower = statKey?.toLowerCase();
    let displayName = statKey ? statKey.charAt(0).toUpperCase() + statKey.slice(1) : 'Неизв. стат';
    let isPercent = false;

    switch (keyLower) {
        case 'hp': displayName = 'Здоровье'; break;
        case 'attack': displayName = 'Атака'; break;
        case 'attackspeed': displayName = 'Скорость Атаки'; isPercent = true; break;
        case 'critchance': displayName = 'Шанс Крита'; isPercent = true; break;
        case 'doublestrikechance': displayName = 'Двойной Удар'; isPercent = true; break;
        case 'hpregen': displayName = 'Реген. HP'; break;
        // Добавьте другие ваши ключи статов, если необходимо
    }
    return { displayName, isPercent };
};

const ArtifactPopup = ({ artifact, onClose, onPowerChange }) => {
    if (!artifact) return null;

    const artifactLevels = useGameStore(state => state.artifactLevels);
    const artifactState = artifactLevels[artifact.id] || { level: 0, shards: 0 };
    const actualStoredLevel = artifactState.level;
    const currentShards = artifactState.shards;

    const isOwnedAndActive = actualStoredLevel > 0;
    const isMaxLevel = isOwnedAndActive && actualStoredLevel >= artifact.maxLevel;

    const shardsNeededForActivation = (0 + 1) * (artifact.baseShardCost || 10);
    const canActivate = !isOwnedAndActive && currentShards >= shardsNeededForActivation;

    const shardsNeededForNextLevel = isMaxLevel ? 0 : (actualStoredLevel + 1) * (artifact.baseShardCost || 10);
    const canUpgrade = isOwnedAndActive && !isMaxLevel && currentShards >= shardsNeededForNextLevel;

    const [showingView, setShowingView] = useState('stats');

    const handleActivateClick = () => {
        if (!canActivate) return;
        const { activateArtifact, totalPower } = useGameStore.getState();
        const oldPower = totalPower;
        activateArtifact(artifact.id);
        setTimeout(() => {
            const newPower = useGameStore.getState().totalPower;
            if (typeof onPowerChange === 'function' && oldPower !== newPower) {
                onPowerChange(oldPower, newPower);
            }
            // onClose(); // Закрытие после действия может быть не нужно, если попап должен оставаться открытым
        }, 50);
    };

    const handleUpgradeClick = () => {
        if (!canUpgrade) return;
        const { upgradeArtifact, totalPower } = useGameStore.getState();
        const oldPower = totalPower;
        upgradeArtifact(artifact.id);
        setTimeout(() => {
            const newPower = useGameStore.getState().totalPower;
            if (typeof onPowerChange === 'function' && oldPower !== newPower) {
                onPowerChange(oldPower, newPower);
            }
            // onClose(); // Закрытие после действия
        }, 50);
    };

    const statKeysToDisplay = useMemo(() => {
        const keys = new Set();
        if (artifact.baseStats) {
            Object.keys(artifact.baseStats).forEach(stat => keys.add(stat));
        }
        if (artifact.levelStats) {
            Object.keys(artifact.levelStats).forEach(stat => keys.add(stat));
        }
        if (artifact.primaryDynamicStats && Array.isArray(artifact.primaryDynamicStats)) {
            artifact.primaryDynamicStats.forEach(stat => keys.add(stat.statKey || stat));
        }
        return Array.from(keys);
    }, [artifact]);

    const renderedComparisonStats = useMemo(() => {
        const rows = [];

        let currentLevelForDisplayInRow;
        let nextLevelForDisplayInRow;
        let currentLevelForStatCalculation;
        let nextLevelForStatCalculation;
        let showNextColumnForStats;

        if (!isOwnedAndActive) {
            currentLevelForDisplayInRow = 0;
            nextLevelForDisplayInRow = 1;
            currentLevelForStatCalculation = 0;
            nextLevelForStatCalculation = 1;
            showNextColumnForStats = true;
        } else if (!isMaxLevel) {
            currentLevelForDisplayInRow = actualStoredLevel;
            nextLevelForDisplayInRow = actualStoredLevel + 1;
            currentLevelForStatCalculation = actualStoredLevel;
            nextLevelForStatCalculation = actualStoredLevel + 1;
            showNextColumnForStats = true;
        } else { // Owned and Max Level
            currentLevelForDisplayInRow = actualStoredLevel;
            nextLevelForDisplayInRow = null;
            currentLevelForStatCalculation = actualStoredLevel;
            nextLevelForStatCalculation = null;
            showNextColumnForStats = false;
        }

        rows.push(renderStatComparisonRow(
            "Уровень",
            currentLevelForDisplayInRow,
            nextLevelForDisplayInRow,
            true,
            false,
            true
        ));

        statKeysToDisplay.forEach(statKey => {
            const { displayName, isPercent } = getStatDisplayNameAndType(statKey);
            let currentStatValue;
            if (!isOwnedAndActive) {
                currentStatValue = 0;
            } else {
                currentStatValue = calculateArtifactStat(artifact, statKey, currentLevelForStatCalculation);
            }

            let nextStatValue = null;
            if (nextLevelForStatCalculation !== null) {
                nextStatValue = calculateArtifactStat(artifact, statKey, nextLevelForStatCalculation);
            }

            const isCurrentEffectivelyZero = currentStatValue === 0 || currentStatValue === null || currentStatValue === undefined;
            const isNextEffectivelyZero = nextStatValue === 0 || nextStatValue === null || nextStatValue === undefined;

            if (isCurrentEffectivelyZero && (isNextEffectivelyZero || !showNextColumnForStats) ) {
                if (!(isCurrentEffectivelyZero && nextStatValue && Number(nextStatValue) !== 0)) {
                    return;
                }
            }

            rows.push(renderStatComparisonRow(
                displayName,
                currentStatValue,
                nextStatValue,
                showNextColumnForStats,
                isPercent
            ));
        });

        return rows.filter(Boolean);
    }, [artifact, actualStoredLevel, isOwnedAndActive, isMaxLevel, statKeysToDisplay, artifactLevels, getStatDisplayNameAndType, calculateArtifactStat]);

    const hasAnyStatsToDisplay = renderedComparisonStats.length > 1;

    const handleToggleView = () => {
        setShowingView(prev => prev === 'stats' ? 'details' : 'stats');
    };
    const hasAlternativeViewContent = artifact.longDescription || artifact.specialEffects;

    // --- Определение свойств для кнопки в футере ---
    let footerButtonProps = {
        text: "",
        onClick: () => {},
        disabled: true,
        title: "",
        className: "button-action" // Базовый класс
    };

    if (!isOwnedAndActive) {
        footerButtonProps = {
            text: `Активировать (${currentShards} / ${shardsNeededForActivation})`,
            onClick: handleActivateClick,
            disabled: !canActivate,
            title: !canActivate ? `Нужно еще ${shardsNeededForActivation - currentShards} осколков` : `Активировать за ${shardsNeededForActivation} осколков`,
            className: "button-action button-activate-artifact-footer"
        };
    } else if (!isMaxLevel) {
        footerButtonProps = {
            text: `Улучшить (${currentShards} / ${shardsNeededForNextLevel})`,
            onClick: handleUpgradeClick,
            disabled: !canUpgrade,
            title: !canUpgrade ? `Нужно еще ${shardsNeededForNextLevel - currentShards} осколков` : `Улучшить до ур. ${actualStoredLevel + 1} за ${shardsNeededForNextLevel} осколков`,
            className: "button-action button-upgrade-artifact-footer"
        };
    } else { // isOwnedAndActive && isMaxLevel
        footerButtonProps = {
            text: "Максимальный уровень",
            onClick: () => {}, // Можно оставить пустым или добавить onClose, если нужно закрытие по клику
            disabled: true,
            title: "Артефакт уже максимального уровня",
            className: "button-action button-max-level-footer"
        };
    }
    // --- Конец определения свойств для кнопки в футере ---

    return (
        <motion.div
            key="artifact-popup-backdrop"
            className="item-popup-backdrop"
            variants={popupBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose} // Закрытие по клику на фон остается
        >
            <motion.div
                className="item-popup-content forge-info-popup-fixed-height"
                onClick={(e) => e.stopPropagation()}
                variants={popupContentVariants}
            >
                {/* === НОВАЯ КНОПКА ЗАКРЫТИЯ "X" === */}
                <button className="popup-close-x-button" onClick={onClose} aria-label="Закрыть">
                    &times;
                </button>

                {/* Шапка */}
                <div className="custom-popup-header">
                    <div className={`item-name-banner rarity-bg-${artifact.rarity?.toLowerCase() || 'common'}`}>
                        <h2>{artifact.name}</h2>
                    </div>
                </div>

                {/* Тело попапа */}
                <div className="popup-body-scrollable-area">
                    <div className="popup-content-stack">
                        {/* Иконка и Описание */}
                        <div className="icon-description-row">
                            <div className="icon-column">
                                <div className={`popup-icon-area rarity-${artifact.rarity?.toLowerCase() || 'common'}`}>
                                    <img src={artifact.icon} alt={artifact.name} className="popup-icon"/>
                                </div>
                            </div>
                            {artifact.description && (
                                <div className="description-column">
                                    <div className="popup-description-area">
                                        <p>{artifact.description}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Блок для переключения статов и др. информации */}
                        <div className="toggleable-content-area">
                            <AnimatePresence mode="wait" initial={false}>
                                {showingView === 'stats' && (
                                    <motion.div
                                        key="statsView"
                                        className="stats-view-wrapper"
                                        variants={contentSwitchVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                    >
                                        <h4 className="content-section-title left-aligned-title">
                                            Характеристики:
                                        </h4>
                                        {hasAnyStatsToDisplay ? (
                                            <div className="stats-block">
                                                <div className="stats-comparison-table">
                                                    {renderedComparisonStats}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="no-stats-message">
                                                <p>Нет характеристик для отображения.</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                                {showingView === 'details' && hasAlternativeViewContent && (
                                    <motion.div
                                        key="detailsView"
                                        className="details-view-wrapper"
                                        variants={contentSwitchVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                    >
                                        <h4 className="content-section-title left-aligned-title">Подробности:</h4>
                                        <div className="details-content-block">
                                            {artifact.longDescription && <p>{artifact.longDescription}</p>}
                                            {/* Отображение specialEffects, если они есть */}
                                            {artifact.specialEffects && <p><strong>Особые эффекты:</strong> {artifact.specialEffects}</p>}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Кнопка переключения вида (остается здесь, если нужна) */}
                        {hasAlternativeViewContent && (
                            <button
                                className="button-action button-toggle-view-standalone"
                                onClick={handleToggleView}
                            >
                                {showingView === 'stats' ? 'Подробности' : 'Характеристики'}
                            </button>
                        )}
                        {/* === СТАРЫЙ БЛОК КНОПОК УДАЛЕН ОТСЮДА === */}
                        {/* div.artifact-action-buttons удален */}
                    </div>
                </div>

                {/* === ОБНОВЛЕННЫЙ ФУТЕР С ОДНОЙ ДИНАМИЧЕСКОЙ КНОПКОЙ === */}
                <div className="popup-buttons item-info-footer">
                    <button
                        className={footerButtonProps.className}
                        onClick={footerButtonProps.onClick}
                        disabled={footerButtonProps.disabled}
                        title={footerButtonProps.title}
                    >
                        {footerButtonProps.text}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ArtifactPopup;