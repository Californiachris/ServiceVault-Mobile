import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  pgEnum,
  uuid,
  integer,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("HOMEOWNER"), // HOMEOWNER, CONTRACTOR, FLEET, INSPECTOR, ADMIN, PROPERTY_MANAGER, WORKER
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  
  // Family branding for homeowners
  familyName: varchar("family_name"),
  familyLogoUrl: varchar("family_logo_url"),
  
  // Homeowner property preferences from onboarding
  propertyTypes: text("property_types").array(), // ["SINGLE_FAMILY", "CONDO", "MULTI_FAMILY", "COMMERCIAL"]
  
  // Fleet manager industry preferences from onboarding
  industries: text("industries").array(), // Industry selections from onboarding
  
  // Notification settings
  phone: varchar("phone"),
  notificationPreference: varchar("notification_preference").default("EMAIL_AND_SMS"), // EMAIL_ONLY, SMS_ONLY, EMAIL_AND_SMS, NONE
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contractor profiles
export const contractors = pgTable("contractors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  companyName: varchar("company_name").notNull(),
  logoUrl: varchar("logo_url"),
  phone: varchar("phone"),
  email: varchar("email"),
  website: varchar("website"),
  licenseNumber: varchar("license_number"),
  plan: varchar("plan"), // contractor_starter, contractor_pro
  serviceAreas: text("service_areas").array(),
  specialties: text("specialties").array(),
  crewSize: integer("crew_size"),
  monthlyQuota: integer("monthly_quota").default(50),
  quotaUsed: integer("quota_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Properties
export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  name: varchar("name"),
  addressLine1: varchar("address_line1"),
  city: varchar("city"),
  state: varchar("state"),
  postalCode: varchar("postal_code"),
  country: varchar("country"),
  propertyType: varchar("property_type"), // SINGLE_FAMILY, CONDO, MULTI_FAMILY, COMMERCIAL
  masterIdentifierId: uuid("master_identifier_id").references(() => identifiers.id),
  homePlan: varchar("home_plan"), // home_lifetime, home_annual
  homeStatus: varchar("home_status").default("ACTIVE"),
  publicVisibility: jsonb("public_visibility"), // Privacy settings for public property view
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// QR/NFC Identifiers
export const identifiers = pgTable("identifiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code").unique().notNull(),
  kind: varchar("kind").notNull(), // HOUSE, ASSET, THEFT_TAG
  contractorId: uuid("contractor_id").references(() => contractors.id),
  claimedAt: timestamp("claimed_at"),
  qrPath: varchar("qr_path"),
  brandLabel: varchar("brand_label"),
  tamperState: varchar("tamper_state").default("OK"), // OK, TRIPPED
  deactivatedAt: timestamp("deactivated_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Assets
export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => properties.id),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // PLUMBING, ELECTRICAL, HVAC, APPLIANCE, etc.
  brand: varchar("brand"),
  model: varchar("model"),
  serial: varchar("serial"),
  notes: text("notes"), // Installer notes from initial install
  installedAt: timestamp("installed_at"),
  identifierId: uuid("identifier_id").unique().references(() => identifiers.id),
  installerId: uuid("installer_id").references(() => contractors.id),
  status: varchar("status").default("ACTIVE"),
  
  // Privacy model: INFRASTRUCTURE (public on property view) vs PERSONAL (owner-only)
  assetType: varchar("asset_type").default("INFRASTRUCTURE"), // INFRASTRUCTURE, PERSONAL
  
  // Fleet-specific fields
  fleetIndustryId: uuid("fleet_industry_id").references(() => fleetIndustries.id),
  fleetCategoryId: uuid("fleet_category_id").references(() => fleetAssetCategories.id),
  location: varchar("location"), // For fleet: warehouse, site, etc.
  
  // Fleet usage tracking fields
  operatingHours: decimal("operating_hours"), // Total operating hours
  mileage: decimal("mileage"), // Total mileage/kilometers
  runtime: decimal("runtime"), // Runtime hours for equipment
  wearCycles: integer("wear_cycles"), // Number of wear cycles (e.g., door openings, engine starts)
  lastServicedAt: timestamp("last_serviced_at"), // Date of last service for health calculations
  
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  propertyIdx: index("idx_assets_property").on(table.propertyId),
  fleetIndustryIdx: index("idx_assets_fleet_industry").on(table.fleetIndustryId),
  fleetCategoryIdx: index("idx_assets_fleet_category").on(table.fleetCategoryId),
  statusIdx: index("idx_assets_status").on(table.status),
}));

