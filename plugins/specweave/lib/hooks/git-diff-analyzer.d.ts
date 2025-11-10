/**
 * Git Diff Analyzer
 *
 * Extracts modified files from git diff for reflection analysis
 * Parses git diff output to get file changes, line counts, and content
 *
 * @module git-diff-analyzer
 */
import { GitDiffInfo } from './types/reflection-types';
/**
 * Check if directory is a git repository
 * @param dir Directory to check (defaults to cwd)
 * @returns True if directory is in a git repository
 */
export declare function isGitRepository(dir?: string): boolean;
/**
 * Get list of modified files in the working directory
 * Includes both staged and unstaged changes
 *
 * @param cwd Working directory (optional, defaults to process.cwd())
 * @returns Array of file paths relative to git root
 */
export declare function getModifiedFilesList(cwd?: string): string[];
/**
 * Parse git diff numstat output to get line counts
 * Format: <added>\t<removed>\t<filename>
 *
 * @param numstatOutput Output from git diff --numstat
 * @returns Map of filename to {added, removed} counts
 */
export declare function parseNumstat(numstatOutput: string): Map<string, {
    added: number;
    removed: number;
}>;
/**
 * Get diff content for a specific file
 * @param file File path relative to git root
 * @param cwd Working directory (optional)
 * @returns Diff content as string
 */
export declare function getFileDiff(file: string, cwd?: string): string;
/**
 * Get current file content
 * @param file File path (can be absolute or relative to cwd)
 * @param cwd Working directory (optional)
 * @returns File content as string, or empty string if file doesn't exist
 */
export declare function getFileContent(file: string, cwd?: string): string;
/**
 * Get modified files with diff information
 * Main function for reflection analysis
 *
 * @param cwd Working directory (optional, defaults to process.cwd())
 * @param maxFiles Maximum number of files to return (optional, defaults to 100)
 * @returns Array of GitDiffInfo objects with file changes
 */
export declare function getModifiedFiles(cwd?: string, maxFiles?: number): GitDiffInfo[];
/**
 * Get summary statistics for modified files
 * Useful for reflection metadata
 *
 * @param modifiedFiles Array of GitDiffInfo objects
 * @returns Summary with file count, total lines added/removed
 */
export declare function getModifiedFilesSummary(modifiedFiles: GitDiffInfo[]): {
    count: number;
    linesAdded: number;
    linesRemoved: number;
    totalChanges: number;
};
/**
 * Filter files by extension
 * Useful for focusing reflection on specific file types
 *
 * @param modifiedFiles Array of GitDiffInfo objects
 * @param extensions Array of file extensions (e.g., ['.ts', '.js'])
 * @returns Filtered array of GitDiffInfo objects
 */
export declare function filterFilesByExtension(modifiedFiles: GitDiffInfo[], extensions: string[]): GitDiffInfo[];
/**
 * Exclude files matching patterns
 * Useful for excluding generated files, test files, etc.
 *
 * @param modifiedFiles Array of GitDiffInfo objects
 * @param patterns Array of glob patterns to exclude
 * @returns Filtered array of GitDiffInfo objects
 */
export declare function excludeFilesByPattern(modifiedFiles: GitDiffInfo[], patterns: string[]): GitDiffInfo[];
//# sourceMappingURL=git-diff-analyzer.d.ts.map