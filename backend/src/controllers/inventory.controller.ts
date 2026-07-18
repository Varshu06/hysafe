import { Response } from "express";
import path from "path";
import fs from "fs";
import { InventoryItem } from "../models/InventoryItem.model";
import { AuthRequest } from "../middleware/auth.middleware";

// Helpers for safe parsing
const toNumber = (v: any, fallback?: number) => {
  if (v === undefined || v === null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toBoolean = (v: any, fallback?: boolean) => {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true" || v === "1";
  return Boolean(v);
};

export const getInventoryItems = async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const skip = Math.max(Number(req.query.skip) || 0, 0);

    const items = await InventoryItem.find({})
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      message: "Inventory items retrieved successfully",
      data: items,
      total: await InventoryItem.countDocuments({}),
    });
  } catch (error: any) {
    console.error("Get inventory items error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get inventory items",
    });
  }
};

export const getInventoryItemById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const item = await InventoryItem.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    res.json({
      success: true,
      message: "Inventory item retrieved successfully",
      data: item,
    });
  } catch (error: any) {
    console.error("Get inventory item error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get inventory item",
    });
  }
};

export const createInventoryItem = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, quantity, price, image, available } = req.body;

    if (!name || quantity === undefined || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, quantity and price are required",
      });
    }

    const file = (req as any).file as Express.Multer.File | undefined;

    const item = await InventoryItem.create({
      name: String(name).trim(),
      description:
        description !== undefined ? String(description).trim() : undefined,
      quantity: toNumber(quantity, 0)!,
      price: toNumber(price, 0)!,
      image: file
        ? `uploads/inventory/${file.filename}`
        : image !== undefined && image !== null
          ? String(image).trim()
          : undefined,
      available: toBoolean(available, true),
    });

    res.status(201).json({
      success: true,
      message: "Inventory item created successfully",
      data: item,
    });
  } catch (error: any) {
    console.error("Create inventory item error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create inventory item",
    });
  }
};

export const updateInventoryItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, quantity, price, image, available } = req.body;

    const updateData: Record<string, unknown> = {};

    const file = (req as any).file as Express.Multer.File | undefined;

    if (name !== undefined) updateData.name = String(name).trim();
    if (description !== undefined)
      updateData.description =
        description !== null ? String(description).trim() : undefined;
    if (quantity !== undefined) updateData.quantity = toNumber(quantity, 0)!;
    if (price !== undefined) updateData.price = toNumber(price, 0)!;
    if (image !== undefined)
      updateData.image = image !== null ? String(image).trim() : undefined;
    if (available !== undefined)
      updateData.available = toBoolean(available, false);

    if (file) {
      // remove previous image file if present
      try {
        const existing = await InventoryItem.findById(id).select("image");
        if (existing && existing.image) {
          const existingPath = path.join(
            __dirname,
            "../../",
            existing.image as string,
          );
          if (fs.existsSync(existingPath)) fs.unlinkSync(existingPath);
        }
      } catch (e) {
        console.warn("Failed to remove previous image:", e);
      }
      updateData.image = `uploads/inventory/${file.filename}`;
    }

    const item = await InventoryItem.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    res.json({
      success: true,
      message: "Inventory item updated successfully",
      data: item,
    });
  } catch (error: any) {
    console.error("Update inventory item error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update inventory item",
    });
  }
};

export const deleteInventoryItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Find item first so we can remove associated image file
    const item = await InventoryItem.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    if (item.image) {
      try {
        const imagePath = path.join(__dirname, "../../", item.image as string);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      } catch (e) {
        console.warn("Failed to remove image during delete:", e);
      }
    }

    await InventoryItem.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Inventory item deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete inventory item error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete inventory item",
    });
  }
};

export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      InventoryItem.find().sort({ _id: 1 }).skip(skip).limit(limit),
      InventoryItem.countDocuments(),
    ]);

    const formattedProducts = products.map((product: any) => ({
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      quantity: product.quantity,
      price: product.price,
      image: product.image,
      available: product.available,
    }));

    res.json({
      success: true,
      message: "Products retrieved successfully",
      data: formattedProducts,
      page,
      limit,
      total,
      hasNext: skip + products.length < total,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get inventory items",
    });
  }
};
