# ServiceVault

## Overview

ServiceVault is a premium asset tracking platform for contractors, homeowners, and property managers, focusing on tamper-resistant logging via QR/NFC stickers. It provides AI-powered warranty parsing, predictive maintenance reminders, and an immutable hash-chain for event logging. The platform operates on a subscription model with quota enforcement and an admin system for physical sticker fulfillment. It supports comprehensive property history, property management features like task assignment and GPS-verified check-ins, and AI-driven automation for all stakeholders. The application adheres to enterprise SaaS standards, utilizing a React frontend, Express backend, PostgreSQL with Drizzle ORM, Stripe for payments, Google Cloud Storage, Replit Auth, and OpenAI Vision API.

## User Preferences

Preferred communication style: Simple, everyday language.
Design philosophy: Premium, professional, trustworthy - like Stripe/Linear/Notion quality.

## System Architecture

### Frontend Architecture
- **Technology Stack:** React 18, TypeScript, Vite, Wouter, TanStack Query, Shadcn UI (Radix UI primitives), Tailwind CSS.
- **Design Patterns:** Component-based, custom hooks, query-based data fetching, path aliases.
- **UI/UX Decisions:** Dark mode, responsive design, premium branding, role-based dashboards, interactive trust badges, mobile-first design, sophisticated camera permission system.
- **Core Workflows:** Contractor install form, public asset view with timeline, service event logging, worker check-in/out, tenant reporting, and subscription management.

### Backend Architecture
- **Technology Stack:** Node.js, Express, TypeScript, Drizzle ORM with Neon PostgreSQL, WebSockets.
- **Design Patterns:** RESTful API, middleware, Replit OIDC authentication, session management, storage abstraction.
- **Core Modules:** Routes, storage, database, authentication, object storage/ACL, hash chain, OpenAI client, and rate limiting.
- **API Structure:** Comprehensive endpoints for assets, documents, inspections, reminders, payments, and specific modules for property management (properties, workers, tasks, visits, tenant reports).

### Data Storage
- **Database:** PostgreSQL (Neon serverless) with Drizzle ORM.
- **Core Tables:** `users`, `sessions`, `contractors`, `properties`, `identifiers`, `assets`, `events`, `documents`, `reminders`, `inspections`, `transfers`, `subscriptions`, `logos`, `logoGenerations`, `logoPayments`. Dedicated tables for `managedProperties`, `workers`, `propertyTasks`, `propertyVisits`, and `tenantReports` support property management functionality.
- **Logo System:** Users can upload logos or generate AI logos. Each user has one `isActive` logo that appears on dashboards and future QR sticker orders. Logo selection requires explicit confirmation.

### Authentication & Authorization
- **Replit Authentication:** OIDC integration, session-based authentication with PostgreSQL store, Passport.js, JWT.
- **Access Control:** Role-based access (HOMEOWNER, CONTRACTOR, INSPECTOR, ADMIN, FLEET, PROPERTY_MANAGER, WORKER) with object-level ACL for Google Cloud Storage and protected routes.
- **Entitlement System:** Feature-based access control using `getUserEntitlements` service and `requireEntitlement` middleware, ensuring premium features are protected at both frontend and backend layers.
- **Security Features:** Rate limiting, input validation, hash chain integrity, and authorization checks.

## External Dependencies

-   **Stripe:** Payment processing, subscription management, customer portal, webhooks.
-   **Google Cloud Storage:** File and document storage, custom ACL, signed URLs.
-   **Neon PostgreSQL:** Serverless PostgreSQL database.
-   **Replit Auth:** Primary authentication provider (OIDC).
-   **OpenAI:** Vision API for AI-powered warranty document parsing (gpt-5 model).
-   **Twilio:** SMS notifications for maintenance reminders.
-   **Resend:** Transactional email notifications.