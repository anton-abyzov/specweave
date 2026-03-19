---
description: Generate and edit images using AI. Powered by Nano Banana Pro (Google Gemini image models) with Pollinations.ai and Imagen 4 fallback. Supports text-to-image, image editing, aspect ratios, 2K/4K, and batch generation. Use when generating images, creating visuals, AI art, text-to-image, image generation, create picture, make illustration, generate photo, nano banana, edit image, batch images.
allowed-tools: Read, Bash, Glob
context: fork
---

# Image Generation Skill

Generate and edit images from text prompts using AI. Powered by **Nano Banana Pro** (Google Gemini image models — `gemini-3.1-flash-image-preview`, `gemini-2.5-flash-image`, `gemini-3-pro-image-preview`), with Pollinations.ai and Imagen 4 as fallbacks.

> **Note**: This skill includes all Nano Banana Pro capabilities built-in. No separate install needed.

## Provider Fallback Chain

### Standard Mode (default — optimizes for cost)

```
Tier 1: Gemini Native (FREE) ─── gemini-3.1-flash-image-preview (Nano Banana 2) ──┐
        ↓ on error                                                                   │
        gemini-2.5-flash-image ─────────────────────────────────────────────────────┤
        ↓ on error                                                                   │
        gemini-3-pro-image-preview (Nano Banana Pro) ───────────────────────────────┤
        ↓ on error                                                                   │
Tier 2: Pollinations.ai (FREE, no key) ─────────────────────────────────────────────┤
        ↓ on error                                                                   │
Tier 3: Imagen 4 (PAID, billing required) ──────────────────────────────────────────┘
```

### High-Quality Mode (`--hq` or "high quality" in prompt)

```
Tier 1: Imagen 4 (PAID, ~$0.04/image) ────────────────────────┐
        ↓ on error                                              │
Tier 2: gemini-3-pro-image-preview (Nano Banana Pro) ──────────┤
        ↓ on error                                              │
Tier 3: gemini-3.1-flash-image-preview (Nano Banana 2) ────────┤
        ↓ on error                                              │
Tier 4: Pollinations.ai (FREE) ────────────────────────────────┘
```

## Supported Features

| Feature | Nano Banana 2 | Nano Banana Pro | Pollinations | Imagen 4 |
|---------|:---:|:---:|:---:|:---:|
| Text-to-image | ✓ | ✓ | ✓ | ✓ |
| Image editing | ✓ | ✓ | — | — |
| Aspect ratios | ✓ | ✓ | ✓ | ✓ |
| 2K/4K output | ✓ | ✓ | — | ✓ |
| Search grounding | ✓ | ✓ | — | — |
| Batch generation | ✓ | ✓ | ✓ | ✓ |

**Aspect ratios supported**: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`

## Workflow

### Step 1: Parse User Request

Extract from the user's prompt:
- **Subject**: What to generate or edit
- **Style**: Photorealistic, illustration, pixel art, etc. (default: photorealistic)
- **Quality**: `standard` or `high`. Detect from: "high quality", "hq", "best quality", "maximum quality", "premium"
- **Resolution**: `standard`, `2K`, or `4K`. Detect from: "2K", "4K", "high-res", "high resolution"
- **Aspect ratio**: Detect from explicit mention (e.g., "16:9", "square", "portrait", "widescreen", "cinematic")
  - Common aliases: square→`1:1`, portrait→`9:16`, landscape→`16:9`, widescreen→`21:9`, vertical→`9:16`
- **Input image**: If user provides an image path for editing
- **Output path**: Where to save (default: `./generated-media/`)
- **Count**: How many images (default: 1)

**If user mentions "nano banana"** — they mean this built-in capability. Explain available options and proceed.

**Quality modes**:
- **Standard** (default): Cost-optimized chain (Gemini Flash → Gemini Pro → Pollinations → Imagen 4)
- **High**: Quality-optimized chain (Imagen 4 → Gemini Pro → Gemini Flash → Pollinations). Inform user: "Using high-quality mode — Imagen 4 costs ~$0.04/image."

**Resolution modes**:
- **Standard**: Default model output
- **2K**: Request 2048px detail — instruct via prompt suffix `", ultra detailed, 2048px quality"`
- **4K**: Request maximum quality — instruct via prompt suffix `", maximum quality 4K ultra detailed, sharp text rendering, 3840px"`

### Step 2: Prepare Output Directory

```bash
mkdir -p ./generated-media
```

### Step 3: Load API Key

```bash
# Source .env if it exists
if [ -f .env ]; then
  export $(grep -E '^GEMINI_API_KEY=' .env | xargs)
