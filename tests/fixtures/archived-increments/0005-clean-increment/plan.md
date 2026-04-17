# Plan: clean-increment

Baseline fixture. No state markers, no `--simple` flag, no extended-thinking references, and no archived 15-task cap. Exists purely to verify that the backwards-compat harness still passes on clean state.

## Architecture Decisions

- This fixture is the control arm of the backwards-compat regression suite.
- Any failure here indicates the harness itself is broken, not a regression in the code under test.
