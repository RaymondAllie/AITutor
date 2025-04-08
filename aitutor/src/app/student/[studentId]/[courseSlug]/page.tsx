"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, Book, FileText, Calendar, HelpCircle, MessageSquare, CheckCircle, Clock, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

// Define interfaces to match your database schema
interface Material {
  id: string
  name: string
  type: string
  created_at?: string
  course_id?: string
}

interface Problem {
  id: string
  question: string
  assignment_id: string
  completed?: boolean
}

interface Assignment {
  id: string
  name: string
  due_date: string
  description: string
  material_ids: string[]
  status?: "completed" | "pending" | "upcoming"
  completed_problems?: number
  total_problems?: number
  problems?: Problem[]
}

interface Course {
  id: string
  name: string
  course_code: string
  description: string
  instructor_name?: string
  materials: Material[]
  assignments: Assignment[]
}

export default function StudentCoursePage() {
  const params = useParams()
  const { studentId, courseSlug } = params
  
  // State for the course data
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showChatHelp, setShowChatHelp] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  
  useEffect(() => {
    const fetchCourseData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Format courseSlug by replacing dashes with spaces
        const formattedCourseSlug = courseSlug ? (courseSlug as string).replace(/-/g, ' ') : '';
        
        // 1. Fetch the course basic information
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('course_code', formattedCourseSlug)
          .single()
          
        if (courseError) throw courseError
        if (!courseData) throw new Error("Course not found")
        
        // 2. Fetch materials for this course
        const { data: materialsData, error: materialsError } = await supabase
          .from('materials')
          .select('*')
          .eq('course_id', courseData.id)
          
        if (materialsError) throw materialsError
        
        // 3. Fetch assignments for this course using the courses_assignments join table
        const { data: coursesAssignmentsData, error: coursesAssignmentsError } = await supabase
          .from('courses_assignments')
          .select('assignment_id')
          .eq('course_id', courseData.id)
          
        if (coursesAssignmentsError) throw coursesAssignmentsError
        
        // Get assignment IDs from the join table
        const assignmentIds = coursesAssignmentsData.map(row => row.assignment_id)
        
        // If no assignments, set empty array
        if (assignmentIds.length === 0) {
          // Combine all data with empty assignments
          const fullCourseData: Course = {
            ...courseData,
            instructor_name: "Instructor",
            materials: materialsData || [],
            assignments: []
          }
          
          setCourse(fullCourseData)
          setLoading(false)
          return
        }
        
        // Fetch the actual assignment data
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select('*')
          .in('id', assignmentIds)
          
        if (assignmentsError) throw assignmentsError
        
        // 4. For each assignment, count the number of problems and get student progress
        const assignmentsWithProblems = await Promise.all(
          assignmentsData.map(async (assignment) => {
            // Get all problems for this assignment using assignments_problems join table
            const { data: assignmentProblemsData, error: assignmentProblemsError } = await supabase
              .from('assignments_problems')
              .select('problem_id')
              .eq('assignment_id', assignment.id)
              
            if (assignmentProblemsError) {
              console.error("Error fetching assignment problems:", assignmentProblemsError)
              return { 
                ...assignment, 
                total_problems: 0,
                completed_problems: 0,
                problems: [],
                status: "upcoming"
              }
            }

            // Get the problem IDs from the join table
            const problemIds = assignmentProblemsData.map(row => row.problem_id)
            
            if (problemIds.length === 0) {
              return { 
                ...assignment, 
                total_problems: 0,
                completed_problems: 0,
                problems: [],
                status: "upcoming"
              }
            }
            
            // Fetch the actual problem data
            const { data: problemsData, error: problemsError } = await supabase
              .from('problems')
              .select('*')
              .in('id', problemIds)
              
            if (problemsError) {
              console.error("Error fetching problems:", problemsError)
              return { 
                ...assignment, 
                total_problems: 0,
                completed_problems: 0,
                problems: [],
                status: "upcoming"
              }
            }
            
            // Get student's progress for this assignment's problems
            const { data: progressData, error: progressError } = await supabase
              .from('student_progress')
              .select('*')
              .eq('assignment_id', assignment.id)
              .eq('student_id', studentId)
              
            // Map completed status to problems
            const problemsWithStatus = problemsData.map(problem => {
              const isCompleted = progressData?.some(
                progress => progress.problem_id === problem.id && progress.completed
              ) || false
              
              return {
                ...problem,
                completed: isCompleted
              }
            })
            
            // Count completed problems
            const completedCount = problemsWithStatus.filter(p => p.completed).length
            
            // Determine assignment status
            let status: "completed" | "pending" | "upcoming" = "upcoming"
            
            if (completedCount > 0) {
              status = completedCount === problemsData.length ? "completed" : "pending"
            } else {
              // If due date is within 3 days, mark as pending
              const dueDate = new Date(assignment.due_date)
              const now = new Date()
              const threeDaysFromNow = new Date()
              threeDaysFromNow.setDate(now.getDate() + 3)
              
              if (dueDate <= threeDaysFromNow) {
                status = "pending"
              }
            }
            
            return { 
              ...assignment, 
              total_problems: problemsData.length,
              completed_problems: completedCount,
              problems: problemsWithStatus,
              status
            }
          })
        )
        
        // 5. Fetch user data for educator name
        let instructorName = "Instructor"
        if (courseData?.user_id) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('name')
            .eq('id', courseData.user_id)
            .single()
            
          if (!userError && userData) {
            instructorName = userData.name
          }
        }
        
        // Combine all data
        const fullCourseData: Course = {
          ...courseData,
          instructor_name: instructorName,
          materials: materialsData || [],
          assignments: assignmentsWithProblems || []
        }
        
        setCourse(fullCourseData)
      } catch (err: any) {
        console.error("Error fetching course data:", err)
        setError(err.message || "Failed to load course data")
      } finally {
        setLoading(false)
      }
    }
    
    if (courseSlug && studentId) {
      fetchCourseData()
    }
  }, [studentId, courseSlug])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
        <p className="text-gray-500 mb-6">
          {error || "The course you're looking for doesn't exist or you don't have permission to view it."}
        </p>
        <Button asChild>
          <a href="/student">Go Back to Dashboard</a>
        </Button>
      </div>
    )
  }
  
  // Sort assignments by due date
  const sortedAssignments = [...course.assignments].sort((a, b) => 
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  )

  // Get material type icon
  const getMaterialIcon = (type: string) => {
    switch(type) {
      case 'textbook': return <Book className="h-5 w-5" />;
      case 'powerpoint': return <FileText className="h-5 w-5" />;
      case 'slides': return <FileText className="h-5 w-5" />;
      case 'pset': return <FileText className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'No due date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  }
  
  // Format date (short)
  const formatShortDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  }

  // Handle chat submission
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send the message to an LLM API
    console.log("Sending question to LLM:", chatMessage);
    // Reset the input
    setChatMessage("");
    // Would normally display response from LLM here
  }
  
  return (
    <div className="w-full space-y-8">
      {/* Course Header */}
      <div className="border-b pb-6">
        <h1 className="text-4xl font-bold tracking-tight">{course.name}</h1>
        <div className="flex items-center space-x-2 mt-2 text-gray-600">
          <span className="font-medium">{course.course_code}</span>
          <span>•</span>
          <span>{course.instructor_name || "Instructor"}</span>
        </div>
        <p className="mt-4 text-gray-700">
          {course.description}
        </p>
      </div>
      
      {/* Course Materials Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Course Materials</h2>
        </div>
        
        {course.materials.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-gray-50">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-700">No Materials Available</h3>
            <p className="text-gray-500 max-w-md mx-auto mt-2">
              The instructor hasn't added any course materials yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {course.materials.map((material) => (
              <Card key={material.id} className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100">
                <div className="flex px-4 py-3 items-center">
                  <div className="mr-3 rounded-lg">
                    {getMaterialIcon(material.type || 'other')}
                  </div>
                  <div>
                    <h3 className="font-semibold">{material.name}</h3>
                    <p className="text-xs text-gray-500 capitalize">{material.type || 'Resource'}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="ml-auto">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Assignments Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Assignments</h2>
        </div>
        
        {course.assignments.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-gray-50">
            <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-700">No Assignments Available</h3>
            <p className="text-gray-500 max-w-md mx-auto mt-2">
              The instructor hasn't added any assignments yet.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="item-1" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
              <TabsTrigger value="item-1" className="text-xs py-1">All</TabsTrigger>
              <TabsTrigger value="item-2" className="text-xs py-1">Completed</TabsTrigger>
              <TabsTrigger value="item-3" className="text-xs py-1">Pending</TabsTrigger>
            </TabsList>
            <TabsContent value="item-1" className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">All Assignments</h2>
              <div className="grid gap-4">
                {sortedAssignments.map((assignment) => (
                  <Card key={assignment.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{assignment.name}</CardTitle>
                          <CardDescription>Due: {formatDate(assignment.due_date)}</CardDescription>
                        </div>
                        <div className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {formatShortDate(assignment.due_date)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm flex items-center gap-1">
                          {assignment.status === "completed" ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500" />
                          )}
                          <span className={
                            assignment.status === "completed" 
                              ? "text-emerald-600" 
                              : assignment.completed_problems && assignment.completed_problems > 0 
                                ? "text-amber-600" 
                                : "text-gray-600"
                          }>
                            {assignment.completed_problems || 0}/{assignment.total_problems || 0} questions completed
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {assignment.total_problems || 0} {(assignment.total_problems || 0) === 1 ? 'question' : 'questions'}
                        </span>
                      </div>
                      {/* Add progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div 
                          className={`h-1.5 rounded-full ${
                            assignment.status === "completed" 
                              ? "bg-emerald-500" 
                              : assignment.completed_problems && assignment.completed_problems > 0 
                                ? "bg-amber-500" 
                                : "bg-blue-500"
                          }`} 
                          style={{ width: `${assignment.total_problems ? ((assignment.completed_problems || 0) / assignment.total_problems) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className="text-xs py-1 h-8 px-3"
                        variant={assignment.status === "completed" ? "outline" : "default"}
                        asChild
                      >
                        <Link href={`/student/${studentId}/${courseSlug}/${assignment.name.toLowerCase().replace(/\s+/g, '-')}`}>
                          {assignment.status === "completed" 
                            ? "Review Assignment" 
                            : assignment.status === "pending" 
                              ? "Continue Assignment" 
                              : "Start Assignment"}
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="item-2" className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Completed Assignments</h2>
              {course.assignments.filter(a => a.status === "completed").length > 0 ? (
                <div className="grid gap-4">
                  {course.assignments
                    .filter(assignment => assignment.status === "completed")
                    .map((assignment) => (
                      <Card key={assignment.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">{assignment.name}</CardTitle>
                              <CardDescription>Due: {formatDate(assignment.due_date)}</CardDescription>
                            </div>
                            <div className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {formatShortDate(assignment.due_date)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="text-sm flex items-center gap-1">
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                              <span className="text-emerald-600">
                                {assignment.completed_problems || 0}/{assignment.total_problems || 0} questions completed
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div 
                              className="bg-emerald-500 h-1.5 rounded-full" 
                              style={{ width: `${assignment.total_problems ? ((assignment.completed_problems || 0) / assignment.total_problems) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            className="text-xs py-1 h-8 px-3"
                            variant="outline"
                            asChild
                          >
                            <Link href={`/student/${studentId}/${courseSlug}/${assignment.name.toLowerCase().replace(/\s+/g, '-')}`}>
                              Review Assignment
                            </Link>
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="text-center p-6 border border-dashed rounded-md">
                  <p className="text-gray-500">No completed assignments yet.</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="item-3" className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Pending Assignments</h2>
              {course.assignments.filter(a => a.status === "pending" || a.status === "upcoming").length > 0 ? (
                <div className="grid gap-4">
                  {course.assignments
                    .filter(assignment => assignment.status === "pending" || assignment.status === "upcoming")
                    .map((assignment) => (
                      <Card key={assignment.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">{assignment.name}</CardTitle>
                              <CardDescription>Due: {formatDate(assignment.due_date)}</CardDescription>
                            </div>
                            <div className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              {formatShortDate(assignment.due_date)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="text-sm flex items-center gap-1">
                              <Clock className="h-4 w-4 text-amber-500" />
                              <span className={assignment.status === "pending" ? "text-amber-600" : "text-gray-600"}>
                                {assignment.completed_problems || 0}/{assignment.total_problems || 0} questions completed
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div 
                              className={assignment.status === "pending" ? "bg-amber-500 h-1.5 rounded-full" : "bg-blue-500 h-1.5 rounded-full"}
                              style={{ width: `${assignment.total_problems ? ((assignment.completed_problems || 0) / assignment.total_problems) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            className="text-xs py-1 h-8 px-3"
                            asChild
                          >
                            <Link href={`/student/${studentId}/${courseSlug}/${assignment.name.toLowerCase().replace(/\s+/g, '-')}`}>
                              {assignment.status === "pending" ? "Continue Assignment" : "Start Assignment"}
                            </Link>
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="text-center p-6 border border-dashed rounded-md">
                  <p className="text-gray-500">No pending assignments.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      
      {/* AI Tutor Section - commented out for now */}
      <div>
        {/* <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Babel</h2>
        </div>
        
        <Card className="border-2 border-blue-200 shadow-sm">
          <CardHeader>
            <CardTitle>Need help with your coursework?</CardTitle>
            <CardDescription>
              Babel can help you understand concepts, work through problems, and prepare for exams.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowChatHelp(!showChatHelp)} className="w-full bg-blue-600 hover:bg-blue-700">
              <MessageSquare className="mr-2 h-4 w-4" />
              Start a Tutoring Session
            </Button>
            
            {showChatHelp && (
              <div className="mt-4 border rounded-lg p-4">
                <h3 className="font-medium mb-2">Ask Babel a question</h3>
                <form onSubmit={handleChatSubmit} className="space-y-4">
                  <textarea
                    className="w-full p-2 border rounded-md"
                    rows={3}
                    placeholder="e.g., Can you explain how linked lists work?"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                  ></textarea>
                  <Button type="submit" disabled={!chatMessage.trim()}>
                    Send Question
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card> */}
      </div>
    </div>
  )
}
