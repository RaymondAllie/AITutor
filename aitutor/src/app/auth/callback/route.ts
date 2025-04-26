import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server-supabase';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const userType = requestUrl.searchParams.get('userType') || 'student'; // Default to student if not specified
  
  if (code) {
    try {
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
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (sessionError) {
        console.error('Error exchanging code for session:', sessionError);
        return NextResponse.redirect(new URL('/', requestUrl.origin));
      }
      
      // Get the user information
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user:', userError);
        return NextResponse.redirect(new URL('/', requestUrl.origin));
      }
      
      try {
        // Check if the user already exists in the database
        const { data: existingUser, error: queryError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
          
        if (queryError && queryError.code !== 'PGRST116') { // PGRST116 is "not found" error
          console.error('Error checking user role:', queryError);
        }
        
        // If the user doesn't exist or has a different role, update their record
        const role = userType === 'educator' ? 'educator' : 'student';
        
        if (!existingUser) {
          // User doesn't exist, create them
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              role: role,
              email: user.email,
              name: user.user_metadata?.full_name || user.email?.split('@')[0],
            });
            
          if (insertError) {
            console.error('Error creating user record:', insertError);
          }
          
          // If it's a student, also create a student profile
          if (role === 'student') {
            await supabase
              .from('student_profiles')
              .insert({
                user_id: user.id,
                name: user.user_metadata?.full_name || user.email?.split('@')[0],
                email: user.email
              });
          }
        } else if (existingUser.role !== role) {
          // User exists but with different role - may not want to override
          // Just note it rather than change it automatically
          console.log(`Note: User ${user.id} has role ${existingUser.role} but is logging in via ${role} login`);
        }
      } catch (err) {
        console.error('Error processing user in callback:', err);
      }

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
    } catch (error) {
      console.error('Error in auth callback:', error);
      return NextResponse.redirect(new URL('/', requestUrl.origin));
    }
  }
  
  // If there's no code or an error occurred, redirect back to the login page
  return NextResponse.redirect(new URL('/', requestUrl.origin));
} 