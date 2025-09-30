# Fix-Track Pro

## Overview

Fix-Track Pro is a full-stack asset tracking and property management platform that enables homeowners and contractors to track, manage, and maintain assets through QR code and NFC technology. The system provides comprehensive tracking of asset history, maintenance schedules, documents, and inspections with subscription-based access control.

The application follows a monorepo structure with a React frontend (Vite + TypeScript), Express backend, and PostgreSQL database managed through Drizzle ORM. It integrates with Stripe for payments, Google Cloud Storage for file management, and includes Replit authentication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript
- Vite as build tool and dev server
- Wouter for client-side routing
- TanStack Query for server state management
- Shadcn UI components with Radix UI primitives
- Tailwind CSS for styling

**Design Patterns:**
- Component-based architecture with reusable UI components
- Custom hooks for authentication (`useAuth`) and state management
- Query-based data fetching with automatic caching and invalidation
- Path aliases for clean imports (`@/`, `@shared/`, `@assets/`)

**Key Features:**
- Dark mode theming with CSS variables
- Responsive mobile-first design
- QR code scanning capability (mock implementation for demo)
- File upload with progress tracking
- Real-time form validation with React Hook Form and Zod

### Backend Architecture

**Technology Stack:**
- Node.js with Express
- TypeScript for type safety
- Drizzle ORM with PostgreSQL (Neon serverless)
- WebSocket support for real-time features

**Design Patterns:**
- RESTful API architecture
- Middleware-based request processing
- Authentication middleware with Replit OIDC
- Session management with PostgreSQL store
- Storage abstraction layer for database operations

**Core Modules:**
- `server/routes.ts` - Main API route registration
- `server/storage.ts` - Database abstraction layer with typed interfaces
- `server/db.ts` - Database connection and Drizzle configuration
- `server/replitAuth.ts` - Authentication setup and middleware
- `server/objectStorage.ts` - Google Cloud Storage integration with ACL
- `server/objectAcl.ts` - Object-level access control system

**API Structure:**
- `/api/auth/*` - Authentication endpoints (user info, login/logout)
- `/api/scan` - QR code scanning and identifier lookup
- `/api/dashboard/stats` - Dashboard statistics
- `/api/stripe/*` - Payment and subscription management
- Tool-specific endpoints for identifiers, assets, documents, reports, inspections, reminders

### Data Storage

**Database Schema (Drizzle + PostgreSQL):**

**Core Tables:**
- `users` - User accounts with Replit auth integration, role-based access (HOMEOWNER, CONTRACTOR, INSPECTOR, ADMIN), Stripe customer info
- `sessions` - Session storage for authentication
- `contractors` - Contractor profiles with company info and subscription plans
- `properties` - Property records owned by users, supports master identifier linking
- `identifiers` - QR/NFC codes (asset-level and master property-level)
- `assets` - Physical items tracked with identifiers, categorized by type (PLUMBING, ELECTRICAL, HVAC, etc.)
- `events` - Event history for assets (SERVICE, REPAIR, INSPECTION, etc.)
- `documents` - File attachments linked to assets/properties
- `reminders` - Maintenance reminders with scheduling
- `inspections` - Inspection records with findings
- `transfers` - Asset ownership transfer history
- `subscriptions` - Subscription records linked to Stripe

**Relationships:**
- Users → Contractors (one-to-one)
- Users → Properties (one-to-many)
- Properties → Assets (one-to-many)
- Assets → Identifiers (one-to-one)
- Assets → Events, Documents, Reminders (one-to-many)
- Contractors → Identifiers (one-to-many, for batch generation)

### Authentication & Authorization

**Replit Authentication:**
- OpenID Connect (OIDC) integration
- Session-based authentication with PostgreSQL store
- Passport.js strategy for OAuth flow
- JWT tokens for user claims
- Session TTL: 7 days

**Access Control:**
- Role-based access: HOMEOWNER, CONTRACTOR, INSPECTOR, ADMIN
- Object-level ACL for Google Cloud Storage
- Protected routes with `isAuthenticated` middleware
- User-specific data isolation

### External Dependencies

**Payment Processing:**
- **Stripe** - Payment processing and subscription management
  - API Version: 2025-08-27.basil
  - Checkout sessions for subscription purchases
  - Customer portal for subscription management
  - Webhook handling for payment events
  - Plans: contractor_50, contractor_100, home_lifetime, home_annual

**Cloud Storage:**
- **Google Cloud Storage** - File and document storage
  - External account authentication via Replit sidecar
  - Custom ACL system for access control
  - Support for public and private object paths
  - Signed URL generation for secure access

**Database:**
- **Neon PostgreSQL** - Serverless PostgreSQL database
  - WebSocket-based connection pooling
  - Drizzle ORM for type-safe queries
  - Migration support via drizzle-kit

**Authentication:**
- **Replit Auth** - Primary authentication provider
  - OIDC discovery endpoint
  - Session management with connect-pg-simple
  - Profile information (email, name, profile image)

**PDF Generation:**
- **PDFKit** - Server-side PDF generation for reports
  - QR code embedding
  - Asset history reports
  - Maintenance schedules

**QR Code:**
- **qrcode** - QR code generation library
  - Asset identifier QR codes
  - Property master identifier codes
  - Embedded in PDF reports

**Development Tools:**
- Replit-specific Vite plugins (cartographer, dev-banner, runtime-error-modal)
- ESBuild for server bundling
- TypeScript for type checking across frontend and backend