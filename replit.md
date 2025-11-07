# FixTrack Pro

## Overview

FixTrack Pro is a billion-dollar premium asset tracking platform that enables contractors and homeowners to scan pre-printed QR/NFC stickers for tamper-resistant asset logging. The system uses AI-powered warranty parsing, predictive maintenance reminders, hash-chain event logging, and subscription-based quota enforcement.

**Core Value Proposition:**
- Contractors scan pre-printed Fix Track stickers (NOT self-generated) to log installs/service with photos
- Homeowners scan Whole-House master QR to view complete property history and upload warranties/receipts  
- AI automatically extracts warranty dates and creates maintenance reminders for both parties
- Blockchain-inspired hash chain ensures tamper-proof asset history
- Quota-enforced subscription plans with admin fulfillment system for physical sticker orders

The application follows enterprise SaaS quality standards with React frontend (Vite + TypeScript), Express backend, PostgreSQL database (Drizzle ORM), Stripe payments, Google Cloud Storage, Replit Auth, and OpenAI Vision API for document parsing.

## User Preferences

Preferred communication style: Simple, everyday language.
Design philosophy: Premium, professional, trustworthy - like Stripe/Linear/Notion quality.

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
- `server/hashChain.ts` - Tamper-proof hash chain system for event logging
- `server/openaiClient.ts` - OpenAI Vision API client for warranty parsing
- `server/rateLimiter.ts` - In-memory rate limiting for AI parsing endpoints

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
- Admin-only routes protected with `requireAdmin` middleware
- User-specific data isolation

**Security Features:**
- Rate limiting on AI parsing endpoints (10 requests/hour per user)
- Image upload validation (max 10MB, base64 format verification)
- Warranty data validation (date ranges, schedule limits)
- Hash chain integrity verification for tamper detection
- Admin role enforcement for fulfillment operations

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

**AI-Powered Parsing:**
- **OpenAI** - Vision API for warranty document parsing
  - Model: gpt-5 (newest available as of August 2025)
  - Integrated via Replit AI Integrations
  - Extracts warranty dates and maintenance schedules from images
  - Creates automatic reminders for contractors and homeowners
  - Rate limited to prevent abuse (10 requests/hour per user)

**Development Tools:**
- Replit-specific Vite plugins (cartographer, dev-banner, runtime-error-modal)
- ESBuild for server bundling
- TypeScript for type checking across frontend and backend

## Recent Changes

**November 7, 2025 - Security Hardening:**
- Added `requireAdmin` middleware to protect admin fulfillment endpoints
- Implemented rate limiting on AI warranty parsing (10 req/hour per user)
- Added comprehensive input validation for warranty parsing:
  - Image size validation (max 10MB)
  - Base64 format verification
  - Date range validation (past 10 years to future 5 years)
  - Maintenance schedule limits (max 20 reminders)
  - Interval validation (1-120 months)
- Created `server/rateLimiter.ts` for in-memory rate limiting with automatic cleanup