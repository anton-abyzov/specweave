# Compliance Standards Reference

**Complete Guide to 30+ Compliance Standards Supported by SpecWeave Strategic Init**

Strategic Init automatically detects compliance requirements based on your data types and geographic regions, helping you understand team, cost, and technical implications before you start building.

---

## Quick Reference Table

| Standard | Data Type | Region | Team Impact | Est. Cost/Month |
|----------|-----------|--------|-------------|-----------------|
| **HIPAA** | Healthcare (PHI) | US | Auth, Data, DevSecOps | $3,000+ |
| **HITRUST** | Healthcare | US | CISO, Security | $5,000+ |
| **PCI-DSS** | Payment Cards | Global | Payments, Security | $3,500+ |
| **GDPR** | Personal Data | EU | Privacy, DPO | $500+ |
| **CCPA** | Personal Data | US (CA) | Privacy, Legal | $200+ |
| **SOC 2** | Personal/Financial | Global | DevSecOps, CISO (if >15 people) | $1,500+ |
| **FedRAMP** | Government | US Federal | Security, Compliance | $10,000+ |
| **FISMA** | Government | US Federal | CISO, Security | $5,000+ |
| **FERPA** | Student Records | US | Privacy | $300+ |
| **COPPA** | Children (<13) | US | Privacy, Legal | $500+ |

---

## Healthcare Standards (8 Standards)

### HIPAA (Health Insurance Portability and Accountability Act)

**Regions**: United States
**Data Types**: Protected Health Information (PHI) - medical records, health data, patient information

**When it applies**:
- Healthcare providers (hospitals, clinics, doctors)
- Health insurance companies
- Healthcare clearinghouses
- Business associates handling PHI (EMR vendors, billing services)

**Key Requirements**:
1. **BAA (Business Associate Agreement)** with all vendors handling PHI
2. **Encryption** at rest and in transit (AES-256, TLS 1.2+)
3. **Access controls** with MFA, role-based permissions
4. **Audit logging** of all PHI access (who, what, when)
5. **Data breach notification** within 60 days
6. **Patient rights**: Access, amendment, accounting of disclosures

**Team Impact**:
- **Auth Team** (1-2 engineers): MFA, RBAC, session management
- **Data Team** (1-2 engineers): Encryption, backups, data retention
- **DevSecOps** (1 engineer): Monitoring, audit logs, incident response

**Cost Estimate**: $3,000+/month minimum
- Compliance tools: $500/month (audit logging, encryption key management)
- BAAs with vendors: $200-$1,000/month (AWS, Twilio, SendGrid, etc.)
- Security audits: $10,000-$50,000/year (annual)
- HIPAA training: $1,000/year (required annually)

**Serverless Alternative**:
```
Use AWS (HIPAA-eligible services with BAA):
• Lambda + API Gateway (compute)
• RDS with encryption (database)
• S3 with encryption (storage)
• CloudTrail (audit logs)
• KMS (key management)

Savings: Easier compliance, AWS handles infrastructure security
Cost: Similar to traditional, but operational overhead reduced
```

---

### HITRUST (Health Information Trust Alliance)

**Regions**: United States, Global
**Data Types**: Healthcare, PHI

**When it applies**:
- Organizations needing to demonstrate HIPAA compliance
- Healthcare SaaS companies (EMR, telehealth, etc.)
- Healthcare partners requiring HITRUST certification

**Key Difference from HIPAA**: HITRUST is a **certification framework** that proves HIPAA compliance through independent audit.

**Requirements**:
- Everything from HIPAA, plus:
- Annual HITRUST CSF assessment
- Independent third-party audit
- Continuous monitoring and validation

**Cost Estimate**: $5,000+/month
- Initial assessment: $50,000-$150,000 (one-time)
- Annual re-certification: $30,000-$80,000/year
- Ongoing compliance: $2,000-$5,000/month

---

## Payment Standards (6 Standards)

### PCI-DSS (Payment Card Industry Data Security Standard)

