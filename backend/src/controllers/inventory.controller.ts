import { Response } from "express";
import { InventoryItem } from "../models/InventoryItem.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { Inventory } from "../models/Inventory.model";

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
    const {
      name,
      volume,
      quantity,
      minStock,
      price,
      deliveryCharge,
      available,
    } = req.body;

    if (!name || !volume || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, volume and quantity are required",
      });
    }

    const item = await InventoryItem.create({
      name: String(name).trim(),
      volume: String(volume).trim(),
      quantity: Number(quantity),
      minStock: Number(minStock ?? 10),
      lastRestocked: new Date(),

      price: Number(price),
      deliveryCharge: Number(deliveryCharge || 0),
      available: Number(quantity) > 0,
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
    const {
      name,
      volume,
      quantity,
      minStock,
      lastRestocked,
      price,
      deliveryCharge,
    } = req.body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = String(name).trim();
    if (quantity !== undefined) {
      updateData.quantity = Number(quantity);
      updateData.available = Number(quantity) > 0;
    }
    if (minStock !== undefined)
      updateData.minStock = Number(minStock);

    if (lastRestocked !== undefined)
      updateData.lastRestocked = new Date(lastRestocked);
    if (volume !== undefined)
      updateData.volume = String(volume).trim();
    if (price !== undefined)
      updateData.price = Number(price);
    if (deliveryCharge !== undefined)
      updateData.deliveryCharge = Number(deliveryCharge);

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
      minStock: product.minStock,
      lastRestocked: product.lastRestocked,
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
export const getLowStockItems = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const items = await InventoryItem.find({
      $expr: {
        $lte: ["$quantity", "$minStock"],
      },
    })
      .sort({ quantity: 1 })
      .limit(5);

    res.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error("Low stock error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch low stock items",
    });
  }
};
export const getInventorySummary = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    let inventory = await Inventory.findOne();

    if (!inventory) {
      inventory = await Inventory.create({
        totalStock: 0,
        availableStock: 0,
        reservedStock: 0,
        deliveredStock: 0,
        lowStockThreshold: 50,
      });
    }

    res.json({
      success: true,
      data: inventory,
    });
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory summary",
    });
  }
};
export const restockInventory = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    let inventory = await Inventory.findOne();

    if (!inventory) {
      inventory = await Inventory.create({
        totalStock: 0,
        availableStock: 0,
        reservedStock: 0,
        deliveredStock: 0,
        lowStockThreshold: 50,
      });
    }

    inventory.totalStock += Number(quantity);
    inventory.availableStock += Number(quantity);
    inventory.lastUpdated = new Date();

    await inventory.save();

    res.json({
      success: true,
      message: "Inventory restocked successfully",
      data: inventory,
    });
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to restock inventory",
    });
  }
};