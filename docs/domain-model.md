# Domain Model

## Scope Split

The next version separates data into four areas.

- Operational master for counselor-managed data
- Rule master for addition judgement logic
- UI setting data for list layouts and saved views
- Transaction data for actual judgement runs and saved notes

## Counselor-Managed Master

These are the entities that should be easy to maintain in normal operations.

| Entity | Purpose | Notes |
| --- | --- | --- |
| `client` | 利用者 | `児` / `者` is a real column |
| `organization` | 機関 | The provider or related organization |
| `staff` | 相談員 | Default home organization is optional |
| `operator_account` | ログインアカウント | Google Workspace account mapped to an initial-selected counselor |
| `service_definition` | サービス定義 | Canonical service type. `児` / `者` の別行は作らず、`target_scope` に `児` / `者` / `児者` を持つ |
| `organization_service` | 機関サービス | An organization offering a service |
| `service_group` | グループ | A group that exists under an organization service |
| `client_enrollment` | 利用者利用状況 | Which client uses which organization service and group |

## Rule Master

These are maintained by the person responsible for制度 and application behaviour.

| Entity | Purpose |
| --- | --- |
| `counterparty_type` | 相手先種別 |
| `addition` | 加算親 |
| `addition_branch` | 加算枝 |
| `question_definition` | 設問定義。補足説明、具体例、参照表示設定を持てる |
| `question_option` | 設問選択肢。選択肢ごとの説明、具体例、注意点を持てる |
| `question_visibility_rule` | 設問表示制御 |
| `question_option_rule` | 選択肢表示制御。前回答に応じた動的選択肢を持てる |
| `addition_branch_condition` | 候補条件 |
| `addition_branch_constraint` | 制約ルール |
| `addition_branch_warning` | 警告ルール |
| `addition_branch_category_map` | 判定カテゴリ対応 |

## UI Setting Data

These tables keep screen behavior that should be changeable without code edits.

| Entity | Purpose |
| --- | --- |
| `list_view_setting` | 一覧画面ごとの表示設定。集計フォームの列順、表示列、並び順、共有ビューを持てる |
| `list_view_column` | 一覧表示に含める列の順番、表示可否、列幅 |

## Transaction Data

These tables record actual usage and judgement output.

| Entity | Purpose |
| --- | --- |
| `evaluation_case` | 1回の判定セッション |
| `evaluation_answer` | セッション中の回答 |
| `evaluation_candidate` | 候補として残った枝 |
| `evaluation_result` | 最終結果 |
| `saved_note` | 保存文、AI下書き、プロンプト履歴 |
| `audit_event` | ログインアカウントに紐づく操作監査ログ |

## Key Relationships

- One `organization` can be the default home for many `staff`.
- One `staff` can be the initial-selected counselor for many `operator_account` records, although the normal case is one account to one counselor.
- One `organization` can offer many `organization_service` records.
- One `service_definition` can be offered by many organizations through `organization_service`.
- One `organization_service` can have many `service_group` records.
- One `client` can have many `client_enrollment` records.
- One `client_enrollment` points to one `organization_service` and optionally one `service_group`.
- One `addition` can have many `addition_branch` records.
- One `addition_branch` can have many conditions, constraints, warnings, and category mappings.
- One `staff` can own many `list_view_setting` records, while shared views can exist without an owner.
- One `list_view_setting` can have many `list_view_column` records.
- One `operator_account` can have many `audit_event` records.
- One `evaluation_case` can have many answers and many candidate rows, but only one final result.

## Important Modeling Decisions

### Group Belongs Under Organization Service

The user flow says:

`利用者 -> 機関 -> サービス -> グループ`

So a group should not float independently.
It should belong to the concrete service offered by a concrete organization.

That does not mean the judgement UI must always ask in that exact order.
Question order stays a UI-flow decision, not a fixed database contract.

### Client Usage Is A First-Class Relation

We should not infer current usage from notes or scattered master rows.
`client_enrollment` is the single place that says which client is using which organization service and group.

For the current judgement UI, that relation is intentionally narrow:

- client
- organization service
- optional group

Historical period columns may remain in the database for compatibility, but they are not part of the current operator flow or判定条件.

### Service Scope Is A Range, Not Separate Rows

The same service name should not appear twice only because one row says `児` and the other says `者`.
`service_definition` should represent the service itself once, and the usable range should live in `target_scope`.

That means:

- `居宅介護 / 障害福祉 / 児者` is one service definition
- the operator registers that service once for an organization
- the operator does not repeat the same setup for `児` and `者`

### Staff Is One Person, Not One Record Per Organization

`staff` should represent the counselor as a person.
If a default home organization is useful, it can be stored as `home_organization_id`.
Actual case handling across multiple organizations should be expressed by enrollment and case data, not by duplicating staff rows.

### Login Account And Selected Counselor Are Different Things

The Google Workspace account is the login identity.
That identity can be mapped to an initial-selected counselor through `operator_account`.

However, the operator may need to record work under a different counselor.
For that reason, `evaluation_case.staff_id` should stay as the selected counselor for the record itself.
Who actually logged in should be kept in `audit_event`, not by adding a second counselor-like column to every business table.

### Rules Should Refer To Stable Keys

Rule tables should refer to stable keys such as `field_key`, `branch_code`, and `counterparty_type_code`.
That keeps imports and tests readable.

### Reference Fields Store IDs But Display Names

Reference values should be stored as stable IDs.
However, the operator should normally see names such as `機関名`, `利用者名`, `サービス名`, and `相談員名`.
Codes or IDs should be secondary display only.

### Guidance Is Data, Not Code

Questions and options should be able to carry short help text, detailed help, examples, and non-examples.
That allows the admin side to reduce confusion without changing application code.
The admin side should also control whether the guidance is always visible, collapsed by default, or hidden.
Question visibility and option filtering should also be data-backed, so `visibleWhen` や `getOptions` を増やし続けない。

### List Layouts Are Data, Too

The aggregation screen is part of daily billing work and audit response.
Column order, visible columns, and saved filters should be configurable through data such as `list_view_setting` and `list_view_column`, not hard-coded in the frontend.

### Notes Stay Notes

`note` columns remain useful, but they must never carry hidden structured flags such as `対象=児`.
