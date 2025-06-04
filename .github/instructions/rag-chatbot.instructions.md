---
applyTo: '**'
---

# GitHub Copilot Instructions for RAG Chatbot (Vanilla HTML/CSS/JS + Supabase)
# ---------------------------------------------------------------------------
#
# Purpose:
#   These instructions guide GitHub Copilot to generate consistent, maintainable,
#   and secure code for a Retrieval-Augmented Generation (RAG) chatbot application that:
#     - Uses only vanilla HTML, CSS, and JavaScript (no frontend frameworks or build tools)
#     - Leverages Supabase for authentication, storage, and vector-based retrieval
#     - Allows users to upload documents (PDF, DOCX, TXT) into Supabase Storage
#     - Extracts text, splits into chunks, generates embeddings via llama3.3-70b (Groq API)
#     - Stores embeddings in a Supabase vector table and performs nearest-neighbor searches
#     - Exposes a chat UI in plain HTML/JS to query the uploaded files via RAG
#     - Implements backend logic (supabase Edge Functions) in JavaScript to keep Groq API keys secure
#

coding_standards:
  # General Language & Tools
  - "Frontend must use only vanilla HTML5, CSS3, and modern ES6+ JavaScript. Do not include React, Vue, Angular, or any bundlers."
  - "Backend logic (embedding generation, chat completion, and secure API calls) must be implemented as Supabase Edge Functions using JavaScript (Node 18.x)."
  - "All JavaScript files must use ES modules (import/export syntax) and run natively in modern browsers without transpilation."
  - "Use the official Supabase JavaScript client (version 2.x) in both frontend and Edge Functions. Import via CDN or via npm in Edge Functions."
  - "Do not commit real environment variables; use a .env.example to document required keys."
  
  # Formatting & Linting
  - "Use Prettier for formatting .js, .html, and .css files with 2-space indentation, single quotes, and trailing commas where valid in JS. Enforce with a .prettierrc file."
  - "Use ESLint (version 8.x) for JS linting in Edge Functions only. Extend 'eslint:recommended' and 'plugin:node/recommended'. Enforce no-unused-vars, no-console (except logger calls), and strict equality (===)."
  - "All Edge Function .js files must pass linting with no errors. Frontend .js should also follow ESLint rules when possible."
  - "Include a top-of-file comment block in every .js file stating the file’s purpose, exported functions, and expected inputs/outputs."

  # Naming Conventions
  - "HTML files use kebab-case (e.g., index.html, chat-ui.html)."
  - "CSS files use kebab-case and match the related HTML file name (e.g., styles.css or chat-ui.css)."
  - "JavaScript files in /public/js/ use kebab-case (e.g., auth.js, file-uploader.js, chat.js)."
  - "Edge Function files (in /supabase/functions/) use kebab-case (e.g., extract-embeddings.js, query-chat.js)."
  - "Environment variables (in .env and .env.example) use UPPER_SNAKE_CASE (e.g., SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY)."
  - "Constants in JS use UPPER_SNAKE_CASE. Variables and functions use camelCase."
  - "HTML element IDs and class names use kebab-case (e.g., upload-form, chat-container, message-bubble)."
  
  # File & Folder Structure
  - "/src/
        /assets
            /css
                navbar.css
                footer.css
                index.css               # Global CSS (reset + utility classes)
            /images
            /js
                navbar.js
                footer.js
                index.js                # Main landing page (chat UI + file uploader)
                – auth.js                # Supabase Auth logic (signup, signin, session check)
                – file-upload.js         # File selection, validation, and upload to Supabase Storage
                – status-poller.js       # Polls Edge Function for embedding status
                – chat.js                # Chat UI rendering and querying Edge Function
                – utils.js               # Shared helper functions (e.g., fetchWithTimeout, showToast)
        /pages
            index.html
        /templates
            /shared
            navbar.html
            footer.html
        - "/supabase/
            • /functions/
                – extract-embeddings.js   # Edge Function: text extraction, chunking, embedding generation, store in vector table
                – query-chat.js           # Edge Function: RAG pipeline (retrieve top-k, call Groq chat, return answer)
            • supabase.js               # Shared Supabase client initialization for Edge Functions (imported in each function)
            • schema.sql                # SQL definitions: tables, vector index, RLS policies, and Postgres helper functions
        - ".env.example"                # Template: SUPABASE_URL=, SUPABASE_ANON_KEY=, SUPABASE_SERVICE_ROLE_KEY=, GROQ_API_KEY=
        - "README.md"                   # Project overview, setup instructions, environment setup, deployment steps
        - "LICENSE" (MIT)

