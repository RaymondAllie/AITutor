"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, Trash2, Mail, User, BookOpen, Search, ArrowUpDown, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

// Define interfaces for our data
interface Course {
  id: string
  name: string
  course_code: string
}

interface Student {
  id: string
  name: string
  email: string
  courses: Course[]
}

export default function StudentsPage() {
  const params = useParams()
  const { educatorId } = params
  
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false)
  const [newStudentEmail, setNewStudentEmail] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null)
  
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // 1. Get all courses the educator teaches (from users_courses)
        const { data: educatorCourses, error: coursesError } = await supabase
          .from('users_courses')
          .select('course_id')
          .eq('user_id', educatorId)
          
        if (coursesError) throw coursesError
        
        if (!educatorCourses || educatorCourses.length === 0) {
          setStudents([])
          setFilteredStudents([])
          setLoading(false)
          return
        }
        
        const courseIds = educatorCourses.map(course => course.course_id)
        
        // 2. Get course details for educator's courses
        const { data: coursesData, error: coursesDataError } = await supabase
          .from('courses')
          .select('id, name, course_code')
          .in('id', courseIds)
          
        if (coursesDataError) throw coursesDataError
        
        const courses = coursesData || []
        
        // 3. Get all student IDs enrolled in those courses (from users_courses)
        const { data: studentEnrollments, error: enrollmentsError } = await supabase
          .from('users_courses')
          .select('user_id, course_id')
          .in('course_id', courseIds)
          
        if (enrollmentsError) throw enrollmentsError
        
        if (!studentEnrollments || studentEnrollments.length === 0) {
          setStudents([])
          setFilteredStudents([])
          setLoading(false)
          return
        }
        
        // Get unique student IDs
        const studentIds = [...new Set(studentEnrollments.map(enrollment => enrollment.user_id))]
        
        // Only include students (not other educators)
        const { data: studentUsers, error: usersError } = await supabase
          .from('users')
          .select('id, name, email, role')
          .in('id', studentIds)
          .eq('role', 'student')
          
        if (usersError) throw usersError
        
        // Map student enrollments to courses
        const studentCourseMap: Record<string, string[]> = {}
        
        studentEnrollments.forEach(enrollment => {
          if (!studentCourseMap[enrollment.user_id]) {
            studentCourseMap[enrollment.user_id] = []
          }
          studentCourseMap[enrollment.user_id].push(enrollment.course_id)
        })
        
        // Create final student objects with course information
        const studentData = (studentUsers || []).map(student => {
          const studentCourseIds = studentCourseMap[student.id] || []
          
          // Get course details for each course ID
          const studentCourses = courses.filter(course => 
            studentCourseIds.includes(course.id)
          )
          
          return {
            id: student.id,
            name: student.name,
            email: student.email,
            courses: studentCourses
          }
        })
        
        setStudents(studentData)
        setFilteredStudents(studentData)
      } catch (err: any) {
        console.error("Error fetching students:", err)
        setError(err.message || "Failed to load students")
      } finally {
        setLoading(false)
      }
    }
    
    if (educatorId) {
      fetchStudents()
    }
  }, [educatorId])
  
  useEffect(() => {
    // Filter students based on search query
    const filtered = students.filter(student => 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.courses.some(course => 
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.course_code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    setFilteredStudents(filtered)
  }, [searchQuery, students])
  
  const handleAddStudent = async () => {
    if (!newStudentEmail) return
    
    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('email', newStudentEmail)
        .eq('role', 'student')
        .single()
        
      if (userError) {
        if (userError.code === 'PGRST116') {
          toast.error("No student found with that email address")
        } else {
          throw userError
        }
        return
      }
      
      // Get educator's courses
      const { data: educatorCourses, error: coursesError } = await supabase
        .from('users_courses')
        .select('course_id')
        .eq('user_id', educatorId)
        
      if (coursesError) throw coursesError
      
      if (!educatorCourses || educatorCourses.length === 0) {
        toast.error("You don't have any courses to add students to")
        return
      }
      
      const courseId = educatorCourses[0].course_id // Add to first course by default
      
      // Check if student is already enrolled
      const { data: existingEnrollment, error: enrollmentError } = await supabase
        .from('users_courses')
        .select('*')
        .eq('user_id', userData.id)
        .eq('course_id', courseId)
        
      if (enrollmentError) throw enrollmentError
      
      if (existingEnrollment && existingEnrollment.length > 0) {
        toast.error("This student is already enrolled in your course")
        return
      }
      
      // Add student to course
      const { error: addError } = await supabase
        .from('users_courses')
        .insert([
          { user_id: userData.id, course_id: courseId }
        ])
        
      if (addError) throw addError
      
      toast.success(`${userData.name} has been added to your course`)
      
      // Get course details
      const { data: courseData, error: courseDetailsError } = await supabase
        .from('courses')
        .select('id, name, course_code')
        .eq('id', courseId)
        .single()
        
      if (courseDetailsError) throw courseDetailsError
      
      // Add student to local state
      const newStudent: Student = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        courses: [courseData]
      }
      
      setStudents(prevStudents => [...prevStudents, newStudent])
      setFilteredStudents(prevStudents => [...prevStudents, newStudent])
      setNewStudentEmail("")
      setIsAddStudentModalOpen(false)
    } catch (err: any) {
      console.error("Error adding student:", err)
      toast.error("Failed to add student: " + (err.message || "Unknown error"))
    }
  }
  
  const handleDeleteStudent = async (studentId: string) => {
    try {
      // Get educator's courses
      const { data: educatorCourses, error: coursesError } = await supabase
        .from('users_courses')
        .select('course_id')
        .eq('user_id', educatorId)
        
      if (coursesError) throw coursesError
      
      const courseIds = educatorCourses?.map(course => course.course_id) || []
      
      // Remove student from all educator's courses
      const { error: deleteError } = await supabase
        .from('users_courses')
        .delete()
        .eq('user_id', studentId)
        .in('course_id', courseIds)
        
      if (deleteError) throw deleteError
      
      // Update local state
      setStudents(prevStudents => prevStudents.filter(student => student.id !== studentId))
      setFilteredStudents(prevStudents => prevStudents.filter(student => student.id !== studentId))
      
      toast.success("Student has been removed from your courses")
    } catch (err: any) {
      console.error("Error removing student:", err)
      toast.error("Failed to remove student: " + (err.message || "Unknown error"))
    }
  }
  
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
    
    const sortedStudents = [...filteredStudents].sort((a, b) => {
      if (key === 'name') {
        return direction === 'ascending' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      if (key === 'email') {
        return direction === 'ascending'
          ? a.email.localeCompare(b.email)
          : b.email.localeCompare(a.email);
      }
      
      if (key === 'courses') {
        return direction === 'ascending'
          ? a.courses.length - b.courses.length
          : b.courses.length - a.courses.length;
      }
      
      return 0;
    });
    
    setFilteredStudents(sortedStudents);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error Loading Students</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }
  
  return (
    <div className="w-full space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">
            Manage your students and their course enrollments.
          </p>
        </div>
        <Button onClick={() => setIsAddStudentModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Student
        </Button>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          placeholder="Search students by name, email, or course..."
          className="pl-10 mb-6"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <Card>
        <CardHeader className="bg-muted/50 p-4">
          <div className="grid grid-cols-4 gap-4 font-semibold">
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => requestSort('name')}
            >
              Name
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => requestSort('email')}
            >
              Email
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => requestSort('courses')}
            >
              Courses
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
            <div className="text-right">Actions</div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredStudents.map((student) => (
            <div 
              key={student.id} 
              className="grid grid-cols-4 gap-4 p-4 border-b last:border-0 items-center hover:bg-muted/50"
            >
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <span>{student.name}</span>
              </div>
              
              <div className="flex items-center text-sm">
                <Mail className="mr-2 h-4 w-4 text-gray-500" />
                {student.email}
              </div>
              
              <div className="flex items-center">
                <BookOpen className="mr-2 h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  {student.courses.length > 0 
                    ? student.courses.map(c => c.course_code).join(", ")
                    : 'No courses'}
                </span>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDeleteStudent(student.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {filteredStudents.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No students found matching your search criteria.
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add Student Modal */}
      <Dialog open={isAddStudentModalOpen} onOpenChange={setIsAddStudentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Student to Your Course</DialogTitle>
            <DialogDescription>
              Enter the student's email address to add them to your course. They must already have a student account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={newStudentEmail}
                onChange={(e) => setNewStudentEmail(e.target.value)}
                className="col-span-3"
                placeholder="student@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStudentModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStudent}>Add Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
