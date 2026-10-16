# Daylight frontend

A React + Vite interface for the Daylight productivity workspace.

## Structure
- `src/main.jsx`: application entry point.
- `src/App.jsx`: page state, API calls, forms, and page components. Keep feature components small and named for easy debugging.
- `src/styles.css`: design tokens, responsive layout, and light/dark theme styles.
- `.env.example`: documents the public API base URL.

## Run locally
```bash
npm install
cp .env.example .env
npm run dev
```
Set `VITE_API_URL=http://localhost:5000/api` in `.env`.

## Build
```bash
npm run build
npm run preview
```

## Vercel
Set the project root to `frontend`, framework to Vite, output directory to `dist`, and production environment variable `VITE_API_URL` to your Render API URL ending in `/api`.

Only public configuration belongs in `VITE_*` variables. Never put API secrets in the frontend.
