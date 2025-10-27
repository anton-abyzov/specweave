# Playbook: Database Deadlock

## Symptoms

- "Deadlock detected" errors in application
- API returning 500 errors
- Transactions timing out
- Database connection pool exhausted
- Monitoring alert: "Deadlock count >0"

## Severity

- **SEV2** if isolated to specific endpoint
- **SEV1** if affecting all database operations

## Diagnosis

### Step 1: Confirm Deadlock (PostgreSQL)

```sql
-- Check for currently locked queries
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity
  ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity
  ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Check deadlock log
SELECT * FROM pg_stat_database WHERE datname = 'your_database';
```

### Step 2: Confirm Deadlock (MySQL)

```sql
-- Show InnoDB status (includes deadlock info)
SHOW ENGINE INNODB STATUS\G

-- Look for "LATEST DETECTED DEADLOCK" section
-- Shows which transactions were involved
```

---

### Step 3: Identify Deadlock Pattern

**Common Pattern 1: Lock Order Mismatch**
```
Transaction A: Locks row 1, then row 2
Transaction B: Locks row 2, then row 1
→ DEADLOCK
```

**Common Pattern 2: Gap Locks**
```
Transaction A: SELECT ... FOR UPDATE WHERE id BETWEEN 1 AND 10
Transaction B: INSERT INTO table (id) VALUES (5)
→ DEADLOCK
```

**Common Pattern 3: Foreign Key Deadlock**
```
Transaction A: Updates parent table
Transaction B: Inserts into child table
→ DEADLOCK (foreign key check locks)
```

---

## Mitigation

### Immediate (Now - 5 min)

**Option A: Kill Blocking Query** (PostgreSQL)
```sql
-- Terminate blocking process
SELECT pg_terminate_backend(<blocking_pid>);

-- Verify deadlock cleared
SELECT count(*) FROM pg_locks WHERE NOT granted;
-- Should return 0
```

**Option B: Kill Blocking Query** (MySQL)
```sql
-- Show process list
SHOW PROCESSLIST;

-- Kill blocking query
KILL <process_id>;
```

**Option C: Kill Idle Transactions** (PostgreSQL)
```sql
-- Find idle transactions (>5 min)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
AND state_change < NOW() - INTERVAL '5 minutes';

-- Impact: Frees up locks
-- Risk: Low (transactions are idle)
```

---

### Short-term (5 min - 1 hour)

**Option A: Add Transaction Timeout** (PostgreSQL)
```sql
-- Set statement timeout (30 seconds)
ALTER DATABASE your_database SET statement_timeout = '30s';

-- Or in application:
SET statement_timeout = '30s';

-- Impact: Prevents long-running transactions
-- Risk: Low (transactions should be fast)
```

**Option B: Add Transaction Timeout** (MySQL)
```sql
-- Set lock wait timeout
SET GLOBAL innodb_lock_wait_timeout = 30;

-- Impact: Transactions fail instead of waiting forever
-- Risk: Low (application should handle errors)
```

**Option C: Fix Lock Order in Application**
```javascript
// BAD: Inconsistent lock order
async function transferMoney(fromId, toId, amount) {
  await db.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromId]);
  await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toId]);
}

// GOOD: Consistent lock order
async function transferMoney(fromId, toId, amount) {
  const firstId = Math.min(fromId, toId);
  const secondId = Math.max(fromId, toId);

  await db.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, firstId]);
  await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, secondId]);
}
```

---

### Long-term (1 hour+)

**Option A: Reduce Transaction Scope**
```javascript
// BAD: Long transaction
BEGIN;
const user = await db.query('SELECT * FROM users WHERE id = ? FOR UPDATE', [userId]);
await sendEmail(user.email); // External call (slow!)
await db.query('UPDATE users SET last_email_sent = NOW() WHERE id = ?', [userId]);
COMMIT;

// GOOD: Short transaction
const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
await sendEmail(user.email); // Outside transaction
await db.query('UPDATE users SET last_email_sent = NOW() WHERE id = ?', [userId]);
```

**Option B: Use Optimistic Locking**
```sql
-- Add version column
ALTER TABLE accounts ADD COLUMN version INT DEFAULT 0;

-- Update with version check
UPDATE accounts
SET balance = balance - 100, version = version + 1
WHERE id = 1 AND version = <current_version>;

-- If 0 rows updated, retry with new version
```

**Option C: Review Isolation Level**
```sql
-- PostgreSQL default: READ COMMITTED
-- Most cases: READ COMMITTED is fine
-- Rare cases: REPEATABLE READ or SERIALIZABLE

-- Lower isolation = less locking = fewer deadlocks
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

---

## Escalation

**Escalate to developer if**:
- Application code causing deadlock
- Requires code refactoring

**Escalate to DBA if**:
- Database configuration issue
- Foreign key constraint problem

---

## Prevention

- [ ] Always lock in same order
- [ ] Keep transactions short
- [ ] Use timeout (statement_timeout, lock_wait_timeout)
- [ ] Use optimistic locking when possible
- [ ] Add deadlock monitoring alert
- [ ] Review isolation level (lower = fewer deadlocks)

---

## Related Runbooks

- [04-slow-api-response.md](04-slow-api-response.md) - If API slow due to deadlock
- [../modules/database-diagnostics.md](../modules/database-diagnostics.md) - Database troubleshooting

---

## Post-Incident

After resolving:
- [ ] Create post-mortem
- [ ] Identify which queries deadlocked
- [ ] Fix lock order in application code
- [ ] Add regression test
- [ ] Update this runbook if needed
