# Daylight API

Express API for authentication, tasks, activity journal, preferences, and the AI coach.

## Structure
- `server.js`: API routes, input checks, auth middleware, and startup.
- `package.json`: dependencies and scripts.
- `.env.example`: environment variable reference.

## Run locally
```bash
npm install
cp .env.example .env
npm run dev
```
Configure `MONGODB_URI` and a random `JWT_SECRET` of at least 32 characters before starting. The health endpoint is `GET /api/health`.

## Deployment variables
- `NODE_ENV=production`
- `MONGODB_URI`: Atlas connection string
- `JWT_SECRET`: unique random secret, 32+ characters
- `CLIENT_ORIGIN`: comma-separated trusted frontend origins
- `OPENAI_API_KEY`: optional until AI is enabled
- `OPENAI_MODEL`: defaults to `gpt-4.1-mini`
- `TAVILY_API_KEY`: optional; required for live web search

## Security
Passwords are hashed with bcrypt. Authenticated routes scope data queries to the signed-in user's ID. API requests have rate limits and security headers. Do not commit real secrets. Review auth, CORS, database access, and account deletion before public launch.
