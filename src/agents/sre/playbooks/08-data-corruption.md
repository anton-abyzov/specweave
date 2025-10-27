# Playbook: Data Corruption

## Symptoms

- Users report incorrect data
- Database integrity constraint violations
- Foreign key errors
- Application errors due to unexpected data
- Failed backups (checksum mismatch)
- Monitoring alert: "Data integrity check failed"

## Severity

- **SEV1** - Critical data corrupted (financial, health, legal)
- **SEV2** - Non-critical data corrupted (user profiles, cache)
- **SEV3** - Recoverable corruption (can restore from backup)

## Diagnosis

### Step 1: Confirm Corruption

**Database Integrity Check** (PostgreSQL):
```sql
-- Check for corruption
SELECT * FROM pg_catalog.pg_database WHERE datname = 'your_database';

-- Verify checksums (if enabled)
SELECT datname, datcollate, datctype
FROM pg_database
WHERE datname = 'your_database';

-- Check for bloat
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Database Integrity Check** (MySQL):
```sql
-- Check table for corruption
CHECK TABLE users;

-- Repair table (if corrupted)
REPAIR TABLE users;

-- Optimize table (defragment)
OPTIMIZE TABLE users;
```

---

### Step 2: Identify Scope

**Questions to answer**:
- Which tables/data are affected?
- How many records corrupted?
- When did corruption start?
- What's the impact on users?

**Check Database Logs**:
```bash
# PostgreSQL
grep "ERROR\|FATAL\|PANIC" /var/log/postgresql/postgresql.log

# MySQL
grep "ERROR" /var/log/mysql/error.log

# Look for:
# - Constraint violations
# - Foreign key errors
# - Checksum errors
# - Disk I/O errors
```

---

### Step 3: Determine Root Cause

**Common causes**:

| Cause | Symptoms |
|-------|----------|
| Disk corruption | I/O errors in dmesg, checksum failures |
| Application bug | Logical corruption (wrong data, not random) |
| Failed migration | Schema mismatch, foreign key violations |
| Concurrent writes | Race condition, duplicate records |
| Hardware failure | Random corruption, unrelated records |
| Malicious attack | Deliberate data modification |

**Check for Disk Errors**:
```bash
# Check disk errors
dmesg | grep -i "I/O error\|disk error"

# Check SMART status
smartctl -a /dev/sda

# Look for: Reallocated_Sector_Ct, Current_Pending_Sector
```

---

## Mitigation

### Immediate (Now - 5 min)

**CRITICAL: Preserve Evidence**
```bash
# 1. STOP ALL WRITES (prevent further corruption)
# Put application in read-only mode OR
# Take application offline

# 2. Snapshot/backup current state (even if corrupted)
# PostgreSQL:
pg_dump your_database > /backup/corrupted-$(date +%Y%m%d-%H%M%S).sql

# MySQL:
mysqldump your_database > /backup/corrupted-$(date +%Y%m%d-%H%M%S).sql

# 3. Snapshot disk (cloud)
# AWS:
aws ec2 create-snapshot --volume-id vol-1234567890abcdef0 --description "Corruption snapshot"

# Impact: Preserves evidence for forensics
# Risk: None (read-only operations)
```

**CRITICAL: DO NOT**:
- Delete corrupted data (may need for forensics)
- Run REPAIR TABLE (may destroy evidence)
- Restart database (may clear logs)

---

### Short-term (5 min - 1 hour)

**Option A: Restore from Backup** (if recent clean backup)
```bash
# 1. Identify last known good backup
ls -lh /backup/ | grep pg_dump

# Example:
# backup-20251026-0200.sql  ← Clean backup (before corruption)
# backup-20251026-0800.sql  ← Corrupted

# 2. Restore from clean backup
# PostgreSQL:
psql your_database < /backup/backup-20251026-0200.sql

# MySQL:
mysql your_database < /backup/backup-20251026-0200.sql

# 3. Verify data integrity
# Run application tests
# Check user-reported issues

# Impact: Data restored to clean state
# Risk: Medium (lose data after backup time)
```

**Option B: Repair Corrupted Records** (if isolated corruption)
```sql
-- Identify corrupted records
SELECT * FROM users WHERE email IS NULL;  -- Should not be null

-- Fix corrupted records
UPDATE users SET email = 'unknown@example.com' WHERE email IS NULL;

