// Subscription Plan Feature Definitions
// Shared between frontend and backend for type safety

export type FeatureKey =
  // Core features
  | 'masterQR'
  | 'assetTracking'
  | 'warranties'
  | 'aiReminders'
  // Contractor features
  | 'contractorBranding'
  | 'jobTracking'
  | 'qrStickers'
  | 'scanAnalytics'
  // Fleet features
  | 'fleetManagement'
  | 'maintenanceForecasting'
  | 'usageTracking'
  | 'costAnalytics'
  | 'complianceAlerts'
  // Property Manager features
  | 'propertyManagement'
  | 'workerManagement'
  | 'taskAssignment'
  | 'gpsCheckin'
  | 'tenantReports'
  | 'visitHistory';

export interface PlanFeatures {
  // Core features
  masterQR: boolean;
  assetTracking: boolean;
  warranties: boolean;
  aiReminders: boolean;
  
  // Contractor features
  contractorBranding: boolean;
  jobTracking: boolean;
  qrStickers: boolean;
  scanAnalytics: boolean;
  
  // Fleet features
  fleetManagement: boolean;
  maintenanceForecasting: boolean;
  usageTracking: boolean;
  costAnalytics: boolean;
  complianceAlerts: boolean;
  
  // Property Manager features
  propertyManagement: boolean;
  workerManagement: boolean;
  taskAssignment: boolean;
  gpsCheckin: boolean;
  tenantReports: boolean;
  visitHistory: boolean;
  
  // Limits
  maxAssets: number;
  maxProperties: number;
  monthlyQRQuota: number;
}

export interface UserEntitlements extends PlanFeatures {
  plan: string | null;
  role: string;
  quotaUsed: number;
  quotaRemaining: number;
  // Add-on features from subscriptions table
  featureServiceSessions: boolean;
  featureNanoTag: boolean;
}

export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  // Homeowner Plans
  'homeowner_base': {
    masterQR: true,
    assetTracking: true,
    warranties: true,
    aiReminders: true,
    contractorBranding: false,
    jobTracking: false,
    qrStickers: false,
    scanAnalytics: false,
    fleetManagement: false,
    maintenanceForecasting: false,
    usageTracking: false,
    costAnalytics: false,
    complianceAlerts: false,
    propertyManagement: false,
    workerManagement: false,
    taskAssignment: false,
    gpsCheckin: false,
    tenantReports: false,
    visitHistory: false,
    maxAssets: 100,
    maxProperties: 1,
    monthlyQRQuota: 0,
  },
  'home_lifetime': {
    masterQR: true,
    assetTracking: true,
    warranties: true,
    aiReminders: true,
    contractorBranding: false,
    jobTracking: false,
    qrStickers: false,
    scanAnalytics: false,
    fleetManagement: false,
    maintenanceForecasting: false,
    usageTracking: false,
    costAnalytics: false,
    complianceAlerts: false,
    propertyManagement: false,
    workerManagement: false,
    taskAssignment: false,
    gpsCheckin: false,
    tenantReports: false,
    visitHistory: false,
    maxAssets: 100,
    maxProperties: 1,
    monthlyQRQuota: 0,
  },
  'home_annual': {
    masterQR: true,
    assetTracking: true,
    warranties: true,
    aiReminders: true,
    contractorBranding: false,
    jobTracking: false,
    qrStickers: false,
    scanAnalytics: false,
    fleetManagement: false,
    maintenanceForecasting: false,
    usageTracking: false,
    costAnalytics: false,
    complianceAlerts: false,
    propertyManagement: false,
    workerManagement: false,
    taskAssignment: false,
    gpsCheckin: false,
    tenantReports: false,
    visitHistory: false,
    maxAssets: 100,
    maxProperties: 1,
    monthlyQRQuota: 0,
  },
  
  // Contractor Plans
  'contractor_starter': {
    masterQR: false,
    assetTracking: true,
    warranties: false,
    aiReminders: false,
    contractorBranding: true,
    jobTracking: true,
    qrStickers: true,
    scanAnalytics: true,
    fleetManagement: false,
    maintenanceForecasting: false,
    usageTracking: false,
    costAnalytics: false,
    complianceAlerts: false,
    propertyManagement: false,
    workerManagement: false,
    taskAssignment: false,
    gpsCheckin: false,
    tenantReports: false,
    visitHistory: false,
    maxAssets: 500,
    maxProperties: 0,
    monthlyQRQuota: 50,
  },
  'contractor_pro': {
    masterQR: false,
    assetTracking: true,
    warranties: false,
    aiReminders: false,
    contractorBranding: true,
    jobTracking: true,
    qrStickers: true,
    scanAnalytics: true,
    fleetManagement: false,
    maintenanceForecasting: false,
    usageTracking: false,
    costAnalytics: false,
    complianceAlerts: false,
    propertyManagement: false,
    workerManagement: false,
    taskAssignment: false,
    gpsCheckin: false,
    tenantReports: false,
    visitHistory: false,
    maxAssets: 2000,
    maxProperties: 0,
    monthlyQRQuota: 200,
  },
  
  // Fleet Management Plans
  'fleet_base': {
    masterQR: false,
    assetTracking: true,
    warranties: true,
    aiReminders: true,
    contractorBranding: false,
    jobTracking: false,
    qrStickers: false,
    scanAnalytics: false,
    fleetManagement: true,
    maintenanceForecasting: true,
    usageTracking: true,
    costAnalytics: true,
    complianceAlerts: true,
    propertyManagement: false,
    workerManagement: false,
    taskAssignment: false,
    gpsCheckin: false,
    tenantReports: false,
    visitHistory: false,
    maxAssets: 10000,
    maxProperties: 0,
    monthlyQRQuota: 0,
  },
  
  // Property Management Plans
  'property_manager_base': {
    masterQR: false,
    assetTracking: false,
    warranties: false,
    aiReminders: false,
    contractorBranding: false,
    jobTracking: false,
    qrStickers: false,
    scanAnalytics: false,
    fleetManagement: false,
    maintenanceForecasting: false,
    usageTracking: false,
    costAnalytics: false,
    complianceAlerts: false,
    propertyManagement: true,
    workerManagement: true,
    taskAssignment: true,
    gpsCheckin: true,
    tenantReports: true,
    visitHistory: true,
    maxAssets: 0,
    maxProperties: 10000,
    monthlyQRQuota: 0,
  },
};

