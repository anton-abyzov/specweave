---
sidebar_position: 2
title: Common Errors
description: Solutions to frequently encountered errors in development
---

# Common Errors Guide

When you encounter an error, search for it here first.

---

## Command Line Errors

### "command not found: node"

**Cause**: Node.js is not installed or not in PATH.

**Solution**:
```bash
# macOS (using Homebrew)
brew install node

# Windows (using Chocolatey)
choco install nodejs

# Linux (using nvm - recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts

# Verify installation
node --version
```

### "command not found: npm"

**Cause**: npm comes with Node.js. If missing, Node.js wasn't installed correctly.

**Solution**: Reinstall Node.js using the steps above.

### "command not found: npx"

**Cause**: npm version is too old (npx comes with npm 5.2+).

**Solution**:
```bash
npm install -g npm@latest
```

### "EACCES: permission denied"

**Cause**: Trying to install global packages without permission.

**Solution**:
```bash
# Option 1: Use nvm (recommended)
# nvm installs to user directory, no sudo needed

# Option 2: Fix npm permissions
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

---

## npm Errors

### "npm ERR! ERESOLVE unable to resolve dependency tree"

**Cause**: Conflicting peer dependencies.

**Solution**:
```bash
# Option 1: Use legacy peer deps
npm install --legacy-peer-deps

# Option 2: Force install (use with caution)
npm install --force

# Option 3: Update conflicting packages
npm update
```

### "npm ERR! code E404"

**Cause**: Package doesn't exist or is private.

**Solution**:
```bash
# Check package name spelling
npm search <package-name>

# If private package, login first
npm login
```

### "npm WARN deprecated"

**Cause**: Package is outdated but still works.

**Solution**:
```bash
# Check for updates
npm outdated

# Update specific package
npm update <package-name>

# Update all
npm update
```

### "Module not found: Can't resolve '...'"

**Cause**: Package not installed or wrong import path.

**Solution**:
```bash
# Install the missing package
npm install <package-name>

# If installed, check import path
# ❌ Wrong
import { something } from 'package'
# ✅ Correct
import { something } from 'package/dist/something'
```

---

## Git Errors

### "error: failed to push some refs"

**Cause**: Remote has changes you don't have locally.

**Solution**:
```bash
# Pull and rebase
git pull --rebase origin main

# If conflicts, resolve them, then:
git rebase --continue

# If you want to force (CAUTION: overwrites remote)
git push --force-with-lease
```

### "fatal: not a git repository"

**Cause**: Not inside a Git repository.

**Solution**:
```bash
# Initialize a new repo
git init

# Or clone an existing one
git clone <url>
```

### "Permission denied (publickey)"

**Cause**: SSH key not set up or not added to agent.

**Solution**:
```bash
# Generate SSH key if needed
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Add public key to GitHub/GitLab
cat ~/.ssh/id_ed25519.pub
# Copy output to your Git provider's settings
```

### "Your branch is behind 'origin/main'"

**Cause**: Remote has newer commits.

**Solution**:
```bash
# Fetch and merge
git pull origin main

# Or fetch and rebase (cleaner history)
git pull --rebase origin main
```

---

## TypeScript Errors

### "Cannot find module '...' or its corresponding type declarations"

**Cause**: Missing type definitions.

**Solution**:
```bash
# Install types package
npm install -D @types/package-name

# If no types exist, create declaration
# types/package-name.d.ts
declare module 'package-name';
```

### "Property '...' does not exist on type '...'"

**Cause**: TypeScript doesn't know about the property.

**Solution**:
```typescript
// Option 1: Add property to interface
interface User {
  name: string;
  customProperty: string;  // Add it
}

// Option 2: Use type assertion (less safe)
(user as any).customProperty

// Option 3: Check if property exists
if ('customProperty' in user) {
  console.log(user.customProperty);
}
```

### "Type 'X' is not assignable to type 'Y'"

**Cause**: Type mismatch.

**Solution**:
```typescript
// Check the types match
const value: string = 123;  // ❌ Error
const value: string = '123';  // ✅ Fixed

// Or use union types
const value: string | number = 123;  // ✅ OK
```

### "Object is possibly 'undefined'"

**Cause**: TypeScript protecting against null/undefined.

**Solution**:
```typescript
// Option 1: Optional chaining
const name = user?.profile?.name;

// Option 2: Nullish coalescing
const name = user?.name ?? 'Default';

// Option 3: Non-null assertion (if you're sure)
const name = user!.name;  // Use sparingly

