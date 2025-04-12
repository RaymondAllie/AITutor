"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PlusCircle, Calendar, FileText, Users, Layers, Copy } from "lucide-react"
import { CourseList } from "@/components/course-list"
import { AddCourseModal } from "@/components/add-course-modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
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
  join_code: string
}

export default function Educator() {
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const params = useParams()
  const educatorId = params.educatorId as string

  const loadUserAndCourses = async () => {
    setLoading(true)
    try {
      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('id', educatorId)
        .single()

      if (userError) throw userError
      
      // Check if the user has the educator role
      if (userData.role !== 'educator') {
        console.error('Unauthorized: User is not an educator')
        // Redirect to login page
        window.location.href = '/educator/login?error=unauthorized'
        return
      }
      
      setUser(userData)

      // Fetch user's courses via join table
      const { data: userCourses, error: coursesError } = await supabase
        .from('users_courses')
        .select('course_id')
        .eq('user_id', educatorId)

      if (coursesError) throw coursesError

      if (userCourses && userCourses.length > 0) {
        // Get the course IDs from the join table
        const courseIds = userCourses.map(uc => uc.course_id)

        // Fetch the actual course data
        const { data: coursesData, error: coursesDataError } = await supabase
          .from('courses')
          .select('id, name, description, course_code, join_code')
          .in('id', courseIds)

        if (coursesDataError) throw coursesDataError
        setCourses(coursesData || [])
      } else {
        setCourses([])
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (educatorId) {
      loadUserAndCourses()
    }
  }, [educatorId])

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Hi, {user?.name || 'Educator'}
          </h1>
          <p className="text-muted-foreground">
            Manage your courses, assignments, and student progress.
          </p>
        </div>
        <Button onClick={() => setIsAddCourseModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Course
        </Button>
      </div>

      <Tabs defaultValue="all-courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all-courses">Active Courses</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all-courses" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Courses</h2>
          </div>
          
          {courses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <Link href={`/educator/${educatorId}/${course.course_code.replace(/\s+/g, '-')}`} key={course.id}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl">{course.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{course.course_code}</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{course.description}</p>
                      <div className="mt-2 flex items-center">
                        <div 
                          className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-200 transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            navigator.clipboard.writeText(course.join_code);
                            toast.success("Join code copied to clipboard");
                          }}
                        >
                          <span className="text-sm font-medium">{course.join_code}</span>
                          <Copy className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-12 text-center">
              <h3 className="text-lg font-medium">No courses found</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first course to get started.
              </p>
              <Button onClick={() => setIsAddCourseModalOpen(true)} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Course
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="archived">
          <div className="rounded-md border border-dashed p-12 text-center">
            <h3 className="text-lg font-medium">Archived Courses Tab Content</h3>
            <p className="text-sm text-muted-foreground mt-2">
              This tab would show archived courses.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <AddCourseModal 
        isOpen={isAddCourseModalOpen} 
        onClose={() => setIsAddCourseModalOpen(false)} 
        userId={educatorId}
        onCourseCreated={loadUserAndCourses}
      />
    </div>
  )
}

