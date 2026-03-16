<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;
use RuntimeException;

final class EvaluationRepository
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function saveJudgement(array $payload): array
    {
        $clientId = (int) ($payload['client_id'] ?? 0);
        $organizationId = (int) ($payload['organization_id'] ?? 0);
        $serviceDefinitionId = (int) ($payload['service_definition_id'] ?? 0);
        $staffId = (int) ($payload['staff_id'] ?? 0);
        $targetMonth = trim((string) ($payload['target_month'] ?? ''));
        $performedAt = $this->normalizeDateTime($payload['performed_at'] ?? null);
        $finalStatus = trim((string) ($payload['final_status'] ?? ''));
        $additionName = trim((string) ($payload['addition_name'] ?? ''));
        $message = trim((string) ($payload['message'] ?? ''));
        $finalNoteText = trim((string) ($payload['final_note_text'] ?? ''));

        if ($clientId <= 0 || $organizationId <= 0 || $serviceDefinitionId <= 0 || $staffId <= 0) {
            throw new RuntimeException('利用者・機関・サービス・相談員を指定してください。');
        }

        if (!preg_match('/^\d{4}-\d{2}$/', $targetMonth)) {
            throw new RuntimeException('target_month の形式が不正です。');
        }

        if ($finalStatus === '' || $additionName === '' || $finalNoteText === '') {
            throw new RuntimeException('保存に必要な判定結果が不足しています。');
        }

        $clientEnrollmentId = $this->nullableInt($payload['client_enrollment_id'] ?? null);
        $serviceGroupId = $this->nullableInt($payload['service_group_id'] ?? null);
        $answers = is_array($payload['answers'] ?? null) ? $payload['answers'] : [];
        $requestJson = is_array($payload['request'] ?? null) ? $payload['request'] : [];
        $resultJson = is_array($payload['result'] ?? null) ? $payload['result'] : [];

        $this->assertActiveExists('client', 'client_id', $clientId, '利用者が見つかりません。');
        $this->assertActiveExists('organization', 'organization_id', $organizationId, '機関が見つかりません。');
        $this->assertActiveExists('service_definition', 'service_definition_id', $serviceDefinitionId, 'サービスが見つかりません。');
        $this->assertActiveExists('staff', 'staff_id', $staffId, '相談員が見つかりません。');

        if ($clientEnrollmentId !== null) {
            $this->assertClientEnrollmentMatches($clientEnrollmentId, $clientId, $organizationId, $serviceDefinitionId);
        }

        if ($serviceGroupId !== null) {
            $this->assertServiceGroupExists($serviceGroupId);
        }

        $additionId = $this->findAdditionIdByNameOrCode(
            isset($resultJson['addition_code']) ? (string) $resultJson['addition_code'] : '',
            $additionName
        );

        $evaluatedAt = date('Y-m-d H:i:s');

        $this->pdo->beginTransaction();

        try {
            $caseStatement = $this->pdo->prepare(<<<SQL
                INSERT INTO evaluation_case (
                  client_enrollment_id,
                  client_id,
                  organization_id,
                  service_definition_id,
                  service_group_id,
                  staff_id,
                  target_month,
                  performed_at,
                  status,
                  source_channel,
                  request_json,
                  evaluated_at
                ) VALUES (
                  :client_enrollment_id,
                  :client_id,
                  :organization_id,
                  :service_definition_id,
                  :service_group_id,
                  :staff_id,
                  :target_month,
                  :performed_at,
                  :status,
                  :source_channel,
                  :request_json,
                  :evaluated_at
                )
            SQL);
            $caseStatement->bindValue(':client_enrollment_id', $clientEnrollmentId, $clientEnrollmentId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $caseStatement->bindValue(':client_id', $clientId, PDO::PARAM_INT);
            $caseStatement->bindValue(':organization_id', $organizationId, PDO::PARAM_INT);
            $caseStatement->bindValue(':service_definition_id', $serviceDefinitionId, PDO::PARAM_INT);
            $caseStatement->bindValue(':service_group_id', $serviceGroupId, $serviceGroupId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $caseStatement->bindValue(':staff_id', $staffId, PDO::PARAM_INT);
            $caseStatement->bindValue(':target_month', $targetMonth, PDO::PARAM_STR);
            $caseStatement->bindValue(':performed_at', $performedAt, $performedAt === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $caseStatement->bindValue(':status', $finalStatus === '自動確定' ? 'completed' : 'review_required', PDO::PARAM_STR);
            $caseStatement->bindValue(':source_channel', 'ui', PDO::PARAM_STR);
            $caseStatement->bindValue(':request_json', $this->encodeJson($requestJson), PDO::PARAM_STR);
            $caseStatement->bindValue(':evaluated_at', $evaluatedAt, PDO::PARAM_STR);
            $caseStatement->execute();

            $evaluationCaseId = (int) $this->pdo->lastInsertId();

            $answerStatement = $this->pdo->prepare(<<<SQL
                INSERT INTO evaluation_answer (
                  evaluation_case_id,
                  field_key,
                  answer_value_json,
                  answer_label
                ) VALUES (
                  :evaluation_case_id,
                  :field_key,
                  :answer_value_json,
                  :answer_label
                )
            SQL);

            foreach ($answers as $fieldKey => $answerValue) {
                $normalizedKey = trim((string) $fieldKey);
                if ($normalizedKey === '' || $answerValue === null || $answerValue === '') {
                    continue;
                }

                $answerStatement->bindValue(':evaluation_case_id', $evaluationCaseId, PDO::PARAM_INT);
                $answerStatement->bindValue(':field_key', $normalizedKey, PDO::PARAM_STR);
                $answerStatement->bindValue(':answer_value_json', $this->encodeJson($answerValue), PDO::PARAM_STR);
                $answerStatement->bindValue(':answer_label', is_scalar($answerValue) ? (string) $answerValue : json_encode($answerValue), PDO::PARAM_STR);
                $answerStatement->execute();
            }

            $resultStatement = $this->pdo->prepare(<<<SQL
                INSERT INTO evaluation_result (
                  evaluation_case_id,
                  final_status,
                  addition_id,
                  addition_branch_id,
                  message,
                  result_json
                ) VALUES (
                  :evaluation_case_id,
                  :final_status,
                  :addition_id,
                  NULL,
                  :message,
                  :result_json
                )
            SQL);
            $resultStatement->bindValue(':evaluation_case_id', $evaluationCaseId, PDO::PARAM_INT);
            $resultStatement->bindValue(':final_status', $finalStatus, PDO::PARAM_STR);
            $resultStatement->bindValue(':addition_id', $additionId, $additionId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $resultStatement->bindValue(':message', $message, PDO::PARAM_STR);
            $resultStatement->bindValue(':result_json', $this->encodeJson($resultJson), PDO::PARAM_STR);
            $resultStatement->execute();

            $noteStatement = $this->pdo->prepare(<<<SQL
                INSERT INTO saved_note (
                  evaluation_case_id,
                  prompt_text,
                  ai_draft_text,
                  final_note_text
                ) VALUES (
                  :evaluation_case_id,
                  NULL,
                  NULL,
                  :final_note_text
                )
            SQL);
            $noteStatement->bindValue(':evaluation_case_id', $evaluationCaseId, PDO::PARAM_INT);
            $noteStatement->bindValue(':final_note_text', $finalNoteText, PDO::PARAM_STR);
            $noteStatement->execute();

            $this->pdo->commit();

            return [
                'evaluation_case_id' => $evaluationCaseId,
                'performed_at' => $performedAt,
                'evaluated_at' => $evaluatedAt,
                'final_status' => $finalStatus,
                'addition_name' => $additionName,
                'final_note_text' => $finalNoteText,
            ];
        } catch (\Throwable $throwable) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $throwable;
        }
    }

    private function assertActiveExists(string $table, string $idColumn, int $id, string $message): void
    {
        $statement = $this->pdo->prepare(sprintf(
            'SELECT 1 FROM %s WHERE %s = :id AND is_active = 1 LIMIT 1',
            $table,
            $idColumn
        ));
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        if ($statement->fetchColumn() === false) {
            throw new RuntimeException($message);
        }
    }

    private function assertClientEnrollmentMatches(
        int $clientEnrollmentId,
        int $clientId,
        int $organizationId,
        int $serviceDefinitionId
    ): void {
        $statement = $this->pdo->prepare(<<<SQL
            SELECT 1
            FROM client_enrollment AS ce
            INNER JOIN organization_service AS os
              ON os.organization_service_id = ce.organization_service_id
             AND os.is_active = 1
            WHERE ce.client_enrollment_id = :client_enrollment_id
              AND ce.client_id = :client_id
              AND os.organization_id = :organization_id
              AND os.service_definition_id = :service_definition_id
              AND ce.is_active = 1
            LIMIT 1
        SQL);
        $statement->bindValue(':client_enrollment_id', $clientEnrollmentId, PDO::PARAM_INT);
        $statement->bindValue(':client_id', $clientId, PDO::PARAM_INT);
        $statement->bindValue(':organization_id', $organizationId, PDO::PARAM_INT);
        $statement->bindValue(':service_definition_id', $serviceDefinitionId, PDO::PARAM_INT);
        $statement->execute();

        if ($statement->fetchColumn() === false) {
            throw new RuntimeException('利用状況の参照先が、選択した利用者・機関・サービスと一致しません。');
        }
    }

    private function assertServiceGroupExists(int $serviceGroupId): void
    {
        $statement = $this->pdo->prepare(<<<SQL
            SELECT 1
            FROM service_group
            WHERE service_group_id = :service_group_id
              AND is_active = 1
            LIMIT 1
        SQL);
        $statement->bindValue(':service_group_id', $serviceGroupId, PDO::PARAM_INT);
        $statement->execute();

        if ($statement->fetchColumn() === false) {
            throw new RuntimeException('サービスグループが見つかりません。');
        }
    }

    private function findAdditionIdByNameOrCode(string $additionCode, string $additionName): ?int
    {
        if ($additionCode === '' && $additionName === '') {
            return null;
        }

        $statement = $this->pdo->prepare(<<<SQL
            SELECT addition_id
            FROM addition
            WHERE is_active = 1
              AND (
                (:addition_code <> '' AND addition_code = :addition_code_match)
                OR (:addition_name <> '' AND addition_name = :addition_name)
              )
            ORDER BY addition_id ASC
            LIMIT 1
        SQL);
        $statement->bindValue(':addition_code', $additionCode, PDO::PARAM_STR);
        $statement->bindValue(':addition_code_match', $additionCode, PDO::PARAM_STR);
        $statement->bindValue(':addition_name', $additionName, PDO::PARAM_STR);
        $statement->execute();

        $value = $statement->fetchColumn();
        return $value === false ? null : (int) $value;
    }

    private function nullableInt($value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        $intValue = (int) $value;
        return $intValue > 0 ? $intValue : null;
    }

    private function normalizeDateTime($value): ?string
    {
        $normalized = trim((string) ($value ?? ''));
        if ($normalized === '') {
            return null;
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $normalized) === 1) {
            return str_replace('T', ' ', $normalized) . ':00';
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $normalized) === 1) {
            return $normalized . ':00';
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $normalized) === 1) {
            return $normalized;
        }

        throw new RuntimeException('performed_at の形式が不正です。');
    }

    private function encodeJson($value): string
    {
        $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            throw new RuntimeException('JSON 変換に失敗しました。');
        }

        return $encoded;
    }
}
