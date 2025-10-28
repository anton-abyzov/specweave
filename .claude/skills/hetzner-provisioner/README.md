# Test Results: hetzner-provisioner

This directory contains test execution results for the hetzner-provisioner skill.

## How to Run Tests

### Prerequisites
1. Hetzner Cloud account (sign up at https://www.hetzner.com/cloud)
2. Hetzner API token (create in Hetzner Cloud Console)
3. Terraform installed (`brew install terraform` on macOS)
4. Optional: Domain name for SSL test

### Running Test 1: Basic Provision

**Prompt to Claude Code**:
```
Deploy my NextJS app on Hetzner as cheaply as possible
```

**Expected Behavior**:
1. hetzner-provisioner skill activates
2. Generates Terraform files in `terraform/` directory
3. Outputs cost estimate: ~$6-7/month
4. Provides deployment guide

**Verification Steps**:
```bash
# 1. Check generated files
ls terraform/
# Should see: main.tf, variables.tf, outputs.tf

# 2. Validate Terraform
cd terraform
terraform init
terraform validate
# Should output: "Success! The configuration is valid."

# 3. Check cost estimate
terraform plan
# Should show estimated costs

# 4. (Optional) Apply infrastructure
export TF_VAR_hcloud_token="your-hetzner-api-token"
terraform apply
# Review plan, type 'yes' to provision

# 5. Verify server is running
# Check Hetzner Cloud Console for new server
```

**Expected Output**:
- `terraform validate` succeeds
- Cost in `terraform plan` is under $10/month
- Server provisions successfully (if applied)

---

### Running Test 2: Postgres Provision

**Prompt to Claude Code**:
```
Deploy my NextJS app on Hetzner with Postgres database
```

**Expected Behavior**:
1. Generates Terraform with both server + database
2. Cost estimate: ~$11-12/month
3. Outputs database connection string

**Verification Steps**:
```bash
# 1. Validate Terraform
cd terraform
terraform init
terraform validate

# 2. Check resources
terraform plan | grep "hcloud_database"
# Should see Postgres database resource

# 3. Check cost
terraform plan | grep "cost"
# Should be under $15/month

# 4. (Optional) Apply and test connection
terraform apply
# Wait for database to provision (~5-10 minutes)

# 5. Test database connection
psql "$(terraform output -raw database_url)"
# Should connect successfully
```

**Expected Output**:
- Database resource in Terraform plan
- Connection string in `terraform output`
- Can connect to database via psql

---

### Running Test 3: SSL Configuration

**Prompt to Claude Code**:
```
Deploy my NextJS app on Hetzner with Postgres and SSL for my-saas.com
```

**Prerequisites**:
- Domain name (e.g., my-saas.com)
- DNS access to create A records

**Expected Behavior**:
1. Generates Terraform with Nginx + Certbot
2. Provides DNS configuration guide
3. Outputs SSL setup commands

**Verification Steps**:
```bash
# 1. Apply infrastructure
cd terraform
terraform apply

# 2. Get server IP
SERVER_IP=$(terraform output -raw server_ip)
echo "Server IP: $SERVER_IP"

# 3. Configure DNS (in your DNS provider)
# Create A record: my-saas.com → $SERVER_IP
# Create A record: www.my-saas.com → $SERVER_IP

# 4. Wait for DNS propagation
dig my-saas.com +short
# Should return $SERVER_IP

# 5. SSH into server
ssh root@$SERVER_IP

# 6. Run certbot (on server)
certbot --nginx -d my-saas.com -d www.my-saas.com
# Follow prompts, enter email

# 7. Test HTTPS
curl -I https://my-saas.com
# Should return HTTP/2 200 with valid SSL

# 8. Test HTTP redirect
curl -I http://my-saas.com
# Should return 301 redirect to HTTPS

# 9. Check SSL certificate
echo | openssl s_client -connect my-saas.com:443 | grep "Verify return code"
# Should output: "Verify return code: 0 (ok)"
```

**Expected Output**:
- SSL certificate obtained successfully
- HTTPS works: `https://my-saas.com`
- HTTP redirects to HTTPS
- SSL Labs test: A or A+ rating

---

## Test Execution Log

### Test 1: Basic Provision
**Date**: [When you run this]
**Status**: ⏳ Pending | ✅ Passed | ❌ Failed
**Result**:
```
[Paste terraform validate output here]
[Paste cost estimate here]
[Paste any errors encountered]
```

### Test 2: Postgres Provision
**Date**: [When you run this]
**Status**: ⏳ Pending | ✅ Passed | ❌ Failed
**Result**:
```
[Paste terraform plan output showing database]
[Paste database connection test result]
```

### Test 3: SSL Configuration
**Date**: [When you run this]
**Status**: ⏳ Pending | ✅ Passed | ❌ Failed
**Result**:
```
[Paste certbot output]
[Paste curl -I https://my-saas.com output]
[Paste SSL test result]
```

---

## Screenshots

### Successful Deployment
(Add screenshot of Hetzner Cloud Console showing provisioned resources)

### SSL Certificate
(Add screenshot of browser showing valid HTTPS)

### Cost Breakdown
(Add screenshot of Hetzner billing showing monthly costs)

---

## Troubleshooting

### Issue: "terraform validate" fails
**Solution**:
```bash
# Check Terraform syntax
terraform fmt
terraform validate
# Review error messages and fix syntax
```

### Issue: Database won't connect
**Solution**:
```bash
# Check database is running
terraform output database_host
# Verify firewall rules allow connection
# Check DATABASE_URL format
```

### Issue: Certbot fails
**Solutions**:
- DNS not propagated: Wait 30 minutes, try again
- Port 80 blocked: Check firewall allows port 80
- Email required: Provide valid email to certbot

---

## Cleanup

To destroy test infrastructure and avoid charges:

```bash
cd terraform
terraform destroy
# Type 'yes' to confirm

# Verify in Hetzner Cloud Console that resources are deleted
```

**Important**: Hetzner charges by the hour, so destroy resources when done testing.

---

## Success Criteria Summary

✅ Test 1: Terraform validates, cost <$10/month
✅ Test 2: Database provisions, can connect
✅ Test 3: SSL works, HTTPS redirects

**All tests must pass before skill is considered production-ready.**
