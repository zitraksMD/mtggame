// src/components/ChestInfoPopup.jsx
import React, { useMemo } from 'react';
import './ChestInfoPopup.scss'; // Подключаем стили
import { motion, AnimatePresence } from 'framer-motion';

// <<< Импорты для расчетов шансов артефактов >>>
import { ARTIFACT_SETS } from '../../data/artifactsData.js'; // Импортируем сеты артефактов

// <<< Веса для выбора артефакта ПО РЕДКОСТИ >>>
// !!! ЛУЧШЕ ВЫНЕСТИ В ОБЩИЙ ФАЙЛ КОНСТАНТ И ИМПОРТИРОВАТЬ !!!
// Например, import { RARITY_WEIGHTS } from '../config/constants';
const RARITY_WEIGHTS = {
    common: 100,
    uncommon: 50, // Если есть
    rare: 25,
    epic: 15, // Добавим для примера, если вдруг появится 'epic' в данных артефактов
    legendary: 8,
    mythic: 2
};
// --- КОНЕЦ ВЕСОВ ---

// --- Хелперы (Основа из "Кода 2") ---

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
        // Если в сете нет артефактов, возвращаем только базовые шансы
        return {
            gold: typeChances['gold'] || 0,
            diamonds: typeChances['diamonds'] || 0
        };
    }

    // 3. Считаем УСЛОВНЫЕ шансы редкости ВНУТРИ этого сета
    const rarityConditionalChances = {};
    const weightedPool = artifactsInSet.map(artifact => ({
        rarity: artifact.rarity.toLowerCase(),
        // Убедимся, что вес берется из RARITY_WEIGHTS, иначе ставим 1
        weight: RARITY_WEIGHTS[artifact.rarity.toLowerCase()] || 1
    }));
    const totalRarityWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);

    if (totalRarityWeight > 0) {
        // Используем Object.keys(RARITY_WEIGHTS), чтобы сохранить порядок редкостей
        Object.keys(RARITY_WEIGHTS).forEach(rarityKey => {
            // Суммируем веса всех артефактов *этой* редкости в сете
            const weightSumForRarity = weightedPool
                .filter(a => a.rarity === rarityKey)
                .reduce((sum, item) => sum + item.weight, 0);
            if (weightSumForRarity > 0) {
                rarityConditionalChances[rarityKey] = weightSumForRarity / totalRarityWeight;
            }
        });
    } else { // Fallback: равные шансы, если веса не заданы или все нулевые
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
        if (conditionalChance > 0) { // Добавляем только если шанс есть для этой редкости в сете
            if (shardTypeChance > 0) finalChances[`shard_${rarityKey}`] = shardTypeChance * conditionalChance;
            if (fullArtifactTypeChance > 0) finalChances[`full_${rarityKey}`] = fullArtifactTypeChance * conditionalChance;
        }
    });

    return finalChances;
};

// Хелпер для определения, является ли ключ редкостью (для gear)
const isGearKey = (key) => ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].includes(key.toLowerCase()); // Добавил toLowerCase для надежности

// Хелпер для красивых названий
const getPrettyName = (key) => {
    const lowerKey = key.toLowerCase(); // Работаем с нижним регистром для унификации
    const parts = lowerKey.split('_');
    const typeOrRarity = parts[0];
    // Берем последний элемент как редкость, если есть '_'
    const rarity = parts.length > 1 ? parts[parts.length - 1] : null;

    // Простые типы
    if (typeOrRarity === 'gold') return 'Золото';
    if (typeOrRarity === 'diamonds') return 'Алмазы';

    let typeName = '';
    let rarityName = '';

    // Определяем тип (для артефактов)
    if (typeOrRarity === 'shard') typeName = 'Осколок арт.';
    if (typeOrRarity === 'full') typeName = 'Артефакт';

    // Определяем редкость (используем rarity или typeOrRarity для gear)
    const rarityKey = rarity || (isGearKey(lowerKey) ? lowerKey : null); // Используем уже проверенный lowerKey
    switch (rarityKey) {
        case 'common': rarityName = 'Common'; break;
        case 'uncommon': rarityName = 'Uncommon'; break;
        case 'rare': rarityName = 'Rare'; break;
        case 'epic': rarityName = 'Epic'; break;
        case 'legendary': rarityName = 'Legendary'; break;
        case 'mythic': rarityName = 'Mythic'; break;
        default: break; // Нет имени для редкости
    }

    // Собираем строку
    if (typeName && rarityName) return `${typeName} ${rarityName}`;
    if (rarityName) return `Предмет ${rarityName}`; // Для чистого шанса редкости (снаряжение)
    return key; // Fallback - возвращаем исходный ключ, если ничего не подошло
};


