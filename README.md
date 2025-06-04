# RAG Chatbot

A Retrieval-Augmented Generation (RAG) chatbot built with vanilla HTML, CSS, JavaScript, and Supabase. Upload documents and chat with your content using AI-powered embeddings and retrieval.

## Features

- **Document Upload**: Support for PDF, TXT, and DOCX files
- **Vector Search**: Powered by Supabase's vector extension
- **AI Chat**: Groq API integration for embeddings and chat completion
- **Authentication**: Secure user management with Supabase Auth
- **Real-time UI**: Modern, responsive interface with no build tools

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, ES6+ JavaScript
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: PostgreSQL with pgvector extension
- **AI**: Groq API (llama3.3-70b models)
- **Storage**: Supabase Storage
- **Auth**: Supabase Auth

## Project Structure

```
rag-chatbot/
├── src/
│   ├── assets/
│   │   ├── css/           # Stylesheets
│   │   ├── js/            # Frontend JavaScript modules
│   │   └── images/        # Static images
│   ├── pages/
│   │   └── index.html     # Main application page
│   └── templates/
│       └── shared/        # Reusable HTML components
├── supabase/
│   ├── functions/         # Edge Functions
│   └── schema.sql         # Database schema and migrations
├── .env.example           # Environment variables template
└── package.json           # Project dependencies and scripts
```

## Setup Instructions

### 1. Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Groq API account](https://console.groq.com/)
- Node.js 18+ (for development and Edge Functions)

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Enable the vector extension in your database:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### 3. Environment Configuration

#### For Local Development:
1. Run the configuration setup script:
   ```bash
   ./setup-config.sh
   ```
2. Edit the `.env` file with your actual credentials:
   ```bash
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   GROQ_API_KEY=your_groq_api_key
   ```

#### For Production Deployment:
- The application includes a web-based configuration page
- On first visit, users will be redirected to `config.html` to set up credentials
- Credentials are stored securely in browser localStorage
- For Edge Functions, set environment variables in your Supabase project settings

### 4. Database Schema

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Initialize Supabase locally:
```bash
supabase init
supabase start
```

3. Run the database migrations:
```bash
supabase db reset
```

4. Enable the vector extension in your Supabase dashboard:
   - Go to Database → Extensions
   - Enable the `vector` extension

### 3. Environment Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Fill in your environment variables:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GROQ_API_KEY=your_groq_api_key
```

3. Update the Supabase credentials in `src/assets/js/auth.js`:
```javascript
const SUPABASE_URL = 'your_supabase_project_url';
const SUPABASE_ANON_KEY = 'your_supabase_anon_key';
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy extract-embeddings
supabase functions deploy query-chat
```

### 5. Configure Storage

1. Create a storage bucket named `documents`:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
```

2. Apply storage policies (already included in schema.sql)

### 6. Run the Application

Serve the frontend files using any static file server:

```bash
# Using Python
cd src && python -m http.server 8000

# Using Node.js (http-server)
npx http-server src -p 8000

# Using PHP
cd src && php -S localhost:8000
```

Open `http://localhost:8000/pages/` in your browser.

## Usage

### 1. Authentication

- Sign up with email and password
- Verify your email (check spam folder)
- Sign in to access the application

### 2. Upload Documents

- Click "Choose Files" and select PDF, TXT, or DOCX files
- Files must be under 10MB
- Click "Upload Files" to process documents
- Wait for embedding generation (may take a few minutes)

### 3. Chat with Documents

- Type questions about your uploaded documents
- The AI will search relevant content and provide answers
- Source information is displayed with each response

## Development

### Linting

```bash
npm install
npm run lint
```

### Testing

```bash
npm test
```

### Code Formatting

```bash
npx prettier --write "**/*.{js,html,css}"
```

## Architecture

### Frontend Architecture

- **Modular Design**: Each feature is in its own JavaScript module
- **Event-Driven**: Uses native DOM events and custom event handling
- **Progressive Enhancement**: Works without JavaScript for basic functionality
- **Responsive Design**: Mobile-first CSS with utility classes

### Backend Architecture

- **Edge Functions**: Serverless functions running on Deno
- **Vector Database**: PostgreSQL with pgvector for similarity search
- **Row Level Security**: Ensures users only access their own data
- **Rate Limiting**: Prevents API abuse and respects service limits

### RAG Pipeline

1. **Document Ingestion**:
   - File upload to Supabase Storage
   - Text extraction (PDF/DOCX/TXT)
   - Text chunking with overlap
   - Embedding generation via Groq API
   - Vector storage in PostgreSQL

2. **Query Processing**:
   - Query embedding generation
   - Vector similarity search
   - Context retrieval and ranking
   - Response generation via Groq chat API

## Security Considerations

- **API Keys**: Never expose Groq API keys in frontend code
- **Authentication**: All API calls require valid Supabase session
- **Row Level Security**: Database-level access control
- **Input Validation**: File type and size validation
- **Rate Limiting**: Protects against abuse

## Troubleshooting

### Common Issues

1. **"No relevant information found"**:
   - Ensure documents are fully processed
   - Check document content is text-readable
   - Try rephrasing your question

2. **Upload failures**:
   - Check file size (max 10MB)
   - Verify file type (PDF, TXT, DOCX only)
   - Ensure stable internet connection

3. **Authentication errors**:
   - Verify Supabase project credentials
   - Check email verification status
   - Clear browser cache and cookies

### Debug Mode

Enable debug logging by adding to your Edge Functions:

```javascript
logger('debug', 'Debug information', { data: yourData });
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the coding standards in the instructions file
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the [troubleshooting section](#troubleshooting)
- Review the Supabase documentation
- Check Groq API status and limits