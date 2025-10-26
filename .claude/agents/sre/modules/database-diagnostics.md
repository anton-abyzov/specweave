# Database Diagnostics

**Purpose**: Troubleshoot database performance, slow queries, deadlocks, and connection issues.

## Common Database Issues

### 1. Slow Query

**Symptoms**:
- API response time high
- Specific endpoint slow
- Database CPU high

**Diagnosis**:

#### Enable Slow Query Log (PostgreSQL)
```sql
-- Set slow query threshold (1 second)
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Check slow query log
-- /var/log/postgresql/postgresql.log
```

#### Enable Slow Query Log (MySQL)
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;

-- Check slow query log
-- /var/log/mysql/mysql-slow.log
```

---

#### Analyze Query with EXPLAIN
```sql
-- PostgreSQL
EXPLAIN ANALYZE
SELECT users.*, posts.*
FROM users
LEFT JOIN posts ON posts.user_id = users.id
WHERE users.last_login_at > NOW() - INTERVAL '30 days';

-- Look for:
-- - Seq Scan (sequential scan = BAD for large tables)
-- - High cost numbers
-- - High actual time
```

**Red flags in EXPLAIN output**:
- **Seq Scan** on large table (>10k rows) → Missing index
- **Nested Loop** with large outer table → Missing index
- **Hash Join** with large tables → Consider index
- **Actual time** >> **Planned time** → Statistics outdated

**Example Bad Query**:
```
Seq Scan on users  (cost=0.00..100000 rows=10000000)
  Filter: (last_login_at > '2025-09-26'::date)
  Rows Removed by Filter: 9900000
```
→ **Missing index on last_login_at**

---

#### Check Missing Indexes
```sql
-- PostgreSQL: Find missing indexes
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan AS avg_seq_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 20;

-- Tables with high seq_scan and low idx_scan need indexes
```

---

#### Create Index
```sql
-- PostgreSQL (CONCURRENTLY = no table lock)
CREATE INDEX CONCURRENTLY idx_users_last_login_at
ON users(last_login_at);

-- Verify index is used
EXPLAIN ANALYZE
SELECT * FROM users WHERE last_login_at > NOW() - INTERVAL '30 days';
-- Should show: Index Scan using idx_users_last_login_at
```

**Impact**:
- Before: 7.8 seconds (Seq Scan)
- After: 50ms (Index Scan)

---

### 2. Database Deadlock

**Symptoms**:
- "Deadlock detected" errors
- Transactions timing out
- API 500 errors

**Diagnosis**:

#### Check for Deadlocks (PostgreSQL)
```sql
-- Check currently locked queries
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

#### Check for Deadlocks (MySQL)
```sql
-- Show InnoDB status (includes deadlock info)
SHOW ENGINE INNODB STATUS\G

-- Look for "LATEST DETECTED DEADLOCK" section
```

---

#### Common Deadlock Patterns
```sql
-- Pattern 1: Lock order mismatch
-- Transaction 1:
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- Transaction 2 (runs concurrently):
BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE id = 2; -- Locks id=2
UPDATE accounts SET balance = balance + 50 WHERE id = 1; -- Waits for id=1 (deadlock!)
COMMIT;
```

**Fix**: Always lock in same order
```sql
-- Both transactions lock in order: id=1, then id=2
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = LEAST(1, 2);
UPDATE accounts SET balance = balance + 100 WHERE id = GREATEST(1, 2);
COMMIT;
```

---

#### Immediate Mitigation
```sql
-- PostgreSQL: Kill blocking query
SELECT pg_terminate_backend(<blocking_pid>);

-- PostgreSQL: Kill idle transactions
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
AND state_change < NOW() - INTERVAL '5 minutes';
```

---

### 3. Connection Pool Exhausted

**Symptoms**:
- "Too many connections" errors
- "Connection pool exhausted" errors
- New connections timing out

**Diagnosis**:

#### Check Active Connections (PostgreSQL)
```sql
-- Count connections by state
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;

-- Show all connections
SELECT pid, usename, application_name, state, query
FROM pg_stat_activity
WHERE state != 'idle';

-- Check max connections
SHOW max_connections;
```

#### Check Active Connections (MySQL)
```sql
-- Show all connections
SHOW PROCESSLIST;

-- Count connections by state
SELECT state, COUNT(*)
FROM information_schema.processlist
GROUP BY state;

-- Check max connections
SHOW VARIABLES LIKE 'max_connections';
```

**Red flags**:
- Connections = max_connections
- Many "idle in transaction" (connections held but not used)
- Long-running queries holding connections

---

#### Immediate Mitigation
```sql
-- PostgreSQL: Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < NOW() - INTERVAL '10 minutes';

-- Increase max_connections (temporary)
ALTER SYSTEM SET max_connections = 200;
SELECT pg_reload_conf();
```

**Long-term Fix**:
- Fix connection leaks in application code
- Increase connection pool size (if needed)
- Add connection timeout
- Use connection pooler (PgBouncer, ProxySQL)

---

### 4. High Database CPU

**Symptoms**:
- Database CPU >80%
- All queries slow
- Server overload

**Diagnosis**:

#### Find CPU-heavy Queries (PostgreSQL)
```sql
-- Top queries by total time
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Requires: CREATE EXTENSION pg_stat_statements;
```

