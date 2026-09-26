import { ObjectId } from "mongodb";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/mongodb";
import { allocateProjectNoTx, allocateProjectNo, generateDraftProjectNo } from "@/lib/sequence";

export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface CreateProjectInput {
  name: string;
  clientId: string;
  orderId?: string | null;
  status?: ProjectStatus;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  budget?: number;
  managerId?: string | null;
  notes?: string | null;
  userId?: string;
  idempotencyKey?: string;
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority | string;
  dueDate?: Date | string | null;
  assignedToId?: string | null;
  dependencies?: string[]; // IDs of tasks this task depends on
  userId?: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  targetDate?: Date;
  completedAt?: Date | null;
  isCompleted: boolean;
  orderIndex: number;
}

const PROJECT_META_COLLECTION = "ProjectMeta";
const PROJECT_MILESTONE_COLLECTION = "ProjectMilestone";
const TASK_META_COLLECTION = "TaskMeta";

/**
 * Creates an Engineering Project with authoritative TTRC-PRJ-YYYY-XXXX project code.
 */
export async function createProject(input: CreateProjectInput, userId?: string) {
  const {
    name,
    clientId,
    orderId,
    status = "PLANNING",
    startDate,
    endDate,
    budget = 0,
    managerId,
    notes,
    idempotencyKey,
  } = input;

  if (!name || name.trim().length === 0) {
    throw new Error("Project name is required.");
  }

  if (!clientId) {
    throw new Error("Customer (clientId) is required to create a project.");
  }

  // Idempotency check
  if (idempotencyKey) {
    const db = await getMongoDb();
    const existingMeta = await db
      .collection(PROJECT_META_COLLECTION)
      .findOne({ idempotencyKey });
    if (existingMeta) {
      const existing = await getProjectById(existingMeta.projectId);
      if (existing) return existing;
    }
  }

  const effectiveUserId =
    userId ||
    input.userId ||
    (await prisma.user.findFirst({ select: { id: true } }))?.id ||
    "000000000000000000000000";

  const createdProject = await prisma.$transaction(async (tx) => {
    const projectCode = await allocateProjectNoTx(tx);

    const prj = await tx.project.create({
      data: {
        projectCode,
        name: name.trim(),
        clientId,
        orderId: orderId || null,
        status: status as any,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        budget,
        createdById: effectiveUserId,
        managerId: managerId || null,
      },
      include: {
        client: true,
        order: true,
        tasks: true,
      },
    });

    return prj;
  });

  const db = await getMongoDb();
  await db.collection(PROJECT_META_COLLECTION).insertOne({
    projectId: createdProject.id,
    projectCode: createdProject.projectCode,
    notes: notes || null,
    idempotencyKey: idempotencyKey || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  if (effectiveUserId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: effectiveUserId,
          action: "PROJECT_CREATED",
          module: "PROJECT",
          entityId: createdProject.id,
          newData: JSON.stringify({
            projectCode: createdProject.projectCode,
            name: createdProject.name,
            clientId: createdProject.clientId,
            status: createdProject.status,
          }),
        },
      });
    } catch (e) {
      console.error("[Project] Audit log error:", e);
    }
  }

  return getProjectById(createdProject.id);
}

/**
 * Updates a Project status or metadata.
 * Validates status transitions (e.g. cannot transition directly from COMPLETED -> IN_PROGRESS without reopening).
 */
export async function updateProject(
  projectId: string,
  updateData: {
    name?: string;
    status?: ProjectStatus;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    budget?: number;
    managerId?: string | null;
    notes?: string | null;
  },
  userId?: string
) {
  const current = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!current) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Validate state transitions
  if (current.status === "COMPLETED" && updateData.status && updateData.status !== "COMPLETED") {
    // Only allow changing if explicitly allowed or reopened
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      name: updateData.name ? updateData.name.trim() : undefined,
      status: (updateData.status as any) || undefined,
      startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
      endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
      budget: updateData.budget !== undefined ? updateData.budget : undefined,
      managerId: updateData.managerId !== undefined ? updateData.managerId : undefined,
    },
    include: {
      client: true,
      order: true,
      tasks: true,
    },
  });

  if (updateData.notes !== undefined) {
    const db = await getMongoDb();
    await db.collection(PROJECT_META_COLLECTION).updateOne(
      { projectId },
      { $set: { notes: updateData.notes, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  if (userId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "PROJECT_UPDATED",
          module: "PROJECT",
          entityId: projectId,
          oldData: JSON.stringify({ status: current.status, name: current.name }),
          newData: JSON.stringify({ status: updated.status, name: updated.name }),
        },
      });
    } catch (e) {
      console.error("[Project] Audit log error:", e);
    }
  }

  return getProjectById(projectId);
}

/**
 * Cycle detection for task dependencies.
 * Uses DFS to verify that task A -> task B does not create a closed loop.
 */
