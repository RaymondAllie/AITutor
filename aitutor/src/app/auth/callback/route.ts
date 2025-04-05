import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server-supabase';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const userType = requestUrl.searchParams.get('userType') || 'student'; // Default to student if not specified
  
  if (code) {
    // Create an initial response object for redirecting
    const response = NextResponse.redirect(
      userType === 'educator'
        ? new URL(`/educator/dashboard`, requestUrl.origin)
        : new URL(`/student/dashboard`, requestUrl.origin)
    );
    
    // Create a Supabase client for server-side operations using our new utility
    const cookieStore = cookies();
    const supabase = createClient(cookieStore, response);
    
    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code);
    
    // Get the user information
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Update the redirect URL with the user ID
      return NextResponse.redirect(
        new URL(
          userType === 'educator'
            ? `/educator/${user.id}`
            : `/student/${user.id}`,
          requestUrl.origin
        ),
        { headers: response.headers } // Preserve the Set-Cookie headers
      );
    }
    
    // Return the original redirect if we couldn't get the user ID
    return response;
  }
  
  // If there's an error, redirect back to the login page
  return NextResponse.redirect(new URL('/', requestUrl.origin));
} 