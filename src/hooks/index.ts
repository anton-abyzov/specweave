/**
 * Cross-Platform Hooks Module
 *
 * Provides platform-independent hook implementations for SpecWeave.
 * Works on Windows (native), macOS, and Linux.
 *
 * @module hooks
 */

export * from './platform.js';
export { checkScheduledJobs } from './scheduler-startup.js';
