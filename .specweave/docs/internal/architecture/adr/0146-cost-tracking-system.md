# ADR-0146: Cost Tracking System Design

---
**⚠️ SUPERSEDED**: This ADR has been superseded.

**See instead**: [ADR-0003: Intelligent Model Selection Architecture](./0003-intelligent-model-selection) (includes AI cost tracking)

**Date Superseded**: 2025-11-26
**Reason**: AI cost tracking is covered within ADR-0003 (Intelligent Model Selection). Note: ADR-0041 covers serverless infrastructure costs (different topic).
---

## Original Content (Archived)

**Date**: 2025-10-30
**Status**: Superseded
**Increment**: 0003-intelligent-model-selection

## Context

Users need visibility into AI costs per increment.

## Decision

See [ADR-0012](./0012-cost-tracking) for the consolidated cost tracking decision covering:
- JSON-based cost tracking
- Async logging
- Per-increment reports
- Storage format

## Related

- **Canonical ADR**: [ADR-0012: Cost Tracking](./0012-cost-tracking)
- **Related**: [ADR-0041: Cost Estimation Algorithm](./0041-cost-estimation-algorithm) (estimation, not tracking)
