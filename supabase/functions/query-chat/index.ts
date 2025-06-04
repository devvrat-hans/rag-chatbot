/// <reference path="../_shared/deno.d.ts" />
/**
 * Query chat Edge Function
 * Purpose: RAG pipeline - retrieve relevant chunks and generate chat response
 * Input: { query, userId }
 * Output: { answer: string, sourceChunks: Array<{chunkId, score}> }
 */

import { createSupabaseAdmin, logger } from '../_shared/supabase.ts';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_CHAT_MODEL = 'llama-3.1-70b-versatile'; // Correct chat model
const GROQ_EMBEDDING_MODEL = 'nomic-embed-text-v1.5'; // Correct embedding model

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { query, userId } = await req.json();
    
    if (!query || !userId) {
      return new Response(JSON.stringify({ error: 'Missing query or userId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    logger('info', 'Processing chat query', { userId, queryLength: query.length });

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

    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);

    // Perform vector search for relevant chunks
    const relevantChunks = await findRelevantChunks(supabaseAdmin, queryEmbedding, userId);

    if (relevantChunks.length === 0) {
      return new Response(JSON.stringify({
        answer: "I couldn't find any relevant information in your documents to answer this question. Please make sure you have uploaded documents and they have been processed.",
        sourceChunks: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate chat response using retrieved context
    const answer = await generateChatResponse(query, relevantChunks);

    logger('info', 'Chat query completed', { 
      userId, 
      chunksFound: relevantChunks.length,
      answerLength: answer.length 
    });

    return new Response(JSON.stringify({
      answer,
      sourceChunks: relevantChunks.map(chunk => ({
        chunkId: chunk.id,
        score: chunk.similarity
      }))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const err = error as Error;
    logger('error', 'Chat query failed', { 
      error: err.message,
      stack: err.stack 
    });

    return new Response(JSON.stringify({ 
      error: 'Failed to process query. Please try again.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Generate embedding for user query
 * @param query - User query text
 * @returns Query embedding vector
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable not set');
  }

  const response = await fetch('https://api.groq.com/openai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_EMBEDDING_MODEL,
      input: [query],
      encoding_format: 'float',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger('error', 'Failed to generate query embedding', { 
      status: response.status, 
      error: errorText 
    });
    throw new Error(`Failed to generate query embedding: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Find relevant document chunks using vector similarity search
 * @param supabaseAdmin - Supabase admin client
 * @param queryEmbedding - Query embedding vector
 * @param userId - User ID for filtering
 * @returns Relevant chunks with similarity scores
 */
async function findRelevantChunks(supabaseAdmin: any, queryEmbedding: number[], userId: string): Promise<any[]> {
  // Get user's documents first
  const { data: userDocuments, error: docsError } = await supabaseAdmin
    .from('documents')
    .select('id')
    .eq('uploaded_by', userId)
    .eq('processing_status', 'completed');

  if (docsError) {
    throw new Error(`Failed to fetch user documents: ${docsError.message}`);
  }

  if (!userDocuments || userDocuments.length === 0) {
    return [];
  }

  const documentIds = userDocuments.map((doc: any) => doc.id);

  // Perform vector similarity search
  const { data: chunks, error: searchError } = await supabaseAdmin.rpc(
    'match_documents', 
    {
      query_embedding: queryEmbedding,
      match_threshold: 0.1, // Lower threshold to get more results
      match_count: 5
    }
  );

  if (searchError) {
    logger('error', 'Vector search failed', { error: searchError.message });
    // Fallback to text search if vector search fails
    return await fallbackTextSearch(supabaseAdmin, documentIds);
  }

  if (!chunks || chunks.length === 0) {
    return await fallbackTextSearch(supabaseAdmin, documentIds);
  }

  // Filter chunks to only include user's documents
  const userChunks = chunks.filter((chunk: any) => 
    documentIds.includes(chunk.document_id)
  );

  return userChunks;
}

/**
 * Fallback text search when vector search fails
 * @param supabaseAdmin - Supabase admin client
 * @param documentIds - User's document IDs
 * @returns Chunks from user's documents
 */
async function fallbackTextSearch(supabaseAdmin: any, documentIds: string[]): Promise<any[]> {
  const { data: chunks, error } = await supabaseAdmin
    .from('document_chunks')
    .select('id, document_id, chunk_text')
    .in('document_id', documentIds)
    .limit(5);

  if (error) {
    throw new Error(`Fallback search failed: ${error.message}`);
  }

  return chunks.map((chunk: any) => ({
    ...chunk,
    similarity: 0.5 // Default similarity score
  }));
}

/**
 * Generate chat response using retrieved context
 * @param query - User query
 * @param relevantChunks - Retrieved relevant chunks
 * @returns Generated response
 */
async function generateChatResponse(query: string, relevantChunks: any[]): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable not set');
  }

  // Prepare context from relevant chunks
  const context = relevantChunks
    .map(chunk => chunk.chunk_text)
    .join('\n\n');

  const systemMessage = `You are a helpful AI assistant that answers questions based on the provided context. Use the following context to answer the user's question. If the context doesn't contain enough information to fully answer the question, say so and provide what information you can.

Context:
${context}`;

  const messages = [
    { role: 'system', content: systemMessage },
    { role: 'user', content: query }
  ];

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_CHAT_MODEL,
          messages: messages,
          max_tokens: 1024,
          temperature: 0.1,
          top_p: 0.9,
        }),
      });

      if (response.status === 429) {
        // Rate limit - exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 60000);
        logger('warning', 'Rate limited, retrying', { attempt, delay });
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;

    } catch (error) {
      attempt++;
      if (attempt >= maxAttempts) {
        logger('error', 'Failed to generate chat response after retries', { 
          attempts: maxAttempts, 
          error: (error as Error).message 
        });
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error('Failed to generate response after maximum attempts');
}
