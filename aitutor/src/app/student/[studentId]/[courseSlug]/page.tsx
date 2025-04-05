"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, Book, FileText, Calendar, HelpCircle, Download, MessageSquare, CheckCircle, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

// Mock course data - in a real app, this would be fetched from Supabase
const mockCourse = {
  id: "course123",
  name: "Introduction to Computer Science",
  code: "CS101",
  instructor: "Dr. Jane Smith",
  description: "A comprehensive introduction to the fundamental concepts of computer science.",
  materials: [
    { id: "m1", name: "Computer Science: An Overview", type: "textbook" },
    { id: "m2", name: "Week 1: Introduction to Programming", type: "slides" },
    { id: "m3", name: "Week 2: Data Structures", type: "slides" },
    { id: "m4", name: "Problem Set 1", type: "pset" },
    { id: "m5", name: "Problem Set 2", type: "pset" },
    { id: "m6", name: "Coding Style Guide", type: "resource" },
  ],
  assignments: [
    { 
      id: "a1", 
      name: "Hello World Program", 
      dueDate: "2025-04-10",
      description: "Write a simple program that outputs 'Hello, World!' to the console.",
      status: "completed",
      completedQuestions: 3,
      totalQuestions: 3,
      questions: [
        { id: "q1", text: "What is the output of the program?", completed: true },
        { id: "q2", text: "What is the main function of the program?", completed: true },
        { id: "q3", text: "What is the purpose of the program?", completed: true },
      ]
    },
    { 
      id: "a2", 
      name: "Basic Algorithms", 
      dueDate: "2025-04-24",
      description: "Implement three basic sorting algorithms and compare their performance.",
      status: "pending",
      completedQuestions: 1,
      totalQuestions: 3,
      questions: [
        { id: "q1", text: "What is the output of the program?", completed: true },
        { id: "q2", text: "What is the main function of the program?", completed: false },
        { id: "q3", text: "What is the purpose of the program?", completed: false },
      ]
    },
    { 
      id: "a3", 
      name: "Data Structures Implementation", 
      dueDate: "2025-05-08",
      description: "Implement linked lists and binary trees with basic operations.",
      status: "upcoming",
      completedQuestions: 0,
      totalQuestions: 3,
      questions: [
        { id: "q1", text: "What is the output of the program?", completed: false },
        { id: "q2", text: "What is the main function of the program?", completed: false },
        { id: "q3", text: "What is the purpose of the program?", completed: false },
      ]
    },
  ],
}

export default function StudentCoursePage() {
  const params = useParams()
  const { studentId, courseSlug } = params
  
  // State for the course data
  const [course, setCourse] = useState<typeof mockCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showChatHelp, setShowChatHelp] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  
  useEffect(() => {
    // Simulate fetching course data
    setTimeout(() => {
      // In a real app, this would be a fetch from Supabase
      /*
      const fetchCourse = async () => {
        const { data, error } = await supabaseClient
          .from('courses')
          .select('*')
          .eq('student_id', studentId)
          .eq('slug', courseSlug)
          .single()
          
        if (data) {
          setCourse(data)
        }
      }
      fetchCourse()
      */
      
      // Instead, we're using mock data
      setCourse({
        ...mockCourse,
        name: courseSlug?.toString().split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ') || mockCourse.name
      })
      setLoading(false)
    }, 500)
  }, [studentId, courseSlug])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
        <p className="text-gray-500 mb-6">
          The course you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button asChild>
          <a href="/student">Go Back to Dashboard</a>
        </Button>
      </div>
    )
  }
  
  // Sort assignments by due date
  const sortedAssignments = [...course.assignments].sort((a, b) => 
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  )

  // Get material type icon
  const getMaterialIcon = (type: string) => {
    switch(type) {
      case 'textbook': return <Book className="h-5 w-5" />;
      case 'slides': return <FileText className="h-5 w-5" />;
      case 'pset': return <FileText className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
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
          <span className="font-medium">{course.code}</span>
          <span>•</span>
          <span>{course.instructor}</span>
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {course.materials.map((material) => (
            <Card key={material.id} className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100">
              <div className="flex px-4 items-center">
                <div className="mr-3 rounded-lg">
                  {getMaterialIcon(material.type)}
                </div>
                <div>
                  <h3 className="font-semibold">{material.name}</h3>
                  <p className="text-xs text-gray-500 capitalize">{material.type}</p>
                </div>
                <Button size="icon" variant="ghost" className="ml-auto">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Assignments Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Assignments</h2>
        </div>
        
        <Tabs defaultValue="item-1" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="item-1" className="text-xs py-1">All</TabsTrigger>
            <TabsTrigger value="item-2" className="text-xs py-1">Completed</TabsTrigger>
            <TabsTrigger value="item-3" className="text-xs py-1">Pending</TabsTrigger>
          </TabsList>
          <TabsContent value="item-1" className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">All Assignments</h2>
            <div className="grid gap-4">
              {course.assignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{assignment.name}</CardTitle>
                        <CardDescription>Due: {assignment.dueDate}</CardDescription>
                      </div>
                      <div className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
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
                            : assignment.completedQuestions > 0 
                              ? "text-amber-600" 
                              : "text-gray-600"
                        }>
                          {assignment.completedQuestions}/{assignment.totalQuestions} questions completed
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {assignment.questions.length} {assignment.questions.length === 1 ? 'question' : 'questions'}
                      </span>
                    </div>
                    {/* Add progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div 
                        className={`h-1.5 rounded-full ${
                          assignment.status === "completed" 
                            ? "bg-emerald-500" 
                            : assignment.completedQuestions > 0 
                              ? "bg-amber-500" 
                              : "bg-blue-500"
                        }`} 
                        style={{ width: `${(assignment.completedQuestions / assignment.totalQuestions) * 100}%` }}
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
                            <CardDescription>Due: {assignment.dueDate}</CardDescription>
                          </div>
                          <div className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="text-sm flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            <span className="text-emerald-600">
                              {assignment.completedQuestions}/{assignment.totalQuestions} questions completed
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                          <div 
                            className="bg-emerald-500 h-1.5 rounded-full" 
                            style={{ width: `${(assignment.completedQuestions / assignment.totalQuestions) * 100}%` }}
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
                            <CardDescription>Due: {assignment.dueDate}</CardDescription>
                          </div>
                          <div className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="text-sm flex items-center gap-1">
                            <Clock className="h-4 w-4 text-amber-500" />
                            <span className={assignment.status === "pending" ? "text-amber-600" : "text-gray-600"}>
                              {assignment.completedQuestions}/{assignment.totalQuestions} questions completed
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                          <div 
                            className={assignment.status === "pending" ? "bg-amber-500 h-1.5 rounded-full" : "bg-blue-500 h-1.5 rounded-full"}
                            style={{ width: `${(assignment.completedQuestions / assignment.totalQuestions) * 100}%` }}
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
      </div>
      
      {/* AI Tutor Section */}
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
