import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

/**
 * Create a temporary directory for testing
 * @param prefix Prefix for the temp directory name
 * @returns Absolute path to the created temp directory
 */
export async function createTempDir(prefix = 'specweave-test-'): Promise<string> {
  const tmpDir = os.tmpdir();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const dirName = `${prefix}${timestamp}-${random}`;
  const dirPath = path.join(tmpDir, dirName);

  await fs.ensureDir(dirPath);

  return dirPath;
}

/**
 * Clean up a temporary directory and all its contents
 * @param dirPath Path to the directory to remove
 */
export async function cleanupTempDir(dirPath: string): Promise<void> {
  if (!dirPath) {
    throw new Error('Directory path is required');
  }

  // Safety check: only delete directories in temp folder
  const tmpDir = os.tmpdir();
  if (!dirPath.startsWith(tmpDir)) {
    throw new Error(`Refusing to delete directory outside temp folder: ${dirPath}`);
  }

  // Check if directory exists before trying to remove
  const exists = await fs.pathExists(dirPath);
  if (exists) {
    await fs.remove(dirPath);
  }
}

/**
 * Execute a function with a temporary directory that is automatically cleaned up
 * @param fn Function to execute with the temp directory path
 * @returns Result of the function
 */
export async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dirPath = await createTempDir();

  try {
    const result = await fn(dirPath);
    return result;
  } finally {
    // Clean up even if the function throws an error
    await cleanupTempDir(dirPath);
  }
}

/**
 * Create a temporary directory with a specific structure
 * @param structure Object describing the directory structure
 * @param prefix Prefix for the temp directory name
 * @returns Absolute path to the created temp directory
 *
 * @example
 * const dir = await createTempDirWithStructure({
 *   'file1.txt': 'content',
 *   'subdir': {
 *     'file2.txt': 'content'
 *   }
 * });
 */
export async function createTempDirWithStructure(
  structure: Record<string, string | Record<string, any>>,
  prefix = 'specweave-test-'
): Promise<string> {
  const dirPath = await createTempDir(prefix);

  async function createStructure(basePath: string, struct: Record<string, any>): Promise<void> {
    for (const [name, value] of Object.entries(struct)) {
      const fullPath = path.join(basePath, name);

      if (typeof value === 'string') {
        // It's a file
        await fs.writeFile(fullPath, value, 'utf-8');
      } else if (typeof value === 'object' && value !== null) {
        // It's a directory
        await fs.ensureDir(fullPath);
        await createStructure(fullPath, value);
      }
    }
  }

  await createStructure(dirPath, structure);

  return dirPath;
}

/**
 * Copy a directory to a temporary location for testing
 * @param sourcePath Path to the source directory
 * @param prefix Prefix for the temp directory name
 * @returns Absolute path to the copied temp directory
 */
export async function copyToTempDir(sourcePath: string, prefix = 'specweave-test-'): Promise<string> {
  const tempDir = await createTempDir(prefix);
  await fs.copy(sourcePath, tempDir);
  return tempDir;
}