#### Find CPU-heavy Queries (MySQL)
```sql
-- Enable performance schema
SET GLOBAL performance_schema = ON;

-- Top queries by execution time
SELECT
  DIGEST_TEXT,
  COUNT_STAR,
  SUM_TIMER_WAIT,
  AVG_TIMER_WAIT
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

**Common causes**:
- Missing indexes (Seq Scan)
- Complex queries (many JOINs)
- Aggregations on large tables
- Full table scans

**Mitigation**:
- Add missing indexes
- Optimize queries (reduce JOINs)
- Add query caching
- Scale database (read replicas)

---

### 5. Disk Full

**Symptoms**:
- "No space left on device" errors
- Database refuses writes
- Application crashes

**Diagnosis**:

#### Check Disk Usage
```bash
# Linux
df -h

# Database data directory
du -sh /var/lib/postgresql/data/*
du -sh /var/lib/mysql/*

# Find large tables
# PostgreSQL:
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

---

#### Immediate Mitigation
```bash
# 1. Clean up logs
rm /var/log/postgresql/postgresql-*.log.1
rm /var/log/mysql/mysql-slow.log.1

# 2. Vacuum database (PostgreSQL)
VACUUM FULL;

# 3. Archive old data
# Move old records to archive table or backup

# 4. Expand disk (cloud)
# AWS: Modify EBS volume size
# Azure: Expand managed disk
```

---

### 6. Replication Lag

**Symptoms**:
- Stale data on read replicas
- Monitoring alerts for lag
- Eventually consistent reads

**Diagnosis**:

#### Check Replication Lag (PostgreSQL)
```sql
-- On primary:
SELECT * FROM pg_stat_replication;

-- On replica:
SELECT
  now() - pg_last_xact_replay_timestamp() AS replication_lag;
```

#### Check Replication Lag (MySQL)
```sql
-- On replica:
SHOW SLAVE STATUS\G

-- Look for: Seconds_Behind_Master
```

**Red flags**:
- Lag >1 minute
- Lag increasing over time

**Common causes**:
- High write load on primary
- Replica under-provisioned
- Network latency
- Long-running query blocking replay

**Mitigation**:
- Scale up replica (more CPU, memory)
- Optimize slow queries on primary
- Increase network bandwidth
- Add more replicas (distribute read load)

---

## Database Performance Metrics

**Query Performance**:
- p50 query time: <10ms
- p95 query time: <100ms
- p99 query time: <500ms

**Resource Usage**:
- CPU: <70% average
- Memory: <80% of available
- Disk I/O: <80% of throughput
- Connections: <80% of max

**Availability**:
- Uptime: 99.99% (52.6 min downtime/year)
- Replication lag: <1 second

---

## Database Diagnostic Checklist

**When diagnosing slow database**:

- [ ] Check slow query log
- [ ] Run EXPLAIN ANALYZE on slow queries
- [ ] Check for missing indexes (seq_scan > idx_scan)
- [ ] Check for deadlocks
- [ ] Check connection count (target: <80% of max)
- [ ] Check database CPU (target: <70%)
- [ ] Check disk space (target: <80% used)
- [ ] Check replication lag (target: <1s)
- [ ] Check for long-running queries (>30s)
- [ ] Check for idle transactions (>5 min)

**Tools**:
- `EXPLAIN ANALYZE`
- `pg_stat_statements` (PostgreSQL)
- Performance Schema (MySQL)
- `pg_stat_activity` (PostgreSQL)
- `SHOW PROCESSLIST` (MySQL)
- Database monitoring (CloudWatch, DataDog)

---

## Database Anti-Patterns

### 1. N+1 Query Problem
```javascript
// BAD: N+1 queries
const users = await db.query('SELECT * FROM users');
for (const user of users) {
  const posts = await db.query('SELECT * FROM posts WHERE user_id = ?', [user.id]);
}
// 1 query + N queries = N+1

// GOOD: Single query with JOIN
const usersWithPosts = await db.query(`
  SELECT users.*, posts.*
  FROM users
  LEFT JOIN posts ON posts.user_id = users.id
`);
```

### 2. SELECT *
```sql
-- BAD: Fetches all columns (inefficient)
SELECT * FROM users WHERE id = 1;

-- GOOD: Fetch only needed columns
SELECT id, name, email FROM users WHERE id = 1;
```

### 3. Missing Indexes
```sql
-- BAD: No index on frequently queried column
SELECT * FROM users WHERE email = 'user@example.com';
-- Seq Scan on users

-- GOOD: Add index
CREATE INDEX idx_users_email ON users(email);
-- Index Scan using idx_users_email
```

### 4. Long Transactions
```javascript
// BAD: Long transaction holding locks
BEGIN;
const user = await db.query('SELECT * FROM users WHERE id = 1 FOR UPDATE');
await sendEmail(user.email); // External API call (slow!)
await db.query('UPDATE users SET last_email_sent = NOW() WHERE id = 1');
COMMIT;

// GOOD: Keep transactions short
const user = await db.query('SELECT * FROM users WHERE id = 1');
await sendEmail(user.email); // Outside transaction
await db.query('UPDATE users SET last_email_sent = NOW() WHERE id = 1');
```

---

## Related Documentation

- [SKILL.md](../SKILL.md) - Main SRE agent
- [backend-diagnostics.md](backend-diagnostics.md) - Backend troubleshooting
- [infrastructure.md](infrastructure.md) - Server/network troubleshooting
