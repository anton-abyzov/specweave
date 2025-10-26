# Playbook: DDoS Attack

## Symptoms

- Sudden traffic spike (10x-100x normal)
- Legitimate users can't access service
- High bandwidth usage (saturated)
- Server overload (CPU, memory, network)
- Monitoring alert: "Traffic spike", "Bandwidth >90%"

## Severity

- **SEV1** - Production service unavailable due to attack

## Diagnosis

### Step 1: Confirm Traffic Spike

```bash
# Check current connections
netstat -ntu | wc -l

# Compare to baseline (normal: 100-500, attack: 10,000+)

# Check requests per second (nginx)
tail -f /var/log/nginx/access.log | awk '{print $4}' | uniq -c
```

---

### Step 2: Identify Attack Pattern

**Check connections by IP**:
```bash
# Top 20 IPs by connection count
netstat -ntu | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr | head -20

# Example output:
# 5000 192.168.1.100  ← Attacker IP
# 3000 192.168.1.101  ← Attacker IP
# 2 192.168.1.200    ← Legitimate user
```

**Check HTTP requests by IP** (nginx):
```bash
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -20
```

**Check request patterns**:
```bash
# Check requested URLs
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -20

# Check user agents (bots often have telltale user agents)
awk -F'"' '{print $6}' /var/log/nginx/access.log | sort | uniq -c | sort -nr
```

---

### Step 3: Classify Attack Type

**HTTP Flood** (application layer):
- Many HTTP requests from distributed IPs
- Valid HTTP requests, just too many
- Example: 10,000 requests/second to homepage

**SYN Flood** (network layer):
- Many TCP SYN packets
- Connection requests never complete
- Exhausts server connection table

**Amplification** (DNS, NTP):
- Small request → Large response
- Attacker spoofs your IP
- Servers send large responses to you

---

## Mitigation

### Immediate (Now - 5 min)

**Option A: Block Attacker IPs** (if few IPs)
```bash
# Block single IP (iptables)
iptables -A INPUT -s <ATTACKER_IP> -j DROP

# Block IP range
iptables -A INPUT -s 192.168.1.0/24 -j DROP

# Block specific country (using ipset + GeoIP)
# Advanced, see infrastructure team

# Impact: Blocks attacker, restores service
# Risk: Low (if attacker IPs identified correctly)
```

**Option B: Enable Rate Limiting** (nginx)
```nginx
# Add to nginx.conf
http {
  # Define rate limit zone (10 req/s per IP)
  limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;

  server {
    location / {
      # Apply rate limit
      limit_req zone=one burst=20 nodelay;
      limit_req_status 429;
    }
  }
}

# Reload nginx
nginx -t && systemctl reload nginx

# Impact: Limits requests per IP
# Risk: Low (legitimate users rarely exceed 10 req/s)
```

**Option C: Enable CloudFlare "Under Attack" Mode**
```bash
# If using CloudFlare:
# 1. Log in to CloudFlare dashboard
# 2. Select domain
# 3. Click "Under Attack Mode"
# 4. Adds JavaScript challenge before serving content

# Impact: Blocks bots, allows legitimate browsers
# Risk: Low (slight user friction)
```

**Option D: Enable AWS Shield** (AWS)
```bash
# AWS Shield Standard: Free, automatic DDoS protection
# AWS Shield Advanced: $3000/month, enhanced protection

# CloudFormation:
aws cloudformation deploy \
  --template-file shield.yaml \
  --stack-name ddos-protection

# Impact: Absorbs DDoS at AWS edge
# Risk: None (AWS handles)
```

---

### Short-term (5 min - 1 hour)

**Option A: Add Connection Limits**
```nginx
# Limit concurrent connections per IP
limit_conn_zone $binary_remote_addr zone=addr:10m;

server {
  location / {
    limit_conn addr 10;  # Max 10 concurrent connections per IP
  }
}
```

