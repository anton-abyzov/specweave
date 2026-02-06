---
description: Generate AI videos from text prompts or images. Supports Google Veo 3.1 and Pollinations.ai (free). Use when generating video, creating animations, text-to-video, AI video, video generation, make clip, animate.
allowed-tools: Read, Bash, Glob
context: fork
---

# Video Generation Skill

Generate videos from text prompts (or images) using AI models. Video generation is asynchronous - Google Veo requires polling for completion.

## Provider Detection (Follow This Order)

1. Check `GEMINI_API_KEY` environment variable → **Google Veo 3.1** (best quality, audio support)
2. Check `POLLINATIONS_API_KEY` environment variable → **Pollinations.ai** (authenticated)
3. Fallback → **Pollinations.ai anonymous** (free, rate limited)

```bash
if [ -n "$GEMINI_API_KEY" ]; then
  echo "Provider: Google Veo 3.1"
elif [ -n "$POLLINATIONS_API_KEY" ]; then
  echo "Provider: Pollinations.ai (authenticated)"
else
  echo "Provider: Pollinations.ai (free/anonymous)"
fi
```

## Workflow

### Step 1: Parse User Request

Extract from the user's prompt:
- **Description**: What the video should show
- **Duration**: Desired length (Veo: 5-8 seconds, Pollinations: 4-10 seconds)
- **Style**: Cinematic, animation, documentary, etc.
- **Source image**: Optional image to use as starting frame (image-to-video)
- **Output path**: Where to save (default: `./generated-media/`)

### Step 2: Prepare Output Directory

```bash
mkdir -p ./generated-media
```

### Step 3: Generate Video

#### Option A: Google Veo 3.1 (`GEMINI_API_KEY` set)

Available models:
- `veo-3.1-fast-generate-preview` — Fast, $0.15/sec (720p/1080p)
- `veo-3.1-generate-preview` — Standard with audio, $0.40/sec (default)
- `veo-3.0-generate-001` — Veo 3 (no audio), $0.40/sec

**IMPORTANT**: Veo is asynchronous. You must:
1. Submit the generation request
2. Poll the operation endpoint every 10 seconds
3. Download the video when done

```bash
TIMESTAMP=$(date +%s)
MODEL="veo-3.1-generate-preview"
PROMPT="YOUR_PROMPT_HERE"

# Step 1: Start generation (returns operation ID)
RESPONSE=$(curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predictLongRunning" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"instances\": [{
      \"prompt\": \"${PROMPT}\"
    }]
  }")

# Extract operation name
OPERATION=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name',''))")

if [ -z "$OPERATION" ]; then
  echo "ERROR: Failed to start video generation"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

echo "Video generation started: $OPERATION"
echo "Polling for completion (this may take 1-3 minutes)..."

# Step 2: Poll until done
MAX_POLLS=30  # 5 minutes max
POLL_COUNT=0
while [ $POLL_COUNT -lt $MAX_POLLS ]; do
  sleep 10
  POLL_COUNT=$((POLL_COUNT + 1))

  STATUS=$(curl -s \
    "https://generativelanguage.googleapis.com/v1beta/${OPERATION}" \
    -H "x-goog-api-key: $GEMINI_API_KEY")

  IS_DONE=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('done', False))")

  if [ "$IS_DONE" = "True" ]; then
    echo "Video generation complete!"

    # Step 3: Extract video URI and download
    VIDEO_URI=$(echo "$STATUS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
try:
    uri = data['response']['generateVideoResponse']['generatedSamples'][0]['video']['uri']
    print(uri)
except (KeyError, IndexError):
    print('')
")

    if [ -n "$VIDEO_URI" ]; then
      curl -s -o "generated-media/video-${TIMESTAMP}.mp4" \
        "$VIDEO_URI" \
        -H "x-goog-api-key: $GEMINI_API_KEY"
      echo "Saved: generated-media/video-${TIMESTAMP}.mp4"
    else
      echo "ERROR: Could not extract video URI from response"
      echo "$STATUS" | python3 -m json.tool 2>/dev/null
    fi
    break
  fi

  echo "  Still generating... (${POLL_COUNT}/${MAX_POLLS})"
done

if [ $POLL_COUNT -ge $MAX_POLLS ]; then
  echo "ERROR: Video generation timed out after 5 minutes"
  echo "Operation: $OPERATION"
  echo "You can check status manually later"
fi
```

