# Playbook: Disk Full

## Symptoms

- "No space left on device" errors
- Applications can't write files
- Database refuses writes
- Logs not being written
- Monitoring alert: "Disk usage >90%"

## Severity

- **SEV3** if disk >90% but still functioning
- **SEV2** if disk >95% and applications degraded
- **SEV1** if disk 100% and applications down

## Diagnosis

### Step 1: Check Disk Usage

```bash
# Check disk usage by partition
df -h

# Example output:
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1        50G   48G   2G  96% /         ← CRITICAL
# /dev/sdb1       100G   20G  80G  20% /data
```

---

### Step 2: Find Large Directories

```bash
# Disk usage by top-level directory
du -sh /*

# Example output:
# 15G  /var       ← Likely logs
# 10G  /home
# 5G   /usr
# 1G   /tmp

# Drill down into large directory
du -sh /var/*

# Example:
# 14G  /var/log   ← FOUND IT
# 500M /var/cache
```

---

### Step 3: Find Large Files

```bash
# Find files larger than 100MB
find / -type f -size +100M -exec ls -lh {} \; 2>/dev/null | sort -k5 -h -r | head -20

# Example output:
# 5.0G /var/log/application.log     ← Large log file
# 2.0G /var/log/nginx/access.log
# 500M /tmp/dump.sql
```

---

### Step 4: Check for Deleted Files Holding Space

```bash
# Files deleted but process still has handle
lsof | grep deleted | awk '{print $1, $2, $7}' | sort -u

# Example output:
# nginx    1234  10G     ← nginx has handle to 10GB deleted file
```

**Why this happens**:
- File deleted (`rm /var/log/nginx/access.log`)
- But process (nginx) still writing to it
- Disk space not released until process closes file or restarts

---

## Mitigation

### Immediate (Now - 5 min)

**Option A: Delete Old Logs**
```bash
# Delete old log files (>7 days)
find /var/log -name "*.log.*" -mtime +7 -delete

# Delete compressed logs (>30 days)
find /var/log -name "*.gz" -mtime +30 -delete

# journalctl: Keep only last 7 days
journalctl --vacuum-time=7d

# Impact: Frees disk space immediately
# Risk: Low (old logs not needed for debugging recent issues)
```

**Option B: Compress Logs**
```bash
# Compress large log files
gzip /var/log/application.log
gzip /var/log/nginx/access.log

# Impact: Reduces log file size by 80-90%
# Risk: Low (logs still available, just compressed)
```

**Option C: Release Deleted Files**
```bash
# Find processes holding deleted files
lsof | grep deleted

# Restart process to release space
systemctl restart nginx

# Or kill and restart
kill -HUP <PID>

# Impact: Frees disk space held by deleted files
# Risk: Medium (brief service interruption)
```

**Option D: Clean Temp Files**
```bash
# Delete old temp files
rm -rf /tmp/*
rm -rf /var/tmp/*

# Delete apt/yum cache
apt-get clean       # Ubuntu/Debian
yum clean all       # RHEL/CentOS

# Delete old kernels (Ubuntu)
apt-get autoremove --purge

# Impact: Frees disk space
# Risk: Low (temp files can be deleted)
```

---

### Short-term (5 min - 1 hour)

**Option A: Rotate Logs Immediately**
```bash
# Force log rotation
logrotate -f /etc/logrotate.conf

# Verify logs rotated
ls -lh /var/log/

# Configure aggressive rotation (daily instead of weekly)
# Edit /etc/logrotate.d/application:
/var/log/application.log {
  daily              # Was: weekly
  rotate 7           # Keep 7 days
  compress           # Compress old logs
  delaycompress      # Don't compress most recent
  missingok          # Don't error if file missing
  notifempty         # Don't rotate if empty
  create 0640 www-data www-data
  sharedscripts
  postrotate
    systemctl reload application
  endscript
}
```

