// src/data/trialsData.js
export const TRIAL_VERIFICATION_TYPE = {
    BUTTON_CONFIRM: 'button_confirm', // Пользователь нажимает "Я выполнил", затем "Claim"
    // API_CALLBACK: 'api_callback', // Для будущей серверной проверки
};

const trials = [
    {
        id: 'subscribe_main_channel',
        name: 'Follow our Telegram channel', // Название как в примере
        description: 'Подпишитесь на наш основной Telegram канал, чтобы быть в курсе всех новостей и обновлений! Это поможет нам развиваться.',
        reward: { type: 'toncoin_shards', amount: 25, icon: '💎' }, // Пример награды
        actionTextDefault: 'Join', // Текст на кнопке до выполнения действия
        actionTextClaim: 'Claim',     // Текст на кнопке после выполнения (до получения награды)
        actionUrl: 'https://t.me/YourGameChannel', // Замените на реальную ссылку
        verificationType: TRIAL_VERIFICATION_TYPE.BUTTON_CONFIRM,
    },
     {
        id: 'subscribe_main_channel',
        name: 'Follow our Telegram channel', // Название как в примере
        description: 'Подпишитесь на наш основной Telegram канал, чтобы быть в курсе всех новостей и обновлений! Это поможет нам развиваться.',
        reward: { type: 'toncoin_shards', amount: 25, icon: '💎' }, // Пример награды
        actionTextDefault: 'Join', // Текст на кнопке до выполнения действия
        actionTextClaim: 'Claim',     // Текст на кнопке после выполнения (до получения награды)
        actionUrl: 'https://t.me/YourGameChannel', // Замените на реальную ссылку
        verificationType: TRIAL_VERIFICATION_TYPE.BUTTON_CONFIRM,
    },
     {
        id: 'subscribe_main_channel',
        name: 'Follow our Telegram channel', // Название как в примере
        description: 'Подпишитесь на наш основной Telegram канал, чтобы быть в курсе всех новостей и обновлений! Это поможет нам развиваться.',
        reward: { type: 'toncoin_shards', amount: 25, icon: '💎' }, // Пример награды
        actionTextDefault: 'Join', // Текст на кнопке до выполнения действия
        actionTextClaim: 'Claim',     // Текст на кнопке после выполнения (до получения награды)
        actionUrl: 'https://t.me/YourGameChannel', // Замените на реальную ссылку
        verificationType: TRIAL_VERIFICATION_TYPE.BUTTON_CONFIRM,
    },
    {
        id: 'join_community_chat',
        name: 'Join our Community Chat',
        description: 'Присоединяйтесь к нашему игровому чату для общения с другими игроками, обмена опытом и поиска друзей в игре.',
        reward: { type: 'rareChestKeys', amount: 1, icon: '🔑' },
        actionTextDefault: 'Join',
        actionTextClaim: 'Claim',
        actionUrl: 'https://t.me/YourGameChat', 
        verificationType: TRIAL_VERIFICATION_TYPE.BUTTON_CONFIRM,
    },
    {
        id: 'boost_channel',
        name: 'Boost our Telegram channel',
        description: 'Поддержите наш канал бустом! Это очень поможет в продвижении.',
        reward: { type: 'epicChestKeys', amount: 1, icon: '🗝️' }, // Другой ключ для примера
        actionTextDefault: 'Boost',
        actionTextClaim: 'Claim',
        actionUrl: 'https://t.me/YourGameChannel?boost', // Пример ссылки для буста
        verificationType: TRIAL_VERIFICATION_TYPE.BUTTON_CONFIRM,
    }
];

export default trials;