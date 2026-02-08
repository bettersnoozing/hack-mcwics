# Frontend Development Guide

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Environment variables (optional `.env` file in `frontend/`):
   - `VITE_USE_REAL_AUTH` — set to `true` to enable real backend authentication; omit or set to anything else for Demo Mode
   - `VITE_API_BASE_URL` — API base URL (default: `/api`, which Vite proxies to `http://localhost:3000`)

## Run

```
npm run dev
```

Frontend starts on `http://localhost:5173`.

## Auth Modes

### Demo Mode (default)

No backend needed. A full-screen role picker appears on load — choose a preset student or club admin identity. All data is mocked via localStorage.

### Real Auth Mode

Set `VITE_USE_REAL_AUTH=true` in `.env`. Requires the backend to be running.

**Login flow:**
1. Navigate to `/auth`
2. Sign in or register with email + password
3. On success:
   - ADMIN/CLUB_LEADER roles → redirects to `/admin`
   - Other roles → redirects to `/app`
4. Session persists via JWT in localStorage
5. Sign out via the logout button in the header

**To test with the seeded admin:**
1. Run `npm run seed` in the backend
2. Login with `admin@mcgill.ca` / `admin123`

## Vite Proxy

The dev server proxies `/api/*` requests to `http://localhost:3000` (stripping the `/api` prefix), so the frontend calls `/api/auth/login` which becomes `http://localhost:3000/auth/login`.
