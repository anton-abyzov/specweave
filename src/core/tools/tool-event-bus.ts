/**
 * Tool Event Bus - EDA for Tool Registry
 * @module core/tools/tool-event-bus
 * @since v0.35.0
 */

import { EventEmitter } from 'events';
import type { Logger } from '../../utils/logger.js';
import { consoleLogger } from '../../utils/logger.js';
import type {
  ToolEvent,
  ToolEventType,
  ToolEventHandler,
  ToolIndexedEvent,
  ToolLoadedEvent,
  ToolSelectedEvent,
  RegistryRebuiltEvent,
} from './types/tool-registry-types.js';

const MAX_LISTENERS = 50;

export class ToolEventBus {
  private emitter: EventEmitter;
  private logger: Logger;
  private handlerMap: WeakMap<Function, Function>;

  constructor(options: { logger?: Logger } = {}) {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(MAX_LISTENERS);
    this.logger = options.logger ?? consoleLogger;
    this.handlerMap = new WeakMap();
  }

  on<T extends ToolEventType>(
    eventType: T,
    handler: ToolEventHandler<Extract<ToolEvent, { type: T }>>
  ): void {
    const wrappedHandler = async (event: ToolEvent) => {
      try {
        await handler(event as Extract<ToolEvent, { type: T }>);
      } catch (error) {
        this.logger.error(`Tool event handler error for ${eventType}: ${error}`);
      }
    };
    this.handlerMap.set(handler, wrappedHandler);
    this.emitter.on(eventType, wrappedHandler);
  }

  once<T extends ToolEventType>(
    eventType: T,
    handler: ToolEventHandler<Extract<ToolEvent, { type: T }>>
  ): void {
    const wrappedHandler = async (event: ToolEvent) => {
      try {
        await handler(event as Extract<ToolEvent, { type: T }>);
      } catch (error) {
        this.logger.error(`Tool event handler error for ${eventType}: ${error}`);
      }
    };
    this.emitter.once(eventType, wrappedHandler);
  }

  off<T extends ToolEventType>(
    eventType: T,
    handler: ToolEventHandler<Extract<ToolEvent, { type: T }>>
  ): void {
    const wrappedHandler = this.handlerMap.get(handler);
    if (wrappedHandler) {
      this.emitter.off(eventType, wrappedHandler as (...args: unknown[]) => void);
      this.handlerMap.delete(handler);
    }
  }

  emit(event: ToolEvent): void {
    this.logger.debug(`Emitting tool event: ${event.type}`);
    this.emitter.emit(event.type, event);
  }

  async emitAndWait(event: ToolEvent): Promise<void> {
    this.logger.debug(`Emitting tool event (waiting): ${event.type}`);
    const listeners = this.emitter.listeners(event.type) as ((event: ToolEvent) => Promise<void>)[];
    const results = await Promise.allSettled(listeners.map(listener => listener(event)));
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(`Tool event handler failed: ${result.reason}`);
      }
    }
  }

  removeAllListeners(eventType?: ToolEventType): void {
    if (eventType) {
      this.emitter.removeAllListeners(eventType);
    } else {
      this.emitter.removeAllListeners();
    }
  }

  listenerCount(eventType: ToolEventType): number {
    return this.emitter.listenerCount(eventType);
  }

  onToolIndexed(handler: ToolEventHandler<ToolIndexedEvent>): void {
    this.on('ToolIndexed', handler);
  }

  onToolLoaded(handler: ToolEventHandler<ToolLoadedEvent>): void {
    this.on('ToolLoaded', handler);
  }

  onToolSelected(handler: ToolEventHandler<ToolSelectedEvent>): void {
    this.on('ToolSelected', handler);
  }

  onRegistryRebuilt(handler: ToolEventHandler<RegistryRebuiltEvent>): void {
    this.on('RegistryRebuilt', handler);
  }
}
