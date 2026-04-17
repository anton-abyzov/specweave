# Plan: with-extended-thinking

Historical plan from the pre-4.7 era. At the time of writing, "extended thinking" was the judge-llm default. The 0669 alignment switched the terminology to "adaptive thinking". The content below is archived verbatim to test that the migration does not break older artifacts.

## Architecture Decisions

- judge-llm ran with extended thinking at the time this increment closed.
- Historical reports carry `mode: "ultrathink"` which the 1.1.0 CLI accepts as a legacy alias.
