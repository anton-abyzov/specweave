#!/bin/bash
# One-command specweave release, encoding the path that works under develop's
# branch protection: bump PR, wait for the release-relevant checks only, admin
# merge, tag the merge commit, watch release.yml, verify npm, the GitHub Release
# and the live docs site.
#
#   scripts/release/release.sh <patch|minor|major|prerelease|X.Y.Z> [--notes FILE] [--dry-run] [--no-browser]
#   scripts/release/release.sh tag <X.Y.Z>       resume: the release PR is merged, tag it
#   scripts/release/release.sh watch <X.Y.Z>     resume: the tag is pushed, watch and verify
#   scripts/release/release.sh verify <X.Y.Z> [--no-browser]
#
# The bump happens in a throwaway partial clone of develop holding only the
# files a bump touches, so your checkout is never modified; GitHub is reached
# over HTTPS only. --notes FILE replaces the generated CHANGELOG entry body
# (for example "### Fixed" plus bullets); without it the entry lists what
# landed since the last tag. --dry-run bumps and validates in the clone, prints
# the plan and pushes nothing.
#
# A full run takes about 6-8 minutes. A tool that caps one command at 10
# minutes should run it in the background, or run the tag/watch stages alone.
# Needs git, gh (logged in), node 22 and npm; the live-site browser check needs
# `npm ci` and `npx playwright install chromium` in this checkout, or
# --no-browser. Bash 3.2 compatible.
set -euo pipefail

REPO="anton-abyzov/specweave"
REMOTE="https://github.com/$REPO.git"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# Release-PR checks worth waiting for. The rest either cannot change the
# outcome of a version bump or do not trigger on one; release.yml itself
# refuses to publish unless Test & Validate passed on the released code.
REQUIRED_CHECKS="Version Alignment|Test & Validate"
OPTIONAL_CHECKS="Publish Guard"
BUMP_FILES="package.json package-lock.json CHANGELOG.md plugins/specweave/.claude-plugin/plugin.json .claude-plugin/marketplace.json"

DRY_RUN=false
BROWSER=true
NOTES=""
WORK=""
START=$(date +%s)
TMP_ROOT="${TMPDIR:-/tmp}"
TMP_ROOT="${TMP_ROOT%/}"

die() { echo "release: $*" >&2; exit 1; }
stage() { echo "==> [$(( $(date +%s) - START ))s] $*"; }
need() { command -v "$1" >/dev/null 2>&1 || die "$1 is required"; }

cleanup() {
  if [ -n "$WORK" ] && [ -d "$WORK" ]; then rm -rf "$WORK"; fi
}
trap cleanup EXIT

usage() {
  sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-1}"
}

is_version() {
  echo "$1" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'
}

is_prerelease() {
  case "${1%%+*}" in *-*) return 0 ;; *) return 1 ;; esac
}

preflight() {
  need git
  need gh
  need node
  need npm
  gh auth status -h github.com >/dev/null 2>&1 || die "gh is not logged in to github.com (gh auth login)"
  if [ "$BROWSER" = true ]; then
    node "$ROOT/docs-site/scripts/verify-live.mjs" --preflight >/dev/null 2>&1 \
      || die "the live-site browser check needs Playwright: run npm ci and npx playwright install chromium in $ROOT, or pass --no-browser"
  fi
}

# Partial, sparse clone of develop: commits and trees, and blobs only for the
# files a version bump reads or writes. About 3 s; removed on exit.
clone_develop() {
  WORK="$(mktemp -d "$TMP_ROOT/specweave-release.XXXXXX")"
  git clone -q --filter=blob:none --no-checkout --single-branch --branch develop "$REMOTE" "$WORK/repo"
  git -C "$WORK/repo" sparse-checkout set --no-cone \
    /package.json /package-lock.json /CHANGELOG.md /.npmrc \
    /scripts/build/ /scripts/validation/ /plugins/specweave/.claude-plugin/ /.claude-plugin/
  git -C "$WORK/repo" checkout -q develop
}

changelog_entry() { # <version> -> the entry body, as release.yml extracts it
  awk "/## \\[$1\\]/{flag=1; next} /^## \\[/{flag=0} flag" "$WORK/repo/CHANGELOG.md"
}

refuse_existing() { # <version>
  local v="$1"
  if [ -n "$(git ls-remote --tags "$REMOTE" "refs/tags/v$v")" ]; then die "tag v$v already exists"; fi
  if [ "$(npm view "specweave@$v" version 2>/dev/null || true)" = "$v" ]; then die "specweave@$v is already on npm"; fi
  if [ -n "$(git ls-remote --heads "$REMOTE" "refs/heads/cw/release-$v")" ]; then
    die "branch cw/release-$v already exists: merge or close its PR, then run: $0 tag $v"
  fi
}

