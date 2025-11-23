import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { db } from "./db";
import { users, contractorWorkers } from "../shared/schema";
import { eq } from "drizzle-orm";
// Demo data seeding disabled
// import { seedDemoData } from "./seedDemoData";

// Extend session type to include redirect path
declare module 'express-session' {
  interface SessionData {
    redirectAfterLogin?: string;
  }
}

// Public mode: Skip authentication entirely
const AUTH_MODE = process.env.AUTH_MODE || 'public';

// Ephemeral session store - stores temporary user sessions with 15 min TTL
const ephemeralSessions = new Map<string, { userId: string; createdAt: number; lastActivity: number }>();

// Clean up expired sessions every minute
setInterval(() => {
  const now = Date.now();
  const expiredIds: string[] = [];
  for (const [sessionId, session] of ephemeralSessions.entries()) {
    if (now - session.lastActivity > 15 * 60 * 1000) { // 15 minutes
      expiredIds.push(sessionId);
    }
  }
  expiredIds.forEach(id => ephemeralSessions.delete(id));
  if (expiredIds.length > 0) {
    console.log(`Cleaned up ${expiredIds.length} expired sessions`);
  }
}, 60 * 1000); // Every minute

if (!process.env.REPLIT_DOMAINS && AUTH_MODE === 'protected') {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
  role?: string,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    role: role || "HOMEOWNER",
  });
}

// Middleware to inject ephemeral demo user in public mode
async function injectDemoUser(req: any, res: any, next: any) {
  if (AUTH_MODE === 'public') {
    // Get or create ephemeral session ID from cookie
    let sessionId = req.cookies['ephemeral-session-id'];
    let sessionData = sessionId ? ephemeralSessions.get(sessionId) : null;
    
    // Create new session if none exists or it's expired
    if (!sessionData) {
      const { randomUUID } = await import('crypto');
      sessionId = randomUUID();
      const userId = `user-${sessionId}`;
      sessionData = {
        userId,
        createdAt: Date.now(),
        lastActivity: Date.now()
      };
      ephemeralSessions.set(sessionId, sessionData);
      
      // Set cookie for 15 minutes
      res.cookie('ephemeral-session-id', sessionId, {
        maxAge: 15 * 60 * 1000,
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
      });
      
      // Create fresh user for this session - NO real email shown
      await storage.upsertUser({
        id: userId,
        email: `demo-${sessionId}@servicevault.app`, // Unique, temporary email
        firstName: 'Demo',
        lastName: 'User',
        profileImageUrl: null,
        role: 'HOMEOWNER', // Start as homeowner, they choose their role
      });
    }
    
    // Update last activity
    sessionData.lastActivity = Date.now();
    
    // Inject user session
    req.user = {
      claims: {
        sub: sessionData.userId,
        email: `demo-${sessionId}@servicevault.app`,
        first_name: 'Demo',
        last_name: 'User',
      }
    };
    req.ephemeralSessionId = sessionId;
  }
  next();
}

