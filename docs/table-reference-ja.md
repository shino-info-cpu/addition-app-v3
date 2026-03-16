# v3 テーブル日本語早見表

`db/001_initial_schema.sql` の英語テーブル名と列名を、日本語で頭整理しやすい形に並べた一覧です。
正式名称はあとで調整して構いません。まずは「何のテーブルで、どのIDを見ているか」が追いやすいことを優先しています。

## テーブル名対応

| 元のテーブル名 | 日本語名 |
| --- | --- |
| `organization` | 機関 |
| `staff` | 相談員 |
| `operator_account` | ログインアカウント |
| `client` | 利用者 |
| `service_definition` | サービス定義 |
| `organization_service` | 機関サービス |
| `service_group` | グループ |
| `client_enrollment` | 利用者利用状況 |
| `counterparty_type` | 相手先種別 |
| `addition` | 加算 |
| `addition_branch` | 加算枝 |
| `question_definition` | 設問定義 |
| `question_option` | 設問選択肢 |
| `question_visibility_rule` | 設問表示制御 |
| `addition_branch_condition` | 加算枝候補条件 |
| `addition_branch_constraint` | 加算枝制約 |
| `addition_branch_warning` | 加算枝警告 |
| `addition_branch_category_map` | 加算枝判定カテゴリ対応 |
| `list_view_setting` | 一覧表示設定 |
| `list_view_column` | 一覧表示列 |
| `audit_event` | 操作監査ログ |
| `evaluation_case` | 判定セッション |
| `evaluation_answer` | 判定回答 |
| `evaluation_candidate` | 判定候補 |
| `evaluation_result` | 判定結果 |
| `saved_note` | 保存文 |

## `organization` 機関

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 機関ID | `organization_id` |
|  | 機関コード | `organization_code` |
|  | 機関名 | `organization_name` |
|  | 機関種別 | `organization_type` |
|  | 有効フラグ | `is_active` |
|  | 備考 | `note` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `staff` 相談員

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 相談員ID | `staff_id` |
| FK -> `organization.organization_id` | 既定所属機関ID | `home_organization_id` |
|  | 相談員コード | `staff_code` |
|  | 相談員名 | `staff_name` |
|  | メールアドレス | `email` |
|  | 有効フラグ | `is_active` |
|  | 備考 | `note` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `client` 利用者

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 利用者ID | `client_id` |
|  | 利用者コード | `client_code` |
|  | 利用者名 | `client_name` |
|  | 利用者名かな | `client_name_kana` |
|  | 対象区分 | `target_type` |
|  | 有効フラグ | `is_active` |
|  | 備考 | `note` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `operator_account` ログインアカウント

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | ログインアカウントID | `operator_account_id` |
| FK -> `staff.staff_id` | 初期表示相談員ID | `staff_id` |
|  | 認証方式 | `auth_provider` |
|  | 認証主体ID | `provider_subject` |
|  | ログインメール | `login_email` |
|  | 表示名 | `display_name` |
|  | 有効フラグ | `is_active` |
|  | 最終ログイン日時 | `last_login_at` |
|  | 備考 | `note` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `service_definition` サービス定義

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | サービス定義ID | `service_definition_id` |
|  | サービスコード | `service_code` |
|  | サービス名 | `service_name` |
|  | サービス区分 | `service_category` |
|  | 対象範囲 | `target_scope` |
|  | 制約集計グループコード | `constraint_group_code` |
|  | 有効フラグ | `is_active` |
|  | 備考 | `note` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `organization_service` 機関サービス

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 機関サービスID | `organization_service_id` |
| FK -> `organization.organization_id` | 機関ID | `organization_id` |
| FK -> `service_definition.service_definition_id` | サービス定義ID | `service_definition_id` |
|  | 有効フラグ | `is_active` |
|  | 備考 | `note` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `service_group` グループ

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | グループID | `service_group_id` |
| FK -> `organization_service.organization_service_id` | 機関サービスID | `organization_service_id` |
|  | グループコード | `group_code` |
|  | グループ名 | `group_name` |
|  | 表示順 | `display_order` |
|  | 有効フラグ | `is_active` |
|  | 備考 | `note` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `client_enrollment` 利用者利用状況

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 利用者利用状況ID | `client_enrollment_id` |
| FK -> `client.client_id` | 利用者ID | `client_id` |
| FK -> `organization_service.organization_service_id` | 機関サービスID | `organization_service_id` |
| FK -> `service_group.service_group_id` | グループID | `service_group_id` |
|  | 開始日 | `started_on` |
|  | 終了日 | `ended_on` |
|  | 有効フラグ | `is_active` |
|  | 備考 | `note` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

補足:
`started_on` と `ended_on` はDB互換のため残している休眠列です。
現行の `v3` では、利用状況登録UI・判定ロジック・一覧表示には使っていません。

