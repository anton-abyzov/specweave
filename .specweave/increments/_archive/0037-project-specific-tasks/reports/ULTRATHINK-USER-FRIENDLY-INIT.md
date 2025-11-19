# ULTRATHINK: User-Friendly Init Questions

**Date**: 2025-11-15
**Context**: Making `specweave init` accessible to non-technical users
**Problem**: Architecture jargon (monolith/microservices/EDA) is confusing

---

## The Problem with Technical Jargon

### Current Proposed Questions (TOO TECHNICAL)

```
❌ Question: "What's your architecture pattern?"
   Options: Monolith / Microservices / EDA / Modular Monolith

❌ Question: "What's your repository strategy?"
   Options: Monorepo / Polyrepo / Multi-repo
```

**Issues**:
1. **Non-technical users**: PMs, solo developers, startups don't know these terms
2. **Overwhelming**: Too many options, unclear differences
3. **Confusing relationships**: Can microservices be in monorepo? (YES!)
4. **Premature decision**: Users may not know their architecture yet

---

## Architecture vs Repository Strategy (Research)

### Misconception: "Microservices = Polyrepo"

**Reality**: Architecture pattern and repository strategy are **independent**!

| Architecture | Repository Strategy | Example Companies |
|--------------|---------------------|-------------------|
| Microservices | **Monorepo** | Google, Meta, Microsoft, Uber |
| Microservices | **Polyrepo** | Netflix, Amazon, Spotify |
| Monolith | **Monorepo** | Most startups, Django projects |
| Monolith | **Polyrepo** | Rare (legacy systems) |
| EDA | **Monorepo** | LinkedIn, Airbnb (Kafka in monorepo) |
| EDA | **Polyrepo** | Event-driven systems with separate repos |

**Key Insight**: **Don't ask about architecture pattern at all! Just ask about projects and repositories.**

---

## User-Friendly Question Design

### Principle 1: Use Familiar Terms

