import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import prisma from "@/lib/prisma";
import { executeProductionBatch } from "@/lib/productionService";
import { getProductRollingWACPaise } from "@/lib/costService";

export type BOMStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface BOMItem {
  componentProductId: string;
  quantity: number; // Required quantity per 1 parent unit
  quantityScale?: number; // Scaling factor (default 1)
  unit?: string; // e.g. "pcs", "set", "nos"
  notes?: string | null;
}

export interface BOMRecord {
  id: string;
  parentProductId: string;
  version: number;
  status: BOMStatus;
  notes?: string | null;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  items: BOMItem[];
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComponentRequirementSummary {
  componentProductId: string;
  productName: string;
  sku: string | null;
  unit: string;
  requiredPerUnit: number;
  totalRequiredQty: number;
  availableQty: number;
  shortageQty: number;
  unitCostPaise: number;
  totalCostPaise: number;
}

export interface BOMRequirementCalculation {
  bomId: string;
  version: number;
  parentProductId: string;
  parentProductName: string;
  parentProductSku: string | null;
  buildQuantity: number;
  canBuild: boolean;
  totalShortageCount: number;
  estimatedMaterialCostPaise: number;
  components: ComponentRequirementSummary[];
}

export interface CreateBOMInput {
  parentProductId: string;
  items: BOMItem[];
  notes?: string;
  status?: BOMStatus;
  userId?: string;
}

export interface ExecuteBOMAssemblyInput {
  bomId: string;
  buildQuantity: number;
  directCost?: number;
  notes?: string;
  userId?: string;
  idempotencyKey?: string;
}

const BOM_COLLECTION = "BOM";

/**
 * Checks for circular dependency in BOM hierarchy using Depth-First Search (DFS).
 * Throws a clear Error if a cycle is detected.
 */
export async function detectCircularDependency(
  parentProductId: string,
  candidateItems: BOMItem[],
  excludeBomId?: string
): Promise<void> {
  // 1. Trivial self-dependency check
  for (const item of candidateItems) {
    if (item.componentProductId === parentProductId) {
      throw new Error(
        `Circular dependency detected: Parent product cannot be its own component.`
      );
    }
  }

  const db = await getMongoDb();

  // 2. Fetch all other ACTIVE BOMs to build the dependency graph
  const activeBoms = await db
    .collection(BOM_COLLECTION)
    .find({
      status: "ACTIVE",
      ...(excludeBomId ? { _id: { $ne: new ObjectId(excludeBomId) } } : {}),
    })
    .toArray();

  // Build adjacency list: ProductId -> ComponentProductIds[]
  const graph = new Map<string, string[]>();

  for (const bom of activeBoms) {
    const parentId = bom.parentProductId?.toString();
    const compIds = (bom.items || []).map((it: any) => it.componentProductId?.toString());
    graph.set(parentId, compIds);
  }

  // Inject candidate BOM edges for the parent product
  graph.set(
    parentProductId,
    candidateItems.map((it) => it.componentProductId.toString())
  );

  // 3. Run DFS cycle detection starting from parentProductId
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cyclePath: string[] = [];

  // Fetch product names for readable error messages
  const allProductIds = new Set<string>();
  graph.forEach((compIds, pId) => {
    allProductIds.add(pId);
    compIds.forEach((cId) => allProductIds.add(cId));
  });

  const products = await prisma.product.findMany({
    where: { id: { in: Array.from(allProductIds) } },
    select: { id: true, name: true, sku: true },
  });
  const productNameMap = new Map(
    products.map((p) => [p.id, p.name || p.sku || p.id])
  );

  function dfs(currentId: string): boolean {
    visited.add(currentId);
    recursionStack.add(currentId);
    cyclePath.push(productNameMap.get(currentId) || currentId);

    const neighbors = graph.get(currentId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        cyclePath.push(productNameMap.get(neighbor) || neighbor);
        return true;
      }
    }

    recursionStack.delete(currentId);
    cyclePath.pop();
    return false;
  }

