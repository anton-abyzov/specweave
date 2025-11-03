# Infrastructure Diagnostics

**Purpose**: Troubleshoot server, network, disk, and cloud infrastructure issues.

## Common Infrastructure Issues

### 1. High CPU Usage (Server)

**Symptoms**:
- Server CPU at 100%
- Applications slow
- SSH lag

**Diagnosis**:

#### Check CPU Usage
```bash
# Overall CPU usage
top -bn1 | grep "Cpu(s)"

# Top CPU processes
top -bn1 | head -20

# CPU usage per core
mpstat -P ALL 1 5

# Historical CPU (if sar installed)
sar -u 1 10
```

**Red flags**:
- CPU at 100% for >5 minutes
- Single process using >80% CPU
- iowait >20% (disk bottleneck)
- System CPU >30% (kernel overhead)

---

#### Identify CPU-heavy Process
```bash
# Top CPU process
ps aux | sort -nrk 3,3 | head -10

# CPU per thread
top -H

# Process tree
pstree -p
```

**Common causes**:
- Application bug (infinite loop)
- Heavy computation
- Crypto mining malware
- Backup/compression running

---

#### Immediate Mitigation
```bash
# 1. Limit process CPU (nice)
renice +10 <PID>  # Lower priority

# 2. Kill process (last resort)
kill -TERM <PID>  # Graceful
kill -KILL <PID>  # Force kill

# 3. Scale horizontally (add servers)
# Cloud: Auto-scaling group

# 4. Scale vertically (bigger instance)
# Cloud: Resize instance
```

---

### 2. Out of Memory (OOM)

**Symptoms**:
- "Out of memory" errors
- OOM Killer triggered
- Applications crash
- Swap usage high

**Diagnosis**:

#### Check Memory Usage
```bash
# Current memory usage
free -h

# Memory per process
ps aux | sort -nrk 4,4 | head -10

# Check OOM killer logs
dmesg | grep -i "out of memory\|oom"
grep "Out of memory" /var/log/syslog

# Check swap usage
swapon -s
```

**Red flags**:
- Available memory <10%
- Swap usage >80%
- OOM killer active
- Single process using >50% memory

---

#### Immediate Mitigation
```bash
# 1. Free page cache (safe)
sync && echo 3 > /proc/sys/vm/drop_caches

# 2. Kill memory-heavy process
kill -9 <PID>

# 3. Increase swap (temporary)
dd if=/dev/zero of=/swapfile bs=1M count=2048
mkswap /swapfile
swapon /swapfile

# 4. Scale up (more RAM)
# Cloud: Resize instance
```

---

### 3. Disk Full

**Symptoms**:
- "No space left on device" errors
- Applications can't write files
- Database refuses writes
- Logs not being written

**Diagnosis**:

#### Check Disk Usage
```bash
# Disk usage by partition
df -h

# Disk usage by directory
du -sh /*
du -sh /var/*

# Find large files
find / -type f -size +100M -exec ls -lh {} \;

# Find files using deleted space
lsof | grep deleted
```

**Red flags**:
- Disk usage >90%
- /var/log full (runaway logs)
- /tmp full (temp files not cleaned)
- Deleted files still holding space (process has handle)

---

#### Immediate Mitigation
```bash
# 1. Clean up logs
find /var/log -name "*.log.*" -mtime +7 -delete
journalctl --vacuum-time=7d

# 2. Clean up temp files
rm -rf /tmp/*
rm -rf /var/tmp/*

# 3. Find and remove deleted files holding space
lsof | grep deleted | awk '{print $2}' | xargs kill -9

# 4. Compress logs
gzip /var/log/*.log

# 5. Expand disk (cloud)
# AWS: Modify EBS volume size
# Azure: Expand managed disk
# After expanding:
resize2fs /dev/xvda1  # ext4
xfs_growfs /            # xfs
```

---

### 4. Network Issues

**Symptoms**:
- Slow network performance
- Timeouts
- Connection refused
- High latency

**Diagnosis**:

#### Check Network Connectivity
```bash
# Ping test
ping -c 5 google.com

# DNS resolution
nslookup example.com
dig example.com

# Traceroute
traceroute example.com

# Check network interfaces
ip addr show
ifconfig

# Check routing table
ip route show
route -n
```

**Red flags**:
- Packet loss >1%
- Latency >100ms (same region)
- DNS resolution failures
- Interface down

---

#### Check Network Bandwidth
```bash
# Current bandwidth usage
iftop -i eth0

# Network stats
netstat -i

# Historical bandwidth (if vnstat installed)
vnstat -l

# Check for bandwidth limits (cloud)
# AWS: Check CloudWatch NetworkIn/NetworkOut
```

---

#### Check Firewall Rules
```bash
# Check iptables rules
iptables -L -n -v

# Check firewalld (RHEL/CentOS)
firewall-cmd --list-all

# Check UFW (Ubuntu)
ufw status verbose

# Check security groups (cloud)
# AWS: EC2 → Security Groups
# Azure: Network Security Groups
```

**Common causes**:
- Firewall blocking traffic
- Security group misconfigured
- MTU mismatch
- Network congestion
- DDoS attack

---

#### Immediate Mitigation
```bash
# 1. Check firewall allows traffic
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# 2. Restart networking
systemctl restart networking
systemctl restart NetworkManager

# 3. Flush DNS cache
systemd-resolve --flush-caches

# 4. Check cloud network ACLs
# Ensure subnet has route to internet gateway
```

---

### 5. High Disk I/O (Slow Disk)

**Symptoms**:
- Applications slow
- High iowait CPU
- Disk latency high

**Diagnosis**:

