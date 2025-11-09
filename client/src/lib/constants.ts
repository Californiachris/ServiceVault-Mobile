import { 
  Wrench, Home, Zap, Droplet, Wind, Car, Hammer, 
  Trees, Shield, Waves, Sun, Lock, Camera, Lightbulb,
  Receipt, FileText, Shield as ShieldIcon, BookOpen, 
  Clipboard, DollarSign, FileSignature, Briefcase, 
  Building, Scale, Award, AlertCircle, Bell, Calendar,
  RefreshCw, Clock, Flag
} from "lucide-react";

// ===== ASSET CATEGORIES =====
// Comprehensive list covering residential, commercial, and fleet scenarios
export const ASSET_CATEGORIES = [
  // Home Systems
  { value: 'HVAC', label: 'HVAC System', icon: Wind, group: 'Systems' },
  { value: 'ELECTRICAL', label: 'Electrical', icon: Zap, group: 'Systems' },
  { value: 'PLUMBING', label: 'Plumbing', icon: Droplet, group: 'Systems' },
  { value: 'SECURITY_SYSTEM', label: 'Security System', icon: Lock, group: 'Systems' },
  { value: 'SOLAR_PANELS', label: 'Solar Panels', icon: Sun, group: 'Systems' },
  
  // Structural
  { value: 'STRUCTURAL', label: 'Structural', icon: Building, group: 'Structural' },
  { value: 'ROOFING', label: 'Roofing', icon: Home, group: 'Structural' },
  { value: 'FOUNDATION', label: 'Foundation', icon: Hammer, group: 'Structural' },
  { value: 'WINDOWS_DOORS', label: 'Windows & Doors', icon: Home, group: 'Structural' },
  
  // Appliances
  { value: 'APPLIANCE', label: 'Appliance', icon: Wrench, group: 'Appliances' },
  { value: 'WATER_HEATER', label: 'Water Heater', icon: Droplet, group: 'Appliances' },
  { value: 'WASHER_DRYER', label: 'Washer/Dryer', icon: Wrench, group: 'Appliances' },
  
  // Outdoor & Recreation
  { value: 'POOL_SPA', label: 'Pool/Spa', icon: Waves, group: 'Outdoor' },
  { value: 'IRRIGATION', label: 'Irrigation System', icon: Droplet, group: 'Outdoor' },
  { value: 'LANDSCAPING', label: 'Landscaping', icon: Trees, group: 'Outdoor' },
  { value: 'OUTDOOR_LIGHTING', label: 'Outdoor Lighting', icon: Lightbulb, group: 'Outdoor' },
  
  // Fleet & Vehicles
  { value: 'VEHICLE', label: 'Vehicle', icon: Car, group: 'Fleet' },
  { value: 'HEAVY_EQUIPMENT', label: 'Heavy Equipment', icon: Hammer, group: 'Fleet' },
  
  // Furniture & Misc
  { value: 'FURNITURE', label: 'Furniture', icon: Home, group: 'Other' },
  { value: 'SURVEILLANCE', label: 'Surveillance Equipment', icon: Camera, group: 'Other' },
  { value: 'OTHER', label: 'Other', icon: AlertCircle, group: 'Other' },
];

// ===== DOCUMENT TYPES =====
// Comprehensive document categories for complete property documentation
export const DOCUMENT_TYPES = [
  // Warranties & Protection
  { value: 'WARRANTY', label: 'Warranty', icon: ShieldIcon, group: 'Protection' },
  { value: 'INSURANCE', label: 'Insurance Policy', icon: Shield, group: 'Protection' },
  { value: 'GUARANTEE', label: 'Guarantee', icon: Award, group: 'Protection' },
  
  // Financial
  { value: 'RECEIPT', label: 'Receipt', icon: Receipt, group: 'Financial' },
  { value: 'INVOICE', label: 'Invoice', icon: DollarSign, group: 'Financial' },
  { value: 'QUOTE', label: 'Quote/Estimate', icon: DollarSign, group: 'Financial' },
  { value: 'CONTRACT', label: 'Contract', icon: FileSignature, group: 'Financial' },
  
  // Compliance & Legal
  { value: 'PERMIT', label: 'Permit', icon: Scale, group: 'Compliance' },
  { value: 'CERTIFICATION', label: 'Certification', icon: Award, group: 'Compliance' },
  { value: 'INSPECTION_REPORT', label: 'Inspection Report', icon: Clipboard, group: 'Compliance' },
  { value: 'APPRAISAL', label: 'Appraisal', icon: Briefcase, group: 'Compliance' },
  
  // Technical
  { value: 'MANUAL', label: 'Manual/Guide', icon: BookOpen, group: 'Technical' },
  { value: 'SPECIFICATIONS', label: 'Specifications', icon: FileText, group: 'Technical' },
  
  { value: 'OTHER', label: 'Other Document', icon: FileText, group: 'Other' },
];