// Events/Timeline
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id").notNull().references(() => assets.id),
  type: varchar("type").notNull(), // INSTALL, SERVICE, INSPECTION, TRANSFER, WARRANTY, RECALL, NOTE
  data: jsonb("data"),
  photoUrls: jsonb("photo_urls").$type<string[]>(),
  prevHash: varchar("prev_hash"),
  hash: varchar("hash"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id").references(() => assets.id),
  propertyId: uuid("property_id").references(() => properties.id),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  type: varchar("type").notNull(), // RECEIPT, WARRANTY, MANUAL, INSPECTION, etc.
  title: varchar("title").notNull(),
  path: varchar("path").notNull(),
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  amount: varchar("amount"),
  description: text("description"),
  deletedAt: timestamp("deleted_at"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Reminders
export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id").references(() => assets.id),
  propertyId: uuid("property_id").references(() => properties.id),
  dueAt: timestamp("due_at").notNull(),
  type: varchar("type").notNull(),
  title: varchar("title"),
  description: text("description"),
  status: varchar("status").default("PENDING"),
  
  // Recurrence support
  frequency: varchar("frequency"), // ONE_TIME, MONTHLY, QUARTERLY, ANNUALLY, CUSTOM
  intervalDays: integer("interval_days"), // For custom frequency
  nextDueAt: timestamp("next_due_at"),
  
  // Notification control
  notifyContractor: boolean("notify_contractor").default(false),
  notifyHomeowner: boolean("notify_homeowner").default(true),
  notifyOperators: boolean("notify_operators").default(false),
  
  // Source tracking
  source: varchar("source").default("MANUAL"), // AI_GENERATED, MANUAL
  createdBy: varchar("created_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Transfers
export const transfers = pgTable("transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id").notNull().references(() => assets.id),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  method: varchar("method").default("DIGITAL"), // DIGITAL, NOTARY
  status: varchar("status").default("PENDING"), // PENDING, COMPLETED
  initiatedAt: timestamp("initiated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  signature: text("signature"),
});

// Inspections
export const inspections = pgTable("inspections", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  inspectorId: varchar("inspector_id").notNull().references(() => users.id),
  jurisdiction: varchar("jurisdiction"),
  checklist: jsonb("checklist"),
  result: varchar("result"),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contractor Jobs
export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractorId: uuid("contractor_id").notNull().references(() => contractors.id),
  propertyId: uuid("property_id").references(() => properties.id),
  clientId: varchar("client_id").references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  specialty: varchar("specialty"), // PLUMBING, HVAC, ELECTRICAL, ROOFING, etc. Null = GENERAL
  status: varchar("status").default("PENDING"), // PENDING, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  contractorIdx: index("idx_jobs_contractor").on(table.contractorId),
  statusIdx: index("idx_jobs_status").on(table.status),
  scheduledIdx: index("idx_jobs_scheduled").on(table.scheduledAt),
  contractorStatusIdx: index("idx_jobs_contractor_status").on(table.contractorId, table.status),
  specialtyIdx: index("idx_jobs_specialty").on(table.specialty),
}));

// Sticker Orders - Track monthly quota usage
export const stickerOrders = pgTable("sticker_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractorId: uuid("contractor_id").notNull().references(() => contractors.id),
  subscriptionId: uuid("subscription_id").notNull().references(() => subscriptions.id),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  quotaTotal: integer("quota_total").notNull().default(0),
  quotaUsed: integer("quota_used").notNull().default(0),
  orderedAt: timestamp("ordered_at").defaultNow(),
  fulfilledAt: timestamp("fulfilled_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  contractorIdx: index("idx_sticker_orders_contractor").on(table.contractorId),
  contractorPeriodUnique: uniqueIndex("uq_sticker_orders_contractor_period").on(table.contractorId, table.subscriptionId, table.year, table.month),
}));

