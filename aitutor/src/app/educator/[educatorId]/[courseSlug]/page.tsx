"use client"

import { useState, useEffect, useRef } from "react"
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
  Info,
  Edit,
  Trash2,
  MessageCircle,
  Plus,
  Copy
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
import { Document, Page as PDFPage, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { ReactCrop, Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize PDF.js worker (add this near the top)
// Use a local worker file instead of CDN to avoid the error
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

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
  diagram?: {
    pageNumber: number
    crop: Crop
    imageData?: string
  }
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
  join_code: string
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

  // State for problems dialog
  const [problemsDialogOpen, setProblemsDialogOpen] = useState(false)
  const [currentAssignmentForProblems, setCurrentAssignmentForProblems] = useState<Assignment | null>(null)
  const [problems, setProblems] = useState<Problem[]>([])
  const [newProblem, setNewProblem] = useState("")
  const [editingProblem, setEditingProblem] = useState<{id: string, text: string} | null>(null)
  const [isLoadingProblems, setIsLoadingProblems] = useState(false)
  const [problemsError, setProblemsError] = useState<string | null>(null)

  // Add new state for PDF handling
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showPdfSelector, setShowPdfSelector] = useState(false)
  const [currentProblemForDiagram, setCurrentProblemForDiagram] = useState<Problem | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Add this to the state declarations
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);
  const [currentAssignmentForInsights, setCurrentAssignmentForInsights] = useState<Assignment | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

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
      // Get the file from the input
      const fileInput = document.getElementById('material-file') as HTMLInputElement
      const file = fileInput?.files?.[0]
      
      // Create a FormData object
      const formData = new FormData()
      
      // Add the file if it exists
      if (file) {
        // Check file size (5MB limit)
        const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes
        if (file.size > MAX_FILE_SIZE) {
          toast.error('File size exceeds 5MB. Please choose a smaller file.')
          return
        }
        
        // Check file type
        if (!file.type.includes('pdf')) {
          toast.error('Only PDF files are supported.')
          return
        }
        
        // Add the file - 'pdf' must match exactly what the backend expects
        formData.append('pdf', file, file.name)
      }
      
      // Add the JSON data as a string
      const materialData = JSON.stringify({
        name: newMaterial.name,
        type: newMaterial.type,
        course_id: course.id
      })
      
      // Add the JSON data as a string value
      formData.append('data', materialData)
      
      // Send the request - Do NOT set the Content-Type header for multipart/form-data
      const response = await fetch('https://yhqxnhbpxjslmiwtfkez.supabase.co/functions/v1/material_upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: formData
      })
      
      // Try to get response text for better error reporting
      const responseText = await response.text()
      
      if (!response.ok) {
        let errorMessage = 'Failed to upload material'
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.message || errorMessage
        } catch (e) {
          // If we can't parse JSON, use the response text
          errorMessage = responseText || errorMessage
        }
        throw new Error(errorMessage)
      }
      
      // Parse the response
      const data = JSON.parse(responseText)
      
      // Update local state with the new material
      const newMaterialWithId = data.material as Material
      
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
      toast.error(err.message || "Failed to add material")
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
  
  // Open problems dialog for an assignment
  const openProblemsDialog = async (assignmentId: string) => {
    const assignment = course?.assignments.find(a => a.id === assignmentId)
    if (assignment) {
      setCurrentAssignmentForProblems(assignment)
      setProblemsDialogOpen(true)
      await loadProblemsForAssignment(assignmentId)
    }
  }

  // Load problems for an assignment
  const loadProblemsForAssignment = async (assignmentId: string) => {
    setIsLoadingProblems(true)
    setProblemsError(null)
    setProblems([])
    
    try {
      // First get the problem IDs from the join table
      const { data: assignmentProblemsData, error: assignmentProblemsError } = await supabase
        .from('assignments_problems')
        .select('problem_id')
        .eq('assignment_id', assignmentId)
      
      if (assignmentProblemsError) throw assignmentProblemsError
      
      if (!assignmentProblemsData || assignmentProblemsData.length === 0) {
        setProblems([])
        setIsLoadingProblems(false)
        return
      }
      
      const problemIds = assignmentProblemsData.map(row => row.problem_id)
      
      // Then fetch the actual problems
      const { data: problemsData, error: problemsError } = await supabase
        .from('problems')
        .select('*')
        .in('id', problemIds)
      
      if (problemsError) throw problemsError
      
      setProblems(problemsData || [])
    } catch (err: any) {
      console.error("Error loading problems:", err)
      setProblemsError(err.message || "Failed to load problems")
    } finally {
      setIsLoadingProblems(false)
    }
  }
  
  // Add a new problem
  const handleAddProblem = async () => {
    if (!currentAssignmentForProblems || !newProblem.trim()) return
    
    try {
      // First, insert the problem into the problems table
      const { data: problemData, error: problemError } = await supabase
        .from('problems')
        .insert({
          question: newProblem,
          id: currentAssignmentForProblems.id
        })
        .select()
      
      if (problemError) throw problemError
      
      const newProblemWithId = problemData[0] as Problem
      
      // Then, create an entry in the join table
      const { error: joinError } = await supabase
        .from('assignments_problems')
        .insert({
          assignment_id: currentAssignmentForProblems.id,
          problem_id: newProblemWithId.id
        })
      
      if (joinError) throw joinError
      
      // Update the local state
      setProblems([...problems, newProblemWithId])
      setNewProblem("")
      
      // Update the problem count in the assignment
      if (course) {
        setCourse({
          ...course,
          assignments: course.assignments.map(assignment => 
            assignment.id === currentAssignmentForProblems.id 
              ? { ...assignment, problem_count: (assignment.problem_count || 0) + 1 }
              : assignment
          )
        })
      }
      
      toast.success("Problem added successfully")
    } catch (err: any) {
      console.error("Error adding problem:", err)
      toast.error("Failed to add problem")
    }
  }
  
  // Update an existing problem
  const handleUpdateProblem = async () => {
    if (!editingProblem || !editingProblem.text.trim()) return
    
    try {
      const { error } = await supabase
        .from('problems')
        .update({ question: editingProblem.text })
        .eq('id', editingProblem.id)
      
      if (error) throw error
      
      // Update the local state, preserving any diagram information
      setProblems(problems.map(problem => 
        problem.id === editingProblem.id 
          ? { ...problem, question: editingProblem.text }
          : problem
      ))
      
      setEditingProblem(null)
      toast.success("Problem updated successfully")
    } catch (err: any) {
      console.error("Error updating problem:", err)
      toast.error("Failed to update problem")
    }
  }
  
  // Delete a problem
  const handleDeleteProblem = async (problemId: string) => {
    if (!currentAssignmentForProblems) return
    
    try {
      // First, delete the entry from the join table
      const { error: joinError } = await supabase
        .from('assignments_problems')
        .delete()
        .eq('assignment_id', currentAssignmentForProblems.id)
        .eq('problem_id', problemId)
      
      if (joinError) throw joinError
      
      // Then, delete the problem itself
      const { error: problemError } = await supabase
        .from('problems')
        .delete()
        .eq('id', problemId)
      
      if (problemError) throw problemError
      
      // Update the local state
      setProblems(problems.filter(problem => problem.id !== problemId))
      
      // Update the problem count in the assignment
      if (course) {
        setCourse({
          ...course,
          assignments: course.assignments.map(assignment => 
            assignment.id === currentAssignmentForProblems.id 
              ? { ...assignment, problem_count: Math.max(0, (assignment.problem_count || 0) - 1) }
              : assignment
          )
        })
      }
      
      toast.success("Problem deleted successfully")
    } catch (err: any) {
      console.error("Error deleting problem:", err)
      toast.error("Failed to delete problem")
    }
  }
  
  // Function to handle PDF document loading
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }

  // Function to get material for current assignment
  const getMaterialForCurrentAssignment = () => {
    if (!currentAssignmentForProblems || !course) return null
    
    // Find PDF material attached to this assignment
    const materialIds = currentAssignmentForProblems.material_ids || []
    const pdfMaterials = course.materials.filter(m => 
      materialIds.includes(m.id) && m.type.includes('pdf')
    )
    
    return pdfMaterials[0] || null
  }

  // Function to load PDF from Supabase storage
  const loadPdfFromStorage = async (materialId: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('materials')
        .download(`${materialId}.pdf`)
        
      if (error) throw error
      
      const fileUrl = URL.createObjectURL(data)
      setPdfUrl(fileUrl)
    } catch (err) {
      console.error("Error loading PDF:", err)
      toast.error("Failed to load PDF file")
    }
  }

  // Function to capture the selected portion of the PDF
  const captureCrop = () => {
    if (!canvasRef.current || !completedCrop) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Get the cropped image data
    const imageData = canvas.toDataURL('image/png')
    
    // Update the current problem with the diagram info
    if (currentProblemForDiagram) {
      const updatedProblem = {
        ...currentProblemForDiagram,
        diagram: {
          pageNumber: currentPage,
          crop: completedCrop,
          imageData
        }
      }
      
      // Update problems array
      setProblems(problems.map(p => 
        p.id === currentProblemForDiagram.id ? updatedProblem : p
      ))
      
      // Save to database
      saveDiagramForProblem(updatedProblem)
      
      // Reset the diagram selection
      setShowPdfSelector(false)
      setCurrentProblemForDiagram(null)
      toast.success("Diagram associated with question")
    }
  }

  // Function to save diagram to database
  const saveDiagramForProblem = async (problem: Problem) => {
    if (!problem.diagram) return
    
    try {
      // Create a file from the image data
      const base64Data = problem.diagram.imageData?.split(',')[1]
      if (!base64Data) return
      
      const binaryData = atob(base64Data)
      const array = new Uint8Array(binaryData.length)
      for (let i = 0; i < binaryData.length; i++) {
        array[i] = binaryData.charCodeAt(i)
      }
      const blob = new Blob([array], { type: 'image/png' })
      const file = new File([blob], `diagram-${problem.id}.png`, { type: 'image/png' })
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('diagrams')
        .upload(`problems/${problem.id}/diagram.png`, file)
        
      if (error) throw error
      
      // Update the problem record with the diagram URL
      const { error: updateError } = await supabase
        .from('problems')
        .update({ 
          diagram_path: data.path,
          diagram_page: problem.diagram.pageNumber,
          diagram_crop: JSON.stringify(problem.diagram.crop)
        })
        .eq('id', problem.id)
        
      if (updateError) throw updateError
      
    } catch (err: any) {
      console.error("Error saving diagram:", err)
      toast.error("Failed to save diagram")
    }
  }

  // Function to open the PDF selector for a problem
  const openDiagramSelector = (problem: Problem) => {
    const material = getMaterialForCurrentAssignment()
    if (!material) {
      toast.error("No PDF material attached to this assignment")
      return
    }
    
    setCurrentProblemForDiagram(problem)
    loadPdfFromStorage(material.id)
    setShowPdfSelector(true)
  }
  
  // Add this new function to load insights data for an assignment
  const openInsightsPanel = async (assignmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const assignment = course?.assignments.find(a => a.id === assignmentId);
    if (assignment) {
      setCurrentAssignmentForInsights(assignment);
      setShowInsightsPanel(true);
      setInsightsLoading(true);
      setInsightsError(null);
      
      try {
        // In a real implementation, you would fetch real insights data here
        // This is a mock implementation for demonstration purposes
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For now, we'll just use mock data
        setInsightsLoading(false);
      } catch (err: any) {
        console.error("Error loading insights:", err);
        setInsightsError(err.message || "Failed to load insights");
        setInsightsLoading(false);
      }
    }
  };
  
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
          assignments: assignmentsWithProblemCount || [],
          join_code: courseData.join_code
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
          <div 
            className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-md cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={() => {
              navigator.clipboard.writeText(course.join_code);
              toast.success("Join code copied to clipboard");
            }}
          >
            <span>{course.join_code}</span>
            <Copy className="h-3.5 w-3.5 text-gray-500" />
          </div>
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
              <Card 
                key={assignment.id} 
                className="overflow-hidden border border-gray-300 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openProblemsDialog(assignment.id)}
              >
                <CardHeader className="">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{assignment.name}</CardTitle>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMaterialsDialog(assignment.id);
                        }}
                      >
                        <Paperclip className="mr-1 h-4 w-4" /> 
                        {assignment.material_ids && assignment.material_ids.length > 0 ? 
                          `${assignment.material_ids.length} Materials` : 
                          "Attach Materials"
                        }
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-gray-100 text-black hover:bg-gray-200"
                        onClick={(e) => openInsightsPanel(assignment.id, e)}
                      >
                        View Insights
                      </Button>
                      <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        Due: {formatDate(assignment.due_date)}
                      </div>
                      {assignment.problem_count !== undefined && (
                        <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {assignment.problem_count} {assignment.problem_count === 1 ? 'Problem' : 'Problems'}
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
      
      {/* Problems Dialog */}
      <Dialog open={problemsDialogOpen} onOpenChange={setProblemsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Problems for: {currentAssignmentForProblems?.name}
            </DialogTitle>
            <DialogDescription>
              Add, edit, or remove problems for this assignment. Students will need to complete these problems.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {isLoadingProblems ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : problemsError ? (
              <div className="text-center py-6 text-red-600">
                <p>{problemsError}</p>
                <Button 
                  className="mt-4" 
                  variant="outline" 
                  size="sm"
                  onClick={() => currentAssignmentForProblems && loadProblemsForAssignment(currentAssignmentForProblems.id)}
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                {problems.length === 0 ? (
                  <div className="text-center py-8 border rounded-md">
                    <MessageCircle className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-700">No Problems Yet</h3>
                    <p className="text-gray-500 max-w-md mx-auto mt-2">
                      Add problems for your students to solve.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {problems.map((problem) => (
                      <div key={problem.id} className="border rounded-md p-4 bg-gray-50">
                        {editingProblem && editingProblem.id === problem.id ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editingProblem.text}
                              onChange={(e) => setEditingProblem({...editingProblem, text: e.target.value})}
                              placeholder="Problem question..."
                              rows={3}
                            />
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setEditingProblem(null)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={handleUpdateProblem}
                                disabled={!editingProblem.text.trim()}
                              >
                                Save Changes
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 pr-4">
                                <p className="text-gray-800">{problem.question}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setEditingProblem({id: problem.id, text: problem.question})}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteProblem(problem.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Diagram section */}
                            <div className="mt-2">
                              {problem.diagram?.imageData ? (
                                <div className="border p-2 rounded bg-white">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium">Associated Diagram</span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => openDiagramSelector(problem)}
                                    >
                                      Change
                                    </Button>
                                  </div>
                                  <img 
                                    src={problem.diagram.imageData} 
                                    alt="Diagram" 
                                    className="max-h-40 object-contain mx-auto"
                                  />
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDiagramSelector(problem)}
                                  className="w-full"
                                >
                                  <Paperclip className="h-4 w-4 mr-2" />
                                  Associate Diagram from PDF
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-6 border-t pt-4">
                  <h4 className="font-medium mb-2">Add New Problem</h4>
                  <div className="space-y-3">
                    <Textarea
                      value={newProblem}
                      onChange={(e) => setNewProblem(e.target.value)}
                      placeholder="Enter a problem question..."
                      rows={3}
                    />
                    <Button 
                      onClick={handleAddProblem}
                      disabled={!newProblem.trim()}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Problem
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setProblemsDialogOpen(false)}
              variant="outline"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Diagram Selector Dialog */}
      <Dialog open={showPdfSelector} onOpenChange={setShowPdfSelector}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Diagram from PDF</DialogTitle>
            <DialogDescription>
              Navigate to the page containing the diagram, then select and crop the area you want to associate with the question.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {pdfUrl ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {numPages || '?'}
                    </span>
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, numPages || prev))}
                      disabled={currentPage >= (numPages || 1)}
                    >
                      Next
                    </Button>
                  </div>
                  
                  <div>
                    <span className="text-sm mr-2">Current question:</span>
                    <span className="font-medium text-sm">
                      {currentProblemForDiagram?.question.substring(0, 50)}
                      {currentProblemForDiagram?.question.length ? '...' : ''}
                    </span>
                  </div>
                </div>
                
                <div className="border rounded-md overflow-hidden">
                  <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="pdf-document"
                  >
                    <ReactCrop
                      crop={crop}
                      onChange={c => setCrop(c)}
                      onComplete={c => setCompletedCrop(c)}
                      aspect={undefined}
                    >
                      <PDFPage 
                        pageNumber={currentPage} 
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        canvasRef={canvasRef}
                        width={800}
                      />
                    </ReactCrop>
                  </Document>
                </div>
                
                <div className="text-sm text-gray-500 mt-1">
                  Click and drag to select the diagram area
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfSelector(false)}>
              Cancel
            </Button>
            <Button 
              onClick={captureCrop}
              disabled={!completedCrop}
            >
              Associate Diagram
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Insights Dialog */}
      <Dialog open={showInsightsPanel} onOpenChange={setShowInsightsPanel}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Insights for: {currentAssignmentForInsights?.name}
            </DialogTitle>
            <DialogDescription>
              View analytics and student performance data for this assignment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            {insightsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : insightsError ? (
              <div className="text-center py-6 text-red-600">
                <p>{insightsError}</p>
                <Button 
                  className="mt-4" 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => currentAssignmentForInsights && openInsightsPanel(currentAssignmentForInsights.id, e as any)}
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                {/* Completion Rate Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Completion Rate</CardTitle>
                    <CardDescription>
                      Percentage of students who have completed the assignment
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-4xl font-bold text-blue-600">64%</div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">16 of 25 students</span>
                        <div className="w-32 h-2 rounded-full bg-gray-200">
                          <div className="h-full rounded-full bg-blue-600 w-[64%]"></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Question Performance Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Question Completion</CardTitle>
                    <CardDescription>
                      Average completion by question
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Mock data for questions */}
                      {[
                        { id: 1, question: "What is the capital of France?", completion: 92 },
                        { id: 2, question: "Explain Newton's First Law of Motion", completion: 78 },
                        { id: 3, question: "Solve for x: 2x + 5 = 15", completion: 84 },
                        { id: 4, question: "What is the main theme of The Great Gatsby?", completion: 45 },
                        { id: 5, question: "Describe the structure of DNA", completion: 38 }
                      ].map(q => (
                        <div key={q.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium truncate max-w-[70%]" title={q.question}>
                              {q.question}
                            </div>
                            <div className="text-sm">{q.completion}%</div>
                          </div>
                          <div className="w-full h-2 rounded-full bg-gray-200">
                            <div 
                              className={`h-full rounded-full ${
                                q.completion > 80 ? 'bg-green-600' : 
                                q.completion > 60 ? 'bg-blue-600' : 
                                q.completion > 40 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${q.completion}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Time Spent Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Average Time Spent</CardTitle>
                    <CardDescription>
                      How long students spend on each question
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div>Average time per question</div>
                        <div className="font-semibold">8m 24s</div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>Total average assignment time</div>
                        <div className="font-semibold">42m 12s</div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>Longest question on average</div>
                        <div className="font-semibold">Question 4 (12m 38s)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Common Issues Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Common Issues</CardTitle>
                    <CardDescription>
                      Topics students frequently need help with
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="font-medium">Literary Analysis</div>
                        <div className="text-sm">78% of students struggled</div>
                      </div>
                      <div className="flex justify-between items-center px-3 py-2 bg-red-50 border border-red-200 rounded-md">
                        <div className="font-medium">DNA Structure</div>
                        <div className="text-sm">65% of students struggled</div>
                      </div>
                      <div className="flex justify-between items-center px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="font-medium">Algebraic Equations</div>
                        <div className="text-sm">32% of students struggled</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowInsightsPanel(false)}
              variant="outline"
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                // This would be the export functionality in a real app
                toast.success("Insights exported successfully");
              }}
            >
              Export Insights
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 