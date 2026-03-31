<?php

declare(strict_types=1);

namespace App\Infrastructure;

use RuntimeException;

final class OpenAiRequestException extends RuntimeException
{
    /** @var string */
    private $errorType;

    /** @var int */
    private $httpStatus;

    /** @var int|null */
    private $upstreamStatus;

    public function __construct(
        string $message,
        string $errorType,
        int $httpStatus,
        ?int $upstreamStatus = null,
        ?RuntimeException $previous = null
    ) {
        parent::__construct($message, 0, $previous);
        $this->errorType = $errorType;
        $this->httpStatus = $httpStatus;
        $this->upstreamStatus = $upstreamStatus;
    }

    public function getErrorType(): string
    {
        return $this->errorType;
    }

    public function getHttpStatus(): int
    {
        return $this->httpStatus;
    }

    public function getUpstreamStatus(): ?int
    {
        return $this->upstreamStatus;
    }
}
