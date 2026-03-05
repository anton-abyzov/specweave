import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatCard from '../index';

describe('StatCard', () => {
  it('renders value and label', () => {
    render(<StatCard value={99} label="Stars" />);
    expect(screen.getByText('99')).toBeInTheDocument();
    expect(screen.getByText('Stars')).toBeInTheDocument();
  });

  it('renders string values', () => {
    render(<StatCard value="100K" label="Downloads" />);
    expect(screen.getByText('100K')).toBeInTheDocument();
  });

  it('renders suffix when provided', () => {
    render(<StatCard value={99} label="Uptime" suffix="%" />);
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('does not render suffix when not provided', () => {
    const { container } = render(<StatCard value={10} label="Items" />);
    expect(container.querySelector('.suffix')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<StatCard value={1} label="L" className="custom" />);
    expect(container.firstChild).toHaveClass('custom');
  });
});
