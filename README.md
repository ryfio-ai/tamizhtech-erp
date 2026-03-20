# TamizhTech Account & Client Tracking System

A complete, production-ready web application for TamizhTech — a robotics and tech company based in Coimbatore.

## 🚀 Features

- **Dashboard**: Real-time stats, revenue charts, and upcoming follow-ups.
- **Client Management**: Full CRUD with detailed profiles and billing history.
- **Invoices**: Dynamic line-item forms, auto-GST calculation, and premium PDF generation.
- **Payments**: Ledger with automated invoice status updates (Paid/Partial/Unpaid).
- **Follow-ups**: Interactive schedule tracking with overdue alerts.
- **Admissions Kanban**: Drag-responsive lead management board for workshop enrollments.
- **Email Automation**: Automated alerts for new invoices, payments, and admission approvals.

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + Shadcn/UI
- **Database**: Google Sheets (via `google-spreadsheet` API)
- **Auth**: NextAuth.js (Credentials Provider)
- **Email**: Nodemailer (Gmail SMTP)
- **PDF**: jsPDF with custom branding

## ⚙️ Setup Instructions

### 1. Environment Variables
Create a `.env.local` file in the root directory and add the following:

```env
# NEXT AUTH
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here

# ADMIN CREDENTIALS
ADMIN_EMAIL=admin@tamizhtech.in
ADMIN_PASSWORD=tamizhtech@2024

# GOOGLE SHEETS
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_spreadsheet_id_here

# GMAIL SMTP
GMAIL_USER=tamizhtechpvtltd@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password_here
```

### 2. Sheet Initialization
Run the initialization script to setup the necessary tabs and headers:

```bash
node scripts/setup-sheets.js
```

### 3. Run Development Server

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and login with the admin credentials.

## 📁 Directory Structure

- `/app`: API routes and dashboard pages.
- `/components`: UI components organized by module.
- `/lib`: Sheets service, Validations (Zod), and Mailer.
- `/types`: TypeScript definitions.
- `/scripts`: Setup and utility scripts.

---
&copy; 2024 TamizhTech. Built with ❤️ for Robotics Excellence.
