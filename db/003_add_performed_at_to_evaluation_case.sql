SET @has_performed_at := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'evaluation_case'
    AND COLUMN_NAME = 'performed_at'
);

SET @performed_at_sql := IF(
  @has_performed_at = 0,
  'ALTER TABLE evaluation_case ADD COLUMN performed_at DATETIME NULL AFTER target_month',
  'SELECT 1'
);

PREPARE stmt FROM @performed_at_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
