import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Divider from '../index';

describe('Divider', () => {
  it('renders an hr element', () => {
    const { container } = render(<Divider />);
    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('applies subtle variant by default', () => {
    const { container } = render(<Divider />);
    expect(container.querySelector('hr')).toHaveClass('subtle');
  });

  it('applies horizontal orientation by default', () => {
    const { container } = render(<Divider />);
    expect(container.querySelector('hr')).toHaveClass('horizontal');
  });

  it('applies strong variant', () => {
    const { container } = render(<Divider variant="strong" />);
    expect(container.querySelector('hr')).toHaveClass('strong');
  });

  it('applies vertical orientation', () => {
    const { container } = render(<Divider orientation="vertical" />);
    expect(container.querySelector('hr')).toHaveClass('vertical');
  });

  it('applies custom className', () => {
    const { container } = render(<Divider className="my-divider" />);
    expect(container.querySelector('hr')).toHaveClass('my-divider');
  });
});
