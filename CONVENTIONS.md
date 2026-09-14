# Conventions

## Naming

- Components: `PascalCase.tsx` (e.g. `FreePlanCard.tsx`), one component per file.
- Hooks: `useThing.ts` in `frontend/src/hooks/`.
- Everything else (utils, types, routes, controllers): `camelCase.ts`.
- Test files sit next to what they test with a `.test.ts(x)` suffix, or
  under the nearest `test/` directory (backend convention).

## Frontend structure

- Components are flat under `frontend/src/components/` — no nested
  folders per component. Keep it that way unless a component grows a
  cluster of sub-parts that don't make sense anywhere else.
- Component styling: CSS Modules (`Name.module.css`) for layout/one-off
  styles, Tailwind utility classes for everything else. Don't introduce a
  third styling approach (styled-components, CSS-in-JS, etc.).
- Data fetching goes through TanStack Query hooks, not ad-hoc
  `useEffect` + `fetch`/`axios`. Co-locate query hooks near their feature
  or in `frontend/src/hooks/` if shared.
- Types live in `frontend/src/types/`; don't inline large shared types in
  component files.

## Backend structure

- `routes/` only wires up endpoints; request handling logic lives in
  `controllers/`. Don't put business logic directly in a route file.
- Billing logic (Stripe, entitlements, tiers) stays under
  `backend/src/billing/` — don't scatter billing checks into unrelated
  controllers.
- Config and secrets access goes through `backend/src/config/`, not
  `process.env` scattered across files.
- Stripe webhook signatures must always be verified — never skip this.
- `canvas_users` and tier/billing data: backend-only, never exposed to
  client SDKs directly.

## TypeScript

- No `any` — if a type is genuinely unknown, use `unknown` and narrow it.
- Prefer explicit return types on exported functions; internal helpers
  can rely on inference.

## Testing

- Vitest everywhere (frontend, backend). Match the existing test's
  structure/mocking style in the same directory before introducing a new
  pattern.
- Tests should assert business logic and behavior, not chase coverage
  percentage. No end-to-end/browser test suite is maintained — feature
  verification goes through `verify-cohort` instead (see CLAUDE.md).
- Mock external services (Stripe, Notion API, Firebase) at the boundary;
  don't mock internal modules.

## Git

- Small, focused commits. Don't mix unrelated changes (e.g. a billing
  fix and a styling tweak) in one commit.
