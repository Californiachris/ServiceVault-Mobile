// Simple in-memory rate limiter for AI parsing endpoints
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export function checkRateLimit(
  userId: string,
  endpoint: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  // Initialize or reset if window expired
  if (!entry || now > entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }
  
  // Check limit
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  // Increment and allow
  entry.count++;
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Predefined rate limits for different endpoints
export const RATE_LIMITS = {
  WARRANTY_PARSE: {
    maxRequests: 20, // 20 warranty parsing requests per hour per user
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  TENANT_REPORT: {
    maxRequests: 5, // 5 reports per hour per IP per property
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  TENANT_REPORT_DAILY: {
    maxRequests: 20, // 20 reports per day per IP per property
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
};