## `counterparty_type` 相手先種別

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 相手先種別ID | `counterparty_type_id` |
|  | 相手先種別コード | `counterparty_type_code` |
|  | 相手先種別名 | `counterparty_type_name` |
|  | 上位分類 | `parent_category` |
|  | 表示順 | `display_order` |
|  | 有効フラグ | `is_active` |
|  | 備考 | `note` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `addition` 加算

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 加算ID | `addition_id` |
|  | 加算コード | `addition_code` |
|  | 加算名 | `addition_name` |
|  | 加算略称 | `short_name` |
|  | 対象範囲 | `target_scope` |
|  | プロンプト雛形 | `prompt_template` |
|  | 備考 | `note` |
|  | 有効フラグ | `is_active` |
|  | 有効開始日 | `valid_from` |
|  | 有効終了日 | `valid_to` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `addition_branch` 加算枝

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 加算枝ID | `addition_branch_id` |
| FK -> `addition.addition_id` | 加算ID | `addition_id` |
|  | 枝コード | `branch_code` |
|  | 枝名 | `branch_name` |
|  | 枝種別 | `branch_type` |
|  | 優先度 | `priority` |
|  | 自動確定優先度 | `auto_confirm_priority` |
|  | 説明 | `description` |
|  | 有効フラグ | `is_active` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `question_definition` 設問定義

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 設問定義ID | `question_definition_id` |
|  | 項目キー | `field_key` |
|  | 表示名 | `label` |
|  | 入力型 | `input_type` |
|  | 短い補足説明 | `help_text_short` |
|  | 詳細補足説明 | `help_text_long` |
|  | 具体例 | `example_text` |
|  | 非該当例 | `non_example_text` |
|  | 注意事項 | `caution_text` |
|  | 補足説明表示方式 | `help_display_mode` |
|  | 具体例表示方式 | `example_display_mode` |
|  | 選択肢元種別 | `option_source_type` |
|  | 選択肢元参照 | `option_source_ref` |
|  | 参照主表示列 | `reference_label_field` |
|  | 参照補助表示列 | `reference_sub_label_field` |
|  | 参照検索対象列JSON | `reference_search_fields_json` |
|  | 必須フラグ | `is_required` |
|  | 表示順 | `display_order` |
|  | 説明 | `description` |
|  | 有効フラグ | `is_active` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `question_option` 設問選択肢

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 設問選択肢ID | `question_option_id` |
| FK -> `question_definition.question_definition_id` | 設問定義ID | `question_definition_id` |
|  | 選択肢値 | `option_value` |
|  | 選択肢表示名 | `option_label` |
|  | 短い補足説明 | `help_text_short` |
|  | 詳細補足説明 | `help_text_long` |
|  | 具体例 | `example_text` |
|  | 非該当例 | `non_example_text` |
|  | 注意事項 | `caution_text` |
|  | 補足説明表示方式 | `help_display_mode` |
|  | 具体例表示方式 | `example_display_mode` |
|  | 検索キーワード | `search_keywords` |
|  | 説明 | `description` |
|  | 表示順 | `display_order` |
|  | 有効フラグ | `is_active` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `question_visibility_rule` 設問表示制御

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 設問表示制御ID | `question_visibility_rule_id` |
| FK -> `question_definition.question_definition_id` | 設問定義ID | `question_definition_id` |
|  | 依存元項目キー | `depends_on_field_key` |
|  | 表示条件値JSON | `match_values_json` |
|  | 非表示時クリアフラグ | `clear_on_hide` |
|  | 表示順 | `display_order` |
|  | 有効フラグ | `is_active` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `addition_branch_condition` 加算枝候補条件

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 加算枝候補条件ID | `addition_branch_condition_id` |
| FK -> `addition_branch.addition_branch_id` | 加算枝ID | `addition_branch_id` |
|  | 条件グループ番号 | `condition_group_no` |
|  | 項目キー | `field_key` |
|  | 演算子コード | `operator_code` |
|  | 期待値JSON | `expected_value_json` |
|  | 必須フラグ | `is_required` |
|  | 表示順 | `display_order` |
|  | 備考 | `note` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `addition_branch_constraint` 加算枝制約

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 加算枝制約ID | `addition_branch_constraint_id` |
| FK -> `addition_branch.addition_branch_id` | 加算枝ID | `addition_branch_id` |
|  | 制約コード | `constraint_code` |
|  | 制約種別 | `constraint_kind` |
|  | 制約設定JSON | `config_json` |
|  | メッセージ | `message` |
|  | 制約強度 | `severity` |
|  | 有効フラグ | `is_active` |
|  | 備考 | `note` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `addition_branch_warning` 加算枝警告

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 加算枝警告ID | `addition_branch_warning_id` |
| FK -> `addition_branch.addition_branch_id` | 加算枝ID | `addition_branch_id` |
|  | 警告コード | `warning_code` |
|  | 発火条件JSON | `trigger_json` |
|  | メッセージ | `message` |
|  | 要確認フラグ | `requires_review` |
|  | 有効フラグ | `is_active` |
|  | 備考 | `note` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `addition_branch_category_map` 加算枝判定カテゴリ対応

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 加算枝判定カテゴリ対応ID | `addition_branch_category_map_id` |
| FK -> `addition_branch.addition_branch_id` | 加算枝ID | `addition_branch_id` |
| FK -> `counterparty_type.counterparty_type_id` | 相手先種別ID | `counterparty_type_id` |
|  | 判定カテゴリコード | `category_code` |
|  | 表示順 | `display_order` |
|  | 備考 | `note` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `list_view_setting` 一覧表示設定

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 一覧表示設定ID | `list_view_setting_id` |
|  | 対象画面コード | `screen_code` |
|  | 設定コード | `view_code` |
|  | 設定名 | `view_name` |
| FK -> `staff.staff_id` | 作成者相談員ID | `owner_staff_id` |
|  | 共有フラグ | `is_shared` |
|  | 既定フラグ | `is_default` |
|  | 絞込条件JSON | `filter_json` |
|  | 並び順JSON | `sort_json` |
|  | 備考 | `note` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `list_view_column` 一覧表示列

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 一覧表示列ID | `list_view_column_id` |
| FK -> `list_view_setting.list_view_setting_id` | 一覧表示設定ID | `list_view_setting_id` |
|  | 列キー | `column_key` |
|  | 列見出し上書き | `column_label_override` |
|  | 表示順 | `display_order` |
|  | 表示可否 | `is_visible` |
|  | 列幅 | `column_width` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |

