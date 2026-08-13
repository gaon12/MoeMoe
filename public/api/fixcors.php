<?php

declare(strict_types=1);

ini_set('display_errors', '0');
header_remove('X-Powered-By');

const ALLOWED_ORIGINS = [
    'https://moemoe.uiharu.dev',
    'http://localhost:4173',
    'http://localhost:5173',
    'http://127.0.0.1:4173',
    'http://127.0.0.1:5173',
];

const MAX_URL_LENGTH = 4096;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_JSON_BYTES = 256 * 1024;
const CONNECT_TIMEOUT_SECONDS = 4;
const TOTAL_TIMEOUT_SECONDS = 15;

const IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
];

/**
 * Each host is paired with only the paths currently returned by MoeMoe's
 * configured image providers. No suffix or wildcard host matching is used.
 *
 * @var array<string, list<string>>
 */
const IMAGE_TARGETS = [
    'nekos.best' => ['/api/v2/waifu/'],
    'i.waifu.pics' => ['/'],
    'cdn.nekosia.cat' => ['/images/'],
    'cdn.waifu.im' => ['/'],
    'nekos.moe' => ['/image/'],
    'cdn.donmai.us' => ['/original/', '/sample/', '/180x180/'],
    'pic.re' => ['/image'],
    'cdn.nekosapi.com' => ['/images/original/', '/nekos-api/images/original/'],
    'w.wallhaven.cc' => ['/full/'],
    'picsum.photos' => ['/1920/1080'],
];

/** Emit tightly scoped browser CORS headers without allowing credentials. */
function applyCorsHeaders(): bool
{
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
    header('Access-Control-Allow-Headers: Accept');
    header('Access-Control-Expose-Headers: Content-Length, Content-Type, Cache-Control');
    header('Access-Control-Max-Age: 600');

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return true;
    }

    if (!in_array($origin, ALLOWED_ORIGINS, true)) {
        return false;
    }

    header('Access-Control-Allow-Origin: ' . $origin);
    return true;
}

function sendError(int $status, string $code, bool $includeBody = true): void
{
    $json = json_encode(['error' => $code], JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) {
        $status = 500;
        $json = '{"error":"internal_error"}';
    }

    http_response_code($status);
    header('Cache-Control: no-store');
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Length: ' . strlen($json));
    if ($includeBody) {
        echo $json;
    }
    exit;
}

/** Return true only for an exact allowed path or an allowed directory prefix. */
function pathIsAllowed(string $path, array $allowedPaths): bool
{
    foreach ($allowedPaths as $allowedPath) {
        if (substr($allowedPath, -1) === '/') {
            if (strncmp($path, $allowedPath, strlen($allowedPath)) === 0) {
                return true;
            }
        } elseif ($path === $allowedPath) {
            return true;
        }
    }

    return false;
}

/** Validate the small subset of Nekos API query parameters used by the app. */
function isAllowedNekosApiQuery(string $query): bool
{
    if ($query === '') {
        return true;
    }

    parse_str($query, $parameters);
    foreach ($parameters as $key => $value) {
        if (!in_array($key, ['limit', 'rating'], true) || is_array($value)) {
            return false;
        }
    }

    if (isset($parameters['limit'])) {
        $limit = filter_var($parameters['limit'], FILTER_VALIDATE_INT);
        if ($limit === false || $limit < 1 || $limit > 5) {
            return false;
        }
    }

    if (isset($parameters['rating']) && $parameters['rating'] !== 'safe') {
        return false;
    }

    return true;
}

/**
 * @return array{kind: 'image'|'json', maxBytes: int}|null
 */
