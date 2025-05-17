// src/components/ArtifactPopup.jsx
import React from 'react';
import useGameStore from '../../store/useGameStore.js'; // Путь к стору
import './ArtifactPopup.scss'; // Подключаем стили

// Хелпер для форматирования статов (без изменений)
const formatStat = (statName, value) => {
    if (value === undefined || value === null) return 'N/A';
    if (statName.toLowerCase().includes('%')) {
        const formatted = value.toFixed(1);
        return formatted.endsWith('.0') ? `${Math.round(value)}%` : `${formatted}%`;
    }
    if (Number.isInteger(value)) {
        return value;
    }
    const formatted = value.toFixed(1);
    return formatted.endsWith('.0') ? `${Math.round(value)}` : formatted;
};

// --- ИЗМЕНЕНО: Принимаем onPowerChange в пропсах ---
const ArtifactPopup = ({ artifact, onClose, onPowerChange }) => {
    // --- Получаем динамические данные из стора ---
    // <<< ИЗМЕНЕНО: Убираем activateArtifact, upgradeArtifact отсюда, будем брать напрямую из useGameStore.getState() в обработчиках >>>
    const artifactLevels = useGameStore(state => state.artifactLevels);
    // <<< Можно получать totalPower здесь, если нужно для отображения ДО действия, но для расчета ДО/ПОСЛЕ лучше брать getState() в момент действия >>>

    // --- Определяем состояние артефакта (без изменений) ---
    const artifactState = artifactLevels[artifact.id] || { level: 0, shards: 0 };
    const currentLevel = artifactState.level;
    const currentShards = artifactState.shards;
    const isOwnedAndActive = currentLevel > 0;
    const isMaxLevel = isOwnedAndActive && currentLevel >= artifact.maxLevel;

    // --- Расчеты для кнопок (без изменений) ---
    const shardsNeededForActivation = (0 + 1) * (artifact.baseShardCost || 10);
    const canActivate = !isOwnedAndActive && currentShards >= shardsNeededForActivation;

    const shardsNeededForNextLevel = isMaxLevel ? 0 : (currentLevel + 1) * (artifact.baseShardCost || 10);
    const canUpgrade = isOwnedAndActive && !isMaxLevel && currentShards >= shardsNeededForNextLevel;

    // --- Функция расчета статов (без изменений) ---
    const calculateStatValue = (baseValue = 0, levelValue = 0, level) => {
        const effectiveLevel = Math.max(0, level);
        return baseValue + (levelValue * effectiveLevel);
    };

    // --- ИЗМЕНЕНО: Обработчик АКТИВАЦИИ с вызовом onPowerChange ---
    const handleActivateClick = () => {
        if (!canActivate) return;

        // Получаем actions и нужные данные напрямую из стора в момент клика
        const { activateArtifact, totalPower } = useGameStore.getState();
        const oldPower = totalPower; // Запоминаем старую силу

        console.log('[ArtifactPopup] Активация. Старая сила:', oldPower); // Лог 1 (Активация)

        // Вызов action стора
        activateArtifact(artifact.id);

        // Используем setTimeout для получения нового значения силы
        setTimeout(() => {
            const newPower = useGameStore.getState().totalPower; // Получаем новую силу
            console.log('[ArtifactPopup] Активация. Новая сила:', newPower); // Лог 2 (Активация)

            // Вызываем callback, если он передан и сила изменилась
            if (typeof onPowerChange === 'function' && oldPower !== newPower) {
                 console.log('[ArtifactPopup] Активация. Вызов onPowerChange с:', { oldPower, newPower }); // Лог 3 (Активация)
                 onPowerChange(oldPower, newPower);
            } else {
                 console.log('[ArtifactPopup] Активация. onPowerChange НЕ вызван. Функция:', typeof onPowerChange, 'Значения равны:', oldPower === newPower); // Лог 4 (Активация)
            }

            onClose(); // Закрываем попап в любом случае после действия
        }, 50); // Задержка для обновления стора
    };

    // --- ИЗМЕНЕНО: Обработчик УЛУЧШЕНИЯ с вызовом onPowerChange ---
    // <<< Убрали параметр artifactId, используем artifact.id из пропсов >>>
    const handleUpgradeClick = () => {
        if (!canUpgrade) return;

        // Получаем actions и нужные данные напрямую из стора в момент клика
        const { upgradeArtifact, totalPower } = useGameStore.getState();
        const oldPower = totalPower; // Запоминаем старую силу

        console.log('[ArtifactPopup] Улучшение. Старая сила:', oldPower); // Лог 1 (Улучшение)

        // Вызов action стора с правильным ID из пропса artifact
        upgradeArtifact(artifact.id); // <<< Используем artifact.id

        // Используем setTimeout для получения нового значения силы
        setTimeout(() => {
            const newPower = useGameStore.getState().totalPower; // Получаем новую силу
            console.log('[ArtifactPopup] Улучшение. Новая сила:', newPower); // Лог 2 (Улучшение)

            // Вызываем callback, если он передан и сила изменилась
            // <<< Используем переменную onPowerChange из пропсов >>>
            if (typeof onPowerChange === 'function' && oldPower !== newPower) {
                 console.log('[ArtifactPopup] Улучшение. Вызов onPowerChange с:', { oldPower, newPower }); // Лог 3 (Улучшение)
                 onPowerChange(oldPower, newPower);
            } else {
                 console.log('[ArtifactPopup] Улучшение. onPowerChange НЕ вызван. Функция:', typeof onPowerChange, 'Значения равны:', oldPower === newPower); // Лог 4 (Улучшение)
            }

            onClose(); // Закрываем попап в любом случае после действия
        }, 50); // Задержка для обновления стора
    };

    // --- Рендер Попапа (без изменений в структуре JSX, только обработчики кнопок другие) ---
    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="popup-content artifact-popup" onClick={(e) => e.stopPropagation()}>
                {/* Кнопка закрытия */}
                <button className="popup-close-x" onClick={onClose}>&times;</button>

                {/* Значок редкости в углу */}
                <div className={`popup-rarity-badge rarity-${artifact.rarity ?? 'common'}`}>
                    {artifact.rarity?.toUpperCase() ?? 'COMMON'}
                </div>

                {/* Название */}
                <h3 className="popup-title">{artifact.name}</h3>

                {/* Иконка артефакта */}
                <div className={`popup-icon-area rarity-${artifact.rarity ?? 'common'}`}>
                    <img src={artifact.icon} alt={artifact.name} className="popup-icon" />
                </div>

                {/* Описание и секция уровня/активации */}
                <div className="popup-details-area">
                    <p className="artifact-description">{artifact.description || "Нет описания."}</p>
                    <div className="artifact-level-section">
                        {/* Условный рендеринг уровня/активации */}
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

                {/* Секция Статов */}
                <div className="artifact-stats-section">
                    {isOwnedAndActive ? ( // Статы ТЕКУЩЕГО УРОВНЯ (если активен)
                        <div className='stat-group'>
                            <h5>Характеристики (Ур. {currentLevel}):</h5>
                            {Object.keys(artifact.baseStats || {}).length === 0 && Object.keys(artifact.levelStats || {}).length === 0 && <p>Нет характеристик</p>}
                            {Object.entries({ ...(artifact.baseStats || {}), ...(artifact.levelStats || {}) }).map(([statName]) => {
                                const baseValue = artifact.baseStats?.[statName] || 0;
                                const levelValue = artifact.levelStats?.[statName] || 0;
                                const totalValue = calculateStatValue(baseValue, levelValue, currentLevel);
                                if (totalValue === 0) return null;
                                return (
                                    <p key={`total-${statName}`}>
                                        {statName}: +{formatStat(statName, totalValue)}
                                    </p>
                                );
                            })}
                        </div>
                    ) : ( // Статы для УРОВНЯ 1 (если НЕ активен)
                        <div className='stat-group'>
                             <h5>Характеристики (Ур. 1):</h5>
                             {Object.keys(artifact.baseStats || {}).length === 0 && Object.keys(artifact.levelStats || {}).length === 0 && <p>Нет характеристик</p>}
                             {Object.entries({ ...(artifact.baseStats || {}), ...(artifact.levelStats || {}) }).map(([statName]) => {
                                 const baseValue = artifact.baseStats?.[statName] || 0;
                                 const levelValue = artifact.levelStats?.[statName] || 0;
                                 const valueAtLvl1 = calculateStatValue(baseValue, levelValue, 1);
                                 if (valueAtLvl1 === 0) return null;
                                 return (
                                     <p key={`base-inactive-${statName}`}>
                                         {statName}: +{formatStat(statName, valueAtLvl1)}
                                     </p>
                                 );
                             })}
                        </div>
                    )}
                </div>

                 {/* Кнопка Активации / Улучшения */}
                 <div className="popup-buttons artifact-upgrade-area">
                       {!isOwnedAndActive && (
                           <button
                               className="button-activate"
                               onClick={handleActivateClick} // <<< Вызывает обновленный обработчик
                               disabled={!canActivate}
                               title={!canActivate ? `Нужно еще ${shardsNeededForActivation - currentShards} осколков` : `Активировать за ${shardsNeededForActivation} осколков`}
                           >
                               Активировать ({currentShards} / {shardsNeededForActivation})
                           </button>
                       )}
                       {isOwnedAndActive && !isMaxLevel && (
                           <button
                               className="button-upgrade"
                               onClick={handleUpgradeClick} // <<< Вызывает обновленный обработчик
                               disabled={!canUpgrade}
                               title={!canUpgrade ? `Нужно еще ${shardsNeededForNextLevel - currentShards} осколков` : `Улучшить до ур. ${currentLevel + 1} за ${shardsNeededForNextLevel} осколков`}
                           >
                               Улучшить ({currentShards} / {shardsNeededForNextLevel})
                           </button>
                       )}
                 </div>

            </div> {/* Конец popup-content */}
        </div> // Конец popup-overlay
    );
};

export default ArtifactPopup;