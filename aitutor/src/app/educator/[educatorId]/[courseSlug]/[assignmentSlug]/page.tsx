"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Assignment, Course, Problem, Material } from "../types"
import { Calendar, Clock, FileText, MessageCircle, PlusCircle, Paperclip, Edit, Trash2, ArrowLeft, Book, Scissors, Image, Save } from "lucide-react"
import { fetchCourseData } from "../utils/courseDataHelpers"
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

export default function AssignmentPage() {
  const params = useParams()
  const router = useRouter()
  const { educatorId, courseSlug, assignmentSlug } = params
  
  const [course, setCourse] = useState<Course | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [problems, setProblems] = useState<Problem[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Problem management state
  const [newProblem, setNewProblem] = useState("")
  const [newAnswer, setNewAnswer] = useState("")
  const [editingProblem, setEditingProblem] = useState<{id: string, question: string, answer?: string} | null>(null)
  const [isAddingProblem, setIsAddingProblem] = useState(false)
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string>("")

  // Materials dialog state
  const [materialsDialogOpen, setMaterialsDialogOpen] = useState(false)
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  
  // PDF and diagram selection state
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [currentProblemId, setCurrentProblemId] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string>("https://yhqxnhbpxjslmiwtfkez.supabase.co/storage/v1/object/public/psetfiles//hw1a.pdf")
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [selection, setSelection] = useState<{ x: number, y: number, width: number, height: number } | null>(null)
  const [isSelecting, setIsSelecting] = useState<boolean>(false)
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null)
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [isSavingDiagram, setIsSavingDiagram] = useState<boolean>(false)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  
  // Format date display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'No due date'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (e) {
      return dateString
    }
  }

  // Load assignment data
  useEffect(() => {
    const loadAssignmentData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Format courseSlug by replacing dashes with spaces
        const formattedCourseSlug = courseSlug ? (courseSlug as string).replace(/-/g, ' ') : ''
        
        // Fetch course data
        const { course: courseData, error: courseError } = await fetchCourseData(
          formattedCourseSlug,
          educatorId as string
        )
        
        if (courseError) throw new Error(courseError)
        if (!courseData) throw new Error("Course not found")
        
        setCourse(courseData)
        
        // Check if assignmentSlug is a UUID (assignment ID) or a name-based slug
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignmentSlug as string);
        
        let assignmentData;
        
        if (isUuid) {
          // Find assignment by ID
          assignmentData = courseData.assignments.find(
            (a: Assignment) => a.id === assignmentSlug
          );
        } else {
          // Find assignment by name (original approach)
          const formattedAssignmentSlug = (assignmentSlug as string).replace(/-/g, ' ');
          assignmentData = courseData.assignments.find(
            (a: Assignment) => a.name.toLowerCase() === formattedAssignmentSlug.toLowerCase()
          );
        }
        
        if (!assignmentData) throw new Error("Assignment not found")
        
        setAssignment(assignmentData)
        
        // Load problems for this assignment
        await loadProblemsForAssignment(assignmentData.id)
        
        // Find materials for this assignment
        if (assignmentData.material_ids && assignmentData.material_ids.length > 0) {
          const assignmentMaterials = courseData.materials.filter(
            (m: Material) => assignmentData.material_ids.includes(m.id)
          )
          setMaterials(assignmentMaterials)
          setSelectedMaterials(assignmentData.material_ids)
        }
        
        // Get the anon key for Supabase Edge Functions
        setSupabaseAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "")
      } catch (err: any) {
        console.error("Error loading assignment:", err)
        setError(err.message || "Failed to load assignment")
      } finally {
        setLoading(false)
      }
    }
    
    if (courseSlug && assignmentSlug) {
      loadAssignmentData()
    }
  }, [courseSlug, assignmentSlug, educatorId])
  
  // Load problems for an assignment
  const loadProblemsForAssignment = async (assignmentId: string) => {
    try {
      // First get the problem IDs from the join table
      const { data: assignmentProblemsData, error: assignmentProblemsError } = await supabase
        .from('assignments_problems')
        .select('problem_id')
        .eq('assignment_id', assignmentId)
      
      if (assignmentProblemsError) throw assignmentProblemsError
      
      if (!assignmentProblemsData || assignmentProblemsData.length === 0) {
        setProblems([])
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
      toast.error("Failed to load problems")
    }
  }
  
  // Add a new problem
  const handleAddProblem = async () => {
    if (!assignment || !newProblem.trim()) return
    
    try {
      // Use the Edge Function instead of direct database access
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/add_new_problem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          assignment_id: assignment.id,
          new_problem: newProblem,
          answer: newAnswer.trim() || null,
          i: problems.length // Use the current length as index
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add problem')
      }
      
      // Get the problem data from the join table and problems table
      const { data: assignmentProblems, error: joinError } = await supabase
        .from('assignments_problems')
        .select('problem_id')
        .eq('assignment_id', assignment.id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (joinError) throw joinError
      if (!assignmentProblems || assignmentProblems.length === 0) {
        throw new Error('Problem was added but could not be retrieved')
      }
      
      const problemId = assignmentProblems[0].problem_id
      
      // Get the full problem data
      const { data: problemData, error: problemError } = await supabase
        .from('problems')
        .select('*')
        .eq('id', problemId)
        .single()
      
      if (problemError) throw problemError
      
      // Update the local state
      const newProblemWithId = problemData as Problem
      setProblems([...problems, newProblemWithId])
      setNewProblem("")
      setNewAnswer("")
      setIsAddingProblem(false)
      
      // Update the problem count in the assignment
      if (assignment) {
        const updatedAssignment = {
          ...assignment,
          problem_count: (assignment.problem_count || 0) + 1
        }
        setAssignment(updatedAssignment)
        
        // Also update in the course if present
        if (course) {
          const updatedAssignments = course.assignments.map(a => 
            a.id === assignment.id ? updatedAssignment : a
          )
          
          setCourse({
            ...course,
            assignments: updatedAssignments
          })
        }
      }
      
      toast.success("Problem added successfully")
    } catch (err: any) {
      console.error("Error adding problem:", err)
      toast.error(err.message || "Failed to add problem")
    }
  }
  
  // Update an existing problem
  const handleUpdateProblem = async () => {
    if (!editingProblem || !editingProblem.question.trim()) return
    
    try {
      const updateData: { question: string; answer?: string } = { 
        question: editingProblem.question 
      }
      
      // Only include answer in update if it exists
      if (editingProblem.answer !== undefined) {
        updateData.answer = editingProblem.answer
      }
      
      const { error } = await supabase
        .from('problems')
        .update(updateData)
        .eq('id', editingProblem.id)
      
      if (error) throw error
      
      // Update the local state, preserving any diagram information
      setProblems(problems.map(problem => 
        problem.id === editingProblem.id 
          ? { ...problem, ...updateData }
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
    if (!assignment) return
    
    if (!confirm("Are you sure you want to delete this problem? This action cannot be undone.")) {
      return
    }
    
    try {
      // First, delete the entry from the join table
      const { error: joinError } = await supabase
        .from('assignments_problems')
        .delete()
        .eq('assignment_id', assignment.id)
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
      if (assignment) {
        const updatedAssignment = {
          ...assignment,
          problem_count: Math.max(0, (assignment.problem_count || 0) - 1)
        }
        setAssignment(updatedAssignment)
        
        // Also update in the course if present
        if (course) {
          const updatedAssignments = course.assignments.map(a => 
            a.id === assignment.id ? updatedAssignment : a
          )
          
          setCourse({
            ...course,
            assignments: updatedAssignments
          })
        }
      }
      
      toast.success("Problem deleted successfully")
    } catch (err: any) {
      console.error("Error deleting problem:", err)
      toast.error("Failed to delete problem")
    }
  }
  
  // Save attached materials
  const saveAttachedMaterials = async () => {
    if (!assignment) return
    
    try {
      // Update the assignment in the database
      const { error } = await supabase
        .from('assignments')
        .update({ material_ids: selectedMaterials })
        .eq('id', assignment.id)
      
      if (error) throw error
      
      // Update local state
      const updatedAssignment = {
        ...assignment,
        material_ids: selectedMaterials
      }
      
      setAssignment(updatedAssignment)
      
      // Update materials list
      if (course) {
        const updatedMaterials = course.materials.filter(
          (m: Material) => selectedMaterials.includes(m.id)
        )
        setMaterials(updatedMaterials)
        
        // Also update in the course data
        const updatedAssignments = course.assignments.map(a => 
          a.id === assignment.id ? updatedAssignment : a
        )
        
        setCourse({
          ...course,
          assignments: updatedAssignments
        })
      }
      
      toast.success("Materials updated successfully")
      setMaterialsDialogOpen(false)
    } catch (err: any) {
      console.error("Error updating materials:", err)
      toast.error("Failed to update materials")
    }
  }
  
  // Material type icon function
  const getMaterialIcon = (type: string = "") => {
    switch(type.toLowerCase()) {
      case 'textbook': return <Book className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'pset': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  }
  
  // Go back to course page
  const handleBackToCourse = () => {
    if (courseSlug && educatorId) {
      router.push(`/educator/${educatorId}/${courseSlug}`)
    }
  }

  // Handle opening the PDF dialog for diagram selection
  const handleSelectDiagram = (problemId: string) => {
    setCurrentProblemId(problemId);
    setSelection(null);
    setCroppedImage(null);
    setPdfDialogOpen(true);
  };

  // PDF selection handlers
  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= numPages) {
      setCurrentPage(newPage);
      setSelection(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pdfContainerRef.current) return;
    
    const rect = pdfContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartPoint({ x, y });
    setIsSelecting(true);
    setSelection(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !startPoint || !pdfContainerRef.current) return;
    
    const rect = pdfContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const width = x - startPoint.x;
    const height = y - startPoint.y;
    
    setSelection({
      x: width >= 0 ? startPoint.x : x,
      y: height >= 0 ? startPoint.y : y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const handleCropImage = async () => {
    if (!selection || !pdfContainerRef.current) return;
    
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      // Create a new canvas with just the selected area
      canvas.width = selection.width;
      canvas.height = selection.height;
      
      // Draw the selected portion onto the new canvas
      const pdfCanvas = pdfContainerRef.current.querySelector('canvas');
      if (!pdfCanvas) return;
      
      context.drawImage(
        pdfCanvas,
        selection.x,
        selection.y,
        selection.width,
        selection.height,
        0,
        0,
        selection.width,
        selection.height
      );
      
      // Convert to image
      const dataUrl = canvas.toDataURL('image/png');
      setCroppedImage(dataUrl);
    } catch (err) {
      console.error('Error cropping image:', err);
      toast.error('Failed to crop the selected area');
    }
  };

  const handleSaveDiagram = async () => {
    if (!croppedImage || !currentProblemId) return;
    
    setIsSavingDiagram(true);
    
    try {
      // In a real implementation, this would be an edge function call
      // For now we'll mock the API call with a delay
      
      // Create the payload that would be sent to the edge function
      const payload = {
        problem_id: currentProblemId,
        page_number: currentPage,
        crop: {
          x: selection?.x || 0,
          y: selection?.y || 0,
          width: selection?.width || 0,
          height: selection?.height || 0,
          unit: 'px' as 'px' // Explicitly type as 'px'
        },
        image_data: croppedImage // In a real implementation, this might be a file upload
      };
      
      // Simulate network request
      console.log('Sending payload to mock edge function:', payload);
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful response
      const mockResponse = {
        success: true,
        data: {
          id: currentProblemId,
          diagram_url: croppedImage // In a real implementation, this would be a URL to the stored image
        }
      };
      
      // Update local state to reflect the changes
      if (mockResponse.success) {
        setProblems(problems.map(problem => 
          problem.id === currentProblemId 
            ? { 
                ...problem, 
                diagram: {
                  pageNumber: currentPage,
                  crop: {
                    x: payload.crop.x,
                    y: payload.crop.y,
                    width: payload.crop.width,
                    height: payload.crop.height,
                    unit: payload.crop.unit
                  },
                  imageData: croppedImage
                }
              }
            : problem
        ));
        
        toast.success('Diagram saved successfully');
        setPdfDialogOpen(false);
      }
    } catch (err: any) {
      console.error('Error saving diagram:', err);
      toast.error(err.message || 'Failed to save diagram');
    } finally {
      setIsSavingDiagram(false);
    }
  };

  // Set up PDF.js worker
  useEffect(() => {
    const setupPdfWorker = async () => {
      const pdfjs = await import('react-pdf');
      // Use local worker file from public directory instead of CDN
      pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    };

    setupPdfWorker();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  }

  if (error) {
    return <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="text-red-500 mb-4 text-lg">{error}</div>
        <Button onClick={handleBackToCourse}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Course
        </Button>
      </div>
    </div>
  }

  if (!assignment || !course) {
    return <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="text-gray-500 mb-4">Assignment not found</div>
        <Button onClick={handleBackToCourse}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Course
        </Button>
      </div>
    </div>
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          className="mb-4"
          onClick={handleBackToCourse}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to {course.name}
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{assignment.name}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                Due: {formatDate(assignment.due_date)}
              </div>
              <div className="flex items-center">
                <MessageCircle className="mr-1 h-4 w-4" />
                {assignment.problem_count || 0} {assignment.problem_count === 1 ? 'Problem' : 'Problems'}
              </div>
            </div>
            {assignment.description && (
              <p className="mt-4 text-gray-700">{assignment.description}</p>
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={() => setMaterialsDialogOpen(true)}
          >
            <Paperclip className="mr-2 h-4 w-4" /> 
            {materials.length > 0 ? `${materials.length} Materials` : "Attach Materials"}
          </Button>
        </div>
        
        {materials.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="font-medium text-sm mr-2">Attached materials:</div>
            {materials.map((material) => (
              <div key={material.id} className="flex items-center px-2 py-1 bg-gray-100 rounded-md text-xs">
                {getMaterialIcon(material.type)}
                <span className="ml-1">{material.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="border-t pt-6 mt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Problems</h2>
          <Button 
            onClick={() => setIsAddingProblem(true)}
            size="sm"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Problem
          </Button>
        </div>
        
        {problems.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-gray-50">
            <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-700">No Problems Yet</h3>
            <p className="text-gray-500 max-w-md mx-auto mt-2 mb-4">
              Add problems for your students to solve in this assignment.
            </p>
            <Button onClick={() => setIsAddingProblem(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add First Problem
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {problems.map((problem, index) => (
              <Card key={problem.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Problem {index + 1}</CardTitle>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSelectDiagram(problem.id)}
                      >
                        <Image className="h-4 w-4 mr-1" /> Select Diagram
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingProblem({
                          id: problem.id,
                          question: problem.question,
                          answer: problem.answer
                        })}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteProblem(problem.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="font-medium mb-2">Question:</div>
                  <div className="text-gray-700 whitespace-pre-wrap">{problem.question}</div>
                  
                  {problem.answer && (
                    <>
                      <div className="font-medium mt-4 mb-2">Answer:</div>
                      <div className="text-gray-700 whitespace-pre-wrap">{problem.answer}</div>
                    </>
                  )}
                  
                  {problem.diagram && problem.diagram.imageData && (
                    <div className="mt-4">
                      <div className="font-medium mb-2">Diagram:</div>
                      <div className="border p-2 rounded bg-gray-50">
                        <img 
                          src={problem.diagram.imageData} 
                          alt="Problem diagram"
                          className="max-w-full h-auto rounded"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Add Problem Dialog */}
      <Dialog open={isAddingProblem} onOpenChange={setIsAddingProblem}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Problem</DialogTitle>
            <DialogDescription>
              Create a new problem for this assignment. You can add questions and optional answers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="problem-question">Question</Label>
              <Textarea 
                id="problem-question" 
                value={newProblem}
                onChange={(e) => setNewProblem(e.target.value)}
                placeholder="Enter your question here..."
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="problem-answer">Answer (Optional)</Label>
              <Textarea 
                id="problem-answer" 
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="Enter the answer here..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddingProblem(false)
                setNewProblem("")
                setNewAnswer("")
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddProblem}
              disabled={!newProblem.trim()}
            >
              Add Problem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Problem Dialog */}
      <Dialog 
        open={!!editingProblem} 
        onOpenChange={(open) => !open && setEditingProblem(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Problem</DialogTitle>
            <DialogDescription>
              Update the question and answer for this problem.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-problem-question">Question</Label>
              <Textarea 
                id="edit-problem-question" 
                value={editingProblem?.question || ""}
                onChange={(e) => setEditingProblem(prev => prev ? {...prev, question: e.target.value} : null)}
                placeholder="Enter your question here..."
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-problem-answer">Answer (Optional)</Label>
              <Textarea 
                id="edit-problem-answer" 
                value={editingProblem?.answer || ""}
                onChange={(e) => setEditingProblem(prev => prev ? {...prev, answer: e.target.value} : null)}
                placeholder="Enter the answer here..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditingProblem(null)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateProblem}
              disabled={!editingProblem?.question?.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Materials Dialog */}
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
                    // Navigate to materials tab
                    handleBackToCourse();
                  }}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Course Materials
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {course.materials.map((material: Material) => (
                  <div key={material.id} className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-100">
                    <input 
                      type="checkbox"
                      id={material.id}
                      checked={selectedMaterials.includes(material.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMaterials(prev => [...prev, material.id]);
                        } else {
                          setSelectedMaterials(prev => 
                            prev.filter(id => id !== material.id)
                          );
                        }
                      }}
                      className="rounded"
                    />
                    <div className="flex-1 flex items-center">
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
      
      {/* PDF Diagram Selection Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] w-[900px] h-[800px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Diagram from PDF</DialogTitle>
            <DialogDescription>
              Navigate to the correct page, then click and drag to select the area to crop.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <span>
                  Page {currentPage} of {numPages}
                </span>
                <Button 
                  variant="outline" 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= numPages}
                >
                  Next
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setScale(scale - 0.1)}
                  disabled={scale <= 0.5}
                >
                  Zoom Out
                </Button>
                <span>{Math.round(scale * 100)}%</span>
                <Button 
                  variant="outline" 
                  onClick={() => setScale(scale + 0.1)}
                  disabled={scale >= 2.0}
                >
                  Zoom In
                </Button>
              </div>
            </div>
            
            <div className="flex-1 flex">
              <div 
                className="flex-1 relative border rounded-md overflow-auto bg-gray-100"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                ref={pdfContainerRef}
              >
                <Document
                  file={pdfUrl}
                  onLoadSuccess={handleDocumentLoadSuccess}
                  loading={<div className="flex justify-center items-center h-full">Loading PDF...</div>}
                  error={<div className="flex justify-center items-center h-full text-red-500">Failed to load PDF</div>}
                >
                  <Page 
                    pageNumber={currentPage} 
                    scale={scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
                
                {selection && (
                  <div 
                    className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
                    style={{
                      left: selection.x,
                      top: selection.y,
                      width: selection.width,
                      height: selection.height
                    }}
                  ></div>
                )}
              </div>
              
              {croppedImage && (
                <div className="ml-4 w-64 flex flex-col">
                  <div className="font-medium mb-2">Preview:</div>
                  <div className="border rounded-md p-2 bg-white">
                    <img 
                      src={croppedImage} 
                      alt="Cropped selection" 
                      className="max-w-full h-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <div>
              {selection && !croppedImage && (
                <Button 
                  variant="secondary" 
                  onClick={handleCropImage}
                >
                  <Scissors className="h-4 w-4 mr-2" /> Crop Selection
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setPdfDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveDiagram}
                disabled={!croppedImage || isSavingDiagram}
              >
                {isSavingDiagram ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" /> Save Diagram
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
