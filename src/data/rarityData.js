// src/components/ChestInfoPopup.jsx
import React, { useMemo } from 'react'; // Добавили useMemo
import './ChestInfoPopup.scss'; // Подключаем твои стили
import { motion, AnimatePresence } from 'framer-motion';

// <<< Импорты для расчетов шансов артефактов >>>
import { ARTIFACT_SETS } from '../data/artifactsData'; // Импортируем сеты артефактов

// <<< Веса для выбора артефакта ПО РЕДКОСТИ >>>
// !!! ЛУЧШЕ ВЫНЕСТИ В ОБЩИЙ ФАЙЛ КОНСТАНТ И ИМПОРТИРОВАТЬ !!!
const RARITY_WEIGHTS = {
    common: 100,
    uncommon: 50, // Если есть
    rare: 25,
    legendary: 8,
    mythic: 2
};
// --- КОНЕЦ НОВОГО ---

// --- Хелперы ---

// Форматирование процентов
const formatPercent = (value) => {
    if (value === undefined || value === null || isNaN(value)) return '0%';
    const percent = value * 100;
    let formatted = percent.toFixed(2);
    if (formatted.endsWith('.00')) formatted = formatted.slice(0, -3);
    else if (formatted.endsWith('0')) formatted = formatted.slice(0, -1);
    // Для очень маленьких шансов можно добавить '< 0.01%'
    if (parseFloat(formatted) === 0 && value > 0) return '< 0.01%';
    return `${formatted}%`;
};

// Конвертация весов пула в проценты (для артефактных типов)
const convertWeightsToPercents = (pool) => {
    if (!pool) return {};
    const totalWeight = pool.reduce((sum, item) => sum + (item.weight || 0), 0);
    if (totalWeight <= 0) return {};
    const chances = {};
    pool.forEach(item => { chances[item.type] = (item.weight || 0) / totalWeight; });
    return chances;
};

// Расчет детальных шансов для артефактного сундука
const calculateDetailedArtifactChances = (chestData) => {
    if (!chestData || !chestData.rewardPool || !chestData.setId) return {};

    // 1. Шансы на ТИП награды
    const typeChances = convertWeightsToPercents(chestData.rewardPool);
    const shardTypeChance = typeChances['artifact_shard'] || 0;
    const fullArtifactTypeChance = typeChances['full_artifact'] || 0;

    // 2. Получаем артефакты в сете
    const targetSet = ARTIFACT_SETS.find(s => s.id === chestData.setId);
    const artifactsInSet = targetSet?.artifacts || [];
    if (artifactsInSet.length === 0) {
        return { gold: typeChances['gold'] || 0, diamonds: typeChances['diamonds'] || 0 };
    }

    // 3. Считаем УСЛОВНЫЕ шансы редкости ВНУТРИ этого сета
    const rarityConditionalChances = {};
    const weightedPool = artifactsInSet.map(artifact => ({
        rarity: artifact.rarity.toLowerCase(),
        weight: RARITY_WEIGHTS[artifact.rarity.toLowerCase()] || 1
    }));
    const totalRarityWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);

    if (totalRarityWeight > 0) {
        // Используем Object.keys для итерации по RARITY_WEIGHTS, чтобы сохранить порядок
        Object.keys(RARITY_WEIGHTS).forEach(rarityKey => {
            const weightSumForRarity = weightedPool
                .filter(a => a.rarity === rarityKey)
                .reduce((sum, item) => sum + item.weight, 0);
            if (weightSumForRarity > 0) {
                rarityConditionalChances[rarityKey] = weightSumForRarity / totalRarityWeight;
            }
        });
    } else { // Fallback: equal chance
        const uniqueRarities = [...new Set(artifactsInSet.map(a => a.rarity.toLowerCase()))];
        if (uniqueRarities.length > 0) {
            uniqueRarities.forEach(r => { rarityConditionalChances[r] = 1 / uniqueRarities.length; });
        }
    }

    // 4. Считаем ИТОГОВЫЕ шансы
    const finalChances = {
        gold: typeChances['gold'] || 0,
        diamonds: typeChances['diamonds'] || 0,
    };
    // Идем по порядку редкости из RARITY_WEIGHTS для красивого вывода
    Object.keys(RARITY_WEIGHTS).forEach(rarityKey => {
        const conditionalChance = rarityConditionalChances[rarityKey];
        if (conditionalChance > 0) { // Добавляем только если шанс есть
            if (shardTypeChance > 0) finalChances[`shard_${rarityKey}`] = shardTypeChance * conditionalChance;
            if (fullArtifactTypeChance > 0) finalChances[`full_${rarityKey}`] = fullArtifactTypeChance * conditionalChance;
        }
    });

    return finalChances;
};