bump() { # <spec>
  local spec="$1" current entry
  cd "$WORK/repo"
  current=$(node -p "require('./package.json').version")
  if [ "$spec" = "$current" ]; then die "develop is already at $current; if its release PR is merged, run: $0 tag $current"; fi
  # bump-version.sh runs `npm version --ignore-scripts=false` (.npmrc sets
  # ignore-scripts=true, and the `version` lifecycle must run: it writes the
  # CHANGELOG entry and stamps the plugin and marketplace manifests).
  if [ -f scripts/build/bump-version.sh ]; then
    bash scripts/build/bump-version.sh "$spec" >/dev/null
  else
    npm version "$spec" --no-git-tag-version --ignore-scripts=false >/dev/null
  fi
  VERSION=$(node -p "require('./package.json').version")
  if [ -n "$NOTES" ]; then
    node -e '
      const fs = require("fs");
      const [version, file] = process.argv.slice(1);
      const log = fs.readFileSync("CHANGELOG.md", "utf8");
      const heading = new RegExp("^## \\[" + version.replace(/[.+]/g, "\\$&") + "\\][^\\n]*\\n", "m").exec(log);
      if (!heading) throw new Error("no CHANGELOG entry for " + version);
      const start = heading.index + heading[0].length;
      const next = log.indexOf("\n## [", start);
      const notes = fs.readFileSync(file, "utf8").trim();
      fs.writeFileSync("CHANGELOG.md", log.slice(0, start) + "\n" + notes + "\n" + (next === -1 ? "" : log.slice(next)));
    ' "$VERSION" "$NOTES"
  fi
  node scripts/validation/validate-versions.cjs >/dev/null || die "version alignment failed after the bump"
  entry=$(changelog_entry "$VERSION")
  if ! echo "$entry" | grep -q '[^[:space:]]'; then die "the CHANGELOG entry for $VERSION is empty"; fi
  if echo "$entry" | grep -qx -- '- Patch release'; then
    if [ "$DRY_RUN" = true ]; then
      echo "warning: the CHANGELOG entry is the '- Patch release' placeholder (nothing landed since the last tag); release.yml would refuse it"
    else
      die "nothing landed since the last tag, so the CHANGELOG entry is only '- Patch release'; pass --notes FILE"
    fi
  fi
  stage "bumped $current -> $VERSION"
  git --no-pager diff HEAD --stat
  echo "--- CHANGELOG $VERSION"
  echo "$entry"
  echo "---"
}

# Prints ok, pending or "fail <details>" for the release PR's checks.
checks_state() { # <head sha> <in grace period: 1|0>
  gh run list -R "$REPO" --commit "$1" --event pull_request -L 50 --json name,status,conclusion,url \
    | node -e '
      const runs = JSON.parse(require("fs").readFileSync(0, "utf8"));
      const [required, optional, grace] = process.argv.slice(1);
      let pending = false;
      const failed = [];
      for (const [names, mandatory] of [[required, true], [optional, false]]) {
        for (const name of names.split("|").filter(Boolean)) {
          const latest = runs.find((run) => run.name === name);
          if (!latest) { if (mandatory || grace === "1") pending = true; continue; }
          if (latest.status !== "completed") pending = true;
          else if (latest.conclusion !== "success") failed.push(`${name} ${latest.conclusion} ${latest.url}`);
        }
      }
      console.log(failed.length ? "fail " + failed.join("; ") : pending ? "pending" : "ok");
    ' "$REQUIRED_CHECKS" "$OPTIONAL_CHECKS" "$2"
}

wait_for_checks() { # <head sha>
  local sha="$1" began state grace elapsed
  began=$(date +%s)
  while :; do
    elapsed=$(( $(date +%s) - began ))
    grace=0
    if [ "$elapsed" -lt 90 ]; then grace=1; fi
    # A transient gh or network error is retried, bounded by the 15 min limit.
    state=$(checks_state "$sha" "$grace") || state=pending
    case "$state" in
      ok) stage "release checks green: $REQUIRED_CHECKS|$OPTIONAL_CHECKS"; return 0 ;;
      fail*) die "release PR check failed: ${state#fail }" ;;
    esac
    if [ "$elapsed" -ge 900 ]; then die "release PR checks still pending after 15 min"; fi
    sleep 5
  done
}