  if (dfs(parentProductId)) {
    const readableCycle = cyclePath.join(" -> ");
    throw new Error(
      `Circular dependency detected in Bill of Materials: ${readableCycle}. A product cannot depend on itself directly or indirectly.`
    );
  }
}

/**
 * Creates a new BOM for a product.
 * Automatically computes next version number and enforces real product validation.
 */
export async function createBOM(input: CreateBOMInput): Promise<BOMRecord> {
  const { parentProductId, items, notes, status = "DRAFT", userId } = input;

  if (!parentProductId) {
    throw new Error("Parent product ID is required.");
  }
  if (!items || items.length === 0) {
    throw new Error("At least one component product is required to define a BOM.");
  }

  // 1. Verify Parent Product exists in database and is physical
  const parentProduct = await prisma.product.findUnique({
    where: { id: parentProductId },
  });
  if (!parentProduct) {
    throw new Error(`Parent product not found: ${parentProductId}`);
  }
  if (parentProduct.type === "SERVICE") {
    throw new Error("Cannot create a BOM for a SERVICE. Services do not track physical components.");
  }

  // 1b. Self-dependency check: Parent cannot be a component of itself
  for (const item of items) {
    if (item.componentProductId === parentProductId) {
      throw new Error("Circular dependency detected: Parent product cannot be its own component.");
    }
  }

  // 2. Validate all components exist in database and are not SERVICE
  const componentProductIds = items.map((i) => i.componentProductId);
  const uniqueComponentIds = new Set(componentProductIds);
  if (uniqueComponentIds.size !== items.length) {
    throw new Error("Duplicate component products detected in BOM items. Each component must be unique.");
  }

  const componentProducts = await prisma.product.findMany({
    where: { id: { in: componentProductIds } },
  });
  if (componentProducts.length !== items.length) {
    throw new Error("One or more component products do not exist in the database.");
  }

  for (const comp of componentProducts) {
    if (comp.type === "SERVICE") {
      throw new Error(`Component product '${comp.name}' is a SERVICE and cannot be a BOM item.`);
    }
  }

  for (const item of items) {
    if (Number(item.quantity) <= 0) {
      throw new Error("Component quantity per parent unit must be greater than zero.");
    }
  }

  // 3. If creating as ACTIVE, perform circular dependency protection
  if (status === "ACTIVE") {
    await detectCircularDependency(parentProductId, items);
  }

  const db = await getMongoDb();

  // 4. Calculate next version number for this parent product
  const latestBom = await db
    .collection(BOM_COLLECTION)
    .find({ parentProductId })
    .sort({ version: -1 })
    .limit(1)
    .toArray();

  const nextVersion = latestBom.length > 0 ? (latestBom[0].version || 1) + 1 : 1;
  const now = new Date();

  // 5. If status is ACTIVE, archive any existing active BOM for this product
  if (status === "ACTIVE") {
    await db.collection(BOM_COLLECTION).updateMany(
      { parentProductId, status: "ACTIVE" },
      { $set: { status: "ARCHIVED", effectiveTo: now, updatedAt: now } }
    );
  }

  const newDoc = {
    parentProductId,
    version: nextVersion,
    status,
    notes: notes || null,
    effectiveFrom: now,
    effectiveTo: null,
    items: items.map((it) => ({
      componentProductId: it.componentProductId,
      quantity: Number(it.quantity),
      quantityScale: it.quantityScale || 1,
      unit: it.unit || "pcs",
      notes: it.notes || null,
    })),
    createdById: userId || null,
    createdAt: now,
    updatedAt: now,
  };

  const insertResult = await db.collection(BOM_COLLECTION).insertOne(newDoc);
  const createdId = insertResult.insertedId.toString();

  // 6. Record Audit Log
  try {
    if (userId) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "BOM_CREATED",
          module: "BOM",
          entityId: createdId,
          newData: JSON.stringify({
            parentProductId,
            version: nextVersion,
            status,
            itemCount: items.length,
          }),
        },
      });
    }
  } catch (err) {
    console.error("[BOM] Audit log error:", err);
  }

  return {
    id: createdId,
    ...newDoc,
  };
}

