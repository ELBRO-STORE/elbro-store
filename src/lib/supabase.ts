import { createClient } from '@supabase/supabase-js';
import type { DatabaseWithInternals } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}

// Use DatabaseWithInternals which includes __InternalSupabase for proper type inference
// Explicitly specify 'public' schema for proper type inference with postgrest-js
export const supabase = createClient<DatabaseWithInternals, 'public'>(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'mock-key'
);

// Helper to get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Helper to check if user is admin
export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .single();
  return !!data;
}