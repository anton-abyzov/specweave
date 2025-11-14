import { SpecDistributor } from '../../../../dist/src/core/living-docs/spec-distributor.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncAll() {
  const projectRoot = path.resolve(__dirname, '../../../..');
  const incrementsDir = path.join(projectRoot, '.specweave', 'increments');
  const distributor = new SpecDistributor(projectRoot);

  // Get all increment folders
  const increments = (await fs.readdir(incrementsDir))
    .filter(name => name.match(/^\d{4}-/))
    .filter(name => {
      const specPath = path.join(incrementsDir, name, 'spec.md');
      return fs.existsSync(specPath);
    })
    .sort();

  console.log(`📦 Found ${increments.length} increments with spec.md`);
  console.log('');

  let success = 0;
  let errors = 0;

  for (const incrementId of increments) {
    try {
      console.log(`\n🔄 Processing ${incrementId}...`);
      await distributor.distribute(incrementId);
      success++;
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      errors++;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`✅ Summary:`);
  console.log(`   Success: ${success}/${increments.length}`);
  console.log(`   Errors: ${errors}`);
  console.log('='.repeat(60));
}

syncAll().catch(console.error);
