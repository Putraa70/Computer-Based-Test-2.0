<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\{
    DashboardController as AdminDashboardController,
    BackupController,
    HelpController,
    ModuleController,
    TopicController,
    QuestionController,
    TestController,
    TestUserController,
    ResultController,
    MonitoringController,
    ForceSubmitController,
    ImportUserController,
    ImportQuestionController,
    AnalyticsController,
    UserController,
    GroupController,
    StatisticsController
};

Route::middleware([
    'auth',
    'active',
    'role:admin',
])->prefix('admin')->name('admin.')->group(function () {

    // Dashboard
    Route::get('/dashboard', [AdminDashboardController::class, 'index'])
        ->name('dashboard');

    // Backup & Help
    Route::get('/backup', [BackupController::class, 'index'])->name('backup.index');
    Route::get('/backup/download', [BackupController::class, 'download'])->name('backup.download');
    Route::get('/help', [HelpController::class, 'index'])->name('help.index');

    // 1. Import Users
    Route::get('/users/import', [ImportUserController::class, 'create'])->name('users.import.view');

    Route::post('/import/users', [ImportUserController::class, 'store'])->name('import.users');

    Route::get('/users/import/template', [ImportUserController::class, 'downloadTemplate'])->name('import.template');

    Route::post('/users/assign-groups', [UserController::class, 'assignGroups'])
        ->name('users.assign-groups');

    // 2. Import Questions (PINDAHKAN KE SINI - SEBELUM RESOURCE)
    Route::get('/questions/import', [ImportQuestionController::class, 'create'])->name('questions.import.view');
    Route::post('/import/questions', [ImportQuestionController::class, 'store'])->name('import.questions');
    Route::get('/questions/import/template', [ImportQuestionController::class, 'downloadTemplate'])->name('questions.import.template');



    Route::resource('users', UserController::class);
    Route::resource('modules', ModuleController::class);
    Route::resource('topics', TopicController::class);

    // Route resource questions AMAN ditaruh di sini karena route import sudah didefinisikan duluan di atas
    Route::resource('questions', QuestionController::class);

    Route::resource('tests', TestController::class);
    Route::resource('groups', GroupController::class);
    Route::resource('test-users', TestUserController::class)->only(['show']);

    // Lock/Unlock Test Users
    Route::post('/test-users/{testUser}/lock', [TestUserController::class, 'lock'])
        ->name('test-users.lock');
    Route::post('/test-users/{testUser}/unlock', [TestUserController::class, 'unlock'])
        ->name('test-users.unlock');
    Route::post('/test-users/{testUser}/add-time', [TestUserController::class, 'addTime'])
        ->name('test-users.addTime');

    // 1. Single Actions (Per User)
    Route::post('/test-users/{testUser}/lock', [TestUserController::class, 'lock'])->name('test-users.lock');
    Route::post('/test-users/{testUser}/unlock', [TestUserController::class, 'unlock'])->name('test-users.unlock');
    Route::post('/test-users/{testUser}/add-time', [TestUserController::class, 'addTime'])->name('test-users.addTime');

    // 2. Bulk Actions (Massal - WAJIB ADA AGAR HEADER BERFUNGSI)
    Route::post('test-users/bulk-lock', [TestUserController::class, 'bulkLock'])->name('test-users.bulk-lock');     // 👈 Tambahan
    Route::post('test-users/bulk-unlock', [TestUserController::class, 'bulkUnlock'])->name('test-users.bulk-unlock'); // 👈 Tambahan
    Route::post('test-users/bulk-add-time', [TestUserController::class, 'bulkAddTime'])->name('test-users.bulk-add-time'); // 👈 Tambahan
    // Pastikan bagian array-nya tertulis [TestUserController::class, 'bulkValidate']
    Route::post('test-users/bulk-validate', [TestUserController::class, 'bulkValidate'])
        ->name('test-users.bulk-validate');

    Route::post('test-users/bulk-delete', [TestUserController::class, 'bulkDelete'])
        ->name('test-users.bulk-delete'); // 👈 Tambahan

    // 3. Export Data
    Route::get('export/test-users', [TestUserController::class, 'export'])
        ->name('test-users.export');

    Route::post(
        '/monitoring/test-users/{testUser}/force-submit',
        [ForceSubmitController::class, 'submit']
    )->name('monitoring.forceSubmit');

    // =========================================================
    //  STATISTICS / STATISTIK (BARU)
    // =========================================================

    // Statistik per Ujian (Untuk Admin melihat performa soal/peserta dalam 1 ujian)
    // URL: /admin/statistics/tests/{id_test}
    Route::get('/statistics/tests/{test}', [StatisticsController::class, 'test'])
        ->name('statistics.test');

    // Statistik per Siswa (Untuk melihat riwayat nilai spesifik user)
    // URL: /admin/statistics/students/{id_user}
    Route::get('/statistics/students/{user}', [StatisticsController::class, 'student'])
        ->name('statistics.student');

    Route::post('/tests/grade-essay', [StatisticsController::class, 'gradeEssay'])
        ->name('tests.grade-essay');


    Route::get('/analytics', [AnalyticsController::class, 'index'])->name('monitoring.index');
    Route::get('/analytics/{id}', [AnalyticsController::class, 'show'])->name('analytics.show');

    // Route Aksi (Tambah Waktu / Stop)
    Route::post('/analytics/{id}/force-submit', [AnalyticsController::class, 'forceSubmit'])
        ->name('analytics.forceSubmit');
});
