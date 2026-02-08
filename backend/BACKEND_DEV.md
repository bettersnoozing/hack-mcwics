# Backend Development Guide

## Setup

1. Copy `.env.example` to `.env` and fill in values:
   ```
   cp .env.example .env
   ```
2. Required env vars:
   - `DEV_MONGO` — MongoDB connection string
   - `MONGO_DB_NAME` — database name (default: `mcwics-portal`)
   - `JWT_SECRET` — secret for signing JWT tokens (any random string; defaults to `dev-secret-change` for local dev)
   - `PORT` — server port (default: `3000`)

3. Install dependencies:
   ```
   npm install
   ```

## Run

```
npm run dev
```

Server starts on `http://localhost:3000`.

## Seed a Dev Admin

```
npm run seed
```

This creates an admin user idempotently. Configure via env vars:
- `SEED_ADMIN_EMAIL` (default: `admin@mcgill.ca`)
- `SEED_ADMIN_PASSWORD` (default: `admin123`)
- `SEED_ADMIN_NAME` (default: `Portal Admin`)

## API Endpoints

### Auth

| Method | Path                    | Auth     | Description                           |
|--------|-------------------------|----------|---------------------------------------|
| POST   | `/auth/register`        | None     | Student signup (assigns STUDENT role) |
| POST   | `/auth/register/student`| None     | Explicit student signup               |
| POST   | `/auth/register/admin`  | None*    | Admin signup (requires adminKey)      |
| POST   | `/auth/login`           | None     | Login, get JWT                        |
| GET    | `/auth/me`              | Bearer   | Get current user                      |
| POST   | `/auth/logout`          | None     | No-op (JWT)                           |

*Admin signup requires `adminKey` in body matching `ADMIN_SIGNUP_KEY` env var.

### Signup Types

**Student Signup (default):**
- Endpoint: `POST /auth/register` or `POST /auth/register/student`
- Open to all users
- Assigns `STUDENT` role automatically
- New users can immediately access student pages

**Admin Signup (restricted):**
- Endpoint: `POST /auth/register/admin`
- Requires `adminKey` field in request body
- Key must match `ADMIN_SIGNUP_KEY` environment variable
- Assigns `ADMIN` role
- Use for club executives and portal administrators

### curl Examples

**Student Register:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"student@mail.mcgill.ca","password":"test123","name":"Test Student"}'
```

**Admin Register (requires ADMIN_SIGNUP_KEY env var to be set):**
```bash
curl -X POST http://localhost:3000/auth/register/admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mail.mcgill.ca","password":"admin123","name":"Club Admin","adminKey":"YOUR_ADMIN_KEY"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mcgill.ca","password":"admin123"}'
```

**Me (use token from login response):**
```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

## Project Structure

```
src/
  config/         — env + auth config
  controllers/    — all business logic
  middleware/     — auth middleware (authenticate, authorize)
  models/         — Mongoose models (User)
  routes/         — thin route wiring only
  seeds/          — seed scripts
  types/          — TypeScript type augmentations
  utils/          — helpers (jwt)
  app.ts          — Express app setup
  server.ts       — entry point (connects to Mongo, starts server)
```
