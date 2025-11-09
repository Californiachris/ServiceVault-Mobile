import { Resend } from 'resend';
import twilio from 'twilio';
import type { IStorage } from './storage';

export interface NotificationOptions {
  userId: string;
  reminderId?: string;
  subject: string;
  message: string;
  channel?: 'EMAIL' | 'SMS' | 'BOTH';
}

export class NotificationService {
  private resend: Resend | null = null;
  private twilioClient: any = null;
  private twilioPhoneNumber: string | null = null;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
    
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || null;
    }
  }

  async sendNotification(options: NotificationOptions): Promise<{
    emailSent: boolean;
    smsSent: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const { userId, reminderId, subject, message, channel } = options;
    const errors: string[] = [];
    const warnings: string[] = [];
    let emailSent = false;
    let smsSent = false;

    const user = await this.storage.getUser(userId);
    if (!user) {
      errors.push(`User ${userId} not found`);
      return { emailSent, smsSent, errors, warnings };
    }

    const userPreference = user.notificationPreference || 'EMAIL_AND_SMS';
    const shouldSendEmail = channel === 'EMAIL' || channel === 'BOTH' || 
                           (channel === undefined && (userPreference === 'EMAIL_ONLY' || userPreference === 'EMAIL_AND_SMS'));
    const shouldSendSMS = channel === 'SMS' || channel === 'BOTH' || 
                         (channel === undefined && (userPreference === 'SMS_ONLY' || userPreference === 'EMAIL_AND_SMS'));

    if (userPreference === 'NONE') {
      warnings.push('User has notifications disabled');
      return { emailSent, smsSent, errors, warnings };
    }

    // Validate required contact details and log warnings
    if (shouldSendEmail && !user.email) {
      const warning = 'Email notifications requested but no email address on file';
      warnings.push(warning);
      await this.logNotification(userId, reminderId, 'EMAIL', 'FAILED', warning);
    }
    if (shouldSendSMS && !user.phone) {
      const warning = 'SMS notifications requested but no phone number on file';
      warnings.push(warning);
      await this.logNotification(userId, reminderId, 'SMS', 'FAILED', warning);
    }

    if (shouldSendEmail && user.email) {
      const emailResult = await this.sendEmail(userId, user.email, subject, message, reminderId);
      emailSent = emailResult.success;
      if (!emailResult.success) {
        errors.push(`Email delivery failed: ${emailResult.error || 'Unknown error'}`);
      }
    }

    if (shouldSendSMS && user.phone) {
      const smsResult = await this.sendSMS(userId, user.phone, message, reminderId);
      smsSent = smsResult.success;
      if (!smsResult.success) {
        errors.push(`SMS delivery failed: ${smsResult.error || 'Unknown error'}`);
      }
    }

    return { emailSent, smsSent, errors, warnings };
  }

  private async sendEmail(
    userId: string,
    email: string,
    subject: string,
    message: string,
    reminderId?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.resend) {
      console.warn('Resend not configured - skipping email');
      await this.logNotification(userId, reminderId, 'EMAIL', 'FAILED', 'Resend not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      await this.resend.emails.send({
        from: 'FixTrack Pro <notifications@fixtrackpro.com>',
        to: email,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">${subject}</h2>
            <p style="color: #4a4a4a; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
            <p style="color: #888; font-size: 12px;">
              FixTrack Pro - Premium Asset Tracking<br>
              To manage your notification preferences, visit your dashboard.
            </p>
          </div>
        `,
      });

      await this.logNotification(userId, reminderId, 'EMAIL', 'SENT');
      console.log(`Email sent to ${email}`);
      return { success: true };
    } catch (error: any) {
      console.error('Email send error:', error);
      await this.logNotification(userId, reminderId, 'EMAIL', 'FAILED', error.message);
      return { success: false, error: error.message };
    }
  }

  private async sendSMS(
    userId: string,
    phone: string,
    message: string,
    reminderId?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.twilioClient || !this.twilioPhoneNumber) {
      console.warn('Twilio not configured - skipping SMS');
      await this.logNotification(userId, reminderId, 'SMS', 'FAILED', 'Twilio not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      await this.twilioClient.messages.create({
        body: `${message}\n\n- FixTrack Pro`,
        from: this.twilioPhoneNumber,
        to: phone,
      });

      await this.logNotification(userId, reminderId, 'SMS', 'SENT');
      console.log(`SMS sent to ${phone}`);
      return { success: true };
    } catch (error: any) {
      console.error('SMS send error:', error);
      await this.logNotification(userId, reminderId, 'SMS', 'FAILED', error.message);
      return { success: false, error: error.message };
    }
  }

  private async logNotification(
    userId: string,
    reminderId: string | undefined,
    channel: 'EMAIL' | 'SMS',
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED',
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.storage.createNotificationLog({
        userId,
        reminderId: reminderId || null,
        channel,
        status,
        sentAt: status === 'SENT' || status === 'DELIVERED' ? new Date() : null,
        deliveredAt: status === 'DELIVERED' ? new Date() : null,
        errorMessage: errorMessage || null,
        retryCount: 0,
      });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  async sendReminderNotification(
    reminderId: string,
    recipients: { userId: string; email?: string | null; phone?: string | null }[]
  ): Promise<void> {
    const reminder = await this.storage.getReminder(reminderId);
    if (!reminder) {
      console.error(`Reminder ${reminderId} not found`);
      return;
    }

    const asset = reminder.assetId ? await this.storage.getAsset(reminder.assetId) : null;
    const assetName = asset?.name || 'Asset';

    const subject = `Maintenance Reminder: ${reminder.title || 'Upcoming Maintenance'}`;
    const message = `
Reminder: ${reminder.title || 'Maintenance Due'}

Asset: ${assetName}
${reminder.description ? `\nDetails: ${reminder.description}` : ''}
Due Date: ${reminder.dueAt ? new Date(reminder.dueAt).toLocaleDateString() : 'Not specified'}

Please schedule service at your earliest convenience.
    `.trim();

    for (const recipient of recipients) {
      await this.sendNotification({
        userId: recipient.userId,
        reminderId,
        subject,
        message,
      });
    }
  }

  isConfigured(): { email: boolean; sms: boolean } {
    return {
      email: !!this.resend,
      sms: !!(this.twilioClient && this.twilioPhoneNumber),
    };
  }
}
