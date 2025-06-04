# Vercel Deployment Guide

This guide will help you deploy the RAG Chatbot application to Vercel.

## Prerequisites

1. **Supabase Production Project**: You need a production Supabase project (not local development)
2. **Groq API Key**: Obtain from https://console.groq.com/keys
3. **Vercel Account**: Sign up at https://vercel.com
4. **GitHub Repository**: Your code should be in a GitHub repository

## Step 1: Set Up Production Supabase Project

1. Go to https://supabase.com/dashboard
2. Create a new project or use an existing one
3. Note down your project credentials:
   - **Project URL** (something like `https://xyz.supabase.co`)
   - **Anon Key** (from Settings > API)
   - **Service Role Key** (from Settings > API, keep this secret!)

## Step 2: Apply Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase/schema.sql` from your project
3. Run the SQL to create tables, enable vector extension, and set up RLS policies

## Step 3: Deploy Edge Functions

1. Install Supabase CLI if not already installed:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link to your production project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Deploy the Edge Functions:
   ```bash
   supabase functions deploy extract-embeddings
   supabase functions deploy query-chat
   ```

5. Set environment variables for Edge Functions:
   ```bash
   supabase secrets set GROQ_API_KEY=your_groq_api_key_here
   ```

## Step 4: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click **"New Project"**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: Leave empty (static site)
   - **Output Directory**: `src`
   - **Install Command**: Leave empty

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. From your project directory:
   ```bash
   vercel
   ```

3. Follow the prompts:
   - Link to existing project or create new one
   - Set the settings as mentioned above

## Step 5: Configure Application Settings

Once deployed, your users will need to configure the application:

1. Visit your deployed application URL
2. Go to `/config` (or click the Settings link)
3. Enter your **production** Supabase credentials:
   - **Supabase URL**: Your production project URL
   - **Supabase Anon Key**: Your production anon key
4. Click **"Save Configuration"**

## Step 6: Test the Deployment

1. **Authentication**: Try signing up/signing in
2. **File Upload**: Upload a test document (PDF, DOCX, or TXT)
3. **Chat**: Ask questions about your uploaded document
4. **Check Logs**: Monitor Edge Function logs in Supabase dashboard

## Environment Variables Summary

### For Edge Functions (set via `supabase secrets set`):
- `GROQ_API_KEY`: Your Groq API key for embeddings and chat completion

### For Frontend (configured by users via `/config`):
- `SUPABASE_URL`: Your production Supabase project URL
- `SUPABASE_ANON_KEY`: Your production Supabase anon key

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure your Vercel domain is added to Supabase Auth settings
2. **Edge Function Errors**: Check Supabase Edge Function logs
3. **File Upload Issues**: Verify storage bucket permissions and RLS policies
4. **Chat Not Working**: Ensure GROQ_API_KEY is set correctly in Edge Functions

### Debug Steps:

1. Check browser console for JavaScript errors
2. Check Supabase Edge Function logs
3. Verify all environment variables are set correctly
4. Test Edge Functions directly via Supabase dashboard

## Security Checklist

- ✅ GROQ_API_KEY is only stored in Edge Functions (never in frontend)
- ✅ Service Role Key is only used in Edge Functions (never in frontend)
- ✅ RLS policies are enabled on all tables
- ✅ File upload size limits are enforced
- ✅ Authentication is required for all operations

## Performance Monitoring

- Monitor Edge Function execution time in Supabase dashboard
- Check database performance via Supabase metrics
- Monitor Vercel function usage and performance

Your RAG Chatbot is now deployed and ready for production use!
