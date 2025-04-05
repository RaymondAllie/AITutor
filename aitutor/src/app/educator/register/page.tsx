"use client"

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function EducatorRegister() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Sign up with email and password
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            user_type: 'educator',
          }
        }
      });

      if (error) {
        throw error;
      }
      
      if (data?.user) {
        // Create an educator profile in your database
        const { error: profileError } = await supabase
          .from('educator_profiles')
          .insert([
            { 
              user_id: data.user.id,
              name,
              email
            }
          ]);
          
        if (profileError) {
          console.error("Error creating educator profile:", profileError);
        }
        
        // Check if email confirmation is required
        if (data?.user?.identities?.length === 0) {
          router.push("/educator/register/confirmation");
        } else {
          router.push(`/educator/${data.user.id}`);
        }
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Sign up with Google OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?userType=educator`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        throw error;
      }
      
      // The redirect happens automatically, no need to handle navigation here
    } catch (err: any) {
      console.error("Google sign up error:", err);
      setError(err.message || "Failed to sign up with Google. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="w-full py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <Image 
              src="/goldenratio.png" 
              alt="Golden Ratio Logo" 
              width={30} 
              height={30} 
              className="mr-2"
            />
            <span className="text-2xl font-semibold text-black-600">Babel</span>
          </Link>
          <div className="hidden md:flex space-x-6 text-gray-600 dark:text-gray-300">
            <Link href="/product" className="hover:text-blue-600 transition-colors">Product</Link>
            <Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
            <Link href="/demo" className="hover:text-blue-600 transition-colors">Book a demo</Link>
          </div>
          <div className="flex space-x-4">
            <Link href="/educator/login">
              <Button variant="outline" className="border-blue-600 text-blue-600">For Educators</Button>
            </Link>
            <Link href="/student/login">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">For Students</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Registration Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <div className="mb-6">
              <Link href="/" className="flex items-center text-blue-600 mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to home
              </Link>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Create your educator account
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Join Babel to create and manage your courses.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2 py-5 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={handleGoogleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <span className="animate-spin mr-2">⚪</span>
                ) : (
                  <Image src="/Google__G__logo.svg" alt="Google" width={20} height={20} />
                )}
                <span>Sign up with Google</span>
              </Button>

              <div className="flex items-center">
                <Separator className="flex-1" />
                <span className="px-4 text-sm text-gray-500">or</span>
                <Separator className="flex-1" />
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    type="text" 
                    placeholder="John Doe" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    placeholder="••••••••" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link href="/educator/login" className="text-blue-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © 2025 Babel Corporation. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
} 