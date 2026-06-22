/**
 * Format nilai ujian
 * contoh: 83.12
 */
export function formatScore(score) {
    if (score === null || score === undefined) return "-";
    return Number(score).toFixed(2);
}

/**
 * Persentase (buat ranking / statistik)
 */
export function toPercent(score, max = 100) {
    if (!score) return "0%";
    return `${((score / max) * 100).toFixed(1)}%`;
}
