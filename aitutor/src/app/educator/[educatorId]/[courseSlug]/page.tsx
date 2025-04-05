"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Book, FileText, Calendar } from "lucide-react"

// Mock course data - in a real app, this would be fetched from Supabase
const mockCourse = {
  id: "course123",
  name: "Introduction to Computer Science",
  code: "CS101",
  description: "Learn the fundamentals of computer science and programming.",
  materials: [
    { id: "m1", name: "Textbook: Introduction to Algorithms", type: "textbook" },
    { id: "m2", name: "Lecture Slides Week 1", type: "powerpoint" },
    { id: "m3", name: "Problem Set 1", type: "pset" },
  ],
  assignments: [
    { 
      id: "a1", 
      name: "Assignment 1: Algorithms Basics", 
      dueDate: "2023-05-15",
      description: "Complete exercises 1-10 from Chapter 1."
    },
    { 
      id: "a2", 
      name: "Assignment 2: Data Structures", 
      dueDate: "2023-05-22",
      description: "Implement a linked list and a binary search tree."
    },
  ],
}

export default function CoursePage() {
  const params = useParams()
  const { educatorId, courseSlug } = params
  
  // State for the course data
  const [course, setCourse] = useState<typeof mockCourse | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Simulate fetching course data
    setTimeout(() => {
      // In a real app, this would be a fetch from Supabase
      /*
      const fetchCourse = async () => {
        const { data, error } = await supabaseClient
          .from('courses')
          .select('*')
          .eq('educator_id', educatorId)
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
  }, [educatorId, courseSlug])
  
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
        <Button href="/educator">Go Back to Dashboard</Button>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col min-h-screen w-full bg-gray-100">
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{course.name}</h1>
          <p className="text-gray-500">{course.code}</p>
          <p className="mt-2">{course.description}</p>
        </div>
        
        <Tabs defaultValue="materials" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="materials">
              <Book className="mr-2 h-4 w-4" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="assignments">
              <FileText className="mr-2 h-4 w-4" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="materials" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Course Materials</h2>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Material
              </Button>
            </div>
            
            <div className="grid gap-4">
              {course.materials.map((material) => (
                <Card key={material.id}>
                  <CardHeader className="py-4">
                    <CardTitle className="text-lg">{material.name}</CardTitle>
                    <CardDescription>Type: {material.type}</CardDescription>
                  </CardHeader>
                  <CardContent className="py-2">
                    <Button variant="outline" size="sm">Download</Button>
                  </CardContent>
                </Card>
              ))}
              
              {course.materials.length === 0 && (
                <div className="text-center p-6 border border-dashed rounded-md">
                  <p className="text-gray-500">No materials added yet.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="assignments" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Assignments</h2>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Assignment
              </Button>
            </div>
            
            <div className="grid gap-4">
              {course.assignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader className="py-4">
                    <div className="flex justify-between">
                      <CardTitle className="text-lg">{assignment.name}</CardTitle>
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <CardDescription>{assignment.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="py-2 flex gap-2">
                    <Button variant="outline" size="sm">View Details</Button>
                    <Button variant="outline" size="sm">Grade Submissions</Button>
                  </CardContent>
                </Card>
              ))}
              
              {course.assignments.length === 0 && (
                <div className="text-center p-6 border border-dashed rounded-md">
                  <p className="text-gray-500">No assignments added yet.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="schedule" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Course Schedule</h2>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Event
              </Button>
            </div>
            
            <div className="text-center p-12 border border-dashed rounded-md">
              <p className="text-gray-500">Course schedule will appear here.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 