// src/context/TelegramProvider.jsx
import React, { createContext, useContext, useEffect, useMemo } from "react";

// Контекст остается без изменений
export const TelegramContext = createContext(null);

// Компонент-провайдер
export const TelegramProvider = ({ children }) => {
    const telegram = useMemo(() => window.Telegram?.WebApp, []);

    useEffect(() => {
        if (telegram) {
            try {
                console.log("TelegramProvider: WebApp найден, инициализация...");
                telegram.ready(); // Сообщаем о готовности

                // Запрашиваем фуллскрин
                if (telegram.isVersionAtLeast('8.0')) {
                    telegram.requestFullscreen?.(); // Используем ?. на случай отсутствия метода
                    console.log("TelegramProvider: requestFullscreen() вызван (если доступен).");
                } else {
                    telegram.expand?.(); // Используем ?. на случай отсутствия метода
                    console.log("TelegramProvider: expand() вызван (fallback).");
                }

                // ▼▼▼ ДОБАВЛЯЕМ ЛОГИКУ ОТКЛЮЧЕНИЯ СВАЙПА ЗДЕСЬ ▼▼▼
                if (typeof telegram.disableVerticalSwipes === 'function') {
                    // Пробуем старый/удобный метод, если он есть
                    telegram.disableVerticalSwipes();
                    console.log("TelegramProvider: Отключен вертикальный свайп через disableVerticalSwipes().");
                }
                // Если его нет, пробуем официальный метод postEvent (для TG >= 7.7)
                else if (telegram.isVersionAtLeast('7.7') && typeof telegram.postEvent === 'function') {
                    telegram.postEvent('web_app_setup_swipe_behavior', JSON.stringify({ allow_vertical_swipe: false }));
                    console.log("TelegramProvider: Отключен вертикальный свайп через postEvent('web_app_setup_swipe_behavior').");
                }
                // Если ни один метод не сработал (старая версия ТГ?)
                else {
                    console.warn("TelegramProvider: Не удалось отключить вертикальный свайп (метод не найден).");
                }
                // ▲▲▲-----------------------------------------▲▲▲

                console.log("TelegramProvider: Инициализация завершена.");

            } catch (error) {
                console.error("TelegramProvider: Ошибка при инициализации:", error);
            }
        } else {
             console.log("TelegramProvider: Telegram WebApp не найден при монтировании.");
        }
    }, [telegram]);

    const initData = telegram?.initDataUnsafe || null;

    return (
        // Передаем объект telegram или только initData
        <TelegramContext.Provider value={telegram}>
            {children}
        </TelegramContext.Provider>
    );
};

// Хук для доступа к telegram остается без изменений
export const useTelegram = () => {
    return useContext(TelegramContext);
};

// Пример использования хука в другом компоненте:
// const tg = useTelegram();
// const user = tg?.initDataUnsafe?.user;