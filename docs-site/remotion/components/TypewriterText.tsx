/**
 * Text that types character by character with a blinking cursor.
 */
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {INTER} from '../lib/fonts';

type TypewriterTextProps = {
  text: string;
  startFrame: number;
  charSpeed?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
};

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  startFrame,
  charSpeed = 1.5,
  fontSize = 54,
  color = '#ffffff',
  fontWeight = 700,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  if (localFrame < 0) return null;

  const charsTyped = Math.min(
    Math.floor(localFrame / charSpeed),
    text.length,
  );
  const visibleText = text.slice(0, charsTyped);
  const showCursor = charsTyped < text.length;
  const cursorBlink = Math.floor(frame / 16) % 2 === 0;

  return (
    <div
      style={{
        fontFamily: INTER,
        fontSize,
        fontWeight,
        color,
        lineHeight: 1.4,
      }}
    >
      {visibleText}
      {showCursor && cursorBlink && (
        <span style={{opacity: 0.8}}>|</span>
      )}
    </div>
  );
};