fi

# Check parent dirs (monorepo support)
if [ -z "$GEMINI_API_KEY" ] && [ -f ../.env ]; then
  export $(grep -E '^GEMINI_API_KEY=' ../.env | xargs)
fi

# Also load POLLINATIONS_API_KEY if available
if [ -f .env ]; then
  export $(grep -E '^POLLINATIONS_API_KEY=' .env | xargs 2>/dev/null) 2>/dev/null || true
fi
```

### Step 4: Set Generation Parameters

```bash
TIMESTAMP=$(date +%s)
PROMPT="YOUR_PROMPT_HERE"  # The full prompt (with resolution suffix if 2K/4K)
ASPECT_RATIO="1:1"         # Set from user request (default: 1:1)
OUTFILE="generated-media/image-${TIMESTAMP}.png"
TMPFILE="/tmp/gemini-img-response-${TIMESTAMP}.json"
INPUT_IMAGE=""             # Path to input image (for editing), or empty
```

**If editing an image**: Encode input image as base64:
```bash
if [ -n "$INPUT_IMAGE" ]; then
  INPUT_B64=$(base64 -i "$INPUT_IMAGE" | tr -d '\n')
  INPUT_MIME=$(file -b --mime-type "$INPUT_IMAGE")
fi
```

### Step 5: Generate Image (Fallback Chain)

**IMPORTANT**: Try each provider in order. On ANY error (quota, billing, network), move to next tier. Write API responses to temp files to avoid JSON parsing issues with large base64 payloads.

**If high-quality mode**: Start with Tier 3 (Imagen 4), then fall back upward.

#### Tier 1: Gemini Native Free (Nano Banana — requires GEMINI_API_KEY)

Models (try in order): `gemini-3.1-flash-image-preview`, `gemini-2.5-flash-image`, `gemini-3-pro-image-preview`

```bash
if [ -n "$GEMINI_API_KEY" ]; then
  for MODEL in "gemini-3.1-flash-image-preview" "gemini-2.5-flash-image" "gemini-3-pro-image-preview"; do
    echo "Trying $MODEL (Nano Banana)..."

    # Build request JSON — with or without input image
    if [ -n "$INPUT_IMAGE" ]; then
      # Image editing mode: pass both image and text
      REQUEST_JSON="{
        \"contents\": [{
          \"parts\": [
            {\"inlineData\": {\"mimeType\": \"${INPUT_MIME}\", \"data\": \"${INPUT_B64}\"}},
            {\"text\": \"${PROMPT}\"}
          ]
        }],
        \"generationConfig\": {
          \"responseModalities\": [\"TEXT\", \"IMAGE\"],
          \"aspectRatio\": \"${ASPECT_RATIO}\"
        }
      }"
    else
      # Text-to-image mode
      REQUEST_JSON="{
        \"contents\": [{
          \"parts\": [{\"text\": \"${PROMPT}\"}]
        }],
        \"generationConfig\": {
          \"responseModalities\": [\"TEXT\", \"IMAGE\"],
          \"aspectRatio\": \"${ASPECT_RATIO}\"
        }
      }"
    fi

    curl -s -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -o "$TMPFILE" \
      -d "$REQUEST_JSON"

    if python3 -c "
import json, sys, base64
with open('$TMPFILE') as f:
    data = json.load(f)
if 'error' in data:
    print(f'Error: {data[\"error\"][\"message\"][:200]}', file=sys.stderr)
    sys.exit(1)
for candidate in data.get('candidates', []):
    for part in candidate.get('content', {}).get('parts', []):
        if 'inlineData' in part:
            img_bytes = base64.b64decode(part['inlineData']['data'])
            with open('$OUTFILE', 'wb') as f:
                f.write(img_bytes)
            print(f'Saved: $OUTFILE')
            sys.exit(0)
print('No image in response', file=sys.stderr)
sys.exit(1)
" 2>/dev/null; then
      echo "Generated with $MODEL (Nano Banana, free)"
      rm -f "$TMPFILE"
      break 2
    fi

    echo "$MODEL failed, trying next..."
  done
