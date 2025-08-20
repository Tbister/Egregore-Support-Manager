import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { createLogger } from '../utils/logger.js';
import path from 'path';

const execAsync = promisify(exec);
const log = createLogger('services:pdf');

interface ExtractResult {
  text: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    vendor?: string;
    family?: string;
    model?: string;
  };
}

export async function extractTextFromPdf(filePath: string): Promise<ExtractResult> {
  try {
    // First try with pdftotext
    const { text, pageCount } = await extractWithPdfToText(filePath);
    
    // If text is too short, try OCR
    if (text.length < 500) {
      log.info(`Text too short (${text.length} chars), attempting OCR for ${filePath}`);
      const ocrText = await extractWithOCR(filePath);
      if (ocrText.length > text.length) {
        return {
          text: ocrText,
          pageCount,
          metadata: extractMetadata(filePath, ocrText)
        };
      }
    }
    
    return {
      text,
      pageCount,
      metadata: extractMetadata(filePath, text)
    };
  } catch (error) {
    log.error(`Failed to extract text from ${filePath}:`, error);
    throw error;
  }
}

async function extractWithPdfToText(filePath: string): Promise<{ text: string; pageCount: number }> {
  try {
    // Extract text with layout preservation
    const { stdout: text } = await execAsync(`pdftotext -layout "${filePath}" -`);
    
    // Get page count
    const { stdout: pageInfo } = await execAsync(`pdfinfo "${filePath}" | grep "Pages:" | awk '{print $2}'`);
    const pageCount = parseInt(pageInfo.trim()) || 1;
    
    return { text, pageCount };
  } catch (error) {
    log.error('pdftotext failed:', error);
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractWithOCR(filePath: string): Promise<string> {
  try {
    // Note: This is a placeholder for OCR functionality
    // In production, you'd use Tesseract.js or another OCR library
    // For now, we'll use a system call to tesseract if available
    
    const tempDir = '/tmp/ocr_' + Date.now();
    await execAsync(`mkdir -p ${tempDir}`);
    
    // Convert PDF to images
    await execAsync(`pdftoppm -png "${filePath}" ${tempDir}/page`);
    
    // Run OCR on each image
    const { stdout: files } = await execAsync(`ls ${tempDir}/*.png`);
    const imageFiles = files.trim().split('\n').filter(Boolean);
    
    let fullText = '';
    for (const imageFile of imageFiles) {
      const { stdout: text } = await execAsync(`tesseract "${imageFile}" - --dpi 300`);
      fullText += text + '\n\n';
    }
    
    // Cleanup
    await execAsync(`rm -rf ${tempDir}`);
    
    return fullText;
  } catch (error) {
    log.warn('OCR failed, returning empty text:', error);
    return '';
  }
}

function extractMetadata(filePath: string, text: string): ExtractResult['metadata'] {
  const fileName = path.basename(filePath, path.extname(filePath));
  
  // Try to extract metadata from text content
  const metadata: ExtractResult['metadata'] = {};
  
  // Look for common patterns in the first 1000 characters
  const header = text.substring(0, 1000);
  
  // Try to find title
  const titleMatch = header.match(/^([A-Z][A-Za-z0-9\s\-]+)(?:\n|$)/m);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }
  
  // Look for vendor names
  const vendors = ['Honeywell', 'Johnson Controls', 'Siemens', 'Schneider', 'Trane', 'Carrier', 'Daikin'];
  for (const vendor of vendors) {
    if (header.toLowerCase().includes(vendor.toLowerCase())) {
      metadata.vendor = vendor;
      break;
    }
  }
  
  return metadata;
}