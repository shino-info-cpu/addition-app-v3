# Rebuild Principles

## Why We Are Rebuilding

The current application has three structural problems.

- Settings and behaviour are spread across code, JSON, SQL, and note text.
- The same feature can follow different save paths such as DB and file fallback.
- Large files mix HTTP handling, business logic, persistence, UI flow, and AI integration.

That makes small master changes expensive and makes side effects hard to predict.

## Goals

- A counselor can maintain client, organization, service, and group masters without code edits.
- A rule change affects only the rule layer, not unrelated screens or storage code.
- The judgement engine is independently testable.
- Imports from Excel or CSV are possible, but imported data lands in one canonical model.
- The application can explain why a candidate was selected, blocked, or marked for review.
- Ambiguous terms can carry admin-maintained guidance without code edits.
- Reference selections show registered names first, not raw IDs.
- The aggregation screen supports both billing work and audit lookup.
- List screens can change visible columns and column order without code edits.
- Login identity and selected counselor can differ, and that difference must remain traceable.

## Non-Goals

- Preserve the current SQL structure.
- Continue the DB and file dual-write design.
- Keep backward compatibility with note-field parsing tricks.
- Move every old screen into v3 before the core model is stable.

## Architecture Principles

### 1. One Source Of Truth

The operational truth is the v3 database.
Files such as Excel, CSV, or JSON are import and export media only.

### 2. Typed Master Data

If the system needs `児` or `者`, it must exist in a dedicated column.
If a service belongs to a group, the relationship must exist as a real table relation.
Free text is for memo only.

### 3. Declarative Rules

Questions, candidate conditions, constraints, warnings, and category mappings should live in dedicated rule tables.
A master change should not require editing application code.

### 4. Name-First References

The database should store stable IDs.
The UI should show human-readable names first for reference fields such as clients, organizations, services, and staff.
If disambiguation is needed, code or ID can appear as secondary text.

### 5. Admin-Editable Guidance

Terms that confuse operators such as `面談`, `会議`, and `訪問` should support admin-maintained help text, examples, and non-examples.
Guidance belongs in data and settings, not hard-coded UI text.
Whether that guidance is always shown, shown only when expanded, or hidden by default should also be admin-controlled.

### 6. Isolated Engine

Judgement logic should be callable from tests, backend APIs, and import verifiers without UI dependencies.

### 7. Separate Operator Interfaces

The counselor flow and the admin master flow serve different users.
They should not share a giant file that mixes both concerns.

### 8. One App Shell, Clear Daily Work

The basic screen shell should stay simple:

- top bar
- left navigation with button links
- right content pane

For counselors, daily work should center on two screens:

- judgement input
- aggregation and audit lookup

Master screens for `利用者`, `機関`, and `サービス` should stay available but secondary.

### 9. Migrate By Evidence

We bring over business meaning, rule content, and representative judgement cases.
We do not bring over accidental complexity from the current implementation.

### 10. Keep Identity And Business Meaning Separate

Google Workspace login tells us who operated the system.
That is not always the same as the counselor selected for the business record.

The model should therefore keep:

- login identity for audit
- selected counselor for the business record

without duplicating near-identical counselor columns across the main transaction tables.

## Work Order

1. Freeze the v3 domain model.
2. Freeze the fresh SQL schema.
3. Prepare a clean import path from v2 reference data.
4. Build regression cases around the judgement engine.
5. Build the first counselor-facing judgement shell on top of the stable model.
6. Build aggregation and audit lookup on top of the stable model.
7. Build admin master tools on top of the stable model.
8. Run parallel verification before cutover.
