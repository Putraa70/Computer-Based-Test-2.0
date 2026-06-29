<?php

namespace App\Services\CBT;

use App\Models\Test;
use App\Models\Question;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Collection;
use Throwable;

class QuestionGeneratorService
{
    private const SESSION_TTL_SECONDS = 21600;
    private const POOL_TTL_SECONDS = 86400;
    private const LOCK_SECONDS = 15;
    private const LOCK_WAIT_SECONDS = 3;

    /**
     * Generate & lock soal ujian
     */
    public static function generate(Test $test, int $userId): array
    {
        $test->loadMissing('topics');
        $cacheKey = self::cacheKey($test, $userId);
        $cached = Cache::get($cacheKey);

        if (is_array($cached)) {
            Log::debug('exam.question.session.cache_hit', [
                'test_id' => $test->id,
                'user_id' => $userId,
            ]);

            return $cached;
        }

        $startedAt = microtime(true);

        try {
            return Cache::lock(self::lockKey($test, $userId), self::LOCK_SECONDS)->block(
                self::LOCK_WAIT_SECONDS,
                function () use ($test, $userId, $cacheKey, $startedAt) {
                    $cached = Cache::get($cacheKey);

                    if (is_array($cached)) {
                        Log::debug('exam.question.session.cache_hit_after_lock', [
                            'test_id' => $test->id,
                            'user_id' => $userId,
                        ]);

                        return $cached;
                    }

                    $payload = self::buildSessionPayload($test, $userId);

                    Cache::put($cacheKey, $payload, now()->addSeconds(self::SESSION_TTL_SECONDS));

                    Log::info('exam.question.session.generated', [
                        'test_id' => $test->id,
                        'user_id' => $userId,
                        'question_count' => count($payload['question_ids'] ?? []),
                        'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
                    ]);

                    return $payload;
                }
            );
        } catch (Throwable $e) {
            $cached = Cache::get($cacheKey);

            if (is_array($cached)) {
                Log::warning('exam.question.session.fallback_cache_hit', [
                    'test_id' => $test->id,
                    'user_id' => $userId,
                    'error' => $e->getMessage(),
                ]);

                return $cached;
            }

            Log::warning('exam.question.session.fallback_generate', [
                'test_id' => $test->id,
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);

            $payload = self::buildSessionPayload($test, $userId);
            Cache::put($cacheKey, $payload, now()->addSeconds(self::SESSION_TTL_SECONDS));

            return $payload;
        }
    }

    /**
     * Ambil soal + jawaban sesuai aturan (OPTIMIZED)
     */
    public static function getQuestions(Test $test, int $userId): Collection
    {
        $test->loadMissing('topics');
        $cacheDataKey = self::questionDataCacheKey($test, $userId);
        $cached = Cache::get($cacheDataKey);

        if ($cached instanceof Collection) {
            Log::debug('exam.question.data.cache_hit', [
                'test_id' => $test->id,
                'user_id' => $userId,
            ]);

            return $cached;
        }

        $session = self::generate($test, $userId);
        $topicsMap = $test->topics->keyBy('id');
        $questionIds = $session['question_ids'] ?? [];

        if (empty($questionIds)) {
            $empty = collect();
            Cache::put($cacheDataKey, $empty, now()->addSeconds(self::SESSION_TTL_SECONDS));

            return $empty;
        }

        $questionsById = self::loadQuestionPayloads($questionIds);
        $orderMap = array_flip($questionIds);

        $questionsList = $questionsById
            ->sortBy(function (array $question) use ($orderMap) {
                return $orderMap[$question['id']] ?? PHP_INT_MAX;
            })
            ->map(function (array $question) use ($topicsMap, $userId) {
                $topic = $topicsMap->get($question['topic_id']);

                if (!$topic) {
                    return $question;
                }

                if ($question['type'] === 'multiple_choice' && ($topic->pivot->random_answers ?? false)) {
                    $question['answers'] = collect($question['answers'] ?? [])
                        ->sortBy(function (array $answer) use ($userId, $question) {
                            return md5($question['id'] . '|' . $userId . '|' . $answer['id']);
                        })
                        ->values()
                        ->all();
                }

                return $question;
            })
            ->values();

        Cache::put($cacheDataKey, $questionsList, now()->addSeconds(self::SESSION_TTL_SECONDS));

        return $questionsList;
    }

    public static function warmup(Test $test): array
    {
        $test->loadMissing([
            'topics',
            'testUsers:id,test_id,user_id',
            'groups.users:id',
        ]);
        $startedAt = microtime(true);
        $participantIds = self::resolveWarmupParticipantIds($test);
        $generated = 0;

        foreach ($participantIds as $userId) {
            self::generate($test, (int) $userId);
            self::getQuestions($test, (int) $userId);
            $generated++;
        }

        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);

        Log::info('exam.question.warmup.completed', [
            'test_id' => $test->id,
            'participants' => $generated,
            'duration_ms' => $durationMs,
        ]);

        return [
            'participants' => $generated,
            'duration_ms' => $durationMs,
        ];
    }

