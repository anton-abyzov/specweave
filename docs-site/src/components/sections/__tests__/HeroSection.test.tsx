import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HeroSection from '../HeroSection';

describe('HeroSection', () => {
  it('renders headline text', () => {
    render(<HeroSection />);
    expect(screen.getByText('Ship Features')).toBeInTheDocument();
  });

  it('renders Get Started CTA', () => {
    render(<HeroSection />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('renders Watch Demo CTA', () => {
    render(<HeroSection />);
    expect(screen.getByText('Watch Demo')).toBeInTheDocument();
  });

  it('renders pill badges', () => {
    render(<HeroSection />);
    expect(screen.getByText('Open Source')).toBeInTheDocument();
    expect(screen.getByText('Claude Code Native')).toBeInTheDocument();
  });
});
