<?php

declare(strict_types=1);

namespace App\Infrastructure;

use RuntimeException;

final class OpenAiResponsesClient
{
    /** @var array<string, mixed> */
    private $config;

    /**
     * @param array<string, mixed> $config
     */
    public function __construct(array $config)
    {
        $this->config = $config;
    }

    /**
     * @return array{model: string, response_id: string, output_text: string}
     */
    public function createTextDraft(string $instructions, string $promptText): array
    {
        $apiKey = trim((string) ($this->config['api_key'] ?? ''));
        if ($apiKey === '') {
            throw new RuntimeException('OpenAI APIキーが未設定です。');
        }

        $baseUrl = rtrim((string) ($this->config['base_url'] ?? 'https://api.openai.com/v1'), '/');
        $model = trim((string) ($this->config['model'] ?? 'gpt-5.4'));
        $timeoutSeconds = max(5, (int) ($this->config['timeout_seconds'] ?? 30));
        $maxOutputTokens = max(128, (int) ($this->config['max_output_tokens'] ?? 600));
        $reasoningEffort = trim((string) ($this->config['reasoning_effort'] ?? ''));

        $payload = [
            'model' => $model,
            'max_output_tokens' => $maxOutputTokens,
            'input' => [
                [
                    'role' => 'developer',
                    'content' => [
                        [
                            'type' => 'input_text',
                            'text' => $instructions,
                        ],
                    ],
                ],
                [
                    'role' => 'user',
                    'content' => [
                        [
                            'type' => 'input_text',
                            'text' => $promptText,
                        ],
                    ],
                ],
            ],
        ];

        if ($reasoningEffort !== '') {
            $payload['reasoning'] = [
                'effort' => $reasoningEffort,
            ];
        }

        $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($body === false) {
            throw new RuntimeException('OpenAI リクエストの JSON 化に失敗しました。');
        }

        if (!function_exists('curl_init')) {
            throw new RuntimeException('このサーバーでは cURL が利用できません。');
        }

        /** @var resource|false $curl */
        $curl = curl_init($baseUrl . '/responses');
        if ($curl === false) {
            throw new RuntimeException('OpenAI 接続初期化に失敗しました。');
        }

        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_TIMEOUT => $timeoutSeconds,
        ]);

        $rawResponse = curl_exec($curl);
        $curlError = curl_error($curl);
        $statusCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($rawResponse === false) {
            throw new RuntimeException($curlError !== '' ? $curlError : 'OpenAI API への接続に失敗しました。');
        }

        /** @var array<string, mixed>|null $decoded */
        $decoded = json_decode($rawResponse, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('OpenAI API 応答の解析に失敗しました。');
        }

        if ($statusCode >= 400) {
            $message = trim((string) (($decoded['error']['message'] ?? '') ?: 'OpenAI API でエラーが発生しました。'));
            throw new RuntimeException($message);
        }

        $outputText = $this->extractOutputText($decoded);
        if ($outputText === '') {
            throw new RuntimeException('OpenAI API から下書き本文を取得できませんでした。');
        }

        return [
            'model' => $model,
            'response_id' => trim((string) ($decoded['id'] ?? '')),
            'output_text' => $outputText,
        ];
    }

    /**
     * @param array<string, mixed> $response
     */
    private function extractOutputText(array $response): string
    {
        $directText = trim((string) ($response['output_text'] ?? ''));
        if ($directText !== '') {
            return $directText;
        }

        $texts = [];
        $outputItems = $response['output'] ?? [];
        if (!is_array($outputItems)) {
            return '';
        }

        foreach ($outputItems as $outputItem) {
            if (!is_array($outputItem)) {
                continue;
            }

            $contentItems = $outputItem['content'] ?? [];
            if (!is_array($contentItems)) {
                continue;
            }

            foreach ($contentItems as $contentItem) {
                if (!is_array($contentItem)) {
                    continue;
                }

                $text = trim((string) ($contentItem['text'] ?? ''));
                if ($text !== '') {
                    $texts[] = $text;
                }
            }
        }

        return trim(implode("\n\n", $texts));
    }
}
