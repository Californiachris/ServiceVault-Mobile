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
        name: "Medical Monitors & Diagnostics",
        description: "Vital sign monitors, ECG, pulse oximeters, diagnostic equipment",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Hospital Beds & Patient Furniture",
        description: "Electric hospital beds, exam tables, chairs, patient lifts",
        maintenanceIntervalDays: 60,
      },
      {
        name: "Ambulances & Emergency Vehicles",
        description: "Ambulances, paramedic vans, mobile medical units",
        maintenanceIntervalDays: 30,
      },
      {
        name: "Medical Devices & Equipment",
        description: "Ventilators, infusion pumps, dialysis machines, imaging equipment",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Lab Equipment & Instruments",
        description: "Centrifuges, microscopes, analyzers, testing equipment",
        maintenanceIntervalDays: 120,
      },
      {
        name: "Sterilization & HVAC",
        description: "Autoclaves, air systems, sanitization equipment",
        maintenanceIntervalDays: 30,
      },
      {
        name: "Emergency & Backup Systems",
        description: "Defibrillators, oxygen systems, backup generators, emergency power",
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
        name: "Excavators & Earthmoving",
        description: "Excavators, backhoes, bulldozers, graders, scrapers",
        maintenanceIntervalDays: 60,
      },
      {
        name: "Loaders & Material Handling",
        description: "Front loaders, skid steers, wheel loaders, track loaders",
        maintenanceIntervalDays: 60,
      },
      {
        name: "Trucks & Transport Vehicles",
        description: "Dump trucks, flatbeds, delivery vehicles, water trucks",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Power Tools & Hand Tools",
        description: "Drills, saws, jackhammers, nail guns, grinders, sanders",
        maintenanceIntervalDays: 180,
      },
      {
        name: "Cranes & Lifting Equipment",
        description: "Tower cranes, mobile cranes, hoists, forklifts, cherry pickers",
        maintenanceIntervalDays: 30,
      },
      {
        name: "Safety Equipment & PPE",
        description: "Harnesses, helmets, barriers, safety gear, first aid stations",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Scaffolding & Access Equipment",
        description: "Scaffolding, ladders, aerial lifts, work platforms",
        maintenanceIntervalDays: 60,
      },
      {
        name: "Compressors & Generators",
        description: "Air compressors, portable generators, welding equipment",
        maintenanceIntervalDays: 90,
      },
    ],
  },
  {
    name: "Equipment Rental & Leasing",
    description: "Rental equipment across multiple categories",
    icon: "rental",
    categories: [
      {
        name: "Generators & Power Equipment",
        description: "Portable generators, power distribution, battery systems",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Aerial Lifts & Scissor Lifts",
        description: "Boom lifts, scissor lifts, vertical mast lifts, work platforms",
        maintenanceIntervalDays: 30,
      },
      {
        name: "Compressors & Pneumatic Tools",
        description: "Air compressors, jackhammers, nail guns, spray equipment",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Scaffolding & Ladders",
        description: "Frame scaffolding, rolling towers, extension ladders, step ladders",
        maintenanceIntervalDays: 60,
      },
      {
        name: "Concrete & Masonry Equipment",
        description: "Concrete mixers, saws, trowels, vibrators, pumps",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Landscaping & Outdoor Equipment",
        description: "Mowers, trimmers, aerators, chain saws, stump grinders",
        maintenanceIntervalDays: 60,
      },
      {
        name: "Party & Event Equipment",
        description: "Tents, tables, chairs, staging, sound systems, lighting",
        maintenanceIntervalDays: 180,
      },
      {
        name: "Lighting & Climate Control",
        description: "Light towers, heaters, fans, dehumidifiers, air scrubbers",
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
        name: "Tractors & Tillage Equipment",
        description: "Tractors, plows, cultivators, planters, disc harrows",
        maintenanceIntervalDays: 60,
      },
      {
        name: "Combines & Harvesting Equipment",
        description: "Combine harvesters, grain headers, corn pickers, cotton pickers",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Balers & Hay Equipment",
        description: "Round balers, square balers, tedders, rakes, mowers",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Sprayers & Application Equipment",
        description: "Boom sprayers, fertilizer spreaders, applicators",
        maintenanceIntervalDays: 60,
      },
      {
        name: "Irrigation Systems & Pumps",
        description: "Center pivot systems, drip irrigation, pumps, valves, filters",
        maintenanceIntervalDays: 180,
      },
      {
        name: "Livestock Equipment",
        description: "Feeders, waterers, milking systems, gates, handling equipment",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Grain Storage & Handling",
        description: "Silos, grain bins, augers, conveyors, dryers",
        maintenanceIntervalDays: 120,
      },
      {
        name: "Farm Vehicles & Utility",
        description: "ATVs, UTVs, farm trucks, trailers, implements",
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
        name: "Delivery Vans & Box Trucks",
        description: "Cargo vans, box trucks, sprinter vans, step vans",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Semi Trucks & Tractors",
        description: "18-wheelers, day cabs, sleeper cabs, truck tractors",
        maintenanceIntervalDays: 60,
      },
      {
        name: "Trailers & Cargo Equipment",
        description: "Dry vans, flatbeds, refrigerated trailers, tankers, lowboys",
        maintenanceIntervalDays: 90,
      },
      {
        name: "Forklifts & Material Handling",
        description: "Forklifts, pallet jacks, reach trucks, order pickers",
        maintenanceIntervalDays: 30,
      },
      {
        name: "Warehouse Equipment",
        description: "Conveyor systems, dock equipment, loading ramps, pallet racks",
        maintenanceIntervalDays: 60,
      },
      {
        name: "GPS & Fleet Tracking",
        description: "Fleet trackers, dash cams, telematics, ELD devices",
        maintenanceIntervalDays: 365,
      },
      {
        name: "Refrigeration & Temperature Control",
        description: "Reefer units, temperature monitors, climate control systems",
        maintenanceIntervalDays: 60,
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

    let industry;
    if (existing.length > 0) {
      console.log(`  Industry "${template.name}" already exists, updating categories...`);
      industry = existing[0];
      
      // Delete existing categories and re-insert with expanded list
      await db
        .delete(fleetAssetCategories)
        .where(eq(fleetAssetCategories.industryId, industry.id));
    } else {
      // Insert new industry
      [industry] = await db
        .insert(fleetIndustries)
        .values({
          name: template.name,
          description: template.description,
          iconName: template.icon,
          displayOrder: industryTemplates.indexOf(template),
        })
        .returning();

      console.log(`  Created industry: ${industry.name}`);
    }

    // Insert categories for this industry (either new or refreshed)
    for (const category of template.categories) {
      await db.insert(fleetAssetCategories).values({
        industryId: industry.id,
        name: category.name,
        description: category.description,
        maintenanceIntervalDays: category.maintenanceIntervalDays,
      });
      console.log(`    - Added category: ${category.name}`);
    }
  }

  console.log("Fleet data seeding complete!");
}
