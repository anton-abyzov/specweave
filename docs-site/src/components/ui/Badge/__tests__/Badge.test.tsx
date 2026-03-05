import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Badge from '../index';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies default variant class', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default')).toHaveClass('badge', 'default');
  });

  it('applies variant classes', () => {
    const { rerender } = render(<Badge variant="success">S</Badge>);
    expect(screen.getByText('S')).toHaveClass('success');

    rerender(<Badge variant="warning">W</Badge>);
    expect(screen.getByText('W')).toHaveClass('warning');

    rerender(<Badge variant="info">I</Badge>);
    expect(screen.getByText('I')).toHaveClass('info');

    rerender(<Badge variant="primary">P</Badge>);
    expect(screen.getByText('P')).toHaveClass('primary');
  });

  it('applies custom className', () => {
    render(<Badge className="custom">Badge</Badge>);
    expect(screen.getByText('Badge')).toHaveClass('custom');
  });
});
