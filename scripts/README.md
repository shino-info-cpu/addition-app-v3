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
  - Reads the current prototype addition definitions from `app/frontend/app.js`
  - Verifies the minimum expected candidate behavior for the current 10 trial branches
  - Useful for catching broad/incorrect month or action conditions before FTP deployment
- `check_prototype_post_checks.js`
  - Reads the current prototype addition definitions and sample report records from `app/frontend/app.js`
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
