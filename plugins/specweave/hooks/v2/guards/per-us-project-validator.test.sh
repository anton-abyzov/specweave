#!/bin/bash
# Comprehensive test suite for per-us-project-validator.sh
# Tests that each User Story in spec.md has **Project**: (and **Board**: for 2-level)
#
# Usage: bash per-us-project-validator.test.sh
#
# v0.34.0 - Initial test suite with all US formats

set -e

GUARD="$(dirname "$0")/per-us-project-validator.sh"
TEST_DIR=$(mktemp -d)
PASS=0
FAIL=0
TOTAL=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

# Test helper: should block
test_should_block() {
  local name="$1"
  local spec_content="$2"
  TOTAL=$((TOTAL + 1))

  local file_path="$TEST_DIR/.specweave/increments/0001-test/spec.md"
  mkdir -p "$(dirname "$file_path")"

  # Build JSON input for the guard
  # Use printf + jq -Rs to properly escape newlines in the content
  local json_input
  json_input=$(printf '%s' "$spec_content" | jq -Rs \
    --arg tool_name "Write" \
    --arg file_path "$file_path" \
    '{tool_name: $tool_name, tool_input: {file_path: $file_path, content: .}}')

  result=$(echo "$json_input" | bash "$GUARD" 2>&1; echo "EXIT:$?")
  exit_code=$(echo "$result" | grep -o 'EXIT:[0-9]*' | cut -d: -f2)

  if [[ "$exit_code" == "0" ]] && echo "$result" | grep -q '"decision".*"block"'; then
    echo -e "${GREEN}✓ BLOCKED${NC}: $name"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}✗ NOT BLOCKED${NC}: $name"
    echo "  Exit code: $exit_code"
    echo "  Result: $(echo "$result" | head -3)"
    FAIL=$((FAIL + 1))
  fi
}

# Test helper: should allow
test_should_allow() {
  local name="$1"
  local spec_content="$2"
  TOTAL=$((TOTAL + 1))

  local file_path="$TEST_DIR/.specweave/increments/0001-test/spec.md"
  mkdir -p "$(dirname "$file_path")"

  # Build JSON input for the guard
  # Use printf + jq -Rs to properly escape newlines in the content
  local json_input
  json_input=$(printf '%s' "$spec_content" | jq -Rs \
    --arg tool_name "Write" \
    --arg file_path "$file_path" \
    '{tool_name: $tool_name, tool_input: {file_path: $file_path, content: .}}')

  result=$(echo "$json_input" | bash "$GUARD" 2>&1; echo "EXIT:$?")
  exit_code=$(echo "$result" | grep -o 'EXIT:[0-9]*' | cut -d: -f2)

  if [[ "$exit_code" == "0" ]] && echo "$result" | grep -q '"decision".*"allow"'; then
    echo -e "${GREEN}✓ ALLOWED${NC}: $name"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}✗ WRONGLY BLOCKED${NC}: $name"
    echo "  Exit code: $exit_code"
    echo "  Result: $(echo "$result" | head -5)"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================"
echo "  PER-US PROJECT VALIDATOR - COMPREHENSIVE TESTS"
echo "========================================"
echo ""
echo "Test directory: $TEST_DIR"
echo ""

echo -e "${YELLOW}=== SIMPLE US FORMAT (### US-001:) ===${NC}"

test_should_allow "Simple US with Project field" '---
increment: 0001-test
project: my-app
---
# Feature

### US-001: Login Form
**Project**: frontend-app

**As a** user
**I want** to log in
**So that** I can access the app

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Form exists
'

test_should_block "Simple US WITHOUT Project field" '---
increment: 0001-test
project: my-app
---
# Feature

### US-001: Login Form

**As a** user
**I want** to log in
**So that** I can access the app
'

echo ""
echo -e "${YELLOW}=== MULTI-PROJECT US FORMAT (#### US-FE-001:) ===${NC}"

