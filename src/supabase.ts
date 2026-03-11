/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Helper to check if a string is a valid URL
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

// Only create the client if the URL and key are provided AND the URL is valid.
// Otherwise, export a dummy object to prevent the app from crashing in demo mode.
export const supabase = supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: null, error: new Error("Supabase not configured or invalid URL") }),
        signUp: async () => ({ data: { user: null, session: null }, error: new Error("Supabase not configured") }),
        signOut: async () => ({ error: null }),
        updateUser: async () => ({ data: { user: null }, error: null })
      },
      from: () => {
        const filterChain: any = {
          eq: () => filterChain,
          limit: async () => ({ data: [], error: null }),
          order: async () => ({ data: [], error: null }),
          single: async () => ({ data: null, error: null }),
        };
        return {
          select: () => filterChain,
          upsert: async () => ({ data: null, error: null }),
          insert: async () => ({ data: null, error: null }),
        };
      }
    } as any;
