import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TrustedBySection from '../TrustedBySection';

describe('TrustedBySection', () => {
  it('renders label text', () => {
    render(<TrustedBySection />);
    expect(screen.getByText('Works with your stack')).toBeInTheDocument();
  });

  it('renders brand logos', () => {
    render(<TrustedBySection />);
    const githubLogos = screen.getAllByAltText('github');
    expect(githubLogos.length).toBeGreaterThanOrEqual(2); // duplicated for marquee
  });
});
