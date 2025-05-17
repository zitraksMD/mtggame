// src/context/TelegramProvider.jsx
import React, { createContext, useContext, useEffect, useMemo } from "react";
import useGameStore from "../store/useGameStore"; // Добавлено из код1

// Контекст остается без изменений
export const TelegramContext = createContext(null);

// Компонент-провайдер
export const TelegramProvider = ({ children }) => {
    const telegram = useMemo(() => window.Telegram?.WebApp, []);
    // Получаем action из стора (из код1)
    const initializeUserFromTelegram = useGameStore((state) => state.initializeUserFromTelegram);

    useEffect(() => {
        if (telegram) {
            try {
                console.log("TelegramProvider: WebApp найден, инициализация...");
                telegram.ready(); // Сообщаем о готовности

                // --- Инициализация данных пользователя из Telegram (из код1) ---
                if (initializeUserFromTelegram) {
                    // Передаем весь объект user, если он есть.
                    // Внутри initializeUserFromTelegram в сторе мы возьмем только photo_url.
                    const userDataFromTG = telegram.initDataUnsafe?.user;
                    if (userDataFromTG) {
                        console.log("TelegramProvider: UserData from TG being passed to store:", userDataFromTG);
                        initializeUserFromTelegram(userDataFromTG);
                    } else {
                        console.warn("TelegramProvider: telegram.initDataUnsafe.user не найден.");
                        initializeUserFromTelegram(null); // Передаем null, чтобы стор мог сбросить photo_url
                    }
                }
                // --- Конец инициализации пользователя ---

                // Запрашиваем фуллскрин (логика из код2)
                if (telegram.isVersionAtLeast?.('8.0')) { // Используем isVersionAtLeast с проверкой на существование
                    telegram.requestFullscreen?.();
                    console.log("TelegramProvider: requestFullscreen() вызван (если доступен).");
                } else if (telegram.isVersionAtLeast?.('6.0')) {
                    telegram.expand?.();
                    console.log("TelegramProvider: expand() вызван (fallback или старая версия).");
                } else {
                    console.log("TelegramProvider: Версия Telegram WebApp ниже 6.0, методы expand/requestFullscreen могут быть недоступны.");
                }

                // Настройка цветов (из код2, комментарии сохранены для контекста)
                // Попробуем установить основной фон приложения Telegram
                telegram.setBackgroundColor?.('#000000'); // Черный, как у app-container
                // telegram.setBackgroundColor?.('#1c1c2e'); // Цвет фона ZoneMap

                // Попробуем установить цвет хедера
                telegram.setHeaderColor?.('#000000'); // Попробуй черный для хедера
                // telegram.setHeaderColor?.('#1c1c2e');
                console.log("TelegramProvider: Попытка установить цвета фона и хедера.");

                // Логика отключения свайпа (из код2)
                if (typeof telegram.disableVerticalSwipes === 'function') {
                    telegram.disableVerticalSwipes();
                    console.log("TelegramProvider: Отключен вертикальный свайп через disableVerticalSwipes().");
                }
                // Если его нет, пробуем официальный метод postEvent (для TG >= 7.7)
                else if (telegram.isVersionAtLeast?.('7.7') && typeof telegram.postEvent === 'function') {
                    telegram.postEvent('web_app_setup_swipe_behavior', JSON.stringify({ allow_vertical_swipe: false }));
                    console.log("TelegramProvider: Отключен вертикальный свайп через postEvent('web_app_setup_swipe_behavior').");
                }
                else {
                    console.warn("TelegramProvider: Не удалось отключить вертикальный свайп (метод не найден).");
                }

                console.log("TelegramProvider: Инициализация завершена.");

            } catch (error) {
                console.error("TelegramProvider: Ошибка при инициализации:", error);
                // Добавлено из код1: На случай ошибки, сбрасываем данные пользователя в сторе
                if (initializeUserFromTelegram) {
                    initializeUserFromTelegram(null);
                }
            }
        } else {
            console.log("TelegramProvider: Telegram WebApp не найден при монтировании.");
            // Добавлено из код1: Если WebApp не найден, также сбрасываем данные в сторе
            if (initializeUserFromTelegram) {
                initializeUserFromTelegram(null);
            }
        }
    // Зависимость initializeUserFromTelegram добавлена из код1
    }, [telegram, initializeUserFromTelegram]);

    // const initData = telegram?.initDataUnsafe || null; // Эта строка из код2 не конфликтует, но данные пользователя теперь идут через стор.
                                                        // Оставляем ее, если telegram объект целиком передается в value.

    return (
        // Передаем объект telegram, как и было в обоих вариантах
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
// const user = tg?.initDataUnsafe?.user; // Можно по-прежнему получить так,
                                       // но для photo_url лучше использовать данные из useGameStore,
                                       // так как они централизованы и проходят через initializeUserFromTelegram.