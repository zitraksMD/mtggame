// src/data/trialsData.js
export const TRIAL_VERIFICATION_TYPE = {
    BUTTON_CONFIRM: 'button_confirm', // Пользователь нажимает "Я выполнил"
    // API_CALLBACK: 'api_callback', // Если будет внешняя проверка
    // NONE: 'none' // Для заданий без явной награды или с авто-наградой
};

const trials = [
    {
        id: 'subscribe_main_channel',
        name: 'Подписка на Канал',
        description: 'Подпишитесь на наш основной Telegram канал, чтобы быть в курсе всех новостей и обновлений!',
        icon: '📢',
        actionText: 'Подписаться',
        actionUrl: 'https://t.me/YourGameChannel', // Замените на реальную ссылку
        verificationType: TRIAL_VERIFICATION_TYPE.BUTTON_CONFIRM, // Пользователь должен будет подтвердить
        reward: { gold: 500, diamonds: 10 },
        xpGain: 50, // Можно также давать опыт за испытания
    },
    {
        id: 'join_community_chat',
        name: 'Вступить в Чат Сообщества',
        description: 'Присоединяйтесь к нашему чату для общения, обмена опытом и поиска друзей!',
        icon: '💬',
        actionText: 'Вступить',
        actionUrl: 'https://t.me/YourGameChat', // Замените на реальную ссылку
        verificationType: TRIAL_VERIFICATION_TYPE.BUTTON_CONFIRM,
        reward: { rareChestKeys: 1 },
        xpGain: 30,
    },
    // Можно добавить другие: "Пригласи друга", "Оставь отзыв" и т.д.
];

export default trials;