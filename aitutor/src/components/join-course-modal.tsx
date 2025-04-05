"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle, CheckCircle } from "lucide-react"

interface JoinCourseModalProps {
  isOpen: boolean
  onClose: () => void
}

export function JoinCourseModal({ isOpen, onClose }: JoinCourseModalProps) {
  const router = useRouter()
  const [courseId, setCourseId] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Mocked student ID - in a real app this would come from authentication
  const studentId = "student123"
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsJoining(true)
    
    // Mock API call to join course
    setTimeout(() => {
      // In a real app, this would check if the course ID exists and join the student to the course
      if (courseId === "CS101" || courseId === "CS201") {
        setIsComplete(true)
        setIsJoining(false)
      } else {
        setError("Course not found. Please check the course ID and try again.")
        setIsJoining(false)
      }
    }, 1000)
  }
  
  const handleFinish = () => {
    // In a real app, this would navigate to the course page
    // For now, we'll just mock the behavior with a course slug
    const courseSlug = courseId === "CS101" 
      ? "introduction-to-computer-science"
      : "data-structures-and-algorithms"
    
    router.push(`/student/${studentId}/${courseSlug}`)
    resetForm()
    onClose()
  }
  
  const resetForm = () => {
    setCourseId("")
    setIsComplete(false)
    setError(null)
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
            Enter the course ID provided by your instructor.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          {!isComplete ? (
            <div className="grid gap-4 py-4">
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
                You have successfully joined the course with ID "{courseId}".
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
                disabled={isJoining || !courseId.trim()}
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