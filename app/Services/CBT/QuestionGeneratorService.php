<?php

namespace App\Services\CBT;

use App\Models\Test;
use App\Models\Question;
use Illuminate\Support\Facades\Cache;

class QuestionGeneratorService
{
    /**
     * Generate & lock soal ujian
     */
    public static function generate(Test $test, int $userId): array
    {
        $cacheKey = self::cacheKey($test->id, $userId);

        //  PERBAIKAN 1: UNCOMMENT CACHE
        // Ini wajib aktif agar saat user refresh, sistem tidak mengacak ulang soal.
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        $questionIds = [];

        // Ambil aturan per topik
        $test->load('topics');

        foreach ($test->topics as $topic) {

            $query = Question::where('topic_id', $topic->id)
                ->where('is_active', true);

            // Filter jenis soal
            if ($topic->pivot->question_type !== 'mixed') {
                $query->where('type', $topic->pivot->question_type);
            }

            // Acak atau tidak
            if ($topic->pivot->random_questions) {
                $query->inRandomOrder();
            }

            $availableCount = (clone $query)->count();
            $limit = $availableCount;

            if ($limit === 0) {
                continue;
            }

            // Ambil sesuai jumlah (jika kosong, ambil semua stok)
            $questions = $query
                ->limit($limit)
                ->pluck('id')
                ->toArray();

            $questionIds = array_merge($questionIds, $questions);
        }

        // Kunci urutan soal final
        $payload = [
            'question_ids' => $questionIds,
            'started_at' => now(),
        ];

        // Simpan ke cache (6 jam cukup untuk durasi ujian terpanjang)
        Cache::put(
            $cacheKey,
            $payload,
            now()->addHours(6)
        );

        return $payload;
    }

    /**
     * Ambil soal + jawaban sesuai aturan (OPTIMIZED)
     */
    public static function getQuestions(Test $test, int $userId)
    {
        $cacheDataKey = "cbt_questions_" . md5($test->id . "_" . implode(',', $test->topics->pluck('id')->toArray()));

        // Cache full questions data untuk 6 jam
        if (Cache::has($cacheDataKey)) {
            return Cache::get($cacheDataKey);
        }

        $session = self::generate($test, $userId);

        // Load topics dengan pivot di awal SAJA
        $test->load('topics');

        // Buat mapping untuk akses cepat
        $topicsMap = $test->topics->keyBy('id');

        $questions = Question::with(['answers' => function ($q) {
            $q->whereNotNull('answer_text'); // Ambil hanya yang ada teksnya
        }])
            ->whereIn('id', $session['question_ids'])
            ->get();

        // Urutkan soal kembali sesuai urutan di session cache
        $questions = $questions->sortBy(function ($model) use ($session) {
            return array_search($model->id, $session['question_ids']);
        })->values();

        $questionsList = $questions->map(function ($question) use ($topicsMap, $userId) {

            $topic = $topicsMap->get($question->topic_id);
            if (!$topic) return $question;

            $pivot = $topic->pivot;

            // Atur jawaban PG
            if ($question->type === 'multiple_choice') {

                $answers = $question->answers;

                // Tetap lakukan pengacakan jika fitur random aktif
                if ($pivot->random_answers) {

                    $answers = $answers->sortBy(function ($ans) use ($userId) {
                        return md5($ans->id . '_' . $userId);
                    })->values();
                }

                // Set ulang relasi dengan urutan baru
                $question->setRelation('answers', $answers);
            }

            return $question;
        });

        // Cache full data untuk mencegah re-query
        Cache::put($cacheDataKey, $questionsList, now()->addHours(6));

        return $questionsList;
    }

    /**
     * Hapus cache soal (setelah submit / expired)
     */
    public static function clear(int $testId, int $userId): void
    {
        Cache::forget(self::cacheKey($testId, $userId));
        // Juga clear question data cache
        $test = \App\Models\Test::find($testId);
        if ($test) {
            $test->load('topics');
            $cacheDataKey = "cbt_questions_" . md5($test->id . "_" . implode(',', $test->topics->pluck('id')->toArray()));
            Cache::forget($cacheDataKey);
        }
    }

    /**
     * Key unik per test + user
     */
    protected static function cacheKey(int $testId, int $userId): string
    {
        return "cbt_test_{$testId}_user_{$userId}";
    }
}
