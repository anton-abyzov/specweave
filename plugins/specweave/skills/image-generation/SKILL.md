---
name: image-generation
description: AI image generation using Pollinations.ai - FREE with no API key required. Use when generating hero images, icons, logos, illustrations, mockups, or any visual assets for websites and apps. Covers product shots, avatars, placeholders, and social media images with professional quality.
allowed-tools:
  - Read
  - Write
  - WebFetch
context: fork
model: opus
---

# AI Image Generation Skill

Expert in generating professional-quality images using Pollinations.ai - a FREE, open-source AI image generation platform requiring NO API keys.

## Quick Reference

**Generate any image instantly:**
```
https://image.pollinations.ai/prompt/YOUR_PROMPT_HERE
```

## When This Skill Activates

This skill auto-activates when you need images for:
- **Web Development**: Hero sections, backgrounds, banners, thumbnails
- **App Design**: Splash screens, onboarding, placeholders, icons
- **Marketing**: Product mockups, social media, ads, landing pages
- **UI/UX**: Illustrations, avatars, empty states, feature graphics
- **Prototyping**: Concept visualization, wireframe assets

## Pollinations.ai API

### Basic URL Structure

```
https://image.pollinations.ai/prompt/{prompt}?{parameters}
```

### Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `width` | 256-2048 | 1024 | Image width in pixels |
| `height` | 256-2048 | 1024 | Image height in pixels |
| `model` | flux, turbo, flux-realism, flux-anime, flux-3d, flux-cablyai | flux | AI model to use |
| `seed` | any integer | random | Reproducible results |
| `nologo` | true | false | Remove watermark |
| `enhance` | true | false | Prompt enhancement |
| `safe` | true | false | Safety filter |

### Available Models

| Model | Best For | Quality | Speed |
|-------|----------|---------|-------|
| `flux` | General purpose, photorealistic | Highest | Medium |
| `flux-realism` | Ultra-realistic photos | Very High | Medium |
| `flux-anime` | Anime/illustration style | High | Fast |
| `flux-3d` | 3D renders, product mockups | High | Medium |
| `flux-cablyai` | Artistic, creative styles | High | Fast |
| `turbo` | Quick iterations, drafts | Medium | Fastest |

## Professional Prompt Engineering

### Prompt Formula (CRITICAL for Quality)

```
[Subject] + [Style/Medium] + [Lighting] + [Composition] + [Quality Modifiers]
```

### Quality Modifiers (ALWAYS Include)

For **highest quality output**, append these to prompts:

```
, professional photography, 8k uhd, high resolution, sharp focus, highly detailed
```

For **specific use cases**:

| Use Case | Quality Modifiers |
|----------|-------------------|
| **Website Hero** | `cinematic lighting, professional photography, 8k, sharp focus, volumetric lighting` |
| **Product Shot** | `studio lighting, white background, commercial photography, product photography, clean` |
| **App Icon** | `minimal, flat design, vector style, clean lines, app icon, centered, simple background` |
| **Illustration** | `digital illustration, vibrant colors, clean lines, professional artwork, detailed` |
| **Avatar** | `portrait, centered, professional headshot, neutral background, high quality` |
| **Background** | `seamless pattern, tileable, abstract, subtle, muted colors, non-distracting` |

### Aspect Ratios for Common Use Cases

| Use Case | Width | Height | Ratio |
|----------|-------|--------|-------|
| **Hero Banner** | 1920 | 1080 | 16:9 |
| **Social Media Post** | 1200 | 1200 | 1:1 |
| **Portrait/Avatar** | 800 | 1200 | 2:3 |
| **Product Card** | 800 | 600 | 4:3 |
| **Mobile Splash** | 1080 | 1920 | 9:16 |
| **App Icon** | 512 | 512 | 1:1 |
| **OG Image** | 1200 | 630 | ~1.9:1 |
| **Thumbnail** | 400 | 300 | 4:3 |

## Code Examples

### React/Next.js Integration