test_should_allow "Multi-project US-FE-001 with Project field" '---
increment: 0001-test
project: my-app
multi_project: true
---
# Feature

#### US-FE-001: Login Form UI
**Project**: frontend-app

**As a** user
**I want** to see a login form

#### US-BE-001: Auth API
**Project**: backend-api

**As a** frontend
**I want** auth endpoints
'

test_should_block "Multi-project US-FE-001 WITHOUT Project field" '---
increment: 0001-test
project: my-app
multi_project: true
---
# Feature

#### US-FE-001: Login Form UI

**As a** user
**I want** to see a login form
'

echo ""
echo -e "${YELLOW}=== MIXED FORMAT (### with prefixes) ===${NC}"

test_should_allow "Mixed: ### US-FE-001 with Project" '---
increment: 0001-test
project: my-app
---
# Feature

### US-FE-001: Frontend Story
**Project**: frontend

### US-BE-001: Backend Story
**Project**: backend
'

test_should_block "Mixed: ### US-FE-001 without Project" '---
increment: 0001-test
project: my-app
---
# Feature

### US-FE-001: Frontend Story

### US-BE-001: Backend Story
**Project**: backend
'

echo ""
echo -e "${YELLOW}=== SHARED PROJECT PREFIX ===${NC}"

test_should_allow "US-SHARED-001 with Project" '---
increment: 0001-test
project: my-app
---
# Feature

#### US-SHARED-001: Shared Types
**Project**: shared-lib

**As a** developer
**I want** shared types
'

test_should_block "US-SHARED-001 without Project" '---
increment: 0001-test
project: my-app
---
# Feature

#### US-SHARED-001: Shared Types

**As a** developer
**I want** shared types
'

echo ""
echo -e "${YELLOW}=== MULTIPLE PROJECTS (1:1 VIOLATION - COMMA SEPARATED) ===${NC}"

test_should_block "Multiple projects (comma separated) - FORBIDDEN" '---
increment: 0001-test
project: my-app
---
# Feature

### US-001: Cross-cutting Story
**Project**: frontend-app, backend-api

**As a** user
**I want** everything
'

test_should_block "Multiple projects with spaces" '---
increment: 0001-test
project: my-app
---
# Feature

### US-001: Cross-cutting Story
**Project**: frontend-app,backend-api,shared

**As a** user
**I want** everything
'

echo ""
echo -e "${YELLOW}=== NO USER STORIES (should allow) ===${NC}"

test_should_allow "Spec without any User Stories" '---
increment: 0001-test
project: my-app
---
# Feature Overview

This is just an overview document.

## Goals

- Goal 1
- Goal 2
'

test_should_allow "Tasks-only spec (no US headings)" '---
increment: 0001-test
project: my-app
---
# Implementation Tasks

## T-001: Setup

Do setup stuff.
'

echo ""
echo -e "${YELLOW}=== ALL USER STORIES HAVE PROJECT ===${NC}"

test_should_allow "Multiple US, all with Project" '---
increment: 0001-test
project: my-app
---
# Feature

### US-001: First Story
**Project**: app-a

### US-002: Second Story
**Project**: app-b

### US-003: Third Story
**Project**: app-c
'

test_should_block "Multiple US, one missing Project" '---
increment: 0001-test
project: my-app
---
# Feature

### US-001: First Story
**Project**: app-a

### US-002: Second Story

### US-003: Third Story
**Project**: app-c
'

echo ""
echo -e "${YELLOW}=== NON-WRITE TOOLS ===${NC}"

# Test with Edit tool (should allow - no full content)
TOTAL=$((TOTAL + 1))
json_input=$(jq -n \
  --arg tool_name "Edit" \
  --arg file_path "$TEST_DIR/.specweave/increments/0001-test/spec.md" \
  '{tool_name: $tool_name, tool_input: {file_path: $file_path}}')

