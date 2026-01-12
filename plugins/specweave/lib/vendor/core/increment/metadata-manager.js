/**
 * Metadata Manager
 *
 * Handles CRUD operations for increment metadata (status, type, timestamps).
 * Part of increment 0007: Smart Status Management
 */
import * as fs from '../../utils/fs-native.js';
import path from 'path';
import matter from 'gray-matter';
import { IncrementStatus, IncrementType, createDefaultMetadata, isValidTransition, isStale, shouldAutoAbandon } from '../types/increment-metadata.js';
import { ActiveIncrementManager } from './active-increment-manager.js';
import { detectDuplicatesByNumber } from './duplicate-detector.js';
import { consoleLogger } from '../../utils/logger.js';
import { getProjectRoot } from '../../utils/find-project-root.js';
/**
 * Error thrown when metadata operations fail
 */
export class MetadataError extends Error {
    constructor(message, incrementId, cause) {
        super(message);
        this.incrementId = incrementId;
        this.cause = cause;
        this.name = 'MetadataError';
    }
}
/**
 * Metadata Manager
 *
 * Provides CRUD operations and queries for increment metadata
 */
export class MetadataManager {
    /**
     * Set logger instance (primarily for testing with silentLogger)
     *
     * @param logger - Logger instance to use
     */
    static setLogger(logger) {
        this.logger = logger;
    }
    /**
     * Get metadata file path for increment
     *
     * CRITICAL FIX: Uses getProjectRoot() instead of process.cwd() to prevent
     * creating/accessing .specweave in wrong location when CWD != project root.
     */
    static getMetadataPath(incrementId, rootDir) {
        const specweavePath = path.join(rootDir || getProjectRoot(), '.specweave');
        return path.join(specweavePath, 'increments', incrementId, 'metadata.json');
    }
    /**
     * Get increment directory path
     *
     * CRITICAL FIX: Uses getProjectRoot() instead of process.cwd() to prevent
     * creating/accessing .specweave in wrong location when CWD != project root.
     */
    static getIncrementPath(incrementId, rootDir) {
        const specweavePath = path.join(rootDir || getProjectRoot(), '.specweave');
        return path.join(specweavePath, 'increments', incrementId);
    }
    /**
     * Check if metadata file exists
     */
    static exists(incrementId, rootDir) {
        const metadataPath = this.getMetadataPath(incrementId, rootDir);
        return fs.existsSync(metadataPath);
    }
    /**
     * Read metadata from file
     * Creates default metadata if file doesn't exist (lazy initialization)
     */
    static read(incrementId, rootDir) {
        const metadataPath = this.getMetadataPath(incrementId, rootDir);
        // Lazy initialization: Create metadata if doesn't exist
        if (!fs.existsSync(metadataPath)) {
            // Check if increment folder exists
            const incrementPath = this.getIncrementPath(incrementId, rootDir);
            if (!fs.existsSync(incrementPath)) {
                throw new MetadataError(`Increment not found: ${incrementId}`, incrementId);
            }
            // Create default metadata
            const defaultMetadata = createDefaultMetadata(incrementId);
            this.write(incrementId, defaultMetadata, rootDir);
            // **CRITICAL**: Update active increment state if default status is ACTIVE
            // This ensures that newly created increments are immediately tracked for status line
            // Skip validation to prevent circular dependency during lazy initialization
            if (defaultMetadata.status === IncrementStatus.ACTIVE) {
                const activeManager = new ActiveIncrementManager();
                activeManager.setActive(incrementId, true); // skipValidation = true
            }
            return defaultMetadata;
        }
        try {
            const content = fs.readFileSync(metadataPath, 'utf-8');
            const rawMetadata = JSON.parse(content);
            // **SCHEMA NORMALIZATION**: Handle legacy schemas with different field names
            // This makes the status command schema-agnostic
            const metadata = {
                ...rawMetadata,
                // Normalize: createdAt → created (legacy schema compatibility)
                created: rawMetadata.created || rawMetadata.createdAt || new Date().toISOString(),
                // Normalize: updatedAt → updated (legacy schema compatibility)
                updated: rawMetadata.updated || rawMetadata.updatedAt || rawMetadata.lastActivity || new Date().toISOString(),
                // Ensure lastActivity exists (required by standard schema)
                lastActivity: rawMetadata.lastActivity || rawMetadata.updated || rawMetadata.updatedAt || new Date().toISOString()
            };
            // Remove legacy fields after normalization
            delete metadata.createdAt;
            delete metadata.updatedAt;
            // Validate schema
            this.validate(metadata);
            return metadata;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new MetadataError(`Failed to read metadata for ${incrementId}: ${errorMessage}`, incrementId, error instanceof Error ? error : new Error(String(error)));
        }
    }
    /**
     * Validate increment ID is not a reserved name
     * Throws if ID is reserved
     */
    static validateNotReserved(incrementId) {
        // Check exact match
        if (this.RESERVED_INCREMENT_IDS.includes(incrementId)) {
            throw new MetadataError(`Invalid increment ID "${incrementId}": This is a reserved name.\n\n` +
                `Reserved names include:\n` +
                `  - Status values: active, backlog, paused, completed, abandoned\n` +
                `  - Special folders: _archive, _templates, _config\n` +
                `  - State files: active-increment, state, config\n\n` +
                `Please use a descriptive name like "0035-my-feature" instead.`, incrementId);
        }
        // Check if it starts with underscore (reserved for special folders)
        if (incrementId.startsWith('_')) {
            throw new MetadataError(`Invalid increment ID "${incrementId}": Increment IDs cannot start with underscore.\n` +
                `Names starting with "_" are reserved for special folders like _archive.\n\n` +
                `Please use a name like "0035-my-feature" instead.`, incrementId);
        }
        // Check base name (before first hyphen) is not reserved
        const baseName = incrementId.split('-')[0];
        if (this.RESERVED_INCREMENT_IDS.includes(baseName)) {
            throw new MetadataError(`Invalid increment ID "${incrementId}": Base name "${baseName}" is reserved.\n\n` +
                `Please use a 4-digit number prefix like "0035-my-feature".`, incrementId);
        }
    }
    /**
     * Validate increment before creation (check for duplicates and reserved names)
     * Throws if duplicates exist in other locations or ID is reserved
     */
    static async validateBeforeCreate(incrementId, rootDir) {
        // Check for reserved names first
        this.validateNotReserved(incrementId);
        // Extract increment number from ID (e.g., "0033-feature-name" → "0033")
        const numberMatch = incrementId.match(/^(\d+)/);
        if (!numberMatch) {
            throw new MetadataError(`Invalid increment ID format: ${incrementId}. Expected format: ####-name`, incrementId);
        }
        const incrementNumber = numberMatch[1];
        // Check for duplicates
        const duplicates = await detectDuplicatesByNumber(incrementNumber, rootDir || process.cwd());
        if (duplicates.length > 0) {
            const locations = duplicates.map(d => d.path).join('\n  - ');
            throw new MetadataError(`Cannot create increment ${incrementId}: Increment number ${incrementNumber} already exists in other location(s):\n  - ${locations}\n\n` +
                `Resolution options:\n` +
                `  1. Use a different increment number\n` +
                `  2. Delete/archive the existing increment(s)\n` +
                `  3. Run /sw:fix-duplicates to resolve conflicts`, incrementId);
        }
    }
    /**
     * Write metadata to file
     * Uses atomic write (temp file → rename)
     *
     * @param incrementId - Increment ID
     * @param metadata - Metadata to write
     * @param rootDir - Optional root directory (defaults to process.cwd())
     */
    static write(incrementId, metadata, rootDir) {
        const metadataPath = this.getMetadataPath(incrementId, rootDir);
        const incrementPath = this.getIncrementPath(incrementId, rootDir);
        // Ensure increment directory exists
        if (!fs.existsSync(incrementPath)) {
            throw new MetadataError(`Increment directory not found: ${incrementId}`, incrementId);
        }
        // CRITICAL FIX (2025-11-24): Detect if this is a NEW active increment
        // When creating a new increment directly with status ACTIVE (bypassing updateStatus),
        // we need to trigger living docs sync to create FS-XXX folders
        // This does NOT cause double-sync because updateStatus() only calls write()
        // when the file ALREADY EXISTS (for updates, not creation)
        const isNewFile = !fs.existsSync(metadataPath);
        const isActiveStatus = metadata.status === IncrementStatus.ACTIVE;
        try {
            // Validate before writing
            this.validate(metadata);
            // Atomic write: temp file → rename
            const tempPath = `${metadataPath}.tmp`;
            fs.writeFileSync(tempPath, JSON.stringify(metadata, null, 2), 'utf-8');
            fs.renameSync(tempPath, metadataPath);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new MetadataError(`Failed to write metadata for ${incrementId}: ${errorMessage}`, incrementId, error instanceof Error ? error : new Error(String(error)));
        }
        // NEW: Trigger living docs sync for NEW active increments
        // This ensures FS-XXX folders are created when increment is created with ACTIVE status
        // CRITICAL FIX (2025-11-24): Only trigger if spec.md EXISTS
        // In single-prompt scenarios, metadata.json is created BEFORE spec.md
        // Triggering sync before spec.md exists causes "Spec file not found" error
        if (isNewFile && isActiveStatus) {
            const specPath = path.join(incrementPath, 'spec.md');
            const specExists = fs.existsSync(specPath);
            if (!specExists) {
                this.logger.log(`📚 New active increment detected, but spec.md not yet created`);
                this.logger.log(`   Living docs sync will trigger when spec.md is ready`);
                // Don't trigger sync yet - will happen via:
                // 1. AutoTransitionManager.handleTasksCreated() → updateStatus() → StatusChangeSyncTrigger
                // 2. Or manual /sw:sync-specs command
            }
            else {
                this.logger.log(`📚 New active increment detected - triggering living docs sync...`);
                // Non-blocking async sync (same pattern as updateStatus)
                (async () => {
                    try {
                        const { LivingDocsSync } = await import('../living-docs/living-docs-sync.js');
                        const sync = new LivingDocsSync(rootDir || process.cwd(), {
                            logger: this.logger
                        });
                        const result = await sync.syncIncrement(incrementId);
                        if (result.success) {
                            this.logger.log(`✅ Living docs synced for ${incrementId} → ${result.featureId}`);
                        }
                        else {
                            this.logger.warn(`⚠️  Living docs sync completed with errors for ${incrementId}`);
                        }
                    }
                    catch (error) {
                        this.logger.error(`❌ Living docs sync failed for ${incrementId}:`, error);
                        this.logger.log(`💡 Run /sw:sync-specs ${incrementId} to retry`);
                    }
                })();
            }
        }
    }
    /**
     * Delete metadata file
     */
    static delete(incrementId, rootDir) {
        const metadataPath = this.getMetadataPath(incrementId, rootDir);
        if (!fs.existsSync(metadataPath)) {
            return; // Already deleted
        }
        try {
            fs.unlinkSync(metadataPath);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new MetadataError(`Failed to delete metadata for ${incrementId}: ${errorMessage}`, incrementId, error instanceof Error ? error : new Error(String(error)));
        }
    }
    /**
     * Update increment status
     * Validates transition and updates timestamps
     *
     * **CRITICAL**: Also updates active increment state automatically!
     *
     * NOTE: This method is now SYNCHRONOUS to ensure spec.md is updated
     * before returning. This prevents race conditions in tests and ensures
     * data consistency.
     */
    static updateStatus(incrementId, newStatus, reason, rootDir) {
        const metadata = this.read(incrementId, rootDir);
        const oldStatus = metadata.status; // ← Capture old status for sync trigger
        // Validate transition
        if (!isValidTransition(metadata.status, newStatus)) {
            throw new MetadataError(`Invalid status transition: ${metadata.status} → ${newStatus}`, incrementId);
        }
        // Update status
        metadata.status = newStatus;
        metadata.lastActivity = new Date().toISOString();
        // Update status-specific fields
        if (newStatus === IncrementStatus.BACKLOG) {
            metadata.backlogReason = reason || 'Planned for future work';
            metadata.backlogAt = new Date().toISOString();
        }
        else if (newStatus === IncrementStatus.PAUSED) {
            metadata.pausedReason = reason || 'No reason provided';
            metadata.pausedAt = new Date().toISOString();
        }
        else if (newStatus === IncrementStatus.ACTIVE) {
            // Clear backlog/paused fields when activating
            metadata.backlogReason = undefined;
            metadata.backlogAt = undefined;
            metadata.pausedReason = undefined;
            metadata.pausedAt = undefined;
            // Clear ready_for_review field if reopening
            metadata.readyForReviewAt = undefined;
        }
        else if (newStatus === IncrementStatus.READY_FOR_REVIEW) {
            // v0.28.63+: All tasks completed, awaiting user approval
            metadata.readyForReviewAt = new Date().toISOString();
            this.logger.log(`📋 Increment ${incrementId} ready for review - run /sw:done to close`);
        }
        else if (newStatus === IncrementStatus.COMPLETED) {
            // v0.28.63+: User explicitly approved completion via /sw:done
            metadata.approvedAt = new Date().toISOString();
        }
        else if (newStatus === IncrementStatus.ABANDONED) {
            metadata.abandonedReason = reason || 'No reason provided';
            metadata.abandonedAt = new Date().toISOString();
        }
        // **CRITICAL FIX (2025-11-20)**: Atomic transaction with rollback
        // Update spec.md FIRST, then metadata.json. If spec.md fails, no desync occurs.
        // This prevents the silent failure bug that caused increment 0047 desync.
        //
        // Previous bug: metadata.json updated, spec.md failed silently → desync
        // New behavior: spec.md fails → error thrown → metadata.json never written
        //
        // AC-US2-01: updateStatus() updates both metadata.json AND spec.md frontmatter
        // AC-US2-03: All status transitions update spec.md
        // SYNCHRONOUS call to ensure spec.md is updated before returning
        // This prevents race conditions and ensures data consistency
        try {
            // Step 1: Update spec.md (may throw if spec.md exists but has errors)
            this.updateSpecMdStatusSync(incrementId, newStatus, rootDir);
            // Step 2: Update metadata.json (only if spec.md succeeded)
            this.write(incrementId, metadata, rootDir);
        }
        catch (error) {
            // CRITICAL: spec.md update failed - prevent desync by NOT updating metadata.json
            this.logger.error(`CRITICAL: Failed to update status for ${incrementId} - aborting to prevent desync`, error);
            // Throw detailed error with fix instructions
            throw new MetadataError(`Cannot update increment status - spec.md sync failed.\n` +
                `\n` +
                `This prevents source-of-truth violations (CLAUDE.md Rule #7).\n` +
                `Both metadata.json AND spec.md must update atomically.\n` +
                `\n` +
                `Error: ${error instanceof Error ? error.message : String(error)}\n` +
                `\n` +
                `If this persists, check:\n` +
                `1. File permissions for .specweave/increments/${incrementId}/spec.md\n` +
                `2. YAML frontmatter syntax in spec.md\n` +
                `3. Disk space availability\n` +
                `\n` +
                `To check for desyncs, run: /sw:sync-status`, incrementId, error instanceof Error ? error : undefined);
        }
        // **CRITICAL**: Update active increment state
        const activeManager = new ActiveIncrementManager(rootDir);
        if (newStatus === IncrementStatus.ACTIVE) {
            // Increment became active → set as active
            activeManager.setActive(incrementId);
        }
        else if (newStatus === IncrementStatus.COMPLETED ||
            newStatus === IncrementStatus.BACKLOG ||
            newStatus === IncrementStatus.PAUSED ||
            newStatus === IncrementStatus.ABANDONED) {
            // Increment no longer active → smart update (find next active or clear)
            activeManager.smartUpdate();
        }
        // **NEW (2025-11-24)**: Auto-trigger sync for meaningful status transitions
        // This ensures GitHub issues update automatically when work starts/completes
        // Safety: Non-blocking, circuit breaker protected, errors isolated
        // CRITICAL: Use async import() not require() for ESM compatibility
        (async () => {
            try {
                // Dynamic import to avoid circular dependency
                const { StatusChangeSyncTrigger } = await import('./status-change-sync-trigger.js');
                await StatusChangeSyncTrigger.triggerIfNeeded(incrementId, oldStatus, newStatus).catch((error) => {
                    // Log but don't throw - sync failure shouldn't break status update
                    this.logger.warn(`Auto-sync failed for ${incrementId}: ${error.message}`);
                });
            }
            catch (importError) {
                // Module not available yet (during build?) - skip sync
                this.logger.debug(`Status sync trigger not available: ${importError.message}`);
            }
        })(); // Execute immediately, but don't await (non-blocking)
        return metadata;
    }
    /**
     * Update spec.md status synchronously (used by updateStatus)
     *
     * This is a private helper to avoid async/await in updateStatus() which would
     * break backward compatibility with callers expecting sync behavior.
     */
    static updateSpecMdStatusSync(incrementId, status, rootDir) {
        // Validate status is valid enum value
        if (!Object.values(IncrementStatus).includes(status)) {
            throw new MetadataError(`Invalid status value: "${status}". Must be one of: ${Object.values(IncrementStatus).join(', ')}`, incrementId);
        }
        // Build spec.md path
        const specPath = path.join(rootDir || process.cwd(), '.specweave', 'increments', incrementId, 'spec.md');
        // Check if spec.md exists
        if (!fs.existsSync(specPath)) {
            // Spec doesn't exist - this is OK for legacy increments
            return;
        }
        // Read spec.md content (synchronously)
        const content = fs.readFileSync(specPath, 'utf-8');
        // Parse and update YAML frontmatter using gray-matter
        const parsed = matter(content);
        parsed.data.status = status;
        // Stringify updated content
        const updatedContent = matter.stringify(parsed.content, parsed.data);
        // Atomic write: temp file → rename (synchronously)
        const tempPath = `${specPath}.tmp`;
        fs.writeFileSync(tempPath, updatedContent, 'utf-8');
        fs.renameSync(tempPath, specPath);
    }
    /**
     * Update increment type
     */
    static updateType(incrementId, type) {
        const metadata = this.read(incrementId);
        metadata.type = type;
        metadata.lastActivity = new Date().toISOString();
        this.write(incrementId, metadata);
        return metadata;
    }
    /**
     * Touch increment (update lastActivity)
     */
    static touch(incrementId) {
        const metadata = this.read(incrementId);
        metadata.lastActivity = new Date().toISOString();
        this.write(incrementId, metadata);
        return metadata;
    }
    /**
     * Get all increments
     *
     * CRITICAL FIX: Uses getProjectRoot() instead of process.cwd() to prevent
     * accessing wrong .specweave folder when CWD != project root.
     */
    static getAll(projectRoot) {
        const root = projectRoot || getProjectRoot();
        const incrementsPath = path.join(root, '.specweave', 'increments');
        if (!fs.existsSync(incrementsPath)) {
            return [];
        }
        const incrementFolders = fs.readdirSync(incrementsPath)
            .filter(name => {
            const folderPath = path.join(incrementsPath, name);
            return fs.statSync(folderPath).isDirectory() && !name.startsWith('_');
        });
        return incrementFolders
            .map(folder => {
            try {
                return this.read(folder, root);
            }
            catch (error) {
                // Skip increments with invalid/missing metadata
                return null;
            }
        })
            .filter((m) => m !== null);
    }
    /**
     * Get increments by status
     */
    static getByStatus(status) {
        return this.getAll().filter(m => m.status === status);
    }
    /**
     * Get active increments (FAST: cache-first strategy)
     *
     * **PERFORMANCE UPGRADE**: Uses ActiveIncrementManager cache instead of scanning all increments
     * - Old: Scan 31 metadata files (~50ms)
     * - New: Read 1 cache file + 1-2 metadata files (~5ms) = **10x faster**
     *
     * Fallback to full scan if cache is stale or missing
     */
    static getActive() {
        const activeManager = new ActiveIncrementManager();
        // FAST PATH: Read from cache
        const cachedIds = activeManager.getActive();
        if (cachedIds.length > 0) {
            // Validate cache is correct
            const isValid = activeManager.validate();
            if (isValid) {
                // Cache is good! Read only the cached increments
                return cachedIds
                    .map(id => {
                    try {
                        return this.read(id);
                    }
                    catch (error) {
                        // Stale cache entry, trigger rebuild
                        activeManager.smartUpdate();
                        return null;
                    }
                })
                    .filter((m) => m !== null);
            }
        }
        // SLOW PATH: Cache miss or invalid, scan all increments
        const allActive = this.getByStatus(IncrementStatus.ACTIVE);
        // Rebuild cache from scan results (DIRECTLY without calling smartUpdate to avoid circular dependency)
        if (allActive.length > 0) {
            // Sort by lastActivity (most recent first)
            const sorted = allActive.sort((a, b) => {
                const aTime = new Date(a.lastActivity).getTime();
                const bTime = new Date(b.lastActivity).getTime();
                return bTime - aTime; // Descending
            });
            // Take max 2 and write state directly
            const activeIds = sorted.slice(0, 2).map(m => m.id);
            const state = {
                ids: activeIds,
                lastUpdated: new Date().toISOString()
            };
            // Write state directly using private method (copy logic from ActiveIncrementManager.writeState)
            const stateFile = activeManager.getStateFilePath();
            const stateDir = path.dirname(stateFile);
            if (!fs.existsSync(stateDir)) {
                fs.mkdirSync(stateDir, { recursive: true });
            }
            const tempFile = `${stateFile}.tmp`;
            fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
            fs.renameSync(tempFile, stateFile);
        }
        else {
            // No active increments, clear cache
            activeManager.clearActive();
        }
        return allActive;
    }
    /**
     * Get backlog increments
     */
    static getBacklog() {
        return this.getByStatus(IncrementStatus.BACKLOG);
    }
    /**
     * Get paused increments
     */
    static getPaused() {
        return this.getByStatus(IncrementStatus.PAUSED);
    }
    /**
     * Get completed increments
     */
    static getCompleted() {
        return this.getByStatus(IncrementStatus.COMPLETED);
    }
    /**
     * Get abandoned increments
     */
    static getAbandoned() {
        return this.getByStatus(IncrementStatus.ABANDONED);
    }
    /**
     * Get increments by type
     */
    static getByType(type) {
        return this.getAll().filter(m => m.type === type);
    }
    /**
     * Get stale increments (paused >7 days or active >30 days)
     */
    static getStale() {
        return this.getAll().filter(m => isStale(m));
    }
    /**
     * Get increments that should be auto-abandoned (experiments inactive >14 days)
     */
    static getShouldAutoAbandon() {
        return this.getAll().filter(m => shouldAutoAbandon(m));
    }
    /**
     * Get extended metadata with computed fields (progress, age, etc.)
     */
    static getExtended(incrementId) {
        const metadata = this.read(incrementId);
        const extended = { ...metadata };
        // Calculate progress from tasks.md
        try {
            const tasksPath = path.join(this.getIncrementPath(incrementId), 'tasks.md');
            if (fs.existsSync(tasksPath)) {
                const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
                // Count completed tasks: [x] or [X]
                const completedMatches = tasksContent.match(/\[x\]/gi);
                extended.completedTasks = completedMatches ? completedMatches.length : 0;
                // Count total tasks: [ ] or [x]
                const totalMatches = tasksContent.match(/\[ \]|\[x\]/gi);
                extended.totalTasks = totalMatches ? totalMatches.length : 0;
                // Calculate progress percentage
                if (extended.totalTasks > 0) {
                    extended.progress = Math.round((extended.completedTasks / extended.totalTasks) * 100);
                }
            }
        }
        catch (error) {
            // Ignore errors reading tasks.md
        }
        // Calculate age in days
        const now = new Date();
        const createdDate = new Date(metadata.created);
        extended.ageInDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        // Calculate days paused
        if (metadata.status === IncrementStatus.PAUSED && metadata.pausedAt) {
            const pausedDate = new Date(metadata.pausedAt);
            extended.daysPaused = Math.floor((now.getTime() - pausedDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        return extended;
    }
    /**
     * Validate metadata schema
     */
    static validate(metadata) {
        if (!metadata.id) {
            throw new Error('Metadata missing required field: id');
        }
        if (!metadata.status || !Object.values(IncrementStatus).includes(metadata.status)) {
            throw new Error(`Invalid status: ${metadata.status}`);
        }
        if (!metadata.type || !Object.values(IncrementType).includes(metadata.type)) {
            throw new Error(`Invalid type: ${metadata.type}`);
        }
        if (!metadata.created) {
            throw new Error('Metadata missing required field: created');
        }
        if (!metadata.lastActivity) {
            throw new Error('Metadata missing required field: lastActivity');
        }
        return true;
    }
    /**
     * Check if status transition is allowed
     */
    static canTransition(from, to) {
        return isValidTransition(from, to);
    }
    /**
     * Get human-readable status transition error message
     */
    static getTransitionError(from, to) {
        if (from === IncrementStatus.COMPLETED) {
            return `Cannot transition from completed state. Increment is already complete.`;
        }
        if (to === IncrementStatus.PAUSED && from === IncrementStatus.ABANDONED) {
            return `Cannot pause an abandoned increment. Resume it first with /resume.`;
        }
        if (to === IncrementStatus.COMPLETED && from === IncrementStatus.ABANDONED) {
            return `Cannot complete an abandoned increment. Resume it first with /resume.`;
        }
        return `Invalid transition: ${from} → ${to}`;
    }
    // ==========================================================================
    // Sync Target Methods (v1.0.31+ - ADR-0211)
    // ==========================================================================
    /**
     * Set the external tool sync target for an increment
     *
     * This explicitly specifies which sync profile the increment uses.
     * The sync target provides audit trail and deterministic sync behavior.
     *
     * @param incrementId - Increment ID
     * @param syncTarget - Sync target configuration
     * @param rootDir - Optional root directory
     * @returns Updated metadata
     *
     * @example
     * ```typescript
     * MetadataManager.setSyncTarget('0142-feature', {
     *   profileId: 'github-frontend',
     *   provider: 'github',
     *   derivedFrom: 'project-mapping',
     *   setAt: new Date().toISOString(),
     *   sourceProjectId: 'frontend-app'
     * });
     * ```
     */
    static setSyncTarget(incrementId, syncTarget, rootDir) {
        const metadata = this.read(incrementId, rootDir);
        metadata.syncTarget = syncTarget;
        metadata.lastActivity = new Date().toISOString();
        this.write(incrementId, metadata, rootDir);
        this.logger.debug(`Set sync target for ${incrementId}: ${syncTarget.profileId} (${syncTarget.provider})`);
        return metadata;
    }
    /**
     * Get the sync target for an increment
     *
     * @param incrementId - Increment ID
     * @param rootDir - Optional root directory
     * @returns Sync target or undefined if not set
     */
    static getSyncTarget(incrementId, rootDir) {
        const metadata = this.read(incrementId, rootDir);
        return metadata.syncTarget;
    }
    /**
     * Clear the sync target for an increment
     *
     * Use this when the external tool configuration changes and
     * the increment needs to be re-resolved.
     *
     * @param incrementId - Increment ID
     * @param rootDir - Optional root directory
     * @returns Updated metadata
     */
    static clearSyncTarget(incrementId, rootDir) {
        const metadata = this.read(incrementId, rootDir);
        delete metadata.syncTarget;
        metadata.lastActivity = new Date().toISOString();
        this.write(incrementId, metadata, rootDir);
        this.logger.debug(`Cleared sync target for ${incrementId}`);
        return metadata;
    }
    /**
     * Check if increment has a sync target configured
     *
     * @param incrementId - Increment ID
     * @param rootDir - Optional root directory
     * @returns true if sync target is set
     */
    static hasSyncTarget(incrementId, rootDir) {
        const metadata = this.read(incrementId, rootDir);
        return !!metadata.syncTarget;
    }
    /**
     * Get all increments with a specific sync provider
     *
     * Useful for bulk operations on all GitHub/JIRA/ADO synced increments.
     *
     * @param provider - Provider type ('github', 'jira', 'ado')
     * @returns Array of increments with that provider configured
     */
    static getByProvider(provider) {
        return this.getAll().filter(m => m.syncTarget?.provider === provider);
    }
    /**
     * Get all increments with a specific sync profile
     *
     * @param profileId - Profile ID from config.sync.profiles
     * @returns Array of increments using that profile
     */
    static getByProfile(profileId) {
        return this.getAll().filter(m => m.syncTarget?.profileId === profileId);
    }
}
/**
 * Logger instance (injectable for testing)
 */
MetadataManager.logger = consoleLogger;
/**
 * Reserved increment IDs that cannot be used
 * These are status values, special folders, and state files
 */
MetadataManager.RESERVED_INCREMENT_IDS = [
    // Status values (would confuse state management)
    'active', 'backlog', 'paused', 'completed', 'abandoned',
    // Special folders (file system conflicts)
    '_archive', '_templates', '_config',
    // State files (would overwrite critical files)
    'active-increment', 'state', 'config',
    // Common terms that should not be IDs
    'current', 'latest', 'new', 'temp', 'test'
];
//# sourceMappingURL=metadata-manager.js.map