# FixTrack Pro

## Overview

FixTrack Pro is a premium asset tracking platform for contractors and homeowners, designed to ensure tamper-resistant asset logging using QR/NFC stickers. It incorporates AI-powered warranty parsing, predictive maintenance reminders, and a hash-chain for immutable event logging. The platform operates on a subscription model with quota enforcement and an admin system for physical sticker fulfillment.

**Key Capabilities:**
- **Tamper-Resistant Logging:** Contractors log installations and services with photos by scanning pre-printed QR/NFC stickers.
- **Comprehensive Property History:** Homeowners access a complete property history, upload warranties, and receipts via a master QR.
- **AI-Powered Automation:** AI extracts warranty dates, generates predictive maintenance reminders for all stakeholders.
- **Immutable Records:** A blockchain-inspired hash chain ensures the integrity and tamper-proof nature of asset history.
- **Subscription-Based Model:** Quota-enforced subscription plans managed through an admin fulfillment system for physical sticker orders.

The application adheres to enterprise SaaS standards, featuring a React frontend, an Express backend, PostgreSQL with Drizzle ORM, Stripe for payments, Google Cloud Storage, Replit Auth, and OpenAI Vision API for document parsing.

## User Preferences

Preferred communication style: Simple, everyday language.
Design philosophy: Premium, professional, trustworthy - like Stripe/Linear/Notion quality.

## System Architecture

### Frontend Architecture
- **Technology Stack:** React 18, TypeScript, Vite, Wouter for routing, TanStack Query, Shadcn UI (Radix UI primitives), Tailwind CSS.
- **Design Patterns:** Component-based, custom hooks, query-based data fetching, path aliases.
- **Key Features:** Dark mode, responsive design, QR code scanning, file upload with progress, real-time form validation.
- **Core Workflows:** Contractor install form, public asset view with timeline, service event logging.
- **UI/UX Decisions:** Premium branding, role-based dashboards and navigation, interactive trust badges, automatic scroll-to-top, mobile-first design, sophisticated camera permission system.

### Backend Architecture
- **Technology Stack:** Node.js, Express, TypeScript, Drizzle ORM with Neon PostgreSQL, WebSockets.
- **Design Patterns:** RESTful API, middleware, Replit OIDC authentication, session management, storage abstraction.
- **Core Modules:** Organized modules for routes, storage, database, authentication, object storage/ACL, hash chain, OpenAI client, and rate limiting.
- **API Structure:** Authentication, scanning, dashboard stats, payments, and specific endpoints for assets, documents, inspections, reminders.

### Data Storage
- **Database:** PostgreSQL (Neon serverless) with Drizzle ORM.
- **Core Tables:** `users`, `sessions`, `contractors`, `properties`, `identifiers`, `assets`, `events`, `documents`, `reminders`, `inspections`, `transfers`, `subscriptions`, along with tables for contractor jobs, fleet management, and notifications.
- **Relationships:** Many-to-one and one-to-many relationships defined between core entities to support complex data structures.

### Authentication & Authorization
- **Replit Authentication:** OIDC integration, session-based authentication with PostgreSQL store, Passport.js, JWT.
- **Access Control:** Role-based access (HOMEOWNER, CONTRACTOR, INSPECTOR, ADMIN, FLEET), object-level ACL for Google Cloud Storage, protected routes with middleware.
- **Security Features:** Rate limiting on AI parsing, input validation, hash chain integrity, admin role enforcement.

## External Dependencies

-   **Stripe:** Payment processing, subscription management, customer portal, webhooks.
-   **Google Cloud Storage:** File and document storage, custom ACL, signed URLs.
-   **Neon PostgreSQL:** Serverless PostgreSQL database.
-   **Replit Auth:** Primary authentication provider (OIDC).
-   **OpenAI:** Vision API for AI-powered warranty document parsing (gpt-5 model), integrated via Replit AI Integrations.
-   **Twilio:** SMS notifications for maintenance reminders.
-   **Resend:** Transactional email notifications.