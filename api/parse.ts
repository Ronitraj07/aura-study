// ============================================================
// File Parsing API Endpoint
// Extracts text content from uploaded files (PDF, DOCX, TXT, MD, Images)
// Uses Node.js runtime for better file handling support
// ============================================================

import { VercelRequest, VercelResponse } from '@vercel/node';
import { IncomingForm } from 'formidable';
import { readFile } from 'fs/promises';
import { tmpdir } from 'os';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
  api: {
    bodyParser: false, // Disable automatic body parsing for multipart
  },
};

// CORS helper
const setCORSHeaders = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.VERCEL_ENV === 'production'
    ? 'https://studyai-ronitraj.vercel.app'
    : 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

// Maximum file size (4MB - respects Vercel's 4.5MB edge limit with buffer)
const MAX_FILE_SIZE = 4 * 1024 * 1024;

interface ParseResult {
  success: boolean;
  content?: string;
  metadata?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    pages?: number;
    wordCount?: number;
    extractionMethod: string;
  };
  error?: string;
}

/**
 * Extract text from PDF using pdf-parse
 */
async function parsePDF(buffer: Buffer, fileName: string): Promise<ParseResult> {
  try {
    // Import pdf-parse lazily to avoid top-level test-file side-effects
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default as (
      dataBuffer: Buffer,
      options?: Record<string, unknown>
    ) => Promise<{ text: string; numpages: number; info: Record<string, unknown> }>;

    const data = await pdfParse(buffer, { max: 0 });
    const text = data.text?.trim() ?? '';

    if (!text) {
      return {
        success: false,
        error: 'Could not extract text from this PDF. The file may be scanned/image-only.',
      };
    }

    return {
      success: true,
      content: text,
      metadata: {
        fileName,
        fileType: 'application/pdf',
        fileSize: buffer.length,
        pages: data.numpages,
        wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
        extractionMethod: 'pdf-parse',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract text from DOCX files using mammoth
 */
async function parseDOCX(buffer: Buffer, fileName: string): Promise<ParseResult> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim() ?? '';

    if (!text) {
      return {
        success: false,
        error: 'Could not extract text from this DOCX file.',
      };
    }

    return {
      success: true,
      content: text,
      metadata: {
        fileName,
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: buffer.length,
        wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
        extractionMethod: 'mammoth',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `DOCX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract text from plain text files
 */
async function parseText(buffer: Buffer, fileName: string, fileType: string): Promise<ParseResult> {
  try {
    // Try UTF-8 first, fall back to latin1
    let text: string;
    try {
      text = buffer.toString('utf-8');
      // Verify it's valid UTF-8
      if (text.includes('\ufffd')) {
        text = buffer.toString('latin1');
      }
    } catch {
      text = buffer.toString('latin1');
    }
    
    return {
      success: true,
      content: text,
      metadata: {
        fileName,
        fileType,
        fileSize: buffer.length,
        wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
        extractionMethod: 'text-decoder'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Text parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Extract text from images using OCR - placeholder for Tesseract.js
 */
async function parseImage(buffer: Buffer, fileName: string, fileType: string): Promise<ParseResult> {
  try {
    // TODO: Integrate Tesseract.js or similar for OCR
    const text = 'Image OCR not implemented. Upload a text-based file instead.';
    
    return {
      success: true,
      content: text,
      metadata: {
        fileName,
        fileType,
        fileSize: buffer.length,
        wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
        extractionMethod: 'ocr-placeholder'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Image parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Route file to appropriate parser based on MIME type
 */
async function parseFile(buffer: Buffer, fileName: string, contentType: string): Promise<ParseResult> {
  switch (contentType) {
    case 'application/pdf':
      return parsePDF(buffer, fileName);
      
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseDOCX(buffer, fileName);
      
    case 'text/plain':
    case 'text/markdown':
      return parseText(buffer, fileName, contentType);
      
    case 'image/jpeg':
    case 'image/png':
    case 'image/webp':
      return parseImage(buffer, fileName, contentType);
      
    default:
      return {
        success: false,
        error: `Unsupported file type: ${contentType}. Supported: PDF, DOCX, TXT, MD, JPG, PNG, WebP`
      };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORSHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the incoming form data using formidable
    const form = new IncomingForm({
      uploadDir: tmpdir(),
      keepExtensions: true,
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: 1,
    });

    const [fields, files] = await form.parse(req);
    
    // Get the first (and only) file from the files object
    const fileArray = files['file'];
    if (!fileArray || fileArray.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file provided. Use form field name "file".' 
      });
    }

    const file = fileArray[0];
    const fileName = file.originalFilename || 'unknown';
    const fileType = file.mimetype || 'application/octet-stream';
    
    console.log(`📄 Parsing file: ${fileName} (${fileType}, ${Math.round(file.size / 1024)}KB)`);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        success: false, 
        error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB` 
      });
    }

    // Validate file type
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!supportedTypes.includes(fileType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Unsupported file type: ${fileType}. Supported: PDF, DOCX, TXT, MD, JPG, PNG, WebP`
      });
    }

    // Read file from temporary location
    const buffer = await readFile(file.filepath);
    
    // Parse the file
    const result = await parseFile(buffer, fileName, fileType);

    if (!result.success) {
      return res.status(500).json(result);
    }

    console.log(`✅ Successfully parsed ${fileName} - ${result.metadata?.wordCount} words`);

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ File parsing error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('too large')) {
        return res.status(413).json({ 
          success: false, 
          error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB` 
        });
      }
    }
    
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
