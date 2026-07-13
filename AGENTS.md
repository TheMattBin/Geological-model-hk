# Repository Guidelines

## Project Structure & Module Organization

This is a React 18 + Vite application for interactive Hong Kong geological volume visualization. Application code is in `src/`: `App/` contains the main shell, `components/` contains UI panels and controls, and `three/` contains the TypeScript volume renderer, shaders, data loader, and shared types. `src/config.js` holds visualization configuration, `src/UIContext.jsx` holds shared UI state, and `src/main.jsx` is the entry point. Static voxel data and metadata belong in `public/data/`; images and other static resources are in `public/assets/`. Use `scripts/convert_netcdf.py` for NetCDF-to-raw data conversion.

## Build, Test, and Development Commands

- `npm ci` — install the lockfile-pinned dependencies (use this in CI).
- `npm run dev` — start the Vite development server at `http://localhost:3000`.
- `npm run build` — create the production bundle in `dist/`; this is the primary CI validation.
- `npm test` — run the Node-based renderer quality policy tests.
- `npm run preview` — serve the production bundle locally for a final check.
- `npm run convert-sample` — generate sample voxel files under `public/data/`.
- `python scripts/convert_netcdf.py <file.nc> --output-dir ./public/data` — convert a custom NetCDF dataset.

The automated test coverage currently focuses on pure renderer-quality policy logic; for UI or GPU shader changes, also run the build and manually exercise the affected visualization path in the browser.

## Coding Style & Naming Conventions

Use two spaces, semicolons, single quotes, and a 120-column print width, matching `.prettierrc.json`; do not use tabs. Name React component directories and component files in PascalCase (for example, `VisualizationPanel/VisualizationPanel.jsx`), utility files in camelCase, and TypeScript types in `src/three/types.ts`. Keep component styles in adjacent `*.module.css` files and prefer the existing `@` and `@three` aliases.

## Testing Guidelines

No coverage threshold is configured. Run `npm test` and `npm run build`; when changing `public/data/`, also confirm metadata dimensions, variable filenames, and browser loading behavior.

## Commit & Pull Request Guidelines

Use short imperative commits with a conventional prefix and optional scope, such as `feat(volume-rendering): add ...`, `fix(ui): ...`, `docs: ...`, or `chore: ...`. Pull requests should explain the user-visible change, link the relevant issue (create one first for major changes), include screenshots or a brief recording for visual changes, and report validation performed. Keep generated `dist/` output and secrets out of commits.

## Security & Configuration Tips

Do not commit credentials or private datasets. Review `src/config.js` when changing variables, paths, or rendering defaults, and run `npm audit --audit-level moderate` when dependency changes are proposed.
