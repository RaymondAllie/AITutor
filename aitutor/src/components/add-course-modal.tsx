"use client"

import { DialogFooter } from "@/components/ui/dialog"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"

// Get environment variables
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface AddCourseModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
  onCourseCreated?: () => void
}

export function AddCourseModal({ isOpen, onClose, userId, onCourseCreated }: AddCourseModalProps) {
  const router = useRouter()
  const [courseName, setCourseName] = useState("")
  const [courseId, setCourseId] = useState("")
  const [courseDescription, setCourseDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setError(null)
    
    try {
      // Validate required fields
      if (!courseName.trim() || !courseId.trim()) {
        setError("Course name and ID are required")
        setIsCreating(false)
        return
      }

      const courseUuid = crypto.randomUUID()
      
      // Generate a random 5-character alphanumeric join code
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let join_code = '';
      for (let i = 0; i < 5; i++) {
        join_code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Prepare the data for the edge function
      const courseData = {
        name: courseName,
        course_code: courseId.toLowerCase(), // This is the course code entered by user (e.g. CS101)
        description: courseDescription,
        course_id: courseUuid, // This is the UUID we generated
        user_id: userId,
        join_code: join_code
      }
      
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
          course_id: courseUuid,
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
      
      // Close the modal
      resetForm()
      onClose()
      
      // Call the callback if provided
      if (onCourseCreated) {
        onCourseCreated()
      }
      
      // Navigate to the course page
      toast.success(`Course "${courseName}" created successfully!`)
      router.push(`/educator/${userId}/${courseId.toLowerCase()}`)
      
    } catch (err: any) {
      console.error("Error creating course:", err)
      setError(err.message || "Failed to create course. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }
  
  const resetForm = () => {
    setCourseName("")
    setCourseId("")
    setCourseDescription("")
    setError(null)
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
            Enter the details of your new course.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-start mb-4">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={createCourse}>
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
                Section
              </Label>
              <Input
                id="courseDescription"
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                className="col-span-3"
                placeholder="e.g. Section 1"
              />
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create & Go to Course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
