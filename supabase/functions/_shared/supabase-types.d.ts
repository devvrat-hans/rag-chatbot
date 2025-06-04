// Type declarations for Supabase client in Edge Functions

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export interface SupabaseClient {
    auth: {
      getUser(token: string): Promise<{ data: { user: any | null }, error: any | null }>;
      onAuthStateChange(callback: (event: string, session: any) => void): { data: { subscription: any } };
      signInWithPassword(credentials: { email: string; password: string }): Promise<{ data: any, error: any | null }>;
      signUp(credentials: { email: string; password: string }): Promise<{ data: any, error: any | null }>;
      signOut(): Promise<{ error: any | null }>;
      getSession(): Promise<{ data: { session: any | null }, error: any | null }>;
    };
    storage: {
      from(bucket: string): {
        upload(path: string, file: File | Blob, options?: any): Promise<{ data: any, error: any | null }>;
        download(path: string): Promise<{ data: Blob | null, error: any | null }>;
        remove(paths: string[]): Promise<{ data: any, error: any | null }>;
        list(path?: string, options?: any): Promise<{ data: any[], error: any | null }>;
      };
    };
    from(table: string): SupabaseQueryBuilder;
    rpc(fn: string, params?: any): Promise<{ data: any, error: any | null }>;
  }

  export interface SupabaseQueryBuilder {
    select(columns?: string): SupabaseQueryBuilder;
    insert(data: any): Promise<{ data: any, error: any | null }>;
    update(data: any): SupabaseQueryBuilder;
    delete(): SupabaseQueryBuilder;
    eq(column: string, value: any): SupabaseQueryBuilder;
    in(column: string, values: any[]): SupabaseQueryBuilder;
    limit(count: number): SupabaseQueryBuilder;
  }

  export interface SupabaseClientOptions {
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
    };
  }

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: SupabaseClientOptions
  ): SupabaseClient;
}
