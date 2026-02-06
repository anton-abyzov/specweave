---
description: Generate AI images from text prompts. Supports Google Imagen 4 and Pollinations.ai (free). Use when generating images, creating visuals, AI art, text-to-image, image generation, create picture, make illustration, generate photo.
allowed-tools: Read, Bash, Glob
context: fork
---

# Image Generation Skill

Generate images from text prompts using AI models. Automatically selects the best available provider.

## Provider Detection (Follow This Order)

1. Check `GEMINI_API_KEY` environment variable → **Google Imagen 4** (best quality)
2. Check `POLLINATIONS_API_KEY` environment variable → **Pollinations.ai** (authenticated, no watermark)
3. Fallback → **Pollinations.ai anonymous** (free, may have watermark, 1 req/15s rate limit)

```bash
# Check which provider is available
if [ -n "$GEMINI_API_KEY" ]; then
  echo "Provider: Google Imagen 4"
elif [ -n "$POLLINATIONS_API_KEY" ]; then
  echo "Provider: Pollinations.ai (authenticated)"
else
  echo "Provider: Pollinations.ai (free/anonymous)"
fi
```

## Workflow

### Step 1: Parse User Request

Extract from the user's prompt:
- **Subject**: What to generate (e.g., "a sunset over mountains")
- **Style**: Photorealistic, illustration, painting, etc. (default: photorealistic)
- **Dimensions**: Width x Height (default: 1024x1024)
- **Output path**: Where to save (default: `./generated-media/`)
- **Count**: How many images (default: 1, max 4)

### Step 2: Prepare Output Directory

```bash
mkdir -p ./generated-media
```

### Step 3: Generate Image

#### Option A: Google Imagen 4 (`GEMINI_API_KEY` set)

Available models:
- `imagen-4.0-fast-generate-001` — Fast, $0.02/image
- `imagen-4.0-generate-001` — Standard, $0.04/image (default)
- `imagen-4.0-ultra-generate-001` — Ultra quality, $0.06/image

```bash
TIMESTAMP=$(date +%s)
MODEL="imagen-4.0-generate-001"
PROMPT="YOUR_PROMPT_HERE"

curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predict" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"instances\": [{
      \"prompt\": \"${PROMPT}\"
    }],
    \"parameters\": {
      \"sampleCount\": 1
    }
  }" \
  | python3 -c "
import sys, json, base64
data = json.load(sys.stdin)
if 'predictions' in data:
    for i, pred in enumerate(data['predictions']):
        img_data = base64.b64decode(pred['bytesBase64Encoded'])
        filename = f'generated-media/image-${TIMESTAMP}-{i}.png'
        with open(filename, 'wb') as f:
            f.write(img_data)
        print(f'Saved: {filename}')
elif 'error' in data:
    print(f'Error: {data[\"error\"][\"message\"]}', file=sys.stderr)
    sys.exit(1)
else:
    print(f'Unexpected response: {json.dumps(data)[:200]}', file=sys.stderr)
    sys.exit(1)
"
```

**If the API returns an error about billing**: Tell the user they need to enable billing on their Google AI Studio account. Imagen/Veo require a paid plan (Tier 1+). Direct them to https://aistudio.google.com/ to check billing status.

#### Option B: Pollinations.ai (free fallback)

```bash
TIMESTAMP=$(date +%s)
PROMPT="YOUR_PROMPT_HERE"
ENCODED_PROMPT=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${PROMPT}'))")
WIDTH=1024
HEIGHT=1024
MODEL="flux"

# Build URL
URL="https://image.pollinations.ai/prompt/${ENCODED_PROMPT}?model=${MODEL}&width=${WIDTH}&height=${HEIGHT}&nologo=true"

# Add auth header if key exists
if [ -n "$POLLINATIONS_API_KEY" ]; then
  curl -s -o "generated-media/image-${TIMESTAMP}.png" \
    -H "Authorization: Bearer $POLLINATIONS_API_KEY" \
    "$URL"
else
  curl -s -o "generated-media/image-${TIMESTAMP}.png" "$URL"
fi

echo "Saved: generated-media/image-${TIMESTAMP}.png"
```

Available Pollinations models: `flux` (default, best), `turbo` (faster), `gptimage`, `seedream`

### Step 4: Verify Output

```bash
# Check file was created and has content
FILE="generated-media/image-${TIMESTAMP}.png"
if [ -f "$FILE" ] && [ -s "$FILE" ]; then
  file "$FILE"
  echo "Image generated successfully: $FILE"
else
  echo "ERROR: Image generation failed - file is empty or missing"
fi
```

### Step 5: Report Result

Tell the user:
- File path to the generated image
- Which provider was used
- Image dimensions
- Approximate cost (Google) or "free" (Pollinations)

## Error Handling

| Error | Action |
|-------|--------|
| `GEMINI_API_KEY` invalid/expired | Fall back to Pollinations, suggest user check key |
| Google billing not enabled | Tell user to enable billing at https://aistudio.google.com/ |
| Pollinations rate limited | Wait 15 seconds and retry once |
| curl not available | This shouldn't happen - curl is universal |
| python3 not available | Use `base64 -d` instead of Python for decoding |
| Empty response | Report error, suggest trying different prompt |
| Content policy block | Report that the prompt was blocked, suggest rewording |

## Setup Instructions (Show When No API Key Found)

If neither `GEMINI_API_KEY` nor `POLLINATIONS_API_KEY` is set, inform the user:

> **Using free Pollinations.ai provider** (rate limited, may have watermark).
>
> For better quality, set up Google Imagen 4:
> 1. Go to https://aistudio.google.com/
> 2. Create or select a project with billing enabled
> 3. Generate an API key
> 4. Run: `export GEMINI_API_KEY=your-key-here`
>
> The same key works for both image AND video generation.

## Activation Keywords

generate image, create image, make image, AI image, text-to-image, image generation, create picture, make illustration, generate photo, AI art, create visual, generate artwork, make a picture of
