<?php

declare(strict_types=1);

$appRoot = is_file(dirname(__DIR__) . '/src/bootstrap.php')
    ? dirname(__DIR__)
    : dirname(__DIR__, 2);

require_once $appRoot . '/src/bootstrap.php';

use App\Infrastructure\Database;
use App\Repository\RelationRepository;
use App\Support\JsonResponse;
use App\Support\Request;

$pdo = Database::connect(app_config()['db'] ?? []);
$repository = new RelationRepository($pdo);
$method = Request::method();

if ($method === 'GET') {
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

    $items = $repository->fetchClientEnrollments($clientId);

    JsonResponse::send([
        'ok' => true,
        'items' => $items,
        'count' => count($items),
    ]);
}

if ($method === 'POST') {
    $payload = Request::jsonBody();

    try {
        if (($payload['action'] ?? '') === 'deactivate') {
            $clientEnrollmentId = (int) ($payload['client_enrollment_id'] ?? 0);

            if ($clientEnrollmentId <= 0) {
                JsonResponse::send([
                    'ok' => false,
                    'error' => [
                        'type' => 'validation_error',
                        'message' => 'client_enrollment_id を指定してください。',
                    ],
                ], 422);
            }

            $item = $repository->deactivateClientEnrollment($clientEnrollmentId);

            JsonResponse::send([
                'ok' => true,
                'item' => $item,
            ]);
        }

        $clientId = (int) ($payload['client_id'] ?? 0);
        $organizationServiceId = (int) ($payload['organization_service_id'] ?? 0);
        $groupName = isset($payload['group_name']) ? trim((string) $payload['group_name']) : null;

        if ($clientId <= 0 || $organizationServiceId <= 0) {
            JsonResponse::send([
                'ok' => false,
                'error' => [
                    'type' => 'validation_error',
                    'message' => 'client_id と organization_service_id を指定してください。',
                ],
            ], 422);
        }

        $item = $repository->createClientEnrollment(
            $clientId,
            $organizationServiceId,
            $groupName === '' ? null : $groupName
        );

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
}

JsonResponse::send([
    'ok' => false,
    'error' => [
        'type' => 'method_not_allowed',
        'message' => 'GET または POST を利用してください。',
    ],
], 405);
