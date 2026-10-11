import {describe, it, expect, vi, beforeEach} from 'vitest';
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import TutorialVideo from '../index';

const chapters = [
  {start: 0, title: 'Intro'},
  {start: 15, title: 'Each job gets a model'},
  {start: 48, title: 'One record in git'},
];

describe('TutorialVideo', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  });

  it('renders a native player with poster, metadata preload and a default English captions track', () => {
    const {container} = render(
      <TutorialVideo title="Tour" src="/video/tour.mp4" poster="/img/tour.jpg" captionsVtt="/video/tour.vtt" durationSeconds={61} />,
    );
    const video = container.querySelector('video')!;
    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('preload', 'metadata');
    expect(video).toHaveAttribute('poster', '/img/tour.jpg');
    expect(video.playsInline).toBe(true);
    const track = container.querySelector('track')!;
    expect(track).toHaveAttribute('kind', 'captions');
    expect(track).toHaveAttribute('srclang', 'en');
    expect(track).toHaveAttribute('src', '/video/tour.vtt');
    expect(track.default).toBe(true);
    expect(screen.getByText('1:01')).toBeInTheDocument();
  });

  it('omits the captions track when no VTT exists', () => {
    const {container} = render(<TutorialVideo title="Silent" src="/video/a.mp4" />);
    expect(container.querySelector('track')).toBeNull();
  });

  it('seeks and plays from a chapter, marking it current', () => {
    const {container} = render(<TutorialVideo title="Tour" src="/video/tour.mp4" chapters={chapters} />);
    const nav = screen.getByRole('navigation', {name: 'Chapters: Tour'});
    expect(nav).toBeInTheDocument();
    const button = screen.getByRole('button', {name: /0:48 One record in git/});
    fireEvent.click(button);
    expect(container.querySelector('video')!.currentTime).toBe(48);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(button).toHaveAttribute('aria-current', 'true');
  });

  it('shows a coming-soon card instead of a player when there is no video yet', () => {
    const {container} = render(
      <TutorialVideo title="SpecWithCode with Codex" agentLabel="Codex" outline={['Set up', 'One real task']} />,
    );
    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByRole('img', {name: /SpecWithCode with Codex\. Coming soon\. Planned: Set up, One real task\./})).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    expect(screen.getByText('Codex')).toBeInTheDocument();
  });

  it('keeps an explicit preload for off-site sources', () => {
    const {container} = render(<TutorialVideo title="Off-site" src="https://example.com/a.mp4" preload="none" />);
    expect(container.querySelector('video')).toHaveAttribute('preload', 'none');
  });
});
