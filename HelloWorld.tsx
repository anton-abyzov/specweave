import React, { useState, useEffect, useCallback, memo } from 'react';

interface HelloWorldProps {
  name?: string;
  animate?: boolean;
  theme?: 'light' | 'dark' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

interface ScreenSize {
  width: number;
  height: number;
  breakpoint: 'mobile' | 'tablet' | 'desktop' | 'wide';
}

const useScreenSize = (): ScreenSize => {
  const getBreakpoint = (width: number): ScreenSize['breakpoint'] => {
    if (width < 640) return 'mobile';
    if (width < 1024) return 'tablet';
    if (width < 1440) return 'desktop';
    return 'wide';
  };

  const [screenSize, setScreenSize] = useState<ScreenSize>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    breakpoint: typeof window !== 'undefined' ? getBreakpoint(window.innerWidth) : 'desktop',
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
        breakpoint: getBreakpoint(window.innerWidth),
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};

const themes = {
  light: {
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    text: '#1a1a2e',
    accent: '#4f46e5',
  },
  dark: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    text: '#f0f0f0',
    accent: '#818cf8',
  },
  gradient: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    text: '#ffffff',
    accent: '#ffd700',
  },
};

const fontSizes: Record<HelloWorldProps['size'] & string, Record<ScreenSize['breakpoint'], string>> = {
  sm: { mobile: '1.5rem', tablet: '2rem', desktop: '2.5rem', wide: '3rem' },
  md: { mobile: '2rem', tablet: '3rem', desktop: '4rem', wide: '5rem' },
  lg: { mobile: '2.5rem', tablet: '4rem', desktop: '5.5rem', wide: '7rem' },
  xl: { mobile: '3rem', tablet: '5rem', desktop: '7rem', wide: '9rem' },
};

const HelloWorld: React.FC<HelloWorldProps> = memo(({
  name = 'World',
  animate = true,
  theme = 'gradient',
  size = 'lg',
}) => {
  const { breakpoint } = useScreenSize();
  const [isVisible, setIsVisible] = useState(false);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);

  const greeting = `Hello, ${name}!`;
  const currentTheme = themes[theme];
  const fontSize = fontSizes[size][breakpoint];

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (!animate) {
      setCurrentLetterIndex(greeting.length);
      return;
    }

    if (currentLetterIndex < greeting.length) {
      const timer = setTimeout(() => {
        setCurrentLetterIndex((prev) => prev + 1);
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [currentLetterIndex, greeting.length, animate]);

  const handleRestart = useCallback(() => {
    setCurrentLetterIndex(0);
  }, []);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    background: currentTheme.background,
    padding: breakpoint === 'mobile' ? '1rem' : '2rem',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease-in-out',
    overflow: 'hidden',
  };

  const textContainerStyle: React.CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
    transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
    textAlign: 'center',
    maxWidth: '100%',
  };

  const headingStyle: React.CSSProperties = {
    fontSize,
    fontWeight: 700,
    color: currentTheme.text,
    margin: 0,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    textShadow: theme === 'gradient' ? '2px 2px 4px rgba(0,0,0,0.2)' : 'none',
    wordBreak: 'break-word',
  };

  const cursorStyle: React.CSSProperties = {
    display: 'inline-block',
    width: '3px',
    height: '1em',
    backgroundColor: currentTheme.accent,
    marginLeft: '4px',
    animation: 'blink 1s infinite',
    verticalAlign: 'text-bottom',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: breakpoint === 'mobile' ? '0.875rem' : '1rem',
    color: currentTheme.text,
    opacity: 0.7,
    marginTop: breakpoint === 'mobile' ? '1rem' : '1.5rem',
    fontFamily: 'inherit',
  };

  const buttonStyle: React.CSSProperties = {
    marginTop: '2rem',
    padding: breakpoint === 'mobile' ? '0.75rem 1.5rem' : '1rem 2rem',
    fontSize: breakpoint === 'mobile' ? '0.875rem' : '1rem',
    fontWeight: 600,
    color: theme === 'gradient' ? '#764ba2' : currentTheme.accent,
    backgroundColor: theme === 'gradient' ? '#ffffff' : 'transparent',
    border: `2px solid ${theme === 'gradient' ? '#ffffff' : currentTheme.accent}`,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  };

  const infoStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '0.75rem',
    color: currentTheme.text,
    opacity: 0.5,
    fontFamily: 'monospace',
  };

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }

          @media (prefers-reduced-motion: reduce) {
            * {
              animation: none !important;
              transition: none !important;
            }
          }
        `}
      </style>

      <div style={textContainerStyle}>
        <h1 style={headingStyle} role="heading" aria-level={1}>
          {greeting.slice(0, currentLetterIndex)}
          {animate && currentLetterIndex < greeting.length && (
            <span style={cursorStyle} aria-hidden="true" />
          )}
        </h1>

        <p style={subtitleStyle}>
          A responsive React component for all screen sizes
        </p>

        {animate && (
          <button
            style={buttonStyle}
            onClick={handleRestart}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            aria-label="Replay animation"
          >
            Replay Animation
          </button>
        )}
      </div>

      <div style={infoStyle}>
        {breakpoint} • {typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : ''}
      </div>
    </div>
  );
});

HelloWorld.displayName = 'HelloWorld';

export default HelloWorld;
