/**
 * Tool Event Bus Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolEventBus } from '../../../../src/core/tools/tool-event-bus.js';
import type { ToolIndexedEvent, ToolSelectedEvent } from '../../../../src/core/tools/types/tool-registry-types.js';

describe('ToolEventBus', () => {
  let bus: ToolEventBus;

  beforeEach(() => {
    bus = new ToolEventBus();
  });

  describe('on/emit', () => {
    it('should emit and receive events', () => {
      const handler = vi.fn();
      bus.on('ToolIndexed', handler);

      const event: ToolIndexedEvent = {
        type: 'ToolIndexed',
        timestamp: new Date().toISOString(),
        tool: {
          id: 'test:skill:test',
          name: 'test',
          type: 'skill',
          pluginName: 'test',
          description: 'Test skill',
          keywords: ['test'],
          relativePath: 'test/SKILL.md',
          loaded: false,
          indexedAt: new Date().toISOString(),
        },
      };

      bus.emit(event);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should support multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      bus.on('ToolSelected', handler1);
      bus.on('ToolSelected', handler2);

      const event: ToolSelectedEvent = {
        type: 'ToolSelected',
        timestamp: new Date().toISOString(),
        toolId: 'test:skill:test',
        query: 'test query',
        score: 0.8,
      };

      bus.emit(event);
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should not call handler for different event type', () => {
      const handler = vi.fn();
      bus.on('ToolLoaded', handler);

      bus.emit({
        type: 'ToolIndexed',
        timestamp: new Date().toISOString(),
        tool: {} as any,
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should only fire handler once', () => {
      const handler = vi.fn();
      bus.once('ToolIndexed', handler);

      bus.emit({ type: 'ToolIndexed', timestamp: '', tool: {} as any });
      bus.emit({ type: 'ToolIndexed', timestamp: '', tool: {} as any });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('off', () => {
    it('should remove handler', () => {
      const handler = vi.fn();
      bus.on('ToolIndexed', handler);
      bus.off('ToolIndexed', handler);

      bus.emit({ type: 'ToolIndexed', timestamp: '', tool: {} as any });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      bus.on('ToolIndexed', handler1);
      bus.on('ToolIndexed', handler2);
      bus.removeAllListeners('ToolIndexed');

      bus.emit({ type: 'ToolIndexed', timestamp: '', tool: {} as any });
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should remove all listeners when no type specified', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      bus.on('ToolIndexed', handler1);
      bus.on('ToolLoaded', handler2);
      bus.removeAllListeners();

      bus.emit({ type: 'ToolIndexed', timestamp: '', tool: {} as any });
      bus.emit({ type: 'ToolLoaded', timestamp: '', toolId: '', tool: {} as any });
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return correct count', () => {
      expect(bus.listenerCount('ToolIndexed')).toBe(0);

      bus.on('ToolIndexed', () => {});
      expect(bus.listenerCount('ToolIndexed')).toBe(1);

      bus.on('ToolIndexed', () => {});
      expect(bus.listenerCount('ToolIndexed')).toBe(2);
    });
  });

  describe('emitAndWait', () => {
    it('should wait for all handlers to complete', async () => {
      const order: number[] = [];
      
      bus.on('ToolIndexed', async () => {
        await new Promise(r => setTimeout(r, 10));
        order.push(1);
      });
      
      bus.on('ToolIndexed', async () => {
        order.push(2);
      });

      await bus.emitAndWait({ type: 'ToolIndexed', timestamp: '', tool: {} as any });
      expect(order).toContain(1);
      expect(order).toContain(2);
    });
  });

  describe('typed helper methods', () => {
    it('onToolIndexed should work', () => {
      const handler = vi.fn();
      bus.onToolIndexed(handler);
      bus.emit({ type: 'ToolIndexed', timestamp: '', tool: {} as any });
      expect(handler).toHaveBeenCalled();
    });

    it('onToolLoaded should work', () => {
      const handler = vi.fn();
      bus.onToolLoaded(handler);
      bus.emit({ type: 'ToolLoaded', timestamp: '', toolId: '', tool: {} as any });
      expect(handler).toHaveBeenCalled();
    });

    it('onToolSelected should work', () => {
      const handler = vi.fn();
      bus.onToolSelected(handler);
      bus.emit({ type: 'ToolSelected', timestamp: '', toolId: '', query: '', score: 0 });
      expect(handler).toHaveBeenCalled();
    });

    it('onRegistryRebuilt should work', () => {
      const handler = vi.fn();
      bus.onRegistryRebuilt(handler);
      bus.emit({ type: 'RegistryRebuilt', timestamp: '', result: {} as any });
      expect(handler).toHaveBeenCalled();
    });
  });
});
