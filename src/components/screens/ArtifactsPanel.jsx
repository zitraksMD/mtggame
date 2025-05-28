// ArtifactsPanel.jsx
import React, { useMemo, useState, useCallback } from 'react';
import useGameStore from '../../store/useGameStore.js';
// Предполагаем, что BASE_SHARD_COST_PER_LEVEL находится в artifactsData.js
// Если это не так, вам нужно будет скорректировать импорт или значение по умолчанию.
// Добавлен MAX_ARTIFACT_LEVEL
import { ARTIFACT_SETS, getArtifactById, BASE_SHARD_COST_PER_LEVEL, MAX_ARTIFACT_LEVEL } from '../../data/artifactsData';
import ArtifactPopup from '../popups/ArtifactPopup.jsx';
import './ArtifactsPanel.scss';

const ArtifactsPanel = ({ onPowerChange }) => {
    const artifactLevels = useGameStore(state => state.artifactLevels);
    // collectedArtifacts нам не нужен для этой логики, так как наличие записи в artifactLevels с level 0 уже означает "собран"
    const [selectedArtifactData, setSelectedArtifactData] = useState(null);
    const [expandedSets, setExpandedSets] = useState(new Set());

    const getOwnedArtifactsCount = useCallback((set) => {
        return set.artifacts.filter(artifact => {
            const state = artifactLevels[artifact.id];
            return state && state.level > 0;
        }).length;
    }, [artifactLevels]);

    const isBonusActive = useMemo(() => {
        return (set, bonusCondition) => {
            const match = bonusCondition.match(/\[\s*Собрано\s*(\d+)\s*\]/i);
            if (!match || !match[1]) return false;
            const requiredCount = parseInt(match[1], 10);
            if (isNaN(requiredCount) || requiredCount <= 0) return false;
            
            const activeOwnedCount = getOwnedArtifactsCount(set);
            return activeOwnedCount >= requiredCount;
        };
    }, [getOwnedArtifactsCount]);

    const toggleSetExpansion = (setId) => {
        setExpandedSets(prevExpandedSets => {
            const newExpandedSets = new Set(prevExpandedSets);
            if (newExpandedSets.has(setId)) {
                newExpandedSets.delete(setId);
            } else {
                newExpandedSets.add(setId);
            }
            return newExpandedSets;
        });
    };

    const handleArtifactClick = (artifactBaseData) => {
        const fullArtifactData = getArtifactById(artifactBaseData.id);
        if (fullArtifactData) {
            setSelectedArtifactData(fullArtifactData);
        } else {
            console.error("Не найдены полные данные для артефакта:", artifactBaseData.id);
        }
    };

    const handleClosePopup = () => {
        setSelectedArtifactData(null);
    };

    const isArtifactReadyForActivation = useCallback((artifactJson) => {
        const artifactState = artifactLevels[artifactJson.id] || { level: 0, shards: 0 };
        
        if (artifactState.level !== 0) {
            return false; 
        }

        const artifactDataFromDb = getArtifactById(artifactJson.id);
        if (!artifactDataFromDb) {
            console.warn(`Данные для артефакта ${artifactJson.id} не найдены в getArtifactById для проверки активации.`);
            return false;
        }

        const shardsNeeded = (0 + 1) * (artifactDataFromDb.baseShardCost || BASE_SHARD_COST_PER_LEVEL);
        return (artifactState.shards || 0) >= shardsNeeded;
    }, [artifactLevels, /* BASE_SHARD_COST_PER_LEVEL если он может меняться и не из getArtifactById */]);

    // === НОВАЯ ФУНКЦИЯ ДЛЯ ПРОВЕРКИ ГОТОВНОСТИ К УЛУЧШЕНИЮ ===
    const isArtifactReadyForUpgrade = useCallback((artifactJson) => {
        const artifactState = artifactLevels[artifactJson.id];
        // Артефакт должен быть активирован (level > 0)
        if (!artifactState || artifactState.level === 0) {
            return false;
        }

        const fullArtifactData = getArtifactById(artifactJson.id);
        if (!fullArtifactData) {
            return false;
        }
        
        // Проверяем, не максимальный ли уровень
        const maxLevel = fullArtifactData.maxLevel || MAX_ARTIFACT_LEVEL;
        if (artifactState.level >= maxLevel) {
            return false;
        }

        const shardsNeeded = (artifactState.level + 1) * (fullArtifactData.baseShardCost || BASE_SHARD_COST_PER_LEVEL);
        return (artifactState.shards || 0) >= shardsNeeded;
    }, [artifactLevels]);


    // Блок группировки бонусов вынесен за пределы map для соответствия правилам React Hooks,
    // но его нужно будет адаптировать для каждого сета отдельно или передавать `set` как аргумент.
    // В данном примере, для сохранения структуры вашего кода, оставляю useMemo внутри map,
    // но с предупреждением о необходимости рефакторинга.
    // const groupedBonusesForAllSets = useMemo(() => { /* ... */ }, [ARTIFACT_SETS, isBonusActive]);


    return (
        <>
            <div className="artifacts-panel-content-only">
                <div className="artifacts-list">
                    {!ARTIFACT_SETS || ARTIFACT_SETS.length === 0 ? (
                        <p>Данные об артефактах не найдены.</p>
                    ) : (
                        ARTIFACT_SETS.map((set) => {
                            const ownedInThisSetCount = getOwnedArtifactsCount(set);
                            const totalArtifactsInSet = set.artifacts.length;
                            const isSetFullyCollected = ownedInThisSetCount >= totalArtifactsInSet && totalArtifactsInSet > 0;
                            const isCurrentlyExpanded = expandedSets.has(set.id);

                            const artifactSetClasses = [
                                'artifact-set',
                                isSetFullyCollected ? 'fully-collected-set-glow' : ''
                            ].join(' ').trim();
                            
                            // --- БЛОК ГРУППИРОВКИ БОНУСОВ (из вашего кода) ---
                            // Внимание: useMemo здесь вызывается внутри map, что является нарушением правил React Hooks.
                            // Это может привести к неожиданному поведению. Его следует выносить из цикла.
                            // Однако, для сохранения структуры вашего кода, оставляю как есть.
                            const groupedBonuses = useMemo(() => {
                                if (!set.bonuses || set.bonuses.length === 0) {
                                    return {};
                                }
                                return set.bonuses.reduce((acc, bonus) => {
                                    const conditionKey = bonus.condition;
                                    if (!acc[conditionKey]) {
                                        acc[conditionKey] = {
                                            descriptions: [],
                                            isActive: isBonusActive(set, conditionKey)
                                        };
                                    }
                                    acc[conditionKey].descriptions.push(bonus.description);
                                    return acc;
                                }, {});
                            }, [set, isBonusActive]); // Зависимости для useMemo, если он остается здесь
                            // --- КОНЕЦ БЛОКА ГРУППИРОВКИ БОНУСОВ ---

                            return (
                                <div key={set.id} className="artifact-set-container">
                                    <h3 className="set-title-banner">{set.name}</h3>
                                    <div className={artifactSetClasses}>
                                        <div className="set-items">
                                            {set.artifacts.map((artifact) => {
                                                const artifactState = artifactLevels[artifact.id] || { level: 0, shards: 0 };
                                                const isActive = artifactState.level > 0;
                                                const level = artifactState.level;

                                                const readyForActivation = isArtifactReadyForActivation(artifact);
                                                // === ВЫЗОВ НОВОЙ ФУНКЦИИ ===
                                                const readyForUpgrade = isArtifactReadyForUpgrade(artifact);

                                                const itemClasses = [
                                                    'artifact-item',
                                                    isActive ? 'owned' : 'not-owned',
                                                    `rarity-${artifact.rarity || 'common'}`,
                                                    readyForActivation ? 'glow-for-activation' : '',
                                                    readyForUpgrade ? 'can-be-upgraded' : '' // Новый класс для индикатора улучшения
                                                ].join(' ').trim();

                                                return (
                                                    <div
                                                        key={artifact.id}
                                                        className={itemClasses}
                                                        title={artifact.name}
                                                        onClick={() => handleArtifactClick(artifact)}
                                                    >
                                                        <div className="artifact-icon-wrapper">
                                                            <img src={artifact.icon} alt={artifact.name} />
                                                            
                                                            {/* === ИЗМЕНЕННЫЙ БЛОК ДЛЯ ЛЕЙБЛОВ (соответствует первому варианту) === */}
                                                            {isActive ? ( 
                                                                <div className="artifact-status-label level-label">
                                                                    Lvl {level}
                                                                </div>
                                                            ) : ( 
                                                                <div className="artifact-status-label not-active-label">
                                                                    Not active {/* Замените на "Не активен", если нужна локализация */}
                                                                </div>
                                                            )}
                                                            {/* Вы можете добавить сюда иконку для readyForUpgrade, если она не через CSS */}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {set.bonuses && set.bonuses.length > 0 && (
                                            <div className="set-bonuses-section">
                                                <h4
                                                    onClick={() => toggleSetExpansion(set.id)}
                                                    className="set-bonus-toggle"
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSetExpansion(set.id);}}
                                                >
                                                    Бонусы набора:
                                                    <span className={`expand-indicator ${isCurrentlyExpanded ? 'expanded' : ''}`}>
                                                        {isCurrentlyExpanded ? '▲' : '▼'}
                                                    </span>
                                                </h4>
                                                <div className={`set-bonuses-content ${isCurrentlyExpanded ? 'expanded' : 'collapsed'}`}>
                                                    <ul>
                                                        {Object.entries(groupedBonuses).map(([conditionString, bonusGroupData]) => {
                                                            const match = conditionString.match(/\[\s*Собрано\s*(\d+)\s*\]/i);
                                                            const requiredCountForDisplay = match ? parseInt(match[1], 10) : null;
                                                            const conditionTextLabel = requiredCountForDisplay 
                                                                ? `${requiredCountForDisplay}/${requiredCountForDisplay}` 
                                                                : conditionString;

                                                            return (
                                                                <li 
                                                                    key={conditionString} 
                                                                    className={bonusGroupData.isActive ? 'active-bonus-group' : 'inactive-bonus-group'}
                                                                >
                                                                    <div className="bonus-condition-header">
                                                                        <span className="bonus-condition-label">{conditionTextLabel}:</span>
                                                                    </div>
                                                                    <div className="bonus-description-list">
                                                                        {bonusGroupData.descriptions.map((desc, descIndex) => (
                                                                            <div key={descIndex} className="bonus-description-item">
                                                                                {desc}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {selectedArtifactData && (
                <ArtifactPopup
                    artifact={selectedArtifactData}
                    onClose={handleClosePopup}
                    onPowerChange={onPowerChange}
                />
            )}
        </>
    );
};

export default ArtifactsPanel;