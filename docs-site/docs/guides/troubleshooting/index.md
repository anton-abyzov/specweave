---
sidebar_position: 1
title: Troubleshooting
description: Guides for resolving common issues with SpecWeave
---

# Troubleshooting

When things go wrong, these guides help you get back on track.

## Quick Links

| Issue | Guide |
|-------|-------|
| Claude Code crashed/froze | [Emergency Recovery](./emergency-recovery) |
| Hook errors | [Emergency Recovery](./emergency-recovery#hook-specific-issues) |
| GitHub sync not working | [Emergency Recovery](./emergency-recovery#sync-issues) |
| Status line wrong | [Emergency Recovery](./emergency-recovery#status-line-issues) |

## Common Issues

### "Claude Code Keeps Crashing"

Most crashes are due to **context explosion**. See the [prevention strategies](./emergency-recovery#prevention-strategies).

Quick fix:
```bash
export SPECWEAVE_DISABLE_HOOKS=1
rm -f .specweave/state/.hook-*
```

### "Hooks Not Running"

Check if hooks are disabled:
```bash
echo $SPECWEAVE_DISABLE_HOOKS
# If "1", hooks are disabled

# Re-enable
unset SPECWEAVE_DISABLE_HOOKS
```

### "Sync Throttled"

SpecWeave limits API calls to prevent rate limiting. Wait 60 seconds or use `/sw:sync-progress` to force sync.

## Getting Help

1. Check this documentation
2. Search [GitHub Issues](https://github.com/spec-weave/specweave/issues)
3. Report new issues with:
   - SpecWeave version
   - Node.js version
   - Steps to reproduce
   - Error messages

## Related

- [Troubleshooting Lesson](/docs/academy/specweave-essentials/09-troubleshooting) - General troubleshooting guide
- [FAQ](/docs/faq) - Common questions answered
