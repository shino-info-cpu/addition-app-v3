-- v3 service refactor
-- Purpose:
-- 1. add service_definition.target_scope
-- 2. merge duplicated 児 / 者 service rows into one active logical service
-- 3. repoint organization_service / client_enrollment / evaluation_case to the survivor rows
-- 4. keep merged legacy rows as inactive instead of deleting them

SET NAMES utf8mb4;

SET @has_target_scope := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'service_definition'
    AND column_name = 'target_scope'
);

SET @add_target_scope_sql := IF(
  @has_target_scope = 0,
  'ALTER TABLE service_definition ADD COLUMN target_scope VARCHAR(16) NULL AFTER service_category',
  'SELECT 1'
);

PREPARE stmt_add_target_scope FROM @add_target_scope_sql;
EXECUTE stmt_add_target_scope;
DEALLOCATE PREPARE stmt_add_target_scope;

START TRANSACTION;

SET @has_legacy_target_type := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'service_definition'
    AND column_name = 'target_type'
);

SET @fill_target_scope_sql := IF(
  @has_legacy_target_type = 1,
  "UPDATE service_definition
   SET target_scope = CASE
     WHEN COALESCE(target_scope, '') <> '' THEN target_scope
     WHEN target_type IN ('児', '者', '児者') THEN target_type
     WHEN target_type = '共通' OR target_type IS NULL OR target_type = '' THEN '児者'
     ELSE target_type
   END",
  "UPDATE service_definition
   SET target_scope = CASE
     WHEN COALESCE(target_scope, '') <> '' THEN target_scope
     ELSE '児者'
   END"
);

PREPARE stmt_fill_target_scope FROM @fill_target_scope_sql;
EXECUTE stmt_fill_target_scope;
DEALLOCATE PREPARE stmt_fill_target_scope;

SET @sync_legacy_target_type_sql := IF(
  @has_legacy_target_type = 1,
  "UPDATE service_definition
   SET target_type = CASE
     WHEN target_scope = '児者' THEN '共通'
     ELSE target_scope
   END",
  'SELECT 1'
);

PREPARE stmt_sync_legacy_target_type FROM @sync_legacy_target_type_sql;
EXECUTE stmt_sync_legacy_target_type;
DEALLOCATE PREPARE stmt_sync_legacy_target_type;

DROP TEMPORARY TABLE IF EXISTS tmp_service_survivor;
CREATE TEMPORARY TABLE tmp_service_survivor AS
SELECT
  COALESCE(
    MIN(CASE WHEN is_active = 1 THEN service_definition_id END),
    MIN(service_definition_id)
  ) AS survivor_service_definition_id,
  service_name,
  service_category,
  constraint_group_code,
  CASE
    WHEN SUM(CASE WHEN target_scope = '児者' THEN 1 ELSE 0 END) > 0 THEN '児者'
    WHEN SUM(CASE WHEN target_scope = '児' THEN 1 ELSE 0 END) > 0
     AND SUM(CASE WHEN target_scope = '者' THEN 1 ELSE 0 END) > 0 THEN '児者'
    WHEN SUM(CASE WHEN target_scope = '児' THEN 1 ELSE 0 END) > 0 THEN '児'
    WHEN SUM(CASE WHEN target_scope = '者' THEN 1 ELSE 0 END) > 0 THEN '者'
    ELSE '児者'
  END AS merged_target_scope
FROM service_definition
GROUP BY
  service_name,
  service_category,
  constraint_group_code;

DROP TEMPORARY TABLE IF EXISTS tmp_service_map;
CREATE TEMPORARY TABLE tmp_service_map AS
SELECT
  sd.service_definition_id AS old_service_definition_id,
  t.survivor_service_definition_id,
  t.merged_target_scope
FROM service_definition AS sd
INNER JOIN tmp_service_survivor AS t
  ON sd.service_name <=> t.service_name
 AND sd.service_category <=> t.service_category
 AND sd.constraint_group_code <=> t.constraint_group_code;

UPDATE service_definition AS sd
INNER JOIN tmp_service_map AS sm
  ON sm.old_service_definition_id = sd.service_definition_id
SET sd.target_scope = sm.merged_target_scope,
    sd.updated_at = CURRENT_TIMESTAMP;

DROP TEMPORARY TABLE IF EXISTS tmp_org_service_target;
CREATE TEMPORARY TABLE tmp_org_service_target AS
SELECT
  os.organization_service_id,
  os.organization_id,
  os.is_active,
  sm.survivor_service_definition_id AS target_service_definition_id
