import React from 'react';
import {describe, it, expect} from 'vitest';
import {render, screen} from '@testing-library/react';

import {location} from '../../../__mocks__/unprefixed-pathname';
import NavbarItem from './index';

describe('product GitHub navbar destination', () => {
  it.each(['/code', '/code/', '/code/download/'])('links %s to SpecWithCode', (pathname) => {
    location.pathname = pathname;
    render(<NavbarItem className="header-github-link" href="https://github.com/anton-abyzov/specweave" aria-label="SpecWeave on GitHub" />);
    expect(screen.getByLabelText('SpecWithCode on GitHub')).toHaveAttribute('href', 'https://github.com/anton-abyzov/specwithcode');
  });

  it.each(['/', '/docs/getting-started/', '/codex-guide/'])('preserves the CLI link on %s', (pathname) => {
    location.pathname = pathname;
    render(<NavbarItem className="header-github-link" href="https://github.com/anton-abyzov/specweave" aria-label="SpecWeave on GitHub" />);
    expect(screen.getByLabelText('SpecWeave on GitHub')).toHaveAttribute('href', 'https://github.com/anton-abyzov/specweave');
  });

  it('leaves unrelated links untouched on app pages', () => {
    location.pathname = '/code/';
    render(<NavbarItem href="https://example.com" aria-label="Other link" />);
    expect(screen.getByLabelText('Other link')).toHaveAttribute('href', 'https://example.com');
  });
});
