# init

*Analyzed: 2025-12-10 | Confidence: high**

## Purpose

A strategic project initialization framework that analyzes product vision, detects market categories, recommends team structures, calculates serverless cost savings, and generates architecture recommendations. It orchestrates a 6-phase research flow transforming product vision into optimal architecture decisions.

## Key Concepts

- Vision Analysis
- Market Category Detection
- Compliance Detection (HIPAA, PCI-DSS, SOC2, GDPR)
- Team Structure Recommendation
- Serverless Cost Savings Calculation
- Architecture Decision Engine
- Opportunity Scoring
- Competitor Analysis
- Adaptive Question Generation
- Repository Selection

## Patterns

- **Rule-Based Classification without LLM** (architecture)
- **Strategy Pattern for Team Recommendations** (architecture)
- **Factory Pattern for Question Generation** (architecture)
- **Caching with TTL** (data)
- **Zod Schema Validation** (data)
- **Domain-Driven Design with Value Objects** (architecture)
- **Weighted Scoring Algorithm** (architecture)
- **Configuration Object Pattern** (architecture)
- **Report Generator Pattern** (structure)
- **Static Configuration Database** (data)
- **Interactive CLI with Inquirer** (frontend)
- **Compliance-Driven Architecture Recommendations** (security)
- **Serverless Cost Optimization Analysis** (cloud)
- **Adaptive Questioning System** (architecture)
- **Multi-Repository Selection** (integration)

## External Dependencies

- @inquirer/prompts
- zod
- GitHub API (via GitHubAPIClient)

## Observations

- Architecture follows 'intelligence at spec-time' philosophy - business logic encoded in patterns rather than runtime LLM calls
- Comprehensive compliance coverage for healthcare (HIPAA), fintech (PCI-DSS, PSD2, SOX), and enterprise (SOC2, ISO27001, FedRAMP)
- Cloud credits tracking for AWS Activate, Google Cloud, and Azure programs by budget stage
- Team recommendations scale based on microservice count, team size thresholds (>15, >20, >30)
- Serverless vs traditional decision made algorithmically based on total savings threshold ($200 hybrid, $500 serverless)
- Market category detection uses dual-weight system with minimum confidence thresholds per category
- Research results persistable to .specweave/config.json via ConfigManager.updateResearch
- 6-phase flow: Vision → Scaling → Compliance → Budget → Methodology → Repository Selection
- Supports both Agile and Waterfall methodologies with SpecWeave increment mapping