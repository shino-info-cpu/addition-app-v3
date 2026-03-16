<?php

declare(strict_types=1);

use App\Support\JsonResponse;

const APP_ROOT = __DIR__ . '/..';

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $path = APP_ROOT . '/src/' . str_replace('\\', '/', $relative) . '.php';

    if (is_file($path)) {
        require_once $path;
    }
});

set_exception_handler(static function (Throwable $throwable): void {
    JsonResponse::send(
        [
            'ok' => false,
            'error' => [
                'type' => 'server_error',
                'message' => $throwable->getMessage(),
            ],
        ],
        500
    );
});

function app_config(): array
{
    static $config;

    if ($config !== null) {
        return $config;
    }

    $configFile = APP_ROOT . '/config/app.php';

    if (!is_file($configFile)) {
        throw new RuntimeException('config/app.php がありません。app.example.php をコピーして設定してください。');
    }

    $config = require $configFile;

    if (!is_array($config)) {
        throw new RuntimeException('config/app.php の形式が不正です。');
    }

    $timezone = $config['app']['timezone'] ?? 'Asia/Tokyo';
    date_default_timezone_set($timezone);

    return $config;
}
