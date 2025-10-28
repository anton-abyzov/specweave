# Internal Documentation

**IMPORTANT**: This documentation is for **SpecWeave framework developers** only. It is NOT published to the public documentation site.

## 5-Pillar Documentation Structure

### 1. Strategy (`strategy/`)
Business specifications (WHAT and WHY):
- Product vision and roadmap
- PRDs (Product Requirements Documents)
- User stories and acceptance criteria
- OKRs and success metrics
- Technology-agnostic requirements

### 2. Architecture (`architecture/`)
Technical documentation (HOW):
- System design and HLDs
- ADRs (Architecture Decision Records) in `adr/`
- Component diagrams (Mermaid) in `diagrams/`
- Data models and schemas
- API contracts and interfaces

### 3. Delivery (`delivery/`)
Project delivery and development:
- Roadmap and release plans
- CI/CD documentation
- Development guides in `guides/`
- Test strategies
- Sprint/increment planning

### 4. Operations (`operations/`)
Production operations:
- Runbooks in `runbooks/`
- SLOs and monitoring
- Incident response procedures
- Deployment guides
- Performance optimization

### 5. Governance (`governance/`)
Policies and compliance:
- Security policies
- Compliance documentation
- Change management
- Audit trails
- Access control policies

## Accessing Internal Docs

**Locally** (for framework development):
```bash
npm run docs:internal
```
This will start MkDocs server at http://localhost:8001

**Public Docs** (for SpecWeave users):
- Production: https://spec-weave.com
- Local: `npm run start` (runs at http://localhost:3000)

## Related Documentation

- [Public docs](../public/README.md) - Customer-facing documentation
- [CLAUDE.md](../../../CLAUDE.md#living-documentation-principles) - Documentation principles