FROM organization_service AS os
INNER JOIN tmp_service_map AS sm
  ON sm.old_service_definition_id = os.service_definition_id;

DROP TEMPORARY TABLE IF EXISTS tmp_org_service_survivor;
CREATE TEMPORARY TABLE tmp_org_service_survivor AS
SELECT
  COALESCE(
    MIN(CASE WHEN is_active = 1 THEN organization_service_id END),
    MIN(organization_service_id)
  ) AS survivor_organization_service_id,
  organization_id,
  target_service_definition_id
FROM tmp_org_service_target
GROUP BY
  organization_id,
  target_service_definition_id;

DROP TEMPORARY TABLE IF EXISTS tmp_org_service_map;
CREATE TEMPORARY TABLE tmp_org_service_map AS
SELECT
  t.organization_service_id AS old_organization_service_id,
  s.survivor_organization_service_id,
  t.organization_id,
  t.target_service_definition_id
FROM tmp_org_service_target AS t
INNER JOIN tmp_org_service_survivor AS s
  ON s.organization_id = t.organization_id
 AND s.target_service_definition_id = t.target_service_definition_id;

UPDATE organization_service AS os
INNER JOIN tmp_org_service_map AS osm
  ON osm.old_organization_service_id = os.organization_service_id
SET os.service_definition_id = osm.target_service_definition_id,
    os.updated_at = CURRENT_TIMESTAMP
WHERE os.organization_service_id = osm.survivor_organization_service_id;

DROP TEMPORARY TABLE IF EXISTS tmp_group_duplicate_map;
CREATE TEMPORARY TABLE tmp_group_duplicate_map AS
SELECT
  sg.service_group_id AS old_service_group_id,
  sg.organization_service_id AS old_organization_service_id,
  osm.survivor_organization_service_id,
  sg.group_name
FROM service_group AS sg
INNER JOIN tmp_org_service_map AS osm
  ON osm.old_organization_service_id = sg.organization_service_id
WHERE osm.old_organization_service_id <> osm.survivor_organization_service_id
  AND sg.is_active = 1;

DROP TEMPORARY TABLE IF EXISTS tmp_group_existing_target;
DROP TEMPORARY TABLE IF EXISTS tmp_group_survivor;
CREATE TEMPORARY TABLE tmp_group_survivor AS
SELECT
  COALESCE(
    MIN(CASE
      WHEN sg.organization_service_id = gdm.survivor_organization_service_id
       AND sg.is_active = 1 THEN sg.service_group_id
    END),
    MIN(gdm.old_service_group_id)
  ) AS survivor_service_group_id,
  gdm.survivor_organization_service_id,
  gdm.group_name
FROM tmp_group_duplicate_map AS gdm
LEFT JOIN service_group AS sg
  ON sg.organization_service_id = gdm.survivor_organization_service_id
 AND sg.group_name = gdm.group_name
GROUP BY
  gdm.survivor_organization_service_id,
  gdm.group_name;

DROP TEMPORARY TABLE IF EXISTS tmp_group_existing_target;
CREATE TEMPORARY TABLE tmp_group_existing_target AS
SELECT
  gdm.old_service_group_id,
  s.survivor_service_group_id,
  gdm.survivor_organization_service_id
FROM tmp_group_duplicate_map AS gdm
INNER JOIN tmp_group_survivor AS s
  ON s.survivor_organization_service_id = gdm.survivor_organization_service_id
 AND s.group_name = gdm.group_name;

UPDATE client_enrollment AS ce
INNER JOIN tmp_group_existing_target AS tgt
  ON tgt.old_service_group_id = ce.service_group_id
SET ce.service_group_id = tgt.survivor_service_group_id,
    ce.updated_at = CURRENT_TIMESTAMP;

UPDATE evaluation_case AS ec
INNER JOIN tmp_group_existing_target AS tgt
  ON tgt.old_service_group_id = ec.service_group_id
SET ec.service_group_id = tgt.survivor_service_group_id;

UPDATE service_group AS sg
INNER JOIN tmp_group_existing_target AS tgt
  ON tgt.old_service_group_id = sg.service_group_id
SET sg.organization_service_id = tgt.survivor_organization_service_id,
    sg.updated_at = CURRENT_TIMESTAMP
WHERE tgt.old_service_group_id = tgt.survivor_service_group_id
  AND sg.organization_service_id <> tgt.survivor_organization_service_id;

UPDATE service_group AS sg
INNER JOIN tmp_group_existing_target AS tgt
  ON tgt.old_service_group_id = sg.service_group_id
