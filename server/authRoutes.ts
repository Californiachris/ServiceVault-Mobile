import { Router } from 'express';
import { z } from 'zod';
import { authService } from './services/authService';
import { NotificationService } from './notifications';
import { storage } from './storage';

const router = Router();
const notificationService = new NotificationService(storage);

// Rate limiting store (simple in-memory for now)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);
  
  if (!attempts || now > attempts.resetAt) {
    loginAttempts.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }
  
  attempts.count++;
  return true;
}

// Validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['HOMEOWNER', 'CONTRACTOR', 'FLEET', 'PROPERTY_MANAGER']).optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const data = signupSchema.parse(req.body);
    
    if (!checkRateLimit(`signup:${data.email}`)) {
      return res.status(429).json({ message: 'Too many signup attempts. Please try again later.' });
    }
    
    const user = await authService.signup(data);
    
    // Send verification email
    const verificationToken = await storage.getEmailVerificationToken(user.id);
    if (verificationToken) {
      await notificationService.sendEmailVerification(user.email, verificationToken.token);
    }
    
    // Set session
    (req as any).session.userId = user.id;
    (req as any).session.user = user;
    
    res.status(201).json({
      message: 'Account created successfully. Please check your email to verify your account.',
      user,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(400).json({ message: error.message || 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    
    if (!checkRateLimit(`login:${data.email}`)) {
      return res.status(429).json({ message: 'Too many login attempts. Please try again in 15 minutes.' });
    }
    
    const user = await authService.login(data.email, data.password);
    
    // Set session
    (req as any).session.userId = user.id;
    (req as any).session.user = user;
    
    res.json({
      message: 'Login successful',
      user,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(401).json({ message: 'Invalid email or password' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  (req as any).session.destroy((err: any) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  // Check both session.user (email/password) and req.user (demo mode)
  const sessionUser = (req as any).session?.user;
  const demoUser = (req as any).user;
  
  const user = sessionUser || demoUser;
  
  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // If it's a demo user with claims format, fetch full user from database
  if (user.claims && user.claims.sub) {
    const dbUser = await storage.getUser(user.claims.sub);
    if (dbUser) {
      return res.json(dbUser);
    }
  }
  
  res.json(user);
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    
    if (!checkRateLimit(`reset:${data.email}`)) {
      return res.status(429).json({ message: 'Too many reset attempts. Please try again later.' });
    }
    
    await authService.requestPasswordReset(data.email);
    
    // Get the reset token and send email
    const user = await storage.getUserByEmail(data.email);
    if (user) {
      const resetToken = await storage.getPasswordResetToken(user.id);
      if (resetToken) {
        await notificationService.sendPasswordReset(user.email, resetToken.token);
      }
    }
    
    // Always return success to prevent email enumeration
    res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const data = resetPasswordSchema.parse(req.body);
    
    await authService.resetPassword(data.token, data.password);
    
    res.json({ message: 'Password reset successful. You can now login with your new password.' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(400).json({ message: error.message || 'Failed to reset password' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const data = verifyEmailSchema.parse(req.body);
    
    await authService.verifyEmail(data.token);
    
    res.json({ message: 'Email verified successfully!' });
  } catch (error: any) {
    console.error('Verify email error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(400).json({ message: error.message || 'Failed to verify email' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    await authService.resendVerificationEmail(userId);
    
    const user = await storage.getUser(userId);
    if (user) {
      const verificationToken = await storage.getEmailVerificationToken(userId);
      if (verificationToken) {
        await notificationService.sendEmailVerification(user.email, verificationToken.token);
      }
    }
    
    res.json({ message: 'Verification email sent!' });
  } catch (error: any) {
    console.error('Resend verification error:', error);
    res.status(400).json({ message: error.message || 'Failed to resend verification email' });
  }
});

export default router;
