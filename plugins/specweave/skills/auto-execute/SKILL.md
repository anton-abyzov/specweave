---
name: auto-execute
description: Enforces automatic command execution when credentials are available. NEVER output manual "Next Steps" - always execute commands automatically using secrets from .env, environment variables, and config files. Applies to all deployment tools including Supabase, Cloudflare Wrangler, Terraform, AWS CLI, GitHub CLI, and database operations. Activates for: auto-execute, credentials, deployment, wrangler, supabase, terraform, deploy, secrets, .env.
allowed-tools: Bash, Read, Grep, Glob, Write, Edit
---

# Auto-Execute Skill: MANDATORY for Auto Mode

## CRITICAL RULE: NEVER Output Manual Instructions When Credentials Exist

**This skill MUST be applied by ALL agents when operating in auto mode or when credentials are available.**

### The Golden Rule

```
❌ WRONG: "Next Steps: Run the schema SQL in Supabase SQL Editor..."
❌ WRONG: "Set the secret via: wrangler secret put SUPABASE_SECRET_KEY"
❌ WRONG: "Deploy with: wrangler deploy"

✅ CORRECT: Execute commands directly using available credentials
```

---

## Mandatory Credential Lookup Workflow

### Step 1: ALWAYS Check for Existing Credentials FIRST

**Before outputting ANY manual instructions, search for credentials in this order:**

```bash
# 1. Check .env file (primary location)
if [ -f .env ]; then
  source .env 2>/dev/null
fi

# 2. Check project-specific .env files
for f in .env.local .env.development .env.production; do
  [ -f "$f" ] && source "$f" 2>/dev/null
done

# 3. Check environment variables (already loaded)
# e.g., $SUPABASE_URL, $SUPABASE_ANON_KEY, $CF_API_TOKEN

# 4. Check .specweave/config.json for service configs
cat .specweave/config.json 2>/dev/null | grep -A10 '"sync"'

# 5. Check wrangler.toml for Cloudflare config
cat wrangler.toml 2>/dev/null
```

### Step 2: Credential Discovery Patterns

**Supabase Credentials:**
```bash
# Check for Supabase credentials
grep -E "SUPABASE|NEXT_PUBLIC_SUPABASE" .env .env.* 2>/dev/null
# Look for: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

**Cloudflare Wrangler Credentials:**
```bash
# Check for Cloudflare credentials
grep -E "CF_|CLOUDFLARE_|WRANGLER" .env .env.* 2>/dev/null
wrangler whoami 2>/dev/null  # Check if already authenticated
# Look for: CF_API_TOKEN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
```

**AWS Credentials:**
```bash
aws sts get-caller-identity 2>/dev/null  # Check if configured
cat ~/.aws/credentials 2>/dev/null
# Look for: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
```

**GitHub CLI:**
```bash
gh auth status 2>/dev/null  # Check if logged in
grep GITHUB_TOKEN .env 2>/dev/null
```

**Terraform Cloud:**
```bash
grep TF_TOKEN .env 2>/dev/null
cat ~/.terraform.d/credentials.tfrc.json 2>/dev/null
```

---

## Auto-Execution Commands by Tool

### Supabase Operations

**WHEN CREDENTIALS EXIST, AUTO-EXECUTE:**

```bash
# Execute SQL schema directly
supabase db push --db-url "$DATABASE_URL"

# OR if using Supabase CLI with project ref
supabase db push --project-ref "$SUPABASE_PROJECT_REF"

# OR execute SQL file directly via psql
psql "$DATABASE_URL" -f src/db/supabase-schema.sql

# Deploy edge functions
supabase functions deploy <function-name>
```

**NEVER say**: "Run the schema SQL in Supabase SQL Editor..."

### Cloudflare Wrangler Operations

**WHEN CREDENTIALS EXIST, AUTO-EXECUTE:**

```bash
# Set secrets (loop through required secrets)
for secret in SUPABASE_SECRET_KEY DATABASE_URL JWT_SECRET; do
  if [ -n "${!secret}" ]; then
    echo "${!secret}" | wrangler secret put "$secret" --quiet
  fi
done

# Deploy
wrangler deploy

# Or for Pages projects
wrangler pages publish ./dist
```

**NEVER say**: "Set the secret via: wrangler secret put..."
**NEVER say**: "Deploy with: wrangler deploy"

### Terraform Operations

**WHEN CREDENTIALS EXIST, AUTO-EXECUTE:**

```bash
# Auto-approve in non-interactive mode
TF_VAR_hetzner_token="$HETZNER_API_TOKEN" terraform apply -auto-approve

# Or with var file
terraform apply -auto-approve -var-file="environments/dev.tfvars"
```

**NEVER say**: "Run terraform apply and type 'yes'..."

### AWS CLI Operations

**WHEN CREDENTIALS EXIST, AUTO-EXECUTE:**

```bash
# Lambda deployment
aws lambda update-function-code --function-name my-func --zip-file fileb://function.zip

# S3 upload
aws s3 sync ./dist s3://my-bucket/

# CloudFormation deployment
aws cloudformation deploy --template-file template.yaml --stack-name my-stack
```

### GitHub CLI Operations

**WHEN CREDENTIALS EXIST, AUTO-EXECUTE:**

```bash
# Create release
gh release create v1.0.0 --title "Release v1.0.0" --notes "Changelog..."

# Create issue
gh issue create --title "Title" --body "Body"

# Create PR
gh pr create --title "Title" --body "Body"
```

### NPM Publishing

**WHEN NPM_TOKEN EXISTS, AUTO-EXECUTE:**

```bash
# Check for NPM token
if [ -n "$NPM_TOKEN" ]; then
  echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
  npm publish
  rm .npmrc