| ❌ Technical Term | ✅ User-Friendly Term |
|------------------|----------------------|
| Microservices | Multiple services / Independent apps |
| Monolith | Single application |
| Polyrepo | Multiple repositories |
| Monorepo | One repository for everything |
| EDA | Event-based (too niche, don't ask) |

### Principle 2: Ask About Concrete Things

**Concrete**: "How many repositories do you have?"
**Abstract**: "What's your repository strategy?"

**Concrete**: "What are you building? (web app, mobile app, API)"
**Abstract**: "What's your architecture pattern?"

### Principle 3: Progressive Disclosure

Start with **1-2 essential questions**, ask more only if needed.

**Level 1 (Always)**:
- External tracker? (GitHub / Jira / ADO / None)

**Level 2 (Conditional)**:
- IF GitHub: "How many repositories?"
- IF Jira: "How many projects/teams?"

**Level 3 (Conditional)**:
- IF multiple repos/projects: "What are you building?"

---

## Recommended Init Flow

### Flow 1: GitHub User (Polyrepo)

```
SpecWeave: Welcome! Let's set up your project.

Question 1: Which issue tracker do you use?
  > GitHub Issues

Question 2: How many GitHub repositories will this project use?
  a) One repository (all code in one place)
  b) Multiple repositories (separate repos for different parts)
  > b) Multiple repositories

Question 3: What are you building? (helps us set up your projects)
  a) Web application (frontend + backend)
  b) Mobile app (iOS/Android + backend)
  c) Full-stack platform (web + mobile + backend)
  d) API service only
  e) Custom (I'll define my projects manually)
  > a) Web application

SpecWeave: Great! I'll create:
  ✅ Project "frontend" (React/Vue/Angular frontend)
  ✅ Project "backend" (Node.js/Python/Go backend)

  You can change these later with `specweave config projects`

Question 4: Do you have existing repositories or should I create them?
  a) I already have repositories (I'll link them)
  b) Create new repositories for me
  > a) I already have repositories

Question 5: Enter your frontend repository URL:
  > https://github.com/org/frontend

Question 6: Enter your backend repository URL:
  > https://github.com/org/backend

✅ Setup complete!

  Projects configured:
  - frontend (https://github.com/org/frontend)
  - backend (https://github.com/org/backend)

  Architecture detected: Multi-repository
  Next: Run `specweave increment "your feature"` to start planning
```

### Flow 2: GitHub User (Monorepo)

```
SpecWeave: Welcome! Let's set up your project.

Question 1: Which issue tracker do you use?
  > GitHub Issues

Question 2: How many GitHub repositories will this project use?
  a) One repository (all code in one place)
  b) Multiple repositories (separate repos for different parts)
  > a) One repository

Question 3: Does your project have multiple parts? (e.g., frontend and backend)
  a) No, just one application
  b) Yes, multiple parts (frontend, backend, etc.)
  > b) Yes, multiple parts

Question 4: What are you building?
  a) Web application (frontend + backend)
  b) Mobile app (iOS/Android + backend)
  c) Full-stack platform (web + mobile + backend)
  d) Custom (I'll define my projects manually)
  > a) Web application

SpecWeave: Great! I'll create:
  ✅ Project "frontend" (React/Vue/Angular frontend)
  ✅ Project "backend" (Node.js/Python/Go backend)

  All in one repository (monorepo)

Question 5: Enter your repository URL:
  > https://github.com/org/my-app

Question 6: Where are your projects located? (folder paths)
  Frontend folder: > apps/frontend
  Backend folder: > apps/backend

✅ Setup complete!

  Projects configured:
  - frontend (apps/frontend)
  - backend (apps/backend)

  Repository: https://github.com/org/my-app (monorepo)
  Architecture detected: Monorepo with multiple projects
  Next: Run `specweave increment "your feature"` to start planning
```

### Flow 3: Solo Developer (Single Project)

```
SpecWeave: Welcome! Let's set up your project.

Question 1: Which issue tracker do you use?
  > None (just local development)

Question 2: How many repositories will this project use?
  a) One repository (all code in one place)
  b) Multiple repositories (separate repos for different parts)
  > a) One repository

Question 3: Does your project have multiple parts? (e.g., frontend and backend)
  a) No, just one application
  b) Yes, multiple parts (frontend, backend, etc.)
  > a) No, just one application

✅ Setup complete!

  Projects configured:
  - main (single application)

  Architecture detected: Single project
  Note: You can add more projects later with `specweave config projects add`
  Next: Run `specweave increment "your feature"` to start planning
```

### Flow 4: Jira Enterprise User

```
SpecWeave: Welcome! Let's set up your project.

Question 1: Which issue tracker do you use?
  > Jira

Question 2: How is your team organized in Jira?
  a) One Jira project (all teams work together)
  b) Multiple Jira projects (different teams, different projects)
  > b) Multiple Jira projects

Question 3: How many teams/projects do you have?
  > 3

Question 4: Enter project names (comma-separated):
  > backend, frontend, mobile

For each project:
  Question 5a: Backend - Jira Project Key: > BACK
  Question 5b: Backend - Tech stack (optional): > Node.js, PostgreSQL

  Question 6a: Frontend - Jira Project Key: > FRONT
  Question 6b: Frontend - Tech stack (optional): > React, TypeScript

  Question 7a: Mobile - Jira Project Key: > MOB
  Question 7b: Mobile - Tech stack (optional): > React Native

✅ Setup complete!

  Projects configured:
  - backend (BACK) - Node.js, PostgreSQL
  - frontend (FRONT) - React, TypeScript
  - mobile (MOB) - React Native

  Architecture detected: Multi-project with Jira integration
  Next: Run `specweave increment "your feature"` to start planning
```

---

## Smart Defaults (Auto-Detection)

### Detect from Repository Structure

```typescript
// Auto-detect monorepo structure
async function detectMonorepoStructure(repoPath: string): Promise<Project[]> {
  const projects: Project[] = [];

  // Check for common monorepo patterns
  const patterns = [
    'apps/*',           // Nx, Turborepo
    'packages/*',       // Lerna, Yarn workspaces
    'services/*',       // Custom microservices
    'projects/*',       // Angular workspace
  ];

  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: repoPath });
    for (const match of matches) {
      const name = path.basename(match);
      const techStack = await detectTechStack(path.join(repoPath, match));

      projects.push({
        id: name,
        name: startCase(name),
        path: match,
        techStack
      });
    }
  }

  return projects;
}

// Auto-detect tech stack
async function detectTechStack(projectPath: string): Promise<string[]> {
  const techStack: string[] = [];

  if (await exists(path.join(projectPath, 'package.json'))) {
    const pkg = await readJSON(path.join(projectPath, 'package.json'));

    if (pkg.dependencies?.react) techStack.push('React');
    if (pkg.dependencies?.vue) techStack.push('Vue');
    if (pkg.dependencies?.angular) techStack.push('Angular');
    if (pkg.dependencies?.express) techStack.push('Express');
    if (pkg.dependencies?.['next']) techStack.push('Next.js');
  }

  if (await exists(path.join(projectPath, 'requirements.txt'))) {
    techStack.push('Python');
  }

  if (await exists(path.join(projectPath, 'go.mod'))) {
    techStack.push('Go');
  }

  return techStack;
}
```

### Detect from External Tracker

```typescript
// Auto-detect from GitHub organization
async function detectFromGitHub(orgName: string): Promise<{
  repos: Repository[];
  isMonorepo: boolean;
}> {
  const repos = await github.repos.listForOrg({ org: orgName });

  // If only 1 repo → likely monorepo
  if (repos.length === 1) {
    const projects = await detectMonorepoStructure(repos[0].clone_url);
    return {
      repos: [repos[0]],
      isMonorepo: true,
      projects
    };
  }

  // Multiple repos → polyrepo
  return {
    repos,
    isMonorepo: false,
    projects: repos.map(repo => ({
      id: repo.name,
      name: repo.name,
      repository: repo.html_url
    }))
  };
}

// Auto-detect from Jira
async function detectFromJira(jiraDomain: string): Promise<Project[]> {
  const projects = await jira.projects.getAllProjects();

  return projects.map(proj => ({
    id: proj.key.toLowerCase(),
    name: proj.name,
    jiraKey: proj.key
  }));
}
```

---

## Simplified Config Schema

### Minimal Config (Single Project)

```json
{
  "version": "2.0.0",
  "project": {
    "name": "my-app"
  },
  "externalTracker": "none",
  "projects": [
    {
      "id": "main",
      "name": "Main Application"
    }
  ]
}
```

### Monorepo Config (Multiple Projects)

```json
{
  "version": "2.0.0",
  "project": {
    "name": "my-platform"
  },
  "repository": {
    "type": "monorepo",
    "url": "https://github.com/org/my-platform"
  },
  "externalTracker": "github",
  "projects": [
    {
      "id": "frontend",
      "name": "Web Frontend",
      "path": "apps/frontend",
      "techStack": ["React", "TypeScript"]
    },
    {
      "id": "backend",
      "name": "API Backend",
      "path": "apps/backend",
      "techStack": ["Node.js", "PostgreSQL"]
    }
  ]
}
```

### Polyrepo Config (Multiple Repositories)

```json
{
  "version": "2.0.0",
  "project": {
    "name": "my-platform"
  },
  "repository": {
    "type": "polyrepo",
    "organization": "https://github.com/org"
  },
  "externalTracker": "github",
  "projects": [
    {
      "id": "frontend",
      "name": "Web Frontend",
      "repository": "https://github.com/org/frontend",
      "techStack": ["React", "TypeScript"]
    },
    {
      "id": "backend",
      "name": "API Backend",
      "repository": "https://github.com/org/backend",
      "techStack": ["Node.js", "PostgreSQL"]
    }
  ]
}
```

---

## Question Decision Tree

```
START
  ↓
[Q1] External tracker?
  ├─ None → Single project (DONE)
  ├─ GitHub → [Q2]
  ├─ Jira → [Q3]
  └─ ADO → [Q3]

[Q2] How many repositories?
  ├─ One → [Q4]
  └─ Multiple → [Q5]

[Q3] How many Jira projects?
  ├─ One → Single project (DONE)
  └─ Multiple → [Q6]

[Q4] Multiple parts in this repository?
  ├─ No → Single project (DONE)
  └─ Yes → [Q7] Auto-detect or manual?

[Q5] What are you building?
  ├─ Web app → Create frontend + backend
  ├─ Mobile app → Create mobile + backend
  ├─ Full-stack → Create frontend + backend + mobile
  └─ Custom → [Q8] Manual project definition

[Q6] Enter project names → Create projects (DONE)

[Q7] Auto-detect monorepo structure
  ├─ Success → Confirm detected projects (DONE)
  └─ Fail → [Q8] Manual definition

[Q8] Define projects manually
  ├─ Project name
  ├─ Tech stack (optional)
  └─ Path/URL
  → DONE
```

---

## Recommended Implementation

### Phase 1: Essential Questions Only

**Always Ask**:
1. External tracker? (GitHub / Jira / ADO / None)

**Conditionally Ask**:
2. IF GitHub: "How many repositories?"
3. IF multiple repos: "What are you building?" (preset options)
4. IF one repo: "Multiple parts?" (auto-detect or manual)

### Phase 2: Smart Defaults

**Auto-detect**:
- Monorepo structure (apps/*, packages/*)
- Tech stack (package.json, requirements.txt)
- GitHub organization repos
- Jira projects

### Phase 3: Allow Changes Later

```bash
# Change configuration anytime
specweave config projects add mobile
specweave config projects remove old-service
specweave config repository set-type monorepo
```

---

## Benefits of This Approach

### 1. **User-Friendly**
- No jargon (monolith, microservices, EDA)
- Concrete questions (repositories, projects)
- Familiar terms (web app, mobile app)

### 2. **Progressive Disclosure**
- Start with 1-2 questions
- Ask more only if needed
- Don't overwhelm users

### 3. **Smart Defaults**
- Auto-detect when possible
- Suggest based on external tracker
- Preset options for common use cases

### 4. **Flexible**
- Can change configuration later
- Not locked into early decisions
- Allow adding/removing projects

### 5. **Correct Architecture Detection**
- Polyrepo: Users explicitly choose multiple repos
- Monorepo: Users choose one repo + multiple parts
- Single project: Users choose no separation

---

## What NOT to Ask

### ❌ Don't Ask About Architecture Pattern

**Why**: Most users don't know or care about "monolith vs microservices"

**Instead**: Infer from repository count and project count
- 1 repo + 1 project = Monolith
- 1 repo + multiple projects = Modular monolith (monorepo)
- Multiple repos + multiple projects = Microservices (polyrepo)

### ❌ Don't Ask About "Repository Strategy"

**Why**: "Polyrepo" is jargon

**Instead**: Ask "How many repositories?" (concrete, clear)

### ❌ Don't Ask About EDA/Event-Driven Architecture

**Why**: Too niche, 99% of users don't use it

**Instead**: If they use Kafka, they'll mention it in tech stack

---

## Migration from Current Design

### Current (Technical)

```typescript
const pattern = await select({
  message: "What's your architecture pattern?",
  choices: [
    { name: "Monolith", value: "monolith" },
    { name: "Microservices", value: "microservices" },
    { name: "Event-Driven Architecture (EDA)", value: "eda" }
  ]
});
```

### New (User-Friendly)

```typescript
const repoCount = await select({
  message: "How many repositories will this project use?",
  choices: [
    {
      name: "One repository (all code in one place)",
      value: "monorepo",
      description: "Good for: Startups, small teams, shared codebase"
    },
    {
      name: "Multiple repositories (separate repos for different parts)",
      value: "polyrepo",
      description: "Good for: Multiple teams, independent deployments"
    }
  ]
});

if (repoCount === "monorepo") {
  const hasMultipleParts = await confirm({
    message: "Does your project have multiple parts? (e.g., frontend and backend)",
    default: false
  });

  if (hasMultipleParts) {
    const projectType = await select({
      message: "What are you building?",
      choices: [
        { name: "Web application (frontend + backend)", value: "web-app" },
        { name: "Mobile app (iOS/Android + backend)", value: "mobile-app" },
        { name: "Full-stack platform (web + mobile + backend)", value: "full-stack" },
        { name: "Custom (I'll define manually)", value: "custom" }
      ]
    });

    // Auto-create projects based on selection
    if (projectType === "web-app") {
      projects = [
        { id: "frontend", name: "Web Frontend" },
        { id: "backend", name: "API Backend" }
      ];
    }
  }
}
```

---

## Validation with Real Users

### Test Questions (Non-Technical)

Ask 10 users (mix of PMs, solo devs, junior devs):

1. **Test 1**: "What's your architecture pattern?"
   - Expected: Confusion, "I don't know"

2. **Test 2**: "How many repositories do you have?"
   - Expected: Clear answer, "One" or "Multiple"

3. **Test 3**: "What are you building?"
   - Expected: Clear answer, "Web app" or "Mobile app"

### Success Criteria

- **90%+ users** understand "How many repositories?"
- **<10% users** understand "Architecture pattern?"
- **<2 minutes** to complete init (vs 5+ minutes with technical questions)

---

## Conclusion

**Key Insight**: **Don't ask about architecture abstractions. Ask about concrete things users know: repositories, projects, what they're building.**

**Simplified Questions**:
1. External tracker? (GitHub / Jira / None)
2. How many repositories?
3. What are you building? (web app, mobile app, etc.)

**Auto-detect everything else**:
- Architecture pattern (inferred from repo count + project count)
- Monorepo structure (glob patterns)
- Tech stack (package.json, etc.)

**Result**:
- 2-3 questions instead of 5-7
- No jargon
- Clear, concrete questions
- Smart defaults
- Can change later

**The paradigm**: **Ask about the concrete (repositories, projects), infer the abstract (architecture pattern).**

---

**Status**: ✅ COMPLETE
**Next**: Update CONFIG-SCHEMA.md with user-friendly questions
**Next**: Update PM-AGENT-MULTI-PROJECT.md with auto-detection logic
