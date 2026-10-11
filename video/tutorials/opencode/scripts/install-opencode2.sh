#!/bin/sh
# Install OpenCode 2 (npm @opencode/cli, the official package) into <demo>/tools, without
# install scripts, and link its macOS arm64 binary as <demo>/tools/bin/opencode.
# SpecWithCode 0.2.6 marks OpenCode 1.x "Limited support" and recommends >= 2.0.18.
# Usage: install-opencode2.sh <demo-dir> [version]
set -eu
DEMO="$1"; V="${2:-2.0.26}"
mkdir -p "$DEMO/tools/bin"; cd "$DEMO/tools"
[ -f package.json ] || echo '{"private":true}' > package.json
env -i PATH="$(dirname "$(command -v node)"):/usr/bin:/bin" HOME="$DEMO/home" \
  npm install --ignore-scripts --no-audit --no-fund "@opencode/cli@$V" >/dev/null
ln -sf "$DEMO/tools/node_modules/@opencode/cli-darwin-arm64/bin/opencode" "$DEMO/tools/bin/opencode"
"$DEMO/tools/bin/opencode" --version
