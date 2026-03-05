import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from '../index';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders as button by default', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders as anchor when href is provided', () => {
    render(<Button href="/test">Link</Button>);
    const link = screen.getByText('Link');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/test');
  });

  it('renders as button when href provided but disabled', () => {
    render(<Button href="/test" disabled>Disabled Link</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant classes', () => {
    const { rerender } = render(<Button variant="primary">Btn</Button>);
    expect(screen.getByRole('button')).toHaveClass('primary');

    rerender(<Button variant="ghost">Btn</Button>);
    expect(screen.getByRole('button')).toHaveClass('ghost');

    rerender(<Button variant="outline">Btn</Button>);
    expect(screen.getByRole('button')).toHaveClass('outline');

    rerender(<Button variant="secondary">Btn</Button>);
    expect(screen.getByRole('button')).toHaveClass('secondary');
  });

  it('applies size classes', () => {
    const { rerender } = render(<Button size="sm">Btn</Button>);
    expect(screen.getByRole('button')).toHaveClass('sm');

    rerender(<Button size="lg">Btn</Button>);
    expect(screen.getByRole('button')).toHaveClass('lg');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('applies disabled class and attribute', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveClass('disabled');
  });

  it('applies custom className', () => {
    render(<Button className="custom">Btn</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom');
  });
});
