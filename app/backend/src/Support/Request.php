<?php

declare(strict_types=1);

namespace App\Support;

final class Request
{
    public static function method(): string
    {
        return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    }

    public static function queryString(string $key, ?string $default = null): ?string
    {
        $value = $_GET[$key] ?? $default;

        if ($value === null) {
            return null;
        }

        $trimmed = trim((string) $value);

        return $trimmed === '' ? $default : $trimmed;
    }

    public static function queryInt(string $key, int $default): int
    {
        $value = $_GET[$key] ?? null;

        if ($value === null || $value === '') {
            return $default;
        }

        return (int) $value;
    }

    public static function jsonBody(): array
    {
        $raw = file_get_contents('php://input');

        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        if (!is_array($decoded)) {
            throw new \RuntimeException('JSON リクエストの形式が不正です。');
        }

        return $decoded;
    }
}
