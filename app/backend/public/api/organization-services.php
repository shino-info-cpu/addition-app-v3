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
    $organizationId = Request::queryInt('organization_id', 0);

    if ($organizationId <= 0) {
        JsonResponse::send([
            'ok' => false,
            'error' => [
                'type' => 'validation_error',
                'message' => 'organization_id を指定してください。',
            ],
        ], 422);
    }

    $items = $repository->fetchOrganizationServices($organizationId);

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
            $organizationServiceId = (int) ($payload['organization_service_id'] ?? 0);

            if ($organizationServiceId <= 0) {
                JsonResponse::send([
                    'ok' => false,
                    'error' => [
                        'type' => 'validation_error',
                        'message' => 'organization_service_id を指定してください。',
                    ],
                ], 422);
            }

            $item = $repository->deactivateOrganizationService($organizationServiceId);

            JsonResponse::send([
                'ok' => true,
                'item' => $item,
            ]);
        }

        $organizationId = (int) ($payload['organization_id'] ?? 0);
        $serviceDefinitionId = (int) ($payload['service_definition_id'] ?? 0);

        if ($organizationId <= 0 || $serviceDefinitionId <= 0) {
            JsonResponse::send([
                'ok' => false,
                'error' => [
                    'type' => 'validation_error',
                    'message' => 'organization_id と service_definition_id を指定してください。',
                ],
            ], 422);
        }

        $item = $repository->createOrganizationService($organizationId, $serviceDefinitionId);

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
