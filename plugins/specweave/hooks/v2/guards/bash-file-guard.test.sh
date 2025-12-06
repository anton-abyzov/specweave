#!/bin/bash
# Comprehensive test suite for bash-file-guard.sh
# Tests ALL dangerous patterns that could cause infinite hangs
#
# Usage: bash bash-file-guard.test.sh

set -e

GUARD="$(dirname "$0")/bash-file-guard.sh"
PASS=0
FAIL=0
TOTAL=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_should_block() {
  local name="$1"
  local command="$2"
  TOTAL=$((TOTAL + 1))

  # Properly escape the command for JSON: " becomes \"
  local escaped_command=$(echo "$command" | sed 's/"/\\"/g')
  result=$(echo "{\"command\": \"$escaped_command\"}" | bash "$GUARD" 2>&1; echo "EXIT:$?")
  exit_code=$(echo "$result" | grep -o 'EXIT:[0-9]*' | cut -d: -f2)

  if [[ "$exit_code" == "2" ]]; then
    echo -e "${GREEN}✓ BLOCKED${NC}: $name"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}✗ NOT BLOCKED${NC}: $name"
    echo "  Command: $command"
    echo "  Exit code: $exit_code (expected 2)"
    FAIL=$((FAIL + 1))
  fi
}

test_should_allow() {
  local name="$1"
  local command="$2"
  TOTAL=$((TOTAL + 1))

  # Properly escape the command for JSON: " becomes \"
  local escaped_command=$(echo "$command" | sed 's/"/\\"/g')
  result=$(echo "{\"command\": \"$escaped_command\"}" | bash "$GUARD" 2>&1; echo "EXIT:$?")
  exit_code=$(echo "$result" | grep -o 'EXIT:[0-9]*' | cut -d: -f2)

  if [[ "$exit_code" == "0" ]]; then
    echo -e "${GREEN}✓ ALLOWED${NC}: $name"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}✗ WRONGLY BLOCKED${NC}: $name"
    echo "  Command: $command"
    echo "  Exit code: $exit_code (expected 0)"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================"
echo "  BASH FILE GUARD - COMPREHENSIVE TESTS"
echo "========================================"
echo ""

echo -e "${YELLOW}=== HEREDOC PATTERNS (MOST DANGEROUS) ===${NC}"
test_should_block "Basic heredoc" "cat > file.txt << EOF"
test_should_block "Heredoc with quotes" "cat > file.txt << 'EOF'"
test_should_block "Heredoc double quotes" 'cat > file.txt << "EOF"'
test_should_block "Heredoc reversed order" "cat << EOF > file.txt"
test_should_block "Heredoc with END delimiter" "cat > file.txt << END"
test_should_block "Heredoc with CONTENT delimiter" "cat << CONTENT > out.md"
test_should_block "Heredoc with MARKER" "cat << MARKER"
test_should_block "Heredoc tab strip" "cat <<- EOF > file.txt"
test_should_block "Tee with heredoc" "tee file.txt << EOF"
test_should_block "Tee reversed" "tee << EOF > file.txt"
test_should_block "Heredoc with path" "cat > /tmp/test.md << EOF"
test_should_block "Heredoc with variable path" 'cat > $HOME/test.txt << EOF'

echo ""
echo -e "${YELLOW}=== ECHO PATTERNS ===${NC}"
test_should_block "Echo to file" "echo hello > file.txt"
test_should_block "Echo quoted string" 'echo "hello world" > file.txt'
test_should_block "Echo single quoted" "echo 'hello' > file.txt"
test_should_block "Echo with -e flag" "echo -e 'hello\\nworld' > file.txt"
test_should_block "Echo with -n flag" "echo -n 'hello' > file.txt"
test_should_block "Echo variable" 'echo $VAR > file.txt'
test_should_block "Echo to path" "echo content > /tmp/test.txt"

echo ""
echo -e "${YELLOW}=== PRINTF PATTERNS ===${NC}"
test_should_block "Printf to file" "printf hello > file.txt"
test_should_block "Printf format string" "printf '%s' hello > file.txt"
test_should_block "Printf with newline" "printf '%s\\n' hello > file.txt"
test_should_block "Printf quoted" 'printf "hello world" > file.txt'

echo ""
echo -e "${YELLOW}=== EDGE CASES - SHOULD BLOCK ===${NC}"
test_should_block "Cat stdin to file (dangerous!)" "cat > file.txt"
test_should_block "Bash -c with heredoc" "bash -c 'cat > f << EOF'"
test_should_block "Double redirect" "echo a > file.txt > backup.txt"
test_should_block "dd stdin to file" "dd if=/dev/stdin of=output.dat"
test_should_block "dd output file" "dd of=file.bin bs=1024"
test_should_block "dd with count" "dd of=output.img bs=512 count=100"
test_should_block "read to file" "read VAR > input.txt"
test_should_block "read prompt to file" 'read -p "Enter:" > log.txt'

echo ""
echo -e "${YELLOW}=== SAFE COMMANDS - SHOULD ALLOW ===${NC}"
test_should_allow "Git status" "git status"
test_should_allow "Git add" "git add ."
test_should_allow "Git commit" "git commit -m 'message'"
test_should_allow "Git push" "git push origin main"
test_should_allow "Git diff" "git diff HEAD"
test_should_allow "Npm install" "npm install"
test_should_allow "Npm run build" "npm run build"
test_should_allow "Npm test" "npm test"
test_should_allow "Mkdir" "mkdir -p /tmp/test"
test_should_allow "Ls" "ls -la"
test_should_allow "Pwd" "pwd"
test_should_allow "Cd" "cd /tmp"
test_should_allow "Rm file" "rm -f /tmp/test.txt"
test_should_allow "Mv file" "mv old.txt new.txt"
test_should_allow "Cp file" "cp source.txt dest.txt"
test_should_allow "Curl download" "curl -o file.txt https://example.com"
test_should_allow "Wget download" "wget -O file.txt https://example.com"
test_should_allow "Ps" "ps aux"
test_should_allow "Kill" "kill -9 1234"
test_should_allow "Grep" "grep pattern file.txt"
test_should_allow "Find" "find . -name '*.ts'"
test_should_allow "Chmod" "chmod +x script.sh"
test_should_allow "Node run" "node script.js"
test_should_allow "Python run" "python script.py"
test_should_allow "Read from file" "cat file.txt"
test_should_allow "Head" "head -n 10 file.txt"
test_should_allow "Tail" "tail -f log.txt"

echo ""
echo -e "${YELLOW}=== APPEND OPERATIONS (should allow) ===${NC}"
test_should_allow "Echo append" "echo hello >> file.txt"
test_should_allow "Printf append" "printf '%s' data >> file.txt"

echo ""
echo -e "${YELLOW}=== STREAM REDIRECTS (should allow) ===${NC}"
test_should_allow "Echo to stderr" "echo 'error' > /dev/stderr"
test_should_allow "Printf to stdout" "printf '%s' output > /dev/stdout"
test_should_allow "Echo to null" "echo 'discard' > /dev/null"

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
