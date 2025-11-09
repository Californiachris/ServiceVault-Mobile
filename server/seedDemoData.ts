import { db } from "./db";
import { properties, assets, events, jobs, reminders, identifiers, contractors } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedDemoData(userId: string) {
  console.log(`Seeding demo data for user ${userId}...`);

  try {
    const existing = await db.select().from(properties).where(eq(properties.ownerId, userId)).limit(1);
    if (existing.length > 0) {
      console.log("Demo data already exists, skipping seed");
      return;
    }

    const [property] = await db.insert(properties).values({
      ownerId: userId,
      name: "Main Street Home",
      addressLine1: "123 Main Street",
      city: "San Francisco",
      state: "CA",
      postalCode: "94102",
      country: "USA",
    }).returning();

    const assetRows = await db.insert(assets).values([
      {
        propertyId: property.id,
        name: "HVAC System",
        category: "HVAC",
        brand: "Carrier",
        model: "Infinity 21",
        serial: "SN-12345",
        installedAt: new Date("2022-06-15"),
      },
      {
        propertyId: property.id,
        name: "Roof",
        category: "ROOFING",
        brand: "CertainTeed",
        model: "Landmark Pro",
        installedAt: new Date("2021-08-20"),
      },
      {
        propertyId: property.id,
        name: "Water Heater",
        category: "PLUMBING",
        brand: "Rheem",
        model: "Performance Platinum",
        serial: "WH-67890",
        installedAt: new Date("2023-03-10"),
      },
    ]).returning();

    for (const asset of assetRows) {
      await db.insert(events).values({
        assetId: asset.id,
        type: "INSTALL",
        data: { description: `Installed ${asset.name}` },
        createdBy: userId,
      });
    }

    await db.insert(reminders).values([
      {
        assetId: assetRows[0].id,
        type: "MAINTENANCE",
        title: "HVAC Filter Replacement",
        description: "Change air filters for optimal performance",
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "PENDING",
        createdBy: userId,
      },
      {
        assetId: assetRows[2].id,
        type: "MAINTENANCE",
        title: "Water Heater Inspection",
        description: "Annual maintenance check",
        dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "PENDING",
        createdBy: userId,
      },
    ]);

    const [contractor] = await db.insert(contractors).values({
      userId,
      companyName: "Pro Fix Contractors",
      licenseNumber: "LIC-123456",
      phone: "+14155551234",
      addressLine1: "456 Business Ave",
      city: "San Francisco",
      state: "CA",
      postalCode: "94103",
    }).returning();

    await db.insert(jobs).values([
      {
        contractorId: contractor.id,
        title: "Kitchen Renovation",
        clientName: "John Smith",
        clientEmail: "john.smith@example.com",
        propertyAddress: "789 Oak Street, SF",
        description: "Kitchen renovation",
        status: "SCHEDULED",
        revenue: "15000.00",
      },
      {
        contractorId: contractor.id,
        title: "Bathroom Remodel",
        clientName: "Jane Doe",
        clientEmail: "jane.doe@example.com",
        propertyAddress: "321 Pine Street, SF",
        description: "Bathroom remodel",
        status: "COMPLETED",
        revenue: "8500.00",
        completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        contractorId: contractor.id,
        title: "HVAC Installation",
        clientName: "Bob Johnson",
        clientEmail: "bob.j@example.com",
        propertyAddress: "555 Elm Street, SF",
        description: "HVAC installation",
        status: "PENDING",
      },
    ]);

    console.log("Demo data seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding demo data:", error);
  }
}
