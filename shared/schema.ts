import { sql } from 'drizzle-orm';
import {
  index,
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
  role: varchar("role").default("HOMEOWNER"), // HOMEOWNER, CONTRACTOR, FLEET, INSPECTOR, ADMIN
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contractor profiles
export const contractors = pgTable("contractors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyName: varchar("company_name").notNull(),
  logoUrl: varchar("logo_url"),
  phone: varchar("phone"),
  email: varchar("email"),
  website: varchar("website"),
  licenseNumber: varchar("license_number"),
  plan: varchar("plan"), // contractor_starter, contractor_pro
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
  masterIdentifierId: uuid("master_identifier_id").references(() => identifiers.id),
  homePlan: varchar("home_plan"), // home_lifetime, home_annual
  homeStatus: varchar("home_status").default("ACTIVE"),
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
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // PLUMBING, ELECTRICAL, HVAC, APPLIANCE, etc.
  brand: varchar("brand"),
  model: varchar("model"),
  serial: varchar("serial"),
  installedAt: timestamp("installed_at"),
  identifierId: uuid("identifier_id").unique().references(() => identifiers.id),
  installerId: uuid("installer_id").references(() => contractors.id),
  status: varchar("status").default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  type: varchar("type").notNull(), // RECEIPT, WARRANTY, MANUAL, INSPECTION, etc.
  title: varchar("title").notNull(),
  path: varchar("path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Reminders
export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id").references(() => assets.id),
  propertyId: uuid("property_id").references(() => properties.id),
  dueAt: timestamp("due_at").notNull(),
  type: varchar("type").notNull(),
  status: varchar("status").default("PENDING"),
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
  featureRealtimeTracking: boolean("feature_realtime_tracking").default(false),
  featureTheftRecovery: boolean("feature_theft_recovery").default(false),
  featureDriverAccountability: boolean("feature_driver_accountability").default(false),
  featureAiInsights: boolean("feature_ai_insights").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
