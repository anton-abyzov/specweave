import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ContentCard from '../index';

describe('ContentCard', () => {
  const defaultProps = {
    title: 'Getting Started',
    description: 'Learn the basics',
    href: '/docs/getting-started',
  };

  it('renders title and description', () => {
    render(<ContentCard {...defaultProps} />);
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Learn the basics')).toBeInTheDocument();
  });

  it('renders as a link', () => {
    render(<ContentCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/docs/getting-started');
  });

  it('renders image when provided', () => {
    const { container } = render(<ContentCard {...defaultProps} image="/img/test.png" />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/img/test.png');
  });

  it('does not render image area when image is not provided', () => {
    const { container } = render(<ContentCard {...defaultProps} />);
    expect(container.querySelector('.imageArea')).not.toBeInTheDocument();
  });

  it('renders reading time', () => {
    render(<ContentCard {...defaultProps} readingTime="5 min read" />);
    expect(screen.getByText('5 min read')).toBeInTheDocument();
  });

  it('renders difficulty badge', () => {
    render(<ContentCard {...defaultProps} difficulty="beginner" />);
    expect(screen.getByText('beginner')).toBeInTheDocument();
  });

  it('renders tag', () => {
    render(<ContentCard {...defaultProps} tag="Tutorial" />);
    expect(screen.getByText('Tutorial')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ContentCard {...defaultProps} className="custom" />);
    expect(container.firstChild).toHaveClass('custom');
  });
});
