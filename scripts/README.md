# Scripts

Place import, export, seed, and verification scripts for v3 here.
Scripts should target the v3 schema only.

## Current scripts

- `generate_appsheet_master_seed.py`
  - Reads `加算入力アプリ２０２６NEW のコピー.xlsx`
  - Generates `runtime/import/master_seed_appsheet.sql`
  - Generates `runtime/import/master_seed_appsheet_report.json`
  - Imports only `利用者`, `相談員`, `機関`, `サービス`
- `generate_relation_review_templates.py`
  - Generates `organization_service_review.csv`
  - Generates `client_enrollment_review.csv`
  - Builds review candidates from `加算記録`
- `generate_relation_seed_from_review.py`
  - Reads reviewed CSVs
  - Generates `relation_seed_reviewed.sql`
- `check_prototype_additions.js`
  - Reads the current prototype addition definitions from `runtime/rule-master/rule-master-source.js`
  - Verifies the minimum expected candidate behavior for the current 24 trial branches
  - Useful for catching broad/incorrect month or action conditions before FTP deployment
- `check_prototype_post_checks.js`
  - Reads the current prototype addition definitions and sample report records from `runtime/rule-master/rule-master-source.js`
  - Verifies the minimum expected post-check behavior for the current trial branches
  - Useful for catching broken monthly limits, visit-count conditions, or併算定不可エンジン regressions before FTP deployment
- `check_prototype_question_flow.js`
  - Loads `app/frontend/app.js` with a light DOM stub
  - Verifies that the UI does not jump to post-check before visible questions are answered
  - Useful for catching premature "必要な設問はここまでです" regressions
- `check_resolved_organization_types.js`
  - Loads `app/frontend/app.js` with a light DOM stub
  - Verifies that organization type inference works for hospital / visiting nurse / school / nursery / care-manager / company / employment-support-center examples
  - Useful before adding organization-type-dependent additions such as school, nursery, or care-manager related branches
- `runtime/rule-master/rule-master-source.js`
  - Canonical raw rule master source
  - Holds the prototype branch/question/sample source that exporters read first
  - This is the current single source of truth while the DB rule master migration is still in progress
- `runtime/prototype/prototype-rule-source.js`
  - Compatibility copy generated from `runtime/rule-master/rule-master-source.js`
  - Kept only so older bridge checks / assets can continue to resolve a prototype source path during the migration
- `export_prototype_rule_catalog.js`
  - Reads the current prototype branch definitions from `runtime/rule-master/rule-master-source.js`
  - Generates `runtime/import/prototype_addition_catalog.json`
  - Generates `runtime/import/prototype_addition_seed.sql`
  - Generates `db/004_seed_prototype_additions.sql`
  - Useful as a bridge while moving from hardcoded prototype branches toward `addition` / `addition_branch` rule tables
- `export_prototype_question_catalog.js`
  - Reads the current prototype question definitions from `runtime/rule-master/rule-master-source.js`
  - Generates `runtime/import/prototype_question_catalog.json`
  - Generates `runtime/import/prototype_question_seed.sql`
  - Generates `db/005_seed_prototype_questions.sql`
  - Seeds `question_definition`, `question_option`, `question_visibility_rule`, and `question_option_rule`
  - Useful as a bridge while moving from hardcoded prototype questions toward DB-backed question catalogs with visibility and dynamic option rules
- `export_prototype_branch_rule_catalog.js`
  - Reads the current prototype branch logic from `runtime/rule-master/rule-master-source.js`
  - Generates `runtime/import/prototype_branch_rule_catalog.json`
  - Generates `runtime/import/prototype_branch_rule_seed.sql`
  - Generates `db/006_seed_prototype_branch_rules.sql`
  - Seeds `addition_branch_condition` and `addition_branch_constraint` from the current prototype rules
- `export_prototype_frontend_source.js`
  - Validates `runtime/rule-master/rule-master-source.js`
  - Writes `runtime/prototype/prototype-rule-source.js` as a compatibility copy
  - Keeps the DB bridge/export pipeline from silently drifting after `app.js` stops carrying the raw prototype literals