#### Check Disk I/O
```bash
# Disk I/O stats
iostat -x 1 5

# Look for:
# - %util >80% (disk saturated)
# - await >100ms (high latency)

# Top I/O processes
iotop -o

# Historical I/O (if sar installed)
sar -d 1 10
```

**Red flags**:
- %util at 100%
- await >100ms
- iowait CPU >20%
- Queue size (avgqu-sz) >10

---

#### Common Causes
```bash
# 1. Database without indexes (Seq Scan)
# See database-diagnostics.md

# 2. Log rotation running
# Large logs being compressed

# 3. Backup running
# Database dump, file backup

# 4. Disk issue (bad sectors)
dmesg | grep -i "I/O error"
smartctl -a /dev/sda  # SMART status
```

---

#### Immediate Mitigation
```bash
# 1. Reduce I/O pressure
# Stop non-critical processes (backup, log rotation)

# 2. Add read cache
# Enable query caching (database)
# Add Redis for application cache

# 3. Scale disk IOPS (cloud)
# AWS: Change EBS volume type (gp2 → gp3 → io1)
# Azure: Change disk tier

# 4. Move to SSD (if on HDD)
```

---

### 6. Service Down / Process Crashed

**Symptoms**:
- Service not responding
- Health check failures
- 502 Bad Gateway

**Diagnosis**:

#### Check Service Status
```bash
# Systemd services
systemctl status nginx
systemctl status postgresql
systemctl status application

# Check if process running
ps aux | grep nginx
pidof nginx

# Check service logs
journalctl -u nginx -n 50
tail -f /var/log/nginx/error.log
```

**Red flags**:
- Service: inactive (dead)
- Process not found
- Recent crash in logs

---

#### Check Why Service Crashed
```bash
# Check system logs
dmesg | tail -50
grep "error\|segfault\|killed" /var/log/syslog

# Check application logs
tail -100 /var/log/application.log

# Check for OOM killer
dmesg | grep -i "killed process"

# Check core dumps
ls -l /var/crash/
ls -l /tmp/core*
```

**Common causes**:
- Out of memory (OOM Killer)
- Segmentation fault (code bug)
- Unhandled exception
- Dependency service down
- Configuration error

---

#### Immediate Mitigation
```bash
# 1. Restart service
systemctl restart nginx

# 2. Check if started successfully
systemctl status nginx
curl http://localhost

# 3. If startup fails, check config
nginx -t  # Test nginx config
postgresql -D /var/lib/postgresql/data --config-test

# 4. Enable auto-restart (systemd)
# Add to service file:
[Service]
Restart=always
RestartSec=10
```

---

### 7. Cloud Infrastructure Issues

#### AWS-Specific

**Instance Issues**:
```bash
# Check instance health
aws ec2 describe-instance-status --instance-ids i-1234567890abcdef0

# Check system logs
aws ec2 get-console-output --instance-id i-1234567890abcdef0

# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0
```

**EBS Volume Issues**:
```bash
# Check volume status
aws ec2 describe-volumes --volume-ids vol-1234567890abcdef0

# Increase IOPS (gp3)
aws ec2 modify-volume \
  --volume-id vol-1234567890abcdef0 \
  --iops 3000

# Check volume metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EBS \
  --metric-name VolumeReadOps
```

**Network Issues**:
```bash
# Check security groups
aws ec2 describe-security-groups --group-ids sg-1234567890abcdef0

# Check network ACLs
aws ec2 describe-network-acls --network-acl-ids acl-1234567890abcdef0

# Check route tables
aws ec2 describe-route-tables --route-table-ids rtb-1234567890abcdef0
```

---

#### Azure-Specific

**VM Issues**:
```bash
# Check VM status
az vm get-instance-view --name myVM --resource-group myRG

# Restart VM
az vm restart --name myVM --resource-group myRG

# Resize VM
az vm resize --name myVM --resource-group myRG --size Standard_D4s_v3
```

**Disk Issues**:
```bash
# Check disk status
az disk show --name myDisk --resource-group myRG

# Expand disk
az disk update --name myDisk --resource-group myRG --size-gb 256
```

---

## Infrastructure Performance Metrics

**Server Health**:
- CPU: <70% average, <90% peak
- Memory: <80% usage
- Disk: <80% usage, <80% IOPS
- Network: <70% bandwidth

**Uptime**:
- Target: 99.9% (8.76 hours downtime/year)
- Monitoring: Check every 1 minute

**Response Time**:
- Ping latency: <50ms (same region)
- HTTP response: <200ms

---

## Infrastructure Diagnostic Checklist

**When diagnosing infrastructure issues**:

- [ ] Check CPU usage (target: <70%)
- [ ] Check memory usage (target: <80%)
- [ ] Check disk usage (target: <80%)
- [ ] Check disk I/O (%util, await)
- [ ] Check network connectivity (ping, traceroute)
- [ ] Check firewall rules (iptables, security groups)
- [ ] Check service status (systemd, ps)
- [ ] Check system logs (dmesg, /var/log/syslog)
- [ ] Check cloud metrics (CloudWatch, Azure Monitor)
- [ ] Check for hardware issues (SMART, dmesg errors)

**Tools**:
- `top`, `htop` - CPU, memory
- `df`, `du` - Disk usage
- `iostat` - Disk I/O
- `iftop`, `netstat` - Network
- `dmesg`, `journalctl` - System logs
- Cloud dashboards (AWS, Azure, GCP)

---

## Related Documentation

- [SKILL.md](../SKILL.md) - Main SRE agent
- [backend-diagnostics.md](backend-diagnostics.md) - Application-level troubleshooting
- [database-diagnostics.md](database-diagnostics.md) - Database performance
- [security-incidents.md](security-incidents.md) - Security response
