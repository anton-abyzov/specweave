#!/usr/bin/env node

/**
 * Generate hero images for SpecWeave Docusaurus homepage
 * Using Google Gemini 2.5 Flash Image (nano banana)
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
 */
const IMAGE_PROMPTS = [
  {
    name: 'easy-to-use',
    prompt: `Create a modern, minimalist illustration for a technical documentation website.
    Theme: "Easy to Use" - showing simplicity and quick setup.
    Style: Flat design with geometric shapes, clean lines.
    Colors: Use blue-purple gradient (#667eea to #764ba2).
    Elements: Abstract representation of code/documentation with mountains/landscape in the background,
    a friendly dinosaur character (like in the reference), simple geometric shapes (triangles, circles).
    Mood: Welcoming, approachable, professional.
    NO text in the image.
    Aspect ratio: 16:9, suitable for web hero section.`,
  },
  {
    name: 'focus-on-what-matters',
    prompt: `Create a modern, minimalist illustration for a technical documentation website.
    Theme: "Focus on What Matters" - showing concentration on documentation while automation handles complexity.
    Style: Flat design with geometric shapes, clean lines.
    Colors: Use blue-purple gradient (#667eea to #764ba2).
    Elements: A large screen/monitor showing abstract code or documentation structure,
    a friendly dinosaur character focused on work, geometric trees/plants for balance.
    Mood: Productive, organized, focused.
    NO text in the image.
    Aspect ratio: 16:9, suitable for web hero section.`,
  },
  {
    name: 'powered-by-react',
    prompt: `Create a modern, minimalist illustration for a technical documentation website.
    Theme: "Powered by React" - showing extensibility and component-based architecture.
    Style: Flat design with geometric shapes, clean lines.
    Colors: Use blue-purple gradient (#667eea to #764ba2).
    Elements: Abstract representation of modular components/building blocks,
    a friendly dinosaur character working with UI elements, geometric shapes representing React components.
    Mood: Modern, flexible, powerful.
    NO text in the image.
    Aspect ratio: 16:9, suitable for web hero section.`,
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
  console.log('   Brand: Blue-purple gradient (#667eea → #764ba2)\n');

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
    console.log('   2. Update src/pages/index.tsx with new image paths');
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