domain_knowledge:
  # RAG (Retrieval-Augmented Generation) Pipeline
  - "RAG = retrieval (vector search) + generation (LLM). Steps for each chat query:
      1. Frontend sends user query (text) to Edge Function /query-chat.
      2. Edge Function converts query to embedding via Groq embedding endpoint (llama3.3-70b-embeddings).
      3. Edge Function queries Supabase vector table with <=> operator (nearest neighbors) to get top-k chunks.
      4. Edge Function formats a prompt: system message + concatenated chunk_texts + user query.
      5. Edge Function calls Groq chat completion endpoint (llama3.3-70b-versatile) with prompt.
      6. Edge Function returns JSON { answer: string, sourceChunks: Array<{chunkId, score}> } to frontend.
  "
  - "Supabase Schema & Vector Extension:
      • Create a 'documents' table:
          CREATE TABLE public.documents (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            uploaded_by UUID REFERENCES auth.users(id),
            uploaded_at TIMESTAMPTZ DEFAULT NOW(),
            file_path TEXT NOT NULL
          );
      • Create a 'document_chunks' table with vector column:
          CREATE TABLE public.document_chunks (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            document_id UUID REFERENCES public.documents(id),
            chunk_text TEXT NOT NULL,
            chunk_embedding VECTOR(1024),  -- llama3.3-70b embeddings length
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
      • Index for vector search:
          CREATE INDEX idx_document_chunks_embedding
            ON public.document_chunks
            USING ivfflat (chunk_embedding vector_l2_ops) WITH (lists = 128);
      • RLS Policies:
          -- Only document owner can read/write their documents:
          ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
          CREATE POLICY "documents_select_owner" ON public.documents
            FOR SELECT USING (uploaded_by = auth.uid());
          CREATE POLICY "documents_insert_owner" ON public.documents
            FOR INSERT WITH CHECK (uploaded_by = auth.uid());
          -- Allow only owning user to read their chunks:
          ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
          CREATE POLICY "chunks_select_owner" ON public.document_chunks
            FOR SELECT USING (
              document_id IN (
                SELECT id FROM public.documents WHERE uploaded_by = auth.uid()
              )
            );
    "
  - "Document Ingestion & Embedding Flow:
      1. User selects file in frontend; file-upload.js validates type (application/pdf, text/plain, application/vnd.openxmlformats-officedocument.wordprocessingml.document) and size ≤ 10 MB.
      2. file-upload.js uploads file to Supabase Storage bucket 'documents' via supabase.storage.from('documents').upload(...).
      3. After upload, file-upload.js calls Edge Function /extract-embeddings with { filePath, fileName, userId }.
      4. Edge Function /extract-embeddings:
          • Downloads file from Storage using Supabase Admin client (service role).
          • Extracts plain text:
              – For PDF: use ‘pdf-parse’ library.
              – For DOCX: use ‘docx’ or ‘mammoth’ library.
              – For TXT: read directly.
          • Splits text into chunks of ~500 tokens each with ~50-token overlap. Ensure no sentence is cut mid-way—split on whitespace and punctuation.
          • For each chunk, batch up to 100 chunks: call Groq embedding endpoint:
              POST https://api.groq.com/v1/embeddings
              Headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }
              Body: { model: 'llama3.3-70b-embeddings', input: [ 'chunk1', 'chunk2', … ] }
          • Receive embedding arrays; insert each into public.document_chunks with chunk_text and chunk_embedding via Supabase Admin (service role) client.
      5. Edge Function returns { success: true, documentId } to frontend. file-upload.js updates UI to “Embedding in progress.” Frontend polls status via status-poller.js.

  - "Chat Query Flow:
      1. When user submits a query in chat.js, send POST to Edge Function /query-chat with { query, userId }.
      2. Edge Function /query-chat:
          • Using Supabase Admin client, fetch user session and ensure user is authenticated.
          • Convert query to embedding via Groq embedding endpoint (same model).
          • Perform vector search in public.document_chunks:
              SELECT id, chunk_text, <vector_column> <=> query_embedding AS score
              FROM public.document_chunks
              ORDER BY chunk_embedding <=> query_embedding
              LIMIT 5;
          • Build messages array:
              [
                { role: 'system', content: 'You are a RAG assistant. Use the following context to answer the user:\n\n' + concatenatedChunkTexts },
                { role: 'user', content: userQuery }
              ]
          • Call Groq chat completion:
              POST https://api.groq.com/v1/chat/completions
              Body: {
                model: 'llama3.3-70b-versatile',
                messages: [ … ],
                max_tokens: 1024,
                temperature: 0.0,
                top_p: 0.9
              }
          • Handle rate limits (HTTP 429) with exponential backoff (min 1s, max 60s) and jitter. Log retry attempts.
          • Return JSON { answer: string, sourceChunks: [{ chunkId, score }] } with status 200.

  - "Supabase Auth & Storage:
      • Use Supabase Auth in frontend (auth.js) to allow signup, signin, signout. On load, check session:
          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          supabase.auth.onAuthStateChange((event, session) => { … });
      • Protect UI routes: redirect to login page if not authenticated.
      • When uploading, include supabase.auth.getSession() token in calls to Edge Functions. Edge Functions verify session via supabase.auth.getUser().

  - "Security Best Practices:
      • Never expose GROQ_API_KEY in frontend. All Groq API calls must be from Edge Functions using environment variable.
      • Edge Functions must use Supabase Admin client (service role key) to write to vector tables and download files.
      • Use parameterized queries via Supabase query builder—never string-concatenate dynamic user input into SQL.
      • Implement RLS on both documents and document_chunks tables as described above.
      • Validate file MIME types and sizes on both frontend and Edge Function.
      • Rate-limit Edge Functions: if more than 10 calls per minute per user, return HTTP 429.

