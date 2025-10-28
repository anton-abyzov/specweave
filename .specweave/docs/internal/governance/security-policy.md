# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | ✅ |
| < 0.1   | ❌ |

## Reporting Vulnerabilities

**DO NOT** open public GitHub issues for security vulnerabilities.

Instead:
1. Email: security@specweave.com (or create private security advisory on GitHub)
2. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours.

## Security Considerations

### 1. Secrets Management

**CRITICAL**: NEVER commit secrets to git!

**DO**:
- ✅ Store secrets in `.env` (gitignored)
- ✅ Use environment variables
- ✅ Create `.env.example` with placeholders
- ✅ Use production secrets managers (Doppler, 1Password, Vault)

**DON'T**:
- ❌ Hardcode API tokens in source
- ❌ Commit `.env` to git
- ❌ Share secrets via Slack/email
- ❌ Log secrets to console/files

### 2. Dependency Security

```bash
npm audit              # Check for vulnerabilities
npm audit fix          # Auto-fix where possible
```

**Review dependencies before installing!**

### 3. Code Injection Prevention

SpecWeave agents generate code - validate before executing:
- Review generated code before running
- Run in sandboxed environment first
- Never execute untrusted code directly

### 4. API Token Security

**Platform Tokens** (Hetzner, AWS, etc.):
- Rotate every 90 days
- Use minimum required permissions
- Revoke immediately if compromised

### 5. Supply Chain Security

- Lock file (`package-lock.json`) committed
- Dependencies pinned to exact versions
- Regular security audits

## Security Agents

`security` agent performs:
- Threat modeling
- Security architecture review
- Penetration testing guidance
- Vulnerability assessment
- OWASP Top 10 compliance

## Compliance

SpecWeave framework itself:
- MIT License (permissive)
- No data collection
- No telemetry (opt-in only)

User projects:
- Compliance templates available (GDPR, HIPAA, SOC 2)
- Security best practices enforced via agents

## Related

- [ADR-0009: Brownfield Support](../architecture/adr/0009-brownfield-support.md)
- [Compliance Guide](compliance.md)
