---
description: DevSecOps expert for shift-left security including container scanning, SAST/DAST, dependency scanning, secret detection, SBOM generation, supply chain security (SLSA/Sigstore), Kubernetes security policies, compliance-as-code, and secure CI/CD pipeline design.
allowed-tools: Read, Write, Edit, Bash
model: opus
context: fork
---

# DevSecOps Expert - Shift-Left Security

## Purpose

Design and implement security-first DevOps pipelines with automated vulnerability scanning, policy enforcement, and compliance validation. Integrate security tooling at every stage of the software delivery lifecycle.

## When to Use

- Integrating security scanning into CI/CD pipelines
- Container image scanning and hardening
- Static application security testing (SAST)
- Dynamic application security testing (DAST)
- Dependency vulnerability management
- Secret detection and prevention
- SBOM generation and supply chain security
- Kubernetes security policy enforcement
- Compliance automation (SOC2, HIPAA, PCI-DSS)
- Vulnerability triage and exception workflows

## Security Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Workstation                      │
│  pre-commit: secret detection, linting, SAST (fast checks)  │
└──────────────────────┬───────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    CI Pipeline                                │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐  │
│  │ SAST     │ │ SCA/Deps │ │ Secrets   │ │ IaC Scan     │  │
│  │ Semgrep  │ │ Snyk     │ │ Gitleaks  │ │ Checkov      │  │
│  │ CodeQL   │ │ Trivy    │ │ Trufflehog│ │ KICS         │  │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └──────┬───────┘  │
│       └─────────────┴─────────────┴──────────────┘           │
│                          ▼                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Container Build                                       │    │
│  │  Build → Scan (Trivy/Grype) → Sign (Cosign) → Push  │    │
│  └──────────────────────┬───────────────────────────────┘    │
│                          ▼                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ SBOM Generation (Syft) → Attestation (SLSA)          │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────┬───────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    CD Pipeline                                │
│  Admission Control (Kyverno/Gatekeeper) → DAST → Deploy     │
└─────────────────────────────────────────────────────────────┘
```

## Container Scanning

### Trivy (Recommended)

```bash
# Scan container image
trivy image --severity HIGH,CRITICAL myapp:latest

# Scan with SARIF output for GitHub Security tab
trivy image --format sarif --output trivy-results.sarif myapp:latest

# Scan filesystem (source code dependencies)
trivy fs --scanners vuln,secret,misconfig .

# Scan Kubernetes manifests
trivy config --severity HIGH,CRITICAL ./k8s/

# Ignore unfixed vulnerabilities
trivy image --ignore-unfixed myapp:latest

# Use .trivyignore for accepted risks
echo "CVE-2023-12345" >> .trivyignore
```

### GitHub Actions Integration

```yaml
jobs:
  container-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Trivy vulnerability scan
        uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: myapp:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'  # Fail pipeline on findings

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

### Grype (Alternative Scanner)

```bash
# Scan image
grype myapp:latest --fail-on high

# Output SARIF
grype myapp:latest -o sarif > grype-results.sarif

# Scan SBOM instead of image (faster for repeated scans)
syft myapp:latest -o spdx-json > sbom.json
grype sbom:sbom.json
```

## Static Application Security Testing (SAST)

### Semgrep

```bash
# Run with default rulesets
semgrep scan --config=auto .

# Run with specific rulesets
semgrep scan --config=p/owasp-top-ten --config=p/javascript .

# Output SARIF
semgrep scan --config=auto --sarif --output=semgrep.sarif .
```

**Custom Semgrep Rules:**

```yaml
# .semgrep/custom-rules.yml
rules:
  - id: no-hardcoded-secrets
    patterns:
      - pattern: |
          $KEY = "..."
      - metavariable-regex:
          metavariable: $KEY
          regex: '(?i)(password|secret|token|api_key|apikey)'
    message: "Hardcoded secret detected in variable '$KEY'"
    severity: ERROR
    languages: [python, javascript, typescript, java, go]

  - id: sql-injection
    patterns:
      - pattern: |
          $QUERY = f"... {$INPUT} ..."
      - pattern-not: |
          $QUERY = f"... {$SAFE} ..."
          # where $SAFE is parameterized
    message: "Potential SQL injection via string formatting"
    severity: ERROR
    languages: [python]
```

