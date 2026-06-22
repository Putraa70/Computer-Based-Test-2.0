/**
 * Ujian masih bisa dikerjakan
 */
export function canAnswer(testUser) {
    return testUser?.status === "ongoing";
}

/**
 * Ujian sudah selesai (submitted / expired)
 */
export function isFinished(testUser) {
    return ["submitted", "expired"].includes(testUser?.status);
}

/**
 * Blok UI kalau waktu habis
 */
export function isExpired(remainingSeconds) {
    return remainingSeconds <= 0;
}
