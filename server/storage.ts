import {
  users,
  contractors,
  properties,
  identifiers,
  assets,
  events,
  documents,
  reminders,
  transfers,
  inspections,
  subscriptions,
  type User,
  type UpsertUser,
  type Contractor,
  type Property,
  type Identifier,
  type Asset,
  type Event,
  type Document,
  type Reminder,
  type Transfer,
  type Inspection,
  type Subscription,
  type InsertContractor,
  type InsertProperty,
  type InsertIdentifier,
  type InsertAsset,
  type InsertEvent,
  type InsertDocument,
  type InsertReminder,
  type InsertInspection,
  type InsertSubscription,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, lte, count } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User>;

  // Contractor operations
  getContractor(userId: string): Promise<Contractor | undefined>;
  createContractor(contractor: InsertContractor): Promise<Contractor>;
  updateContractor(id: string, updates: Partial<InsertContractor>): Promise<Contractor>;

  // Property operations
  getProperties(ownerId: string): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  getPropertyByName(name: string, ownerId: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property>;

  // Identifier operations
  getIdentifier(code: string): Promise<Identifier | undefined>;
  getIdentifierById(id: string): Promise<Identifier | undefined>;
  createIdentifiers(identifiers: InsertIdentifier[]): Promise<Identifier[]>;
  updateIdentifier(id: string, updates: Partial<InsertIdentifier>): Promise<Identifier>;
  getContractorIdentifiers(contractorId: string): Promise<Identifier[]>;

  // Asset operations
  getAssets(propertyId: string): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset | undefined>;
  getAssetWithDetails(id: string): Promise<Asset & { events: Event[], documents: Document[], reminders: Reminder[] } | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: string, updates: Partial<InsertAsset>): Promise<Asset>;

  // Event operations
  getAssetEvents(assetId: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;

  // Document operations
  getAssetDocuments(assetId: string): Promise<Document[]>;
  getPropertyDocuments(propertyId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;

  // Reminder operations
  getDueReminders(): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder>;

  // Inspection operations
  getPropertyInspections(propertyId: string): Promise<Inspection[]>;
  createInspection(inspection: InsertInspection): Promise<Inspection>;

  // Subscription operations
  getUserSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, updates: Partial<InsertSubscription>): Promise<Subscription>;

  // Dashboard statistics
  getDashboardStats(userId: string): Promise<{
    activeAssets: number;
    qrCodesGenerated: number;
    propertiesManaged: number;
    activeSubscriptions: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Contractor operations
  async getContractor(userId: string): Promise<Contractor | undefined> {
    const [contractor] = await db.select().from(contractors).where(eq(contractors.userId, userId));
    return contractor;
  }

  async createContractor(contractor: InsertContractor): Promise<Contractor> {
    const [created] = await db.insert(contractors).values(contractor).returning();
    return created;
  }

  async updateContractor(id: string, updates: Partial<InsertContractor>): Promise<Contractor> {
    const [updated] = await db
      .update(contractors)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contractors.id, id))
      .returning();
    return updated;
  }

  // Property operations
  async getProperties(ownerId: string): Promise<Property[]> {
    return await db.select().from(properties).where(eq(properties.ownerId, ownerId));
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async getPropertyByName(name: string, ownerId: string): Promise<Property | undefined> {
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.name, name), eq(properties.ownerId, ownerId)));
    return property;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [created] = await db.insert(properties).values(property).returning();
    return created;
  }

  async updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property> {
    const [updated] = await db
      .update(properties)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return updated;
  }

  // Identifier operations
  async getIdentifier(code: string): Promise<Identifier | undefined> {
    const [identifier] = await db.select().from(identifiers).where(eq(identifiers.code, code));
    return identifier;
  }

  async getIdentifierById(id: string): Promise<Identifier | undefined> {
    const [identifier] = await db.select().from(identifiers).where(eq(identifiers.id, id));
    return identifier;
  }

  async createIdentifiers(identifierList: InsertIdentifier[]): Promise<Identifier[]> {
    return await db.insert(identifiers).values(identifierList).returning();
  }

  async updateIdentifier(id: string, updates: Partial<InsertIdentifier>): Promise<Identifier> {
    const [updated] = await db
      .update(identifiers)
      .set(updates)
      .where(eq(identifiers.id, id))
      .returning();
    return updated;
  }

  async getContractorIdentifiers(contractorId: string): Promise<Identifier[]> {
    return await db
      .select()
      .from(identifiers)
      .where(eq(identifiers.contractorId, contractorId))
      .orderBy(desc(identifiers.createdAt));
  }

  // Asset operations
  async getAssets(propertyId: string): Promise<Asset[]> {
    return await db
      .select()
      .from(assets)
      .where(eq(assets.propertyId, propertyId))
      .orderBy(desc(assets.createdAt));
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset;
  }

  async getAssetWithDetails(id: string): Promise<Asset & { events: Event[], documents: Document[], reminders: Reminder[] } | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    if (!asset) return undefined;

    const assetEvents = await this.getAssetEvents(id);
    const assetDocuments = await this.getAssetDocuments(id);
    const assetReminders = await db.select().from(reminders).where(eq(reminders.assetId, id));

    return {
      ...asset,
      events: assetEvents,
      documents: assetDocuments,
      reminders: assetReminders,
    };
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [created] = await db.insert(assets).values(asset).returning();
    return created;
  }

  async updateAsset(id: string, updates: Partial<InsertAsset>): Promise<Asset> {
    const [updated] = await db
      .update(assets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();
    return updated;
  }

  // Event operations
  async getAssetEvents(assetId: string): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(eq(events.assetId, assetId))
      .orderBy(desc(events.createdAt));
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }

  // Document operations
  async getAssetDocuments(assetId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.assetId, assetId))
      .orderBy(desc(documents.uploadedAt));
  }

  async getPropertyDocuments(propertyId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.propertyId, propertyId))
      .orderBy(desc(documents.uploadedAt));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(document).returning();
    return created;
  }

  // Reminder operations
  async getDueReminders(): Promise<Reminder[]> {
    const now = new Date();
    return await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.status, "PENDING"), lte(reminders.dueAt, now)));
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [created] = await db.insert(reminders).values(reminder).returning();
    return created;
  }

  async updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder> {
    const [updated] = await db
      .update(reminders)
      .set(updates)
      .where(eq(reminders.id, id))
      .returning();
    return updated;
  }

  // Inspection operations
  async getPropertyInspections(propertyId: string): Promise<Inspection[]> {
    return await db
      .select()
      .from(inspections)
      .where(eq(inspections.propertyId, propertyId))
      .orderBy(desc(inspections.createdAt));
  }

  async createInspection(inspection: InsertInspection): Promise<Inspection> {
    const [created] = await db.insert(inspections).values(inspection).returning();
    return created;
  }

  // Subscription operations
  async getUserSubscription(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt));
    return subscription;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [created] = await db.insert(subscriptions).values(subscription).returning();
    return created;
  }

  async updateSubscription(id: string, updates: Partial<InsertSubscription>): Promise<Subscription> {
    const [updated] = await db
      .update(subscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return updated;
  }

  // Dashboard statistics
  async getDashboardStats(userId: string): Promise<{
    activeAssets: number;
    qrCodesGenerated: number;
    propertiesManaged: number;
    activeSubscriptions: number;
  }> {
    // Get user's properties
    const userProperties = await this.getProperties(userId);
    const propertyIds = userProperties.map(p => p.id);

    // Count active assets across all properties
    const [activeAssetsResult] = await db
      .select({ count: count() })
      .from(assets)
      .where(eq(assets.status, "ACTIVE"));

    // Get contractor info to count QR codes
    const contractor = await this.getContractor(userId);
    let qrCodesGenerated = 0;
    if (contractor) {
      const [qrResult] = await db
        .select({ count: count() })
        .from(identifiers)
        .where(eq(identifiers.contractorId, contractor.id));
      qrCodesGenerated = qrResult.count;
    }

    // Count user's active subscriptions
    const [subscriptionsResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));

    return {
      activeAssets: activeAssetsResult.count,
      qrCodesGenerated,
      propertiesManaged: userProperties.length,
      activeSubscriptions: subscriptionsResult.count,
    };
  }
}

export const storage = new DatabaseStorage();
