"use client"

import { useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Calendar, Paperclip, MessageCircle, FileUp, Loader2, Sparkles, UploadCloud } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Course, Assignment, Material } from "@/app/educator/[educatorId]/[courseSlug]/types"
import { generateQuestionsFromPdf, createAssignmentWithQuestions } from "../utils/questionGenerationHelpers"

interface AssignmentsTabProps {
  course: Course
  setCourse: (course: Course) => void
  openProblemsDialog: (assignmentId: string) => void
  openInsightsPanel: (assignmentId: string, e: React.MouseEvent) => void
}

export function AssignmentsTab({ course, setCourse, openProblemsDialog, openInsightsPanel }: AssignmentsTabProps) {
  // Sort assignments by due date
  const sortedAssignments = [...course.assignments].sort((a: Assignment, b: Assignment) => 
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  )

  const router = useRouter()
  const params = useParams()
  const { educatorId } = params

  // State for materials dialog
  const [materialsDialogOpen, setMaterialsDialogOpen] = useState(false)
  const [currentAssignmentId, setCurrentAssignmentId] = useState<string | null>(null)
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  
  // State for add assignment dialog
  const [addAssignmentDialogOpen, setAddAssignmentDialogOpen] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    name: "",
    description: "",
    dueDate: "",
    attachedMaterials: [] as string[]
  })

  // State for problem set upload and question generation
  const [uploadedProblemSet, setUploadedProblemSet] = useState<File | null>(null)
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<Array<{question: string, answer: string}>>([])
  const [showQuestionsDialog, setShowQuestionsDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Open materials dialog for an assignment
  const openMaterialsDialog = (assignmentId: string) => {
    const assignment = course?.assignments.find((a: Assignment) => a.id === assignmentId)
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
        assignments: course.assignments.map((assignment: Assignment) => 
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

  // Handle problem set file upload
  const handleProblemSetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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

    setUploadedProblemSet(file)
    toast.success("Problem set uploaded. Ready to generate questions.")
  }

  // Generate questions from uploaded problem set
  const handleGenerateQuestions = async () => {
    if (!uploadedProblemSet) {
      toast.error('Please upload a problem set PDF first')
      return
    }

    setIsGeneratingQuestions(true)
    
    try {
      // Use the utility function to generate questions
      const problems = await generateQuestionsFromPdf(uploadedProblemSet, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
      
      // Store the generated questions
      setGeneratedQuestions(problems)
      
      // Show the questions dialog
      setShowQuestionsDialog(true)
    } catch (err: any) {
      console.error("Error generating questions:", err)
      toast.error(err.message || "Failed to generate questions")
    } finally {
      setIsGeneratingQuestions(false)
    }
  }

  // Create assignment with generated questions
  const handleCreateWithGeneratedQuestions = async () => {
    if (!course || generatedQuestions.length === 0 || !newAssignment.name || !newAssignment.dueDate) {
      toast.error("Please fill in all required fields and generate questions first")
      return
    }
    
    try {
      // Use the utility function to create the assignment
      // Note: The utility function will transform each answer into a list internally
      await createAssignmentWithQuestions(
        course.id,
        newAssignment.name,
        newAssignment.dueDate,
        newAssignment.description,
        newAssignment.attachedMaterials,
        generatedQuestions.map(q => q.question),
        generatedQuestions.map(q => q.answer || ""),
        [],
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      )
      
      toast.success("Assignment created with generated questions")
      
      // Reset state and close dialogs
      setShowQuestionsDialog(false)
      setAddAssignmentDialogOpen(false)
      setGeneratedQuestions([])
      setUploadedProblemSet(null)
      setNewAssignment({
        name: "",
        description: "",
        dueDate: "",
        attachedMaterials: []
      })
      
      // Refresh the assignments list (you might need to add a refreshCourse function)
      // refreshCourse()
    } catch (err: any) {
      console.error("Error creating assignment:", err)
      toast.error(err.message || "Failed to create assignment with generated questions")
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

  // Get material type icon for the attached materials
  const getMaterialIcon = (type: string) => {
    switch(type) {
      case 'textbook': return <span className="i-lucide-book h-4 w-4" />;
      case 'powerpoint': return <span className="i-lucide-file-text h-4 w-4" />;
      case 'slides': return <span className="i-lucide-file-text h-4 w-4" />;
      case 'pset': return <span className="i-lucide-file-text h-4 w-4" />;
      default: return <span className="i-lucide-file-text h-4 w-4" />;
    }
  }

  // Navigate to assignment page
  const navigateToAssignment = (assignment: Assignment, e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Use the courseSlug from URL and append assignment ID
    const courseSlugFormatted = course.course_code
    
    router.push(`/educator/${educatorId}/${courseSlugFormatted}/${assignment.id}`)
  }

  return (
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
              onClick={(e) => navigateToAssignment(assignment, e)}
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
                    {assignment.material_ids.map((materialId: string) => {
                      const material = course.materials.find((m: Material) => m.id === materialId);
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
                    // Would navigate to materials tab here
                  }}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Course Materials
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {course.materials.map((material: Material) => (
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
                      // Would navigate to materials tab here
                    }}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Materials First
                  </Button>
                </div>
              ) : (
                <div className="border rounded-md p-3 space-y-2 max-h-[200px] overflow-y-auto">
                  {course.materials.map((material: Material) => (
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
            
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Upload Problem Set PDF</Label>
                <div className="text-xs text-blue-500">
                  Generate questions automatically from a PDF
                </div>
              </div>
              
              <div className="border rounded-md p-4 space-y-3">
                <div className="flex flex-col items-center justify-center gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    id="problem-set-file" 
                    accept=".pdf" 
                    className="hidden"
                    onChange={handleProblemSetUpload}
                  />
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full border-dashed h-20 flex flex-col gap-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud className="h-6 w-6" />
                    <span>
                      {uploadedProblemSet ? uploadedProblemSet.name : 'Click to upload a problem set PDF'}
                    </span>
                  </Button>
                  
                  {uploadedProblemSet && (
                    <Button 
                      type="button"
                      className="mt-2"
                      disabled={isGeneratingQuestions}
                      onClick={handleGenerateQuestions}
                    >
                      {isGeneratingQuestions ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Questions
                        </>
                      )}
                    </Button>
                  )}
                </div>
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
      
      {/* Generated Questions Dialog */}
      <Dialog open={showQuestionsDialog} onOpenChange={setShowQuestionsDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {generatedQuestions.length} Questions Generated
            </DialogTitle>
            <DialogDescription>
              The following questions were automatically extracted from your problem set PDF.
              You can add optional answers before creating the assignment. Students will be able to see these questions when working on the assignment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {generatedQuestions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">No questions could be generated from this document.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {generatedQuestions.map((q, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Question {index + 1}</h3>
                    <p className="text-sm mb-2">{q.question}</p>
                    <div className="mt-2">
                      <Label htmlFor={`answer-${index}`}>Answer (Optional):</Label>
                      <Textarea 
                        id={`answer-${index}`}
                        className="mt-1"
                        placeholder="Enter answer or leave blank..."
                        value={q.answer}
                        onChange={(e) => {
                          const newQuestions = [...generatedQuestions];
                          newQuestions[index].answer = e.target.value;
                          setGeneratedQuestions(newQuestions);
                        }}
                        rows={2}
                      />
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
                onClick={() => setShowQuestionsDialog(false)}
              >
                Back to Edit
              </Button>
              <Button 
                type="button" 
                onClick={handleCreateWithGeneratedQuestions}
                disabled={generatedQuestions.length === 0 || !newAssignment.name || !newAssignment.dueDate}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Create Assignment with Questions
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 