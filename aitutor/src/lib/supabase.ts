import { createBrowserClient } from '@supabase/ssr';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
 
// Create a Supabase client for use in the browser
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Export a function to create a new client instance
export const createClient = () => createBrowserClient(supabaseUrl, supabaseAnonKey); 