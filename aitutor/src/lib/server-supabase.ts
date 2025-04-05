import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createClient(cookieStore: ReturnType<typeof cookies>, response?: NextResponse) {
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          if (response) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          } else {
            // In a route handler or middleware, we need to set the cookie explicitly
            cookieStore.set({
              name,
              value,
              ...options,
            });
          }
        },
        remove(name: string, options: any) {
          if (response) {
            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
            });
          } else {
            cookieStore.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
            });
          }
        },
      },
    }
  );
} 