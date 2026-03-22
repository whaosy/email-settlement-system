import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  arrayToHtmlTable,
  calculateColumnSum,
  generateEmailContent,
  buildMerchantEmailMapping,
  parseEmails,
  isValidEmail,
} from './utils/excel';

describe('Email Utilities', () => {
  describe('arrayToHtmlTable', () => {
    it('should convert empty array to empty message', () => {
      const result = arrayToHtmlTable([]);
      expect(result).toContain('无数据');
    });

    it('should convert array of objects to HTML table', () => {
      const data = [
        { 商户名称: '商户A', 金额: 100 },
        { 商户名称: '商户B', 金额: 200 },
      ];
      const result = arrayToHtmlTable(data);
      expect(result).toContain('<table');
      expect(result).toContain('商户A');
      expect(result).toContain('100');
      expect(result).toContain('商户B');
      expect(result).toContain('200');
    });

    it('should escape HTML special characters', () => {
      const data = [{ content: '<script>alert("xss")</script>' }];
      const result = arrayToHtmlTable(data);
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });
  });

  describe('calculateColumnSum', () => {
    it('should return 0 for empty array', () => {
      const result = calculateColumnSum([], '金额');
      expect(result).toBe(0);
    });

    it('should sum numeric values in column', () => {
      const data = [
        { 金额: 100 },
        { 金额: 200 },
        { 金额: 300 },
      ];
      const result = calculateColumnSum(data, '金额');
      expect(result).toBe(600);
    });

    it('should handle string numbers', () => {
      const data = [
        { 金额: '100' },
        { 金额: '200.5' },
      ];
      const result = calculateColumnSum(data, '金额');
      expect(result).toBe(300.5);
    });

    it('should skip non-numeric values', () => {
      const data = [
        { 金额: 100 },
        { 金额: 'N/A' },
        { 金额: 200 },
      ];
      const result = calculateColumnSum(data, '金额');
      expect(result).toBe(300);
    });

    it('should handle missing column', () => {
      const data = [
        { 商户: 'A' },
        { 商户: 'B' },
      ];
      const result = calculateColumnSum(data, '金额');
      expect(result).toBe(0);
    });
  });

  describe('generateEmailContent', () => {
    it('should replace {dataDetail} placeholder', () => {
      const template = '结算详情：{dataDetail}';
      const dataDetail = '<table>...</table>';
      const result = generateEmailContent(template, dataDetail, 100);
      expect(result).toContain('<table>...</table>');
    });

    it('should replace {{dataDetail}} placeholder', () => {
      const template = '结算详情：{{dataDetail}}';
      const dataDetail = '<table>...</table>';
      const result = generateEmailContent(template, dataDetail, 100);
      expect(result).toContain('<table>...</table>');
    });

    it('should replace {settlementAmount} placeholder', () => {
      const template = '结算金额：{settlementAmount}元';
      const result = generateEmailContent(template, '', 123.456);
      expect(result).toContain('123.46');
    });

    it('should replace {{settlementAmount}} placeholder', () => {
      const template = '结算金额：{{settlementAmount}}元';
      const result = generateEmailContent(template, '', 123.456);
      expect(result).toContain('123.46');
    });

    it('should replace {merchantName} placeholder', () => {
      const template = '尊敬的{merchantName}商户';
      const result = generateEmailContent(template, '', 0, '商户A');
      expect(result).toContain('商户A');
    });

    it('should replace {{merchantName}} placeholder', () => {
      const template = '尊敬的{{merchantName}}商户';
      const result = generateEmailContent(template, '', 0, '商户A');
      expect(result).toContain('商户A');
    });

    it('should replace {currentDate} placeholder', () => {
      const template = '日期：{currentDate}';
      const result = generateEmailContent(template, '', 0);
      expect(result).toContain('日期：');
      expect(result).not.toContain('{currentDate}');
    });

    it('should replace {{currentDate}} placeholder', () => {
      const template = '日期：{{currentDate}}';
      const result = generateEmailContent(template, '', 0);
      expect(result).toContain('日期：');
      expect(result).not.toContain('{{currentDate}}');
    });

    it('should replace multiple placeholders', () => {
      const template = '商户{merchantName}的结算金额为{settlementAmount}元，详情如下：{dataDetail}';
      const result = generateEmailContent(
        template,
        '<table>data</table>',
        100.5,
        '商户A'
      );
      expect(result).toContain('商户A');
      expect(result).toContain('100.50');
      expect(result).toContain('<table>data</table>');
    });
  });

  describe('buildMerchantEmailMapping', () => {
    it('should build mapping from data array', () => {
      const data = [
        { 商户名称: '商户A', 收件人邮箱: 'a@example.com' },
        { 商户名称: '商户B', 收件人邮箱: 'b@example.com' },
      ];
      const result = buildMerchantEmailMapping(data);
      expect(result['商户A']).toEqual(['a@example.com']);
      expect(result['商户B']).toEqual(['b@example.com']);
    });

    it('should handle multiple emails separated by comma', () => {
      const data = [
        { 商户名称: '商户A', 收件人邮箱: 'a1@example.com,a2@example.com' },
      ];
      const result = buildMerchantEmailMapping(data);
      expect(result['商户A']).toEqual(['a1@example.com', 'a2@example.com']);
    });

    it('should handle multiple emails separated by semicolon', () => {
      const data = [
        { 商户名称: '商户A', 收件人邮箱: 'a1@example.com;a2@example.com' },
      ];
      const result = buildMerchantEmailMapping(data);
      expect(result['商户A']).toEqual(['a1@example.com', 'a2@example.com']);
    });

    it('should skip invalid emails', () => {
      const data = [
        { 商户名称: '商户A', 收件人邮箱: 'valid@example.com,invalid' },
      ];
      const result = buildMerchantEmailMapping(data);
      expect(result['商户A']).toEqual(['valid@example.com']);
    });

    it('should skip rows with missing data', () => {
      const data = [
        { 商户名称: '商户A', 收件人邮箱: 'a@example.com' },
        { 商户名称: '', 收件人邮箱: 'b@example.com' },
        { 商户名称: '商户C', 收件人邮箱: '' },
      ];
      const result = buildMerchantEmailMapping(data);
      expect(result['商户A']).toBeDefined();
      expect(result['']).toBeUndefined();
      expect(result['商户C']).toBeUndefined();
    });

    it('should use custom column names', () => {
      const data = [
        { 商家: '商户A', 邮箱: 'a@example.com' },
      ];
      const result = buildMerchantEmailMapping(data, '商家', '邮箱');
      expect(result['商户A']).toEqual(['a@example.com']);
    });
  });

  describe('parseEmails', () => {
    it('should parse single email', () => {
      const result = parseEmails('test@example.com');
      expect(result).toEqual(['test@example.com']);
    });

    it('should parse comma-separated emails', () => {
      const result = parseEmails('a@example.com,b@example.com');
      expect(result).toEqual(['a@example.com', 'b@example.com']);
    });

    it('should parse semicolon-separated emails', () => {
      const result = parseEmails('a@example.com;b@example.com');
      expect(result).toEqual(['a@example.com', 'b@example.com']);
    });

    it('should trim whitespace', () => {
      const result = parseEmails('a@example.com , b@example.com');
      expect(result).toEqual(['a@example.com', 'b@example.com']);
    });

    it('should filter invalid emails', () => {
      const result = parseEmails('valid@example.com,invalid,another@test.com');
      expect(result).toEqual(['valid@example.com', 'another@test.com']);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('invalid @example.com')).toBe(false);
    });
  });
});
