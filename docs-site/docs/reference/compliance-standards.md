# Compliance Standards Reference

**Version**: 0.22.0+
**Last Updated**: 2025-11-17
**Feature**: Automatic Compliance Detection (Strategic Init Phase 1)

---

## Overview

SpecWeave's Strategic Init automatically detects compliance requirements based on your product vision. This guide explains each supported standard, detection triggers, and architecture implications.

**Supported Standards**: HIPAA, GDPR, PCI-DSS, SOC 2, ISO 27001, FDA, COPPA, FERPA

---

## HIPAA (Health Insurance Portability and Accountability Act)

### What It Is
US federal law protecting Protected Health Information (PHI) in healthcare.

### Detection Triggers
- **Keywords**: healthcare, medical, patient, telemedicine, telehealth, clinic, hospital, PHI, EHR, EMR
- **Markets**: healthcare
- **Data types**: Patient records, medical histories, lab results, prescriptions

### Architecture Requirements
✅ **Traditional Infrastructure** (EC2 + RDS + CloudTrail)
❌ **Serverless NOT Recommended** (HIPAA requires full audit controls)

**Required Components**:
- Audit logging (AWS CloudTrail or equivalent)
- Encryption at rest (KMS for databases)
- Encryption in transit (TLS 1.2+)
- Access controls (IAM roles, least privilege)
- Business Associate Agreements (BAAs) with vendors

**Additional Services**:
- Auth service (MFA, role-based access)
- Data service (PHI handling, anonymization)
- Audit logs service (immutable audit trail)

### Cost Impact
- Base cost: +$200/month (vs non-compliant)
- Audit logging: $50-$100/month
- Compliance audits: $10K-$50K/year

### Example Products
- Telehealth platforms
- Patient monitoring systems
- EHR/EMR systems
- Medical billing software

---

## GDPR (General Data Protection Regulation)

### What It Is
EU regulation protecting personal data and privacy.

### Detection Triggers
- **Keywords**: EU, Europe, European, privacy, personal data, GDPR
- **Markets**: All markets (if EU users)
- **Geographic**: EU region detected in vision

### Architecture Requirements
✅ **Serverless OK** (if using GDPR-compliant providers)
✅ **Traditional OK**

**Required Components**:
- Data residency (store EU data in EU region)
- Right to deletion (GDPR Article 17)
- Data portability (export user data)
- Consent management (opt-in tracking)
- Privacy policy (updated annually)

**Cloud Providers**:
- AWS: Frankfurt, Ireland regions
- Azure: West Europe, North Europe
- GCP: europe-west1, europe-west2

### Cost Impact
- Base cost: +$50-$100/month (regional hosting)
- Compliance tooling: $20-$50/month

### Example Products
- SaaS serving EU customers
- E-commerce with EU buyers
- Social networks with EU users

---

## PCI-DSS (Payment Card Industry Data Security Standard)

### What It Is
Security standard for organizations handling credit card data.

### Detection Triggers
- **Keywords**: payment, credit card, debit card, Stripe, PayPal, merchant, PCI, cardholder
- **Markets**: e-commerce, fintech
- **Features**: Payment processing

### Architecture Requirements
✅ **Traditional Infrastructure** (dedicated, isolated)
⚠️ **Serverless Partial** (use Stripe/PayPal, avoid storing card data)

**Required Components** (if storing card data):
- Network segmentation (isolated payment network)
- Encryption (AES-256 for cardholder data)
- Access controls (2FA, least privilege)
- Vulnerability scanning (quarterly)
- Penetration testing (annual)

**Recommended Approach**: Use Stripe/PayPal (they handle PCI compliance)

### Cost Impact
- Self-hosted PCI: +$500/month (infrastructure)
- PCI audits: $50K-$200K/year
- Stripe fees: 2.9% + $0.30/transaction (no PCI burden)

### Example Products
- E-commerce platforms
- Payment processors
- SaaS with subscriptions

---

## SOC 2 (Service Organization Control 2)

### What It Is
Audit framework for service providers storing customer data.

