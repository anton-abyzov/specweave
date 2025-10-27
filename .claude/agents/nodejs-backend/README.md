# nodejs-backend Skill

**Status**: To be developed
**Priority**: High

## Purpose

Backend implementation agent for Node.js/TypeScript projects

## Capabilities

- Create Express.js/Fastify/NestJS APIs
- Database integration (Prisma, TypeORM, Mongoose)
- Authentication/Authorization
- API endpoint implementation
- Middleware creation
- WebSocket/real-time features

## When to Use

Specified in tasks.md:
```markdown
**Agent**: nodejs-backend
**Skills**: api-design, database, authentication
```

## Example

```typescript
// Creates this based on task description
import { Router } from 'express';

export const subscriptionRouter = Router();

subscriptionRouter.post('/subscriptions', async (req, res) => {
  // Implementation from task description
});
```

---

**To implement**: See task in .specweave/increments/
