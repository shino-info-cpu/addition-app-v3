<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

final class MasterRepository
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function fetchClients(?string $search = null): array
    {
        $sql = <<<SQL
            SELECT
              c.client_id,
              c.client_code,
              c.client_name,
              c.client_name_kana,
              c.target_type
            FROM client AS c
            WHERE c.is_active = 1
        SQL;

        $params = [];

        if ($search !== null) {
            $sql .= ' AND (c.client_name LIKE :search_name OR c.client_name_kana LIKE :search_kana OR c.client_code LIKE :search_code)';
            $params['search_name'] = '%' . $search . '%';
            $params['search_kana'] = '%' . $search . '%';
            $params['search_code'] = '%' . $search . '%';
        }

        $sql .= <<<SQL
            GROUP BY
              c.client_id,
              c.client_code,
              c.client_name,
              c.client_name_kana,
              c.target_type
            ORDER BY c.client_name ASC
        SQL;

        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);

        return $statement->fetchAll();
    }

    public function fetchOrganizations(?string $search = null): array
    {
        $sql = <<<SQL
            SELECT
              o.organization_id,
              o.organization_code,
              o.organization_name,
              o.organization_type,
              GROUP_CONCAT(DISTINCT sg.group_name ORDER BY sg.group_name SEPARATOR ' / ') AS group_names,
              GROUP_CONCAT(DISTINCT sd.service_name ORDER BY sd.service_name SEPARATOR ' / ') AS service_names
            FROM organization AS o
            LEFT JOIN organization_service AS os
              ON os.organization_id = o.organization_id
             AND os.is_active = 1
            LEFT JOIN service_definition AS sd
              ON sd.service_definition_id = os.service_definition_id
             AND sd.is_active = 1
            LEFT JOIN service_group AS sg
              ON sg.organization_service_id = os.organization_service_id
             AND sg.is_active = 1
            WHERE o.is_active = 1
        SQL;

        $params = [];

        if ($search !== null) {
            $sql .= ' AND (o.organization_name LIKE :search_name OR o.organization_code LIKE :search_code OR o.organization_type LIKE :search_type)';
            $params['search_name'] = '%' . $search . '%';
            $params['search_code'] = '%' . $search . '%';
            $params['search_type'] = '%' . $search . '%';
        }

        $sql .= <<<SQL
            GROUP BY
              o.organization_id,
              o.organization_code,
              o.organization_name,
              o.organization_type
            ORDER BY o.organization_name ASC
        SQL;

        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);

        return $statement->fetchAll();
    }

    public function fetchServices(?string $search = null, ?string $targetType = null): array
    {
        $sql = <<<SQL
            SELECT
              sd.service_definition_id,
              sd.service_code,
              sd.service_name,
              sd.service_category,
              sd.target_scope,
              sd.constraint_group_code
            FROM service_definition AS sd
            WHERE sd.is_active = 1
        SQL;

        $params = [];

        if ($search !== null) {
            $sql .= ' AND (sd.service_name LIKE :search_name OR sd.service_code LIKE :search_code OR sd.service_category LIKE :search_category)';
            $params['search_name'] = '%' . $search . '%';
            $params['search_code'] = '%' . $search . '%';
            $params['search_category'] = '%' . $search . '%';
        }

        if ($targetType !== null) {
            $sql .= ' AND (sd.target_scope = :target_type OR sd.target_scope = :common_target)';
            $params['target_type'] = $targetType;
            $params['common_target'] = '児者';
        }

        $sql .= ' ORDER BY sd.service_name ASC';

        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);

        return $statement->fetchAll();
    }

    public function fetchStaff(?string $search = null): array
    {
        $sql = <<<SQL
            SELECT
              st.staff_id,
              st.staff_code,
              st.staff_name,
              st.email,
              st.home_organization_id,
              o.organization_name AS home_organization_name
            FROM staff AS st
            LEFT JOIN organization AS o
              ON o.organization_id = st.home_organization_id
            WHERE st.is_active = 1
        SQL;

        $params = [];

        if ($search !== null) {
            $sql .= ' AND (st.staff_name LIKE :search_name OR st.staff_code LIKE :search_code OR st.email LIKE :search_email)';
            $params['search_name'] = '%' . $search . '%';
            $params['search_code'] = '%' . $search . '%';
            $params['search_email'] = '%' . $search . '%';
        }

        $sql .= ' ORDER BY st.staff_name ASC';

        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);

        return $statement->fetchAll();
    }
}