// Option 4: Type guard
if (user) {
  console.log(user.name);
}
```

---

## React Errors

### "Objects are not valid as a React child"

**Cause**: Trying to render an object directly.

**Solution**:
```jsx
// ❌ Wrong
<div>{user}</div>

// ✅ Correct
<div>{user.name}</div>
// or
<div>{JSON.stringify(user)}</div>
```

### "Each child in a list should have a unique 'key' prop"

**Cause**: Missing key prop in list rendering.

**Solution**:
```jsx
// ❌ Wrong
{items.map(item => <Item data={item} />)}

// ✅ Correct
{items.map(item => <Item key={item.id} data={item} />)}
```

### "Too many re-renders"

**Cause**: State update in render causing infinite loop.

**Solution**:
```jsx
// ❌ Wrong: Updates on every render
function Component() {
  const [count, setCount] = useState(0);
  setCount(count + 1);  // Infinite loop!
  return <div>{count}</div>;
}

// ✅ Correct: Update in effect or event handler
function Component() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(c => c + 1);
  }, []);  // Only on mount

  return <div>{count}</div>;
}
```

### "Cannot update a component while rendering a different component"

**Cause**: Updating parent state from child render.

**Solution**:
```jsx
// ❌ Wrong: Update during render
function Child({ onUpdate }) {
  onUpdate(value);  // Called during render
  return <div>...</div>;
}

// ✅ Correct: Update in effect
function Child({ onUpdate }) {
  useEffect(() => {
    onUpdate(value);
  }, [value, onUpdate]);
  return <div>...</div>;
}
```

---

## Database Errors

### "ECONNREFUSED" (Connection refused)

**Cause**: Database server not running or wrong host/port.

**Solution**:
```bash
# Check if database is running
# PostgreSQL
pg_isready

# MySQL
mysqladmin ping

# Start database service
# macOS
brew services start postgresql
# or
brew services start mysql

# Linux
sudo systemctl start postgresql
# or
sudo systemctl start mysql
```

### "Access denied for user"

**Cause**: Wrong credentials or user doesn't exist.

**Solution**:
```bash
# Verify credentials in .env
DATABASE_URL=postgres://user:password@localhost:5432/dbname

# Create user if needed (PostgreSQL)
psql -U postgres
CREATE USER myuser WITH PASSWORD 'mypassword';
GRANT ALL PRIVILEGES ON DATABASE mydb TO myuser;
```

### "relation/table does not exist"

**Cause**: Table hasn't been created (migrations not run).

**Solution**:
```bash
# Run migrations
npx prisma migrate dev
# or
npx sequelize-cli db:migrate
# or
npm run migrate
```

---

## SpecWeave Errors

### "specweave: command not found"

**Cause**: SpecWeave not installed globally.

**Note**: SpecWeave runs through Claude Code, not as a CLI command.

**Solution**: Use SpecWeave commands within Claude Code:
```
/sw:increment "feature name"
```

### "No active increment found"

**Cause**: No increment is currently active.

**Solution**:
```
# Create new increment
/sw:increment "feature name"

# Or resume an existing one
/sw:resume 0001
```

### "Increment validation failed"

**Cause**: Not all quality gates passed.

**Solution**:
```
# Check what failed
/sw:validate 0001

# Common fixes:
# - Mark incomplete tasks as done
# - Run and pass tests
# - Sync documentation
/sw:sync-docs
```

### "GitHub sync failed"

**Cause**: Token not set or expired.

**Solution**:
```bash
# Check token is set
echo $GITHUB_TOKEN

# Set token
export GITHUB_TOKEN=ghp_xxxx

# Or add to .env
echo "GITHUB_TOKEN=ghp_xxxx" >> .env
```

---

## Quick Fixes Summary

| Error | Quick Fix |
|-------|-----------|
| "command not found" | Install the tool |
| "permission denied" | Use nvm or fix npm permissions |
| "ERESOLVE" | `npm install --legacy-peer-deps` |
| "Cannot find module" | `npm install <package>` |
| "failed to push" | `git pull --rebase` |
| "Type is not assignable" | Check type definitions |
| "Too many re-renders" | Move state update to useEffect |
| "ECONNREFUSED" | Start database service |

---

## Still Stuck?

1. **Copy the full error message**
2. **Search Google/Stack Overflow**
3. **Check package documentation**
4. **Ask in community (Discord, GitHub Issues)**

When reporting issues, include:
- Full error message
- Node/npm versions
- OS
- Steps to reproduce

---

## Related

- [Emergency Recovery](/docs/guides/troubleshooting/emergency-recovery)
- [SpecWeave FAQ](/docs/faq)