tag_merge() { # <version> <merge sha>
  local v="$1" sha="$2" at
  git -C "$WORK/repo" fetch -q "$REMOTE" "+refs/heads/develop:refs/remotes/origin/develop"
  git -C "$WORK/repo" merge-base --is-ancestor "$sha" origin/develop || die "$sha is not on develop"
  at=$(git -C "$WORK/repo" show "$sha:package.json" | node -e 'console.log(JSON.parse(require("fs").readFileSync(0, "utf8")).version)')
  [ "$at" = "$v" ] || die "package.json at $sha is $at, not $v"
  git -C "$WORK/repo" tag -a "v$v" -m "v$v" "$sha"
  git -C "$WORK/repo" push -q "$REMOTE" "refs/tags/v$v"
  stage "tagged ${sha:0:9} as v$v"
  if [ -n "$(git ls-remote --heads "$REMOTE" "refs/heads/cw/release-$v")" ]; then
    git -C "$WORK/repo" push -q "$REMOTE" --delete "cw/release-$v"
  fi
}

# Latest develop docs deploy finished green, then the live pages check out.
# Runs in a subshell with explicit exits, so it behaves the same in the
# background and in an `||` context (where bash ignores set -e).
docs_check() { # <log file>
  local out="$1" shots
  shots="$TMP_ROOT/specweave-release-shots-$(date +%Y%m%d-%H%M%S)"
  (
    id=$(gh run list -R "$REPO" -w deploy-docs.yml -b develop -L 1 --json databaseId -q '.[0].databaseId // empty') \
      || { echo "could not list docs deploys"; exit 1; }
    if [ -n "$id" ]; then
      status=$(gh run view "$id" -R "$REPO" --json status -q .status) || { echo "could not read docs deploy $id"; exit 1; }
      if [ "$status" != "completed" ]; then
        echo "waiting for docs deploy $id"
        gh run watch "$id" -R "$REPO" --exit-status --compact --interval 10 >/dev/null || { echo "docs deploy $id failed"; exit 1; }
      fi
      conclusion=$(gh run view "$id" -R "$REPO" --json conclusion -q .conclusion) || { echo "could not read docs deploy $id"; exit 1; }
      [ "$conclusion" = "success" ] || { echo "latest develop docs deploy $id concluded $conclusion"; exit 1; }
      echo "docs deploy $id: success"
    fi
    if [ "$BROWSER" = true ]; then
      node "$ROOT/docs-site/scripts/verify-live.mjs" --browser --screenshots "$shots"
    else
      node "$ROOT/docs-site/scripts/verify-live.mjs"
    fi
  ) >"$out" 2>&1
}

verify_release() { # <version>
  local v="$1" published tag want draft
  published=$(npm view "specweave@$v" version 2>/dev/null || true)
  [ "$published" = "$v" ] || die "npm does not serve specweave@$v (got '${published}')"
  tag=latest
  if is_prerelease "$v"; then tag=next; fi
  want=$(npm view specweave "dist-tags.$tag" 2>/dev/null || true)
  [ "$want" = "$v" ] || die "npm dist-tag $tag is '$want', expected $v"
  draft=$(gh release view "v$v" -R "$REPO" --json isDraft -q .isDraft 2>/dev/null || echo missing)
  [ "$draft" = "false" ] || die "GitHub Release v$v is not published (isDraft: $draft)"
  stage "npm specweave@$v ($tag) and GitHub Release v$v verified"
  # release.yml already installed the published tarball into a clean
  # directory and checked `specweave --version`; no npx re-check needed.
}

watch_release() { # <version>
  local v="$1" id="" i docs_log docs_pid docs_status=0
  for i in $(seq 1 60); do
    id=$(gh run list -R "$REPO" -w release.yml --branch "v$v" -L 1 --json databaseId -q '.[0].databaseId // empty') || id=""
    if [ -n "$id" ]; then break; fi
    sleep 3
  done
  [ -n "$id" ] || die "no release.yml run for v$v after 3 min"
  stage "watching release.yml run $id (https://github.com/$REPO/actions/runs/$id)"
  # The docs check does not depend on the publish: overlap it with the run.
  docs_log="$(mktemp "$TMP_ROOT/specweave-docs-check.XXXXXX")"
  docs_check "$docs_log" &
  docs_pid=$!
  if ! gh run watch "$id" -R "$REPO" --exit-status --compact --interval 10; then
    wait "$docs_pid" || docs_status=$?
    die "release.yml run $id failed: gh run view $id -R $REPO --log-failed"
  fi
  wait "$docs_pid" || docs_status=$?
  cat "$docs_log"
  rm -f "$docs_log"
  verify_release "$v"
  [ "$docs_status" -eq 0 ] || die "live docs check failed (log above)"
  stage "released specweave $v"
}

