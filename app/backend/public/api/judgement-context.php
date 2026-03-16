<?php

declare(strict_types=1);

$appRoot = is_file(dirname(__DIR__) . '/src/bootstrap.php')
    ? dirname(__DIR__)
    : dirname(__DIR__, 2);

require_once $appRoot . '/src/bootstrap.php';

use App\Infrastructure\Database;
use App\Repository\JudgementRepository;
use App\Support\JsonResponse;
use App\Support\Request;

$clientId = Request::queryInt('client_id', 0);

if ($clientId <= 0) {
    JsonResponse::send([
        'ok' => false,
        'error' => [
            'type' => 'validation_error',
            'message' => 'client_id を指定してください。',
        ],
    ], 422);
}

$pdo = Database::connect(app_config()['db'] ?? []);
$repository = new JudgementRepository($pdo);
$context = $repository->fetchClientContext($clientId);

JsonResponse::send([
    'ok' => true,
    'client' => $context['client'],
    'enrollments' => $context['enrollments'],
    'count' => count($context['enrollments']),
]);