-- Verify fix
SELECT count(*) FROM users WHERE email IS NULL;  -- Should be 0

-- Impact: Corruption fixed
-- Risk: Low (if corruption is known and fixable)
```

**Option C: Point-in-Time Recovery** (PostgreSQL)
```bash
# If WAL (Write-Ahead Logging) enabled:

# 1. Determine recovery point (before corruption)
# 2025-10-26 07:00:00 (corruption detected at 08:00)

# 2. Restore from base backup + WAL
pg_basebackup -D /var/lib/postgresql/data-recovery

# 3. Configure recovery.conf
# recovery_target_time = '2025-10-26 07:00:00'

# 4. Start PostgreSQL (will replay WAL until target time)
systemctl start postgresql

# Impact: Restore to exact point before corruption
# Risk: Low (if WAL available)
```

---

### Long-term (1 hour+)

**Root Cause Analysis**:

**If disk corruption**:
- [ ] Replace disk immediately
- [ ] Check RAID status
- [ ] Run filesystem check (fsck)
- [ ] Enable database checksums

**If application bug**:
- [ ] Fix bug in application code
- [ ] Add data validation
- [ ] Add integrity checks
- [ ] Add regression test

**If failed migration**:
- [ ] Review migration script
- [ ] Test migrations in staging first
- [ ] Add rollback plan
- [ ] Use transaction-based migrations

**If concurrent writes**:
- [ ] Add locking (row-level, table-level)
- [ ] Use optimistic locking (version column)
- [ ] Review transaction isolation level
- [ ] Add unique constraints

---

## Prevention

**Backups**:
- [ ] Daily automated backups
- [ ] Test restore process monthly
- [ ] Multiple backup locations (local + S3)
- [ ] Point-in-time recovery enabled (WAL)
- [ ] Retention: 30 days

**Monitoring**:
- [ ] Data integrity checks (checksums)
- [ ] Foreign key violation alerts
- [ ] Disk error monitoring (SMART)
- [ ] Backup success/failure alerts
- [ ] Application-level data validation

**Data Validation**:
- [ ] Database constraints (NOT NULL, FOREIGN KEY, CHECK)
- [ ] Application-level validation
- [ ] Schema migrations in transactions
- [ ] Automated data quality tests

**Redundancy**:
- [ ] Database replication (primary + replica)
- [ ] RAID for disk redundancy
- [ ] Multi-AZ deployment (cloud)

---

## Escalation

**Escalate to DBA if**:
- Database-level corruption
- Need expert for recovery

**Escalate to developer if**:
- Application bug causing corruption
- Need code fix

**Escalate to security team if**:
- Suspected malicious attack
- Unauthorized data modification

**Escalate to management if**:
- Critical data lost
- Legal/compliance implications
- Data breach

---

## Legal/Compliance

**If critical data corrupted**:
- [ ] Notify legal team
- [ ] Notify compliance team
- [ ] Check notification requirements:
  - GDPR: 72 hours for breach notification
  - HIPAA: 60 days for breach notification
  - PCI-DSS: Immediate notification
- [ ] Document incident timeline (for audit)
- [ ] Preserve evidence (forensics)

---

## Related Runbooks

- [07-service-down.md](07-service-down.md) - If database down
- [../modules/database-diagnostics.md](../modules/database-diagnostics.md) - Database troubleshooting
- [../modules/security-incidents.md](../modules/security-incidents.md) - If malicious attack

---

## Post-Incident

After resolving:
- [ ] Create post-mortem (MANDATORY for SEV1)
- [ ] Root cause analysis (what, why, how)
- [ ] Identify affected users/records
- [ ] User communication (if needed)
- [ ] Action items (prevent recurrence)
- [ ] Update backup/recovery procedures
- [ ] Update this runbook if needed

---

## Useful Commands Reference

```bash
# PostgreSQL integrity check
psql -c "SELECT * FROM pg_catalog.pg_database"

# MySQL table check
mysqlcheck -c your_database

# Backup
pg_dump your_database > backup.sql
mysqldump your_database > backup.sql

# Restore
psql your_database < backup.sql
mysql your_database < backup.sql

# Disk check
dmesg | grep -i "I/O error"
smartctl -a /dev/sda
fsck /dev/sda1

# Snapshot (AWS)
aws ec2 create-snapshot --volume-id vol-1234567890abcdef0
```
