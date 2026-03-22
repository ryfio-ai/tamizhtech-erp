# TamizhTech Custom ERP System

This is a modern, responsive, and robust Enterprise Resource Planning (ERP) application custom-built for **TamizhTech** — a robotics and tech company based in Coimbatore, Tamil Nadu.

It acts as a complete CRM, billing, and system management hub powered by **Next.js**, **Prisma**, and **SQLite**.

## Core Features
1. **Dashboard Analytics:** Live metrics of revenue, overdue invoices, lead pipelines, and project status.
2. **Finance Module:** Comprehensive financial tracking including revenue vs. expense charts and category breakdowns.
3. **Audit & Activity Logs:** Centralized system to track every user action and data modification for accountability.
4. **Clients CRM:** Manage client relationships, history, and associated documents with safe cascaded deletions.
5. **Projects & Tasks:** Track milestones, budgets, and team deliveries with a clean board view.
6. **Invoices & Billing:** Generate custom styled PDF invoices instantly.
7. **Payment Tracking:** Log receipts and auto-compute invoice balances with UPI/Bank support.
8. **Follow-ups:** Schedule calls/meetings with an interactive Kanban timeline view.
9. **Lead Pipeline (Applications):** Kanban board for incoming inquiries and conversions.
10. **Export Capabilities:** One-click CSV/Excel exports for all tables.
11. **Automated Emails:** Backend templates using Nodemailer for sending welcome notes and receipts.

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Database:** SQLite with Prisma ORM
- **Authentication:** NextAuth.js (Credentials Provider)
- **Styling:** Tailwind CSS + shadcn/ui components
- **State & Validations:** React Hook Form + Zod + Zustand
- **PDF Generation:** @react-pdf/renderer
- **Charts:** Recharts
- **Icons:** Lucide-react

---

## Setup & Local Development

### 1. Environment Variables
Create a `.env` file in the root directory and populate it with the following:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="<random_base64_string>"
NEXTAUTH_URL="http://localhost:3000"

# Nodemailer setup
GMAIL_USER="tamizhtechpvtltd@gmail.com"
GMAIL_APP_PASSWORD="<your_app_password>"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Database
Sync the schema and seed the initial data (Admin accounts, sample projects, etc.):

```bash
npx prisma db push
npx prisma db seed
```

### 4. Run Development Server
```bash
npm run dev
```

The system will start on `http://localhost:3000`. 
**Default Credentials:** 
- Email: `tamizharasan@tamizhtech.in`
- Password: `Admin@123`

---

## Deployment
This application is fully compatible with **Vercel** or any Node.js environment.
1. Link the GitHub repository.
2. Paste all the `.env` variables into the project environment settings.
3. For Vercel, ensuring the `DATABASE_URL` is set to a persistent SQLite or migrating to PostgreSQL is recommended for production.
4. Click **Deploy**.
