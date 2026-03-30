<?php

declare(strict_types=1);

$appRoot = is_file(dirname(__DIR__) . '/src/bootstrap.php')
    ? dirname(__DIR__)
    : dirname(__DIR__, 2);

require_once $appRoot . '/src/bootstrap.php';

use App\Infrastructure\Database;
use App\Support\JsonResponse;
use App\Support\Request;

$configFile = $appRoot . '/config/app.php';
$checks = [
    'config' => is_file($configFile),
    'openai' => false,
];

$appName = '加算アプリ v3';

if ($checks['config']) {
    $config = app_config();
    $appName = $config['app']['name'] ?? $appName;
    $openAiConfig = $config['openai'] ?? [];
    $checks['openai'] = !empty($openAiConfig['enabled']) && trim((string) ($openAiConfig['api_key'] ?? '')) !== '';
}

if (Request::queryString('check') === 'db') {
    $pdo = Database::connect(app_config()['db'] ?? []);
    $pdo->query('SELECT 1');
    $checks['db'] = true;
}

JsonResponse::send([
    'ok' => true,
    'app' => $appName,
    'checks' => $checks,
    'timestamp' => date(DATE_ATOM),
]);
