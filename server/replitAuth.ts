import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
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
const DEMO_USER_ID = 'demo-user-public';

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

// Middleware to inject demo user in public mode
async function injectDemoUser(req: any, res: any, next: any) {
  if (AUTH_MODE === 'public') {
    // Create or get demo user
    const existingUser = await storage.getUser(DEMO_USER_ID);
    
    if (!existingUser) {
      await storage.upsertUser({
        id: DEMO_USER_ID,
        email: 'demo@servicevault.app',
        firstName: 'Demo',
        lastName: 'User',
        profileImageUrl: null,
        role: 'HOMEOWNER',
      });
      
      // Demo data seeding disabled - users should create their own properties
      // await seedDemoData(DEMO_USER_ID);
    }
    
    // Inject fake user session
    req.user = {
      claims: {
        sub: DEMO_USER_ID,
        email: 'demo@servicevault.app',
        first_name: 'Demo',
        last_name: 'User',
      }
    };
  }
  next();
}

export async function setupAuth(app: Express) {
  if (AUTH_MODE === 'public') {
    // Public mode: Skip Replit Auth completely, just inject demo user
    app.set("trust proxy", 1);
    app.use(getSession());
    app.use(injectDemoUser);
    console.log('🔓 AUTH MODE: PUBLIC - Authentication disabled, using shared demo user');
    return;
  }
  
  // Protected mode: Normal Replit Auth flow
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

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

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
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
      // In public mode, inject demo user as HOMEOWNER
      if (AUTH_MODE === 'public') {
        const demoUser = await storage.getUser(DEMO_USER_ID);
        req.userRole = demoUser?.role || 'HOMEOWNER';
        req.userRecord = demoUser;
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
