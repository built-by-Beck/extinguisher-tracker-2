# Repository Guidelines

## Project Structure & Module Organization
- App source in `src/` (React 18). Entry: `src/main.jsx`, mounted by `index.html`.
- Styles at `src/index.css` (Tailwind). Co-locate component styles next to components.
- Static assets live in `public/`; build output in `dist/` (do not edit).
- Config: `vite.config.js`, `tailwind.config.js`, `postcss.config.js`.
- Tests live beside code as `*.test.jsx` or under `src/**/__tests__/`.

## Build, Test, and Development Commands
- `npm run dev` — start Vite dev server with React Fast Refresh.
- `npm run build` — production build to `dist/`.
- `npm run preview` — serve built `dist/` for verification.
- `npm run lint` — run ESLint across `src/` (no warnings allowed).
- `npm test` — once added, run unit/component tests.

## Coding Style & Naming Conventions
- Language: React 18 with JSX, ES Modules. Indentation: 2 spaces.
- Components use `PascalCase` filenames/exports (e.g., `FloorMap.jsx`).
- Hooks/utilities use `camelCase` (e.g., `useExtinguisherFilter.js`). Prefer named exports.
- Styling with Tailwind utilities; extract reusable patterns into components.
- Linting: ESLint with `react`, `react-hooks`, `react-refresh` plugins. Fix all issues before PRs.

## Testing Guidelines
- Framework: Jest + React Testing Library.
- Naming mirrors source path: `Component.test.jsx` or `src/**/__tests__/Component.test.jsx`.
- Keep tests fast and deterministic; mock network/files.
- Aim for meaningful coverage on new logic and bug fixes.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subjects (~72 chars). Group related changes.
  - Examples: `feat(ui): highlight overdue inspections`, `fix(data): correct CSV import off-by-one`.
- PRs include summary, screenshots/GIFs for UI, reproduction steps for fixes, and link issues.
- Keep diffs focused; update docs and note user-visible changes.

## Security & Configuration Tips
- Do not commit secrets. Use `.env.local` for dev; access via `import.meta.env`.
- Validate/sanitize file inputs (e.g., XLSX via `xlsx`). Review third‑party deps.

## Architecture Overview
- Vite + React front end; Tailwind for styling; `lucide-react` for icons; `xlsx` for spreadsheet import/export.
- Keep state local to features; lift only when shared.

