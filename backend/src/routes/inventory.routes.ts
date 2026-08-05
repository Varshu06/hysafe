import { Router } from "express";
import {
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItemById,
  getInventoryItems,
  getProducts,
  updateInventoryItem,
  getLowStockItems,
  getInventorySummary,
  restockInventory,
} from "../controllers/inventory.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validateObjectId } from "../middleware/objectId.middleware";

const router = Router();

router.param("id", validateObjectId);

router.get("/products", authenticate, requireRole("customer"), getProducts);
router.get("/low-stock", authenticate, requireRole("admin"), getLowStockItems);
router.get(
  "/summary",
  authenticate,
  requireRole("admin"),
  getInventorySummary
);

router.post(
  "/restock",
  authenticate,
  requireRole("admin"),
  restockInventory
);
router.get("/", authenticate, requireRole("admin"), getInventoryItems);
router.get("/:id", authenticate, requireRole("admin"), getInventoryItemById);
router.post("/", authenticate, requireRole("admin"), createInventoryItem);
router.put("/:id", authenticate, requireRole("admin"), updateInventoryItem);
router.delete("/:id", authenticate, requireRole("admin"), deleteInventoryItem);

export default router;
