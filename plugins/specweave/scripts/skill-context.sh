#!/bin/sh
# skill-context.sh — Project context loader for DCI blocks
#
# Usage: .specweave/scripts/skill-context.sh [skill-name]
# Output: Key-value pairs grouped by section ([config], [project], [increment])
# Exit: Always 0 (graceful degradation)
#
# Performance: <100ms target. Single jq call for config, grep for metadata.
# Skill name argument is reserved for future skill-specific filtering.

CONFIG=".specweave/config.json"
HAS_JQ=false
command -v jq >/dev/null 2>&1 && HAS_JQ=true

# --- Parse all config values in ONE jq call ---
_test_mode="" _test_enforce="" _deep_interview="" _auto_max=""
_multi_project="" _org=""

if [ -f "$CONFIG" ]; then
  if $HAS_JQ; then
    _raw=$(jq -r '
      def v: if . == null then "" else tostring end;
      [
        (.testing.defaultTestMode | v),
        (.testing.tddEnforcement | v),
        (.planning.deepInterview.enabled | v),
        (.auto.maxRetries | v),
        (.multiProject.enabled | v),
        (.sync.github.owner | v)
      ] | join("|")
    ' "$CONFIG" 2>/dev/null) || _raw=""

    IFS='|' read -r _test_mode _test_enforce _deep_interview _auto_max _multi_project _org <<EOF
$_raw
EOF
  else
    # grep fallback (best-effort, no jq available)
    # sed strips key prefix, quotes, and whitespace to extract raw value
    _test_mode=$(grep -o '"defaultTestMode"[^,}]*' "$CONFIG" 2>/dev/null | head -1 | sed 's/[^:]*:[[:space:]]*//;s/^"//;s/"$//')
    _test_enforce=$(grep -o '"tddEnforcement"[^,}]*' "$CONFIG" 2>/dev/null | head -1 | sed 's/[^:]*:[[:space:]]*//;s/^"//;s/"$//')
    _auto_max=$(grep -o '"maxRetries"[^,}]*' "$CONFIG" 2>/dev/null | head -1 | sed 's/[^:]*:[[:space:]]*//;s/[^0-9]//g')
    _org=$(grep -o '"owner"[^,}]*' "$CONFIG" 2>/dev/null | head -1 | sed 's/[^:]*:[[:space:]]*//;s/^"//;s/"$//')
  fi
fi

# --- [config] section ---
emit_config() {
  [ -f "$CONFIG" ] || return 0

  echo "[config]"
  [ -n "$_test_mode" ] && echo "testing.mode=$_test_mode"
  [ -n "$_test_enforce" ] && echo "testing.enforcement=$_test_enforce"
  [ -n "$_deep_interview" ] && echo "planning.deepInterview=$_deep_interview"
  [ -n "$_auto_max" ] && echo "auto.maxIterations=$_auto_max"

  return 0
}

# --- [project] section ---
emit_project() {
  tech=""

  # Detect from filesystem markers (builtins only, no subprocesses)
  [ -f "package.json" ] && tech="${tech}node,"
  [ -f "tsconfig.json" ] && tech="${tech}typescript,"
  { [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; } && tech="${tech}python,"
  [ -f "go.mod" ] && tech="${tech}go,"
  [ -f "Cargo.toml" ] && tech="${tech}rust,"
  { [ -f "pom.xml" ] || [ -f "build.gradle" ]; } && tech="${tech}java,"

  # Shell glob for C# — no subprocess needed
  _saved="$1"
  set -- *.csproj *.sln
  [ -e "$1" ] && tech="${tech}csharp,"
  set -- "$_saved"

  # Detect React/Next/Vue from package.json (one grep each, fast)
  if [ -f "package.json" ]; then
    grep -q '"react"' package.json 2>/dev/null && tech="${tech}react,"
    grep -q '"next"' package.json 2>/dev/null && tech="${tech}nextjs,"
    grep -q '"vue"' package.json 2>/dev/null && tech="${tech}vue,"
  fi

  # Strip trailing comma
  tech="${tech%,}"

  # Use pre-parsed config values (no extra subprocess)
  multi="false"
  [ "$_multi_project" = "true" ] && multi="true"

  [ -z "$tech" ] && [ "$multi" = "false" ] && [ -z "$_org" ] && return 0

  echo "[project]"
  [ -n "$tech" ] && echo "tech=$tech"
  echo "multi-repo=$multi"
  [ -n "$_org" ] && echo "org=$_org"

  return 0
}

# --- [increment] section ---
emit_increment() {
  inc_dir=".specweave/increments"
  [ -d "$inc_dir" ] || return 0

  # Find active increment. Anchor grep to "status" field to avoid
  # false matches on previousStatus or other fields containing "in-progress".
  active=""
  for meta in "$inc_dir"/*/metadata.json; do
    [ -f "$meta" ] || continue
    if grep -q '^[[:space:]]*"status"[[:space:]]*:[[:space:]]*"in-progress"' "$meta" 2>/dev/null; then
      active=$(basename "$(dirname "$meta")")
      break
    fi
  done

  [ -z "$active" ] && return 0

  # Calculate completion from tasks.md
  completion=""
  tasks_file="$inc_dir/$active/tasks.md"
  if [ -f "$tasks_file" ]; then
    total=$(grep -c '^\- \[' "$tasks_file" 2>/dev/null) || true
    done_count=$(grep -c '^\- \[x\]' "$tasks_file" 2>/dev/null) || true
    total=${total:-0}
    done_count=${done_count:-0}
    if [ "$total" -gt 0 ] 2>/dev/null; then
      completion=$((done_count * 100 / total))
    fi
  fi

  echo "[increment]"
  echo "active=$active"
  echo "status=in-progress"
  [ -n "$completion" ] && echo "completion=${completion}%"

  return 0
}

# --- Main ---
emit_config
emit_project
emit_increment

exit 0
