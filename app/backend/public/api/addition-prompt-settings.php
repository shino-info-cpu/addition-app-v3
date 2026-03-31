<?php

declare(strict_types=1);

$appRoot = is_file(dirname(__DIR__) . '/src/bootstrap.php')
    ? dirname(__DIR__)
    : dirname(__DIR__, 2);

require_once $appRoot . '/src/bootstrap.php';

use App\Infrastructure\Database;
use App\Repository\RuleCatalogRepository;
use App\Support\JsonResponse;
use App\Support\Request;

$pdo = Database::connect(app_config()['db'] ?? []);
$repository = new RuleCatalogRepository($pdo);

try {
    if (Request::method() === 'GET') {
        $items = $repository->fetchAdditionPromptSettings();

        JsonResponse::send([
            'ok' => true,
            'items' => $items,
            'count' => count($items),
        ]);
    }

    if (Request::method() === 'POST') {
        $body = Request::jsonBody();

        $additionId = (int) ($body['addition_id'] ?? 0);
        if ($additionId <= 0) {
            JsonResponse::send([
                'ok' => false,
                'error' => [
                    'type' => 'validation_error',
                    'message' => '加算を選んでください。',
                ],
            ], 422);
        }

        $promptTemplate = (string) ($body['prompt_template'] ?? '');
        if (trim($promptTemplate) === '') {
            $promptTemplate = '';
        }
        $item = $repository->updateAdditionPromptTemplate($additionId, $promptTemplate);

        if ($item === null) {
            JsonResponse::send([
                'ok' => false,
                'error' => [
                    'type' => 'not_found',
                    'message' => '対象の加算が見つかりません。',
                ],
            ], 404);
        }

        JsonResponse::send([
            'ok' => true,
            'item' => $item,
        ]);
    }

    JsonResponse::send([
        'ok' => false,
        'error' => [
            'type' => 'method_not_allowed',
            'message' => 'このメソッドは使えません。',
        ],
    ], 405);
} catch (RuntimeException $exception) {
    JsonResponse::send([
        'ok' => false,
        'error' => [
            'type' => 'validation_error',
            'message' => $exception->getMessage(),
        ],
    ], 422);
} catch (Throwable $exception) {
    JsonResponse::send([
        'ok' => false,
        'error' => [
            'type' => 'server_error',
            'message' => '加算のAI指示文設定でエラーが発生しました。',
            'detail' => $exception->getMessage(),
        ],
    ], 500);
}
