/**
 * Project Module - EDA-based project management
 *
 * Provides centralized project registry with event-driven architecture
 * for synchronizing projects to external tools (GitHub, ADO, JIRA).
 *
 * Key components:
 * - ProjectRegistry: CRUD operations with event emission
 * - ProjectEventBus: Type-safe event pub/sub
 * - ProjectService: Singleton service with adapter management
 * - Adapters: GitHub, ADO, JIRA synchronization
 */

// Core exports
export { ProjectRegistry } from './project-registry.js';
export { ProjectEventBus } from './project-event-bus.js';
export { ProjectService, type IncrementEventType, type AdapterConfig } from './project-service.js';
export { ProjectManager, type ProjectContext } from './project-manager.js';

// Adapters
export { GitHubProjectAdapter, type GitHubProjectAdapterOptions } from './adapters/github-project-adapter.js';
export { ADOProjectAdapter, type ADOProjectAdapterOptions } from './adapters/ado-project-adapter.js';
export { JiraProjectAdapter, type JiraProjectAdapterOptions } from './adapters/jira-project-adapter.js';

// Types
export type {
  Project,
  ProjectRegistryData,
  ProjectValidationResult,
  AddProjectOptions,
  UpdateProjectOptions,
  RemoveProjectOptions,
  ProjectSyncStatus,
  SyncStatus,
  ExternalMapping,
  GitHubMapping,
  ADOMapping,
  JiraMapping,
  // Event types
  ProjectEvent,
  ProjectEventType,
  ProjectEventHandler,
  ProjectEventBase,
  ProjectCreatedEvent,
  ProjectUpdatedEvent,
  ProjectDeletedEvent,
  ProjectSyncRequestedEvent,
  ExternalProjectDiscoveredEvent,
} from './types/project-types.js';
