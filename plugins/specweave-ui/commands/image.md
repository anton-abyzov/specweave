---
name: sw-ui:image
description: Generate images using Pollinations.ai - FREE AI image generation. Usage - /sw-ui:image "your prompt here". Creates hero images, icons, logos, mockups, illustrations. No API key required.
---

# AI Image Generation Command

Generate professional-quality images using Pollinations.ai - a FREE, open-source AI platform.

## Quick Usage

```
/sw-ui:image "modern tech startup office, glass walls, natural lighting"
```

## What This Command Does

1. Takes your prompt and enhances it with quality modifiers
2. Generates the image URL using Pollinations.ai
3. Optionally downloads and saves the image to your project

## Parameters

The user provides a prompt in quotes. Parse it and determine:
- **Prompt**: The description of the image to generate
- **Dimensions**: Infer from context (hero=1920x1080, icon=512x512, etc.)
- **Model**: flux (default), flux-realism, flux-anime, flux-3d, turbo
- **Output**: Save to file or just provide URL

## Implementation

### Step 1: Parse the Request

Extract the prompt from the user's command. Look for dimensions or model hints:
- "hero image" → 1920x1080
- "icon" or "app icon" → 512x512
- "avatar" → 400x400
- "og image" → 1200x630
- "realistic" → model=flux-realism
- "anime" → model=flux-anime

### Step 2: Build the URL

```
https://image.pollinations.ai/prompt/{encoded_prompt}?width={w}&height={h}&model={model}&nologo=true
```

Quality modifiers to append to prompt:
- Professional: ", professional photography, 8k uhd, high resolution, sharp focus"
- Icons: ", minimal, flat design, clean lines, centered"
- Illustrations: ", digital illustration, vibrant colors, detailed"

### Step 3: Generate or Save

**Option A - URL Only** (default for quick preview):
```markdown
Here's your generated image:

![{short_description}]({url})

Direct URL: {url}
```

**Option B - Save to File** (if user specifies path):
```typescript
// Use WebFetch to download, then Write to save
const response = await fetch(url);
const buffer = await response.arrayBuffer();
// Save as PNG/JPG
```

## Examples

### Hero Image
```
/sw-ui:image "futuristic city skyline at sunset, cyberpunk, neon lights, cinematic"
```
→ 1920x1080, flux model

### App Icon
```
/sw-ui:image "minimalist app icon, letter A, gradient blue purple, iOS style"
```
→ 512x512, flux model

### Product Mockup
```
/sw-ui:image "iPhone mockup on wooden desk, coffee cup, lifestyle photography"
```
→ 1200x800, flux-3d model

### Avatar
```
/sw-ui:image "friendly robot avatar, geometric, blue and white, minimal"
```
→ 400x400, flux model

## Aspect Ratios Reference

| Use Case | Width | Height |
|----------|-------|--------|
| Hero Banner | 1920 | 1080 |
| Social Post | 1200 | 1200 |
| App Icon | 512 | 512 |
| OG Image | 1200 | 630 |
| Thumbnail | 400 | 300 |
| Portrait | 800 | 1200 |

## Models Reference

| Model | Best For |
|-------|----------|
| flux | General purpose (default) |
| flux-realism | Photorealistic images |
| flux-anime | Anime/illustration |
| flux-3d | 3D renders, mockups |
| turbo | Fast drafts |

## Notes

- Images are generated on-demand (may take a few seconds)
- Use `seed` parameter for reproducible results
- Cache generated images for production use
- No API key required - completely free!
