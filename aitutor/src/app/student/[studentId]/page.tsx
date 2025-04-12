"use client"

import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Calendar, Clock, PlusCircle } from "lucide-react"
import { JoinCourseModal } from "@/components/join-course-modal"
import { supabase } from "@/lib/supabase"

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
}

export default function StudentDashboard() {
  const params = useParams()
  const searchParams = useSearchParams()
  const studentId = params.studentId as string
  const shouldOpenJoinModal = searchParams.get('join') === 'true'
  const [joinCourseModalOpen, setJoinCourseModalOpen] = useState(shouldOpenJoinModal)
  const [user, setUser] = useState<User | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  
  // Function to load user data and courses, similar to educator page
  const loadUserAndCourses = async () => {
    setLoading(true)
    try {
      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('id', studentId)
        .single()

      if (userError) throw userError
      
      // Check if the user has the student role
      if (userData.role !== 'student') {
        console.error('Unauthorized: User is not a student')
        // Redirect to login page
        window.location.href = '/student/login?error=unauthorized'
        return
      }
      
      setUser(userData)

      // Fetch user's courses via join table
      const { data: userCourses, error: coursesError } = await supabase
        .from('users_courses')
        .select('course_id')
        .eq('user_id', studentId)

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
    if (studentId) {
      loadUserAndCourses()
    }
  }, [studentId])
  
  // Update modal state when URL query parameter changes
  useEffect(() => {
    setJoinCourseModalOpen(shouldOpenJoinModal)
  }, [shouldOpenJoinModal])
  
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
            Hi, {user?.name || 'Student'}
          </h1>
          <p className="text-muted-foreground">
            View your courses, assignments, and track your progress.
          </p>
        </div>
        <Button onClick={() => setJoinCourseModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Join Course
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
          
          {/* Replace StudentCourseList with direct course rendering */}
          {courses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <Link href={`/student/${studentId}/${course.course_code.replace(/\s+/g, '-')}`} key={course.id}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl">{course.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{course.course_code}</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{course.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-12 text-center">
              <h3 className="text-lg font-medium">No courses joined yet</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Join a course to get started with your learning journey.
              </p>
              <Button onClick={() => setJoinCourseModalOpen(true)} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Join Course
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="archived">
          <div className="rounded-md border border-dashed p-12 text-center">
            <h3 className="text-lg font-medium">Archived Courses</h3>
            <p className="text-sm text-muted-foreground mt-2">
              This tab would show your archived courses.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Join Course Modal */}
      <JoinCourseModal 
        isOpen={joinCourseModalOpen} 
        onClose={() => setJoinCourseModalOpen(false)} 
        userId={studentId}
        onCourseJoined={loadUserAndCourses}
      />
    </div>
  )
} 