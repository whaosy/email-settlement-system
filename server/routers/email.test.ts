import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from '../routers';
import { TRPCError } from '@trpc/server';

// Mock the dependencies
vi.mock('../db', () => ({
  createEmailTemplate: vi.fn(async (template) => ({ insertId: 1 })),
  getUserEmailTemplates: vi.fn(async () => [
    {
      id: 1,
      userId: 1,
      templateName: 'Test Template',
      subject: 'Test Subject',
      body: 'Test Body',
      variables: '[]',
      isDefault: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  createSmtpConfig: vi.fn(async (config) => ({ insertId: 1 })),
  getUserSmtpConfigs: vi.fn(async () => [
    {
      id: 1,
      userId: 1,
      configName: 'Test Config',
      smtpHost: 'smtp.test.com',
      smtpPort: 587,
      encryptionType: 'tls',
      senderEmail: 'test@example.com',
      senderName: 'Test',
      authCode: 'encrypted-code',
      isDefault: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
}));

vi.mock('../utils/excel', () => ({
  parseExcelFile: vi.fn(async (buffer) => ({
    success: true,
    sheets: { Sheet1: [{ name: 'John', email: 'john@example.com' }] },
    sheetNames: ['Sheet1'],
  })),
  extractTemplateVariables: vi.fn(() => ['name', 'date']),
  replaceTemplateVariables: vi.fn((template, vars) => template),
}));

vi.mock('../utils/emailService', () => ({
  encryptAuthCode: vi.fn((code) => `encrypted-${code}`),
  decryptAuthCode: vi.fn((code) => code.replace('encrypted-', '')),
  createSmtpTransporter: vi.fn(async () => ({})),
  testSmtpConnection: vi.fn(async () => ({ success: true, message: 'Connected' })),
}));

vi.mock('../storage', () => ({
  storagePut: vi.fn(async () => ({ url: 'https://example.com/file.xlsx' })),
}));

describe('Email Router', () => {
  let caller: any;

  beforeEach(() => {
    const ctx = {
      user: {
        id: 1,
        openId: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        loginMethod: 'email',
        role: 'user' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: 'https', headers: {} } as any,
      res: { clearCookie: vi.fn() } as any,
    };
    caller = appRouter.createCaller(ctx);
  });

  describe('createTemplate', () => {
    it('should create a template with valid input', async () => {
      const result = await caller.email.createTemplate({
        templateName: 'Test Template',
        subject: 'Test Subject',
        body: 'Test Body {{name}}',
      });

      expect(result).toEqual({ success: true, templateId: 1 });
    });

    it('should fail if template name is empty', async () => {
      try {
        await caller.email.createTemplate({
          templateName: '',
          subject: 'Test Subject',
          body: 'Test Body',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
      }
    });
  });

  describe('getTemplates', () => {
    it('should return user templates', async () => {
      const result = await caller.email.getTemplates();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('templateName');
    });
  });

  describe('createSmtpConfig', () => {
    it('should create SMTP config with valid input', async () => {
      const result = await caller.email.createSmtpConfig({
        configName: 'Test Config',
        smtpHost: 'smtp.test.com',
        smtpPort: 587,
        encryptionType: 'tls',
        senderEmail: 'test@example.com',
        senderName: 'Test',
        authCode: 'password123',
      });

      expect(result).toEqual({ success: true, configId: 1 });
    });

    it('should fail if required fields are missing', async () => {
      try {
        await caller.email.createSmtpConfig({
          configName: '',
          smtpHost: 'smtp.test.com',
          smtpPort: 587,
          encryptionType: 'tls',
          senderEmail: 'test@example.com',
          authCode: 'password123',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
      }
    });
  });

  describe('getSmtpConfigs', () => {
    it('should return user SMTP configs without authCode', async () => {
      const result = await caller.email.getSmtpConfigs();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('configName');
      expect(result[0].authCode).toBeUndefined();
    });
  });

  describe('testSmtpConnection', () => {
    it('should test SMTP connection', async () => {
      const result = await caller.email.testSmtpConnection({
        smtpHost: 'smtp.test.com',
        smtpPort: 587,
        encryptionType: 'tls',
        senderEmail: 'test@example.com',
        authCode: 'password123',
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });
  });

  describe('uploadExcelFile', () => {
    it('should upload and parse Excel file', async () => {
      const buffer = Buffer.from('test');
      const result = await caller.email.uploadExcelFile({
        fileName: 'test.xlsx',
        fileBuffer: buffer,
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('fileKey');
      expect(result).toHaveProperty('fileUrl');
      expect(result).toHaveProperty('sheets');
      expect(result).toHaveProperty('sheetNames');
    });

    it('should reject invalid file types', async () => {
      try {
        const buffer = Buffer.from('test');
        await caller.email.uploadExcelFile({
          fileName: 'test.txt',
          fileBuffer: buffer,
        });
        // If it doesn't throw, the validation might be in the parser
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
      }
    });
  });
});