// Fleet Industries
export const fleetIndustries = pgTable("fleet_industries", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  description: text("description"),
  iconName: varchar("icon_name"),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Fleet Asset Categories (per industry)
export const fleetAssetCategories = pgTable("fleet_asset_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  industryId: uuid("industry_id").notNull().references(() => fleetIndustries.id),
  name: varchar("name").notNull(),
  description: text("description"),
  maintenanceIntervalDays: integer("maintenance_interval_days"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  industryIdx: index("idx_fleet_asset_categories_industry").on(table.industryId),
}));

// Fleet Operators (drivers, maintenance workers)
export const fleetOperators = pgTable("fleet_operators", {
  id: uuid("id").primaryKey().defaultRandom(),
  fleetUserId: varchar("fleet_user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  licenseNumber: varchar("license_number"),
  status: varchar("status").default("ACTIVE"), // ACTIVE, INACTIVE, SUSPENDED
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fleet Operator Asset Assignments (junction table)
export const fleetOperatorAssets = pgTable("fleet_operator_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => fleetOperators.id),
  assetId: uuid("asset_id").notNull().references(() => assets.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  unassignedAt: timestamp("unassigned_at"),
}, (table) => ({
  operatorIdx: index("idx_fleet_operator_assets_operator").on(table.operatorId),
  assetIdx: index("idx_fleet_operator_assets_asset").on(table.assetId),
  operatorAssetUnique: uniqueIndex("uq_fleet_operator_assets_operator_asset").on(table.operatorId, table.assetId),
}));

// Notification Logs
export const notificationLogs = pgTable("notification_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id),
  reminderId: uuid("reminder_id").references(() => reminders.id),
  channel: varchar("channel").notNull(), // EMAIL, SMS
  status: varchar("status").default("PENDING"), // PENDING, SENT, DELIVERED, FAILED
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("idx_notification_logs_user").on(table.userId),
  reminderIdx: index("idx_notification_logs_reminder").on(table.reminderId),
  statusIdx: index("idx_notification_logs_status").on(table.status),
  userStatusIdx: index("idx_notification_logs_user_status").on(table.userId, table.status),
}));

// Service Sessions (for Verified Service Sessions add-on)
export const serviceSessions = pgTable("service_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  homeownerId: varchar("homeowner_id").notNull().references(() => users.id),
  workerId: varchar("worker_id").references(() => users.id),
  workerName: varchar("worker_name"),
  workerPhone: varchar("worker_phone"),
  title: varchar("title").notNull(),
  checklist: jsonb("checklist").$type<Array<{task: string, completed: boolean, photoUrl?: string, notes?: string}>>(),
  clockInAt: timestamp("clock_in_at"),
  clockInLocation: jsonb("clock_in_location").$type<{lat: number, lng: number, address?: string}>(),
  clockOutAt: timestamp("clock_out_at"),
  clockOutLocation: jsonb("clock_out_location").$type<{lat: number, lng: number, address?: string}>(),
  status: varchar("status").default("PENDING"), // PENDING, IN_PROGRESS, COMPLETED, TIMEOUT
  pdfReportUrl: varchar("pdf_report_url"),
  homeownerSignature: text("homeowner_signature"),
  workerSignature: text("worker_signature"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubId: varchar("stripe_sub_id"),
  priceId: varchar("price_id"),
  plan: varchar("plan"), // homeowner_base, contractor_starter, contractor_pro, fleet_base
  status: varchar("status"),
  quotaTotal: integer("quota_total").default(0),
  quotaUsed: integer("quota_used").default(0),
  currentPeriodEnd: timestamp("current_period_end"),
  fulfilled: boolean("fulfilled").default(false),
  fulfilledAt: timestamp("fulfilled_at"),
  
  // Fleet-specific fields
  fleetAssetCount: integer("fleet_asset_count").default(0),
  fleetPricePerAsset: decimal("fleet_price_per_asset", { precision: 10, scale: 2 }),
  
  // Feature flags for add-ons
  featureServiceSessions: boolean("feature_service_sessions").default(false),
  featureNanoTag: boolean("feature_nanotag").default(false),
  featureCrewClockIn: boolean("feature_crew_clockin").default(false),
  featureFamilyBranding: boolean("feature_family_branding").default(false), // $5 add-on for homeowners
  featureRealtimeTracking: boolean("feature_realtime_tracking").default(false),
  featureTheftRecovery: boolean("feature_theft_recovery").default(false),
  featureDriverAccountability: boolean("feature_driver_accountability").default(false),
  featureAiInsights: boolean("feature_ai_insights").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Property Management - Managed Properties
export const managedProperties = pgTable("managed_properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyManagerId: varchar("property_manager_id").notNull().references(() => users.id),
  propertyId: uuid("property_id").notNull().references(() => properties.id), // Can be reassigned to different managers over time
  managementStatus: varchar("management_status").default("ACTIVE"), // ACTIVE, INACTIVE
  masterQrCode: varchar("master_qr_code").notNull().unique(), // Required unique QR for this managed property
  
  // Geofence configuration for worker check-in validation
  geofenceCenter: jsonb("geofence_center").$type<{lat: number, lng: number}>(),
  geofenceRadiusMeters: decimal("geofence_radius_meters", { precision: 10, scale: 2 }).default("100"), // Default 100m radius
  geofenceManualOverrideAllowed: boolean("geofence_manual_override_allowed").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  propertyManagerIdx: index("idx_managed_properties_manager").on(table.propertyManagerId),
  managerPropertyUnique: uniqueIndex("uq_manager_property").on(table.propertyManagerId, table.propertyId),
}));

// Property Management - Workers
export const workers = pgTable("workers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").unique().references(() => users.id), // Optional but unique when set
  propertyManagerId: varchar("property_manager_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  phone: varchar("phone"),
  email: varchar("email"),
  role: varchar("role").notNull(), // MAINTENANCE, CLEANER, LANDSCAPER, INSPECTOR, HVAC_TECH, PLUMBER, ELECTRICIAN, etc.
  status: varchar("status").default("ACTIVE"), // ACTIVE, INACTIVE
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  propertyManagerIdx: index("idx_workers_manager").on(table.propertyManagerId),
  statusIdx: index("idx_workers_status").on(table.status),
}));