### Detection Triggers
- **Keywords**: enterprise, B2B, SaaS, audit, security, SOC2, compliance
- **Markets**: enterprise-b2b, productivity-saas
- **Target customers**: Enterprises, Fortune 500

### Architecture Requirements
✅ **Traditional Infrastructure** (full control, audit trail)
⚠️ **Serverless Partial** (limited audit capabilities)

**Required Components**:
- Access logging (all API requests)
- Change management (approval process)
- Incident response (runbooks, on-call)
- Vulnerability management (scanning, patching)
- Security monitoring (SIEM, alerts)

**Trust Services Criteria** (5 categories):
1. **Security**: Access controls, firewalls, encryption
2. **Availability**: Uptime monitoring, redundancy
3. **Processing Integrity**: Data validation, error handling
4. **Confidentiality**: Data classification, NDAs
5. **Privacy**: GDPR-like protections

### Cost Impact
- Infrastructure: +$300/month (monitoring, logging)
- SOC 2 audit: $30K-$100K/year (Type II)
- Compliance tooling: $500-$2K/month (Vanta, Drata)

### Example Products
- Enterprise SaaS
- B2B platforms
- Cloud services

---

## ISO 27001 (Information Security Management)

### What It Is
International standard for information security management systems (ISMS).

### Detection Triggers
- **Keywords**: ISO, security, ISMS, certification, international
- **Markets**: enterprise-b2b, global products
- **Target customers**: Global enterprises

### Architecture Requirements
✅ **Traditional Infrastructure** (full control)
⚠️ **Serverless Partial**

**Required Components**:
- Risk assessment (annual)
- Security policies (access, incident, backup)
- Asset inventory (all systems documented)
- Access controls (RBAC, MFA)
- Continuous monitoring (SIEM)

### Cost Impact
- Infrastructure: +$200/month
- ISO 27001 audit: $50K-$150K (certification)
- Annual surveillance: $20K-$40K/year

### Example Products
- Global SaaS platforms
- International enterprise software

---

## FDA (Food and Drug Administration)

### What It Is
US agency regulating medical devices and software.

### Detection Triggers
- **Keywords**: medical device, FDA, diagnostic, treatment, therapy, Class II, Class III
- **Markets**: healthcare
- **Product type**: Medical devices, diagnostics

### Architecture Requirements
✅ **Traditional Infrastructure** (validation required)
❌ **Serverless NOT Recommended** (FDA validation complex)

**Required Components**:
- Software validation (21 CFR Part 11)
- Design controls (510(k) or PMA submission)
- Risk management (ISO 14971)
- Clinical validation (trials, studies)
- Post-market surveillance (adverse events)

### Cost Impact
- Infrastructure: +$500/month (validation environments)
- FDA submission: $100K-$500K (Class II)
- Clinical trials: $500K-$5M (Class III)

### Example Products
- Diagnostic software
- Treatment planning systems
- Medical device control software

---

## COPPA (Children's Online Privacy Protection Act)

### What It Is
US law protecting children under 13 online.

### Detection Triggers
- **Keywords**: children, kids, under 13, COPPA, parental consent, education
- **Markets**: education, gaming, social-network
- **Target users**: Children under 13

### Architecture Requirements
✅ **Serverless OK**
✅ **Traditional OK**

**Required Components**:
- Age gate (verify user age)
- Parental consent (verifiable consent mechanism)
- Data minimization (collect only necessary data)
- No behavioral advertising (to children)
- Data deletion (parental request)

### Cost Impact
- Parental consent system: +$100/month
- Age verification: $0.10-$0.50/user

### Example Products
- Educational apps for kids
- Children's games
- Kid-safe social networks

---

## FERPA (Family Educational Rights and Privacy Act)

### What It Is
US law protecting student education records.

### Detection Triggers
- **Keywords**: education, student, school, university, FERPA, grades, enrollment
- **Markets**: education
- **Data types**: Student records, grades, transcripts

### Architecture Requirements
✅ **Serverless OK** (with proper access controls)
✅ **Traditional OK**

**Required Components**:
- Access controls (students, parents, school officials only)
- Audit logging (who accessed what records)
- Consent management (disclosure requires consent)
- Data security (encryption, access logs)

