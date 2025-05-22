import React, { useMemo } from 'react'; // Добавлен useMemo для оптимизации списка статов
import useGameStore from '../../store/useGameStore.js';
import './ArtifactPopup.scss';
import { calculateArtifactStat } from '../../data/artifactsData.js'; // <<< ИМПОРТИРУЕМ НОВУЮ ФУНКЦИЮ

// Хелпер для форматирования отображаемого имени стата и помощи formatStat с процентами
const getStatDisplayName = (statKey) => {
    switch (statKey?.toLowerCase()) {
        case 'hp': return 'HP';
        case 'attack': return 'Attack';
        case 'attackspeed': return 'Attack Speed %'; // Добавляем % для formatStat
        case 'critchance': return 'Crit Chance %';
        case 'doublestrikechance': return 'Double Strike %';
        case 'hpregen': return 'HP Regen';
        // Добавьте другие ваши ключи статов, если необходимо
        default: 
            return statKey ? statKey.charAt(0).toUpperCase() + statKey.slice(1) : 'Unknown Stat';
    }
};

// Хелпер для форматирования значения стата (можно оставить ваш)
const formatStat = (formattedStatName, value) => { // Принимает отформатированное имя для проверки '%'
    if (value === undefined || value === null) return 'N/A';
    
    // Проверяем, содержит ли ОТФОРМАТИРОВАННОЕ имя стата знак '%'
    if (formattedStatName.includes('%')) {
        const numericValue = parseFloat(value); // Убедимся, что это число
        // Если это уже готовый процент (например, 5 для 5%), то просто добавляем знак
        // Если это десятичная дробь (например, 0.05 для 5%), то нужно умножить на 100
        // Сейчас calculateArtifactStat для attackSpeed и т.д. возвращает уже % значения (например, 0.4 для 0.4%)
        // Поэтому просто форматируем как число.
        const formatted = numericValue.toFixed(1);
        return formatted.endsWith('.0') ? `${Math.round(numericValue)}%` : `${formatted}%`;
    }
    if (Number.isInteger(value)) {
        return value.toString();
    }
    const formatted = value.toFixed(1);
    return formatted.endsWith('.0') ? `${Math.round(value)}` : formatted;
};


