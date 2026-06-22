import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Loader2 } from 'lucide-react';

export default function ExportPdfStatistics({ test, stats, questions }) {
    const [isGenerating, setIsGenerating] = useState(false);

    // --- 1. LOAD FONT ROBOTO ---
    const loadFont = async (doc) => {
        try {
            const fontURL = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf";
            const response = await fetch(fontURL);
            const blob = await response.blob();
            const reader = new FileReader();
            return new Promise((resolve) => {
                reader.onloadend = () => {
                    const base64data = reader.result.split(',')[1];
                    doc.addFileToVFS("Roboto-Regular.ttf", base64data);
                    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
                    doc.setFont("Roboto");
                    resolve(true);
                };
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Gagal memuat font kustom", e);
            return false;
        }
    };

    // --- 2. DOWNLOAD GAMBAR (FIXED UNTUK LOGO) ---
    const getBase64ImageFromURL = (url) => {
        return new Promise((resolve) => {
            if (!url) { resolve(null); return; }
            const img = new Image();
            img.setAttribute("crossOrigin", "anonymous");
            
            // Memastikan URL absolut agar logo terpanggil di Laragon
            const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
            img.src = fullUrl;

            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                // Gunakan PNG untuk logo agar transparansi terjaga
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => {
                console.error("Gagal load logo di path: " + fullUrl);
                resolve(null);
            };
        });
    };

    const stripHtml = (html) => {
        if (!html) return "";
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        const mathML = tempDiv.querySelectorAll('math, .katex-mathml, annotation');
        mathML.forEach(el => el.remove());
        return (tempDiv.textContent || tempDiv.innerText || "").trim().replace(/\s+/g, ' ');
    };

    const exportPDF = async () => {
        setIsGenerating(true);
        const doc = new jsPDF('p', 'mm', 'a4');

        await loadFont(doc);
        
        // Memanggil logo dari folder public Laragon
        const logoBase64 = await getBase64ImageFromURL("/favicon.png");

        // --- KOP SURAT PROFESIONAL ---
        if (logoBase64) {
            // x: 15, y: 10, w: 22, h: 22
            doc.addImage(logoBase64, 'PNG', 15, 10, 22, 22);
        }

        const centerX = 112; // Titik tengah teks di samping logo
        doc.setTextColor(0, 0, 0);
        
        doc.setFont("Roboto", "normal");
        doc.setFontSize(10);
        doc.text("KEMENTERIAN RISET, TEKNOLOGI DAN PENDIDIKAN TINGGI", centerX, 14, { align: "center" });
        
        doc.setFont("Roboto", "bold");
        doc.setFontSize(13);
        doc.text("UNIVERSITAS LAMPUNG", centerX, 20, { align: "center" });
        
        doc.setFontSize(15);
        doc.text("FAKULTAS KEDOKTERAN", centerX, 26, { align: "center" });

        doc.setFont("Roboto", "normal");
        doc.setFontSize(8);
        doc.text("Jalan Prof. Dr. Sumantri Brojonegoro No. 1 Telp/Fax (0721) 7691197 Bandar Lampung 35145", centerX, 31, { align: "center" });
        doc.text("Laman : http://www.fk.unila.ac.id Email : dekanfkunila@yahoo.com", centerX, 35, { align: "center" });

        // Garis Double Kop
        doc.setLineWidth(0.8);
        doc.line(15, 38, 195, 38);
        doc.setLineWidth(0.2);
        doc.line(15, 39, 195, 39);

        // Judul Laporan
        let finalY = 52;
        doc.setFontSize(12);
        doc.setFont("Roboto", "bold");
        doc.text("LAPORAN ANALISIS BUTIR SOAL", 105, finalY, { align: "center" });
        doc.setLineWidth(0.3);
        doc.line(72, finalY + 1, 138, finalY + 1);

        finalY += 15;

        // Info Ujian
        doc.setFontSize(10);
        doc.setFont("Roboto", "normal");
        doc.text(`Mata Kuliah : ${test?.title || '-'}`, 15, finalY);
        doc.text(`Total Peserta: ${stats?.total_participants || 0} Mahasiswa`, 15, finalY + 6);
        doc.text(`Dicetak Pada : ${new Date().toLocaleString('id-ID')} WIB`, 15, finalY + 12);

        finalY += 25;

        // Loop Soal
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (finalY > 240) { doc.addPage(); finalY = 20; }

            autoTable(doc, {
                startY: finalY,
                head: [['No', 'Mahasiswa', 'Benar', 'Salah', 'Kosong']],
                body: [[
                    i + 1, 
                    `${q.stats.recurrence}`, 
                    `${q.stats.correct} (${q.stats.correct_pct}%)`,
                    `${q.stats.wrong} (${q.stats.wrong_pct}%)`,
                    `${q.stats.unanswered} (${q.stats.unanswered_pct}%)`
                ]],
                theme: 'grid',
                styles: { fontSize: 8, halign: 'center', font: 'Roboto' },
                headStyles: { fillColor: [240, 240, 240], textColor: 0 },
                margin: { left: 15, right: 15 }
            });

            finalY = doc.lastAutoTable.finalY + 6;

            if (q.question_image) {
                const imgData = await getBase64ImageFromURL(q.question_image);
                if (imgData) {
                    const imgProps = doc.getImageProperties(imgData);
                    const pdfWidth = 60; 
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                    if (finalY + pdfHeight > 270) { doc.addPage(); finalY = 20; }
                    doc.addImage(imgData, 'JPEG', 15, finalY, pdfWidth, pdfHeight);
                    finalY += pdfHeight + 5;
                }
            }

            const cleanQuestion = stripHtml(q.question_text || "");
            doc.setFont("Roboto", "bold");
            const splitTitle = doc.splitTextToSize(`${i+1}. ${cleanQuestion}`, 180);
            if (finalY + (splitTitle.length * 5) > 275) { doc.addPage(); finalY = 20; }
            doc.text(splitTitle, 15, finalY);
            finalY += (splitTitle.length * 5) + 4;

            if (q.answers && q.answers.length > 0) {
                const answerData = q.answers.map((ans, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isKey = ans.is_correct ? ' (Kunci) ✔' : '';
                    return [
                        letter, 
                        stripHtml(ans.answer_text) + isKey, 
                        `${ans.selection_count} mhs`
                    ];
                });

                autoTable(doc, {
                    startY: finalY,
                    body: answerData,
                    theme: 'plain',
                    styles: { fontSize: 9, font: 'Roboto', cellPadding: 1 },
                    columnStyles: { 
                        0: { fontStyle: 'bold', cellWidth: 10 }, 
                        2: { halign: 'right', cellWidth: 30 } 
                    },
                    margin: { left: 20 },
                    didDrawCell: (data) => {
                        if (data.section === 'body' && q.answers[data.row.index].is_correct) {
                            doc.setTextColor(0, 150, 0);
                        }
                    }
                });
                doc.setTextColor(0, 0, 0);
                finalY = doc.lastAutoTable.finalY + 12;
            } else {
                const responses = q.student_responses || [];
                doc.setFont("Roboto", "bold");
                doc.setFontSize(10);
                doc.text("Ringkasan Jawaban Essai", 15, finalY);
                finalY += 6;

                if (responses.length === 0) {
                    doc.setFont("Roboto", "italic");
                    doc.setFontSize(9);
                    doc.text("Belum ada jawaban essai yang masuk.", 20, finalY);
                    finalY += 6;
                } else {
                    responses.forEach((resp, idx) => {
                        if (finalY > 270) {
                            doc.addPage();
                            finalY = 20;
                        }

                        const statusMap = {
                            correct: "Benar",
                            wrong: "Salah",
                            waiting: "Menunggu Penilaian",
                        };
                        const statusLabel = statusMap[resp.status] || "Belum Dinilai";
                        const header = `${idx + 1}. ${resp.student_name || 'Peserta'} (${statusLabel})`;

                        doc.setFont("Roboto", "bold");
                        doc.setFontSize(9);
                        doc.text(header, 20, finalY);
                        finalY += 5;

                        const cleanedText = stripHtml(resp.text || "(Tidak ada jawaban)");
                        const wrapped = doc.splitTextToSize(cleanedText, 170);
                        doc.setFont("Roboto", "normal");
                        doc.setFontSize(9);
                        doc.text(wrapped, 25, finalY);
                        finalY += wrapped.length * 5 + 4;
                    });
                }
            }
        }

        doc.save(`Analisis_Soal_${test?.title}.pdf`);
        setIsGenerating(false);
    };

    return (
        <button 
            onClick={exportPDF}
            disabled={isGenerating}
            className={`bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 ${isGenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isGenerating ? 'Memproses PDF...' : 'Export Analisis PDF'}
        </button>
    );
}