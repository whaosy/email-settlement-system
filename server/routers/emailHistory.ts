import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import {
  getUserEmailTasks,
  getEmailTask,
  getTaskEmailLogs,
  updateEmailLog,
  createEmailTask,
  updateEmailTask,
} from '../db';
import { createSmtpTransporter, batchSendEmails, decryptAuthCode } from '../utils/emailService';
import { getSmtpConfig, getEmailTemplate } from '../db';
import { generateEmailPreviews } from '../utils/emailPreview';
import { storagePut } from '../storage';
import { nanoid } from 'nanoid';

export const emailHistoryRouter = router({
  // Get all email tasks for current user
  getTaskList: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const tasks = await getUserEmailTasks(ctx.user.id);
        
        // Sort by creation time, newest first
        const sortedTasks = tasks.sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeB - timeA;
        });

        // Paginate
        const start = (input.page - 1) * input.pageSize;
        const end = start + input.pageSize;
        const paginatedTasks = sortedTasks.slice(start, end);

        return {
          success: true,
          tasks: paginatedTasks,
          total: tasks.length,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(tasks.length / input.pageSize),
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch task list',
        });
      }
    }),

  // Get task details with email logs
  getTaskDetails: protectedProcedure
    .input(z.object({ taskId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      try {
        const task = await getEmailTask(input.taskId);

        if (!task || task.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Task not found',
          });
        }

        const logs = await getTaskEmailLogs(input.taskId);

        // Calculate statistics
        const successCount = logs.filter((log) => log.status === 'success').length;
        const failureCount = logs.filter((log) => log.status === 'failed').length;
        const pendingCount = logs.filter((log) => log.status === 'pending').length;

        return {
          success: true,
          task,
          logs,
          statistics: {
            total: logs.length,
            success: successCount,
            failure: failureCount,
            pending: pendingCount,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch task details',
        });
      }
    }),

  // Retry failed emails
  retryFailedEmails: protectedProcedure
    .input(
      z.object({
        taskId: z.number().int(),
        emailIds: z.array(z.number().int()).optional(), // If not provided, retry all failed
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const task = await getEmailTask(input.taskId);

        if (!task || task.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Task not found',
          });
        }

        const smtpConfig = await getSmtpConfig(task.smtpConfigId || 0);
        const template = await getEmailTemplate(task.templateId || 0);

        if (!smtpConfig || !template) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'SMTP config or template not found',
          });
        }

        const logs = await getTaskEmailLogs(input.taskId);

        // Filter logs to retry
        let logsToRetry = logs.filter(
          (log) => log.status === 'failed' || log.status === 'pending'
        );

        if (input.emailIds && input.emailIds.length > 0) {
          logsToRetry = logsToRetry.filter((log) => input.emailIds!.includes(log.id));
        }

        if (logsToRetry.length === 0) {
          return {
            success: true,
            message: '没有需要重试的邮件',
            retriedCount: 0,
          };
        }

        // Create SMTP transporter
        const transporter = await createSmtpTransporter({
          host: smtpConfig.smtpHost,
          port: smtpConfig.smtpPort,
          encryptionType: (smtpConfig.encryptionType || 'tls') as 'none' | 'ssl' | 'tls',
          email: smtpConfig.senderEmail,
          authCode: decryptAuthCode(smtpConfig.authCode!),
        });

        // Prepare emails to send
        const emailsToSend = logsToRetry.map((log) => ({
          to: log.recipientEmail,
          subject: log.subject || template.subject,
          html: template.body,
        }));

        // Send emails
        const results = await batchSendEmails(transporter, emailsToSend, {
          from: `${smtpConfig.senderName || 'System'} <${smtpConfig.senderEmail}>`,
          maxRetries: 3,
        });

        // Update logs
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < logsToRetry.length; i++) {
          const result = results[i];
          const log = logsToRetry[i];

          if (result.success) {
            await updateEmailLog(log.id, {
              status: 'success',
              sentAt: new Date(),
              errorMessage: null,
            });
            successCount++;
          } else {
            await updateEmailLog(log.id, {
              status: 'failed',
              errorMessage: result.error || 'Unknown error',
            });
            failureCount++;
          }
        }

        // Update task
        const allLogs = await getTaskEmailLogs(input.taskId);
        const allSuccess = allLogs.filter((log) => log.status === 'success').length;
        const allFailure = allLogs.filter((log) => log.status === 'failed').length;

        await updateEmailTask(input.taskId, {
          successCount: allSuccess,
          failureCount: allFailure,
        });

        return {
          success: true,
          message: `重试完成，成功: ${successCount}, 失败: ${failureCount}`,
          retriedCount: logsToRetry.length,
          successCount,
          failureCount,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retry emails',
        });
      }
    }),

  // Export task logs as CSV
  exportTaskLogs: protectedProcedure
    .input(z.object({ taskId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const task = await getEmailTask(input.taskId);

        if (!task || task.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Task not found',
          });
        }

        const logs = await getTaskEmailLogs(input.taskId);

        const headers = ['收件人邮箱', '收件人名称', '状态', '发送时间', '错误信息'];
        const rows = logs.map((log) => [
          log.recipientEmail,
          log.recipientName || '',
          log.status,
          log.sentAt ? new Date(log.sentAt).toLocaleString('zh-CN') : '',
          log.errorMessage || '',
        ]);

        let csv = headers.join(',') + '\n';
        for (const row of rows) {
          csv += row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
        }

        const fileKey = `logs/${ctx.user.id}/${nanoid()}-task-${input.taskId}.csv`;
        const { url } = await storagePut(fileKey, csv, 'text/csv');

        return { success: true, downloadUrl: url };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export logs',
        });
      }
    }),

  // Get task statistics
  getTaskStatistics: protectedProcedure
    .input(z.object({ taskId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      try {
        const task = await getEmailTask(input.taskId);

        if (!task || task.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Task not found',
          });
        }

        const logs = await getTaskEmailLogs(input.taskId);

        const successCount = logs.filter((log) => log.status === 'success').length;
        const failureCount = logs.filter((log) => log.status === 'failed').length;
        const pendingCount = logs.filter((log) => log.status === 'pending').length;

        const successRate = logs.length > 0 ? ((successCount / logs.length) * 100).toFixed(2) : '0.00';

        return {
          success: true,
          statistics: {
            total: logs.length,
            success: successCount,
            failure: failureCount,
            pending: pendingCount,
            successRate: parseFloat(successRate),
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get statistics',
        });
      }
    }),
});
