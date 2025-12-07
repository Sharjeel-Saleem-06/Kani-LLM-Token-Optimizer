# Netlify Deployment Notes

## One-time setup
1) In Netlify, create a new site and connect this repo or drag-and-drop a build folder.
2) Set env var: `NEXT_PUBLIC_OPENAI_API_KEY` (and any other secrets) in Site settings → Build & deploy → Environment.

## Build settings (already in `netlify.toml`)
- Build command: `npm run build`
- Publish directory: `.next`
- Plugin: `@netlify/plugin-nextjs`

## Deploy options
- **Connected repo (recommended):** Push to `main`; Netlify builds automatically.
- **Manual upload:** Run locally:
  ```
  npm install
  npm run build
  ```
  Then upload the repo with `netlify.toml` and `.next` output via the Netlify UI (drag-and-drop). Ensure env vars are set in Netlify before publishing.

## Notes
- Keep `.netlify/` out of git (already ignored).
- For production, avoid exposing secrets client-side; proxy LLM calls through a backend if needed.

