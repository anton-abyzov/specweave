import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CTASection from '../CTASection';

describe('CTASection', () => {
  it('renders headline', () => {
    render(<CTASection />);
    expect(screen.getByText(/Start Shipping Features/)).toBeInTheDocument();
  });

  it('renders install command', () => {
    render(<CTASection />);
    expect(screen.getByText('npx specweave init')).toBeInTheDocument();
  });

  it('renders CTA buttons', () => {
    render(<CTASection />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('Read the Docs')).toBeInTheDocument();
  });
});
