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
        volume: "20L",
        price: 30,
        deliveryCharge: 0,
        quantity: 50,
        available: true,
        image: "20l",
      },
      {
        name: "2L Bottle",
        volume: "2L",
        price: 25,
        deliveryCharge: 0,
        quantity: 100,
        available: true,
        image: "2l",
      },
      {
        name: "1L Bottle",
        volume: "1L",
        price: 20,
        deliveryCharge: 0,
        quantity: 150,
        available: true,
        image: "1l",
      },
      {
        name: "500ml Bottle",
        volume: "500ml",
        price: 15,
        deliveryCharge: 0,
        quantity: 200,
        available: true,
        image: "500ml",
      },
      {
        name: "300ml Bottle",
        volume: "300ml",
        price: 10,
        deliveryCharge: 0,
        quantity: 250,
        available: true,
        image: "300ml",
      },
      {
        name: "250ml Bottle",
        volume: "250ml",
        price: 8,
        deliveryCharge: 0,
        quantity: 300,
        available: true,
        image: "250ml",
      },
    ];

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