// Default features for roles without active subscriptions
export const ROLE_DEFAULT_FEATURES: Record<string, PlanFeatures> = {
  HOMEOWNER: PLAN_FEATURES['homeowner_base'],
  CONTRACTOR: PLAN_FEATURES['contractor_starter'],
  FLEET: PLAN_FEATURES['fleet_base'],
  PROPERTY_MANAGER: PLAN_FEATURES['property_manager_base'],
};

export function getPlanFeatures(plan: string | null, role: string = 'HOMEOWNER'): PlanFeatures {
  // If plan exists, use it
  if (plan && PLAN_FEATURES[plan]) {
    return PLAN_FEATURES[plan];
  }
  
  // Fall back to role defaults
  if (role && ROLE_DEFAULT_FEATURES[role]) {
    return ROLE_DEFAULT_FEATURES[role];
  }
  
  // Ultimate fallback - no access
  return {
    masterQR: false,
    assetTracking: false,
    warranties: false,
    aiReminders: false,
    contractorBranding: false,
    jobTracking: false,
    qrStickers: false,
    scanAnalytics: false,
    fleetManagement: false,
    maintenanceForecasting: false,
    usageTracking: false,
    costAnalytics: false,
    complianceAlerts: false,
    propertyManagement: false,
    workerManagement: false,
    taskAssignment: false,
    gpsCheckin: false,
    tenantReports: false,
    visitHistory: false,
    maxAssets: 0,
    maxProperties: 0,
    monthlyQRQuota: 0,
  };
}

export function checkFeatureAccess(features: PlanFeatures, feature: FeatureKey): boolean {
  const value = features[feature];
  
  // Boolean features
  if (typeof value === 'boolean') {
    return value;
  }
  
  // Numeric limits (return true if > 0)
  if (typeof value === 'number') {
    return value > 0;
  }
  
  return false;
}
