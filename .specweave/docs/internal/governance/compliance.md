# Compliance Guide

## Framework Compliance

SpecWeave framework itself is:
- ✅ MIT Licensed (permissive, commercial use OK)
- ✅ No data collection
- ✅ No telemetry (opt-in only)
- ✅ Open source (transparent)

## User Project Compliance

SpecWeave helps users build compliant systems:

### GDPR (EU Data Protection)

**Requirements**:
- Right to be forgotten
- Data portability
- Consent management
- Privacy by design

**SpecWeave Support**:
- `security` agent checks GDPR compliance
- Templates for privacy policies
- Data model validation

### HIPAA (Healthcare)

**Requirements**:
- PHI encryption at rest/transit
- Access controls
- Audit logs
- Business Associate Agreements

**SpecWeave Support**:
- Security architecture review
- Compliance documentation templates
- Audit trail generation

### SOC 2 (Security & Availability)

**Requirements**:
- Security policies
- Access controls
- Incident response
- Change management

**SpecWeave Support**:
- Policy templates in `governance/`
- Change management via git
- Incident response runbooks

### PCI-DSS (Payment Card)

**Requirements**:
- No storage of CVV
- Encryption of cardholder data
- Regular security testing
- Access controls

**SpecWeave Support**:
- Payment integration best practices
- Security testing via `security` agent
- Compliance checklists

## Compliance Templates

Location: `.specweave/docs/internal/governance/templates/`

- `gdpr-checklist.md`
- `hipaa-checklist.md`
- `soc2-checklist.md`
- `pci-dss-checklist.md`

## Audit Support

SpecWeave provides:
- Complete traceability (TC-0001 IDs)
- ADRs (architecture decisions)
- Change history (git commits)
- Test coverage reports
- Security review reports

## Related

- [Security Policy](security-policy.md)
- [Governance Index](index.md)
