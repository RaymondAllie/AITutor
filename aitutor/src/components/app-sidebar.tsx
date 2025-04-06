"use client"

import Link from "next/link"
import { useRouter, usePathname, useParams } from "next/navigation"
import { useState, useEffect } from "react"
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
import { BookOpen, Calendar, Bell, Settings, Users, LayoutDashboard, ChevronDown, ChevronRight, LogOut, ChevronUp, Loader2 } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { AddCourseModal } from "./add-course-modal"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface User {
  id: string
  name: string
  email: string
}

interface Course {
  id: string
  name: string
  description: string
  course_code: string
  slug?: string
}

export function AppSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const userId = (params?.educatorId || params?.studentId) as string
  
  const [user, setUser] = useState<User | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [coursesExpanded, setCoursesExpanded] = useState(true)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [addCourseModalOpen, setAddCourseModalOpen] = useState(false)
  
  const isEducator = pathname?.includes('/educator/')
  const isStudent = pathname?.includes('/student/')
  
  // Load user data and courses
  useEffect(() => {
    const loadUserAndCourses = async () => {
      if (!userId) return
      
      setLoading(true)
      try {
        // Fetch user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', userId)
          .single()

        if (userError) throw userError
        setUser(userData)

        // Fetch user's courses via join table
        const { data: userCourses, error: coursesError } = await supabase
          .from('users_courses')
          .select('course_id')
          .eq('user_id', userId)

        if (coursesError) throw coursesError

        if (userCourses && userCourses.length > 0) {
          // Get the course IDs from the join table
          const courseIds = userCourses.map(uc => uc.course_id)

          // Fetch the actual course data
          const { data: coursesData, error: coursesDataError } = await supabase
            .from('courses')
            .select('id, name, description, course_code')
            .in('id', courseIds)

          if (coursesDataError) throw coursesDataError
          
          // Add slug to each course
          const coursesWithSlugs = coursesData?.map(course => ({
            ...course,
            slug: course.name.toLowerCase().replace(/\s+/g, '-')
          })) || []
          
          setCourses(coursesWithSlugs)
        } else {
          setCourses([])
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserAndCourses()
  }, [userId])
  
  const isActive = (path: string) => {
    return pathname?.startsWith(path)
  }
  
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      toast.success("Signed out successfully")
      router.push("/")
    } catch (err: any) {
      console.error("Error signing out:", err)
      toast.error(err.message || "Failed to sign out. Please try again.")
    }
  }

  const handleCourseCreated = async () => {
    // Reload courses after a new one is created
    if (!userId) return
    
    try {
      // Fetch user's courses via join table
      const { data: userCourses, error: coursesError } = await supabase
        .from('users_courses')
        .select('course_id')
        .eq('user_id', userId)

      if (coursesError) throw coursesError

      if (userCourses && userCourses.length > 0) {
        // Get the course IDs from the join table
        const courseIds = userCourses.map(uc => uc.course_id)

        // Fetch the actual course data
        const { data: coursesData, error: coursesDataError } = await supabase
          .from('courses')
          .select('id, name, description, course_code')
          .in('id', courseIds)

        if (coursesDataError) throw coursesDataError
        
        // Add slug to each course
        const coursesWithSlugs = coursesData?.map(course => ({
          ...course,
          slug: course.name.toLowerCase().replace(/\s+/g, '-')
        })) || []
        
        setCourses(coursesWithSlugs)
      }
    } catch (error) {
      console.error('Error refreshing courses:', error)
    }
  }
  
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center space-x-2 px-4 py-3">
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {isEducator && (
            <Link href={`/educator/${userId}`} className={cn(
              "flex items-center px-4 py-2 hover:bg-accent",
              isActive(`/educator/${userId}`) && !pathname?.includes('/student/') ? "bg-accent text-accent-foreground" : ""
            )}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          )}
          
          {isStudent && (
            <Link href={`/student/${userId}`} className={cn(
              "flex items-center px-4 py-2 hover:bg-accent",
              isActive(`/student/${userId}`) && !pathname?.includes('/educator/') ? "bg-accent text-accent-foreground" : ""
            )}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          )}
          
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
                {loading ? (
                  <div className="flex items-center py-2 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Loading courses...
                  </div>
                ) : courses.length > 0 ? (
                  courses.map((course) => (
                    <Link 
                      key={course.id}
                      href={isEducator 
                        ? `/educator/${userId}/${course.slug}` 
                        : `/student/${userId}/${course.slug}`
                      }
                      className="block py-1 text-sm hover:text-primary"
                    >
                      {course.name}
                    </Link>
                  ))
                ) : (
                  <div className="py-1 text-sm text-muted-foreground">
                    No courses found
                  </div>
                )}
                
                {isEducator && (
                  <button 
                    onClick={() => setAddCourseModalOpen(true)}
                    className="block py-1 text-sm text-muted-foreground hover:text-primary w-full text-left"
                  >
                    + Add New Course
                  </button>
                )}
                
                {isStudent && (
                  <Link 
                    href={`/student/${userId}?join=true`}
                    className="block py-1 text-sm text-muted-foreground hover:text-primary"
                  >
                    + Join Course
                  </Link>
                )}
                
                {addCourseModalOpen && (
                  <AddCourseModal 
                    isOpen={addCourseModalOpen} 
                    onClose={() => setAddCourseModalOpen(false)}
                    userId={userId}
                    onCourseCreated={handleCourseCreated}
                  />
                )}
              </div>
            )}
          </div>
          
          {isEducator && (
            <Link href={`/educator/${userId}/students`} className="flex items-center px-4 py-2 hover:bg-accent">
              <Users className="mr-2 h-4 w-4" />
              Students
            </Link>
          )}
        </SidebarGroup>
    

      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-3">
          <div className="relative">
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:bg-accent rounded-md p-2"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            >
              <div className="text-sm flex-1">
                <div className="font-medium">{user?.name || 'Loading...'}</div>
                <div className="text-muted-foreground">{user?.email || ''}</div>
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
                    onClick={handleSignOut}
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