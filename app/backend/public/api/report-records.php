<?php

declare(strict_types=1);

$appRoot = is_file(dirname(__DIR__) . '/src/bootstrap.php')
    ? dirname(__DIR__)
    : dirname(__DIR__, 2);

require_once $appRoot . '/src/bootstrap.php';

use App\Infrastructure\Database;
use App\Repository\ReportRepository;
use App\Support\JsonResponse;
use App\Support\Request;

$pdo = Database::connect(app_config()['db'] ?? []);
$repository = new ReportRepository($pdo);
$clientId = Request::queryInt('client_id', 0);

$items = $repository->fetchRecords([
    'client_id' => $clientId > 0 ? $clientId : null,
    'target_month' => Request::queryString('target_month'),
    'client' => Request::queryString('client'),
    'organization' => Request::queryString('organization'),
    'addition' => Request::queryString('addition'),
    'status' => Request::queryString('status'),
    'post_check_status' => Request::queryString('post_check_status'),
    'staff' => Request::queryString('staff'),
    'limit' => Request::queryInt('limit', 200),
]);

JsonResponse::send([
    'ok' => true,
    'items' => $items,
    'count' => count($items),
]);
