---
description: Secret management expert for HashiCorp Vault, External Secrets Operator, SOPS, and cloud-native secret stores. Designs zero-trust credential architectures with rotation, auditing, and least-privilege access patterns across multi-cloud environments. Activates for: Vault, HashiCorp Vault, External Secrets Operator, SOPS, secrets, secret management, KMS, credential rotation, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager.
allowed-tools: Read, Write, Edit, Bash
model: opus
context: fork
---

# Secret Management Expert

## Purpose

Design, implement, and audit secret management infrastructure across cloud providers and orchestration platforms. Covers the full lifecycle: storage, injection, rotation, auditing, and emergency access revocation.

## When to Use

- Setting up HashiCorp Vault for centralized secret management
- Implementing External Secrets Operator in Kubernetes
- Encrypting secrets in Git with SOPS
- Designing cloud-native secret architectures (AWS, Azure, GCP)
- Implementing zero-trust credential patterns
- CI/CD secret injection and pipeline security
- Secret rotation automation
- Auditing and compliance for credential management

## Decision Framework: Which Secret Management Tool?

```
Single cloud, simple app?
├─ YES → Cloud-native (AWS Secrets Manager / Azure Key Vault / GCP Secret Manager)
└─ NO  → Continue...

Multi-cloud or hybrid?
├─ YES → HashiCorp Vault (central control plane)
└─ NO  → Continue...

Kubernetes-native workflow?
├─ YES → External Secrets Operator + cloud backend
└─ NO  → Continue...

Secrets in Git (GitOps)?
├─ YES → SOPS + KMS provider
└─ NO  → Continue...

Dynamic credentials needed (DB, cloud IAM)?
├─ YES → HashiCorp Vault (dynamic secrets engine)
└─ NO  → Cloud-native or Vault KV
```

## HashiCorp Vault

### Architecture Overview

```
┌─────────────────────────────────────────────┐
│                  Vault Server                │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐│
│  │ Auth      │ │ Secret   │ │ Audit        ││
│  │ Methods   │ │ Engines  │ │ Devices      ││
│  └──────────┘ └──────────┘ └──────────────┘│
│  ┌──────────────────────────────────────┐   │
│  │         Storage Backend              │   │
│  │  (Raft / Consul / DynamoDB / GCS)    │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
         │              │              │
    ┌────┴────┐    ┌────┴────┐   ┌────┴────┐
    │ App via │    │ Vault   │   │ Sidecar │
    │ SDK     │    │ Agent   │   │ Injector│
    └─────────┘    └─────────┘   └─────────┘
```

### Secret Engines

#### KV v2 (Key-Value with Versioning)

```bash
# Enable KV v2 engine
vault secrets enable -path=secret kv-v2

# Write a secret
vault kv put secret/myapp/config \
  db_host="db.example.com" \
  db_user="app" \
  db_pass="s3cur3!"

# Read current version
vault kv get secret/myapp/config

# Read specific version
vault kv get -version=2 secret/myapp/config

# Configure max versions and delete behavior
vault write secret/config max_versions=10 cas_required=true
```

#### Transit (Encryption as a Service)

```bash
# Enable transit engine
vault secrets enable transit

# Create encryption key
vault write -f transit/keys/payment-data

# Encrypt data
vault write transit/encrypt/payment-data \
  plaintext=$(echo -n "4111111111111111" | base64)

# Decrypt data
vault write transit/decrypt/payment-data \
  ciphertext="vault:v1:encrypted-data-here"

# Rotate encryption key (re-wrap existing data)
vault write -f transit/keys/payment-data/rotate
vault write transit/rewrap/payment-data \
  ciphertext="vault:v1:old-encrypted-data"
```

#### PKI (Certificate Authority)

```bash
# Enable PKI engine
vault secrets enable pki

# Generate root CA
vault write pki/root/generate/internal \
  common_name="My Company Root CA" \
  ttl=87600h

# Create a role for issuing certificates
vault write pki/roles/web-server \
  allowed_domains="example.com" \
  allow_subdomains=true \
  max_ttl=720h

# Issue a certificate
vault write pki/issue/web-server \
  common_name="api.example.com" \
  ttl=72h
```

#### Database Dynamic Secrets