#### Option B: Pollinations.ai (free fallback)

Pollinations video is simpler - a single GET request that blocks until done.

Available video models: `veo` (4-8s), `seedance` (2-10s)

```bash
TIMESTAMP=$(date +%s)
PROMPT="YOUR_PROMPT_HERE"
ENCODED_PROMPT=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${PROMPT}'))")
MODEL="veo"

URL="https://image.pollinations.ai/prompt/${ENCODED_PROMPT}?model=${MODEL}"

echo "Generating video via Pollinations.ai (this may take 30-60 seconds)..."

if [ -n "$POLLINATIONS_API_KEY" ]; then
  curl -s -o "generated-media/video-${TIMESTAMP}.mp4" \
    -H "Authorization: Bearer $POLLINATIONS_API_KEY" \
    "$URL"
else
  curl -s -o "generated-media/video-${TIMESTAMP}.mp4" "$URL"
fi

echo "Saved: generated-media/video-${TIMESTAMP}.mp4"
```

### Step 4: Verify Output

```bash
FILE="generated-media/video-${TIMESTAMP}.mp4"
if [ -f "$FILE" ] && [ -s "$FILE" ]; then
  file "$FILE"
  SIZE=$(du -h "$FILE" | cut -f1)
  echo "Video generated successfully: $FILE ($SIZE)"
else
  echo "ERROR: Video generation failed - file is empty or missing"
fi
```

### Step 5: Report Result

Tell the user:
- File path to the generated video
- Which provider/model was used
- Video duration (if known)
- Approximate cost (Google: $0.15-0.40/sec) or "free" (Pollinations)
- Playback instructions: open with `open file.mp4` (macOS), `xdg-open file.mp4` (Linux)

## Image-to-Video (Google Veo Only)

If the user provides a source image, use image-to-video mode:

```bash
# Convert image to base64
IMAGE_B64=$(base64 -i source-image.png)

curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"instances\": [{
      \"prompt\": \"${PROMPT}\",
      \"image\": {
        \"bytesBase64Encoded\": \"${IMAGE_B64}\"
      }
    }]
  }"
# Then poll as above
```

## Error Handling

| Error | Action |
|-------|--------|
| `GEMINI_API_KEY` invalid/expired | Fall back to Pollinations, suggest user check key |
| Google billing not enabled | Tell user to enable billing at https://aistudio.google.com/ |
| Generation timed out | Report operation ID so user can check later |
| Pollinations rate limited | Wait 15 seconds and retry once |
| Content policy block | Report that the prompt was blocked, suggest rewording |
| Empty/corrupt MP4 | Report error, suggest trying different prompt |

## Cost Awareness

**IMPORTANT**: Video generation costs money with Google. Always inform the user before generating:

| Model | Cost | Duration |
|-------|------|----------|
| Veo 3.1 Fast (720p) | ~$0.15/sec = ~$0.75-1.20 per video | 5-8 sec |
| Veo 3.1 Standard | ~$0.40/sec = ~$2.00-3.20 per video | 5-8 sec |
| Pollinations | Free | 4-10 sec |

Before generating with Google, confirm: "This will cost approximately $X. Proceed?"

## Setup Instructions (Show When No API Key Found)

If no `GEMINI_API_KEY` is set, inform the user:

> **Using free Pollinations.ai provider** (rate limited, shorter clips).
>
> For higher quality video with audio, set up Google Veo 3.1:
> 1. Go to https://aistudio.google.com/
> 2. Create or select a project with billing enabled
> 3. Generate an API key
> 4. Run: `export GEMINI_API_KEY=your-key-here`
>
> The same key works for both image AND video generation.
> Video costs ~$0.75-3.20 per clip depending on model/resolution.

## Activation Keywords

generate video, create video, make video, AI video, text-to-video, video generation, create animation, make clip, generate clip, animate, create movie, video from text, video from image
