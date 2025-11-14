import { Response, NextFunction } from 'express';
import { getUserEntitlements } from './service';
import { FeatureKey, checkFeatureAccess } from '../../shared/planFeatures';

// Middleware to attach entitlements to request
export async function attachEntitlements(req: any, res: Response, next: NextFunction) {
  try {
    // Skip if not authenticated
    if (!req.user?.claims?.sub) {
      return next();
    }
    
    const userId = req.user.claims.sub;
    const entitlements = await getUserEntitlements(userId);
    req.entitlements = entitlements;
    
    next();
  } catch (error) {
    console.error('Error attaching entitlements:', error);
    next(); // Continue even if entitlements fail
  }
}

// Middleware factory to require specific feature access
export function requireEntitlement(feature: FeatureKey) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      // Must be authenticated
      if (!req.user?.claims?.sub) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Load entitlements if not already attached
      if (!req.entitlements) {
        const userId = req.user.claims.sub;
        req.entitlements = await getUserEntitlements(userId);
      }
      
      // Check feature access
      const hasAccess = checkFeatureAccess(req.entitlements, feature);
      
      if (!hasAccess) {
        console.warn(`Access denied for user ${req.user.claims.sub} to feature ${feature}`);
        return res.status(403).json({ 
          error: 'Feature not available in your subscription plan',
          feature,
          currentPlan: req.entitlements.plan,
        });
      }
      
      next();
    } catch (error) {
      console.error('Error checking entitlement:', error);
      res.status(500).json({ error: 'Failed to verify access' });
    }
  };
}

// Middleware to require any of multiple features
export function requireAnyEntitlement(...features: FeatureKey[]) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.claims?.sub) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!req.entitlements) {
        const userId = req.user.claims.sub;
        req.entitlements = await getUserEntitlements(userId);
      }
      
      const hasAnyAccess = features.some(feature => 
        checkFeatureAccess(req.entitlements, feature)
      );
      
      if (!hasAnyAccess) {
        return res.status(403).json({ 
          error: 'None of the required features are available in your subscription plan',
          requiredFeatures: features,
          currentPlan: req.entitlements.plan,
        });
      }
      
      next();
    } catch (error) {
      console.error('Error checking entitlements:', error);
      res.status(500).json({ error: 'Failed to verify access' });
    }
  };
}
