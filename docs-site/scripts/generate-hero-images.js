#!/usr/bin/env node

/**
 * Generate hero images for SpecWeave Docusaurus homepage
 * Using Google Gemini 2.5 Flash Image (nano banana)
 *
 * NEW: Multi-industry approach showing SpecWeave versatility
 * - Real Estate (left)
 * - Software Engineering (center - main use case)
 * - Trading/Finance (right)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

// SpecWeave brand colors
const BRAND_COLORS = {
  gradient: ['#667eea', '#764ba2'], // light mode
  gradientDark: ['#8b9eff', '#a68bdb'], // dark mode
};

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OUTPUT_DIR = path.join(__dirname, '../static/img/hero');

if (!GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY environment variable not set');
  console.error('   Get your API key from: https://aistudio.google.com/apikey');
  console.error('   Then run: export GEMINI_API_KEY="your-key-here"');
  process.exit(1);
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

/**
 * Image generation prompts with SpecWeave branding
 * Multi-industry approach to show versatility
 */
const IMAGE_PROMPTS = [
  {
    name: 'real-estate',
    prompt: `Create a realistic, photographic-style image of a real estate professional's workspace.

    Industry: REAL ESTATE
    Theme: Managing property listings, client documentation, contracts

    Style: Realistic photograph or semi-realistic digital art
    Lighting: Warm, natural office lighting with blue-purple accent (#667eea to #764ba2)

    Main Subject (VARIED POSE - NOT just sitting at screen):
    - Real estate agent/broker STANDING or LEANING over desk, reviewing documents
    - Person interacting with tablet showing property listings
    - Professional attire (business casual)
    - Dynamic pose: perhaps on phone, pointing at screen, or consulting with off-screen client

    Workspace Elements:
    - Desk with property brochures, contract documents spread out
    - Tablet or laptop showing PROPERTY MANAGEMENT SOFTWARE/DASHBOARD (clean UI, no branding)
    - Screen shows successful property listings, analytics, client data
    - Focus on SUCCESSFUL PRODUCT, not SpecWeave branding
    - Office phone, coffee, property photos/brochures
    - Background: modern real estate office with property photos on walls
    - Warm, professional lighting

    Industry-Specific Details:
    - Property photos/brochures prominently displayed
    - Professional real estate office atmosphere
    - Person actively working, not just sitting

    Composition: Dynamic real estate professional actively working
    Mood: Professional, active, business-focused

    IMPORTANT:
    - MUST look realistic/photographic
    - VARIED POSE - standing, leaning, or active (NOT just sitting at desk)
    - NO SpecWeave logos or branding - show successful property management product
    - Focus on professional results and active work
    - Aspect ratio: 16:9`,
  },
  {
    name: 'software-engineering',
    prompt: `Create a realistic, photographic-style image of a FEMALE software engineer's workspace.

    Industry: SOFTWARE ENGINEERING (Center - Main SpecWeave use case)
    Theme: Focused development, documentation, code architecture

    Style: Realistic photograph or semi-realistic digital art
    Lighting: Concentrated workspace lighting

    Main Subject (CENTER - WOMAN - VARIED POSE):
    - FEMALE software developer/engineer
    - VARIED POSE: Perhaps STANDING at standing desk, PRESENTING to colleagues, or WALKING with laptop
    - NOT just sitting at desk like the other images
    - Casual tech attire (professional casual)
    - Confident, engaged posture

    Workspace Elements:
    - Large monitor or laptop visible
    - PRIMARY SCREEN: GitHub repository page showing github.com/anton-abyzov/specweave
    - Screen displays: GitHub interface with SpecWeave repository, README visible, repository structure
    - Make it look like actual GitHub page with dark/light theme
    - Show repository with stars, forks, code structure visible
    - Clean, modern tech workspace
    - Optional: whiteboard with diagrams in background
    - Coffee, notebooks, tech accessories
    - Background: modern tech office, natural lighting

    Industry-Specific Details:
    - Terminal/code clearly visible on screen
    - Tech workspace aesthetic (modern, minimal)
    - Engineering-focused but dynamic environment

    Composition: Female engineer in dynamic pose, modern tech workspace
    Mood: Confident, professional, modern

    IMPORTANT:
    - MUST be FEMALE software engineer
    - MUST show GitHub page: github.com/anton-abyzov/specweave repository
    - VARIED POSE - standing, presenting, or active (NOT just sitting)
    - GitHub interface should look realistic (dark or light theme)
    - Show actual repository page with README, files, structure
    - Professional but dynamic composition
    - Aspect ratio: 16:9`,
  },
  {
    name: 'trading',
    prompt: `Create a realistic, photographic-style image of a financial trader's workspace.

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
    - Aspect ratio: 16:9`,
  },
];

/**
 * Generate a single image
 */
async function generateImage(prompt, filename) {
  console.log(`🎨 Generating: ${filename}...`);

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4, // Lower for more consistent brand aesthetic
      },
    });

    const response = result.response;

    // Extract image data
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
    const outputPath = path.join(OUTPUT_DIR, filename);
    await fs.writeFile(outputPath, imageBuffer);

    console.log(`   ✅ Saved: ${outputPath}`);
    console.log(`   📏 Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

    return outputPath;
  } catch (error) {
    console.error(`   ❌ Error generating ${filename}:`, error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 SpecWeave Hero Image Generator');
  console.log('   Using: Gemini 2.5 Flash Image (nano banana)');
  console.log('   Brand: Blue-purple gradient (#667eea → #764ba2)');
  console.log('   Strategy: Multi-industry approach (Real Estate, Software, Trading)\n');

  // Create output directory
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);
  } catch (error) {
    console.error('❌ Failed to create output directory:', error.message);
    process.exit(1);
  }

  // Generate images
  const results = [];
  for (const config of IMAGE_PROMPTS) {
    try {
      const filename = `${config.name}.png`;
      const outputPath = await generateImage(config.prompt, filename);
      results.push({ name: config.name, path: outputPath, success: true });
    } catch (error) {
      results.push({ name: config.name, success: false, error: error.message });
    }
    console.log(); // Blank line for readability
  }

  // Summary
  console.log('📊 Generation Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`   ✅ Successful: ${successful}/${IMAGE_PROMPTS.length}`);
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed}/${IMAGE_PROMPTS.length}`);
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`      - ${r.name}: ${r.error}`));
  }

  console.log('\n💰 Estimated Cost:');
  console.log(`   ${successful} images × $0.039 = $${(successful * 0.039).toFixed(3)}`);
  console.log('   (Based on 1290 tokens per image at $30/1M tokens)\n');

  if (successful > 0) {
    console.log('✅ Next steps:');
    console.log('   1. Review generated images in: static/img/hero/');
    console.log('   2. Update src/components/HomepageFeatures/index.tsx');
    console.log('   3. Test in both light and dark modes');
    console.log('   4. Commit changes to git\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