### CodeQL

```yaml
# .github/workflows/codeql.yml
name: CodeQL Analysis
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    strategy:
      matrix:
        language: [javascript, python]
    steps:
      - uses: actions/checkout@v4

      - uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          queries: +security-extended,security-and-quality

      - uses: github/codeql-action/autobuild@v3

      - uses: github/codeql-action/analyze@v3
        with:
          category: "/language:${{ matrix.language }}"
```

## Dynamic Application Security Testing (DAST)

### OWASP ZAP

```yaml
jobs:
  dast:
    runs-on: ubuntu-latest
    steps:
      - name: Start application
        run: docker compose up -d

      - name: Wait for app
        run: |
          timeout 60 bash -c 'until curl -s http://localhost:3000/health; do sleep 2; done'

      - name: ZAP baseline scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          fail_action: 'true'
          allow_issue_writing: 'false'

      - name: ZAP full scan (staging only)
        if: github.ref == 'refs/heads/main'
        uses: zaproxy/action-full-scan@v0.10.0
        with:
          target: 'https://staging.example.com'
```

### Nuclei (Fast Template-Based Scanner)

```bash
# Scan with all templates
nuclei -u https://staging.example.com -as

# Scan with specific severity
nuclei -u https://staging.example.com -severity critical,high

# Scan with specific tags
nuclei -u https://staging.example.com -tags cve,owasp

# Custom template
nuclei -u https://staging.example.com -t custom-templates/
```

## Dependency Scanning

### Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 10
    reviewers:
      - "security-team"
    labels:
      - "dependencies"
      - "security"
    groups:
      dev-dependencies:
        dependency-type: "development"
        update-types: ["minor", "patch"]
      production:
        dependency-type: "production"

  - package-ecosystem: docker
    directory: "/"
    schedule:
      interval: weekly

  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly
```

### Renovate (Alternative, More Flexible)

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:recommended",
    "security:openssf-scorecard",
    ":dependencyDashboard"
  ],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"]
  },
  "packageRules": [
    {
      "matchUpdateTypes": ["patch", "minor"],
      "matchCurrentVersion": "!/^0/",
      "automerge": true,
      "automergeType": "pr",
      "platformAutomerge": true
    },
    {
      "matchDepTypes": ["devDependencies"],
      "automerge": true
    }
  ]
}
```

## Secret Detection

### Gitleaks

```bash
# Scan repository
gitleaks detect --source . --report-format sarif --report-path gitleaks.sarif

# Scan commits (CI)
gitleaks detect --source . --log-opts="HEAD~1..HEAD"

# Pre-commit hook
gitleaks protect --staged
```

**Configuration:**

```toml
# .gitleaks.toml
[allowlist]
  description = "Global allowlist"
  paths = [
    '''\.test\.ts$''',
    '''testdata/''',
    '''\.md$''',
  ]

[[rules]]
  id = "custom-api-key"
  description = "Custom API Key Pattern"
  regex = '''(?i)api[_-]?key\s*[:=]\s*['"]([a-zA-Z0-9]{32,})['"]'''
  entropy = 3.5
  secretGroup = 1
```

### Pre-commit Integration

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.1
    hooks:
      - id: gitleaks

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

### TruffleHog (Deep Scanning)

```bash
# Scan entire Git history
trufflehog git file://. --only-verified

# Scan GitHub org
trufflehog github --org=myorg --only-verified

# CI pipeline
trufflehog git file://. --since-commit HEAD~1 --fail
```

## SBOM Generation

### Syft

```bash
# Generate SBOM from container image
syft myapp:latest -o spdx-json > sbom.spdx.json
syft myapp:latest -o cyclonedx-json > sbom.cdx.json

# Generate SBOM from source directory
syft dir:. -o spdx-json > sbom.spdx.json

# Attach SBOM to container image (OCI artifact)
syft myapp:latest -o spdx-json | cosign attach sbom --sbom - myapp:latest
```

### CI Pipeline SBOM

