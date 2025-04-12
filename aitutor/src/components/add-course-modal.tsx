"use client"

import { DialogFooter } from "@/components/ui/dialog"
import type React from "react"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PlusCircle, X, CheckCircle, AlertCircle, Upload, FileWarning } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

// Get environment variables
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let COURSE_ID = ""

interface AddCourseModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
  onCourseCreated?: () => void
}

type Material = {
  name: string
  type: "textbook" | "powerpoint" | "pset" | "other"
  file: File | null
}

type Assignment = {
  name: string
  dueDate?: string
  description?: string
}

export function AddCourseModal({ isOpen, onClose, userId, onCourseCreated }: AddCourseModalProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [courseName, setCourseName] = useState("")
  const [courseId, setCourseId] = useState("")
  const [courseDescription, setCourseDescription] = useState("")
  
  // Single material state
  const [materialName, setMaterialName] = useState("")
  const [materialType, setMaterialType] = useState<"textbook" | "powerpoint" | "pset" | "other">("textbook")
  const [materialFile, setMaterialFile] = useState<File | null>(null)
  
  // Single assignment state
  const [assignmentName, setAssignmentName] = useState("")
  const [assignmentDate, setAssignmentDate] = useState("")
  const [assignmentTime, setAssignmentTime] = useState("")
  const [assignmentDescription, setAssignmentDescription] = useState("")
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null)
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [questionsGenerated, setQuestionsGenerated] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([])
  
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingMaterial, setUploadingMaterial] = useState(false)
  const [materialUploaded, setMaterialUploaded] = useState(false)
  const [materialUploadFailed, setMaterialUploadFailed] = useState(false)
  const [createdCourseId, setCreatedCourseId] = useState("")
  const [materialUploadError, setMaterialUploadError] = useState<string | null>(null)
  const [courseCreated, setCourseCreated] = useState(false)

  const handleNextStep = async () => {
    // If moving from step 1 to step 2, create the course first
    if (step === 1) {
      // Validate required fields
      if (!courseName.trim() || !courseId.trim()) {
        setError("Course name and ID are required")
        return
      }

      // Create course before proceeding
      const success = await createCourse()
      if (!success) {
        return // Don't proceed if course creation failed
      }
    }
    
    // If moving from step 2 to step 3 and we have material info, upload the material
    if (step === 2 && materialFile && materialName) {
      try {
        setError(null)
        console.log("attemping for", COURSE_ID)
        const success = await uploadMaterial(COURSE_ID)
        if (!success) {
          // We'll still proceed to step 3, but we'll show the error message
          setMaterialUploadFailed(true)
        }
      } catch (err: any) {
        console.error("Error uploading material during step transition:", err)
        setMaterialUploadError(err.message || "Failed to upload material")
        setMaterialUploadFailed(true)
        // We still continue to next step, since material upload is optional
      }
    }
    
    // If moving from step 3 to step 4, ensure questions have been generated and submit the assignment
    if (step === 3) {
      if (!questionsGenerated) {
        setError("Please generate questions before proceeding")
        return
      }
      
      if (generatedQuestions.length === 0) {
        setError("You need at least one question for the assignment")
        return
      }
      
      // Submit the assignment
      setIsCreating(true)
      try {
        // Ensure generatedQuestions is an array of strings for problem_list
        const problemList = generatedQuestions.map(q => q.toString());

        let temporary_uuid = crypto.randomUUID()
        
        const assignmentData = {
          course_id: COURSE_ID,
          name: assignmentName,
          due_date: assignmentDate && assignmentTime ? `${assignmentDate}T${assignmentTime}:00` : undefined,
          description: assignmentDescription,
          material_ids: [temporary_uuid], // Empty string as per requirements
          problem_list: problemList // List of questions as strings
        }
        
        // Log the structure to confirm it's correct
        console.log("Submitting assignment with data:", JSON.stringify(assignmentData, null, 2))
        
        // Call the Supabase Edge Function
        const response = await fetch('https://yhqxnhbpxjslmiwtfkez.supabase.co/functions/v1/add_assignment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify(assignmentData)
        })

        console.log("Assignment created response:", response)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error("Error response:", errorText)
          
          let errorMessage = 'Failed to create assignment'
          try {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.message || errorMessage
          } catch (e) {
            // If we can't parse JSON, use the response text
            errorMessage = errorText || errorMessage
          }
          
          throw new Error(errorMessage)
        }
        
        const result = await response.json()
        console.log("Assignment created result:", result)
      } catch (err: any) {
        console.error("Error creating assignment:", err)
        setError(err.message || "Failed to create assignment. Please try again.")
        setIsCreating(false)
        return // Don't proceed on error
      } finally {
        setIsCreating(false)
      }
    }
    
    if (step < 4) setStep(step + 1)
  }

  const handlePreviousStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleAddAssignment = () => {
    setAssignments([...assignments, { name: "" }])
  }

  const handleRemoveAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index))
  }

  const handleAssignmentChange = (index: number, field: keyof Assignment, value: string) => {
    const updatedAssignments = [...assignments]
    updatedAssignments[index] = { ...updatedAssignments[index], [field]: value }
    setAssignments(updatedAssignments)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'material' | 'assignment') => {
    const file = e.target.files?.[0] || null
    
    if (file) {
      // Check file size (5MB limit)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        setError(`File size exceeds 5MB. Please choose a smaller file.`)
        return
      }
      
      // Check file type
      if (!file.type.includes('pdf')) {
        setError('Only PDF files are supported.')
        return
      }
      
      setError(null)
    }
    
    if (fileType === 'material') {
      setMaterialFile(file)
    } else {
      setAssignmentFile(file)
    }
  }

  const uploadMaterial = async (courseId: string): Promise<boolean> => {
    if (!materialFile || !materialName || !courseId) return false

    setUploadingMaterial(true)
    setMaterialUploadError(null)

    try {
      // Create a FormData object
      const formData = new FormData()
      
      // Add the file - IMPORTANT: 'pdf' must match exactly what the backend expects
      formData.append('pdf', materialFile, materialFile.name)
      console.log("Uploading material for course ID:", COURSE_ID)
      
      // Add the JSON data as a string
      const materialData = JSON.stringify({
        name: materialName,
        type: materialType,
        course_id: COURSE_ID // This is the UUID generated for the course
      })
      
      // Add the JSON data as a string value without wrapping it in another JSON.stringify
      formData.append('data', materialData)
      
      // Send the request - IMPORTANT: Do NOT set the Content-Type header for multipart/form-data
      // The browser will automatically set the correct boundary and Content-Type
      const response = await fetch('https://yhqxnhbpxjslmiwtfkez.supabase.co/functions/v1/material_upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: formData
      })
      
      // Try to get response text for better error reporting
      const responseText = await response.text()
      console.log("Material upload response:", responseText)
      
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
      
      console.log("Material uploaded successfully")
      
      // Success
      setMaterialUploaded(true)
      return true
    } catch (err: any) {
      console.error("Error uploading material:", err)
      setMaterialUploadError(err.message || "Failed to upload material. The course was created, but the material could not be uploaded.")
      setMaterialUploadFailed(true)
      return false
    } finally {
      setUploadingMaterial(false)
    }
  }

  // Create course function - now separate so we can call it earlier
  const createCourse = async (): Promise<boolean> => {
    setIsCreating(true)
    setError(null)
    
    try {

      let course_id_step_one = crypto.randomUUID()
      COURSE_ID = course_id_step_one

      // Generate a random 5-character alphanumeric join code
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let join_code = '';
      for (let i = 0; i < 5; i++) {
        join_code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Only create course if it hasn't been created yet
      if (!courseCreated) {
        // Prepare the data for the edge function
        const courseData = {
          name: courseName,
          course_code: courseId, // This is the course code entered by user (e.g. CS101)
          description: courseDescription,
          course_id: course_id_step_one, // This is the UUID we generated
          user_id: userId,
          join_code: join_code
        }
        
        console.log("Creating course with data:", courseData)
        console.log("course id", course_id_step_one)
        
        // Call the Supabase Edge Function
        const response = await fetch('https://yhqxnhbpxjslmiwtfkez.supabase.co/functions/v1/add_course', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify(courseData)
        })

        const response2 = await fetch('https://yhqxnhbpxjslmiwtfkez.supabase.co/functions/v1/add_user_to_course', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            course_id: course_id_step_one,
            user_id: userId
          })
        }) 
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Failed to create course')
        }

        if (!response2.ok) {
          const errorData = await response2.json().catch(() => ({}))
          throw new Error(errorData.message || 'Failed to add user to course')
        }
        
        const result = await response.json()
        console.log("Course created result:", result)
        
        // Mark as created so we don't try to create it again
        setCourseCreated(true)
      }
      
      return true
    } catch (err: any) {
      console.error("Error creating course:", err)
      setError(err.message || "Failed to create course. Please try again.")
      return false
    } finally {
      setIsCreating(false)
    }
  }

  // This is now responsible for completing the process - uploading material and updating assignments
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMaterialUploadError(null)
    setMaterialUploadFailed(false)
    
    try {
      // Course has already been created in step 1
      // Material has already been uploaded in step 2 (if any)
      // Assignment questions have already been generated in step 3
      
      // At this point, we're just finalizing everything
      
      // Success - move to confirmation step
      setIsCompleted(true)
      setStep(4)
      
      // Call the callback if provided
      if (onCourseCreated) {
        onCourseCreated()
      }
      
    } catch (err: any) {
      console.error("Error finalizing course:", err)
      setError(err.message || "Failed to finalize course. Please try again.")
    }
  }

  const handleFinish = () => {
    // Reset state and close modal
    resetForm()
    onClose()
  }
  
  const resetForm = () => {
    setStep(1)
    setCourseName("")
    setCourseId("")
    setCourseDescription("")
    setMaterialName("")
    setMaterialType("textbook")
    setMaterialFile(null)
    setAssignmentName("")
    setAssignmentDate("")
    setAssignmentTime("")
    setAssignmentDescription("")
    setAssignmentFile(null)
    setIsGeneratingQuestions(false)
    setQuestionsGenerated(false)
    setGeneratedQuestions([])
    setAssignments([])
    setIsCompleted(false)
    setError(null)
    setUploadingMaterial(false)
    setMaterialUploaded(false)
    setMaterialUploadFailed(false)
    setMaterialUploadError(null)
    setCreatedCourseId("")
    setCourseCreated(false)
  }

  const generateQuestions = async (): Promise<boolean> => {
    if (!assignmentFile || !assignmentName || !COURSE_ID) return false

    setIsGeneratingQuestions(true)
    setError(null)

    try {
      // Create a FormData object
      const formData = new FormData()
      
      // Add the file
      formData.append('pdf', assignmentFile, assignmentFile.name)
      console.log("Generating questions for assignment:", assignmentName)
      
      // Add the JSON data as a string
      const assignmentData = JSON.stringify({
        name: assignmentName,
        due_date: assignmentDate && assignmentTime ? `${assignmentDate}T${assignmentTime}:00` : undefined,
        description: assignmentDescription,
        course_id: COURSE_ID
      })
      
      formData.append('data', assignmentData)
      
      // Send the request
      const response = await fetch('https://yhqxnhbpxjslmiwtfkez.supabase.co/functions/v1/generate_questions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: formData
      })
      
      // Try to get response text for better error reporting
      const responseText = await response.text()
      console.log("Question generation response:", responseText)
      
      if (!response.ok) {
        let errorMessage = 'Failed to generate questions'
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.message || errorMessage
        } catch (e) {
          // If we can't parse JSON, use the response text
          errorMessage = responseText || errorMessage
        }
        throw new Error(errorMessage)
      }
      
      // Parse the response and extract the problems
      try {
        const data = JSON.parse(responseText)
        if (data.problems && Array.isArray(data.problems)) {
          setGeneratedQuestions(data.problems)
          console.log("Questions generated successfully:", data.problems)
        } else {
          throw new Error("No questions found in the response")
        }
      } catch (parseError) {
        console.error("Error parsing question response:", parseError)
        throw new Error("Failed to parse generated questions")
      }
      
      // Success
      setQuestionsGenerated(true)
      return true
    } catch (err: any) {
      console.error("Error generating questions:", err)
      setError(err.message || "Failed to generate questions. Please try again.")
      return false
    } finally {
      setIsGeneratingQuestions(false)
    }
  }

  const handleQuestionEdit = (index: number, newText: string) => {
    const updatedQuestions = [...generatedQuestions]
    updatedQuestions[index] = newText
    setGeneratedQuestions(updatedQuestions)
  }

  const handleQuestionRemove = (index: number) => {
    setGeneratedQuestions(generatedQuestions.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm()
        onClose()
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Course</DialogTitle>
          <DialogDescription>
            {step === 1 && "Enter the name and ID of the new course."}
            {step === 2 && "Add a course material (PDF file only, max 5MB)."}
            {step === 3 && "Create assignments for this course."}
            {step === 4 && "Course creation successful!"}
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress indicator */}
        <div className="flex justify-between mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s} 
              className={`flex flex-col items-center ${s <= step ? 'text-primary' : 'text-gray-300'}`}
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white mb-1
                  ${s < step ? 'bg-primary' : s === step ? 'bg-primary border-2 border-primary' : 'bg-gray-200'}`}
              >
                {s < step ? '✓' : s}
              </div>
              <span className="text-xs">
                {s === 1 ? 'Name' : s === 2 ? 'Material' : s === 3 ? 'Assignments' : 'Finish'}
              </span>
            </div>
          ))}
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-start mb-4">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="courseName" className="text-right">
                  Course Name
                </Label>
                <Input
                  id="courseName"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="col-span-3"
                  required
                  placeholder="e.g., Introduction to Computer Science"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="courseId" className="text-right">
                  Course Code
                </Label>
                <Input
                  id="courseId"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="col-span-3"
                  required
                  placeholder="e.g., CS101"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="courseDescription" className="text-right">
                  Description
                </Label>
                <Input
                  id="courseDescription"
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  className="col-span-3"
                  placeholder="Brief course description"
                />
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div className="grid gap-4 py-4">
              {courseCreated && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md flex items-start mb-2">
                  <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Course "{courseName}" created successfully! Now you can add materials.</p>
                </div>
              )}
              <div className="border rounded-md p-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="materialName" className="text-right">
                      Material Name
                    </Label>
                    <Input
                      id="materialName"
                      value={materialName}
                      onChange={(e) => setMaterialName(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g., Course Textbook"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="materialType" className="text-right">
                      Type
                    </Label>
                    <select
                      id="materialType"
                      value={materialType}
                      onChange={(e) => setMaterialType(e.target.value as Material["type"])}
                      className="col-span-3 border rounded p-2 text-sm font-normal text-gray-600"
                    >
                      <option value="textbook">Textbook</option>
                      <option value="powerpoint">PowerPoint</option>
                      <option value="pset">Problem Set</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="materialFile" className="text-right">
                      File (PDF)
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="materialFile"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(e, 'material')}
                        className="flex-grow"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Only PDF files are supported (max 5MB)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic">
                Note: If you don't want to add a material now, you can leave this section empty.
              </p>
            </div>
          )}
          
          {step === 3 && (
            <div className="grid gap-4 py-4">
              {materialUploaded && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md flex items-start mb-2">
                  <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Material "{materialName}" uploaded successfully! Now you can create an assignment.</p>
                </div>
              )}
              <div className="border rounded-md p-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="assignmentName" className="text-right">
                      Assignment Name
                    </Label>
                    <Input
                      id="assignmentName"
                      value={assignmentName}
                      onChange={(e) => setAssignmentName(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g., Homework 1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="assignmentDate" className="text-right">
                      Due Date
                    </Label>
                    <Input
                      id="assignmentDate"
                      type="date"
                      value={assignmentDate}
                      onChange={(e) => setAssignmentDate(e.target.value)}
                      className="col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="assignmentTime" className="text-right">
                      Due Time
                    </Label>
                    <Input
                      id="assignmentTime"
                      type="time"
                      value={assignmentTime}
                      onChange={(e) => setAssignmentTime(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="assignmentDescription" className="text-right">
                      Description
                    </Label>
                    <Input
                      id="assignmentDescription"
                      value={assignmentDescription}
                      onChange={(e) => setAssignmentDescription(e.target.value)}
                      className="col-span-3"
                      placeholder="Brief assignment description"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="assignmentFile" className="text-right">
                      Assignment PDF
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="assignmentFile"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(e, 'assignment')}
                        className="flex-grow"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload your problem set or assignment details (max 5MB)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {!questionsGenerated && (
                <div className="flex justify-center mt-4">
                  <Button 
                    type="button" 
                    onClick={generateQuestions}
                    disabled={isGeneratingQuestions || !assignmentFile || !assignmentName}
                    className="w-full"
                  >
                    {isGeneratingQuestions ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span> 
                        Generating Questions...
                      </>
                    ) : (
                      "Generate Questions"
                    )}
                  </Button>
                </div>
              )}
              
              {questionsGenerated && generatedQuestions.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Generated Questions</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You can edit or remove questions before finalizing the assignment.
                  </p>
                  
                  <div className="space-y-4 max-h-[300px] overflow-y-auto border rounded-md p-4">
                    {generatedQuestions.map((question, index) => (
                      <div key={index} className="border rounded-md p-3 bg-background">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">Question {index + 1}</h4>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleQuestionRemove(index)}
                            className="h-8 w-8 text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <textarea
                          value={question}
                          onChange={(e) => handleQuestionEdit(index, e.target.value)}
                          className="w-full min-h-[100px] p-2 border rounded-md text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {questionsGenerated && generatedQuestions.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-md flex items-start mt-4">
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">All questions removed</p>
                    <p className="text-sm">You have removed all generated questions. Click "Generate Questions" again or add questions manually.</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {step === 4 && (
            <div className="py-8 text-center">
              {isCreating || uploadingMaterial || isGeneratingQuestions ? (
                <div className="space-y-4">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
                  <h3 className="text-xl font-medium">
                    {isCreating ? "Creating Course..." : 
                     uploadingMaterial ? "Uploading Material..." : 
                     "Generating Questions..."}
                  </h3>
                  <p className="text-gray-500">Please wait while we set up your course.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <h3 className="text-xl font-medium">Course Created Successfully!</h3>
                  <p className="text-gray-500">
                    Your new course "{courseName}" has been created.
                  </p>
                  
                  {materialFile && materialUploaded && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3 text-green-700 text-sm mt-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        <span>Course material "{materialName}" has been uploaded.</span>
                      </div>
                    </div>
                  )}
                  
                  {materialFile && materialUploadFailed && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-700 text-sm mt-4">
                      <div className="flex items-start">
                        <FileWarning className="h-4 w-4 mr-2 mt-0.5" />
                        <div>
                          <p className="font-medium">Material Upload Failed</p>
                          <p>The course was created successfully, but the material could not be uploaded.</p>
                          {materialUploadError && <p className="mt-1">{materialUploadError}</p>}
                          <p className="mt-1">You can try uploading the material again from the course page.</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {questionsGenerated && assignmentName && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3 text-green-700 text-sm mt-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        <span>
                          Assignment "{assignmentName}" has been created with {generatedQuestions.length} {generatedQuestions.length === 1 ? 'question' : 'questions'}.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="mt-6">
            {step < 4 ? (
              <>
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={handlePreviousStep}>
                    Back
                  </Button>
                )}
                {step < 3 ? (
                  <Button 
                    type="button" 
                    onClick={handleNextStep}
                    disabled={step === 1 ? isCreating : (step === 2 && Boolean(materialName) && !materialFile)}
                  >
                    {step === 1 && isCreating ? "Creating..." : "Next"}
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    onClick={handleNextStep}
                    disabled={!questionsGenerated || generatedQuestions.length === 0 || isCreating}
                  >
                    {isCreating 
                      ? "Creating Assignment..." 
                      : (questionsGenerated && generatedQuestions.length > 0) 
                        ? "Next" 
                        : "Please Generate Questions First"}
                  </Button>
                )}
              </>
            ) : (
              <Button type="button" onClick={handleFinish} disabled={isCreating || uploadingMaterial}>
                Done
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