**Option B: Add CAPTCHA** (reCAPTCHA)
```html
<!-- Add reCAPTCHA to sensitive endpoints -->
<form action="/login" method="POST">
  <input type="email" name="email">
  <input type="password" name="password">
  <div class="g-recaptcha" data-sitekey="YOUR_SITE_KEY"></div>
  <button type="submit">Login</button>
</form>
```

**Option C: Scale Up** (cloud auto-scaling)
```bash
# AWS: Increase Auto Scaling Group desired capacity
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name my-asg \
  --desired-capacity 20  # Was 5

# Impact: More capacity to handle attack
# Risk: Medium (costs money, may not fully mitigate)
# NOTE: Only do this if legitimate traffic also spiked
```

---

### Long-term (1 hour+)

- [ ] Enable CloudFlare or AWS Shield (DDoS protection service)
- [ ] Implement rate limiting on all endpoints
- [ ] Add CAPTCHA to login, signup, checkout
- [ ] Configure auto-scaling (handle legitimate traffic spikes)
- [ ] Add monitoring alert for traffic anomalies
- [ ] Create DDoS response plan
- [ ] Contact ISP for upstream filtering (if very large attack)
- [ ] Review and update firewall rules
- [ ] Add geographic blocking (if applicable)

---

## Important Notes

**DO NOT**:
- Scale up indefinitely (attack can grow, costs explode)
- Fight DDoS at application layer alone (use CDN, cloud protection)

**DO**:
- Use CDN/DDoS protection service (CloudFlare, AWS Shield, Akamai)
- Enable rate limiting
- Block attacker IPs/ranges
- Monitor costs (auto-scaling can be expensive)

---

## Escalation

**Escalate to infrastructure team if**:
- Attack very large (>10 Gbps)
- Need upstream filtering at ISP level

**Escalate to security team**:
- All DDoS attacks (for post-mortem, legal action)

**Contact ISP if**:
- Attack saturating internet connection
- Need transit provider to filter

**Contact CloudFlare/AWS if**:
- Using their DDoS protection
- Need assistance enabling features

---

## Prevention Checklist

- [ ] Use CDN (CloudFlare, CloudFront, Akamai)
- [ ] Enable DDoS protection (AWS Shield, CloudFlare)
- [ ] Implement rate limiting (per IP, per user)
- [ ] Add CAPTCHA to sensitive endpoints
- [ ] Configure auto-scaling (within cost limits)
- [ ] Monitor traffic patterns (detect spikes early)
- [ ] Have DDoS response plan ready
- [ ] Test response plan (tabletop exercise)

---

## Related Runbooks

- [01-high-cpu-usage.md](01-high-cpu-usage.md) - If CPU overloaded
- [07-service-down.md](07-service-down.md) - If service crashed
- [../modules/security-incidents.md](../modules/security-incidents.md) - Security response
- [../modules/infrastructure.md](../modules/infrastructure.md) - Infrastructure troubleshooting

---

## Post-Incident

After resolving:
- [ ] Create post-mortem (mandatory for DDoS)
- [ ] Identify attack vectors
- [ ] Document attacker IPs, patterns
- [ ] Report to ISP, CloudFlare (they may block attacker)
- [ ] Review and improve DDoS defenses
- [ ] Consider legal action (if attacker identified)
- [ ] Update this runbook if needed

---

## Useful Commands Reference

```bash
# Check connection count
netstat -ntu | wc -l

# Top IPs by connection count
netstat -ntu | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr | head -20

# Block IP (iptables)
iptables -A INPUT -s <IP> -j DROP

# Check nginx requests per second
tail -f /var/log/nginx/access.log | awk '{print $4}' | uniq -c

# List iptables rules
iptables -L -n -v

# Clear all iptables rules (CAREFUL!)
iptables -F

# Save iptables rules (persist after reboot)
iptables-save > /etc/iptables/rules.v4
```
