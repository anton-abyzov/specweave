import {describe, it, expect, vi} from 'vitest';
import React from 'react';
import {render, screen} from '@testing-library/react';

vi.mock('@docusaurus/Link', () => ({
  default: ({children, to, ...props}: any) => <a href={to} {...props}>{children}</a>,
}));
import FamilyBar, {currentProduct} from '../FamilyBar';

describe('Weave family bar', () => {
  it('marks SpecWithCode current only on /code', () => {
    expect(currentProduct('/code/')).toBe('specwithcode');
    expect(currentProduct('/code')).toBe('specwithcode');
    expect(currentProduct('/codex-guide/')).toBe('specweave');
    expect(currentProduct('/docs/overview/introduction/')).toBe('specweave');
  });

  it('links the three products with SpecWeave current on the home page', () => {
    render(<FamilyBar pathname="/" />);
    const specweave = screen.getByRole('link', {name: /SpecWeave/});
    expect(specweave).toHaveAttribute('href', '/');
    expect(specweave).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', {name: /SpecWithCode/})).toHaveAttribute('href', '/code/');
    expect(screen.getByRole('link', {name: /SpecWithCode/})).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', {name: /Verified Skill/})).toHaveAttribute('href', 'https://verified-skill.com');
  });

  it('marks SpecWithCode current on /code', () => {
    render(<FamilyBar pathname="/code/" />);
    expect(screen.getByRole('link', {name: /SpecWithCode/})).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', {name: /SpecWeave/})).not.toHaveAttribute('aria-current');
  });
});
