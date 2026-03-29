SET @has_visibility_mode := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'question_definition'
    AND COLUMN_NAME = 'visibility_mode'
);

SET @visibility_mode_sql := IF(
  @has_visibility_mode = 0,
  'ALTER TABLE question_definition ADD COLUMN visibility_mode VARCHAR(32) NOT NULL DEFAULT ''always'' AFTER option_source_ref',
  'SELECT 1'
);

PREPARE stmt_visibility_mode FROM @visibility_mode_sql;
EXECUTE stmt_visibility_mode;
DEALLOCATE PREPARE stmt_visibility_mode;

SET @has_visibility_config_json := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'question_definition'
    AND COLUMN_NAME = 'visibility_config_json'
);

SET @visibility_config_json_sql := IF(
  @has_visibility_config_json = 0,
  'ALTER TABLE question_definition ADD COLUMN visibility_config_json JSON NULL AFTER visibility_mode',
  'SELECT 1'
);

PREPARE stmt_visibility_config_json FROM @visibility_config_json_sql;
EXECUTE stmt_visibility_config_json;
DEALLOCATE PREPARE stmt_visibility_config_json;

CREATE TABLE IF NOT EXISTS question_option_rule (
  question_option_rule_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  question_option_id BIGINT NOT NULL,
  depends_on_field_key VARCHAR(64) NOT NULL,
  match_values_json JSON NOT NULL,
  display_order INT NOT NULL DEFAULT 9999,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_question_option_rule (question_option_id, is_active, display_order),
  CONSTRAINT fk_question_option_rule_option FOREIGN KEY (question_option_id)
    REFERENCES question_option(question_option_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
