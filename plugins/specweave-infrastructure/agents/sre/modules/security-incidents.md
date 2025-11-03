# Security Incidents

**Purpose**: Respond to security breaches, DDoS attacks, and unauthorized access attempts.

**IMPORTANT**: For security incidents, SRE Agent collaborates with `security-agent` skill.

## Incident Response Protocol

### SEV1 Security Incidents (CRITICAL)

**Immediate Actions** (First 5 minutes):
1. **Isolate** affected systems
2. **Preserve** evidence (logs, snapshots)
3. **Notify** security team and management
4. **Assess** scope of breach
5. **Document** timeline

**DO NOT**:
- Delete logs (preserve evidence)
- Reboot systems (unless absolutely necessary)
- Make changes without documenting

---

## Common Security Incidents

### 1. DDoS Attack

**Symptoms**:
- Sudden traffic spike (10x-100x normal)
- Legitimate users can't access service
- High bandwidth usage
- Server overload

**Diagnosis**:

#### Check Traffic Patterns
```bash
# Check connections by IP
netstat -ntu | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr | head -20

# Check HTTP requests by IP (nginx)
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -20

# Check requests per second
tail -f /var/log/nginx/access.log | awk '{print $4}' | uniq -c
```

**Red flags**:
- Single IP making thousands of requests
- Requests from suspicious IPs (botnets)
- High rate of 4xx errors (probing)
- Unusual traffic patterns

---

#### Immediate Mitigation
```bash
# 1. Rate limiting (nginx)
# Add to nginx.conf:
limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;
limit_req zone=one burst=20 nodelay;

# 2. Block suspicious IPs (iptables)
iptables -A INPUT -s <ATTACKER_IP> -j DROP

# 3. Enable DDoS protection (CloudFlare, AWS Shield)
# CloudFlare: Enable "I'm Under Attack" mode
# AWS: Enable AWS Shield Standard/Advanced

# 4. Increase capacity (auto-scaling)
# Scale up to handle traffic (if legitimate)
```

---

### 2. Unauthorized Access / Data Breach

**Symptoms**:
- Alerts for failed login attempts
- Successful login from unusual location
- Unusual data access patterns
- Data exfiltration detected

**Diagnosis**:

#### Check Access Logs
```bash
# Check authentication logs (Linux)
grep "Failed password" /var/log/auth.log | tail -50

# Check successful logins
grep "Accepted password" /var/log/auth.log | tail -50

# Check login attempts by IP
awk '/Failed password/ {print $(NF-3)}' /var/log/auth.log | sort | uniq -c | sort -nr
```

**Red flags**:
- Hundreds of failed login attempts (brute force)
- Successful login from suspicious IP/location
- Login at unusual time (3am)
- Multiple accounts accessed from same IP

---

#### Immediate Response (SEV1)
```bash
# 1. ISOLATE: Disable compromised account
# Application-level:
UPDATE users SET disabled = true WHERE id = <COMPROMISED_USER_ID>;

# System-level:
passwd -l <username>  # Lock account

# 2. PRESERVE: Copy logs for forensics
cp /var/log/auth.log /forensics/auth.log.$(date +%Y%m%d)
cp /var/log/nginx/access.log /forensics/access.log.$(date +%Y%m%d)

# 3. ASSESS: Check what was accessed
# Database audit logs
# Application logs
# File access logs

# 4. NOTIFY: Alert security team
# Email, Slack, PagerDuty

# 5. DOCUMENT: Create incident timeline
```

---

#### Long-term Mitigation
- Force password reset for all users
- Enable 2FA/MFA
- Review access controls
- Conduct security audit
- Update security policies
- Train users on security

---

### 3. SQL Injection Attempt

**Symptoms**:
- Unusual SQL queries in logs
- 500 errors with SQL syntax messages
- Alerts from WAF (Web Application Firewall)

**Diagnosis**:

#### Check Application Logs
```bash
# Look for SQL injection patterns
grep -E "(SELECT|INSERT|UPDATE|DELETE).*FROM.*WHERE" /var/log/application.log

# Look for SQL errors
grep "SQLException\|SQL syntax" /var/log/application.log

# Check for malicious patterns
grep -E "(\'\s*OR\s*\'|\-\-|UNION\s+SELECT)" /var/log/nginx/access.log
```

**Example Malicious Request**:
```
GET /api/users?id=1' OR '1'='1
GET /api/users?id=1; DROP TABLE users;--
```

---

#### Immediate Response
```bash
# 1. Block attacker IP
iptables -A INPUT -s <ATTACKER_IP> -j DROP

# 2. Enable WAF rule (ModSecurity, AWS WAF)
# Block requests with SQL keywords

# 3. Check database for unauthorized changes
# Compare current schema with backup
# Check audit logs for suspicious queries

# 4. Review application code
# Use parameterized queries, not string concatenation
```

**Long-term Fix**:
```javascript
// BAD: SQL injection vulnerable
const query = `SELECT * FROM users WHERE id = ${req.query.id}`;

// GOOD: Parameterized query
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [req.query.id]);
```

---

### 4. Malware / Crypto Mining

**Symptoms**:
- High CPU usage (100%)
- Unusual network traffic (to crypto pool)
- Unknown processes running
- Server slow

**Diagnosis**:

