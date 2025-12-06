/**
 * File Sampler
 * 
 * Intelligently selects representative files from a repo for LLM analysis.
 * Prioritizes high-value files while respecting size limits.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import type { FileSample } from './types.js';

/**
 * Configuration for file sampling
 */
export interface SamplingConfig {
  maxFiles: number;
  maxLinesPerFile: number;
  maxTotalChars: number;
}

const DEFAULT_CONFIG: SamplingConfig = {
  maxFiles: 20,
  maxLinesPerFile: 500,
  maxTotalChars: 100000, // ~100KB total
};

/**
 * Priority file patterns - checked in order
 */
const PRIORITY_PATTERNS = [
  // Tier 1: Always include if exists
  { pattern: 'README.md', type: 'readme' as const, priority: 1 },
  { pattern: 'readme.md', type: 'readme' as const, priority: 1 },
  { pattern: 'package.json', type: 'config' as const, priority: 1 },
  { pattern: 'tsconfig.json', type: 'config' as const, priority: 1 },
  { pattern: 'pyproject.toml', type: 'config' as const, priority: 1 },
  { pattern: 'go.mod', type: 'config' as const, priority: 1 },
  { pattern: 'Cargo.toml', type: 'config' as const, priority: 1 },
  { pattern: 'pom.xml', type: 'config' as const, priority: 1 },
  
  // Tier 2: Entry points
  { pattern: 'src/index.ts', type: 'entry' as const, priority: 2 },
  { pattern: 'src/main.ts', type: 'entry' as const, priority: 2 },
  { pattern: 'src/app.ts', type: 'entry' as const, priority: 2 },
  { pattern: 'src/server.ts', type: 'entry' as const, priority: 2 },
  { pattern: 'index.ts', type: 'entry' as const, priority: 2 },
  { pattern: 'main.ts', type: 'entry' as const, priority: 2 },
  { pattern: 'app.ts', type: 'entry' as const, priority: 2 },
  { pattern: 'main.py', type: 'entry' as const, priority: 2 },
  { pattern: 'app.py', type: 'entry' as const, priority: 2 },
  { pattern: 'main.go', type: 'entry' as const, priority: 2 },
  { pattern: 'cmd/main.go', type: 'entry' as const, priority: 2 },
  
  // Tier 3: API surfaces (glob patterns)
  { pattern: 'src/routes/**/*.ts', type: 'api' as const, priority: 3 },
  { pattern: 'src/api/**/*.ts', type: 'api' as const, priority: 3 },
  { pattern: 'src/controllers/**/*.ts', type: 'api' as const, priority: 3 },
  { pattern: 'src/handlers/**/*.ts', type: 'api' as const, priority: 3 },
  { pattern: 'routes/**/*.ts', type: 'api' as const, priority: 3 },
  { pattern: 'api/**/*.ts', type: 'api' as const, priority: 3 },
  
  // Tier 4: Domain models
  { pattern: 'src/models/**/*.ts', type: 'model' as const, priority: 4 },
  { pattern: 'src/types/**/*.ts', type: 'model' as const, priority: 4 },
  { pattern: 'src/entities/**/*.ts', type: 'model' as const, priority: 4 },
  { pattern: 'src/schemas/**/*.ts', type: 'model' as const, priority: 4 },
  { pattern: 'src/domain/**/*.ts', type: 'model' as const, priority: 4 },
  { pattern: 'models/**/*.ts', type: 'model' as const, priority: 4 },
  { pattern: 'types/**/*.ts', type: 'model' as const, priority: 4 },
];

/**
 * Sample files from a repo for LLM analysis
 */
