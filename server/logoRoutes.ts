import type { Express, Request, Response } from "express";
import { db } from "./db";
import { logos, logoGenerations, logoPayments, users, insertLogoSchema } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { ObjectStorageService } from "./objectStorage";
import { randomUUID } from "crypto";
import { generateLogos } from "./openaiClient";
import Stripe from "stripe";
import { NotificationService } from "./notifications";
import { storage } from "./storage";

// Initialize services
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
}) : null;

const hasObjectStorage = !!(process.env.PUBLIC_OBJECT_SEARCH_PATHS && process.env.PRIVATE_OBJECT_DIR);
const objectStorageService = hasObjectStorage ? new ObjectStorageService() : null;

const notificationService = new NotificationService(storage);

// Validation schemas
const uploadInitSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().min(1),
  businessName: z.string().optional(),
  source: z.enum(["CONTRACTOR", "HOMEOWNER", "FLEET", "PROPERTY_MANAGER"]).optional(),
});

const completeUploadSchema = z.object({
  logoId: z.string().uuid(),
  fileUrl: z.string().min(1),
});

const generateLogoSchema = z.object({
  businessName: z.string().min(1),
  industry: z.string().min(1),
  colors: z.array(z.string()).optional(),
  style: z.enum(["MODERN", "MINIMALIST", "CLASSIC", "PLAYFUL", "PROFESSIONAL"]).optional(),
  keywords: z.string().optional(),
  paymentId: z.string().uuid().optional(), // Optional for demo mode
});

const selectLogoSchema = z.object({
  generationId: z.string().uuid(),
  selectedLogoUrl: z.string().min(1),
});