**Regions**: Global
**Data Types**: Credit card data (PAN, CVV, expiration date)

**When it applies**:
- E-commerce sites accepting credit cards
- Payment processors
- Point-of-sale systems
- Any application storing/processing card data

**Key Requirements**:
1. **Never store CVV or full magnetic stripe data**
2. **Tokenization** of card data (use payment gateway tokens)
3. **Network segmentation** (cardholder data environment isolated)
4. **Quarterly vulnerability scans** (ASV approved vendor)
5. **Annual penetration testing**
6. **Strict access controls** with MFA

**Levels**:
- **Level 1**: 6M+ transactions/year - Annual on-site audit required
- **Level 2**: 1M-6M transactions/year - Annual self-assessment
- **Level 3**: 20K-1M transactions/year - Annual self-assessment
- **Level 4**: <20K transactions/year - Annual self-assessment

**Team Impact**:
- **Payments Team** (1-2 engineers): Tokenization, gateway integration
- **DevSecOps** (1 engineer): Network segmentation, vulnerability scans
- **Security auditor**: Annual compliance validation

**Cost Estimate**: $3,500+/month
- Level 4 (most common): $2,000-$5,000/year compliance
- Level 1: $50,000-$200,000/year compliance (audits, pen tests)
- Vulnerability scans: $200/month (quarterly)
- Tokenization service: $0.10-$0.30 per transaction

**Serverless Alternative (STRONGLY RECOMMENDED)**:
```
Use Stripe, PayPal, or Square:
• They handle PCI compliance entirely
• You never touch raw card data
• Tokens only (no PCI scope)
• Cost: 2.9% + $0.30 per transaction

Savings: $3,500/month compliance cost → $0
Trade-off: Transaction fees instead of fixed cost
Recommendation: Use payment gateway unless processing 100K+ transactions/month
```

---

### PSD2 (Payment Services Directive 2)

**Regions**: European Union
**Data Types**: Payment data, banking information

**When it applies**:
- Payment service providers in EU
- Banks offering APIs
- Fintech apps accessing bank accounts

**Key Requirements**:
- Strong Customer Authentication (SCA) - 2FA for payments
- Secure API communication
- Customer consent management
- Transaction monitoring

**Cost Estimate**: $1,000+/month (EU-specific compliance consulting)

---

## Privacy Standards (10 Standards)

### GDPR (General Data Protection Regulation)

**Regions**: European Union (applies to ANY company with EU users)
**Data Types**: Personal data (names, emails, IP addresses, behavioral data)

**When it applies**:
- **ANY** website/app with users in the EU
- Even if your company is US-based, if you have EU customers → GDPR applies

**Key Requirements**:
1. **Consent management**: Explicit opt-in (no pre-checked boxes)
2. **Right to access**: Users can download their data
3. **Right to deletion**: Users can request deletion ("right to be forgotten")
4. **Right to portability**: Users can move data to competitors
5. **Data breach notification**: Within 72 hours to authorities
6. **Privacy by design**: Default settings must be privacy-protective
7. **DPO (Data Protection Officer)**: Required if processing large amounts of data

**Team Impact**:
- **Privacy Engineer** (1 engineer): Consent, data access/deletion APIs
- **DPO** (1 person or external consultant): Compliance oversight
- **Legal**: Privacy policy, terms of service

**Cost Estimate**: $500+/month
- DPO: $500-$2,000/month (external consultant) or $100K/year (full-time)
- Consent management: $200/month (OneTrust, Cookiebot)
- Legal review: $5,000-$15,000 (one-time for privacy policy)

**Penalties**: Up to **€20M or 4% of global revenue**, whichever is higher (serious violations)

---

### CCPA (California Consumer Privacy Act)

**Regions**: California, United States
**Data Types**: Personal information (similar to GDPR but California only)

**When it applies**:
- Companies doing business in California with:
  - $25M+ annual revenue, OR
  - 50,000+ consumers/households/devices, OR
  - 50%+ revenue from selling personal info

