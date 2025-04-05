"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, Book, FileText, Calendar, HelpCircle, Download, MessageSquare } from "lucide-react"

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
      questions: [
        { id: "q1", text: "What is the output of the program?" },
        { id: "q2", text: "What is the main function of the program?" },
        { id: "q3", text: "What is the purpose of the program?" },
      ]
    },
    { 
      id: "a2", 
      name: "Basic Algorithms", 
      dueDate: "2025-04-24",
      description: "Implement three basic sorting algorithms and compare their performance.",
      questions: [
        { id: "q1", text: "What is the output of the program?" },
        { id: "q2", text: "What is the main function of the program?" },
        { id: "q3", text: "What is the purpose of the program?" },
      ]
    },
    { 
      id: "a3", 
      name: "Data Structures Implementation", 
      dueDate: "2025-05-08",
      description: "Implement linked lists and binary trees with basic operations.",
      questions: [
        { id: "q1", text: "What is the output of the program?" },
        { id: "q2", text: "What is the main function of the program?" },
        { id: "q3", text: "What is the purpose of the program?" },
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
        
        <div className="space-y-4">
          {sortedAssignments.map((assignment) => (
            <Card key={assignment.id} className="overflow-hidden border border-gray-300">
              <CardHeader className="">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{assignment.name}</CardTitle>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="bg-gray-100 text-black hover:bg-gray-200">View Assignment</Button>
                    <Button size="sm" variant="outline" className="bg-gray-100 text-black hover:bg-gray-200">Get Help</Button>
                    <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mr-2">
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{assignment.questions.length || 0} questions</p>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
      
      {/* AI Tutor Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Babel</h2>
        </div>
        
        <Card className="border border-gray-300">
          <CardHeader>
            <CardTitle>Need help with your coursework?</CardTitle>
            <CardDescription>
              Babel can help you understand concepts, work through problems, and prepare for exams.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowChatHelp(!showChatHelp)} className="w-full">
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
        </Card>
      </div>
    </div>
  )
}
