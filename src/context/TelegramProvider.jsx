// src/context/TelegramProvider.jsx (НОВЫЙ ФАЙЛ)
import React, { createContext, useContext, useEffect, useMemo } from "react";

// Создаем контекст (хранит initData или весь объект tg)
// Давайте хранить весь объект tg для большей гибкости
export const TelegramContext = createContext(null);

// Компонент-провайдер
export const TelegramProvider = ({ children }) => {
    // Получаем объект WebApp один раз при помощи useMemo
    const telegram = useMemo(() => window.Telegram?.WebApp, []);

    useEffect(() => {
        // Этот эффект выполнится один раз после монтирования компонента
        if (telegram) {
            try {
                console.log("TelegramProvider: WebApp найден, инициализация...");
                // Сообщаем о готовности
                telegram.ready();

                // Пытаемся запросить фуллскрин (используем requestFullscreen, т.к. он в примере)
                // Если хотите использовать expand, замените строку ниже
                if (telegram.isVersionAtLeast('8.0')) { // Проверка версии на всякий случай
                   telegram.requestFullscreen();
                   console.log("TelegramProvider: requestFullscreen() вызван.");
                } else {
                   telegram.expand(); // Fallback для старых версий
                   console.log("TelegramProvider: expand() вызван (fallback).");
                }

                // Отключаем вертикальный свайп для закрытия (опционально)
                // telegram.disableVerticalSwipes();
                // console.log("TelegramProvider: vertical swipes disabled.");

                console.log("TelegramProvider: Инициализация завершена.");

            } catch (error) {
                console.error("TelegramProvider: Ошибка при инициализации:", error);
            }
        } else {
             console.log("TelegramProvider: Telegram WebApp не найден при монтировании.");
        }
    }, [telegram]); // Зависимость от объекта telegram (он не меняется)

    return (
        // Передаем сам объект telegram через контекст
        // (или только telegram.initDataUnsafe, если нужно)
        <TelegramContext.Provider value={telegram}>
            {children}
        </TelegramContext.Provider>
    );
};

// Кастомный хук для доступа к объекту telegram
export const useTelegram = () => {
    return useContext(TelegramContext);
};

// Пример использования хука в другом компоненте:
// const tg = useTelegram();
// const user = tg?.initDataUnsafe?.user;