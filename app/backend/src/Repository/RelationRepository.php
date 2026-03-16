<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;
use RuntimeException;

final class RelationRepository
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function fetchOrganizationServices(int $organizationId): array
    {
        $statement = $this->pdo->prepare(<<<SQL
            SELECT
              os.organization_service_id,
              os.organization_id,
              o.organization_name,
              sd.service_definition_id,
              sd.service_code,
              sd.service_name,
              sd.service_category,
              sd.target_scope,
              sd.constraint_group_code,
              GROUP_CONCAT(DISTINCT sg.group_name ORDER BY sg.group_name SEPARATOR ' / ') AS group_names
            FROM organization_service AS os
            INNER JOIN organization AS o
              ON o.organization_id = os.organization_id
             AND o.is_active = 1
            INNER JOIN service_definition AS sd
              ON sd.service_definition_id = os.service_definition_id
             AND sd.is_active = 1
            LEFT JOIN service_group AS sg
              ON sg.organization_service_id = os.organization_service_id
             AND sg.is_active = 1
            WHERE os.organization_id = :organization_id
              AND os.is_active = 1
            GROUP BY
              os.organization_service_id,
              os.organization_id,
              o.organization_name,
              sd.service_definition_id,
              sd.service_code,
              sd.service_name,
              sd.service_category,
              sd.target_scope,
              sd.constraint_group_code
            ORDER BY
              sd.service_name ASC,
              os.organization_service_id ASC
        SQL);

        $statement->bindValue(':organization_id', $organizationId, PDO::PARAM_INT);
        $statement->execute();

        return $statement->fetchAll();
    }

    public function createOrganizationService(int $organizationId, int $serviceDefinitionId): array
    {
        $this->assertOrganizationExists($organizationId);
        $this->assertServiceExists($serviceDefinitionId);

        $existing = $this->findOrganizationService($organizationId, $serviceDefinitionId);
        if ($existing !== null) {
            if ((int) ($existing['is_active'] ?? 0) !== 1) {
                $statement = $this->pdo->prepare(<<<SQL
                    UPDATE organization_service
                    SET is_active = 1,
                        note = :note,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE organization_service_id = :organization_service_id
                SQL);
                $statement->bindValue(':note', 'manual form registration', PDO::PARAM_STR);
                $statement->bindValue(':organization_service_id', (int) $existing['organization_service_id'], PDO::PARAM_INT);
                $statement->execute();
            }

            return $this->fetchOrganizationServiceById((int) $existing['organization_service_id']);
        }

        $statement = $this->pdo->prepare(<<<SQL
            INSERT INTO organization_service (
              organization_id,
              service_definition_id,
              is_active,
              note
            ) VALUES (
              :organization_id,
              :service_definition_id,
              1,
              :note
            )
        SQL);

        $statement->bindValue(':organization_id', $organizationId, PDO::PARAM_INT);
        $statement->bindValue(':service_definition_id', $serviceDefinitionId, PDO::PARAM_INT);
        $statement->bindValue(':note', 'manual form registration', PDO::PARAM_STR);
        $statement->execute();

        return $this->fetchOrganizationServiceById((int) $this->pdo->lastInsertId());
    }

    public function deactivateOrganizationService(int $organizationServiceId): array
    {
        $organizationService = $this->findOrganizationServiceById($organizationServiceId);
        if ($organizationService === null || (int) ($organizationService['is_active'] ?? 0) !== 1) {
            throw new RuntimeException('解除対象の提供サービスが見つかりません。');
        }

        $activeEnrollmentCount = $this->countActiveClientEnrollmentsByOrganizationService($organizationServiceId);
        if ($activeEnrollmentCount > 0) {
            throw new RuntimeException(
                sprintf(
                    'この提供サービスは利用状況 %d 件で使用中のため解除できません。先に利用者画面で該当利用状況を解除してください。',
                    $activeEnrollmentCount
                )
            );
        }

        $statement = $this->pdo->prepare(<<<SQL
            UPDATE organization_service
            SET is_active = 0,
                note = :note,
                updated_at = CURRENT_TIMESTAMP
            WHERE organization_service_id = :organization_service_id
        SQL);

        $statement->bindValue(
            ':note',
            $this->appendNote($organizationService['note'] ?? null, 'manual form deactivation'),
            PDO::PARAM_STR
        );
        $statement->bindValue(':organization_service_id', $organizationServiceId, PDO::PARAM_INT);
        $statement->execute();

        return $this->fetchOrganizationServiceById($organizationServiceId);
    }

    public function fetchClientEnrollments(int $clientId): array
    {
        $statement = $this->pdo->prepare(<<<SQL
            SELECT
              ce.client_enrollment_id,
              ce.client_id,
              c.client_name,
              os.organization_service_id,
              o.organization_id,
              o.organization_name,
              sd.service_definition_id,
              sd.service_name,
              sd.service_category,
              sd.target_scope AS service_target_scope,
              sg.service_group_id,
              sg.group_name,
              ce.note
            FROM client_enrollment AS ce
            INNER JOIN client AS c
              ON c.client_id = ce.client_id
             AND c.is_active = 1
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

    public function createClientEnrollment(
        int $clientId,
        int $organizationServiceId,
        ?string $groupName
    ): array {
        $this->assertClientExists($clientId);
        $organizationService = $this->fetchOrganizationServiceBaseById($organizationServiceId);
        if ($organizationService === null) {
            throw new RuntimeException('機関サービスが見つかりません。');
        }

        $this->pdo->beginTransaction();

        try {
            $serviceGroupId = $groupName !== null && $groupName !== ''
                ? $this->ensureServiceGroup($organizationServiceId, $groupName)
                : null;

            $existing = $this->findClientEnrollment($clientId, $organizationServiceId, $serviceGroupId);
            if ($existing !== null) {
                if ((int) ($existing['is_active'] ?? 0) !== 1) {
                    $statement = $this->pdo->prepare(<<<SQL
                        UPDATE client_enrollment
                        SET is_active = 1,
                            started_on = NULL,
                            ended_on = NULL,
                            note = :note,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE client_enrollment_id = :client_enrollment_id
                    SQL);
                    $statement->bindValue(':note', 'manual form registration', PDO::PARAM_STR);
                    $statement->bindValue(':client_enrollment_id', (int) $existing['client_enrollment_id'], PDO::PARAM_INT);
                    $statement->execute();
                }

                $this->pdo->commit();
                return $this->fetchClientEnrollmentById((int) $existing['client_enrollment_id']);
            }

            $statement = $this->pdo->prepare(<<<SQL
                INSERT INTO client_enrollment (
                  client_id,
                  organization_service_id,
                  service_group_id,
                  started_on,
                  ended_on,
                  is_active,
                  note
                ) VALUES (
                  :client_id,
                  :organization_service_id,
                  :service_group_id,
                  NULL,
                  NULL,
                  1,
                  :note
                )
            SQL);

            $statement->bindValue(':client_id', $clientId, PDO::PARAM_INT);
            $statement->bindValue(':organization_service_id', $organizationServiceId, PDO::PARAM_INT);
            $statement->bindValue(':service_group_id', $serviceGroupId, $serviceGroupId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $statement->bindValue(':note', 'manual form registration', PDO::PARAM_STR);
            $statement->execute();

            $enrollmentId = (int) $this->pdo->lastInsertId();
            $this->pdo->commit();

            return $this->fetchClientEnrollmentById($enrollmentId);
        } catch (\Throwable $throwable) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $throwable;
        }
    }

    public function deactivateClientEnrollment(int $clientEnrollmentId): array
    {
        $clientEnrollment = $this->findClientEnrollmentById($clientEnrollmentId);
        if ($clientEnrollment === null || (int) ($clientEnrollment['is_active'] ?? 0) !== 1) {
            throw new RuntimeException('解除対象の利用状況が見つかりません。');
        }

        $statement = $this->pdo->prepare(<<<SQL
            UPDATE client_enrollment
            SET is_active = 0,
                note = :note,
                updated_at = CURRENT_TIMESTAMP
            WHERE client_enrollment_id = :client_enrollment_id
        SQL);

        $statement->bindValue(
            ':note',
            $this->appendNote($clientEnrollment['note'] ?? null, 'manual form deactivation'),
            PDO::PARAM_STR
        );
        $statement->bindValue(':client_enrollment_id', $clientEnrollmentId, PDO::PARAM_INT);
        $statement->execute();

        return $this->fetchClientEnrollmentById($clientEnrollmentId);
    }

    private function assertOrganizationExists(int $organizationId): void
    {
        $statement = $this->pdo->prepare('SELECT 1 FROM organization WHERE organization_id = :organization_id AND is_active = 1 LIMIT 1');
        $statement->bindValue(':organization_id', $organizationId, PDO::PARAM_INT);
        $statement->execute();

        if ($statement->fetchColumn() === false) {
            throw new RuntimeException('機関が見つかりません。');
        }
    }

    private function assertServiceExists(int $serviceDefinitionId): void
    {
        $statement = $this->pdo->prepare('SELECT 1 FROM service_definition WHERE service_definition_id = :service_definition_id AND is_active = 1 LIMIT 1');
        $statement->bindValue(':service_definition_id', $serviceDefinitionId, PDO::PARAM_INT);
        $statement->execute();

        if ($statement->fetchColumn() === false) {
            throw new RuntimeException('サービスが見つかりません。');
        }
    }

    private function assertClientExists(int $clientId): void
    {
        $statement = $this->pdo->prepare('SELECT 1 FROM client WHERE client_id = :client_id AND is_active = 1 LIMIT 1');
        $statement->bindValue(':client_id', $clientId, PDO::PARAM_INT);
        $statement->execute();

        if ($statement->fetchColumn() === false) {
            throw new RuntimeException('利用者が見つかりません。');
        }
    }

    private function findOrganizationService(int $organizationId, int $serviceDefinitionId): ?array
    {
        $statement = $this->pdo->prepare(<<<SQL
            SELECT
              organization_service_id,
              is_active
            FROM organization_service
            WHERE organization_id = :organization_id
              AND service_definition_id = :service_definition_id
            LIMIT 1
        SQL);
        $statement->bindValue(':organization_id', $organizationId, PDO::PARAM_INT);
        $statement->bindValue(':service_definition_id', $serviceDefinitionId, PDO::PARAM_INT);
        $statement->execute();

        $item = $statement->fetch();
        return $item === false ? null : $item;
    }

    private function findOrganizationServiceById(int $organizationServiceId): ?array
    {
        $statement = $this->pdo->prepare(<<<SQL
            SELECT
              organization_service_id,
              organization_id,
              service_definition_id,
              is_active,
              note
            FROM organization_service
            WHERE organization_service_id = :organization_service_id
            LIMIT 1
        SQL);
        $statement->bindValue(':organization_service_id', $organizationServiceId, PDO::PARAM_INT);
        $statement->execute();

        $item = $statement->fetch();
        return $item === false ? null : $item;
    }

    private function countActiveClientEnrollmentsByOrganizationService(int $organizationServiceId): int
    {
        $statement = $this->pdo->prepare(<<<SQL
            SELECT COUNT(*)
            FROM client_enrollment
            WHERE organization_service_id = :organization_service_id
              AND is_active = 1
        SQL);
        $statement->bindValue(':organization_service_id', $organizationServiceId, PDO::PARAM_INT);
        $statement->execute();

        return (int) $statement->fetchColumn();
    }

    private function fetchOrganizationServiceBaseById(int $organizationServiceId): ?array
    {
        $statement = $this->pdo->prepare(<<<SQL
            SELECT
              organization_service_id,
              organization_id,
              service_definition_id
            FROM organization_service
            WHERE organization_service_id = :organization_service_id
              AND is_active = 1
            LIMIT 1
        SQL);
        $statement->bindValue(':organization_service_id', $organizationServiceId, PDO::PARAM_INT);
        $statement->execute();

        $item = $statement->fetch();
        return $item === false ? null : $item;
    }

    private function fetchOrganizationServiceById(int $organizationServiceId): array
    {
        $statement = $this->pdo->prepare(<<<SQL
            SELECT
              os.organization_service_id,
              os.organization_id,
              o.organization_name,
              sd.service_definition_id,
              sd.service_code,
              sd.service_name,
              sd.service_category,
              sd.target_scope,
              sd.constraint_group_code,
              GROUP_CONCAT(DISTINCT sg.group_name ORDER BY sg.group_name SEPARATOR ' / ') AS group_names
            FROM organization_service AS os
            INNER JOIN organization AS o
              ON o.organization_id = os.organization_id
            INNER JOIN service_definition AS sd
              ON sd.service_definition_id = os.service_definition_id
            LEFT JOIN service_group AS sg
              ON sg.organization_service_id = os.organization_service_id
             AND sg.is_active = 1
            WHERE os.organization_service_id = :organization_service_id
            GROUP BY
              os.organization_service_id,
              os.organization_id,
              o.organization_name,
              sd.service_definition_id,
              sd.service_code,
              sd.service_name,
              sd.service_category,
              sd.target_scope,
              sd.constraint_group_code
            LIMIT 1
        SQL);
        $statement->bindValue(':organization_service_id', $organizationServiceId, PDO::PARAM_INT);
        $statement->execute();

        $item = $statement->fetch();
        if ($item === false) {
            throw new RuntimeException('登録した機関サービスの再取得に失敗しました。');
        }

        return $item;
    }

    private function ensureServiceGroup(int $organizationServiceId, string $groupName): int
    {
        $normalizedName = trim($groupName);
        if ($normalizedName === '') {
            throw new RuntimeException('グループ名が不正です。');
        }

        $statement = $this->pdo->prepare(<<<SQL
            SELECT
              service_group_id,
              is_active
            FROM service_group
            WHERE organization_service_id = :organization_service_id
              AND group_name = :group_name
            LIMIT 1
        SQL);
        $statement->bindValue(':organization_service_id', $organizationServiceId, PDO::PARAM_INT);
        $statement->bindValue(':group_name', $normalizedName, PDO::PARAM_STR);
        $statement->execute();

        $existing = $statement->fetch();
        if ($existing !== false) {
            $existingId = (int) $existing['service_group_id'];

            if ((int) ($existing['is_active'] ?? 0) !== 1) {
                $reactivate = $this->pdo->prepare(<<<SQL
                    UPDATE service_group
                    SET is_active = 1,
                        note = :note,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE service_group_id = :service_group_id
                SQL);
                $reactivate->bindValue(':note', 'manual form registration', PDO::PARAM_STR);
                $reactivate->bindValue(':service_group_id', $existingId, PDO::PARAM_INT);
                $reactivate->execute();
            }

            return $existingId;
        }

        $groupCode = sprintf('grp_%d_%s', $organizationServiceId, substr(md5($normalizedName), 0, 8));

        $displayOrderStatement = $this->pdo->prepare(<<<SQL
            SELECT COALESCE(MAX(display_order), 0) + 10
            FROM service_group
            WHERE organization_service_id = :organization_service_id
        SQL);
        $displayOrderStatement->bindValue(':organization_service_id', $organizationServiceId, PDO::PARAM_INT);
        $displayOrderStatement->execute();
        $displayOrder = (int) $displayOrderStatement->fetchColumn();

        $insert = $this->pdo->prepare(<<<SQL
            INSERT INTO service_group (
              organization_service_id,
              group_code,
              group_name,
              display_order,
              is_active,
              note
            ) VALUES (
              :organization_service_id,
              :group_code,
              :group_name,
              :display_order,
              1,
              :note
            )
        SQL);
        $insert->bindValue(':organization_service_id', $organizationServiceId, PDO::PARAM_INT);
        $insert->bindValue(':group_code', $groupCode, PDO::PARAM_STR);
        $insert->bindValue(':group_name', $normalizedName, PDO::PARAM_STR);
        $insert->bindValue(':display_order', $displayOrder, PDO::PARAM_INT);
        $insert->bindValue(':note', 'manual form registration', PDO::PARAM_STR);
        $insert->execute();

        return (int) $this->pdo->lastInsertId();
    }

    private function findClientEnrollment(int $clientId, int $organizationServiceId, ?int $serviceGroupId): ?array
    {
        $statement = $this->pdo->prepare(<<<SQL
            SELECT
              client_enrollment_id,
              is_active
            FROM client_enrollment
            WHERE client_id = :client_id
              AND organization_service_id = :organization_service_id
              AND (
                (:service_group_id_is_null = 1 AND service_group_id IS NULL)
                OR service_group_id = :service_group_id_match
              )
            LIMIT 1
        SQL);
        $statement->bindValue(':client_id', $clientId, PDO::PARAM_INT);
        $statement->bindValue(':organization_service_id', $organizationServiceId, PDO::PARAM_INT);
        $statement->bindValue(':service_group_id_is_null', $serviceGroupId === null ? 1 : 0, PDO::PARAM_INT);
        $statement->bindValue(':service_group_id_match', $serviceGroupId, $serviceGroupId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $statement->execute();

        $item = $statement->fetch();
        return $item === false ? null : $item;
    }

    private function findClientEnrollmentById(int $clientEnrollmentId): ?array
    {
        $statement = $this->pdo->prepare(<<<SQL
            SELECT
              client_enrollment_id,
              client_id,
              organization_service_id,
              service_group_id,
              is_active,
              note
            FROM client_enrollment
            WHERE client_enrollment_id = :client_enrollment_id
            LIMIT 1
        SQL);
        $statement->bindValue(':client_enrollment_id', $clientEnrollmentId, PDO::PARAM_INT);
        $statement->execute();

        $item = $statement->fetch();
        return $item === false ? null : $item;
    }

    private function fetchClientEnrollmentById(int $clientEnrollmentId): array
    {
        $statement = $this->pdo->prepare(<<<SQL
            SELECT
              ce.client_enrollment_id,
              ce.client_id,
              c.client_name,
              os.organization_service_id,
              o.organization_id,
              o.organization_name,
              sd.service_definition_id,
              sd.service_name,
              sd.service_category,
              sd.target_scope AS service_target_scope,
              sg.service_group_id,
              sg.group_name,
              ce.note
            FROM client_enrollment AS ce
            INNER JOIN client AS c
              ON c.client_id = ce.client_id
            INNER JOIN organization_service AS os
              ON os.organization_service_id = ce.organization_service_id
            INNER JOIN organization AS o
              ON o.organization_id = os.organization_id
            INNER JOIN service_definition AS sd
              ON sd.service_definition_id = os.service_definition_id
            LEFT JOIN service_group AS sg
              ON sg.service_group_id = ce.service_group_id
            WHERE ce.client_enrollment_id = :client_enrollment_id
            LIMIT 1
        SQL);
        $statement->bindValue(':client_enrollment_id', $clientEnrollmentId, PDO::PARAM_INT);
        $statement->execute();

        $item = $statement->fetch();
        if ($item === false) {
            throw new RuntimeException('登録した利用状況の再取得に失敗しました。');
        }

        return $item;
    }

    private function appendNote(?string $currentNote, string $entry): string
    {
        $normalizedCurrent = trim((string) $currentNote);
        if ($normalizedCurrent === '') {
            return $entry;
        }

        return $normalizedCurrent . "\n" . $entry;
    }
}