### Cost Impact
- Access control system: +$50/month
- Audit logging: +$30/month

### Example Products
- Learning management systems (LMS)
- Student information systems (SIS)
- Grade management platforms

---

## Multi-Compliance Products

Some products require multiple standards:

### Healthcare + EU → HIPAA + GDPR
**Example**: Telehealth platform serving US and EU patients

**Architecture**: Traditional (HIPAA requires full audit)
**Components**: Regional data residency, BAAs, consent management
**Cost**: +$300/month infrastructure + audit costs

### Fintech + Enterprise → PCI-DSS + SOC 2
**Example**: B2B payment processor

**Architecture**: Traditional (PCI + SOC 2 both require full control)
**Components**: Payment isolation, SOC 2 controls, penetration testing
**Cost**: +$500/month infrastructure + audit costs

### Education + Children → FERPA + COPPA
**Example**: K-12 learning platform

**Architecture**: Serverless OK
**Components**: Age gate, parental consent, student records access control
**Cost**: +$150/month compliance systems

---

## Compliance Decision Tree

SpecWeave uses this logic during Strategic Init Phase 1:

```
IF keywords match HIPAA triggers:
  → Detect HIPAA
  → Require traditional infrastructure
  → Add auth-service, data-service, audit-logs-service

IF keywords match GDPR triggers OR EU region detected:
  → Detect GDPR
  → Require EU data residency

IF keywords match PCI-DSS triggers:
  → Detect PCI-DSS
  → Recommend Stripe/PayPal (avoid PCI burden)
  → OR traditional infrastructure if self-hosting payments

IF keywords match SOC 2 triggers:
  → Detect SOC 2
  → Recommend traditional infrastructure

IF keywords match FDA triggers:
  → Detect FDA
  → Require traditional infrastructure
  → Warn about clinical validation requirements

IF keywords match COPPA triggers:
  → Detect COPPA
  → Require age gate + parental consent

IF keywords match FERPA triggers:
  → Detect FERPA
  → Require student records access controls
```

---

## FAQ

### Can serverless be HIPAA compliant?

**Technically yes**, but not recommended. AWS Lambda can be HIPAA compliant with BAAs, but:
- ❌ Limited audit trail visibility
- ❌ Complex compliance validation
- ❌ Harder to demonstrate controls

**Recommendation**: Use EC2 + RDS for HIPAA.

### Do I need SOC 2 for B2B SaaS?

**Depends on target customers**:
- ✅ **Yes**: Selling to enterprises (Fortune 500, government)
- ⚠️ **Maybe**: Selling to SMBs (some require it, some don't)
- ❌ **No**: Selling to consumers or small businesses

**Cost-benefit**: SOC 2 audit ($50K-$100K) opens enterprise market ($100K+ deals).

### Can I avoid PCI-DSS by using Stripe?

**Yes!** This is the recommended approach:
- ✅ Stripe handles card data (they're PCI Level 1 certified)
- ✅ You never store/transmit card data
- ✅ No PCI audits required for you
- ✅ Lower cost (2.9% + $0.30/transaction)

### Is GDPR required for US-only products?

**No**, unless:
- ❌ You have EU users (even 1 EU user triggers GDPR)
- ❌ You target EU market
- ✅ US-only products are exempt

### How does Strategic Init detect compliance?

**Keyword matching + market category**:
1. Analyze product vision for compliance keywords
2. Check market category (healthcare → HIPAA likely)
3. Detect geographic requirements (EU → GDPR)
4. Flag high-risk data types (PHI, payments, children)

**Example**:
```
Vision: "A telehealth platform for US patients"

Detected:
✅ HIPAA (telehealth + patients)
❌ GDPR (no EU mention)
❌ PCI-DSS (no payments mention)
```

---

## See Also

- [Strategic Init Guide](../guides/strategic-init.md) - Full Phase 0-6 process
- [Multi-Project Setup](../guides/multi-project-setup.md) - Organize compliance-driven projects
- [Repository Selection Guide](../guides/repository-selection.md) - Choose templates

---

**Last Updated**: 2025-11-17
**Version**: 0.22.0+