    /**
     * Hapus cache soal (setelah submit / expired)
     */
    public static function clear(int $testId, int $userId): void
    {
        $test = \App\Models\Test::find($testId);

        Cache::forget("cbt_test_{$testId}_user_{$userId}");

        if ($test) {
            $test->load('topics');
            Cache::forget(self::cacheKey($test, $userId));
            Cache::forget(self::questionDataCacheKey($test, $userId));
        }
    }

    public static function clearForTest(int $testId): void
    {
        $test = \App\Models\Test::with('testUsers:id,test_id,user_id')->find($testId);

        if (!$test) {
            return;
        }

        Cache::forget(self::configVersionCacheKey($testId));

        foreach ($test->testUsers as $testUser) {
            self::clear($test->id, $testUser->user_id);
            Cache::forget("exam_status:{$testUser->id}");
        }
    }

    public static function clearQuestion(int $questionId): void
    {
        Cache::forget(self::questionPayloadCacheKey($questionId));
    }

    public static function clearForTopic(int $topicId): void
    {
        $tests = Test::query()
            ->whereHas('topics', fn ($query) => $query->where('topics.id', $topicId))
            ->with('testUsers:id,test_id,user_id')
            ->get(['id']);

        foreach ($tests as $test) {
            self::clearForTest($test->id);
            QuestionCacheService::invalidateTest($test->id);
            Cache::forget("statistics:test:summary:{$test->id}");
        }
    }

    public static function configVersion(Test $test): string
    {
        return Cache::remember(
            self::configVersionCacheKey($test->id),
            now()->addSeconds(3600),
            fn () => self::buildConfigVersion($test)
        );
    }

    protected static function configVersionCacheKey(int $testId): string
    {
        return "cbt_exam_config_version:{$testId}";
    }

    protected static function buildConfigVersion(Test $test): string
    {
        $test->loadMissing('topics');

        $topicRows = $test->topics
            ->sortBy('id')
            ->map(function ($topic) {
                return [
                    'topic_id' => (int) $topic->id,
                    'question_type' => (string) ($topic->pivot->question_type ?? 'mixed'),
                    'random_questions' => (int) ($topic->pivot->random_questions ?? 0),
                    'random_answers' => (int) ($topic->pivot->random_answers ?? 0),
                    'max_answers' => (int) ($topic->pivot->max_answers ?? 0),
                    'answer_mode' => (string) ($topic->pivot->answer_mode ?? ''),
                    'updated_at' => (string) ($topic->pivot->updated_at ?? ''),
                ];
            })
            ->values()
            ->all();

        $topicIds = collect($topicRows)->pluck('topic_id')->all();

        $questionRows = empty($topicIds)
            ? []
            : DB::table('questions')
                ->whereIn('topic_id', $topicIds)
                ->where('is_active', true)
                ->orderBy('topic_id')
                ->orderBy('id')
                ->get(['id', 'topic_id', 'type', 'updated_at'])
                ->map(fn ($question) => [
                    'id' => (int) $question->id,
                    'topic_id' => (int) $question->topic_id,
                    'type' => (string) $question->type,
                    'updated_at' => (string) $question->updated_at,
                ])
                ->all();

        $questionIds = collect($questionRows)->pluck('id')->all();

        $answerRows = empty($questionIds)
            ? []
            : DB::table('answers')
                ->whereIn('question_id', $questionIds)
                ->orderBy('question_id')
                ->orderBy('id')
                ->get(['id', 'question_id', 'is_correct', 'updated_at'])
                ->map(fn ($answer) => [
                    'id' => (int) $answer->id,
                    'question_id' => (int) $answer->question_id,
                    'is_correct' => (int) $answer->is_correct,
                    'updated_at' => (string) $answer->updated_at,
                ])
                ->all();

        return md5(json_encode([
            'test_updated_at' => optional($test->updated_at)->toDateTimeString(),
            'topics' => $topicRows,
            'questions' => $questionRows,
            'answers' => $answerRows,
        ]));
    }

    /**
     * Key unik per test + user
     */
    protected static function cacheKey(Test $test, int $userId): string
    {
        return "cbt_test_{$test->id}_user_{$userId}_" . self::configSignature($test);
    }

    protected static function questionDataCacheKey(Test $test, int $userId): string
    {
        return "cbt_questions_" . md5($test->id . "_" . $userId . "_" . self::configSignature($test));
    }

    protected static function lockKey(Test $test, int $userId): string
    {
        return "cbt_exam_lock_{$test->id}_{$userId}_" . self::configSignature($test);
    }

    protected static function topicPoolCacheKey(Test $test, int $topicId, string $questionType, bool $randomQuestions): string
    {
        return 'cbt_topic_pool_' . md5($test->id . '_' . $topicId . '_' . $questionType . '_' . (int) $randomQuestions . '_' . self::configSignature($test));
    }

    protected static function questionPayloadCacheKey(int $questionId): string
    {
        return 'cbt_question_payload_' . $questionId;
    }

    protected static function resolveWarmupParticipantIds(Test $test): array
    {
        $userIds = $test->testUsers->pluck('user_id');
        $groupUserIds = $test->groups
            ->flatMap(function ($group) {
                return $group->users->pluck('id');
            });

        return $userIds
            ->merge($groupUserIds)
            ->unique()
            ->values()
            ->all();
    }