// ===== INSPECTION CHECKLIST =====
// Comprehensive home inspection categories
export const INSPECTION_CHECKLIST = [
  // Critical Systems
  { key: 'electrical', label: 'Electrical Systems', description: 'Panel, outlets, GFCI, grounding, wiring', section: 'Critical Systems' },
  { key: 'plumbing', label: 'Plumbing Systems', description: 'Water pressure, leaks, drainage, fixtures', section: 'Critical Systems' },
  { key: 'hvac', label: 'HVAC Systems', description: 'Heating, cooling, ventilation, air quality', section: 'Critical Systems' },
  
  // Structural Integrity
  { key: 'foundation', label: 'Foundation', description: 'Cracks, settling, moisture, grading', section: 'Structural' },
  { key: 'structural', label: 'Structural Elements', description: 'Framing, load-bearing walls, floor joists', section: 'Structural' },
  { key: 'roofing', label: 'Roofing System', description: 'Shingles, flashing, gutters, ventilation', section: 'Structural' },
  { key: 'windows', label: 'Windows & Doors', description: 'Operation, sealing, security, weather-stripping', section: 'Structural' },
  
  // Safety & Environmental
  { key: 'safety', label: 'Safety Features', description: 'Smoke detectors, CO detectors, fire exits', section: 'Safety' },
  { key: 'moisture', label: 'Moisture & Mold', description: 'Water intrusion, humidity, mold presence', section: 'Safety' },
  { key: 'pest', label: 'Pest Inspection', description: 'Termites, rodents, insects, wood rot', section: 'Safety' },
  
  // Energy & Efficiency
  { key: 'insulation', label: 'Insulation & Weatherization', description: 'Attic, walls, air sealing, efficiency', section: 'Energy' },
  
  // Exterior
  { key: 'exterior', label: 'Exterior Conditions', description: 'Siding, paint, landscaping drainage', section: 'Exterior' },
];

// ===== REMINDER TYPES =====
// Comprehensive reminder categories for proactive maintenance
export const REMINDER_TYPES = [
  { value: 'WARRANTY_EXPIRATION', label: 'Warranty Expiration', icon: AlertCircle, priority: 'high', color: 'red' },
  { value: 'MAINTENANCE_DUE', label: 'Scheduled Maintenance', icon: Wrench, priority: 'medium', color: 'orange' },
  { value: 'INSPECTION_REQUIRED', label: 'Inspection Required', icon: Clipboard, priority: 'high', color: 'red' },
  { value: 'SERVICE_INTERVAL', label: 'Service Interval', icon: RefreshCw, priority: 'low', color: 'blue' },
  { value: 'PERMIT_RENEWAL', label: 'Permit Renewal', icon: Scale, priority: 'medium', color: 'yellow' },
  { value: 'INSURANCE_RENEWAL', label: 'Insurance Renewal', icon: Shield, priority: 'high', color: 'red' },
  { value: 'SEASONAL_MAINTENANCE', label: 'Seasonal Maintenance', icon: Calendar, priority: 'low', color: 'green' },
  { value: 'CONTRACT_EXPIRATION', label: 'Contract Expiration', icon: FileSignature, priority: 'medium', color: 'orange' },
];

// ===== EVENT TYPES =====
// Asset event history types
export const EVENT_TYPES = [
  { value: 'INSTALL', label: 'Installation', icon: Hammer },
  { value: 'SERVICE', label: 'Service', icon: Wrench },
  { value: 'REPAIR', label: 'Repair', icon: Wrench },
  { value: 'INSPECTION', label: 'Inspection', icon: Clipboard },
  { value: 'WARRANTY', label: 'Warranty Event', icon: Shield },
  { value: 'RECALL', label: 'Recall Notice', icon: AlertCircle },
  { value: 'NOTE', label: 'Note', icon: FileText },
];

// ===== INSPECTION RESULTS =====
export const INSPECTION_RESULTS = [
  { value: 'PASS', label: 'Pass', color: 'green' },
  { value: 'FAIL', label: 'Fail', color: 'red' },
  { value: 'NOTES', label: 'Pass with Notes', color: 'yellow' },
];

// ===== ASSET STATUS =====
export const ASSET_STATUS = [
  { value: 'ACTIVE', label: 'Active', color: 'green' },
  { value: 'INACTIVE', label: 'Inactive', color: 'gray' },
  { value: 'MAINTENANCE', label: 'Under Maintenance', color: 'orange' },
  { value: 'RETIRED', label: 'Retired', color: 'red' },
];

// Helper functions to get grouped options for selects
export const getGroupedAssetCategories = () => {
  const groups = ASSET_CATEGORIES.reduce((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, typeof ASSET_CATEGORIES>);
  return groups;
};

export const getGroupedDocumentTypes = () => {
  const groups = DOCUMENT_TYPES.reduce((acc, doc) => {
    if (!acc[doc.group]) acc[doc.group] = [];
    acc[doc.group].push(doc);
    return acc;
  }, {} as Record<string, typeof DOCUMENT_TYPES>);
  return groups;
};

export const getGroupedInspectionChecklist = () => {
  const groups = INSPECTION_CHECKLIST.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, typeof INSPECTION_CHECKLIST>);
  return groups;
};
