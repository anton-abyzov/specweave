---
sidebar_position: 5
title: "Part 4 → Part 5"
description: "From CLI to full-stack"
---

# Bridge: Quality → Full-Stack

**You've mastered CLI apps. Now let's build for the web.**

---

## What You Mastered in Part 4

| Skill | What You Learned |
|-------|------------------|
| ESLint | Enforce code quality rules |
| Prettier | Consistent formatting |
| TypeScript | Type safety |
| Pre-commit hooks | Automated checks |
| Quality gates | SpecWeave validation |

---

## What's Coming in Part 5

```
Part 4: "CLI application with quality tooling"
    ↓
Part 5: "Web application with frontend and backend"
```

You'll transform your task tracker into a web application.

---

## The Big Picture Shift

```
CLI Application:
┌────────────────────┐
│    Terminal        │
│    ↓               │
│    Node.js         │
│    ↓               │
│    File System     │
└────────────────────┘

Full-Stack Application:
┌────────────────────┐
│    Browser         │  ← React/Vue/Angular
│    ↓               │
│    HTTP API        │  ← Express/Fastify
│    ↓               │
│    Database        │  ← PostgreSQL/MongoDB
└────────────────────┘
```

Same logic, different architecture.

---

## Connection Points

### CLI Commands → API Endpoints

In Part 2-4, you had CLI commands:
```bash
node task.js add "Buy groceries"
node task.js list
node task.js complete 1
```

In Part 5, these become API endpoints:
```
POST /api/tasks        { "title": "Buy groceries" }
GET  /api/tasks
PUT  /api/tasks/1      { "completed": true }
```

**Same operations, accessible from anywhere.**

### File Storage → Database

In Part 2-4, you saved to JSON:
```javascript
await writeFile('tasks.json', JSON.stringify(tasks));
```

In Part 5, you'll use a database:
```javascript
await db.tasks.insert({ title, completed: false });
```

**Same data, better storage.**

### Tests → API Tests + Component Tests

In Part 3, you tested functions:
```javascript
it('should add task', () => {
  expect(addTask('Test')).toHaveProperty('id');
});
```

In Part 5, you'll test APIs and components:
```javascript
// API test
it('POST /api/tasks creates task', async () => {
  const res = await request(app).post('/api/tasks').send({ title: 'Test' });
  expect(res.status).toBe(201);
});

// Component test
it('TaskList renders tasks', () => {
  render(<TaskList tasks={[{ id: 1, title: 'Test' }]} />);
  expect(screen.getByText('Test')).toBeInTheDocument();
});
```

**Same testing skills, new contexts.**

---

## Self-Assessment

Before Part 5, you should be comfortable with:

- [ ] Writing and testing Node.js functions
- [ ] Understanding async/await
- [ ] Using TypeScript types
- [ ] Running quality checks (lint, format, test)
- [ ] Using SpecWeave for development

**Unsure about any of these?** Review Parts 2-4.

---

## Bridge Exercise

**Before starting Part 5, refactor your task tracker:**

Convert your CLI commands to functions that could work with any interface:

```javascript
// Before: CLI-coupled
export async function handleCommand(args) {
  if (args[0] === 'add') {
    const task = await addTask(args[1]);
    console.log(`Added: ${task.title}`);
  }
}

// After: Interface-agnostic
export async function createTask(title: string): Promise<Task> {
  // Pure business logic, no CLI concerns
  return await addTask(title);
}

// CLI layer calls this
// API layer calls this
// UI layer calls this
```

This separation makes full-stack easier.

---

## What Changes in Part 5

| Parts 2-4 | Part 5 |
|-----------|--------|
| Terminal interface | Browser interface |
| One user | Many users |
| Local file | Network database |
| Synchronous feel | Async everywhere |
| Run locally | Deploy to server |

---

## New Concepts Preview

### Backend (Express)

```javascript
import express from 'express';
const app = express();

app.get('/api/tasks', async (req, res) => {
  const tasks = await taskService.getAll();
  res.json(tasks);
});

app.post('/api/tasks', async (req, res) => {
  const task = await taskService.create(req.body);
  res.status(201).json(task);
});

app.listen(3000);
```

### Frontend (React)

```jsx
function TaskList() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(setTasks);
  }, []);

  return (
    <ul>
      {tasks.map(task => (
        <li key={task.id}>{task.title}</li>
      ))}
    </ul>
  );
}
```

### Database (Prisma)

```typescript
// Define schema
model Task {
  id        Int      @id @default(autoincrement())
  title     String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
}

// Use it
const tasks = await prisma.task.findMany();
```

---

## Architecture Preview

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  Pages  │→ │Components│→ │  API    │→ fetch()   │
│  └─────────┘  └─────────┘  └──Client─┘            │
└─────────────────────────────────────────────────────┘
                      ↓ HTTP
┌─────────────────────────────────────────────────────┐
│                    BACKEND                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ Routes  │→ │Services │→ │Database │→ prisma    │
│  └─────────┘  └─────────┘  └─────────┘            │
└─────────────────────────────────────────────────────┘
```

Your CLI logic becomes the **Services** layer.

---

## Skills You'll Reuse

| Part 2-4 Skill | Part 5 Application |
|----------------|-------------------|
| Async/await | API calls, database queries |
| Error handling | HTTP error responses |
| TypeScript | Shared types for frontend/backend |
| Testing | API tests, component tests |
| SpecWeave | Full-stack increments |

Everything you learned applies — you're just adding new layers.

---

## Ready?

→ [Start Part 5: Full-Stack](/docs/academy/part-5-full-stack/)
