# AR Alumni Influencer Platform (Node.js + Express + Kong)

Backend API for the AR Alumni Influencer Platform, including authentication, profile management, blind bidding, API key access, and scheduled daily winner selection.

## ✅ Features
- User registration + login + email verification
- Profile CRUD + avatar upload + linkedIn + phone + image
- Blind bidding system (daily slots + winner selection)
- Monthly appearance tracking + limits
- API key / developer API route (`GET /api/v1/alumni-of-the-day`)
- Swagger/OpenAPI docs
- CSRF protection with dev bypass for Swagger
- Kong API gateway support (Docker)
- PostgreSQL and Prisma models

## 🚀 Quick Start
### Option A: Local development (no Docker)
1. `npm install`
2. Configure `.env` (copy from `.env.example`):
   ```dotenv
   DATABASE_URL=postgresql://alumni:Myorange3842@localhost:5432/ar_alumni
   SESSION_SECRET=your_secret_here
   PORT=4000
   BASE_URL=http://localhost:4000
   SMTP_HOST=sandbox.smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=... 
   SMTP_PASS=...
   EMAIL_FROM=noreply@yourdomain.com
   ```
3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
4. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Start server:
   ```bash
   npm run dev
   ```
6. Open Swagger:
   `http://localhost:4000/api-docs`

### Option B: Docker + Kong
1. `docker-compose down -v`
2. `docker-compose up --build -d`
3. Verify containers:
   - app: `http://localhost:3000`
   - kong proxy: `http://localhost:8000`
   - kong admin: `http://localhost:8001`
   - db: `postgres://localhost:5432`
   - kong db: `postgres://localhost:5433`

4. Set Kong route & service (required once):
   ```bash
   curl -X POST http://localhost:8001/services \
     --data name=alumni-app --data url=http://app:3000

   curl -X POST http://localhost:8001/services/alumni-app/routes \
     --data name=alumni-all --data 'paths[]=/' --data strip_path=false
   ```

5. Open Swagger through Kong:
   `http://localhost:8000/api-docs`

## 🧠 Architecture Notes
- `src/app.ts` is the Express app with middleware (helmet, cors, cookie/session, csurf, morgan, flash).
- `/auth` handles login/registration, email verification, password resets.
- `/profile` handles profile + section tables (degrees, certifications, licences, courses, employment).
- `/bidding` routes handle bid placement/status/history.
- `/developer/keys` routes manage API keys.
- `/api/v1/alumni-of-the-day` is the AR client endpoint (protected by `apiKeyAuth`).

## 🔐 Auth & API key flow
1. Get CSRF token:
   ```bash
   curl -c /tmp/cookie.txt http://localhost:8000/auth/csrf-token
   ```
2. Login:
   ```bash
   TOKEN=$(curl -s -c /tmp/cookies.txt http://localhost:8000/auth/csrf-token | jq -r .csrfToken)
   curl -b /tmp/cookies.txt -c /tmp/cookies.txt -X POST http://localhost:8000/auth/login \
     -H "Content-Type: application/json" -H "x-csrf-token: $TOKEN" \
     -d '{"email":"user@example.com","password":"password"}'
   ```
3. Create key:
   ```bash
   curl -b /tmp/cookies.txt -X POST http://localhost:8000/developer/keys/generate \
     -H "Content-Type: application/json" -H "x-csrf-token: $TOKEN" \
     -d '{"label":"AR Client"}'
   ```
4. Call AR endpoint:
   ```bash
   curl http://localhost:8000/api/v1/alumni-of-the-day \
     -H "Authorization: Bearer ak_xxxxx"
   ```

## 📡 Main API endpoint (AR client)
`GET /api/v1/alumni-of-the-day` returns:
- bid_winner_id, display_date, user_id, email
- full_name, bio, linkedin_url, phone_number, profile_image_url
- degrees[], certifications[], licences[], professional_courses[], employment_history[]

## ⚡ Quick test commands
- Health: `curl http://localhost:8000/health`
- Swagger data: `curl http://localhost:8000/api-docs/`
- Verify email endpoint (for token): `http://localhost:8000/auth/verify-email?token=...`

## 🧾 Notes / Gotchas
- `server.js` must load `dist/app` (build with `npm run build`);
  `docker build` and `npm run build` are required for production image.
- If `phone_number` missing, run:
  `docker exec -it alumni-be-app-database-1 psql -U alumni -d ar_alumni -c "ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;"`
- If Kong returns `no Route matched`, validate route/service in Kong admin API.
- Swagger authentication for API key: use `Authorize` -> enter `Bearer ak_xxxxx`.

## 📦 Database schema locations
- SQL migration: `migrations/001_initial.sql`
- Prisma schema: `prisma/schema.prisma`

## 🧹 Reset instructions
- Drop/recreate local DB if needed:
  `psql -c 'DROP DATABASE IF EXISTS ar_alumni; CREATE DATABASE ar_alumni;'`
  `npx prisma migrate deploy`
  `npx prisma generate`

## 🎯 Conclusion
This README now covers everything to bootstrap, run locally or in Docker, generate an API key, and use the critical AR alumni endpoint without friction.


