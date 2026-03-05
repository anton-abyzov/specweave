import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DemoVideoSection from '../DemoVideoSection';

describe('DemoVideoSection', () => {
  it('renders section header', () => {
    render(<DemoVideoSection />);
    expect(screen.getByText('Ship While You Sleep')).toBeInTheDocument();
  });

  it('renders video element', () => {
    const { container } = render(<DemoVideoSection />);
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
  });

  it('renders browser chrome dots', () => {
    const { container } = render(<DemoVideoSection />);
    const dots = container.querySelectorAll('[data-color]');
    expect(dots).toHaveLength(3);
  });
});