// Property Management - Tasks
export const propertyTasks = pgTable("property_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  managedPropertyId: uuid("managed_property_id").notNull().references(() => managedProperties.id),
  title: varchar("title").notNull(),
  description: text("description"),
  taskType: varchar("task_type").default("GENERAL"), // GENERAL, HVAC, PLUMBING, ELECTRICAL, CLEANING, LANDSCAPING, INSPECTION
  priority: varchar("priority").default("MEDIUM"), // LOW, MEDIUM, HIGH, URGENT
  status: varchar("status").default("PENDING"), // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  assignedTo: uuid("assigned_to").references(() => workers.id),
  dueDate: timestamp("due_date"),
  isRecurring: boolean("is_recurring").default(false),
  recurringFrequency: varchar("recurring_frequency"), // DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, ANNUALLY
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  propertyIdx: index("idx_tasks_property").on(table.managedPropertyId),
  assignedToIdx: index("idx_tasks_assigned").on(table.assignedTo),
  statusIdx: index("idx_tasks_status").on(table.status),
  dueDateIdx: index("idx_tasks_due_date").on(table.dueDate),
  propertyStatusIdx: index("idx_tasks_property_status").on(table.managedPropertyId, table.status),
}));

// Property Management - Task Completions
export const propertyTaskCompletions = pgTable("property_task_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => propertyTasks.id),
  visitId: uuid("visit_id").references(() => propertyVisits.id),
  completedBy: uuid("completed_by").notNull().references(() => workers.id),
  photoUrls: jsonb("photo_urls").$type<string[]>(),
  videoUrls: jsonb("video_urls").$type<string[]>(),
  notes: text("notes"),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
}, (table) => ({
  taskIdx: index("idx_task_completions_task").on(table.taskId),
  visitIdx: index("idx_task_completions_visit").on(table.visitId),
}));

