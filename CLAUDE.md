# SlabDash

Card grading submission tracker for card shops. React frontend + Express backend + PostgreSQL.

## Stack
- Frontend: React 19 + Vite + Tailwind v4 | Port 5173
- Backend: Express.js + Node 18+ | Port 3001
- Database: PostgreSQL (Railway)
- Deploy: Railway (backend + DB), Vercel (frontend)

## Commands
- Dev: `cd frontend && npm run dev` / `cd backend && npm start`
- No test suite exists yet

## Key Architecture
- Backend routes: `backend/src/routes/` (23 files, 171 endpoints)
- Services: `backend/src/services/` (PSA, email, Stripe, price comps, card scanner, scheduled refresh)
- Frontend pages: `frontend/src/pages/`
- Frontend API client: `frontend/src/api/client.js` (70+ endpoints)
- Auth: JWT (HS256, 7-day), portal has separate token
- DB migrations: auto-run on startup in `backend/src/index.js`
- Design system: "Liquid Glass" theme, brand color #FF8170

## Code Style
- Backend: CommonJS (require/module.exports), Express routes
- Frontend: ES modules, functional React components, Tailwind classes
- No TypeScript
- 2-space indentation

## Important Rules
- PSA API key must be unique per company (duplicate warning enforced)
- SAM AI gated by `sam_enabled` flag on company table
- Portal customers use token-based SAM (purchase via Stripe)
- Auto-migrations on startup — no manual migration steps
- Email: Mailgun default, shops can configure custom SMTP

## Response Style
- Be concise. No preamble, no summaries unless asked.
- Don't explain what you're about to do — just do it.
- Don't list files you read — just use the information.
- Skip "Let me..." and "I'll..." phrases.
- When making changes, make them all then report what you did briefly.
