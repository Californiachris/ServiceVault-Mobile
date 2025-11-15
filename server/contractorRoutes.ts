import type { Express, Request, Response } from "express";
import { db } from "./db";
import { 
  contractorWorkers, 
  contractorTasks, 
  contractorVisits, 
  contractorTaskCompletions,
  contractors,
  identifiers,
  assets
} from "../shared/schema";
import { eq, and, isNull, desc, or } from "drizzle-orm";
import { z } from "zod";

// Validation schemas
const checkInSchema = z.object({
  identifierCode: z.string().min(1),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

const checkOutSchema = z.object({
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  completedTaskIds: z.array(z.string()).optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  address: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  scheduledFor: z.string().transform(str => new Date(str)),
  assignedWorkerId: z.string().optional(),
});

// Helper to get contractor and worker from authenticated user
// Handles both contractor owners and workers
async function getWorkerContext(userId: string) {
  // First, check if the user is a contractor owner
  const contractorOwnerRecords = await db.select()
    .from(contractors)
    .where(eq(contractors.userId, userId))
    .limit(1);
  
  if (contractorOwnerRecords.length > 0) {
    // User is a contractor owner
    const contractor = contractorOwnerRecords[0];
    
    // Try to find a worker record for the owner (they might also be a worker)
    const ownerWorkerRecords = await db.select()
      .from(contractorWorkers)
      .where(and(
        eq(contractorWorkers.contractorId, contractor.id),
        eq(contractorWorkers.userId, userId)
      ))
      .limit(1);
    
    return {
      contractor,
      worker: ownerWorkerRecords[0] || null, // Owner may not have a worker record
      isOwner: true,
    };
  }
  
  // If not an owner, check if they're a worker
  const workerRecords = await db.select()
    .from(contractorWorkers)
    .where(eq(contractorWorkers.userId, userId))
    .limit(1);
  
  if (workerRecords.length === 0) {
    return null;
  }
  
  const worker = workerRecords[0];
  
  // Get contractor from the worker's contractorId
  const contractorRecords = await db.select()
    .from(contractors)
    .where(eq(contractors.id, worker.contractorId))
    .limit(1);
  
  if (contractorRecords.length === 0) {
    return null;
  }
  
  return {
    contractor: contractorRecords[0],
    worker,
    isOwner: false,
  };
}

export function registerContractorRoutes(app: Express) {
  // Get all workers for contractor
  app.get("/api/contractor/workers", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Not authenticated");
      }
      
      const context = await getWorkerContext(req.user.id);
      if (!context) {
        return res.status(403).send("Not a contractor");
      }
      
      // Get all workers for this contractor
      const workers = await db.select({
        id: contractorWorkers.id,
        name: contractorWorkers.name,
        email: contractorWorkers.email,
        phone: contractorWorkers.phone,
        role: contractorWorkers.role,
        isActive: contractorWorkers.isActive,
      })
        .from(contractorWorkers)
        .where(eq(contractorWorkers.contractorId, context.contractor.id));
      
      res.json(workers);
    } catch (error: any) {
      console.error("Error getting workers:", error);
      res.status(500).send(error.message);
    }
  });
  
  // Get all tasks for contractor
  app.get("/api/contractor/tasks", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Not authenticated");
      }
      
      const context = await getWorkerContext(req.user.id);
      if (!context) {
        return res.status(403).send("Not a contractor");
      }
      
      // Get all tasks for this contractor with worker names
      const tasks = await db.select({
        id: contractorTasks.id,
        title: contractorTasks.title,
        description: contractorTasks.description,
        address: contractorTasks.address,
        priority: contractorTasks.priority,
        status: contractorTasks.status,
        scheduledFor: contractorTasks.scheduledFor,
        completedAt: contractorTasks.completedAt,
        assignedWorkerId: contractorTasks.assignedWorkerId,
        assignedWorkerName: contractorWorkers.name,
      })
        .from(contractorTasks)
        .leftJoin(contractorWorkers, eq(contractorTasks.assignedWorkerId, contractorWorkers.id))
        .where(eq(contractorTasks.contractorId, context.contractor.id))
        .orderBy(desc(contractorTasks.scheduledFor));
      
      res.json(tasks);
    } catch (error: any) {
      console.error("Error getting tasks:", error);
      res.status(500).send(error.message);
    }
  });
  
  // Create a new task
  app.post("/api/contractor/tasks", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Not authenticated");
      }
      
      const context = await getWorkerContext(req.user.id);
      if (!context) {
        return res.status(403).send("Not a contractor");
      }
      
      // Validate request body
      const validation = createTaskSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: validation.error.errors 
        });
      }
      
      const data = validation.data;
      
      // If assignedWorkerId is provided, verify it belongs to this contractor
      if (data.assignedWorkerId) {
        const workerRecords = await db.select()
          .from(contractorWorkers)
          .where(and(
            eq(contractorWorkers.id, data.assignedWorkerId),
            eq(contractorWorkers.contractorId, context.contractor.id)
          ))
          .limit(1);
        
        if (workerRecords.length === 0) {
          return res.status(400).send("Invalid worker assignment");
        }
      }
      
      // Create task
      const [task] = await db.insert(contractorTasks).values({
        contractorId: context.contractor.id,
        title: data.title,
        description: data.description,
        address: data.address,
        priority: data.priority,
        scheduledFor: data.scheduledFor,
        assignedWorkerId: data.assignedWorkerId || null,
        status: "PENDING",
      }).returning();
      
      res.json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(500).send(error.message);
    }
  });
  
  // Get worker status (real-time dashboard data)
  app.get("/api/contractor/worker-status", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Not authenticated");
      }
      
      const context = await getWorkerContext(req.user.id);
      if (!context) {
        return res.status(403).send("Not a contractor");
      }
      
      // Get all workers for this contractor
      const workers = await db.select()
        .from(contractorWorkers)
        .where(eq(contractorWorkers.contractorId, context.contractor.id));
      
      // For each worker, get their current status
      const workerStatuses = await Promise.all(workers.map(async (worker) => {
        // Check if worker has an active visit
        const activeVisits = await db.select()
          .from(contractorVisits)
          .where(and(
            eq(contractorVisits.workerId, worker.id),
            isNull(contractorVisits.checkOutAt),
            eq(contractorVisits.status, "IN_PROGRESS")
          ))
          .limit(1);
        
        // Count pending tasks assigned to this worker
        const pendingTasks = await db.select()
          .from(contractorTasks)
          .where(and(
            eq(contractorTasks.contractorId, context.contractor.id),
            eq(contractorTasks.assignedWorkerId, worker.id),
            eq(contractorTasks.status, "PENDING")
          ));
        
        // Count completed tasks today
        const completedTasks = await db.select()
          .from(contractorTasks)
          .where(and(
            eq(contractorTasks.contractorId, context.contractor.id),
            eq(contractorTasks.assignedWorkerId, worker.id),
            eq(contractorTasks.status, "COMPLETED")
          ));
        
        return {
          workerId: worker.id,
          workerName: worker.name,
          isCheckedIn: activeVisits.length > 0,
          checkInAt: activeVisits[0]?.checkInAt,
          tasksCompleted: completedTasks.length,
          activeTasks: pendingTasks.length,
        };
      }));
      
      res.json(workerStatuses);
    } catch (error: any) {
      console.error("Error getting worker status:", error);
      res.status(500).send(error.message);
    }
  });
  
  // Get active visit for current worker
  app.get("/api/contractor/active-visit", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Not authenticated");
      }
      
      const context = await getWorkerContext(req.user.id);
      if (!context || !context.worker) {
        return res.status(403).send("Not a contractor worker");
      }
      
      // Find active visit for this specific worker
      const visits = await db.select()
        .from(contractorVisits)
        .where(and(
          eq(contractorVisits.contractorId, context.contractor.id),
          eq(contractorVisits.workerId, context.worker.id),
          isNull(contractorVisits.checkOutAt),
          eq(contractorVisits.status, "IN_PROGRESS")
        ))
        .orderBy(desc(contractorVisits.checkInAt))
        .limit(1);
      
      if (visits.length === 0) {
        return res.json(null);
      }
      
      res.json(visits[0]);
    } catch (error: any) {
      console.error("Error getting active visit:", error);
      res.status(500).send(error.message);
    }
  });
  
  // Get today's tasks for worker
  app.get("/api/contractor/worker/tasks", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Not authenticated");
      }
      
      const context = await getWorkerContext(req.user.id);
      if (!context || !context.worker) {
        return res.status(403).send("Not a contractor worker");
      }
      
      // Get tasks assigned to this specific worker or unassigned tasks for this contractor
      const tasks = await db.select()
        .from(contractorTasks)
        .where(and(
          eq(contractorTasks.contractorId, context.contractor.id),
          eq(contractorTasks.status, "PENDING"),
          or(
            eq(contractorTasks.assignedWorkerId, context.worker.id),
            isNull(contractorTasks.assignedWorkerId)
          )
        ))
        .orderBy(contractorTasks.scheduledFor);
      
      res.json(tasks);
    } catch (error: any) {
      console.error("Error getting tasks:", error);
      res.status(500).send(error.message);
    }
  });
  
  // Worker check-in
  app.post("/api/contractor/worker/checkin", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Not authenticated");
      }
      
      const context = await getWorkerContext(req.user.id);
      if (!context || !context.worker) {
        return res.status(403).send("Not a contractor worker");
      }
      
      // Validate request body
      const validation = checkInSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: validation.error.errors 
        });
      }
      
      const { identifierCode, location } = validation.data;
      
      // Validate that the identifier belongs to this contractor
      const identifierRecords = await db.select({
        identifier: identifiers,
        asset: assets,
      })
        .from(identifiers)
        .leftJoin(assets, eq(assets.identifierId, identifiers.id))
        .where(eq(identifiers.code, identifierCode))
        .limit(1);
      
      if (identifierRecords.length === 0) {
        return res.status(404).send("Identifier not found");
      }
      
      const { identifier, asset } = identifierRecords[0];
      
      // Verify the identifier or asset belongs to this contractor
      // Check either identifiers.contractorId or assets.installerId
      const ownsIdentifier = identifier.contractorId === context.contractor.id;
      const ownsAsset = asset?.installerId === context.contractor.id;
      
      if (!ownsIdentifier && !ownsAsset) {
        return res.status(403).send("Identifier does not belong to your organization");
      }
      
      // Check for existing active visit
      const existingVisits = await db.select()
        .from(contractorVisits)
        .where(and(
          eq(contractorVisits.contractorId, context.contractor.id),
          eq(contractorVisits.workerId, context.worker.id),
          isNull(contractorVisits.checkOutAt)
        ))
        .limit(1);
      
      if (existingVisits.length > 0) {
        return res.status(400).send("Already checked in. Please check out first.");
      }
      
      // Create visit record with proper GPS data
      const [visit] = await db.insert(contractorVisits).values({
        contractorId: context.contractor.id,
        workerId: context.worker.id,
        vehicleAssetId: asset?.id, // Link to vehicle asset if available
        checkInAt: new Date(),
        checkInLocation: location,
        checkInMethod: "QR",
        checkInIdentifierCode: identifierCode,
        status: "IN_PROGRESS",
      }).returning();
      
      res.json(visit);
    } catch (error: any) {
      console.error("Error checking in:", error);
      res.status(500).send(error.message);
    }
  });
  
  // Worker check-out
  app.post("/api/contractor/worker/checkout", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Not authenticated");
      }
      
      const context = await getWorkerContext(req.user.id);
      if (!context || !context.worker) {
        return res.status(403).send("Not a contractor worker");
      }
      
      // Validate request body
      const validation = checkOutSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: validation.error.errors 
        });
      }
      
      const { location, completedTaskIds } = validation.data;
      
      // Find active visit for this specific worker
      const visits = await db.select()
        .from(contractorVisits)
        .where(and(
          eq(contractorVisits.contractorId, context.contractor.id),
          eq(contractorVisits.workerId, context.worker.id),
          isNull(contractorVisits.checkOutAt),
          eq(contractorVisits.status, "IN_PROGRESS")
        ))
        .limit(1);
      
      if (visits.length === 0) {
        return res.status(400).send("No active visit found");
      }
      
      const visit = visits[0];
      
      // Update visit with check-out info
      const [updatedVisit] = await db.update(contractorVisits)
        .set({
          checkOutAt: new Date(),
          checkOutLocation: location,
          checkOutMethod: "MANUAL",
          tasksCompleted: completedTaskIds?.length || 0,
          status: "COMPLETED",
          completedAt: new Date(),
        })
        .where(eq(contractorVisits.id, visit.id))
        .returning();
      
      // Mark tasks as completed and create task completion records
      if (completedTaskIds && completedTaskIds.length > 0) {
        for (const taskId of completedTaskIds) {
          // Verify task belongs to this contractor and is assigned to this worker
          const taskRecords = await db.select()
            .from(contractorTasks)
            .where(and(
              eq(contractorTasks.id, taskId),
              eq(contractorTasks.contractorId, context.contractor.id),
              or(
                eq(contractorTasks.assignedWorkerId, context.worker.id),
                isNull(contractorTasks.assignedWorkerId)
              )
            ))
            .limit(1);
          
          if (taskRecords.length > 0) {
            // Update task status
            await db.update(contractorTasks)
              .set({ 
                status: "COMPLETED", 
                completedAt: new Date(),
                assignedWorkerId: context.worker.id, // Assign to worker who completed it
              })
              .where(eq(contractorTasks.id, taskId));
            
            // Create task completion record
            await db.insert(contractorTaskCompletions).values({
              taskId,
              workerId: context.worker.id,
              visitId: visit.id,
              completedAt: new Date(),
            });
          }
        }
      }
      
      res.json(updatedVisit);
    } catch (error: any) {
      console.error("Error checking out:", error);
      res.status(500).send(error.message);
    }
  });
}
