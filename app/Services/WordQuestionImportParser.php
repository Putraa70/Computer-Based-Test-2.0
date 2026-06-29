<?php

namespace App\Services;

use DOMDocument;
use DOMNode;
use DOMXPath;

class WordQuestionImportParser
{
    public function parse(string $html): array
    {
        $blocks = $this->extractBlocks($html);
        $questions = [];
        $errors = [];
        $current = null;

        foreach ($blocks as $block) {
            $text = $this->normalizeText($block['text']);

            if ($text === '') {
                continue;
            }

            if (preg_match('/^\s*(\d+)[\.\)]\s*(.+)$/u', $text, $matches)) {
                if ($current !== null) {
                    $questions[] = $current;
                }

                $current = [
                    'number' => (int) $matches[1],
                    'question_html' => $this->cleanLeadingMarker($block['html'], '/^\s*\d+[\.\)]\s*/u'),
                    'question_text' => trim($matches[2]),
                    'options' => [],
                    'answer_key' => null,
                ];

                continue;
            }

            if ($current === null) {
                $errors[] = 'Baris sebelum soal pertama tidak dikenali: ' . $text;
                continue;
            }

            if (preg_match('/^\s*(ANSWER|KUNCI|JAWABAN)\s*[:：]\s*([A-J])\s*$/iu', $text, $matches)) {
                $current['answer_key'] = strtoupper($matches[2]);
                continue;
            }

            if (preg_match('/^\s*([A-J])[\.\)]\s*(.+)$/iu', $text, $matches)) {
                $label = strtoupper($matches[1]);

                $current['options'][] = [
                    'label' => $label,
                    'html' => $this->cleanLeadingMarker($block['html'], '/^\s*' . preg_quote($label, '/') . '[\.\)]\s*/iu'),
                    'text' => trim($matches[2]),
                    'is_bold' => $this->hasBoldFormatting($block['html']),
                    'is_correct' => false,
                ];

                continue;
            }

            if (empty($current['options'])) {
                $current['question_html'] .= '<br>' . $this->sanitizeHtml($block['html']);
                $current['question_text'] .= "\n" . $text;
            } else {
                $errors[] = "Soal {$current['number']}: baris tidak dikenali setelah opsi jawaban: {$text}";
            }
        }

        if ($current !== null) {
            $questions[] = $current;
        }

        foreach ($questions as $index => &$question) {
            $questionErrors = $this->validateAndMarkCorrectAnswer($question, $index + 1);
            $errors = array_merge($errors, $questionErrors);
        }
        unset($question);

        return [
            'questions' => $questions,
            'errors' => $errors,
        ];
    }

    private function validateAndMarkCorrectAnswer(array &$question, int $fallbackNumber): array
    {
        $number = $question['number'] ?: $fallbackNumber;
        $errors = [];

        if (trim(strip_tags($question['question_html'])) === '') {
            $errors[] = "Soal {$number}: teks soal tidak boleh kosong.";
        }

        $optionCount = count($question['options']);
        if ($optionCount < 2) {
            $errors[] = "Soal {$number}: minimal 2 pilihan jawaban.";
        }

        if ($optionCount > 10) {
            $errors[] = "Soal {$number}: maksimal 10 pilihan jawaban.";
        }

        $labels = array_column($question['options'], 'label');
        if (count($labels) !== count(array_unique($labels))) {
            $errors[] = "Soal {$number}: label pilihan jawaban tidak boleh duplikat.";
        }

        $correctLabels = [];
        if ($question['answer_key']) {
            $correctLabels = [$question['answer_key']];
        } else {
            $correctLabels = collect($question['options'])
                ->where('is_bold', true)
                ->pluck('label')
                ->all();
        }

        if (count($correctLabels) !== 1) {
            $errors[] = "Soal {$number}: harus ada tepat satu jawaban benar.";
        }

        $correctLabel = $correctLabels[0] ?? null;
        if ($correctLabel && !in_array($correctLabel, $labels, true)) {
            $errors[] = "Soal {$number}: kunci {$correctLabel} tidak ditemukan pada pilihan jawaban.";
        }

        foreach ($question['options'] as &$option) {
            if (trim(strip_tags($option['html'])) === '') {
                $errors[] = "Soal {$number}: pilihan {$option['label']} tidak boleh kosong.";
            }

            $option['is_correct'] = $correctLabel === $option['label'];
        }
        unset($option);

        return $errors;
    }

