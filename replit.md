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

**November 7, 2025 - New Pricing Model & UI Overhaul:**
- Implemented new three-tier subscription structure:
  - Homeowner Pack: $99 one-time + $10/year with 7 identifiers (1 master + 5 small + 1 magnetic)
  - Contractor Starter/Pro: $19.99/mo (50 stickers) or $29.99/mo (100 stickers) with branding
  - Fleet Management: Dynamic pricing ($3/asset for 1-999, $2/asset for 1000+)
- Added comprehensive add-ons system with feature flags:
  - Service Sessions ($4.99/mo), NanoTag Theft Recovery, Crew Clock-In
  - Fleet add-ons: Real-time Tracking, Theft Recovery, Driver Accountability, AI Insights
- Database schema updates:
  - Added `serviceSessions` table for verified GPS clock-in/out feature
  - Added feature flag fields to subscriptions (featureServiceSessions, featureNanoTag, etc.)
  - Added fleet management fields (fleetAssetCount, fleetPricePerAsset)
  - Added contractor contact info (phone, email, website, licenseNumber)
  - Added FLEET user role
- Updated Stripe integration:
  - Checkout handles dynamic line items for base plans + add-ons
  - Fleet pricing calculated on-the-fly based on asset count
  - Webhook sets feature flags based on purchased add-ons
  - Automatic role assignment based on plan type
- Built new pricing page (client/src/pages/pricing.tsx):
  - Three premium pricing cards with psychological triggers
  - Add-on checkboxes for each tier
  - Fleet asset counter with dynamic price calculation
  - Complete data-testid coverage for testing
- Rebuilt landing page (client/src/pages/landing.tsx):
  - Premium hero section with stats bar (10K+ Assets, 500+ Companies, 99.9% Uptime)
  - "Who It's For" section showcasing Homeowner/Contractor/Fleet use cases
  - "How It Works" 3-step process
  - Full data-testid coverage (in progress)

**November 7, 2025 - Role-Based UI & Logo Updates:**
- **Logo & Branding:**
  - Replaced placeholder lightning bolt icon with FixTrack shield logo (/logo.png) across all pages
  - Styled "FixTrack Pro" text with cyan-to-orange gradient matching logo colors (text-lg, bold, whitespace-nowrap)
  - Applied consistently to landing page, pricing page, and navigation header
- **Role-Based Dashboard (client/src/pages/dashboard.tsx):**
  - Implemented role-specific dashboard stats for HOMEOWNER, CONTRACTOR, and FLEET users
  - Homeowners see: My Assets, Active Warranties, Properties, Upcoming Reminders
  - Contractors see: Quota Used (X/50), Active Jobs, Assets Installed, Active Reminders
  - Fleet managers see: Fleet Assets, Active Service, Maintenance Due, Total Properties
  - Added role badges (Homeowner/Contractor/Fleet Manager) next to Dashboard heading
  - Added role-specific welcome messages
  - Added "AI Predictive Maintenance — FREE" badge for all authenticated users
  - Fixed authentication check to show loading spinner until user data is loaded
- **Role-Aware Navigation (client/src/components/ui/navigation.tsx):**
  - Implemented role-specific menu items:
    - Homeowners: Dashboard, Scan, My Assets, Reminders
    - Contractors: Dashboard, Scan, My Jobs, Reminders, Quota & Billing
    - Fleet: Dashboard, Scan, Fleet Assets, Maintenance, Billing
  - Unauthenticated users only see: Scan, Pricing
  - Updated logo and branding to match landing/pricing pages
- **Scan Experience (client/src/pages/scan.tsx):**
  - Fixed TypeScript errors by adding proper type definitions for scan results
  - Verified role-specific actions work correctly:
    - Contractors: "Log Service Event" and "Upload Service Photos"
    - Homeowners: "Upload Warranty/Receipt" and "View Service History"
    - Public users: "View Public Information"
- **Removed QR Generator UI:**
  - Removed "QR Code Generator" from dashboard tools and quick actions
  - Updated Asset Management description to clarify use of pre-printed FixTrack stickers
  - Contractors order stickers from admin fulfillment, not self-generate
- **UX Enhancement (client/src/App.tsx):**
  - Added automatic scroll-to-top behavior on all page navigation
  - Uses wouter's `useLocation` hook to detect route changes
  - Ensures users always see the top of new pages when navigating
- **Contractor Pricing Value Proposition (client/src/pages/pricing.tsx):**
  - Updated card description to "Turn every install into guaranteed future work"
  - Added highlighted value proposition section explaining:
    - Installation records (date, installer, warranty) are permanently preserved and visible to anyone scanning
    - AI automatically extracts warranty dates and creates predictive maintenance reminders
    - System turns every install into recurring revenue through automatic service notifications
  - Refined feature list to emphasize permanent install history and AI-powered future work generation
- **Interactive Trust Badges (client/src/pages/landing.tsx):**
  - Made "Bank-Level Security", "Instant Setup", and "24/7 Support" badges clickable
  - Created three detailed dialog modals with accurate information:
    - Security: OIDC authentication, PostgreSQL storage, SHA-256 hash chains, rate limiting, RBAC
    - Setup: Step-by-step signup guide (Login → Choose Plan → Receive Stickers)
    - Support: Real contact information (phone (760) 269-5750, email trackfixes@gmail.com)
  - All claims verified against actual implementation (no marketing fluff)
  - Phone number is clickable with proper tel: link format for mobile calls
  - Dialog UX improved: added max-height scrolling (85vh) and orange hover effects to trust badges for better visibility
  - Trust badges styled with `hover:text-orange-500`, `hover:scale-105`, and animated underline to signal interactivity

**November 7, 2025 - Security Hardening:**
- Added `requireAdmin` middleware to protect admin fulfillment endpoints
- Implemented rate limiting on AI warranty parsing (10 req/hour per user)
- Added comprehensive input validation for warranty parsing
- Created `server/rateLimiter.ts` for in-memory rate limiting with automatic cleanup