const ArtifactPopup = ({ artifact, onClose, onPowerChange }) => {
    const artifactLevels = useGameStore(state => state.artifactLevels);
    
    const artifactState = artifactLevels[artifact.id] || { level: 0, shards: 0 };
    const currentLevel = artifactState.level;
    const currentShards = artifactState.shards;
    const isOwnedAndActive = currentLevel > 0;
    const isMaxLevel = isOwnedAndActive && currentLevel >= artifact.maxLevel;

    const shardsNeededForActivation = (0 + 1) * (artifact.baseShardCost || 10);
    const canActivate = !isOwnedAndActive && currentShards >= shardsNeededForActivation;

    const shardsNeededForNextLevel = isMaxLevel ? 0 : (currentLevel + 1) * (artifact.baseShardCost || 10);
    const canUpgrade = isOwnedAndActive && !isMaxLevel && currentShards >= shardsNeededForNextLevel;

    // --- Локальная функция calculateStatValue УДАЛЕНА, используем импортированную calculateArtifactStat ---

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
            onClose(); 
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
            onClose();
        }, 50);
    };

    // --- НОВАЯ ЛОГИКА ДЛЯ ОТОБРАЖЕНИЯ СТАТОВ ---
    const displayLevel = isOwnedAndActive ? currentLevel : 1; // Показываем статы для L1, если не активирован

    // Собираем все ключи статов, которые есть у артефакта
    const statKeysToDisplay = useMemo(() => {
        const keys = new Set();
        // Добавляем динамические статы (HP, Attack), если они определены для артефакта
        if (artifact.primaryDynamicStats && Array.isArray(artifact.primaryDynamicStats)) {
            artifact.primaryDynamicStats.forEach(stat => keys.add(stat));
        }
        // Добавляем статы, определенные через baseStats (для attackSpeed, critChance и т.д.)
        if (artifact.baseStats) {
            Object.keys(artifact.baseStats).forEach(stat => keys.add(stat));
        }
        // Можно также добавить ключи из levelStats, но обычно они дублируют baseStats
        // if (artifact.levelStats) {
        //     Object.keys(artifact.levelStats).forEach(stat => keys.add(stat));
        // }
        return Array.from(keys);
    }, [artifact]);

    const renderedStats = statKeysToDisplay.map(statName => {
        const statValue = calculateArtifactStat(artifact, statName, displayLevel);

        // Не отображаем стат, если его значение 0 (согласно вашей предыдущей логике)
        // Вы можете настроить это условие, если 0 для некоторых статов имеет значение
        if (statValue === 0 && !artifact.primaryDynamicStats?.includes(statName) && !(statName in (artifact.baseStats || {}))) {
             // Если стат 0 и он не является основным динамическим или явно определенным в baseStats, не показываем
             return null; 
        }
        if (statValue === 0 && displayLevel === 1 && artifact.maxLevel > 1 && !(artifact.levelStats && artifact.levelStats[statName] > 0)) {
            // Если это L1, значение 0, и он не растет с уровнем, тоже можно не показывать
            // Но если он растет, то "Stat: +0" на L1 может быть информативно.
            // Простое правило "не показывать 0" может быть достаточным.
            // Ваша предыдущая логика была: if (valueAtLvl1 === 0) return null;
            // и if (totalValue === 0) return null;
            // Давайте оставим это простое правило:
        }
         if (statValue === 0 && !Number.isNaN(statValue)) return null; // Не показываем нулевые значения

        const displayName = getStatDisplayName(statName);
        return (
            <p key={`${statName}-L${displayLevel}`}>
                {displayName}: +{formatStat(displayName, statValue)}
            </p>
        );
    }).filter(Boolean); // Удаляем null элементы

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="popup-content artifact-popup" onClick={(e) => e.stopPropagation()}>
                <button className="popup-close-x" onClick={onClose}>&times;</button>
                <div className={`popup-rarity-badge rarity-${artifact.rarity ?? 'common'}`}>
                    {artifact.rarity?.toUpperCase() ?? 'COMMON'}
                </div>
                <h3 className="popup-title">{artifact.name}</h3>
                <div className={`popup-icon-area rarity-${artifact.rarity ?? 'common'}`}>
                    <img src={artifact.icon} alt={artifact.name} className="popup-icon" />
                </div>
                <div className="popup-details-area">
                    <p className="artifact-description">{artifact.description || "Нет описания."}</p>
                    <div className="artifact-level-section">
                        {isOwnedAndActive && !isMaxLevel && <h4>Уровень {currentLevel} / {artifact.maxLevel}</h4>}
                        {isMaxLevel && (
                            <>
                                <h4>Уровень {currentLevel} / {artifact.maxLevel}</h4>
                                <p className="max-level-text">Максимальный уровень</p>
                                <p className="shard-count">Осколки: {currentShards}</p>
                            </>
                        )}
                    </div>
                </div>

                <div className="artifact-stats-section">
                    {isOwnedAndActive ? (
                        <div className='stat-group'>
                            <h5>Характеристики (Ур. {currentLevel}):</h5>
                            {renderedStats.length > 0 ? renderedStats : <p>Нет активных характеристик</p>}
                        </div>
                    ) : (
                        <div className='stat-group'>
                            <h5>Характеристики (Ур. 1):</h5>
                            {renderedStats.length > 0 ? renderedStats : <p>Нет базовых характеристик</p>}
                        </div>
                    )}
                </div>

                <div className="popup-buttons artifact-upgrade-area">
                    {!isOwnedAndActive && (
                        <button
                            className="button-activate"
                            onClick={handleActivateClick}
                            disabled={!canActivate}
                            title={!canActivate ? `Нужно еще ${shardsNeededForActivation - currentShards} осколков` : `Активировать за ${shardsNeededForActivation} осколков`}
                        >
                            Активировать ({currentShards} / {shardsNeededForActivation})
                        </button>
                    )}
                    {isOwnedAndActive && !isMaxLevel && (
                        <button
                            className="button-upgrade"
                            onClick={handleUpgradeClick}
                            disabled={!canUpgrade}
                            title={!canUpgrade ? `Нужно еще ${shardsNeededForNextLevel - currentShards} осколков` : `Улучшить до ур. ${currentLevel + 1} за ${shardsNeededForNextLevel} осколков`}
                        >
                            Улучшить ({currentShards} / {shardsNeededForNextLevel})
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ArtifactPopup;