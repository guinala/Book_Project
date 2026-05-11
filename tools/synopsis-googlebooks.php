<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

$title = trim($_GET['title'] ?? '');
$author = trim($_GET['author'] ?? '');
$lang = trim($_GET['lang'] ?? 'es');

$debug = [
    'params' => [
        'title' => $title,
        'author' => $author,
        'lang' => $lang,
    ],
];

if ($title === '') {
    http_response_code(400);
    echo json_encode(['error' => 'title required', 'debug' => $debug], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function cleanText(string $text): string {
    $text = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = preg_replace('/\s+/u', ' ', $text);
    $text = trim($text);

    $boilerplatePatterns = [
        '/Read this book using Google Play Books app.*$/iu',
        '/Descarga.*?Google Play Libros.*$/iu',
        '/Download for offline reading.*$/iu',
        '/Preview this book.*$/iu',
    ];

    foreach ($boilerplatePatterns as $pattern) {
        $text = preg_replace($pattern, '', $text);
    }

    return trim($text);
}

function shortPreview(?string $html, int $length = 900): ?string {
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
        'html_preview' => ($httpStatus !== 200 || !is_string($html)) ? shortPreview(is_string($html) ? $html : null) : null,
    ];

    return ($httpStatus === 200 && is_string($html)) ? $html : null;
}

function loadDom(string $html): DOMXPath {
    $dom = new DOMDocument();
    @$dom->loadHTML('<?xml encoding="utf-8" ?>' . $html);
    return new DOMXPath($dom);
}

function absoluteGoogleBooksUrl(string $href): ?string {
    if ($href === '') return null;

    $href = html_entity_decode($href, ENT_QUOTES | ENT_HTML5, 'UTF-8');

    if (str_starts_with($href, '//')) {
        $href = 'https:' . $href;
    } elseif (str_starts_with($href, '/')) {
        $href = 'https://books.google.com' . $href;
    }

    $parts = parse_url($href);
    if (!$parts || empty($parts['host'])) return null;

    if (!str_contains($parts['host'], 'books.google.')) return null;

    $path = $parts['path'] ?? '';
    $query = $parts['query'] ?? '';
    if (!str_contains($path, '/books') || !str_contains($query, 'id=')) return null;

    return $href;
}

function extractGoogleBooksUrlFromHref(string $href): ?string {
    $href = html_entity_decode($href, ENT_QUOTES | ENT_HTML5, 'UTF-8');

    $direct = absoluteGoogleBooksUrl($href);
    if ($direct) return $direct;

    $googleUrl = $href;
    if (str_starts_with($googleUrl, '/')) {
        $googleUrl = 'https://www.google.com' . $googleUrl;
    }

    $query = parse_url($googleUrl, PHP_URL_QUERY);
    if (!$query) return null;

    parse_str($query, $params);

    foreach (['url', 'q'] as $key) {
        if (empty($params[$key]) || !is_string($params[$key])) continue;

        $target = urldecode($params[$key]);
        $resolved = absoluteGoogleBooksUrl($target);
        if ($resolved) return $resolved;
    }

    return null;
}

function getQueryParam(string $url, string $key): ?string {
    $query = parse_url($url, PHP_URL_QUERY);
    if (!$query) return null;

    parse_str($query, $params);
    $value = $params[$key] ?? null;

    return is_string($value) && $value !== '' ? $value : null;
}

function withQueryParam(string $url, string $key, string $value): string {
    $parts = parse_url($url);
    if (!$parts) return $url;

    $queryParams = [];
    if (!empty($parts['query'])) {
        parse_str($parts['query'], $queryParams);
    }
    $queryParams[$key] = $value;

    $scheme = $parts['scheme'] ?? 'https';
    $host = $parts['host'] ?? 'books.google.com';
    $path = $parts['path'] ?? '';
    $query = http_build_query($queryParams);

    return $scheme . '://' . $host . $path . ($query ? '?' . $query : '');
}

function extractBookLinks(string $html, string $lang, array &$debug): array {
    $xpath = loadDom($html);
    $nodes = $xpath->query("//a[@href]/@href");

    $links = [];
    $seenIds = [];
    $hrefSamples = [];
    $looksLikeJsRequired = false;

    foreach ($nodes as $node) {
        $href = $node->nodeValue;
        if (count($hrefSamples) < 12) {
            $hrefSamples[] = $href;
        }
        if (str_contains($href, '/httpservice/retry/enablejs') || str_contains($href, 'support.google.com/websearch')) {
            $looksLikeJsRequired = true;
        }

        $url = extractGoogleBooksUrlFromHref($href);
        if (!$url) continue;

        $id = getQueryParam($url, 'id');
        if (!$id || isset($seenIds[$id])) continue;

        $seenIds[$id] = true;
        $links[] = withQueryParam($url, 'hl', $lang);
    }

    $debug['search_extract'] = [
        'matches_count' => count($links),
        'first_href' => $links[0] ?? null,
        'candidates' => array_slice($links, 0, 5),
        'raw_href_samples' => $hrefSamples,
        'looks_like_js_required' => $looksLikeJsRequired,
    ];

    return $links;
}

function collectJsonLdDescriptions(DOMXPath $xpath): array {
    $descriptions = [];
    $nodes = $xpath->query("//script[contains(@type, 'ld+json')]");

    $walk = function ($value) use (&$walk, &$descriptions): void {
        if (is_array($value)) {
            if (isset($value['description']) && is_string($value['description'])) {
                $descriptions[] = ['source' => 'json_ld', 'text' => $value['description']];
            }
            foreach ($value as $child) {
                $walk($child);
            }
        }
    };

    foreach ($nodes as $node) {
        $json = trim($node->textContent);
        if ($json === '') continue;

        $decoded = json_decode($json, true);
        if (is_array($decoded)) {
            $walk($decoded);
        }
    }

    return $descriptions;
}

function collectMetaDescriptions(DOMXPath $xpath): array {
    $descriptions = [];
    $queries = [
        "//meta[translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='description']/@content",
        "//meta[translate(@property, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='og:description']/@content",
        "//meta[translate(@itemprop, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='description']/@content",
    ];

    foreach ($queries as $query) {
        $nodes = $xpath->query($query);
        foreach ($nodes as $node) {
            $descriptions[] = ['source' => 'meta', 'text' => $node->nodeValue];
        }
    }

    return $descriptions;
}

function collectVisibleDescriptions(DOMXPath $xpath): array {
    $descriptions = [];
    $queries = [
        "//*[contains(translate(@aria-label, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'description')]",
        "//*[contains(translate(@class, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'description')]",
        "//*[contains(translate(@id, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'description')]",
        "//*[contains(translate(@class, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'synopsis')]",
        "//*[contains(translate(@id, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'synopsis')]",
    ];

    foreach ($queries as $query) {
        $nodes = $xpath->query($query);
        foreach ($nodes as $node) {
            $descriptions[] = ['source' => 'visible_html', 'text' => $node->textContent];
        }
    }

    return $descriptions;
}

function pickBestSynopsis(string $html, array &$debug): array {
    $xpath = loadDom($html);
    $candidates = array_merge(
        collectJsonLdDescriptions($xpath),
        collectMetaDescriptions($xpath),
        collectVisibleDescriptions($xpath)
    );

    $cleanCandidates = [];
    foreach ($candidates as $candidate) {
        $text = cleanText($candidate['text'] ?? '');
        if (strlen($text) < 60) continue;

        $key = mb_strtolower($text, 'UTF-8');
        if (isset($cleanCandidates[$key])) continue;

        $cleanCandidates[$key] = [
            'source' => $candidate['source'],
            'text' => $text,
            'length' => strlen($text),
        ];
    }

    $cleanCandidates = array_values($cleanCandidates);

    usort($cleanCandidates, function ($a, $b) {
        return $b['length'] <=> $a['length'];
    });

    $selected = $cleanCandidates[0] ?? null;

    $debug['synopsis_extract'] = [
        'candidates_count' => count($cleanCandidates),
        'selected_source' => $selected['source'] ?? null,
        'selected_length' => $selected['length'] ?? 0,
        'candidate_previews' => array_map(
            fn ($candidate) => [
                'source' => $candidate['source'],
                'length' => $candidate['length'],
                'preview' => substr($candidate['text'], 0, 240),
            ],
            array_slice($cleanCandidates, 0, 3)
        ),
    ];

    return [
        'synopsis' => $selected['text'] ?? '',
        'source' => $selected['source'] ?? null,
    ];
}

function respond(array $payload): void {
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$searchQueries = [$title];
if ($author !== '') {
    $searchQueries[] = $title . ' ' . $author;
}

$bookLinks = [];
$searchHtml = null;

foreach ($searchQueries as $index => $query) {
    $searchUrl = 'https://books.google.com/books?' . http_build_query([
        'q' => $query,
        'hl' => $lang,
    ]);

    $stepKey = 'search_request_' . ($index + 1);
    $searchHtml = fetchHtml($searchUrl, $debug, $stepKey);
    if (!$searchHtml) continue;

    $debug['query_used'] = $query;
    $bookLinks = extractBookLinks($searchHtml, $lang, $debug);
    if (count($bookLinks) > 0) break;

    if (($debug['search_extract']['looks_like_js_required'] ?? false) === true) {
        break;
    }
}

if (count($bookLinks) === 0) {
    $blocked = ($debug['search_extract']['looks_like_js_required'] ?? false) === true;

    respond([
        'synopsis' => '',
        'source' => 'google_books_html',
        'fail_step' => $blocked ? 'google_search_requires_js_or_blocked' : ($searchHtml ? 'search_no_results' : 'search_request_failed'),
        'debug' => $debug,
    ]);
}

$lastDetailHtml = null;

foreach (array_slice($bookLinks, 0, 3) as $i => $bookUrl) {
    $detailStep = 'detail_request_' . ($i + 1);
    $detailHtml = fetchHtml($bookUrl, $debug, $detailStep);
    if (!$detailHtml) continue;

    $lastDetailHtml = $detailHtml;
    $result = pickBestSynopsis($detailHtml, $debug);

    if ($result['synopsis'] !== '') {
        respond([
            'synopsis' => $result['synopsis'],
            'source' => 'google_books_html',
            'extract_source' => $result['source'],
            'book_url' => $bookUrl,
            'fail_step' => null,
            'debug' => $debug,
        ]);
    }
}

if ($lastDetailHtml === null) {
    respond([
        'synopsis' => '',
        'source' => 'google_books_html',
        'fail_step' => 'detail_request_failed',
        'debug' => $debug,
    ]);
}

respond([
    'synopsis' => '',
    'source' => 'google_books_html',
    'fail_step' => 'synopsis_extract_empty',
    'debug' => $debug,
]);
