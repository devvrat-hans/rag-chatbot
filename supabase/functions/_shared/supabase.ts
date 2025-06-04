/// <reference path="./deno.d.ts" />
/// <reference path="./supabase-types.d.ts" />
/**
 * Shared Supabase client initialization for Edge Functions
 * Exports: createSupabaseAdmin, logger
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Create Supabase Admin client
 * @returns Supabase admin client
 */
export function createSupabaseAdmin() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Structured logger for Edge Functions
 * @param level - Log level
 * @param message - Log message
 * @param meta - Additional metadata
 */
export function logger(level: string, message: string, meta: Record<string, any> = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  console.log(JSON.stringify(logEntry));
}