**Key Requirements**:
- "Do Not Sell My Personal Information" opt-out
- Privacy policy disclosure
- Data access and deletion rights
- No discrimination for exercising privacy rights

**Cost Estimate**: $200+/month
- Privacy policy updates: $2,000-$5,000 (one-time)
- Opt-out mechanism: $100/month (consent management)
- Legal review: $3,000-$10,000

---

## Government Standards (7 Standards)

### FedRAMP (Federal Risk and Authorization Management Program)

**Regions**: United States (Federal Government)
**Data Types**: Government data (CUI - Controlled Unclassified Information)

**When it applies**:
- Cloud service providers selling to federal agencies
- SaaS products used by government

**Levels**:
- **Low**: Non-sensitive data
- **Moderate**: Most common (e.g., email, collaboration tools)
- **High**: National security data

**Key Requirements**:
- 325+ security controls
- Continuous monitoring
- Third-party assessment
- Annual re-authorization

**Cost Estimate**: $10,000+/month
- Initial authorization: $250,000-$1,500,000 (18-24 months)
- Ongoing monitoring: $10,000-$30,000/month
- Annual assessment: $100,000-$300,000

**Team Impact**: Requires dedicated **CISO** and **Security Team** (3-5 people)

---

### FISMA (Federal Information Security Management Act)

**Regions**: United States (Federal Government)
**Data Types**: Federal information systems

**Similar to FedRAMP** but for government-owned systems (not cloud services).

**Cost Estimate**: $5,000+/month (security controls, continuous monitoring)

---

### CMMC (Cybersecurity Maturity Model Certification)

**Regions**: United States (Department of Defense)
**Data Types**: CUI (Controlled Unclassified Information), FCI (Federal Contract Information)

**When it applies**:
- Defense contractors
- Subcontractors working on DOD projects

**Levels**:
- **Level 1**: Basic cybersecurity (17 practices)
- **Level 2**: Intermediate (110 practices) - Most common
- **Level 3**: Advanced (130 practices)

**Cost Estimate**: $5,000+/month for Level 2
- Initial assessment: $30,000-$100,000
- Ongoing compliance: $3,000-$10,000/month

---

## Education Standards (2 Standards)

### FERPA (Family Educational Rights and Privacy Act)

**Regions**: United States
**Data Types**: Student education records

**When it applies**:
- Schools, colleges, universities
- EdTech companies with student data

**Key Requirements**:
- Parental consent for disclosure
- Student access to their records
- Secure storage of education records

**Cost Estimate**: $300+/month (privacy controls, access management)

---

### COPPA (Children's Online Privacy Protection Act)

**Regions**: United States
**Data Types**: Data from children under 13

**When it applies**:
- Apps/websites directed at children <13
- Apps with actual knowledge of users <13