```yaml
jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          image: myapp:${{ github.sha }}
          format: spdx-json
          output-file: sbom.spdx.json

      - name: Upload SBOM
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.spdx.json
```

## Image Signing with Cosign (Sigstore)

```bash
# Generate key pair (or use keyless with OIDC)
cosign generate-key-pair

# Sign image (key-based)
cosign sign --key cosign.key myregistry.com/myapp:v1.0.0

# Sign image (keyless, OIDC - recommended for CI)
cosign sign myregistry.com/myapp:v1.0.0
# Uses GitHub Actions OIDC or Fulcio for ephemeral certificates

# Verify signature
cosign verify --key cosign.pub myregistry.com/myapp:v1.0.0

# Verify keyless signature
cosign verify \
  --certificate-identity=https://github.com/org/repo/.github/workflows/build.yml@refs/heads/main \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  myregistry.com/myapp:v1.0.0
```

### CI Pipeline Signing

```yaml
jobs:
  build-sign:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # For OIDC keyless signing
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: sigstore/cosign-installer@v3

      - name: Login to registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}

      - name: Sign image (keyless)
        run: cosign sign --yes ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}
```

## Supply Chain Security (SLSA)

### SLSA Levels

| Level | Requirement |
|-------|-------------|
| SLSA 1 | Build process documented, provenance exists |
| SLSA 2 | Version-controlled build process, authenticated provenance |
| SLSA 3 | Hardened build platform, non-falsifiable provenance |
| SLSA 4 | Two-person review, hermetic builds |

### Provenance Attestation

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
      attestations: write
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}

      - name: Generate SLSA provenance
        uses: actions/attest-build-provenance@v1
        with:
          subject-name: ghcr.io/${{ github.repository }}
          subject-digest: ${{ steps.build.outputs.digest }}
          push-to-registry: true
```

## Infrastructure Scanning

### Checkov

```bash
# Scan Terraform
checkov -d ./infrastructure --framework terraform

# Scan Kubernetes manifests
checkov -d ./k8s --framework kubernetes

# Scan Dockerfiles
checkov -d . --framework dockerfile

# Scan with custom policies
checkov -d . --external-checks-dir ./custom-policies

# Skip specific checks
checkov -d . --skip-check CKV_AWS_18,CKV_AWS_19

# SARIF output
checkov -d . -o sarif --output-file checkov.sarif
```

### KICS (Keeping Infrastructure as Code Secure)

```bash
# Scan all supported IaC formats
kics scan -p . -o kics-results/

# Scan specific platforms
kics scan -p ./terraform --type terraform
kics scan -p ./k8s --type kubernetes
```

## Kubernetes Security

### Kyverno Policies

```yaml
# Require resource limits
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-limits
      match:
        resources:
          kinds: [Pod]
      validate:
        message: "CPU and memory limits are required"
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    memory: "?*"
                    cpu: "?*"

---
# Disallow privileged containers
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-privileged
spec:
  validationFailureAction: Enforce
  rules:
    - name: no-privileged
      match:
        resources:
          kinds: [Pod]
      validate:
        message: "Privileged containers are not allowed"
        pattern:
          spec:
            containers:
              - securityContext:
                  privileged: "!true"

---
# Require image signatures
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  validationFailureAction: Enforce
  rules:
    - name: verify-cosign
      match:
        resources:
          kinds: [Pod]
      verifyImages:
        - imageReferences: ["ghcr.io/myorg/*"]
          attestors:
            - entries:
                - keyless:
                    issuer: "https://token.actions.githubusercontent.com"
                    subject: "https://github.com/myorg/*"
```

### Falco Runtime Security

```yaml
# Custom Falco rules
- rule: Unexpected outbound connection
  desc: Detect outbound connections to non-whitelisted IPs
  condition: >
    evt.type=connect and
    fd.typechar='4' and
    fd.ip != "0.0.0.0" and
    not fd.snet in (rfc_1918_addresses) and
    container and
    not k8s.ns.name in (kube-system, monitoring)
  output: >
    Unexpected outbound connection
    (command=%proc.cmdline connection=%fd.name container=%container.name namespace=%k8s.ns.name)
  priority: WARNING

