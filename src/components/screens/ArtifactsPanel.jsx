import React, { useMemo, useState, useCallback } from 'react'; // Добавлен useCallback
import useGameStore from '../../store/useGameStore.js';
import { ARTIFACT_SETS, getArtifactById } from '../../data/artifactsData';
import ArtifactPopup from '../popups/ArtifactPopup.jsx';
import './ArtifactsPanel.scss';

const ArtifactsPanel = ({ onPowerChange }) => {
    const artifactLevels = useGameStore(state => state.artifactLevels);
    const [selectedArtifactData, setSelectedArtifactData] = useState(null);
    const [expandedSets, setExpandedSets] = useState(new Set());

    // Мемоизируем getOwnedArtifactsCount с useCallback
    const getOwnedArtifactsCount = useCallback((set) => {
        return set.artifacts.filter(artifact => {
            const state = artifactLevels[artifact.id];
            return state && state.level > 0;
        }).length;
    }, [artifactLevels]); // Зависит от artifactLevels

    const isBonusActive = useMemo(() => {
        return (set, bonusCondition) => {
            const match = bonusCondition.match(/\[\s*Собрано\s*(\d+)\s*\]/i);
            if (!match || !match[1]) return false;
            const requiredCount = parseInt(match[1], 10);
            if (isNaN(requiredCount) || requiredCount <= 0) return false;
            
            const activeOwnedCount = getOwnedArtifactsCount(set); // Используем мемоизированную версию
            return activeOwnedCount >= requiredCount;
        };
    }, [getOwnedArtifactsCount]); // Теперь зависим от мемоизированной getOwnedArtifactsCount

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

                            // --- НОВЫЙ БЛОК: ГРУППИРОВКА БОНУСОВ ---
                            const groupedBonuses = useMemo(() => {
                                if (!set.bonuses || set.bonuses.length === 0) {
                                    return {};
                                }
                                return set.bonuses.reduce((acc, bonus) => {
                                    const conditionKey = bonus.condition; // Например, "[Собрано 2]"
                                    if (!acc[conditionKey]) {
                                        acc[conditionKey] = {
                                            descriptions: [],
                                            isActive: isBonusActive(set, conditionKey)
                                        };
                                    }
                                    acc[conditionKey].descriptions.push(bonus.description);
                                    return acc;
                                }, {});
                            }, [set, isBonusActive]); // Убрали set.bonuses и artifactLevels т.к. isBonusActive уже их учитывает косвенно
                                                     // set добавлен, т.к. он используется в isBonusActive
                            // --- КОНЕЦ НОВОГО БЛОКА ---

                            return (
                                <div key={set.id} className="artifact-set-container">
                                    <h3 className="set-title-banner">{set.name}</h3>
                                    <div className={artifactSetClasses}>
                                        <div className="set-items">
                                            {set.artifacts.map((artifact) => {
                                                const artifactState = artifactLevels[artifact.id] || { level: 0 };
                                                const isActive = artifactState.level > 0;
                                                const itemClasses = [
                                                    'artifact-item',
                                                    isActive ? 'owned' : 'not-owned',
                                                    `rarity-${artifact.rarity || 'common'}`
                                                ].join(' ');

                                                return (
                                                    <div
                                                        key={artifact.id}
                                                        className={itemClasses}
                                                        title={artifact.name}
                                                        onClick={() => handleArtifactClick(artifact)}
                                                    >
                                                        <div className="artifact-icon-wrapper">
                                                            <img src={artifact.icon} alt={artifact.name} />
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
                                                        {/* --- ИЗМЕНЕННЫЙ ЦИКЛ ОТОБРАЖЕНИЯ БОНУСОВ --- */}
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
                                                        {/* --- КОНЕЦ ИЗМЕНЕННОГО ЦИКЛА --- */}
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