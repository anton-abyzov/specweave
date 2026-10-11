#!/bin/sh
# Make a disposable demo tree for one episode: home/greet-app (the SERIES.md seed,
# with specweave init), shim/scutil ("Demo Mac") and home/.zprofile (shim first on PATH).
# Usage: seed.sh <demo-dir> <seed-repo-with-"Initial greet-app"-commit>
# Runs specweave and git under env -i with the demo HOME, so no agent variables,
# global git config or hooks of this machine reach the repo.
set -eu
DEMO="$1"; SEED="$2"
NODE_DIR="$(dirname "$(command -v node)")"
OC_DIR="$(dirname "$(command -v opencode)")"
mkdir -p "$DEMO/home/greet-app" "$DEMO/shim" "$DEMO/tmp" "$DEMO/secret"; chmod 700 "$DEMO/secret"
cat > "$DEMO/shim/scutil" <<'SH'
#!/bin/sh
# Demo shim: SpecWithCode names this computer from scutil.
if [ "$1" = "--get" ]; then
  case "$2" in ComputerName) echo "Demo Mac"; exit 0;; LocalHostName|HostName) echo "demo-mac"; exit 0;; esac
fi
exec /usr/sbin/scutil "$@"
SH
chmod 755 "$DEMO/shim/scutil"
printf '# Demo HOME: the shim first, so SpecWithCode names this computer "Demo Mac"; then OpenCode 2.\nexport PATH="%s/shim:%s/tools/bin:%s:%s:$PATH"\n' "$DEMO" "$DEMO" "$NODE_DIR" "$OC_DIR" > "$DEMO/home/.zprofile"
INIT=$(git -C "$SEED" rev-list --max-parents=0 HEAD)
git -C "$SEED" archive "$INIT" | tar -x -C "$DEMO/home/greet-app"
E="env -i PATH=$NODE_DIR:/usr/bin:/bin:/usr/sbin:/sbin HOME=$DEMO/home LANG=en_US.UTF-8 TMPDIR=$DEMO/tmp GIT_CONFIG_NOSYSTEM=1"
cd "$DEMO/home/greet-app"
$E git init -q -b main
$E git config user.name "Demo User"; $E git config user.email demo@example.com
$E git add -A; $E git commit -q -m "Initial greet-app"
$E specweave init . --quick > "$DEMO/tmp/init.log" 2>&1
$E git add -A; $E git commit -q -m "Add SpecWeave"
$E git log --oneline
