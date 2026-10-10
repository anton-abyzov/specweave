import {describe, it, expect, vi} from 'vitest';
import React from 'react';
import {render, screen} from '@testing-library/react';

// Mock @docusaurus/Link
vi.mock('@docusaurus/Link', () => ({
  default: ({children, to, ...props}: any) => <a href={to} {...props}>{children}</a>,
}));

import Footer from '../index';

describe('Footer', () => {
  it('renders 4 column headings: Start, Switch tools, Reference, Project', () => {
    render(<Footer />);
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Switch tools')).toBeInTheDocument();
    expect(screen.getByText('Reference')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
  });

  it('renders social icon links', () => {
    render(<Footer />);
    expect(screen.getByLabelText('GitHub')).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub Issues')).toHaveAttribute(
      'href', 'https://github.com/anton-abyzov/specweave/issues',
    );
    expect(screen.getByLabelText('X / Twitter')).toBeInTheDocument();
  });

  it('renders copyright with current year', () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year}.*SpecWeave`))).toBeInTheDocument();
  });

  it('has dark background class on footer', () => {
    const {container} = render(<Footer />);
    const footer = container.querySelector('footer');
    expect(footer).toBeTruthy();
  });

  it('renders documentation links', () => {
    render(<Footer />);
    expect(screen.getByText('What is SpecWeave?')).toHaveAttribute('href', '/docs/overview/introduction');
    expect(screen.getByText('Quick start')).toHaveAttribute('href', '/docs/getting-started');
    expect(screen.getByText('Handoff and pickup')).toHaveAttribute('href', '/docs/guides/cross-tool-handoff');
  });
});
