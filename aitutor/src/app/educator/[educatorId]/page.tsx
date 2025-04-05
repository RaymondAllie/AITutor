"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle, Calendar, FileText, Users, Layers } from "lucide-react"
import { CourseList } from "@/components/course-list"
import { AddCourseModal } from "@/components/add-course-modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Educator() {
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false)


  return (
    <div className="w-full space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Educator Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your courses, assignments, and student progress.
          </p>
        </div>
        <Button onClick={() => setIsAddCourseModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Course
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
          <CourseList />
        </TabsContent>
        
        <TabsContent value="active">
          <div className="rounded-md border border-dashed p-12 text-center">
            <h3 className="text-lg font-medium">Active Courses Tab Content</h3>
            <p className="text-sm text-muted-foreground mt-2">
              This tab would show only active courses.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="archived">
          <div className="rounded-md border border-dashed p-12 text-center">
            <h3 className="text-lg font-medium">Archived Courses Tab Content</h3>
            <p className="text-sm text-muted-foreground mt-2">
              This tab would show archived courses.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <AddCourseModal isOpen={isAddCourseModalOpen} onClose={() => setIsAddCourseModalOpen(false)} />
    </div>
  )
}

