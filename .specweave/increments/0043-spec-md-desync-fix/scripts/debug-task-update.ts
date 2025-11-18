#!/usr/bin/env tsx
/**
 * Debug script to test updateTasksSection logic
 */

import fs from 'fs-extra';
import path from 'path';

const projectRoot = process.cwd();

const usFile = path.join(
  projectRoot,
  '.specweave/docs/internal/specs/specweave/FS-043/us-001-status-line-shows-correct-active-increment.md'
);

async function testUpdateTasksSection() {
  console.log('🔍 Testing updateTasksSection logic...\n');

  // Read current content
  const content = await fs.readFile(usFile, 'utf-8');

  console.log('📄 Current file length:', content.length);

  // Test regex
  const tasksRegex = /##\s+Tasks\s+([\s\S]*?)(?=\n##|$)/;
  const match = content.match(tasksRegex);

  console.log('\n🔍 Regex test:');
  console.log('   - Pattern:', tasksRegex.source);
  console.log('   - Match found:', !!match);

  if (match) {
    console.log('   - Matched content length:', match[1].length);
    console.log('   - Matched content preview:', match[1].substring(0, 100));
  }

  // Test replacement
  const mockTasks = `- [ ] **T-013**: Test Status Line Hook Reads Updated spec.md
- [ ] **T-014**: Test /specweave:done Updates spec.md
- [ ] **T-020**: Write E2E Test (Full Increment Lifecycle)
- [ ] **T-023**: Manual Testing Checklist Execution
- [ ] **T-024**: Update User Guide (Troubleshooting Section)`;

  console.log('\n🔄 Attempting replacement...');

  if (tasksRegex.test(content)) {
    const updatedContent = content.replace(
      tasksRegex,
      `## Tasks\n\n${mockTasks}\n`
    );

    console.log('   - Replacement successful');
    console.log('   - New content length:', updatedContent.length);
    console.log('   - Content changed:', updatedContent !== content);

    // Verify the replacement
    const verifyMatch = updatedContent.match(tasksRegex);
    if (verifyMatch) {
      console.log('\n✅ Verification:');
      console.log('   - Tasks section found after update');
      console.log('   - Preview:', verifyMatch[1].substring(0, 150));
    }

    // Write to temp file for inspection
    const tempFile = usFile + '.updated.tmp';
    await fs.writeFile(tempFile, updatedContent, 'utf-8');
    console.log(`\n💾 Updated content written to: ${tempFile}`);

  } else {
    console.log('   ❌ Regex test failed - cannot replace');
  }
}

testUpdateTasksSection();
