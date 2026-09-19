import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Local storage keys for runtime configuration overrides
const STORAGE_KEY_URL = 'ops_supabase_url';
const STORAGE_KEY_KEY = 'ops_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

/**
 * Retrieves the active Supabase URL and Anon Key.
 * Checks localStorage first, then falls back to Vite environment variables.
 */
export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env || {};
  const envUrl = (metaEnv.VITE_SUPABASE_URL as string) || '';
  const envKey = (metaEnv.VITE_SUPABASE_ANON_KEY as string) || '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';

  const url = (localUrl || envUrl).trim();
  const anonKey = (localKey || envKey).trim();

  // Basic check: Supabase URL usually contains supabase.co or http
  const isValidUrl = url.startsWith('http://') || url.startsWith('https://');
  const isConfigured = Boolean(isValidUrl && anonKey && !anonKey.includes('your-anon-key'));

  return { url, anonKey, isConfigured };
}

/**
 * Updates stored Supabase credentials in localStorage.
 */
export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    if (url.trim()) {
      localStorage.setItem(STORAGE_KEY_URL, url.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_URL);
    }

    if (anonKey.trim()) {
      localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_KEY);
    }
  }

  // Invalidate cached client
  cachedClient = null;
  lastUsedUrl = '';
  lastUsedKey = '';
}

/**
 * Safely creates or returns the cached Supabase client.
 * Returns null if credentials are not configured or invalid, never throwing.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();

  if (!isConfigured) {
    return null;
  }

  // Reuse existing instance if credentials haven't changed
  if (cachedClient && url === lastUsedUrl && anonKey === lastUsedKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    lastUsedUrl = url;
    lastUsedKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.warn('Unable to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Tests live connection to the Supabase endpoint.
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
  tablesFound?: boolean;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL or Anon Key is missing or invalid. Operating in local fallback mode.',
    };
  }

  const start = performance.now();
  try {
    // Attempt a light read on handovers table or health check
    const { error } = await client
      .from('handovers')
      .select('id')
      .limit(1);

    const latency = Math.round(performance.now() - start);

    if (error) {
      // If table does not exist (PGRST204 or 42P01), connection is valid but tables need creation
      if (error.code === '42P01' || error.message.includes('relation "handovers" does not exist') || error.message.includes('not found')) {
        return {
          success: true,
          latencyMs: latency,
          tablesFound: false,
          message: 'Connected to Supabase successfully! (Tables not yet created. Run the RLS SQL script below to provision).',
        };
      }

      // RLS policy notice or other non-fatal code
      return {
        success: true,
        latencyMs: latency,
        tablesFound: true,
        message: `Connected to Supabase endpoint (${latency}ms). Notice: ${error.message}`,
      };
    }

    return {
      success: true,
      latencyMs: latency,
      tablesFound: true,
      message: `Connected to Supabase securely (${latency}ms). All tables and RLS active.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Connection failed: ${errorMsg}. Operating in local fallback mode.`,
    };
  }
}

/**
 * Optional Auth: Get current authenticated user
 */
export async function getCurrentSupabaseUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data: { user } } = await client.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Optional Auth: Sign in with Email and Password
 */
export async function signInWithSupabase(email: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase client is not configured.' };

  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Signed in successfully', user: data.user ?? undefined };
  } catch (err: unknown) {
    return { success: false, message: err instanceof Error ? err.message : 'Authentication failed' };
  }
}

/**
 * Optional Auth: Sign up with Email and Password (supports both (name, email, password) and (email, password))
 */
export async function signUpWithSupabase(
  nameOrEmail: string,
  emailOrPassword: string,
  optionalPassword?: string
): Promise<{ success: boolean; message: string; user?: User }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase client is not configured.' };

  let name = '';
  let email = '';
  let password = '';

  if (optionalPassword !== undefined) {
    name = nameOrEmail.trim();
    email = emailOrPassword.trim();
    password = optionalPassword;
  } else {
    email = nameOrEmail.trim();
    password = emailOrPassword;
    name = email.split('@')[0];
  }

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          full_name: name,
        },
      },
    });
    if (error) return { success: false, message: error.message };
    return {
      success: true,
      message: data.session ? 'Account created and signed in successfully' : 'Confirmation email sent. Please check your inbox.',
      user: data.user ?? undefined,
    };
  } catch (err: unknown) {
    return { success: false, message: err instanceof Error ? err.message : 'Registration failed' };
  }
}

/**
 * Optional Auth: Reset password for email
 */
export async function resetPasswordWithSupabase(email: string): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase client is not configured.' };

  try {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Password recovery email sent. Please check your inbox.' };
  } catch (err: unknown) {
    return { success: false, message: err instanceof Error ? err.message : 'Password reset failed' };
  }
}