**Option B: Archive Old Data**
```bash
# Archive old database dumps
tar -czf old-dumps.tar.gz /backup/*.sql
rm /backup/*.sql

# Move to cheaper storage (S3, Archive)
aws s3 cp old-dumps.tar.gz s3://archive-bucket/
rm old-dumps.tar.gz

# Impact: Frees local disk space
# Risk: Low (data archived, not deleted)
```

**Option C: Expand Disk** (cloud)
```bash
# AWS: Modify EBS volume
aws ec2 modify-volume --volume-id vol-1234567890abcdef0 --size 100  # Was 50 GB

# Wait for modification to complete (5-10 min)
watch aws ec2 describe-volumes-modifications --volume-ids vol-1234567890abcdef0

# Resize filesystem
# ext4:
sudo resize2fs /dev/xvda1

# xfs:
sudo xfs_growfs /

# Verify
df -h

# Impact: More disk space
# Risk: Low (no downtime, but takes time)
```

---

### Long-term (1 hour+)

- [ ] Add disk usage monitoring (alert at >80%)
- [ ] Configure log rotation (daily, keep 7 days)
- [ ] Set up log forwarding (to ELK, Splunk, CloudWatch)
- [ ] Review disk usage trends (plan capacity)
- [ ] Add automated cleanup (cron job for old files)
- [ ] Archive old data (move to S3, Glacier)
- [ ] Implement log sampling (reduce volume)
- [ ] Review application logging (reduce verbosity)

---

## Common Culprits

| Location | Cause | Solution |
|----------|-------|----------|
| /var/log | Log files not rotated | logrotate, compress, delete old |
| /tmp | Temp files not cleaned | Delete old files, add cron job |
| /var/cache | Apt/yum cache | apt-get clean, yum clean all |
| /home | User files, downloads | Clean up or expand disk |
| Database | Large tables, no archiving | Archive old data, vacuum |
| Deleted files | Process holding handle | Restart process |

---

## Prevention Checklist

- [ ] Configure log rotation (daily, 7 days retention)
- [ ] Add disk monitoring (alert at >80%)
- [ ] Set up log forwarding (reduce local storage)
- [ ] Add cron job to clean temp files
- [ ] Review disk trends monthly
- [ ] Plan capacity (expand before hitting limit)
- [ ] Archive old data (move to cheaper storage)
- [ ] Implement log sampling (reduce volume)

---

## Escalation

**Escalate to developer if**:
- Application generating excessive logs
- Need to reduce logging verbosity

**Escalate to DBA if**:
- Database files consuming disk
- Need to archive old data

**Escalate to infrastructure if**:
- Need to expand disk (physical server)
- Need to add new disk

---

## Related Runbooks

- [07-service-down.md](07-service-down.md) - If disk full crashed service
- [../modules/infrastructure.md](../modules/infrastructure.md) - Infrastructure troubleshooting

---

## Post-Incident

After resolving:
- [ ] Create post-mortem (if SEV1/SEV2)
- [ ] Identify what filled disk
- [ ] Implement prevention (log rotation, monitoring)
- [ ] Review disk trends (prevent recurrence)
- [ ] Update this runbook if needed

---

## Useful Commands Reference

```bash
# Disk usage
df -h                                    # By partition
du -sh /*                                # By directory
du -sh /var/*                            # Drill down

# Large files
find / -type f -size +100M -exec ls -lh {} \;

# Deleted files holding space
lsof | grep deleted

# Clean up
find /var/log -name "*.log.*" -mtime +7 -delete   # Old logs
gzip /var/log/*.log                                # Compress
journalctl --vacuum-time=7d                        # journalctl
apt-get clean                                      # Apt cache
yum clean all                                      # Yum cache

# Log rotation
logrotate -f /etc/logrotate.conf

# Expand disk (after EBS resize)
resize2fs /dev/xvda1  # ext4
xfs_growfs /          # xfs
```
