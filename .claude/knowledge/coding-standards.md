# Coding standards

- TypeScript strict, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`. `npm run build` type-checks first — keep it green.
- Engine modules must not import DOM types; UI-only modules are listed in the coverage
  exclude in `vite.config.ts` — update that list when adding UI files.
- Data models immutable (`readonly`, new objects over mutation); localized mutable state
  inside UI classes is fine (e.g. renderer's expanded set).
- No runtime dependencies; dev-deps limited to vite/vitest/typescript.
- Small focused files (<400 lines), small functions; JSDoc headers explain the module's
  job; inline comments only for non-obvious semantics, ideally citing the Syncthing
  behavior they mirror.
- Naming: camelCase functions/vars, PascalCase types/classes, UPPER_SNAKE constants,
  is/has prefixes for booleans.
- HTML/CSS: semantic elements, ARIA labels on interactive things, focus-visible styles,
  `prefers-reduced-motion` respected. CSS uses design tokens from base.css — no raw hex in
  component styles.
- Because of `exactOptionalPropertyTypes`, optional fields are set via conditional spread
  (`...(err ? { error: err } : {})`) — keep that pattern.
