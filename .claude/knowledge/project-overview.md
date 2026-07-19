# Project overview

Client-side web app that teaches Syncthing `.stignore` evaluation by visualizing it:
SVG folder tree + live rule editor + plain-English explanations + playback timeline.
Doubles as a TypeScript reference implementation of Syncthing's ignore matcher.

- Stack: HTML/CSS/TypeScript, SVG rendering, Vite build, Vitest tests. Zero runtime deps.
- Original brief: `prompt.md` (note: its example rule order was deliberately corrected,
  see DECISIONS.md ADR-002).
- Core invariant: **first matching rule wins** (Syncthing), never gitignore last-match.
- Entry points for reading: CLAUDE.md → docs/Architecture.md → docs/Matcher.md.
