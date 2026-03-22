import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, emailTasks, emailTemplates, smtpConfigs, emailLogs, scheduledJobs, InsertEmailTask, InsertEmailTemplate, InsertSmtpConfig, InsertEmailLog, InsertScheduledJob } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Email system queries
export async function createEmailTask(task: InsertEmailTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emailTasks).values(task);
  return result;
}

export async function getEmailTask(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(emailTasks).where(eq(emailTasks.id, taskId)).limit(1);
  return result[0];
}

export async function updateEmailTask(taskId: number, updates: Partial<InsertEmailTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emailTasks).set(updates).where(eq(emailTasks.id, taskId));
}

export async function getUserEmailTasks(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(emailTasks).where(eq(emailTasks.userId, userId)).orderBy(desc(emailTasks.createdAt));
}

export async function createEmailTemplate(template: InsertEmailTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emailTemplates).values(template);
  return result;
}

export async function getUserEmailTemplates(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(emailTemplates).where(eq(emailTemplates.userId, userId));
}

export async function getEmailTemplate(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(emailTemplates).where(eq(emailTemplates.id, templateId)).limit(1);
  return result[0];
}

export async function createSmtpConfig(config: InsertSmtpConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(smtpConfigs).values(config);
  return result;
}

export async function getUserSmtpConfigs(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(smtpConfigs).where(eq(smtpConfigs.userId, userId));
}

export async function getSmtpConfig(configId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(smtpConfigs).where(eq(smtpConfigs.id, configId)).limit(1);
  return result[0];
}

export async function deleteSmtpConfig(configId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(smtpConfigs).where(eq(smtpConfigs.id, configId));
}

export async function deleteEmailTemplate(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emailTemplates).where(eq(emailTemplates.id, templateId));
}

export async function createEmailLog(log: InsertEmailLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(emailLogs).values(log);
}

export async function getTaskEmailLogs(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(emailLogs).where(eq(emailLogs.taskId, taskId)).orderBy(desc(emailLogs.createdAt));
}

export async function updateEmailLog(logId: number, updates: Partial<InsertEmailLog>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emailLogs).set(updates).where(eq(emailLogs.id, logId));
}

export async function createScheduledJob(job: InsertScheduledJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(scheduledJobs).values(job);
}

export async function getPendingScheduledJobs() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(scheduledJobs).where(eq(scheduledJobs.status, "pending"));
}

export async function updateScheduledJob(jobId: string, updates: Partial<InsertScheduledJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scheduledJobs).set(updates).where(eq(scheduledJobs.jobId, jobId));
}

export async function getScheduledJob(jobId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(scheduledJobs).where(eq(scheduledJobs.jobId, jobId)).limit(1);
  return result[0];
}
