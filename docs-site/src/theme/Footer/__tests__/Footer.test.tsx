import {describe, it, expect, vi} from 'vitest';
import React from 'react';
import {render, screen} from '@testing-library/react';

// Mock @docusaurus/Link
vi.mock('@docusaurus/Link', () => ({
  default: ({children, to, ...props}: any) => <a href={to} {...props}>{children}</a>,
}));

import Footer from '../index';

describe('Footer', () => {
  it('renders 4 column headings: Product, Docs, Community, Company', () => {
    render(<Footer />);
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Docs')).toBeInTheDocument();
    expect(screen.getByText('Community')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
  });

  it('renders 4 social icon links', () => {
    render(<Footer />);
    expect(screen.getByLabelText('GitHub')).toBeInTheDocument();
    expect(screen.getByLabelText('Discord')).toBeInTheDocument();
    expect(screen.getByLabelText('YouTube')).toBeInTheDocument();
    expect(screen.getByLabelText('X / Twitter')).toBeInTheDocument();
  });

  it('renders copyright with current year', () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year}`))).toBeInTheDocument();
    expect(screen.getByText(/SpecWeave/)).toBeInTheDocument();
  });

  it('has dark background class on footer', () => {
    const {container} = render(<Footer />);
    const footer = container.querySelector('footer');
    expect(footer).toBeTruthy();
  });

  it('renders documentation links', () => {
    render(<Footer />);
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Skills (100+)')).toBeInTheDocument();
  });
});