SET sg.is_active = 0,
    sg.note = CONCAT_WS(' / ', NULLIF(sg.note, ''), CONCAT('merged into service_group_id=', tgt.survivor_service_group_id)),
    sg.updated_at = CURRENT_TIMESTAMP
WHERE tgt.old_service_group_id <> tgt.survivor_service_group_id;

UPDATE client_enrollment AS ce
INNER JOIN tmp_org_service_map AS osm
  ON osm.old_organization_service_id = ce.organization_service_id
SET ce.organization_service_id = osm.survivor_organization_service_id,
    ce.updated_at = CURRENT_TIMESTAMP
WHERE osm.old_organization_service_id <> osm.survivor_organization_service_id;

DROP TEMPORARY TABLE IF EXISTS tmp_client_enrollment_survivor;
CREATE TEMPORARY TABLE tmp_client_enrollment_survivor AS
SELECT
  COALESCE(
    MIN(CASE WHEN is_active = 1 THEN client_enrollment_id END),
    MIN(client_enrollment_id)
  ) AS survivor_client_enrollment_id,
  client_id,
  organization_service_id,
  COALESCE(service_group_id, 0) AS service_group_key,
  COALESCE(started_on, '1000-01-01') AS started_on_key,
  COALESCE(ended_on, '1000-01-01') AS ended_on_key
FROM client_enrollment
GROUP BY
  client_id,
  organization_service_id,
  COALESCE(service_group_id, 0),
  COALESCE(started_on, '1000-01-01'),
  COALESCE(ended_on, '1000-01-01');

DROP TEMPORARY TABLE IF EXISTS tmp_client_enrollment_map;
CREATE TEMPORARY TABLE tmp_client_enrollment_map AS
SELECT
  ce.client_enrollment_id AS old_client_enrollment_id,
  s.survivor_client_enrollment_id
FROM client_enrollment AS ce
INNER JOIN tmp_client_enrollment_survivor AS s
  ON s.client_id = ce.client_id
 AND s.organization_service_id = ce.organization_service_id
 AND s.service_group_key = COALESCE(ce.service_group_id, 0)
 AND s.started_on_key = COALESCE(ce.started_on, '1000-01-01')
 AND s.ended_on_key = COALESCE(ce.ended_on, '1000-01-01');

UPDATE evaluation_case AS ec
INNER JOIN tmp_client_enrollment_map AS cem
  ON cem.old_client_enrollment_id = ec.client_enrollment_id
SET ec.client_enrollment_id = cem.survivor_client_enrollment_id
WHERE cem.old_client_enrollment_id <> cem.survivor_client_enrollment_id;

UPDATE client_enrollment AS ce
INNER JOIN tmp_client_enrollment_map AS cem
  ON cem.old_client_enrollment_id = ce.client_enrollment_id
SET ce.is_active = 0,
    ce.note = CONCAT_WS(' / ', NULLIF(ce.note, ''), CONCAT('merged into client_enrollment_id=', cem.survivor_client_enrollment_id)),
    ce.updated_at = CURRENT_TIMESTAMP
WHERE cem.old_client_enrollment_id <> cem.survivor_client_enrollment_id;

UPDATE evaluation_case AS ec
INNER JOIN tmp_service_map AS sm
  ON sm.old_service_definition_id = ec.service_definition_id
SET ec.service_definition_id = sm.survivor_service_definition_id
WHERE sm.old_service_definition_id <> sm.survivor_service_definition_id;

UPDATE organization_service AS os
INNER JOIN tmp_org_service_map AS osm
  ON osm.old_organization_service_id = os.organization_service_id
SET os.is_active = 0,
    os.note = CONCAT_WS(' / ', NULLIF(os.note, ''), CONCAT('merged into organization_service_id=', osm.survivor_organization_service_id)),
    os.updated_at = CURRENT_TIMESTAMP
WHERE osm.old_organization_service_id <> osm.survivor_organization_service_id;

UPDATE service_definition AS sd
INNER JOIN tmp_service_map AS sm
  ON sm.old_service_definition_id = sd.service_definition_id
SET sd.is_active = CASE
      WHEN sm.old_service_definition_id = sm.survivor_service_definition_id THEN sd.is_active
      ELSE 0
    END,
    sd.note = CASE
      WHEN sm.old_service_definition_id = sm.survivor_service_definition_id THEN sd.note
      ELSE CONCAT_WS(' / ', NULLIF(sd.note, ''), CONCAT('merged into service_definition_id=', sm.survivor_service_definition_id))
    END,
    sd.updated_at = CURRENT_TIMESTAMP;

COMMIT;
