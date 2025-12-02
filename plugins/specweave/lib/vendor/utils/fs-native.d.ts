/**
 * Native Node.js fs API Helpers
 *
 * Drop-in replacements for fs-extra methods using only Node.js stdlib.
 * All methods use native Node.js 20+ APIs with no external dependencies.
 *
 * Migration from fs-extra: // legacy fs-extra (documentation only)
 * - import fs from 'fs-extra' → import * as fs from './utils/fs-native.js' // legacy fs-extra
 * - All fs-extra methods work as drop-in replacements
 *
 * Benefits:
 * - Zero bundle overhead (no npm packages)
 * - Works in marketplace (no node_modules needed)
 * - Faster startup (native APIs)
 * - Better debugging (native stack traces)
 */
import { promises as fsPromises, existsSync, mkdirSync, readFileSync, writeFileSync, statSync, readdirSync, rmSync, unlinkSync, copyFileSync, renameSync as fsRenameSync, mkdtempSync as fsMkdtempSync } from 'fs';
/**
 * Ensures that a directory exists. If the directory does not exist, it is created.
 * @param dirPath - The directory path to ensure
 */
export declare function ensureDir(dirPath: string): Promise<void>;
/**
 * Synchronous version of ensureDir
 */
export declare function ensureDirSync(dirPath: string): void;
/**
 * Alias for ensureDirSync (fs-extra compatibility)
 */
export declare function mkdirpSync(dirPath: string): void;
/**
 * Check if a path exists
 * @param filePath - The path to check
 */
export declare function pathExists(filePath: string): Promise<boolean>;
/**
 * Synchronous version of pathExists
 */
export { existsSync };
/**
 * Read a JSON file and parse it
 * @param filePath - The JSON file path
 */
export declare function readJson(filePath: string): Promise<any>;
/**
 * Synchronous version of readJson
 */
export declare function readJsonSync(filePath: string): any;
/**
 * Write a JSON file with formatting
 * @param filePath - The JSON file path
 * @param data - The data to write
 * @param options - Options (spaces for indentation)
 */
export declare function writeJson(filePath: string, data: any, options?: {
    spaces?: number;
}): Promise<void>;
/**
 * Synchronous version of writeJson
 */
export declare function writeJsonSync(filePath: string, data: any, options?: {
    spaces?: number;
}): void;
/**
 * fs-extra compatibility: readJSON (uppercase J)
 * Alias for readJson
 */
export declare const readJSON: typeof readJson;
/**
 * fs-extra compatibility: readJSONSync (uppercase J)
 * Alias for readJsonSync
 */
export declare const readJSONSync: typeof readJsonSync;
/**
 * fs-extra compatibility: writeJSON (uppercase J)
 * Alias for writeJson
 */
export declare const writeJSON: typeof writeJson;
/**
 * fs-extra compatibility: writeJSONSync (uppercase J)
 * Alias for writeJsonSync
 */
export declare const writeJSONSync: typeof writeJsonSync;
/**
 * Remove a file or directory (recursively)
 * @param targetPath - The path to remove
 */
export declare function remove(targetPath: string): Promise<void>;
/**
 * Synchronous version of remove
 */
export declare function removeSync(targetPath: string): void;
/**
 * Copy a file or directory
 * @param src - Source path
 * @param dest - Destination path
 * @param options - Copy options
 */
export declare function copy(src: string, dest: string, options?: {
    overwrite?: boolean;
    filter?: (src: string) => boolean;
}): Promise<void>;
/**
 * Synchronous version of copy
 */
export declare function copySync(src: string, dest: string, options?: {
    overwrite?: boolean;
    filter?: (src: string) => boolean;
}): void;
/**
 * Ensure a file exists (create if it doesn't)
 * @param filePath - The file path
 */
export declare function ensureFile(filePath: string): Promise<void>;
/**
 * Synchronous version of ensureFile
 */
export declare function ensureFileSync(filePath: string): void;
/**
 * Move a file or directory
 * @param src - Source path
 * @param dest - Destination path
 * @param options - Move options
 */
export declare function move(src: string, dest: string, options?: {
    overwrite?: boolean;
}): Promise<void>;
/**
 * Synchronous version of move
 */
export declare function moveSync(src: string, dest: string, options?: {
    overwrite?: boolean;
}): void;
export declare const readFile: typeof fsPromises.readFile, writeFile: typeof fsPromises.writeFile, appendFile: typeof fsPromises.appendFile, stat: typeof fsPromises.stat, readdir: typeof fsPromises.readdir, access: typeof fsPromises.access, unlink: typeof fsPromises.unlink, rmdir: typeof fsPromises.rmdir, rename: typeof fsPromises.rename, chmod: typeof fsPromises.chmod, copyFile: typeof fsPromises.copyFile, mkdtemp: typeof fsPromises.mkdtemp;
export declare const renameSync: typeof fsRenameSync;
export declare const mkdtempSync: typeof fsMkdtempSync;
export { readFileSync, writeFileSync, statSync, readdirSync, unlinkSync, mkdirSync, rmSync, copyFileSync, };
declare const _default: {
    ensureDir: typeof ensureDir;
    pathExists: typeof pathExists;
    readJson: typeof readJson;
    writeJson: typeof writeJson;
    readJSON: typeof readJson;
    writeJSON: typeof writeJson;
    remove: typeof remove;
    copy: typeof copy;
    move: typeof move;
    ensureFile: typeof ensureFile;
    readFile: typeof fsPromises.readFile;
    writeFile: typeof fsPromises.writeFile;
    appendFile: typeof fsPromises.appendFile;
    stat: typeof fsPromises.stat;
    readdir: typeof fsPromises.readdir;
    access: typeof fsPromises.access;
    unlink: typeof fsPromises.unlink;
    rename: typeof fsPromises.rename;
    copyFile: typeof fsPromises.copyFile;
    mkdtemp: typeof fsPromises.mkdtemp;
    ensureDirSync: typeof ensureDirSync;
    mkdirpSync: typeof mkdirpSync;
    existsSync: typeof existsSync;
    readJsonSync: typeof readJsonSync;
    writeJsonSync: typeof writeJsonSync;
    readJSONSync: typeof readJsonSync;
    writeJSONSync: typeof writeJsonSync;
    removeSync: typeof removeSync;
    copySync: typeof copySync;
    moveSync: typeof moveSync;
    ensureFileSync: typeof ensureFileSync;
    readFileSync: typeof readFileSync;
    writeFileSync: typeof writeFileSync;
    statSync: import("fs").StatSyncFn;
    readdirSync: typeof readdirSync;
    unlinkSync: typeof unlinkSync;
    mkdirSync: typeof mkdirSync;
    rmSync: typeof rmSync;
    copyFileSync: typeof copyFileSync;
    renameSync: typeof fsRenameSync;
    mkdtempSync: typeof fsMkdtempSync;
};
export default _default;
//# sourceMappingURL=fs-native.d.ts.map