- rule: Shell spawned in container
  desc: Detect shell execution inside containers
  condition: >
    spawned_process and
    container and
    proc.name in (bash, sh, zsh, ash) and
    not k8s.ns.name in (kube-system)
  output: >
    Shell spawned in container
    (user=%user.name command=%proc.cmdline container=%container.name namespace=%k8s.ns.name)
  priority: NOTICE
```

## Compliance as Code

### Regulatory Mapping

| Control | SOC2 | HIPAA | PCI-DSS |
|---------|------|-------|---------|
| Image scanning | CC7.1 | 164.312(a)(1) | Req 6.3 |
| Access control | CC6.1 | 164.312(a)(1) | Req 7 |
| Encryption at rest | CC6.1 | 164.312(a)(2)(iv) | Req 3.4 |
| Encryption in transit | CC6.1 | 164.312(e)(1) | Req 4.1 |
| Audit logging | CC7.2 | 164.312(b) | Req 10 |
| Secret management | CC6.1 | 164.312(a)(1) | Req 3.5 |
| Vulnerability mgmt | CC7.1 | 164.308(a)(1) | Req 6.1 |

### Automated Compliance Checks

```yaml
# compliance-pipeline.yml
jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Infrastructure compliance
        run: |
          checkov -d ./infrastructure \
            --check CKV_AWS_19,CKV_AWS_145,CKV_AWS_18 \
            --compact \
            --framework terraform

      - name: Container compliance
        run: |
          trivy image --compliance docker-cis myapp:latest

      - name: Kubernetes compliance
        run: |
          trivy config --compliance k8s-nsa ./k8s/
```

## Security Gates: Blocking vs Advisory

### Decision Framework

```
BLOCKING (fail pipeline):
  - Critical/High CVEs with known exploits
  - Hardcoded secrets in code
  - SQL injection, XSS, RCE findings (SAST)
  - Unsigned container images (production)
  - Missing encryption at rest/transit
  - Privileged containers

