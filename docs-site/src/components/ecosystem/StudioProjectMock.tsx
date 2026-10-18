import React from 'react';

/** A real SpecWithCode capture: the project coordinator starting two workers on different agents. */
export default function StudioProjectMock({ caption = true }: { caption?: boolean }) {
  return <figure className="wv-window" style={{ margin: 'var(--wv-space-8) 0' }}>
    <div className="wv-window__bar"><span>SpecWithCode</span><span>Coordinator</span></div>
    <img src="/img/studio/flow-dispatch-20261015.webp" width={1064} height={680} loading="lazy" decoding="async" alt="SpecWithCode coordinator starting two workers in parallel: Write tip.py CLI on Codex, with approval requested, and README usage for tip.py on Claude Code, working" />
    {caption && <figcaption>Actual app capture, SpecWithCode 1.0.21, 15 October 2026. The coordinator starts a Codex worker and a Claude Code worker, and reports back when both finish.</figcaption>}
  </figure>;
}
