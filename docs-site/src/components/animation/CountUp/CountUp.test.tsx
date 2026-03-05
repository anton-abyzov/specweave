import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import CountUp from './index';

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

describe('CountUp', () => {
  it('renders with prefix and suffix', () => {
    render(<CountUp target={100} prefix="$" suffix="+" />);
    const el = screen.getByText(/\$0\+/);
    expect(el).toBeInTheDocument();
  });

  it('starts at 0 before intersection', () => {
    render(<CountUp target={500} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows target value immediately with reduced motion', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    render(<CountUp target={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('uses requestAnimationFrame for counting', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);

    const { container } = render(<CountUp target={100} />);

    act(() => {
      observeCallback(
        [{ isIntersecting: true, target: container.firstElementChild! } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(rafSpy).toHaveBeenCalled();
    rafSpy.mockRestore();
  });

  it('animates to target with ease-out curve', () => {
    let rafCallback: FrameRequestCallback | null = null;
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });

    const { container } = render(<CountUp target={1000} duration={1000} />);

    act(() => {
      observeCallback(
        [{ isIntersecting: true, target: container.firstElementChild! } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    // First frame sets start=0
    act(() => {
      rafCallback!(0);
    });

    // Second frame at t=500ms → progress=0.5
    act(() => {
      rafCallback!(500);
    });

    // At 50% progress, ease-out: 1 - (1-0.5)^3 = 0.875
    const expected = Math.round(1000 * (1 - Math.pow(1 - 0.5, 3)));
    expect(container.textContent).toBe(String(expected));

    rafSpy.mockRestore();
  });
});
