"use client"

import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Calendar, Clock, PlusCircle } from "lucide-react"
import { JoinCourseModal } from "@/components/join-course-modal"
import { StudentCourseList } from "@/components/student-course-list"
import { supabase } from "@/lib/supabase"

interface User {
  id: string
  name: string
  email: string
}

export default function StudentDashboard() {
  const params = useParams()
  const searchParams = useSearchParams()
  const studentId = params.studentId as string
  const shouldOpenJoinModal = searchParams.get('join') === 'true'
  const [joinCourseModalOpen, setJoinCourseModalOpen] = useState(shouldOpenJoinModal)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Function to load user data
  const loadUserData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', studentId)
        .single()
      
      if (error) throw error
      setUser(data)
    } catch (err) {
      console.error('Error loading user data:', err)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    if (studentId) {
      loadUserData()
    }
  }, [studentId])
  
  // Update modal state when URL query parameter changes
  useEffect(() => {
    setJoinCourseModalOpen(shouldOpenJoinModal)
  }, [shouldOpenJoinModal])
  
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  return (
    <div className="w-full space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Hi, {user?.name || 'Student'}
          </h1>
          <p className="text-muted-foreground">
            View your courses, assignments, and track your progress.
          </p>
        </div>
        <Button onClick={() => setJoinCourseModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Join Course
        </Button>
      </div>

      <Tabs defaultValue="all-courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all-courses">Active Courses</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all-courses" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Courses</h2>
          </div>
          <StudentCourseList studentId={studentId} />
        </TabsContent>
        
        <TabsContent value="archived">
          <div className="rounded-md border border-dashed p-12 text-center">
            <h3 className="text-lg font-medium">Archived Courses</h3>
            <p className="text-sm text-muted-foreground mt-2">
              This tab would show your archived courses.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Join Course Modal */}
      <JoinCourseModal 
        isOpen={joinCourseModalOpen} 
        onClose={() => setJoinCourseModalOpen(false)} 
        userId={studentId}
        onCourseJoined={loadUserData}
      />
    </div>
  )
} 