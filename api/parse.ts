// ============================================================
// File Parsing API Endpoint
// Extracts text content from uploaded files (PDF, DOCX, TXT, MD, Images)
// Uses Node.js runtime for better file handling support
// ============================================================

<<<<<<< HEAD
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
=======
export const config = { runtime: 'edge' };

declare const process: { env: Record<string, string | undefined> };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.VERCEL_ENV === 'production'
>>>>>>> efd5f43cc36ae2dfb45175d048a4a68607c7bb88
    ? 'https://studyai-ronitraj.vercel.app'
    : 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

<<<<<<< HEAD
/**
 * Extract text from PDF - placeholder for future integration with pdf-parse
 */
async function parsePDF(buffer: Buffer, fileName: string): Promise<ParseResult> {
  try {
    // TODO: In production, integrate pdf-parse or pdfjs-dist for actual PDF parsing
    // For now, return placeholder with file info
    const text = 'PDF parsing requires external library. Supported file types: TXT, MD, DOCX detection via filename.';
    
=======
async function parsePDF(buffer: ArrayBuffer, fileName: string): Promise<ParseResult> {
  try {
    const text = 'PDF parsing not yet implemented in Edge runtime. Please convert to text format.';
>>>>>>> efd5f43cc36ae2dfb45175d048a4a68607c7bb88
    return {
      success: true,
      content: text,
      metadata: {
        fileName,
        fileType: 'application/pdf',
        fileSize: buffer.length,
        wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
        extractionMethod: 'pdf-placeholder'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

<<<<<<< HEAD
/**
 * Extract text from DOCX files - placeholder for future integration with mammoth
 */
async function parseDOCX(buffer: Buffer, fileName: string): Promise<ParseResult> {
  try {
    // TODO: In production, integrate mammoth.js for DOCX parsing
    const text = 'DOCX parsing requires external library (mammoth.js recommended).';
    
=======
async function parseDOCX(buffer: ArrayBuffer, fileName: string): Promise<ParseResult> {
  try {
    const text = 'DOCX parsing not yet implemented in Edge runtime. Please convert to text format.';
>>>>>>> efd5f43cc36ae2dfb45175d048a4a68607c7bb88
    return {
      success: true,
      content: text,
      metadata: {
        fileName,
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: buffer.length,
        wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
        extractionMethod: 'docx-placeholder'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `DOCX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

<<<<<<< HEAD
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
    
=======
async function parseText(buffer: ArrayBuffer, fileName: string, fileType: string): Promise<ParseResult> {
  try {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(buffer);
>>>>>>> efd5f43cc36ae2dfb45175d048a4a68607c7bb88
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

<<<<<<< HEAD
/**
 * Extract text from images using OCR - placeholder for Tesseract.js
 */
async function parseImage(buffer: Buffer, fileName: string, fileType: string): Promise<ParseResult> {
  try {
    // TODO: Integrate Tesseract.js or similar for OCR
    const text = 'Image OCR not implemented. Upload a text-based file instead.';
    
=======
async function parseImage(buffer: ArrayBuffer, fileName: string, fileType: string): Promise<ParseResult> {
  try {
    const text = 'Image OCR not yet implemented. Please convert image to text format.';
>>>>>>> efd5f43cc36ae2dfb45175d048a4a68607c7bb88
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

<<<<<<< HEAD
/**
 * Route file to appropriate parser based on MIME type
 */
async function parseFile(buffer: Buffer, fileName: string, contentType: string): Promise<ParseResult> {
=======
async function parseFile(buffer: ArrayBuffer, fileName: string, contentType: string): Promise<ParseResult> {
>>>>>>> efd5f43cc36ae2dfb45175d048a4a68607c7bb88
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

<<<<<<< HEAD
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
=======
    if (!file) {
      return new Response(JSON.stringify({ success: false, error: 'No file provided' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({
        success: false,
        error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`
      }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
>>>>>>> efd5f43cc36ae2dfb45175d048a4a68607c7bb88
      });
    }

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

<<<<<<< HEAD
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
=======
    if (!supportedTypes.includes(file.type)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Unsupported file type: ${file.type}`
      }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📄 Parsing file: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)`);
    const buffer = await file.arrayBuffer();
    const result = await parseFile(buffer, file.name, file.type);
>>>>>>> efd5f43cc36ae2dfb45175d048a4a68607c7bb88

    if (!result.success) {
      return res.status(500).json(result);
    }

<<<<<<< HEAD
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
=======
    console.log(`✅ Successfully parsed ${file.name} - ${result.metadata?.wordCount} words`);
    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ File parsing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
>>>>>>> efd5f43cc36ae2dfb45175d048a4a68607c7bb88
    });
  }
}
