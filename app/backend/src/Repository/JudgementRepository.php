<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

final class JudgementRepository
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function fetchClientContext(int $clientId): array
    {
        $client = $this->fetchClient($clientId);

        if ($client === null) {
            return [
                'client' => null,
                'enrollments' => [],
            ];
        }

        return [
            'client' => $client,
            'enrollments' => $this->fetchEnrollments($clientId),
        ];
    }

    private function fetchClient(int $clientId): ?array
    {
        $statement = $this->pdo->prepare(<<<SQL
            SELECT
              client_id,
              client_code,
              client_name,
              client_name_kana,
              target_type
            FROM client
            WHERE client_id = :client_id
              AND is_active = 1
            LIMIT 1
        SQL);

        $statement->bindValue(':client_id', $clientId, PDO::PARAM_INT);
        $statement->execute();

        $client = $statement->fetch();

        return $client === false ? null : $client;
    }

    private function fetchEnrollments(int $clientId): array
    {
        $statement = $this->pdo->prepare(<<<SQL
            SELECT
              ce.client_enrollment_id,
              ce.client_id,
              o.organization_id,
              o.organization_code,
              o.organization_name,
              o.organization_type,
              CASE
                WHEN o.organization_type IN ('病院', '訪問看護', '薬局') THEN '病院・訪看・薬局グループ'
                ELSE '福祉サービス等提供機関'
              END AS organization_group,
              sd.service_definition_id,
              sd.service_code,
              sd.service_name,
              sd.service_category,
              sd.target_scope AS service_target_scope,
              COALESCE(sg.group_name, sd.constraint_group_code) AS service_group_name
            FROM client_enrollment AS ce
            INNER JOIN organization_service AS os
              ON os.organization_service_id = ce.organization_service_id
             AND os.is_active = 1
            INNER JOIN organization AS o
              ON o.organization_id = os.organization_id
             AND o.is_active = 1
            INNER JOIN service_definition AS sd
              ON sd.service_definition_id = os.service_definition_id
             AND sd.is_active = 1
            LEFT JOIN service_group AS sg
              ON sg.service_group_id = ce.service_group_id
             AND sg.is_active = 1
            WHERE ce.client_id = :client_id
              AND ce.is_active = 1
            ORDER BY
              o.organization_name ASC,
              sd.service_name ASC,
              ce.client_enrollment_id ASC
        SQL);

        $statement->bindValue(':client_id', $clientId, PDO::PARAM_INT);
        $statement->execute();

        return $statement->fetchAll();
    }
}
