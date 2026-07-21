# Invoice Tracker

Invoice Tracker is a full-stack web application for managing invoices with a robust backend and responsive frontend. It delivers a seamless experience for tracking invoices while bringing together authentication, data persistence, and secure server actions in a maintainable modern web architecture.

> **Note:** No custom backend code is required for this project. All server-side logic is implemented using [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions) and Supabase. This approach enables secure, scalable, and maintainable backend functionality directly within the Next.js codebase.

## Project Overview

- **Purpose:** Track, manage, and visualize invoices efficiently.
- **Features:** 
  - Add, edit, and delete invoices
  - Manage customers and view customer details with invoice history
  - Company branding: upload and manage your company logo and details
  - Responsive UI for desktop
  - Dashboard with invoice summaries and quick actions
  - Modern authentication and routing (sign up, login, password reset)
  - Guest mode: users can try the app without signing up
  - Invoice PDF export and download
  - Invoice status management (Paid, Delivered, Completed, Unsent)
  - Invoice discounts, tax calculation, and currency support
  - Real-time updates and data persistence with Supabase
  - Secure server actions and middleware for access control
  - Accessible design and keyboard navigation
  - Error handling and user feedback via toast notifications

## Technologies Used
- **Next.js**: React framework for server-side rendering and routing
- **TypeScript**: Type-safe development for reliability and maintainability
- **Tailwind CSS**: Utility-first CSS for rapid UI development
- **React**: Component-based architecture
- **Supabase**: Open-source Firebase alternative providing hosted PostgreSQL, real-time subscriptions, authentication, and storage

## Getting Started

To explore and evaluate Invoice Tracker:

1. **Live Demo:** Visit the deployed application at https://invoice-tracker-jo.vercel.app.
2. **Source Code:** Browse the codebase in this repository to review architecture, design, and implementation.
3. **Feature Walkthrough:** 
   - Log in or sign up to access the dashboard.
   - Add, edit, and delete invoices to experience the core functionality.

---

**To run the project locally:**

1. Clone the repository:
   ```bash
   git clone https://github.com/Jo-prg/invoice-tracker.git
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```
3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.
