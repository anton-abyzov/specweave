import React from 'react';
import StudioWindowShot, { STUDIO_WINDOW, StudioWindowFullSize } from './StudioWindowShot';

/** A real SpecWithCode capture: the whole window, with the coordinator and two workers running. */
export default function StudioProjectMock({ caption = true }: { caption?: boolean }) {
  return <figure className="wv-window" style={{ margin: 'var(--wv-space-8) 0' }}>
    <div className="wv-window__bar"><span>SpecWithCode</span><span>trip-budget</span></div>
    <StudioWindowShot />
    {caption && <figcaption>Actual app capture. {STUDIO_WINDOW.caption} <StudioWindowFullSize className="wv-link" /></figcaption>}
  </figure>;
}