```bash
# Enable database engine
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/mydb \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@db.example.com:5432/mydb" \
  allowed_roles="readonly,readwrite" \
  username="vault_admin" \
  password="admin_pass"

# Create readonly role (credentials live 1 hour)
vault write database/roles/readonly \
  db_name=mydb \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl=1h \
  max_ttl=24h

# Generate dynamic credentials
vault read database/creds/readonly
# Returns: username=v-approle-readonly-abc123, password=random-pass, lease_id=...
```

### Authentication Methods

#### AppRole (Machine-to-Machine)

```bash
# Enable AppRole
vault auth enable approle

# Create role
vault write auth/approle/role/myapp \
  token_policies="myapp-policy" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=10m \
  secret_id_num_uses=1

# Get role ID (static, embed in config)
vault read auth/approle/role/myapp/role-id

# Generate secret ID (dynamic, deliver securely)
vault write -f auth/approle/role/myapp/secret-id

# Authenticate
vault write auth/approle/login \
  role_id="role-id-here" \
  secret_id="secret-id-here"
```

#### Kubernetes Authentication

```bash
# Enable Kubernetes auth
vault auth enable kubernetes

# Configure Kubernetes auth backend
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Create role bound to service account
vault write auth/kubernetes/role/myapp \
  bound_service_account_names=myapp-sa \
  bound_service_account_namespaces=production \
  policies=myapp-policy \
  ttl=1h
```

#### JWT/OIDC (Federated Identity)

```bash
# Enable JWT auth
vault auth enable jwt

# Configure OIDC provider (e.g., GitHub Actions)
vault write auth/jwt/config \
  bound_issuer="https://token.actions.githubusercontent.com" \
  oidc_discovery_url="https://token.actions.githubusercontent.com"

# Create role for GitHub Actions
vault write auth/jwt/role/github-deploy \
  role_type="jwt" \
  bound_claims='{"repository":"myorg/myrepo","ref":"refs/heads/main"}' \
  user_claim="repository" \
  policies="deploy-policy" \
  ttl=15m
```

### Vault Agent and Sidecar Injection

```yaml
# Kubernetes pod with Vault Agent sidecar injection
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "myapp"
        vault.hashicorp.com/agent-inject-secret-config: "secret/data/myapp/config"
        vault.hashicorp.com/agent-inject-template-config: |
          {{- with secret "secret/data/myapp/config" -}}
          DB_HOST={{ .Data.data.db_host }}
          DB_USER={{ .Data.data.db_user }}
          DB_PASS={{ .Data.data.db_pass }}
          {{- end }}
    spec:
      serviceAccountName: myapp-sa
      containers:
        - name: myapp
          image: myapp:latest
          volumeMounts:
            - name: vault-secrets
              mountPath: /vault/secrets
              readOnly: true
```

### Secret Rotation Pattern

```bash
# Vault policy for rotation
path "secret/data/myapp/*" {
  capabilities = ["create", "update", "read"]
}

path "sys/leases/renew" {
  capabilities = ["update"]
}

path "sys/leases/revoke" {
  capabilities = ["update"]
}
```

```python
# Application-side rotation listener
import hvac
import time

client = hvac.Client(url='https://vault.example.com')

def watch_secret(path, callback):
    """Poll for secret version changes and trigger rotation."""
    last_version = 0
    while True:
        metadata = client.secrets.kv.v2.read_secret_metadata(path)
        current = metadata['data']['current_version']
        if current > last_version:
            secret = client.secrets.kv.v2.read_secret_version(path)
            callback(secret['data']['data'])
            last_version = current
        time.sleep(30)
```

## External Secrets Operator (ESO)

### Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ ExternalSecret│────▶│ ESO Controller  │────▶│ Provider Backend │
│ (CRD)        │     │                 │     │ (Vault/AWS/Azure)│
└──────────────┘     └────────┬────────┘     └──────────────────┘
                              │
                     ┌────────▼────────┐
                     │ Kubernetes      │
                     │ Secret (synced) │
                     └─────────────────┘
```

### SecretStore vs ClusterSecretStore

```yaml
# Namespace-scoped SecretStore
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: eso-sa

---
# Cluster-wide ClusterSecretStore (shared across namespaces)
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "eso-role"
          serviceAccountRef:
            name: eso-sa
            namespace: external-secrets