// Property Management - Tenant Reports
export const tenantReports = pgTable("tenant_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  managedPropertyId: uuid("managed_property_id").notNull().references(() => managedProperties.id),
  reporterName: varchar("reporter_name"),
  reporterPhone: varchar("reporter_phone"),
  reporterEmail: varchar("reporter_email"),
  issueType: varchar("issue_type").notNull(), // MAINTENANCE, HVAC, PLUMBING, ELECTRICAL, APPLIANCE, PEST, SAFETY, OTHER
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  photoUrls: jsonb("photo_urls").$type<string[]>(),
  priority: varchar("priority").default("MEDIUM"), // LOW, MEDIUM, HIGH, URGENT
  status: varchar("status").default("PENDING"), // PENDING, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED
  assignedTo: uuid("assigned_to").references(() => workers.id),
  resolvedBy: uuid("resolved_by").references(() => workers.id),
  reportedAt: timestamp("reported_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => ({
  propertyIdx: index("idx_tenant_reports_property").on(table.managedPropertyId),
  statusIdx: index("idx_tenant_reports_status").on(table.status),
  reportedAtIdx: index("idx_tenant_reports_time").on(table.reportedAt),
}));

// Property Management - Visits (Authoritative check-in to check-out records)
export const propertyVisits = pgTable("property_visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  managedPropertyId: uuid("managed_property_id").notNull().references(() => managedProperties.id),
  workerId: uuid("worker_id").notNull().references(() => workers.id),
  
  // Check-in
  checkInAt: timestamp("check_in_at").notNull(),
  checkInLocation: jsonb("check_in_location").$type<{lat: number, lng: number, address?: string, verified: boolean}>(),
  checkInMethod: varchar("check_in_method").default("QR"), // QR, NFC, MANUAL
  
  // Check-out
  checkOutAt: timestamp("check_out_at"),
  checkOutLocation: jsonb("check_out_location").$type<{lat: number, lng: number, address?: string, verified: boolean}>(),
  checkOutMethod: varchar("check_out_method"), // QR, NFC, MANUAL
  
  // Visit summary
  tasksCompleted: integer("tasks_completed").default(0),
  visitSummary: text("visit_summary"),
  photoUrls: jsonb("photo_urls").$type<string[]>(),
  status: varchar("status").default("IN_PROGRESS"), // IN_PROGRESS, COMPLETED, ABANDONED
  completedAt: timestamp("completed_at"),
}, (table) => ({
  propertyIdx: index("idx_visits_property").on(table.managedPropertyId),
  workerIdx: index("idx_visits_worker").on(table.workerId),
  statusIdx: index("idx_visits_status").on(table.status),
  propertyStatusIdx: index("idx_visits_property_status").on(table.managedPropertyId, table.status),
}));

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  contractor: one(contractors, {
    fields: [users.id],
    references: [contractors.userId],
  }),
  properties: many(properties),
  inspections: many(inspections),
  subscriptions: many(subscriptions),
}));

export const contractorsRelations = relations(contractors, ({ one, many }) => ({
  user: one(users, {
    fields: [contractors.userId],
    references: [users.id],
  }),
  identifiers: many(identifiers),
  assets: many(assets),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(users, {
    fields: [properties.ownerId],
    references: [users.id],
  }),
  masterIdentifier: one(identifiers, {
    fields: [properties.masterIdentifierId],
    references: [identifiers.id],
  }),
  assets: many(assets),
  documents: many(documents),
  reminders: many(reminders),
  transfers: many(transfers),
  inspections: many(inspections),
}));

