/**
 * Konversi detik ke mm:ss
 */
export function secondsToClock(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Hitung sisa waktu (frontend)
 */
export function calcRemainingSeconds(startedAt, durationMinutes) {
    const start = new Date(startedAt).getTime();
    const end = start + durationMinutes * 60 * 1000;
    const now = Date.now();

    return Math.max(0, Math.floor((end - now) / 1000));
}
