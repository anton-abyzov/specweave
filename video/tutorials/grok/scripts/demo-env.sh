#!/bin/sh
# Run a command inside a demo root's environment (clean env, demo HOME, scutil shim).
# Usage: demo-env.sh <demo-root> <command> [args...]   (runs in <demo-root>/home/greet-app)
set -eu
ROOT="$1"; shift
cd "$ROOT/home/greet-app"
exec env -i PATH="$ROOT/shim:$(dirname "$(command -v node)"):$(dirname "$(command -v grok)"):/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" \
  HOME="$ROOT/home" LANG=en_US.UTF-8 TMPDIR="$ROOT/tmp" SPECWEAVE_HOST=demo SPECWEAVE_TOOL=grok "$@"
