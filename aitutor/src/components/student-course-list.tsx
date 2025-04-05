"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, FileText, Clock, ExternalLink } from "lucide-react"

// Mock data for courses - this would come from an API in a real application
const courses = [
  { 
    id: 1, 
    name: "Introduction to Computer Science", 
    code: "CS101",
    description: "Learn the fundamentals of computer science and programming.",
    assignments: 8,
    nextDue: "2 days",
    progress: 35,
    color: "text-blue-600" 
  },
  { 
    id: 2, 
    name: "Data Structures and Algorithms", 
    code: "CS201",
    description: "Advanced data structures and algorithm analysis.",
    assignments: 6,
    nextDue: "5 days",
    progress: 22,
    color: "text-green-600" 
  },
  { 
    id: 3, 
    name: "Web Development", 
    code: "CS301",
    description: "Building modern web applications with current technologies.",
    assignments: 10,
    nextDue: "1 day",
    progress: 48,
    color: "text-purple-600" 
  },
  { 
    id: 4, 
    name: "Machine Learning", 
    code: "CS401",
    description: "Introduction to machine learning concepts and applications.",
    assignments: 5,
    nextDue: "1 week",
    progress: 15,
    color: "text-red-600" 
  },
]

interface StudentCourseListProps {
  studentId: string;
}

export function StudentCourseList({ studentId }: StudentCourseListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => {
        const courseSlug = course.name.toLowerCase().replace(/\s+/g, '-')
        
        return (
          <Link 
            key={course.id} 
            href={`/student/${studentId}/${courseSlug}`}
            className="block h-full transition-transform hover:scale-[1.02]"
          >
            <Card className="h-full overflow-hidden border border-gray-200 shadow-sm hover:shadow">
              <CardHeader className="">
                <CardTitle className={`text-xl font-bold ${course.color}`}>{course.name}</CardTitle>
                <CardDescription>{course.code}</CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">                
                <div className="grid grid-cols-12 gap-2 text-sm">
                  <div className="col-span-5 flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-gray-400" />
                    <span className="truncate">{course.assignments} Assignments</span>
                  </div>
                  <div className="col-span-5 flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-gray-400" />
                    <span className="truncate">Next due: {course.nextDue}</span>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button variant="ghost" size="icon">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="w-full bg-secondary h-1.5 rounded-full">
                    <div 
                      className="bg-primary h-1.5 rounded-full" 
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
} 