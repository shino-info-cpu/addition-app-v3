<?php

declare(strict_types=1);

$appRoot = is_file(dirname(__DIR__) . '/src/bootstrap.php')
    ? dirname(__DIR__)
    : dirname(__DIR__, 2);

require_once $appRoot . '/src/bootstrap.php';

use App\Infrastructure\Database;
use App\Repository\EvaluationRepository;
use App\Support\JsonResponse;
use App\Support\Request;

if (Request::method() !== 'POST') {
    JsonResponse::send([
        'ok' => false,
        'error' => [
            'type' => 'method_not_allowed',
            'message' => 'POST を利用してください。',
        ],
    ], 405);
}

$pdo = Database::connect(app_config()['db'] ?? []);
$repository = new EvaluationRepository($pdo);
$payload = Request::jsonBody();

try {
    $item = $repository->saveJudgement($payload);

    JsonResponse::send([
        'ok' => true,
        'item' => $item,
    ], 201);
} catch (\RuntimeException $exception) {
    JsonResponse::send([
        'ok' => false,
        'error' => [
            'type' => 'validation_error',
            'message' => $exception->getMessage(),
        ],
    ], 422);
}
