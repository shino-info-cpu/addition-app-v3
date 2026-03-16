-- Kasan App V3
-- Fresh schema draft for MySQL 8 / MariaDB 11+

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Operational master
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organization (
  organization_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  organization_code VARCHAR(64) NOT NULL,
  organization_name VARCHAR(255) NOT NULL,
  organization_type VARCHAR(64) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_organization_code (organization_code),
  KEY idx_organization_active_name (is_active, organization_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff (
  staff_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  home_organization_id BIGINT NULL,
  staff_code VARCHAR(64) NOT NULL,
  staff_name VARCHAR(128) NOT NULL,
  email VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_staff_code (staff_code),
  KEY idx_staff_home_org_active_name (home_organization_id, is_active, staff_name),
  CONSTRAINT fk_staff_home_organization FOREIGN KEY (home_organization_id)
    REFERENCES organization(organization_id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS operator_account (
  operator_account_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  staff_id BIGINT NULL,
  auth_provider VARCHAR(32) NOT NULL DEFAULT 'google_workspace',
  provider_subject VARCHAR(255) NOT NULL,
  login_email VARCHAR(255) NOT NULL,
  display_name VARCHAR(128) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_operator_account_subject (auth_provider, provider_subject),
  UNIQUE KEY uq_operator_account_email (auth_provider, login_email),
  KEY idx_operator_account_staff_active (staff_id, is_active),
  CONSTRAINT fk_operator_account_staff FOREIGN KEY (staff_id)
    REFERENCES staff(staff_id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS client (
  client_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  client_code VARCHAR(64) NOT NULL,
  client_name VARCHAR(128) NOT NULL,
  client_name_kana VARCHAR(128) NULL,
  target_type VARCHAR(16) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_client_code (client_code),
  KEY idx_client_active_name (is_active, client_name),
  KEY idx_client_target_type (target_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_definition (
  service_definition_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  service_code VARCHAR(64) NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  service_category VARCHAR(64) NULL,
  target_scope VARCHAR(16) NULL,
  constraint_group_code VARCHAR(64) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_service_definition_code (service_code),
  KEY idx_service_definition_active_name (is_active, service_name),
  KEY idx_service_definition_scope (target_scope, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organization_service (
  organization_service_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  organization_id BIGINT NOT NULL,
  service_definition_id BIGINT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_organization_service (organization_id, service_definition_id),
  KEY idx_organization_service_active (organization_id, is_active),
  KEY idx_organization_service_service (service_definition_id, is_active),
  CONSTRAINT fk_organization_service_org FOREIGN KEY (organization_id)
    REFERENCES organization(organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_organization_service_service FOREIGN KEY (service_definition_id)
    REFERENCES service_definition(service_definition_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_group (
  service_group_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  organization_service_id BIGINT NOT NULL,
  group_code VARCHAR(64) NOT NULL,
  group_name VARCHAR(255) NOT NULL,
  display_order INT NOT NULL DEFAULT 9999,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_service_group_code (group_code),
  UNIQUE KEY uq_service_group_name (organization_service_id, group_name),
  KEY idx_service_group_active_order (organization_service_id, is_active, display_order),
  CONSTRAINT fk_service_group_org_service FOREIGN KEY (organization_service_id)
    REFERENCES organization_service(organization_service_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS client_enrollment (
  client_enrollment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  client_id BIGINT NOT NULL,
  organization_service_id BIGINT NOT NULL,
  service_group_id BIGINT NULL,
  started_on DATE NULL,
  ended_on DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_client_enrollment_client (client_id, is_active),
  KEY idx_client_enrollment_org_service (organization_service_id, is_active),
  KEY idx_client_enrollment_group (service_group_id, is_active),
  CONSTRAINT fk_client_enrollment_client FOREIGN KEY (client_id)
    REFERENCES client(client_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_client_enrollment_org_service FOREIGN KEY (organization_service_id)
    REFERENCES organization_service(organization_service_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_client_enrollment_group FOREIGN KEY (service_group_id)
    REFERENCES service_group(service_group_id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Rule master
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS counterparty_type (
  counterparty_type_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  counterparty_type_code VARCHAR(64) NOT NULL,
  counterparty_type_name VARCHAR(128) NOT NULL,
  parent_category VARCHAR(64) NULL,
  display_order INT NOT NULL DEFAULT 9999,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_counterparty_type_code (counterparty_type_code),
  KEY idx_counterparty_type_active_order (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS addition (
  addition_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  addition_code VARCHAR(64) NOT NULL,
  addition_name VARCHAR(255) NOT NULL,
  short_name VARCHAR(128) NULL,
  target_scope VARCHAR(16) NULL,
  prompt_template TEXT NULL,
  note MEDIUMTEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  valid_from DATE NULL,
  valid_to DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_addition_code (addition_code),
  KEY idx_addition_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS addition_branch (
  addition_branch_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  addition_id BIGINT NOT NULL,
  branch_code VARCHAR(64) NOT NULL,
  branch_name VARCHAR(255) NOT NULL,
  branch_type VARCHAR(64) NULL,
  priority INT NOT NULL DEFAULT 9999,
  auto_confirm_priority INT NOT NULL DEFAULT 9999,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_addition_branch_code (branch_code),
  KEY idx_addition_branch_addition (addition_id),
  KEY idx_addition_branch_active_priority (is_active, auto_confirm_priority),
  CONSTRAINT fk_addition_branch_addition FOREIGN KEY (addition_id)
    REFERENCES addition(addition_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS question_definition (
  question_definition_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  field_key VARCHAR(64) NOT NULL,
  label VARCHAR(128) NOT NULL,
  input_type VARCHAR(32) NOT NULL,
  help_text_short TEXT NULL,
  help_text_long TEXT NULL,
  example_text TEXT NULL,
  non_example_text TEXT NULL,
  caution_text TEXT NULL,
  help_display_mode VARCHAR(32) NOT NULL DEFAULT 'collapsed',
  example_display_mode VARCHAR(32) NOT NULL DEFAULT 'collapsed',
  option_source_type VARCHAR(32) NULL,
  option_source_ref VARCHAR(128) NULL,
  reference_label_field VARCHAR(64) NULL,
  reference_sub_label_field VARCHAR(64) NULL,
  reference_search_fields_json JSON NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 9999,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_question_field_key (field_key),
  KEY idx_question_definition_active_order (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS question_option (
  question_option_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  question_definition_id BIGINT NOT NULL,
  option_value VARCHAR(128) NOT NULL,
  option_label VARCHAR(255) NOT NULL,
  help_text_short TEXT NULL,
  help_text_long TEXT NULL,
  example_text TEXT NULL,
  non_example_text TEXT NULL,
  caution_text TEXT NULL,
  help_display_mode VARCHAR(32) NOT NULL DEFAULT 'hidden',
  example_display_mode VARCHAR(32) NOT NULL DEFAULT 'collapsed',
  search_keywords TEXT NULL,
  description TEXT NULL,
  display_order INT NOT NULL DEFAULT 9999,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_question_option (question_definition_id, option_value),
  KEY idx_question_option_active_order (question_definition_id, is_active, display_order),
  CONSTRAINT fk_question_option_definition FOREIGN KEY (question_definition_id)
    REFERENCES question_definition(question_definition_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS question_visibility_rule (
  question_visibility_rule_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  question_definition_id BIGINT NOT NULL,
  depends_on_field_key VARCHAR(64) NOT NULL,
  match_values_json JSON NOT NULL,
  clear_on_hide TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 9999,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_question_visibility_rule (question_definition_id, is_active, display_order),
  CONSTRAINT fk_question_visibility_definition FOREIGN KEY (question_definition_id)
    REFERENCES question_definition(question_definition_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS addition_branch_condition (
  addition_branch_condition_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  addition_branch_id BIGINT NOT NULL,
  condition_group_no INT NOT NULL DEFAULT 1,
  field_key VARCHAR(64) NOT NULL,
  operator_code VARCHAR(32) NOT NULL,
  expected_value_json JSON NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 9999,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_addition_branch_condition (addition_branch_id, condition_group_no, display_order),
  CONSTRAINT fk_addition_branch_condition_branch FOREIGN KEY (addition_branch_id)
    REFERENCES addition_branch(addition_branch_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS addition_branch_constraint (
  addition_branch_constraint_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  addition_branch_id BIGINT NOT NULL,
  constraint_code VARCHAR(64) NOT NULL,
  constraint_kind VARCHAR(64) NOT NULL,
  config_json JSON NULL,
  message TEXT NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'block',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_addition_branch_constraint (addition_branch_id, constraint_code),
  KEY idx_addition_branch_constraint_active (addition_branch_id, is_active),
  CONSTRAINT fk_addition_branch_constraint_branch FOREIGN KEY (addition_branch_id)
    REFERENCES addition_branch(addition_branch_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS addition_branch_warning (
  addition_branch_warning_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  addition_branch_id BIGINT NOT NULL,
  warning_code VARCHAR(64) NOT NULL,
  trigger_json JSON NULL,
  message TEXT NOT NULL,
  requires_review TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_addition_branch_warning (addition_branch_id, warning_code),
  KEY idx_addition_branch_warning_active (addition_branch_id, is_active),
  CONSTRAINT fk_addition_branch_warning_branch FOREIGN KEY (addition_branch_id)
    REFERENCES addition_branch(addition_branch_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS addition_branch_category_map (
  addition_branch_category_map_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  addition_branch_id BIGINT NOT NULL,
  counterparty_type_id BIGINT NOT NULL,
  category_code VARCHAR(64) NOT NULL,
  display_order INT NOT NULL DEFAULT 9999,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_addition_branch_category_map (addition_branch_id, counterparty_type_id, category_code),
  KEY idx_addition_branch_category_map_order (addition_branch_id, display_order),
  CONSTRAINT fk_addition_branch_category_branch FOREIGN KEY (addition_branch_id)
    REFERENCES addition_branch(addition_branch_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_addition_branch_category_counterparty FOREIGN KEY (counterparty_type_id)
    REFERENCES counterparty_type(counterparty_type_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- UI preferences
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS list_view_setting (
  list_view_setting_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  screen_code VARCHAR(64) NOT NULL,
  view_code VARCHAR(64) NOT NULL,
  view_name VARCHAR(128) NOT NULL,
  owner_staff_id BIGINT NULL,
  is_shared TINYINT(1) NOT NULL DEFAULT 0,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  filter_json JSON NULL,
  sort_json JSON NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_list_view_setting_code (view_code),
  KEY idx_list_view_setting_screen_owner (screen_code, owner_staff_id, is_default),
  CONSTRAINT fk_list_view_setting_owner FOREIGN KEY (owner_staff_id)
    REFERENCES staff(staff_id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS list_view_column (
  list_view_column_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  list_view_setting_id BIGINT NOT NULL,
  column_key VARCHAR(64) NOT NULL,
  column_label_override VARCHAR(128) NULL,
  display_order INT NOT NULL DEFAULT 9999,
  is_visible TINYINT(1) NOT NULL DEFAULT 1,
  column_width INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_list_view_column (list_view_setting_id, column_key),
  KEY idx_list_view_column_order (list_view_setting_id, is_visible, display_order),
  CONSTRAINT fk_list_view_column_setting FOREIGN KEY (list_view_setting_id)
    REFERENCES list_view_setting(list_view_setting_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Transaction data
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_event (
  audit_event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  operator_account_id BIGINT NULL,
  action_type VARCHAR(64) NOT NULL,
  target_type VARCHAR(64) NOT NULL,
  target_id VARCHAR(128) NULL,
  request_id VARCHAR(128) NULL,
  detail_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_event_operator_created (operator_account_id, created_at),
  KEY idx_audit_event_target_created (target_type, target_id, created_at),
  CONSTRAINT fk_audit_event_operator FOREIGN KEY (operator_account_id)
    REFERENCES operator_account(operator_account_id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evaluation_case (
  evaluation_case_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  client_enrollment_id BIGINT NULL,
  client_id BIGINT NULL,
  organization_id BIGINT NULL,
  service_definition_id BIGINT NULL,
  service_group_id BIGINT NULL,
  staff_id BIGINT NULL,
  target_month CHAR(7) NOT NULL,
  performed_at DATETIME NULL,
  status VARCHAR(32) NOT NULL,
  source_channel VARCHAR(32) NOT NULL DEFAULT 'ui',
  request_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  evaluated_at DATETIME NULL,
  KEY idx_evaluation_case_client_month (client_id, target_month),
  KEY idx_evaluation_case_enrollment_month (client_enrollment_id, target_month),
  KEY idx_evaluation_case_org_month (organization_id, target_month),
  KEY idx_evaluation_case_staff_month (staff_id, target_month),
  KEY idx_evaluation_case_status (status),
  CONSTRAINT fk_evaluation_case_enrollment FOREIGN KEY (client_enrollment_id)
    REFERENCES client_enrollment(client_enrollment_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_evaluation_case_client FOREIGN KEY (client_id)
    REFERENCES client(client_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_evaluation_case_org FOREIGN KEY (organization_id)
    REFERENCES organization(organization_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_evaluation_case_service FOREIGN KEY (service_definition_id)
    REFERENCES service_definition(service_definition_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_evaluation_case_group FOREIGN KEY (service_group_id)
    REFERENCES service_group(service_group_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_evaluation_case_staff FOREIGN KEY (staff_id)
    REFERENCES staff(staff_id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evaluation_answer (
  evaluation_answer_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  evaluation_case_id BIGINT NOT NULL,
  field_key VARCHAR(64) NOT NULL,
  answer_value_json JSON NULL,
  answer_label VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_evaluation_answer (evaluation_case_id, field_key),
  CONSTRAINT fk_evaluation_answer_case FOREIGN KEY (evaluation_case_id)
    REFERENCES evaluation_case(evaluation_case_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evaluation_candidate (
  evaluation_candidate_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  evaluation_case_id BIGINT NOT NULL,
  addition_branch_id BIGINT NOT NULL,
  candidate_status VARCHAR(32) NOT NULL,
  matched_group_count INT NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 9999,
  detail_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_evaluation_candidate_case (evaluation_case_id, display_order),
  KEY idx_evaluation_candidate_branch (addition_branch_id),
  CONSTRAINT fk_evaluation_candidate_case FOREIGN KEY (evaluation_case_id)
    REFERENCES evaluation_case(evaluation_case_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_evaluation_candidate_branch FOREIGN KEY (addition_branch_id)
    REFERENCES addition_branch(addition_branch_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evaluation_result (
  evaluation_result_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  evaluation_case_id BIGINT NOT NULL,
  final_status VARCHAR(32) NOT NULL,
  addition_id BIGINT NULL,
  addition_branch_id BIGINT NULL,
  message TEXT NULL,
  result_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_evaluation_result_case (evaluation_case_id),
  KEY idx_evaluation_result_addition_status (addition_id, final_status, created_at),
  KEY idx_evaluation_result_branch_status (addition_branch_id, final_status, created_at),
  CONSTRAINT fk_evaluation_result_case FOREIGN KEY (evaluation_case_id)
    REFERENCES evaluation_case(evaluation_case_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_evaluation_result_addition FOREIGN KEY (addition_id)
    REFERENCES addition(addition_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_evaluation_result_branch FOREIGN KEY (addition_branch_id)
    REFERENCES addition_branch(addition_branch_id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saved_note (
  saved_note_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  evaluation_case_id BIGINT NOT NULL,
  prompt_text MEDIUMTEXT NULL,
  ai_draft_text MEDIUMTEXT NULL,
  final_note_text MEDIUMTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_saved_note_case (evaluation_case_id),
  CONSTRAINT fk_saved_note_case FOREIGN KEY (evaluation_case_id)
    REFERENCES evaluation_case(evaluation_case_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