## `audit_event` 操作監査ログ

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 操作監査ログID | `audit_event_id` |
| FK -> `operator_account.operator_account_id` | ログインアカウントID | `operator_account_id` |
|  | 操作種別 | `action_type` |
|  | 対象種別 | `target_type` |
|  | 対象ID | `target_id` |
|  | リクエストID | `request_id` |
|  | 詳細JSON | `detail_json` |
|  | 作成日時 | `created_at` |

## `evaluation_case` 判定セッション

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 判定セッションID | `evaluation_case_id` |
| FK -> `client_enrollment.client_enrollment_id` | 利用者利用状況ID | `client_enrollment_id` |
| FK -> `client.client_id` | 利用者ID | `client_id` |
| FK -> `organization.organization_id` | 機関ID | `organization_id` |
| FK -> `service_definition.service_definition_id` | サービス定義ID | `service_definition_id` |
| FK -> `service_group.service_group_id` | グループID | `service_group_id` |
| FK -> `staff.staff_id` | 相談員ID | `staff_id` |
|  | 対象月 | `target_month` |
|  | 対応日時 | `performed_at` |
|  | セッション状態 | `status` |
|  | 入力元 | `source_channel` |
|  | 判定要求JSON | `request_json` |
|  | 作成日時 | `created_at` |
|  | 判定完了日時 | `evaluated_at` |

## `evaluation_answer` 判定回答

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 判定回答ID | `evaluation_answer_id` |
| FK -> `evaluation_case.evaluation_case_id` | 判定セッションID | `evaluation_case_id` |
|  | 項目キー | `field_key` |
|  | 回答値JSON | `answer_value_json` |
|  | 回答表示名 | `answer_label` |
|  | 作成日時 | `created_at` |

## `evaluation_candidate` 判定候補

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 判定候補ID | `evaluation_candidate_id` |
| FK -> `evaluation_case.evaluation_case_id` | 判定セッションID | `evaluation_case_id` |
| FK -> `addition_branch.addition_branch_id` | 加算枝ID | `addition_branch_id` |
|  | 候補状態 | `candidate_status` |
|  | 一致グループ数 | `matched_group_count` |
|  | 表示順 | `display_order` |
|  | 詳細JSON | `detail_json` |
|  | 作成日時 | `created_at` |

## `evaluation_result` 判定結果

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 判定結果ID | `evaluation_result_id` |
| FK -> `evaluation_case.evaluation_case_id` | 判定セッションID | `evaluation_case_id` |
|  | 最終状態 | `final_status` |
| FK -> `addition.addition_id` | 加算ID | `addition_id` |
| FK -> `addition_branch.addition_branch_id` | 加算枝ID | `addition_branch_id` |
|  | メッセージ | `message` |
|  | 結果JSON | `result_json` |
|  | 作成日時 | `created_at` |

## `saved_note` 保存文

| ID Ref | 日本語列名 | 元の列名 |
| --- | --- | --- |
| PK | 保存文ID | `saved_note_id` |
| FK -> `evaluation_case.evaluation_case_id` | 判定セッションID | `evaluation_case_id` |
|  | プロンプト本文 | `prompt_text` |
|  | AI下書き本文 | `ai_draft_text` |
|  | 保存本文 | `final_note_text` |
|  | 作成日時 | `created_at` |
|  | 更新日時 | `updated_at` |
