import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, subscriptions } from "../../shared/schema";
import { UserEntitlements, getPlanFeatures } from "../../shared/planFeatures";

export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  // Load user data
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Load subscription data
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  
  // Get plan from subscription or fall back to role default
  const plan = subscription?.plan || null;
  const role = user.role || 'HOMEOWNER';
  
  // Get base plan features
  const planFeatures = getPlanFeatures(plan, role);
  
  // Calculate quota remaining
  const quotaTotal = subscription?.quotaTotal || planFeatures.monthlyQRQuota;
  const quotaUsed = subscription?.quotaUsed || 0;
  const quotaRemaining = Math.max(0, quotaTotal - quotaUsed);
  
  // Compose full entitlements
  const entitlements: UserEntitlements = {
    ...planFeatures,
    plan,
    role,
    quotaUsed,
    quotaRemaining,
    // Add-on features from subscription
    featureServiceSessions: subscription?.featureServiceSessions || false,
    featureNanoTag: subscription?.featureNanoTag || false,
  };
  
  return entitlements;
}
