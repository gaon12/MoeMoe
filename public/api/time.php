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

/**
 * Emit CORS headers only for the production app and local Vite servers.
 * Requests without Origin remain available to non-browser HTTP clients.
 */
function applyCorsHeaders(): bool
{
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
    header('Access-Control-Allow-Headers: Accept');
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

/** @param array<string, scalar> $payload */
function sendJson(int $status, array $payload, bool $includeBody = true): void
{
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) {
        $status = 500;
        $json = '{"error":"internal_error"}';
    }

    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Length: ' . strlen($json));
    if ($includeBody) {
        echo $json;
    }
    exit;
}

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
header('Referrer-Policy: no-referrer');
header('Allow: GET, HEAD, OPTIONS');

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$originAllowed = applyCorsHeaders();

if ($method === 'OPTIONS') {
    if (!$originAllowed) {
        sendJson(403, ['error' => 'forbidden']);
    }
    http_response_code(204);
    header('Content-Length: 0');
    exit;
}

if (!in_array($method, ['GET', 'HEAD'], true)) {
    sendJson(405, ['error' => 'method_not_allowed'], $method !== 'HEAD');
}

if (!$originAllowed) {
    sendJson(403, ['error' => 'forbidden'], $method !== 'HEAD');
}

$now = microtime(true);
$timestampMilliseconds = (int) floor($now * 1000);
$timestampSeconds = (int) floor($now);

sendJson(
    200,
    [
        'timestamp' => $timestampMilliseconds,
        'unixtime' => $timestampSeconds,
        'utc_datetime' => gmdate('Y-m-d\TH:i:s', $timestampSeconds) . sprintf('.%03dZ', $timestampMilliseconds % 1000),
        'timezone' => 'UTC',
    ],
    $method !== 'HEAD'
);
