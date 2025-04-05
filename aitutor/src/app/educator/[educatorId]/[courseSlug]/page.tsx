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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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
  
  // State for add material dialog
  const [addMaterialDialogOpen, setAddMaterialDialogOpen] = useState(false)
  const [newMaterial, setNewMaterial] = useState({ name: "", type: "resource" })
  
  // State for add assignment dialog
  const [addAssignmentDialogOpen, setAddAssignmentDialogOpen] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    name: "",
    description: "",
    dueDate: "",
    attachedMaterials: [] as string[]
  })

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
  
  // Add new material
  const handleAddMaterial = () => {
    if (!course || !newMaterial.name) return
    
    const newId = `m${course.materials.length + 1}`
    setCourse({
      ...course,
      materials: [
        ...course.materials,
        { id: newId, name: newMaterial.name, type: newMaterial.type }
      ]
    })
    
    setNewMaterial({ name: "", type: "resource" })
    setAddMaterialDialogOpen(false)
  }
  
  // Add new assignment
  const handleAddAssignment = () => {
    if (!course || !newAssignment.name || !newAssignment.dueDate) return
    
    const newId = `a${course.assignments.length + 1}`
    setCourse({
      ...course,
      assignments: [
        ...course.assignments,
        { 
          id: newId, 
          name: newAssignment.name, 
          description: newAssignment.description,
          dueDate: newAssignment.dueDate,
          attachedMaterials: newAssignment.attachedMaterials
        }
      ]
    })
    
    setNewAssignment({
      name: "",
      description: "",
      dueDate: "",
      attachedMaterials: []
    })
    setAddAssignmentDialogOpen(false)
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
          <Button size="sm" onClick={() => setAddMaterialDialogOpen(true)}>
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
          <Button size="sm" onClick={() => setAddAssignmentDialogOpen(true)}>
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
      
      {/* Add Material Dialog */}
      <Dialog open={addMaterialDialogOpen} onOpenChange={setAddMaterialDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Material</DialogTitle>
            <DialogDescription>
              Add a new material to your course. Students will be able to access this material.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="material-name">Material Name</Label>
              <Input 
                id="material-name" 
                value={newMaterial.name}
                onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                placeholder="e.g., Week 3: Algorithms"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="material-type">Material Type</Label>
              <select 
                id="material-type"
                className="w-full p-2 border rounded-md"
                value={newMaterial.type}
                onChange={(e) => setNewMaterial({...newMaterial, type: e.target.value})}
              >
                <option value="textbook">Textbook</option>
                <option value="slides">Slides</option>
                <option value="pset">Problem Set</option>
                <option value="resource">Resource</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="material-file">Upload File (optional)</Label>
              <Input id="material-file" type="file" />
              <p className="text-xs text-gray-500">Max file size: 50MB</p>
            </div>
          </div>
          
          <DialogFooter>
            <div className="flex justify-between w-full">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setAddMaterialDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleAddMaterial}>
                Add Material
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Assignment Dialog */}
      <Dialog open={addAssignmentDialogOpen} onOpenChange={setAddAssignmentDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>
              Create a new assignment for your students. You can attach course materials to help them complete the assignment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="assignment-name">Assignment Title</Label>
              <Input 
                id="assignment-name" 
                value={newAssignment.name}
                onChange={(e) => setNewAssignment({...newAssignment, name: e.target.value})}
                placeholder="e.g., Midterm Project"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assignment-description">Description</Label>
              <Textarea 
                id="assignment-description" 
                value={newAssignment.description}
                onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                placeholder="Describe the assignment requirements..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assignment-due-date">Due Date</Label>
              <Input 
                id="assignment-due-date" 
                type="date"
                value={newAssignment.dueDate}
                onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Attach Materials</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-[200px] overflow-y-auto">
                {course.materials.map((material) => (
                  <div key={material.id} className="flex items-center space-x-3 px-2 py-1 rounded-lg hover:bg-gray-100">
                    <Checkbox 
                      id={`new-assignment-${material.id}`}
                      checked={newAssignment.attachedMaterials.includes(material.id)}
                      onCheckedChange={(checked: boolean | 'indeterminate') => {
                        if (checked === true) {
                          setNewAssignment({
                            ...newAssignment, 
                            attachedMaterials: [...newAssignment.attachedMaterials, material.id]
                          });
                        } else {
                          setNewAssignment({
                            ...newAssignment,
                            attachedMaterials: newAssignment.attachedMaterials.filter(id => id !== material.id)
                          });
                        }
                      }}
                    />
                    <div className="flex-1 flex items-center">
                      <div className="mr-2">
                        {getMaterialIcon(material.type)}
                      </div>
                      <label htmlFor={`new-assignment-${material.id}`} className="cursor-pointer flex-1 text-sm">
                        <div className="font-medium">{material.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{material.type}</div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <div className="flex justify-between w-full">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setAddAssignmentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleAddAssignment}
                disabled={!newAssignment.name || !newAssignment.dueDate}
              >
                Create Assignment
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 