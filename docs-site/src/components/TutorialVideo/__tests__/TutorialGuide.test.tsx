import {describe, it, expect, vi} from 'vitest';
import React from 'react';
import {render, screen} from '@testing-library/react';

import {GuideBody, InlineCode} from '../GuideBody';
import TutorialEmbed from '../TutorialEmbed';
import {getTutorial, type Tutorial} from '@site/src/data/tutorials';

const guide = (slug: string) => getTutorial(slug) as Tutorial;

describe('GuideBody', () => {
  const transcript = [{start: 0, title: 'A disposable demo repository', text: 'Here is a real SpecWeave workflow.'}];

  it('renders the guide template in order: breadcrumbs, title, outcome, video, steps, note, transcript, action, path, related', () => {
    const t = getTutorial('specweave-workflow')!;
    const {container} = render(<GuideBody tutorial={t} transcript={transcript} />);
    const order = ['nav[aria-label="Breadcrumbs"]', 'h1', 'video', '#steps-title', 'aside', '#transcript-title', 'a.wv-btn--primary', '#path-title', '#related-title']
      .map(selector => container.querySelector(selector));
    order.forEach(node => expect(node).not.toBeNull());
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent(t.title);
    expect(screen.getByText(t.outcome)).toBeInTheDocument();
    expect(container.querySelectorAll('ol li code').length).toBeGreaterThan(0);
  });

  it('keeps each step one grid item, so inline code stays in the text column', () => {
    const {container} = render(<GuideBody tutorial={guide('join-a-mac')} />);
    const steps = [...container.querySelectorAll('ol li')].filter(li => li.querySelector('code'));
    expect(steps.length).toBeGreaterThan(0);
    for (const li of steps) {
      expect(li.childNodes).toHaveLength(1);
      expect(li.firstElementChild!.tagName).toBe('SPAN');
    }
  });

  it('marks this guide as the current step of its learning path', () => {
    const {container} = render(<GuideBody tutorial={guide('projects-and-threads')} />);
    const current = container.querySelector('.wv-thread li[aria-current="step"]');
    expect(current).toHaveTextContent('Run a project with a coordinator and workers');
  });

  it('states the recorded version and the current SpecWithCode release', () => {
    render(<GuideBody tutorial={guide('specwithcode-codex')} />);
    expect(screen.getByText(/Recorded on SpecWithCode 0\.2\.6, added 11 October 2026\. The current release is SpecWithCode \d+\.\d+\.\d+\./)).toBeInTheDocument();
  });
});

describe('InlineCode', () => {
  it('turns backticked spans into code and leaves the rest as text', () => {
    const {container} = render(<p><InlineCode text="Run `specweave pickup` in the clone." /></p>);
    expect(container.querySelector('code')).toHaveTextContent('specweave pickup');
    expect(container.textContent).toBe('Run specweave pickup in the clone.');
  });
});

describe('TutorialEmbed', () => {
  it('plays a catalogued video with its captions and links to the guide', () => {
    const {container} = render(<TutorialEmbed slug="memory-and-usage" />);
    expect(container.querySelector('source')).toHaveAttribute('src', '/video/studio-projects/memory-and-usage.mp4');
    expect(container.querySelector('track')).toHaveAttribute('src', '/video/studio-projects/memory-and-usage.vtt');
    expect(container.querySelector('video')).toHaveAttribute('preload', 'none');
    expect(screen.getByRole('link', {name: /Open the guide/})).toHaveAttribute('href', '/tutorials/memory-and-usage/');
  });

  it('fails loudly for a slug that is not published', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TutorialEmbed slug="specwithcode-cursor" />)).toThrow(/no published tutorial/);
  });
});
