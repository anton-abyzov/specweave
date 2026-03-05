import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import IntegrationCard from '../index';

// Mock brand SVG imports
vi.mock('@site/src/components/ui/Icon', () => ({
  default: ({ brand, size }: { brand?: string; size?: number }) => (
    <div data-testid="icon" data-brand={brand} data-size={size} />
  ),
}));

describe('IntegrationCard', () => {
  it('renders name and description', () => {
    render(<IntegrationCard brand="github" name="GitHub" description="Version control" />);
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Version control')).toBeInTheDocument();
  });

  it('renders icon with brand prop', () => {
    render(<IntegrationCard brand="github" name="GH" description="D" />);
    expect(screen.getByTestId('icon')).toHaveAttribute('data-brand', 'github');
  });

  it('renders as link when href provided', () => {
    render(<IntegrationCard brand="github" name="GH" description="D" href="/integrations/gh" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/integrations/gh');
  });

  it('renders as div when no href', () => {
    const { container } = render(
      <IntegrationCard brand="github" name="GH" description="D" />
    );
    expect(container.querySelector('a')).not.toBeInTheDocument();
    expect(container.querySelector('div.card')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <IntegrationCard brand="github" name="GH" description="D" className="custom" />
    );
    expect(container.firstChild).toHaveClass('custom');
  });
});
