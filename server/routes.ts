import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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

  // Object storage routes for file uploads
  const objectStorageService = new ObjectStorageService();

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
      res.json({ uploadURL });
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
          type: type || 'ASSET',
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

  app.post('/api/identifiers/claim', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code, asset, property } = req.body;

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

      // Create or find property
      let propertyRecord = await storage.getPropertyByName(property?.name || "Property", userId);
      if (!propertyRecord) {
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
        identifierId: identifier.id,
        installedAt: new Date(),
        status: "ACTIVE",
      });

      // Update identifier as claimed
      await storage.updateIdentifier(identifier.id, { claimedAt: new Date() });

      // Create installation event
      await storage.createEvent({
        assetId: assetRecord.id,
        type: "INSTALL",
        data: { note: "Initial claim and installation" },
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
      if (!identifier || identifier.type !== 'MASTER') {
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

      // PDF Content
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
        const { plan } = req.body;

        // Map plans to price IDs (these would be set in environment variables)
        const priceIds: Record<string, string> = {
          'contractor_50': process.env.STRIPE_PRICE_CONTRACTOR_50 || 'price_fake_19',
          'contractor_100': process.env.STRIPE_PRICE_CONTRACTOR_100 || 'price_fake_29',
          'home_lifetime': process.env.STRIPE_PRICE_HOME_LIFETIME || 'price_fake_100',
          'home_annual': process.env.STRIPE_PRICE_HOME_ANNUAL || 'price_fake_15',
        };

        const priceId = priceIds[plan];
        if (!priceId) {
          return res.status(400).json({ error: "Invalid plan" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const session = await stripe.checkout.sessions.create({
          customer_email: user.email || undefined,
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: plan.includes('lifetime') ? 'payment' : 'subscription',
          success_url: `${req.headers.origin}/dashboard?success=true`,
          cancel_url: `${req.headers.origin}/pricing?canceled=true`,
          metadata: {
            userId,
            plan,
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
            const { userId, plan } = session.metadata || {};
            
            if (userId && plan) {
              if (session.customer) {
                await storage.updateUserStripeInfo(
                  userId,
                  session.customer as string,
                  session.subscription as string || undefined
                );
              }

              await storage.createSubscription({
                userId,
                stripeCustomerId: session.customer as string,
                stripeSubId: session.subscription as string,
                priceId: session.line_items?.data[0]?.price?.id,
                plan,
                status: 'active',
                currentPeriodEnd: session.subscription ? undefined : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year for lifetime
              });
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

  // Public QR scan route (no auth required)
  app.get('/api/scan/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const identifier = await storage.getIdentifier(code);
      
      if (!identifier) {
        return res.status(404).json({ error: "QR code not found" });
      }

      // Return basic info without sensitive data
      res.json({
        code: identifier.code,
        type: identifier.type,
        brandLabel: identifier.brandLabel,
        claimed: !!identifier.claimedAt,
      });
    } catch (error) {
      console.error("Error scanning code:", error);
      res.status(500).json({ error: "Failed to scan code" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
