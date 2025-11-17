import * as fs from 'fs';
import * as path from 'path';
import { ServerlessPlatform } from './types.js';

/**
 * Loads and manages serverless platform data from the knowledge base
 */
export class PlatformDataLoader {
  private platformsDir: string;
  private platforms: Map<string, ServerlessPlatform> = new Map();

  constructor() {
    // Determine path to knowledge base (works from both src/ and dist/)
    const rootDir = path.join(__dirname, '../../..');
    this.platformsDir = path.join(rootDir, 'plugins/specweave/knowledge-base/serverless/platforms');
  }

  /**
   * Load all platform data files
   */
  async loadAll(): Promise<ServerlessPlatform[]> {
    const platformFiles = [
      'aws-lambda.json',
      'azure-functions.json',
      'gcp-cloud-functions.json',
      'firebase.json',
      'supabase.json'
    ];

    const platforms: ServerlessPlatform[] = [];

    for (const file of platformFiles) {
      const filePath = path.join(this.platformsDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      platforms.push(data);
      this.platforms.set(data.id, data);
    }

    return platforms;
  }

  /**
   * Load a specific platform by ID
   */
  async loadById(id: string): Promise<ServerlessPlatform | undefined> {
    if (this.platforms.size === 0) {
      await this.loadAll();
    }
    return this.platforms.get(id);
  }

  /**
   * Get all loaded platforms
   */
  getAllPlatforms(): ServerlessPlatform[] {
    return Array.from(this.platforms.values());
  }
}
