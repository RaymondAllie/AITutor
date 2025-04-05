"use client"

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";

export default function EducatorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // This would connect to your auth system in a real application
    console.log("Logging in with email:", email, password);
  };

  const handleGoogleLogin = () => {
    // This would trigger OAuth with Google in a real application
    console.log("Logging in with Google");
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

      {/* Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <div className="mb-6">
              <Link href="/" className="flex items-center text-blue-600 mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to home
              </Link>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Sign in to your educator account
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back! Please sign in to access your courses.
              </p>
            </div>

            <div className="space-y-6">
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2 py-5 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={handleGoogleLogin}
              >
                <Image src="/Google__G__logo.svg" alt="Google" width={20} height={20} />
                <span>Sign in with Google</span>
              </Button>

              <div className="flex items-center">
                <Separator className="flex-1" />
                <span className="px-4 text-sm text-gray-500">or</span>
                <Separator className="flex-1" />
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/student/forgot-password" className="text-sm text-blue-600 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 dark:text-gray-400">
                    Remember me
                  </label>
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5">
                  Sign in
                </Button>
              </form>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{" "}
                <Link href="/student/register" className="text-blue-600 hover:underline">
                  Create one
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
