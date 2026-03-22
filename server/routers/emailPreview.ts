import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import {
  getEmailTemplate,
  getSmtpConfig,
} from '../db';
import { generateEmailPreviews, generateSingleEmailPreview } from '../utils/emailPreview';
import { buildMerchantEmailMapping, parseExcelFile } from '../utils/excel';
import { storageFetch } from '../storage';

export const emailPreviewRouter = router({
  // Generate email previews
  generatePreviews: protectedProcedure
    .input(
      z.object({
        templateId: z.number().int(),
        dataFileKey: z.string().min(1),
        mappingFileKey: z.string().optional(),
        merchantColumn: z.string().default('商户名称'),
        emailColumn: z.string().default('收件人邮箱'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const template = await getEmailTemplate(input.templateId);

        if (!template || template.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template not found',
          });
        }

        // Fetch data file from storage
        console.log('Fetching data file from storage:', input.dataFileKey);
        const dataFileBuffer = await storageFetch(input.dataFileKey);
        if (!dataFileBuffer || dataFileBuffer.byteLength === 0) {
          throw new Error('Data file is empty or invalid');
        }

        // Parse mapping file if provided
        let merchantEmailMapping: Record<string, string[]> = {};
        if (input.mappingFileKey) {
          console.log('Fetching mapping file from storage:', input.mappingFileKey);
          try {
            const mappingFileBuffer = await storageFetch(input.mappingFileKey);
            if (mappingFileBuffer && mappingFileBuffer.byteLength > 0) {
              const mappingFileParsed = await parseExcelFile(mappingFileBuffer);
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
          } catch (mappingError) {
            console.warn('Error processing mapping file:', mappingError);
          }
        }

        // Generate previews
        const previews = await generateEmailPreviews(
          dataFileBuffer,
          template.subject,
          template.body,
          merchantEmailMapping
        );

        return {
          success: true,
          previews,
          totalCount: previews.length,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate previews',
        });
      }
    }),

  // Generate single email preview
  generateSinglePreview: protectedProcedure
    .input(
      z.object({
        templateId: z.number().int(),
        dataFileKey: z.string().min(1),
        merchantName: z.string().min(1),
        recipientEmail: z.string().email(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const template = await getEmailTemplate(input.templateId);

        if (!template || template.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template not found',
          });
        }

        // Fetch data file from storage
        console.log('Fetching data file from storage:', input.dataFileKey);
        const dataFileBuffer = await storageFetch(input.dataFileKey);
        if (!dataFileBuffer || dataFileBuffer.byteLength === 0) {
          throw new Error('Data file is empty or invalid');
        }

        // Generate preview
        const preview = await generateSingleEmailPreview(
          dataFileBuffer,
          template.subject,
          template.body,
          input.merchantName,
          input.recipientEmail
        );

        return {
          success: true,
          preview,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate preview',
        });
      }
    }),
});
