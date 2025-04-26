"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { EdgeFunctions } from '@/lib/edge-functions';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: (specificUserType?: 'educator' | 'student') => Promise<void>;
  // Add the new fetchWithAuth function
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for changes on auth state (signed in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      
      // Only call updateUsers when a user first signs in (not on every state change)
      if (event === 'SIGNED_IN' && session?.user?.id) {
        console.log("User signed in:", session.user.id);
        updateUsers(session.user.id);
      } else {
        console.log("Auth state changed:", event);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const { headers: customHeaders, ...otherOptions } = options;
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw new Error('Failed to get auth session')
      if (!session) throw new Error('No active session');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const headers = {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${session.access_token}`,
        ...(customHeaders || {})
      };

      const response = await fetch(`${supabaseUrl}${endpoint}`, {
        ...otherOptions,
        headers
      });
      
      if (!response.ok) throw new Error('Response not ok')

      const res = await response.json()
  
      return {
        success: true,
        status: response.status,
        ...res
      };
    } catch (error) {
      console.error('fetchWithAuth error:', error);
      return {
        success: false,
        status: error instanceof Error && error.message.includes('session') ? 401 : 500,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  };
  
  const updateUsers = async (user_id: string | undefined) => {
    if (user_id == null) return
    
    try {
      console.log('Checking if user exists in database:', user_id);
      
      // Check if the user already exists in the 'users' table
      const { count, error } = await supabase
        .from('users')
        .select('*', {count: 'exact', head:true})
        .eq("id", user_id)
        
      if (error) {
        console.error('Error checking if user exists:', error);
        return;
      }
      
      console.log('User count in database:', count);
      
      // Only call signup if the user doesn't exist in the database
      if (count === 0) {
        console.log('User not found in database, creating new user record');
        
        try {
          // Use the EdgeFunctions helper to call the signup function
          const response = await EdgeFunctions.signup(fetchWithAuth, user_id);
          
          console.log('Signup response:', response);
          
          if (!response.success) {
            console.warn(`Signup API returned an error (${response.status}), attempting direct DB insert`);
            
            // Fallback to direct DB insert if the function fails
            const { error: insertError } = await supabase
              .from('users')
              .insert({ id: user_id });
              
            if (insertError) {
              console.error('Error creating user record:', insertError);
            } else {
              console.log('User successfully added to database via direct insert');
            }
          } else {
            console.log('User successfully added to database via signup function');
          }
        } catch (signupError) {
          console.error('Error during signup process:', signupError);
          
          // Attempt direct insert as fallback
          try {
            const { error: insertError } = await supabase
              .from('users')
              .insert({ id: user_id });
              
            if (insertError) {
              console.error('Error creating user record:', insertError);
            } else {
              console.log('User successfully added to database via fallback');
            }
          } catch (insertError) {
            console.error('Failed to create user record after signup error:', insertError);
          }
        }
      } else {
        console.log('User already exists in database, skipping signup');
      }
    } catch (err) {
      // Log the error but don't throw it to prevent app crashes
      console.error('Error in updateUsers:', err);
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signInWithGoogle = async (specificUserType?: 'educator' | 'student') => {
    // Get the current URL pathname to determine if this is an educator or student login
    const pathName = typeof window !== 'undefined' ? window.location.pathname : '';
    // Use the provided specificUserType if available, otherwise determine from path
    const userType = specificUserType || (pathName.includes('/educator') ? 'educator' : 'student');
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?userType=${userType}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      },
    });
    
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      signIn, 
      signOut, 
      signInWithGoogle,
      fetchWithAuth // Add the new function to the context
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 