```tsx
// components/GeneratedImage.tsx
interface GeneratedImageProps {
  prompt: string;
  width?: number;
  height?: number;
  model?: 'flux' | 'flux-realism' | 'flux-anime' | 'flux-3d' | 'turbo';
  className?: string;
  alt: string;
}

export function GeneratedImage({
  prompt,
  width = 1024,
  height = 1024,
  model = 'flux',
  className,
  alt,
}: GeneratedImageProps) {
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${model}&nologo=true`;

  return (
    <img
      src={url}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
    />
  );
}

// Usage
<GeneratedImage
  prompt="Modern tech startup office, glass walls, natural lighting, professional photography, 8k"
  width={1920}
  height={1080}
  alt="Hero background"
  className="w-full h-auto object-cover"
/>
```

### With Next.js Image Optimization

```tsx
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.pollinations.ai',
      },
    ],
  },
};

// components/OptimizedGeneratedImage.tsx
import Image from 'next/image';

export function OptimizedGeneratedImage({ prompt, width, height, alt }) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=flux&nologo=true`;

  return (
    <Image
      src={url}
      alt={alt}
      width={width}
      height={height}
      priority={false}
    />
  );
}
```

### HTML Direct Embed

```html
<!-- Hero Image -->
<img
  src="https://image.pollinations.ai/prompt/futuristic%20city%20skyline%20at%20sunset%2C%20cyberpunk%2C%20neon%20lights%2C%20cinematic%2C%208k?width=1920&height=1080&model=flux&nologo=true"
  alt="Hero background"
  loading="lazy"
/>

<!-- Product Mockup -->
<img
  src="https://image.pollinations.ai/prompt/smartphone%20mockup%20on%20marble%20desk%2C%20minimal%2C%20studio%20lighting%2C%20product%20photography?width=800&height=600&model=flux-3d&nologo=true"
  alt="Product mockup"
/>
```

### Markdown (for Documentation)

```markdown
![Hero Image](https://image.pollinations.ai/prompt/abstract%20geometric%20pattern%2C%20gradient%20blue%20purple%2C%20modern%2C%20clean?width=1200&height=400&nologo=true)
```

### Batch Generation Script (Node.js)

```typescript
import fs from 'fs';
import https from 'https';

async function generateImage(prompt: string, filename: string, options = {}) {
  const { width = 1024, height = 1024, model = 'flux' } = options;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=${model}&nologo=true`;

  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const file = fs.createWriteStream(filename);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filename);
      });
    }).on('error', reject);
  });
}

// Generate multiple images
const assets = [
  { prompt: 'hero background, abstract waves, blue gradient', file: 'hero.png', width: 1920, height: 1080 },
  { prompt: 'user avatar placeholder, geometric face', file: 'avatar.png', width: 200, height: 200 },
  { prompt: 'empty state illustration, no results found', file: 'empty.png', width: 400, height: 300 },
];

