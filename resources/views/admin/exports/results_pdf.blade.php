<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laporan Hasil Ujian - CBT FK Unila</title>
    <style>
        @page { 
            margin: 0.5cm 1.5cm 1cm 1.5cm; 
        }
        body {
            font-family: 'Times New Roman', Times, serif; /* Standar dokumen resmi */
            font-size: 11px;
            color: #000;
            line-height: 1.2;
        }

        /* --- KOP SURAT IDENTIK --- */
        .kop-surat {
            width: 100%;
            border-bottom: 4px solid #000; /* Garis Tebal Atas */
            padding-bottom: 2px;
            margin-bottom: 2px;
            position: relative;
        }
        .logo-unila {
            position: absolute;
            top: 5px;
            left: 0;
            width: 75px; 
        }
        .kop-text {
            text-align: center;
            margin-left: 80px; 
        }
        .kop-text .instansi-1 {
            margin: 0;
            font-size: 14px;
            text-transform: uppercase;
        }
        .kop-text .instansi-2 {
            margin: 0;
            font-size: 16px;
            text-transform: uppercase;
            font-weight: bold;
        }
        .kop-text .instansi-3 {
            margin: 0;
            font-size: 18px;
            text-transform: uppercase;
            font-weight: bold;
        }
        .kop-text .alamat {
            margin: 2px 0 0 0;
            font-size: 10px;
            font-style: italic;
        }
        .kop-text .kontak {
            margin: 0;
            font-size: 10px;
            font-style: italic;
        }

        /* --- JUDUL --- */
        .judul-laporan {
            text-align: center;
            margin-bottom: 20px;
        }
        .judul-laporan h4 {
            margin: 0;
            text-decoration: underline;
            font-size: 14px;
            text-transform: uppercase;
        }
        .judul-laporan p {
            margin: 5px 0 0 0;
            font-size: 10px;
        }

        /* --- TABEL --- */
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th {
            background-color: #ffffff;
            border: 1px solid #000;
            padding: 8px 5px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
        }
        td {
            border: 1px solid #000;
            padding: 6px 8px;
            vertical-align: middle;
        }
        .text-center { text-align: center; }
        .font-mono { font-family: 'Courier', monospace; }
        .score { font-weight: bold; font-size: 12px; }

        /* Footer */
        .footer {
            position: fixed;
            bottom: 0px;
            width: 100%;
            font-size: 9px;
            color: #000;
            text-align: left;
            border-top: 1px solid #000;
            padding-top: 5px;
        }
    </style>
</head>
<body>
    <div class="kop-surat">
        <img src="{{ public_path('favicon.png') }}" class="logo-unila">
        <div class="kop-text">
            <p class="instansi-1">Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi</p>
            <p class="instansi-2">Universitas Lampung</p>
            <p class="instansi-3">Fakultas Kedokteran</p>
            <p class="alamat">Jalan Prof. Dr. Sumantri Brojonegoro No. 1 Bandar Lampung 35145</p>
            <p class="kontak">Laman : http://www.fk.unila.ac.id Email : dekanfkunila@yahoo.com</p>
        </div>
    </div>
    <div class="kop-surat-border"></div>

    <div class="judul-laporan">
        <h4>Laporan Hasil Ujian</h4>
        <p>Dicetak pada: {{ \Carbon\Carbon::now()->locale('id')->isoFormat('dddd, D MMMM Y HH:mm') }} WIB</p>
    </div>

    <table>
        <thead>
            <tr>
                <th width="5%">No</th>
                <th width="15%">NPM</th>
                <th width="30%">Nama Peserta</th>
                <th width="20%">Mata Kuliah</th>
                <th width="10%">Selesai</th>
                <th width="10%">Status</th>
                <th width="10%">Nilai</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data as $index => $item)
            <tr>
                <td class="text-center">{{ $index + 1 }}</td>
                <td class="font-mono text-center">{{ $item->user->npm ?? '-' }}</td>
                <td>
                    <strong>{{ strtoupper($item->user->name) }}</strong>
                    {{-- Email sudah dihapus sesuai permintaan --}}
                </td>
                <td>{{ $item->test->title }}</td>
                <td class="text-center font-mono" style="font-size: 9px;">
                    {{ $item->finished_at ? \Carbon\Carbon::parse($item->finished_at)->format('d/m/y H:i') : '-' }}
                </td>
                <td class="text-center" style="font-size: 9px;">
                    @if($item->is_locked)
                        DIKUNCI
                    @elseif($item->status == 'submitted' || $item->status == 'finished')
                        SELESAI
                    @elseif($item->status == 'ongoing')
                        AKTIF
                    @else
                        {{ strtoupper($item->status) }}
                    @endif
                </td>
                <td class="text-center score">
                    {{ number_format((float) ($item->final_score ?? $item->custom_score ?? ($item->result->total_score ?? 0)), 2, '.', '') }}
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="7" class="text-center">Data tidak ditemukan.</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        CBT FK UNILA - Dokumen Sah Hasil Ujian  <span class="page-number"></span>
    </div>
</body>
</html>