// --- Основной компонент ---
const ChestInfoPopup = ({ chestData, onClose }) => {

    // Определяем тип сундука (Логика из "Кода 2")
    const isGearChest = !!chestData.rarityChances;
    const isArtifactChest = !!chestData.rewardPool;

    // Вычисляем шансы с помощью useMemo (Логика из "Кода 2")
    const chances = useMemo(() => {
        if (isGearChest) {
            return chestData.rarityChances;
        } else if (isArtifactChest) {
            return calculateDetailedArtifactChances(chestData);
        } else {
            // Fallback для других типов или просто фиксированных наград
            return chestData.rewards || {};
        }
    }, [chestData, isGearChest, isArtifactChest]);

    // Сортируем шансы для отображения (Логика из "Кода 2")
    const sortedChanceEntries = useMemo(() => {
        // Желаемый порядок отображения (все ключи в нижнем регистре!)
        const order = [
            'gold', 'diamonds',
            'shard_common', 'shard_uncommon', 'shard_rare', 'shard_epic', 'shard_legendary', 'shard_mythic',
            'full_common', 'full_uncommon', 'full_rare', 'full_epic', 'full_legendary', 'full_mythic',
            // Редкости для снаряжения в конце и в правильном порядке
            'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'
         ];
        return Object.entries(chances)
            .filter(([, chance]) => chance > 0.000001) // Отсеиваем нулевые или слишком малые шансы
            .sort(([keyA], [keyB]) => {
                const lowerKeyA = keyA.toLowerCase(); // Приводим к нижнему регистру для поиска в order
                const lowerKeyB = keyB.toLowerCase();
                const indexA = order.indexOf(lowerKeyA);
                const indexB = order.indexOf(lowerKeyB);

                if (indexA !== -1 && indexB !== -1) return indexA - indexB; // Оба ключа есть в order, сортируем по нему
                if (indexA !== -1) return -1; // Только A есть в order, он идет раньше
                if (indexB !== -1) return 1;  // Только B есть в order, он идет раньше
                return keyA.localeCompare(keyB); // Ни одного ключа нет в order, сортируем по алфавиту
            });
    }, [chances]);

    // --- JSX структура и рендеринг списка взяты из "Кода 1", pity блок добавлен ---
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
                    {/* --- Хедер с названием и крестиком (из Кода 1) --- */}
                    <div className="info-popup-header">
                        <h4>{chestData.name}</h4>
                        <button className="popup-close-icon" onClick={onClose} aria-label="Закрыть">&times;</button>
                    </div>

                    {/* --- Основной контент со скроллом (из Кода 1) --- */}
                    <div className="info-popup-body">
                        <div className="info-popup-section">
                            <h4>Шансы выпадения:</h4>
                            <ul className="info-popup-chances-list">
                                {sortedChanceEntries.length > 0 ? (
                                    sortedChanceEntries.map(([key, chance]) => {
                                        // Определяем ключ редкости для стилизации цветом (из Кода 1, с toLowerCase)
                                        const lowerKey = key.toLowerCase();
                                        const rarityKey = lowerKey.includes('_')
                                            ? lowerKey.split('_').pop() // Берем последнюю часть ('rare', 'legendary'...)
                                            : (isGearKey(lowerKey) ? lowerKey : 'default'); // Используем ключ как есть, если это ключ редкости, иначе 'default'

                                        return (
                                            <li key={key}>
                                                {/* Используем getPrettyName для названия и rarityKey для класса */}
                                                <span className={`chance-label rarity-${rarityKey}`}>{getPrettyName(key)}:</span>
                                                <span className="chance-value">{formatPercent(chance)}</span>
                                            </li>
                                        );
                                    })
                                ) : (
                                    <li>Нет данных о шансах для этого сундука.</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ChestInfoPopup;