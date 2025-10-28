# Trading Image Logo Fix - Instructions

## Current Situation

**Date**: 2025-10-27
**Issue**: Trading image (`static/img/hero/trading.png`) contains an "SW" logo on the center monitor screen that should NOT be there.

**API Status**: Hit Google Gemini free tier daily quota limit (18 images generated today)

## Current Images Status

| Image | Status | Notes |
|-------|--------|-------|
| **real-estate.png** | ✅ **PERFECT** | Real estate professional leaning over desk, varied pose, property photos visible, NO logos |
| **software-engineering.png** | ✅ **GOOD** | Female engineer standing/presenting (varied pose), GitHub-like interface visible, meets requirements |
| **trading.png** | ❌ **HAS LOGO** | Shows "SW" circular logo on center monitor - needs to be removed |

## Solution Options

### Option 1: Regenerate via API (Tomorrow)

**When**: After 24 hours from first API request (daily quota resets)

**Command**:
```bash
cd docs-site
npm run generate:trading-only
```

**What it does**:
- Generates ONLY the trading image (not all three)
- Uses updated prompt with VERY explicit "NO logos" instructions
- Cost: $0.039 (1 image)

**Updated prompt includes**:
- "ABSOLUTELY NO logos, icons, or symbols on any screen"
- "NO circular designs, NO 'SW' text, NO branding elements"
- "SCREENS must show ONLY trading data (charts, numbers, graphs)"
- "If you can't avoid logos, show screens from back/side angle where content isn't visible"

**Expected result**: Trading image without any logos, showing only financial charts and data.

### Option 2: Manual Editing (Today)

**Tools**: Photoshop, GIMP, Preview (Mac), Affinity Photo, or any image editor

**Steps**:
1. Open `static/img/hero/trading.png`
2. Use clone stamp tool or healing brush
3. Sample from surrounding screen area (trading charts)
4. Paint over the "SW" logo to replace with trading data
5. Save and reload site

**Time**: 2-5 minutes

### Option 3: Use As-Is (Not Recommended)

The logo is subtle but visible, which doesn't align with the "no SpecWeave branding" requirement.

## Recommended Approach

**Use Option 1** (regenerate tomorrow):
- ✅ Cleanest solution
- ✅ No manual editing artifacts
- ✅ Updated prompt should prevent logo
- ✅ Only $0.039 cost
- ⚠️ Requires waiting ~24 hours

## Files Modified

### Scripts Created
- `scripts/generate-hero-images.js` - Main generation script (all 3 images)
- `scripts/generate-trading-only.js` - Single image generation (trading only)

### Package.json
Added npm scripts:
```json
"generate:hero-images": "node scripts/generate-hero-images.js",
"generate:trading-only": "node scripts/generate-trading-only.js"
```

### Updated Prompt (in generate-trading-only.js)

Key changes from previous iterations:
```javascript
Workspace Elements:
- Multiple monitors (3-4 screens) showing ONLY financial data
- ALL SCREENS: ONLY show candlestick charts, line graphs, order books, market data tables
- Trading software interface with NUMBERS, CHARTS, DATA - absolutely NO icons, NO symbols, NO logos
- CRITICAL: NO circular logos, NO "SW" text, NO company branding anywhere on screens
- Just pure trading data visualization: green/red candles, moving averages, volume bars

CRITICAL REQUIREMENTS:
- SCREENS must show ONLY trading data (charts, numbers, graphs)
- ABSOLUTELY NO logos, icons, or symbols on any screen
- NO circular designs, NO "SW" text, NO branding elements
- If you can't avoid logos, show screens from back/side angle where content isn't visible
```

## Cost Summary

**Today (2025-10-27)**:
- 18 images generated (6 iterations × 3 images)
- Total cost: ~$0.702
- Iterations:
  1. Cartoon dinosaurs (rejected)
  2. Realistic single industry (accepted style)
  3. Multi-industry with logos (logo issues began)
  4. Fixed prompts (logo persisted)
  5. More explicit prompts (logo persisted)
  6. Final attempt (logo still present, quota exhausted)

**Tomorrow**:
- 1 image to regenerate
- Cost: $0.039

**Total project cost**: ~$0.741

## API Quota Information

**Free Tier Limits**:
- Per day: Limited number of requests
- Per minute: Limited tokens
- Model: `gemini-2.5-flash-image` (preview)

**Monitoring**:
- Usage dashboard: https://ai.dev/usage?tab=rate-limit
- API key: Set in `.env` as `GEMINI_API_KEY`

## Next Steps

**Tomorrow**:
1. ✅ Wait for quota reset (~24 hours from first request)
2. ✅ Run: `npm run generate:trading-only`
3. ✅ Verify trading.png has no logos
4. ✅ Reload site at http://localhost:3013
5. ✅ Commit changes to git

**Alternative (today)**:
1. Manually edit `static/img/hero/trading.png`
2. Remove SW logo using clone/healing tool
3. Reload site to verify
4. Commit changes

## Site Preview

**Development server**: http://localhost:3013
**Build command**: `npm run build`
**Serve command**: `npm run serve`

## Notes

- Real estate and software engineering images are **perfect** and should NOT be regenerated
- The trading image is **very close** - only the logo needs removal
- The overall composition, lighting, and industry representation are excellent
- All three images show varied poses (leaning, standing/presenting, sitting) as requested
- Multi-industry approach successfully shows SpecWeave's versatility
