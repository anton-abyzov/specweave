#!/usr/bin/env bash
# ==============================================================================
# sw-media Provider Integration Test
# Tests all image and video generation providers for availability
# Usage: bash plugins/specweave-media/test-providers.sh
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTDIR="/tmp/sw-media-test-$(date +%s)"
mkdir -p "$OUTDIR"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0

# Load .env
if [ -f "$PROJECT_ROOT/.env" ]; then
  export $(grep -E '^(GEMINI_API_KEY|POLLINATIONS_API_KEY)=' "$PROJECT_ROOT/.env" 2>/dev/null | xargs) 2>/dev/null || true
fi

echo "=============================================="
echo "  sw-media Provider Integration Test"
echo "=============================================="
echo "Output dir: $OUTDIR"
echo "GEMINI_API_KEY: $([ -n "${GEMINI_API_KEY:-}" ] && echo "set (${#GEMINI_API_KEY} chars)" || echo "NOT SET")"
echo "POLLINATIONS_API_KEY: $([ -n "${POLLINATIONS_API_KEY:-}" ] && echo "set (${#POLLINATIONS_API_KEY} chars)" || echo "NOT SET")"
echo ""

# ==============================================================================
# Helpers
# ==============================================================================

report() {
  local status="$1" name="$2" detail="$3"
  case "$status" in
    PASS) echo -e "  ${GREEN}PASS${NC} $name - $detail"; PASS=$((PASS + 1)) ;;
    FAIL) echo -e "  ${RED}FAIL${NC} $name - $detail"; FAIL=$((FAIL + 1)) ;;
    SKIP) echo -e "  ${YELLOW}SKIP${NC} $name - $detail"; SKIP=$((SKIP + 1)) ;;
  esac
}

is_image() {
  [ -f "$1" ] && [ -s "$1" ] && file -b "$1" | grep -qiE "image|PNG|JPEG|GIF|WebP"
}

is_video() {
  [ -f "$1" ] && [ -s "$1" ] && file -b "$1" | grep -qiE "video|MP4|MPEG|ISO Media|QuickTime"
}

gemini_error() {
  python3 -c "import json; d=json.load(open('$1')); print(d.get('error',{}).get('message','unknown')[:120])" 2>/dev/null || echo "parse error"
}

# ==============================================================================
# IMAGE TESTS
# ==============================================================================

echo -e "${CYAN}--- Image Generation Tests ---${NC}"
echo ""

# --- Test 1: Gemini gemini-2.5-flash-image ---
TEST_NAME="Gemini gemini-2.5-flash-image"
if [ -n "${GEMINI_API_KEY:-}" ]; then
  TMP="$OUTDIR/t1-response.json"
  IMG="$OUTDIR/t1-image.png"

  HTTP=$(curl -s -w '%{http_code}' -o "$TMP" -X POST \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"contents":[{"parts":[{"text":"A golden soccer trophy on a green grass field, photorealistic"}]}],"generationConfig":{"responseModalities":["TEXT","IMAGE"]}}')

  if [ "$HTTP" = "200" ]; then
    python3 -c "
import json, base64, sys
with open('$TMP') as f: data = json.load(f)
if 'error' in data: sys.exit(1)
for c in data.get('candidates',[]):
    for p in c.get('content',{}).get('parts',[]):
        if 'inlineData' in p:
            with open('$IMG','wb') as f: f.write(base64.b64decode(p['inlineData']['data']))
            sys.exit(0)
sys.exit(1)" 2>/dev/null
    if is_image "$IMG"; then
      report PASS "$TEST_NAME" "Generated $(du -h "$IMG" | cut -f1)"
    else
      report FAIL "$TEST_NAME" "HTTP 200, no image: $(gemini_error "$TMP")"
    fi
  else
    report FAIL "$TEST_NAME" "$(gemini_error "$TMP")"
  fi
else
  report SKIP "$TEST_NAME" "GEMINI_API_KEY not set"
fi

# --- Test 2: Gemini gemini-3-pro-image-preview ---
TEST_NAME="Gemini gemini-3-pro-image-preview"
if [ -n "${GEMINI_API_KEY:-}" ]; then
  TMP="$OUTDIR/t2-response.json"
  IMG="$OUTDIR/t2-image.png"

  HTTP=$(curl -s -w '%{http_code}' -o "$TMP" -X POST \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"contents":[{"parts":[{"text":"A golden soccer trophy on a green grass field, photorealistic"}]}],"generationConfig":{"responseModalities":["TEXT","IMAGE"]}}')

  if [ "$HTTP" = "200" ]; then
    python3 -c "
import json, base64, sys
with open('$TMP') as f: data = json.load(f)
if 'error' in data: sys.exit(1)
for c in data.get('candidates',[]):
    for p in c.get('content',{}).get('parts',[]):
        if 'inlineData' in p:
            with open('$IMG','wb') as f: f.write(base64.b64decode(p['inlineData']['data']))
            sys.exit(0)
sys.exit(1)" 2>/dev/null
    if is_image "$IMG"; then
      report PASS "$TEST_NAME" "Generated $(du -h "$IMG" | cut -f1)"
    else
      report FAIL "$TEST_NAME" "HTTP 200, no image: $(gemini_error "$TMP")"
    fi
  else
    report FAIL "$TEST_NAME" "$(gemini_error "$TMP")"
  fi
else
  report SKIP "$TEST_NAME" "GEMINI_API_KEY not set"
fi

# --- Test 3: Pollinations.ai Image (authenticated) ---
TEST_NAME="Pollinations gen.pollinations.ai (auth)"
if [ -n "${POLLINATIONS_API_KEY:-}" ]; then
  IMG="$OUTDIR/t3-image.png"
  echo -n "  Testing Pollinations auth (30-60s)... "

  HTTP=$(curl -s -w '%{http_code}' -L --max-time 120 \
    -H "Authorization: Bearer $POLLINATIONS_API_KEY" \
    -o "$IMG" \
    "https://gen.pollinations.ai/image/A%20golden%20soccer%20trophy%20on%20green%20grass?model=flux&width=1024&height=1024&nologo=true")

  if is_image "$IMG"; then
    report PASS "$TEST_NAME" "Generated $(du -h "$IMG" | cut -f1)"
  else
    report FAIL "$TEST_NAME" "HTTP $HTTP, got: $(file -b "$IMG" 2>/dev/null || echo empty)"
  fi
else
  report SKIP "$TEST_NAME" "POLLINATIONS_API_KEY not set"
fi

# --- Test 4: Pollinations.ai Image (anonymous) ---
TEST_NAME="Pollinations image.pollinations.ai (anon)"
IMG="$OUTDIR/t4-image.png"
echo -n "  Testing Pollinations anonymous (30-60s)... "

HTTP=$(curl -s -w '%{http_code}' -L --max-time 120 \
  -o "$IMG" \
  "https://image.pollinations.ai/prompt/A%20golden%20soccer%20trophy%20on%20green%20grass?model=flux&width=512&height=512&nologo=true")

if is_image "$IMG"; then
  report PASS "$TEST_NAME" "Generated $(du -h "$IMG" | cut -f1)"
elif [ "$HTTP" = "502" ] || [ "$HTTP" = "503" ]; then
  report FAIL "$TEST_NAME" "Service down (HTTP $HTTP)"
else
  CONTENT=$(head -c 100 "$IMG" 2>/dev/null || echo "empty")
  report FAIL "$TEST_NAME" "HTTP $HTTP: $CONTENT"
fi

# --- Test 5: Imagen 4 (paid) ---
TEST_NAME="Imagen 4 (paid)"
if [ -n "${GEMINI_API_KEY:-}" ]; then
  TMP="$OUTDIR/t5-response.json"
  IMG="$OUTDIR/t5-image.png"

  HTTP=$(curl -s -w '%{http_code}' -o "$TMP" -X POST \
    "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"instances":[{"prompt":"A golden soccer trophy on a green grass field"}],"parameters":{"sampleCount":1}}')

  if [ "$HTTP" = "200" ]; then
    python3 -c "
import json, base64, sys
with open('$TMP') as f: data = json.load(f)
if 'predictions' in data:
    with open('$IMG','wb') as f: f.write(base64.b64decode(data['predictions'][0]['bytesBase64Encoded']))
    sys.exit(0)
sys.exit(1)" 2>/dev/null
    if is_image "$IMG"; then
      report PASS "$TEST_NAME" "Generated $(du -h "$IMG" | cut -f1)"
    else
      report FAIL "$TEST_NAME" "$(gemini_error "$TMP")"
    fi
  else
    report FAIL "$TEST_NAME" "$(gemini_error "$TMP")"
  fi
else
  report SKIP "$TEST_NAME" "GEMINI_API_KEY not set"
fi

echo ""

# ==============================================================================
# VIDEO TESTS (reachability only - actual generation is slow/costly)
# ==============================================================================

echo -e "${CYAN}--- Video Provider Reachability Tests ---${NC}"
echo "(Skipping actual generation - video is slow/costly)"
echo ""

# --- Test 6: Veo API reachability ---
TEST_NAME="Veo 3.1 API reachability"
if [ -n "${GEMINI_API_KEY:-}" ]; then
  TMP="$OUTDIR/t6-response.json"

  HTTP=$(curl -s -w '%{http_code}' -o "$TMP" -X POST \
    "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"instances":[{"prompt":"test"}]}')

  if [ "$HTTP" = "200" ]; then
    OP=$(python3 -c "import json; print(json.load(open('$TMP')).get('name','')[:40])" 2>/dev/null)
    report PASS "$TEST_NAME" "Endpoint reachable, billing active (op: $OP)"
  else
    ERR=$(gemini_error "$TMP")
    if echo "$ERR" | grep -qi "billing\|accessible.*billed"; then
      report FAIL "$TEST_NAME" "Billing required"
    elif echo "$ERR" | grep -qi "quota\|exceeded"; then
      report FAIL "$TEST_NAME" "Quota exceeded (try later)"
    else
      report FAIL "$TEST_NAME" "$ERR"
    fi
  fi
else
  report SKIP "$TEST_NAME" "GEMINI_API_KEY not set"
fi

# --- Test 7: Pollinations Video (gen.pollinations.ai) ---
TEST_NAME="Pollinations Video (auth)"
if [ -n "${POLLINATIONS_API_KEY:-}" ]; then
  TMP="$OUTDIR/t7-video.mp4"

  HTTP=$(curl -s -w '%{http_code}' -o "$TMP" --max-time 10 \
    -H "Authorization: Bearer $POLLINATIONS_API_KEY" \
    "https://gen.pollinations.ai/image/test?model=seedance" 2>/dev/null)

  if [ "$HTTP" = "200" ] || [ "$HTTP" = "202" ]; then
    report PASS "$TEST_NAME" "Endpoint reachable (HTTP $HTTP)"
  else
    report FAIL "$TEST_NAME" "HTTP $HTTP"
  fi
else
  report SKIP "$TEST_NAME" "POLLINATIONS_API_KEY not set"
fi

# --- Test 8: Pollinations models endpoint ---
TEST_NAME="Pollinations models API"
TMP="$OUTDIR/t8-models.json"
HTTP=$(curl -s -w '%{http_code}' -o "$TMP" --max-time 10 "https://gen.pollinations.ai/image/models" 2>/dev/null)
if [ "$HTTP" = "200" ]; then
  COUNT=$(python3 -c "import json; print(len(json.load(open('$TMP'))))" 2>/dev/null || echo 0)
  FREE=$(python3 -c "import json; print(sum(1 for m in json.load(open('$TMP')) if not m.get('paid_only')))" 2>/dev/null || echo 0)
  report PASS "$TEST_NAME" "$COUNT models ($FREE free)"
else
  report FAIL "$TEST_NAME" "HTTP $HTTP"
fi

echo ""

# ==============================================================================
# SUMMARY
# ==============================================================================

TOTAL=$((PASS + FAIL + SKIP))
echo "=============================================="
echo -e "  Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${YELLOW}${SKIP} skipped${NC} (of $TOTAL)"
echo "=============================================="
echo ""
echo "Test artifacts saved to: $OUTDIR"
echo ""

if [ $PASS -eq 0 ] && [ $FAIL -gt 0 ]; then
  echo -e "${RED}All providers failed!${NC}"
  echo "  - Gemini quota exceeded? Wait for reset (midnight PT) or check https://ai.dev/rate-limit"
  echo "  - Pollinations down? Usually resolves within hours"
  echo "  - Imagen billing required? Enable at https://aistudio.google.com/"
  echo ""
fi

if [ $SKIP -gt 0 ]; then
  echo "To reduce skipped tests, set in .env:"
  [ -z "${GEMINI_API_KEY:-}" ] && echo "  GEMINI_API_KEY=your-key    (free from https://aistudio.google.com/)"
  [ -z "${POLLINATIONS_API_KEY:-}" ] && echo "  POLLINATIONS_API_KEY=your-key  (free from https://pollinations.ai)"
fi

# Exit 0 if at least one provider works
[ $PASS -gt 0 ]
