import dotenv from "dotenv";
import { connectDatabase } from "./src/config/database";
import { InventoryItem } from "./src/models/InventoryItem.model";

dotenv.config();

async function seedInventory() {
  try {
    await connectDatabase();

    const seedData = [
      {
        name: "20L Water Can",
        price: 30,
        deliveryCharge: 0,
        quantity: 50,
        available: true,
        image: "uploads/inventory/20l.png",
      },
      {
        name: "2L Bottle",
        price: 25,
        deliveryCharge: 0,
        quantity: 100,
        available: true,
        image: "uploads/inventory/2l.png",
      },
      {
        name: "1L Bottle",
        price: 20,
        deliveryCharge: 0,
        quantity: 150,
        available: true,
        image: "uploads/inventory/1l.png",
      },
      {
        name: "500ml Bottle",
        price: 15,
        deliveryCharge: 0,
        quantity: 200,
        available: true,
        image: "uploads/inventory/500ml.png",
      },
      {
        name: "300ml Bottle",
        price: 10,
        deliveryCharge: 0,
        quantity: 250,
        available: true,
        image: "uploads/inventory/300ml.png",
      },
      {
        name: "250ml Bottle",
        price: 8,
        deliveryCharge: 0,
        quantity: 300,
        available: true,
        image: "uploads/inventory/250.png",
      },
    ];

    // Clear existing data
    // await InventoryItem.deleteMany({});

    const count = await InventoryItem.countDocuments();

    if (count > 0) {
      console.log("Inventory already seeded");
      process.exit(0);
    }

    await InventoryItem.insertMany(seedData);

    console.log("Inventory seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seedInventory();
