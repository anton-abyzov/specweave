#!/usr/bin/env node

/**
 * Generate ONLY the trading image (to fix logo issue)
 * Using Google Gemini 2.5 Flash Image (nano banana)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OUTPUT_DIR = path.join(__dirname, '../static/img/hero');

if (!GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY environment variable not set');
  process.exit(1);
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

const TRADING_PROMPT = `Create a realistic, photographic-style image of a financial trader's workspace.

Industry: TRADING / FINANCE
Theme: Financial analysis, trading documentation, market research

Style: Realistic photograph or semi-realistic digital art
Lighting: Dynamic workspace with multiple screens, blue-purple accent (#667eea to #764ba2)

Main Subject (CENTER):
- Financial trader/analyst at trading desk
- Person viewed from side/back angle (SCREENS are the focus, not person's face)
- Business casual attire
- Actively monitoring screens, engaged posture

Workspace Elements:
- Multiple monitors (3-4 screens) showing ONLY financial data
- ALL SCREENS: ONLY show candlestick charts, line graphs, order books, market data tables
- Trading software interface with NUMBERS, CHARTS, DATA - absolutely NO icons, NO symbols, NO logos
- Professional trading dashboard showing: price charts, volume indicators, technical analysis
- Screens filled with financial information: stock tickers, crypto prices, forex data
- CRITICAL: NO circular logos, NO "SW" text, NO company branding anywhere on screens
- Just pure trading data visualization: green/red candles, moving averages, volume bars
- Desk with notebook, calculator, mobile phone, coffee
- LED accent lighting (blue-purple) on desk or behind monitors
- Background: trading floor or modern financial office atmosphere
- Professional, high-energy workspace

Industry-Specific Details:
- Financial charts/graphs visible on multiple screens
- Real-time market data (numbers changing)
- Professional financial workspace aesthetic
- Multiple screens showing DIFFERENT charts/markets (not all the same)

Composition: Trader at multi-monitor setup, view from side/back, focus on data-filled screens
Mood: Professional, dynamic, data-focused, high-energy

CRITICAL REQUIREMENTS:
- MUST look realistic/photographic
- Real trader/analyst at work
- SCREENS must show ONLY trading data (charts, numbers, graphs)
- ABSOLUTELY NO logos, icons, or symbols on any screen
- NO circular designs, NO "SW" text, NO branding elements
- If you can't avoid logos, show screens from back/side angle where content isn't visible
- Sitting pose is OK for this one (different from other two images)
- Blue-purple LED lighting accent
- Aspect ratio: 16:9`;

async function generateImage() {
  console.log('🚀 Generating Trading Image (fixing logo issue)');
  console.log('   Using: Gemini 2.5 Flash Image\n');

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: TRADING_PROMPT }] }],
      generationConfig: {
        temperature: 0.4,
      },
    });

    const response = result.response;

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No image generated');
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('No image content in response');
    }

    const imagePart = candidate.content.parts.find(part => part.inlineData);
    if (!imagePart || !imagePart.inlineData) {
      throw new Error('No image data found in response');
    }

    // Save image
    const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
    const outputPath = path.join(OUTPUT_DIR, 'trading.png');
    await fs.writeFile(outputPath, imageBuffer);

    console.log(`   ✅ Saved: ${outputPath}`);
    console.log(`   📏 Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
    console.log('\n✅ Trading image regenerated successfully!');
    console.log('   Cost: ~$0.039');

  } catch (error) {
    console.error(`   ❌ Error generating trading.png:`, error.message);
    throw error;
  }
}

generateImage().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
