<?php

declare(strict_types=1);

$appRoot = is_file(dirname(__DIR__) . '/src/bootstrap.php')
    ? dirname(__DIR__)
    : dirname(__DIR__, 2);

require_once $appRoot . '/src/bootstrap.php';

use App\Infrastructure\OpenAiResponsesClient;
use App\Support\JsonResponse;
use App\Support\Request;
use App\Support\SavedNoteDraftBuilder;

if (Request::method() !== 'POST') {
    JsonResponse::send([
        'ok' => false,
        'error' => [
            'type' => 'method_not_allowed',
            'message' => 'POST を利用してください。',
        ],
    ], 405);
}

$config = app_config();
$openAiConfig = $config['openai'] ?? [];
$openAiEnabled = !empty($openAiConfig['enabled']);
$openAiApiKey = trim((string) ($openAiConfig['api_key'] ?? ''));

if (!$openAiEnabled || $openAiApiKey === '') {
    JsonResponse::send([
        'ok' => false,
        'error' => [
            'type' => 'openai_not_configured',
            'message' => 'AI下書きはまだ設定されていません。',
        ],
    ], 503);
}

$payload = Request::jsonBody();
$builder = new SavedNoteDraftBuilder();
$client = new OpenAiResponsesClient($openAiConfig);

try {
    $promptText = $builder->buildPromptText($payload);
    $result = $client->createTextDraft(
        $builder->buildDeveloperInstructions(),
        $builder->buildUserPrompt($payload)
    );

    JsonResponse::send([
        'ok' => true,
        'item' => [
            'model' => $result['model'],
            'response_id' => $result['response_id'],
            'prompt_text' => $promptText,
            'ai_draft_text' => $result['output_text'],
        ],
    ]);
} catch (\RuntimeException $exception) {
    JsonResponse::send([
        'ok' => false,
        'error' => [
            'type' => 'validation_error',
            'message' => $exception->getMessage(),
        ],
    ], 422);
}
