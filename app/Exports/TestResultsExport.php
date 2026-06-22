<?php

namespace App\Exports;

use App\Models\TestUser;
use App\Services\CBT\ScoringService;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnFormatting; // 👈 TAMBAHAN 1
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;     // 👈 TAMBAHAN 2
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;

class TestResultsExport implements FromQuery, WithHeadings, WithMapping, ShouldAutoSize, WithStyles, WithColumnFormatting, WithCustomStartCell, WithEvents
{
    private const HEADING_ROW = 10;

    protected $testId;
    protected $search;
    protected $sort;

    public function __construct($testId, $search = null, $sort = 'started_at')
    {
        $this->testId = $testId;
        $this->search = $search;
        $this->sort = $sort;
    }

    public function query()
    {
        $query = TestUser::query()
            ->with(['user', 'test.topics.questions', 'answers', 'result'])
            ->join('users', 'test_users.user_id', '=', 'users.id')
            ->leftJoin('results', 'test_users.id', '=', 'results.test_user_id')
            ->select('test_users.*', 'users.name as user_name', 'users.npm as user_npm', 'results.total_score');

        if ($this->testId) $query->where('test_users.test_id', $this->testId);

        if ($this->search) {
            $query->where(function ($q) {
                $q->where('users.name', 'like', "%{$this->search}%")
                    ->orWhere('users.email', 'like', "%{$this->search}%")
                    ->orWhere('users.npm', 'like', "%{$this->search}%");
            });
        }

        ScoringService::selectFinalScore($query);

        switch ($this->sort) {
            case 'npm_asc':
                $query->orderBy('users.npm', 'asc');
                break;
            case 'score_desc':
                ScoringService::orderByFinalScore($query, 'desc');
                break;
            case 'score_asc':
                ScoringService::orderByFinalScore($query, 'asc');
                break;
            default:
                $query->orderByDesc('test_users.started_at')
                    ->orderBy('test_users.id');
                break;
        }

        return $query;
    }

    public function startCell(): string
    {
        return 'A' . self::HEADING_ROW;
    }

    public function headings(): array
    {
        return [
            'NPM',
            'Nama Peserta',
            'Judul Ujian',
            'Status',
            'Nilai',
            'Waktu Mulai',
            'Waktu Selesai',
            'Durasi'
        ];
    }

    public function map($testUser): array
    {
        $duration = '-';
        if ($testUser->started_at && $testUser->finished_at) {
            $duration = $testUser->finished_at->diffInMinutes($testUser->started_at) . ' menit';
        }

        $score = (float) ($testUser->final_score ?? ScoringService::calculate($testUser));

        return [
            $testUser->user->npm ?? '-',
            $testUser->user->name,
            $testUser->test->title,
            ucfirst($testUser->status),
            $score, //  Kirim Raw Number (misal: 31.77777)
            $testUser->started_at,
            $testUser->finished_at ?? '-',
            $duration
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            self::HEADING_ROW => [
                'font' => ['bold' => true],
            ],
        ];
    }

    /**
     *  FORCE FORMAT EXCEL AGAR 2 DESIMAL
     */
    public function columnFormats(): array
    {
        return [
            'E' => '0.00', // Kolom E (Nilai) dipaksa format angka 2 desimal
            'F' => NumberFormat::FORMAT_DATE_DATETIME,
            'G' => NumberFormat::FORMAT_DATE_DATETIME,
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $highestRow = $sheet->getHighestRow();

                $this->applyLetterhead($sheet);
                $this->applyTableStyle($sheet, $highestRow);
            },
        ];
    }

    private function applyLetterhead(Worksheet $sheet): void
    {
        $sheet->mergeCells('B1:H1');
        $sheet->mergeCells('B2:H2');
        $sheet->mergeCells('B3:H3');
        $sheet->mergeCells('B4:H4');
        $sheet->mergeCells('B5:H5');
        $sheet->mergeCells('A8:H8');
        $sheet->mergeCells('A9:H9');

        $sheet->setCellValue('B1', 'KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI');
        $sheet->setCellValue('B2', 'UNIVERSITAS LAMPUNG');
        $sheet->setCellValue('B3', 'FAKULTAS KEDOKTERAN');
        $sheet->setCellValue('B4', 'Jalan Prof. Dr. Sumantri Brojonegoro No. 1 Bandar Lampung 35145');
        $sheet->setCellValue('B5', 'Laman : http://www.fk.unila.ac.id Email : dekanfkunila@yahoo.com');
        $sheet->setCellValue('A8', 'LAPORAN HASIL UJIAN');
        $sheet->setCellValue('A9', 'Dicetak pada: ' . Carbon::now()->locale('id')->isoFormat('dddd, D MMMM Y HH:mm') . ' WIB');

        foreach ([1 => 20, 2 => 23, 3 => 26, 4 => 18, 5 => 18, 6 => 8, 7 => 12, 8 => 24, 9 => 18] as $row => $height) {
            $sheet->getRowDimension($row)->setRowHeight($height);
        }

        $sheet->getStyle('B1:B5')->applyFromArray([
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        $sheet->getStyle('B1')->getFont()->setSize(12);
        $sheet->getStyle('B2')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('B3')->getFont()->setBold(true)->setSize(16);
        $sheet->getStyle('B4:B5')->getFont()->setItalic(true)->setSize(10);

        $sheet->getStyle('A6:H6')->applyFromArray([
            'borders' => [
                'bottom' => [
                    'borderStyle' => Border::BORDER_THICK,
                    'color' => ['rgb' => '000000'],
                ],
            ],
        ]);

        $sheet->getStyle('A8:A9')->applyFromArray([
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);
        $sheet->getStyle('A8')->getFont()->setBold(true)->setUnderline(true)->setSize(13);
        $sheet->getStyle('A9')->getFont()->setSize(10);

        $logoPath = public_path('favicon.png');
        if (file_exists($logoPath)) {
            $drawing = new Drawing();
            $drawing->setName('Logo FK Unila');
            $drawing->setDescription('Logo FK Unila');
            $drawing->setPath($logoPath);
            $drawing->setHeight(78);
            $drawing->setCoordinates('A1');
            $drawing->setOffsetX(10);
            $drawing->setOffsetY(4);
            $drawing->setWorksheet($sheet);
        }
    }

    private function applyTableStyle(Worksheet $sheet, int $highestRow): void
    {
        $headingRange = 'A' . self::HEADING_ROW . ':H' . self::HEADING_ROW;
        $tableRange = 'A' . self::HEADING_ROW . ':H' . $highestRow;

        $sheet->getStyle($headingRange)->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => '000000'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E5E7EB'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        $sheet->getStyle($tableRange)->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000'],
                ],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        $sheet->getStyle('A' . (self::HEADING_ROW + 1) . ':A' . $highestRow)
            ->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('E' . (self::HEADING_ROW + 1) . ':E' . $highestRow)
            ->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('F' . (self::HEADING_ROW + 1) . ':G' . $highestRow)
            ->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->freezePane('A' . (self::HEADING_ROW + 1));
        $sheet->getPageSetup()->setRowsToRepeatAtTopByStartAndEnd(1, self::HEADING_ROW);
    }
}
