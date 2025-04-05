"use client"

/* First make sure that you have installed the package */

/* If you are using yarn */
// yarn add @calcom/embed-react

/* If you are using npm */
// npm install @calcom/embed-react

import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Demo() {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({"namespace":"30min"});
      cal("ui", {
        "cssVarsPerTheme": {
          "light": {"cal-brand": "#4192f1"},
          "dark": {"cal-brand": "#325fbf"}
        },
        "hideEventTypeDetails": false,
        "layout": "month_view"
      });
    })();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
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
            <Link href="https://cal.com/babeledu" className="hover:text-blue-600 transition-colors">Book a demo</Link>
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

      {/* Calendar Section */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Book a Demo</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 h-[600px]">
          <Cal 
            namespace="30min"
            calLink="babeledu/30min"
            style={{width:"100%", height:"100%", overflow:"scroll"}}
            config={{
              "layout": "month_view",
              "theme": "auto"
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © 2025 Babel Corporation. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
