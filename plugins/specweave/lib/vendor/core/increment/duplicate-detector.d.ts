/**
 * Duplicate Detector - Scan filesystem and detect duplicate increments
 *
 * Detects increments that exist in multiple locations (active, archive, abandoned)
 * or have the same increment number with different names.
 *
 * Part of increment 0033: Duplicate Increment Prevention System
 */
import { IncrementStatus } from '../types/increment-metadata.js';
/**
 * Report of all duplicates found
 */
export interface DuplicateReport {
    duplicates: Duplicate[];
    totalChecked: number;
    duplicateCount: number;
}
/**
 * A duplicate increment (same number in multiple locations or with different names)
 */
export interface Duplicate {
    incrementNumber: string;
    locations: IncrementLocation[];
    recommendedWinner: IncrementLocation;
    losingVersions: IncrementLocation[];
    resolutionReason: string;
}
/**
 * Information about an increment location
 */
export interface IncrementLocation {
    path: string;
    name: string;
    status: IncrementStatus;
    lastActivity: string;
    fileCount: number;
    totalSize: number;
    hasReports: boolean;
    hasGitHubLink: boolean;
}
/**
 * Scan all increment folders and detect duplicates
 */
export declare function detectAllDuplicates(rootDir: string): Promise<DuplicateReport>;
/**
 * Detect duplicates for a specific increment number
 *
 * Returns ALL increments that have the given number, even if there's only one.
 * This is used for validation before creating a new increment.
 */
export declare function detectDuplicatesByNumber(incrementNumber: string, rootDir: string): Promise<IncrementLocation[]>;
//# sourceMappingURL=duplicate-detector.d.ts.map