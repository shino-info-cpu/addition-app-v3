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
        $promptText = $this->nullableText($payload['prompt_text'] ?? null);
        $aiDraftText = $this->nullableText($payload['ai_draft_text'] ?? null);
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
        $candidateItems = is_array($payload['candidates'] ?? null) ? $payload['candidates'] : [];
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

        $additionResolution = $this->findAdditionResolution(
            $this->nullableInt($resultJson['addition_id'] ?? null),
            $this->nullableInt($resultJson['addition_branch_id'] ?? null),
            isset($resultJson['addition_code']) ? (string) $resultJson['addition_code'] : '',
            $additionName,
            isset($resultJson['primary_addition_name']) ? (string) $resultJson['primary_addition_name'] : ''
        );
        $additionId = $additionResolution['addition_id'];
        $additionBranchId = $additionResolution['addition_branch_id'];

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

            $this->insertEvaluationCandidates($evaluationCaseId, $candidateItems);

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
                  :addition_branch_id,
                  :message,
                  :result_json
                )
            SQL);
            $resultStatement->bindValue(':evaluation_case_id', $evaluationCaseId, PDO::PARAM_INT);
            $resultStatement->bindValue(':final_status', $finalStatus, PDO::PARAM_STR);
            $resultStatement->bindValue(':addition_id', $additionId, $additionId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $resultStatement->bindValue(':addition_branch_id', $additionBranchId, $additionBranchId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
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
                  :prompt_text,
                  :ai_draft_text,
                  :final_note_text
                )
            SQL);
            $noteStatement->bindValue(':evaluation_case_id', $evaluationCaseId, PDO::PARAM_INT);
            $noteStatement->bindValue(':prompt_text', $promptText, $promptText === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $noteStatement->bindValue(':ai_draft_text', $aiDraftText, $aiDraftText === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $noteStatement->bindValue(':final_note_text', $finalNoteText, PDO::PARAM_STR);
            $noteStatement->execute();

            $this->pdo->commit();

            return [
                'evaluation_case_id' => $evaluationCaseId,
                'performed_at' => $performedAt,
                'evaluated_at' => $evaluatedAt,
                'final_status' => $finalStatus,
                'addition_id' => $additionId,
                'addition_branch_id' => $additionBranchId,
                'addition_name' => $additionName,
                'prompt_text' => $promptText,
                'ai_draft_text' => $aiDraftText,
                'final_note_text' => $finalNoteText,
            ];
        } catch (\Throwable $throwable) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $throwable;
        }
    }

    private function insertEvaluationCandidates(int $evaluationCaseId, array $candidateItems): void
    {
        if ($candidateItems === []) {
            return;
        }

        $statement = $this->pdo->prepare(<<<SQL
            INSERT INTO evaluation_candidate (
              evaluation_case_id,
              addition_branch_id,
              candidate_status,
              matched_group_count,
              display_order,
              detail_json
            ) VALUES (
              :evaluation_case_id,
              :addition_branch_id,
              :candidate_status,
              :matched_group_count,
              :display_order,
              :detail_json
            )
        SQL);

        foreach ($candidateItems as $candidateItem) {
            if (!is_array($candidateItem)) {
                continue;
            }

            $resolution = $this->findAdditionResolution(
                $this->nullableInt($candidateItem['addition_id'] ?? null),
                $this->nullableInt($candidateItem['addition_branch_id'] ?? null),
                isset($candidateItem['addition_code']) ? (string) $candidateItem['addition_code'] : '',
                isset($candidateItem['addition_name']) ? (string) $candidateItem['addition_name'] : '',
                isset($candidateItem['addition_family_name']) ? (string) $candidateItem['addition_family_name'] : ''
            );

            $additionBranchId = $resolution['addition_branch_id'];
            if ($additionBranchId === null) {
                continue;
            }

            $candidateStatus = trim((string) ($candidateItem['candidate_status'] ?? 'candidate'));
            if ($candidateStatus === '') {
                $candidateStatus = 'candidate';
            }

            $matchedGroupCount = max(0, (int) ($candidateItem['matched_group_count'] ?? 0));
            $displayOrder = max(0, (int) ($candidateItem['display_order'] ?? 9999));
            $detailJson = is_array($candidateItem['detail_json'] ?? null)
                ? $this->encodeJson($candidateItem['detail_json'])
                : null;

            $statement->bindValue(':evaluation_case_id', $evaluationCaseId, PDO::PARAM_INT);
            $statement->bindValue(':addition_branch_id', $additionBranchId, PDO::PARAM_INT);
            $statement->bindValue(':candidate_status', $candidateStatus, PDO::PARAM_STR);
            $statement->bindValue(':matched_group_count', $matchedGroupCount, PDO::PARAM_INT);
            $statement->bindValue(':display_order', $displayOrder, PDO::PARAM_INT);
            $statement->bindValue(':detail_json', $detailJson, $detailJson === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $statement->execute();
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

    private function findAdditionResolution(
        ?int $additionIdHint,
        ?int $additionBranchIdHint,
        string $branchCode,
        string $additionName,
        string $primaryAdditionName
    ): array
    {
        if (
            $additionIdHint === null
            && $additionBranchIdHint === null
            && $branchCode === ''
            && $additionName === ''
            && $primaryAdditionName === ''
        ) {
            return [
                'addition_id' => null,
                'addition_branch_id' => null,
            ];
        }

        if ($additionBranchIdHint !== null) {
            $branchByIdStatement = $this->pdo->prepare(<<<SQL
                SELECT
                  a.addition_id,
                  ab.addition_branch_id
                FROM addition_branch AS ab
                INNER JOIN addition AS a
                  ON a.addition_id = ab.addition_id
                 AND a.is_active = 1
                WHERE ab.addition_branch_id = :addition_branch_id
                  AND ab.is_active = 1
                LIMIT 1
            SQL);
            $branchByIdStatement->bindValue(':addition_branch_id', $additionBranchIdHint, PDO::PARAM_INT);
            $branchByIdStatement->execute();

            $branchByIdRow = $branchByIdStatement->fetch(PDO::FETCH_ASSOC);
            if (is_array($branchByIdRow)) {
                return [
                    'addition_id' => isset($branchByIdRow['addition_id']) ? (int) $branchByIdRow['addition_id'] : null,
                    'addition_branch_id' => isset($branchByIdRow['addition_branch_id']) ? (int) $branchByIdRow['addition_branch_id'] : null,
                ];
            }
        }

        if ($branchCode !== '' || $additionName !== '') {
            $branchStatement = $this->pdo->prepare(<<<SQL
                SELECT
                  a.addition_id,
                  ab.addition_branch_id
                FROM addition_branch AS ab
                INNER JOIN addition AS a
                  ON a.addition_id = ab.addition_id
                 AND a.is_active = 1
                WHERE ab.is_active = 1
                  AND (
                    (:branch_code <> '' AND ab.branch_code = :branch_code_match)
                    OR (:branch_name <> '' AND ab.branch_name = :branch_name)
                  )
                ORDER BY ab.addition_branch_id ASC
                LIMIT 1
            SQL);
            $branchStatement->bindValue(':branch_code', $branchCode, PDO::PARAM_STR);
            $branchStatement->bindValue(':branch_code_match', $branchCode, PDO::PARAM_STR);
            $branchStatement->bindValue(':branch_name', $additionName, PDO::PARAM_STR);
            $branchStatement->execute();

            $branchRow = $branchStatement->fetch(PDO::FETCH_ASSOC);
            if (is_array($branchRow)) {
                return [
                    'addition_id' => isset($branchRow['addition_id']) ? (int) $branchRow['addition_id'] : null,
                    'addition_branch_id' => isset($branchRow['addition_branch_id']) ? (int) $branchRow['addition_branch_id'] : null,
                ];
            }
        }

        if ($additionIdHint !== null) {
            $additionByIdStatement = $this->pdo->prepare(<<<SQL
                SELECT addition_id
                FROM addition
                WHERE addition_id = :addition_id
                  AND is_active = 1
                LIMIT 1
            SQL);
            $additionByIdStatement->bindValue(':addition_id', $additionIdHint, PDO::PARAM_INT);
            $additionByIdStatement->execute();

            $additionById = $additionByIdStatement->fetchColumn();
            if ($additionById !== false) {
                return [
                    'addition_id' => (int) $additionById,
                    'addition_branch_id' => null,
                ];
            }
        }

        $statement = $this->pdo->prepare(<<<SQL
            SELECT addition_id
            FROM addition
            WHERE is_active = 1
              AND (
                (:addition_code <> '' AND addition_code = :addition_code_match)
                OR (:addition_name <> '' AND addition_name = :addition_name)
                OR (:primary_addition_name <> '' AND addition_name = :primary_addition_name_match)
              )
            ORDER BY addition_id ASC
            LIMIT 1
        SQL);
        $statement->bindValue(':addition_code', $branchCode, PDO::PARAM_STR);
        $statement->bindValue(':addition_code_match', $branchCode, PDO::PARAM_STR);
        $statement->bindValue(':addition_name', $additionName, PDO::PARAM_STR);
        $statement->bindValue(':primary_addition_name', $primaryAdditionName, PDO::PARAM_STR);
        $statement->bindValue(':primary_addition_name_match', $primaryAdditionName, PDO::PARAM_STR);
        $statement->execute();

        $value = $statement->fetchColumn();
        return [
            'addition_id' => $value === false ? null : (int) $value,
            'addition_branch_id' => null,
        ];
    }

    private function nullableInt($value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        $intValue = (int) $value;
        return $intValue > 0 ? $intValue : null;
    }

    private function nullableText($value): ?string
    {
        $normalized = trim((string) ($value ?? ''));
        return $normalized === '' ? null : $normalized;
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
