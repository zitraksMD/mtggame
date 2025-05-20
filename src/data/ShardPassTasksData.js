// data/ShardPassTasksData.js

/**
 * Defines the structure for tasks within the ShardPass.
 *
 * Task Definition Structure (Static):
 * - id: string - Unique identifier for the task (e.g., 'w1_task_login_days').
 * - name: string - Display name of the task.
 * - targetProgress: number - The target value to complete the task.
 * - rewardXP: number - XP awarded upon claiming the task.
 * - isPremium: boolean - True if the task requires a premium ShardPass to claim.
 * - eventTracked: string - The specific event type the useGameStore will look for.
 * - condition: object (optional) - Additional details for the eventTracked.
 *
 * Note: currentProgress, isClaimed, and any auxiliary tracking fields (like lastCountedLoginDate for login tasks)
 * will be managed by useGameStore within its shardPassTasksProgress state object for each task instance.
 */

const generateWeeklyTasks = (weekNumber) => {
    const tasks = [
        {
            id: `w${weekNumber}_task_login_days`, // ID для задачи на логины
            name: 'Log in 7 different days',
            targetProgress: 7,
            rewardXP: 250,
            isPremium: false,
            eventTracked: 'login', // Общее событие входа. Логика уникальности дней будет в store.
        },
        {
            id: `w${weekNumber}_task_complete_normal`,
            name: 'Complete 10 any levels on Normal difficulty',
            targetProgress: 10,
            rewardXP: 250,
            isPremium: false,
            eventTracked: 'complete_level',
            condition: { difficulty: 'normal' },
        },
        {
            id: `w${weekNumber}_task_open_chests`,
            name: 'Open 25 any chests',
            targetProgress: 25,
            rewardXP: 250,
            isPremium: false,
            eventTracked: 'open_chest',
        },
        {
            id: `w${weekNumber}_task_upgrade_gear`,
            name: 'Upgrade any equipment 10 times',
            targetProgress: 10,
            rewardXP: 400,
            isPremium: true,
            eventTracked: 'upgrade_gear',
        },
        {
            id: `w${weekNumber}_task_upgrade_artifact`,
            name: 'Upgrade an artifact 3 times',
            targetProgress: 3,
            rewardXP: 500,
            isPremium: true,
            eventTracked: 'upgrade_artifact',
        },
        {
            id: `w${weekNumber}_task_complete_hard`,
            name: 'Complete 3 any levels on Hard difficulty',
            targetProgress: 3,
            rewardXP: 600,
            isPremium: true,
            eventTracked: 'complete_level',
            condition: { difficulty: 'hard' },
        },
    ];
    return tasks;
};

export const SHARD_PASS_TASKS_WEEKS = 8; // Total number of weeks

export const initialTasksData = {}; // Теперь это только определения задач
for (let i = 1; i <= SHARD_PASS_TASKS_WEEKS; i++) {
    initialTasksData[String(i)] = generateWeeklyTasks(i); // Ключи недель - строки
}

/*
    Как это будет работать с useGameStore:

    В `useGameStore`, в `shardPassTasksProgress` для задачи типа "login_days" будет храниться примерно так:
    `state.shardPassTasksProgress["1"]["w1_task_login_days"] = { progress: 0, isClaimed: false, lastCountedLoginDate: 'YYYY-MM-DD' };`

    При обработке события `trackTaskEvent('login', ...)` в `useGameStore`:
    - Для ShardPass задач с `eventTracked: 'login'`:
        - Получить текущую дату (например, '2025-05-20').
        - Сравнить с `taskState.lastCountedLoginDate`.
        - Если даты разные (или `lastCountedLoginDate` отсутствует) И `progress < targetProgress`:
            - Увеличить `progress` на 1.
            - Установить `lastCountedLoginDate` на текущую дату.
            - Отметить, что прогресс ShardPass задач изменился.
*/