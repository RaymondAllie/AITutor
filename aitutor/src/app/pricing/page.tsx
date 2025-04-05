"use client"

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Pricing() {
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

      {/* Pricing Section */}
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">Pricing</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-12">
            Babel is free for up to 40 users.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Up to 40 users</h2>
              <p className="text-xl font-semibold mb-4 text-blue-600">Free</p>
              <ul className="text-left mb-6 space-y-2">
                <li>✓ All integrations</li>
                <li>✓ Unlimited courses</li>
                <li>✓ Email support</li>
              </ul>
              <Link href="/educator/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">Start for free</Button>
              </Link>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Up to 150 users</h2>
              <p className="text-xl font-semibold mb-4 text-blue-600">$3,000/year</p>
              <ul className="text-left mb-6 space-y-2">
                <li>✓ Everything in free</li>
                <li>✓ Priority support</li>
                <li>✓ Dedicated success manager</li>
              </ul>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">Contact sales</Button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Up to 250 users</h2>
              <p className="text-xl font-semibold mb-4 text-blue-600">$4,000/year</p>
              <ul className="text-left mb-6 space-y-2">
                <li>✓ Everything in 150 users</li>
                <li>✓ Custom integrations</li>
                <li>✓ Advanced analytics</li>
              </ul>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">Contact sales</Button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">Unlimited</h2>
                <p className="text-xl font-semibold mb-4 text-blue-600">Custom</p>
                <ul className="text-left mb-6 space-y-2">
                    <li>✓ Everything in 150 users</li>
                    <li>✓ Custom integrations</li>
                    <li>✓ Advanced analytics</li>
                </ul>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">Contact sales</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
