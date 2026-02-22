#!/bin/bash
# spec-template-enforcement-guard.sh - DISABLED (v1.0.38)
#
# This guard was disabled in v1.0.38 per user feedback and error dashboard
# analysis showing 322+ false positive tool_failure errors across 92 sessions.
#
# The guard blocked legitimate spec.md writes when /sw:increment creates
# spec.md in a single pass (no template intermediate step).
#
# Sibling guards (spec-validation-guard.sh, increment-duplicate-guard.sh)
# were already disabled for the same reason.
#
# Spec template workflow should be encouraged via documentation and skill
# defaults, not enforced by hooks that block file operations.
#
# @since 1.0.167
# @disabled 1.0.38

set +e
echo '{"decision":"allow"}'
exit 0
