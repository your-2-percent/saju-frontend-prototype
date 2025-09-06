# Project Reorganized

- All source files have been moved under `src/` while preserving their *relative* paths.
- No file contents were modified.
- Your original `main.tsx` still imports `./main.css` and `./views/Page` correctly because both are now under `src/`.

## What changed
- BEFORE: files and folders lived at project root (`components/`, `views/`, `domain/`, `main.tsx`, `main.css`, ...)
- AFTER: the same structure lives under `src/`:
  - `src/components/`, `src/views/`, `src/domain/`, `src/main.tsx`, `src/main.css`, ...

## Import paths
Because the *relative* relationships are preserved, your existing relative imports should continue to work.
If you used absolute aliases (e.g., `@/domain/...`), make sure your bundler/tsconfig resolves `@` to `src`.

## File move map
See `path-map.json` for an exact old→new mapping.
