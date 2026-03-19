import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import IntegrationsSection from '../IntegrationsSection';

describe('IntegrationsSection', () => {
  it('renders section title', () => {
    render(<IntegrationsSection />);
    expect(screen.getByText('Connects to Your Toolchain')).toBeInTheDocument();
  });

  it('renders all integrations', () => {
    render(<IntegrationsSection />);
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('JIRA')).toBeInTheDocument();
    expect(screen.getByText('Azure DevOps')).toBeInTheDocument();
    expect(screen.getByText('Claude, Cursor, Copilot')).toBeInTheDocument();
  });
});
