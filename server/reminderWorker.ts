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
        // Get the property or asset owner to notify
        let ownerId: string | null = null;
        let recipientName = 'User';
        
        if (reminder.propertyId) {
          const property = await storage.getProperty(reminder.propertyId);
          if (property) {
            ownerId = property.ownerId;
          }
        } else if (reminder.assetId) {
          const asset = await storage.getAsset(reminder.assetId);
          if (asset) {
            const property = await storage.getProperty(asset.propertyId);
            if (property) {
              ownerId = property.ownerId;
            }
          }
        }
        
        if (!ownerId) {
          console.warn(`[ReminderWorker] Cannot find owner for reminder ${reminder.id}, skipping`);
          failed++;
          continue;
        }
        
        // Get user details
        const user = await storage.getUser(ownerId);
        if (!user) {
          console.warn(`[ReminderWorker] User ${ownerId} not found for reminder ${reminder.id}, skipping`);
          failed++;
          continue;
        }
        
        recipientName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User';
        
        // Prepare notification message
        const subject = `Reminder: ${reminder.title || 'Maintenance Due'}`;
        const message = `Hi ${recipientName},\n\nThis is a reminder about: ${reminder.title || 'Maintenance'}\n\n${reminder.description || 'Please check your ServiceVault dashboard for details.'}\n\nBest regards,\nServiceVault Team`;
        
        // Send notification
        console.log(`[ReminderWorker] Sending reminder ${reminder.id} to user ${ownerId}`);
        const result = await notificationService.sendNotification({
          userId: ownerId,
          reminderId: reminder.id,
          subject,
          message,
          channel: undefined, // Use user preference
        });
        
        if (result.emailSent || result.smsSent) {
          sent++;
          console.log(`[ReminderWorker] Reminder ${reminder.id} sent successfully (email: ${result.emailSent}, sms: ${result.smsSent})`);
          
          // Handle recurring vs one-time reminders in a single atomic update (FIXED: no race condition)
          if (reminder.frequency && reminder.frequency !== 'ONE_TIME' && reminder.intervalDays) {
            // For recurring: advance dueAt to next occurrence (ensures it won't be picked up again immediately)
            const nextDueDate = new Date(reminder.dueAt);
            nextDueDate.setDate(nextDueDate.getDate() + reminder.intervalDays);
            
            await db
              .update(reminders)
              .set({ 
                status: 'PENDING', // Keep as pending for next occurrence
                dueAt: nextDueDate, // Advance to next due date
                nextDueAt: nextDueDate,
              })
              .where(eq(reminders.id, reminder.id));
            
            console.log(`[ReminderWorker] Recurring reminder ${reminder.id} rescheduled to ${nextDueDate.toISOString()}`);
          } else {
            // For one-time: mark as completed in single update
            await db
              .update(reminders)
              .set({ 
                status: 'COMPLETED',
                completedAt: new Date()
              })
              .where(eq(reminders.id, reminder.id));
            
            console.log(`[ReminderWorker] One-time reminder ${reminder.id} marked as completed`);
          }
        } else {
          failed++;
          console.error(`[ReminderWorker] Failed to send reminder ${reminder.id}:`, result.errors);
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
