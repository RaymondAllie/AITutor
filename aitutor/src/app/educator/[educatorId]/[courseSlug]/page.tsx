"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Book, 
  Calendar, 
  Copy,
  Users
} from "lucide-react"
import { toast } from "sonner"

// Import components and types
import { MaterialsTab } from "./components/MaterialsTab"
import { AssignmentsTab } from "./components/AssignmentsTab"
import { PeopleTab } from "./components/PeopleTab"
import { ProblemsDialog } from "./components/ProblemsDialog"
import { Course, Assignment } from "./types"
import { useCourseHelpers } from "./hooks/useCourseHelpers"
import { fetchCourseData } from "./utils/courseDataHelpers"

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default function CoursePage() {
  const params = useParams()
  const { educatorId, courseSlug } = params
  
  // State for the course data
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State for problems dialog
  const [problemsDialogOpen, setProblemsDialogOpen] = useState(false)
  const [currentAssignmentForProblems, setCurrentAssignmentForProblems] = useState<Assignment | null>(null)
  
  // State for insights panel
  const [showInsightsPanel, setShowInsightsPanel] = useState(false)
  const [currentAssignmentForInsights, setCurrentAssignmentForInsights] = useState<Assignment | null>(null)
  
  // Use the custom hook for course helpers
  const { openProblemsDialog, openInsightsPanel } = useCourseHelpers({
    course,
    setProblemsDialogOpen,
    setCurrentAssignmentForProblems
  });
  
  useEffect(() => {
    async function loadCourseData() {
      if (!courseSlug) return;
      
      setLoading(true);
      const { course: courseData, error: courseError } = await fetchCourseData(
        courseSlug as string,
        educatorId as string
      );
      
      setCourse(courseData);
      setError(courseError);
      setLoading(false);
    }
    
    loadCourseData();
  }, [educatorId, courseSlug]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
        <p className="text-gray-500 mb-6">
          {error || "The course you're looking for doesn't exist or you don't have permission to view it."}
        </p>
        <Button asChild>
          <a href="/educator">Go Back to Dashboard</a>
        </Button>
      </div>
    )
  }
  
  return (
    <div className="w-full space-y-8">
      {/* Course Header */}
      <div className="border-b pb-6">
        <h1 className="text-4xl font-bold tracking-tight">{course.name}</h1>
        <div className="flex items-center space-x-2 mt-2 text-gray-600">
          <span className="font-medium">{course.course_code}</span>
          <span>•</span>
          <div 
            className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-md cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={() => {
              navigator.clipboard.writeText(course.join_code);
              toast.success("Join code copied to clipboard");
            }}
          >
            <span>{course.join_code}</span>
            <Copy className="h-3.5 w-3.5 text-gray-500" />
          </div>
        </div>
        <p className="mt-4 text-gray-700">
          {course.description}
        </p>
      </div>
      
      {/* Tabs for different sections */}
      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Assignments</span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <Book className="h-4 w-4" />
            <span>Materials</span>
          </TabsTrigger>
          <TabsTrigger value="people" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>People</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="assignments" className="space-y-4">
          <AssignmentsTab 
            course={course} 
            setCourse={setCourse} 
            openProblemsDialog={openProblemsDialog}
            openInsightsPanel={openInsightsPanel}
          />
        </TabsContent>
        
        <TabsContent value="materials" className="space-y-4">
          <MaterialsTab 
            course={course} 
            setCourse={setCourse}
            supabaseAnonKey={supabaseAnonKey}
          />
        </TabsContent>
        
        <TabsContent value="people" className="space-y-4">
          <PeopleTab 
            course={course}
            educatorId={educatorId as string}
          />
        </TabsContent>
      </Tabs>
      
      {/* Problems Dialog */}
      <ProblemsDialog 
        course={course}
        setCourse={setCourse}
        open={problemsDialogOpen}
        onOpenChange={setProblemsDialogOpen}
        currentAssignment={currentAssignmentForProblems}
        supabaseAnonKey={supabaseAnonKey}
      />
    </div>
  )
} 