for (const asset of assets) {
  await generateImage(asset.prompt, asset.file, { width: asset.width, height: asset.height });
  console.log(`Generated: ${asset.file}`);
}
```

## Use Case Recipes

### 1. Landing Page Hero

```
https://image.pollinations.ai/prompt/modern%20SaaS%20dashboard%20floating%20in%20space%2C%20dark%20theme%2C%20glowing%20UI%20elements%2C%20professional%203D%20render%2C%20cinematic%20lighting%2C%208k%20uhd?width=1920&height=1080&model=flux&nologo=true
```

### 2. Team Member Avatars

```
https://image.pollinations.ai/prompt/professional%20headshot%2C%20friendly%20smile%2C%20neutral%20gray%20background%2C%20studio%20lighting%2C%20business%20casual?width=400&height=400&model=flux-realism&nologo=true
```

### 3. App Empty State

```
https://image.pollinations.ai/prompt/cute%20illustration%20of%20empty%20box%2C%20minimal%20flat%20design%2C%20soft%20pastel%20colors%2C%20friendly%2C%20vector%20style?width=400&height=300&model=flux-anime&nologo=true
```

### 4. Product Mockup

```
https://image.pollinations.ai/prompt/iPhone%2015%20mockup%20on%20wooden%20desk%2C%20coffee%20cup%2C%20minimal%2C%20lifestyle%20photography%2C%20warm%20lighting%2C%20professional?width=1200&height=800&model=flux-3d&nologo=true
```

### 5. Blog Featured Image

```
https://image.pollinations.ai/prompt/abstract%20visualization%20of%20artificial%20intelligence%2C%20neural%20networks%2C%20blue%20and%20purple%2C%20futuristic%2C%20clean?width=1200&height=630&model=flux&nologo=true
```

### 6. App Icon

```
https://image.pollinations.ai/prompt/minimalist%20app%20icon%2C%20letter%20A%2C%20gradient%20blue%20to%20purple%2C%20rounded%20corners%2C%20flat%20design%2C%20iOS%20style?width=512&height=512&model=flux&nologo=true
```

### 7. Background Pattern

```
https://image.pollinations.ai/prompt/seamless%20geometric%20pattern%2C%20subtle%20gray%20on%20white%2C%20minimalist%2C%20tileable%2C%20modern?width=512&height=512&model=flux&nologo=true
```

### 8. Feature Illustration

```
https://image.pollinations.ai/prompt/isometric%20illustration%20of%20cloud%20computing%2C%20servers%2C%20data%20flow%2C%20blue%20and%20white%2C%20clean%20vector%20style?width=800&height=600&model=flux&nologo=true
```

## Best Practices

### DO

1. **Use descriptive prompts** - More detail = better results
2. **Include quality modifiers** - "8k, professional, detailed"
3. **Specify the style** - "photograph", "illustration", "3D render"
4. **Define lighting** - "studio lighting", "natural light", "cinematic"
5. **Set appropriate dimensions** - Match your actual use case
6. **Use seeds for consistency** - Same seed = reproducible results
7. **Cache generated images** - Save to CDN for production

### DON'T

1. **Don't use generic prompts** - "a picture of something"
2. **Don't request copyrighted content** - No brand logos, celebrities
3. **Don't use in loops without throttling** - Rate limits apply
4. **Don't skip the `nologo=true` param** - Avoids watermarks
5. **Don't generate same image repeatedly** - Use seed + cache

## Rate Limits & Caching Strategy

### Pollinations Rate Limits

| Tier | Limit | Signup |
|------|-------|--------|
| Anonymous | 1 req/15s | None |
| Seed (free) | 1 req/5s | Free registration |
| Flower | 1 req/3s | Paid |

### Production Caching Strategy

```typescript
// Cache generated images to your CDN
async function getOrGenerateImage(prompt: string, options: ImageOptions) {
  const cacheKey = createHash('md5')
    .update(prompt + JSON.stringify(options))
    .digest('hex');

  // Check CDN cache first
  const cached = await cdn.get(`images/${cacheKey}.png`);
  if (cached) return cached.url;

  // Generate and cache
  const imageUrl = buildPollinationsUrl(prompt, options);
  const imageBuffer = await fetch(imageUrl).then(r => r.buffer());
  const cdnUrl = await cdn.upload(`images/${cacheKey}.png`, imageBuffer);

  return cdnUrl;
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Slow generation | Use `turbo` model for faster results |
| Poor quality | Add quality modifiers, use `flux` or `flux-realism` |
| Wrong style | Specify style explicitly: "photograph", "illustration" |
| Watermark appears | Add `nologo=true` parameter |
| Inconsistent results | Use same `seed` parameter |
| Rate limited | Wait 15s between requests or register for higher limits |
| Image not loading | URL-encode the prompt properly |

## Integration with Frontend Design

When building websites/apps, this skill works seamlessly with frontend development:

1. **During Development**: Use Pollinations URLs directly as placeholders
2. **Before Production**: Generate final images and save to your CDN
3. **For Dynamic Content**: Use the API with proper caching

```tsx
// Development: Direct URL (fast iteration)
<img src="https://image.pollinations.ai/prompt/..." />

// Production: Cached on your CDN
<img src="https://your-cdn.com/images/hero-cached.png" />
```

## Activation Keywords

This skill activates automatically when you mention:
- "generate an image", "create a picture", "make an illustration"
- "hero image for", "banner for", "background for"
- "mockup of", "product shot", "app icon"
- "placeholder image", "avatar", "thumbnail"
- "illustration of", "graphic of", "visual for"
- Any image asset request during web/app development

## Documentation Site Assets (SpecWeave Brand)

When generating images for SpecWeave documentation sites, use these brand guidelines:

### Brand Colors for Prompts

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Purple | #7c3aed | Main brand color, gradients |
| Purple Dark | #6d28d9 | Accents, shadows |
| Purple Light | #a78bfa | Highlights, glows |
| Purple Darkest | #5b21b6 | Deep backgrounds |

**Include in prompts:** `purple violet gradient #7c3aed`, `professional SaaS aesthetic`

### Standard Docs Dimensions

| Asset Type | Width | Height | Model | Usage |
|------------|-------|--------|-------|-------|
| Hero Banner | 1920 | 1080 | flux | Homepage hero, landing pages |
| Feature Card | 800 | 600 | flux | Feature illustrations |
| Section Header | 1200 | 400 | flux | Section banners |
| Icon | 64 | 64 | flux | Navigation, feature icons |
| Empty State | 400 | 300 | flux-anime | Empty states, placeholders |
| Social Card | 1200 | 630 | flux | OG images, social sharing |

### Docs-Specific Prompt Templates

| Asset Type | Prompt Pattern |
|------------|---------------|
| **Hero** | `[concept] in abstract form, purple gradient #7c3aed to #a78bfa, professional SaaS, glowing nodes, dark background, 8k, clean minimal` |
| **Feature Illustration** | `isometric illustration of [feature], purple accent #7c3aed, white background, clean vector style, professional` |
| **Section Banner** | `abstract [theme] visualization, flowing lines, purple gradient #7c3aed, minimal, professional, wide format` |
| **Icon** | `minimal icon [concept], purple fill #7c3aed, white background, app icon style, centered, simple` |
| **Living Docs** | `interconnected documents with glowing purple connections #7c3aed, network visualization, professional, clean` |
| **Agent System** | `AI agents as geometric shapes in orbital formation, purple violet theme #7c3aed, futuristic, professional` |
| **Workflow** | `branching flowchart paths, glowing circuit lines, purple gradient #7c3aed, decision tree visualization, minimal` |

### SpecWeave Docs Ready-to-Use URLs

**Living Documentation Illustration:**
```
https://image.pollinations.ai/prompt/interconnected%20hexagonal%20document%20nodes%20forming%20network%2C%20glowing%20purple%20connections%20%237c3aed%2C%20gradient%20to%20%23a78bfa%2C%20professional%20SaaS%2C%20dark%20background%2C%208k%2C%20minimal%20vector?width=800&height=600&model=flux&nologo=true&seed=42
```

**Multi-Agent System Illustration:**
```
https://image.pollinations.ai/prompt/interconnected%20AI%20agents%20as%20geometric%20avatars%20in%20orbital%20formation%2C%20purple%20violet%20theme%20%237c3aed%2C%20futuristic%20holographic%2C%20professional%2C%20clean%20dark%20background%2C%208k?width=800&height=600&model=flux&nologo=true&seed=42
```

**Workflow/Decision Tree Illustration:**
```
https://image.pollinations.ai/prompt/branching%20flowchart%20paths%20made%20of%20glowing%20circuit%20lines%2C%20purple%20gradient%20%237c3aed%20to%20%23a78bfa%2C%20decision%20trees%2C%20minimal%20geometric%2C%20professional%2C%20dark%20background?width=800&height=600&model=flux&nologo=true&seed=42
```

## Related Skills

- **frontend-design**: For UI/UX design patterns
- **browser-automation**: For screenshot capture
- **docusaurus**: For documentation site setup
- **technical-writing**: For documentation content
