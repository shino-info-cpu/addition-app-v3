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
        $additionNameExpression = "COALESCE(a.addition_name, JSON_UNQUOTE(JSON_EXTRACT(er.result_json, '$.addition_name')))";
        $additionCodeExpression = "COALESCE(a.addition_code, JSON_UNQUOTE(JSON_EXTRACT(er.result_json, '$.addition_code')))";
        $actionTypeExpression = "JSON_UNQUOTE(JSON_EXTRACT(ec.request_json, '$.answers.actionType'))";

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
              {$additionCodeExpression} AS addition_code,
              {$additionNameExpression} AS addition_name,
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

        return $statement->fetchAll();
    }
}