export function registerLogoRoutes(app: Express) {
  // Check if user has access to logo generation (paid or demo mode)
  app.get('/api/logos/check-access', async (req: any, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Demo mode: if Stripe is not configured, grant access automatically
      if (!stripe) {
        return res.json(true);
      }

      const userId = req.user.claims.sub;
      
      // Check if user has any logo payments
      const [payment] = await db
        .select()
        .from(logoPayments)
        .where(eq(logoPayments.userId, userId))
        .limit(1);
      
      res.json(!!payment);
    } catch (error) {
      console.error("Error checking logo access:", error);
      res.status(500).json({ error: "Failed to check access" });
    }
  });

  // Get upload URL and create logo record
  app.post("/api/logos/upload", async (req: any, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!objectStorageService) {
        return res.status(503).json({ 
          error: "File upload is currently unavailable. Please contact support.",
          service: "object_storage",
          configured: false
        });
      }

      const userId = req.user.claims.sub;
      
      // Validate request body
      const validationResult = uploadInitSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: validationResult.error.errors 
        });
      }

      const { fileName, fileType, fileSize, businessName, source } = validationResult.data;

      // Validate file type (PDF, PNG, SVG, JPEG)
      const allowedTypes = ['application/pdf', 'image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(fileType.toLowerCase())) {
        return res.status(400).json({ 
          error: "Invalid file type. Only PDF, PNG, SVG, and JPEG files are allowed." 
        });
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxSize) {
        return res.status(400).json({ 
          error: "File too large. Maximum size is 10MB." 
        });
      }

      // Get upload URL from object storage
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      // Extract object ID from URL
      const urlParts = uploadURL.split('/');
      const objectIdIndex = urlParts.findIndex(part => part === 'uploads') + 1;
      const objectIdWithQuery = urlParts[objectIdIndex];
      const objectId = objectIdWithQuery ? objectIdWithQuery.split('?')[0] : randomUUID();
      
      // Construct the object path for retrieval
      const objectPath = `/objects/uploads/${objectId}`;

      // Create logo record in database
      const [logo] = await db.insert(logos).values({
        userId,
        type: "UPLOADED",
        source: source || null,
        businessName: businessName || null,
        fileUrl: objectPath,
        fileName,
        fileType,
        fileSize,
        isActive: true,
      }).returning();

      // Send admin notification (non-blocking)
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1).then(r => r[0]);
      if (user) {
        const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User';
        notificationService.sendAdminLogoNotification({
          userId,
          userEmail: user.email || '',
          userName,
          logoType: 'UPLOADED',
          businessName: businessName || undefined,
          fileName,
          fileUrl: objectPath,
          source: source || undefined,
        }).catch(err => console.error('Failed to send admin logo notification:', err));
      }

      res.json({ 
        uploadURL,
        logoId: logo.id,
        objectPath,
      });
    } catch (error) {
      console.error("Error initiating logo upload:", error);
      res.status(500).json({ error: "Failed to initiate upload" });
    }
  });

  // Get all logos for the authenticated user
  app.get("/api/logos", async (req: any, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.user.claims.sub;

      const userLogos = await db
        .select()
        .from(logos)
        .where(and(
          eq(logos.userId, userId),
          eq(logos.isActive, true)
        ))
        .orderBy(desc(logos.createdAt));

      res.json({ logos: userLogos });
    } catch (error) {
      console.error("Error fetching logos:", error);
      res.status(500).json({ error: "Failed to fetch logos" });
    }
  });

  // Delete a logo
  app.delete("/api/logos/:id", async (req: any, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.user.claims.sub;
      const logoId = req.params.id;

      // Validate UUID
      if (!z.string().uuid().safeParse(logoId).success) {
        return res.status(400).json({ error: "Invalid logo ID" });
      }

      // Find logo and verify ownership
      const [logo] = await db
        .select()
        .from(logos)
        .where(and(
          eq(logos.id, logoId),
          eq(logos.userId, userId)
        ))
        .limit(1);

      if (!logo) {
        return res.status(404).json({ error: "Logo not found" });
      }

      // Soft delete by marking as inactive
      await db
        .update(logos)
        .set({ isActive: false })
        .where(eq(logos.id, logoId));

      // TODO: Consider deleting the file from Google Cloud Storage
      // For now, we'll keep the file for potential recovery

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting logo:", error);
      res.status(500).json({ error: "Failed to delete logo" });
    }
  });

  // Get a specific logo by ID
  app.get("/api/logos/:id", async (req: any, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.user.claims.sub;
      const logoId = req.params.id;

      // Validate UUID
      if (!z.string().uuid().safeParse(logoId).success) {
        return res.status(400).json({ error: "Invalid logo ID" });
      }

      // Find logo and verify ownership
      const [logo] = await db
        .select()
        .from(logos)
        .where(and(
          eq(logos.id, logoId),
          eq(logos.userId, userId),
          eq(logos.isActive, true)
        ))
        .limit(1);

      if (!logo) {
        return res.status(404).json({ error: "Logo not found" });
      }

      res.json({ logo });
    } catch (error) {
      console.error("Error fetching logo:", error);
      res.status(500).json({ error: "Failed to fetch logo" });
    }
  });

  // Generate AI logos using DALL-E 3
  app.post("/api/logos/generate", async (req: any, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.user.claims.sub;

      // Validate request body
      const validationResult = generateLogoSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: validationResult.error.errors 
        });
      }

      const { businessName, industry, colors, style, keywords, paymentId } = validationResult.data;

      // Check if payment is required (not in demo mode)
      const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY;
      
      // If Stripe is configured and no paymentId is provided, require payment
      if (isStripeConfigured && !paymentId) {
        return res.status(402).json({ 
          error: "Payment required",
          message: "Please complete payment before generating logos" 
        });
      }

      // If paymentId is provided, verify it exists and is paid
      if (paymentId) {
        const [payment] = await db
          .select()
          .from(logoPayments)
          .where(and(
            eq(logoPayments.id, paymentId),
            eq(logoPayments.userId, userId),
            eq(logoPayments.status, "COMPLETED")
          ))
          .limit(1);

        if (!payment) {
          return res.status(402).json({ 
            error: "Invalid or unpaid payment",
            message: "Please complete payment before generating logos" 
          });
        }
      }

      // Create generation record
      const [generation] = await db.insert(logoGenerations).values({
        userId,
        paymentId: paymentId || null,
        businessName,
        industry,
        colors: colors || null,
        style: style || null,
        keywords: keywords || null,
        status: "GENERATING",
      }).returning();

      // Generate logos using DALL-E 3 (async - runs in background)
      // We return immediately so the frontend can poll for updates
      generateLogos({
        businessName,
        industry,
        colors,
        style,
        keywords,
      }).then(async (results) => {
        // Extract URLs and prompts
        const generatedUrls = results.map(r => r.imageUrl);
        const prompts = results.map(r => r.prompt);

        // Update generation record with results
        await db
          .update(logoGenerations)
          .set({
            generatedUrls,
            prompts,
            status: "COMPLETED",
            completedAt: new Date(),
          })
          .where(eq(logoGenerations.id, generation.id));

      }).catch(async (error) => {
        console.error("Error generating logos:", error);
        
        // Update generation record with error
        await db
          .update(logoGenerations)
          .set({
            status: "FAILED",
            errorMessage: error.message || "Failed to generate logos",
            completedAt: new Date(),
          })
          .where(eq(logoGenerations.id, generation.id));
      });

      // Return generation ID so frontend can poll for status
      res.json({ 
        generationId: generation.id,
        status: "GENERATING",
        message: "Logo generation started. Poll /api/logos/generations/:id for status."
      });
    } catch (error) {
      console.error("Error initiating logo generation:", error);
      res.status(500).json({ error: "Failed to start logo generation" });
    }
  });

  // Get generation status and results
  app.get("/api/logos/generations/:id", async (req: any, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.user.claims.sub;
      const generationId = req.params.id;

      // Validate UUID
      if (!z.string().uuid().safeParse(generationId).success) {
        return res.status(400).json({ error: "Invalid generation ID" });
      }

      // Find generation and verify ownership
      const [generation] = await db
        .select()
        .from(logoGenerations)
        .where(and(
          eq(logoGenerations.id, generationId),
          eq(logoGenerations.userId, userId)
        ))
        .limit(1);

      if (!generation) {
        return res.status(404).json({ error: "Generation not found" });
      }

      res.json({ generation });
    } catch (error) {
      console.error("Error fetching generation:", error);
      res.status(500).json({ error: "Failed to fetch generation" });
    }
  });

  // Get all generations for user
  app.get("/api/logos/generations", async (req: any, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.user.claims.sub;

      const userGenerations = await db
        .select()
        .from(logoGenerations)
        .where(eq(logoGenerations.userId, userId))
        .orderBy(desc(logoGenerations.createdAt));

      res.json({ generations: userGenerations });
    } catch (error) {
      console.error("Error fetching generations:", error);
      res.status(500).json({ error: "Failed to fetch generations" });
    }
  });

  // Select and save a generated logo
  app.post("/api/logos/select", async (req: any, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.user.claims.sub;

      // Validate request body
      const validationResult = selectLogoSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: validationResult.error.errors 
        });
      }

      const { generationId, selectedLogoUrl } = validationResult.data;

      // Find generation and verify ownership
      const [generation] = await db
        .select()
        .from(logoGenerations)
        .where(and(
          eq(logoGenerations.id, generationId),
          eq(logoGenerations.userId, userId),
          eq(logoGenerations.status, "COMPLETED")
        ))
        .limit(1);

      if (!generation) {
        return res.status(404).json({ error: "Generation not found or not completed" });
      }

      // Verify the selected URL is one of the generated URLs
      const generatedUrls = generation.generatedUrls as string[] || [];
      if (!generatedUrls.includes(selectedLogoUrl)) {
        return res.status(400).json({ error: "Selected logo URL is not from this generation" });
      }

      // Create logo record for the selected logo
      const [logo] = await db.insert(logos).values({
        userId,
        type: "AI_GENERATED",
        businessName: generation.businessName,
        fileUrl: selectedLogoUrl,
        fileName: `${generation.businessName.replace(/\s+/g, '_')}_logo.png`,
        fileType: "image/png",
        generationId: generation.id,
        isActive: true,
      }).returning();

      // Update generation to mark which logo was selected
      await db
        .update(logoGenerations)
        .set({ selectedLogoId: logo.id })
        .where(eq(logoGenerations.id, generationId));

      // Send admin notification for AI-generated logo (non-blocking)
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1).then(r => r[0]);
      if (user) {
        const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User';
        notificationService.sendAdminLogoNotification({
          userId,
          userEmail: user.email || '',
          userName,
          logoType: 'AI_GENERATED',
          businessName: generation.businessName || undefined,
          fileName: logo.fileName,
          fileUrl: selectedLogoUrl,
          generationParams: {
            industry: generation.industry || undefined,
            colors: generation.colors as string[] || undefined,
            style: generation.style || undefined,
          },
        }).catch(err => console.error('Failed to send admin logo notification:', err));
      }

      res.json({ logo });
    } catch (error) {
      console.error("Error selecting logo:", error);
      res.status(500).json({ error: "Failed to select logo" });
    }
  });

  // Create Stripe checkout session for logo generation ($19.99 one-time payment)
  if (stripe) {
    app.post("/api/logos/checkout", async (req: any, res: Response) => {
      try {
        if (!req.isAuthenticated() || !req.user) {
          return res.status(401).json({ error: "Not authenticated" });
        }

        const userId = req.user.claims.sub;

        // Get user email for Stripe
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Create a pending payment record
        const [payment] = await db.insert(logoPayments).values({
          userId,
          amount: "19.99",
          currency: "usd",
          status: "PENDING",
        }).returning();

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "AI Logo Generator",
                  description: "Generate 4 professional logo variations with unlimited regenerations until you find the perfect one",
                },
                unit_amount: 1999, // $19.99 in cents
              },
              quantity: 1,
            },
          ],
          mode: "payment", // One-time payment
          success_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/logos/generator?success=true&payment_id=${payment.id}`,
          cancel_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/logos/generator?canceled=true`,
          customer_email: user.email,
          metadata: {
            userId,
            paymentId: payment.id,
            type: "logo_generation",
          },
        });

        // Update payment with Stripe session ID
        await db
          .update(logoPayments)
          .set({ stripeSessionId: session.id })
          .where(eq(logoPayments.id, payment.id));

        res.json({ 
          sessionId: session.id, 
          url: session.url,
          paymentId: payment.id,
        });
      } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).json({ error: "Failed to create checkout session" });
      }
    });

    // Webhook handler for logo payment confirmations
    // This will be handled by the main Stripe webhook in routes.ts
    // We just need to make sure the webhook handler knows about logo payments
  } else {
    // Demo mode - no Stripe configured
    app.post("/api/logos/checkout", async (req: any, res: Response) => {
      res.status(200).json({ 
        demo: true,
        message: "Demo mode - payment skipped. You can generate logos for free.",
      });
    });
  }
}