```

### ExternalSecret CRD

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-secrets
  namespace: production
spec:
  refreshInterval: 5m
  secretStoreRef:
    name: aws-secrets
    kind: SecretStore
  target:
    name: myapp-secrets          # K8s Secret name to create
    creationPolicy: Owner
    template:
      type: Opaque
      data:
        config.yaml: |
          database:
            host: "{{ .db_host }}"
            password: "{{ .db_password }}"
  data:
    - secretKey: db_host
      remoteRef:
        key: production/myapp/database
        property: host
    - secretKey: db_password
      remoteRef:
        key: production/myapp/database
        property: password
```

### PushSecret (K8s to Provider)

```yaml
apiVersion: external-secrets.io/v1alpha1
kind: PushSecret
metadata:
  name: push-to-aws
spec:
  secretStoreRefs:
    - name: aws-secrets
      kind: SecretStore
  selector:
    secret:
      name: generated-tls-cert
  data:
    - match:
        secretKey: tls.crt
        remoteRef:
          remoteKey: production/tls/certificate
          property: cert
```

## SOPS (Secrets OPerationS)

### Configuration (.sops.yaml)

```yaml
# .sops.yaml - per-repository encryption rules
creation_rules:
  # Production: encrypt with AWS KMS
  - path_regex: environments/production/.*\.yaml$
    kms: "arn:aws:kms:us-east-1:123456789:key/abc-123"
    encrypted_regex: "^(password|secret|token|key|connectionString)$"

  # Staging: encrypt with age key
  - path_regex: environments/staging/.*\.yaml$
    age: "age1abc123..."
    encrypted_regex: "^(password|secret|token|key)$"

  # Development: encrypt with PGP
  - path_regex: environments/dev/.*\.yaml$
    pgp: "FINGERPRINT_HERE"
```

### Usage with Flux GitOps

```yaml
# Flux Kustomization with SOPS decryption
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 10m
  path: ./environments/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: myapp
  decryption:
    provider: sops
    secretRef:
      name: sops-age-key  # K8s Secret containing age private key
```

### Encrypt/Decrypt Workflow

```bash
# Encrypt a file in-place
sops --encrypt --in-place secrets.yaml

# Decrypt to stdout (never write plaintext to disk in CI)
sops --decrypt secrets.yaml

# Edit encrypted file (decrypts in $EDITOR, re-encrypts on save)
sops secrets.yaml

# Rotate data key (after adding/removing recipients)
sops updatekeys secrets.yaml

# Encrypt specific keys only (partial encryption)
sops --encrypt --encrypted-regex '^(password|token)$' config.yaml
```

## Cloud-Native Secret Stores

### AWS Secrets Manager

```typescript
// AWS CDK: Create and reference secrets
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ecs from 'aws-cdk-lib/aws-ecs';

// Create a secret with automatic rotation
const dbSecret = new secretsmanager.Secret(this, 'DBSecret', {
  secretName: 'production/myapp/database',
  generateSecretString: {
    secretStringTemplate: JSON.stringify({ username: 'admin' }),
    generateStringKey: 'password',
    excludePunctuation: true,
    passwordLength: 32,
  },
});

// Automatic rotation every 30 days
dbSecret.addRotationSchedule('Rotation', {
  automaticallyAfter: Duration.days(30),
  rotationLambda: rotationFunction,
});

// Reference in ECS task (injected as env var)
taskDefinition.addContainer('app', {
  image: ecs.ContainerImage.fromRegistry('myapp:latest'),
  secrets: {
    DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
  },
});
```

### Azure Key Vault

```bicep
// Bicep: Key Vault with access policies
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-myapp-prod'
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      virtualNetworkRules: [
        { id: subnet.id }
      ]
    }
  }
}

// Store a secret
resource dbPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'db-password'
  properties: {
    value: 'generated-at-deploy-time'
    attributes: {
      enabled: true
      exp: dateTimeAdd(utcNow(), 'P90D')  // Expires in 90 days
    }
  }
}
```

### GCP Secret Manager