result=$(echo "$json_input" | bash "$GUARD" 2>&1; echo "EXIT:$?")
exit_code=$(echo "$result" | grep -o 'EXIT:[0-9]*' | cut -d: -f2)
if [[ "$exit_code" == "0" ]]; then
  echo -e "${GREEN}✓ ALLOWED${NC}: Edit tool (no full content validation)"
  PASS=$((PASS + 1))
else
  echo -e "${RED}✗ FAILED${NC}: Edit tool should be allowed"
  FAIL=$((FAIL + 1))
fi

echo ""
echo -e "${YELLOW}=== BYPASS MODES ===${NC}"

# Test SPECWEAVE_FORCE_PROJECT bypass
TOTAL=$((TOTAL + 1))
spec_content='---
increment: 0001-test
---
### US-001: No Project
**As a** user
**I want** something
'
json_input=$(jq -n \
  --arg tool_name "Write" \
  --arg file_path "$TEST_DIR/.specweave/increments/0001-test/spec.md" \
  --arg content "$spec_content" \
  '{tool_name: $tool_name, tool_input: {file_path: $file_path, content: $content}}')

result=$(SPECWEAVE_FORCE_PROJECT=1 bash -c "echo '$json_input' | bash '$GUARD'" 2>&1; echo "EXIT:$?")
exit_code=$(echo "$result" | grep -o 'EXIT:[0-9]*' | cut -d: -f2)
if [[ "$exit_code" == "0" ]] && echo "$result" | grep -q "bypassed"; then
  echo -e "${GREEN}✓ ALLOWED (bypass)${NC}: SPECWEAVE_FORCE_PROJECT=1"
  PASS=$((PASS + 1))
else
  echo -e "${RED}✗ BYPASS FAILED${NC}: SPECWEAVE_FORCE_PROJECT=1"
  FAIL=$((FAIL + 1))
fi

# Test SPECWEAVE_LEGACY_SPEC bypass
TOTAL=$((TOTAL + 1))
result=$(SPECWEAVE_LEGACY_SPEC=1 bash -c "echo '$json_input' | bash '$GUARD'" 2>&1; echo "EXIT:$?")
exit_code=$(echo "$result" | grep -o 'EXIT:[0-9]*' | cut -d: -f2)
if [[ "$exit_code" == "0" ]] && echo "$result" | grep -q "legacy"; then
  echo -e "${GREEN}✓ ALLOWED (bypass)${NC}: SPECWEAVE_LEGACY_SPEC=1"
  PASS=$((PASS + 1))
else
  echo -e "${RED}✗ BYPASS FAILED${NC}: SPECWEAVE_LEGACY_SPEC=1"
  FAIL=$((FAIL + 1))
fi

echo ""
echo -e "${YELLOW}=== FILES OUTSIDE INCREMENTS ===${NC}"

# Test file outside increments folder
TOTAL=$((TOTAL + 1))
json_input=$(jq -n \
  --arg tool_name "Write" \
  --arg file_path "$TEST_DIR/other/spec.md" \
  --arg content "no project" \
  '{tool_name: $tool_name, tool_input: {file_path: $file_path, content: $content}}')

result=$(echo "$json_input" | bash "$GUARD" 2>&1; echo "EXIT:$?")
exit_code=$(echo "$result" | grep -o 'EXIT:[0-9]*' | cut -d: -f2)
if [[ "$exit_code" == "0" ]] && echo "$result" | grep -q '"decision".*"allow"'; then
  echo -e "${GREEN}✓ ALLOWED${NC}: spec.md outside increments folder"
  PASS=$((PASS + 1))
else
  echo -e "${RED}✗ FAILED${NC}: Files outside increments should be allowed"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "========================================"
echo "  RESULTS"
echo "========================================"
echo -e "Total: $TOTAL"
echo -e "${GREEN}Passed: $PASS${NC}"
if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}Failed: $FAIL${NC}"
  exit 1
else
  echo -e "Failed: 0"
  echo ""
  echo -e "${GREEN}ALL TESTS PASSED!${NC}"
fi
