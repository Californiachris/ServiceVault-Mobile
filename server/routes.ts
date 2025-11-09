import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { users, subscriptions } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import Stripe from "stripe";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize object storage service
  const objectStorageService = new ObjectStorageService();

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

  // Update user family branding
  app.patch('/api/user/family-branding', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { familyName, familyLogoUrl } = req.body;

      if (!familyName || typeof familyName !== 'string') {
        return res.status(400).json({ error: "Family name is required" });
      }

      // If logo URL provided, set ACL to make it publicly readable
      if (familyLogoUrl) {
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

  // Object storage routes for file uploads
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
          brandLabel: brandLabel || contractor?.companyName || "Fix-Track",
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

      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      // Find the identifier
      const identifier = await storage.getIdentifier(code);
      if (!identifier) {
        return res.status(404).json({ error: "Identifier not found" });
      }

      if (identifier.claimedAt) {
        return res.status(400).json({ error: "Identifier already claimed" });
      }

      // Check quota for contractors
      const user = await storage.getUser(userId);
      if (user?.role === 'CONTRACTOR') {
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
        identifierId: identifier.id,
        installedAt: asset?.installedAt ? new Date(asset.installedAt) : new Date(),
        status: "ACTIVE",
      });

      // Update identifier as claimed
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

      // Create installation event with photos
      await storage.createEvent({
        assetId: assetRecord.id,
        type: "INSTALL",
        data: { 
          note: asset?.notes || "Initial claim and installation",
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

  // Asset routes
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
      res.json(documents);
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
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(objectPath);
      await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
        owner: userId,
        visibility: "private",
      });

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

  app.post('/api/documents/upload', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assetId, propertyId, type, title, objectPath } = req.body;

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
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(objectPath);
      await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
        owner: userId,
        visibility: "private",
      });

      const document = await storage.createDocument({
        assetId: assetId || undefined,
        propertyId: propertyId || undefined,
        type: type || "OTHER",
        title: title || "Document",
        path: normalizedPath,
      });

      res.json({ document });
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  app.post('/api/documents/parse-warranty', isAuthenticated, async (req: any, res) => {
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

      res.json({ warrantyInfo });
    } catch (error) {
      console.error("Error parsing warranty:", error);
      res.status(500).json({ error: "Failed to parse warranty document" });
    }
  });

  // AI Document Extraction - Comprehensive endpoint for assets, warranties, receipts
  app.post('/api/ai/documents/extract', isAuthenticated, async (req: any, res) => {
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
      
      doc.fontSize(18).text('Fix-Track — Home Health Certificate™', { align: 'center' });
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
  app.post('/api/inspections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId, jurisdiction, checklist, result } = req.body;

      const property = await storage.getProperty(propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(404).json({ error: "Property not found" });
      }

      const inspection = await storage.createInspection({
        propertyId,
        inspectorId: userId,
        jurisdiction,
        checklist,
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
      for (const reminder of dueReminders) {
        await storage.updateReminder(reminder.id, { status: 'SENT' });
      }
      res.json({ processed: dueReminders.length, reminders: dueReminders });
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
            const { userId, plan, addOns, fleetAssetCount } = session.metadata || {};
            
            if (userId && plan) {
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
    // Stub routes when Stripe is not configured
    app.post('/api/stripe/create-checkout-session', (req, res) => {
      res.status(501).json({ error: "Stripe not configured" });
    });

    app.post('/api/stripe/customer-portal', (req, res) => {
      res.status(501).json({ error: "Stripe not configured" });
    });

    app.post('/api/webhooks/stripe', (req, res) => {
      res.status(501).json({ error: "Stripe not configured" });
    });
  }

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

      // Get public event history (redacted)
      const events = await storage.getAssetEvents(assetId);
      const publicEvents = events.map(event => ({
        id: event.id,
        type: event.type,
        data: event.data,
        createdAt: event.createdAt,
        // No createdBy to avoid exposing user IDs
      }));

      // Return public asset info without PII
      res.json({
        id: asset.id,
        name: asset.name,
        category: asset.category,
        brand: asset.brand,
        model: asset.model,
        serial: asset.serial,
        installedAt: asset.installedAt,
        status: asset.status,
        events: publicEvents,
        // No property owner info, no installer info
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

  const httpServer = createServer(app);
  return httpServer;
}
