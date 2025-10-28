---
description: 🔥 Shorthand for /create-project - Initialize SpecWeave project (Alias)
---

# Initialize Project (Short Alias)

**⚡ Quick Alias**: This is a shorthand command for `/create-project`.

Use this when you want to quickly initialize a new SpecWeave project without typing the full command name.

---

## Full Command

For complete documentation, see `/create-project`.

This alias provides the exact same functionality as the full command.

---

## Usage

```bash
/init [project-name] [--type=<stack>]
```

**Examples**:
```bash
/init                           # Interactive prompts
/init my-saas                   # Auto-detect tech stack
/init my-api --type=python      # Specify Python
/init my-app --type=nextjs      # Specify Next.js
```

---

## What This Does

1. **Creates directory structure**:
   ```
   my-project/
   ├── .specweave/
   │   ├── config.yaml
   │   ├── docs/
   │   ├── increments/
   │   └── tests/
   ├── .claude/
   │   ├── commands/
   │   ├── skills/      # Auto-install on demand
   │   └── agents/      # Auto-install on demand
   ├── CLAUDE.md
   └── README.md
   ```

2. **Detects tech stack** (or uses `--type` flag):
   - TypeScript/JavaScript → Next.js, Node.js, React
   - Python → FastAPI, Django, Flask
   - Go → Gin, Echo, standard library
   - .NET → ASP.NET Core
   - Java → Spring Boot

3. **Auto-installs components** based on your first request:
   ```
   User: "Create Next.js authentication"

   📦 Installing required components...
      ✅ nextjs skill
      ✅ nodejs-backend skill
      ✅ security agent
      ✅ pm agent
   ```

4. **Initializes git** (if git available)

5. **Shows next steps**

---

## Tech Stack Detection

**Auto-detected from**:
- `package.json` (JavaScript/TypeScript)
- `requirements.txt`, `pyproject.toml` (Python)
- `go.mod` (Go)
- `*.csproj` (.NET)
- `pom.xml`, `build.gradle` (Java)

**Manual specification**:
```bash
/init --type=nextjs      # Next.js + TypeScript
/init --type=python      # Python (FastAPI default)
/init --type=django      # Django specifically
/init --type=dotnet      # ASP.NET Core
```

---

## After Initialization

**Start building immediately**:
```bash
cd my-project
/ci "User authentication"    # Create first increment
```

SpecWeave will:
1. Detect you need auth components
2. Auto-install: `security` agent, `nodejs-backend` skill
3. Generate specs, plan, tasks
4. Ready to implement!

---

## Other Useful Aliases

- `/ci` - Create increment (shorthand for `/create-increment`)
- `/si` - Start increment (shorthand for `/start-increment`)
- `/vi` - Validate increment (shorthand for `/validate-increment`)
- `/ls` - List increments (shorthand for `/list-increments`)

---

**💡 Tip**: No need to pre-install components - they install on-demand!