- `export_prototype_sample_data.js`
  - Reads `runtime/rule-master/rule-master-source.js`
  - Generates `app/frontend/prototype-sample-data.js`
  - Separates sample clients / organizations / services / enrollments / report records from the raw rule source so frontend runtime does not need the raw rule asset
- `export_rule_master_bundle.js`
  - Runs the canonical export sequence in one command
  - Generates the compatibility source copy, sample asset, import catalogs, DB seeds, and frontend catalog asset together
  - Use this when refreshing the full bridge from the canonical rule master source
- `app/frontend/rule-runtime-adapter.js`
  - Frontend runtime helper asset (generated manually, not by a script)
  - Owns sample/API catalog switching, prototype catalog access, and candidate/question lookup wiring
  - Keeps `app.js` closer to a UI adapter by moving catalog runtime plumbing out of the main screen logic
- `app/frontend/judgement-engine-bridge.js`
  - Frontend helper asset for判定エンジン runtime
  - Owns candidate matching, judgement facts, visible question resolution, and candidate reason generation
  - Keeps `app.js` closer to a UI adapter by moving non-UI judgement engine logic out of the main screen logic
- `app/frontend/api-runtime-adapter.js`
  - Frontend runtime helper asset (generated manually, not by a script)
  - Owns API fetch, health detection, catalog load, master load, relation load, judgement-context load, and report/history load orchestration
  - Keeps `app.js` closer to a UI adapter by moving non-UI API plumbing out of the main screen logic
- `app/frontend/report-state-bridge.js`
  - Frontend helper asset for report view/filter state and persistence
  - Owns saved report view loading, active view switching, filter sync, column movement, and report re-search orchestration
  - Keeps `app.js` closer to a UI adapter by moving non-UI report state management out of the main screen logic
- `app/frontend/judgement-report-bridge.js`
  - Frontend helper asset for judgement save payloads and report-record normalization
  - Owns candidate storage entry building, branch/family reference formatting, and report identity/detail rendering helpers
  - Keeps `app.js` closer to a UI adapter by moving save/report bridge logic out of the main screen logic
- `app/frontend/master-data-bridge.js`
  - Frontend helper asset for master/sample/API data normalization and lookup
  - Owns organization-type inference, master lookups, and judgement organization/service selection helpers
  - Keeps `app.js` closer to a UI adapter by moving non-UI data plumbing out of the main screen logic
- `export_prototype_frontend_catalog.js`
  - Reads `runtime/import/prototype_addition_catalog.json`, `prototype_branch_rule_catalog.json`, and `prototype_question_catalog.json`
  - Generates `app/frontend/prototype-rule-catalog.js`
  - Builds a generated sample fallback catalog so frontend runtime can use a catalog-shaped asset instead of raw in-file prototype arrays
- `check_prototype_db_bridge.js`
  - Runs `export_rule_master_bundle.js`
  - Verifies that family codes, branch codes, and question keys still match the canonical rule master source and the generated DB bridge seeds
  - Useful before moving more logic off `app.js`, because it catches drift between the canonical source and the generated DB bridge seeds
- `check_question_catalog_runtime.js`
  - Loads `app/frontend/prototype-sample-data.js`, `prototype-rule-catalog.js`, `rule-runtime-adapter.js`, and `app/frontend/app.js` with a light DOM stub
  - Compares the legacy in-file question behavior and the generated `prototype_question_catalog.json` behavior
  - Verifies that visibility rules and dynamic option rules still produce the same visible questions and action options in representative cases
- `check_addition_catalog_runtime.js`
  - Loads `app/frontend/prototype-sample-data.js`, `prototype-rule-catalog.js`, `rule-runtime-adapter.js`, and `app/frontend/app.js` with a light DOM stub
  - Compares the generated sample fallback behavior with the generated `prototype_addition_catalog.json` + `prototype_branch_rule_catalog.json` behavior
  - Verifies that representative candidate selection and post-check flow still match after moving branch conditions / constraints to the DB bridge seeds
