# Architecture Decisions

## Testing Strategy

The project uses a three-tier testing pyramid:

1. **Unit tests** — Vitest with `vi.mock()` for dependency isolation. Coverage target: 90%+ for business logic modules. Tests are co-located with source files in `__tests__/` directories.

2. **Integration tests** — Supertest against an Express app instance with a test database. Each test suite gets a fresh schema via Prisma migrations. Auth tokens are mocked at the middleware level.

3. **E2E tests** — Playwright for critical user journeys. Tests run against a Docker Compose stack with seeded data. Visual regression snapshots are committed to the repo.

All tests run in CI via GitHub Actions. The pipeline gates merges on 85% overall coverage and zero Playwright failures.

## CI/CD Pipeline

Deployments follow a trunk-based model. Feature branches merge to `main` after passing CI. Production deploys happen automatically on merge via a Vercel + Railway pipeline.

Database migrations run as a pre-deploy hook. Rollback scripts are generated alongside each migration for emergency recovery.

## Module Structure

The codebase follows a layered architecture:
- `src/domain/` — pure business logic, no framework dependencies
- `src/infra/` — database adapters, external API clients
- `src/api/` — Express routes, middleware, request validation
- `src/ui/` — React components, pages, hooks
