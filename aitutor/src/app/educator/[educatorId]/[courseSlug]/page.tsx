"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  PlusCircle, 
  Book, 
  FileText, 
  Calendar, 
  HelpCircle, 
  Download, 
  MessageSquare,
  X,
  Check,
  Paperclip
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

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
      attachedMaterials: ["m2", "m6"] // IDs of attached materials
    },
    { 
      id: "a2", 
      name: "Basic Algorithms", 
      dueDate: "2025-04-24",
      description: "Implement three basic sorting algorithms and compare their performance.",
      attachedMaterials: ["m3", "m4"]
    },
    { 
      id: "a3", 
      name: "Data Structures Implementation", 
      dueDate: "2025-05-08",
      description: "Implement linked lists and binary trees with basic operations.",
      attachedMaterials: ["m3", "m5", "m6"]
    },
  ],
}

export default function CoursePage() {
  const params = useParams()
  const { educatorId, courseSlug } = params
  
  // State for the course data
  const [course, setCourse] = useState<typeof mockCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showChatHelp, setShowChatHelp] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  
  // State for materials dialog
  const [materialsDialogOpen, setMaterialsDialogOpen] = useState(false)
  const [currentAssignmentId, setCurrentAssignmentId] = useState<string | null>(null)
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])

  // Open materials dialog for an assignment
  const openMaterialsDialog = (assignmentId: string) => {
    const assignment = course?.assignments.find(a => a.id === assignmentId)
    if (assignment) {
      setCurrentAssignmentId(assignmentId)
      setSelectedMaterials([...assignment.attachedMaterials])
      setMaterialsDialogOpen(true)
    }
  }

  // Save attached materials selection
  const saveAttachedMaterials = () => {
    if (!currentAssignmentId || !course) return

    setCourse({
      ...course,
      assignments: course.assignments.map(assignment => 
        assignment.id === currentAssignmentId 
          ? { ...assignment, attachedMaterials: selectedMaterials }
          : assignment
      )
    })
    
    setMaterialsDialogOpen(false)
  }
  
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
        <Button asChild>
          <a href="/educator">Go Back to Dashboard</a>
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
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Material
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {course.materials.map((material) => (
            <Card key={material.id} className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100">
              <div className="flex px-4 py-3 items-center">
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
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Assignment
          </Button>
        </div>
        
        <div className="space-y-4">
          {sortedAssignments.map((assignment) => (
            <Card key={assignment.id} className="overflow-hidden border border-gray-300">
              <CardHeader className="">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{assignment.name}</CardTitle>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openMaterialsDialog(assignment.id)}
                    >
                      <Paperclip className="mr-1 h-4 w-4" /> 
                      {assignment.attachedMaterials.length > 0 ? 
                        `${assignment.attachedMaterials.length} Materials` : 
                        "Attach Materials"
                      }
                    </Button>
                    <Button size="sm" variant="outline" className="bg-gray-100 text-black hover:bg-gray-200">View Chatbot Logs</Button>
                    <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mr-2">
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {assignment.attachedMaterials.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {assignment.attachedMaterials.map(materialId => {
                      const material = course.materials.find(m => m.id === materialId);
                      if (!material) return null;
                      return (
                        <div key={materialId} className="flex items-center px-2 py-1 bg-gray-100 rounded-md text-xs">
                          {getMaterialIcon(material.type)}
                          <span className="ml-1">{material.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Materials Selection Dialog */}
      <Dialog open={materialsDialogOpen} onOpenChange={setMaterialsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Attach Materials to Assignment</DialogTitle>
            <DialogDescription>
              Select course materials to attach to this assignment. Students will have easy access to these materials when working on the assignment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              {course.materials.map((material) => (
                <div key={material.id} className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-100">
                  <Checkbox 
                    id={material.id}
                    checked={selectedMaterials.includes(material.id)}
                    onCheckedChange={(checked: boolean | 'indeterminate') => {
                      if (checked === true) {
                        setSelectedMaterials(prev => [...prev, material.id]);
                      } else {
                        setSelectedMaterials(prev => 
                          prev.filter(id => id !== material.id)
                        );
                      }
                    }}
                  />
                  <div className="flex-1 flex items-center">
                    <div className="mr-3">
                      {getMaterialIcon(material.type)}
                    </div>
                    <label htmlFor={material.id} className="cursor-pointer flex-1">
                      <div className="font-medium">{material.name}</div>
                      <div className="text-sm text-gray-500 capitalize">{material.type}</div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <div className="flex justify-between w-full">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setMaterialsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={saveAttachedMaterials}>
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 