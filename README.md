# 🍴 FolksMeal Web App

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

A production-grade meal selection and management system designed for corporate employees and operations teams. This platform streamlines the process of meal planning, selection, and reporting with enterprise-level robustness.

---

## 🚀 Key Features

### 👤 Employee Experience
- **Personalized Dashboard**: Real-time view of daily menus and selection status.
- **Meal Selection**: Effortless Opt-in/Opt-out system for daily meals.
- **Preferences**: Quick toggle between Veg and Non-Veg preferences with a persistent default.
- **Meal Ratings**: Feedback system to rate and comment on daily meals.
- **History Tracking**: View past selections and preferences.

### ⚙️ Operations & Admin Dashboard
- **Company Management**: Manage multiple client companies and their specific locations/addresses.
- **Location-Specific Rules**: Set custom cutoff times, working days, and timezones for each office location.
- **Employee Lifecycle**: Create, update, and manage employee records with unique codes.
- **Menu Management**: Upload daily menus with dietary notes and beverage options.
- **Reporting & Analytics**: Generate meal selection reports for kitchen and logistics planning.
- **Excel Support**: Bulk import/export capabilities for menus and reports.

### 🛡️ Enterprise Architecture
- **IST-Only Timezone**: All time operations are locked to `Asia/Kolkata` (IST) to ensure consistency between server and client.
- **Hardened Security**: 
  - NextAuth v5 (Auth.js) for secure, session-based authentication.
  - Rate-limiting proxy implemented at the middleware level.
  - Protected API routes with centralized session and validation logic.
- **Robust Data Handling**: 
  - Zod-powered schema validation for all inputs.
  - Centralized error handling wrapper for consistent API responses.
  - SWR for efficient data fetching and state synchronization.

---

## 🛠️ Tech Stack

- **Core**: [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **UI/UX**: [Tailwind CSS 4.0](https://tailwindcss.com/), [Shadcn/UI](https://ui.shadcn.com/), [Framer Motion](https://www.framer.com/motion/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Auth**: [NextAuth.js v5](https://authjs.dev/)
- **State Management**: [SWR](https://swr.vercel.app/)
- **Utilities**: [Zod](https://zod.dev/), [Lucide React](https://lucide.dev/), [ExcelJS](https://github.com/exceljs/exceljs)

---

## 📂 Directory Structure

```text
├── app/                  # Next.js App Router (Routes & Layouts)
│   ├── (employee)/       # Employee-facing routes
│   ├── admin/            # Superadmin management routes
│   ├── ops/              # Operations dashboard routes
│   ├── api/              # SECURE server-side API endpoints
│   └── actions/          # Type-safe Server Actions
├── components/           # UI Components (Shadcn/UI + Custom)
├── lib/                  # Core logic, utilities, and DB clients
│   ├── api-utils.ts      # Standardized API response wrappers
│   ├── auth.ts           # NextAuth configuration
│   └── prisma.ts         # Singleton Prisma client
├── prisma/               # Database schema and seed scripts
├── public/               # Static assets
├── types/                # Global TypeScript definitions
└── proxy.ts              # Edge-level middleware and rate limiting
```

---

## 📊 Database Schema Highlights

The system uses a relational model optimized for performance:
- **`User`**: Admin users for system-wide configuration.
- **`Employee`**: Corporate users who consume the service.
- **`Company` & `Address`**: Hierarchical organization of clients and locations.
- **`Menu`**: Daily records of meal offerings indexed by date and location.
- **`MealSelection`**: Daily records of employee choices (the core business data).
- **`MealRating`**: Feedback loop for service quality improvement.

---

## 🏁 Getting Started

### Prerequisites
- Node.js (Latest LTS)
- PostgreSQL database
- `.env` file with required secrets

### Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file based on the environment variables needed (Database URL, Auth Secret, etc.).

3. **Database Initialization**:
   ```bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

---

## 🩺 Performance & Monitoring

- **Health Check**: Endpoint available at `/api/health` for uptime monitoring.
- **Database Optimization**: Strategic indexing on `date`, `employeeId`, and `addressId` for sub-100ms query performance.
- **Analytics**: Integrated with Vercel Analytics and Speed Insights.

---

Built with ❤️ by the FolksMeal Team.
