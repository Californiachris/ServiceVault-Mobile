import { db } from './db';
import { storage } from './storage';
import { NotificationService } from './notifications';
import { reminders } from '@shared/schema';
import { eq } from 'drizzle-orm';

const notificationService = new NotificationService(storage);

export async function processReminders() {
  console.log('[ReminderWorker] Starting reminder processing...');
  
  try {
    // Get all due reminders
    const dueReminders = await storage.getDueReminders();
    console.log(`[ReminderWorker] Found ${dueReminders.length} due reminders`);
    
    if (dueReminders.length === 0) {
      console.log('[ReminderWorker] No due reminders to process');
      return { processed: 0, sent: 0, failed: 0 };
    }
    
    let processed = 0;
    let sent = 0;
    let failed = 0;
    
    for (const reminder of dueReminders) {
      try {
        console.log(`[ReminderWorker] Processing reminder ${reminder.id}`);
        
        // Use new dual notification method
        const notificationResult = await notificationService.sendDualReminderNotification(reminder.id);
        
        const { ownerNotified, contractorNotified, ownerContactMissing, errors } = notificationResult;
        
        // Log detailed results
        console.log(`[ReminderWorker] Reminder ${reminder.id} notification results:`, {
          ownerNotified,
          contractorNotified,
          ownerContactMissing,
          errorCount: errors.length
        });
        
        if (errors.length > 0) {
          console.error(`[ReminderWorker] Errors for reminder ${reminder.id}:`, errors);
        }
        
        // Update reminder with notification status tracking
        const notificationSuccessful = ownerNotified || contractorNotified;
        
        if (notificationSuccessful) {
          sent++;
          
          // Handle recurring vs one-time reminders with status tracking
          if (reminder.frequency && reminder.frequency !== 'ONE_TIME' && reminder.intervalDays) {
            // For recurring: advance dueAt to next occurrence and update tracking
            const nextDueDate = new Date(reminder.dueAt);
            nextDueDate.setDate(nextDueDate.getDate() + reminder.intervalDays);
            
            await db
              .update(reminders)
              .set({ 
                status: 'PENDING', // Keep as pending for next occurrence
                dueAt: nextDueDate, // Advance to next due date
                nextDueAt: nextDueDate,
                lastNotifiedAt: new Date(),
                ownerNotified,
                contractorNotified,
              })
              .where(eq(reminders.id, reminder.id));
            
            console.log(`[ReminderWorker] Recurring reminder ${reminder.id} rescheduled to ${nextDueDate.toISOString()}`);
          } else {
            // For one-time: mark as completed with tracking
            await db
              .update(reminders)
              .set({ 
                status: 'COMPLETED',
                completedAt: new Date(),
                lastNotifiedAt: new Date(),
                ownerNotified,
                contractorNotified,
              })
              .where(eq(reminders.id, reminder.id));
            
            console.log(`[ReminderWorker] One-time reminder ${reminder.id} marked as completed`);
          }
        } else {
          // Notification completely failed
          failed++;
          
          // Still update tracking fields to show attempt was made
          await db
            .update(reminders)
            .set({
              lastNotifiedAt: new Date(),
              ownerNotified: false,
              contractorNotified: false,
            })
            .where(eq(reminders.id, reminder.id));
          
          console.error(`[ReminderWorker] Failed to send reminder ${reminder.id}:`, errors);
        }
        
        processed++;
      } catch (error) {
        failed++;
        console.error(`[ReminderWorker] Error processing reminder ${reminder.id}:`, error);
      }
    }
    
    console.log(`[ReminderWorker] Finished processing: ${processed} processed, ${sent} sent, ${failed} failed`);
    return { processed, sent, failed };
  } catch (error) {
    console.error('[ReminderWorker] Error in reminder processing:', error);
    return { processed: 0, sent: 0, failed: 0, error };
  }
}

// Start the reminder worker with hourly interval
export function startReminderWorker(intervalMs: number = 60 * 60 * 1000) {
  console.log(`[ReminderWorker] Starting worker with interval ${intervalMs / 1000}s (${intervalMs / 60000} minutes)`);
  
  // Run immediately on startup
  processReminders().catch(err => {
    console.error('[ReminderWorker] Error in initial reminder processing:', err);
  });
  
  // Then run on schedule
  const interval = setInterval(() => {
    processReminders().catch(err => {
      console.error('[ReminderWorker] Error in scheduled reminder processing:', err);
    });
  }, intervalMs);
  
  return interval;
}
