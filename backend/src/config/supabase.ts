// Supabase Client Configuration
// Initializes Supabase client for storage and database operations

// Note: @supabase/supabase-js will be installed via npm install
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// ============================================================================
// Environment Schema
// ============================================================================

const supabaseEnvSchema = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_DATABASE_URL: z
    .string()
    .url('SUPABASE_DATABASE_URL must be a valid URL')
    .optional(),
});

type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

// ============================================================================
// Supabase Configuration
// ============================================================================

/**
 * Validates and returns Supabase environment configuration
 * @throws Error if required environment variables are missing or invalid
 */
function getSupabaseEnv(): SupabaseEnv {
  const parsed = supabaseEnvSchema.safeParse({
    SUPABASE_URL: process.env['SUPABASE_URL'],
    SUPABASE_ANON_KEY: process.env['SUPABASE_ANON_KEY'],
    SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'],
    SUPABASE_DATABASE_URL: process.env['SUPABASE_DATABASE_URL'],
  });

  if (!parsed.success) {
    console.error('Invalid Supabase configuration:');
    console.error(parsed.error.format());
    throw new Error('Invalid Supabase configuration. Check the errors above.');
  }

  return parsed.data;
}

// ============================================================================
// Supabase Clients
// ============================================================================

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

/**
 * Get Supabase client instance (anon key)
 * Used for public/user-facing operations
 * @returns Supabase client with anon key
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const env = getSupabaseEnv();
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false, // Server-side, no session persistence needed
      },
    });
  }
  return supabaseClient;
}

/**
 * Get Supabase admin client instance (service role key)
 * Used for administrative operations (file migrations, batch operations)
 * WARNING: Has full access to database and storage, use with caution
 * @returns Supabase client with service role key
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    const env = getSupabaseEnv();
    supabaseAdminClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
        },
      },
    );
  }
  return supabaseAdminClient;
}

/**
 * Supabase configuration object
 * Exports validated configuration for use across the application
 */
export const supabaseConfig = {
  get url(): string {
    return getSupabaseEnv().SUPABASE_URL;
  },
  get anonKey(): string {
    return getSupabaseEnv().SUPABASE_ANON_KEY;
  },
  get serviceRoleKey(): string {
    return getSupabaseEnv().SUPABASE_SERVICE_ROLE_KEY;
  },
  get databaseUrl(): string | undefined {
    return getSupabaseEnv().SUPABASE_DATABASE_URL;
  },
} as const;

/**
 * Reset Supabase clients (useful for testing or hot-reload)
 * Clears cached client instances, forcing fresh connections on next access
 */
export function resetSupabaseClients(): void {
  supabaseClient = null;
  supabaseAdminClient = null;
}

/**
 * Test Supabase connection
 * Useful for health checks and startup verification
 * @returns Promise that resolves if connection is successful
 */
export async function testSupabaseConnection(): Promise<void> {
  const client = getSupabaseClient();

  // Test storage bucket access
  const { data, error } = await client.storage.listBuckets();

  if (error) {
    const errorMessage =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'Unknown error';
    throw new Error(`Supabase connection failed: ${errorMessage}`);
  }

  if (!data) {
    throw new Error('Supabase connection failed: No data returned');
  }

  console.log('✓ Supabase connected successfully');
  console.log(
    `  Available buckets: ${data.map((bucket: { name: string }) => bucket.name).join(', ')}`,
  );
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getClient: getSupabaseClient,
  getAdminClient: getSupabaseAdminClient,
  config: supabaseConfig,
  testConnection: testSupabaseConnection,
  resetClients: resetSupabaseClients,
};
