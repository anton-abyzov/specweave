import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HowItWorksSection from '../HowItWorksSection';

describe('HowItWorksSection', () => {
  it('renders section title', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText('Three Commands. One Workflow.')).toBeInTheDocument();
  });

  it('renders three steps', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText('Plan with AI')).toBeInTheDocument();
    expect(screen.getByText('Build Autonomously')).toBeInTheDocument();
    expect(screen.getByText('Ship with Confidence')).toBeInTheDocument();
  });

  it('renders step numbers', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
