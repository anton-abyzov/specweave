import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import VideoEmbed from '../index';

describe('VideoEmbed picture fallback (T-023)', () => {
  afterEach(cleanup);

  const defaultProps = {
    src: 'https://verified-skill.com/video/learn/foo.mp4',
    thumbnail: 'https://verified-skill.com/learn/thumbnails/foo.webp',
    title: 'Foo Video',
    duration: 90,
  };

  it('renders a <picture> element with WebP source and JPEG fallback', () => {
    const { container } = render(<VideoEmbed {...defaultProps} />);
    const picture = container.querySelector('picture');
    expect(picture).toBeTruthy();
    const source = picture!.querySelector('source[type="image/webp"]');
    expect(source).toBeTruthy();
    expect(source!.getAttribute('srcSet')).toBe(defaultProps.thumbnail);
    const img = picture!.querySelector('img');
    expect(img).toBeTruthy();
    // JPEG fallback should replace .webp extension with .jpg
    expect(img!.getAttribute('src')).toBe(
      defaultProps.thumbnail.replace('.webp', '.jpg')
    );
  });

  it('img element has non-empty alt attribute', () => {
    const { container } = render(<VideoEmbed {...defaultProps} />);
    const img = container.querySelector('picture img');
    expect(img).toBeTruthy();
    expect(img!.getAttribute('alt')).toBe('Foo Video');
    expect(img!.getAttribute('alt')).not.toBe('');
  });

  it('handles thumbnails without .webp extension gracefully', () => {
    const { container } = render(
      <VideoEmbed
        {...defaultProps}
        thumbnail="https://verified-skill.com/learn/thumbnails/foo.png"
      />
    );
    const picture = container.querySelector('picture');
    expect(picture).toBeTruthy();
    const img = picture!.querySelector('img');
    expect(img).toBeTruthy();
    // Non-webp thumbnail keeps original as fallback
    expect(img!.getAttribute('src')).toBe(
      'https://verified-skill.com/learn/thumbnails/foo.png'
    );
  });
});