/**
 * Activates a BOM.
 * Enforces circular dependency rejection, archives previous active version,
 * and maintains full historical audit trail.
 */
export async function activateBOM(bomId: string, userId?: string): Promise<BOMRecord> {
  const db = await getMongoDb();
  const bom = await db.collection(BOM_COLLECTION).findOne({ _id: new ObjectId(bomId) });
  if (!bom) {
    throw new Error(`BOM not found: ${bomId}`);
  }

  if (bom.status === "ACTIVE") {
    return {
      id: bom._id.toString(),
      parentProductId: bom.parentProductId,
      version: bom.version,
      status: bom.status,
      notes: bom.notes,
      effectiveFrom: bom.effectiveFrom,
      effectiveTo: bom.effectiveTo,
      items: bom.items,
      createdById: bom.createdById,
      createdAt: bom.createdAt,
      updatedAt: bom.updatedAt,
    };
  }

  // 1. Verify Circular Dependency
  await detectCircularDependency(bom.parentProductId, bom.items, bomId);

  const now = new Date();

  // 2. Archive currently active BOM for the same parent product
  await db.collection(BOM_COLLECTION).updateMany(
    { parentProductId: bom.parentProductId, status: "ACTIVE", _id: { $ne: new ObjectId(bomId) } },
    { $set: { status: "ARCHIVED", effectiveTo: now, updatedAt: now } }
  );

  // 3. Mark this BOM as ACTIVE
  await db.collection(BOM_COLLECTION).updateOne(
    { _id: new ObjectId(bomId) },
    { $set: { status: "ACTIVE", effectiveFrom: now, effectiveTo: null, updatedAt: now } }
  );

  // 4. Audit Log
  if (userId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "BOM_ACTIVATED",
          module: "BOM",
          entityId: bomId,
          newData: JSON.stringify({
            parentProductId: bom.parentProductId,
            version: bom.version,
            activatedAt: now,
          }),
        },
      });
    } catch (e) {
      console.error("[BOM] Audit log error:", e);
    }
  }

  return {
    id: bom._id.toString(),
    parentProductId: bom.parentProductId,
    version: bom.version,
    status: "ACTIVE",
    notes: bom.notes,
    effectiveFrom: now,
    effectiveTo: null,
    items: bom.items,
    createdById: bom.createdById,
    createdAt: bom.createdAt,
    updatedAt: now,
  };
}

/**
 * Archives an active or draft BOM.
 */
export async function archiveBOM(bomId: string, userId?: string): Promise<BOMRecord> {
  const db = await getMongoDb();
  const bom = await db.collection(BOM_COLLECTION).findOne({ _id: new ObjectId(bomId) });
  if (!bom) {
    throw new Error(`BOM not found: ${bomId}`);
  }

  const now = new Date();
  await db.collection(BOM_COLLECTION).updateOne(
    { _id: new ObjectId(bomId) },
    { $set: { status: "ARCHIVED", effectiveTo: now, updatedAt: now } }
  );

  if (userId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "BOM_ARCHIVED",
          module: "BOM",
          entityId: bomId,
          newData: JSON.stringify({
            parentProductId: bom.parentProductId,
            version: bom.version,
            archivedAt: now,
          }),
        },
      });
    } catch (e) {
      console.error("[BOM] Audit log error:", e);
    }
  }

  return {
    id: bom._id.toString(),
    parentProductId: bom.parentProductId,
    version: bom.version,
    status: "ARCHIVED",
    notes: bom.notes,
    effectiveFrom: bom.effectiveFrom,
    effectiveTo: now,
    items: bom.items,
    createdById: bom.createdById,
    createdAt: bom.createdAt,
    updatedAt: now,
  };
}

/**
 * Retrieves a single BOM with full product metadata.
 */
