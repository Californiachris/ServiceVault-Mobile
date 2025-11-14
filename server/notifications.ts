import { Resend } from 'resend';
import twilio from 'twilio';
import type { IStorage } from './storage';

export interface ContractorBranding {
  companyName: string;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
}

export interface NotificationOptions {
  userId: string;
  reminderId?: string;
  subject: string;
  message: string;
  channel?: 'EMAIL' | 'SMS' | 'BOTH';
  contractorBranding?: ContractorBranding | null;
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
    const { userId, reminderId, subject, message, channel, contractorBranding } = options;
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
      const emailResult = await this.sendEmail(userId, user.email, subject, message, reminderId, contractorBranding);
      emailSent = emailResult.success;
      if (!emailResult.success) {
        errors.push(`Email delivery failed: ${emailResult.error || 'Unknown error'}`);
      }
    }

    if (shouldSendSMS && user.phone) {
      const smsResult = await this.sendSMS(userId, user.phone, message, reminderId, contractorBranding);
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
    reminderId?: string,
    contractorBranding?: ContractorBranding | null
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.resend) {
      console.warn('Resend not configured - skipping email');
      await this.logNotification(userId, reminderId, 'EMAIL', 'FAILED', 'Resend not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      // Build contractor branding section if available
      let contractorSection = '';
      if (contractorBranding) {
        contractorSection = `
          <div style="background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); padding: 20px; border-radius: 8px; margin: 24px 0;">
            ${contractorBranding.logoUrl ? `
              <div style="text-align: center; margin-bottom: 12px;">
                <img src="${contractorBranding.logoUrl}" alt="${contractorBranding.companyName}" style="max-width: 120px; max-height: 60px; object-fit: contain;">
              </div>
            ` : ''}
            <div style="text-align: center; color: white;">
              <h3 style="margin: 0 0 8px 0; font-size: 18px;">${contractorBranding.companyName}</h3>
              <p style="margin: 4px 0; font-size: 14px;">Your trusted service provider</p>
              ${contractorBranding.phone ? `<p style="margin: 4px 0;">📞 ${contractorBranding.phone}</p>` : ''}
              ${contractorBranding.email ? `<p style="margin: 4px 0;">📧 ${contractorBranding.email}</p>` : ''}
              <p style="margin-top: 12px; font-size: 12px; opacity: 0.9;">Contact us to schedule this maintenance service</p>
            </div>
          </div>
        `;
      }

      await this.resend.emails.send({
        from: 'ServiceVault <notifications@servicevault.app>',
        to: email,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">${subject}</h2>
            <p style="color: #4a4a4a; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
            ${contractorSection}
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
            <p style="color: #888; font-size: 12px;">
              ServiceVault - Premium Asset Tracking<br>
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
    reminderId?: string,
    contractorBranding?: ContractorBranding | null
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.twilioClient || !this.twilioPhoneNumber) {
      console.warn('Twilio not configured - skipping SMS');
      await this.logNotification(userId, reminderId, 'SMS', 'FAILED', 'Twilio not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      let smsBody = message;
      
      // Add contractor branding to SMS if available
      if (contractorBranding) {
        smsBody += `\n\n---\nInstalled by: ${contractorBranding.companyName}`;
        if (contractorBranding.phone) {
          smsBody += `\nContact: ${contractorBranding.phone}`;
        }
      }
      
      smsBody += '\n\n- ServiceVault';

      await this.twilioClient.messages.create({
        body: smsBody,
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

    // Fetch contractor branding if asset was installed by a contractor
    let contractorBranding: ContractorBranding | null = null;
    let contractorUserId: string | null = null;
    
    if (asset?.installerId) {
      const contractor = await this.storage.getContractor(asset.installerId);
      if (contractor) {
        const contractorUser = await this.storage.getUser(contractor.userId);
        if (contractorUser) {
          contractorBranding = {
            companyName: contractor.companyName || 'Contractor',
            logoUrl: contractor.logoUrl,
            email: contractorUser.email || null,
            phone: contractorUser.phone || null,
          };
          contractorUserId = contractor.userId;
        }
      }
    }

    // Automatically add contractor to recipients if not already included
    const recipientUserIds = new Set(recipients.map(r => r.userId));
    const allRecipients = [...recipients];
    
    if (contractorUserId && !recipientUserIds.has(contractorUserId)) {
      allRecipients.push({
        userId: contractorUserId,
        email: contractorBranding?.email || null,
        phone: contractorBranding?.phone || null,
      });
      console.log(`Added contractor ${contractorUserId} to reminder ${reminderId} recipients`);
    }

    const subject = `Maintenance Reminder: ${reminder.title || 'Upcoming Maintenance'}`;
    const homeownerMessage = `
Reminder: ${reminder.title || 'Maintenance Due'}

Asset: ${assetName}
${reminder.description ? `\nDetails: ${reminder.description}` : ''}
Due Date: ${reminder.dueAt ? new Date(reminder.dueAt).toLocaleDateString() : 'Not specified'}

Please schedule service at your earliest convenience.
    `.trim();

    const contractorMessage = `
New Service Opportunity: ${reminder.title || 'Maintenance Due'}

Asset: ${assetName}
${reminder.description ? `\nDetails: ${reminder.description}` : ''}
Due Date: ${reminder.dueAt ? new Date(reminder.dueAt).toLocaleDateString() : 'Not specified'}

Your customer needs this service scheduled. Contact them to book the job!
    `.trim();

    for (const recipient of allRecipients) {
      // Send contractor-specific message to contractors, homeowner message to others
      const isContractor = recipient.userId === contractorUserId;
      const message = isContractor ? contractorMessage : homeownerMessage;
      const subjectLine = isContractor 
        ? `Service Opportunity: ${reminder.title || 'Maintenance Due'}`
        : subject;
      
      await this.sendNotification({
        userId: recipient.userId,
        reminderId,
        subject: subjectLine,
        message,
        contractorBranding: isContractor ? null : contractorBranding, // Only show branding to homeowners
      });
    }
  }

  async sendAdminOrderNotification(orderDetails: {
    userId: string;
    userEmail: string;
    userName: string;
    plan: string;
    addOns: string[];
    shippingAddress?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    stripeCustomerId?: string;
    subscriptionId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const adminEmail = process.env.ADMIN_EMAIL;
    
    if (!adminEmail) {
      console.warn('ADMIN_EMAIL not configured - skipping admin notification');
      return { success: false, error: 'Admin email not configured' };
    }

    if (!this.resend) {
      console.warn('Resend not configured - skipping admin notification');
      return { success: false, error: 'Email service not configured' };
    }

    const { userId, userEmail, userName, plan, addOns, shippingAddress, stripeCustomerId, subscriptionId } = orderDetails;
    
    // Determine if physical items need to be shipped
    const physicalItems = addOns.filter(addon => 
      addon.includes('nanotag') || 
      addon.includes('sticker') || 
      plan.includes('contractor') ||
      plan.includes('homeowner')
    );

    const requiresShipping = physicalItems.length > 0 || plan.includes('contractor') || plan.includes('homeowner');

    let addOnsHTML = '';
    if (addOns.length > 0) {
      addOnsHTML = `
        <h3 style="color: #1a1a1a; margin-top: 20px;">Selected Add-Ons:</h3>
        <ul style="color: #4a4a4a;">
          ${addOns.map(addon => `<li><strong>${addon}</strong></li>`).join('')}
        </ul>
      `;
    }

    let shippingHTML = '';
    if (requiresShipping) {
      shippingHTML = `
        <div style="background: #fff3cd; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin: 0 0 12px 0;">⚠️ PHYSICAL FULFILLMENT REQUIRED</h3>
          ${shippingAddress ? `
            <p style="margin: 8px 0; color: #856404;"><strong>Ship to:</strong></p>
            <div style="color: #856404; line-height: 1.6;">
              ${userName}<br>
              ${shippingAddress.street}<br>
              ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}<br>
              ${shippingAddress.country}
            </div>
          ` : `
            <p style="color: #856404;"><strong>No shipping address provided</strong> - Contact customer for delivery address</p>
          `}
        </div>
      `;
    }

    try {
      await this.resend.emails.send({
        from: 'ServiceVault Orders <orders@servicevault.app>',
        to: adminEmail,
        subject: `🎉 New Subscription Order: ${plan} - ${requiresShipping ? 'FULFILLMENT REQUIRED' : 'Digital Only'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #00D9FF 0%, #FFB800 100%); padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">New Subscription Order!</h1>
            </div>
            
            <div style="background: white; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">Customer Information</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 8px 0; color: #888; width: 150px;"><strong>Name:</strong></td>
                  <td style="padding: 8px 0; color: #1a1a1a;">${userName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #888;"><strong>Email:</strong></td>
                  <td style="padding: 8px 0; color: #1a1a1a;">${userEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #888;"><strong>User ID:</strong></td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-family: monospace; font-size: 12px;">${userId}</td>
                </tr>
                ${stripeCustomerId ? `
                <tr>
                  <td style="padding: 8px 0; color: #888;"><strong>Stripe Customer:</strong></td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-family: monospace; font-size: 12px;">${stripeCustomerId}</td>
                </tr>
                ` : ''}
                ${subscriptionId ? `
                <tr>
                  <td style="padding: 8px 0; color: #888;"><strong>Subscription ID:</strong></td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-family: monospace; font-size: 12px;">${subscriptionId}</td>
                </tr>
                ` : ''}
              </table>

              <h3 style="color: #1a1a1a;">Plan Details</h3>
              <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
                <strong style="color: #1a1a1a; font-size: 16px;">${plan.replace(/_/g, ' ').toUpperCase()}</strong>
              </div>

              ${addOnsHTML}
              ${shippingHTML}

              ${requiresShipping ? `
                <div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                  <h3 style="color: #155724; margin: 0 0 8px 0;">✅ Next Steps:</h3>
                  <ol style="color: #155724; margin: 8px 0; padding-left: 20px;">
                    <li>Prepare QR stickers for ${plan.replace(/_/g, ' ')}</li>
                    ${addOns.includes('addon_nanotag_setup') || addOns.includes('addon_nanotag_monthly') ? '<li>Include NanoTag stickers in shipment</li>' : ''}
                    <li>Ship to address above</li>
                    <li>Mark subscription as fulfilled in admin panel</li>
                  </ol>
                </div>
              ` : `
                <div style="background: #e7f3ff; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                  <p style="color: #004085; margin: 0;"><strong>ℹ️ Digital-only subscription</strong> - No physical fulfillment required</p>
                </div>
              `}

              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                ServiceVault Admin Notification<br>
                This email was sent automatically when a customer subscribed.
              </p>
            </div>
          </div>
        `,
      });

      console.log(`Admin notification sent to ${adminEmail} for order ${subscriptionId || userId}`);
      return { success: true };
    } catch (error: any) {
      console.error('Admin notification send error:', error);
      return { success: false, error: error.message };
    }
  }

  isConfigured(): { email: boolean; sms: boolean } {
    return {
      email: !!this.resend,
      sms: !!(this.twilioClient && this.twilioPhoneNumber),
    };
  }
}
