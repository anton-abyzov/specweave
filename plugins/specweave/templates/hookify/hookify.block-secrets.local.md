---
name: block-hardcoded-secrets
enabled: true
event: file
action: block
conditions:
  - field: file_path
    operator: not_contains
    pattern: \.env
  - field: new_text
    operator: regex_match
    pattern: (sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|AKIA[A-Z0-9]{16}|xox[baprs]-[a-zA-Z0-9-]+)
---

**Potential secret detected in code!**

Never hardcode API keys or tokens in source files. Use:
- `.env` files (ensure added to .gitignore)
- Environment variables
- Secret management services (Vault, AWS Secrets Manager, etc.)

Detected patterns:
- OpenAI API keys (sk-...)
- GitHub Personal Access Tokens (ghp_...)
- AWS Access Key IDs (AKIA...)
- Slack tokens (xox...)
