import { Router } from "express";
import {
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItemById,
  getInventoryItems,
  getProducts,
  updateInventoryItem,
} from "../controllers/inventory.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get("/products", authenticate, requireRole("customer"), getProducts);
router.get("/", authenticate, requireRole("admin"), getInventoryItems);
router.get("/:id", authenticate, requireRole("admin"), getInventoryItemById);
router.post("/", authenticate, requireRole("admin"), createInventoryItem);
router.put("/:id", authenticate, requireRole("admin"), updateInventoryItem);
router.delete("/:id", authenticate, requireRole("admin"), deleteInventoryItem);

export default router;
