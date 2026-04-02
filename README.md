# AR Alumni Influencer Platform (Node.js + Express)

Backend API for the AR Alumni Influencer Platform, including authentication, profile management, blind bidding, API key access, and scheduled daily winner selection.

## ✅ Features
- User registration + JWT login
- Profile CRUD + avatar upload
- Blind bidding system (daily slots + winner selection via cron)
- Monthly appearance tracking + limits
- Prisma ORM for Postgres
- Swagger API docs at `/docs`

## 🚀 Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure your database and env vars in `.env`:
   ```dotenv
   DATABASE_URL=postgresql://user:pass@localhost:5432/alumni_db
   SECRET_KEY=super-secret
   PORT=4000
   # Optional (email notifications):
   # SMTP_URL=smtp://user:pass@smtp.example.com:587
   # EMAIL_FROM=no-reply@alumni-be.local
   ```

3. Generate Prisma client & apply migrations (requires DB access):
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. Start dev server:
   ```bash
   npm run dev
   ```

## 🧠 Architecture Notes
- **Cron** runs at 18:00 UTC daily and selects the winning bid for tomorrow.
- **Blind bidding**: Users can see only `winning` vs `losing` status, never the full highest amount.
- **Monthly limit**: Maximum 3 wins monthly, 4 with attended_event_this_month true.

## 🛠️ Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill values.
3. Run DB migration:
   - `psql -f migrations/001_initial.sql $DATABASE_URL`
4. Start server:
   - `npm run dev`

## 📚 API Docs
Browse Swagger UI at: `http://localhost:4000/api-docs`

## 🧩 Notes
- No frontend included; API-only.
- Generate migrations with `psql` using `migrations/001_initial.sql`.

