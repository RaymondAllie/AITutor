"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "sonner"
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
import { BookOpen, GraduationCap, Calendar, Bell, Settings, Users, LayoutDashboard, ChevronDown, ChevronRight, LogOut, ChevronUp } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { AddCourseModal } from "./add-course-modal"

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

export function AppSidebar() {
  const pathname = usePathname()
  const educatorId = "teacher123" // In a real app, this would come from auth
  const [coursesExpanded, setCoursesExpanded] = useState(true)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [addCourseModalOpen, setAddCourseModalOpen] = useState(false)
  
  const isActive = (path: string) => {
    return pathname?.startsWith(path)
  }
  
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center space-x-2 px-4 py-3">
          <GraduationCap className="h-6 w-6" />
          <span className="font-bold">Babel</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <Link href={`/educator/${educatorId}`} className={cn(
            "flex items-center px-4 py-2 hover:bg-accent",
            isActive(`/educator/${educatorId}`) ? "bg-accent text-accent-foreground" : ""
          )}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
          
          <div className="px-4 py-2">
            <button 
              onClick={() => setCoursesExpanded(!coursesExpanded)}
              className="flex items-center w-full text-left hover:text-primary"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Courses
              {coursesExpanded ? (
                <ChevronDown className="ml-auto h-4 w-4" />
              ) : (
                <ChevronRight className="ml-auto h-4 w-4" />
              )}
            </button>
            {coursesExpanded && (
              <div className="ml-6 mt-2 space-y-1">
                {courses.map((course) => (
                  <Link 
                    key={course.id}
                    href={`/educator/${educatorId}/${course.slug}`}
                    className="block py-1 text-sm hover:text-primary"
                  >
                    {course.name}
                  </Link>
                ))}
                <button 
                  onClick={() => setAddCourseModalOpen(true)}
                  className="block py-1 text-sm text-muted-foreground hover:text-primary w-full text-left"
                >
                  + Add New Course
                </button>
                {addCourseModalOpen && (
                  <AddCourseModal 
                    isOpen={addCourseModalOpen} 
                    onClose={() => setAddCourseModalOpen(false)} 
                  />
                )}
              </div>
            )}
          </div>
          
          <Link href={`/educator/${educatorId}/students`} className="flex items-center px-4 py-2 hover:bg-accent">
            <Users className="mr-2 h-4 w-4" />
            Students
          </Link>
        </SidebarGroup>
    

      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-3">
          <div className="relative">
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:bg-accent rounded-md p-2"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            >
              <Avatar>
                <AvatarImage src="/avatars/teacher.jpg" alt="Teacher" />
                <AvatarFallback>TE</AvatarFallback>
              </Avatar>
              <div className="text-sm flex-1">
                <div className="font-medium">Teacher Name</div>
                <div className="text-muted-foreground">teacher@example.com</div>
              </div>
              <ChevronUp className={`h-4 w-4 transition-transform ${profileMenuOpen ? '' : 'rotate-180'}`} />
            </div>
            
            {profileMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 right-0 bg-background rounded-md shadow-md border border-border z-50">
                <div className="p-2 space-y-1">
                  <Link href="/settings" className="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-accent">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                  <button 
                    className="w-full flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-accent text-red-500"
                    onClick={() => console.log('Logout clicked')}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarFooter>
      <Toaster />
    </Sidebar>
  )
}