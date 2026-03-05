import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PricingCard from '../index';

describe('PricingCard', () => {
  const defaultProps = {
    plan: 'Pro',
    price: '$29',
    features: ['Unlimited projects', '10 team members', 'API access'],
    cta: 'Get Started',
    href: '/pricing/pro',
  };

  it('renders plan name', () => {
    render(<PricingCard {...defaultProps} />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('renders price', () => {
    render(<PricingCard {...defaultProps} />);
    expect(screen.getByText('$29')).toBeInTheDocument();
  });

  it('renders period when provided', () => {
    render(<PricingCard {...defaultProps} period="month" />);
    expect(screen.getByText('/month')).toBeInTheDocument();
  });

  it('renders all features', () => {
    render(<PricingCard {...defaultProps} />);
    expect(screen.getByText('Unlimited projects')).toBeInTheDocument();
    expect(screen.getByText('10 team members')).toBeInTheDocument();
    expect(screen.getByText('API access')).toBeInTheDocument();
  });

  it('renders CTA link', () => {
    render(<PricingCard {...defaultProps} />);
    const link = screen.getByText('Get Started');
    expect(link).toHaveAttribute('href', '/pricing/pro');
  });

  it('applies highlighted class', () => {
    const { container } = render(<PricingCard {...defaultProps} highlighted />);
    expect(container.firstChild).toHaveClass('highlighted');
  });

  it('does not apply highlighted class by default', () => {
    const { container } = render(<PricingCard {...defaultProps} />);
    expect(container.firstChild).not.toHaveClass('highlighted');
  });

  it('applies custom className', () => {
    const { container } = render(<PricingCard {...defaultProps} className="custom" />);
    expect(container.firstChild).toHaveClass('custom');
  });
});
