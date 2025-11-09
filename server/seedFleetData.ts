import { db } from "./db";
import { fleetIndustries, fleetAssetCategories } from "@shared/schema";
import { eq } from "drizzle-orm";

interface IndustryTemplate {
  name: string;
  description: string;
  icon: string;
  categories: {
    name: string;
    description: string;
    maintenanceIntervalDays: number;
  }[];
}

const industryTemplates: IndustryTemplate[] = [
  {
    name: "Healthcare & Hospitals",
    description: "Medical equipment, mobility aids, patient care assets",
    icon: "hospital",
    categories: [
      {
        name: "Medical Equipment",
        description: "Diagnostic machines, monitors, ventilators",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Patient Mobility",
        description: "Wheelchairs, beds, lifts, transport equipment",
        maintenanceIntervalDays: 30,
      },
      {
        name: "HVAC & Sterilization",
        description: "Air systems, autoclaves, sanitization equipment",
        maintenanceIntervalDays: 30,
      },
      {
        name: "Emergency Equipment",
        description: "Defibrillators, oxygen systems, backup power",
        maintenanceIntervalDays: 30,
      },
    ],
  },
  {
    name: "Construction & Heavy Equipment",
    description: "Construction vehicles, tools, heavy machinery",
    icon: "construction",
    categories: [
      {
        name: "Excavators & Loaders",
        description: "Excavators, backhoes, front loaders, bulldozers",
        maintenanceIntervalDays: 60,
      },
      {
        name: "Trucks & Transport",
        description: "Dump trucks, flatbeds, delivery vehicles",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Power Tools",
        description: "Drills, saws, jackhammers, generators",
        maintenanceIntervalDays: 180,
      },
      {
        name: "Cranes & Lifting",
        description: "Tower cranes, mobile cranes, hoists, forklifts",
        maintenanceIntervalDays: 30,
      },
    ],
  },
  {
    name: "Equipment Rental & Leasing",
    description: "Rental equipment across multiple categories",
    icon: "rental",
    categories: [
      {
        name: "Power Equipment",
        description: "Generators, compressors, welders, pressure washers",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Landscaping Equipment",
        description: "Mowers, trimmers, aerators, chain saws",
        maintenanceIntervalDays: 60,
      },
      {
        name: "Party & Event Equipment",
        description: "Tents, tables, chairs, staging, sound systems",
        maintenanceIntervalDays: 180,
      },
      {
        name: "Specialty Equipment",
        description: "Scaffolding, lifts, trenchers, concrete equipment",
        maintenanceIntervalDays: 90,
      },
    ],
  },
  {
    name: "Agriculture & Farm Equipment",
    description: "Tractors, harvesters, irrigation systems",
    icon: "farm",
    categories: [
      {
        name: "Tractors & Tillage",
        description: "Tractors, plows, cultivators, planters",
        maintenanceIntervalDays: 60,
      },
      {
        name: "Harvesting Equipment",
        description: "Combines, balers, sprayers, harvesters",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Irrigation Systems",
        description: "Pumps, pivot systems, drip lines, valves",
        maintenanceIntervalDays: 180,
      },
      {
        name: "Livestock Equipment",
        description: "Feeders, waterers, milking systems, gates",
        maintenanceIntervalDays: 90,
      },
    ],
  },
  {
    name: "Transportation & Logistics",
    description: "Fleet vehicles, delivery trucks, cargo equipment",
    icon: "logistics",
    categories: [
      {
        name: "Delivery Vehicles",
        description: "Vans, box trucks, cargo vehicles",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Semi Trucks & Trailers",
        description: "18-wheelers, flatbeds, refrigerated trailers",
        maintenanceIntervalDays: 60,
      },
      {
        name: "Forklifts & Warehouse",
        description: "Forklifts, pallet jacks, conveyor systems",
        maintenanceIntervalDays: 30,
      },
      {
        name: "GPS & Tracking Devices",
        description: "Fleet trackers, dash cams, telematics",
        maintenanceIntervalDays: 365,
      },
    ],
  },
];

export async function seedFleetData() {
  console.log("Seeding fleet industry data...");

  for (const template of industryTemplates) {
    // Check if industry already exists
    const existing = await db
      .select()
      .from(fleetIndustries)
      .where(eq(fleetIndustries.name, template.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  Industry "${template.name}" already exists, skipping`);
      continue;
    }

    // Insert industry
    const [industry] = await db
      .insert(fleetIndustries)
      .values({
        name: template.name,
        description: template.description,
        iconName: template.icon,
        displayOrder: industryTemplates.indexOf(template),
      })
      .returning();

    console.log(`  Created industry: ${industry.name}`);

    // Insert categories for this industry
    for (const category of template.categories) {
      await db.insert(fleetAssetCategories).values({
        industryId: industry.id,
        name: category.name,
        description: category.description,
        maintenanceIntervalDays: category.maintenanceIntervalDays,
      });
      console.log(`    - Created category: ${category.name}`);
    }
  }

  console.log("Fleet data seeding complete!");
}
