<?php

declare(strict_types=1);

return [
    'app' => [
        'name' => '加算アプリ v3',
        'timezone' => 'Asia/Tokyo',
    ],
    'db' => [
        'host' => 'mysql***.db.sakura.ne.jp',
        'port' => 3306,
        'database' => 'your_database_name',
        'username' => 'your_database_user',
        'password' => 'your_database_password',
        'charset' => 'utf8mb4',
    ],
    'openai' => [
        'enabled' => false,
        'api_key' => 'sk-...',
        'model' => 'gpt-5.4',
        'reasoning_effort' => 'minimal',
        'max_output_tokens' => 600,
        'timeout_seconds' => 30,
    ],
];
