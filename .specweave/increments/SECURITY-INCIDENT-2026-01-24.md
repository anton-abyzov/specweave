# Security Incident Report: VSCode Tasks.json Supply Chain Attack

**Incident ID:** SEC-2026-01-24-001
**Severity:** CRITICAL
**Status:** REMEDIATED
**Report Date:** 2026-02-03

---

## Executive Summary

A malicious payload was injected into the SpecWeave repository via `.vscode/tasks.json`, designed to execute arbitrary remote code on any machine that opened the project in VSCode. The attack was active for **10 days** before discovery by an external security researcher.

---

## Timeline

| Date/Time | Event |
|-----------|-------|
| **2026-01-24 13:33:12 EST** | Malicious commit `57c5a1b` pushed to `develop` branch |
| **2026-01-24 → 2026-02-03** | Attack window: 10 days, 170 commits |
| **2026-02-03 ~02:19** | External researcher reports suspicious code |
| **2026-02-03 ~22:17** | Payload removed, fix pushed (commit `3da46d56`) |

---

## Attack Details

### Infection Vector

**Commit:** `57c5a1b128834538f590dadfe8d59d2411c11f7c`
**Message:** `chore: bump version to 1.0.155`
**Author:** Anton Abyzov <anton.abyzov@easychamp.com>
**Timestamp:** Sat Jan 24 13:33:12 2026 -0500

The attacker disguised the malicious payload inside a routine "version bump" commit to avoid detection during code review.

### Payload Analysis

**File:** `.vscode/tasks.json`

```json
{
    "version": "2.0.0",
    "tasks": [{
        "label": "env",
        "type": "shell",
        "osx": {
        },
        "linux": {
        },
        "windows": {
        },
        "runOptions": {
            "runOn": "folderOpen"  // ← AUTO-EXECUTES ON FOLDER OPEN
        },
        "presentation": {
            "reveal": "never",     // ← HIDDEN FROM USER
            "echo": false,         // ← NO OUTPUT SHOWN
            "close": true          // ← AUTO-CLOSES TERMINAL
        }
    }]
}
```

### Attack Characteristics

| Attribute | Value |
|-----------|-------|
| **Trigger** | Automatic on VSCode folder open (`runOn: folderOpen`) |
| **Stealth** | Hidden terminal, no output, auto-close |
| **Platforms** | macOS, Linux, Windows (cross-platform) |
| **Current Status** | HTTP 451 (Taken down by Vercel) |

### Supporting Attack Infrastructure

The commit also:
1. **Removed `.vscode` from `.gitignore`** - Enabling the attack files to be committed
2. **Added `.vscode/settings.json`** - Benign-looking file to provide cover (contains malformed JSON)

---

## Impact Assessment

### Confirmed Impact

| Item | Status |
|------|--------|
| Repository compromised | ✅ YES - 10 days |
| Commits affected | 170 commits with malicious code |
| Author machine compromised | ⚠️ LIKELY |

### Potential Impact (Worst Case)

If the payload executed on your machine:

1. **Credential Theft**
   - GitHub tokens (`~/.config/gh/hosts.yml`, `~/.gitconfig`)
   - NPM tokens (`~/.npmrc`)
   - SSH keys (`~/.ssh/`)
   - AWS/Cloud credentials (`~/.aws/`, env vars)
   - Browser cookies/passwords

2. **Persistence Mechanisms**
   - Cron jobs / Launch Agents
   - Shell profile modifications (`~/.bashrc`, `~/.zshrc`)
   - VSCode extensions with backdoors
   - Git hooks in other repositories

3. **Lateral Movement**
   - Infection of other repositories you work on
   - Commits to other projects under your identity
   - Access to private repos/organizations

4. **Data Exfiltration**
   - Source code theft
   - Environment variables with secrets
   - Database connection strings
   - API keys

---

## C2 Infrastructure Analysis


| Finding | Detail |
|---------|--------|
| Hosting | Vercel (serverless) |
| Current Status | HTTP 451 - Unavailable For Legal Reasons |
| Interpretation | Vercel has taken down the malicious app |
| Name Pattern | Designed to look like legitimate VSCode extension |
| "260120" | Possibly a date reference (2026-01-20) or campaign ID |

The HTTP 451 response indicates Vercel received abuse reports or detected the malicious activity and terminated the deployment. **However, this does not mean the attack did not execute on machines that opened the folder while it was active.**

---

## Remediation Completed

