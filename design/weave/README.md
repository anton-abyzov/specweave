# Weave design system

Shared by spec-weave.com (including /code) and verified-skill.com. `tokens.json` is the source of truth; `weave.css` is generated from it (tokens for light and dark plus the component classes) and copied unchanged into each site: `docs-site/src/css/weave.css` here and `src/app/weave.css` in vskill-platform. Change a token here, regenerate, copy to both.

Weave is the one design system for the three products: **SpecWeave** (the open-source CLI and spec-weave.com), **SpecWithCode** (the desktop workspace, spec-weave.com/code) and **Verified Skill** (the skill registry, verified-skill.com). A visitor moving between them should feel they never left the same company.

The idea comes from the name. Work in these products is a set of threads: a spec, the agents working it, the record left in git. The visual system is a quiet, cool page with one iris thread running through it, connecting the things that matter.

## Principles

1. **Show the real thing.** Use real screenshots of the apps, real commands, real scan results and real file names. No AI-generated scenes, stock people, glowing networks or fake UIs. When there is nothing real to show, draw a plain diagram with the Thread flow component.
2. **Iris is a thread, not a wash.** `wv-iris` appears in small, meaningful places: the primary button, links, the focus ring, the current step, the thread line. Never as a background gradient, never on more than about 5% of a screen.
3. **Evidence before adjectives.** Lead with what a thing does and what proves it (a passed check, a command, a number with its source). Cut claims that cannot be checked.
4. **One family, one voice.** Every page uses the same tokens, type, components and copy rules. Products differ by their name and their content, not by their colors.
5. **Calm by default, motion that explains.** A scroll sequence earns its place when it shows structure, layers or connections: the handoff between agents, a coordinator starting workers, a skill passing its checks. A page may have more than one when each explains something different. Nothing moves for decoration.

## Content fundamentals

- Write in plain, active sentences from the reader's side: "Install the skill", "Hand off to Codex", "See the scan".
- Sentence case everywhere: headings, buttons, navigation. No uppercase labels, no tracked-out eyebrows above headings.
- Address the reader as "you". Speak as "we" only on company pages.
- Name things by what people know: "usage limit", not "quota exhaustion"; "handoff", not "context transfer protocol".
- Buttons say exactly what happens and keep that name through the flow: "Download for Mac" leads to a download; "Install skill" shows the install command.
- No emoji, no exclamation marks, no arrows appended to links, no "A · B · C" meta strings in headings.
- Numbers carry their source and date: "390,600 GitHub stars, Oct 2026", not "huge community".

Real examples to copy the tone from:

> When Claude Code hits its limit, Codex picks up the same task from the ledger.

> Every verified skill shows its source, its security scan and, when one exists, its evaluation.

## Color

- Page ground is `wv-canvas` in both themes. Real objects (a window frame, a menu) sit on `wv-panel`. Code and commands sit in `wv-sunken`.
- Text is `wv-ink`; secondary text is `wv-muted`. Both pass 5:1 on every surface in both themes.
- Hairlines use `wv-line`. Controls that must be seen (inputs, secondary buttons) use `wv-control`, which passes 3:1.
- `wv-iris` is the only accent. Fill the primary button with it and put `wv-on-iris` text on top. Hover goes to `wv-iris-strong`. Highlight a current row or the active product with `wv-iris-tint`.
- Status is semantic and separate from the accent: `wv-pass`, `wv-warn`, `wv-fail` on their `-tint` grounds, always with a word, and the fail chip also changes shape. Never tell pass from fail by hue alone.
- `wv-brand-tile` belongs to the SpecWithCode app icon. Do not use it in UI.
- Dark theme is designed, not inverted: a deep violet-black ground, a lighter iris with dark text on fills.

## Type

- One family for everything you read: Schibsted Grotesk, loaded from Google Fonts at weights 400, 500, 600 and 700. Its slightly condensed, newsy shapes keep headlines tight and body text sturdy at small sizes.
- JetBrains Mono only for real code: commands, file names, paths, ids. Never for navigation, labels, headings or decoration.
- Scale: `wv-display` 72 (44 on phones) for the single hero line, `wv-h1` 48, `wv-h2` 32, `wv-h3` 21, `wv-lead` 21, `wv-body` 17, `wv-ui` 15, `wv-caption` 13, `wv-code` 14.
- Headlines are left aligned, set tight (negative tracking as in the tokens) with `text-wrap: balance`. Do not color or italicize one word of a headline for emphasis.
- Keep running text within `wv-measure`.

