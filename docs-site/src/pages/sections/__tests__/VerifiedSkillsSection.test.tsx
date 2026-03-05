import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import VerifiedSkillsSection from '../VerifiedSkillsSection';

describe('VerifiedSkillsSection', () => {
  it('renders section title', () => {
    render(<VerifiedSkillsSection />);
    expect(screen.getByText('Three-Tier Skill Verification')).toBeInTheDocument();
  });

  it('renders three tiers', () => {
    render(<VerifiedSkillsSection />);
    expect(screen.getByText('Scanned')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Certified')).toBeInTheDocument();
  });

  it('renders verified-skill.com link', () => {
    render(<VerifiedSkillsSection />);
    expect(screen.getByText('Learn more at verified-skill.com')).toBeInTheDocument();
  });
});
