---
expected_type: team
expected_confidence: low
source: wiki
keywords_density: low
---

# Frequently Asked Questions

## General

### Q: What is this application?
A: It's a platform for managing user accounts and orders.

### Q: Who maintains this?
A: The engineering team maintains the codebase.

### Q: Where can I find documentation?
A: Check the wiki and Confluence pages.

## Technical

### Q: What database do we use?
A: PostgreSQL for primary data storage, Redis for caching.

### Q: What's the deployment process?
A: We use GitHub Actions for CI/CD and deploy to Kubernetes.

### Q: How do I run tests?
A: Run `npm test` for unit tests, `npm run test:e2e` for E2E tests.

### Q: Where are the logs?
A: Application logs are in CloudWatch, access logs in S3.

## Development

### Q: How do I set up my local environment?
A: Clone the repo, run `npm install`, copy `.env.example` to `.env`, run `docker-compose up`.

### Q: What IDE should I use?
A: Most team members use VS Code, but any IDE works.

### Q: How do I submit a PR?
A: Create a feature branch, make changes, push, create PR on GitHub.

## Troubleshooting

### Q: Application won't start locally
A: Check if port 3000 is available and database is running.

### Q: Tests are failing
A: Make sure dependencies are up to date with `npm install`.

### Q: Deploy failed
A: Check GitHub Actions logs for error details.

## Contact

For more questions, ask in #help Slack channel.
