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
  MessageSquare,
  X,
  Check,
  Paperclip,
  Info
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
}

interface Assignment {
  id: string
  name: string
  due_date: string
  description: string
  material_ids: string[]
  problem_count?: number 
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

export default function CoursePage() {
  const params = useParams()
  const { educatorId, courseSlug } = params
  
  // State for the course data
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
      setSelectedMaterials([...assignment.material_ids])
      setMaterialsDialogOpen(true)
    }
  }

  // Save attached materials selection
  const saveAttachedMaterials = async () => {
    if (!currentAssignmentId || !course) return

    try {
      // Update in Supabase
      const { error } = await supabase
        .from('assignments')
        .update({ material_ids: selectedMaterials })
        .eq('id', currentAssignmentId)

      if (error) throw error

      // Update local state
      setCourse({
        ...course,
        assignments: course.assignments.map(assignment => 
          assignment.id === currentAssignmentId 
            ? { ...assignment, material_ids: selectedMaterials }
            : assignment
        )
      })
      
      toast.success("Materials attached successfully")
    } catch (err: any) {
      console.error("Error saving materials:", err)
      toast.error("Failed to attach materials")
    } finally {
      setMaterialsDialogOpen(false)
    }
  }
  
  // Add new material
  const handleAddMaterial = async () => {
    if (!course || !newMaterial.name) return
    
    try {
      // Insert into Supabase
      const { data, error } = await supabase
        .from('materials')
        .insert({
          name: newMaterial.name,
          type: newMaterial.type,
          course_id: course.id
        })
        .select()

      if (error) throw error

      // Update local state with the new material
      const newMaterialWithId = data[0] as Material
      
      setCourse({
        ...course,
        materials: [
          ...course.materials,
          newMaterialWithId
        ]
      })
      
      toast.success("Material added successfully")
    } catch (err: any) {
      console.error("Error adding material:", err)
      toast.error("Failed to add material")
    } finally {
      setNewMaterial({ name: "", type: "resource" })
      setAddMaterialDialogOpen(false)
    }
  }
  
  // Add new assignment
  const handleAddAssignment = async () => {
    if (!course || !newAssignment.name || !newAssignment.dueDate) return
    
    try {
      // Insert into Supabase assignments table first
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          name: newAssignment.name,
          description: newAssignment.description,
          due_date: newAssignment.dueDate,
          material_ids: newAssignment.attachedMaterials
        })
        .select()

      if (assignmentError) throw assignmentError

      // Get the new assignment ID
      const newAssignmentId = assignmentData[0].id
      
      // Now add an entry to the courses_assignments join table
      const { error: joinError } = await supabase
        .from('courses_assignments')
        .insert({
          course_id: course.id,
          assignment_id: newAssignmentId
        })
        
      if (joinError) throw joinError

      // Update local state with the new assignment
      const newAssignmentWithId = assignmentData[0] as Assignment
      
      setCourse({
        ...course,
        assignments: [
          ...course.assignments,
          newAssignmentWithId
        ]
      })
      
      toast.success("Assignment added successfully")
    } catch (err: any) {
      console.error("Error adding assignment:", err)
      toast.error("Failed to add assignment")
    } finally {
      setNewAssignment({
        name: "",
        description: "",
        dueDate: "",
        attachedMaterials: []
      })
      setAddAssignmentDialogOpen(false)
    }
  }
  
  useEffect(() => {
    const fetchCourseData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Format courseSlug by replacing dashes with spaces
        const formattedCourseSlug = courseSlug ? (courseSlug as string).replace(/-/g, ' ') : '';
        
        // 1. Fetch the course basic information first
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
            instructor_name: educatorId || "Instructor",
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
        
        // 4. For each assignment, count the number of problems
        const assignmentsWithProblemCount = await Promise.all(
          assignmentsData.map(async (assignment) => {
            // Get problems through assignments_problems join table
            const { data: assignmentProblemsData, error: assignmentProblemsError } = await supabase
              .from('assignments_problems')
              .select('problem_id')
              .eq('assignment_id', assignment.id)
              
            if (assignmentProblemsError) {
              console.error("Error fetching assignment problems:", assignmentProblemsError)
              return { ...assignment, problem_count: 0 }
            }
            
            // Count the number of problems from the join table
            const problemCount = assignmentProblemsData ? assignmentProblemsData.length : 0
            
            return { ...assignment, problem_count: problemCount }
          })
        )
        
        // 5. Fetch user data for educator name
        let instructorName = "Instructor"
        if (educatorId) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('name')
            .eq('id', educatorId)
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
          assignments: assignmentsWithProblemCount || []
        }
        
        setCourse(fullCourseData)
      } catch (err: any) {
        console.error("Error fetching course data:", err)
        setError(err.message || "Failed to load course data")
      } finally {
        setLoading(false)
      }
    }
    
    if (courseSlug) {
      fetchCourseData()
    }
  }, [educatorId, courseSlug])
  
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
          <a href="/educator">Go Back to Dashboard</a>
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
          <Button size="sm" onClick={() => setAddMaterialDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Material
          </Button>
        </div>
        
        {course.materials.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-gray-50">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-700">No Materials Yet</h3>
            <p className="text-gray-500 max-w-md mx-auto mt-2 mb-4">
              Add course materials to help your students learn more effectively.
            </p>
            <Button onClick={() => setAddMaterialDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add First Material
            </Button>
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
          <Button size="sm" onClick={() => setAddAssignmentDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Assignment
          </Button>
        </div>
        
        {course.assignments.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-gray-50">
            <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-700">No Assignments Yet</h3>
            <p className="text-gray-500 max-w-md mx-auto mt-2 mb-4">
              Create assignments for your students to complete.
            </p>
            <Button onClick={() => setAddAssignmentDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add First Assignment
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedAssignments.map((assignment) => (
              <Card key={assignment.id} className="overflow-hidden border border-gray-300">
                <CardHeader className="">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{assignment.name}</CardTitle>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openMaterialsDialog(assignment.id)}
                      >
                        <Paperclip className="mr-1 h-4 w-4" /> 
                        {assignment.material_ids && assignment.material_ids.length > 0 ? 
                          `${assignment.material_ids.length} Materials` : 
                          "Attach Materials"
                        }
                      </Button>
                      <Button size="sm" variant="outline" className="bg-gray-100 text-black hover:bg-gray-200">View Chatbot Logs</Button>
                      <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        Due: {formatDate(assignment.due_date)}
                      </div>
                      {assignment.problem_count !== undefined && (
                        <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                          {assignment.problem_count} Problems
                        </div>
                      )}
                    </div>
                  </div>
                  {assignment.description && (
                    <p className="text-sm text-gray-500 mt-2">{assignment.description}</p>
                  )}
                  {assignment.material_ids && assignment.material_ids.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {assignment.material_ids.map(materialId => {
                        const material = course.materials.find(m => m.id === materialId);
                        if (!material) return null;
                        return (
                          <div key={materialId} className="flex items-center px-2 py-1 bg-gray-100 rounded-md text-xs">
                            {getMaterialIcon(material.type || 'other')}
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
        )}
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
            {course.materials.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">No materials available to attach.</p>
                <Button 
                  className="mt-4" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setMaterialsDialogOpen(false);
                    setAddMaterialDialogOpen(true);
                  }}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Course Materials
                </Button>
              </div>
            ) : (
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
                        {getMaterialIcon(material.type || 'other')}
                      </div>
                      <label htmlFor={material.id} className="cursor-pointer flex-1">
                        <div className="font-medium">{material.name}</div>
                        <div className="text-sm text-gray-500 capitalize">{material.type || 'Resource'}</div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              <Button 
                type="button" 
                onClick={saveAttachedMaterials}
                disabled={course.materials.length === 0}
              >
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
                <option value="powerpoint">PowerPoint</option>
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
              <Button 
                type="button" 
                onClick={handleAddMaterial}
                disabled={!newMaterial.name}
              >
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
              {course.materials.length === 0 ? (
                <div className="text-center py-6 border rounded-md">
                  <p className="text-gray-500">No materials available to attach.</p>
                  <Button 
                    className="mt-4" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setAddAssignmentDialogOpen(false);
                      setAddMaterialDialogOpen(true);
                    }}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Materials First
                  </Button>
                </div>
              ) : (
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
                          {getMaterialIcon(material.type || 'other')}
                        </div>
                        <label htmlFor={`new-assignment-${material.id}`} className="cursor-pointer flex-1 text-sm">
                          <div className="font-medium">{material.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{material.type || 'Resource'}</div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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