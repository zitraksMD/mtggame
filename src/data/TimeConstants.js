// data/TimeConstants.js (новый файл или добавь в существующий файл с данными)

// ВАЖНО: Установи дату начала твоего первого сезона.
// Месяцы в JavaScript Date UTC 0-индексированные (0=Январь, 1=Февраль, ..., 4=Май).
// Убедись, что эта дата соответствует ПОНЕДЕЛЬНИКУ, 02:00:00 UTC.
// Пример: Понедельник, 19 мая 2025, 02:00:00 UTC
export const SEASON_START_DATE_UTC = new Date(Date.UTC(2025, 4, 19, 2, 0, 0));

export const WEEK_UNLOCK_DAY_UTC = 1; // Понедельник (0=Воскресенье, 1=Понедельник, ..., 6=Суббота)
export const WEEK_UNLOCK_HOUR_UTC = 2; // 02:00 UTC

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;
export const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Рассчитывает дату и время разблокировки для указанной недели сезона.
 * @param {number} weekNumber - Номер недели (начиная с 1).
 * @param {Date} seasonStartDate - Дата начала сезона (объект Date).
 * @returns {Date} - Объект Date, представляющий время разблокировки недели.
 */
export function getUnlockDateTimeForWeek(weekNumber, seasonStartDate) {
    if (weekNumber <= 0) weekNumber = 1;
    // Время разблокировки Недели 1 - это начало сезона
    const week1UnlockTime = new Date(seasonStartDate.getTime());

    // Для последующих недель добавляем (N-1) недель
    const targetUnlockTime = new Date(week1UnlockTime.getTime() + (weekNumber - 1) * MS_PER_WEEK);
    
    // Убедимся, что это всегда понедельник 02:00 UTC (хотя прибавление недель к понедельнику должно это сохранять)
    // Этот шаг может быть избыточен, если seasonStartDate всегда понедельник 02:00 UTC
    targetUnlockTime.setUTCHours(WEEK_UNLOCK_HOUR_UTC, 0, 0, 0);
    // Дополнительная корректировка на день недели, если seasonStartDate был не понедельник (не должно понадобиться при правильной seasonStartDate)
    // const currentDay = targetUnlockTime.getUTCDay();
    // const diff = WEEK_UNLOCK_DAY_UTC - currentDay;
    // targetUnlockTime.setUTCDate(targetUnlockTime.getUTCDate() + diff);

    return targetUnlockTime;
}

/**
 * Форматирует оставшееся время в строку ДД:ЧЧ:ММ:СС.
 * @param {number} totalMilliseconds - Общее количество миллисекунд.
 * @returns {string} - Отформатированная строка времени.
 */
export function formatTimeRemaining(totalMilliseconds) {
    if (totalMilliseconds <= 0) {
        return "00:00:00:00";
    }
    const days = Math.floor(totalMilliseconds / MS_PER_DAY);
    const hours = Math.floor((totalMilliseconds % MS_PER_DAY) / MS_PER_HOUR);
    const minutes = Math.floor((totalMilliseconds % MS_PER_HOUR) / MS_PER_MINUTE);
    const seconds = Math.floor((totalMilliseconds % MS_PER_MINUTE) / MS_PER_SECOND);

    const pad = (num) => String(num).padStart(2, '0');

    return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}