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
];

$appName = '加算アプリ v3';

if ($checks['config']) {
    $appName = app_config()['app']['name'] ?? $appName;
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
