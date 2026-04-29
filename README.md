# ExamStrike - Live Exam Platform

ExamStrike is organized as a small monorepo with two Vite frontends and one Node/Express/Socket.IO backend.

```text
examstrike/
  frontend/
    user/      # React + Vite + TypeScript candidate app
    admin/     # React + Vite admin app
  backend/     # Express API + Socket.IO server
  .env.example
  .gitignore
  README.md
```

## Structure

User frontend:

```text
frontend/user/src/
  components/  # shared UI components
  hooks/       # React hooks
  lib/         # auth, firebase, runtime config, utilities
  routes/      # TanStack Router route files
  services/    # API, socket, exam session clients
```

Admin frontend:

```text
frontend/admin/src/
  components/
  lib/
  pages/
  services/
```

Backend:

```text
backend/src/
  config/       # environment parsing
  controllers/  # request handlers
  models/       # mongoose models
  routes/       # express route definitions
  services/     # business logic and schedulers
  shared/       # middleware, errors, redis, utilities
  sockets/      # Socket.IO handlers
  validations/  # Joi schemas
```

Removed cleanup items:

- Top-level duplicate `User-Frontend/` and `Admin-Frontend/` stubs.
- Root `vercel.json`, which conflicted with deploying `frontend/user` as the Vercel root.
- Cloudflare/TanStack Start deployment artifacts: `frontend/user/wrangler.jsonc`, tracked `.tanstack` temp file, and `.wrangler`.
- Empty or unsafe old scripts: `checkDB.js`, `fixAdmin.js`, `seedQuestions.js`.

## User Frontend Deployment

Vercel project settings:

- Root Directory: `frontend/user`
- Build Command: `npm run build`
- Output Directory: `dist`

`frontend/user/vercel.json` contains the SPA fallback:

```json
{
  "routes": [
    { "src": "/(.*)", "dest": "/" }
  ]
}
```

This prevents direct visits like `/lobby`, `/exam`, `/profile`, and `/leaderboard` from returning Vercel 404s. Vercel serves the app shell and TanStack Router handles the route in the browser.

## Admin Frontend Deployment

Deploy the admin app as a separate Vercel project:

- Root Directory: `frontend/admin`
- Build Command: `npm run build`
- Output Directory: `dist`

`frontend/admin/vercel.json` uses the same SPA fallback pattern so direct admin routes such as `/questions` and `/exams` also survive refreshes.

## Environment Variables

Frontend projects:

```env
VITE_API_URL=https://your-backend-domain.com/api
VITE_SOCKET_URL=https://your-backend-domain.com
```

Backend:

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=replace_with_a_long_random_secret
FRONTEND_URL=https://your-user-frontend.vercel.app
ADMIN_FRONTEND_URL=https://your-admin-frontend.vercel.app
CORS_ORIGIN=https://your-user-frontend.vercel.app,https://your-admin-frontend.vercel.app
```

The backend accepts `FRONTEND_URL`, `ADMIN_FRONTEND_URL`, and `CORS_ORIGIN`; all are folded into the allowed CORS and Socket.IO origins.

## Local Commands

```bash
npm install
npm run dev:user
npm run dev:admin
npm run dev:backend
npm run build:user
npm run build:admin
```

## Deploy Flow

```bash
git add .
git commit -m "Prepare ExamStrike deployment structure"
git push
```

Vercel will auto-deploy the connected project after the push.

## Debug Checklist

- `frontend/user/dist/index.html` exists after `npm run build`.
- Vercel user project root is exactly `frontend/user`.
- Vercel user output directory is exactly `dist`.
- Direct URLs such as `/lobby`, `/exam`, and `/leaderboard` load the React app.
- Browser console has no asset 404s or API CORS errors.
- `VITE_API_URL` ends with `/api`.
- `VITE_SOCKET_URL` is the backend origin without `/api`.
- Backend `FRONTEND_URL` and `ADMIN_FRONTEND_URL` match the deployed Vercel domains.
- Backend `/health` returns `{ "success": true, "status": "ok" }`.
