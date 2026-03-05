import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import WordAnimation from './index';

let observeCallback: IntersectionObserverCallback;
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  mockObserve.mockClear();
  mockUnobserve.mockClear();
  mockDisconnect.mockClear();

  class MockIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      observeCallback = callback;
    }
    observe = mockObserve;
    unobserve = mockUnobserve;
    disconnect = mockDisconnect;
  }

  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

describe('WordAnimation', () => {
  it('splits text into individual word spans', () => {
    render(<WordAnimation text="Hello beautiful world" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('beautiful')).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
  });

  it('starts words hidden (word class without visible)', () => {
    const { container } = render(<WordAnimation text="Hello world" />);
    const words = container.querySelectorAll('[class*="word"]');
    expect(words.length).toBeGreaterThanOrEqual(2);
    for (const word of words) {
      expect(word.className).not.toContain('wordVisible');
    }
  });

  it('reveals words on intersection', () => {
    const { container } = render(<WordAnimation text="Hello world" />);
    const wrapper = container.firstElementChild as HTMLElement;

    act(() => {
      observeCallback(
        [{ isIntersecting: true, target: wrapper } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    const words = container.querySelectorAll('[class*="wordVisible"]');
    expect(words.length).toBe(2);
  });

  it('applies staggered delays to words', () => {
    const { container } = render(<WordAnimation text="One Two Three" />);
    const wordEls = container.querySelectorAll('[class*="word"]:not([class*="space"])');
    const delays = Array.from(wordEls).map(
      (el) => (el as HTMLElement).style.transitionDelay,
    );
    expect(delays[0]).toBe('0ms');
    expect(parseInt(delays[1])).toBeGreaterThan(0);
    expect(parseInt(delays[2])).toBeGreaterThan(parseInt(delays[1]));
  });

  it('shows all words immediately with reduced motion', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const { container } = render(<WordAnimation text="Hello world" />);
    const words = container.querySelectorAll('[class*="noMotion"]');
    expect(words.length).toBe(2);
  });

  it('completes reveal within 2 seconds stagger', () => {
    const { container } = render(<WordAnimation text="One Two Three Four Five" />);
    const wordEls = container.querySelectorAll('[class*="word"]:not([class*="space"])');
    const lastDelay = parseInt((wordEls[wordEls.length - 1] as HTMLElement).style.transitionDelay);
    expect(lastDelay).toBeLessThanOrEqual(2000);
  });
});
