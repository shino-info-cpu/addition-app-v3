# Migration Strategy

## What We Carry Forward

- The business intent from the existing specification documents
- The current addition catalog and branch catalog
- Representative judgement cases and expected outcomes
- Only the master rows that are still needed in operations

## What We Explicitly Leave Behind

- The current SQL schema
- DB and file fallback as equal persistence paths
- Free-text note parsing for structured fields
- Large monolithic files that mix UI, API, storage, and rule logic
- Screen-specific quick fixes that bypass the master model

## Migration Stages

### Stage 1. Freeze Reference Sources

Treat the current `v2` data as read-only source material.
Do not keep extending it while designing v3.

### Stage 2. Normalize Reference Data

Extract only the needed columns from v2 into clean import templates.
At this stage we resolve things like:

- `児者区分` from notes into a typed column
- service target type into a typed column
- duplicate or obsolete master rows

### Stage 3. Import Into The New Schema

Load the normalized templates into the new v3 schema.
Any row that cannot be mapped should fail with a clear import report.

### Stage 4. Rebuild The Engine With Tests

Use representative judgement cases to confirm that the new engine produces:

- same results where v2 was correct
- intentionally corrected results where v2 behaviour was wrong

### Stage 5. Parallel Verification

Run v2 and v3 side by side on sample cases until the new model is trusted.

### Stage 6. Cutover

Move users only after the following are true.

- Master maintenance is possible without developer intervention
- Critical judgement cases have automated coverage
- Saved note generation works from the new model
- Old fallback paths are no longer needed

## Practical Rule For Migration

If a v2 artifact answers the question "what should the business rule be", we carry the meaning forward.
If it answers only "how did the old app happen to implement this", we leave it behind.

