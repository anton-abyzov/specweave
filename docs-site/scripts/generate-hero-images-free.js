#!/usr/bin/env node

/**
 * Generate hero images for SpecWeave Docusaurus homepage
 * Using Pollinations.ai - FREE, no API key required!
 *
 * Usage: npm run generate:hero-images-free
 *
 * Brand colors: #7c3aed (purple primary), #a78bfa (light purple)
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// SpecWeave brand colors
const BRAND = {
  primary: '#7c3aed',
  primaryLight: '#a78bfa',
  gradient: 'purple violet gradient #7c3aed to #a78bfa',
};

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../static/img/hero');

// Enterprise-grade marketing prompts for public documentation
const ENTERPRISE_STYLE = {
  base: 'professional SaaS aesthetic, premium quality, polished, aspirational',
  background: 'dark gradient background, subtle glow, dramatic lighting',
  quality: '8k uhd, high resolution, sharp focus, highly detailed',
};

/**
 * Image generation configs for homepage features
 */
const IMAGE_CONFIGS = [
  {
    name: 'greenfield',
    prompt: `Futuristic isometric view of building construction from blueprint to reality,
architectural blueprint morphing into glowing 3D building structure,
${BRAND.gradient} color scheme, geometric nodes and connection lines,
digital transformation visualization, ${ENTERPRISE_STYLE.base},
${ENTERPRISE_STYLE.background}, ${ENTERPRISE_STYLE.quality},
no text no logos, wide aspect ratio`,
    width: 1200,
    height: 675,
    model: 'flux',
  },
  {
    name: 'brownfield',
    prompt: `Abstract visualization of legacy code transformation,
old tangled wires transforming into organized geometric patterns,
chaos to order transformation, ${BRAND.gradient} color scheme,
data streams flowing from old system to modern architecture,
${ENTERPRISE_STYLE.base}, ${ENTERPRISE_STYLE.background},
${ENTERPRISE_STYLE.quality}, no text no logos, wide aspect ratio`,
    width: 1200,
    height: 675,
    model: 'flux',
  },
  {
    name: 'compliance',
    prompt: `Enterprise compliance and security visualization,
shield icon protecting interconnected hexagonal network of documents,
audit trail visualization with checkmarks and verification symbols,
${BRAND.gradient} color scheme, professional corporate aesthetic,
${ENTERPRISE_STYLE.base}, ${ENTERPRISE_STYLE.background},
${ENTERPRISE_STYLE.quality}, no text no logos, wide aspect ratio`,
    width: 1200,
    height: 675,
    model: 'flux',
  },
];

/**
 * Build Pollinations.ai URL
 */
function buildPollinationsUrl(prompt, width, height, model, seed) {
  const encodedPrompt = encodeURIComponent(prompt.replace(/\n/g, ' ').trim());
  let url = `https://image.pollinations.ai/prompt/${encodedPrompt}`;
  url += `?width=${width}&height=${height}&model=${model}&nologo=true`;
  if (seed) {
    url += `&seed=${seed}`;
  }
  return url;
}

/**
 * Download image from URL
 */
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(outputPath);

    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadImage(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(outputPath);
      });
      file.on('error', (err) => {
        require('fs').unlink(outputPath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      require('fs').unlink(outputPath, () => {});
      reject(err);
    });
  });
}

/**
 * Generate a single image
 */
async function generateImage(config) {
  const { name, prompt, width, height, model } = config;
  const filename = `${name}.jpg`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  console.log(`\n🎨 Generating: ${name}`);
  console.log(`   📐 Size: ${width}x${height}`);
  console.log(`   🤖 Model: ${model}`);

  // Use a consistent seed for reproducibility (optional)
  const seed = Date.now();
  const url = buildPollinationsUrl(prompt, width, height, model, seed);

  console.log(`   🌐 Fetching from Pollinations.ai...`);

  try {
    await downloadImage(url, outputPath);
    const stats = await fs.stat(outputPath);
    console.log(`   ✅ Saved: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
    return { name, success: true, path: outputPath };
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return { name, success: false, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  SpecWeave Hero Image Generator (FREE - Pollinations.ai) ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Brand: Purple gradient (#7c3aed → #a78bfa)              ║');
  console.log('║  Style: Enterprise marketing-grade                       ║');
  console.log('║  Cost: FREE (no API key required!)                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // Create output directory
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`\n📁 Output: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('❌ Failed to create output directory:', error.message);
    process.exit(1);
  }

  // Generate images
  const results = [];
  for (const config of IMAGE_CONFIGS) {
    const result = await generateImage(config);
    results.push(result);

    // Small delay between requests to be respectful to the free service
    if (config !== IMAGE_CONFIGS[IMAGE_CONFIGS.length - 1]) {
      console.log('   ⏳ Waiting 2s before next image...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Generation Summary');
  console.log('═'.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`   ✅ Successful: ${successful}/${IMAGE_CONFIGS.length}`);
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed}/${IMAGE_CONFIGS.length}`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`      - ${r.name}: ${r.error}`);
    });
  }

  console.log(`\n   💰 Cost: $0.00 (Pollinations.ai is FREE!)`);

  if (successful > 0) {
    console.log('\n✅ Next steps:');
    console.log('   1. Review generated images in: static/img/hero/');
    console.log('   2. Rebuild docs: npm run build');
    console.log('   3. Preview: npm run serve');
    console.log('   4. Commit changes: git add . && git commit\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
