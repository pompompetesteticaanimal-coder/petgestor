
/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Access environment variables using Vite's import.meta.env
// Access environment variables using Vite's import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance = null;

if (supabaseUrl && supabaseAnonKey) {
    try {
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
        console.error('Supabase Initialization Failed:', e);
    }
} else {
    console.warn('Supabase credentials missing. Supabase features will be disabled.');
}

export const supabase = supabaseInstance;
