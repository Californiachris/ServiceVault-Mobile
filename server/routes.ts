import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, desc, count, and, lte, asc, isNull, inArray, sql, or } from "drizzle-orm";
import { users, subscriptions, assets, documents, inspections, events, reminders, jobs, fleetIndustries, fleetAssetCategories, fleetOperators, properties, identifiers, contractors, transfers, serviceSessions, notificationLogs, stickerOrders, fleetOperatorAssets, managedProperties, workers, propertyTasks, propertyVisits, tenantReports, propertyTaskCompletions, logoPayments } from "@shared/schema";
import { setupAuth, isAuthenticated, requireRole } from "./replitAuth";
import { attachEntitlements, requireEntitlement } from './entitlements/middleware';
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import Stripe from "stripe";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { WebSocketServer, WebSocket } from "ws";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not set - Stripe functionality will be disabled');
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
}) : null;

// Utility function to generate QR codes
function generateCode(type: 'ASSET' | 'MASTER', length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = type === 'ASSET' ? 'A-' : 'M-';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

import { seedFleetData } from "./seedFleetData";
// Demo data seeding disabled - users create their own data
// import { seedDemoData } from "./seedDemoData";
import { parseWarrantyDocument } from "./openaiClient";
import { NotificationService } from "./notifications";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Attach entitlements to all authenticated requests
  app.use(attachEntitlements);

  // Dev-only role override middleware
  app.use((req: any, res, next) => {
    if (process.env.NODE_ENV === 'development' && req.headers['x-dev-role-override']) {
      const overrideRole = req.headers['x-dev-role-override'] as string;
      if (['HOMEOWNER', 'CONTRACTOR', 'FLEET'].includes(overrideRole)) {
        req.devRoleOverride = overrideRole;
      }
    }
    next();
  });

  // Seed fleet data on startup (idempotent)
  seedFleetData().catch(err => console.error("Fleet data seeding error:", err));

  // Check if object storage is configured
  const hasObjectStorage = !!(process.env.PUBLIC_OBJECT_SEARCH_PATHS && process.env.PRIVATE_OBJECT_DIR);
  if (!hasObjectStorage) {
    console.warn('Object Storage not configured - file upload/download features will be disabled');
  }
  
  // Initialize object storage service (only if configured)
  const objectStorageService = hasObjectStorage ? new ObjectStorageService() : null;
  
  // Initialize notification service
  const notificationService = new NotificationService(storage);
  
  // Check if OpenAI is configured
  const hasOpenAI = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
  if (!hasOpenAI) {
    console.warn('OpenAI not configured - AI warranty parsing will be disabled');
  }

  // Auth tier selection endpoint (stores tier in session before login redirect)
  app.post('/api/auth/selection', (req: any, res) => {
    const { tier } = req.body;
    if (tier) {
      req.session.selectedTier = tier;
    }
    res.json({ success: true });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Entitlements endpoint - returns user's subscription features and limits
  app.get('/api/entitlements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { getUserEntitlements } = await import('./entitlements/service');
      const entitlements = await getUserEntitlements(userId);
      res.json(entitlements);
    } catch (error) {
      console.error("Error fetching entitlements:", error);
      res.status(500).json({ message: "Failed to fetch entitlements" });
    }
  });

  // Subscription status endpoint
  app.get('/api/subscription/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has an active subscription with family branding
      let featureFamilyBranding = false;
      
      if (user.stripeSubscriptionId) {
        const subscription = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubId, user.stripeSubscriptionId))
          .limit(1);
        
        if (subscription.length > 0) {
          featureFamilyBranding = subscription[0].featureFamilyBranding || false;
        }
      }

      res.json({
        featureFamilyBranding,
        familyName: user.familyName,
        familyLogoUrl: user.familyLogoUrl,
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // Get user onboarding preferences for dashboard tab generation
  app.get('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user's onboarding selections for dynamic dashboard tabs
      res.json({
        role: user.role,
        propertyTypes: user.propertyTypes || [],
        industries: user.industries || [],
        // For contractors, get specialties from contractor profile
        specialties: user.role === 'CONTRACTOR' 
          ? (await db.select().from(contractors).where(eq(contractors.userId, userId)).limit(1))[0]?.specialties || []
          : [],
      });
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  // Get fleet industry taxonomy (industries with their asset categories)
  app.get('/api/fleet/taxonomy', async (req, res) => {
    try {
      const industries = await db
        .select()
        .from(fleetIndustries)
        .orderBy(fleetIndustries.displayOrder);

      const taxonomy = await Promise.all(
        industries.map(async (industry) => {
          const categories = await db
            .select()
            .from(fleetAssetCategories)
            .where(eq(fleetAssetCategories.industryId, industry.id));

          return {
            ...industry,
            categories,
          };
        })
      );

      res.json(taxonomy);
    } catch (error) {
      console.error("Error fetching fleet taxonomy:", error);
      res.status(500).json({ message: "Failed to fetch taxonomy" });
    }
  });

  // Update user family branding
  app.patch('/api/user/family-branding', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { familyName, familyLogoUrl } = req.body;

      if (!familyName || typeof familyName !== 'string') {
        return res.status(400).json({ error: "Family name is required" });
      }

      // If logo URL provided, set ACL to make it publicly readable
      if (familyLogoUrl && objectStorageService) {
        try {
          await objectStorageService.trySetObjectEntityAclPolicy(familyLogoUrl, {
            owner: userId,
            visibility: "public",
          });
        } catch (error) {
          console.error("Error setting ACL for family logo:", error);
          // Continue anyway - logo might still work
        }
      }

      await db
        .update(users)
        .set({
          familyName: familyName.trim(),
          familyLogoUrl: familyLogoUrl || null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating family branding:", error);
      res.status(500).json({ error: "Failed to update family branding" });
    }
  });

  // Update contractor branding
  app.patch('/api/contractors/me', isAuthenticated, requireRole('CONTRACTOR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get contractor profile
      const contractor = await storage.getContractor(userId);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor profile not found" });
      }

      const { companyName, logoUrl } = req.body;
      const updates: any = {};

      if (companyName) {
        updates.companyName = companyName.trim();
      }
      
      if (logoUrl) {
        updates.logoUrl = logoUrl;
        
        // Set ACL to make logo publicly readable
        if (objectStorageService) {
          try {
            await objectStorageService.trySetObjectEntityAclPolicy(logoUrl, {
              owner: userId,
              visibility: "public",
            });
          } catch (error) {
            console.error("Error setting ACL for contractor logo:", error);
            // Continue anyway - logo might still work
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        await storage.updateContractor(contractor.id, updates);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating contractor branding:", error);
      res.status(500).json({ error: "Failed to update contractor branding" });
    }
  });

  // Update user notification settings
  app.patch('/api/user/notification-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { phone, notificationPreference } = req.body;

      const validPreferences = ['EMAIL_ONLY', 'SMS_ONLY', 'EMAIL_AND_SMS', 'NONE'];
      if (notificationPreference && !validPreferences.includes(notificationPreference)) {
        return res.status(400).json({ error: "Invalid notification preference" });
      }

      // Validate phone format if provided (basic E.164 format check)
      if (phone && phone.trim()) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
          return res.status(400).json({ 
            error: "Invalid phone number format. Please use international format (e.g., +1234567890)" 
          });
        }
      }

      // Enforce phone requirement for SMS preferences
      const requiresPhone = notificationPreference === 'SMS_ONLY' || notificationPreference === 'EMAIL_AND_SMS';
      if (requiresPhone && (!phone || !phone.trim())) {
        return res.status(400).json({ 
          error: "Phone number is required for SMS notifications" 
        });
      }

      const updates: any = { updatedAt: new Date() };
      if (phone !== undefined) {
        // Normalize phone: remove spaces, dashes, parentheses
        updates.phone = phone && phone.trim() ? phone.replace(/[\s\-\(\)]/g, '') : null;
      }
      if (notificationPreference) {
        updates.notificationPreference = notificationPreference;
      }

      await db
        .update(users)
        .set(updates)
        .where(eq(users.id, userId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ error: "Failed to update notification settings" });
    }
  });

  // Role-specific dashboard endpoints
  app.get('/api/dashboard/homeowner', isAuthenticated, requireRole('HOMEOWNER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const properties = await storage.getProperties(userId);
      const subscription = await storage.getUserSubscription(userId);
      
      // Get counts and all documents
      let totalAssets = 0;
      let allDocuments: any[] = [];
      for (const property of properties) {
        const propertyAssets = await storage.getAssets(property.id);
        totalAssets += propertyAssets.length;
        const docs = await storage.getPropertyDocuments(property.id);
        allDocuments = allDocuments.concat(docs);
      }

      // Calculate warranty alerts
      const now = new Date();
      const warrantyDocs = allDocuments.filter((doc: any) => doc.type === 'WARRANTY' && doc.expiryDate);
      const warrantyAlerts = warrantyDocs
        .map((doc: any) => {
          const expiryDate = new Date(doc.expiryDate);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          let urgency = 'GREEN';
          if (daysUntilExpiry < 30) urgency = 'RED';
          else if (daysUntilExpiry < 90) urgency = 'YELLOW';
          
          return {
            ...doc,
            daysUntilExpiry,
            urgency,
          };
        })
        .sort((a: any, b: any) => a.daysUntilExpiry - b.daysUntilExpiry)
        .slice(0, 5);

      // Get recent uploads
      const recentDocuments = allDocuments
        .sort((a: any, b: any) => {
          const dateA = new Date(a.uploadedAt || a.createdAt).getTime();
          const dateB = new Date(b.uploadedAt || b.createdAt).getTime();
          return dateB - dateA;
        })
        .slice(0, 5);

      // Enrich reminders with urgency
      const rawReminders = await db
        .select()
        .from(reminders)
        .where(eq(reminders.createdBy, userId))
        .orderBy(asc(reminders.dueAt))
        .limit(5);

      const enrichedReminders = rawReminders.map((reminder: any) => {
        const dueDate = new Date(reminder.dueAt);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let urgency = 'GREEN';
        if (daysUntilDue < 30) urgency = 'RED';
        else if (daysUntilDue < 90) urgency = 'YELLOW';
        
        return {
          ...reminder,
          daysUntilDue,
          urgency,
        };
      });

      res.json({
        properties,
        totalAssets,
        documentsCount: allDocuments.length,
        warrantyAlerts,
        recentDocuments,
        upcomingReminders: enrichedReminders,
        subscription: subscription || null,
      });
    } catch (error) {
      console.error("Error fetching homeowner dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  app.get('/api/dashboard/contractor', isAuthenticated, requireRole('CONTRACTOR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const contractor = await storage.getContractor(userId);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor profile not found" });
      }

      const subscription = await storage.getUserSubscription(userId);
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const previous60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      
      // Get jobs statistics using SQL (OPTIMIZED FOR SCALE)
      const [{ count: pendingJobs }] = await db
        .select({ count: count() })
        .from(jobs)
        .where(and(eq(jobs.contractorId, contractor.id), eq(jobs.status, 'PENDING')));
      
      const [{ count: scheduledJobs }] = await db
        .select({ count: count() })
        .from(jobs)
        .where(and(eq(jobs.contractorId, contractor.id), eq(jobs.status, 'SCHEDULED')));
      
      const [{ count: completedJobs }] = await db
        .select({ count: count() })
        .from(jobs)
        .where(and(eq(jobs.contractorId, contractor.id), eq(jobs.status, 'COMPLETED')));
      
      // Calculate total revenue using SQL aggregation
      const [{ total: totalRevenueResult }] = await db
        .select({ total: sql<string>`COALESCE(SUM(CAST(${jobs.revenue} AS DECIMAL)), 0)` })
        .from(jobs)
        .where(eq(jobs.contractorId, contractor.id));
      const totalRevenue = parseFloat(totalRevenueResult || '0');
      
      // Calculate revenue trends using SQL (last 30 days vs previous 30 days)
      const [{ total: recentRevenueResult }] = await db
        .select({ total: sql<string>`COALESCE(SUM(CAST(${jobs.revenue} AS DECIMAL)), 0)` })
        .from(jobs)
        .where(and(
          eq(jobs.contractorId, contractor.id),
          sql`${jobs.createdAt} >= ${last30Days}`
        ));
      const recentRevenue = parseFloat(recentRevenueResult || '0');
      
      const [{ total: previousRevenueResult }] = await db
        .select({ total: sql<string>`COALESCE(SUM(CAST(${jobs.revenue} AS DECIMAL)), 0)` })
        .from(jobs)
        .where(and(
          eq(jobs.contractorId, contractor.id),
          sql`${jobs.createdAt} >= ${previous60Days}`,
          sql`${jobs.createdAt} < ${last30Days}`
        ));
      const previousRevenue = parseFloat(previousRevenueResult || '0');
      
      const revenueDelta = recentRevenue - previousRevenue;
      const revenueDeltaPct = previousRevenue > 0 ? (revenueDelta / previousRevenue) * 100 : 0;
      const trend = revenueDelta > 0 ? 'UP' : revenueDelta < 0 ? 'DOWN' : 'FLAT';

      // Get recent jobs (only 10, not all)
      const recentJobs = await db
        .select()
        .from(jobs)
        .where(eq(jobs.contractorId, contractor.id))
        .orderBy(desc(jobs.createdAt))
        .limit(10);

      // Get quota usage and check if low
      const quotaTotal = subscription?.quotaTotal || 0;
      const quotaUsed = subscription?.quotaUsed || 0;
      const quotaRemaining = quotaTotal - quotaUsed;
      const isQuotaLow = quotaRemaining < 10;

      // Get service opportunities: assets installed by this contractor with expiring warranties
      const installedAssets = await db
        .select()
        .from(assets)
        .where(eq(assets.installerId, contractor.id));
      
      const uniquePropertyIds = Array.from(new Set(installedAssets.map(a => a.propertyId).filter(Boolean)));

      // Get warranty documents for all client assets
      const serviceAlerts: any[] = [];
      for (const asset of installedAssets) {
        if (!asset.id) continue;
        
        const assetDocs = await storage.getAssetDocuments(asset.id);
        const warrantyDocs = assetDocs.filter((doc: any) => doc.type === 'WARRANTY' && doc.expiryDate);
        
        for (const doc of warrantyDocs) {
          if (!doc.expiryDate) continue;
          const expiryDate = new Date(doc.expiryDate);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          let urgency = 'GREEN';
          if (daysUntilExpiry < 30) urgency = 'RED';
          else if (daysUntilExpiry < 90) urgency = 'YELLOW';
          
          if (urgency !== 'GREEN') {
            serviceAlerts.push({
              assetId: asset.id,
              assetName: asset.name,
              propertyId: asset.propertyId,
              documentId: doc.id,
              documentName: doc.title,
              expiryDate: doc.expiryDate,
              daysUntilExpiry,
              urgency,
            });
          }
        }
      }
      
      serviceAlerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

      // Get total job count
      const [{ count: totalJobCount }] = await db
        .select({ count: count() })
        .from(jobs)
        .where(eq(jobs.contractorId, contractor.id));

      res.json({
        contractor,
        jobs: {
          pending: pendingJobs,
          scheduled: scheduledJobs,
          completed: completedJobs,
          total: totalJobCount,
          recent: recentJobs,
        },
        revenue: totalRevenue,
        revenueStats: {
          current: recentRevenue,
          previous: previousRevenue,
          delta: revenueDelta,
          deltaPct: revenueDeltaPct,
          trend,
        },
        serviceAlerts: serviceAlerts.slice(0, 10),
        quota: {
          total: quotaTotal,
          used: quotaUsed,
          remaining: quotaRemaining,
          isQuotaLow,
        },
        clientCount: uniquePropertyIds.length,
        subscription: subscription || null,
      });
    } catch (error) {
      console.error("Error fetching contractor dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  app.get('/api/dashboard/fleet', isAuthenticated, requireRole('FLEET'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const now = new Date();

      // Get all fleet industries (public reference data)
      const industries = await db.select().from(fleetIndustries).orderBy(asc(fleetIndustries.displayOrder));
      
      // Get fleet assets created by this user only
      const userAssets = await db
        .select()
        .from(assets)
        .innerJoin(events, eq(assets.id, events.assetId))
        .where(
          and(
            isNull(assets.propertyId),
            eq(events.createdBy, userId)
          )
        );
      
      // Extract unique assets (join might create duplicates)
      const fleetAssets = Array.from(
        new Map(userAssets.map(ua => [ua.assets.id, ua.assets])).values()
      );
      
      // Group assets by industry
      const assetsByIndustry: any = {};
      for (const asset of fleetAssets) {
        if (asset.fleetIndustryId) {
          if (!assetsByIndustry[asset.fleetIndustryId]) {
            assetsByIndustry[asset.fleetIndustryId] = [];
          }
          assetsByIndustry[asset.fleetIndustryId].push(asset);
        }
      }

      // Get operators for this user's fleet
      const operators = await db
        .select()
        .from(fleetOperators)
        .where(eq(fleetOperators.fleetUserId, userId));

      // Get operator assignments
      const operatorAssignments = await db
        .select()
        .from(fleetOperatorAssets)
        .innerJoin(fleetOperators, eq(fleetOperatorAssets.operatorId, fleetOperators.id))
        .where(eq(fleetOperators.fleetUserId, userId));

      const assignedAssetIds = new Set(operatorAssignments.map(oa => oa.fleet_operator_assets.assetId));

      // Calculate utilization
      const activeAssets = fleetAssets.filter(a => a.status === 'ACTIVE');
      const maintenanceAssets = fleetAssets.filter(a => a.status === 'MAINTENANCE');
      const deployedAssets = activeAssets.filter(a => assignedAssetIds.has(a.id || ''));
      const idleAssets = activeAssets.filter(a => !assignedAssetIds.has(a.id || ''));
      const utilizationPercent = activeAssets.length > 0 
        ? Math.round((deployedAssets.length / activeAssets.length) * 100) 
        : 0;

      // Get unassigned assets
      const unassignedAssets = idleAssets.map(a => ({
        id: a.id,
        name: a.name,
        industryId: a.fleetIndustryId,
        categoryId: a.fleetCategoryId,
      }));

      // Get all maintenance reminders
      const allReminders = await db
        .select()
        .from(reminders)
        .where(
          and(
            eq(reminders.createdBy, userId),
            eq(reminders.status, 'PENDING')
          )
        )
        .orderBy(asc(reminders.dueAt));

      // Categorize maintenance by urgency
      const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const overdueReminders = allReminders
        .filter(r => r.dueAt && r.dueAt < now)
        .map(r => {
          const daysLate = Math.ceil((now.getTime() - r.dueAt!.getTime()) / (1000 * 60 * 60 * 24));
          return { ...r, daysLate, urgency: 'RED' as const };
        });

      const upcomingReminders = allReminders
        .filter(r => r.dueAt && r.dueAt >= now && r.dueAt <= next30Days)
        .map(r => {
          const daysUntil = Math.ceil((r.dueAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return { ...r, daysUntil, urgency: 'YELLOW' as const };
        });

      const futureReminders = allReminders
        .filter(r => r.dueAt && r.dueAt > next30Days && r.dueAt <= next90Days)
        .map(r => {
          const daysUntil = Math.ceil((r.dueAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return { ...r, daysUntil, urgency: 'GREEN' as const };
        });

      // Create calendar items from reminders
      const calendarItems = allReminders
        .filter(r => r.dueAt && r.dueAt <= next90Days)
        .map(r => {
          const daysUntil = r.dueAt ? Math.ceil((r.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          let urgency = 'GREEN';
          if (r.dueAt && r.dueAt < now) urgency = 'RED';
          else if (daysUntil <= 30) urgency = 'YELLOW';
          
          return {
            id: r.id,
            title: r.title,
            start: r.dueAt,
            assetId: r.assetId,
            description: r.description,
            urgency,
          };
        });

      res.json({
        industries,
        totalAssets: fleetAssets.length,
        assetsByIndustry,
        maintenance: {
          overdue: overdueReminders.slice(0, 10),
          upcoming: upcomingReminders.slice(0, 10),
          future: futureReminders.slice(0, 10),
        },
        utilization: {
          deployed: deployedAssets.length,
          idle: idleAssets.length,
          maintenance: maintenanceAssets.length,
          percent: utilizationPercent,
        },
        operators: {
          total: operators.length,
          unassignedAssets: unassignedAssets.slice(0, 20),
          available: operators.filter(o => o.status === 'ACTIVE'),
        },
        calendar: {
          items: calendarItems,
          lastUpdated: now.toISOString(),
        },
      });
    } catch (error) {
      console.error("Error fetching fleet dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Object storage routes for file uploads (only if configured)
  if (hasObjectStorage && objectStorageService) {
    app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
      const userId = req.user?.claims?.sub;
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(req.path);
        const canAccess = await objectStorageService.canAccessObjectEntity({
          objectFile,
          userId: userId,
          requestedPermission: ObjectPermission.READ,
        });
        if (!canAccess) {
          return res.sendStatus(401);
        }
        objectStorageService.downloadObject(objectFile, res);
      } catch (error) {
        console.error("Error checking object access:", error);
        if (error instanceof ObjectNotFoundError) {
          return res.sendStatus(404);
        }
        return res.sendStatus(500);
      }
    });

    app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
      try {
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        
        // Extract the object ID from the URL to construct the object path
        // URL format: https://storage.googleapis.com/.../BUCKET/PRIVATE_DIR/uploads/UUID?...
        const urlParts = uploadURL.split('/');
        const objectIdIndex = urlParts.findIndex(part => part === 'uploads') + 1;
        const objectIdWithQuery = urlParts[objectIdIndex];
        const objectId = objectIdWithQuery ? objectIdWithQuery.split('?')[0] : randomUUID();
        
        // Construct the object path that will be used to retrieve the file
        // getObjectEntityFile expects /objects/{entityId} where entityId is appended to privateDir
        // Since upload creates privateDir/uploads/{uuid}, entityId should be "uploads/{uuid}"
        const objectPath = `/objects/uploads/${objectId}`;
        
        res.json({ uploadURL, objectPath });
      } catch (error) {
        console.error("Error getting upload URL:", error);
        res.status(500).json({ error: "Failed to get upload URL" });
      }
    });

    // Get upload URL for family branding logos
    app.post('/api/upload/branding', isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        
        // Use the existing upload URL method - it creates path like /PRIVATE_DIR/uploads/{uuid}
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        
        // Extract the object ID from the URL to construct the object path
        // URL format: https://storage.googleapis.com/.../BUCKET/PRIVATE_DIR/uploads/UUID?...
        const urlParts = uploadURL.split('/');
        const objectIdIndex = urlParts.findIndex(part => part === 'uploads') + 1;
        const objectIdWithQuery = urlParts[objectIdIndex];
        const objectId = objectIdWithQuery ? objectIdWithQuery.split('?')[0] : randomUUID();
        
        // Construct the object path that will be used to retrieve the file
        // getObjectEntityFile expects /objects/{entityId} where entityId is appended to privateDir
        // Since upload creates privateDir/uploads/{uuid}, entityId should be "uploads/{uuid}"
        const objectPath = `/objects/uploads/${objectId}`;
        
        res.json({ 
          uploadURL, 
          objectPath
        });
      } catch (error) {
        console.error("Error getting upload URL:", error);
        res.status(500).json({ error: "Failed to get upload URL" });
      }
    });
  } else {
    // Fallback routes when object storage is not configured
    app.get("/objects/:objectPath(*)", isAuthenticated, (req, res) => {
      res.status(503).json({ 
        error: "File storage is currently unavailable. Please contact support@servicevault.app.",
        service: "object_storage",
        configured: false
      });
    });

    app.post("/api/objects/upload", isAuthenticated, (req, res) => {
      res.status(503).json({ 
        error: "File upload is currently unavailable. Please contact support@servicevault.app.",
        service: "object_storage",
        configured: false
      });
    });

    app.post('/api/upload/branding', isAuthenticated, (req, res) => {
      res.status(503).json({ 
        error: "File upload is currently unavailable. Please contact support@servicevault.app.",
        service: "object_storage",
        configured: false
      });
    });
  }

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Property Manager dashboard stats
  app.get('/api/dashboard/property-manager', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Parallel fetch all data
      const [
        managedPropertiesData,
        workersData,
        allTasks,
        allReports,
        recentVisits,
      ] = await Promise.all([
        // Get all managed properties
        db.select({
          id: managedProperties.id,
          managedPropertyId: managedProperties.id,
          propertyId: managedProperties.propertyId,
          managementStatus: managedProperties.managementStatus,
          masterQrCode: managedProperties.masterQrCode,
          createdAt: managedProperties.createdAt,
          property: properties,
        })
        .from(managedProperties)
        .innerJoin(properties, eq(managedProperties.propertyId, properties.id))
        .where(eq(managedProperties.propertyManagerId, userId))
        .orderBy(desc(managedProperties.createdAt)),
        
        // Get all workers
        db.select()
        .from(workers)
        .where(eq(workers.propertyManagerId, userId))
        .orderBy(desc(workers.createdAt)),
        
        // Get all tasks with property details
        db.select({
          task: propertyTasks,
          property: {
            id: managedProperties.id,
            managedPropertyId: managedProperties.id,
            property: properties,
          },
        })
        .from(propertyTasks)
        .innerJoin(managedProperties, eq(propertyTasks.managedPropertyId, managedProperties.id))
        .innerJoin(properties, eq(managedProperties.propertyId, properties.id))
        .where(eq(managedProperties.propertyManagerId, userId))
        .orderBy(desc(propertyTasks.createdAt)),
        
        // Get all tenant reports with property details
        db.select({
          report: tenantReports,
          property: {
            id: managedProperties.id,
            managedPropertyId: managedProperties.id,
            property: properties,
          },
        })
        .from(tenantReports)
        .innerJoin(managedProperties, eq(tenantReports.managedPropertyId, managedProperties.id))
        .innerJoin(properties, eq(managedProperties.propertyId, properties.id))
        .where(eq(managedProperties.propertyManagerId, userId))
        .orderBy(desc(tenantReports.reportedAt)),
        
        // Get recent visits with property details
        db.select({
          visit: propertyVisits,
          property: {
            id: managedProperties.id,
            managedPropertyId: managedProperties.id,
            property: properties,
          },
          worker: workers,
        })
        .from(propertyVisits)
        .innerJoin(managedProperties, eq(propertyVisits.managedPropertyId, managedProperties.id))
        .innerJoin(properties, eq(managedProperties.propertyId, properties.id))
        .innerJoin(workers, eq(propertyVisits.workerId, workers.id))
        .where(eq(managedProperties.propertyManagerId, userId))
        .orderBy(desc(propertyVisits.checkInAt))
        .limit(10),
      ]);
      
      // Calculate stats
      const activeWorkers = workersData.filter((w: any) => w.status === 'ACTIVE').length;
      const pendingTasksCount = allTasks.filter(t => t.task.status === 'PENDING').length;
      const urgentReportsCount = allReports.filter(r => r.report.priority === 'URGENT' && r.report.status === 'PENDING').length;
      
      // Get today's visits
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const visitsToday = recentVisits.filter(v => v.visit.checkInAt && v.visit.checkInAt >= today).length;
      
      // Get this week's stats
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const tasksCompletedThisWeek = allTasks.filter(t => 
        t.task.status === 'COMPLETED' && t.task.completedAt && t.task.completedAt >= weekAgo
      ).length;
      const newReportsThisWeek = allReports.filter(r => 
        r.report.reportedAt >= weekAgo
      ).length;
      
      // Filter and limit task lists
      const pendingTasks = allTasks
        .filter(t => t.task.status === 'PENDING')
        .slice(0, 10);
      
      const now = new Date();
      const overdueTasks = allTasks
        .filter(t => t.task.status === 'PENDING' && t.task.dueDate && t.task.dueDate < now)
        .slice(0, 10);
      
      // Filter and limit report lists
      const urgentReports = allReports
        .filter(r => r.report.priority === 'URGENT' && r.report.status === 'PENDING')
        .slice(0, 10);
      
      const pendingReports = allReports
        .filter(r => r.report.status === 'PENDING')
        .slice(0, 10);
      
      res.json({
        stats: {
          totalProperties: managedPropertiesData.length,
          activeWorkers,
          pendingTasksCount,
          urgentReportsCount,
          visitsToday,
          tasksCompletedThisWeek,
          newReportsThisWeek,
        },
        properties: managedPropertiesData,
        workers: workersData,
        recentVisits,
        pendingTasks,
        overdueTasks,
        urgentReports,
        pendingReports,
      });
    } catch (error) {
      console.error('Error fetching property manager dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  });

  // Identifier routes
  app.post('/api/identifiers/batch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { count, type, brandLabel } = req.body;
      
      if (!count || count < 1 || count > 500) {
        return res.status(400).json({ error: "Count must be between 1 and 500" });
      }

      // Check if user is a contractor
      const contractor = await storage.getContractor(userId);
      
      const identifiers = [];
      for (let i = 0; i < count; i++) {
        const code = generateCode(type || 'ASSET');
        identifiers.push({
          code,
          kind: type || 'ASSET',
          contractorId: contractor?.id,
          brandLabel: brandLabel || contractor?.companyName || "ServiceVault",
        });
      }

      const created = await storage.createIdentifiers(identifiers);

      // Generate QR codes
      const qrCodes = await Promise.all(
        created.map(async (identifier) => {
          try {
            const qrData = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/scan?code=${encodeURIComponent(identifier.code)}`;
            const qrCodeDataURL = await QRCode.toDataURL(qrData, {
              margin: 1,
              width: 512,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });
            
            // Store QR code path (in real implementation, would save to object storage)
            const qrPath = `/qr/${identifier.id}.png`;
            await storage.updateIdentifier(identifier.id, { qrPath });
            
            return { ...identifier, qrPath, qrCodeDataURL };
          } catch (error) {
            console.error("Error generating QR code:", error);
            return identifier;
          }
        })
      );

      res.json({ created: qrCodes });
    } catch (error) {
      console.error("Error creating identifiers:", error);
      res.status(500).json({ error: "Failed to create identifiers" });
    }
  });

  app.get('/api/identifiers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contractor = await storage.getContractor(userId);
      
      if (!contractor) {
        return res.json([]);
      }

      const identifiers = await storage.getContractorIdentifiers(contractor.id);
      res.json(identifiers);
    } catch (error) {
      console.error("Error fetching identifiers:", error);
      res.status(500).json({ error: "Failed to fetch identifiers" });
    }
  });

  app.get('/api/me/quota', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getUserSubscription(userId);
      
      if (!subscription) {
        return res.json({ quotaTotal: 0, quotaUsed: 0, plan: null });
      }

      res.json({
        quotaTotal: subscription.quotaTotal || 0,
        quotaUsed: subscription.quotaUsed || 0,
        plan: subscription.plan,
        status: subscription.status,
      });
    } catch (error) {
      console.error("Error fetching quota:", error);
      res.status(500).json({ error: "Failed to fetch quota" });
    }
  });

  app.post('/api/identifiers/claim', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code, asset, property, photos } = req.body;

      let identifier = null;
      
      // Code is optional - only validate if provided
      if (code) {
        identifier = await storage.getIdentifier(code);
        if (!identifier) {
          return res.status(404).json({ error: "Identifier not found" });
        }

        if (identifier.claimedAt) {
          return res.status(400).json({ error: "Identifier already claimed" });
        }
      }

      // Check quota for contractors only if claiming a sticker
      const user = await storage.getUser(userId);
      if (code && user?.role === 'CONTRACTOR') {
        const subscription = await storage.getUserSubscription(userId);
        if (subscription) {
          const quotaUsed = subscription.quotaUsed || 0;
          const quotaTotal = subscription.quotaTotal || 0;
          
          if (quotaUsed >= quotaTotal) {
            return res.status(403).json({ 
              error: "Quota exceeded", 
              message: `You have claimed ${quotaUsed}/${quotaTotal} stickers. Upgrade your plan to claim more.`,
              quotaUsed,
              quotaTotal
            });
          }
        }
      }

      // Handle property - either get existing by ID or create new
      let propertyRecord;
      if (property?.id) {
        // User selected existing property
        propertyRecord = await storage.getProperty(property.id);
        if (!propertyRecord || propertyRecord.ownerId !== userId) {
          return res.status(404).json({ error: "Property not found or access denied" });
        }
      } else {
        // Create new property
        propertyRecord = await storage.createProperty({
          ownerId: userId,
          name: property?.name || "Property",
          addressLine1: property?.addressLine1,
          city: property?.city,
          state: property?.state,
          postalCode: property?.postalCode,
          country: property?.country || "US",
        });
      }

      // Create asset
      const assetRecord = await storage.createAsset({
        propertyId: propertyRecord.id,
        name: asset?.name || "Asset",
        category: asset?.category || "OTHER",
        brand: asset?.brand,
        model: asset?.model,
        serial: asset?.serial,
        notes: asset?.notes,
        identifierId: identifier?.id || null,
        installedAt: asset?.installedAt ? new Date(asset.installedAt) : new Date(),
        status: "ACTIVE",
      });

      // Update identifier as claimed (only if code was provided)
      if (identifier) {
        await storage.updateIdentifier(identifier.id, { claimedAt: new Date() });
        
        // Increment quota for contractors
        if (user?.role === 'CONTRACTOR') {
          const subscription = await storage.getUserSubscription(userId);
          if (subscription) {
            await storage.updateSubscription(subscription.id, {
              quotaUsed: (subscription.quotaUsed || 0) + 1
            });
          }
        }
      }

      // Create installation event with photos
      await storage.createEvent({
        assetId: assetRecord.id,
        type: "INSTALL",
        data: { 
          note: asset?.notes || "Initial asset registration",
          installDate: asset?.installedAt || new Date().toISOString(),
        },
        photoUrls: photos && photos.length > 0 ? photos : null,
        createdBy: userId,
      });

      res.json({ property: propertyRecord, asset: assetRecord });
    } catch (error) {
      console.error("Error claiming identifier:", error);
      res.status(500).json({ error: "Failed to claim identifier" });
    }
  });

  // Property routes
  app.get('/api/properties', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const properties = await storage.getProperties(userId);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  // Get Master QR for property
  app.get('/api/properties/:id/master-identifier', isAuthenticated, requireEntitlement('masterQR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: propertyId } = req.params;

      const property = await storage.getProperty(propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(404).json({ error: "Property not found" });
      }

      let masterIdentifier = null;
      let publicVisibility = null;
      let revokedAt = null;

      if (property.masterIdentifierId) {
        const [identifier] = await db
          .select()
          .from(identifiers)
          .where(eq(identifiers.id, property.masterIdentifierId))
          .limit(1);

        if (identifier) {
          masterIdentifier = identifier.code;
          revokedAt = identifier.deactivatedAt;
        }
      }

      publicVisibility = property.publicVisibility as any || {
        showFullAddress: false,
        showContractors: true,
        showDocuments: false,
        showCosts: false,
      };

      res.json({
        masterIdentifier,
        publicVisibility,
        revokedAt,
      });
    } catch (error) {
      console.error("Error fetching master identifier:", error);
      res.status(500).json({ error: "Failed to fetch master identifier" });
    }
  });

  // Generate new Master QR for property
  app.post('/api/properties/:id/master-identifier', isAuthenticated, requireEntitlement('masterQR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: propertyId } = req.params;
      const { privacySettings } = req.body;

      const property = await storage.getProperty(propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(404).json({ error: "Property not found" });
      }

      // Validate privacy settings if provided
      if (privacySettings) {
        const validKeys = ['showFullAddress', 'showContractors', 'showDocuments', 'showCosts'];
        const invalidKeys = Object.keys(privacySettings).filter(k => !validKeys.includes(k));
        if (invalidKeys.length > 0) {
          return res.status(400).json({ error: 'Invalid privacy settings keys' });
        }
        for (const key of validKeys) {
          if (privacySettings[key] !== undefined && typeof privacySettings[key] !== 'boolean') {
            return res.status(400).json({ error: `Privacy setting ${key} must be boolean` });
          }
        }
      }

      // If property already has a master identifier, check if revoked
      if (property.masterIdentifierId) {
        const [identifier] = await db
          .select()
          .from(identifiers)
          .where(eq(identifiers.id, property.masterIdentifierId))
          .limit(1);

        // If identifier is revoked, allow regeneration but deny privacy-only updates
        if (identifier?.deactivatedAt) {
          // If this is just a privacy update attempt (not regeneration), reject it
          if (privacySettings && req.body.regenerate !== true) {
            return res.status(400).json({ 
              error: "Master QR code has been revoked. Please regenerate to make changes.",
              revoked: true
            });
          }
          // If regenerate flag is set, fall through to create new identifier
          // Clear the old masterIdentifierId so we create a fresh one
          await storage.updateProperty(propertyId, { masterIdentifierId: null });
        } else {
          // Identifier is active - allow privacy updates
          if (privacySettings) {
            await storage.updateProperty(propertyId, { publicVisibility: privacySettings });
          }
          return res.json({ masterIdentifier: identifier.code });
        }
      }

      // Generate unique code for master QR
      const code = `HOME-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create master identifier
      const [identifier] = await db.insert(identifiers).values({
        code,
        kind: 'HOUSE',
        qrPath: `/qr/master/${code}.png`, // QR image will be generated on-demand
      }).returning();

      // Update property with new master identifier and privacy settings
      await storage.updateProperty(propertyId, {
        masterIdentifierId: identifier.id,
        ...(privacySettings && { publicVisibility: privacySettings }),
      });

      res.json({ masterIdentifier: code });
    } catch (error) {
      console.error("Error generating master identifier:", error);
      res.status(500).json({ error: "Failed to generate master identifier" });
    }
  });

  // Revoke existing Master QR
  app.post('/api/properties/:id/master-identifier/revoke', isAuthenticated, requireEntitlement('masterQR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: propertyId } = req.params;

      const property = await storage.getProperty(propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(404).json({ error: "Property not found" });
      }

      if (!property.masterIdentifierId) {
        return res.status(400).json({ error: "No master identifier to revoke" });
      }

      // Mark old identifier as deactivated
      await db.update(identifiers)
        .set({ deactivatedAt: new Date() })
        .where(eq(identifiers.id, property.masterIdentifierId));

      // Clear master identifier from property
      await storage.updateProperty(propertyId, { masterIdentifierId: null });

      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking master identifier:", error);
      res.status(500).json({ error: "Failed to revoke master identifier" });
    }
  });

  // Public property history via master QR (unauthenticated, privacy-filtered)
  app.get('/api/properties/public/history/:masterQR', async (req: any, res) => {
    try {
      const { masterQR } = req.params;

      // Validate master QR code
      const [identifier] = await db
        .select()
        .from(identifiers)
        .where(and(eq(identifiers.code, masterQR), eq(identifiers.kind, 'HOUSE')))
        .limit(1);

      if (!identifier || identifier.deactivatedAt) {
        return res.status(404).json({ error: "Invalid or deactivated master QR code" });
      }

      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.masterIdentifierId, identifier.id))
        .limit(1);

      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      const propertyId = property.id;
      
      // Apply privacy filtering for public view
      const publicVisibility = property.publicVisibility as any || {
        showFullAddress: false,
        showContractors: true,
        showDocuments: false,
        showCosts: false,
      };

      // Fetch all property data
      const propertyAssets = await storage.getAssets(propertyId);
      const propertyDocs = await storage.getPropertyDocuments(propertyId);
      const propertyReminders = await db
        .select()
        .from(reminders)
        .where(eq(reminders.propertyId, propertyId))
        .orderBy(asc(reminders.dueAt));

      // Fetch events for all assets
      let allEvents: any[] = [];
      for (const asset of propertyAssets) {
        const assetEvents = await db
          .select()
          .from(events)
          .where(eq(events.assetId, asset.id))
          .orderBy(desc(events.createdAt));
        allEvents = allEvents.concat(assetEvents.map(e => ({ ...e, assetName: asset.name })));
      }

      // Build response with privacy filtering (this is always public view)
      let responseData: any = {
        property: {
          id: property.id,
          name: property.name,
          type: property.propertyType,
        },
        assets: propertyAssets,
        events: allEvents,
        documents: propertyDocs,
      };

      // Apply privacy filtering for public view
      if (!publicVisibility.showFullAddress) {
        responseData.property.address = `${property.city}, ${property.state}`;
      } else {
        responseData.property.address = `${property.addressLine1}, ${property.city}, ${property.state}`;
      }

      if (!publicVisibility.showContractors) {
        responseData.assets = responseData.assets.map((a: any) => ({ ...a, installerId: null }));
        responseData.events = responseData.events.map((e: any) => ({ ...e, createdBy: null }));
      }

      if (!publicVisibility.showDocuments) {
        responseData.documents = [];
      }

      if (!publicVisibility.showCosts) {
        responseData.assets = responseData.assets.map((a: any) => ({ ...a, purchasePrice: null }));
      }

      // Create sorted timeline
      const timeline = [
        ...allEvents.map((e: any) => ({ type: 'event', date: e.createdAt, data: e })),
        ...propertyDocs.map((d: any) => ({ type: 'document', date: d.uploadedAt, data: d })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      responseData.timeline = timeline;

      res.json(responseData);
    } catch (error) {
      console.error("Error fetching property history:", error);
      res.status(500).json({ error: "Failed to fetch property history" });
    }
  });

  // Authenticated property history for owners (full timeline, no filtering)
  app.get('/api/properties/:id/history', isAuthenticated, async (req: any, res) => {
    try {
      const { id: propertyId } = req.params;
      const userId = req.user.claims.sub;

      // Verify ownership
      const property = await storage.getProperty(propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(404).json({ error: "Property not found" });
      }

      // Fetch all property data (no filtering for owners)
      const propertyAssets = await storage.getAssets(propertyId);
      const propertyDocs = await storage.getPropertyDocuments(propertyId);
      const propertyReminders = await db
        .select()
        .from(reminders)
        .where(eq(reminders.propertyId, propertyId))
        .orderBy(asc(reminders.dueAt));

      // Fetch events for all assets
      let allEvents: any[] = [];
      for (const asset of propertyAssets) {
        const assetEvents = await db
          .select()
          .from(events)
          .where(eq(events.assetId, asset.id))
          .orderBy(desc(events.createdAt));
        allEvents = allEvents.concat(assetEvents.map(e => ({ ...e, assetName: asset.name })));
      }

      // Create sorted timeline
      const timeline = [
        ...allEvents.map((e: any) => ({ type: 'event', date: e.createdAt, data: e })),
        ...propertyDocs.map((d: any) => ({ type: 'document', date: d.uploadedAt, data: d })),
        ...propertyReminders.map((r: any) => ({ type: 'reminder', date: r.dueAt, data: r })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json({
        property: {
          id: property.id,
          name: property.name,
          type: property.propertyType,
          address: `${property.addressLine1}, ${property.city}, ${property.state}`,
        },
        assets: propertyAssets,
        events: allEvents,
        documents: propertyDocs,
        reminders: propertyReminders,
        timeline,
      });
    } catch (error) {
      console.error("Error fetching property history:", error);
      res.status(500).json({ error: "Failed to fetch property history" });
    }
  });

  // Set master identifier (existing route for claiming purchased QR)
  app.post('/api/properties/master', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId, code } = req.body;

      const property = await storage.getProperty(propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(404).json({ error: "Property not found" });
      }

      const identifier = await storage.getIdentifier(code);
      if (!identifier || identifier.kind !== 'HOUSE') {
        return res.status(400).json({ error: "Valid master identifier required" });
      }

      await storage.updateProperty(propertyId, { masterIdentifierId: identifier.id });
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting master identifier:", error);
      res.status(500).json({ error: "Failed to set master identifier" });
    }
  });

  app.get('/api/properties/:propertyId/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId } = req.params;

      const property = await storage.getProperty(propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(404).json({ error: "Property not found" });
      }

      const [assetsResult] = await db
        .select({ count: count() })
        .from(assets)
        .where(eq(assets.propertyId, propertyId));

      const [documentsResult] = await db
        .select({ count: count() })
        .from(documents)
        .where(eq(documents.propertyId, propertyId));

      const [inspectionsResult] = await db
        .select({ count: count() })
        .from(inspections)
        .where(eq(inspections.propertyId, propertyId));

      const propertyAssets = await storage.getAssets(propertyId);
      const assetIds = propertyAssets.map(a => a.id);
      
      let eventCount = 0;
      for (const assetId of assetIds) {
        const [eventsResult] = await db
          .select({ count: count() })
          .from(events)
          .where(eq(events.assetId, assetId));
        eventCount += eventsResult.count;
      }

      res.json({
        assetCount: assetsResult.count,
        documentCount: documentsResult.count,
        inspectionCount: inspectionsResult.count,
        eventCount,
      });
    } catch (error) {
      console.error("Error fetching property stats:", error);
      res.status(500).json({ error: "Failed to fetch property stats" });
    }
  });

  // Asset routes
  app.get('/api/assets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId } = req.query;

      if (!propertyId) {
        return res.status(400).json({ error: "Property ID is required" });
      }

      const property = await storage.getProperty(propertyId as string);
      if (!property || property.ownerId !== userId) {
        return res.status(404).json({ error: "Property not found" });
      }

      const assetsList = await storage.getAssets(propertyId as string);
      res.json(assetsList);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  app.get('/api/assets/:propertyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId } = req.params;

      const property = await storage.getProperty(propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(404).json({ error: "Property not found" });
      }

      const assets = await storage.getAssets(propertyId);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  app.get('/api/assets/details/:assetId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assetId } = req.params;

      const asset = await storage.getAssetWithDetails(assetId);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      // Verify ownership through property
      const property = await storage.getProperty(asset.propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(asset);
    } catch (error) {
      console.error("Error fetching asset details:", error);
      res.status(500).json({ error: "Failed to fetch asset details" });
    }
  });

  app.post('/api/assets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId, name, category, brand, model, serial, installedAt, installerId } = req.body;

      if (!propertyId || !name || !category) {
        return res.status(400).json({ error: "Property ID, name, and category are required" });
      }

      const property = await storage.getProperty(propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(404).json({ error: "Property not found" });
      }

      const asset = await storage.createAsset({
        propertyId,
        name,
        category,
        brand,
        model,
        serial,
        installedAt: installedAt ? new Date(installedAt) : undefined,
        installerId,
      });

      // Log installation event
      await storage.createEvent({
        assetId: asset.id,
        type: 'INSTALL',
        data: { installedAt: asset.installedAt, brand, model, serial },
        createdBy: userId,
      });

      res.json({ asset });
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(500).json({ error: "Failed to create asset" });
    }
  });

  app.get('/api/assets/:assetId/validate-chain', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assetId } = req.params;

      const asset = await storage.getAsset(assetId);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      const property = await storage.getProperty(asset.propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const events = await storage.getAssetEvents(assetId);
      const { validateHashChain } = await import('./hashChain');
      const validation = await validateHashChain(events);

      res.json({
        assetId,
        eventCount: events.length,
        isValid: validation.isValid,
        errors: validation.errors,
      });
    } catch (error) {
      console.error("Error validating hash chain:", error);
      res.status(500).json({ error: "Failed to validate hash chain" });
    }
  });

  app.post('/api/assets/:assetId/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assetId } = req.params;
      const { type, note, photos } = req.body;

      // Validate event type
      const validTypes = ['SERVICE', 'REPAIR', 'INSPECTION', 'WARRANTY', 'RECALL', 'NOTE'];
      if (!type || !validTypes.includes(type)) {
        return res.status(400).json({ 
          error: "Invalid event type", 
          validTypes 
        });
      }

      // Get asset and verify access
      const asset = await storage.getAsset(assetId);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      // For contractors: verify they have an active subscription
      const user = await storage.getUser(userId);
      if (user?.role === 'CONTRACTOR') {
        const subscription = await storage.getUserSubscription(userId);
        if (!subscription || subscription.status !== 'ACTIVE') {
          return res.status(403).json({ 
            error: "Active subscription required to log service events" 
          });
        }
      } else {
        // For non-contractors, verify property ownership
        const property = await storage.getProperty(asset.propertyId);
        if (!property || property.ownerId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      // Create the event
      const event = await storage.createEvent({
        assetId,
        type,
        data: { 
          note: note || `${type} event logged`,
          timestamp: new Date().toISOString(),
        },
        photoUrls: photos && photos.length > 0 ? photos : null,
        createdBy: userId,
      });

      res.json({ event });
    } catch (error) {
      console.error("Error creating service event:", error);
      res.status(500).json({ error: "Failed to create service event" });
    }
  });

  // Document routes
  app.get('/api/documents/asset/:assetId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assetId } = req.params;

      const asset = await storage.getAsset(assetId);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      const property = await storage.getProperty(asset.propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const documents = await storage.getAssetDocuments(assetId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching asset documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get('/api/documents/property/:propertyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId } = req.params;

      const property = await storage.getProperty(propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const documents = await storage.getPropertyDocuments(propertyId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching property documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Document upload
  // Generic document CRUD operations
  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getUserDocuments(userId);
      
      // Enrich documents with signed view URLs and metadata
      const enrichedDocuments = await Promise.all(
        documents.map(async (doc) => {
          // If object storage is not configured, return document with null URL
          if (!objectStorageService) {
            return {
              id: doc.id,
              title: doc.title,
              type: doc.type,
              description: doc.description,
              uploadedAt: doc.uploadedAt,
              issueDate: doc.issueDate,
              expiryDate: doc.expiryDate,
              amount: doc.amount,
              objectPath: null,
              mimeType: "application/octet-stream",
              size: 0,
            };
          }
          
          try {
            const [signedUrl, metadata] = await Promise.all([
              objectStorageService.getSignedViewURL(doc.path),
              objectStorageService.getObjectMetadata(doc.path),
            ]);
            
            return {
              id: doc.id,
              title: doc.title,
              type: doc.type,
              description: doc.description,
              uploadedAt: doc.uploadedAt,
              issueDate: doc.issueDate,
              expiryDate: doc.expiryDate,
              amount: doc.amount,
              objectPath: signedUrl, // Signed URL for viewing
              mimeType: metadata.contentType,
              size: metadata.size,
            };
          } catch (error) {
            console.error(`Failed to generate signed URL for document ${doc.id}:`, error);
            // Return document with null URL if signing fails
            return {
              id: doc.id,
              title: doc.title,
              type: doc.type,
              description: doc.description,
              uploadedAt: doc.uploadedAt,
              issueDate: doc.issueDate,
              expiryDate: doc.expiryDate,
              amount: doc.amount,
              objectPath: null,
              mimeType: "application/octet-stream",
              size: 0,
            };
          }
        })
      );
      
      res.json(enrichedDocuments);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, documentType, issueDate, expiryDate, amount, description, objectPath } = req.body;

      if (!name || !objectPath) {
        return res.status(400).json({ error: "Name and object path are required" });
      }

      // Set ACL policy for the uploaded object
      let normalizedPath = objectPath;
      if (objectStorageService) {
        normalizedPath = objectStorageService.normalizeObjectEntityPath(objectPath);
        await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
          owner: userId,
          visibility: "private",
        });
      }

      const document = await storage.createDocument({
        uploadedBy: userId,
        type: documentType || "OTHER",
        title: name,
        path: normalizedPath,
        issueDate: issueDate ? new Date(issueDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        amount: amount || undefined,
        description: description || undefined,
      });

      res.json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      await storage.deleteDocument(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // ===== WARRANTY PARSING ENDPOINTS =====
  
  app.post('/api/warranties/parse', isAuthenticated, async (req: any, res) => {
    // Check if OpenAI is configured
    if (!hasOpenAI) {
      return res.status(503).json({ 
        error: "AI warranty parsing is currently unavailable. Please contact support@servicevault.app.",
        service: "openai",
        configured: false
      });
    }
    
    const userId = req.user.claims.sub;
    const { checkRateLimit, RATE_LIMITS } = await import('./rateLimiter');
    
    // Rate limiting
    const rateLimitResult = checkRateLimit(userId, "warranty_parse", RATE_LIMITS.WARRANTY_PARSE);
    if (!rateLimitResult.allowed) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return res.status(429).json({ 
        error: "Rate limit exceeded. Please try again later.",
        retryAfter 
      });
    }
    
    const { imageBase64, propertyId, assetId, documentId } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: "Image data required" });
    }
    
    try {
      const { warrantySummaries } = await import('@shared/schema');
      
      // Parse warranty using OpenAI
      const parsedData = await parseWarrantyDocument(imageBase64);
      
      // Store warranty summary
      const summary = await db.insert(warrantySummaries).values({
        documentId: documentId || null,
        propertyId: propertyId || null,
        assetId: assetId || null,
        parsedData,
        warrantyStartDate: parsedData.warrantyStartDate ? new Date(parsedData.warrantyStartDate) : null,
        warrantyEndDate: parsedData.warrantyEndDate ? new Date(parsedData.warrantyEndDate) : null,
        confidence: parsedData.warrantyEndDate && parsedData.warrantyStartDate ? "0.90" : "0.70",
        createdBy: userId,
      }).returning();
      
      // Create maintenance reminders from schedule
      let remindersCreated = 0;
      if (parsedData.maintenanceSchedule && parsedData.maintenanceSchedule.length > 0) {
        const reminderValues = parsedData.maintenanceSchedule.map(item => ({
          assetId: assetId || null,
          propertyId: propertyId || null,
          dueAt: item.firstDueDate ? new Date(item.firstDueDate) : new Date(Date.now() + item.intervalMonths * 30 * 24 * 60 * 60 * 1000),
          type: "MAINTENANCE",
          title: item.description,
          description: `Recommended maintenance every ${item.intervalMonths} months`,
          frequency: "CUSTOM",
          intervalDays: item.intervalMonths * 30,
          source: "AI_GENERATED",
          createdBy: userId,
        }));
        
        await db.insert(reminders).values(reminderValues);
        remindersCreated = reminderValues.length;
      }
      
      res.json({ 
        success: true, 
        summary: summary[0],
        remindersCreated
      });
    } catch (error: any) {
      console.error("Warranty parsing error:", error);
      res.status(500).json({ error: error.message || "Failed to parse warranty" });
    }
  });
  
  app.get('/api/warranties/property/:propertyId', isAuthenticated, async (req: any, res) => {
    const { propertyId } = req.params;
    const { warrantySummaries } = await import('@shared/schema');
    
    const summaries = await db.select()
      .from(warrantySummaries)
      .where(eq(warrantySummaries.propertyId, propertyId))
      .orderBy(desc(warrantySummaries.createdAt));
    
    res.json(summaries);
  });
  
  app.get('/api/warranties/asset/:assetId', isAuthenticated, async (req: any, res) => {
    const { assetId } = req.params;
    const { warrantySummaries } = await import('@shared/schema');
    
    const summaries = await db.select()
      .from(warrantySummaries)
      .where(eq(warrantySummaries.assetId, assetId))
      .orderBy(desc(warrantySummaries.createdAt));
    
    res.json(summaries);
  });

  app.post('/api/documents/upload', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assetId, propertyId, type, title, description, objectPath, scannedWarrantyMetadata } = req.body;

      if (!objectPath) {
        return res.status(400).json({ error: "Object path is required" });
      }

      // Verify ownership
      if (assetId) {
        const asset = await storage.getAsset(assetId);
        if (!asset) {
          return res.status(404).json({ error: "Asset not found" });
        }
        const property = await storage.getProperty(asset.propertyId);
        if (!property || property.ownerId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
      } else if (propertyId) {
        const property = await storage.getProperty(propertyId);
        if (!property || property.ownerId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      // Set ACL policy for the uploaded object
      let normalizedPath = objectPath;
      if (objectStorageService) {
        normalizedPath = objectStorageService.normalizeObjectEntityPath(objectPath);
        await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
          owner: userId,
          visibility: "private",
        });
      }

      // Create document with user description OR auto-generate from scanned QR metadata
      let finalDescription = description;
      if (!finalDescription && scannedWarrantyMetadata) {
        finalDescription = `Manufacturer: ${scannedWarrantyMetadata.manufacturer || 'N/A'}\nModel: ${scannedWarrantyMetadata.model || 'N/A'}\nSerial: ${scannedWarrantyMetadata.serial || 'N/A'}`;
      }

      const document = await storage.createDocument({
        assetId: assetId || undefined,
        propertyId: propertyId || undefined,
        type: type || "OTHER",
        title: title || "Document",
        path: normalizedPath,
        description: finalDescription || undefined,
        uploadedBy: userId,
      });

      res.json({ document, scannedMetadata: scannedWarrantyMetadata });

      // If this is a WARRANTY document with an assetId, auto-trigger AI parsing in the background
      // This creates automatic maintenance reminders based on the warranty document
      if (type === 'WARRANTY' && assetId && hasOpenAI && objectStorageService) {
        setImmediate(async () => {
          try {
            console.log(`Auto-triggering AI warranty parsing for document ${document.id}`);
            if (scannedWarrantyMetadata) {
              console.log('QR metadata available:', scannedWarrantyMetadata);
            }
            
            // Call the AI warranty parsing system
            const asset = await storage.getAsset(assetId);
            if (!asset) return;
            
            // Download the file as a buffer and convert to base64
            const fileBuffer = await objectStorageService.downloadObjectAsBuffer(normalizedPath);
            const base64Image = fileBuffer.toString('base64');
            
            // Parse warranty using OpenAI Vision API
            const parsedData = await parseWarrantyDocument(base64Image);
            
            if (parsedData) {
              // Update document with parsed warranty dates
              if (parsedData.warrantyEndDate) {
                await db.update(documents)
                  .set({ 
                    expiryDate: new Date(parsedData.warrantyEndDate),
                    issueDate: parsedData.warrantyStartDate ? new Date(parsedData.warrantyStartDate) : undefined,
                  })
                  .where(eq(documents.id, document.id));
              }
              
              // Create warranty expiration reminder (30 days before expiry)
              if (parsedData.warrantyEndDate) {
                const expiryDate = new Date(parsedData.warrantyEndDate);
                const reminderDate = new Date(expiryDate);
                reminderDate.setDate(reminderDate.getDate() - 30);
                
                await storage.createReminder({
                  assetId: asset.id,
                  propertyId: asset.propertyId,
                  type: 'WARRANTY_EXPIRATION',
                  title: `Warranty Expiring: ${asset.name}`,
                  description: `Warranty expires on ${expiryDate.toLocaleDateString()}`,
                  dueAt: reminderDate,
                  frequency: 'ONE_TIME',
                  source: 'AI_GENERATED',
                  createdBy: userId,
                  notifyHomeowner: true,
                });
              }
              
              // Create maintenance reminders from parsed data
              if (parsedData.maintenanceSchedule && Array.isArray(parsedData.maintenanceSchedule)) {
                for (const maintenance of parsedData.maintenanceSchedule) {
                  if (maintenance.description && maintenance.intervalMonths) {
                    // Convert interval from months to days (assuming 30 days per month)
                    const intervalDays = maintenance.intervalMonths * 30;
                    const nextDue = maintenance.firstDueDate 
                      ? new Date(maintenance.firstDueDate)
                      : new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);
                    
                    // Determine frequency based on interval
                    let frequency = 'CUSTOM';
                    if (maintenance.intervalMonths === 1) frequency = 'MONTHLY';
                    else if (maintenance.intervalMonths === 3) frequency = 'QUARTERLY';
                    else if (maintenance.intervalMonths === 12) frequency = 'ANNUALLY';
                    
                    await storage.createReminder({
                      assetId: asset.id,
                      propertyId: asset.propertyId,
                      type: 'MAINTENANCE',
                      title: maintenance.description,
                      description: `Recommended maintenance every ${maintenance.intervalMonths} month(s)`,
                      dueAt: nextDue,
                      frequency,
                      intervalDays: frequency === 'CUSTOM' ? intervalDays : undefined,
                      nextDueAt: nextDue,
                      source: 'AI_GENERATED',
                      createdBy: userId,
                      notifyHomeowner: true,
                    });
                  }
                }
              }
              
              console.log(`AI warranty parsing complete for document ${document.id}. Created reminders.`);
            }
          } catch (parseError) {
            console.error('Background AI warranty parsing failed:', parseError);
            // Don't fail the upload if parsing fails
          }
        });
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  app.post('/api/documents/parse-warranty', isAuthenticated, async (req: any, res) => {
    // Check if OpenAI is configured
    if (!hasOpenAI) {
      return res.status(503).json({ 
        error: "AI warranty parsing is currently unavailable. Please contact support@servicevault.app.",
        service: "openai",
        configured: false
      });
    }
    
    try {
      const userId = req.user.claims.sub;
      const { imageBase64, assetId } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "Image data is required" });
      }

      // Rate limiting for AI parsing (10 requests per hour per user)
      const { checkRateLimit, RATE_LIMITS } = await import('./rateLimiter');
      const rateLimit = checkRateLimit(userId, 'warranty-parse', RATE_LIMITS.WARRANTY_PARSE);
      
      if (!rateLimit.allowed) {
        const resetInMinutes = Math.ceil((rateLimit.resetAt - Date.now()) / 1000 / 60);
        return res.status(429).json({ 
          error: "Rate limit exceeded",
          message: `Too many warranty parsing requests. Please try again in ${resetInMinutes} minutes.`,
          resetAt: rateLimit.resetAt,
        });
      }

      // Validate base64 image size (max 10MB)
      const base64SizeInBytes = (imageBase64.length * 3) / 4;
      const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
      if (base64SizeInBytes > maxSizeInBytes) {
        return res.status(400).json({ error: "Image size exceeds 10MB limit" });
      }

      // Validate base64 format
      if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
        return res.status(400).json({ error: "Invalid base64 image format" });
      }

      // Verify asset ownership if provided
      if (assetId) {
        const asset = await storage.getAsset(assetId);
        if (!asset) {
          return res.status(404).json({ error: "Asset not found" });
        }
        const property = await storage.getProperty(asset.propertyId);
        if (!property || property.ownerId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      // Parse warranty using OpenAI Vision
      const { parseWarrantyDocument } = await import('./openaiClient');
      const warrantyInfo = await parseWarrantyDocument(imageBase64);

      // Task 8: Smart Reminders - Auto-create reminders from AI-parsed warranty dates
      const createdReminders = [];

      // Create warranty expiration reminder (30 days before end date)
      if (warrantyInfo.warrantyEndDate && assetId) {
        try {
          const asset = await storage.getAsset(assetId);
          if (asset) {
            const expiryDate = new Date(warrantyInfo.warrantyEndDate);
            const reminderDate = new Date(expiryDate);
            reminderDate.setDate(reminderDate.getDate() - 30); // 30 days before expiration

            const warrantyReminder = await storage.createReminder({
              assetId,
              propertyId: asset.propertyId,
              dueAt: reminderDate,
              type: 'WARRANTY_EXPIRATION',
              title: `Warranty Expiring Soon`,
              description: `Warranty for ${warrantyInfo.productName || 'this asset'} expires on ${expiryDate.toLocaleDateString()}`,
              source: 'AI_GENERATED',
              createdBy: userId,
              notifyHomeowner: true,
            });
            createdReminders.push(warrantyReminder);
          }
        } catch (err) {
          console.error("Error creating warranty expiration reminder:", err);
        }
      }

      // Create recurring maintenance reminders from schedule
      if (warrantyInfo.maintenanceSchedule && Array.isArray(warrantyInfo.maintenanceSchedule) && assetId) {
        try {
          const asset = await storage.getAsset(assetId);
          if (asset) {
            for (const maintenance of warrantyInfo.maintenanceSchedule) {
              if (maintenance.description && maintenance.intervalMonths) {
                const firstDue = maintenance.firstDueDate 
                  ? new Date(maintenance.firstDueDate)
                  : new Date(); // Start today if no firstDueDate specified

                // Calculate frequency based on interval
                let frequency = 'CUSTOM';
                if (maintenance.intervalMonths === 1) frequency = 'MONTHLY';
                else if (maintenance.intervalMonths === 3) frequency = 'QUARTERLY';
                else if (maintenance.intervalMonths === 12) frequency = 'ANNUALLY';

                const maintenanceReminder = await storage.createReminder({
                  assetId,
                  propertyId: asset.propertyId,
                  dueAt: firstDue,
                  type: 'MAINTENANCE',
                  title: `Scheduled Maintenance: ${maintenance.description}`,
                  description: `${maintenance.description} - Recommended every ${maintenance.intervalMonths} month(s)`,
                  frequency,
                  intervalDays: frequency === 'CUSTOM' ? maintenance.intervalMonths * 30 : undefined,
                  source: 'AI_GENERATED',
                  createdBy: userId,
                  notifyHomeowner: true,
                });
                createdReminders.push(maintenanceReminder);
              }
            }
          }
        } catch (err) {
          console.error("Error creating maintenance reminders:", err);
        }
      }

      res.json({ warrantyInfo, createdReminders });
    } catch (error) {
      console.error("Error parsing warranty:", error);
      res.status(500).json({ error: "Failed to parse warranty document" });
    }
  });

  // AI Document Extraction - Comprehensive endpoint for assets, warranties, receipts
  app.post('/api/ai/documents/extract', isAuthenticated, async (req: any, res) => {
    // Check if OpenAI and Object Storage are configured
    if (!hasOpenAI) {
      return res.status(503).json({ 
        error: "AI document extraction is currently unavailable. Please contact support@servicevault.app.",
        service: "openai",
        configured: false
      });
    }
    if (!objectStorageService) {
      return res.status(503).json({ 
        error: "File storage is currently unavailable. Please contact support@servicevault.app.",
        service: "object_storage",
        configured: false
      });
    }
    
    try {
      const userId = req.user.claims.sub;
      const { objectPath, extractionType } = req.body;

      if (!objectPath) {
        return res.status(400).json({ error: "Object path is required" });
      }

      if (!extractionType || !['asset', 'warranty', 'receipt', 'document'].includes(extractionType)) {
        return res.status(400).json({ error: "Valid extraction type is required (asset, warranty, receipt, or document)" });
      }

      // Rate limiting for AI parsing (10 requests per hour per user)
      const { checkRateLimit, RATE_LIMITS } = await import('./rateLimiter');
      const rateLimit = checkRateLimit(userId, 'warranty-parse', RATE_LIMITS.WARRANTY_PARSE);
      
      if (!rateLimit.allowed) {
        const resetInMinutes = Math.ceil((rateLimit.resetAt - Date.now()) / 1000 / 60);
        return res.status(429).json({ 
          error: "Rate limit exceeded",
          message: `Too many AI extraction requests. Please try again in ${resetInMinutes} minutes.`,
          resetAt: rateLimit.resetAt,
        });
      }

      // Download the object and convert to base64
      let imageBuffer: Buffer;
      try {
        imageBuffer = await objectStorageService.downloadObjectAsBuffer(objectPath);
      } catch (error) {
        if (error instanceof ObjectNotFoundError) {
          return res.status(404).json({ error: "Object not found" });
        }
        throw error;
      }

      // Validate image size (max 10MB)
      const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
      if (imageBuffer.length > maxSizeInBytes) {
        return res.status(400).json({ error: "Image size exceeds 10MB limit" });
      }

      const imageBase64 = imageBuffer.toString('base64');

      // Build extraction prompt based on type
      const { openai } = await import('./openaiClient');
      
      let extractionPrompt = '';
      if (extractionType === 'asset') {
        extractionPrompt = `Analyze this warranty, receipt, or product documentation image and extract ALL information in JSON format:
{
  "assetName": "string (e.g., 'Water Heater', 'HVAC Unit')",
  "assetBrand": "string (manufacturer brand)",
  "assetModel": "string (model number/name)",
  "assetSerial": "string (serial number)",
  "assetCategory": "string (PLUMBING, ELECTRICAL, HVAC, APPLIANCE, FURNITURE, STRUCTURAL, VEHICLE, HEAVY_EQUIPMENT, or OTHER)",
  "warrantyStartDate": "YYYY-MM-DD or null",
  "warrantyEndDate": "YYYY-MM-DD or null",
  "warrantyDuration": "string (e.g., '2 years', '36 months')",
  "installDate": "YYYY-MM-DD or null",
  "purchaseDate": "YYYY-MM-DD or null",
  "price": "string (e.g., '$499.99')",
  "vendor": "string (store/vendor name)",
  "notes": "any important warranty terms, coverage details, or installation notes"
}

Instructions:
- Extract ALL dates in YYYY-MM-DD format
- Identify asset type and categorize correctly
- Extract brand, model, serial number prominently displayed
- Include warranty information if present
- Be thorough and extract all visible information
- Return valid JSON only`;
      } else if (extractionType === 'warranty') {
        extractionPrompt = `Analyze this warranty certificate and extract information in JSON format:
{
  "assetName": "string (product name)",
  "assetBrand": "string (manufacturer)",
  "assetModel": "string (model)",
  "warrantyStartDate": "YYYY-MM-DD or null",
  "warrantyEndDate": "YYYY-MM-DD or null",
  "warrantyDuration": "string (e.g., '5 year limited warranty')",
  "notes": "coverage details, terms, conditions, what's covered/excluded"
}

Instructions:
- Focus on warranty-specific information
- Extract all dates in YYYY-MM-DD format
- Include detailed coverage information
- Return valid JSON only`;
      } else if (extractionType === 'receipt') {
        extractionPrompt = `Analyze this receipt or invoice and extract information in JSON format:
{
  "assetName": "string (item purchased)",
  "assetBrand": "string (brand if visible)",
  "assetModel": "string (model if visible)",
  "purchaseDate": "YYYY-MM-DD",
  "price": "string (total amount)",
  "vendor": "string (store/vendor name)",
  "notes": "any warranty info, return policy, or important details"
}

Instructions:
- Extract purchase date in YYYY-MM-DD format
- Include pricing and vendor information
- Extract item details if visible
- Return valid JSON only`;
      } else {
        // extractionType === 'document'
        extractionPrompt = `Analyze this document and extract relevant information in JSON format:
{
  "documentName": "string (descriptive title of the document)",
  "documentType": "string (WARRANTY, RECEIPT, MANUAL, INSPECTION_REPORT, INSURANCE, PERMIT, CERTIFICATION, or OTHER)",
  "issueDate": "YYYY-MM-DD or null (when document was issued/created)",
  "expiryDate": "YYYY-MM-DD or null (expiration/end date if applicable)",
  "amount": "string (monetary amount if present, e.g., '$499.99')",
  "description": "string (brief summary of document content, key details, coverage, terms)"
}

Instructions:
- Classify the document type accurately based on content
- Extract all dates in YYYY-MM-DD format
- Include any monetary amounts found
- Provide a concise description of the document's purpose
- Return valid JSON only`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: extractionPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const extractedData = JSON.parse(content);

      res.json(extractedData);
    } catch (error) {
      console.error("Error extracting document data:", error);
      res.status(500).json({ error: "Failed to extract document data" });
    }
  });

  // Home Health Certificate generation
  app.post('/api/reports/home-health', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId } = req.body;

      let property;
      if (propertyId) {
        property = await storage.getProperty(propertyId);
        if (!property || property.ownerId !== userId) {
          return res.status(404).json({ error: "Property not found" });
        }
      } else {
        // Get user's first property
        const properties = await storage.getProperties(userId);
        if (properties.length === 0) {
          return res.status(404).json({ error: "No properties found" });
        }
        property = properties[0];
      }

      const assets = await storage.getAssets(property.id);
      const inspections = await storage.getPropertyInspections(property.id);
      const user = await storage.getUser(userId);

      // Generate PDF
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks: Buffer[] = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const filename = `home_health_${property.id}_${Date.now()}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);
      });

      // PDF Content - Add logo at top
      const logoPath = path.join(process.cwd(), 'attached_assets', 'file_00000000f2ec61fda4cfe77e901310b1_1759209650761.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, {
          fit: [150, 60],
          align: 'center'
        });
        doc.moveDown();
      }
      
      doc.fontSize(18).text('ServiceVault — Home Health Certificate™', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12)
         .text(`Property: ${property.name || 'Unnamed Property'}`)
         .text(`Owner: ${user?.firstName || ''} ${user?.lastName || ''} (${user?.email})`)
         .text(`Address: ${property.addressLine1 || 'N/A'}, ${property.city || ''} ${property.state || ''} ${property.postalCode || ''}`)
         .text(`Generated: ${new Date().toLocaleDateString()}`);
      
      doc.moveDown().text('Assets:', { underline: true });
      
      if (assets.length === 0) {
        doc.text('No assets found for this property.');
      } else {
        for (const asset of assets) {
          doc.moveDown(0.5)
             .text(`• ${asset.name} [${asset.category}]`)
             .text(`  Installed: ${asset.installedAt?.toLocaleDateString() || 'N/A'}`)
             .text(`  Status: ${asset.status || 'Unknown'}`);
        }
      }

      if (inspections.length > 0) {
        doc.moveDown().text('Inspections:', { underline: true });
        for (const inspection of inspections) {
          doc.moveDown(0.5)
             .text(`• ${inspection.jurisdiction || 'General'} Inspection`)
             .text(`  Result: ${inspection.result || 'Pending'}`)
             .text(`  Date: ${inspection.createdAt ? inspection.createdAt.toLocaleDateString() : 'N/A'}`);
        }
      }

      doc.end();
    } catch (error) {
      console.error("Error generating home health report:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // Inspection routes
  app.get('/api/inspections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId } = req.query;

      if (!propertyId) {
        return res.status(400).json({ error: "Property ID is required" });
      }

      const property = await storage.getProperty(propertyId as string);
      if (!property || property.ownerId !== userId) {
        return res.status(404).json({ error: "Property not found" });
      }

      const inspectionsList = await storage.getPropertyInspections(propertyId as string);
      res.json(inspectionsList);
    } catch (error) {
      console.error("Error fetching inspections:", error);
      res.status(500).json({ error: "Failed to fetch inspections" });
    }
  });

  app.post('/api/inspections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId, jurisdiction, checklist, notes, result } = req.body;

      const property = await storage.getProperty(propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(404).json({ error: "Property not found" });
      }

      const checklistData = { ...checklist };
      if (notes) {
        checklistData.notes = notes;
      }

      const inspection = await storage.createInspection({
        propertyId,
        inspectorId: userId,
        jurisdiction,
        checklist: checklistData,
        result,
        signedAt: result ? new Date() : undefined,
      });

      res.json({ inspection });
    } catch (error) {
      console.error("Error creating inspection:", error);
      res.status(500).json({ error: "Failed to create inspection" });
    }
  });

  // Reminder routes
  app.get('/api/reminders/due', isAuthenticated, async (req, res) => {
    try {
      const dueReminders = await storage.getDueReminders();
      
      const REMINDER_TYPE_MAP: Record<string, { priority: string; title: string; description: string }> = {
        'WARRANTY_EXPIRATION': { priority: 'high', title: 'Warranty Expiration', description: 'Warranty expiring soon' },
        'MAINTENANCE_DUE': { priority: 'medium', title: 'Scheduled Maintenance', description: 'Maintenance due' },
        'INSPECTION_REQUIRED': { priority: 'high', title: 'Inspection Required', description: 'Inspection needed' },
        'SERVICE_INTERVAL': { priority: 'low', title: 'Service Interval', description: 'Service interval reached' },
        'PERMIT_RENEWAL': { priority: 'medium', title: 'Permit Renewal', description: 'Permit needs renewal' },
        'INSURANCE_RENEWAL': { priority: 'high', title: 'Insurance Renewal', description: 'Insurance renewal due' },
        'SEASONAL_MAINTENANCE': { priority: 'low', title: 'Seasonal Maintenance', description: 'Seasonal maintenance required' },
        'CONTRACT_EXPIRATION': { priority: 'medium', title: 'Contract Expiration', description: 'Contract expiring' },
        'WARRANTY': { priority: 'high', title: 'Warranty', description: 'Warranty notification' },
        'MAINTENANCE': { priority: 'medium', title: 'Maintenance', description: 'Maintenance reminder' },
      };

      const mappedReminders = dueReminders.map(reminder => {
        const typeInfo = REMINDER_TYPE_MAP[reminder.type] || { 
          priority: 'medium', 
          title: reminder.type, 
          description: 'Reminder' 
        };
        
        return {
          id: reminder.id,
          dueDate: reminder.dueAt,
          type: reminder.type,
          priority: typeInfo.priority,
          assetId: reminder.assetId,
          propertyId: reminder.propertyId,
          title: typeInfo.title,
          description: typeInfo.description,
          status: reminder.status,
        };
      });

      for (const reminder of dueReminders) {
        await storage.updateReminder(reminder.id, { status: 'SENT' });
      }

      res.json({ processed: dueReminders.length, reminders: mappedReminders });
    } catch (error) {
      console.error("Error processing reminders:", error);
      res.status(500).json({ error: "Failed to process reminders" });
    }
  });

  app.post('/api/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assetId, propertyId, dueAt, type } = req.body;

      if (!dueAt || !type) {
        return res.status(400).json({ error: "Due date and type are required" });
      }

      // Verify ownership
      if (assetId) {
        const asset = await storage.getAsset(assetId);
        if (!asset) {
          return res.status(404).json({ error: "Asset not found" });
        }
        const property = await storage.getProperty(asset.propertyId);
        if (!property || property.ownerId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
      } else if (propertyId) {
        const property = await storage.getProperty(propertyId);
        if (!property || property.ownerId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const reminder = await storage.createReminder({
        assetId,
        propertyId,
        dueAt: new Date(dueAt),
        type,
      });

      res.json({ reminder });
    } catch (error) {
      console.error("Error creating reminder:", error);
      res.status(500).json({ error: "Failed to create reminder" });
    }
  });

  app.post('/api/reminders/from-warranty', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assetId, warrantyInfo } = req.body;

      if (!assetId || !warrantyInfo) {
        return res.status(400).json({ error: "Asset ID and warranty info are required" });
      }

      // Validate warranty info structure
      if (typeof warrantyInfo !== 'object') {
        return res.status(400).json({ error: "Warranty info must be an object" });
      }

      // Validate and sanitize dates
      const validateDate = (dateStr: string | undefined): boolean => {
        if (!dateStr) return true; // Optional dates are ok
        const date = new Date(dateStr);
        const now = new Date();
        const fiveYearsFromNow = new Date();
        fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);
        
        // Date must be valid and within reasonable range (past 10 years to future 5 years)
        return !isNaN(date.getTime()) && 
               date >= new Date(now.getFullYear() - 10, 0, 1) && 
               date <= fiveYearsFromNow;
      };

      if (warrantyInfo.warrantyStartDate && !validateDate(warrantyInfo.warrantyStartDate)) {
        return res.status(400).json({ error: "Invalid warranty start date" });
      }

      if (warrantyInfo.warrantyEndDate && !validateDate(warrantyInfo.warrantyEndDate)) {
        return res.status(400).json({ error: "Invalid warranty end date" });
      }

      // Validate maintenance schedule if provided
      if (warrantyInfo.maintenanceSchedule) {
        if (!Array.isArray(warrantyInfo.maintenanceSchedule)) {
          return res.status(400).json({ error: "Maintenance schedule must be an array" });
        }

        // Limit number of reminders
        if (warrantyInfo.maintenanceSchedule.length > 20) {
          return res.status(400).json({ error: "Too many maintenance schedules (max 20)" });
        }

        for (const schedule of warrantyInfo.maintenanceSchedule) {
          if (schedule.intervalMonths && (schedule.intervalMonths < 1 || schedule.intervalMonths > 120)) {
            return res.status(400).json({ error: "Invalid interval months (must be 1-120)" });
          }
          if (schedule.firstDueDate && !validateDate(schedule.firstDueDate)) {
            return res.status(400).json({ error: "Invalid maintenance schedule date" });
          }
        }
      }

      // Verify asset ownership
      const asset = await storage.getAsset(assetId);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      const property = await storage.getProperty(asset.propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const reminders = [];

      // Create warranty expiration reminder
      if (warrantyInfo.warrantyEndDate) {
        const warrantyReminder = await storage.createReminder({
          assetId,
          dueAt: new Date(warrantyInfo.warrantyEndDate),
          type: "WARRANTY",
        });
        reminders.push(warrantyReminder);
      }

      // Create maintenance schedule reminders
      if (warrantyInfo.maintenanceSchedule && Array.isArray(warrantyInfo.maintenanceSchedule)) {
        for (const schedule of warrantyInfo.maintenanceSchedule) {
          if (schedule.firstDueDate) {
            const maintenanceReminder = await storage.createReminder({
              assetId,
              dueAt: new Date(schedule.firstDueDate),
              type: "MAINTENANCE",
            });
            reminders.push(maintenanceReminder);
          } else if (schedule.intervalMonths) {
            // Calculate first due date based on today + interval
            const firstDue = new Date();
            firstDue.setMonth(firstDue.getMonth() + schedule.intervalMonths);
            
            const maintenanceReminder = await storage.createReminder({
              assetId,
              dueAt: firstDue,
              type: "MAINTENANCE",
            });
            reminders.push(maintenanceReminder);
          }
        }
      }

      res.json({ reminders, count: reminders.length });
    } catch (error) {
      console.error("Error creating warranty reminders:", error);
      res.status(500).json({ error: "Failed to create warranty reminders" });
    }
  });

  // Admin middleware
  const requireAdmin = async (req: any, res: any, next: any) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const user = await storage.getUser(userId);
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    next();
  };

  // Admin routes
  app.get('/api/admin/subscriptions/pending', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Get all subscriptions that haven't been fulfilled yet
      const allSubscriptions = await db
        .select()
        .from((await import('@shared/schema')).subscriptions)
        .where(eq((await import('@shared/schema')).subscriptions.status, 'active'))
        .orderBy(desc((await import('@shared/schema')).subscriptions.createdAt));

      res.json(allSubscriptions.filter(sub => !sub.fulfilled));
    } catch (error) {
      console.error("Error fetching pending subscriptions:", error);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  app.post('/api/admin/subscriptions/:id/fulfill', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Mark subscription as fulfilled
      const updated = await storage.updateSubscription(id, {
        fulfilled: true,
        fulfilledAt: new Date(),
      });

      // TODO: Send email notification to customer
      // This would integrate with an email service like SendGrid or AWS SES

      res.json({ subscription: updated });
    } catch (error) {
      console.error("Error fulfilling subscription:", error);
      res.status(500).json({ error: "Failed to fulfill subscription" });
    }
  });

  // Contractor routes
  app.post('/api/contractor/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { companyName, logoUrl, plan } = req.body;

      if (!companyName) {
        return res.status(400).json({ error: "Company name is required" });
      }

      let contractor = await storage.getContractor(userId);
      if (contractor) {
        contractor = await storage.updateContractor(contractor.id, {
          companyName,
          logoUrl,
          plan,
        });
      } else {
        contractor = await storage.createContractor({
          userId,
          companyName,
          logoUrl,
          plan,
        });
      }

      res.json({ contractor });
    } catch (error) {
      console.error("Error updating contractor profile:", error);
      res.status(500).json({ error: "Failed to update contractor profile" });
    }
  });

  // Stripe subscription routes
  if (stripe) {
    app.post('/api/stripe/create-checkout-session', isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { plan, addOns, fleetAssetCount } = req.body;

        // Map plans to price IDs (NEW PRICING: Homeowner $99+$10/yr, Contractor $19.99/$29.99/mo, Fleet dynamic)
        const priceIds: Record<string, string> = {
          'homeowner_base': process.env.STRIPE_PRICE_HOMEOWNER_BASE || '',
          'homeowner_maint': process.env.STRIPE_PRICE_HOMEOWNER_MAINT || '',
          'contractor_starter': process.env.STRIPE_PRICE_CONTRACTOR_STARTER || '',
          'contractor_pro': process.env.STRIPE_PRICE_CONTRACTOR_PRO || '',
          'contractor_elite': process.env.STRIPE_PRICE_CONTRACTOR_ELITE || '',
          'fleet_base': process.env.STRIPE_PRICE_FLEET_BASE || '',
          // Add-ons
          'addon_family_branding': process.env.STRIPE_PRICE_ADDON_FAMILY_BRANDING || '',
          'addon_service_sessions': process.env.STRIPE_PRICE_ADDON_SERVICE_SESSIONS || '',
          'addon_nanotag_setup': process.env.STRIPE_PRICE_ADDON_NANOTAG_SETUP || '',
          'addon_nanotag_monthly': process.env.STRIPE_PRICE_ADDON_NANOTAG_MONTHLY || '',
          'addon_crew_clockin': process.env.STRIPE_PRICE_ADDON_CREW_CLOCKIN || '',
          'addon_realtime_tracking': process.env.STRIPE_PRICE_ADDON_REALTIME_TRACKING || '',
          'addon_theft_recovery': process.env.STRIPE_PRICE_ADDON_THEFT_RECOVERY || '',
          'addon_driver_accountability': process.env.STRIPE_PRICE_ADDON_DRIVER_ACCOUNTABILITY || '',
          'addon_ai_insights': process.env.STRIPE_PRICE_ADDON_AI_INSIGHTS || '',
        };

        const priceId = priceIds[plan];
        if (!priceId) {
          return res.status(400).json({ error: "Invalid plan" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const lineItems: any[] = [];

        // Base plan
        if (plan === 'homeowner_base') {
          // Homeowner needs both base ($99) and maintenance ($10/yr)
          lineItems.push(
            { price: priceIds['homeowner_base'], quantity: 1 },
            { price: priceIds['homeowner_maint'], quantity: 1 }
          );
        } else if (plan === 'fleet_base' && fleetAssetCount) {
          // Fleet uses dynamic pricing - create price on the fly
          const pricePerAsset = fleetAssetCount >= 1000 ? 2 : 3;
          const totalAmount = Math.floor(fleetAssetCount * pricePerAsset * 100); // in cents
          
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Fleet Management - ${fleetAssetCount} assets`,
                description: `$${pricePerAsset}/asset/year for ${fleetAssetCount} assets`,
              },
              unit_amount: totalAmount,
              recurring: { interval: 'year' },
            },
            quantity: 1,
          });
        } else {
          lineItems.push({ price: priceId, quantity: 1 });
        }

        // Add-ons
        if (addOns && Array.isArray(addOns)) {
          for (const addon of addOns) {
            if (priceIds[addon]) {
              lineItems.push({ price: priceIds[addon], quantity: 1 });
            }
          }
        }

        const session = await stripe.checkout.sessions.create({
          customer_email: user.email || undefined,
          line_items: lineItems,
          mode: plan === 'homeowner_base' ? 'subscription' : 'subscription', // All plans are subscriptions now
          success_url: `${req.headers.origin}/dashboard?success=true`,
          cancel_url: `${req.headers.origin}/pricing?canceled=true`,
          metadata: {
            userId,
            plan,
            addOns: JSON.stringify(addOns || []),
            fleetAssetCount: fleetAssetCount?.toString() || '0',
          },
        });

        res.json({ url: session.url });
      } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).json({ error: "Failed to create checkout session" });
      }
    });

    app.post('/api/stripe/customer-portal', isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        
        if (!user?.stripeCustomerId) {
          return res.status(400).json({ error: "No Stripe customer found" });
        }

        const session = await stripe.billingPortal.sessions.create({
          customer: user.stripeCustomerId,
          return_url: `${req.headers.origin}/dashboard`,
        });

        res.json({ url: session.url });
      } catch (error) {
        console.error("Error creating customer portal session:", error);
        res.status(500).json({ error: "Failed to create customer portal session" });
      }
    });

    // Stripe webhook
    app.post('/api/webhooks/stripe', async (req, res) => {
      const sig = req.headers['stripe-signature'] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.warn('STRIPE_WEBHOOK_SECRET not set');
        return res.status(400).send('Webhook secret not configured');
      }

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.rawBody as Buffer, sig, webhookSecret);
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      try {
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            const { userId, plan, addOns, fleetAssetCount, type, paymentId } = session.metadata || {};
            
            // Handle logo generation payments (one-time $19.99)
            if (type === 'logo_generation' && paymentId && userId) {
              await db
                .update(logoPayments)
                .set({
                  status: "COMPLETED",
                  stripePaymentIntentId: session.payment_intent as string,
                  paidAt: new Date(),
                })
                .where(eq(logoPayments.id, paymentId));
              
              console.log(`Logo payment ${paymentId} completed for user ${userId}`);
            } else if (userId && plan) {
              if (session.customer) {
                await storage.updateUserStripeInfo(
                  userId,
                  session.customer as string,
                  session.subscription as string || undefined
                );
              }

              // Calculate quota based on plan (sticker/identifier quota)
              let quotaTotal = 0;
              let userRole = 'HOMEOWNER';
              
              if (plan === 'homeowner_base') {
                quotaTotal = 1; // 1 master identifier (printed on 7 physical stickers)
                userRole = 'HOMEOWNER';
              } else if (plan === 'contractor_starter') {
                quotaTotal = 50;
                userRole = 'CONTRACTOR';
              } else if (plan === 'contractor_pro') {
                quotaTotal = 100;
                userRole = 'CONTRACTOR';
              } else if (plan === 'contractor_elite') {
                quotaTotal = 250;
                userRole = 'CONTRACTOR';
              } else if (plan === 'fleet_base') {
                quotaTotal = 0; // Fleet doesn't use sticker quota
                userRole = 'FLEET';
              }

              // Parse add-ons and set feature flags
              const addOnsList = addOns ? JSON.parse(addOns) : [];
              const featureFlags: any = {
                featureFamilyBranding: addOnsList.includes('addon_family_branding'),
                featureServiceSessions: addOnsList.includes('addon_service_sessions'),
                featureNanoTag: addOnsList.includes('addon_nanotag_setup') || addOnsList.includes('addon_nanotag_monthly'),
                featureCrewClockIn: addOnsList.includes('addon_crew_clockin'),
                featureRealtimeTracking: addOnsList.includes('addon_realtime_tracking'),
                featureTheftRecovery: addOnsList.includes('addon_theft_recovery'),
                featureDriverAccountability: addOnsList.includes('addon_driver_accountability'),
                featureAiInsights: addOnsList.includes('addon_ai_insights'),
              };

              // Fleet-specific fields
              const fleetFields: any = {};
              if (plan === 'fleet_base' && fleetAssetCount) {
                const assetCount = parseInt(fleetAssetCount);
                fleetFields.fleetAssetCount = assetCount;
                fleetFields.fleetPricePerAsset = assetCount >= 1000 ? '2.00' : '3.00';
              }

              await storage.createSubscription({
                userId,
                stripeCustomerId: session.customer as string,
                stripeSubId: session.subscription as string,
                priceId: session.line_items?.data[0]?.price?.id,
                plan,
                status: 'active',
                quotaTotal,
                quotaUsed: 0,
                currentPeriodEnd: session.subscription ? undefined : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                ...featureFlags,
                ...fleetFields,
              });

              // Update user role
              await storage.updateUser(userId, { role: userRole });

              // Send admin notification for order fulfillment
              const user = await storage.getUser(userId);
              if (user) {
                const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Customer';
                await notificationService.sendAdminOrderNotification({
                  userId,
                  userEmail: user.email || '',
                  userName,
                  plan,
                  addOns: addOnsList,
                  stripeCustomerId: session.customer as string,
                  subscriptionId: session.subscription as string,
                }).catch(err => console.error('Failed to send admin notification:', err));
              }

              // For homeowners: create property and master identifier
              if (plan === 'homeowner_base') {
                const user = await storage.getUser(userId);
                if (user) {
                  // Create 1 master identifier first (will be printed on 7 physical stickers)
                  const masterCode = generateCode('MASTER');
                  
                  const identifiers = await storage.createIdentifiers([{
                    code: masterCode,
                    kind: 'HOUSE',
                    tamperState: 'PENDING_FULFILLMENT',
                  }]);

                  // Create default property linked to the master identifier
                  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
                  const property = await storage.createProperty({
                    ownerId: userId,
                    name: fullName ? `${fullName}'s Property` : 'My Property',
                    addressLine1: null,
                    city: null,
                    state: null,
                    postalCode: null,
                    masterIdentifierId: identifiers[0].id,
                  });

                  console.log(`Created property ${property.id} and master identifier ${identifiers[0].code} for homeowner ${userId}`);
                }
              }
            }
            break;
          }
          case 'customer.subscription.updated':
          case 'customer.subscription.deleted': {
            const subscription = event.data.object as any;
            const userSub = await storage.getUserSubscription(subscription.metadata?.userId || '');
            
            if (userSub && subscription.current_period_end) {
              await storage.updateSubscription(userSub.id, {
                status: subscription.status,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              });
            }
            break;
          }
        }

        res.json({ received: true });
      } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
      }
    });
  } else {
    // Task 9: Graceful API fallbacks when Stripe is not configured
    app.post('/api/stripe/create-checkout-session', isAuthenticated, (req, res) => {
      res.status(503).json({ 
        error: "Payment processing is currently being configured. Please contact support@servicevault.app to subscribe.",
        service: "stripe",
        configured: false
      });
    });

    app.post('/api/stripe/customer-portal', isAuthenticated, (req, res) => {
      res.status(503).json({ 
        error: "Billing portal is currently being configured. Please contact support@servicevault.app for assistance.",
        service: "stripe",
        configured: false
      });
    });

    app.post('/api/webhooks/stripe', (req, res) => {
      res.status(503).json({ 
        error: "Stripe webhooks not configured",
        service: "stripe",
        configured: false
      });
    });
  }

  // ===== PAGINATED API ENDPOINTS FOR SCALE =====
  
  // Paginated jobs endpoint for contractors
  app.get('/api/jobs/paginated', isAuthenticated, requireRole('CONTRACTOR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit = 20, offset = 0, status } = req.query;
      
      const contractor = await storage.getContractor(userId);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor profile not found" });
      }

      const limitNum = Math.min(parseInt(limit as string) || 20, 100); // Max 100 per request
      const offsetNum = parseInt(offset as string) || 0;

      let query = db
        .select()
        .from(jobs)
        .where(eq(jobs.contractorId, contractor.id))
        .orderBy(desc(jobs.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      if (status) {
        query = db
          .select()
          .from(jobs)
          .where(and(eq(jobs.contractorId, contractor.id), eq(jobs.status, status as string)))
          .orderBy(desc(jobs.createdAt))
          .limit(limitNum)
          .offset(offsetNum);
      }

      const jobsList = await query;

      // Get total count for pagination
      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(jobs)
        .where(eq(jobs.contractorId, contractor.id));

      res.json({
        jobs: jobsList,
        pagination: {
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < totalCount,
        },
      });
    } catch (error) {
      console.error("Error fetching paginated jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  // Paginated events endpoint for assets
  app.get('/api/events/paginated/:assetId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assetId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const asset = await storage.getAsset(assetId);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      // Verify ownership
      const property = await storage.getProperty(asset.propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offsetNum = parseInt(offset as string) || 0;

      const eventsList = await db
        .select()
        .from(events)
        .where(eq(events.assetId, assetId))
        .orderBy(desc(events.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(events)
        .where(eq(events.assetId, assetId));

      res.json({
        events: eventsList,
        pagination: {
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < totalCount,
        },
      });
    } catch (error) {
      console.error("Error fetching paginated events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Paginated assets endpoint (enhanced existing route)
  app.get('/api/assets/paginated/:propertyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId } = req.params;
      const { limit = 20, offset = 0, category } = req.query;

      const property = await storage.getProperty(propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(404).json({ error: "Property not found" });
      }

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offsetNum = parseInt(offset as string) || 0;

      let query = db
        .select()
        .from(assets)
        .where(eq(assets.propertyId, propertyId))
        .orderBy(desc(assets.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      if (category) {
        query = db
          .select()
          .from(assets)
          .where(and(eq(assets.propertyId, propertyId), eq(assets.category, category as string)))
          .orderBy(desc(assets.createdAt))
          .limit(limitNum)
          .offset(offsetNum);
      }

      const assetsList = await query;

      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(assets)
        .where(eq(assets.propertyId, propertyId));

      res.json({
        assets: assetsList,
        pagination: {
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < totalCount,
        },
      });
    } catch (error) {
      console.error("Error fetching paginated assets:", error);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  // Paginated reminders endpoint
  app.get('/api/reminders/paginated', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit = 20, offset = 0, status } = req.query;

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offsetNum = parseInt(offset as string) || 0;

      let whereConditions: any[] = [eq(reminders.userId, userId)];
      if (status) {
        whereConditions.push(eq(reminders.status, status as string));
      }

      const remindersList = await db
        .select()
        .from(reminders)
        .where(and(...whereConditions))
        .orderBy(asc(reminders.dueAt))
        .limit(limitNum)
        .offset(offsetNum);

      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(reminders)
        .where(and(...whereConditions));

      res.json({
        reminders: remindersList,
        pagination: {
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < totalCount,
        },
      });
    } catch (error) {
      console.error("Error fetching paginated reminders:", error);
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  });

  // Paginated documents endpoint
  app.get('/api/documents/paginated', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit = 20, offset = 0, assetId, propertyId } = req.query;

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offsetNum = parseInt(offset as string) || 0;

      let whereConditions: any[] = [eq(documents.userId, userId)];
      if (assetId) {
        whereConditions.push(eq(documents.assetId, assetId as string));
      }
      if (propertyId) {
        whereConditions.push(eq(documents.propertyId, propertyId as string));
      }

      const documentsList = await db
        .select()
        .from(documents)
        .where(and(...whereConditions))
        .orderBy(desc(documents.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(documents)
        .where(and(...whereConditions));

      res.json({
        documents: documentsList,
        pagination: {
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < totalCount,
        },
      });
    } catch (error) {
      console.error("Error fetching paginated documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Paginated identifiers (claimed stickers) endpoint
  app.get('/api/identifiers/paginated', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit = 20, offset = 0 } = req.query;

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offsetNum = parseInt(offset as string) || 0;

      const identifiersList = await db
        .select()
        .from(identifiers)
        .where(eq(identifiers.userId, userId))
        .orderBy(desc(identifiers.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(identifiers)
        .where(eq(identifiers.userId, userId));

      res.json({
        identifiers: identifiersList,
        pagination: {
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < totalCount,
        },
      });
    } catch (error) {
      console.error("Error fetching paginated identifiers:", error);
      res.status(500).json({ error: "Failed to fetch identifiers" });
    }
  });

  // Paginated property manager tasks endpoint
  app.get('/api/property-manager/tasks/paginated', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit = 20, offset = 0, propertyId, status, workerId } = req.query;

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offsetNum = parseInt(offset as string) || 0;

      const managedProps = await db
        .select()
        .from(managedProperties)
        .where(eq(managedProperties.propertyManagerId, userId));

      if (!managedProps || managedProps.length === 0) {
        return res.json({ tasks: [], pagination: { total: 0, limit: limitNum, offset: offsetNum, hasMore: false } });
      }

      const managedPropertyIds = managedProps.map(p => p.id);
      let whereConditions: any[] = [sql`${propertyTasks.managedPropertyId} IN ${managedPropertyIds}`];

      if (propertyId) {
        whereConditions.push(eq(propertyTasks.managedPropertyId, propertyId as string));
      }
      if (status) {
        whereConditions.push(eq(propertyTasks.status, status as string));
      }
      if (workerId) {
        whereConditions.push(eq(propertyTasks.assignedTo, workerId as string));
      }

      const tasksList = await db
        .select()
        .from(propertyTasks)
        .where(and(...whereConditions))
        .orderBy(desc(propertyTasks.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(propertyTasks)
        .where(and(...whereConditions));

      res.json({
        tasks: tasksList,
        pagination: {
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < totalCount,
        },
      });
    } catch (error) {
      console.error("Error fetching paginated tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Paginated property manager visits endpoint
  app.get('/api/property-manager/visits/paginated', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit = 20, offset = 0, propertyId, workerId, status } = req.query;

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offsetNum = parseInt(offset as string) || 0;

      const managedProps = await db
        .select()
        .from(managedProperties)
        .where(eq(managedProperties.propertyManagerId, userId));

      if (!managedProps || managedProps.length === 0) {
        return res.json({ visits: [], pagination: { total: 0, limit: limitNum, offset: offsetNum, hasMore: false } });
      }

      const managedPropertyIds = managedProps.map(p => p.id);
      let whereConditions: any[] = [sql`${propertyVisits.managedPropertyId} IN ${managedPropertyIds}`];

      if (propertyId) {
        whereConditions.push(eq(propertyVisits.managedPropertyId, propertyId as string));
      }
      if (workerId) {
        whereConditions.push(eq(propertyVisits.workerId, workerId as string));
      }
      if (status) {
        whereConditions.push(eq(propertyVisits.status, status as string));
      }

      const visitsList = await db
        .select()
        .from(propertyVisits)
        .where(and(...whereConditions))
        .orderBy(desc(propertyVisits.checkInTime))
        .limit(limitNum)
        .offset(offsetNum);

      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(propertyVisits)
        .where(and(...whereConditions));

      res.json({
        visits: visitsList,
        pagination: {
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < totalCount,
        },
      });
    } catch (error) {
      console.error("Error fetching paginated visits:", error);
      res.status(500).json({ error: "Failed to fetch visits" });
    }
  });

  // Paginated property manager tenant reports endpoint
  app.get('/api/property-manager/tenant-reports/paginated', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit = 20, offset = 0, propertyId, status } = req.query;

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offsetNum = parseInt(offset as string) || 0;

      const managedProps = await db
        .select()
        .from(managedProperties)
        .where(eq(managedProperties.propertyManagerId, userId));

      if (!managedProps || managedProps.length === 0) {
        return res.json({ reports: [], pagination: { total: 0, limit: limitNum, offset: offsetNum, hasMore: false } });
      }

      const managedPropertyIds = managedProps.map(p => p.id);
      let whereConditions: any[] = [sql`${tenantReports.managedPropertyId} IN ${managedPropertyIds}`];

      if (propertyId) {
        whereConditions.push(eq(tenantReports.managedPropertyId, propertyId as string));
      }
      if (status) {
        whereConditions.push(eq(tenantReports.status, status as string));
      }

      const reportsList = await db
        .select()
        .from(tenantReports)
        .where(and(...whereConditions))
        .orderBy(desc(tenantReports.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(tenantReports)
        .where(and(...whereConditions));

      res.json({
        reports: reportsList,
        pagination: {
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < totalCount,
        },
      });
    } catch (error) {
      console.error("Error fetching paginated tenant reports:", error);
      res.status(500).json({ error: "Failed to fetch tenant reports" });
    }
  });

  // Task 9: Services status endpoint (public, no auth required)
  app.get('/api/services/status', (req, res) => {
    res.json({
      stripe: !!stripe,
      email: !!process.env.RESEND_API_KEY,
      sms: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)
    });
  });

  // DEV TESTING MODE: Onboarding endpoint (bypasses Stripe for testing)
  app.post('/api/onboarding/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { plan, ...onboardingData } = req.body;

      // Map plan to role
      const roleMap: Record<string, string> = {
        'homeowner_base': 'HOMEOWNER',
        'contractor_starter': 'CONTRACTOR',
        'contractor_pro': 'CONTRACTOR',
        'contractor_elite': 'CONTRACTOR',
        'fleet_base': 'FLEET',
        'property_manager_base': 'PROPERTY_MANAGER',
      };

      const role = roleMap[plan];
      if (!role) {
        return res.status(400).json({ error: 'Invalid plan type' });
      }

      // Normalize propertyTypes and industries arrays for all roles
      const propertyTypes = Array.isArray(onboardingData.propertyTypes) 
        ? onboardingData.propertyTypes 
        : (onboardingData.propertyTypes ? [onboardingData.propertyTypes] : null);
      
      const industries = Array.isArray(onboardingData.industries) 
        ? onboardingData.industries 
        : (onboardingData.industries ? [onboardingData.industries] : null);

      // Update user with role, email, phone, notification preference, and property preferences
      await db
        .update(users)
        .set({
          role,
          email: onboardingData.email || null,
          phone: onboardingData.phone || null,
          notificationPreference: onboardingData.notificationPreference || 'EMAIL_AND_SMS',
          propertyTypes: propertyTypes, // Save full array for homeowners
          industries: industries, // Save full array for fleet managers
        })
        .where(eq(users.id, userId));

      // Handle role-specific onboarding data
      if (role === 'CONTRACTOR') {
        // Normalize arrays (forms send arrays, ensure we don't double-wrap)
        const serviceAreas = Array.isArray(onboardingData.serviceAreas) 
          ? onboardingData.serviceAreas 
          : (onboardingData.serviceAreas ? [onboardingData.serviceAreas] : []);
        const specialties = Array.isArray(onboardingData.specialties)
          ? onboardingData.specialties
          : (onboardingData.specialties ? [onboardingData.specialties] : []);

        // Create or update contractor profile
        await db
          .insert(contractors)
          .values({
            userId,
            companyName: onboardingData.companyName || 'Unknown Company',
            licenseNumber: onboardingData.licenseNumber || null,
            serviceAreas,
            specialties,
            monthlyQuota: plan === 'contractor_elite' ? 250 : (plan === 'contractor_pro' ? 100 : 50), // Elite gets 250, Pro gets 100, Starter gets 50
            quotaUsed: 0,
          })
          .onConflictDoUpdate({
            target: contractors.userId,
            set: {
              companyName: onboardingData.companyName || 'Unknown Company',
              licenseNumber: onboardingData.licenseNumber || null,
              serviceAreas,
              specialties,
            },
          });
      } else if (role === 'HOMEOWNER' && onboardingData.propertyAddress) {
        // Normalize property types array
        const propertyTypes = Array.isArray(onboardingData.propertyTypes) 
          ? onboardingData.propertyTypes 
          : (onboardingData.propertyTypes ? [onboardingData.propertyTypes] : []);
        
        // Guard against empty array
        if (propertyTypes.length === 0) {
          return res.status(400).json({ error: 'Please select at least one property type' });
        }
        
        // Create initial property for homeowner with address from onboarding
        // Use first property type from array for the initial property
        await db.insert(properties).values({
          ownerId: userId,
          name: onboardingData.propertyName || 'My Home',
          addressLine1: onboardingData.propertyAddress,
          city: onboardingData.city || null,
          state: onboardingData.state || null,
          postalCode: onboardingData.zip || null,
          propertyType: propertyTypes[0],
          homePlan: plan,
          homeStatus: 'ACTIVE',
        }).onConflictDoNothing();
        
        console.log(`[DEV] Homeowner created with property types: ${propertyTypes.join(', ')}`);
      } else if (role === 'FLEET') {
        // Normalize industries array
        const industries = Array.isArray(onboardingData.industries) 
          ? onboardingData.industries 
          : (onboardingData.industries ? [onboardingData.industries] : []);
        
        // Guard against empty array
        if (industries.length === 0) {
          return res.status(400).json({ error: 'Please select at least one industry' });
        }
        
        // For fleet, industry and categories are stored in onboardingData but not persisted to a specific table
        // This is acceptable for dev testing - they can add equipment through the dashboard
        console.log(`[DEV] Fleet user created with industries: ${industries.join(', ')}, categories: ${onboardingData.assetCategories}`);
      } else if (role === 'PROPERTY_MANAGER' && onboardingData.planMetadata) {
        const { propertyCount, propertiesSeed = [], workersSeed = [], selectedAddOns = [] } = onboardingData.planMetadata;
        
        console.log(`[DEV] Property Manager onboarding: ${propertyCount} properties, ${propertiesSeed.length} addresses, ${workersSeed.length} workers, ${selectedAddOns.length} add-ons`);
        
        // Pre-validate all seeds before starting transaction
        const validationErrors: string[] = [];
        
        // Validate property seeds
        propertiesSeed.forEach((seed: any, index: number) => {
          if (!seed.street || !seed.city || !seed.state || !seed.postalCode) {
            validationErrors.push(`Property #${index + 1}: missing required fields (street, city, state, postalCode)`);
          }
        });
        
        // Validate worker seeds
        workersSeed.forEach((seed: any, index: number) => {
          if (!seed.name || !seed.role || !seed.phone) {
            validationErrors.push(`Worker #${index + 1}: missing required fields (name, role, phone)`);
          }
        });
        
        // If any seeds are invalid, fail immediately
        if (validationErrors.length > 0) {
          return res.status(400).json({ 
            error: 'Invalid onboarding data', 
            validationErrors 
          });
        }
        
        let propertiesCreated = 0;
        let workersCreated = 0;
        
        try {
          // Wrap all creation in a transaction for atomicity
          await db.transaction(async (tx) => {
            // Create properties from seed data
            for (const propertySeed of propertiesSeed) {
              // Create base property and managed property link atomically
              const [property] = await tx.insert(properties).values({
                ownerId: userId,
                name: `${propertySeed.street}, ${propertySeed.city}`,
                addressLine1: propertySeed.street,
                city: propertySeed.city,
                state: propertySeed.state,
                postalCode: propertySeed.postalCode,
                propertyType: propertySeed.propertyType || 'RENTAL',
              }).returning();
              
              // Create managed property link with unique master QR
              const masterQrCode = `PM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              await tx.insert(managedProperties).values({
                propertyManagerId: userId,
                propertyId: property.id,
                managementStatus: 'ACTIVE',
                masterQrCode,
              });
              
              propertiesCreated++;
            }
            
            // Create workers from seed data
            for (const workerSeed of workersSeed) {
              await tx.insert(workers).values({
                propertyManagerId: userId,
                name: workerSeed.name,
                role: workerSeed.role,
                phone: workerSeed.phone,
                email: workerSeed.email || null,
                status: 'ACTIVE',
              });
              
              workersCreated++;
            }
          });
          
          console.log(`[DEV] Property Manager created: ${propertiesCreated} properties, ${workersCreated} workers`);
        } catch (error: any) {
          console.error('[DEV] Property Manager onboarding error:', error);
          // Return 400 for constraint/validation errors, 500 for unexpected errors
          if (error.message?.includes('constraint') || error.message?.includes('violates') || error.message?.includes('duplicate')) {
            return res.status(400).json({ 
              error: 'Database constraint violation',
              details: error.message 
            });
          }
          throw error; // Re-throw unexpected errors to be caught by outer try-catch
        }
      }

      res.json({
        success: true,
        role,
        message: `Account configured as ${role}`,
      });
    } catch (error: any) {
      console.error('Onboarding error:', error);
      res.status(500).json({ error: 'Failed to complete onboarding' });
    }
  });

  // ========================================
  // Property Manager API Routes
  // ========================================

  // Get all managed properties for current property manager
  app.get('/api/property-manager/properties', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const managed = await db
        .select({
          id: managedProperties.id,
          managedPropertyId: managedProperties.id,
          propertyId: managedProperties.propertyId,
          managementStatus: managedProperties.managementStatus,
          masterQrCode: managedProperties.masterQrCode,
          createdAt: managedProperties.createdAt,
          property: properties,
        })
        .from(managedProperties)
        .innerJoin(properties, eq(managedProperties.propertyId, properties.id))
        .where(eq(managedProperties.propertyManagerId, userId))
        .orderBy(desc(managedProperties.createdAt));
      
      res.json(managed);
    } catch (error) {
      console.error('Error fetching managed properties:', error);
      res.status(500).json({ error: 'Failed to fetch properties' });
    }
  });

  // Add a new managed property
  app.post('/api/property-manager/properties', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { addressLine1, city, state, postalCode, propertyType, name } = req.body;
      
      if (!addressLine1 || !city || !state || !postalCode) {
        return res.status(400).json({ error: 'Address fields are required' });
      }
      
      await db.transaction(async (tx) => {
        // Create property
        const [property] = await tx.insert(properties).values({
          ownerId: userId,
          name: name || `${addressLine1}, ${city}`,
          addressLine1,
          city,
          state,
          postalCode,
          propertyType: propertyType || 'RENTAL',
        }).returning();
        
        // Create managed property link
        const masterQrCode = `PM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const [managedProperty] = await tx.insert(managedProperties).values({
          propertyManagerId: userId,
          propertyId: property.id,
          managementStatus: 'ACTIVE',
          masterQrCode,
        }).returning();
        
        res.json({ property, managedProperty });
      });
    } catch (error) {
      console.error('Error creating managed property:', error);
      res.status(500).json({ error: 'Failed to create property' });
    }
  });

  // Update managed property (full edit)
  app.patch('/api/property-manager/properties/:id', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { name, addressLine1, city, state, postalCode, country, propertyType, managementStatus } = req.body;
      
      // Verify ownership
      const [existing] = await db
        .select()
        .from(managedProperties)
        .where(and(eq(managedProperties.id, id), eq(managedProperties.propertyManagerId, userId)))
        .limit(1);
      
      if (!existing) {
        return res.status(404).json({ error: 'Managed property not found' });
      }
      
      // Update the underlying property if property fields provided
      if (name || addressLine1 || city || state || postalCode || country || propertyType) {
        const propertyUpdates: any = { updatedAt: new Date() };
        if (name) propertyUpdates.name = name;
        if (addressLine1) propertyUpdates.addressLine1 = addressLine1;
        if (city) propertyUpdates.city = city;
        if (state) propertyUpdates.state = state;
        if (postalCode) propertyUpdates.postalCode = postalCode;
        if (country !== undefined) propertyUpdates.country = country;
        if (propertyType) propertyUpdates.propertyType = propertyType;
        
        await db
          .update(properties)
          .set(propertyUpdates)
          .where(eq(properties.id, existing.propertyId));
      }
      
      // Update management status if provided
      if (managementStatus) {
        await db
          .update(managedProperties)
          .set({ managementStatus, updatedAt: new Date() })
          .where(eq(managedProperties.id, id));
      }
      
      // Return updated managed property with property details
      const [updated] = await db
        .select()
        .from(managedProperties)
        .innerJoin(properties, eq(managedProperties.propertyId, properties.id))
        .where(eq(managedProperties.id, id))
        .limit(1);
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating managed property:', error);
      res.status(500).json({ error: 'Failed to update property' });
    }
  });
  
  // Delete managed property
  app.delete('/api/property-manager/properties/:id', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Verify ownership
      const [existing] = await db
        .select()
        .from(managedProperties)
        .where(and(eq(managedProperties.id, id), eq(managedProperties.propertyManagerId, userId)))
        .limit(1);
      
      if (!existing) {
        return res.status(404).json({ error: 'Managed property not found' });
      }
      
      // Delete the managed property link
      await db
        .delete(managedProperties)
        .where(eq(managedProperties.id, id));
      
      res.json({ success: true, message: 'Property removed from management' });
    } catch (error) {
      console.error('Error deleting managed property:', error);
      res.status(500).json({ error: 'Failed to delete property' });
    }
  });

  // Get all workers for current property manager
  app.get('/api/property-manager/workers', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const workersList = await db
        .select()
        .from(workers)
        .where(eq(workers.propertyManagerId, userId))
        .orderBy(desc(workers.createdAt));
      
      res.json(workersList);
    } catch (error) {
      console.error('Error fetching workers:', error);
      res.status(500).json({ error: 'Failed to fetch workers' });
    }
  });

  // Add a new worker
  app.post('/api/property-manager/workers', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, role, phone, email } = req.body;
      
      if (!name || !role || !phone) {
        return res.status(400).json({ error: 'Name, role, and phone are required' });
      }
      
      const [worker] = await db.insert(workers).values({
        propertyManagerId: userId,
        name,
        role,
        phone,
        email: email || null,
        status: 'ACTIVE',
      }).returning();
      
      res.json(worker);
    } catch (error) {
      console.error('Error creating worker:', error);
      res.status(500).json({ error: 'Failed to create worker' });
    }
  });

  // Update worker status or details
  app.patch('/api/property-manager/workers/:id', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const updates = req.body;
      
      // Verify ownership
      const existing = await db
        .select()
        .from(workers)
        .where(and(eq(workers.id, id), eq(workers.propertyManagerId, userId)))
        .limit(1);
      
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Worker not found' });
      }
      
      const [updated] = await db
        .update(workers)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(workers.id, id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating worker:', error);
      res.status(500).json({ error: 'Failed to update worker' });
    }
  });

  // Get all tasks for property manager
  app.get('/api/property-manager/tasks', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId, status, workerId } = req.query;
      
      let query = db
        .select({
          task: propertyTasks,
          property: managedProperties,
          worker: workers,
        })
        .from(propertyTasks)
        .innerJoin(managedProperties, eq(propertyTasks.managedPropertyId, managedProperties.id))
        .leftJoin(workers, eq(propertyTasks.assignedTo, workers.id))
        .where(eq(managedProperties.propertyManagerId, userId));
      
      // Apply filters
      if (propertyId) {
        query = query.where(and(
          eq(managedProperties.propertyManagerId, userId),
          eq(propertyTasks.managedPropertyId, propertyId as string)
        ));
      }
      if (status) {
        query = query.where(and(
          eq(managedProperties.propertyManagerId, userId),
          eq(propertyTasks.status, status as string)
        ));
      }
      if (workerId) {
        query = query.where(and(
          eq(managedProperties.propertyManagerId, userId),
          eq(propertyTasks.assignedTo, workerId as string)
        ));
      }
      
      const tasks = await query.orderBy(desc(propertyTasks.createdAt));
      
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Create a new task
  app.post('/api/property-manager/tasks', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { managedPropertyId, title, description, taskType, priority, assignedTo, dueDate, isRecurring, recurringFrequency } = req.body;
      
      if (!managedPropertyId || !title) {
        return res.status(400).json({ error: 'Property and title are required' });
      }
      
      // Verify property ownership
      const property = await db
        .select()
        .from(managedProperties)
        .where(and(
          eq(managedProperties.id, managedPropertyId),
          eq(managedProperties.propertyManagerId, userId)
        ))
        .limit(1);
      
      if (property.length === 0) {
        return res.status(404).json({ error: 'Managed property not found' });
      }
      
      const [task] = await db.insert(propertyTasks).values({
        managedPropertyId,
        title,
        description,
        taskType: taskType || 'GENERAL',
        priority: priority || 'MEDIUM',
        status: 'PENDING',
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        isRecurring: isRecurring || false,
        recurringFrequency: recurringFrequency || null,
        createdBy: userId,
      }).returning();
      
      res.json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // Update task status or assignment
  app.patch('/api/property-manager/tasks/:id', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const updates = req.body;
      
      // Verify ownership through managed property
      const task = await db
        .select({ task: propertyTasks, property: managedProperties })
        .from(propertyTasks)
        .innerJoin(managedProperties, eq(propertyTasks.managedPropertyId, managedProperties.id))
        .where(and(
          eq(propertyTasks.id, id),
          eq(managedProperties.propertyManagerId, userId)
        ))
        .limit(1);
      
      if (task.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      // Handle completion timestamp
      if (updates.status === 'COMPLETED' && !task[0].task.completedAt) {
        updates.completedAt = new Date();
      }
      
      const [updated] = await db
        .update(propertyTasks)
        .set(updates)
        .where(eq(propertyTasks.id, id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  // Get visit history
  app.get('/api/property-manager/visits', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId, workerId, status } = req.query;
      
      let query = db
        .select({
          visit: propertyVisits,
          property: managedProperties,
          worker: workers,
        })
        .from(propertyVisits)
        .innerJoin(managedProperties, eq(propertyVisits.managedPropertyId, managedProperties.id))
        .innerJoin(workers, eq(propertyVisits.workerId, workers.id))
        .where(eq(managedProperties.propertyManagerId, userId));
      
      if (propertyId) {
        query = query.where(and(
          eq(managedProperties.propertyManagerId, userId),
          eq(propertyVisits.managedPropertyId, propertyId as string)
        ));
      }
      if (workerId) {
        query = query.where(and(
          eq(managedProperties.propertyManagerId, userId),
          eq(propertyVisits.workerId, workerId as string)
        ));
      }
      if (status) {
        query = query.where(and(
          eq(managedProperties.propertyManagerId, userId),
          eq(propertyVisits.status, status as string)
        ));
      }
      
      const visits = await query.orderBy(desc(propertyVisits.checkInAt));
      
      res.json(visits);
    } catch (error) {
      console.error('Error fetching visits:', error);
      res.status(500).json({ error: 'Failed to fetch visits' });
    }
  });

  // Get tenant reports
  app.get('/api/property-manager/tenant-reports', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId, status } = req.query;
      
      let query = db
        .select({
          report: tenantReports,
          property: managedProperties,
          assignedWorker: workers,
        })
        .from(tenantReports)
        .innerJoin(managedProperties, eq(tenantReports.managedPropertyId, managedProperties.id))
        .leftJoin(workers, eq(tenantReports.assignedTo, workers.id))
        .where(eq(managedProperties.propertyManagerId, userId));
      
      if (propertyId) {
        query = query.where(and(
          eq(managedProperties.propertyManagerId, userId),
          eq(tenantReports.managedPropertyId, propertyId as string)
        ));
      }
      if (status) {
        query = query.where(and(
          eq(managedProperties.propertyManagerId, userId),
          eq(tenantReports.status, status as string)
        ));
      }
      
      const reports = await query.orderBy(desc(tenantReports.reportedAt));
      
      res.json(reports);
    } catch (error) {
      console.error('Error fetching tenant reports:', error);
      res.status(500).json({ error: 'Failed to fetch tenant reports' });
    }
  });

  // Update tenant report (assign, resolve, etc.)
  app.patch('/api/property-manager/tenant-reports/:id', isAuthenticated, requireRole('PROPERTY_MANAGER'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const updates = req.body;
      
      // Verify ownership
      const report = await db
        .select({ report: tenantReports, property: managedProperties })
        .from(tenantReports)
        .innerJoin(managedProperties, eq(tenantReports.managedPropertyId, managedProperties.id))
        .where(and(
          eq(tenantReports.id, id),
          eq(managedProperties.propertyManagerId, userId)
        ))
        .limit(1);
      
      if (report.length === 0) {
        return res.status(404).json({ error: 'Tenant report not found' });
      }
      
      // Handle resolution timestamp
      if (updates.status === 'RESOLVED' && !report[0].report.resolvedAt) {
        updates.resolvedAt = new Date();
        updates.resolvedBy = userId;
      }
      
      const [updated] = await db
        .update(tenantReports)
        .set(updates)
        .where(eq(tenantReports.id, id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating tenant report:', error);
      res.status(500).json({ error: 'Failed to update tenant report' });
    }
  });

  // Public endpoint: Submit tenant report (no auth required)
  app.post('/api/public/tenant-report/:masterQrCode', async (req, res) => {
    try {
      const { masterQrCode } = req.params;
      const { reporterName, reporterPhone, reporterEmail, issueType, title, description, photoUrls, priority } = req.body;
      
      if (!issueType || !title || !description) {
        return res.status(400).json({ error: 'Issue type, title, and description are required' });
      }
      
      // Find managed property by master QR code
      const managedProperty = await db
        .select()
        .from(managedProperties)
        .where(eq(managedProperties.masterQrCode, masterQrCode))
        .limit(1);
      
      if (managedProperty.length === 0) {
        return res.status(404).json({ error: 'Property not found' });
      }
      
      // Check property manager's entitlements
      const { getUserEntitlements } = await import('./entitlements/service');
      const entitlements = await getUserEntitlements(managedProperty[0].propertyManagerId);
      
      if (!entitlements.tenantReports) {
        return res.status(403).json({ 
          error: 'Tenant reporting is not enabled for this property. Property manager needs to upgrade their subscription.',
          upgradeRequired: true
        });
      }
      
      // Rate limiting: Check hourly and daily limits per IP per property
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
      const ipPropertyKey = `${clientIp}:${managedProperty[0].id}`;
      
      const { checkRateLimit, RATE_LIMITS } = await import('./rateLimiter');
      
      // Check hourly limit
      const hourlyLimit = checkRateLimit(ipPropertyKey, 'tenant-report-hourly', RATE_LIMITS.TENANT_REPORT);
      if (!hourlyLimit.allowed) {
        const retryAfter = Math.ceil((hourlyLimit.resetAt - Date.now()) / 1000);
        return res.status(429).json({ 
          error: 'Too many reports submitted. Please try again later.',
          retryAfter,
          contactSupport: 'If you need immediate assistance, please contact property management directly.'
        });
      }
      
      // Check daily limit
      const dailyLimit = checkRateLimit(ipPropertyKey, 'tenant-report-daily', RATE_LIMITS.TENANT_REPORT_DAILY);
      if (!dailyLimit.allowed) {
        const retryAfter = Math.ceil((dailyLimit.resetAt - Date.now()) / 1000);
        return res.status(429).json({ 
          error: 'Daily report limit exceeded (20 reports per day).',
          retryAfter,
          contactSupport: 'For urgent issues, please contact property management directly.'
        });
      }
      
      const [report] = await db.insert(tenantReports).values({
        managedPropertyId: managedProperty[0].id,
        reporterName,
        reporterPhone,
        reporterEmail,
        issueType,
        title,
        description,
        photoUrls: photoUrls || [],
        priority: priority || 'MEDIUM',
        status: 'PENDING',
      }).returning();
      
      res.json(report);
    } catch (error) {
      console.error('Error submitting tenant report:', error);
      res.status(500).json({ error: 'Failed to submit report' });
    }
  });

  // Get worker's active visits
  app.get('/api/worker/visits/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get worker record for authenticated user
      const worker = await db
        .select()
        .from(workers)
        .where(eq(workers.userId, userId))
        .limit(1);
      
      if (worker.length === 0) {
        return res.json([]);
      }
      
      // Get active visits for this worker
      const activeVisits = await db
        .select()
        .from(propertyVisits)
        .where(and(
          eq(propertyVisits.workerId, worker[0].id),
          eq(propertyVisits.status, 'IN_PROGRESS')
        ));
      
      res.json(activeVisits);
    } catch (error) {
      console.error('Error getting active visits:', error);
      res.status(500).json({ error: 'Failed to get active visits' });
    }
  });

  // Get a specific visit by ID
  app.get('/api/worker/visits/:visitId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { visitId } = req.params;
      
      // Get worker record for authenticated user
      const worker = await db
        .select()
        .from(workers)
        .where(eq(workers.userId, userId))
        .limit(1);
      
      if (worker.length === 0) {
        return res.status(403).json({ error: 'Worker account not found' });
      }
      
      // Get visit and verify it belongs to this worker
      const [visit] = await db
        .select()
        .from(propertyVisits)
        .where(and(
          eq(propertyVisits.id, visitId),
          eq(propertyVisits.workerId, worker[0].id)
        ))
        .limit(1);
      
      if (!visit) {
        return res.status(404).json({ error: 'Visit not found' });
      }
      
      res.json(visit);
    } catch (error) {
      console.error('Error getting visit:', error);
      res.status(500).json({ error: 'Failed to get visit' });
    }
  });

  // Worker check-in endpoint (accessible to workers and property managers)
  app.post('/api/worker/check-in', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { masterQrCode, location, method, overrideReason } = req.body;
      
      if (!masterQrCode) {
        return res.status(400).json({ error: 'QR code is required' });
      }
      
      // Find managed property by QR code
      const managedProperty = await db
        .select()
        .from(managedProperties)
        .where(eq(managedProperties.masterQrCode, masterQrCode))
        .limit(1);
      
      if (managedProperty.length === 0) {
        return res.status(404).json({ error: 'Property not found' });
      }
      
      // Get worker record for authenticated user
      const worker = await db
        .select()
        .from(workers)
        .where(and(
          eq(workers.userId, userId),
          eq(workers.propertyManagerId, managedProperty[0].propertyManagerId)
        ))
        .limit(1);
      
      if (worker.length === 0) {
        return res.status(403).json({ error: 'You are not authorized to check in at this property. Contact your property manager.' });
      }
      
      // Check for existing active visit for this worker
      const existingActiveVisit = await db
        .select()
        .from(propertyVisits)
        .where(and(
          eq(propertyVisits.workerId, worker[0].id),
          eq(propertyVisits.status, 'IN_PROGRESS')
        ))
        .limit(1);
      
      if (existingActiveVisit.length > 0) {
        return res.status(409).json({ 
          error: 'You already have an active visit. Please complete it before starting a new one.',
          activeVisitId: existingActiveVisit[0].id
        });
      }
      
      // Require GPS location for check-in
      if (!location || !location.lat || !location.lng) {
        return res.status(400).json({ 
          error: 'GPS location is required for check-in. Please enable location services.',
          requiresLocation: true
        });
      }
      
      // Validate geofence
      const { evaluateGeofenceStatus } = await import('./geofence');
      
      const geofenceResult = evaluateGeofenceStatus(
        location,
        managedProperty[0].geofenceCenter,
        parseFloat(managedProperty[0].geofenceRadiusMeters ?? '100'),
        managedProperty[0].geofenceManualOverrideAllowed ?? true
      );
      
      const locationWithVerified = {
        ...location,
        verified: geofenceResult.status === 'ok',
      };
      
      // Hard block if too far and no override reason provided
      if (geofenceResult.status === 'hard_block' && !overrideReason) {
        // If manual override is not allowed, reject completely
        if (!geofenceResult.overrideAllowed) {
          return res.status(403).json({ 
            error: 'Manual override is not allowed for this property. Please move closer to check in.',
            geofence: geofenceResult,
            requiresOverride: false
          });
        }
        
        return res.status(409).json({ 
          error: 'Geofence validation failed',
          geofence: geofenceResult,
          requiresOverride: true
        });
      }
      
      // Create visit record
      const [visit] = await db.insert(propertyVisits).values({
        managedPropertyId: managedProperty[0].id,
        workerId: worker[0].id,
        checkInAt: new Date(),
        checkInLocation: locationWithVerified || null,
        checkInMethod: method || 'QR',
        status: 'IN_PROGRESS',
        visitSummary: overrideReason ? `Manual override: ${overrideReason}` : null,
      }).returning();
      
      res.json({ 
        visit,
        geofence: geofenceResult 
      });
    } catch (error) {
      console.error('Error checking in:', error);
      res.status(500).json({ error: 'Failed to check in' });
    }
  });

  // Worker check-out endpoint (accessible to workers who own the visit)
  app.patch('/api/worker/check-out/:visitId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { visitId } = req.params;
      const { location, method, visitSummary, photoUrls } = req.body;
      
      // Get worker record for authenticated user
      const workerRecord = await db
        .select()
        .from(workers)
        .where(eq(workers.userId, userId))
        .limit(1);
      
      if (workerRecord.length === 0) {
        return res.status(403).json({ error: 'Worker account not found' });
      }
      
      // Get visit and verify it belongs to this worker (direct ownership check)
      const existingVisit = await db
        .select()
        .from(propertyVisits)
        .where(and(
          eq(propertyVisits.id, visitId),
          eq(propertyVisits.workerId, workerRecord[0].id)
        ))
        .limit(1);
      
      if (existingVisit.length === 0) {
        return res.status(404).json({ error: 'Visit not found or does not belong to you' });
      }
      
      // Count completed tasks for this visit
      const completedTasks = await db
        .select({ count: count() })
        .from(propertyTaskCompletions)
        .where(eq(propertyTaskCompletions.visitId, visitId));
      
      const tasksCompleted = completedTasks[0]?.count || 0;
      
      // Update visit record
      const [updated] = await db
        .update(propertyVisits)
        .set({
          checkOutAt: new Date(),
          checkOutLocation: location || null,
          checkOutMethod: method || 'QR',
          visitSummary,
          photoUrls: photoUrls || [],
          tasksCompleted,
          status: 'COMPLETED',
          completedAt: new Date(),
        })
        .where(and(
          eq(propertyVisits.id, visitId),
          eq(propertyVisits.workerId, workerRecord[0].id)
        ))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Error checking out:', error);
      res.status(500).json({ error: 'Failed to check out' });
    }
  });

  // DEV TESTING MODE: Delete Account - Comprehensive multi-table cleanup
  app.delete('/api/user/delete', isAuthenticated, async (req, res) => {
    const userId = req.user!.claims.sub;

    try {
      await db.transaction(async (tx) => {
        // 1. Delete notification_logs
        await tx.delete(notificationLogs).where(eq(notificationLogs.userId, userId));

        // 2. Get user's properties to find related assets
        const userProperties = await tx.select({ id: properties.id }).from(properties).where(eq(properties.ownerId, userId));
        const propertyIds = userProperties.map(p => p.id);

        if (propertyIds.length > 0) {
          // 3. Get all assets for these properties
          const userAssets = await tx.select({ id: assets.id, identifierId: assets.identifierId }).from(assets).where(
            inArray(assets.propertyId, propertyIds)
          );
          const assetIds = userAssets.map(a => a.id);
          const identifierIds = userAssets.map(a => a.identifierId).filter(Boolean) as string[];

          if (assetIds.length > 0) {
            // 4. Delete reminders for these assets
            await tx.delete(reminders).where(inArray(reminders.assetId, assetIds));

            // 5. Delete documents for these assets
            await tx.delete(documents).where(inArray(documents.assetId, assetIds));

            // 6. Delete events for these assets
            await tx.delete(events).where(inArray(events.assetId, assetIds));

            // 7. Delete transfers involving these assets
            await tx.delete(transfers).where(inArray(transfers.assetId, assetIds));

            // 8. Delete assets themselves
            await tx.delete(assets).where(inArray(assets.propertyId, propertyIds));

            // 9. Delete identifiers that were linked to these assets (unclaim them)
            if (identifierIds.length > 0) {
              await tx.update(identifiers)
                .set({ claimedAt: null })
                .where(inArray(identifiers.id, identifierIds));
            }
          }

          // 10. Delete inspections for these properties
          await tx.delete(inspections).where(inArray(inspections.propertyId, propertyIds));

          // 11. Delete service sessions for these properties
          await tx.delete(serviceSessions).where(inArray(serviceSessions.propertyId, propertyIds));

          // 12. Delete properties themselves
          await tx.delete(properties).where(eq(properties.ownerId, userId));
        }

        // 13. Get contractor profile if exists
        const contractorProfile = await tx.select({ id: contractors.id }).from(contractors).where(eq(contractors.userId, userId)).limit(1);
        if (contractorProfile.length > 0) {
          const contractorId = contractorProfile[0].id;

          // 14. Delete sticker orders
          await tx.delete(stickerOrders).where(eq(stickerOrders.contractorId, contractorId));

          // 15. Delete jobs
          await tx.delete(jobs).where(eq(jobs.contractorId, contractorId));

          // 16. Delete contractor profile
          await tx.delete(contractors).where(eq(contractors.userId, userId));
        }

        // 17. Delete jobs where user is the client
        await tx.delete(jobs).where(eq(jobs.clientId, userId));

        // 18. Delete transfers where user is fromUser or toUser
        await tx.delete(transfers).where(sql`${transfers.fromUserId} = ${userId} OR ${transfers.toUserId} = ${userId}`);

        // 19. Delete inspections where user is inspector
        await tx.delete(inspections).where(eq(inspections.inspectorId, userId));

        // 20. Delete service sessions where user is homeowner or worker
        await tx.delete(serviceSessions).where(sql`${serviceSessions.homeownerId} = ${userId} OR ${serviceSessions.workerId} = ${userId}`);

        // 21. Delete subscriptions
        await tx.delete(subscriptions).where(eq(subscriptions.userId, userId));

        // 22. Delete fleet operators
        const fleetOps = await tx.select({ id: fleetOperators.id }).from(fleetOperators).where(eq(fleetOperators.userId, userId));
        if (fleetOps.length > 0) {
          const operatorIds = fleetOps.map(o => o.id);
          await tx.delete(fleetOperatorAssets).where(inArray(fleetOperatorAssets.operatorId, operatorIds));
          await tx.delete(fleetOperators).where(eq(fleetOperators.userId, userId));
        }

        // 23. FINALLY: Delete the user record itself
        await tx.delete(users).where(eq(users.id, userId));

        console.log(`[DEV TESTING] Account deleted for user ${userId}`);
      });

      // Logout and clear session
      req.logout(() => {
        res.json({ success: true, message: 'Account deleted successfully' });
      });
    } catch (error: any) {
      console.error('[DEV TESTING] Account deletion error:', error);
      res.status(500).json({ error: 'Failed to delete account. Please contact support.' });
    }
  });

  // Public read-only endpoints with PII redaction
  app.get('/api/public/scan/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const identifier = await storage.getIdentifier(code);
      
      if (!identifier) {
        return res.status(404).json({ error: "QR code not found" });
      }

      // Get asset info if claimed (for ASSET type)
      let assetInfo = null;
      // Get property info if claimed (for MASTER type)
      let propertyInfo = null;

      if (identifier.claimedAt && identifier.id) {
        if (identifier.kind === 'ASSET') {
          const assets = await db
            .select()
            .from((await import('@shared/schema')).assets)
            .where(eq((await import('@shared/schema')).assets.identifierId, identifier.id))
            .limit(1);
          
          if (assets.length > 0) {
            const asset = assets[0];
            assetInfo = {
              id: asset.id,
              name: asset.name,
              category: asset.category,
              brand: asset.brand,
              model: asset.model,
              installedAt: asset.installedAt,
              status: asset.status,
            };
          }
        } else if (identifier.kind === 'HOUSE') {
          // For MASTER/HOUSE type, find the property linked to this identifier
          const properties = await db
            .select()
            .from((await import('@shared/schema')).properties)
            .where(eq((await import('@shared/schema')).properties.masterIdentifierId, identifier.id))
            .limit(1);

          if (properties.length > 0) {
            const property = properties[0];
            propertyInfo = {
              id: property.id,
            };
          }
        }
      }

      // Return public info without PII (no owner names, emails, addresses)
      res.json({
        code: identifier.code,
        type: identifier.kind, // ASSET or HOUSE
        brandLabel: identifier.brandLabel,
        claimed: !!identifier.claimedAt,
        asset: assetInfo,
        property: propertyInfo,
      });
    } catch (error) {
      console.error("Error scanning code:", error);
      res.status(500).json({ error: "Failed to scan code" });
    }
  });

  app.get('/api/public/asset/:assetId', async (req, res) => {
    try {
      const { assetId } = req.params;
      const asset = await storage.getAsset(assetId);
      
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      // SECURITY: Only show INFRASTRUCTURE assets publicly (not PERSONAL assets like jewelry)
      if (asset.assetType !== 'INFRASTRUCTURE') {
        return res.status(403).json({ error: "This asset is private and not publicly accessible" });
      }

      // SECURITY: Only show assets installed by contractors (has installer branding)
      if (!asset.installerId) {
        return res.status(403).json({ error: "This asset is not publicly accessible" });
      }

      // ANALYTICS: Track QR scan event for contractor
      try {
        await storage.createEvent({
          assetId,
          type: 'QR_SCANNED',
          data: {
            source: 'public_view',
            timestamp: new Date().toISOString(),
            // userAgent redacted for privacy
          },
          createdBy: 'public-anonymous', // Safe identifier for analytics
        });
      } catch (error) {
        // Don't fail the request if analytics fails
        console.error('Failed to track QR scan:', error);
      }

      // Get public event history (filter out private/sensitive events)
      const events = await storage.getAssetEvents(assetId);
      const publicEventTypes = ['INSTALLED', 'SERVICED', 'INSPECTION_PASSED', 'WARRANTY_RENEWED', 'MAINTENANCE_COMPLETED'];
      const publicEvents = events
        .filter(event => publicEventTypes.includes(event.type))
        .map(event => ({
          id: event.id,
          type: event.type,
          data: event.data,
          createdAt: event.createdAt,
          // No createdBy to avoid exposing user IDs
        }));

      // Get contractor branding for permanent marketing
      let contractorBranding = null;
      if (asset.installerId) {
        const contractor = await storage.getContractor(asset.installerId);
        if (contractor) {
          const contractorUser = await storage.getUser(contractor.userId);
          if (contractorUser) {
            contractorBranding = {
              companyName: contractor.companyName || 'Contractor',
              logoUrl: contractor.logoUrl,
              phone: contractorUser.phone,
              email: contractorUser.email,
              website: contractor.website,
            };
          }
        }
      }

      // Get documents and reminders
      const documents = await storage.getAssetDocuments(assetId);
      const reminders = await storage.getAssetReminders(assetId);

      // Return public asset info with contractor branding for permanent marketing
      res.json({
        id: asset.id,
        name: asset.name,
        category: asset.category,
        brand: asset.brand,
        model: asset.model,
        serial: asset.serial,
        installedAt: asset.installedAt,
        status: asset.status,
        warrantyUntil: asset.warrantyUntil,
        nextMaintenance: asset.nextMaintenance,
        events: publicEvents,
        contractorBranding, // Show contractor info for "permanent marketing" value prop
        documents: documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          type: doc.type,
          uploadedAt: doc.uploadedAt,
        })),
        reminders: reminders.map(r => ({
          title: r.title,
          dueAt: r.dueAt,
          status: r.status,
        })),
      });
    } catch (error) {
      console.error("Error fetching public asset:", error);
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  // Authenticated property view - shows ALL assets for owner, infrastructure only for others
  app.get('/api/property/:propertyId', isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId } = req.params;
      const userId = req.user.claims.sub;
      const property = await storage.getProperty(propertyId);
      
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      const isOwner = property.ownerId === userId;

      // Get all assets for this property
      const allAssets = await storage.getAssets(propertyId);
      
      // For owners: show ALL assets (both INFRASTRUCTURE and PERSONAL)
      // For others: only show INFRASTRUCTURE assets
      const visibleAssets = isOwner 
        ? allAssets
        : allAssets.filter((asset: any) => 
            asset.assetType === 'INFRASTRUCTURE' || !asset.assetType
          );

      // Get property owner for family branding
      const owner = await storage.getUser(property.ownerId);
      const familyBranding = owner?.familyName && owner?.familyLogoUrl ? {
        familyName: owner.familyName,
        familyLogoUrl: owner.familyLogoUrl,
      } : null;

      // Return property info with appropriate assets based on ownership
      res.json({
        id: property.id,
        name: property.name,
        address: property.addressLine1 ? {
          line1: property.addressLine1,
          city: property.city,
          state: property.state,
          postalCode: property.postalCode,
        } : null,
        familyBranding,
        isOwner,
        assets: visibleAssets.map((asset: any) => ({
          id: asset.id,
          name: asset.name,
          category: asset.category,
          brand: asset.brand,
          model: asset.model,
          installedAt: asset.installedAt,
          status: asset.status,
          assetType: asset.assetType || 'INFRASTRUCTURE',
        })),
      });
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  // Public property view - shows property + infrastructure assets
  app.get('/api/public/property/:propertyId', async (req, res) => {
    try {
      const { propertyId } = req.params;
      const property = await storage.getProperty(propertyId);
      
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      // Get all assets for this property
      const allAssets = await storage.getAssets(propertyId);
      
      // For public view: only show INFRASTRUCTURE assets (not PERSONAL items)
      const publicAssets = allAssets.filter((asset: any) => 
        asset.assetType === 'INFRASTRUCTURE' || !asset.assetType // Default to infrastructure if not set
      );

      // Get property owner for family branding (but not PII like email)
      const owner = await storage.getUser(property.ownerId);
      const familyBranding = owner?.familyName && owner?.familyLogoUrl ? {
        familyName: owner.familyName,
        familyLogoUrl: owner.familyLogoUrl,
      } : null;

      // Return public property info with infrastructure assets only
      res.json({
        id: property.id,
        name: property.name,
        address: property.addressLine1 ? {
          line1: property.addressLine1,
          city: property.city,
          state: property.state,
          postalCode: property.postalCode,
        } : null,
        familyBranding,
        assets: publicAssets.map((asset: any) => ({
          id: asset.id,
          name: asset.name,
          category: asset.category,
          brand: asset.brand,
          model: asset.model,
          installedAt: asset.installedAt,
          status: asset.status,
        })),
      });
    } catch (error) {
      console.error("Error fetching public property:", error);
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  // Legacy scan route (redirect to public endpoint)
  app.get('/api/scan/:code', async (req, res) => {
    res.redirect(301, `/api/public/scan/${req.params.code}`);
  });

  // ============================================
  // CONTRACTOR MANAGEMENT ROUTES
  // ============================================
  
  // Get all assets installed by contractor and their workers
  app.get('/api/contractor/assets', isAuthenticated, requireRole('CONTRACTOR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get contractor record
      const [contractor] = await db.select().from(contractors).where(eq(contractors.userId, userId)).limit(1);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor profile not found" });
      }
      
      // Get all worker IDs for this contractor
      const { contractorWorkers } = await import('@shared/schema');
      const workers = await db.select().from(contractorWorkers)
        .where(eq(contractorWorkers.contractorId, contractor.id));
      const workerIds = workers.map(w => w.id);
      
      // Get all assets installed by contractor or their workers
      const contractorAssets = await db.select({
        id: assets.id,
        name: assets.name,
        category: assets.category,
        brand: assets.brand,
        model: assets.model,
        serialNumber: assets.serialNumber,
        status: assets.status,
        installedAt: assets.installedAt,
        installerId: assets.installerId,
        propertyId: assets.propertyId,
      })
      .from(assets)
      .where(
        workerIds.length > 0 
          ? or(eq(assets.installerId, userId), inArray(assets.installerId, workerIds))
          : eq(assets.installerId, userId)
      )
      .orderBy(desc(assets.installedAt));
      
      // Enrich with property names
      const propertyIds = [...new Set(contractorAssets.map(a => a.propertyId))];
      
      let propertiesData: any[] = [];
      if (propertyIds.length > 0) {
        propertiesData = await db.select({
          id: properties.id,
          name: properties.name,
          address: properties.address,
        })
        .from(properties)
        .where(inArray(properties.id, propertyIds));
      }
      
      const propertyMap = new Map(propertiesData.map(p => [p.id, p]));
      
      const enrichedAssets = contractorAssets.map(asset => ({
        ...asset,
        propertyName: propertyMap.get(asset.propertyId)?.name || null,
        propertyAddress: propertyMap.get(asset.propertyId)?.address || null,
      }));
      
      res.json({ assets: enrichedAssets });
    } catch (error) {
      console.error("Error fetching contractor assets:", error);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });
  
  // Get contractor reminders for their installed assets
  app.get('/api/contractor/reminders', isAuthenticated, requireRole('CONTRACTOR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type } = req.query;
      
      // Get contractor record
      const [contractor] = await db.select().from(contractors).where(eq(contractors.userId, userId)).limit(1);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor profile not found" });
      }
      
      // Get all worker IDs for this contractor
      const { contractorWorkers } = await import('@shared/schema');
      const workers = await db.select().from(contractorWorkers)
        .where(eq(contractorWorkers.contractorId, contractor.id));
      const workerIds = workers.map(w => w.id);
      
      // Get all assets installed by contractor or their workers
      const contractorAssets = await db.select({
        id: assets.id,
      })
      .from(assets)
      .where(
        workerIds.length > 0 
          ? or(eq(assets.installerId, userId), inArray(assets.installerId, workerIds))
          : eq(assets.installerId, userId)
      );
      
      const assetIds = contractorAssets.map(a => a.id);
      
      if (assetIds.length === 0) {
        return res.json({ reminders: [] });
      }
      
      // Get reminders for those assets where contractor should be notified
      let reminderQuery = db.select({
        id: reminders.id,
        assetId: reminders.assetId,
        propertyId: reminders.propertyId,
        dueAt: reminders.dueAt,
        type: reminders.type,
        title: reminders.title,
        description: reminders.description,
        status: reminders.status,
        frequency: reminders.frequency,
        nextDueAt: reminders.nextDueAt,
        createdAt: reminders.createdAt,
      })
      .from(reminders)
      .where(and(
        inArray(reminders.assetId, assetIds),
        eq(reminders.notifyContractor, true),
        eq(reminders.status, 'PENDING')
      ));
      
      if (type) {
        reminderQuery = reminderQuery.where(and(
          inArray(reminders.assetId, assetIds),
          eq(reminders.notifyContractor, true),
          eq(reminders.status, 'PENDING'),
          eq(reminders.type, type as string)
        ));
      }
      
      const contractorReminders = await reminderQuery.orderBy(asc(reminders.dueAt));
      
      // Enrich with asset and property names
      const enrichedReminders = await Promise.all(contractorReminders.map(async (reminder) => {
        const [asset] = await db.select({
          name: assets.name,
          category: assets.category,
        }).from(assets).where(eq(assets.id, reminder.assetId!)).limit(1);
        
        let property = null;
        if (reminder.propertyId) {
          const [prop] = await db.select({
            name: properties.name,
            address: properties.address,
          }).from(properties).where(eq(properties.id, reminder.propertyId)).limit(1);
          property = prop;
        }
        
        return {
          ...reminder,
          assetName: asset?.name || null,
          assetCategory: asset?.category || null,
          propertyName: property?.name || null,
          propertyAddress: property?.address || null,
        };
      }));
      
      res.json({ reminders: enrichedReminders });
    } catch (error) {
      console.error("Error fetching contractor reminders:", error);
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  });
  
  // Get contractor workers
  app.get('/api/contractor/workers', isAuthenticated, requireRole('CONTRACTOR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get contractor record
      const [contractor] = await db.select().from(contractors).where(eq(contractors.userId, userId)).limit(1);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor profile not found" });
      }
      
      const { contractorWorkers } = await import('@shared/schema');
      const workers = await db.select().from(contractorWorkers)
        .where(eq(contractorWorkers.contractorId, contractor.id))
        .orderBy(desc(contractorWorkers.createdAt));
      
      res.json({ workers });
    } catch (error) {
      console.error("Error fetching workers:", error);
      res.status(500).json({ error: "Failed to fetch workers" });
    }
  });
  
  // Create contractor worker
  app.post('/api/contractor/workers', isAuthenticated, requireRole('CONTRACTOR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, phone, email, role } = req.body;
      
      const [contractor] = await db.select().from(contractors).where(eq(contractors.userId, userId)).limit(1);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor profile not found" });
      }
      
      const { contractorWorkers } = await import('@shared/schema');
      const [worker] = await db.insert(contractorWorkers).values({
        contractorId: contractor.id,
        name,
        phone,
        email,
        role: role || 'INSTALLER',
        status: 'ACTIVE',
      }).returning();
      
      res.json({ worker });
    } catch (error) {
      console.error("Error creating worker:", error);
      res.status(500).json({ error: "Failed to create worker" });
    }
  });
  
  // Update contractor worker
  app.patch('/api/contractor/workers/:workerId', isAuthenticated, requireRole('CONTRACTOR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workerId } = req.params;
      const updates = req.body;
      
      const [contractor] = await db.select().from(contractors).where(eq(contractors.userId, userId)).limit(1);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor profile not found" });
      }
      
      const { contractorWorkers } = await import('@shared/schema');
      const [worker] = await db.update(contractorWorkers)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(contractorWorkers.id, workerId), eq(contractorWorkers.contractorId, contractor.id)))
        .returning();
      
      if (!worker) {
        return res.status(404).json({ error: "Worker not found" });
      }
      
      res.json({ worker });
    } catch (error) {
      console.error("Error updating worker:", error);
      res.status(500).json({ error: "Failed to update worker" });
    }
  });
  
  // Get contractor tasks/assignments
  app.get('/api/contractor/tasks', isAuthenticated, requireRole('CONTRACTOR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, workerId } = req.query;
      
      const [contractor] = await db.select().from(contractors).where(eq(contractors.userId, userId)).limit(1);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor profile not found" });
      }
      
      const { contractorTasks } = await import('@shared/schema');
      let query = db.select().from(contractorTasks)
        .where(eq(contractorTasks.contractorId, contractor.id));
      
      if (status) {
        query = query.where(and(eq(contractorTasks.contractorId, contractor.id), eq(contractorTasks.status, status as string)));
      }
      if (workerId) {
        query = query.where(and(eq(contractorTasks.contractorId, contractor.id), eq(contractorTasks.assignedTo, workerId as string)));
      }
      
      const tasks = await query.orderBy(desc(contractorTasks.scheduledFor));
      res.json({ tasks });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });
  
  // Create contractor task/assignment
  app.post('/api/contractor/tasks', isAuthenticated, requireRole('CONTRACTOR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, address, assignedTo, scheduledFor, taskType, priority } = req.body;
      
      const [contractor] = await db.select().from(contractors).where(eq(contractors.userId, userId)).limit(1);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor profile not found" });
      }
      
      const { contractorTasks } = await import('@shared/schema');
      const [task] = await db.insert(contractorTasks).values({
        contractorId: contractor.id,
        title,
        description,
        address,
        assignedTo,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        taskType: taskType || 'GENERAL',
        priority: priority || 'MEDIUM',
        status: 'PENDING',
        createdBy: userId,
      }).returning();
      
      // TODO: Send notification to worker about new assignment
      
      res.json({ task });
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });
  
  // Update task status
  app.patch('/api/contractor/tasks/:taskId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { taskId } = req.params;
      const updates = req.body;
      
      const [contractor] = await db.select().from(contractors).where(eq(contractors.userId, userId)).limit(1);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor profile not found" });
      }
      
      const { contractorTasks } = await import('@shared/schema');
      const [task] = await db.update(contractorTasks)
        .set(updates)
        .where(and(eq(contractorTasks.id, taskId), eq(contractorTasks.contractorId, contractor.id)))
        .returning();
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.json({ task });
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });
  
  // Clock in/out (create or complete visit)
  app.post('/api/contractor/visits/clock', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workerId, location, method, identifierCode, action } = req.body;
      
      // Verify worker belongs to this contractor
      const { contractorWorkers, contractorVisits } = await import('@shared/schema');
      const [worker] = await db.select().from(contractorWorkers).where(eq(contractorWorkers.id, workerId)).limit(1);
      if (!worker) {
        return res.status(404).json({ error: "Worker not found" });
      }
      
      if (action === 'clock_in') {
        // Create new visit
        const [visit] = await db.insert(contractorVisits).values({
          contractorId: worker.contractorId,
          workerId,
          checkInAt: new Date(),
          checkInLocation: location,
          checkInMethod: method || 'QR',
          checkInIdentifierCode: identifierCode,
          status: 'IN_PROGRESS',
        }).returning();
        
        // Get contractor user ID for WebSocket broadcast
        const [contractor] = await db.select().from(contractors).where(eq(contractors.id, worker.contractorId)).limit(1);
        if (contractor && (app as any).broadcastToContractor) {
          (app as any).broadcastToContractor(contractor.userId, {
            type: 'worker_checkin',
            workerId: worker.id,
            workerName: worker.name,
            location: location,
            timestamp: new Date().toISOString(),
          });
        }
        
        res.json({ visit, action: 'clocked_in' });
      } else {
        // Clock out - find active visit
        const [activeVisit] = await db.select().from(contractorVisits)
          .where(and(
            eq(contractorVisits.workerId, workerId),
            eq(contractorVisits.status, 'IN_PROGRESS')
          ))
          .orderBy(desc(contractorVisits.checkInAt))
          .limit(1);
        
        if (!activeVisit) {
          return res.status(404).json({ error: "No active clock-in session found" });
        }
        
        const [visit] = await db.update(contractorVisits)
          .set({
            checkOutAt: new Date(),
            checkOutLocation: location,
            checkOutMethod: method || 'QR',
            status: 'COMPLETED',
            completedAt: new Date(),
          })
          .where(eq(contractorVisits.id, activeVisit.id))
          .returning();
        
        // Calculate hours worked
        const hoursWorked = (new Date().getTime() - new Date(activeVisit.checkInAt).getTime()) / (1000 * 60 * 60);
        
        // Get contractor user ID for WebSocket broadcast
        const [contractor] = await db.select().from(contractors).where(eq(contractors.id, worker.contractorId)).limit(1);
        if (contractor && (app as any).broadcastToContractor) {
          (app as any).broadcastToContractor(contractor.userId, {
            type: 'worker_checkout',
            workerId: worker.id,
            workerName: worker.name,
            location: location,
            timestamp: new Date().toISOString(),
            hoursWorked: hoursWorked.toFixed(2),
          });
        }
        
        res.json({ visit, action: 'clocked_out', hoursWorked: hoursWorked.toFixed(2) });
      }
    } catch (error) {
      console.error("Error processing clock in/out:", error);
      res.status(500).json({ error: "Failed to process clock in/out" });
    }
  });
  
  // Get worker visits/timesheet
  app.get('/api/contractor/visits', isAuthenticated, requireRole('CONTRACTOR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workerId, startDate, endDate } = req.query;
      
      const [contractor] = await db.select().from(contractors).where(eq(contractors.userId, userId)).limit(1);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor profile not found" });
      }
      
      const { contractorVisits } = await import('@shared/schema');
      let query = db.select().from(contractorVisits)
        .where(eq(contractorVisits.contractorId, contractor.id));
      
      if (workerId) {
        query = query.where(and(eq(contractorVisits.contractorId, contractor.id), eq(contractorVisits.workerId, workerId as string)));
      }
      
      const visits = await query.orderBy(desc(contractorVisits.checkInAt));
      res.json({ visits });
    } catch (error) {
      console.error("Error fetching visits:", error);
      res.status(500).json({ error: "Failed to fetch visits" });
    }
  });
  
  // Get/update notification preferences
  app.get('/api/contractor/notification-preferences', isAuthenticated, requireRole('CONTRACTOR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const [contractor] = await db.select().from(contractors).where(eq(contractors.userId, userId)).limit(1);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor profile not found" });
      }
      
      const { contractorWorkerNotifications } = await import('@shared/schema');
      let [prefs] = await db.select().from(contractorWorkerNotifications)
        .where(and(
          eq(contractorWorkerNotifications.contractorId, contractor.id),
          isNull(contractorWorkerNotifications.workerId)
        ))
        .limit(1);
      
      if (!prefs) {
        // Create default preferences
        [prefs] = await db.insert(contractorWorkerNotifications).values({
          contractorId: contractor.id,
          workerId: null,
          notifyCheckIn: true,
          notifyCheckOut: true,
          notifyTaskComplete: false,
          notificationMethod: 'EMAIL',
        }).returning();
      }
      
      res.json({ preferences: prefs });
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ error: "Failed to fetch notification preferences" });
    }
  });
  
  app.patch('/api/contractor/notification-preferences', isAuthenticated, requireRole('CONTRACTOR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;
      
      const [contractor] = await db.select().from(contractors).where(eq(contractors.userId, userId)).limit(1);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor profile not found" });
      }
      
      const { contractorWorkerNotifications } = await import('@shared/schema');
      const [existing] = await db.select().from(contractorWorkerNotifications)
        .where(and(
          eq(contractorWorkerNotifications.contractorId, contractor.id),
          isNull(contractorWorkerNotifications.workerId)
        ))
        .limit(1);
      
      if (existing) {
        const [updated] = await db.update(contractorWorkerNotifications)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(contractorWorkerNotifications.id, existing.id))
          .returning();
        res.json({ preferences: updated });
      } else {
        const [created] = await db.insert(contractorWorkerNotifications)
          .values({
            contractorId: contractor.id,
            workerId: null,
            ...updates,
          })
          .returning();
        res.json({ preferences: created });
      }
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ error: "Failed to update notification preferences" });
    }
  });
  
  // PDF: Asset details
  app.get('/api/contractor/assets/:assetId/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assetId } = req.params;
      
      const asset = await storage.getAsset(assetId);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      const property = await storage.getProperty(asset.propertyId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      // Verify access
      const [contractor] = await db.select().from(contractors).where(eq(contractors.userId, userId)).limit(1);
      if (!contractor && property.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Generate PDF
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks: Buffer[] = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const filename = `asset_${asset.id}_${Date.now()}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);
      });
      
      doc.fontSize(18).text('ServiceVault — Asset Details', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12)
        .text(`Asset: ${asset.name}`)
        .text(`Category: ${asset.category}`)
        .text(`Brand: ${asset.brand || 'N/A'}`)
        .text(`Model: ${asset.model || 'N/A'}`)
        .text(`Serial: ${asset.serialNumber || 'N/A'}`)
        .text(`Installed: ${asset.installedAt?.toLocaleDateString() || 'N/A'}`);
      
      doc.moveDown();
      doc.text(`Property: ${property.name || 'Unnamed Property'}`)
        .text(`Address: ${property.addressLine1 || 'N/A'}, ${property.city || ''} ${property.state || ''}`);
      
      doc.end();
    } catch (error) {
      console.error("Error generating asset PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });
  
  // PDF: Worker timesheet
  app.get('/api/contractor/workers/:workerId/timesheet/pdf', isAuthenticated, requireRole('CONTRACTOR'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workerId } = req.params;
      const { startDate, endDate } = req.query;
      
      const [contractor] = await db.select().from(contractors).where(eq(contractors.userId, userId)).limit(1);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor profile not found" });
      }
      
      const { contractorWorkers, contractorVisits } = await import('@shared/schema');
      const [worker] = await db.select().from(contractorWorkers)
        .where(and(eq(contractorWorkers.id, workerId), eq(contractorWorkers.contractorId, contractor.id)))
        .limit(1);
      
      if (!worker) {
        return res.status(404).json({ error: "Worker not found" });
      }
      
      const visits = await db.select().from(contractorVisits)
        .where(eq(contractorVisits.workerId, workerId))
        .orderBy(desc(contractorVisits.checkInAt));
      
      // Generate PDF
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks: Buffer[] = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const filename = `timesheet_${worker.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);
      });
      
      doc.fontSize(18).text('ServiceVault — Timesheet', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12)
        .text(`Worker: ${worker.name}`)
        .text(`Company: ${contractor.companyName}`)
        .text(`Generated: ${new Date().toLocaleDateString()}`);
      
      doc.moveDown().text('Time Records:', { underline: true });
      
      let totalHours = 0;
      for (const visit of visits) {
        if (visit.checkOutAt) {
          const hours = (new Date(visit.checkOutAt).getTime() - new Date(visit.checkInAt).getTime()) / (1000 * 60 * 60);
          totalHours += hours;
          
          doc.moveDown(0.5)
            .text(`Date: ${new Date(visit.checkInAt).toLocaleDateString()}`)
            .text(`In: ${new Date(visit.checkInAt).toLocaleTimeString()} | Out: ${new Date(visit.checkOutAt).toLocaleTimeString()}`)
            .text(`Hours: ${hours.toFixed(2)}`);
        }
      }
      
      doc.moveDown();
      doc.fontSize(14).text(`Total Hours: ${totalHours.toFixed(2)}`, { bold: true });
      
      doc.end();
    } catch (error) {
      console.error("Error generating timesheet PDF:", error);
      res.status(500).json({ error: "Failed to generate timesheet" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time contractor updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const contractorConnections = new Map<string, Set<WebSocket>>();
  
  wss.on('connection', (ws: WebSocket, req) => {
    let contractorUserId: string | null = null;
    
    // Extract session/auth from cookie or query param
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth' && data.userId) {
          contractorUserId = data.userId;
          
          if (!contractorConnections.has(contractorUserId)) {
            contractorConnections.set(contractorUserId, new Set());
          }
          contractorConnections.get(contractorUserId)!.add(ws);
          
          console.log(`WebSocket connected for contractor: ${contractorUserId}`);
          ws.send(JSON.stringify({ type: 'auth_success' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (contractorUserId) {
        const connections = contractorConnections.get(contractorUserId);
        if (connections) {
          connections.delete(ws);
          if (connections.size === 0) {
            contractorConnections.delete(contractorUserId);
          }
        }
        console.log(`WebSocket disconnected for contractor: ${contractorUserId}`);
      }
    });
  });
  
  // Broadcast function for contractor events
  (app as any).broadcastToContractor = (contractorUserId: string, event: any) => {
    const connections = contractorConnections.get(contractorUserId);
    if (connections) {
      const message = JSON.stringify(event);
      connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  };
  
  return httpServer;
}
