import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AcademyPromoSection from '../AcademyPromoSection';

describe('AcademyPromoSection', () => {
  it('renders section title', () => {
    render(<AcademyPromoSection />);
    expect(screen.getByText('Learn SpecWeave from Zero to Production')).toBeInTheDocument();
  });

  it('renders three courses', () => {
    render(<AcademyPromoSection />);
    expect(screen.getByText('Software Engineering Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('SpecWeave Essentials')).toBeInTheDocument();
    expect(screen.getByText('Public Talks & Deep Dives')).toBeInTheDocument();
  });

  it('renders difficulty badges', () => {
    render(<AcademyPromoSection />);
    expect(screen.getByText('beginner')).toBeInTheDocument();
    expect(screen.getByText('intermediate')).toBeInTheDocument();
    expect(screen.getByText('advanced')).toBeInTheDocument();
  });
});
