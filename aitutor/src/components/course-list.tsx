"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, FileText, ExternalLink } from "lucide-react"

// Mock data for courses
const courses = [
  { 
    id: 1, 
    name: "Introduction to Computer Science", 
    code: "CS101",
    description: "Learn the fundamentals of computer science and programming.",
    students: 32,
    assignments: 8,
    color: "text-blue-600" 
  },
  { 
    id: 2, 
    name: "Data Structures and Algorithms", 
    code: "CS201",
    description: "Advanced data structures and algorithm analysis.",
    students: 24,
    assignments: 6,
    color: "text-green-600" 
  },
  { 
    id: 3, 
    name: "Web Development", 
    code: "CS301",
    description: "Building modern web applications with current technologies.",
    students: 28,
    assignments: 10,
    color: "text-purple-600" 
  },
  { 
    id: 4, 
    name: "Machine Learning", 
    code: "CS401",
    description: "Introduction to machine learning concepts and applications.",
    students: 22,
    assignments: 5,
    color: "text-red-600" 
  },
]

interface CourseListProps {
  person_id: string;
  role: 'student' | 'educator';
}

export function CourseList({ person_id, role }: CourseListProps) {
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => {
        const courseSlug = course.name.toLowerCase().replace(/\s+/g, '-')
        
        return (
          <Link 
            key={course.id} 
            href={`/${role}/${person_id}/${courseSlug}`}
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
                    <Users className="mr-2 h-4 w-4 text-gray-400" />
                    <span className="truncate">{course.students} Students</span>
                  </div>
                  <div className="col-span-5 flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-gray-400" />
                    <span className="truncate">{course.assignments} Assignments</span>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button variant="ghost" size="icon">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
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
