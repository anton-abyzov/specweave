import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Section from '../index';

describe('Section', () => {
  it('renders children inside container', () => {
    render(<Section>Content here</Section>);
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('renders as section element', () => {
    const { container } = render(<Section>Test</Section>);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('applies default variant', () => {
    const { container } = render(<Section>Test</Section>);
    expect(container.querySelector('section')).toHaveClass('default');
  });

  it('applies dark variant', () => {
    const { container } = render(<Section variant="dark">Test</Section>);
    expect(container.querySelector('section')).toHaveClass('dark');
  });

  it('applies gradient variant', () => {
    const { container } = render(<Section variant="gradient">Test</Section>);
    expect(container.querySelector('section')).toHaveClass('gradient');
  });

  it('applies accent variant', () => {
    const { container } = render(<Section variant="accent">Test</Section>);
    expect(container.querySelector('section')).toHaveClass('accent');
  });

  it('applies id attribute', () => {
    const { container } = render(<Section id="features">Test</Section>);
    expect(container.querySelector('#features')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Section className="custom">Test</Section>);
    expect(container.querySelector('section')).toHaveClass('custom');
  });

  it('wraps children in container div', () => {
    const { container } = render(<Section>Inner</Section>);
    const containerDiv = container.querySelector('.container');
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv).toHaveTextContent('Inner');
  });
});
