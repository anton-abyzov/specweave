import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatsSection from '../StatsSection';

describe('StatsSection', () => {
  it('renders section title', () => {
    render(<StatsSection />);
    expect(screen.getByText('Built With Itself. Production Ready.')).toBeInTheDocument();
  });

  it('renders stat labels', () => {
    render(<StatsSection />);
    expect(screen.getByText('Verified Skills')).toBeInTheDocument();
    expect(screen.getByText('Autonomous Hours')).toBeInTheDocument();
    expect(screen.getByText('Increments Shipped')).toBeInTheDocument();
    expect(screen.getByText('Community Members')).toBeInTheDocument();
  });
});