export async function sampleRepoFiles(
  repoPath: string,
  config: SamplingConfig = DEFAULT_CONFIG
): Promise<FileSample[]> {
  const samples: FileSample[] = [];
  const includedPaths = new Set<string>();
  let totalChars = 0;
  
  // Phase 1: Include priority files
  for (const { pattern, type, priority } of PRIORITY_PATTERNS) {
    if (samples.length >= config.maxFiles) break;
    if (totalChars >= config.maxTotalChars) break;
    
    try {
      const matches = await glob(pattern, {
        cwd: repoPath,
        nodir: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
      });
      
      for (const match of matches.slice(0, priority === 1 ? 5 : 2)) {
        if (includedPaths.has(match)) continue;
        if (samples.length >= config.maxFiles) break;
        
        const sample = await readFileSample(repoPath, match, type, config.maxLinesPerFile);
        if (sample && totalChars + sample.content.length <= config.maxTotalChars) {
          samples.push(sample);
          includedPaths.add(match);
          totalChars += sample.content.length;
        }
      }
    } catch {
      // Pattern didn't match, continue
    }
  }
  
  // Phase 2: Fill remaining slots with other interesting files
  if (samples.length < config.maxFiles && totalChars < config.maxTotalChars) {
    try {
      const allFiles = await glob('**/*.{ts,js,tsx,jsx,py,go,java,rs}', {
        cwd: repoPath,
        nodir: true,
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/.git/**',
          '**/*.test.*',
          '**/*.spec.*',
          '**/__tests__/**',
        ],
      });
      
      // Sort by likely importance (shorter paths, src/ prefix)
      const sortedFiles = allFiles
        .filter(f => !includedPaths.has(f))
        .sort((a, b) => {
          const aScore = getFileImportanceScore(a);
          const bScore = getFileImportanceScore(b);
          return bScore - aScore;
        });
      
      for (const file of sortedFiles) {
        if (samples.length >= config.maxFiles) break;
        if (totalChars >= config.maxTotalChars) break;
        
        const sample = await readFileSample(repoPath, file, 'other', config.maxLinesPerFile);
        if (sample && totalChars + sample.content.length <= config.maxTotalChars) {
          samples.push(sample);
          includedPaths.add(file);
          totalChars += sample.content.length;
        }
      }
    } catch {
      // Glob failed, continue with what we have
    }
  }
  
  return samples;
}

/**
 * Read a file and create a sample
 */
async function readFileSample(
  repoPath: string,
  relativePath: string,
  type: FileSample['type'],
  maxLines: number
): Promise<FileSample | null> {
  const fullPath = path.join(repoPath, relativePath);
  
  try {
    const stats = fs.statSync(fullPath);
    if (stats.size > 500000) return null; // Skip files > 500KB
    
    let content = fs.readFileSync(fullPath, 'utf-8');
    let truncated = false;
    
    const lines = content.split('\n');
    if (lines.length > maxLines) {
      content = lines.slice(0, maxLines).join('\n');
      content += `\n\n// ... truncated (${lines.length - maxLines} more lines)`;
      truncated = true;
    }
    
    return {
      path: relativePath,
      content,
      type,
      truncated,
    };
  } catch {
    return null;
  }
}

/**
 * Score file importance for sorting
 */
function getFileImportanceScore(filePath: string): number {
  let score = 0;
  
  // Prefer shorter paths (closer to root)
  score += Math.max(0, 10 - filePath.split('/').length);
  
  // Prefer src/ files
  if (filePath.startsWith('src/')) score += 5;
  
  // Prefer index files
  if (filePath.includes('index.')) score += 3;
  
  // Prefer files with meaningful names
  const name = path.basename(filePath, path.extname(filePath));
  if (['app', 'main', 'server', 'client', 'api', 'service', 'controller'].includes(name)) {
    score += 4;
  }
  
  // Deprioritize utility files
  if (['utils', 'helpers', 'constants', 'config'].includes(name)) {
    score -= 2;
  }
  
  return score;
}

/**
 * Format samples for LLM prompt
 */
export function formatSamplesForPrompt(samples: FileSample[]): string {
  const sections: string[] = [];
  
  for (const sample of samples) {
    const header = `=== ${sample.path} (${sample.type}) ===`;
    sections.push(`${header}\n${sample.content}`);
  }
  
  return sections.join('\n\n');
}
