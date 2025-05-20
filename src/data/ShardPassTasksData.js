// data/ShardPassTasksData.js

/**
 * Defines the structure for tasks within the ShardPass.
 *
 * Task Structure:
 * - id: string - Unique identifier for the task (e.g., 'w1t1' for Week 1, Task 1).
 * - name: string - Display name of the task.
 * - currentProgress: number - Player's current progress towards the target.
 * - targetProgress: number - The target value to complete the task.
 * - rewardXP: number - XP awarded upon claiming the task.
 * - isPremium: boolean - True if the task requires a premium ShardPass to claim.
 * - isClaimed: boolean - True if the reward for this task has already been claimed.
 *
 * Note: isCompleted will be derived in the component: (currentProgress >= targetProgress)
 */

const generateWeeklyTasks = (weekNumber) => {
    const tasks = [
        {
            id: `w${weekNumber}t1`,
            name: 'Входить в игру 7 дней',
            currentProgress: 0,
            targetProgress: 7,
            rewardXP: 250,
            isPremium: false,
            isClaimed: false,
        },
        {
            id: `w${weekNumber}t2`,
            name: 'Пройти 10 любых уровней на сложности Normal',
            currentProgress: 0,
            targetProgress: 10,
            rewardXP: 250,
            isPremium: false,
            isClaimed: false,
        },
        {
            id: `w${weekNumber}t3`,
            name: 'Открыть 25 любых сундуков',
            currentProgress: 0,
            targetProgress: 25,
            rewardXP: 250,
            isPremium: false,
            isClaimed: false,
        },
        {
            id: `w${weekNumber}t4`,
            name: 'Улучшить любое снаряжение 10 раз',
            currentProgress: 0,
            targetProgress: 10,
            rewardXP: 400,
            isPremium: true,
            isClaimed: false,
        },
        {
            id: `w${weekNumber}t5`,
            name: 'Улучшить артефакт 3 раза',
            currentProgress: 0,
            targetProgress: 3,
            rewardXP: 500,
            isPremium: true,
            isClaimed: false,
        },
        {
            id: `w${weekNumber}t6`,
            name: 'Пройти 3 любых уровня на сложности Hard',
            currentProgress: 0,
            targetProgress: 3,
            rewardXP: 600,
            isPremium: true,
            isClaimed: false,
        },
    ];
    return tasks;
};

export const SHARD_PASS_TASKS_WEEKS = 8; // Total number of weeks

export const initialTasksData = {};
for (let i = 1; i <= SHARD_PASS_TASKS_WEEKS; i++) {
    initialTasksData[i] = generateWeeklyTasks(i);
}

// Example of how to manually set progress for testing:
// initialTasksData[1][0].currentProgress = 3; // Week 1, Task 1, 3/7 days
// initialTasksData[1][1].currentProgress = 10; // Week 1, Task 2, completed
// initialTasksData[1][3].currentProgress = 5; // Week 1, Premium Task 4, 5/10 upgrades
// initialTasksData[2][0].currentProgress = 1; // Week 2, Task 1, 1/7 days

/*
    To use this in ShardPassScreen.jsx:

    import { initialTasksData as allWeeksTasksData, SHARD_PASS_TASKS_WEEKS } from '../../data/ShardPassTasksData'; // Adjust path if needed

    // Inside ShardPassScreen component:
    // const [tasksByWeek, setTasksByWeek] = useState(allWeeksTasksData);
    // const weeks = Array.from({ length: SHARD_PASS_TASKS_WEEKS }, (_, i) => i + 1);
*/