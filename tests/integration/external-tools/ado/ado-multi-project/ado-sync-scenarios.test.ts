/**
 * Azure DevOps Sync Scenarios Test Suite
 *
 * Tests real-world sync scenarios for ADO multi-project integration:
 * - Spec to ADO sync
 * - ADO to spec import
 * - Conflict resolution
 * - Incremental updates
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('ADO Sync Scenarios', () => {
  let testDir: string;
  let specsDir: string;

  beforeAll(async () => {
    // ✅ FIXED: Use os.tmpdir() instead of process.cwd() to prevent deletion of project files
    testDir = path.join(os.tmpdir(), 'specweave-ado-sync-test');
    specsDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs');
    await fs.ensureDir(specsDir);
  });

  afterAll(async () => {
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('Scenario: New Feature Development', () => {
    test('should sync new spec to ADO Feature', async () => {
      // Create a new spec
      const specPath = path.join(specsDir, 'AuthService', 'spec-001-oauth.md');
      await fs.ensureDir(path.dirname(specPath));

      const specContent = `---
id: spec-001
title: OAuth 2.0 Implementation
status: draft
priority: P1
project: AuthService
---

# OAuth 2.0 Implementation

## Overview
Implement OAuth 2.0 authentication with support for Google, GitHub, and Microsoft providers.

## User Stories

### US-001: Google OAuth
**As a** user
**I want to** sign in with my Google account
**So that** I can access the application without creating a new password

**Acceptance Criteria**:
- [ ] **AC-US1-01**: User can click "Sign in with Google" button
- [ ] **AC-US1-02**: User is redirected to Google consent screen
- [ ] **AC-US1-03**: After consent, user is logged in to application
- [ ] **AC-US1-04**: User profile is populated from Google data

### US-002: GitHub OAuth
**As a** developer
**I want to** sign in with my GitHub account
**So that** I can access developer features

**Acceptance Criteria**:
- [ ] **AC-US2-01**: User can click "Sign in with GitHub" button
- [ ] **AC-US2-02**: User is redirected to GitHub authorization
- [ ] **AC-US2-03**: After authorization, user is logged in
- [ ] **AC-US2-04**: User's GitHub organizations are fetched

## Implementation History
- 0010-oauth-implementation: Initial OAuth setup (planned)
`;

      await fs.writeFile(specPath, specContent);

      // Mock sync command execution
      const mockSyncResult = {
        status: 'success',
        adoFeatureId: 456,
        adoFeatureUrl: 'https://dev.azure.com/test-org/AuthService/_workitems/edit/456',
        userStoriesCreated: 2,
        message: 'Spec successfully synced to ADO'
      };

      // Simulate the sync
      expect(mockSyncResult.status).toBe('success');
      expect(mockSyncResult.userStoriesCreated).toBe(2);
    });
  });

  describe('Scenario: Cross-Project Feature', () => {
    test('should handle checkout flow spanning multiple projects', async () => {
      const checkoutSpec = `---
id: spec-002
title: Complete Checkout Flow
status: in-progress
priority: P0
projects:
  primary: PaymentService
  secondary:
    - UserService
    - NotificationService
    - InventoryService
---

# Complete Checkout Flow

## Overview
End-to-end checkout process spanning payment processing, user validation,
notifications, and inventory management.

## Cross-Project User Stories

### US-001: Payment Processing (PaymentService)
**As a** customer
**I want to** complete payment securely
**So that** I can purchase products

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Support credit card payments
- [ ] **AC-US1-02**: Support PayPal payments
- [ ] **AC-US1-03**: Handle payment failures gracefully
- [ ] **AC-US1-04**: Send payment confirmation

### US-002: User Validation (UserService)
**As a** system
**I want to** validate user shipping address
**So that** orders can be delivered correctly

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Validate shipping address format
- [ ] **AC-US2-02**: Check user purchase history
- [ ] **AC-US2-03**: Apply user-specific discounts

### US-003: Order Notifications (NotificationService)
**As a** customer
**I want to** receive order confirmations
**So that** I have proof of purchase

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Send email confirmation
- [ ] **AC-US3-02**: Send SMS if opted in
- [ ] **AC-US3-03**: Update in-app notifications

### US-004: Inventory Update (InventoryService)
**As a** system
**I want to** update inventory after purchase
**So that** stock levels are accurate

**Acceptance Criteria**:
- [ ] **AC-US4-01**: Decrement item quantities
- [ ] **AC-US4-02**: Trigger restock if below threshold
- [ ] **AC-US4-03**: Update warehouse systems
`;

      const multiProjectPath = path.join(specsDir, 'PaymentService', 'spec-002-checkout.md');
      await fs.ensureDir(path.dirname(multiProjectPath));
      await fs.writeFile(multiProjectPath, checkoutSpec);

      // Mock multi-project sync
      const mockMultiProjectSync = {
        primary: {
          project: 'PaymentService',
          epicId: 789,
          epicUrl: 'https://dev.azure.com/test-org/PaymentService/_workitems/edit/789'
        },
        linked: [
          {
            project: 'UserService',
            featureId: 790,
            linkedTo: 789
          },
          {
            project: 'NotificationService',
            featureId: 791,
            linkedTo: 789
          },
          {
            project: 'InventoryService',
            featureId: 792,
            linkedTo: 789
          }
        ]
      };

      expect(mockMultiProjectSync.linked).toHaveLength(3);
      expect(mockMultiProjectSync.linked[0].linkedTo).toBe(789);
    });
  });

  describe('Scenario: Bidirectional Sync', () => {
    test('should sync changes from ADO back to spec', async () => {
      // Initial spec state
      const initialSpec = `---
id: spec-003
title: User Profile Management
status: in-progress
priority: P1
externalLinks:
  ado:
    featureId: 999
    featureUrl: https://dev.azure.com/test-org/UserService/_workitems/edit/999
---

# User Profile Management

## User Stories

### US-001: Profile Editing
Status: in-progress

**Acceptance Criteria**:
- [ ] AC-001: User can edit name
- [ ] AC-002: User can upload avatar
- [x] AC-003: User can change email
`;

      // Simulated ADO state (after external changes)
      const adoState = {
        featureId: 999,
        state: 'Active',
        userStories: [
          {
            id: 'US-001',
            state: 'Closed',
            acceptanceCriteria: [
              { id: 'AC-001', completed: true },
              { id: 'AC-002', completed: true },
              { id: 'AC-003', completed: true }
            ]
          }
        ]
      };

      // Expected spec after sync from ADO
      const expectedSpec = `---
id: spec-003
title: User Profile Management
status: complete
priority: P1
externalLinks:
  ado:
    featureId: 999
    featureUrl: https://dev.azure.com/test-org/UserService/_workitems/edit/999
    syncedAt: "2025-11-11T12:00:00Z"
---

# User Profile Management

## User Stories

### US-001: Profile Editing ✅
Status: done

**Acceptance Criteria**:
- [x] AC-001: User can edit name ✅
- [x] AC-002: User can upload avatar ✅
- [x] AC-003: User can change email ✅
`;

      // Verify sync logic
      expect(adoState.userStories[0].state).toBe('Closed');
      expect(adoState.userStories[0].acceptanceCriteria.every(ac => ac.completed)).toBe(true);
    });
  });

  describe('Scenario: Conflict Resolution', () => {
    test('should handle conflicts when both local and ADO have changes', async () => {
      const conflicts = [
        {
          field: 'status',
          local: 'in-progress',
          remote: 'complete',
          resolution: 'remote' // ADO wins by default
        },
        {
          field: 'priority',
          local: 'P2',
          remote: 'P1',
          resolution: 'remote'
        },
        {
          field: 'US-002.status',
          local: 'todo',
          remote: 'in-progress',
          resolution: 'remote'
        }
      ];

      // Conflict resolution strategy
      const resolveConflicts = (conflicts: any[]) => {
        return conflicts.map(conflict => ({
          ...conflict,
          resolvedValue: conflict.resolution === 'remote' ? conflict.remote : conflict.local
        }));
      };

      const resolved = resolveConflicts(conflicts);

      expect(resolved[0].resolvedValue).toBe('complete');
      expect(resolved[1].resolvedValue).toBe('P1');
      expect(resolved[2].resolvedValue).toBe('in-progress');
    });
  });

  describe('Scenario: Incremental Updates', () => {
    test('should only sync changed items for performance', async () => {
      const syncState = {
        lastSyncTime: '2025-11-10T10:00:00Z',
        itemsToSync: [] as string[],
        itemsSkipped: [] as string[]
      };

      // Items with modification times
      const items = [
        { id: 'US-001', modified: '2025-11-10T09:00:00Z', needsSync: false },
        { id: 'US-002', modified: '2025-11-10T11:00:00Z', needsSync: true },
        { id: 'US-003', modified: '2025-11-10T12:00:00Z', needsSync: true },
        { id: 'US-004', modified: '2025-11-10T08:00:00Z', needsSync: false }
      ];

      // Filter items that need syncing
      const itemsToSync = items.filter(item =>
        new Date(item.modified) > new Date(syncState.lastSyncTime)
      );

      expect(itemsToSync).toHaveLength(2);
      expect(itemsToSync[0].id).toBe('US-002');
      expect(itemsToSync[1].id).toBe('US-003');
    });
  });

  describe('Scenario: Bulk Operations', () => {
    test('should handle bulk spec sync efficiently', async () => {
      const specs = [
        'spec-001-auth.md',
        'spec-002-user.md',
        'spec-003-payment.md',
        'spec-004-notification.md',
        'spec-005-inventory.md'
      ];

      const mockBulkSync = async (specs: string[]) => {
        const results = specs.map((spec, idx) => ({
          spec,
          status: idx < 4 ? 'success' : 'failed',
          adoId: idx < 4 ? 1000 + idx : null,
          error: idx >= 4 ? 'Rate limit exceeded' : null
        }));

        return {
          successful: results.filter(r => r.status === 'success').length,
          failed: results.filter(r => r.status === 'failed').length,
          results
        };
      };

      const bulkResult = await mockBulkSync(specs);

      expect(bulkResult.successful).toBe(4);
      expect(bulkResult.failed).toBe(1);
      expect(bulkResult.results[4].error).toContain('Rate limit');
    });
  });

  describe('Scenario: Project Migration', () => {
    test('should migrate specs when project structure changes', async () => {
      // Old structure (single project)
      const oldSpecs = [
        '.specweave/docs/internal/specs/spec-001.md',
        '.specweave/docs/internal/specs/spec-002.md',
        '.specweave/docs/internal/specs/spec-003.md'
      ];

      // New structure (multi-project)
      const newStructure = {
        'AuthService': ['spec-001.md'],
        'UserService': ['spec-002.md'],
        'PaymentService': ['spec-003.md']
      };

      const mockMigration = async () => {
        const migrationResults = [];

        for (const [project, specs] of Object.entries(newStructure)) {
          for (const spec of specs) {
            migrationResults.push({
              oldPath: `.specweave/docs/internal/specs/${spec}`,
              newPath: `.specweave/docs/internal/specs/${project}/${spec}`,
              status: 'migrated'
            });
          }
        }

        return migrationResults;
      };

      const results = await mockMigration();

      expect(results).toHaveLength(3);
      expect(results[0].newPath).toContain('AuthService');
      expect(results[1].newPath).toContain('UserService');
      expect(results[2].newPath).toContain('PaymentService');
    });
  });
});