export async function getBOMById(bomId: string) {
  const db = await getMongoDb();
  const bom = await db.collection(BOM_COLLECTION).findOne({ _id: new ObjectId(bomId) });
  if (!bom) return null;

  const parentProduct = await prisma.product.findUnique({
    where: { id: bom.parentProductId },
    select: { id: true, name: true, sku: true, type: true, stockQuantity: true, basePrice: true },
  });

  const componentProductIds = (bom.items || []).map((it: any) => it.componentProductId);
  const componentProducts = await prisma.product.findMany({
    where: { id: { in: componentProductIds } },
    select: { id: true, name: true, sku: true, stockQuantity: true, type: true },
  });

  const productMap = new Map(componentProducts.map((p) => [p.id, p]));

  const enrichedItems = (bom.items || []).map((it: any) => {
    const prod = productMap.get(it.componentProductId);
    return {
      componentProductId: it.componentProductId,
      productName: prod?.name || "Unknown Product",
      sku: prod?.sku || null,
      quantity: it.quantity,
      quantityScale: it.quantityScale || 1,
      unit: it.unit || "pcs",
      availableStock: prod?.stockQuantity ?? 0,
      notes: it.notes || null,
    };
  });

  return {
    id: bom._id.toString(),
    parentProductId: bom.parentProductId,
    parentProduct,
    version: bom.version,
    status: bom.status,
    notes: bom.notes,
    effectiveFrom: bom.effectiveFrom,
    effectiveTo: bom.effectiveTo,
    items: enrichedItems,
    createdById: bom.createdById,
    createdAt: bom.createdAt,
    updatedAt: bom.updatedAt,
  };
}

/**
 * Lists all BOMs with optional filters for parent product and status.
 */
