import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { COLORS, FONT, typedText } from "../constants";

const CODE_LINES = [
  { text: "// Social login — NextAuth v5 + OAuth PKCE", color: "#6b7280", delay: 0 },
  { text: "import NextAuth from 'next-auth';", color: "#a78bfa", delay: 7 },
  { text: "import Google from 'next-auth/providers/google';", color: "#a78bfa", delay: 14 },
  { text: "import GitHub from 'next-auth/providers/github';", color: "#a78bfa", delay: 21 },
  { text: "", color: "", delay: 25 },
  { text: "export const { handlers, auth, signIn } = NextAuth({", color: COLORS.text, delay: 29 },
  { text: "  providers: [", color: COLORS.text, delay: 34 },
  { text: "    Google({", color: COLORS.text, delay: 38 },
  { text: "      authorization: { params: { access_type: 'offline' } },", color: "#06b6d4", delay: 43 },
  { text: "    }),", color: COLORS.text, delay: 47 },
  { text: "    GitHub({", color: COLORS.text, delay: 51 },
  { text: "      clientId: process.env.AUTH_GITHUB_ID!,", color: "#06b6d4", delay: 55 },
  { text: "      clientSecret: process.env.AUTH_GITHUB_SECRET!,", color: "#06b6d4", delay: 60 },
  { text: "    }),", color: COLORS.text, delay: 64 },
  { text: "  ],", color: COLORS.text, delay: 68 },
  { text: "});", color: COLORS.text, delay: 72 },
];

const QUALITY_CHECKS = [
  { label: "53 tests passing", icon: "✓", color: COLORS.green, delay: 60 },
  { label: "0 security vulnerabilities", icon: "✓", color: COLORS.green, delay: 75 },
  { label: "OWASP Top 10 verified", icon: "✓", color: COLORS.green, delay: 90 },
  { label: "Docs updated", icon: "✓", color: COLORS.green, delay: 105 },
  { label: "Acceptance criteria met", icon: "✓", color: COLORS.green, delay: 118 },
];