## Layout and spacing

- A 12-column grid up to `wv-page-max`, with `wv-space-8` gutters on desktop and `wv-space-4` on phones. Content is left aligned; center only a short final call to action.
- Sections are separated by space (`wv-space-24` desktop, `wv-space-16` phone), not by boxes or colored bands. A hairline `wv-line` may close a long section.
- Pages open with the hero sized to its content. No `100vh` heroes.
- Do not chop content into rows of identical cards. Use lists with hairlines, a table, or one strong object (a screenshot, a command, a flow).

## Radii, borders and shadows

- Radius follows the size of the object: `wv-radius-xs` for chips and inline code, `wv-radius-sm` for buttons and inputs, `wv-radius-md` for code blocks and notes, `wv-radius-lg` for window frames. Nothing else is rounded.
- Borders are 1px `wv-line`. No colored left-border accents on boxes.
- Only two shadows exist: `wv-shadow-window` on a screenshot frame and `wv-shadow-overlay` on menus. No glows, no shadows on cards or buttons.

## Imagery

- First choice: a real screenshot in the Window frame component, captured from a clean, private instance with sample data (never a personal account or private repos).
- Second choice: a diagram built from Thread flow, Status chip and Evidence list, styled by the tokens.
- Third choice, and only for social cards or a single atmospheric background: a generated image in the system's palette (canvas neutrals with one iris thread), abstract, with no people, no fake screens and no text in the image.
- Product logos of agents (Claude Code, Codex, Cursor) appear only as small monochrome marks in `wv-muted`, never as giant tiles.

## Motion

- UI transitions are 120 ms ease on color and border only.
- Scroll sequences are allowed wherever they explain structure, layers or connections: the thread line drawing from one step to the next, layers of a system arriving at different rates, a record filling in as the reader moves down. A page may carry more than one when each explains something different. If the sequence could be removed without the reader losing an idea, remove it.
- Build them with CSS scroll-driven animations (`animation-timeline: view()` or a named `view-timeline`) inside `@supports (animation-timeline: view())` and `@media (prefers-reduced-motion: no-preference)`. Reach for the `motion` package only when a sequence cannot be expressed in CSS, and keep the same rules.
- The resting state is the final state. Without scroll-timeline support, with reduced motion, without JavaScript and in a screenshot, the reader sees the complete picture: every step, every layer, the whole thread.
- Animate `opacity`, `transform` and the thread's stroke only. Never move text the reader is trying to read, never hide content until a scroll position, never scroll-jack.
- No decorative fade-ups, no fade-up on every section, no marquees, no parallax backgrounds, no hover tilt.

## Iconography

- Lucide icons at 1.5 stroke, 16px in UI and 20px in notes, colored with `currentColor` (usually `wv-muted` or `wv-iris`).
- No emoji, no Unicode glyphs as icons.

## Logos

- SpecWithCode has a mark: the white spec page with a `>_` prompt on the `wv-brand-tile` indigo tile (see Assets, Logos). Use the shipped files; never redraw it.
- SpecWeave and Verified Skill have no mark yet. Set their names as wordmarks in Schibsted Grotesk 700 at `wv-h3` size, in `wv-ink`.

## Products in the system

| Product | Site | What it is, in one line |
| --- | --- | --- |
| SpecWeave | spec-weave.com | Plans work as a spec, records every task in git, and lets any agent pick up where another stopped. |
| SpecWithCode | spec-weave.com/code | A desktop workspace that runs Claude Code, Codex, Cursor, Grok Build, Gemini CLI, GitHub Copilot, OpenCode, Muse Code, Pi and other ACP agents on your own machines and subscriptions. |
| Verified Skill | verified-skill.com | A registry of agent skills, each with its source and security scan shown, and its evaluation when one exists. |

Every site starts with the Family bar so a visitor can move between the three.