export async function listBOMs(filter?: { parentProductId?: string; status?: BOMStatus }) {
  const db = await getMongoDb();
  const query: any = {};
  if (filter?.parentProductId) query.parentProductId = filter.parentProductId;
  if (filter?.status) query.status = filter.status;

  const boms = await db
    .collection(BOM_COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  if (boms.length === 0) return [];

  const parentIds = Array.from(new Set(boms.map((b) => b.parentProductId)));
  const parentProducts = await prisma.product.findMany({
    where: { id: { in: parentIds } },
    select: { id: true, name: true, sku: true, stockQuantity: true },
  });
  const parentMap = new Map(parentProducts.map((p) => [p.id, p]));

  return boms.map((b) => ({
    id: b._id.toString(),
    parentProductId: b.parentProductId,
    parentProduct: parentMap.get(b.parentProductId) || null,
    version: b.version,
    status: b.status,
    notes: b.notes,
    effectiveFrom: b.effectiveFrom,
    effectiveTo: b.effectiveTo,
    itemCount: (b.items || []).length,
    createdById: b.createdById,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }));
}

/**
 * Calculates component requirements and shortages for a target build quantity.
 * Compares against real stock quantities in the database.
 * Derives material costs strictly from Rolling WAC (never selling price).
 */
export async function calculateBOMRequirements(
  bomId: string,
  buildQuantity: number
): Promise<BOMRequirementCalculation> {
  const qty = Number(buildQuantity);
  if (!qty || qty <= 0) {
    throw new Error("Build quantity must be a positive number.");
  }

  const db = await getMongoDb();
  const bom = await db.collection(BOM_COLLECTION).findOne({ _id: new ObjectId(bomId) });
  if (!bom) {
    throw new Error(`BOM not found: ${bomId}`);
  }

  const parentProduct = await prisma.product.findUnique({
    where: { id: bom.parentProductId },
    select: { id: true, name: true, sku: true },
  });

  const componentProductIds = (bom.items || []).map((it: any) => it.componentProductId);
  const componentProducts = await prisma.product.findMany({
    where: { id: { in: componentProductIds } },
    select: { id: true, name: true, sku: true, stockQuantity: true, quantityScale: true },
  });
  const compMap = new Map(componentProducts.map((p) => [p.id, p]));

  let totalShortageCount = 0;
  let estimatedMaterialCostPaise = 0;
  const components: ComponentRequirementSummary[] = [];

  for (const item of bom.items || []) {
    const prod = compMap.get(item.componentProductId);
    const requiredPerUnit = Number(item.quantity);
    const totalRequiredQty = requiredPerUnit * qty;
    const availableQty = prod?.stockQuantity ?? 0;
    const shortageQty = Math.max(0, totalRequiredQty - availableQty);

    if (shortageQty > 0) {
      totalShortageCount++;
    }

    const unitCostPaise = await getProductRollingWACPaise(item.componentProductId);
    const totalCostPaise = totalRequiredQty * unitCostPaise;
    estimatedMaterialCostPaise += totalCostPaise;

    components.push({
      componentProductId: item.componentProductId,
      productName: prod?.name || "Unknown Product",
      sku: prod?.sku || null,
      unit: item.unit || "pcs",
      requiredPerUnit,
      totalRequiredQty,
      availableQty,
      shortageQty,
      unitCostPaise,
      totalCostPaise,
    });
  }

  return {
    bomId: bom._id.toString(),
    version: bom.version,
    parentProductId: bom.parentProductId,
    parentProductName: parentProduct?.name || "Unknown Product",
    parentProductSku: parentProduct?.sku || null,
    buildQuantity: qty,
    canBuild: totalShortageCount === 0,
    totalShortageCount,
    estimatedMaterialCostPaise,
    components,
  };
}

/**
 * Executes BOM Kit Assembly / Production.
 * 1. Verifies BOM is ACTIVE.
 * 2. Pre-validates availability (rejects if shortage).
 * 3. Atomically consumes components via StockLedgerEntry (PRODUCTION_CONSUMPTION).
 * 4. Atomically increments parent finished product stock via StockLedgerEntry (PRODUCTION).
 * 5. Costing is strictly Rolling WAC.
 * 6. Concurrency-safe and idempotent.
 */
export async function executeBOMAssembly(input: ExecuteBOMAssemblyInput) {
  const { bomId, buildQuantity, directCost = 0, notes, userId, idempotencyKey } = input;

  const db = await getMongoDb();
  const bom = await db.collection(BOM_COLLECTION).findOne({ _id: new ObjectId(bomId) });
  if (!bom) {
    throw new Error(`BOM not found: ${bomId}`);
  }

  if (bom.status !== "ACTIVE") {
    throw new Error(
      `Cannot execute assembly on a ${bom.status} BOM. Only ACTIVE BOMs can be built.`
    );
  }

  // 1. Calculate and verify component shortages
  const requirements = await calculateBOMRequirements(bomId, buildQuantity);
  if (!requirements.canBuild) {
    const shortageList = requirements.components
      .filter((c) => c.shortageQty > 0)
      .map((c) => `${c.productName} (Short by ${c.shortageQty} ${c.unit})`)
      .join(", ");
    throw new Error(
      `Insufficient stock. The selected build cannot be completed with current inventory. Shortage in: ${shortageList}`
    );
  }

  // 2. Prepare component inputs for existing production engine
  const productionComponents = bom.items.map((it: any) => ({
    productId: it.componentProductId,
    quantity: Number(it.quantity) * buildQuantity,
    notes: it.notes || `BOM v${bom.version} assembly requirement`,
  }));

  const assemblyNotes = [
    `Robotics Kit Assembly from BOM v${bom.version}`,
    notes ? `Note: ${notes}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  // 3. Execute atomic production batch
  const productionRecord = await executeProductionBatch({
    finishedProductId: bom.parentProductId,
    quantityProduced: buildQuantity,
    directCost,
    components: productionComponents,
    notes: assemblyNotes,
    userId,
    idempotencyKey,
  });

  if (!productionRecord) {
    throw new Error("Failed to execute production assembly batch.");
  }

  // 4. Record Audit Log for BOM Production Completion
  if (userId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "BOM_PRODUCTION_COMPLETED",
          module: "BOM",
          entityId: bomId,
          newData: JSON.stringify({
            productionNo: (productionRecord as any).productionNo,
            productionId: productionRecord.id,
            parentProductId: bom.parentProductId,
            version: bom.version,
            quantityProduced: buildQuantity,
            materialCostPaise: (productionRecord as any).materialCostPaise,
          }),
        },
      });
    } catch (e) {
      console.error("[BOM] Audit log error:", e);
    }
  }

  return productionRecord;
}