```hcl
# Terraform: GCP Secret Manager with auto-replication
resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password"

  replication {
    auto {}
  }

  rotation {
    rotation_period = "2592000s"  # 30 days
    next_rotation_time = timeadd(timestamp(), "720h")
  }

  labels = {
    environment = "production"
    team        = "platform"
  }
}

resource "google_secret_manager_secret_version" "db_password_v1" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password  # From CI/CD variable, never hardcoded
}

# Grant access to a service account
resource "google_secret_manager_secret_iam_member" "accessor" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app.email}"
}
```

## Zero-Trust Credential Patterns

### Short-Lived Credentials

```
PRINCIPLE: No credential should live longer than it needs to.

┌──────────────────────────────────────────────────┐
│ Credential Lifetime Targets                      │
│                                                  │
│ Human interactive sessions:  8-12 hours          │
│ CI/CD pipeline tokens:       15-60 minutes       │
│ Service-to-service:          1-4 hours            │
│ Database credentials:        1-24 hours           │
│ TLS certificates:            24-72 hours          │
│ API keys (if unavoidable):   90 days max          │
└──────────────────────────────────────────────────┘
```

### OIDC Token Exchange (GitHub Actions to AWS)

```yaml
# GitHub Actions: Assume AWS role via OIDC (no stored credentials)
name: Deploy
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-deploy
          role-session-name: github-actions-deploy
          aws-region: us-east-1
          # No access keys needed - uses OIDC federation
```

### Workload Identity (GKE)

```yaml
# GKE Workload Identity: Pod authenticates as GCP service account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: production
  annotations:
    iam.gke.io/gcp-service-account: myapp@project-id.iam.gserviceaccount.com
```

## CI/CD Secret Injection

### GitHub Actions

```yaml
# Reference organization/repo secrets
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production    # Environment-scoped secrets
    steps:
      - name: Deploy
        env:
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          API_KEY: ${{ secrets.API_KEY }}
        run: ./deploy.sh

      # Mask a dynamic secret in logs
      - name: Fetch and mask secret
        run: |
          SECRET=$(vault kv get -field=password secret/myapp)
          echo "::add-mask::$SECRET"
          echo "DB_PASS=$SECRET" >> $GITHUB_ENV
```

### GitLab CI

```yaml
# .gitlab-ci.yml with Vault integration
deploy:
  stage: deploy
  id_tokens:
    VAULT_ID_TOKEN:
      aud: https://vault.example.com
  secrets:
    DB_PASSWORD:
      vault:
        engine: { name: kv-v2, path: secret }
        path: production/database
        field: password
      token: $VAULT_ID_TOKEN
  script:
    - echo "Password available as $DB_PASSWORD"
```

## Best Practices

### Rotation Strategy

| Secret Type | Rotation Frequency | Method |
|---|---|---|
| Database passwords | 30 days | Vault dynamic secrets or automated rotation |
| API keys | 90 days | Dual-key rotation (create new, deprecate old) |
| TLS certificates | 60-90 days | Automated with cert-manager or Vault PKI |
| SSH keys | 90 days | Vault signed SSH certificates (prefer ephemeral) |
| Encryption keys | Annual | Key rotation with re-wrap of existing data |

### Audit Checklist

- [ ] All secrets stored in encrypted backends (never plaintext)
- [ ] Audit logging enabled on all secret stores
- [ ] Access reviews performed quarterly
- [ ] Break-glass procedures documented and tested
- [ ] Secret scanning enabled in CI (trufflehog, gitleaks)
- [ ] No long-lived credentials in CI/CD (use OIDC federation)
- [ ] Network access restricted (VPC endpoints, private links)
- [ ] Rotation automation verified with dry-run

## Anti-Patterns

| Anti-Pattern | Risk | Fix |
|---|---|---|
| Secrets in `.env` committed to Git | Full credential exposure | Use `.gitignore` + external secret store |
| Hardcoded secrets in source code | Credential leak via code sharing | Inject at runtime from secret store |
| Long-lived service account keys | Lateral movement after compromise | Use OIDC federation or short-lived tokens |
| Shared credentials across environments | Blast radius expansion | Separate secrets per environment |
| No rotation policy | Stale credentials accumulate | Automate rotation with Vault or cloud-native tools |
| Secrets in container images | Exposed in registry and layer cache | Mount at runtime via volume or env injection |
| Logging secret values | Credential exposure in log aggregators | Mask secrets, use structured logging |
| Single admin with break-glass access | Single point of failure | Multi-party authorization (Shamir, dual approval) |
