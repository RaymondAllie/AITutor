"use client"

import { DialogFooter } from "@/components/ui/dialog"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PlusCircle, X, CheckCircle, AlertCircle } from "lucide-react"

interface AddCourseModalProps {
  isOpen: boolean
  onClose: () => void
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

export function AddCourseModal({ isOpen, onClose }: AddCourseModalProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [courseName, setCourseName] = useState("")
  const [courseId, setCourseId] = useState("")
  const [materials, setMaterials] = useState<Material[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  // Mocked educator ID - in a real app this would come from authentication
  const educatorId = "teacher123"
  const [isCreating, setIsCreating] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  const handleNextStep = () => {
    if (step < 4) setStep(step + 1)
  }

  const handlePreviousStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleAddMaterial = () => {
    setMaterials([...materials, { name: "", type: "other", file: null }])
  }

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index))
  }

  const handleMaterialChange = (index: number, field: keyof Material, value: string | File | null) => {
    const updatedMaterials = [...materials]
    updatedMaterials[index] = { ...updatedMaterials[index], [field]: value }
    setMaterials(updatedMaterials)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    
    // Mock saving the course data
    setTimeout(() => {
      // In a real app, this would save to Supabase
      /* 
      const saveCourse = async () => {
        const { data, error } = await supabaseClient
          .from('courses')
          .insert({
            name: courseName,
            code: courseId,
            educator_id: educatorId,
            materials: materials,
            assignments: assignments
          })
          .select()
      }
      */
      console.log("New course:", { 
        name: courseName,
        code: courseId,
        educatorId, 
        materials, 
        assignments,
        url: `/educator/${educatorId}/${courseName.toLowerCase().replace(/\s+/g, '-')}`
      })
      
      setIsCreating(false)
      setIsCompleted(true)
      
      // Move to confirmation step
      setStep(4)
    }, 1000)
  }

  const handleFinish = () => {
    // Navigate to the new course page
    const courseSlug = courseName.toLowerCase().replace(/\s+/g, '-')
    router.push(`/educator/${educatorId}/${courseSlug}`)
    
    // Reset state and close modal
    resetForm()
    onClose()
  }
  
  const resetForm = () => {
    setStep(1)
    setCourseName("")
    setCourseId("")
    setMaterials([])
    setAssignments([])
    setIsCompleted(false)
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
            {step === 2 && "Add course materials (textbooks, powerpoints, problem sets, etc.)."}
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
                {s === 1 ? 'Name' : s === 2 ? 'Materials' : s === 3 ? 'Assignments' : 'Create'}
              </span>
            </div>
          ))}
        </div>
        
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
                  Course ID
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
            </div>
          )}
          
          {step === 2 && (
            <div className="grid gap-4 py-4 max-h-[300px] overflow-y-auto">
              {materials.map((material, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={material.name}
                    onChange={(e) => handleMaterialChange(index, "name", e.target.value)}
                    placeholder="Material name"
                    className="flex-grow"
                  />
                  <select
                    value={material.type}
                    onChange={(e) => handleMaterialChange(index, "type", e.target.value as Material["type"])}
                    className="border rounded p-2 text-sm font-normal text-gray-600"
                  >
                    <option value="textbook">Textbook</option>
                    <option value="powerpoint">PowerPoint</option>
                    <option value="pset">Problem Set</option>
                    <option value="other">Other</option>
                  </select>
                  <Input
                    type="file"
                    onChange={(e) => handleMaterialChange(index, "file", e.target.files?.[0] || null)}
                    className="max-w-[120px]"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveMaterial(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={handleAddMaterial} variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Material
              </Button>
            </div>
          )}
          
          {step === 3 && (
            <div className="grid gap-4 py-4 max-h-[300px] overflow-y-auto">
              {assignments.length === 0 ? (
                <div className="text-center p-6 border border-dashed rounded-md">
                  <p className="text-gray-500 mb-2">No assignments added yet.</p>
                  <p className="text-gray-500 text-sm">You must add at least one assignment before creating the course.</p>
                </div>
              ) : (
                assignments.map((assignment, index) => (
                  <div key={index} className="grid grid-cols-1 gap-3 p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <Input
                        value={assignment.name}
                        onChange={(e) => handleAssignmentChange(index, "name", e.target.value)}
                        placeholder="Assignment name"
                        className="flex-grow"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAssignment(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      type="date"
                      value={assignment.dueDate || ""}
                      onChange={(e) => handleAssignmentChange(index, "dueDate", e.target.value)}
                      placeholder="Due date"
                    />
                    <Input
                      value={assignment.description || ""}
                      onChange={(e) => handleAssignmentChange(index, "description", e.target.value)}
                      placeholder="Assignment description"
                    />
                  </div>
                ))
              )}
              <Button type="button" onClick={handleAddAssignment} variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Assignment
              </Button>
            </div>
          )}
          
          {assignments.length === 0 && step === 3 && (
            <div className="flex items-center p-3 text-sm text-amber-600 bg-amber-50 rounded-md mt-2">
              <AlertCircle className="h-4 w-4 mr-2" />
              Please add at least one assignment before creating the course.
            </div>
          )}
          
          {step === 4 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              {isCreating ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                  <p>Creating your course...</p>
                </div>
              ) : (
                <>
                  <CheckCircle className="text-green-500 h-16 w-16 mb-4" />
                  <h3 className="text-xl font-medium mb-2">Course Created Successfully!</h3>
                  <p className="text-gray-500 mb-6">
                    Your course "{courseName}" ({courseId}) has been created with {materials.length} materials and {assignments.length} assignments.
                  </p>
                  <Button onClick={handleFinish} className="w-full">
                    Go to Course Page
                  </Button>
                </>
              )}
            </div>
          )}
          
          {step < 4 && (
            <DialogFooter>
              {step > 1 && (
                <Button type="button" variant="outline" onClick={handlePreviousStep}>
                  Previous
                </Button>
              )}
              {step < 3 ? (
                <Button 
                  type="button" 
                  onClick={handleNextStep}
                  disabled={step === 1 && (!courseName.trim() || !courseId.trim())}
                >
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={assignments.length === 0}>Create Course</Button>
              )}
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
