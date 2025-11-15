# Jira Configuration Analysis - What's Wrong?

**Date**: 2025-11-10
**User**: antonabyzov
**Jira Instance**: https://antonabyzov.atlassian.net

---

## 🔴 THE PROBLEM

You configured SpecWeave with **project keys that don't exist** in your Jira instance!

---

## Configuration vs Reality

### What SpecWeave Thinks You Have

**`.env` file**:
```bash
JIRA_PROJECTS=FRONTEND,BACKEND,MOBILE
```

**`.specweave/config.json`**:
```json
{
  "sync": {
    "profiles": {
      "jira-default": {
        "config": {
          "domain": "antonabyzov.atlassian.net",
          "projects": ["FRONTEND", "BACKEND", "MOBILE"]
        }
      }
    }
  }
}
```

**What this means**: SpecWeave will try to sync to these 3 Jira projects:
- `FRONTEND` project
- `BACKEND` project
- `MOBILE` project

---

### What You Actually Have

**Your Jira URL**: https://antonabyzov.atlassian.net/jira/software/projects/SCRUM/boards/1

**Breakdown**:
- `antonabyzov.atlassian.net` ← Your Jira domain ✅ CORRECT
- `/jira/software/projects/SCRUM/` ← **Project key is "SCRUM"** (NOT "FRONTEND", "BACKEND", "MOBILE"!)
- `/boards/1` ← Board ID 1 (SpecWeave doesn't need this for project-per-team strategy)

**Reality**: You only have **ONE project** called **"SCRUM"**, not three projects!

---

## 📊 Jira Concepts Explained

### 1. Projects (Containers)

**What is a Jira Project?**
- A project is a **container** for issues (stories, tasks, bugs)
- Each project has a **unique project key** (e.g., "SCRUM", "PROJ", "MAIN")
- Project keys are **2-10 uppercase letters/numbers** (e.g., SCRUM, FE, BE, MOB)

**Your Setup**:
- You have **1 project**: `SCRUM`
- You configured SpecWeave with **3 non-existent projects**: `FRONTEND`, `BACKEND`, `MOBILE`

**Where to find projects**:
1. Go to: https://antonabyzov.atlassian.net/jira/settings/projects
2. Look for "Project key" column
3. That's your project key (e.g., "SCRUM")

---

### 2. Boards (Views)

**What is a Jira Board?**
- A board is a **view** of issues from one or more projects
- Boards show issues in columns (To Do, In Progress, Done)
- One project can have **multiple boards** (e.g., Sprint Board, Kanban Board)
- Multiple projects can share one board (not common)

**Your Setup**:
- You have Board ID 1 (visible in URL: `/boards/1`)
- This board shows issues from the **SCRUM project**

**Boards are NOT containers** - they're just filtered views!

---

### 3. SpecWeave Strategies

SpecWeave supports **3 Jira strategies**:

#### Strategy 1: Project-Per-Team (What you selected)

**Use when**: Different teams have **separate Jira projects**

**Example - Multi-Team Company**:
```
Company: Acme Corp
├── Frontend Team → FRONTEND project (key: FE)
├── Backend Team → BACKEND project (key: BE)
└── Mobile Team → MOBILE project (key: MOB)
```

**Config**:
```json
{
  "sync": {
    "profiles": {
      "jira-default": {
        "config": {
          "projects": ["FE", "BE", "MOB"]  // 3 separate projects
        }
      }
    }
  }
}
```

**When to use**: Large organizations with 3+ teams, each team has own project

---

#### Strategy 2: Component-Based (What you probably need!)

**Use when**: One team uses **ONE project** with components to organize work

**Example - Single Team Using Components**:
```
Project: SCRUM (key: SCRUM)
├── Component: Frontend (issues tagged with "Frontend" component)
├── Component: Backend (issues tagged with "Backend" component)
└── Component: Mobile (issues tagged with "Mobile" component)
```

**Config**:
```json
{
  "sync": {
    "profiles": {
      "jira-default": {
        "config": {
          "project": "SCRUM",  // Single project key
          "components": ["Frontend", "Backend", "Mobile"]  // Components within project
        }
      }
    }
  }
}
```

**When to use**: Small/medium teams, one project, organized by components

---

#### Strategy 3: Board-Based

**Use when**: You want to sync based on **boards** (less common)

**Example**:
```
Project: SCRUM (key: SCRUM)
├── Board 1: Sprint Board (active work)
├── Board 2: Backlog Board (future work)
└── Board 3: Bug Board (bugs only)
```

**Config**:
```json
{
  "sync": {
    "profiles": {
      "jira-default": {
        "config": {
          "project": "SCRUM",
          "boards": ["1", "2", "3"]  // Board IDs
        }
      }
    }
  }
}
```

**When to use**: Complex workflows, multiple boards per project

---

## 🎯 What You Should Do

### Option 1: Create the Missing Projects (Multi-Team Setup)

**If you want** separate projects for Frontend, Backend, Mobile:

1. Go to: https://antonabyzov.atlassian.net/jira/settings/projects
2. Click "Create project"
3. Create 3 new projects:
   - Project name: "Frontend", Key: `FRONTEND` or `FE`
   - Project name: "Backend", Key: `BACKEND` or `BE`
   - Project name: "Mobile", Key: `MOBILE` or `MOB`
4. Keep your current SpecWeave config (it's already correct!)

**Result**: SpecWeave will sync to 3 separate projects

---

### Option 2: Switch to Component-Based Strategy (Recommended!)

**If you want** to keep ONE project (SCRUM) and organize by components:

1. **Delete current config**:
   ```bash
   cd /Users/antonabyzov/Projects/github/sw-jira-fitness-tracker
   rm .env .specweave/config.json
   ```

2. **Re-run init**:
   ```bash
   cd /Users/antonabyzov/Projects/github
   specweave init sw-jira-fitness-tracker
   ```

3. **Select Component-Based strategy**:
   ```
   ✔ Which issue tracker? Jira
   ✔ Jira instance: Jira Cloud
   ✔ Team mapping strategy: Component-based  ← SELECT THIS!
   ✔ Project key: SCRUM  ← Your actual project key
   ✔ Components: Frontend,Backend,Mobile  ← Components within SCRUM
   ```

4. **New config** (`.specweave/config.json`):
   ```json
   {
     "sync": {
       "profiles": {
         "jira-default": {
           "config": {
             "domain": "antonabyzov.atlassian.net",
             "project": "SCRUM",  ← Single project
             "components": ["Frontend", "Backend", "Mobile"]  ← Components
           }
         }
       }
     }
   }
   ```

5. **Create components in Jira**:
   - Go to: https://antonabyzov.atlassian.net/jira/software/c/projects/SCRUM/settings/components
   - Click "Create component"
   - Add: Frontend, Backend, Mobile

**Result**: SpecWeave will sync to ONE project (SCRUM), organized by components

---

### Option 3: Use Board-Based Strategy (Advanced)

**If you want** to sync based on boards:

1. Follow same re-init process as Option 2
2. Select "Board-Based" strategy
3. Enter project key: `SCRUM`
4. Enter board IDs: `1` (or whatever boards you have)

**Result**: SpecWeave will sync to boards within SCRUM project

---

## 🔍 How to Find Your Project Key

**Method 1: URL Analysis**
```
https://antonabyzov.atlassian.net/jira/software/projects/SCRUM/boards/1
                                                          ^^^^^^
                                                          Project Key = SCRUM
```

**Method 2: Jira Settings**
1. Go to: https://antonabyzov.atlassian.net/jira/settings/projects
2. Look at "Key" column
3. Example: Project "Scrum" → Key "SCRUM"

**Method 3: Create Issue Screen**
1. Click "Create" button in Jira
2. Look at "Project" dropdown
3. Each project shows: `Name (KEY)`
4. Example: `Scrum (SCRUM)` → Key is "SCRUM"

---

## 📋 Summary Table

| Aspect | Your Config | Reality | Fix |
|--------|-------------|---------|-----|
| **Domain** | antonabyzov.atlassian.net | ✅ CORRECT | No change |
| **Strategy** | project-per-team | ❌ WRONG (you only have 1 project) | Switch to component-based |
| **Projects** | FRONTEND, BACKEND, MOBILE | ❌ DON'T EXIST | Use "SCRUM" instead |
| **Components** | None | ❌ MISSING | Create Frontend, Backend, Mobile components |

---

## 🎯 Recommended Fix (Step-by-Step)

**BEST OPTION**: Component-Based Strategy

```bash
# 1. Clean up
cd /Users/antonabyzov/Projects/github/sw-jira-fitness-tracker
rm .env .specweave/config.json

# 2. Re-initialize
cd /Users/antonabyzov/Projects/github
specweave init sw-jira-fitness-tracker

# 3. During init, select:
#    - Jira: Yes
#    - Instance: Jira Cloud
#    - Domain: antonabyzov.atlassian.net
#    - Email: anton.abyzov@gmail.com
#    - Token: (paste your API token)
#    - Strategy: Component-based  ← KEY CHANGE!
#    - Project key: SCRUM  ← Your actual project
#    - Components: Frontend,Backend,Mobile

# 4. Verify config
cat .specweave/config.json
# Should show:
#   "project": "SCRUM",
#   "components": ["Frontend", "Backend", "Mobile"]

# 5. Create components in Jira UI:
# Go to: https://antonabyzov.atlassian.net/jira/software/c/projects/SCRUM/settings/components
# Click "Create component" and add: Frontend, Backend, Mobile

# 6. Test sync
# Create an increment and verify it syncs to Jira SCRUM project!
```

---

## 🔗 Useful Jira Links for Your Instance

**Projects**:
- Project list: https://antonabyzov.atlassian.net/jira/settings/projects
- SCRUM project: https://antonabyzov.atlassian.net/jira/software/c/projects/SCRUM

**Boards**:
- Board 1: https://antonabyzov.atlassian.net/jira/software/c/projects/SCRUM/boards/1

**Components** (after switching to component-based):
- Component settings: https://antonabyzov.atlassian.net/jira/software/c/projects/SCRUM/settings/components

**Issues**:
- Create issue: https://antonabyzov.atlassian.net/secure/CreateIssue.jspa?pid=10000
- Browse issues: https://antonabyzov.atlassian.net/jira/software/c/projects/SCRUM/issues

---

## ❓ FAQ

**Q: Why did SpecWeave say "✅ Validated: Project 'FRONTEND' exists" if it doesn't exist?**

A: That's the bug we just fixed in v0.13.1! The OLD version would show confusing messages. With the NEW version (v0.13.1), if you run `specweave init` again, you'll get:

```
❌ Project "FRONTEND" does NOT exist!
❌ Project "BACKEND" does NOT exist!
❌ Project "MOBILE" does NOT exist!

Would you like to:
1. Create these projects automatically
2. Enter different project keys
3. Switch to component-based strategy
```

**Q: What's the difference between projects and boards?**

A:
- **Projects** = Containers (store issues permanently)
- **Boards** = Views (just show issues, don't store them)
- Analogy: Project = Filing cabinet, Board = Desk where you organize papers

**Q: Can I use all 3 strategies at once?**

A: No! Pick ONE strategy:
- **Project-per-team**: Multiple separate projects
- **Component-based**: One project, multiple components
- **Board-based**: One project, multiple boards

**Q: How do I know which strategy to use?**

A:
- **1-2 teams, <50 people**: Component-based (simplest!)
- **3+ teams, 50+ people**: Project-per-team (scalable!)
- **Complex workflows, strict boards**: Board-based (advanced!)

---

## 🎬 Next Steps

1. **Choose your strategy** (component-based recommended!)
2. **Re-run `specweave init`** with correct settings
3. **Verify config** matches your Jira reality
4. **Test sync** by creating an increment

---

**Need help?** Check:
- SpecWeave docs: https://spec-weave.com
- Jira API docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
- This analysis: `.specweave/increments/0019-jira-init-improvements/JIRA-CONFIGURATION-ANALYSIS.md`
