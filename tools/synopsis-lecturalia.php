<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

$title = trim($_GET['title'] ?? '');
$author = trim($_GET['author'] ?? '');

$debug = [
    'params' => [
        'title' => $title,
        'author' => $author,
    ],
];

if ($title === '') {
    http_response_code(400);
    echo json_encode(['error' => 'title required', 'debug' => $debug], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function respond(array $payload): void {
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function cleanText(string $text): string {
    $text = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = preg_replace('/\s+/u', ' ', $text);
    $text = preg_replace('/"{2,}/u', '"', $text);
    return trim($text);
}

function preview(?string $html, int $length = 900): ?string {
    if (!is_string($html)) return null;
    return substr($html, 0, $length);
}

function fetchHtml(string $url, array &$debug, string $stepKey): ?string {
    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_ENCODING => '',
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            . 'AppleWebKit/537.36 (KHTML, like Gecko) '
            . 'Chrome/120.0.0.0 Safari/537.36',
        CURLOPT_HTTPHEADER => [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: es-ES,es;q=0.9,en;q=0.8',
            'Cache-Control: no-cache',
        ],
    ]);

    $html = curl_exec($ch);
    $info = curl_getinfo($ch);
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    curl_close($ch);

    $httpStatus = $info['http_code'] ?? null;

    $debug[$stepKey] = [
        'url' => $url,
        'final_url' => $info['url'] ?? null,
        'http_status' => $httpStatus,
        'curl_errno' => $errno,
        'curl_error' => $error,
        'html_length' => is_string($html) ? strlen($html) : null,
        'html_preview' => ($httpStatus !== 200 || !is_string($html)) ? preview(is_string($html) ? $html : null) : null,
    ];

    return ($httpStatus === 200 && is_string($html)) ? $html : null;
}

function slugify(string $text): string {
    $text = mb_strtolower($text, 'UTF-8');
    $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
    if (is_string($ascii) && $ascii !== '') {
        $text = $ascii;
    }

    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    return trim($text, '-');
}

function loadXPath(string $html): DOMXPath {
    $dom = new DOMDocument();
    @$dom->loadHTML('<?xml encoding="utf-8" ?>' . $html);
    return new DOMXPath($dom);
}

function absoluteLecturaliaUrl(string $href): string {
    $href = html_entity_decode($href, ENT_QUOTES | ENT_HTML5, 'UTF-8');

    if (str_starts_with($href, '//')) {
        return 'https:' . $href;
    }

    if (str_starts_with($href, '/')) {
        return 'https://www.lecturalia.com' . $href;
    }

    return $href;
}

function extractFirstBookUrl(string $html, array &$debug, string $stepKey): ?string {
    $xpath = loadXPath($html);
    $hrefs = $xpath->query("(//a[contains(@href, '/libro/')])[1]/@href");

    $firstHref = $hrefs->length > 0 ? $hrefs->item(0)->nodeValue : null;
    $debug[$stepKey] = [
        'matches_count' => $hrefs->length,
        'first_href' => $firstHref,
    ];

    return $firstHref ? absoluteLecturaliaUrl($firstHref) : null;
}

function extractSynopsis(string $html, array &$debug): string {
    $xpath = loadXPath($html);

    $headingSamples = [];
    $headingNodes = $xpath->query("//*[self::h1 or self::h2 or self::h3 or self::h4]");
    foreach ($headingNodes as $heading) {
        $text = cleanText($heading->textContent);
        if ($text !== '') {
            $headingSamples[] = $text;
        }
        if (count($headingSamples) >= 20) break;
    }

    $debug['detail_inspect'] = [
        'heading_samples' => $headingSamples,
        'idx_resumen' => stripos($html, 'Resumen'),
        'idx_sinopsis' => stripos($html, 'sinopsis'),
        'idx_he_robado' => stripos($html, 'He robado'),
    ];

    $summaryHeadings = $xpath->query(
        "//*[self::h1 or self::h2 or self::h3 or self::h4]"
        . "[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'resumen')"
        . " or contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'sinopsis')]"
    );

    $paragraphs = [];

    if ($summaryHeadings->length > 0) {
        $node = $summaryHeadings->item(0)->nextSibling;
        $buffer = '';

        while ($node !== null) {
            $nodeName = strtolower($node->nodeName);

            if ($node->nodeType === XML_ELEMENT_NODE && in_array($nodeName, ['h1', 'h2', 'h3', 'h4'], true)) {
                break;
            }

            if ($node->nodeType === XML_TEXT_NODE || $node->nodeType === XML_CDATA_SECTION_NODE) {
                $buffer .= ' ' . $node->textContent;
            } elseif ($node->nodeType === XML_ELEMENT_NODE && $nodeName === 'br') {
                $text = cleanText($buffer);
                if ($text !== '') {
                    $paragraphs[] = $text;
                    $buffer = '';
                }
            } elseif ($node->nodeType === XML_ELEMENT_NODE) {
                $class = $node->attributes?->getNamedItem('class')?->nodeValue ?? '';
                if (!str_contains($class, 'promo')) {
                    $text = cleanText($node->textContent);
                    if ($text !== '') {
                        $paragraphs[] = $text;
                    }
                }
            }

            $node = $node->nextSibling;
        }

        $text = cleanText($buffer);
        if ($text !== '') {
            $paragraphs[] = $text;
        }
    }

    if (count($paragraphs) === 0) {
        $siblings = $xpath->query(
            "//*[self::h1 or self::h2 or self::h3 or self::h4]"
            . "[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'resumen')"
            . " or contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'sinopsis')]"
            . "/following-sibling::p"
        );

        foreach ($siblings as $node) {
            $text = cleanText($node->textContent);
            if ($text !== '') $paragraphs[] = $text;
        }
    }

    $paragraphs = array_values(array_filter(array_unique($paragraphs), function ($text) {
        if (strlen($text) <= 2) return false;
        if (stripos($text, 'Ha participado en esta ficha') !== false) return false;
        return true;
    }));

    $debug['synopsis_extract'] = [
        'paragraphs_found' => count($paragraphs),
        'preview' => isset($paragraphs[0]) ? substr($paragraphs[0], 0, 240) : null,
    ];

    return trim(implode("\n\n", $paragraphs));
}

$queries = [$title];
if ($author !== '') {
    $queries[] = $title . ' ' . $author;
}

$bookUrl = null;
$searchHtml = null;

foreach ($queries as $index => $query) {
    $slug = slugify($query);
    $searchUrl = 'https://www.lecturalia.com/s/' . $slug;
    $debug['search_attempts'][] = [
        'query' => $query,
        'slug' => $slug,
        'url' => $searchUrl,
    ];

    $searchHtml = fetchHtml($searchUrl, $debug, 'search_request_' . ($index + 1));
    if (!$searchHtml) continue;

    $bookUrl = extractFirstBookUrl($searchHtml, $debug, 'search_extract_' . ($index + 1));
    if ($bookUrl) {
        $debug['query_used'] = $query;
        $debug['slug_used'] = $slug;
        break;
    }
}

if (!$bookUrl) {
    respond([
        'synopsis' => '',
        'source' => 'lecturalia',
        'fail_step' => $searchHtml ? 'search_no_results' : 'search_request_failed',
        'debug' => $debug,
    ]);
}

$bookHtml = fetchHtml($bookUrl, $debug, 'detail_request');
if (!$bookHtml) {
    respond([
        'synopsis' => '',
        'source' => 'lecturalia',
        'book_url' => $bookUrl,
        'fail_step' => 'detail_request_failed',
        'debug' => $debug,
    ]);
}

$synopsis = extractSynopsis($bookHtml, $debug);

respond([
    'synopsis' => $synopsis,
    'source' => 'lecturalia',
    'book_url' => $bookUrl,
    'fail_step' => $synopsis === '' ? 'synopsis_extract_empty' : null,
    'debug' => $debug,
]);