function classifyTarget(string $url): ?array
{
    if ($url === '' || strlen($url) > MAX_URL_LENGTH) {
        return null;
    }

    if (preg_match('/[\x00-\x20\x7f]/', $url) === 1 || strpos($url, '#') !== false) {
        return null;
    }

    $parts = parse_url($url);
    if (!is_array($parts)) {
        return null;
    }

    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    $host = strtolower(rtrim((string) ($parts['host'] ?? ''), '.'));
    $path = (string) ($parts['path'] ?? '/');
    $port = $parts['port'] ?? 443;

    if (
        $scheme !== 'https'
        || $host === ''
        || isset($parts['user'])
        || isset($parts['pass'])
        || $port !== 443
        || filter_var($url, FILTER_VALIDATE_URL) === false
    ) {
        return null;
    }

    if ($host === 'api.nekosapi.com') {
        $query = (string) ($parts['query'] ?? '');
        if ($path !== '/v4/images/random' || !isAllowedNekosApiQuery($query)) {
            return null;
        }

        return ['kind' => 'json', 'maxBytes' => MAX_JSON_BYTES];
    }

    if (!array_key_exists($host, IMAGE_TARGETS)) {
        return null;
    }

    if (!pathIsAllowed($path, IMAGE_TARGETS[$host])) {
        return null;
    }

    return ['kind' => 'image', 'maxBytes' => MAX_IMAGE_BYTES];
}

/** Resolve and pin one public IPv4 address to prevent DNS-rebinding SSRF. */
function resolvePublicAddress(string $host): ?string
{
    $records = @dns_get_record($host, DNS_A);
    $addresses = [];

    if (is_array($records)) {
        foreach ($records as $record) {
            if (isset($record['ip']) && is_string($record['ip'])) {
                $addresses[] = $record['ip'];
            }
        }
    }

    if ($addresses === []) {
        $fallback = @gethostbynamel($host);
        if (is_array($fallback)) {
            $addresses = $fallback;
        }
    }

    $addresses = array_values(array_unique($addresses));
    if ($addresses === []) {
        return null;
    }

    foreach ($addresses as $address) {
        $publicAddress = filter_var(
            $address,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        );
        if ($publicAddress === false) {
            return null;
        }
    }

    return $addresses[0];
}

/** Verify file signatures instead of trusting the upstream Content-Type alone. */
function hasValidImageSignature(string $mimeType, string $prefix): bool
{
    if ($mimeType === 'image/jpeg') {
        return strlen($prefix) >= 3 && substr($prefix, 0, 3) === "\xff\xd8\xff";
    }

    if ($mimeType === 'image/png') {
        return strlen($prefix) >= 8 && substr($prefix, 0, 8) === "\x89PNG\r\n\x1a\n";
    }

    if ($mimeType === 'image/gif') {
        return strncmp($prefix, 'GIF87a', 6) === 0 || strncmp($prefix, 'GIF89a', 6) === 0;
    }

    if ($mimeType === 'image/webp') {
        return strlen($prefix) >= 12
            && substr($prefix, 0, 4) === 'RIFF'
            && substr($prefix, 8, 4) === 'WEBP';
    }

    if ($mimeType === 'image/avif') {
        if (strlen($prefix) < 16 || substr($prefix, 4, 4) !== 'ftyp') {
            return false;
        }

        $brands = substr($prefix, 8, 56);
        return strpos($brands, 'avif') !== false || strpos($brands, 'avis') !== false;
    }

    return false;
}

header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
header('Referrer-Policy: no-referrer');
header('Cross-Origin-Resource-Policy: cross-origin');
header('Allow: GET, HEAD, OPTIONS');

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$includeBody = $method !== 'HEAD';
$originAllowed = applyCorsHeaders();

if ($method === 'OPTIONS') {
    if (!$originAllowed) {
        sendError(403, 'forbidden');
    }
    http_response_code(204);
    header('Content-Length: 0');
    exit;
}

if (!in_array($method, ['GET', 'HEAD'], true)) {
    sendError(405, 'method_not_allowed', $includeBody);
}

if (!$originAllowed) {
    sendError(403, 'forbidden', $includeBody);
}

$target = $_GET['url'] ?? null;
if (!is_string($target)) {
    sendError(400, 'invalid_target', $includeBody);
}

$classification = classifyTarget($target);
if ($classification === null) {
    sendError(400, 'invalid_target', $includeBody);
}

$parts = parse_url($target);
$host = is_array($parts) ? strtolower(rtrim((string) ($parts['host'] ?? ''), '.')) : '';
$address = $host === '' ? null : resolvePublicAddress($host);
if ($address === null) {
    sendError(502, 'upstream_unavailable', $includeBody);
}

if (!function_exists('curl_init')) {
    sendError(503, 'proxy_unavailable', $includeBody);
}