// Configure Local Strategy for Worker Login
passport.use('worker-local', new LocalStrategy(
  { usernameField: 'username', passwordField: 'password' },
  async (username, password, done) => {
    try {
      // Find user by username
      const [user] = await db.select().from(users).where(eq(users.id, username)).limit(1);
      
      if (!user || user.role !== 'WORKER') {
        return done(null, false, { message: 'Invalid credentials' });
      }

      if (!user.passwordHash) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      // Create session object similar to Replit auth
      const sessionUser = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName || '',
          last_name: user.lastName || '',
        },
        role: user.role,
      };

      return done(null, sessionUser);
    } catch (error) {
      return done(error);
    }
  }
));

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  if (AUTH_MODE === 'public') {
    // Parse cookies for ephemeral session handling
    const cookieParser = (await import('cookie-parser')).default;
    app.use(cookieParser());
    
    // Public mode: Still setup passport for worker login, but inject demo user for regular users
    app.use(injectDemoUser);
    console.log('🔓 AUTH MODE: PUBLIC - Ephemeral sessions (15 min TTL), unique per visitor');
  } else {
    // Protected mode: Setup Replit OIDC Auth
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    // Verify function with request access for tier-based provisioning
    const verifyWithRequest = async (
      req: any,
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      
      // Read selected tier from session (set by /api/auth/selection)
      const selectedTier = req.session?.selectedTier;
      let role = "HOMEOWNER"; // default
      
      if (selectedTier) {
        if (selectedTier.includes('contractor')) {
          role = "CONTRACTOR";
        } else if (selectedTier.includes('fleet')) {
          role = "FLEET";
        }
        // Clear the tier from session after use
        delete req.session.selectedTier;
      }
        
      const claims = tokens.claims();
      if (!claims) {
        return verified(new Error("Failed to get claims from tokens"));
      }
      const userId = claims["sub"];
      await upsertUser(claims, role);
      
      // Demo data seeding disabled - users should create their own properties
      // if (process.env.NODE_ENV === 'development' && userId) {
      //   try {
      //     await seedDemoData(userId);
      //   } catch (error) {
      //     console.error("Error seeding demo data during auth:", error);
      //   }
      // }
      
      verified(null, user);
    };

    for (const domain of process.env
      .REPLIT_DOMAINS!.split(",")) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
          passReqToCallback: true,
        },
        verifyWithRequest,
      );
      passport.use(strategy);
    }
  }

  // Serialize/deserialize for both strategies
  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Store the intended redirect path in session before authentication
    const redirectPath = req.query.redirect as string;
    if (redirectPath && redirectPath.startsWith('/')) {
      req.session.redirectAfterLogin = redirectPath;
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any) => {
      if (err || !user) {
        return res.redirect("/api/login");
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          return res.redirect("/api/login");
        }
        
        // Use stored redirect path or default to /dashboard
        const redirectPath = req.session.redirectAfterLogin || "/dashboard";
        delete req.session.redirectAfterLogin; // Clean up
        res.redirect(redirectPath);
      });
    })(req, res, next);
  });

  // Worker login endpoint
  app.post("/api/auth/worker/login", (req, res, next) => {
    passport.authenticate('worker-local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ error: "Login failed" });
        }
        
        // Return user data
        res.json({
          user: {
            id: user.claims.sub,
            email: user.claims.email,
            firstName: user.claims.first_name,
            lastName: user.claims.last_name,
            role: 'WORKER',
          }
        });
      });
    })(req, res, next);
  });

  // Unified logout for both auth strategies
  app.get("/api/logout", async (req, res) => {
    const user = req.user as any;
    
    req.logout(() => {
      // If worker (local auth), just redirect to home
      if (user?.role === 'WORKER' || !user?.refresh_token) {
        return res.redirect('/');
      }
      
      // For OIDC users, redirect to OIDC logout
      if (AUTH_MODE === 'protected') {
        getOidcConfig().then(config => {
          res.redirect(
            client.buildEndSessionUrl(config, {
              client_id: process.env.REPL_ID!,
              post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
            }).href
          );
        }).catch(() => res.redirect('/'));
      } else {
        res.redirect('/');
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // In public mode, always pass authentication
  if (AUTH_MODE === 'public') {
    return next();
  }
  
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

export function requireRole(...allowedRoles: string[]): RequestHandler {
  return async (req: any, res, next) => {
    try {
      // In public mode, use ephemeral user
      if (AUTH_MODE === 'public') {
        const userId = req.user?.claims?.sub;
        const user = userId ? await storage.getUser(userId) : null;
        req.userRole = user?.role || 'HOMEOWNER';
        req.userRecord = user;
        return next();
      }
      
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(403).json({ error: "Access denied" });
      }

      const effectiveRole = req.devRoleOverride || user.role;
      
      req.userRole = effectiveRole;
      req.userRecord = user;

      if (!allowedRoles.includes(effectiveRole)) {
        return res.status(403).json({ error: "Access denied" });
      }

      next();
    } catch (error) {
      console.error("Error in requireRole middleware:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
