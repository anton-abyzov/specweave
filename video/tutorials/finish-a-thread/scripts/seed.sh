#!/bin/sh
# Seed one disposable take folder for finish-a-thread, with nothing linked into the owner's home.
#   home/greet-app   a clone of https://github.com/anton-abyzov/greet-app-demo (the shared demo repo; never re-initialised)
#   shim/scutil      ComputerName "Demo Mac", LocalHostName/HostName "demo-mac"
#   shim/specweave   the copied specweave 3.1.1 package on the copied node
#   home/.gitconfig  Demo User <demo@example.com>; credential helpers reset with an empty "helper =" line, then only
#                    git's in-memory credential cache (socket in the demo HOME), so no keychain helper ever runs
#   home/.codex      config.toml (file credential store) and AGENTS.md (global rules for the demo agent)
# Usage: seed.sh <take-dir> <root>       (<root> holds release/, tools/, specweave-pkg/)
set -eu
D="$1"; R="$2"
[ -e "$D/home/greet-app" ] && { echo "already seeded: $D" >&2; exit 1; }
mkdir -p "$D/home/.codex" "$D/studio" "$D/shim" "$D/tmp" "$D/out" "$D/secret" "$D/home/.git-credential-cache"
chmod 700 "$D/secret" "$D/home/.git-credential-cache"
cat > "$D/shim/scutil" <<'SH'
#!/bin/sh
if [ "${1:-}" = "--get" ]; then
  case "${2:-}" in
    ComputerName) echo "Demo Mac"; exit 0 ;;
    LocalHostName|HostName) echo "demo-mac"; exit 0 ;;
  esac
fi
exec /usr/sbin/scutil "$@"
SH
printf '#!/bin/sh\nexec %s/tools/node %s/specweave-pkg/node_modules/specweave/bin/specweave.js "$@"\n' "$R" "$R" > "$D/shim/specweave"
chmod 755 "$D/shim/scutil" "$D/shim/specweave"
P="$D/shim:$R/tools:/usr/bin:/bin:/usr/sbin:/sbin"
printf '# Demo HOME: shim first (Demo Mac, copied specweave), then the copied tools.\nexport PATH="%s"\n' "$P" > "$D/home/.zprofile"
cp "$D/home/.zprofile" "$D/home/.bash_profile"
cat > "$D/home/.gitconfig" <<GC
[user]
  name = Demo User
  email = demo@example.com
[init]
  defaultBranch = main
[credential]
  helper =
  helper = cache --timeout=21600 --socket=$D/home/.git-credential-cache/socket
[push]
  autoSetupRemote = true
GC
cat > "$D/home/.codex/config.toml" <<'TOML'
cli_auth_credentials_store = "file"
TOML
cat > "$D/home/.codex/AGENTS.md" <<'MD'
# Demo machine rules

- Work on the branch you are on. Never create, rename or switch branches.
- Never run `specweave handoff` and never push, unless the message you were given asks you to push.
- After `specweave task done`, commit the ledger and metadata changes it made, so the worktree is clean when you stop.
- Commit with the configured git identity only. Never add Co-authored-by, Generated-with or any other credit lines to commits or pull requests.
- Never run `gh auth` commands, never print environment variables, and never read credential files.
- When you push, use plain `git push`; credentials are already configured.
MD
E="env -i PATH=$P HOME=$D/home LANG=en_US.UTF-8 TMPDIR=$D/tmp GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0"
cd "$D/home"
$E git clone -q https://github.com/anton-abyzov/greet-app-demo.git greet-app
cd greet-app
$E git log --oneline -3
