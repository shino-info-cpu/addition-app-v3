# Kasan App V3

`v3` is the clean rebuild workspace for the next version of the application.
All new design, schema, code, and tests should start here.
The existing `v2` area remains a reference source, not the place to continue extending.

## Working Rules

- Put all new work under `v3/`.
- Treat the current `v2` SQL and app code as reference material only.
- Use the database as the single source of truth.
- Do not encode structured meaning inside free-text note fields.
- Separate business master, rule master, UI flow settings, and AI prompt settings.
- Keep list layout settings separate from business data so column order and visible columns can change safely.
- Build the judgement engine so it can be tested without the UI.

## Folder Layout

- `app/backend` : backend application code for v3
- `app/frontend` : frontend application code for v3
- `db` : fresh schema and migration files for v3
- `docs` : rebuild policy, domain model, and migration notes
- `scripts` : import, seed, and verification scripts for v3
- `tests` : regression cases and automated tests for v3

## Reference Sources From V2

- `../README_加算アプリ仕様.md`
- `../現状と課題.md`
- `../runtime/runtime_data.json`
- `../runtime/domain_master_config.json`
- `../scripts/evaluator_cases.json`

## Immediate Next Steps

1. Finalize the domain model in `docs/domain-model.md`.
2. Confirm the technical stack for the new backend and frontend.
3. Prepare import templates that extract only needed master data from `v2`.
4. Implement the judgement engine as an isolated module with regression tests.

## Primary Counselor Screens

- `加算判定フォーム` : the daily decision-tree flow used to narrow one case down to the applicable addition.
- `集計フォーム` : the daily billing and audit lookup screen. It should support filtering, fast search, and reorderable columns.
- `利用者` / `機関` / `サービス` : the only masters counselors are expected to touch directly.

See `docs/ui-structure-ja.md` for the first screen-shell proposal.
