import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 邮件发送任务表
 */
export const emailTasks = mysqlTable("emailTasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  taskName: varchar("taskName", { length: 255 }).notNull(),
  templateId: int("templateId"),
  smtpConfigId: int("smtpConfigId"),
  excelFileKey: varchar("excelFileKey", { length: 512 }),
  excelFileUrl: varchar("excelFileUrl", { length: 1024 }),
  totalRecipients: int("totalRecipients").default(0),
  successCount: int("successCount").default(0),
  failureCount: int("failureCount").default(0),
  status: mysqlEnum("status", ["draft", "scheduled", "sending", "completed", "failed"]).default("draft"),
  sendType: mysqlEnum("sendType", ["immediate", "scheduled"]).default("immediate"),
  scheduledTime: timestamp("scheduledTime"),
  startTime: timestamp("startTime"),
  endTime: timestamp("endTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTask = typeof emailTasks.$inferSelect;
export type InsertEmailTask = typeof emailTasks.$inferInsert;

/**
 * 邮件模板表
 */
export const emailTemplates = mysqlTable("emailTemplates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  templateName: varchar("templateName", { length: 255 }).notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  variables: text("variables"), // JSON array of variable names
  isDefault: int("isDefault").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/**
 * SMTP配置表
 */
export const smtpConfigs = mysqlTable("smtpConfigs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  configName: varchar("configName", { length: 255 }).notNull(),
  smtpHost: varchar("smtpHost", { length: 255 }).notNull(),
  smtpPort: int("smtpPort").notNull(),
  encryptionType: mysqlEnum("encryptionType", ["none", "ssl", "tls"]).default("tls"),
  senderEmail: varchar("senderEmail", { length: 320 }).notNull(),
  senderName: varchar("senderName", { length: 255 }),
  authCode: text("authCode"), // Encrypted password/auth code
  isDefault: int("isDefault").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SmtpConfig = typeof smtpConfigs.$inferSelect;
export type InsertSmtpConfig = typeof smtpConfigs.$inferInsert;

/**
 * 邮件发送日志表
 */
export const emailLogs = mysqlTable("emailLogs", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull().references(() => emailTasks.id),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientName: varchar("recipientName", { length: 255 }),
  subject: text("subject"),
  emailContent: text("emailContent"), // Store the HTML email content
  senderEmail: varchar("senderEmail", { length: 320 }), // Store sender email
  status: mysqlEnum("status", ["pending", "sending", "success", "failed"]).default("pending"),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt"),
  retryCount: int("retryCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

/**
 * 定时任务表
 */
export const scheduledJobs = mysqlTable("scheduledJobs", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull().references(() => emailTasks.id),
  jobId: varchar("jobId", { length: 255 }).notNull().unique(),
  scheduledTime: timestamp("scheduledTime").notNull(),
  status: mysqlEnum("status", ["pending", "executing", "completed", "failed"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledJob = typeof scheduledJobs.$inferSelect;
export type InsertScheduledJob = typeof scheduledJobs.$inferInsert;