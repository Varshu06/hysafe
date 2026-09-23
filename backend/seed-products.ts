import dotenv from "dotenv";
import { connectDatabase } from "./src/config/database";
import { InventoryItem } from "./src/models/InventoryItem.model";

dotenv.config();

const seedProducts = async () => {
  try {
    await connectDatabase();

    const products = [
      {
        name: "20L Water Can",
        volume: "20L",
        quantity: 100,
        price: 30,
        deliveryCharge: 0,
        available: true,
      },
      {
        name: "2L Bottle",
        volume: "2L",
        quantity: 100,
        price: 25,
        deliveryCharge: 0,
        available: true,
      },
      {
        name: "1L Bottle",
        volume: "1L",
        quantity: 100,
        price: 20,
        deliveryCharge: 0,
        available: true,
      },
      {
        name: "500ml Bottle",
        volume: "500ml",
        quantity: 100,
        price: 15,
        deliveryCharge: 0,
        available: true,
      },
      {
        name: "300ml Bottle",
        volume: "300ml",
        quantity: 100,
        price: 10,
        deliveryCharge: 0,
        available: true,
      },
      {
        name: "250ml Bottle",
        volume: "250ml",
        quantity: 100,
        price: 8,
        deliveryCharge: 0,
        available: true,
      },
    ];

    for (const product of products) {
      const existing = await InventoryItem.findOne({
        volume: product.volume,
      });

      if (existing) {
        existing.name = product.name;
        existing.price = product.price;
        existing.quantity = product.quantity;
        existing.deliveryCharge = product.deliveryCharge;
        existing.available = product.available;

        await existing.save();

        console.log(`✅ Updated ${product.name}`);
      } else {
        await InventoryItem.create(product);

        console.log(`✅ Created ${product.name}`);
      }
    }

    console.log("🎉 Products seeded successfully");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding products:", error);
    process.exit(1);
  }
};

seedProducts();