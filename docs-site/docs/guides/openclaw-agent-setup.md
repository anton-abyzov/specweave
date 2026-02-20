# OpenClaw Agent Setup Guide

How to configure OpenClaw agents for maximum productivity — whether you're building software or managing marketing campaigns.

## Two Approaches, One Platform

OpenClaw supports two agent configurations. Choosing the right one depends on what the agent does.

### 1. Project Agents — For Development Work

When agents work on codebases (implementing features, fixing bugs, reviewing code), you don't need identity files or persona configurations. Instead, use a **thread-based setup**:

```
Conversation thread  →  agent
                          ├── working folder: /path/to/project
                          ├── skills: global + project-level
                          └── tools: browser profile, credentials
```

**How it works:**

1. Each conversation thread (e.g., in Slack) connects to an agent instance
2. The agent is bound to a **working folder** — the project it operates on
3. **Skills** load automatically — shared skills (available globally) and project-specific skills (from the project's configuration)
4. You give the agent a task: a description, a GitHub issue link, a Jira ticket, or an ADO work item
5. The agent works autonomously using all available skills

**Why this is better than per-person configuration:**

- No need to create identity files for each developer
- Skills are shared — one "backend development" skill works for everyone
- Switch projects by starting a new thread pointed at a different folder
- Same person, multiple projects, zero config duplication

**Example — multi-project team:**

| Thread | Agent | Working Folder | Skills |
|--------|-------|---------------|--------|
| #1 | Backend agent | `/repos/my-api/` | Global + project skills |
| #2 | Frontend agent | `/repos/my-app/` | Global + project skills |
| #3 | DevOps agent | `/repos/infra/` | Global + project skills |

All three agents use shared skills. No identity setup needed.

### 2. Role Agents — For Marketing, Content, Social Media

When the agent's **voice and personality** matter — writing copy, managing social accounts, creating content — use OpenClaw's built-in identity system:

- **Soul files** define the agent's personality and communication style
- **Identity configuration** maintains consistent brand voice
- **Persona settings** shape how the agent interacts

These agents don't need a fixed working folder. Their value comes from maintaining a consistent identity across interactions.

**Example — marketing team:**

| Agent | Identity | Skills |
|-------|----------|--------|
| Brand copywriter | Creative, on-brand voice | Marketing, copywriting |
| Social media manager | Casual, engaging tone | Social media, scheduling |
| Content strategist | Analytical, data-driven | Analytics, content planning |

## Setting Up Project Agents

### Step 1: Create a Connection

Set up your messaging integration (Slack, etc.) so each thread maps to an agent session.

### Step 2: Configure the Working Folder

Point the agent to the project directory. The agent starts here and has access to:
- Project source code
- Configuration files (including SpecWeave config if present)
- Project-specific skills that load automatically

### Step 3: Assign Tools

Tools handle environment-specific concerns:
- **Browser profiles** — pre-configured with saved passwords for relevant services
- **Service accounts** — API keys and tokens
- **External integrations** — Jira, GitHub, ADO connections

The agent invokes tools as needed. Credentials stay in the tool layer — the agent never sees raw passwords.

### Step 4: Give It Work

Drop a task into the thread:
- Plain text description
- Link to a GitHub issue
- Link to a Jira or ADO work item
- Reference to an existing SpecWeave increment

The agent picks it up and starts working.

## Skills: Global vs. Project-Level

**Global skills** are available to all agents across all projects:
- Marketing, analytics, social media
- General development patterns
- Common workflows

**Project-level skills** load from the project's configuration:
- Domain-specific workflows
- Project conventions and patterns
- Custom automation

This means a marketer working on three different projects uses the same global marketing skill — no need to train separate agents per project. Project-specific context comes from the working folder.

## When to Use Which

| Scenario | Agent Type | Why |
|----------|-----------|-----|
| Feature implementation | Project agent | Code context matters, identity doesn't |
| Bug fixing | Project agent | Needs codebase access, not personality |
| Code review | Project agent | Skills-based, folder-bound |
| Marketing copy | Role agent | Brand voice and tone matter |
| Social media posts | Role agent | Consistent personality across posts |
| Content strategy | Role agent | Analytical persona adds value |
| Customer communication | Role agent | Consistent, empathetic voice |

## Key Takeaway

```
Project agents  = working_folder + skills + tools        → no identity needed
Role agents     = identity + personality + skills + tools → identity IS the value
```

Keep them separate. Project agents should be lightweight and interchangeable. Role agents should be carefully crafted personas that maintain consistency.
