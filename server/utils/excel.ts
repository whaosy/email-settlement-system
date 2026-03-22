import * as XLSX from 'xlsx';

/**
 * Parse Excel file buffer and extract sheet data
 */
export async function parseExcelFile(buffer: Buffer | Uint8Array) {
  try {
    // Validate buffer
    if (!buffer || (Buffer.isBuffer(buffer) && buffer.length === 0) || (buffer instanceof Uint8Array && buffer.length === 0)) {
      throw new Error('Buffer is empty or invalid');
    }
    
    // Convert Uint8Array to Buffer if needed
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    
    // Read workbook with error handling
    let workbook;
    try {
      workbook = XLSX.read(buf, { type: 'buffer' });
    } catch (parseError) {
      throw new Error(`Failed to parse Excel file: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    // Validate workbook structure
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel file has no sheets or is empty');
    }
    
    const sheets: Record<string, any[]> = {};
    
    for (const sheetName of workbook.SheetNames) {
      if (!sheetName || typeof sheetName !== 'string') {
        console.warn('Skipping invalid sheet name:', sheetName);
        continue;
      }
      
      try {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          console.warn(`Sheet ${sheetName} not found in workbook`);
          continue;
        }
        
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        // Validate data is an array
        if (!Array.isArray(data)) {
          console.warn(`Sheet ${sheetName} data is not an array`);
          sheets[sheetName] = [];
        } else {
          sheets[sheetName] = data;
        }
      } catch (sheetError) {
        console.error(`Error parsing sheet ${sheetName}:`, sheetError);
        sheets[sheetName] = [];
      }
    }
    
    return {
      success: true,
      sheets,
      sheetNames: workbook.SheetNames.filter((name) => name && typeof name === 'string'),
    };
  } catch (error) {
    console.error('Excel parsing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse Excel file',
    };
  }
}

/**
 * Extract field columns from Excel data
 */
export function extractColumns(data: any[]): string[] {
  if (data.length === 0) return [];
  return Object.keys(data[0]);
}

/**
 * Replace template variables with actual values
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, any>
): string {
  let result = template;
  
  // Replace {{variable}} format
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value || ''));
  }
  
  // Also support {variable} format for backward compatibility
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, String(value || ''));
  }
  
  return result;
}

/**
 * Extract variables from template string
 */
export function extractTemplateVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}|\{(\w+)\}/g;
  const variables = new Set<string>();
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    const variable = match[1] || match[2];
    if (variable) {
      variables.add(variable);
    }
  }
  
  return Array.from(variables);
}

/**
 * Convert array of objects to HTML table
 */
export function arrayToHtmlTable(data: any[]): string {
  if (data.length === 0) {
    return '<p>无数据</p>';
  }
  
  const headers = Object.keys(data[0]);
  let html = '<table style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">';
  
  // Header row
  html += '<thead><tr style="background-color: #f5f5f5;">';
  for (const header of headers) {
    html += `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${escapeHtml(String(header))}</th>`;
  }
  html += '</tr></thead>';
  
  // Data rows
  html += '<tbody>';
  for (const row of data) {
    html += '<tr>';
    for (const header of headers) {
      const value = row[header] ?? '';
      html += `<td style="border: 1px solid #ddd; padding: 8px;">${escapeHtml(String(value))}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  
  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parse multiple emails from string (separated by comma or semicolon)
 */
export function parseEmails(emailString: string): string[] {
  return emailString
    .split(/[,;]/)
    .map((email) => email.trim())
    .filter((email) => isValidEmail(email));
}

/**
 * Build merchant to email mapping from mapping file
 */
export function buildMerchantEmailMapping(
  mappingData: any[],
  merchantColumn: string = '商户名称',
  emailColumn: string = '收件人邮箱'
): Record<string, string[]> {
  const mapping: Record<string, string[]> = {};
  
  for (const row of mappingData) {
    const merchantName = row[merchantColumn]?.toString().trim();
    const emailStr = row[emailColumn]?.toString().trim();
    
    if (merchantName && emailStr) {
      const emails = parseEmails(emailStr);
      if (emails.length > 0) {
        mapping[merchantName] = emails;
      }
    }
  }
  
  return mapping;
}

/**
 * Calculate sum of a specific column in data array
 */
export function calculateColumnSum(data: any[], columnName: string): number {
  let sum = 0;
  for (const row of data) {
    const value = row[columnName];
    if (value !== null && value !== undefined && value !== '') {
      const numValue = parseFloat(String(value));
      if (!isNaN(numValue)) {
        sum += numValue;
      }
    }
  }
  return sum;
}

/**
 * Generate email content with data detail and settlement amount
 * Supports both {placeholder} and {{placeholder}} formats
 */
export function generateEmailContent(
  templateBody: string,
  dataDetail: string,
  settlementAmount: number,
  merchantName?: string
): string {
  let content = templateBody;
  
  // Replace {dataDetail} and {{dataDetail}}
  content = content.replace(/{dataDetail}/g, dataDetail);
  content = content.replace(/{{dataDetail}}/g, dataDetail);
  
  // Replace {settlementAmount} and {{settlementAmount}}
  const formattedAmount = settlementAmount.toFixed(2);
  content = content.replace(/{settlementAmount}/g, formattedAmount);
  content = content.replace(/{{settlementAmount}}/g, formattedAmount);
  
  // Replace {merchantName} and {{merchantName}} if provided
  if (merchantName) {
    content = content.replace(/{merchantName}/g, merchantName);
    content = content.replace(/{{merchantName}}/g, merchantName);
  }
  
  // Replace {currentDate} and {{currentDate}}
  const currentDate = new Date().toLocaleDateString('zh-CN');
  content = content.replace(/{currentDate}/g, currentDate);
  content = content.replace(/{{currentDate}}/g, currentDate);
  
  return content;
}
