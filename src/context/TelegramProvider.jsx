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

                // Запрашиваем фуллскрин (логика из код2, она более полная)
                if (telegram.isVersionAtLeast('8.0')) { // Используем requestFullscreen для версий 8.0+
                    telegram.requestFullscreen?.(); // Используем ?. на случай отсутствия метода
                    console.log("TelegramProvider: requestFullscreen() вызван (если доступен).");
                } else if (telegram.isVersionAtLeast('6.0')) { // Используем expand для версий 6.0+ если requestFullscreen недоступен
                    telegram.expand?.(); // Используем ?. на случай отсутствия метода
                    console.log("TelegramProvider: expand() вызван (fallback или старая версия).");
                } else {
                     console.log("TelegramProvider: Версия Telegram WebApp ниже 6.0, методы expand/requestFullscreen могут быть недоступны.");
                }

                // ▼▼▼ ИЗМЕНЕНИЯ ИЗ КОД1: Настройка цветов ▼▼▼
                // Настройка цвета фона приложения Telegram, чтобы он соответствовал твоему дизайну
                // или был прозрачным, если это возможно и поддерживается для статус-бара.
                // Telegram обычно использует 'bg_color' для основного фона и 'secondary_bg_color' для акцентов/хедера.

                // Попробуй установить цвет фона Telegram таким же, как фон твоей карты,
                // или максимально темным/нейтральным, если не можешь сделать статус-бар прозрачным.
                // Твой .zone-map-screen имеет background-color: #1c1c2e;
                // Твой .app-container имеет background-color: #000; и фоновое изображение.

                // Попробуем установить основной фон приложения Telegram
                // Это повлияет на фон *за пределами* твоего webview, если он не полностью расширен,
                // а также может влиять на цвет шапки, если он наследуется.
                telegram.setBackgroundColor?.('#000000'); // Черный, как у app-container
                // или telegram.setBackgroundColor?.('#1c1c2e'); // Цвет фона ZoneMap

                // Попробуем установить цвет хедера (который может включать статус-бар)
                // 'bg_color' и 'secondary_bg_color' могут быть предопределенными цветами темы Telegram.
                // Ты можешь попытаться установить их на нужный тебе цвет, если это возможно.
                // WebApp.setHeaderColor('secondary_bg_color'); // Использует цвет из темы Telegram
                // ИЛИ попробуй установить конкретный цвет:
                telegram.setHeaderColor?.('#000000'); // Попробуй черный для хедера
                // или telegram.setHeaderColor?.('#1c1c2e');

                // Идеально, если бы можно было сделать статус-бар прозрачным,
                // чтобы фон .app-container был виден сквозь него.
                // Это может потребовать более специфичных настроек themeParams,
                // если Telegram API это вообще позволяет для статус-бара (не только для хедера).
                // Например, если бы параметр назывался 'status_bar_bg_color':
                // telegram.themeParams.status_bar_bg_color = '#00000000'; // (Это гипотетический параметр)
                // Или если бы setHeaderColor принимал прозрачность:
                // telegram.setHeaderColor?.('#001c1c2e'); // ARGB, но не факт, что сработает

                console.log("TelegramProvider: Попытка установить цвета фона и хедера.");
                // ▲▲▲ КОНЕЦ ИЗМЕНЕНИЙ ИЗ КОД1 ▲▲▲

                // ▼▼▼ ЛОГИКА ОТКЛЮЧЕНИЯ СВАЙПА (из код2) ▼▼▼
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