// Хелпер для красивых названий
const getPrettyName = (key) => {
    const parts = key.split('_');
    const typeOrRarity = parts[0];
    const rarity = parts.length > 1 ? parts[parts.length - 1] : null; // Берем последний элемент как редкость

    // Простые типы
    if (typeOrRarity === 'gold') return 'Золото';
    if (typeOrRarity === 'diamonds') return 'Алмазы';

    let typeName = '';
    let rarityName = '';

    // Определяем тип (для артефактов)
    if (typeOrRarity === 'shard') typeName = 'Осколок арт.'; // Сократил
    if (typeOrRarity === 'full') typeName = 'Артефакт'; // Сократил

    // Определяем редкость
    const rarityKey = rarity || (isGearKey(key) ? typeOrRarity : null);
    if (rarityKey === 'common') rarityName = 'обычный';
    if (rarityKey === 'uncommon') rarityName = 'необычный';
    if (rarityKey === 'rare') rarityName = 'редкий';
    if (rarityKey === 'epic') rarityName = 'эпический';
    if (rarityKey === 'legendary') rarityName = 'легендарный';
    if (rarityKey === 'mythic') rarityName = 'мифический';

    // Собираем строку
    if (typeName && rarityName) return `${typeName} ${rarityName}`;
    if (rarityName) return `Предмет ${rarityName}`; // Для чистого шанса редкости (снаряжение)
    return key; // Fallback
};

// Хелпер для определения, является ли ключ редкостью (для gear)
const isGearKey = (key) => ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].includes(key);

// --- Основной компонент ---
const ChestInfoPopup = ({ chestData, onClose }) => {

    // Определяем тип сундука
    const isGearChest = !!chestData.rarityChances;
    const isArtifactChest = !!chestData.rewardPool;

    // Вычисляем шансы с помощью useMemo
    const chances = useMemo(() => {
        if (isGearChest) {
            return chestData.rarityChances;
        } else if (isArtifactChest) {
            return calculateDetailedArtifactChances(chestData);
        } else {
            return {};
        }
    }, [chestData, isGearChest, isArtifactChest]);

    // Сортируем шансы для отображения
    const sortedChanceEntries = useMemo(() => {
        // Желаемый порядок отображения
        const order = ['gold', 'diamonds', 'shard_common', 'shard_uncommon', 'shard_rare', 'shard_epic', 'shard_legendary', 'shard_mythic', 'full_common', 'full_uncommon', 'full_rare', 'full_epic', 'full_legendary', 'full_mythic', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
        return Object.entries(chances)
            .filter(([, chance]) => chance > 0.000001) // Убираем нулевые или очень мелкие шансы
            .sort(([keyA], [keyB]) => {
                const indexA = order.indexOf(keyA);
                const indexB = order.indexOf(keyB);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return keyA.localeCompare(keyB); // Сортировка по алфавиту для неизвестных ключей
            });
    }, [chances]);

    return (
         <AnimatePresence>
             <motion.div
                 className="popup-overlay info-popup-overlay" onClick={onClose}
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             >
                 <motion.div
                     className="popup-content info-popup-content" onClick={(e) => e.stopPropagation()}
                     initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                     transition={{ type: "spring", stiffness: 300, damping: 30 }}
                 >
                     {/* Крестик */}
                     <button className="popup-close-icon" onClick={onClose} aria-label="Закрыть">&times;</button>

                     {/* Заголовок */}
                     <h3>Шансы выпадения: {chestData.name}</h3>

                     {/* Секция с шансами */}
                     <div className="info-popup-section">
                         {/* Заголовок секции */}
                         <h4>{isGearChest ? "Шанс редкости предмета:" : "Шанс награды:"}</h4>

                         <ul className="info-popup-chances-list">
                             {sortedChanceEntries.length > 0 ? (
                                 sortedChanceEntries.map(([key, chance]) => {
                                     // Определяем редкость для класса стилизации
                                     const rarityKey = key.includes('_') ? key.split('_').pop() : (isGearKey(key) ? key : 'default');
                                     return (
                                         <li key={key}>
                                             <span className={`chance-label rarity-${rarityKey}`}>{getPrettyName(key)}:</span>
                                             <span className="chance-value">{formatPercent(chance)}</span>
                                         </li>
                                     );
                                 })
                             ) : (
                                 <li>Нет данных о шансах.</li>
                             )}
                         </ul>

                         {/* Инфо о гаранте */}
                         {chestData.pity && (
                            <p className="info-popup-note pity-note">
                                Гарант(ы): {
                                    (Array.isArray(chestData.pity) ? chestData.pity : [chestData.pity])
                                        .map(p => `${p.rarity} на ${p.limit}-е открытие`) // Упростил текст
                                        .join('; ')
                                }. (Если предмет нужной или более высокой редкости не выпал ранее).
                            </p>
                         )}
                     </div>
                 </motion.div>
             </motion.div>
        </AnimatePresence>
    );
};

export default ChestInfoPopup;