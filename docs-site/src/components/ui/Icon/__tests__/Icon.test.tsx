import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Icon from '../index';

// Mock the brand imports
vi.mock('../brands/github.svg', () => ({ default: 'github.svg' }));

describe('Icon', () => {
  it('renders a Lucide icon by name', () => {
    const { container } = render(<Icon name="zap" size={20} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('returns null for unknown icon name', () => {
    const { container } = render(<Icon name="nonexistent" />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when no name or brand', () => {
    const { container } = render(<Icon />);
    expect(container.firstChild).toBeNull();
  });

  it('applies className to Lucide icons', () => {
    const { container } = render(<Icon name="check" className="custom-icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-icon');
  });

  it('renders brand icon as img', () => {
    render(<Icon brand="github" size={32} />);
    const img = screen.getByAltText('github');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('width', '32');
    expect(img).toHaveAttribute('height', '32');
  });

  it('uses default size of 24', () => {
    const { container } = render(<Icon name="star" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('returns null for unknown brand', () => {
    const { container } = render(<Icon brand="nonexistent" />);
    expect(container.firstChild).toBeNull();
  });
});
