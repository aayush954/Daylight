# Daylight ☀️ — AI Productivity Workspace

Daylight is a clean, customizable productivity workspace for daily planning, task management, activity journaling, progress tracking, and AI-assisted decisions.

## Features
- Email/password authentication with hashed passwords and signed sessions
- Personal tasks with deadlines, categories, priorities, completion status, and recurrence labels
- Daily activity journal with duration and notes
- Progress metrics based on saved tasks and activities
- AI productivity coach with optional web research and source links
- Appearance preferences: light/dark theme, accent color, font family, and font size
- Responsive layout for desktop and mobile
- Per-user data isolation, API rate limits, security headers, input limits, and account deletion

## Technology
- React + Vite frontend
- Node.js + Express API
- MongoDB Atlas + Mongoose
- JWT + bcryptjs authentication
- OpenAI API and optional Tavily Search API

## Local development
Use Node.js 20 or newer.

1. Create a MongoDB Atlas database and database user.
2. In `backend/`, copy `.env.example` to `.env`, then set `MONGODB_URI` and a random `JWT_SECRET` (32+ characters).
3. Run `cd backend && npm install && npm run dev`.
4. In another terminal, run `cd frontend && npm install`.
5. Create `frontend/.env` with `VITE_API_URL=http://localhost:5000/api`.
6. Run `npm run dev` in `frontend/` and open the URL printed by Vite.

## Deploy on Render
Create a Node web service from this repository:
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and optional `TAVILY_API_KEY`
- Set `CLIENT_ORIGIN` to your deployed Vercel URL (comma-separated trusted origins are supported).
- Health check path: `/api/health`

## Deploy on Vercel
Import this repository:
- Root directory: `frontend`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`

## Security and launch notes
Never commit real secrets or put private API keys in Vite variables. Configure MongoDB Atlas network access so the Render service can connect. The AI coach works only after an OpenAI key is configured; web search additionally requires Tavily. Test registration, authorization, mobile layouts, account deletion, and rate limits before announcing the site publicly.