cmd_verify() { # <version>
  local log status=0
  verify_release "$1"
  log="$(mktemp "$TMP_ROOT/specweave-docs-check.XXXXXX")"
  docs_check "$log" || status=$?
  cat "$log"
  rm -f "$log"
  [ "$status" -eq 0 ] || die "live docs check failed (log above)"
  stage "verified specweave $1"
}

cmd_tag() { # <version>
  local v="$1" pr sha
  pr=$(gh pr list -R "$REPO" --head "cw/release-$v" --state merged --json number -q '.[0].number // empty')
  [ -n "$pr" ] || die "no merged PR from cw/release-$v"
  sha=$(gh pr view "$pr" -R "$REPO" --json mergeCommit -q .mergeCommit.oid)
  clone_develop
  tag_merge "$v" "$sha"
  watch_release "$v"
}

cmd_release() { # <spec>
  local spec="$1" pr_url pr head merge
  if is_version "$spec"; then refuse_existing "$spec"; fi
  stage "cloning develop"
  clone_develop
  bump "$spec"
  if is_version "$spec"; then :; else refuse_existing "$VERSION"; fi
  if [ "$DRY_RUN" = true ]; then
    cat <<EOF
==> dry run: nothing pushed. A real run would now:
  1. commit "Release $VERSION" ($BUMP_FILES)
  2. push cw/release-$VERSION to $REMOTE and open a PR to develop
  3. wait for $REQUIRED_CHECKS (and $OPTIONAL_CHECKS if it runs)
  4. gh pr merge --merge --admin, then tag the merge commit v$VERSION and push the tag
  5. watch release.yml (it refuses to publish without green Test & Validate for the code)
  6. verify npm specweave@$VERSION, its dist-tag, the GitHub Release and the live docs site
EOF
    return 0
  fi
  cd "$WORK/repo"
  # shellcheck disable=SC2086
  git add $BUMP_FILES
  git commit -q -m "Release $VERSION"
  head=$(git rev-parse HEAD)
  git push -q "$REMOTE" "HEAD:refs/heads/cw/release-$VERSION"
  changelog_entry "$VERSION" >"$WORK/pr-body.md"
  pr_url=$(gh pr create -R "$REPO" -B develop -H "cw/release-$VERSION" -t "Release $VERSION" -F "$WORK/pr-body.md")
  pr="${pr_url##*/}"
  stage "opened $pr_url; waiting for the release checks"
  wait_for_checks "$head"
  # develop requires an approving review the owner cannot give himself, so
  # the release PR is an admin merge, as a merge commit (feature PRs squash).
  gh pr merge "$pr" -R "$REPO" --merge --admin
  merge=$(gh pr view "$pr" -R "$REPO" --json mergeCommit -q .mergeCommit.oid)
  [ -n "$merge" ] || die "PR #$pr has no merge commit"
  tag_merge "$VERSION" "$merge"
  watch_release "$VERSION"
}

main() {
  local cmd="" arg="" positional=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --dry-run) DRY_RUN=true ;;
      --no-browser) BROWSER=false ;;
      --notes)
        [ $# -ge 2 ] || die "--notes needs a file"
        NOTES="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
        [ -s "$NOTES" ] || die "notes file $2 is empty or missing"
        shift ;;
      -h|--help) usage 0 ;;
      -*) die "unknown option $1" ;;
      *)
        positional=$((positional + 1))
        if [ "$positional" -eq 1 ]; then cmd="$1"; elif [ "$positional" -eq 2 ]; then arg="$1"; else die "too many arguments"; fi ;;
    esac
    shift
  done
  [ -n "$cmd" ] || usage 1
  preflight
  case "$cmd" in
    tag|watch|verify)
      is_version "$arg" || die "$cmd needs a version X.Y.Z"
      case "$cmd" in
        tag) cmd_tag "$arg" ;;
        watch) watch_release "$arg" ;;
        verify) cmd_verify "$arg" ;;
      esac ;;
    patch|minor|major|prerelease) [ -z "$arg" ] || die "unexpected argument $arg"; cmd_release "$cmd" ;;
    *)
      is_version "$cmd" || die "unknown command or version: $cmd"
      [ -z "$arg" ] || die "unexpected argument $arg"
      cmd_release "$cmd" ;;
  esac
}

main "$@"
