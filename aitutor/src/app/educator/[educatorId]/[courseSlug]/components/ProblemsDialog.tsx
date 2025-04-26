"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Paperclip, Edit, Trash2, Plus, MessageCircle } from "lucide-react"
import { Document, Page as PDFPage, pdfjs } from 'react-pdf'
import { ReactCrop, Crop } from 'react-image-crop'
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Course, Problem, Assignment } from "../types"

// Initialize PDF.js worker (add this near the top)
// Use a local worker file instead of CDN to avoid the error
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

interface ProblemsDialogProps {
  course: Course
  setCourse: (course: Course) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  currentAssignment: Assignment | null
  supabaseAnonKey: string
}

export function ProblemsDialog({ 
  course, 
  setCourse, 
  open, 
  onOpenChange, 
  currentAssignment,
  supabaseAnonKey 
}: ProblemsDialogProps) {
  const [problems, setProblems] = useState<Problem[]>([])
  const [newProblem, setNewProblem] = useState("")
  const [newAnswer, setNewAnswer] = useState("")
  const [editingProblem, setEditingProblem] = useState<{id: string, text: string} | null>(null)
  const [isLoadingProblems, setIsLoadingProblems] = useState(false)
  const [problemsError, setProblemsError] = useState<string | null>(null)

  // PDF diagram state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showPdfSelector, setShowPdfSelector] = useState(false)
  const [currentProblemForDiagram, setCurrentProblemForDiagram] = useState<Problem | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Load problems when dialog opens with a current assignment
  useEffect(() => {
    if (open && currentAssignment) {
      loadProblemsForAssignment(currentAssignment.id)
    }
  }, [open, currentAssignment])

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
    if (!currentAssignment || !newProblem.trim()) return
    
    try {
      // Use the Edge Function instead of direct database access
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/add_new_problem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          assignment_id: currentAssignment.id,
          new_problem: newProblem,
          answer: newAnswer.trim() || null,
          i: problems.length // Use the current length as index
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add problem');
      }
      
      // Get the problem data from the join table and problems table
      const { data: assignmentProblems, error: joinError } = await supabase
        .from('assignments_problems')
        .select('problem_id')
        .eq('assignment_id', currentAssignment.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (joinError) throw joinError;
      if (!assignmentProblems || assignmentProblems.length === 0) {
        throw new Error('Problem was added but could not be retrieved');
      }
      
      const problemId = assignmentProblems[0].problem_id;
      
      // Get the full problem data
      const { data: problemData, error: problemError } = await supabase
        .from('problems')
        .select('*')
        .eq('id', problemId)
        .single();
      
      if (problemError) throw problemError;
      
      // Update the local state
      const newProblemWithId = problemData as Problem;
      setProblems([...problems, newProblemWithId]);
      setNewProblem("");
      setNewAnswer("");
      
      // Update the problem count in the assignment
      if (course) {
        const updatedAssignments = course.assignments.map(assignment => 
          assignment.id === currentAssignment.id 
            ? { ...assignment, problem_count: (assignment.problem_count || 0) + 1 }
            : assignment
        );
        
        setCourse({
          ...course,
          assignments: updatedAssignments
        });
      }
      
      toast.success("Problem added successfully");
    } catch (err: any) {
      console.error("Error adding problem:", err);
      toast.error(err.message || "Failed to add problem");
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
    if (!currentAssignment) return
    
    try {
      // First, delete the entry from the join table
      const { error: joinError } = await supabase
        .from('assignments_problems')
        .delete()
        .eq('assignment_id', currentAssignment.id)
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
        const updatedAssignments = course.assignments.map(assignment => 
          assignment.id === currentAssignment.id 
            ? { ...assignment, problem_count: Math.max(0, (assignment.problem_count || 0) - 1) }
            : assignment
        );
        
        setCourse({
          ...course,
          assignments: updatedAssignments
        });
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
    if (!currentAssignment || !course) return null
    
    // Find PDF material attached to this assignment
    const materialIds = currentAssignment.material_ids || []
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Problems for: {currentAssignment?.name}
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
                  onClick={() => currentAssignment && loadProblemsForAssignment(currentAssignment.id)}
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
                    <div>
                      <Label htmlFor="new-problem">Question</Label>
                      <Textarea
                        id="new-problem"
                        value={newProblem}
                        onChange={(e) => setNewProblem(e.target.value)}
                        placeholder="Enter a problem question..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-answer">Correct Answer (Optional)</Label>
                      <Textarea
                        id="new-answer"
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        placeholder="Enter the correct answer to this question (optional)..."
                        rows={2}
                      />
                    </div>
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
              onClick={() => onOpenChange(false)}
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
    </>
  )
} 