import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CapabilitiesSection from '../CapabilitiesSection';

describe('CapabilitiesSection', () => {
  it('renders section title', () => {
    render(<CapabilitiesSection />);
    expect(screen.getByText('Everything You Need to Ship at Scale')).toBeInTheDocument();
  });

  it('renders all 6 capabilities', () => {
    render(<CapabilitiesSection />);
    expect(screen.getByText('Multi-Agent Teams')).toBeInTheDocument();
    expect(screen.getByText('Persistent Memory')).toBeInTheDocument();
    expect(screen.getByText('Autonomous Execution')).toBeInTheDocument();
    expect(screen.getByText('Quality Gates')).toBeInTheDocument();
    expect(screen.getByText('Living Documentation')).toBeInTheDocument();
    expect(screen.getByText('Bidirectional Sync')).toBeInTheDocument();
  });
});
