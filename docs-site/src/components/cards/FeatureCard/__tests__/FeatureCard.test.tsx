import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FeatureCard from '../index';

describe('FeatureCard', () => {
  it('renders title and description', () => {
    render(<FeatureCard icon="zap" title="Fast" description="Lightning fast" />);
    expect(screen.getByText('Fast')).toBeInTheDocument();
    expect(screen.getByText('Lightning fast')).toBeInTheDocument();
  });

  it('renders icon', () => {
    const { container } = render(<FeatureCard icon="zap" title="T" description="D" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders title as h3', () => {
    render(<FeatureCard icon="zap" title="Feature" description="Desc" />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Feature');
  });

  it('applies custom className', () => {
    const { container } = render(
      <FeatureCard icon="zap" title="T" description="D" className="custom" />
    );
    expect(container.firstChild).toHaveClass('custom');
  });

  it('has hover-ready card class', () => {
    const { container } = render(<FeatureCard icon="zap" title="T" description="D" />);
    expect(container.firstChild).toHaveClass('card');
  });
});
