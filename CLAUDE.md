# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

```bash
# Development
pnpm dev                    # Start all apps (via turbo-run)
pnpm dev:antd               # Start specific app (also: dev:ele, dev:naive, dev:tdesign)
pnpm -F @vben/web-antd run dev   # Equivalent to dev:antd

# Building
pnpm build                  # Build all apps
pnpm build:antd             # Build a specific app
pnpm build:analyze          # Build with bundle analysis

# Testing
pnpm test:unit              # Run all unit tests (Vitest, happy-dom environment)
pnpm test:e2e               # Run e2e tests (Playwright)
```

The project requires Node `^22.18.0 || ^24.0.0` and pnpm `>=11.0.0`. Use `corepack enable` if pnpm isn't available.

## Architecture Overview

This is a **pnpm monorepo** (v5.7) for Vue Vben Admin, a middle/back-end admin template. It supports **four UI libraries** (Ant Design Vue, Element Plus, Naive UI, TDesign) from a single shared codebase using an **adapter pattern**.

### Layer Model (bottom-up)

1. **`packages/@core/base/`** — Framework-agnostic primitives: `shared` (utils, color, cache, global-state, TanStack store wrapper), `design` (CSS/tailwind design tokens), `icons` (icon components), `typings` (shared TS types)

2. **`packages/@core/ui-kit/`** — Generic UI components not tied to any specific UI library: `shadcn-ui`, `form-ui`, `layout-ui`, `menu-ui`, `popup-ui`, `tabs-ui`. These render via the component adapter.

3. **`packages/@core/composables/`** — Vue composables shared across apps.

4. **`packages/effects/`** — Application-layer modules: `layouts` (auth layout, basic layout, iframe), `access` (permission directives + route generation), `request` (HTTP client), `common-ui` (business UI components), `hooks` (VueUse-style composables), `plugins` (Motion plugin, etc.)

5. **`packages/`** (root-level) — Shared state and config: `stores` (Pinia stores for auth, user, access), `preferences` (app preferences with persistence), `locales` (i18n), `utils` (routing helpers, etc.), `constants`, `styles`, `types`

6. **`apps/`** — Each app (`web-antd`, `web-ele`, `web-naive`, `web-tdesign`) is thin: mostly just adapter wiring + route definitions + page views. They import shared logic from `@vben/*` packages.

7. **`internal/`** — Build tooling: `vite-config` (shared Vite config), `node-utils`, `lint-configs/` (eslint, oxlint, oxfmt, stylelint, commitlint presets), `tailwind-config`

### Adapter Pattern

Each app has `src/adapter/component/index.ts` that maps generic component types (`Input`, `Select`, `DatePicker`, etc.) to the concrete UI library's components. These mappings are registered into `globalShareState` from `@vben-core/shared`. The `@vben-core/ui-kit` packages then render through this registry, enabling the same form/layout/menu code to work across all four UI libraries.

The adapter also provides `withDefaultPlaceholder()` HOC for i18n-aware placeholders and `withPreviewUpload()` for file upload with crop/preview/drag-sort support.

### Routing & Permissions

- Core routes (login, 404) are static and skip the access guard.
- Dynamic routes live in `src/router/routes/modules/**/*.ts` and are glob-imported.
- Route access is **backend-driven**: `generateAccess()` fetches menus from the API, then `@vben/access` generates accessible routes based on user roles. The guard in `router/guard.ts` orchestrates: check token → fetch user info → generate dynamic routes → merge into router.

### State Management

Pinia stores in `packages/stores/` (auth, user, access) and app-local stores in `apps/web-antd/src/store/`. The `@vben-core/shared` package wraps TanStack Store as an alternative reactive store. Preferences (`packages/preferences/`) persist to localStorage via `pinia-plugin-persistedstate`.

### Linting & Formatting

Uses **oxlint** for linting and **oxfmt** for formatting (not ESLint Prettier). ESLint via `@vben/eslint-config` handles Vue-specific rules. Lefthook runs lint + typecheck on pre-commit and commitlint on commit-msg.

```bash
pnpm lint       # oxlint + oxfmt check
pnpm format     # oxlint fix + oxfmt write
pnpm check:type # typecheck all packages (vue-tsc)
```

### Conventional Commits

Uses Angular convention: `feat`, `fix`, `style`, `perf`, `refactor`, `revert`, `test`, `docs`, `chore`, `ci`, `types`. Use `pnpm commit` to launch the interactive commit prompt (`czg`).

## Key Import Aliases

In app code (`apps/*`), `#/` maps to `src/` (configured via `imports` in each app's `package.json`). For example, `import { $t } from '#/locales'` resolves to `apps/web-antd/src/locales`.

Internal packages use `workspace:*` protocol. Dependencies use `catalog:` protocol defined in `pnpm-workspace.yaml`.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues at `Remous07/educial-vben-admin`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default role labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` at repo root, ADRs in `docs/adr/`. See `docs/agents/domain.md`.