fi
```

If Tier 1 fails, continue to Tier 2.

#### Tier 2: Pollinations.ai (Free, no key required)

Free models: `flux` (best), `gptimage`, `turbo`

```bash
if [ ! -f "$OUTFILE" ] || [ ! -s "$OUTFILE" ]; then
  echo "Trying Pollinations.ai..."
  ENCODED_PROMPT=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${PROMPT}'''))")
  POLL_MODEL="flux"
  POLL_OK=false

  # Determine width/height from aspect ratio
  case "$ASPECT_RATIO" in
    "16:9")  POLL_W=1344; POLL_H=768 ;;
    "9:16")  POLL_W=768;  POLL_H=1344 ;;
    "4:3")   POLL_W=1024; POLL_H=768  ;;
    "3:4")   POLL_W=768;  POLL_H=1024 ;;
    "21:9")  POLL_W=1512; POLL_H=648  ;;
    "1:1"|*) POLL_W=1024; POLL_H=1024 ;;
  esac

  # Try authenticated endpoint first
  if [ -n "${POLLINATIONS_API_KEY:-}" ]; then
    curl -s -L --max-time 120 \
      -H "Authorization: Bearer $POLLINATIONS_API_KEY" \
      -o "$OUTFILE" \
      "https://gen.pollinations.ai/image/${ENCODED_PROMPT}?model=${POLL_MODEL}&width=${POLL_W}&height=${POLL_H}&nologo=true"
    if [ -f "$OUTFILE" ] && [ -s "$OUTFILE" ]; then
      FILETYPE=$(file -b "$OUTFILE" | head -1)
      echo "$FILETYPE" | grep -qiE "image|PNG|JPEG|GIF|WebP" && POLL_OK=true || rm -f "$OUTFILE"
    fi
  fi

  # Fall back to anonymous endpoint
  if [ "$POLL_OK" != "true" ]; then
    curl -s -L --max-time 120 \
      -o "$OUTFILE" \
      "https://image.pollinations.ai/prompt/${ENCODED_PROMPT}?model=${POLL_MODEL}&width=${POLL_W}&height=${POLL_H}&nologo=true"
    if [ -f "$OUTFILE" ] && [ -s "$OUTFILE" ]; then
      FILETYPE=$(file -b "$OUTFILE" | head -1)
      echo "$FILETYPE" | grep -qiE "image|PNG|JPEG|GIF|WebP" && POLL_OK=true || { echo "Pollinations returned non-image"; rm -f "$OUTFILE"; }
    fi
  fi

  [ "$POLL_OK" = "true" ] && echo "Generated with Pollinations.ai (free)"
fi
```

#### Tier 3: Imagen 4 (PAID, requires billing)

```bash
if [ ! -f "$OUTFILE" ] || [ ! -s "$OUTFILE" ]; then
  if [ -n "$GEMINI_API_KEY" ]; then
    echo "Trying Imagen 4 (paid ~$0.04)..."
    IMAGEN_MODEL="imagen-4.0-generate-001"

    curl -s -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -o "$TMPFILE" \
      -d "{
        \"instances\": [{\"prompt\": \"${PROMPT}\"}],
        \"parameters\": {
          \"sampleCount\": 1,
          \"aspectRatio\": \"${ASPECT_RATIO}\"
        }
      }"

    python3 -c "
import json, sys, base64
with open('$TMPFILE') as f:
    data = json.load(f)
if 'predictions' in data:
    img = base64.b64decode(data['predictions'][0]['bytesBase64Encoded'])
    with open('$OUTFILE', 'wb') as f:
        f.write(img)
    print('Saved: $OUTFILE')
elif 'error' in data:
    print(f'Imagen error: {data[\"error\"][\"message\"][:200]}', file=sys.stderr)
    sys.exit(1)
" 2>/dev/null && echo "Generated with Imagen 4 (paid)"

    rm -f "$TMPFILE"
  fi
fi
```

#### High-Quality Mode Execution

When user requests high quality, reverse order: Imagen 4 → Gemini Pro → Gemini Flash → Pollinations. Before starting, inform the user:

```
"High-quality mode — trying Imagen 4 first (~$0.04/image).
If billing isn't enabled, falling back to Gemini Pro (free, Nano Banana Pro quality)."
```

### Step 6: Batch Generation (count > 1)

If user requests multiple images, loop the generation:

```bash
COUNT=3  # from user request
for i in $(seq 1 $COUNT); do
  OUTFILE="generated-media/image-$(date +%s)-${i}.png"
  TMPFILE="/tmp/gemini-img-${RANDOM}.json"
  # ... run Tier 1 → Tier 2 → Tier 3 chain for each image ...
  sleep 2  # Avoid rate limits between generations
done
```

Inform user: "Generating $COUNT images..." and show each file as it completes.

### Step 7: Verify Output

```bash
if [ -f "$OUTFILE" ] && [ -s "$OUTFILE" ]; then
  file "$OUTFILE"
  SIZE=$(du -h "$OUTFILE" | cut -f1)
  echo "Image generated: $OUTFILE ($SIZE)"
else
  echo "ERROR: All providers failed."
  echo "  - Gemini: Daily quota exceeded (resets at midnight PT)"
  echo "  - Pollinations: Service temporarily down"
  echo "  - Imagen 4: Billing not enabled"
  echo ""
  echo "Fix: Set GEMINI_API_KEY in .env or enable billing at https://aistudio.google.com/"
fi
```

### Step 8: Report Result

Tell the user:
- File path(s) to generated image(s)
- Which provider/model was used
- Cost: "free" (Gemini / Pollinations) or "~$0.04" (Imagen 4)
- Aspect ratio and resolution used

## Image Editing

When user provides an input image + edit instruction:

```
"Change the background to blue" [attached: photo.jpg]
"Remove the logo from this image" [path: ./logo-image.png]
"Make this look like a watercolor painting" [input image provided]
```

Supported edits:
- Style transfer (make it look like X)
- Object addition/removal
- Background replacement
- Color adjustments
- Compositing

> **Note**: Image editing requires Gemini (Nano Banana) — Pollinations and Imagen 4 tiers do not support editing.

## Aspect Ratio Quick Reference

| Ratio | Use Case |
|-------|----------|
| `1:1` | Square, social profile, Instagram post (default) |
| `16:9` | Landscape, YouTube thumbnail, desktop wallpaper |
| `9:16` | Portrait, Instagram Story, TikTok, mobile |
| `4:3` | Standard photo, presentation slide |
| `3:4` | Portrait photo, Pinterest |
| `21:9` | Cinematic, ultra-wide, banner |
| `4:5` | Instagram feed portrait |
| `2:3` | Print portrait |

## Error Handling

| Error | Action |
|-------|--------|
| Gemini quota exceeded | Auto-fallback to Pollinations, then Imagen 4 |
| Pollinations 502/timeout | Auto-fallback to Imagen 4 |
| Imagen billing not enabled | Report all failed, suggest enabling billing |
| `GEMINI_API_KEY` not set | Skip Gemini tiers, use Pollinations only |
| Content policy block | Report prompt blocked, suggest rewording |
| No image in response | Try next model in the chain |
| All providers fail | Show diagnostic with links |

## Setup (When No API Key Found)

If `GEMINI_API_KEY` is not set:

> **Using Pollinations.ai only** (free, aspect-ratio limited, may be unreliable).
>
> For full Nano Banana Pro capabilities (image editing, 2K/4K, all aspect ratios):
> 1. Go to https://aistudio.google.com/
> 2. Click "Get API key" → Create API key
> 3. Add to your `.env`: `GEMINI_API_KEY=your-key-here`
>
> The free tier includes `gemini-3.1-flash-image-preview` (Nano Banana 2) and `gemini-3-pro-image-preview` (Nano Banana Pro) with daily quota.

## About Nano Banana

"Nano Banana" is the nickname for Google's Gemini image generation models:
- **Nano Banana 2**: `gemini-3.1-flash-image-preview` — fast, great quality, default
- **Nano Banana Pro**: `gemini-3-pro-image-preview` — highest quality, slower
- **Gemini Flash Image**: `gemini-2.5-flash-image` — alternative fast model

All three use the same `generateContent` API endpoint and are FREE with a daily quota. No separate skill install needed — this skill includes everything.

## Activation Keywords

generate image, create image, make image, AI image, text-to-image, image generation, create picture, make illustration, generate photo, AI art, create visual, generate artwork, make a picture, nano banana, edit image, edit photo, image editing, batch images, batch generate, 2K image, 4K image, high resolution image, widescreen image, portrait image, square image, cinematic image
