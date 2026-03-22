import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import {
  createEmailTask,
  getEmailTask,
  updateEmailTask,
  getUserEmailTasks,
  createEmailTemplate,
  getUserEmailTemplates,
  getEmailTemplate,
  createSmtpConfig,
  getUserSmtpConfigs,
  getSmtpConfig,
  deleteSmtpConfig,
  deleteEmailTemplate,
  createEmailLog,
  getTaskEmailLogs,
  updateEmailLog,
  createScheduledJob,
  updateScheduledJob,
} from '../db';
import { storagePut } from '../storage';
import { parseExcelFile, replaceTemplateVariables, extractTemplateVariables, arrayToHtmlTable, buildMerchantEmailMapping, calculateColumnSum, generateEmailContent } from '../utils/excel';
import { encryptAuthCode, decryptAuthCode, createSmtpTransporter, testSmtpConnection, batchSendEmails } from '../utils/emailService';
import { scheduleTask, cancelTask } from '../utils/scheduler';
import { notifyOwner } from '../_core/notification';
import { nanoid } from 'nanoid';

export const emailRouter = router({
  // SMTP Configuration
  createSmtpConfig: protectedProcedure
    .input(
      z.object({
        configName: z.string().min(1),
        smtpHost: z.string().min(1),
        smtpPort: z.number().int().min(1).max(65535),
        encryptionType: z.enum(['none', 'ssl', 'tls']),
        senderEmail: z.string().email(),
        senderName: z.string().optional(),
        authCode: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const encryptedAuthCode = encryptAuthCode(input.authCode);
        const result = await createSmtpConfig({
          userId: ctx.user.id,
          configName: input.configName,
          smtpHost: input.smtpHost,
          smtpPort: input.smtpPort,
          encryptionType: input.encryptionType,
          senderEmail: input.senderEmail,
          senderName: input.senderName,
          authCode: encryptedAuthCode,
        });
        return { success: true, configId: (result as any).insertId };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create SMTP config',
        });
      }
    }),

  getSmtpConfigs: protectedProcedure.query(async ({ ctx }) => {
    try {
      const configs = await getUserSmtpConfigs(ctx.user.id);
      return configs.map((config) => ({
        ...config,
        authCode: undefined,
      }));
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch SMTP configs',
      });
    }
  }),

  testSmtpConnection: protectedProcedure
    .input(
      z.object({
        smtpHost: z.string().min(1),
        smtpPort: z.number().int().min(1).max(65535),
        encryptionType: z.enum(['none', 'ssl', 'tls']),
        senderEmail: z.string().email(),
        authCode: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await testSmtpConnection({
          host: input.smtpHost,
          port: input.smtpPort,
          encryptionType: input.encryptionType,
          email: input.senderEmail,
          authCode: input.authCode,
        });
        return result;
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Connection test failed',
        };
      }
    }),

  // Email Template
  createTemplate: protectedProcedure
    .input(
      z.object({
        templateName: z.string().min(1),
        subject: z.string().min(1),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const variables = extractTemplateVariables(input.subject + input.body);
        const result = await createEmailTemplate({
          userId: ctx.user.id,
          templateName: input.templateName,
          subject: input.subject,
          body: input.body,
          variables: JSON.stringify(variables),
        });
        return { success: true, templateId: (result as any).insertId };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create template',
        });
      }
    }),

  getTemplates: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getUserEmailTemplates(ctx.user.id);
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch templates',
      });
    }
  }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const template = await getEmailTemplate(input.id);
        if (!template || template.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template not found',
          });
        }
        await deleteEmailTemplate(input.id);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete template',
        });
      }
    }),

  deleteSmtpConfig: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const config = await getSmtpConfig(input.id);
        if (!config || config.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'SMTP config not found',
          });
        }
        await deleteSmtpConfig(input.id);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete SMTP config',
        });
      }
    }),

  // File Upload & Parsing
  uploadExcelFile: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        fileBuffer: z.union([z.instanceof(Buffer), z.instanceof(Uint8Array), z.any()]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Ensure we have a Buffer for processing
        let buffer = input.fileBuffer;
        if (!Buffer.isBuffer(buffer)) {
          buffer = Buffer.from(buffer);
        }
        const parseResult = await parseExcelFile(buffer);
        if (!parseResult.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: parseResult.error,
          });
        }

        const fileKey = `excel-uploads/${ctx.user.id}/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        console.log('File uploaded successfully:', { fileKey, url });

        return {
          success: true,
          fileKey: url,
          fileUrl: url,
          sheets: parseResult.sheets,
          sheetNames: parseResult.sheetNames,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to upload Excel file',
        });
      }
    }),

  // Email Task Management
  createTask: protectedProcedure
    .input(
      z.object({
        taskName: z.string().min(1),
        templateId: z.number().int(),
        smtpConfigId: z.number().int(),
        excelFileKey: z.string().min(1),
        excelFileUrl: z.string().url(),
        recipients: z.array(
          z.object({
            email: z.string().email(),
            name: z.string().optional(),
            data: z.record(z.string(), z.any()),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const taskResult = await createEmailTask({
          userId: ctx.user.id,
          taskName: input.taskName,
          templateId: input.templateId,
          smtpConfigId: input.smtpConfigId,
          excelFileKey: input.excelFileKey,
          excelFileUrl: input.excelFileUrl,
          totalRecipients: input.recipients.length,
          status: 'draft',
        });

        const taskId = (taskResult as any).insertId;

        for (const recipient of input.recipients) {
          await createEmailLog({
            taskId,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        return { success: true, taskId };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create task',
        });
      }
    }),

  getTasks: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getUserEmailTasks(ctx.user.id);
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch tasks',
      });
    }
  }),

  getTaskDetail: protectedProcedure
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
        return { task, logs };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch task detail',
        });
      }
    }),

  // Send Email
  sendEmailsImmediately: protectedProcedure
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

        if (!task.templateId || !task.smtpConfigId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Task missing template or SMTP config',
          });
        }

        await updateEmailTask(input.taskId, { status: 'sending', startTime: new Date() });

        const template = await getEmailTemplate(task.templateId);
        const smtpConfig = await getSmtpConfig(task.smtpConfigId);

        if (!template || !smtpConfig) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template or SMTP config not found',
          });
        }

        const logs = await getTaskEmailLogs(input.taskId);

        const transporter = await createSmtpTransporter({
          host: smtpConfig.smtpHost,
          port: smtpConfig.smtpPort,
          encryptionType: (smtpConfig.encryptionType || 'tls') as 'none' | 'ssl' | 'tls',
          email: smtpConfig.senderEmail,
          authCode: decryptAuthCode(smtpConfig.authCode!),
        });

        const emailsToSend = logs.map((log) => ({
          to: log.recipientEmail,
          subject: replaceTemplateVariables(template.subject, {
            name: log.recipientName || '',
            date: new Date().toLocaleDateString(),
          }),
          html: replaceTemplateVariables(template.body, {
            name: log.recipientName || '',
            date: new Date().toLocaleDateString(),
          }),
        }));

        let successCount = 0;
        let failureCount = 0;

        const results = await batchSendEmails(transporter, emailsToSend, {
          from: `${smtpConfig.senderName || 'System'} <${smtpConfig.senderEmail}>`,
          maxRetries: 3,
        });

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const log = logs[i];

          if (result.success) {
            await updateEmailLog(log.id, {
              status: 'success',
              sentAt: new Date(),
            });
            successCount++;
          } else {
            await updateEmailLog(log.id, {
              status: 'failed',
              errorMessage: result.error,
            });
            failureCount++;
          }
        }

        await updateEmailTask(input.taskId, {
          status: 'completed',
          successCount,
          failureCount,
          endTime: new Date(),
        });

        if (failureCount > 0) {
          await notifyOwner({
            title: 'Email task completed with failures',
            content: `Task "${task.taskName}" completed. Success: ${successCount}, Failures: ${failureCount}`,
          });
        }

        return {
          success: true,
          successCount,
          failureCount,
        };
      } catch (error) {
        await updateEmailTask(input.taskId, { status: 'failed' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to send emails',
        });
      }
    }),

  // Scheduled Send
  scheduleEmailSend: protectedProcedure
    .input(
      z.object({
        taskId: z.number().int(),
        scheduledTime: z.date(),
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

        const jobId = scheduleTask(
          input.scheduledTime,
          async () => {
            // Execute send logic
            await updateEmailTask(input.taskId, { status: 'sending', startTime: new Date() });
            // Add actual send logic here
          },
          input.taskId
        );

        await createScheduledJob({
          taskId: input.taskId,
          jobId,
          scheduledTime: input.scheduledTime,
          status: 'pending',
        });

        await updateEmailTask(input.taskId, {
          status: 'scheduled',
          sendType: 'scheduled',
          scheduledTime: input.scheduledTime,
        });

        return { success: true, jobId };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to schedule email send',
        });
      }
    }),

  cancelScheduledSend: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const cancelled = cancelTask(input.jobId);
        if (!cancelled) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Scheduled job not found',
          });
        }

        await updateScheduledJob(input.jobId, { status: 'failed' });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel scheduled send',
        });
      }
    }),

  // Direct Send Emails (without creating task first)
  sendEmails: protectedProcedure
    .input(
      z.object({
        templateId: z.number().int(),
        smtpConfigId: z.number().int(),
        dataFileKey: z.string().min(1),
        mappingFileKey: z.string().optional(),
        merchantColumn: z.string().default('商户名称'),
        emailColumn: z.string().default('收件人邮箱'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const template = await getEmailTemplate(input.templateId);
        const smtpConfig = await getSmtpConfig(input.smtpConfigId);

        if (!template || template.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template not found',
          });
        }

        if (!smtpConfig || smtpConfig.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'SMTP config not found',
          });
        }

        // Create task for tracking
        const taskResult = await createEmailTask({
          userId: ctx.user.id,
          taskName: `Direct Send - ${new Date().toLocaleString()}`,
          templateId: input.templateId,
          smtpConfigId: input.smtpConfigId,
          excelFileKey: input.dataFileKey,
          excelFileUrl: '', // Will be set from S3
          totalRecipients: 0,
          status: 'sending',
          startTime: new Date(),
        });

        const taskId = (taskResult as any).insertId;
        console.log(`Created email task with ID: ${taskId}`);

        const transporter = await createSmtpTransporter({
          host: smtpConfig.smtpHost,
          port: smtpConfig.smtpPort,
          encryptionType: (smtpConfig.encryptionType || 'tls') as 'none' | 'ssl' | 'tls',
          email: smtpConfig.senderEmail,
          authCode: decryptAuthCode(smtpConfig.authCode!),
        });

        let successCount = 0;
        let failureCount = 0;
        const emailsToSend: Array<{ to: string; subject: string; html: string }> = [];

        // Fetch data file from storage (fileKey is now the actual URL)
        const dataFileUrl = input.dataFileKey.startsWith('http') ? input.dataFileKey : `https://manus-storage.s3.amazonaws.com/${input.dataFileKey}`;
        console.log('Fetching data file from storage for sending:', dataFileUrl);
        
        let dataFileResponse;
        try {
          dataFileResponse = await fetch(dataFileUrl);
          if (!dataFileResponse.ok) {
            throw new Error(`Failed to fetch file from S3: ${dataFileResponse.status} ${dataFileResponse.statusText}`);
          }
        } catch (fetchError) {
          console.error('S3 fetch error:', fetchError);
          throw new Error(`Failed to fetch data file from S3: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
        }
        
        const dataFileBuffer = await dataFileResponse.arrayBuffer();
        if (!dataFileBuffer || dataFileBuffer.byteLength === 0) {
          throw new Error('Data file is empty or invalid');
        }

        const dataFileParsed = await parseExcelFile(Buffer.from(dataFileBuffer));
        if (!dataFileParsed.success) {
          throw new Error('Failed to parse data file: ' + (dataFileParsed as any).error);
        }

        if (!dataFileParsed.sheetNames || !dataFileParsed.sheets) {
          throw new Error('Invalid data file format: missing sheets or sheetNames');
        }

        // Parse mapping file if provided
        let merchantEmailMapping: Record<string, string[]> = {};
        if (input.mappingFileKey) {
          const mappingFileUrl = input.mappingFileKey.startsWith('http') ? input.mappingFileKey : `https://manus-storage.s3.amazonaws.com/${input.mappingFileKey}`;
          console.log('Fetching mapping file from storage for sending:', mappingFileUrl);
          
          try {
            const mappingFileResponse = await fetch(mappingFileUrl);
            if (!mappingFileResponse.ok) {
              console.warn(`Failed to fetch mapping file from S3: ${mappingFileResponse.status}`);
            } else {
              const mappingFileBuffer = await mappingFileResponse.arrayBuffer();
              if (mappingFileBuffer && mappingFileBuffer.byteLength > 0) {
                const mappingFileParsed = await parseExcelFile(Buffer.from(mappingFileBuffer));
                if (mappingFileParsed.success && mappingFileParsed.sheetNames && mappingFileParsed.sheets) {
                  const mappingSheetName = mappingFileParsed.sheetNames[0];
                  const mappingData = mappingFileParsed.sheets[mappingSheetName] || [];
                  merchantEmailMapping = buildMerchantEmailMapping(
                    mappingData,
                    input.merchantColumn,
                    input.emailColumn
                  );
                }
              }
            }
          } catch (mappingError) {
            console.warn('Error processing mapping file:', mappingError);
          }
        }

        // Build emails from data file
        console.log(`Data file has ${dataFileParsed.sheetNames?.length || 0} sheets`);
        if (!dataFileParsed.sheetNames || dataFileParsed.sheetNames.length === 0) {
          throw new Error('Data file has no sheets');
        }
        
        // Validate sheets data
        if (!dataFileParsed.sheets || typeof dataFileParsed.sheets !== 'object') {
          throw new Error('Invalid sheets data structure');
        }

        for (const sheetName of dataFileParsed.sheetNames) {
          if (!sheetName || typeof sheetName !== 'string') {
            console.warn('Invalid sheet name encountered');
            continue;
          }
          
          const sheetData = dataFileParsed.sheets[sheetName];
          if (!sheetData || !Array.isArray(sheetData) || sheetData.length === 0) {
            console.warn(`Sheet ${sheetName} is empty or invalid`);
            continue;
          }

          const emails = merchantEmailMapping[sheetName];
          if (!emails || !Array.isArray(emails) || emails.length === 0) {
            console.warn(`No emails found for merchant ${sheetName}, using default test email`);
          }
          const emailList = emails && Array.isArray(emails) && emails.length > 0 ? emails : ['test@example.com'];

          // Generate data detail HTML table
          const dataDetailHtml = arrayToHtmlTable(sheetData);

          // Calculate settlement amount (sum of '金额' column)
          const settlementAmount = calculateColumnSum(sheetData, '金额');

          // Generate email content
          const emailContent = generateEmailContent(
            template.body,
            dataDetailHtml,
            settlementAmount,
            sheetName
          );

          // Replace all placeholders in subject
          let subject = template.subject;
          subject = subject.replace(/{merchantName}/g, sheetName);
          subject = subject.replace(/{{merchantName}}/g, sheetName);
          subject = subject.replace(/{settlementAmount}/g, settlementAmount.toFixed(2));
          subject = subject.replace(/{{settlementAmount}}/g, settlementAmount.toFixed(2));
          const currentDate = new Date().toLocaleDateString('zh-CN');
          subject = subject.replace(/{currentDate}/g, currentDate);
          subject = subject.replace(/{{currentDate}}/g, currentDate);

          // Add email for each recipient
          for (const email of emailList) {
            emailsToSend.push({
              to: email,
              subject: subject,
              html: emailContent,
            });
          }
        }

        // Send all emails and save logs
        const results = await batchSendEmails(transporter, emailsToSend, {
          from: `${smtpConfig.senderName || 'System'} <${smtpConfig.senderEmail}>`,
          maxRetries: 3,
        });

        // Save email logs with content
        console.log(`Saving ${emailsToSend.length} email logs for task ${taskId}`);
        for (let i = 0; i < emailsToSend.length; i++) {
          const emailToSend = emailsToSend[i];
          const result = results[i];
          
          try {
            console.log(`Creating log for email ${i+1}/${emailsToSend.length}: ${emailToSend.to} - status: ${result?.success ? 'success' : 'failed'}`);
            await createEmailLog({
              taskId,
              recipientEmail: emailToSend.to,
              recipientName: emailToSend.to.split('@')[0],
              subject: emailToSend.subject,
              emailContent: emailToSend.html,
              senderEmail: smtpConfig.senderEmail,
              status: result?.success ? 'success' : 'failed',
              errorMessage: result?.error || null,
              sentAt: result?.success ? new Date() : null,
              retryCount: result?.retryCount || 0,
            });
            console.log(`Successfully created log for email ${emailToSend.to}`);
          } catch (logError) {
            console.error(`Failed to save email log for ${emailToSend.to}:`, logError);
          }
          
          if (result?.success) {
            successCount++;
          } else {
            failureCount++;
          }
        }
        console.log(`Email logs saved: success=${successCount}, failed=${failureCount}`);

        await updateEmailTask(taskId, {
          status: 'completed',
          endTime: new Date(),
          successCount: successCount,
          failureCount: failureCount,
        });

        return {
          success: true,
          taskId,
          sentCount: successCount,
          failedCount: failureCount,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to send emails',
        });
      }
    }),

  // Schedule Email Send
  scheduleEmails: protectedProcedure
    .input(
      z.object({
        templateId: z.number().int(),
        smtpConfigId: z.number().int(),
        dataFileKey: z.string().min(1),
        mappingFileKey: z.string().optional(),
        scheduledTime: z.string().or(z.date()),
        merchantColumn: z.string().default('商户名称'),
        emailColumn: z.string().default('收件人邮箱'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const template = await getEmailTemplate(input.templateId);
        const smtpConfig = await getSmtpConfig(input.smtpConfigId);

        if (!template || template.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template not found',
          });
        }

        if (!smtpConfig || smtpConfig.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'SMTP config not found',
          });
        }

        // Create task for tracking
        const scheduledDate = typeof input.scheduledTime === 'string' 
          ? new Date(input.scheduledTime) 
          : input.scheduledTime;

        const taskResult = await createEmailTask({
          userId: ctx.user.id,
          taskName: `Scheduled Send - ${scheduledDate.toLocaleString()}`,
          templateId: input.templateId,
          smtpConfigId: input.smtpConfigId,
          excelFileKey: input.dataFileKey,
          excelFileUrl: '',
          totalRecipients: 0,
          status: 'scheduled',
          scheduledTime: scheduledDate,
        });

        const taskId = (taskResult as any).insertId;

        const jobId = scheduleTask(
          new Date(scheduledDate),
          async () => {
            // This will be executed at scheduled time
            await updateEmailTask(taskId, { status: 'sending', startTime: new Date() });
          },
          taskId
        );

        await createScheduledJob({
          taskId,
          jobId,
          scheduledTime: scheduledDate,
          status: 'pending',
        });

        return { success: true, taskId, jobId };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to schedule emails',
        });
      }
    }),

  // Export & Download
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

        const headers = ['Recipient Email', 'Recipient Name', 'Status', 'Sent Time', 'Error Message'];
        const rows = logs.map((log) => [
          log.recipientEmail,
          log.recipientName || '',
          log.status,
          log.sentAt ? new Date(log.sentAt).toLocaleString() : '',
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
});
