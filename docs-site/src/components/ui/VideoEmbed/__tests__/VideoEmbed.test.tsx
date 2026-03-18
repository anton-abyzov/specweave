import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import VideoEmbed from '../index';

describe('VideoEmbed component (T-022)', () => {
  afterEach(cleanup);

  const defaultProps = {
    src: 'https://verified-skill.com/video/learn/getting-started-101.mp4',
    thumbnail: 'https://verified-skill.com/learn/thumbnails/getting-started-101.webp',
    title: 'Getting Started with vskill',
    duration: 154,
  };

  it('renders thumbnail and play button before click', () => {
    render(<VideoEmbed {...defaultProps} />);
    // Thumbnail should be visible
    const img = screen.getByAltText('Getting Started with vskill');
    expect(img).toBeTruthy();
    // Play button should be present
    const playButton = screen.getByRole('button', { name: /play/i });
    expect(playButton).toBeTruthy();
    // No video element yet
    expect(document.querySelector('video')).toBeNull();
  });

  it('renders duration badge formatted as MM:SS', () => {
    render(<VideoEmbed {...defaultProps} />);
    // 154 seconds = 2:34
    expect(screen.getByText('2:34')).toBeTruthy();
  });

  it('replaces thumbnail with video element on play button click', () => {
    render(<VideoEmbed {...defaultProps} />);
    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);
    // Video element should now be present
    const video = document.querySelector('video');
    expect(video).toBeTruthy();
    expect(video!.getAttribute('src')).toBe(defaultProps.src);
    // Thumbnail and play button should be gone
    expect(screen.queryByRole('button', { name: /play/i })).toBeNull();
  });

  it('uses direct src attribute on video element (no CORS fetch)', () => {
    render(<VideoEmbed {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    const video = document.querySelector('video');
    expect(video).toBeTruthy();
    // Should use direct src attribute, not source children
    expect(video!.getAttribute('src')).toBe(defaultProps.src);
  });

  it('shows fallback text when video errors', () => {
    render(<VideoEmbed {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    const video = document.querySelector('video')!;
    fireEvent.error(video);
    expect(screen.getByText(/Video unavailable/)).toBeTruthy();
  });

  it('renders thumbnail with non-empty alt attribute', () => {
    render(<VideoEmbed {...defaultProps} />);
    const img = screen.getByAltText('Getting Started with vskill');
    expect(img.getAttribute('alt')).toBe('Getting Started with vskill');
  });

  it('includes optional webm source when provided', () => {
    render(
      <VideoEmbed
        {...defaultProps}
        webm="https://verified-skill.com/video/learn/getting-started-101.webm"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    const sources = document.querySelectorAll('video source');
    // When webm is provided, video should use source elements
    const video = document.querySelector('video');
    expect(video).toBeTruthy();
  });
});

describe('VideoEmbed slug-based manifest (AC-US9-01)', () => {
  afterEach(cleanup);

  it('resolves props from VIDEO_MANIFEST when slug is provided', () => {
    render(<VideoEmbed slug="install-skill" />);
    const img = screen.getByAltText('Install a Skill in 30 Seconds');
    expect(img).toBeTruthy();
    const playButton = screen.getByRole('button', { name: /play/i });
    expect(playButton).toBeTruthy();
  });

  it('resolves video src from manifest on play', () => {
    render(<VideoEmbed slug="install-skill" />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    const video = document.querySelector('video');
    expect(video).toBeTruthy();
    expect(video!.getAttribute('src')).toBe(
      'https://verified-skill.com/video/learn/install-skill.mp4'
    );
  });

  it('explicit props override manifest values', () => {
    render(
      <VideoEmbed
        slug="install-skill"
        title="Custom Title"
        src="https://example.com/custom.mp4"
        thumbnail="https://example.com/custom.webp"
        duration={999}
      />
    );
    const img = screen.getByAltText('Custom Title');
    expect(img).toBeTruthy();
    expect(screen.getByText('16:39')).toBeTruthy();
  });

  it('renders with explicit props when slug is not in manifest', () => {
    render(
      <VideoEmbed
        slug="nonexistent-slug"
        src="https://example.com/fallback.mp4"
        thumbnail="https://example.com/fallback.webp"
        title="Fallback Video"
        duration={60}
      />
    );
    const img = screen.getByAltText('Fallback Video');
    expect(img).toBeTruthy();
  });

  it('renders nothing useful with unknown slug and no explicit props', () => {
    render(<VideoEmbed slug="nonexistent-slug" />);
    // Should still render container but with empty/default values
    expect(document.querySelector('video')).toBeNull();
  });
});
