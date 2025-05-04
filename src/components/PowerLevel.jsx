// PowerLevel.jsx
import React, { useEffect, useState } from "react";
import useGameStore from "../store/useGameStore";
import "./PowerLevel.scss";

const PowerLevel = () => {
  const powerLevel = useGameStore((state) => state.powerLevel);
  const [displayedPower, setDisplayedPower] = useState(powerLevel);

  useEffect(() => {
    // Синхронизируем с длительностью из PowerChangePopup
    // Убедись, что это то же значение, что и numberAnimationDuration в PowerChangePopup
    const DURATION_MS = 1500; // Например, 1500 мс (1.5 секунды)

    // Важно! Используем Math.abs, чтобы избежать проблем с отрицательным diff
    const diff = powerLevel - displayedPower;

    // Запускаем анимацию только если есть разница
    if (diff !== 0) {
        const stepTime = 20;
        const steps = Math.max(1, DURATION_MS / stepTime); // Хотя бы 1 шаг
        const increment = diff / steps;

        let current = displayedPower;
        let step = 0;
        let interval = null; // Объявляем interval здесь

        // Очищаем предыдущий интервал, если он был (на случай быстрых изменений powerLevel)
        // Этого не было в твоем коде, но это хорошая практика
        // Нужен useRef для хранения ID интервала между рендерами
        // --- Начало доработки с useRef (опционально, но лучше) ---
        // const intervalRef = useRef(null);
        // if (intervalRef.current) {
        //    clearInterval(intervalRef.current);
        // }
        // --- Конец доработки ---

        interval = setInterval(() => { // Присваиваем ID
            step++;
            current += increment;
            const newDisplayed = (increment > 0)
                ? Math.min(powerLevel, Math.round(current)) // Не превышаем цель при увеличении
                : Math.max(powerLevel, Math.round(current)); // Не опускаемся ниже цели при уменьшении

            setDisplayedPower(newDisplayed);

            if (step >= steps) {
                clearInterval(interval);
                setDisplayedPower(powerLevel); // Устанавливаем точное значение в конце
                // intervalRef.current = null; // Сбрасываем ref
            }
        }, stepTime);

        // intervalRef.current = interval; // Сохраняем ID в ref

        // Очистка при размонтировании или изменении powerLevel
        return () => {
             if (interval) clearInterval(interval);
             // if(intervalRef.current) clearInterval(intervalRef.current);
        };

    } else {
         // Если разницы нет, просто убедимся, что отображается актуальное значение
         // (на случай если начальная инициализация не сработала идеально)
         if (displayedPower !== powerLevel) {
             setDisplayedPower(powerLevel);
         }
    }

// Убрали displayedPower из зависимостей, чтобы не было зацикливания
}, [powerLevel]);

  return (
    <div className="power-level-wrapper">
      <div className="power-level-value">
        Power Level: {displayedPower}
      </div>
    </div>
  );
};

export default PowerLevel;
