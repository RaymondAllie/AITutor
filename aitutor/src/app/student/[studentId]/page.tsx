"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Calendar, Clock, PlusCircle } from "lucide-react"
import { JoinCourseModal } from "@/components/join-course-modal"
import { StudentCourseList } from "@/components/student-course-list"

// Mock data for courses - in a real app, this would be fetched from a database
const courses = [
  { 
    id: 1, 
    name: "Introduction to Computer Science", 
    code: "CS101",
    slug: "introduction-to-computer-science",
    description: "Learn the basics of programming and computer science concepts.",
    recentTopics: ["Variables and Data Types", "Control Flow", "Functions"],
    assignments: [
      { name: "Assignment 1: Variables", dueDate: "2023-05-15", completed: true },
      { name: "Assignment 2: Loops", dueDate: "2023-05-22", completed: false },
    ]
  },
  { 
    id: 2, 
    name: "Data Structures and Algorithms", 
    code: "CS201",
    slug: "data-structures-and-algorithms",
    description: "Explore advanced data structures and algorithm design techniques.",
    recentTopics: ["Arrays and Linked Lists", "Trees and Graphs", "Searching Algorithms"],
    assignments: [
      { name: "Assignment 1: Array Operations", dueDate: "2023-05-18", completed: false },
    ]
  },
]

export default function StudentDashboard() {
  const studentId = "student123"
  const [joinCourseModalOpen, setJoinCourseModalOpen] = useState(false)
  
  return (
    <div className="w-full space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
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
      />
    </div>
  )
} 