# Alumni Spotlight Backend (Node.js + Express)

Backend API for the Alumni Spotlight bidding system ("Featured Alumni of the Day").

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
- **Cron** runs at 00:00 daily and selects the winning bid for the next day.
- **Blind bidding**: Users can see only `winning` vs `losing` status, never amounts.
- **Monthly limit**: By default, users can win up to 3 times per month; attending an event grants +1.

## 📚 API Docs
Browse the Swagger UI at: `http://localhost:4000/docs`

---

_This project uses Prisma v7, Express, and TypeScript._
