/**
 * Reusable terminal window with typing animation and blinking cursor.
 * Ported from vskill-platform, adapted to SpecWeave brand theme.
 */
import React from 'react';
import {useCurrentFrame, interpolate} from 'remotion';
import {COLORS} from '../lib/theme';
import {JETBRAINS_MONO, INTER} from '../lib/fonts';

type TerminalLine = {
  text: string;
  color?: string;
  delay?: number;
  typed?: boolean;
  prefix?: string;
};

type TerminalFrameProps = {
  lines: TerminalLine[];
  charSpeed?: number;
  title?: string;
  width?: number;
};

const DOT_SIZE = 14;
const CURSOR_BLINK_FRAMES = 16;

const TerminalDots: React.FC = () => (
  <div style={{display: 'flex', gap: 8}}>
    {[COLORS.dotRed, COLORS.dotYellow, COLORS.dotGreen].map((c) => (
      <div
        key={c}
        style={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: '50%',
          backgroundColor: c,
        }}
      />
    ))}
  </div>
);

const BlinkingCursor: React.FC<{frame: number}> = ({frame}) => {
  const opacity = interpolate(
    frame % CURSOR_BLINK_FRAMES,
    [0, CURSOR_BLINK_FRAMES / 2, CURSOR_BLINK_FRAMES],
    [1, 0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  return (
    <span style={{color: COLORS.terminalCursor, opacity, fontWeight: 700}}>
      {'\u2588'}
    </span>
  );
};

export const TerminalFrame: React.FC<TerminalFrameProps> = ({
  lines,
  charSpeed = 2,
  title = 'Terminal',
  width = 1560,
}) => {
  const frame = useCurrentFrame();

  let currentOffset = 0;
  const lineStates = lines.map((line, i) => {
    const delay = line.delay ?? (i === 0 ? 0 : 10);
    const startFrame = currentOffset + delay;
    const isTyped = line.typed ?? i === 0;
    const typingDuration = isTyped ? line.text.length * charSpeed : 0;
    currentOffset = startFrame + typingDuration;

    const localFrame = frame - startFrame;
    let visibleText = '';
    let showCursor = false;

    if (localFrame < 0) {
      visibleText = '';
    } else if (isTyped) {
      const charsTyped = Math.floor(localFrame / charSpeed);
      visibleText =
        charsTyped >= line.text.length
          ? line.text
          : line.text.slice(0, charsTyped);
      showCursor = charsTyped < line.text.length;
    } else {
      visibleText = line.text;
    }

    return {...line, visibleText, showCursor, startFrame};
  });

  return (
    <div
      style={{
        width,
        backgroundColor: COLORS.bgTerminal,
        borderRadius: 16,
        border: `1px solid ${COLORS.terminalBorder}`,
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 24px',
          backgroundColor: COLORS.bgElevated,
          borderBottom: `1px solid ${COLORS.terminalBorder}`,
        }}
      >
        <TerminalDots />
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            color: COLORS.textMuted,
            fontSize: 20,
            fontFamily: INTER,
          }}
        >
          {title}
        </div>
        <div style={{width: DOT_SIZE * 3 + 16}} />
      </div>
      <div
        style={{
          padding: '32px 36px',
          fontFamily: JETBRAINS_MONO,
          fontSize: 28,
          lineHeight: 1.7,
          minHeight: 200,
        }}
      >
        {lineStates.map((line, i) => {
          if (frame < line.startFrame) return null;
          const prefix = line.prefix ?? (i === 0 ? '> ' : '  ');
          return (
            <div key={i} style={{display: 'flex'}}>
              <span style={{color: COLORS.terminalPrompt}}>{prefix}</span>
              <span style={{color: line.color ?? COLORS.textPrimary}}>
                {line.visibleText}
              </span>
              {line.showCursor && <BlinkingCursor frame={frame} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