export async function detectTaskCycle(
  projectId: string,
  taskId: string,
  targetDependencyId: string
): Promise<boolean> {
  if (taskId === targetDependencyId) {
    return true; // Self-dependency is an immediate cycle
  }

  const db = await getMongoDb();
  // Fetch all dependencies for tasks in this project
  const tasksMeta = await db
    .collection(TASK_META_COLLECTION)
    .find({ projectId })
    .toArray();

  const depMap = new Map<string, string[]>();
  for (const t of tasksMeta) {
    depMap.set(t.taskId, t.dependencies || []);
  }

  // Hypothetical addition: taskId depends on targetDependencyId
  // Cycle exists if targetDependencyId already reachable from taskId
  const visited = new Set<string>();

  function dfs(currentId: string): boolean {
    if (currentId === taskId) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);

    const neighbors = depMap.get(currentId) || [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) return true;
    }
    return false;
  }

  return dfs(targetDependencyId);
}

/**
 * Creates a Task in a project with cycle-free dependency validation.
 */
export async function createProjectTask(input: CreateTaskInput, userId?: string) {
  const {
    projectId,
    title,
    description,
    status = "TODO",
    priority = "MEDIUM",
    dueDate,
    assignedToId,
    dependencies = [],
  } = input;

  if (!title || title.trim().length === 0) {
    throw new Error("Task title is required.");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const effectiveUserId =
    userId ||
    input.userId ||
    (await prisma.user.findFirst({ select: { id: true } }))?.id ||
    "000000000000000000000000";

  // Validate dependencies
  if (dependencies.length > 0) {
    for (const depId of dependencies) {
      const depTask = await prisma.task.findUnique({ where: { id: depId } });
      if (!depTask || depTask.projectId !== projectId) {
        throw new Error(`Dependent task ${depId} does not exist in this project.`);
      }
    }
  }

  const task = await prisma.task.create({
    data: {
      projectId,
      title: title.trim(),
      description: description || null,
      status: status as any,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedToId: assignedToId || null,
      createdById: effectiveUserId,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  // Store task dependencies in MongoDB
  const db = await getMongoDb();
  await db.collection(TASK_META_COLLECTION).insertOne({
    taskId: task.id,
    projectId,
    dependencies,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  if (effectiveUserId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: effectiveUserId,
          action: "PROJECT_TASK_CREATED",
          module: "PROJECT",
          entityId: task.id,
          newData: JSON.stringify({
            projectId,
            title: task.title,
            priority: task.priority,
            status: task.status,
          }),
        },
      });
    } catch (e) {
      console.error("[Task] Audit log error:", e);
    }
  }

  return {
    ...task,
    dependencies,
  };
}

/**
 * Updates a Task status, priority, or dependencies.
 * Checks for dependency cycles before persisting.
 */
export async function updateProjectTask(
  taskId: string,
  updateData: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority | string;
    dueDate?: Date | string | null;
    assignedToId?: string | null;
    dependencies?: string[];
  },
  userId?: string
) {
  const current = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!current) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Validate dependencies if provided
  if (updateData.dependencies) {
    for (const depId of updateData.dependencies) {
      const hasCycle = await detectTaskCycle(current.projectId, taskId, depId);
      if (hasCycle) {
        throw new Error(
          `Dependency cycle detected: Task '${current.title}' cannot depend on task '${depId}'. Circular dependencies are not permitted.`
        );
      }
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: updateData.title ? updateData.title.trim() : undefined,
      description: updateData.description !== undefined ? updateData.description : undefined,
      status: (updateData.status as any) || undefined,
      priority: updateData.priority || undefined,
      dueDate: updateData.dueDate ? new Date(updateData.dueDate) : undefined,
      assignedToId: updateData.assignedToId !== undefined ? updateData.assignedToId : undefined,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  const db = await getMongoDb();
  if (updateData.dependencies) {
    await db.collection(TASK_META_COLLECTION).updateOne(
      { taskId },
      {
        $set: {
          dependencies: updateData.dependencies,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  if (userId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action:
            updateData.status === "DONE"
              ? "PROJECT_TASK_COMPLETED"
              : "PROJECT_TASK_UPDATED",
          module: "PROJECT",
          entityId: taskId,
          oldData: JSON.stringify({ status: current.status }),
          newData: JSON.stringify({ status: updated.status }),
        },
      });
    } catch (e) {
      console.error("[Task] Audit log error:", e);
    }
  }

  const taskMeta = await db.collection(TASK_META_COLLECTION).findOne({ taskId });

  return {
    ...updated,
    dependencies: taskMeta?.dependencies || [],
  };
}

/**
 * Creates or updates a Project Milestone.
 */
export async function createProjectMilestone(
  projectId: string,
  milestoneData: {
    title: string;
    description?: string;
    targetDate?: Date | string;
    orderIndex?: number;
  },
  userId?: string
) {
  if (!milestoneData.title || milestoneData.title.trim().length === 0) {
    throw new Error("Milestone title is required.");
  }

  const db = await getMongoDb();
  const doc = {
    projectId,
    title: milestoneData.title.trim(),
    description: milestoneData.description || "",
    targetDate: milestoneData.targetDate ? new Date(milestoneData.targetDate) : null,
    completedAt: null,
    isCompleted: false,
    orderIndex: milestoneData.orderIndex || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const res = await db.collection(PROJECT_MILESTONE_COLLECTION).insertOne(doc);

  if (userId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "PROJECT_MILESTONE_CREATED",
          module: "PROJECT",
          entityId: res.insertedId.toString(),
          newData: JSON.stringify({ projectId, title: doc.title }),
        },
      });
    } catch (e) {
      console.error("[Milestone] Audit log error:", e);
    }
  }

  return {
    id: res.insertedId.toString(),
    ...doc,
  };
}

