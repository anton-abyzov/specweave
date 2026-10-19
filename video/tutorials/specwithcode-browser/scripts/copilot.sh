#!/bin/sh
# Install <demo>/tools/bin/copilot: runs the installed GitHub Copilot CLI with the real HOME, because
# Copilot keeps its GitHub sign-in in the login keychain and finds it from there. Nothing is copied.
# Usage: copilot.sh <demo-dir>
set -eu
DEST="$1/tools/bin/copilot"
NODE="$(command -v node)"
LOADER="$(dirname "$NODE")/../lib/node_modules/@github/copilot/npm-loader.js"
[ -f "$LOADER" ] || { echo "Copilot CLI not installed next to $NODE" >&2; exit 1; }
printf '#!/bin/sh\nHOME="%s" COPILOT_AUTO_UPDATE=false exec "%s" "%s" "$@"\n' "$HOME" "$NODE" "$LOADER" > "$DEST"
chmod 755 "$DEST"
echo "wrote $DEST"