export const identifiersRelations = relations(identifiers, ({ one }) => ({
  contractor: one(contractors, {
    fields: [identifiers.contractorId],
    references: [contractors.id],
  }),
  asset: one(assets, {
    fields: [identifiers.id],
    references: [assets.identifierId],
  }),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  property: one(properties, {
    fields: [assets.propertyId],
    references: [properties.id],
  }),
  identifier: one(identifiers, {
    fields: [assets.identifierId],
    references: [identifiers.id],
  }),
  installer: one(contractors, {
    fields: [assets.installerId],
    references: [contractors.id],
  }),
  events: many(events),
  documents: many(documents),
  reminders: many(reminders),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  asset: one(assets, {
    fields: [events.assetId],
    references: [assets.id],
  }),
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  asset: one(assets, {
    fields: [documents.assetId],
    references: [assets.id],
  }),
  property: one(properties, {
    fields: [documents.propertyId],
    references: [properties.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
});

export const insertContractorSchema = createInsertSchema(contractors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIdentifierSchema = createInsertSchema(identifiers).omit({
  id: true,
  createdAt: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
});

export const insertInspectionSchema = createInsertSchema(inspections).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceSessionSchema = createInsertSchema(serviceSessions).omit({
  id: true,
  createdAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStickerOrderSchema = createInsertSchema(stickerOrders).omit({
  id: true,
  createdAt: true,
});

export const insertFleetIndustrySchema = createInsertSchema(fleetIndustries).omit({
  id: true,
  createdAt: true,
});

export const insertFleetAssetCategorySchema = createInsertSchema(fleetAssetCategories).omit({
  id: true,
  createdAt: true,
});

export const insertFleetOperatorSchema = createInsertSchema(fleetOperators).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFleetOperatorAssetSchema = createInsertSchema(fleetOperatorAssets).omit({
  id: true,
});

export const insertNotificationLogSchema = createInsertSchema(notificationLogs).omit({
  id: true,
  createdAt: true,
});

// Property Management Insert Schemas
export const insertManagedPropertySchema = createInsertSchema(managedProperties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkerSchema = createInsertSchema(workers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertyTaskSchema = createInsertSchema(propertyTasks).omit({
  id: true,
  createdAt: true,
});

export const insertPropertyTaskCompletionSchema = createInsertSchema(propertyTaskCompletions).omit({
  id: true,
});

export const insertTenantReportSchema = createInsertSchema(tenantReports).omit({
  id: true,
});

export const insertPropertyVisitSchema = createInsertSchema(propertyVisits).omit({
  id: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Contractor = typeof contractors.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Identifier = typeof identifiers.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type Transfer = typeof transfers.$inferSelect;
export type Inspection = typeof inspections.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type ServiceSession = typeof serviceSessions.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type StickerOrder = typeof stickerOrders.$inferSelect;
export type FleetIndustry = typeof fleetIndustries.$inferSelect;
export type FleetAssetCategory = typeof fleetAssetCategories.$inferSelect;
export type FleetOperator = typeof fleetOperators.$inferSelect;
export type FleetOperatorAsset = typeof fleetOperatorAssets.$inferSelect;
export type NotificationLog = typeof notificationLogs.$inferSelect;
export type ManagedProperty = typeof managedProperties.$inferSelect;
export type Worker = typeof workers.$inferSelect;
export type PropertyTask = typeof propertyTasks.$inferSelect;
export type PropertyTaskCompletion = typeof propertyTaskCompletions.$inferSelect;
export type TenantReport = typeof tenantReports.$inferSelect;
export type PropertyVisit = typeof propertyVisits.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertContractor = z.infer<typeof insertContractorSchema>;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type InsertIdentifier = z.infer<typeof insertIdentifierSchema>;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type InsertServiceSession = z.infer<typeof insertServiceSessionSchema>;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type InsertStickerOrder = z.infer<typeof insertStickerOrderSchema>;
export type InsertFleetIndustry = z.infer<typeof insertFleetIndustrySchema>;
export type InsertFleetAssetCategory = z.infer<typeof insertFleetAssetCategorySchema>;
export type InsertFleetOperator = z.infer<typeof insertFleetOperatorSchema>;
export type InsertFleetOperatorAsset = z.infer<typeof insertFleetOperatorAssetSchema>;
export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;
export type InsertManagedProperty = z.infer<typeof insertManagedPropertySchema>;
export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type InsertPropertyTask = z.infer<typeof insertPropertyTaskSchema>;
export type InsertPropertyTaskCompletion = z.infer<typeof insertPropertyTaskCompletionSchema>;
export type InsertTenantReport = z.infer<typeof insertTenantReportSchema>;
export type InsertPropertyVisit = z.infer<typeof insertPropertyVisitSchema>;
