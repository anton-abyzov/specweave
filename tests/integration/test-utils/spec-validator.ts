import path from 'path';
import fs from 'fs-extra';
import matter from 'gray-matter';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';

export class SpecValidator {
  static async readFrontmatter(
    testRoot: string,
    incrementId: string
  ): Promise<Record<string, any>> {
    const specPath = path.join(
      testRoot,
      '.specweave/increments',
      incrementId,
      'spec.md'
    );

    const content = await fs.readFile(specPath, 'utf-8');
    const { data } = matter(content);

    return data;
  }

  static async assertStatus(
    testRoot: string,
    incrementId: string,
    expectedStatus: IncrementStatus
  ): Promise<void> {
    const frontmatter = await this.readFrontmatter(testRoot, incrementId);

    if (frontmatter.status !== expectedStatus) {
      throw new Error(
        `Expected status "${expectedStatus}" but got "${frontmatter.status}"`
      );
    }
  }

  static async assertFieldExists(
    testRoot: string,
    incrementId: string,
    fieldName: string
  ): Promise<void> {
    const frontmatter = await this.readFrontmatter(testRoot, incrementId);

    if (!(fieldName in frontmatter)) {
      throw new Error(`Expected field "${fieldName}" to exist in frontmatter`);
    }
  }
}