function CodeWindow({ frame, fps }: { frame: number; fps: number }) {
  const slideIn = spring({ frame: frame - 5, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        opacity: slideIn,
        transform: `translateX(${interpolate(slideIn, [0, 1], [-40, 0])}px)`,
        background: COLORS.bgTerminal,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
        flex: 1,
      }}
    >
      {/* Titlebar */}
      <div
        style={{
          background: "#161b22",
          padding: "16px 22px",
          borderBottom: `1px solid ${COLORS.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#28c840" }} />
        <span style={{ color: COLORS.textMuted, fontFamily: FONT.mono, fontSize: 18, fontWeight: 500, marginLeft: 14 }}>
          src/auth.ts
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <div style={{ background: "rgba(124,58,237,0.3)", borderRadius: 6, padding: "4px 12px" }}>
            <span style={{ color: COLORS.purpleLight, fontFamily: FONT.mono, fontSize: 15, fontWeight: 700 }}>TypeScript</span>
          </div>
        </div>
      </div>
      {/* Code */}
      <div style={{ padding: "26px 32px", fontFamily: FONT.mono, fontSize: 24, lineHeight: 1.65 }}>
        {CODE_LINES.map((line, i) => {
          const localFrame = frame - line.delay;
          if (localFrame < 0) return null;
          if (line.text === "") return <div key={i} style={{ height: 32 }} />;

          const progress = interpolate(localFrame, [0, 14], [0, 1], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.quad),
          });
          const text = typedText(line.text, progress);

          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <span style={{ color: COLORS.textDim, fontSize: 18, fontWeight: 500, minWidth: 32, textAlign: "right", userSelect: "none" }}>
                {i + 1}
              </span>
              <span style={{ color: line.color || COLORS.text, fontWeight: 500 }}>
                {text}
                {progress > 0 && progress < 1 && (
                  <span style={{ color: COLORS.purple, animation: "none", opacity: 0.8 }}>█</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QualityPanel({ frame, fps }: { frame: number; fps: number }) {
  const slideIn = spring({ frame: frame - 10, fps, config: { damping: 200 } });

  const allDone = frame >= QUALITY_CHECKS[QUALITY_CHECKS.length - 1].delay + 20;

  return (
    <div
      style={{
        width: 520,
        opacity: slideIn,
        transform: `translateX(${interpolate(slideIn, [0, 1], [40, 0])}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div>
        <h3
          style={{
            fontFamily: FONT.sans,
            fontSize: 30,
            fontWeight: 800,
            color: COLORS.textMuted,
            margin: 0,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          Quality Gates
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {QUALITY_CHECKS.map((check, i) => {
            const localFrame = frame - check.delay;
            if (localFrame < 0) {
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    background: COLORS.bgCard,
                    border: `1.5px solid ${COLORS.border}`,
                    borderRadius: 14,
                    padding: "18px 22px",
                    opacity: 0.3,
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${COLORS.border}` }} />
                  <span style={{ color: COLORS.textMuted, fontFamily: FONT.sans, fontSize: 22, fontWeight: 500 }}>
                    {check.label}
                  </span>
                </div>
              );
            }

            const progress = spring({
              frame: localFrame,
              fps,
              config: { damping: 20, stiffness: 200 },
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  background: `rgba(34,197,94,${0.06 * progress})`,
                  border: `1.5px solid rgba(34,197,94,${0.3 * progress})`,
                  borderRadius: 14,
                  padding: "18px 22px",
                  opacity: 0.4 + 0.6 * progress,
                  transform: `scale(${interpolate(progress, [0, 1], [0.95, 1])})`,
                  boxShadow: progress > 0.5 ? `0 0 20px rgba(34,197,94,${0.1 * progress})` : "none",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: `rgba(34,197,94,${progress})`,
                    border: `2px solid ${COLORS.green}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    color: "#000",
                    fontWeight: 900,
                    transform: `scale(${interpolate(progress, [0, 0.5, 1], [0.3, 1.2, 1])})`,
                  }}
                >
                  {progress > 0.5 ? "✓" : ""}
                </div>
                <span
                  style={{
                    color: progress > 0.5 ? COLORS.text : COLORS.textMuted,
                    fontFamily: FONT.sans,
                    fontSize: 22,
                    fontWeight: progress > 0.5 ? 700 : 500,
                  }}
                >
                  {check.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SHIP IT badge */}
      {allDone && (
        <div
          style={{
            opacity: interpolate(frame, [QUALITY_CHECKS[4].delay + 20, QUALITY_CHECKS[4].delay + 35], [0, 1], { extrapolateRight: "clamp" }),
            transform: `scale(${spring({
              frame: frame - (QUALITY_CHECKS[4].delay + 20),
              fps,
              config: { damping: 15, stiffness: 120 },
            })})`,
            background: "linear-gradient(135deg, #16a34a, #22c55e)",
            borderRadius: 18,
            padding: "24px 36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            boxShadow: "0 20px 40px rgba(34,197,94,0.3)",
          }}
        >
          <span style={{ fontSize: 38 }}>🚀</span>
          <span
            style={{
              color: "#000",
              fontFamily: FONT.sans,
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            READY TO SHIP
          </span>
        </div>
      )}
    </div>
  );
}

export function Scene4Building() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const headerIn = spring({ frame: frame - 5, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 20% 50%, rgba(34,197,94,0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.08) 0%, transparent 50%),
          ${COLORS.bg}`,
        opacity: bgOpacity,
      }}
    >
      {/* Centered header */}
      <div
        style={{
          position: "absolute",
          top: 46,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: headerIn,
          transform: `translateY(${interpolate(headerIn, [0, 1], [-20, 0])}px)`,
        }}
      >
        <h2
          style={{
            fontFamily: FONT.sans,
            fontSize: 60,
            fontWeight: 800,
            color: COLORS.text,
            margin: 0,
            letterSpacing: "-0.03em",
            textAlign: "center",
          }}
        >
          Quality built in,{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #22c55e, #06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            every step
          </span>
        </h2>
      </div>

      {/* Content — centered two columns */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          paddingTop: 140,
          paddingBottom: 50,
          paddingLeft: 70,
          paddingRight: 70,
          display: "flex",
          gap: 40,
          alignItems: "stretch",
        }}
      >
        <CodeWindow frame={frame} fps={fps} />
        <QualityPanel frame={frame} fps={fps} />
      </div>
    </AbsoluteFill>
  );
}
