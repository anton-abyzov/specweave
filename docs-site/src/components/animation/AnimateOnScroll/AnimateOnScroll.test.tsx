import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import AnimateOnScroll from './index';

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

describe('AnimateOnScroll', () => {
  it('renders children', () => {
    render(<AnimateOnScroll><span>Hello</span></AnimateOnScroll>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('starts with opacity 0 (hidden state via CSS class)', () => {
    const { container } = render(<AnimateOnScroll><span>Test</span></AnimateOnScroll>);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('wrapper');
    expect(wrapper.className).not.toContain('visible');
  });

  it('adds visible class on intersection', () => {
    const { container } = render(<AnimateOnScroll><span>Test</span></AnimateOnScroll>);
    const wrapper = container.firstElementChild as HTMLElement;

    act(() => {
      observeCallback(
        [{ isIntersecting: true, target: wrapper } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(wrapper.className).toContain('visible');
  });

  it('applies delay as transition-delay style', () => {
    const { container } = render(
      <AnimateOnScroll delay={200}><span>Test</span></AnimateOnScroll>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.transitionDelay).toBe('200ms');
  });

  it('shows immediately with reduced motion', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const { container } = render(<AnimateOnScroll><span>Test</span></AnimateOnScroll>);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('noMotion');
  });
});
