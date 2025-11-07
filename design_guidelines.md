# FixTrack Pro - Design Guidelines

## Design Approach
**Reference-Based**: Drawing from Stripe's trustworthy professionalism, Linear's modern efficiency, and Notion's intuitive clarity. This enterprise SaaS aesthetic prioritizes credibility, speed perception, and premium feel.

## Core Design Elements

### Typography
- **Primary Font**: Inter via Google Fonts CDN
- **Hierarchy**:
  - Hero Headlines: text-5xl to text-6xl, font-bold, tracking-tight
  - Section Titles: text-3xl to text-4xl, font-semibold
  - Subheadings: text-xl to text-2xl, font-medium
  - Body Text: text-base to text-lg, font-normal, leading-relaxed
  - Captions/Labels: text-sm, font-medium, tracking-wide uppercase for labels
  - Button Text: text-base, font-semibold

### Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Section padding: py-20 (desktop), py-12 (mobile)
- Component spacing: gap-6 to gap-8
- Container max-width: max-w-7xl with px-6
- Card padding: p-6 to p-8
- Form field spacing: space-y-4

### Component Library

**Navigation**
- Fixed header with backdrop blur (backdrop-blur-lg)
- Logo left, primary nav center, CTA button right
- Mobile: Hamburger menu with slide-out drawer
- Height: h-16 to h-20

**Hero Section**
- Full-width background image showing contractor using app on job site (scanning QR code on equipment)
- Overlay gradient (dark at bottom fading to transparent)
- Content centered with max-w-4xl
- Headline + supporting text + dual CTAs (primary + secondary with blurred backgrounds)
- Stats bar below (3-4 columns): "10K+ Assets Tracked | 500+ Companies | 99.9% Uptime"

**Asset Cards**
- Rounded corners (rounded-xl)
- Subtle shadow (shadow-lg with hover:shadow-xl)
- Image thumbnail top or left
- QR code indicator icon
- Asset info: name, location, last scanned, status badge
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

**Scan Interface Component**
- Full-screen camera viewport option
- Overlay frame for QR targeting
- Bottom sheet with scan results
- Success confirmation with asset details

**Timeline/History View**
- Vertical timeline with connecting line
- Event cards with timestamps
- Icons for different event types (scanned, serviced, transferred)
- Expandable details

**Forms**
- Input fields with border focus state
- Labels above inputs with gap-2
- Helper text below in muted color
- Primary action buttons prominent
- Floating label pattern for active inputs

**Buttons**
- Primary: Gradient background (teal to cyan), white text, rounded-lg, px-6 py-3
- Secondary: Border with gradient, transparent bg, rounded-lg
- Tertiary: Text only with underline on hover
- On images: Backdrop blur background (bg-white/20 backdrop-blur-md)

**Status Badges**
- Rounded-full, px-3 py-1, text-xs font-medium
- Color-coded: Active (green accent), Maintenance (orange), Retired (gray)

**Data Tables**
- Clean borders (border-collapse)
- Alternating row backgrounds
- Sticky header
- Responsive: Stack to cards on mobile

**Dashboard Widgets**
- Card-based with rounded-xl borders
- Chart.js for visualizations
- Icon + metric + trend indicator
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-4

**Icons**: Heroicons via CDN (outline for nav/UI, solid for emphasis)

### Animations
Minimal, performance-focused:
- Subtle fade-in on scroll for sections
- Button scale on press (scale-95 active state)
- Smooth transitions on interactive elements (transition-all duration-200)
- Loading skeleton screens with shimmer effect

## Images

**Hero Image**: 
Professional photo of contractor in safety vest/hard hat using smartphone to scan QR code on construction equipment. Modern job site setting, natural lighting, wide shot showing equipment and context. Placement: Full-width background, 80vh height.

**Feature Sections**:
- Screenshot of mobile scanning interface in action
- Dashboard view showing asset grid
- Timeline history view on tablet/mobile
- Team collaboration features

**Trust Section**:
- Logos of enterprise clients (placeholder grayscale)
- Team photo (optional but recommended for credibility)

## Page Structure

**Landing Page Sections** (7 key sections):
1. Hero with background image + stats bar
2. Feature Grid (3 columns): QR Scanning, Asset History, Team Management
3. Product Screenshots (2-column split: mobile + desktop views)
4. Use Cases (2 columns): Contractors + Homeowners
5. Trust/Social Proof (logos grid + testimonial)
6. Pricing Cards (3-tier comparison)
7. CTA Section with demo request form

**Dashboard Layout**:
- Sidebar navigation (w-64, collapsible on mobile)
- Top bar with search, notifications, profile
- Main content area with page title + action buttons
- Widget grid responsive layout

**Mobile-First Priorities**:
- Large touch targets (min-h-12)
- Bottom navigation for key actions
- Swipe gestures for card actions
- Thumb-zone CTAs
- Simplified forms with smart defaults