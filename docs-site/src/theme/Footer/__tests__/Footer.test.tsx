import {describe, it, expect, vi} from 'vitest';
import React from 'react';
import {render, screen} from '@testing-library/react';

import {location} from '../../../__mocks__/unprefixed-pathname';

// Mock @docusaurus/Link
vi.mock('@docusaurus/Link', () => ({
  default: ({children, to, ...props}: any) => <a href={to} {...props}>{children}</a>,
}));

import Footer from '../index';

describe('Footer', () => {
  it('renders the four shell columns, the second named after the product', () => {
    const {container} = render(<Footer />);
    const titles = Array.from(container.querySelectorAll('footer.wv-footer h2')).map((h) => h.textContent);
    expect(titles).toEqual(['Products', 'SpecWeave', 'Guides', 'Project']);
  });

  it('links the three products first', () => {
    const {container} = render(<Footer />);
    const products = container.querySelector('footer.wv-footer ul')!;
    expect(Array.from(products.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['/', '/code/', 'https://verified-skill.com']);
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
    expect(screen.getByText('Tutorials')).toHaveAttribute('href', '/tutorials');
    expect(screen.getByText('Handoff and pickup')).toHaveAttribute('href', '/docs/guides/cross-tool-handoff');
    expect(screen.getByText('Privacy')).toHaveAttribute('href', '/privacy');
    expect(screen.getByText('SpecWeave vs OpenSpec')).toHaveAttribute('href', '/docs/compare/specweave-vs-openspec/');
    expect(screen.getByText('All spec-driven tools')).toHaveAttribute('href', '/docs/compare/spec-driven-development-tools/');
    expect(screen.getByText('What goes in handoff.md')).toHaveAttribute('href', '/docs/guides/handoff-md/');
    expect(screen.getByText('Support')).toHaveAttribute('href', '/support');
  });

  it('labels both repositories separately', () => {
    render(<Footer />);
    expect(screen.getByText('SpecWithCode GitHub')).toHaveAttribute('href', 'https://github.com/anton-abyzov/specwithcode');
    expect(screen.getByText('SpecWeave GitHub')).toHaveAttribute('href', 'https://github.com/anton-abyzov/specweave');
  });

  it('sends app-page social links to the app repository and issues', () => {
    location.pathname = '/code/download/';
    try {
      render(<Footer />);
      expect(screen.getByLabelText('GitHub')).toHaveAttribute('href', 'https://github.com/anton-abyzov/specwithcode');
      expect(screen.getByLabelText('GitHub Issues')).toHaveAttribute('href', 'https://github.com/anton-abyzov/specwithcode/issues');
      expect(screen.getByText('Download SpecWithCode')).toHaveAttribute('href', '/code/download/');
    } finally {
      location.pathname = '/';
    }
  });
});