    private function extractBlocks(string $html): array
    {
        $document = new DOMDocument();

        libxml_use_internal_errors(true);
        $document->loadHTML(
            '<meta http-equiv="Content-Type" content="text/html; charset=utf-8"><body>' . $html . '</body>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();

        $xpath = new DOMXPath($document);
        $nodes = $xpath->query('//p|//li|//h1|//h2|//h3|//h4|//h5|//h6|//tr');
        $blocks = [];

        foreach ($nodes as $node) {
            $htmlContent = $this->innerHtml($node);
            $text = $node->textContent ?? '';

            if (trim($text) !== '') {
                $blocks[] = [
                    'html' => $this->sanitizeHtml($htmlContent),
                    'text' => $text,
                ];
            }
        }

        if (!empty($blocks)) {
            return $blocks;
        }

        $body = $document->getElementsByTagName('body')->item(0);
        if (!$body) {
            return [];
        }

        return [[
            'html' => $this->sanitizeHtml($this->innerHtml($body)),
            'text' => $body->textContent ?? '',
        ]];
    }

    private function hasBoldFormatting(string $html): bool
    {
        if (preg_match('/<(strong|b)(\s|>)/i', $html)) {
            return true;
        }

        if (preg_match('/font-weight\s*:\s*(bold|[6-9]00)\b/i', $html)) {
            return true;
        }

        $document = new DOMDocument();

        libxml_use_internal_errors(true);
        $document->loadHTML(
            '<meta http-equiv="Content-Type" content="text/html; charset=utf-8"><div>' . $html . '</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();

        $xpath = new DOMXPath($document);
        $nodes = $xpath->query('//*[@style]');

        foreach ($nodes as $node) {
            $style = $node->attributes?->getNamedItem('style')?->nodeValue ?? '';

            if (preg_match('/font-weight\s*:\s*(bold|[6-9]00)\b/i', $style)) {
                return true;
            }
        }

        return false;
    }

    private function cleanLeadingMarker(string $html, string $pattern): string
    {
        $plainPrefix = trim(strip_tags($html));

        if (!preg_match($pattern, $plainPrefix, $matches)) {
            return $this->sanitizeHtml($html);
        }

        $document = new DOMDocument();

        libxml_use_internal_errors(true);
        $document->loadHTML(
            '<meta http-equiv="Content-Type" content="text/html; charset=utf-8"><div id="word-import-root">' . $html . '</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();

        $root = $document->getElementById('word-import-root');
        if (!$root) {
            return $this->sanitizeHtml($html);
        }

        $this->removeMarkerFromFirstTextNode($root, $pattern);

        return $this->sanitizeHtml($this->innerHtml($root));
    }

    private function removeMarkerFromFirstTextNode(DOMNode $node, string $pattern): bool
    {
        if ($node->nodeType === XML_TEXT_NODE) {
            $original = $node->nodeValue ?? '';
            $cleaned = preg_replace($pattern, '', $original, 1);

            if ($cleaned !== $original) {
                $node->nodeValue = $cleaned;
                return true;
            }

            return trim($original) !== '';
        }

        foreach ($node->childNodes as $child) {
            if ($this->removeMarkerFromFirstTextNode($child, $pattern)) {
                return true;
            }
        }

        return false;
    }

    private function sanitizeHtml(string $html): string
    {
        $html = preg_replace('/<\s*(script|style)[^>]*>.*?<\s*\/\s*\1\s*>/is', '', $html);
        $html = preg_replace('/\son\w+\s*=\s*(".*?"|\'.*?\'|[^\s>]+)/i', '', $html);
        $html = preg_replace('/\s(href|src)\s*=\s*("|\')\s*javascript:.*?\2/i', '', $html);

        return trim($html);
    }

    private function normalizeText(string $text): string
    {
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\x{00A0}/u', ' ', $text);
        $text = preg_replace('/\s+/u', ' ', $text);

        return trim($text);
    }

    private function innerHtml(DOMNode $node): string
    {
        $html = '';

        foreach ($node->childNodes as $child) {
            $html .= $node->ownerDocument->saveHTML($child);
        }

        return $html;
    }
}
