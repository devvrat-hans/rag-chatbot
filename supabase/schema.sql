-- Migration: Initial setup for RAG Chatbot
-- Date: 2025-06-05
-- Description: Create tables, vector extension, and RLS policies for document storage and vector search

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  file_path TEXT NOT NULL,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'error'))
);

-- Create document_chunks table with vector column
CREATE TABLE public.document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_embedding VECTOR(768), -- nomic-embed-text-v1.5 embeddings dimension
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vector index for efficient similarity search
-- EXPLAIN ANALYZE: Use this to test query performance
CREATE INDEX idx_document_chunks_embedding
  ON public.document_chunks
  USING ivfflat (chunk_embedding vector_l2_ops) WITH (lists = 128);

-- Create index for faster document lookups
CREATE INDEX idx_documents_user ON public.documents(uploaded_by);
CREATE INDEX idx_chunks_document ON public.document_chunks(document_id);

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents table
CREATE POLICY "documents_select_owner" ON public.documents
  FOR SELECT USING (uploaded_by = auth.uid());

CREATE POLICY "documents_insert_owner" ON public.documents
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "documents_update_owner" ON public.documents
  FOR UPDATE USING (uploaded_by = auth.uid());

CREATE POLICY "documents_delete_owner" ON public.documents
  FOR DELETE USING (uploaded_by = auth.uid());

-- RLS Policies for document_chunks table
CREATE POLICY "chunks_select_owner" ON public.document_chunks
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM public.documents WHERE uploaded_by = auth.uid()
    )
  );

CREATE POLICY "chunks_insert_service" ON public.document_chunks
  FOR INSERT WITH CHECK (
    document_id IN (
      SELECT id FROM public.documents
    )
  );

CREATE POLICY "chunks_delete_owner" ON public.document_chunks
  FOR DELETE USING (
    document_id IN (
      SELECT id FROM public.documents WHERE uploaded_by = auth.uid()
    )
  );

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Storage policies
CREATE POLICY "Users can upload their own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Helper function for vector similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_text TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.chunk_text,
    1 - (document_chunks.chunk_embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.chunk_embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.chunk_embedding <=> query_embedding
  LIMIT match_count;
$$;
