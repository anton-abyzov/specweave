---
name: sync-diagnostics
description: Show sync circuit breaker diagnostics and status
---

You are executing the SpecWeave sync diagnostics command. This shows the current state of the sync circuit breaker and recent sync activity.

## Purpose

Display diagnostic information about automatic sync system:
- Circuit breaker state (closed, open, half-open)
- Recent failure count
- Last failure timestamp
- Auto-reset countdown (if circuit open)
- Sync status for active increments

## Implementation

```typescript
import { StatusChangeSyncTrigger } from '../../../src/core/increment/status-change-sync-trigger.js';
import { ActiveIncrementManager } from '../../../src/core/increment/active-increment-manager.js';
import { MetadataManager } from '../../../src/core/increment/metadata-manager.js';
import * as path from 'path';

// Get circuit breaker state
const breakerState = StatusChangeSyncTrigger.getCircuitBreakerState();

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔧 SYNC DIAGNOSTICS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// Circuit Breaker Status
console.log('🔴 Circuit Breaker Status');
console.log('');

const stateEmoji = {
  'closed': '✅',
  'open': '🔴',
  'half-open': '⚠️'
};

console.log(`   State: ${stateEmoji[breakerState.state]} ${breakerState.state.toUpperCase()}`);
console.log(`   Failures: ${breakerState.failures}/3`);

if (breakerState.lastFailure) {
  const elapsed = Date.now() - breakerState.lastFailure.getTime();
  const elapsedMin = Math.floor(elapsed / 60000);
  const resetIn = Math.max(0, 5 - elapsedMin);

  console.log(`   Last Failure: ${breakerState.lastFailure.toISOString()}`);
  console.log(`   Elapsed: ${elapsedMin} minutes ago`);

  if (breakerState.state === 'open') {
    console.log(`   ⏰ Auto-reset in: ${resetIn} minutes`);
  }
} else {
  console.log(`   Last Failure: None`);
}

console.log('');

// Sync Status Explanation
if (breakerState.state === 'closed') {
  console.log('✅ Automatic sync is ENABLED');
  console.log('   Status changes will trigger GitHub/JIRA/ADO sync');
} else if (breakerState.state === 'open') {
  console.log('🔴 Automatic sync is DISABLED');
  console.log('   Circuit breaker opened due to repeated failures');
  console.log('');
  console.log('   Possible causes:');
  console.log('   • GitHub/JIRA/ADO API is down or slow');
  console.log('   • Network connectivity issues');
  console.log('   • Authentication token expired');
  console.log('   • Rate limit exceeded');
  console.log('');
  console.log('   Actions:');
  console.log('   1. Check external service status');
  console.log('   2. Verify network connectivity');
  console.log('   3. Wait for auto-reset (${resetIn} minutes)');
  console.log('   4. Or manually sync: /specweave:sync-progress');
} else if (breakerState.state === 'half-open') {
  console.log('⚠️  Automatic sync is TESTING');
  console.log('   Circuit breaker is testing if service recovered');
  console.log('   Next sync will close or reopen circuit');
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 ACTIVE INCREMENTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// Show active increments
const activeManager = new ActiveIncrementManager();
const activeIncrements = activeManager.getActiveIncrements();

if (activeIncrements.length === 0) {
  console.log('   ℹ️  No active increments');
} else {
  for (const incrementId of activeIncrements) {
    try {
      const metadata = MetadataManager.read(incrementId);
      console.log(`   📦 ${incrementId}`);
      console.log(`      Status: ${metadata.status}`);
      console.log(`      Last Activity: ${metadata.lastActivity || 'Unknown'}`);

      // Show sync status
      if (metadata.external_tools?.github) {
        console.log(`      🔗 GitHub: Synced`);
      }
      if (metadata.external_tools?.jira) {
        console.log(`      🔗 JIRA: Synced`);
      }
      if (metadata.external_tools?.ado) {
        console.log(`      🔗 Azure DevOps: Synced`);
      }

      console.log('');
    } catch (err) {
      console.log(`   ⚠️  ${incrementId}: Error reading metadata`);
    }
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('💡 Troubleshooting:');
console.log('');
console.log('   • Manual sync: /specweave:sync-progress [increment-id]');
console.log('   • Reset circuit: (automatic after 5 minutes)');
console.log('   • Check logs: .specweave/logs/');
console.log('   • GitHub status: https://www.githubstatus.com/');
console.log('');
```

## Example Output

### Circuit Closed (Normal)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 SYNC DIAGNOSTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 Circuit Breaker Status

   State: ✅ CLOSED
   Failures: 0/3
   Last Failure: None

✅ Automatic sync is ENABLED
   Status changes will trigger GitHub/JIRA/ADO sync

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ACTIVE INCREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   📦 0058-fix-status-sync-and-auto-github-update
      Status: active
      Last Activity: 2025-11-24T12:34:56.789Z
      🔗 GitHub: Synced

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Circuit Open (Failure Mode)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 SYNC DIAGNOSTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 Circuit Breaker Status

   State: 🔴 OPEN
   Failures: 3/3
   Last Failure: 2025-11-24T12:30:00.000Z
   Elapsed: 3 minutes ago
   ⏰ Auto-reset in: 2 minutes

🔴 Automatic sync is DISABLED
   Circuit breaker opened due to repeated failures

   Possible causes:
   • GitHub/JIRA/ADO API is down or slow
   • Network connectivity issues
   • Authentication token expired
   • Rate limit exceeded

   Actions:
   1. Check external service status
   2. Verify network connectivity
   3. Wait for auto-reset (2 minutes)
   4. Or manually sync: /specweave:sync-progress

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Use Cases

### 1. Check Sync Health

```bash
/specweave:sync-diagnostics
```

Quickly see if automatic sync is working or if circuit breaker opened.

### 2. Troubleshoot Sync Failures

When sync isn't working, diagnostics shows:
- How many failures occurred
- When last failure happened
- How long until auto-reset
- What to check next

### 3. Monitor Active Increments

See which increments are active and synced to external tools.

## See Also

- `/specweave:sync-progress` - Manual sync command
- ADR-0070 (Hook Consolidation)
- Circuit Breaker Pattern Documentation