ADVISORY (warn, don't block):
  - Medium/Low CVEs without exploits
  - Informational SAST findings
  - Style/best-practice violations
  - CVEs in dev dependencies only
  - Findings with accepted risk exceptions
```

### Implementation Pattern

```yaml
jobs:
  security-gate:
    runs-on: ubuntu-latest
    steps:
      # BLOCKING checks
      - name: Critical vulnerability scan
        run: trivy image --exit-code 1 --severity CRITICAL myapp:latest

      - name: Secret detection
        run: gitleaks detect --exit-code 1

      - name: SAST critical findings
        run: semgrep scan --config=p/security-audit --error --severity ERROR

      # ADVISORY checks (never fail pipeline)
      - name: Full vulnerability report
        if: always()
        run: trivy image --severity HIGH,MEDIUM,LOW --format table myapp:latest

      - name: SAST informational
        if: always()
        run: semgrep scan --config=auto --no-error
```

## Vulnerability Management

### CVE Triage Workflow

```
1. Scanner finds CVE
2. Auto-classify by severity and exploitability
3. Route to team:
   - CRITICAL + exploitable → Incident response (4h SLA)
   - HIGH + exploitable → Sprint priority (48h SLA)
   - HIGH + not exploitable → Next sprint (7d SLA)
   - MEDIUM → Backlog (30d SLA)
   - LOW → Quarterly review
4. Exception process:
   - Document risk acceptance
   - Require security team approval
   - Set expiration date for re-review
   - Track in exception registry
```

### Exception File Pattern

```yaml
# .security-exceptions.yml
exceptions:
  - cve: CVE-2024-12345
    package: openssl
    reason: "Not exploitable in our configuration - TLS 1.3 only"
    approved_by: security-team
    expires: 2025-06-01
    ticket: SEC-1234

  - cve: CVE-2024-67890
    package: lodash
    reason: "Dev dependency only, not in production bundle"
    approved_by: security-team
    expires: 2025-03-01
    ticket: SEC-1235
```

## SARIF Reporting

### Unified Security Dashboard

```yaml
# Upload all scan results to GitHub Security tab
steps:
  - name: Upload Trivy SARIF
    uses: github/codeql-action/upload-sarif@v3
    with:
      sarif_file: trivy-results.sarif
      category: container-scanning

  - name: Upload Semgrep SARIF
    uses: github/codeql-action/upload-sarif@v3
    with:
      sarif_file: semgrep-results.sarif
      category: sast

  - name: Upload Checkov SARIF
    uses: github/codeql-action/upload-sarif@v3
    with:
      sarif_file: checkov-results.sarif
      category: iac-scanning

  - name: Upload Gitleaks SARIF
    uses: github/codeql-action/upload-sarif@v3
    with:
      sarif_file: gitleaks-results.sarif
      category: secret-detection
```

## Complete Secure CI/CD Pipeline

```yaml
name: Secure Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  security-events: write
  id-token: write
  packages: write

jobs:
  # Stage 1: Pre-build security
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}

  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/owasp-top-ten

  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: trivy fs --scanners vuln --exit-code 1 --severity CRITICAL .

  iac-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: bridgecrewio/checkov-action@v12
        with:
          directory: infrastructure/
          framework: terraform

  # Stage 2: Build and scan
  build:
    needs: [secrets-scan, sast, dependency-scan, iac-scan]
    runs-on: ubuntu-latest
    outputs:
      digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v4

      - uses: docker/build-push-action@v5
        id: build
        with:
          push: ${{ github.ref == 'refs/heads/main' }}
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}

      - name: Scan built image
        run: |
          trivy image --exit-code 1 --severity CRITICAL,HIGH \
            ghcr.io/${{ github.repository }}:${{ github.sha }}

      - name: Generate SBOM
        run: syft ghcr.io/${{ github.repository }}:${{ github.sha }} -o spdx-json > sbom.json

  # Stage 3: Sign and attest
  sign:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: sigstore/cosign-installer@v3
      - run: cosign sign --yes ghcr.io/${{ github.repository }}@${{ needs.build.outputs.digest }}

  # Stage 4: Deploy with DAST
  deploy-staging:
    needs: sign
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: echo "Deploy to staging"

  dast:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: zaproxy/action-baseline@v0.12.0
        with:
          target: 'https://staging.example.com'
```

## Zero-Trust Principles in DevOps

```
1. IDENTITY: Authenticate everything
   - OIDC for CI/CD (no long-lived credentials)
   - Service mesh mTLS between services
   - Signed commits (GPG/SSH)

2. LEAST PRIVILEGE: Minimal permissions
   - Scoped IAM roles per pipeline stage
   - Read-only tokens where possible
   - Short-lived credentials (1h max)

3. VERIFY: Trust nothing by default
   - Verify image signatures before deployment
   - Validate SBOM against known vulnerabilities
   - Admission control in Kubernetes

4. ENCRYPT: Protect data everywhere
   - TLS everywhere (no exceptions)
   - Encrypt secrets at rest (Vault, SOPS, Sealed Secrets)
   - Encrypt state files and backups

5. MONITOR: Detect and respond
   - Runtime security (Falco)
   - Audit logs for all privileged operations
   - Anomaly detection on network traffic
```

## Tool Selection Guide

| Category | Recommended | Alternative | Notes |
|----------|------------|-------------|-------|
| Container scan | Trivy | Grype, Snyk | Trivy: free, comprehensive |
| SAST | Semgrep | CodeQL, SonarQube | Semgrep: fast, custom rules |
| DAST | ZAP | Nuclei | ZAP: comprehensive; Nuclei: fast |
| Dependencies | Renovate | Dependabot | Renovate: more flexible |
| Secrets | Gitleaks | TruffleHog | Gitleaks: fast; TH: deep history |
| SBOM | Syft | Trivy | Syft: dedicated SBOM tool |
| Signing | Cosign | Notary | Cosign: Sigstore ecosystem |
| IaC scan | Checkov | KICS, tfsec | Checkov: multi-framework |
| K8s policy | Kyverno | OPA/Gatekeeper | Kyverno: K8s-native YAML |
| Runtime | Falco | Sysdig | Falco: open-source standard |