$maxBytes = $classification['maxBytes'];
$responseHeaders = [];
$bytesReceived = 0;
$responseTooLarge = false;
$body = fopen('php://temp/maxmemory:2097152', 'w+b');
if ($body === false) {
    sendError(500, 'internal_error', $includeBody);
}

$curl = curl_init();
if ($curl === false) {
    fclose($body);
    sendError(503, 'proxy_unavailable', $includeBody);
}

$options = [
    CURLOPT_URL => $target,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_NOBODY => $method === 'HEAD',
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_MAXREDIRS => 0,
    CURLOPT_CONNECTTIMEOUT => CONNECT_TIMEOUT_SECONDS,
    CURLOPT_TIMEOUT => TOTAL_TIMEOUT_SECONDS,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
    CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
    CURLOPT_RESOLVE => [$host . ':443:' . $address],
    CURLOPT_USERAGENT => 'MoeMoe-Proxy/1.0 (+https://moemoe.uiharu.dev)',
    CURLOPT_HTTPHEADER => [
        $classification['kind'] === 'json'
            ? 'Accept: application/json'
            : 'Accept: image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.8',
    ],
    CURLOPT_ENCODING => '',
    CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$responseHeaders, &$responseTooLarge, $maxBytes): int {
        $length = strlen($line);
        if (preg_match('/^HTTP\/[0-9.]+\s+[0-9]{3}/i', $line) === 1) {
            $responseHeaders = [];
            return $length;
        }

        $separator = strpos($line, ':');
        if ($separator === false) {
            return $length;
        }

        $name = strtolower(trim(substr($line, 0, $separator)));
        $value = trim(substr($line, $separator + 1));
        $responseHeaders[$name] = $value;

        if ($name === 'content-length' && ctype_digit($value) && (int) $value > $maxBytes) {
            $responseTooLarge = true;
            return 0;
        }

        return $length;
    },
    CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use ($body, &$bytesReceived, &$responseTooLarge, $maxBytes): int {
        $length = strlen($chunk);
        if ($bytesReceived + $length > $maxBytes) {
            $responseTooLarge = true;
            return 0;
        }

        $written = fwrite($body, $chunk);
        if ($written === false || $written !== $length) {
            return 0;
        }

        $bytesReceived += $length;
        return $length;
    },
];

curl_setopt_array($curl, $options);
$success = curl_exec($curl);
$status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
curl_close($curl);

if ($responseTooLarge) {
    fclose($body);
    sendError(413, 'response_too_large', $includeBody);
}

if ($success === false || $status < 200 || $status >= 300) {
    fclose($body);
    sendError(502, 'upstream_unavailable', $includeBody);
}

$contentTypeHeader = strtolower((string) ($responseHeaders['content-type'] ?? ''));
$mimeType = trim(explode(';', $contentTypeHeader, 2)[0]);

if ($classification['kind'] === 'json') {
    if ($mimeType !== 'application/json') {
        fclose($body);
        sendError(502, 'unsupported_media', $includeBody);
    }

    if ($method !== 'HEAD') {
        rewind($body);
        $json = stream_get_contents($body);
        $decoded = is_string($json) ? json_decode($json, true) : null;
        if (!is_array($decoded) || json_last_error() !== JSON_ERROR_NONE) {
            fclose($body);
            sendError(502, 'invalid_upstream_response', true);
        }
        rewind($body);
    }

    header('Cache-Control: no-store');
} else {
    if (!in_array($mimeType, IMAGE_MIME_TYPES, true)) {
        fclose($body);
        sendError(502, 'unsupported_media', $includeBody);
    }

    if ($method !== 'HEAD') {
        rewind($body);
        $prefix = fread($body, 64);
        if (!is_string($prefix) || !hasValidImageSignature($mimeType, $prefix)) {
            fclose($body);
            sendError(502, 'invalid_upstream_response', true);
        }
        rewind($body);
    }

    header('Cache-Control: public, max-age=3600, stale-while-revalidate=86400');
}

http_response_code(200);
header('Content-Type: ' . $mimeType);
$responseLength = $bytesReceived;
if ($method === 'HEAD' && isset($responseHeaders['content-length']) && ctype_digit($responseHeaders['content-length'])) {
    $responseLength = (int) $responseHeaders['content-length'];
}
header('Content-Length: ' . $responseLength);

if ($includeBody) {
    fpassthru($body);
}

fclose($body);