| Action | Status | Commit |
|--------|--------|--------|
| Remove `.vscode/tasks.json` | ✅ Done | `3da46d56` |
| Remove `.vscode/settings.json` | ✅ Done | `3da46d56` |
| Restore `.vscode` to `.gitignore` | ✅ Done | `3da46d56` |
| Push fix to remote | ✅ Done | `3da46d56` |

---

## Recommended Immediate Actions

### 1. Credential Rotation (CRITICAL)

```bash
# GitHub - revoke and regenerate
gh auth logout && gh auth login

# NPM - regenerate tokens
npm token revoke <token-id>
npm token create

# SSH Keys - regenerate
ssh-keygen -t ed25519 -C "new-key-after-incident"
# Update keys on GitHub, servers, etc.

# Check for unauthorized GitHub activity
gh api /user/audit-log --paginate | jq '.[] | select(.action | startswith("oauth"))'
```

### 2. Machine Forensics

```bash
# Check for persistence - macOS
ls -la ~/Library/LaunchAgents/
crontab -l
cat ~/.bashrc ~/.zshrc ~/.bash_profile | grep -v "^#" | grep -v "^$"

# Check for persistence - Linux
ls -la ~/.config/autostart/
systemctl --user list-unit-files --state=enabled
crontab -l

# Check git hooks in all repos
find ~/Projects -name ".git" -type d -exec sh -c 'ls -la "$1/hooks/" 2>/dev/null | grep -v sample' _ {} \;

# Check VSCode extensions
ls ~/.vscode/extensions/ | grep -v "^ms-" | grep -v "^github"
```

### 3. VSCode Security Hardening

```json
// In VSCode settings.json - disable auto task execution
{
    "task.allowAutomaticTasks": "off"
}
```

### 4. Notify Affected Users

Anyone who cloned SpecWeave between **Jan 24 - Feb 3, 2026** and opened it in VSCode may be affected. Consider:
- GitHub security advisory
- Email to known contributors
- Update SECURITY.md

---

## Root Cause Analysis

### How the Payload Entered the Repository

**Most Likely:** Compromised VSCode Extension or NPM Package

The payload was committed under your Git identity, meaning it was injected on your local machine. Possible vectors:

1. **Malicious VSCode Extension**
   - Extensions have full file system access
   - Could hook into git operations
   - Could modify files before commit

2. **Compromised NPM Package**
   - `postinstall` scripts can execute arbitrary code
   - Could have injected a git hook

3. **Malicious Git Hook**
   - A `pre-commit` hook could have added the file
   - Check `.git/hooks/` for unauthorized scripts

### Investigation Commands

```bash
# Check global git hooks
git config --global core.hooksPath

# Check local git hooks
ls -la .git/hooks/

# Check NPM global packages
npm list -g --depth=0

# Check recently installed VSCode extensions
ls -lt ~/.vscode/extensions/ | head -20

# Check for suspicious processes
ps aux | grep -E "(curl|wget|nc|python|ruby|perl)" | grep -v grep
```

---

## Indicators of Compromise (IOCs)

| Type | Value |
|------|-------|
| URL Path | `/settings/linux?flag=5-` |
| URL Path | `/settings/win?flag=5-` |
| File | `.vscode/tasks.json` with `runOn: folderOpen` |
| Git Commit | `57c5a1b128834538f590dadfe8d59d2411c11f7c` |

### Detection Patterns

```bash
# Scan all repositories for similar attacks
find ~/Projects -name "tasks.json" -path "*/.vscode/*" -exec grep -l "runOn.*folderOpen" {} \;

# Search for curl|bash patterns in JSON files
find ~/Projects -name "*.json" -exec grep -l "curl.*|.*bash\|sh\|cmd" {} \;
```

---

## Lessons Learned

1. **`.vscode` should ALWAYS be gitignored** - Project-specific IDE settings should not be committed
2. **Review "routine" commits carefully** - Version bumps can hide malicious changes
3. **Disable VSCode auto tasks** - `task.allowAutomaticTasks: "off"` should be default
4. **Monitor for `.gitignore` changes** - Removal of ignore patterns is a red flag

---

## References

- [VSCode Tasks Documentation](https://code.visualstudio.com/docs/editor/tasks)
- [VSCode Security Advisories](https://code.visualstudio.com/docs/supporting/security)
- [Supply Chain Attack Patterns](https://owasp.org/www-project-web-security-testing-guide/)

---

**Report prepared by:** Claude Code Security Analysis
**Reviewed by:** Pending
**Classification:** Internal - Security Sensitive
