/**
 * Integration Tests: Classification Accuracy
 * Coverage Target: 85%
 *
 * Tests classification accuracy with real-world-like document examples
 */

import { BrownfieldAnalyzer } from '../../src/core/brownfield/analyzer.js';
import { withTempDir } from '../../utils/temp-dir.js';
import fs from 'fs-extra';
import path from 'path';

describe('BrownfieldAnalyzer - Classification Accuracy (Integration)', () => {
  let analyzer: BrownfieldAnalyzer;

  beforeEach(() => {
    analyzer = new BrownfieldAnalyzer();
  });

  it('should correctly classify realistic spec documents', async () => {
    await withTempDir(async (tmpDir) => {
      // Create realistic spec documents
      await fs.writeFile(path.join(tmpDir, 'user-authentication.md'), `
# User Authentication Feature

## User Story
As a user, I want to log in with email and password so that I can access my account.

## Acceptance Criteria
- AC-1: User can log in with valid email and password
- AC-2: Invalid credentials show error message
- AC-3: Account locks after 5 failed attempts

## Requirements
- Functional requirement: Support email/password authentication
- Non-functional requirement: Login must complete within 2 seconds

## Epic
Part of Security Epic (EPIC-001)
`);

      await fs.writeFile(path.join(tmpDir, 'checkout-flow.md'), `
# E-commerce Checkout Flow

## Feature Description
As a customer, I want to complete my purchase so that I can receive my products.

## Given-When-Then Scenarios

**Scenario 1: Successful checkout**
- Given: User has items in cart
- When: User completes checkout
- Then: Order is created and confirmation sent

## Acceptance Criteria
- AC-1: User can add payment method
- AC-2: User can enter shipping address
- AC-3: Order confirmation email is sent
`);

      const result = await analyzer.analyze(tmpDir);

      // Verify both files classified as specs
      expect(result.specs.length).toBe(2);
      expect(result.specs[0].confidence).toBeGreaterThan(0.3); // Above threshold
      expect(result.specs[1].confidence).toBeGreaterThan(0.3);

      // Verify no misclassifications
      expect(result.modules.length).toBe(0);
      expect(result.team.length).toBe(0);
    });
  });

  it('should correctly classify realistic module documents', async () => {
    await withTempDir(async (tmpDir) => {
      // Create realistic module documents
      await fs.writeFile(path.join(tmpDir, 'auth-service.md'), `
# Authentication Service Module

## Component Architecture
The authentication service is a core component that handles user authentication.

## API Interface
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/status

## Design
The service uses JWT tokens for session management. Architecture follows microservices pattern.

## Domain Model
- User entity
- Session entity
- Token entity

## Technical Design
The module integrates with the identity provider service and uses bcrypt for password hashing.
`);

      await fs.writeFile(path.join(tmpDir, 'payment-integration.md'), `
# Payment Integration Module

## Component Description
This module provides the payment processing component for the e-commerce platform.

## API Design
The payment service exposes a RESTful API interface for payment operations.

## Architecture
The module follows the adapter pattern to support multiple payment providers.

## Domain Model
- Payment entity
- Transaction entity
- PaymentMethod entity

## Service Layer
Payment service handles all payment processing logic and integrates with Stripe API.
`);

      const result = await analyzer.analyze(tmpDir);

      // Verify both files classified as modules
      expect(result.modules.length).toBe(2);
      expect(result.modules[0].confidence).toBeGreaterThan(0.3); // Above threshold
      expect(result.modules[1].confidence).toBeGreaterThan(0.3);

      // Verify no misclassifications
      expect(result.specs.length).toBe(0);
      expect(result.team.length).toBe(0);
    });
  });

  it('should correctly classify realistic team documents', async () => {
    await withTempDir(async (tmpDir) => {
      // Create realistic team documents
      await fs.writeFile(path.join(tmpDir, 'onboarding-guide.md'), `
# Developer Onboarding Guide

## Getting Started
Welcome to the team! This guide will help you get set up.

## Setup Instructions
1. Clone the repository
2. Install dependencies
3. Run the development server

## Team Workflow
Our team follows the Git flow branching strategy and code review process.

## Conventions
We follow the Airbnb JavaScript style guide and use ESLint for linting.

## Best Practices
- Write tests for all new features
- Document public APIs
- Follow the coding standards
`);

      await fs.writeFile(path.join(tmpDir, 'team-playbook.md'), `
# Engineering Team Playbook

## Team Structure
Our engineering team consists of frontend, backend, and DevOps engineers.

## Development Process
We follow Agile methodology with 2-week sprints.

## Code Review Guidelines
All code must be reviewed by at least one team member before merging.

## Onboarding Process
New team members go through a 2-week onboarding program.

## Team Conventions
- Use meaningful commit messages
- Keep PRs small and focused
- Update documentation when making changes

## Collaboration Tools
We use Slack for communication and Jira for project management.
`);

      const result = await analyzer.analyze(tmpDir);

      // Verify files classified as team docs (at least 1, possibly 2)
      expect(result.team.length).toBeGreaterThanOrEqual(1);
      expect(result.team.length).toBeLessThanOrEqual(2);
      expect(result.team[0].confidence).toBeGreaterThan(0.3); // Above threshold
      if (result.team.length === 2) {
        expect(result.team[1].confidence).toBeGreaterThan(0.3);
      }

      // Verify no misclassifications
      expect(result.specs.length).toBe(0);
      expect(result.modules.length).toBe(0);
    });
  });

  it('should handle mixed content by selecting highest confidence category', async () => {
    await withTempDir(async (tmpDir) => {
      // Create file with both spec AND module keywords
      // Module keywords should dominate
      await fs.writeFile(path.join(tmpDir, 'mixed-heavy-module.md'), `
# Authentication System

This document describes the authentication module component architecture with API interface design.
The service follows a domain-driven design approach with a well-defined module structure.

The system also includes these features:
- User login (user story requirement)
- Session management

But primarily this is about the technical design, component architecture, API interface,
service layer, domain model, and system architecture.
`);

      // Create file with both spec AND team keywords
      // Spec keywords should dominate
      await fs.writeFile(path.join(tmpDir, 'mixed-heavy-spec.md'), `
# Team Login Feature

Our team needs a login feature. Here are the requirements:

User Story: As a user, I want to log in so that I can access my account.
Acceptance Criteria:
- AC-1: Valid credentials allow login
- AC-2: Invalid credentials show error

This feature is part of our onboarding process and follows team conventions.
But primarily this is a feature specification with requirements and acceptance criteria.
`);

      const result = await analyzer.analyze(tmpDir);

      // Verify classification based on dominant keywords
      expect(result.modules.length).toBe(1);
      expect(result.modules[0].relativePath).toContain('mixed-heavy-module.md');

      expect(result.specs.length).toBe(1);
      expect(result.specs[0].relativePath).toContain('mixed-heavy-spec.md');
    });
  });

  it('should handle boundary cases near 0.3 threshold', async () => {
    await withTempDir(async (tmpDir) => {
      // File with just enough keywords to exceed 0.3 threshold (should be spec)
      await fs.writeFile(path.join(tmpDir, 'borderline-spec.md'), `
# Login Feature

User story: User can log in with email and password.

Acceptance criteria:
- Valid credentials work
- Invalid credentials show error

Feature requirement specification: Support authentication. This is a spec document with requirements and acceptance criteria.
`);

      // File with insufficient keywords (should be legacy)
      await fs.writeFile(path.join(tmpDir, 'insufficient.md'), `
# Some Document

This is a document about the project. It has some content but no strong keywords.
`);

      const result = await analyzer.analyze(tmpDir);

      // Verify borderline file is classified
      expect(result.specs.length).toBe(1);
      expect(result.specs[0].relativePath).toContain('borderline-spec.md');
      expect(result.specs[0].confidence).toBeGreaterThan(0.3);
      expect(result.specs[0].confidence).toBeLessThan(0.7); // But not too high

      // Verify insufficient file is legacy
      expect(result.legacy.length).toBe(1);
      expect(result.legacy[0].relativePath).toContain('insufficient.md');
      expect(result.legacy[0].confidence).toBe(0);
    });
  });
});
