import {
  parseExcelFile,
  arrayToHtmlTable,
  calculateColumnSum,
  generateEmailContent,
  buildMerchantEmailMapping,
} from './excel';

/**
 * Email preview data structure
 */
export interface EmailPreview {
  to: string;
  subject: string;
  html: string;
  merchantName: string;
}

/**
 * Generate email previews from data file and template
 */
export async function generateEmailPreviews(
  dataFileBuffer: Buffer,
  templateSubject: string,
  templateBody: string,
  merchantEmailMapping?: Record<string, string[]>
): Promise<EmailPreview[]> {
  const dataFileParsed = await parseExcelFile(dataFileBuffer);

  if (!dataFileParsed.success) {
    throw new Error('Failed to parse data file: ' + (dataFileParsed as any).error);
  }

  if (!dataFileParsed.sheetNames || !dataFileParsed.sheets) {
    throw new Error('Invalid data file format: missing sheets or sheetNames');
  }
  
  // Validate sheets data structure
  if (typeof dataFileParsed.sheets !== 'object' || Array.isArray(dataFileParsed.sheets)) {
    throw new Error('Invalid sheets data structure: sheets must be an object');
  }
  
  // Filter out invalid sheet names
  const validSheetNames = dataFileParsed.sheetNames.filter(
    (name) => name && typeof name === 'string' && dataFileParsed.sheets[name]
  );
  
  if (validSheetNames.length === 0) {
    throw new Error('No valid sheets found in data file');
  }

  const previews: EmailPreview[] = [];

  // Build emails from data file - use validSheetNames instead of all sheetNames
  for (const sheetName of validSheetNames) {
    if (!sheetName || typeof sheetName !== 'string') {
      console.warn('Invalid sheet name encountered in preview generation');
      continue;
    }
    
    const sheetData = dataFileParsed.sheets[sheetName] || [];
    if (!Array.isArray(sheetData) || sheetData.length === 0) {
      console.warn(`Sheet ${sheetName} has no data for preview`);
      continue;
    }
    
    const emails = merchantEmailMapping?.[sheetName] || ['test@example.com'];

    // Generate data detail HTML table
    const dataDetailHtml = arrayToHtmlTable(sheetData);

    // Calculate settlement amount (sum of '金额' column)
    const settlementAmount = calculateColumnSum(sheetData, '金额');

    // Generate email content
    const emailContent = generateEmailContent(
      templateBody,
      dataDetailHtml,
      settlementAmount,
      sheetName
    );

    // Add email for each recipient
    for (const email of emails) {
      previews.push({
        to: email,
        subject: templateSubject.replace(/{merchantName}/g, sheetName).replace(/{{merchantName}}/g, sheetName),
        html: emailContent,
        merchantName: sheetName,
      });
    }
  }

  return previews;
}

/**
 * Generate preview for a single merchant
 */
export async function generateSingleEmailPreview(
  dataFileBuffer: Buffer,
  templateSubject: string,
  templateBody: string,
  merchantName: string,
  recipientEmail: string
): Promise<EmailPreview> {
  const dataFileParsed = await parseExcelFile(dataFileBuffer);

  if (!dataFileParsed.success) {
    throw new Error('Failed to parse data file: ' + (dataFileParsed as any).error);
  }

  if (!dataFileParsed.sheetNames || !dataFileParsed.sheets) {
    throw new Error('Invalid data file format: missing sheets or sheetNames');
  }

  const sheetData = dataFileParsed.sheets[merchantName] || [];

  // Generate data detail HTML table
  const dataDetailHtml = arrayToHtmlTable(sheetData);

  // Calculate settlement amount (sum of '金额' column)
  const settlementAmount = calculateColumnSum(sheetData, '金额');

  // Generate email content
  const emailContent = generateEmailContent(
    templateBody,
    dataDetailHtml,
    settlementAmount,
    merchantName
  );

  return {
    to: recipientEmail,
    subject: templateSubject.replace(/{merchantName}/g, merchantName).replace(/{{merchantName}}/g, merchantName),
    html: emailContent,
    merchantName,
  };
}
