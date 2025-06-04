/// <reference path="../_shared/deno.d.ts" />
/**
 * Extract embeddings Edge Function
 * Purpose: Process uploaded documents, extract text, chunk content, generate embeddings via Groq API
 * Input: { filePath, fileName, userId, documentId }
 * Output: { success: boolean, documentId: string, message?: string }
 */

import { createSupabaseAdmin, logger } from '../_shared/supabase.ts';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_EMBEDDING_MODEL = 'nomic-embed-text-v1.5'; // Correct embedding model
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let requestData: any = {};
  
  try {
    requestData = await req.json();
    const { filePath, fileName, userId, documentId } = requestData;
    
    logger('info', 'Starting document processing', { 
      documentId, 
      fileName, 
      userId 
    });

    // Verify user session
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user || user.id !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update document status to processing
    await supabaseAdmin
      .from('documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('documents')
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'File not found'}`);
    }

    // Extract text based on file type
    const fileBuffer = await fileData.arrayBuffer();
    const textContent = await extractTextFromFile(fileBuffer, fileName);
    
    if (!textContent || textContent.trim().length === 0) {
      throw new Error('No text content extracted from file');
    }

    // Split text into chunks
    const chunks = splitTextIntoChunks(textContent, CHUNK_SIZE, CHUNK_OVERLAP);
    
    if (chunks.length === 0) {
      throw new Error('No chunks created from text content');
    }

    logger('info', 'Text extracted and chunked', { 
      documentId, 
      textLength: textContent.length,
      chunkCount: chunks.length 
    });

    // Generate embeddings for chunks in batches
    const embeddings = await generateEmbeddingsForChunks(chunks);

    // Store chunks with embeddings
    const chunkRecords = chunks.map((chunk, index) => ({
      document_id: documentId,
      chunk_text: chunk,
      chunk_embedding: embeddings[index],
      chunk_index: index,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('document_chunks')
      .insert(chunkRecords);

    if (insertError) {
      throw new Error(`Failed to store chunks: ${insertError.message}`);
    }

    // Update document status to completed
    await supabaseAdmin
      .from('documents')
      .update({ processing_status: 'completed' })
      .eq('id', documentId);

    logger('info', 'Document processing completed', { 
      documentId, 
      chunksStored: chunks.length 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      documentId,
      chunksProcessed: chunks.length 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const err = error as Error;
    logger('error', 'Document processing failed', { 
      error: err.message,
      stack: err.stack 
    });

    // Update document status to error if we have documentId
    try {
      const { documentId } = requestData;
      if (documentId) {
        const supabaseAdmin = createSupabaseAdmin();
        await supabaseAdmin
          .from('documents')
          .update({ processing_status: 'error' })
          .eq('id', documentId);
      }
    } catch (updateError) {
      logger('error', 'Failed to update document status to error', { 
        error: (updateError as Error).message 
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Extract text from file buffer based on file type
 * @param fileBuffer - File buffer
 * @param fileName - Original file name
 * @returns Extracted text
 */
async function extractTextFromFile(fileBuffer: ArrayBuffer, fileName: string): Promise<string> {
  const extension = fileName.toLowerCase().split('.').pop();
  
  if (extension === 'txt') {
    return new TextDecoder().decode(fileBuffer);
  }
  
  if (extension === 'pdf') {
    // For PDF, we'd need a PDF parsing library
    // For now, return placeholder - in production, use pdf-parse or similar
    logger('warning', 'PDF parsing not implemented, using placeholder text');
    return 'PDF content would be extracted here using a PDF parsing library.';
  }
  
  if (extension === 'docx') {
    // For DOCX, we'd need a DOCX parsing library
    // For now, return placeholder - in production, use mammoth or similar
    logger('warning', 'DOCX parsing not implemented, using placeholder text');
    return 'DOCX content would be extracted here using a DOCX parsing library.';
  }
  
  throw new Error(`Unsupported file type: ${extension}`);
}

/**
 * Split text into overlapping chunks
 * @param text - Text to split
 * @param chunkSize - Target chunk size in characters
 * @param overlap - Overlap between chunks
 * @returns Array of text chunks
 */
function splitTextIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;
    
    if (currentChunk.length + trimmedSentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      
      // Start new chunk with overlap
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 5)); // Approximate word-based overlap
      currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
    } else {
      currentChunk += ' ' + trimmedSentence;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 10); // Filter out very short chunks
}

/**
 * Generate embeddings for text chunks using Groq API
 * @param chunks - Text chunks
 * @returns Array of embedding vectors
 */
async function generateEmbeddingsForChunks(chunks: string[]): Promise<number[][]> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable not set');
  }

  const embeddings: number[][] = [];
  const batchSize = 10; // Process in smaller batches to avoid rate limits
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    
    try {
      const response = await fetch('https://api.groq.com/openai/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_EMBEDDING_MODEL,
          input: batch,
          encoding_format: 'float',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger('error', 'Groq API error', { 
          status: response.status, 
          error: errorText 
        });
        
        if (response.status === 429) {
          // Rate limit - wait and retry
          await new Promise(resolve => setTimeout(resolve, 2000));
          i -= batchSize; // Retry this batch
          continue;
        }
        
        throw new Error(`Groq API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const batchEmbeddings: number[][] = data.data.map((item: any) => item.embedding);
      embeddings.push(...batchEmbeddings);
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      logger('error', 'Failed to generate embeddings for batch', { 
        batchStart: i, 
        error: (error as Error).message 
      });
      throw error;
    }
  }
  
  return embeddings;
}
