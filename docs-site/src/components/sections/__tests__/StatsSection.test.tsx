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
    expect(screen.getByText('Skills Available')).toBeInTheDocument();
    expect(screen.getByText('Commits Shipped')).toBeInTheDocument();
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    expect(screen.getByText('Core Plugins')).toBeInTheDocument();
  });
});