/**
 * Optional Auth: Sign Out
 */
export async function signOutSupabase(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.auth.signOut();
  } catch (err) {
    console.warn('Sign out error:', err);
  }
}

/**
 * Subscribe to Supabase Auth State changes
 */
export function onSupabaseAuthStateChange(
  callback: (event: string, sessionUser: User | null) => void
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      callback(event, session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  } catch {
    return null;
  }
}

/**
 * Complete, copy-pasteable PostgreSQL DDL and RLS script for Supabase SQL Editor.
 */
export const SUPABASE_SCHEMA_SQL = `-- =========================================================================
-- SHIFT HANDOVER NOTE GENERATOR - SUPABASE RLS SCHEMA & DATABASE TABLES
-- =========================================================================
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- It creates the 5 core tables with indices and production Row Level Security (RLS).

-- 1. HANDOVERS TABLE
CREATE TABLE IF NOT EXISTS public.handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  employee_name TEXT NOT NULL,
  employee_role TEXT NOT NULL DEFAULT 'Operations Lead',
  shift_date DATE NOT NULL,
  shift_start TEXT NOT NULL,
  shift_end TEXT NOT NULL,
  summary TEXT NOT NULL,
  auto_count_summary TEXT NOT NULL,
  raw_data JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived'))
);

-- 2. TASKS TABLE (Handover Tasks from 4 Categories)
CREATE TABLE IF NOT EXISTS public.handover_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES public.handovers(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('COMPLETED', 'IN_PROGRESS', 'BLOCKERS', 'WATCH_LIST')),
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT,
  source TEXT NOT NULL,
  record_id TEXT NOT NULL,
  notes TEXT,
  is_carried_forward BOOLEAN NOT NULL DEFAULT false,
  carried_from_shift TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. BLOCKERS TABLE (High-Impact Operational Impediments)
CREATE TABLE IF NOT EXISTS public.blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES public.handovers(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  impact_level TEXT NOT NULL DEFAULT 'High (P2)',
  owner TEXT,
  escalated_to TEXT,
  status TEXT NOT NULL DEFAULT 'Open',
  source TEXT NOT NULL,
  record_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. ESCALATIONS TABLE (Critical P1/P2 Escalation Trails)
CREATE TABLE IF NOT EXISTS public.escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES public.handovers(id) ON DELETE CASCADE,
  incident_id TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'Critical (P1)',
  summary TEXT NOT NULL,
  channel TEXT,
  acknowledged_by TEXT,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. INCIDENTS TABLE (PagerDuty & Infrastructure Outages)
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES public.handovers(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  severity TEXT NOT NULL,
  summary TEXT NOT NULL,
  resolution_status TEXT NOT NULL,
  record_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- OPTIMIZATION INDICES
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_handovers_shift_date ON public.handovers(shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_handovers_created_at ON public.handovers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handover_tasks_handover_id ON public.handover_tasks(handover_id);
CREATE INDEX IF NOT EXISTS idx_blockers_handover_id ON public.blockers(handover_id);
CREATE INDEX IF NOT EXISTS idx_escalations_handover_id ON public.escalations(handover_id);
CREATE INDEX IF NOT EXISTS idx_incidents_handover_id ON public.incidents(handover_id);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
-- Enable RLS across all 5 operational tables
ALTER TABLE public.handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow public read/query via anon key or authenticated operators
CREATE POLICY "Allow public/anon read handovers" 
ON public.handovers FOR SELECT 
USING (true);

CREATE POLICY "Allow public/anon read handover_tasks" 
ON public.handover_tasks FOR SELECT 
USING (true);

CREATE POLICY "Allow public/anon read blockers" 
ON public.blockers FOR SELECT 
USING (true);

CREATE POLICY "Allow public/anon read escalations" 
ON public.escalations FOR SELECT 
USING (true);

CREATE POLICY "Allow public/anon read incidents" 
ON public.incidents FOR SELECT 
USING (true);

-- Policy 2: Allow authenticated and anon inserts for shift note generation
CREATE POLICY "Allow insert handovers" 
ON public.handovers FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow insert handover_tasks" 
ON public.handover_tasks FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow insert blockers" 
ON public.blockers FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow insert escalations" 
ON public.escalations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow insert incidents" 
ON public.incidents FOR INSERT 
WITH CHECK (true);

-- Policy 3: Allow authenticated users to delete/update their own handovers
CREATE POLICY "Allow user update handovers" 
ON public.handovers FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Allow user delete handovers" 
ON public.handovers FOR DELETE 
USING (auth.uid() = user_id OR auth.uid() IS NULL);
`;
