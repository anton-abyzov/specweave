import {describe, it, expect, vi} from 'vitest';
import React from 'react';
import {render, screen} from '@testing-library/react';

import {GuideBody, InlineCode} from '../GuideBody';
import TutorialEmbed from '../TutorialEmbed';
import {getTutorial, type Tutorial} from '@site/src/data/tutorials';

const guide = (slug: string) => getTutorial(slug) as Tutorial;

// A per-agent guide as its catalogue entry renders; the per-agent episodes are unpublished while they are re-recorded.
const agentGuide: Tutorial = {
  ...guide('join-a-mac'),
  slug: 'specwithcode-grok',
  title: 'Run your first task with Grok',
  agent: 'grok',
  testedOn: 'SpecWithCode 0.2.6',
  uploadDate: '2026-10-11',
  agentNotes: ['Grok skips project skills in folders it does not trust. The grant is saved in `~/.grok/trusted_folders.toml`.'],
};

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
    const steps = Array.from(container.querySelectorAll('ol li')).filter(li => li.querySelector('code'));
    expect(steps.length).toBeGreaterThan(0);
    for (const li of steps) {
      expect(li.childNodes).toHaveLength(1);
      expect(li.firstElementChild!.tagName).toBe('SPAN');
    }
  });

  it('places the guide in its learning path with the guides before and after it', () => {
    const {container} = render(<GuideBody tutorial={guide('projects-and-threads')} />);
    expect(container.textContent).toMatch(/Step 3 of \d+ in Run SpecWithCode/);
    expect(screen.getByRole('link', {name: 'Run SpecWithCode'})).toHaveAttribute('href', '/tutorials/#path-run-specwithcode');
    expect(container.querySelector('a[rel="prev"]')).toHaveAttribute('href', '/tutorials/start-specwithcode/');
    expect(container.querySelector('a[rel="next"]')).toHaveAttribute('href', '/tutorials/plans-and-routines/');
    expect(container.querySelector('.wv-thread')).toBeNull();
  });

  it('prints the transcript open on the page, with an anchor and a start link per chapter', () => {
    const sections = [
      {start: 0, title: 'Intro', text: 'Grok in SpecWithCode.'},
      {start: 22.6, title: 'Connect Grok', text: 'Open SpecWithCode.'},
    ];
    const {container} = render(<GuideBody tutorial={agentGuide} transcript={sections} />);
    const heading = container.querySelector('#transcript-title')!;
    expect(heading.tagName).toBe('H2');
    expect(heading.closest('details')).toBeNull();
    expect(container.querySelector('h3#t-22 a')).toHaveAttribute('href', '/tutorials/specwithcode-grok/?t=22#video');
    expect(container.querySelector('h3#t-0 a')).toHaveAttribute('href', '/tutorials/specwithcode-grok/#video');
  });

  it('shows the agent notes and the recorded terminal runs of an agent guide', () => {
    const captures = [{label: 'After `grok --trust`', command: 'grok --trust inspect --json', exitCode: 0, stdout: 'sw-do\nsw-increment', truncated: false, capturedAt: '2026-10-11T05:03:35.230Z'}];
    const {container} = render(<GuideBody tutorial={agentGuide} captures={captures} />);
    expect(screen.getByRole('heading', {name: 'Using Grok with SpecWithCode'})).toBeInTheDocument();
    expect(container.textContent).toContain('as recorded on SpecWithCode 0.2.6');
    expect(container.textContent).toContain('trusted_folders.toml');
    expect(container.querySelector('pre')).toHaveTextContent('$ grok --trust inspect --json sw-do sw-increment');
    expect(screen.getByText(/Exit code 0, captured 11 October 2026\./)).toBeInTheDocument();
  });

  it('shows a chapter note under the chapter it corrects', () => {
    const sections = [{start: 44.1, title: 'Connect your machines', text: 'Old setup.'}];
    const {container} = render(<GuideBody tutorial={guide('how-specwithcode-works')} transcript={sections} />);
    const note = container.querySelector('#t-44')!.parentElement!.querySelector('aside');
    expect(note).toHaveTextContent('machines join over Tailscale');
    expect(note!.querySelector('a')).toHaveAttribute('href', '/tutorials/join-a-mac/');
  });

  it('links the SpecWithCode product page from every SpecWithCode guide', () => {
    const {container} = render(<GuideBody tutorial={guide('agent-result-walkthrough')} />);
    expect(container.querySelector('ul[aria-label="About this guide"] a')).toHaveAttribute('href', '/code/');
  });

  it('states the recorded version and the current SpecWithCode release', () => {
    render(<GuideBody tutorial={agentGuide} />);
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
