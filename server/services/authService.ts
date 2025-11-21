import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../db';
import { users, passwordResets, emailVerifications } from '@shared/schema';
import { eq, and, gt } from 'drizzle-orm';

const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_HOURS = 24;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 72;

export const authService = {
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
  },

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  },

  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  async signup(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
    phone?: string;
  }) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, data.email.toLowerCase()),
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    const passwordHash = await this.hashPassword(data.password);

    const [user] = await db.insert(users).values({
      email: data.email.toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || 'HOMEOWNER',
      phone: data.phone,
      emailVerified: false,
    }).returning();

    const verificationToken = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);

    await db.insert(emailVerifications).values({
      userId: user.id,
      token: verificationToken,
      expiresAt,
    });

    // Email verification will be sent by the notification service

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  },

  async login(email: string, password: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    const isValid = await this.verifyPassword(password, user.passwordHash);
    
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      profileImageUrl: user.profileImageUrl,
    };
  },

  async requestPasswordReset(email: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return;
    }

    await db.delete(passwordResets).where(eq(passwordResets.userId, user.id));

    const resetToken = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

    await db.insert(passwordResets).values({
      userId: user.id,
      token: resetToken,
      expiresAt,
    });

    // Password reset email will be sent by the notification service
  },

  async resetPassword(token: string, newPassword: string) {
    const reset = await db.query.passwordResets.findFirst({
      where: and(
        eq(passwordResets.token, token),
        gt(passwordResets.expiresAt, new Date())
      ),
    });

    if (!reset) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await this.hashPassword(newPassword);

    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, reset.userId));

    await db.delete(passwordResets).where(eq(passwordResets.userId, reset.userId));

    return true;
  },

  async verifyEmail(token: string) {
    const verification = await db.query.emailVerifications.findFirst({
      where: and(
        eq(emailVerifications.token, token),
        gt(emailVerifications.expiresAt, new Date())
      ),
    });

    if (!verification) {
      throw new Error('Invalid or expired verification token');
    }

    await db.update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, verification.userId));

    await db.delete(emailVerifications)
      .where(eq(emailVerifications.userId, verification.userId));

    return true;
  },

  async resendVerificationEmail(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      throw new Error('Email already verified');
    }

    await db.delete(emailVerifications).where(eq(emailVerifications.userId, userId));

    const verificationToken = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);

    await db.insert(emailVerifications).values({
      userId,
      token: verificationToken,
      expiresAt,
    });

    // Email verification will be sent by the notification service

    return true;
  },
};