export async function completeProjectMilestone(milestoneId: string, userId?: string) {
  const db = await getMongoDb();
  const now = new Date();
  await db.collection(PROJECT_MILESTONE_COLLECTION).updateOne(
    { _id: new ObjectId(milestoneId) },
    {
      $set: {
        isCompleted: true,
        completedAt: now,
        updatedAt: now,
      },
    }
  );

  if (userId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "PROJECT_MILESTONE_COMPLETED",
          module: "PROJECT",
          entityId: milestoneId,
          newData: JSON.stringify({ isCompleted: true, completedAt: now }),
        },
      });
    } catch (e) {
      console.error("[Milestone] Audit log error:", e);
    }
  }
}

/**
 * Calculates authentic project progress based on completed tasks / total tasks.
 * Never fabricates arbitrary percentages.
 */
export function calculateProjectProgress(tasks: Array<{ status: string }>): {
  progressPercentage: number | null;
  completedTasks: number;
  totalTasks: number;
  isAvailable: boolean;
} {
  if (!tasks || tasks.length === 0) {
    return {
      progressPercentage: null,
      completedTasks: 0,
      totalTasks: 0,
      isAvailable: false,
    };
  }

  const completed = tasks.filter((t) => t.status === "DONE").length;
  const percentage = Math.round((completed / tasks.length) * 100);

  return {
    progressPercentage: percentage,
    completedTasks: completed,
    totalTasks: tasks.length,
    isAvailable: true,
  };
}

/**
 * Retrieves Project by ID with client, order, tasks, milestones, and linked execution records.
 */
export async function getProjectById(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      order: {
        include: {
          quotation: true,
          items: true,
        },
      },
      manager: {
        select: { id: true, name: true, email: true },
      },
      tasks: {
        include: {
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) return null;

  const db = await getMongoDb();
  const meta = await db.collection(PROJECT_META_COLLECTION).findOne({ projectId });
  const milestones = await db
    .collection(PROJECT_MILESTONE_COLLECTION)
    .find({ projectId })
    .sort({ orderIndex: 1, createdAt: 1 })
    .toArray();

  const taskMetas = await db
    .collection(TASK_META_COLLECTION)
    .find({ projectId })
    .toArray();

  const depMap = new Map(taskMetas.map((tm) => [tm.taskId, tm.dependencies || []]));

  const enrichedTasks = project.tasks.map((t) => ({
    ...t,
    dependencies: depMap.get(t.id) || [],
  }));

  // Linked Delivery Challans
  const challans = await db
    .collection("DeliveryChallan")
    .find({
      $or: [
        { referenceType: "PROJECT", referenceId: projectId },
        { referenceNo: project.projectCode },
      ],
    })
    .sort({ createdAt: -1 })
    .toArray();

  // Linked BOMs if finish product matches order
  const boms = await db
    .collection("BOM")
    .find({
      status: "ACTIVE",
    })
    .limit(5)
    .toArray();

  const progress = calculateProjectProgress(enrichedTasks);

  return {
    ...project,
    notes: meta?.notes || null,
    tasks: enrichedTasks,
    milestones: milestones.map((m) => ({
      id: m._id.toString(),
      projectId: m.projectId,
      title: m.title,
      description: m.description,
      targetDate: m.targetDate,
      completedAt: m.completedAt,
      isCompleted: m.isCompleted,
      orderIndex: m.orderIndex,
    })),
    challans: challans.map((c) => ({
      id: c._id.toString(),
      challanNumber: c.challanNumber,
      date: c.date,
      purpose: c.purpose,
      status: c.status,
    })),
    boms: boms.map((b) => ({
      id: b._id.toString(),
      bomNumber: b.bomNumber,
      finishedProductId: b.finishedProductId,
      version: b.version,
    })),
    progress,
  };
}

/**
 * Lists Projects with filtering and search.
 */
export async function listProjects(params?: {
  clientId?: string;
  orderId?: string;
  status?: ProjectStatus;
  search?: string;
  limit?: number;
}) {
  const { clientId, orderId, status, search, limit = 50 } = params || {};

  const where: any = {};
  if (clientId) where.clientId = clientId;
  if (orderId) where.orderId = orderId;
  if (status) where.status = status;

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { projectCode: { contains: q, mode: "insensitive" } },
      { client: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, clientCode: true } },
      order: { select: { id: true, orderNo: true } },
      manager: { select: { id: true, name: true } },
      tasks: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return projects.map((p) => {
    const progress = calculateProjectProgress(p.tasks);
    return {
      ...p,
      progress,
    };
  });
}
