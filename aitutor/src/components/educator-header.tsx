"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import { BookOpen, GraduationCap, Calendar, Bell, Settings, Users, LayoutDashboard } from "lucide-react"
import Image from "next/image"

// Mock data for courses - in a real app, this would be fetched from a database
const courses = [
  { 
    id: 1, 
    name: "Introduction to Computer Science", 
    code: "CS101",
    slug: "introduction-to-computer-science"
  },
  { 
    id: 2, 
    name: "Data Structures and Algorithms", 
    code: "CS201",
    slug: "data-structures-and-algorithms"
  },
  { 
    id: 3, 
    name: "Web Development", 
    code: "CS301",
    slug: "web-development"
  },
  { 
    id: 4, 
    name: "Machine Learning", 
    code: "CS401",
    slug: "machine-learning"
  },
]

export function EducatorHeader() {
  const pathname = usePathname()
  const educatorId = "teacher123" // In a real app, this would come from auth
  
  const isActive = (path: string) => {
    return pathname?.startsWith(path)
  }
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center">
        <div className="mr-4 flex">
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
        </div>
        
        <Separator orientation="vertical" className="mx-4 h-6" />
        
        <NavigationMenu className="mx-6">
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href={`/educator/${educatorId}`} legacyBehavior passHref>
                <NavigationMenuLink className={cn(
                  navigationMenuTriggerStyle(),
                  isActive(`/educator/${educatorId}`) ? "bg-accent text-accent-foreground" : ""
                )}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>
                <BookOpen className="mr-2 h-4 w-4" />
                Courses
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                  <li className="row-span-3">
                    <div className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-blue-50 to-blue-100 p-6">
                      <div className="mb-2 mt-4 text-lg font-medium">
                        Course Management
                      </div>
                      <p className="text-sm leading-tight text-muted-foreground">
                        Create and manage your courses, set up assignments, and track student progress.
                      </p>
                    </div>
                  </li>
                  {courses.map((course) => (
                    <li key={course.id}>
                      <Link href={`/educator/${educatorId}/${course.slug}`} legacyBehavior passHref>
                        <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                          <div className="text-sm font-medium leading-none">{course.name}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {course.code}
                          </p>
                        </NavigationMenuLink>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href="/educator" legacyBehavior passHref>
                      <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground bg-gray-100 text-gray-600">
                        <div className="text-sm font-medium leading-none">Add New Course</div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Create a new course for your students.
                        </p>
                      </NavigationMenuLink>
                    </Link>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/educator/students" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  <Users className="mr-2 h-4 w-4" />
                  Students
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        
        {/* <div className="ml-auto flex items-center space-x-4">
          <Avatar>
            <AvatarImage src="/avatars/teacher.jpg" alt="Teacher" />
            <AvatarFallback>TE</AvatarFallback>
          </Avatar>
        </div> */}
      </div>
    </header>
  )
} 