- `check_frontend_prototype_catalog_asset.js`
  - Loads `app/frontend/prototype-rule-catalog.js`
  - Verifies that the generated frontend fallback catalog is present and has the expected question / addition counts
- `check_frontend_prototype_source_asset.js`
  - Loads `runtime/rule-master/rule-master-source.js`
  - Verifies that the canonical raw rule master source asset is present and has the expected question / addition counts
- `check_frontend_prototype_sample_data_asset.js`
  - Loads `app/frontend/prototype-sample-data.js`
  - Verifies that the generated sample data asset is present and has the expected sample clients / organizations / services / report records
- `check_prototype_runtime_source_bridge.js`
  - Loads `runtime/rule-master/rule-master-source.js`, `app/frontend/prototype-sample-data.js`, `app/frontend/prototype-rule-catalog.js`, `app/frontend/rule-runtime-adapter.js`, and `app/frontend/app.js`
  - Verifies that sample runtime reads sample data and normalized catalog from single embedded entry points while the canonical rule master source stays outside browser runtime decisions
  - Useful while thinning `app.js` into a UI adapter, because it catches re-splitting of the sample runtime entry points
- `check_judgement_save_payload_bridge.js`
  - Loads `app/frontend/prototype-sample-data.js`, `prototype-rule-catalog.js`, `rule-runtime-adapter.js`, `judgement-report-bridge.js`, and `app/frontend/app.js` with a light DOM stub
  - Verifies that DB-backed addition catalog mode produces save payloads with `addition_id` / `addition_branch_id` and branch-aware `candidates`
  - Also verifies that sample-save fallback preserves the same top-branch IDs and candidate count
- `check_report_record_bridge.js`
  - Loads `app/frontend/prototype-sample-data.js`, `prototype-rule-catalog.js`, `rule-runtime-adapter.js`, `judgement-report-bridge.js`, and `app/frontend/app.js` with a light DOM stub
  - Verifies that report-record normalization preserves `candidate_count` / `candidate_names_summary`
  - Also verifies that older branch-saved records fall back to a single candidate cleanly
- `check_master_data_bridge.js`
  - Loads `app/frontend/prototype-sample-data.js`, `prototype-rule-catalog.js`, `rule-runtime-adapter.js`, `master-data-bridge.js`, `judgement-report-bridge.js`, and `app/frontend/app.js`
  - Verifies that sample/API master normalization and judgement organization/service selection still behave as expected
- `check_api_runtime_bridge.js`
  - Loads `app/frontend/api-runtime-adapter.js`
  - Verifies that API URL building, health detection, and catalog load fallback still behave as expected
- `check_report_state_bridge.js`
  - Loads `app/frontend/report-state-bridge.js`
  - Verifies stored view loading, active view switching, filter sync, and persistence behavior without the main UI runtime
- `check_live_api_runtime.js`
  - Reads the generated prototype bridge catalogs from `runtime/import`
  - Calls a deployed `.../api/health.php`, `question-catalog.php`, `addition-catalog.php`, and `report-records.php`
  - Verifies that live DB/API runtime is serving the same question count, family count, and branch count as the current bridge seeds
  - Also checks whether `report-records.php` exposes `candidate_count` / `candidate_names_summary` when records exist

## Live runtime check

After deploying backend/frontend updates and running the DB seeds, you can smoke-check the live runtime with:

```powershell
node .\v3\scripts\check_live_api_runtime.js https://shinonome-kai.or.jp/kasan2/api
```

If you pass the app root instead of `/api`, the script appends `/api` automatically.

## Canonical export flow

When the canonical rule source changes, refresh generated assets and seeds with:

```powershell
node .\v3\scripts\export_rule_master_bundle.js
```

This is the intended single command for:

- compatibility source copy
- sample data asset
- addition catalog / seed
- question catalog / seed
- branch rule catalog / seed
- frontend fallback catalog
