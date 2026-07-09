import { Response } from "express";
import { InventoryItem } from "../models/InventoryItem.model";
import { AuthRequest } from "../middleware/auth.middleware";

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
    const { name, quantity, unit, minStock, price, lastRestocked } = req.body;

    if (!name || quantity === undefined || minStock === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, quantity and minStock are required",
      });
    }

    const item = await InventoryItem.create({
      name: String(name).trim(),
      quantity: Number(quantity),
      unit: unit ? String(unit).trim() : "pcs",
      minStock: Number(minStock),
      price: price !== undefined ? Number(price) : 0,
      lastRestocked: lastRestocked ? new Date(lastRestocked) : new Date(),
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
    const { name, quantity, unit, minStock, price, lastRestocked } = req.body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = String(name).trim();
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    if (unit !== undefined) updateData.unit = String(unit).trim();
    if (minStock !== undefined) updateData.minStock = Number(minStock);
    if (price !== undefined) updateData.price = Number(price);
    if (lastRestocked !== undefined) {
      updateData.lastRestocked = lastRestocked ? new Date(lastRestocked) : null;
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

    const item = await InventoryItem.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

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
      volume: product.volume,
      quantity: product.quantity,
      price: product.price,
      deliveryCharge: product.deliveryCharge,
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
