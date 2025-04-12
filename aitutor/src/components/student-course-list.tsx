"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, FileText, Clock, ExternalLink } from "lucide-react"
import { supabase } from "@/lib/supabase"

// Define interfaces for our data
interface Course {
  id: string
  name: string
  code: string
  description: string
  color?: string
}

interface Assignment {
  id: string
  name: string
  due_date: string
  course_id: string
}

interface StudentCourseListProps {
  studentId: string;
}

export function StudentCourseList({ studentId }: StudentCourseListProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Array of colors to assign to courses
  const courseColors = [
    "text-blue-600",
    "text-green-600",
    "text-purple-600",
    "text-red-600",
    "text-amber-600",
    "text-teal-600",
    "text-indigo-600",
    "text-pink-600"
  ]
  
  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true)
        
        // 1. Get the course IDs that the student is enrolled in
        const { data: userCourses, error: userCoursesError } = await supabase
          .from('users_courses')
          .select('course_id')
          .eq('user_id', studentId)
        
        if (userCoursesError) throw userCoursesError
        
        if (!userCourses || userCourses.length === 0) {
          setCourses([])
          setLoading(false)
          return
        }
        
        // 2. Get the course information for each course ID
        const courseIds = userCourses.map(uc => uc.course_id)
        const { data: courseData, error: coursesError } = await supabase
          .from('courses')
          .select('id, name, code, description')
          .in('id', courseIds)
        
        if (coursesError) throw coursesError
        
        // 3. Assign a color to each course
        const coursesWithColors = courseData?.map((course, index) => ({
          ...course,
          color: courseColors[index % courseColors.length]
        })) || []
        
        setCourses(coursesWithColors)
        
        // 4. Fetch assignments for each course
        const assignmentsByCourseid: Record<string, Assignment[]> = {}
        
        if (courseData && courseData.length > 0) {
          for (const course of courseData) {
            const { data: courseAssignments, error: assignmentsError } = await supabase
              .from('assignments')
              .select('id, name, due_date, course_id')
              .eq('course_id', course.id)
              .order('due_date', { ascending: true })
            
            if (!assignmentsError && courseAssignments) {
              assignmentsByCourseid[course.id] = courseAssignments
            }
          }
        }
        
        setAssignments(assignmentsByCourseid)
      } catch (err: any) {
        console.error('Error loading courses:', err)
        setError(err.message || 'Failed to load courses')
      } finally {
        setLoading(false)
      }
    }
    
    if (studentId) {
      loadCourses()
    }
  }, [studentId])
  
  if (loading) {
    return (
      <div className="w-full flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="rounded-md border border-red-200 p-6 text-center text-red-700">
        <p>{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
          Try Again
        </Button>
      </div>
    )
  }
  
  if (courses.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center">
        <h3 className="text-lg font-medium">No courses joined yet</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Join a course to get started with your learning journey.
        </p>
      </div>
    )
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => {
        const courseSlug = course.code.toLowerCase().replace(/\s+/g, '-')
        const courseAssignments = assignments[course.id] || []
        const nextDueAssignment = courseAssignments.length > 0 ? courseAssignments[0] : null
        const daysUntilDue = nextDueAssignment 
          ? getDaysUntilDue(nextDueAssignment.due_date)
          : null
        
        // Calculate a simple progress percentage (in a real app this would be based on completed assignments)
        const progressPercentage = Math.floor(Math.random() * 100) // Replace with real data
        
        return (
          <Link 
            key={course.id} 
            href={`/student/${studentId}/${courseSlug}`}
            className="block h-full transition-transform hover:scale-[1.02]"
          >
            <Card className="h-full overflow-hidden border border-gray-200 shadow-sm hover:shadow">
              <CardHeader className="">
                <CardTitle className={`text-xl font-bold ${course.color}`}>{course.name}</CardTitle>
                <CardDescription>{course.code}</CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">                
                <div className="grid grid-cols-12 gap-2 text-sm">
                  <div className="col-span-5 flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-gray-400" />
                    <span className="truncate">{courseAssignments.length} Assignments</span>
                  </div>
                  <div className="col-span-5 flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-gray-400" />
                    <span className="truncate">
                      {nextDueAssignment
                        ? `Next due: ${daysUntilDue}`
                        : "No upcoming due dates"}
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button variant="ghost" size="icon">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <span>Progress</span>
                    <span>{progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-secondary h-1.5 rounded-full">
                    <div 
                      className="bg-primary h-1.5 rounded-full" 
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

// Helper function to format the due date
function getDaysUntilDue(dueDate: string): string {
  const due = new Date(dueDate)
  const now = new Date()
  const diffTime = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return "Overdue"
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays < 7) return `${diffDays} days`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''}`
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''}`
} 