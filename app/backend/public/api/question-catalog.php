<?php

declare(strict_types=1);

$appRoot = is_file(dirname(__DIR__) . '/src/bootstrap.php')
    ? dirname(__DIR__)
    : dirname(__DIR__, 2);

require_once $appRoot . '/src/bootstrap.php';

use App\Infrastructure\Database;
use App\Repository\RuleCatalogRepository;
use App\Support\JsonResponse;

$pdo = Database::connect(app_config()['db'] ?? []);
$repository = new RuleCatalogRepository($pdo);
$questions = $repository->fetchQuestionCatalog();

JsonResponse::send([
    'ok' => true,
    'questions' => $questions,
    'count' => count($questions),
]);
