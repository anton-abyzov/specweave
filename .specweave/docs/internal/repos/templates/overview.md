# templates

*Analyzed: 2025-12-10 | Confidence: low**

## Purpose

SpecWeave's templates module provides template-driven code and documentation generation using Handlebars templating engine. It supports generating Infrastructure as Code (Terraform), documentation (PRD/HLD/ADR/Spec/Runbook), testing scaffolds, and increment task management for spec-driven software development workflows.

## Key Concepts

- Handlebars templating engine
- Infrastructure as Code (IaC) generation
- PRD/HLD/ADR documentation pattern
- Increment-based task management
- Test-driven development scaffolds
- Multi-cloud serverless templates
- Coding standards generation
- Mermaid diagram templates
- C4 architecture model templates

## Patterns

- **Handlebars templating with custom helpers** (structure)
- **Infrastructure as Code generation for multi-cloud (AWS Lambda, Azure Functions, GCP Cloud Functions, Firebase, Supabase)** (cloud)
- **Terraform HCL generation with environment-specific tfvars** (deployment)
- **PRD/HLD/ADR/Spec/Runbook documentation framework** (structure)
- **Vitest unit testing framework with AAA pattern** (testing)
- **Playwright E2E testing templates** (testing)
- **C4 Model architecture diagrams with Mermaid** (architecture)
- **SRE incident response templates (runbooks, post-mortems)** (deployment)
- **Kafka producer/consumer templates (Node.js, Python)** (messaging)
- **Kubernetes manifests and Helm chart templates** (cloud)
- **React component and hook templates** (frontend)
- **Increment-based task management with US-AC traceability** (structure)
- **Code quality standards generation from codebase analysis** (testing)
- **Environment-specific deployment configurations** (deployment)
- **Template caching for performance optimization** (architecture)

## External Dependencies

- Handlebars (templating engine)
- Terraform (IaC target platform)
- AWS (Lambda, API Gateway, DynamoDB, CloudWatch)
- Azure (Functions)
- GCP (Cloud Functions)
- Firebase
- Supabase
- Vitest (test framework)
- Playwright (E2E testing)
- Mermaid (diagram rendering)
- Apache Kafka (messaging)

## Observations

- Templates module is the backbone of SpecWeave's code generation - generates IaC, documentation, tests, and project scaffolds
- Strong focus on spec-driven development with PRD→HLD→ADR→Spec→Runbook document lifecycle
- Multi-cloud support with unified template interface (AWS/Azure/GCP/Firebase/Supabase)
- Increment-based task management enforces User Story to Acceptance Criteria traceability
- Uses Handlebars helpers (snakeCase, tfList, tfMap) for Terraform naming conventions
- SRE templates include full incident response lifecycle (incident report → mitigation → post-mortem → runbook)
- Plugin architecture allows domain-specific templates (Kafka, Kubernetes, frontend) to extend core functionality
- Template caching mechanism improves performance for batch generation scenarios
- Testing templates follow industry best practices (AAA pattern, parametric tests, snapshot testing)
- Coding standards template auto-generates documentation from ESLint/Prettier/TypeScript config analysis