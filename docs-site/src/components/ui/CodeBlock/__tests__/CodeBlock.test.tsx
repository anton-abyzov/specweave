import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CodeBlock from '../index';

describe('CodeBlock', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders code content', () => {
    render(<CodeBlock code="const x = 1;" />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('shows language label when provided', () => {
    render(<CodeBlock code="hello" language="typescript" />);
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('shows copy button by default', () => {
    render(<CodeBlock code="test" />);
    expect(screen.getByLabelText('Copy code')).toBeInTheDocument();
  });

  it('hides copy button when showCopy is false', () => {
    render(<CodeBlock code="test" showCopy={false} />);
    expect(screen.queryByLabelText('Copy code')).not.toBeInTheDocument();
  });

  it('copies code to clipboard on click', async () => {
    render(<CodeBlock code="copy me" />);
    fireEvent.click(screen.getByLabelText('Copy code'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('copy me');
  });

  it('shows check icon after copy', async () => {
    render(<CodeBlock code="copy me" />);
    fireEvent.click(screen.getByLabelText('Copy code'));
    expect(await screen.findByLabelText('Copied')).toBeInTheDocument();
  });
});
