"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface JoinCourseModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
  onCourseJoined?: () => void
}

export function JoinCourseModal({ isOpen, onClose, userId, onCourseJoined }: JoinCourseModalProps) {
  const router = useRouter()
  const [courseCode, setCourseCode] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joinedCourse, setJoinedCourse] = useState<{ id: string, name: string, slug: string } | null>(null)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsJoining(true)
    
    try {
      if (!userId) {
        throw new Error("User ID is required to join a course")
      }
      
      // Find the course by code
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, name, course_code')
        .ilike('course_code', courseCode.trim())
        .single()
      
      if (courseError) {
        throw new Error("Course not found. Please check the course code and try again.")
      }
      
      // Check if the user is already enrolled in this course
      const { data: existingEnrollment, error: enrollmentError } = await supabase
        .from('users_courses')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseData.id)
        .single()
      
      if (existingEnrollment) {
        throw new Error("You are already enrolled in this course.")
      }
      
      // Create the relationship in the users_courses join table
      const { error: joinError } = await supabase
        .from('users_courses')
        .insert({
          user_id: userId,
          course_id: courseData.id,
          role: 'student'
        })
      
      if (joinError) throw joinError
      
      // Generate a slug for the course name
      const courseSlug = courseData.name.toLowerCase().replace(/\s+/g, '-')
      
      setJoinedCourse({
        id: courseData.id,
        name: courseData.name,
        slug: courseSlug
      })
      
      setIsComplete(true)
      
      // Call the callback if provided
      if (onCourseJoined) {
        onCourseJoined()
      }
    } catch (err: any) {
      console.error("Error joining course:", err)
      setError(err.message || "Failed to join course. Please try again.")
    } finally {
      setIsJoining(false)
    }
  }
  
  const handleFinish = () => {
    if (joinedCourse?.slug && userId) {
      router.push(`/student/${userId}/${joinedCourse.slug}`)
    }
    resetForm()
    onClose()
  }
  
  const resetForm = () => {
    setCourseCode("")
    setIsComplete(false)
    setError(null)
    setJoinedCourse(null)
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm()
        onClose()
      }
    }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Join a Course</DialogTitle>
          <DialogDescription>
            Enter the course code provided by your instructor.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          {!isComplete ? (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="courseCode" className="text-right">
                  Course Code
                </Label>
                <Input
                  id="courseCode"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="col-span-3"
                  required
                  placeholder="e.g., CS101"
                />
              </div>
              
              {error && (
                <div className="flex items-center p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle className="text-green-500 h-16 w-16 mb-4" />
              <h3 className="text-xl font-medium mb-2">Course Joined Successfully!</h3>
              <p className="text-gray-500 mb-6">
                You have successfully joined the course "{joinedCourse?.name}".
              </p>
              <Button onClick={handleFinish} className="w-full">
                Go to Course Page
              </Button>
            </div>
          )}
          
          {!isComplete && (
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={isJoining || !courseCode.trim()}
              >
                {isJoining ? "Joining..." : "Join Course"}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
} 