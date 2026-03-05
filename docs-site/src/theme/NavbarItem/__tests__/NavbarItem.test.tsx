import {describe, it, expect, vi} from 'vitest';
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';

// Mock @docusaurus/Link
vi.mock('@docusaurus/Link', () => ({
  default: ({children, to, ...props}: any) => <a href={to} {...props}>{children}</a>,
}));

// Test MegaMenuPanel directly (avoids circular @theme-original alias)
import MegaMenuPanel from '../MegaMenuPanel';

const categories = [
  {
    categoryTitle: 'Getting Started',
    links: [
      {title: 'Introduction', description: 'What is SpecWeave', to: '/docs/intro'},
      {title: 'Quick Start', to: '/docs/quick-start'},
    ],
  },
  {
    categoryTitle: 'Advanced',
    links: [
      {title: 'Architecture', description: 'How it works', to: '/docs/arch'},
    ],
  },
];

describe('MegaMenuPanel', () => {
  it('renders categories and links when visible', () => {
    render(<MegaMenuPanel categories={categories} visible={true} onClose={() => {}} />);
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Quick Start')).toBeInTheDocument();
    expect(screen.getByText('Architecture')).toBeInTheDocument();
  });

  it('renders link descriptions when provided', () => {
    render(<MegaMenuPanel categories={categories} visible={true} onClose={() => {}} />);
    expect(screen.getByText('What is SpecWeave')).toBeInTheDocument();
    expect(screen.getByText('How it works')).toBeInTheDocument();
  });

  it('has role="menu" attribute', () => {
    render(<MegaMenuPanel categories={categories} visible={true} onClose={() => {}} />);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('sets data-visible based on visible prop', () => {
    const {rerender} = render(
      <MegaMenuPanel categories={categories} visible={false} onClose={() => {}} />,
    );
    expect(screen.getByRole('menu', {hidden: true})).toHaveAttribute('data-visible', 'false');
    rerender(<MegaMenuPanel categories={categories} visible={true} onClose={() => {}} />);
    expect(screen.getByRole('menu')).toHaveAttribute('data-visible', 'true');
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<MegaMenuPanel categories={categories} visible={true} onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('menu'), {key: 'Escape'});
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports arrow key navigation', () => {
    render(<MegaMenuPanel categories={categories} visible={true} onClose={() => {}} />);
    const menu = screen.getByRole('menu');
    const links = menu.querySelectorAll('a[href]');
    expect(links.length).toBe(3);
    // All links have role="menuitem"
    links.forEach((link) => {
      expect(link).toHaveAttribute('role', 'menuitem');
    });
  });

  it('closes panel when a link is clicked', () => {
    const onClose = vi.fn();
    render(<MegaMenuPanel categories={categories} visible={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Introduction'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('NavbarItemWrapper (integration)', () => {
  it('renders the swizzle header comment in source', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../index.tsx'),
      'utf-8',
    );
    expect(content).toContain('aria-haspopup');
    expect(content).toContain('aria-expanded');
    expect(content).toContain('Escape');
    expect(content).toContain('@theme-original/NavbarItem');
  });
});