#### Check Running Processes
```bash
# Check CPU usage by process
top -bn1 | head -20

# Check all processes
ps aux | sort -nrk 3,3 | head -20

# Check for suspicious processes
ps aux | grep -v -E "^(root|www-data|mysql|postgres)"

# Check network connections
netstat -tunap | grep ESTABLISHED
```

**Red flags**:
- Unknown process using 100% CPU
- Connections to crypto mining pools
- Processes running as unexpected user
- Processes with random names (xmrig, minerd)

---

#### Immediate Response
```bash
# 1. Kill malicious process
kill -9 <PID>

# 2. Find and remove malware
find / -name "<PROCESS_NAME>" -delete

# 3. Check for persistence mechanisms
crontab -l                    # Cron jobs
cat /etc/rc.local             # Startup scripts
systemctl list-unit-files     # Systemd services

# 4. Change all credentials
# Root password
# SSH keys
# Database passwords
# API keys

# 5. Restore from clean backup (if available)
```

---

### 5. Insider Threat / Data Exfiltration

**Symptoms**:
- Large data downloads
- Database dump exports
- Unusual file transfers
- After-hours access

**Diagnosis**:

#### Check Data Access Logs
```bash
# Check database queries (large exports)
grep "SELECT.*FROM" /var/log/postgresql/postgresql.log | grep -E "LIMIT\s+[0-9]{5,}"

# Check file downloads (nginx)
awk '$10 > 10000000 {print $1, $7, $10}' /var/log/nginx/access.log

# Check SSH file transfers
grep "sftp\|scp" /var/log/auth.log
```

**Red flags**:
- SELECT with no LIMIT (full table export)
- Large file downloads (>10MB)
- Multiple consecutive downloads
- Access from unusual location

---

#### Immediate Response
```bash
# 1. Disable account
UPDATE users SET disabled = true WHERE id = <USER_ID>;

# 2. Preserve evidence
cp /var/log/* /forensics/

# 3. Assess damage
# What data was accessed?
# What data was exported?
# What systems were compromised?

# 4. Legal/compliance notification
# GDPR: Notify within 72 hours
# HIPAA: Notify within 60 days
# PCI-DSS: Immediate notification

# 5. Incident report
```

---

## Security Incident Checklist

**When security incident detected**:

### Phase 1: Immediate Response (0-5 min)
- [ ] Classify severity (SEV1/SEV2/SEV3)
- [ ] Isolate affected systems
- [ ] Preserve evidence (logs, snapshots)
- [ ] Notify security team
- [ ] Document timeline (start timestamp)

### Phase 2: Assessment (5-30 min)
- [ ] Identify attack vector
- [ ] Assess scope (what was compromised?)
- [ ] Check for data exfiltration
- [ ] Identify attacker (IP, location, identity)
- [ ] Determine if ongoing or stopped

### Phase 3: Containment (30 min - 2 hours)
- [ ] Block attacker access
- [ ] Close vulnerability
- [ ] Revoke compromised credentials
- [ ] Remove malware/backdoors
- [ ] Restore from clean backup (if needed)

### Phase 4: Recovery (2 hours - days)
- [ ] Restore normal operations
- [ ] Verify no persistence mechanisms
- [ ] Monitor for re-infection
- [ ] Change all credentials
- [ ] Apply security patches

### Phase 5: Post-Incident (1 week)
- [ ] Complete post-mortem
- [ ] Legal/compliance notifications
- [ ] Security audit
- [ ] Update security policies
- [ ] Train team on lessons learned

---

## Collaboration with Security Agent

**SRE Agent Role**:
- Initial detection and triage
- Immediate containment
- Preserve evidence
- Restore service

**Security Agent Role** (handoff):
- Forensic analysis
- Legal compliance
- Security audit
- Policy updates

**Handoff Protocol**:
```
SRE: Detects security incident → Immediate containment
SRE: Preserves evidence → Creates incident report
SRE: Hands off to Security Agent
Security Agent: Forensic analysis → Legal compliance → Long-term fixes
SRE: Implements security fixes → Updates runbook
```

---

## Security Metrics

**Detection Time**:
- SEV1: <5 minutes from first indicator
- SEV2: <30 minutes
- SEV3: <24 hours

**Response Time**:
- SEV1: Containment within 30 minutes
- SEV2: Containment within 2 hours
- SEV3: Containment within 24 hours

**False Positives**:
- Target: <5% of security alerts

---

## Related Documentation

- [SKILL.md](../SKILL.md) - Main SRE agent
- [infrastructure.md](infrastructure.md) - Server security hardening
- [monitoring.md](monitoring.md) - Security monitoring setup
- `security-agent` skill - Full security expertise (handoff for forensics)

---

## Important Notes

**For SRE Agent**:
- Focus on IMMEDIATE containment and service restoration
- Preserve evidence (don't delete logs!)
- Hand off to `security-agent` for forensic analysis
- Document everything with timestamps
- Blameless post-mortem (focus on systems, not people)

**Legal Compliance**:
- GDPR: Notify within 72 hours of breach
- HIPAA: Notify within 60 days
- PCI-DSS: Immediate notification to card brands
- SOC 2: Document in audit trail

**Evidence Preservation**:
- Copy logs before any changes
- Take disk/memory snapshots
- Document all actions taken
- Preserve chain of custody
