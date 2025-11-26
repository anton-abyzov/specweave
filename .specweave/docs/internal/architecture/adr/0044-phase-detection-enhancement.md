# ADR-0044: Phase Detection Enhancement

---
**⚠️ SUPERSEDED**: This ADR has been superseded.

**See instead**: [ADR-0013: Phase Detection](./0013-phase-detection.md)

**Date Superseded**: 2025-11-26
**Reason**: Consolidated into ADR-0013 which serves as the canonical phase detection decision. This enhancement has been merged into the main ADR.
---

## Original Content (Archived)

**Date**: 2025-11-16
**Status**: Superseded
**Supersedes**: ADR-0003-009 (Multi-Signal Phase Detection)
**Epic**: FS-039 (Ultra-Smart Next Command)

## Context

SpecWeave's existing phase detection uses a multi-signal heuristic to detect workflow phases with 95% accuracy target.

## Decision

See [ADR-0013](./0013-phase-detection.md) for the consolidated phase detection decision covering:
- Multi-signal heuristic algorithm
- Keyword, command, context, and hint signals
- Weighted signal combination
- Phase transition rules

## Related

- **Canonical ADR**: [ADR-0013: Phase Detection](./0013-phase-detection.md)
- **Also Superseded**: [ADR-0147: Phase Detection Algorithm](./0147-phase-detection-algorithm.md)