fi
```

---

## Decision Tree: Execute vs Ask

```
┌─────────────────────────────────────────────────────────┐
│ Task requires external tool (wrangler, supabase, etc.) │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
              ┌────────────────────────┐
              │ Search for credentials │
              │ .env, env vars, config │
              └───────────┬────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌───────────────────┐               ┌───────────────────┐
│ Credentials FOUND │               │ Credentials MISSING│
└────────┬──────────┘               └────────┬──────────┘
         │                                   │
         ▼                                   ▼
┌────────────────────┐              ┌────────────────────┐
│ EXECUTE COMMAND    │              │ ASK FOR CREDENTIALS│
│ IMMEDIATELY        │              │ (Don't show manual │
│                    │              │  steps, ask for    │
│ NO "Next Steps"    │              │  the actual token) │
└────────────────────┘              └────────────────────┘
```

---

## Auto Mode Integration

When running in `/sw:auto` mode, this skill is MANDATORY:

1. **All agents MUST check credentials before any deployment task**
2. **No manual "Next Steps" ever in auto mode**
3. **If credentials missing, auto mode PAUSES and asks user** (human gate)
4. **After user provides credentials, save to .env and CONTINUE**

### Auto Mode Credential Prompt Pattern

```markdown
🔐 **Credential Required for Auto-Execution**

I need your Supabase Service Role Key to execute the schema migration.

**How to get it:**
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
2. Copy the "service_role" key (NOT the anon key)

**Please paste your Supabase Service Role Key:**
[I will save it to .env and continue execution automatically]
```

**Key difference from manual mode:**
- After user provides credential, AUTO-SAVE and CONTINUE
- NEVER say "now run these commands manually"

---

## Common Platform Credential Mappings

| Platform | Credential Variable | Check Command |
|----------|-------------------|---------------|
| **Supabase** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `supabase status` |
| **Cloudflare Wrangler** | `CF_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | `wrangler whoami` |
| **Vercel** | `VERCEL_TOKEN` | `vercel whoami` |
| **Netlify** | `NETLIFY_AUTH_TOKEN` | `netlify status` |
| **Railway** | `RAILWAY_TOKEN` | `railway status` |
| **Render** | `RENDER_API_KEY` | - |
| **AWS** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | `aws sts get-caller-identity` |
| **GCP** | `GOOGLE_APPLICATION_CREDENTIALS` | `gcloud auth list` |
| **Azure** | `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` | `az account show` |
| **GitHub** | `GITHUB_TOKEN`, `GH_TOKEN` | `gh auth status` |
| **NPM** | `NPM_TOKEN` | `npm whoami` |
| **Docker Hub** | `DOCKER_USERNAME`, `DOCKER_PASSWORD` | `docker login` |
| **Terraform Cloud** | `TF_TOKEN_app_terraform_io` | - |
| **Hetzner** | `HETZNER_API_TOKEN` | - |

---

## Forbidden Patterns (NEVER DO THESE)

### Pattern 1: Manual SQL Editor Instructions
```
❌ FORBIDDEN:
"Next Steps:
1. Run the schema SQL in Supabase SQL Editor (file: src/db/supabase-schema.sql)"

✅ CORRECT:
# Check for credentials
if [ -n "$DATABASE_URL" ] || [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  # Execute directly
  supabase db push --db-url "$DATABASE_URL"
else
  # Ask for credentials (don't show manual steps)
  echo "🔐 I need your Supabase database URL to execute the migration..."
fi
```

### Pattern 2: Manual Secret Setting
```
❌ FORBIDDEN:
"Set the secret via: wrangler secret put SUPABASE_SECRET_KEY"

✅ CORRECT:
if [ -n "$SUPABASE_SECRET_KEY" ]; then
  echo "$SUPABASE_SECRET_KEY" | wrangler secret put SUPABASE_SECRET_KEY --quiet
else
  echo "🔐 I need your SUPABASE_SECRET_KEY to configure Wrangler..."
fi
```

### Pattern 3: Manual Deploy Commands
```
❌ FORBIDDEN:
"Deploy with: wrangler deploy"

✅ CORRECT:
wrangler deploy
# Just do it. The credentials are already configured.
```

### Pattern 4: Conditional Manual Fallback
```
❌ FORBIDDEN:
"If the above command fails, try running manually..."

✅ CORRECT:
# Handle errors programmatically, retry, or ask for different credentials
```

---

## Integration with Existing Agents

### DevOps Agent Integration

The DevOps agent MUST follow this skill when:
- Generating IaC and deploying
- Setting up CI/CD
- Configuring cloud services

### Infrastructure Agent Integration

The Infrastructure agent MUST follow this skill when:
- Deploying Terraform configurations
- Setting up cloud resources
- Configuring secrets in cloud providers

### All Agents General Rule

**Every agent that outputs "Next Steps" or deployment instructions MUST:**

1. Check for existing credentials FIRST
2. If found → EXECUTE immediately
3. If not found → ASK for credentials (not manual steps)
4. After receiving credentials → SAVE to .env AND EXECUTE

---

## Success Metrics

- **Zero manual "Next Steps"** when credentials are available
- **100% auto-execution** in auto mode for supported platforms
- **Credential save rate**: 100% of provided credentials saved to .env
- **Continuation rate**: 100% auto-continue after credential provided

---

## Related Files

- `.env` - Primary credential storage
- `.env.example` - Template for team (commit this)
- `.specweave/config.json` - Service configurations
- `wrangler.toml` - Cloudflare configuration

## Related ADRs

- ADR-0177: Autonomous Mode Safety
- ADR-0178: Stop Hook-Based Auto Architecture
