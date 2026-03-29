<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

final class ReportRepository
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function fetchRecords(array $filters): array
    {
        $additionNameExpression = "COALESCE(ab.branch_name, a.addition_name, JSON_UNQUOTE(JSON_EXTRACT(er.result_json, '$.addition_name')))";
        $additionCodeExpression = "COALESCE(ab.branch_code, a.addition_code, JSON_UNQUOTE(JSON_EXTRACT(er.result_json, '$.addition_code')))";
        $additionFamilyCodeExpression = "COALESCE(a.addition_code, JSON_UNQUOTE(JSON_EXTRACT(er.result_json, '$.primary_addition_code')))";
        $additionFamilyNameExpression = "COALESCE(a.addition_name, JSON_UNQUOTE(JSON_EXTRACT(er.result_json, '$.primary_addition_name')))";
        $resultStorageModeExpression = "CASE WHEN er.addition_branch_id IS NOT NULL THEN 'branch' WHEN er.addition_id IS NOT NULL THEN 'family' ELSE 'json' END";
        $candidateStorageModeExpression = "CASE WHEN candidate_agg.evaluation_case_id IS NOT NULL THEN 'db' WHEN JSON_EXTRACT(er.result_json, '$.candidate_count') IS NOT NULL THEN 'json' WHEN er.addition_branch_id IS NOT NULL OR er.addition_id IS NOT NULL THEN 'fallback' ELSE 'none' END";
        $actionTypeExpression = "JSON_UNQUOTE(JSON_EXTRACT(ec.request_json, '$.answers.actionType'))";
        $postCheckExpression = "JSON_UNQUOTE(JSON_EXTRACT(er.result_json, '$.post_check'))";
        $postCheckStatusExpression = "JSON_UNQUOTE(JSON_EXTRACT(er.result_json, '$.post_check_status'))";
        $candidateCountExpression = "COALESCE(candidate_agg.candidate_count, CAST(JSON_UNQUOTE(JSON_EXTRACT(er.result_json, '$.candidate_count')) AS UNSIGNED), 0)";
        $candidateNamesSummaryExpression = "COALESCE(candidate_agg.candidate_names_summary, '')";

        $sql = <<<SQL
            SELECT
              ec.evaluation_case_id,
              ec.target_month,
              ec.performed_at,
              ec.evaluated_at,
              ec.client_id,
              c.client_name,
              c.target_type,
              ec.organization_id,
              o.organization_name,
              ec.service_definition_id,
              sd.service_name,
              ec.staff_id,
              st.staff_name,
              {$actionTypeExpression} AS action_type,
              er.final_status,
              er.message,
              er.addition_id,
              er.addition_branch_id,
              {$additionCodeExpression} AS addition_code,
              {$additionNameExpression} AS addition_name,
              {$additionFamilyCodeExpression} AS addition_family_code,
              {$additionFamilyNameExpression} AS addition_family_name,
              {$resultStorageModeExpression} AS result_storage_mode,
              {$candidateStorageModeExpression} AS candidate_storage_mode,
              {$candidateCountExpression} AS candidate_count,
              {$candidateNamesSummaryExpression} AS candidate_names_summary,
              {$postCheckExpression} AS post_check,
              {$postCheckStatusExpression} AS post_check_status,
              sn.final_note_text
            FROM evaluation_case AS ec
            INNER JOIN evaluation_result AS er
              ON er.evaluation_case_id = ec.evaluation_case_id
            LEFT JOIN client AS c
              ON c.client_id = ec.client_id
            LEFT JOIN organization AS o
              ON o.organization_id = ec.organization_id
            LEFT JOIN service_definition AS sd
              ON sd.service_definition_id = ec.service_definition_id
            LEFT JOIN staff AS st
              ON st.staff_id = ec.staff_id
            LEFT JOIN addition AS a
              ON a.addition_id = er.addition_id
            LEFT JOIN addition_branch AS ab
              ON ab.addition_branch_id = er.addition_branch_id
            LEFT JOIN (
              SELECT
                ecand.evaluation_case_id,
                COUNT(*) AS candidate_count,
                GROUP_CONCAT(
                  COALESCE(
                    ab2.branch_name,
                    JSON_UNQUOTE(JSON_EXTRACT(ecand.detail_json, '$.addition_name'))
                  )
                  ORDER BY ecand.display_order ASC
                  SEPARATOR ' / '
                ) AS candidate_names_summary
              FROM evaluation_candidate AS ecand
              LEFT JOIN addition_branch AS ab2
                ON ab2.addition_branch_id = ecand.addition_branch_id
              GROUP BY ecand.evaluation_case_id
            ) AS candidate_agg
              ON candidate_agg.evaluation_case_id = ec.evaluation_case_id
            LEFT JOIN saved_note AS sn
              ON sn.evaluation_case_id = ec.evaluation_case_id
            WHERE 1 = 1
        SQL;

        $params = [];

        if (($filters['client_id'] ?? null) !== null) {
            $sql .= ' AND ec.client_id = :client_id';
            $params['client_id'] = (int) $filters['client_id'];
        }

        if (($filters['target_month'] ?? null) !== null) {
            $sql .= ' AND ec.target_month = :target_month';
            $params['target_month'] = $filters['target_month'];
        }

        if (($filters['client'] ?? null) !== null) {
            $sql .= ' AND c.client_name LIKE :client';
            $params['client'] = '%' . $filters['client'] . '%';
        }

        if (($filters['organization'] ?? null) !== null) {
            $sql .= ' AND o.organization_name LIKE :organization';
            $params['organization'] = '%' . $filters['organization'] . '%';
        }

        if (($filters['addition'] ?? null) !== null) {
            $sql .= " AND {$additionNameExpression} LIKE :addition";
            $params['addition'] = '%' . $filters['addition'] . '%';
        }

        if (($filters['status'] ?? null) !== null) {
            $sql .= ' AND er.final_status = :status';
            $params['status'] = $filters['status'];
        }

        if (($filters['post_check_status'] ?? null) !== null) {
            $sql .= " AND {$postCheckStatusExpression} = :post_check_status";
            $params['post_check_status'] = $filters['post_check_status'];
        }

        if (($filters['staff'] ?? null) !== null) {
            $sql .= ' AND st.staff_name LIKE :staff';
            $params['staff'] = '%' . $filters['staff'] . '%';
        }

        $sql .= <<<SQL
            ORDER BY
              ec.target_month DESC,
              ec.evaluated_at DESC,
              ec.evaluation_case_id DESC
            LIMIT :limit
        SQL;

        $statement = $this->pdo->prepare($sql);

        foreach ($params as $key => $value) {
            $statement->bindValue(
                ':' . $key,
                $value,
                $key === 'client_id' ? PDO::PARAM_INT : PDO::PARAM_STR
            );
        }

        $statement->bindValue(':limit', (int) ($filters['limit'] ?? 200), PDO::PARAM_INT);
        $statement->execute();

        return $this->attachCandidateDetails($statement->fetchAll());
    }

    private function attachCandidateDetails(array $records): array
    {
        if ($records === []) {
            return $records;
        }

        $caseIds = [];
        foreach ($records as $record) {
            $caseId = isset($record['evaluation_case_id']) ? (int) $record['evaluation_case_id'] : 0;
            if ($caseId > 0) {
                $caseIds[$caseId] = $caseId;
            }
        }

        if ($caseIds === []) {
            return $records;
        }

        $placeholders = [];
        $detailParams = [];
        $index = 0;
        foreach (array_values($caseIds) as $caseId) {
            $placeholder = ':case_id_' . $index;
            $placeholders[] = $placeholder;
            $detailParams[$placeholder] = $caseId;
            $index += 1;
        }

        $detailSql = sprintf(
            <<<SQL
                SELECT
                  ecand.evaluation_case_id,
                  ecand.candidate_status,
                  ecand.matched_group_count,
                  ecand.display_order,
                  COALESCE(
                    ab.branch_code,
                    JSON_UNQUOTE(JSON_EXTRACT(ecand.detail_json, '$.addition_code'))
                  ) AS addition_code,
                  COALESCE(
                    ab.branch_name,
                    JSON_UNQUOTE(JSON_EXTRACT(ecand.detail_json, '$.addition_name'))
                  ) AS addition_name
                FROM evaluation_candidate AS ecand
                LEFT JOIN addition_branch AS ab
                  ON ab.addition_branch_id = ecand.addition_branch_id
                WHERE ecand.evaluation_case_id IN (%s)
                ORDER BY
                  ecand.evaluation_case_id ASC,
                  ecand.display_order ASC,
                  ecand.evaluation_candidate_id ASC
            SQL,
            implode(', ', $placeholders)
        );

        $detailStatement = $this->pdo->prepare($detailSql);
        foreach ($detailParams as $placeholder => $caseId) {
            $detailStatement->bindValue($placeholder, $caseId, PDO::PARAM_INT);
        }
        $detailStatement->execute();

        $detailsByCaseId = [];
        foreach ($detailStatement->fetchAll() as $detailRow) {
            $caseId = (int) ($detailRow['evaluation_case_id'] ?? 0);
            if ($caseId <= 0) {
                continue;
            }

            $detailsByCaseId[$caseId][] = [
                'addition_code' => (string) ($detailRow['addition_code'] ?? ''),
                'addition_name' => (string) ($detailRow['addition_name'] ?? ''),
                'candidate_status' => (string) ($detailRow['candidate_status'] ?? ''),
                'matched_group_count' => (int) ($detailRow['matched_group_count'] ?? 0),
                'display_order' => (int) ($detailRow['display_order'] ?? 9999),
            ];
        }

        foreach ($records as &$record) {
            $caseId = isset($record['evaluation_case_id']) ? (int) $record['evaluation_case_id'] : 0;
            $candidateDetails = $caseId > 0 ? ($detailsByCaseId[$caseId] ?? []) : [];
            $record['candidate_details_json'] = $candidateDetails === []
                ? ''
                : (string) json_encode($candidateDetails, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        unset($record);

        return $records;
    }
}
