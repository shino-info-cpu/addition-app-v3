<?php

declare(strict_types=1);

$appRoot = is_file(dirname(__DIR__) . '/src/bootstrap.php')
    ? dirname(__DIR__)
    : dirname(__DIR__, 2);

require_once $appRoot . '/src/bootstrap.php';

use App\Infrastructure\Database;
use App\Repository\MasterRepository;
use App\Support\JsonResponse;
use App\Support\Request;

$pdo = Database::connect(app_config()['db'] ?? []);
$repository = new MasterRepository($pdo);

$items = $repository->fetchStaff(Request::queryString('search'));

JsonResponse::send([
    'ok' => true,
    'items' => $items,
    'count' => count($items),
]);
