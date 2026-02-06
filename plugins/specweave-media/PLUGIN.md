# sw-media - AI Image & Video Generation

Generate images and videos directly from Claude Code using AI models.

## Skills

| Skill | Description |
|-------|-------------|
| `/sw-media:image` | Generate images from text prompts (Google Imagen 4 / Pollinations.ai) |
| `/sw-media:video` | Generate videos from text/image prompts (Google Veo 3.1 / Pollinations.ai) |
| `/sw-media:remotion` | Create programmatic videos with Remotion (React components to MP4) |

## Provider Strategy

| Priority | Provider | API Key | Cost | Quality |
|----------|----------|---------|------|---------|
| 1 | Google Gemini API | `GEMINI_API_KEY` | Images $0.02-0.06, Video $0.15-0.40/sec | Excellent |
| 2 | Pollinations.ai | None (free) or `POLLINATIONS_API_KEY` | Free | Good |

One Google API key covers both Imagen 4 (images) and Veo 3.1 (video).

## Setup

### Free (Zero Config)
Works immediately with Pollinations.ai - no API key needed.

### Google Gemini API (Recommended)
1. Get API key from [Google AI Studio](https://aistudio.google.com/)
2. Enable billing (required for Imagen/Veo)
3. Set environment variable: `export GEMINI_API_KEY=your-key-here`

## Auto-Loading

This plugin loads automatically when media generation keywords are detected:
- "generate image", "create image", "text-to-image", "AI art"
- "generate video", "create video", "text-to-video"
- "Remotion", "programmatic video"
