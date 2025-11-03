#!/usr/bin/env node
/**
 * Extract console.log/error/warn strings from CLI files
 * Generates locale catalog for i18n migration
 */

const fs = require('fs');
const path = require('path');

const cliFiles = [
  'src/cli/commands/init.ts',
  'src/cli/commands/plugin.ts',
  'src/cli/commands/list.ts',
  'src/cli/commands/install.ts'
];

const catalog = {
  init: {},
  plugin: {},
  list: {},
  install: {},
  common: {}
};

let counter = 0;

cliFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const category = path.basename(file, '.ts');
  
  lines.forEach((line, index) => {
    if (line.includes('console.log') || line.includes('console.error') || line.includes('console.warn')) {
      // Extract the string content (simplified - assumes basic patterns)
      const match = line.match(/console\.\w+\((.*)\)/);
      if (match) {
        const key = `string_${counter++}`;
        const rawContent = match[1];
        
        // Store for analysis
        catalog[category][key] = {
          line: index + 1,
          raw: rawContent.substring(0, 100), // First 100 chars
          type: line.includes('console.error') ? 'error' : line.includes('console.warn') ? 'warn' : 'log'
        };
      }
    }
  });
});

console.log(JSON.stringify(catalog, null, 2));
console.log('\n---');
console.log(`Total strings found: ${counter}`);
console.log(`By file:`);
Object.entries(catalog).forEach(([cat, strings]) => {
  console.log(`  ${cat}: ${Object.keys(strings).length}`);
});

