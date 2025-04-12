import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function middleware(request: NextRequest) {
  // Create a cookie store from the request
  const requestCookies = request.cookies;
  let response = NextResponse.next();
  
  // Create a Supabase client using our custom implementation
  const supabase = createServerClientForMiddleware(
    supabaseUrl,
    supabaseAnonKey,
    {
      request,
      response,
    }
  );
  
  // Refresh session if expired
  await supabase.auth.getSession();
  
  // Get user data
  const { data: { user } } = await supabase.auth.getUser();
  
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Check if path requires authentication and appropriate user type
  const isEducatorRoute = path.startsWith('/educator') && !path.startsWith('/educator/login') && !path.startsWith('/educator/register');
  const isStudentRoute = path.startsWith('/student') && !path.startsWith('/student/login') && !path.startsWith('/student/register');
  
  // If no user and trying to access protected route, redirect to login
  if ((isEducatorRoute || isStudentRoute) && !user) {
    const redirectUrl = isEducatorRoute ? '/educator/login' : '/student/login';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }
  
  // If user exists, check their role for educator/student specific routes
  if (user) {
    try {
      // Get the user's role from the database
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user role:', error);
        // If there's an error, redirect to the appropriate login page
        const loginUrl = isEducatorRoute ? '/educator/login' : '/student/login';
        return NextResponse.redirect(new URL(loginUrl, request.url));
      }
      
      const userRole = userData?.role;
      
      // Check if user is accessing the correct route for their role
      if (isEducatorRoute && userRole !== 'educator') {
        // Educator route but user is not an educator
        return NextResponse.redirect(new URL('/student/login?error=unauthorized', request.url));
      }
      
      if (isStudentRoute && userRole !== 'student') {
        // Student route but user is not a student
        return NextResponse.redirect(new URL('/educator/login?error=unauthorized', request.url));
      }
    } catch (err) {
      console.error('Error in middleware role check:', err);
      // If there's an exception, redirect to the appropriate login page
      const loginUrl = isEducatorRoute ? '/educator/login' : '/student/login';
      return NextResponse.redirect(new URL(loginUrl, request.url));
    }
  }
  
  return response;
}

// Custom function to create a Supabase client for middleware
function createServerClientForMiddleware(
  supabaseUrl: string,
  supabaseKey: string,
  options: {
    request: NextRequest;
    response: NextResponse;
  }
) {
  const { request, response } = options;
  
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, cookieOptions: any) {
        // Update the response cookies
        response.cookies.set({
          name,
          value,
          ...cookieOptions,
        });
      },
      remove(name: string, cookieOptions: any) {
        // Update the response cookies
        response.cookies.set({
          name,
          value: '',
          ...cookieOptions,
          maxAge: 0,
        });
      },
    },
  });
}

// Apply middleware to protected routes
export const config = {
  matcher: [
    '/student/:path*',
    '/educator/:path*',
  ],
}; 