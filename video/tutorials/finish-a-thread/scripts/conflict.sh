#!/bin/sh
# Off camera: land one direct commit on main of anton-abyzov/greet-app-demo that changes the same line the thread is
# changing, so the thread's pull request conflicts. main is protected (required "test" check, admins included);
# protection's admin enforcement is switched off only for this push and switched straight back on.
# Usage: GH_TOKEN must NOT be needed here: the owner's gh (normal HOME) toggles protection; the push uses the take's
# in-memory credential cache.   conflict.sh <take-dir> <root> <change-script> <commit message>
set -eu
D="$1"; R="$2"; CHANGE="$3"; MSG="$4"
C="$R/conflict-clone"
P="$D/shim:$R/tools:/usr/bin:/bin"
E="env -i PATH=$P HOME=$D/home LANG=en_US.UTF-8 TMPDIR=$D/tmp GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0"
rm -rf "$C"
$E git clone -q https://github.com/anton-abyzov/greet-app-demo.git "$C"
cd "$C"
sh "$CHANGE" "$C"
$E node --test >/dev/null 2>&1 && echo "tests pass on the main change" || { echo "tests fail on the main change" >&2; exit 1; }
$E git add -A
$E git commit -q -m "$MSG"
/opt/homebrew/bin/gh api -X DELETE repos/anton-abyzov/greet-app-demo/branches/main/protection/enforce_admins >/dev/null
trap '/opt/homebrew/bin/gh api -X POST repos/anton-abyzov/greet-app-demo/branches/main/protection/enforce_admins --jq "\"admins enforced: \" + (.enabled|tostring)"' EXIT
$E git push -q origin HEAD:main 2>&1 | grep -v "^remote: *$\|Bypassed\|Required status\|^remote: -" || true
$E git log --format='%h %an <%ae> | %s' -1
