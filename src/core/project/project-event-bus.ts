/**
 * ProjectEventBus - Event-Driven Architecture for Project Sync
 *
 * Implements an EventEmitter-based bus for project-related events.
 * Supports async handler execution with error isolation.
 */

import { EventEmitter } from 'events';
import { Logger, consoleLogger } from '../../utils/logger.js';
import {
  ProjectEvent,
  ProjectEventType,
  ProjectEventHandler,
  ProjectCreatedEvent,
  ProjectUpdatedEvent,
  ProjectDeletedEvent,
  ProjectSyncRequestedEvent,
  ExternalProjectDiscoveredEvent,
} from './types/project-types.js';

export class ProjectEventBus {
  private emitter: EventEmitter;
  private logger: Logger;
  // Map to track original handlers -> wrapped handlers for proper off() support
  private handlerMap: WeakMap<Function, Function> = new WeakMap();

  constructor(options: { logger?: Logger } = {}) {
    this.emitter = new EventEmitter();
    this.logger = options.logger ?? consoleLogger;

    // Increase max listeners to support many adapters
    this.emitter.setMaxListeners(50);
  }

  /**
   * Subscribe to a specific event type
   */
  on<T extends ProjectEventType>(
    eventType: T,
    handler: ProjectEventHandler<Extract<ProjectEvent, { type: T }>>
  ): void {
    // Create wrapped handler with error isolation
    const wrappedHandler = async (event: Extract<ProjectEvent, { type: T }>) => {
      try {
        await handler(event);
      } catch (error) {
        // Error isolation - log but don't propagate
        this.logger.error(`Event handler error for ${eventType}: ${error}`);
      }
    };

    // Store mapping for later removal with off()
    this.handlerMap.set(handler, wrappedHandler);

    this.emitter.on(eventType, wrappedHandler);
    this.logger.debug(`Registered handler for event: ${eventType}`);
  }

  /**
   * Subscribe to an event type (one-time only)
   */
  once<T extends ProjectEventType>(
    eventType: T,
    handler: ProjectEventHandler<Extract<ProjectEvent, { type: T }>>
  ): void {
    this.emitter.once(eventType, async (event: Extract<ProjectEvent, { type: T }>) => {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(`One-time event handler error for ${eventType}: ${error}`);
      }
    });
  }

  /**
   * Unsubscribe from an event type
   */
  off<T extends ProjectEventType>(
    eventType: T,
    handler: ProjectEventHandler<Extract<ProjectEvent, { type: T }>>
  ): void {
    // Get the wrapped handler that was actually registered
    const wrappedHandler = this.handlerMap.get(handler);
    if (wrappedHandler) {
      this.emitter.off(eventType, wrappedHandler as any);
      this.handlerMap.delete(handler);
      this.logger.debug(`Unregistered handler for event: ${eventType}`);
    } else {
      // Fallback: try to remove original handler (in case it was registered directly)
      this.emitter.off(eventType, handler as any);
      this.logger.debug(`Attempted to unregister handler for event: ${eventType} (no wrapper found)`);
    }
  }

  /**
   * Emit an event
   */
  emit(event: ProjectEvent): void {
    this.logger.debug(`Emitting event: ${event.type}`);
    this.emitter.emit(event.type, event);
  }

  /**
   * Emit and wait for all handlers to complete
   * Useful for testing or synchronous workflows
   */
  async emitAndWait(event: ProjectEvent): Promise<void> {
    const handlers = this.emitter.listeners(event.type) as ProjectEventHandler[];

    this.logger.debug(`Emitting event (sync): ${event.type} to ${handlers.length} handlers`);

    const results = await Promise.allSettled(
      handlers.map((handler) => {
        try {
          const result = handler(event);
          return result instanceof Promise ? result : Promise.resolve(result);
        } catch (error) {
          return Promise.reject(error);
        }
      })
    );

    // Log any errors
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(`Handler failed for ${event.type}: ${result.reason}`);
      }
    }
  }

  /**
   * Get the number of listeners for an event type
   */
  listenerCount(eventType: ProjectEventType): number {
    return this.emitter.listenerCount(eventType);
  }

  /**
   * Remove all listeners for an event type (or all events)
   */
  removeAllListeners(eventType?: ProjectEventType): void {
    if (eventType) {
      this.emitter.removeAllListeners(eventType);
      this.logger.debug(`Removed all listeners for: ${eventType}`);
    } else {
      this.emitter.removeAllListeners();
      this.logger.debug('Removed all event listeners');
    }
  }

  // ============================================
  // Typed helper methods for common events
  // ============================================

  /**
   * Subscribe to ProjectCreated events
   */
  onProjectCreated(handler: ProjectEventHandler<ProjectCreatedEvent>): void {
    this.on('ProjectCreated', handler);
  }

  /**
   * Subscribe to ProjectUpdated events
   */
  onProjectUpdated(handler: ProjectEventHandler<ProjectUpdatedEvent>): void {
    this.on('ProjectUpdated', handler);
  }

  /**
   * Subscribe to ProjectDeleted events
   */
  onProjectDeleted(handler: ProjectEventHandler<ProjectDeletedEvent>): void {
    this.on('ProjectDeleted', handler);
  }

  /**
   * Subscribe to ProjectSyncRequested events
   */
  onProjectSyncRequested(handler: ProjectEventHandler<ProjectSyncRequestedEvent>): void {
    this.on('ProjectSyncRequested', handler);
  }

  /**
   * Subscribe to ExternalProjectDiscovered events
   */
  onExternalProjectDiscovered(handler: ProjectEventHandler<ExternalProjectDiscoveredEvent>): void {
    this.on('ExternalProjectDiscovered', handler);
  }
}
