// src/components/ArtifactsPanel.jsx
import React, { useMemo, useState } from 'react';
import useGameStore from '../../store/useGameStore.js';
import { ARTIFACT_SETS, getArtifactById } from '../../data/artifactsData'; // Путь к данным
import ArtifactPopup from '../popups/ArtifactPopup.jsx';
import './ArtifactsPanel.scss';

// --- ИЗМЕНЕНО: Принимаем onPowerChange как пропс ---
const ArtifactsPanel = ({ onPowerChange }) => {
    // Получаем уровни артефактов для определения активности
    const artifactLevels = useGameStore(state => state.artifactLevels);

    // Состояние для отслеживания выбранного артефакта для попапа
    const [selectedArtifactData, setSelectedArtifactData] = useState(null);

    // Мемоизированная функция для проверки активности бонуса сета (без изменений)
    const isBonusActive = useMemo(() => {
        return (set, bonusCondition) => {
            // ... (логика проверки бонуса как и была) ...
             const match = bonusCondition.match(/\[\s*Собрано\s*(\d+)\s*\]/i);
             if (!match || !match[1]) return false;
             const requiredCount = parseInt(match[1], 10);
             if (isNaN(requiredCount) || requiredCount <= 0) return false;
             const activeOwnedCount = set.artifacts.filter(artifact => {
                 const state = artifactLevels[artifact.id];
                 return state && state.level > 0;
             }).length;
             return activeOwnedCount >= requiredCount;
        };
    }, [artifactLevels]);

    // Функция для открытия попапа (без изменений)
    const handleArtifactClick = (artifactBaseData) => {
        const fullArtifactData = getArtifactById(artifactBaseData.id);
        if (fullArtifactData) {
            setSelectedArtifactData(fullArtifactData);
        } else {
            console.error("Не найдены полные данные для артефакта:", artifactBaseData.id);
        }
    };

    // Функция для закрытия попапа (без изменений)
    const handleClosePopup = () => {
        setSelectedArtifactData(null);
    };

    // --- Рендер компонента ---
    return (
        <>
            <div className="artifacts-panel-content-only">
                <div className="artifacts-list">
                    {!ARTIFACT_SETS || ARTIFACT_SETS.length === 0 ? (
                        <p>Данные об артефактах не найдены.</p>
                    ) : (
                        ARTIFACT_SETS.map((set) => (
                            <div key={set.id} className="artifact-set">
                                <h3 className="set-title">{set.name}</h3>
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
                                                <span className="artifact-name">{artifact.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Отображение бонусов сета (без изменений) */}
                                {set.bonuses && set.bonuses.length > 0 && (
                                    <div className="set-bonuses">
                                        <h4>Бонусы набора:</h4>
                                        <ul>
                                            {set.bonuses.map((bonus, index) => {
                                                const active = isBonusActive(set, bonus.condition);
                                                return (
                                                    <li key={index} className={active ? 'active-bonus' : ''}>
                                                        <span className="bonus-condition">{bonus.condition}:</span>
                                                        <span className="bonus-description">{bonus.description}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </div> // Конец .artifact-set
                        )) // Конец map по сетам
                    )}
                </div> {/* Конец .artifacts-list */}
            </div> {/* Конец .artifacts-panel-content-only */}

            {/* Условный рендеринг попапа */}
            {selectedArtifactData && (
                <ArtifactPopup
                    artifact={selectedArtifactData}
                    onClose={handleClosePopup}
                    // --- ИЗМЕНЕНО: Передаем onPowerChange дальше в ArtifactPopup ---
                    onPowerChange={onPowerChange}
                />
            )}
        </> // Конец React Fragment
    );
};

export default ArtifactsPanel;