    protected static function buildSessionPayload(Test $test, int $userId): array
    {
        $questionIds = [];

        foreach ($test->topics as $topic) {
            $questionType = (string) ($topic->pivot->question_type ?? 'mixed');
            $randomQuestions = (bool) ($topic->pivot->random_questions ?? false);
            $topicQuestionIds = self::getTopicQuestionIds($test, $topic->id, $questionType);

            if (empty($topicQuestionIds)) {
                continue;
            }

            if ($randomQuestions) {
                $topicQuestionIds = self::deterministicShuffle($topicQuestionIds, $userId, (int) $topic->id);
            }

            $questionIds = array_merge($questionIds, $topicQuestionIds);
        }

        return [
            'question_ids' => array_values($questionIds),
            'started_at' => now(),
        ];
    }

    protected static function getTopicQuestionIds(Test $test, int $topicId, string $questionType): array
    {
        $cacheKey = self::topicPoolCacheKey($test, $topicId, $questionType, false);
        $cached = Cache::get($cacheKey);

        if (is_array($cached)) {
            return $cached;
        }

        try {
            return Cache::lock($cacheKey . ':lock', self::LOCK_SECONDS)->block(
                self::LOCK_WAIT_SECONDS,
                function () use ($cacheKey, $topicId, $questionType) {
                    $cached = Cache::get($cacheKey);

                    if (is_array($cached)) {
                        return $cached;
                    }

                    $query = Question::query()
                        ->where('topic_id', $topicId)
                        ->where('is_active', true)
                        ->orderBy('id')
                        ->select('id', 'topic_id', 'type');

                    if ($questionType !== 'mixed') {
                        $query->where('type', $questionType);
                    }

                    $questionIds = $query->pluck('id')->all();
                    Cache::put($cacheKey, $questionIds, now()->addSeconds(self::POOL_TTL_SECONDS));

                    return $questionIds;
                }
            );
        } catch (Throwable $e) {
            Log::warning('exam.question.topic_pool.fallback', [
                'test_id' => $test->id,
                'topic_id' => $topicId,
                'error' => $e->getMessage(),
            ]);

            $query = Question::query()
                ->where('topic_id', $topicId)
                ->where('is_active', true)
                ->orderBy('id')
                ->select('id', 'topic_id', 'type');

            if ($questionType !== 'mixed') {
                $query->where('type', $questionType);
            }

            return $query->pluck('id')->all();
        }
    }

    protected static function loadQuestionPayloads(array $questionIds): Collection
    {
        $payloads = [];
        $missingIds = [];

        foreach ($questionIds as $questionId) {
            $cached = Cache::get(self::questionPayloadCacheKey((int) $questionId));

            if (is_array($cached)) {
                $payloads[(int) $questionId] = $cached;
                continue;
            }

            $missingIds[] = (int) $questionId;
        }

        if (!empty($missingIds)) {
            $questions = Question::query()
                ->select(['id', 'topic_id', 'type', 'question_text', 'question_image', 'score'])
                ->with([
                    'answers' => function ($query) {
                        $query->select(['id', 'question_id', 'answer_text', 'answer_image', 'is_correct'])
                            ->whereNotNull('answer_text');
                    },
                ])
                ->whereIn('id', $missingIds)
                ->get()
                ->keyBy('id');

            foreach ($missingIds as $questionId) {
                $question = $questions->get($questionId);

                if (!$question) {
                    continue;
                }

                $payload = self::normalizeQuestionPayload($question);
                $payloads[$questionId] = $payload;
                Cache::put(self::questionPayloadCacheKey($questionId), $payload, now()->addSeconds(self::SESSION_TTL_SECONDS));
            }
        }

        return collect($questionIds)
            ->map(function ($questionId) use ($payloads) {
                return $payloads[(int) $questionId] ?? null;
            })
            ->filter()
            ->values();
    }

    protected static function normalizeQuestionPayload(Question $question): array
    {
        return [
            'id' => $question->id,
            'topic_id' => $question->topic_id,
            'type' => $question->type,
            'question_text' => $question->question_text,
            'question_image' => $question->question_image,
            'score' => (int) $question->score,
            'answers' => $question->answers
                ->map(function ($answer) {
                    return [
                        'id' => $answer->id,
                        'question_id' => $answer->question_id,
                        'answer_text' => $answer->answer_text,
                        'answer_image' => $answer->answer_image,
                        'is_correct' => (bool) $answer->is_correct,
                    ];
                })
                ->values()
                ->all(),
        ];
    }

    protected static function deterministicShuffle(array $ids, int $userId, int $topicId): array
    {
        $shuffled = $ids;

        usort($shuffled, function ($left, $right) use ($userId, $topicId) {
            $leftHash = md5($topicId . '|' . $userId . '|' . $left);
            $rightHash = md5($topicId . '|' . $userId . '|' . $right);

            return $leftHash <=> $rightHash;
        });

        return $shuffled;
    }

    protected static function configSignature(Test $test): string
    {
        return self::configVersion($test);
    }
}
