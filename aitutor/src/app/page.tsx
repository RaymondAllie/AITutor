import Image from "next/image";
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
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
      
      {/* Hero Section */}
      <header className="w-full py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            AI Tutor for Personalized Learning
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-8">
            Give every student tailored help and immediate feedback across all subjects
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-lg">
              Start for free
            </Button>
            <Button variant="outline" className="border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 px-8 py-6 text-lg rounded-lg">
              Book a demo
            </Button>
          </div>
        </div>
      </header>

      {/* Trusted By Section */}
      {/* <section className="w-full py-12 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-lg font-medium text-gray-500 dark:text-gray-400 mb-8">
            Trusted by leading educational institutions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center justify-items-center opacity-70">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 flex items-center">
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Features Section */}
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Personalized learning that actually works, in every subject
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Calculus & Linear Algebra",
                description: "Advanced mathematical problem solving with AI feedback tailored to university-level concepts.",
                icon: "📊"
              },
              {
                title: "Literature & Composition",
                description: "AI writing feedback on academic papers based on scholarly standards and citation styles.",
                icon: "📝"
              },
              {
                title: "Political Science",
                description: "Analyze complex geopolitical scenarios and debate theoretical frameworks with AI assistance.",
                icon: "🌍"
              },
              {
                title: "Biochemistry",
                description: "AI research assistance for laboratory reports and molecular visualization to enhance understanding.",
                icon: "🔬"
              },
              {
                title: "Software Engineering",
                description: "AI code review and debugging help for complex projects across multiple programming paradigms.",
                icon: "💻"
              },
              {
                title: "Linguistics & Translation",
                description: "Practice academic discourse in 50+ languages with specialized terminology for your field.",
                icon: "🗣️"
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{feature.description}</p>
                <Link href="#" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                  View examples →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {/* <section className="w-full py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            What educators are saying
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <p className="text-gray-600 dark:text-gray-300 italic mb-4">
                "I have students do written or spoken conversations with the AI. It lets advanced students go further while giving struggling students extra help — all based on the objectives I provide."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Sarah Johnson</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">French Teacher, Lincoln High School</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <p className="text-gray-600 dark:text-gray-300 italic mb-4">
                "The engagement with students is exceptionally high. I use it for coding assignments, and I can rotate as a facilitator while the AI automatically scales difficulty according to each student's skill level."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Michael Chen</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Computer Science Teacher, Tech Academy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Spark personalized learning in your classroom
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Sign up to start using Babel, free for up to 40 users.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-lg">
              Start for free
            </Button>
            <Button variant="outline" className="border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 px-8 py-6 text-lg rounded-lg">
              Request a demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 px-4 sm:px-6 lg:px-8 bg-gray-100 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Product</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Features</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Pricing</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Security</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">FAQs</Link></li>
            </ul>
          </div>
          
          {/* <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Blog</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Case Studies</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Webinars</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Help Center</Link></li>
            </ul>
          </div> */}
          
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Use Cases</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">K-12 Schools</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Universities</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Language Learning</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">STEM Education</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">About</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Careers</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Privacy</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Terms</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto">
          <p className="text-gray-500 dark:text-gray-400">© 2025 Babel Corporation. All rights reserved.</p>
          {/* <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="#" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Twitter</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </Link>
            <Link href="#" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">LinkedIn</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </Link>
          </div> */}
        </div>
      </footer>
    </div>
  );
}
