/**
 * Unit tests for ProjectEventBus
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectEventBus } from '../../../../src/core/project/project-event-bus.js';
import {
  ProjectCreatedEvent,
  ProjectUpdatedEvent,
  ProjectDeletedEvent,
  ProjectSyncRequestedEvent,
  Project,
} from '../../../../src/core/project/types/project-types.js';

describe('ProjectEventBus', () => {
  let eventBus: ProjectEventBus;

  beforeEach(() => {
    eventBus = new ProjectEventBus();
  });

  describe('Event Subscription', () => {
    it('should register and trigger event handlers', () => {
      const handler = vi.fn();
      eventBus.on('ProjectCreated', handler);

      const event: ProjectCreatedEvent = {
        type: 'ProjectCreated',
        project: {
          id: 'test',
          name: 'Test',
          created: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should support multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('ProjectCreated', handler1);
      eventBus.on('ProjectCreated', handler2);

      const event: ProjectCreatedEvent = {
        type: 'ProjectCreated',
        project: {
          id: 'test',
          name: 'Test',
          created: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      eventBus.emit(event);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not trigger handlers for different event types', () => {
      const createdHandler = vi.fn();
      const deletedHandler = vi.fn();

      eventBus.on('ProjectCreated', createdHandler);
      eventBus.on('ProjectDeleted', deletedHandler);

      const event: ProjectCreatedEvent = {
        type: 'ProjectCreated',
        project: {
          id: 'test',
          name: 'Test',
          created: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      eventBus.emit(event);

      expect(createdHandler).toHaveBeenCalledTimes(1);
      expect(deletedHandler).not.toHaveBeenCalled();
    });
  });

  describe('One-time Subscription', () => {
    it('should trigger once handler only once', () => {
      const handler = vi.fn();
      eventBus.once('ProjectCreated', handler);

      const event: ProjectCreatedEvent = {
        type: 'ProjectCreated',
        project: {
          id: 'test',
          name: 'Test',
          created: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      eventBus.emit(event);
      eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Unsubscription', () => {
    it('should unsubscribe handler with off()', () => {
      const handler = vi.fn();
      eventBus.on('ProjectCreated', handler);

      eventBus.off('ProjectCreated', handler);

      const event: ProjectCreatedEvent = {
        type: 'ProjectCreated',
        project: {
          id: 'test',
          name: 'Test',
          created: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      eventBus.emit(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove all listeners for event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('ProjectCreated', handler1);
      eventBus.on('ProjectCreated', handler2);

      expect(eventBus.listenerCount('ProjectCreated')).toBe(2);

      eventBus.removeAllListeners('ProjectCreated');

      expect(eventBus.listenerCount('ProjectCreated')).toBe(0);
    });

    it('should remove all listeners globally', () => {
      eventBus.on('ProjectCreated', vi.fn());
      eventBus.on('ProjectUpdated', vi.fn());
      eventBus.on('ProjectDeleted', vi.fn());

      expect(eventBus.listenerCount('ProjectCreated')).toBe(1);
      expect(eventBus.listenerCount('ProjectUpdated')).toBe(1);

      eventBus.removeAllListeners();

      expect(eventBus.listenerCount('ProjectCreated')).toBe(0);
      expect(eventBus.listenerCount('ProjectUpdated')).toBe(0);
      expect(eventBus.listenerCount('ProjectDeleted')).toBe(0);
    });
  });

  describe('Error Isolation', () => {
    it('should not propagate handler errors', async () => {
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const successHandler = vi.fn();

      eventBus.on('ProjectCreated', errorHandler);
      eventBus.on('ProjectCreated', successHandler);

      const event: ProjectCreatedEvent = {
        type: 'ProjectCreated',
        project: {
          id: 'test',
          name: 'Test',
          created: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      // Should not throw
      expect(() => eventBus.emit(event)).not.toThrow();
    });

    it('should handle async handler errors in emitAndWait', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Async error'));
      const successHandler = vi.fn().mockResolvedValue(undefined);

      eventBus.on('ProjectCreated', errorHandler);
      eventBus.on('ProjectCreated', successHandler);

      const event: ProjectCreatedEvent = {
        type: 'ProjectCreated',
        project: {
          id: 'test',
          name: 'Test',
          created: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      // Should not throw
      await expect(eventBus.emitAndWait(event)).resolves.not.toThrow();

      // Both handlers should have been called
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(successHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Async Handler Execution', () => {
    it('should support async handlers', async () => {
      const asyncHandler = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      eventBus.on('ProjectCreated', asyncHandler);

      const event: ProjectCreatedEvent = {
        type: 'ProjectCreated',
        project: {
          id: 'test',
          name: 'Test',
          created: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      await eventBus.emitAndWait(event);

      expect(asyncHandler).toHaveBeenCalledTimes(1);
    });

    it('should wait for all handlers in emitAndWait', async () => {
      const order: number[] = [];

      const handler1 = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        order.push(1);
      });

      const handler2 = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        order.push(2);
      });

      eventBus.on('ProjectCreated', handler1);
      eventBus.on('ProjectCreated', handler2);

      const event: ProjectCreatedEvent = {
        type: 'ProjectCreated',
        project: {
          id: 'test',
          name: 'Test',
          created: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      await eventBus.emitAndWait(event);

      expect(order).toHaveLength(2);
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Typed Helper Methods', () => {
    it('should provide onProjectCreated helper', () => {
      const handler = vi.fn();
      eventBus.onProjectCreated(handler);

      const event: ProjectCreatedEvent = {
        type: 'ProjectCreated',
        project: {
          id: 'test',
          name: 'Test',
          created: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should provide onProjectUpdated helper', () => {
      const handler = vi.fn();
      eventBus.onProjectUpdated(handler);

      const event: ProjectUpdatedEvent = {
        type: 'ProjectUpdated',
        projectId: 'test',
        changes: { name: 'New Name' },
        timestamp: new Date().toISOString(),
      };

      eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should provide onProjectDeleted helper', () => {
      const handler = vi.fn();
      eventBus.onProjectDeleted(handler);

      const event: ProjectDeletedEvent = {
        type: 'ProjectDeleted',
        projectId: 'test',
        project: {
          id: 'test',
          name: 'Test',
          created: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should provide onProjectSyncRequested helper', () => {
      const handler = vi.fn();
      eventBus.onProjectSyncRequested(handler);

      const event: ProjectSyncRequestedEvent = {
        type: 'ProjectSyncRequested',
        projectId: 'test',
        targets: ['github', 'ado'],
        timestamp: new Date().toISOString(),
      };

      eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Listener Count', () => {
    it('should report correct listener count', () => {
      expect(eventBus.listenerCount('ProjectCreated')).toBe(0);

      eventBus.on('ProjectCreated', vi.fn());
      expect(eventBus.listenerCount('ProjectCreated')).toBe(1);

      eventBus.on('ProjectCreated', vi.fn());
      expect(eventBus.listenerCount('ProjectCreated')).toBe(2);
    });
  });

  describe('All Event Types', () => {
    it('should handle ProjectCreated event', () => {
      const handler = vi.fn();
      eventBus.on('ProjectCreated', handler);

      eventBus.emit({
        type: 'ProjectCreated',
        project: { id: 'test', name: 'Test', created: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ProjectCreated' })
      );
    });

    it('should handle ProjectUpdated event', () => {
      const handler = vi.fn();
      eventBus.on('ProjectUpdated', handler);

      eventBus.emit({
        type: 'ProjectUpdated',
        projectId: 'test',
        changes: { name: 'New Name' },
        timestamp: new Date().toISOString(),
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ProjectUpdated' })
      );
    });

    it('should handle ProjectDeleted event', () => {
      const handler = vi.fn();
      eventBus.on('ProjectDeleted', handler);

      eventBus.emit({
        type: 'ProjectDeleted',
        projectId: 'test',
        project: { id: 'test', name: 'Test', created: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ProjectDeleted' })
      );
    });

    it('should handle ProjectSyncRequested event', () => {
      const handler = vi.fn();
      eventBus.on('ProjectSyncRequested', handler);

      eventBus.emit({
        type: 'ProjectSyncRequested',
        targets: ['github'],
        timestamp: new Date().toISOString(),
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ProjectSyncRequested' })
      );
    });

    it('should handle ExternalProjectDiscovered event', () => {
      const handler = vi.fn();
      eventBus.on('ExternalProjectDiscovered', handler);

      eventBus.emit({
        type: 'ExternalProjectDiscovered',
        source: 'github',
        externalId: 'project:test',
        suggestedProject: { id: 'test', name: 'Test' },
        timestamp: new Date().toISOString(),
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ExternalProjectDiscovered' })
      );
    });
  });
});