**Key Requirements**:
- Parental consent before collecting data
- Clear privacy policy
- Data minimization (collect only what's needed)
- No targeted advertising to children

**Cost Estimate**: $500+/month
- Parental consent mechanism: $500-$2,000/month
- Legal review: $5,000-$15,000
- Age verification: $200/month

---

## Financial Standards (3 Standards)

### GLBA (Gramm-Leach-Bliley Act)

**Regions**: United States
**Data Types**: Financial information (banks, insurance, investments)

**When it applies**:
- Banks, credit unions
- Insurance companies
- Investment firms

**Key Requirements**:
- Privacy notices
- Opt-out for information sharing
- Safeguards Rule (protect customer data)

**Cost Estimate**: $1,000+/month

---

### SOC 2 (Service Organization Control 2)

**Regions**: Global
**Data Types**: Personal data, financial data, any sensitive data

**When it applies**:
- SaaS companies
- Cloud service providers
- Any company handling customer data that needs to prove security

**Types**:
- **Type I**: Security controls exist (point-in-time)
- **Type II**: Security controls work over time (6-12 months)

**Trust Service Criteria**:
1. **Security**: Protection against unauthorized access
2. **Availability**: System uptime and performance
3. **Processing Integrity**: Data processing is complete and accurate
4. **Confidentiality**: Confidential data is protected
5. **Privacy**: Personal information is handled properly

**Team Impact**:
- **DevSecOps** (1 engineer): Monitoring, logging, incident response
- **CISO** (if >15 people): Security leadership
- **Auditor**: Annual SOC 2 audit

**Cost Estimate**: $1,500+/month
- Initial audit: $20,000-$100,000
- Annual re-audit: $15,000-$50,000
- Compliance tools: $500-$2,000/month (logging, monitoring)

---

## Infrastructure Standards (1 Standard)

### NERC-CIP (North American Electric Reliability Corporation - Critical Infrastructure Protection)

**Regions**: United States, Canada, Mexico
**Data Types**: Critical infrastructure (electric grid)

**When it applies**:
- Power generation facilities
- Transmission operators
- Control system vendors

**Cost Estimate**: $5,000+/month (specialized compliance consulting)

---

## How Strategic Init Uses This Data

### Detection Flow

1. **User answers**: "What data types will you handle?"
   - ☑ Personal user data
   - ☑ Healthcare records

2. **User answers**: "Where are your users?"
   - ☑ United States
   - ☑ European Union

3. **Strategic Init detects**:
   ```
   Personal data + EU → GDPR
   Personal data + US (California likely) → CCPA
   Healthcare + US → HIPAA, HITRUST
   ```

4. **Strategic Init calculates impact**:
   ```
   Team Requirements:
   • Auth Team (MFA, RBAC)
   • Data Team (Encryption, retention)
   • Privacy Engineer (GDPR compliance)
   • DPO (GDPR requirement)

   Cost Impact: $4,000+/month
   • HIPAA compliance: $3,000/month
   • GDPR (DPO + tools): $700/month
   • CCPA tools: $200/month
   ```

5. **Strategic Init recommends architecture**:
   ```
   Traditional architecture (not serverless)
   Rationale: HIPAA requires BAA, dedicated VPC, audit trails
   → Use AWS with HIPAA-eligible services
   ```

---

## Common Misconceptions

### "I need PCI-DSS because I accept payments"

**Wrong!** If you use Stripe, PayPal, or Square, **you do NOT need PCI-DSS compliance**. They handle compliance; you only deal with tokens.

### "GDPR only applies to EU companies"

**Wrong!** GDPR applies to **ANY** company with EU users, regardless of where the company is located.

### "HIPAA requires encryption"

**Partially wrong!** HIPAA requires encryption in transit (TLS 1.2+) but encryption at rest is "addressable" (recommended but not required). However, most auditors expect both.

### "SOC 2 is required for SaaS"

**Wrong!** SOC 2 is **voluntary** but enterprise customers often require it before signing contracts.

---

## Compliance Cost Calculator

Use this formula to estimate compliance costs:

```
Monthly Cost = Base + Per-Standard + Team

Base = $500 (compliance tools, monitoring)

Per-Standard:
• HIPAA = $3,000
• GDPR = $500
• PCI-DSS = $3,500 (or $0 if using payment gateway)
• SOC 2 = $1,500
• FedRAMP = $10,000

Team (if compliance requires):
• Auth Team = $200,000/year salary
• DPO = $500-$2,000/month (consultant) or $100K/year
• CISO = $150,000-$300,000/year (only if >15 people + SOC 2)
```

**Example**: Healthcare SaaS in US + EU
```
Base: $500
HIPAA: $3,000
GDPR: $500
Total: $4,000/month

Team: Auth (2 engineers), Data (1 engineer), DPO (consultant)
Total: ~$25K/month (salaries + consultant)
```

---

## Learn More

- [Strategic Init Guide](./strategic-init.md) - How compliance detection works
- [Team Recommendations](../internal/architecture/team-structure.md) - Compliance-driven team structures
- [Architecture Decisions](../internal/architecture/adr/) - How compliance affects architecture

---

**Need help understanding compliance requirements?** Run `specweave init` and answer the data type questions - Strategic Init will provide personalized recommendations!
