import type { Express, Request, Response } from "express";
import { db } from "./db";
import { contractorWorkers, contractorTasks, contractorVisits, contractorTaskCompletions, contractorWorkerNotifications } from "../shared/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

export function registerContractorRoutes(app: Express) {
  // Get active visit for current worker
  app.get("/api/contractor/active-visit", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).send("Not authenticated");
      }
      
      // Find active visit for this worker
      const visits = await db.select()
        .from(contractorVisits)
        .where(and(
          eq(contractorVisits.checkOutAt, null as any),
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
      if (!req.isAuthenticated()) {
        return res.status(401).send("Not authenticated");
      }
      
      // Get tasks for today (simplified - in real implementation would filter by date)
      const tasks = await db.select()
        .from(contractorTasks)
        .where(eq(contractorTasks.status, "PENDING"))
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
      if (!req.isAuthenticated()) {
        return res.status(401).send("Not authenticated");
      }
      
      const { identifierCode, location } = req.body;
      
      // In a real implementation, would:
      // 1. Validate the identifier code
      // 2. Get the contractor and worker info
      // 3. Create the visit record
      
      // For now, create a basic visit record
      const [visit] = await db.insert(contractorVisits).values({
        contractorId: "demo-contractor-id", // Would get from user's contractor record
        workerId: "demo-worker-id", // Would get from user's worker record
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
      if (!req.isAuthenticated()) {
        return res.status(401).send("Not authenticated");
      }
      
      const { location, completedTaskIds } = req.body;
      
      // Find active visit
      const visits = await db.select()
        .from(contractorVisits)
        .where(and(
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
      
      // Mark tasks as completed
      if (completedTaskIds && completedTaskIds.length > 0) {
        for (const taskId of completedTaskIds) {
          await db.update(contractorTasks)
            .set({ status: "COMPLETED", completedAt: new Date() })
            .where(eq(contractorTasks.id, taskId));
        }
      }
      
      res.json(updatedVisit);
    } catch (error: any) {
      console.error("Error checking out:", error);
      res.status(500).send(error.message);
    }
  });
}
