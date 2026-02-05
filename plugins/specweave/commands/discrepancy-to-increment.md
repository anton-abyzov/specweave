---
description: Convert brownfield discrepancies into a new increment for systematic documentation improvement. Groups by module, generates spec with ACs, and tracks resolution.
---

# Discrepancy to Increment Command

Convert one or more brownfield discrepancies into a new increment for systematic documentation improvement.

## Usage

```bash
/sw:discrepancy-to-increment DISC-0001
/sw:discrepancy-to-increment DISC-0001 DISC-0002 DISC-0003
/sw:discrepancy-to-increment --module payment-service
```

## Arguments

- `<discrepancy-ids>`: One or more discrepancy IDs to convert (e.g., DISC-0001 DISC-0002)
- `--module <name>`: Convert all pending discrepancies for a specific module
- `--type <type>`: Convert all discrepancies of a specific type
- `--priority <level>`: Convert all discrepancies at or above a priority level
- `--dry-run`: Preview what would be created without making changes

## Process

1. **Read Discrepancy Details**
   - Load specified discrepancies from `.specweave/discrepancies/`
   - Verify all discrepancies exist and are in `pending` status

2. **Group by Module** (if multiple)
   - If discrepancies span multiple modules, ask if user wants:
     - Single increment covering all modules
     - Separate increments per module

3. **Generate Increment ID with Validation**
   - Get next available increment number
   - **Validate increment number** using increment-validator:
     ```typescript
     import { validateIncrementNumber, logValidationResult } from './src/core/increment-validator.js';

     // Get all existing increments
     const existingIncrements = [
       ...fs.readdirSync('.specweave/increments/'),
       ...fs.readdirSync('.specweave/increments/_archive/').map(f => `_archive/${f}`),
     ].filter(f => /^\d{4}-/.test(f));

     // Get next number
     const nextNumber = getNextIncrementNumber();

     // Validate (should always be sequential for discrepancy-to-increment)
     const result = validateIncrementNumber(nextNumber, existingIncrements);
     logValidationResult(result);

     if (!result.isValid) {
       throw new Error('Cannot generate increment ID. See validation errors above.');
     }

     // Use validated number
     const incrementId = `${nextNumber}-${moduleName}-docs-improvement`;
     ```
   - Include discrepancy context in spec.md
   - Generate user stories from discrepancies
   - Link code/doc locations

4. **Update Discrepancy Status**
   - Change status from `pending` to `in-progress`
   - Add `incrementId` reference

5. **On Increment Completion**
   - When increment closes via `/sw:done`
   - All linked discrepancies auto-marked `resolved`
   - Archived to `resolved/YYYY-MM/`

## Example Output

```
🔄 Converting discrepancies to increment...

Selected discrepancies:
  ├─ DISC-0001: missing-docs (payment-service)
  ├─ DISC-0002: missing-docs (payment-service)
  └─ DISC-0003: stale-docs (payment-service)

Module: payment-service
Total: 3 discrepancies

Generated increment: 0087-payment-docs-improvement

📝 spec.md created with:
  • 1 user story: Document payment-service module
  • 3 acceptance criteria (one per discrepancy)
  • Links to affected code locations

Updated discrepancy status:
  ├─ DISC-0001: pending → in-progress
  ├─ DISC-0002: pending → in-progress
  └─ DISC-0003: pending → in-progress

Next steps:
  1. Review: .specweave/increments/0087-payment-docs-improvement/spec.md
  2. Plan: /sw:plan 0087
  3. Execute: /sw:do 0087
```

## Generated Spec Structure

```markdown
---
increment: 0087-payment-docs-improvement
status: planning
type: documentation
---

# Documentation Improvement: payment-service

## Context

This increment addresses documentation gaps detected during brownfield analysis.

### Source Discrepancies

| ID | Type | Priority | Summary |
|----|------|----------|---------|
| DISC-0001 | missing-docs | high | 12 undocumented exports |
| DISC-0002 | missing-docs | medium | processPayment function lacks docs |
| DISC-0003 | stale-docs | high | Payment flow diagram outdated |

## User Story

### US-001: Document payment-service Module

**As a** new developer joining the team,
**I want** comprehensive documentation for the payment-service module,
**So that** I can understand and contribute to the payment flow.

#### Acceptance Criteria

- [ ] **AC-US1-01**: Document all 12 undocumented exports (DISC-0001)
- [ ] **AC-US1-02**: Add JSDoc to processPayment function (DISC-0002)
- [ ] **AC-US1-03**: Update payment flow diagram to match current implementation (DISC-0003)

## Technical Notes

### Affected Files

From DISC-0001:
- `src/payment/processor.ts`
- `src/payment/validator.ts`
- `src/payment/types.ts`

From DISC-0003:
- `docs/modules/payment.md` (diagram needs update)
```

## Completion Hook

When the increment is closed with `/sw:done`:

```typescript
// Automatically triggered by increment completion
async function onIncrementComplete(incrementId: string) {
  const manager = new BrownfieldDiscrepancyManager(projectPath);

  // Find all discrepancies linked to this increment
  const discrepancies = await manager.listDiscrepancies({
    incrementId,
    status: 'in-progress'
  });

  // Resolve each discrepancy
  for (const disc of discrepancies) {
    await manager.resolveDiscrepancy(disc.id, {
      type: 'doc-updated',
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'increment-completion'
    });
  }

  console.log(`✅ Resolved ${discrepancies.length} discrepancies`);
}
```

## Related

- `/sw:discrepancies` - View pending discrepancies
- `/sw:increment` - Create new increment manually
- `/sw:done` - Complete increment (triggers resolution)
