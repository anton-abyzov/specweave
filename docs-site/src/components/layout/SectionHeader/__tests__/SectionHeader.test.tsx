import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SectionHeader from '../index';

describe('SectionHeader', () => {
  it('renders title', () => {
    render(<SectionHeader title="Features" />);
    expect(screen.getByText('Features')).toBeInTheDocument();
  });

  it('renders title as h2', () => {
    render(<SectionHeader title="Test" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Test');
  });

  it('renders label when provided', () => {
    render(<SectionHeader label="FEATURES" title="Test" />);
    expect(screen.getByText('FEATURES')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    const { container } = render(<SectionHeader title="Test" />);
    expect(container.querySelector('.label')).not.toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<SectionHeader title="Test" subtitle="Description" />);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(<SectionHeader title="Test" />);
    expect(container.querySelector('.subtitle')).not.toBeInTheDocument();
  });

  it('applies centered class by default', () => {
    const { container } = render(<SectionHeader title="Test" />);
    expect(container.firstChild).toHaveClass('centered');
  });

  it('does not apply centered class when false', () => {
    const { container } = render(<SectionHeader title="Test" centered={false} />);
    expect(container.firstChild).not.toHaveClass('centered');
  });

  it('applies custom className', () => {
    const { container } = render(<SectionHeader title="Test" className="my-header" />);
    expect(container.firstChild).toHaveClass('my-header');
  });
});
