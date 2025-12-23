#!/bin/bash
# increment-duplicate-guard.sh - DISABLED (v1.0.38)
#
# This guard was converted to WARNING-only in v1.0.37, and now completely
# disabled in v1.0.38 per user feedback: "you MUST NEVER block such operations"
#
# Duplicate detection should be handled by agents/scripts with proper business logic,
# not by hooks that can interfere with file operations.
#
# This guard now does NOTHING - just allows all operations.

set +e
echo '{"decision":"allow"}'
exit 0