preferences_for_AI:
  # General AI Behavior
  - "When generating vanilla JS code, always use modern ES6+ features: const/let, arrow functions, Promises, async/await, template literals, destructuring."
  - "Include clear JSDoc comments for every public function in both frontend and Edge Functions: @param, @returns, and brief description."
  - "In HTML, structure markup semantically: use <header>, <main>, <section>, <footer>, <form>, <button> with appropriate ARIA attributes for accessibility."
  - "CSS should use a utility-first approach: define a small set of reusable classes (e.g., .btn, .card, .spinner). Use CSS variables for colors, spacing, and fonts. Avoid inline styles."
  - "All fetch calls in frontend must use a shared helper fetchWithTimeout(url, options, timeoutMs) in utils.js. Default timeout = 10000 ms."
  - "When interacting with Supabase client on frontend:
      const supabase = supabaseCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await supabase.auth.signInWithPassword({ email, password });
    Always check both data and error; on error, display user-friendly messages via toast notifications."
  - "For Edge Functions, use the official supabase-admin-js client:
      import { createClient } from '@supabase/supabase-js';
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    Always verify user session via supabaseAdmin.auth.getUser(accessToken)."
  - "Naming preferences: use descriptive names like getTextChunks, generateEmbeddings, fetchTopChunks, sendChatCompletion, rather than generic names."
  - "When writing SQL in schema.sql or in Edge Functions, always include EXPLAIN ANALYZE for performance testing in comments (not executed in production)."
  - "Use try/catch in all async functions both in frontend and Edge Functions. In catch blocks, log error with context (e.g., console.error(`[extract-embeddings] Error:`, error)) and return standardized error response."
  - "Avoid alert() or confirm() in frontend; use custom modal or toast in utils.js."
  - "Ensure all user-visible text (buttons, labels, error messages) is easily configurable via a constants object in utils.js."
  - "When generating HTML, include meta tags for responsive design:
      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    and set <title>RAG Chatbot</title>."
  - "Provide unit tests for Edge Functions using Jest (v29) and for frontend logic (utils functions) using a headless browser test (e.g., using Jest + jsdom). Place tests under a “/tests/” folder mirroring code structure."
  - "Strictly no console.logs in production; use a logger utility in Edge Functions that writes structured logs (JSON) to stdout."
  - "Document every environment variable in .env.example with a brief description:
      SUPABASE_URL           # URL of Supabase project
      SUPABASE_ANON_KEY      # Public anon key for Supabase client
      SUPABASE_SERVICE_ROLE_KEY  # Service role key for Supabase Admin client
      GROQ_API_KEY           # Secret key for Groq API calls"
  - "When updating schema.sql, include a comment with date and migration description."

# End of Copilot Instructions

