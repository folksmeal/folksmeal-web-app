# FolksMeal Web App

Production-grade meal selection and management system for employees and operations.

## 🚀 Key Features

- **Employee Dashboard**: Meal selection (Opt-in/Opt-out), preference selection (Veg/Non-Veg), and dietary notes.
- **Ops Dashboard**: Employee management, company/location management, menu uploads (Excel support), and meal selection reports.
- **Enterprise Hardening**:
  - **IST-Only Timezone**: Standardized across the entire application for reliability.
  - **Hardened API**: Centralized error handling, safe JSON parsing, and Zod validation.
  - **Security**: NextAuth v5 integration, rate-limiting proxy (middleware), and security headers.
  - **Optimized DB**: Indexed Prisma schema for fast date-based and employee-based lookups.
  - **Robustness**: Global error boundaries, 404 pages, and automated loading states.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js v5 (Auth.js)
- **Styling**: Tailwind CSS & shadcn/ui
- **Data Fetching**: SWR (Stale-While-Revalidate) with standardized error handling

## 🏁 Getting Started

1. **Clone and Install**:
```bash
npm install
```

2. **Environment Setup**:
Copy `.env.example` to `.env` and fill in your database and auth secrets.

3. **Database Setup**:
```bash
npx prisma generate
npx prisma db push
npm run seed
```

4. **Development**:
```bash
npm run dev
```

## 🔒 Security & Performance

- **Rate Limiting**: Implemented at the Edge level via `proxy.ts`.
- **API Hardening**: All endpoints use a standardized wrapper for consistent error responses and session validation.
- **Timezone Safety**: Hardcoded to `Asia/Kolkata` (IST) to prevent server-locality bugs.
- **Indexing**: All high-traffic query patterns (date-based selections, employee lookups) are indexed in the database.

## 🩺 Monitoring

A health check endpoint is available at `/api/health` to verify application and database connectivity.
