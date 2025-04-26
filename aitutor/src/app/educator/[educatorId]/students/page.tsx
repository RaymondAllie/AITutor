"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, Trash2, Mail, User, BookOpen, Search, ArrowUpDown, AlertTriangle, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

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
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentEmail, setNewStudentEmail] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null)
  const [educatorCourses, setEducatorCourses] = useState<Course[]>([])
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const [isAddingStudent, setIsAddingStudent] = useState(false)
  
  useEffect(() => {
    fetchStudents()
  }, [])
  
  useEffect(() => {
    if (searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase()
      const filtered = students.filter(student => 
        student.name.toLowerCase().includes(lowercaseQuery) || 
        student.email.toLowerCase().includes(lowercaseQuery) ||
        student.courses.some(course => 
          course.name.toLowerCase().includes(lowercaseQuery) ||
          course.course_code.toLowerCase().includes(lowercaseQuery)
        )
      )
      setFilteredStudents(filtered)
    } else {
      setFilteredStudents(students)
    }
  }, [searchQuery, students])
  
  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 1. Get all courses taught by this educator
      const { data: educatorCoursesData, error: coursesError } = await supabase
        .from('users_courses')
        .select('course_id')
        .eq('user_id', educatorId)
        
      if (coursesError) throw coursesError
      
      if (!educatorCoursesData || educatorCoursesData.length === 0) {
        setStudents([])
        setFilteredStudents([])
        setLoading(false)
        return
      }
      
      const courseIds = educatorCoursesData.map(course => course.course_id)
      
      // 2. Get course details for these courses
      const { data: coursesData, error: courseDetailsError } = await supabase
        .from('courses')
        .select('id, name, course_code')
        .in('id', courseIds)
        
      if (courseDetailsError) throw courseDetailsError
      
      setEducatorCourses(coursesData || [])
      
      // 3. Get all student IDs enrolled in these courses
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('users_courses')
        .select('user_id, course_id')
        .in('course_id', courseIds)
        .neq('user_id', educatorId) // Exclude the educator
        
      if (enrollmentsError) throw enrollmentsError
      
      if (!enrollments || enrollments.length === 0) {
        setStudents([])
        setFilteredStudents([])
        setLoading(false)
        return
      }
      
      // Get unique student IDs
      const studentIds = [...new Set(enrollments.map(e => e.user_id))]
      
      // 4. Get student details
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', studentIds)
        .eq('role', 'student')
        
      if (studentsError) throw studentsError
      
      // Map courses to students
      const studentsWithCourses = studentsData?.map(student => {
        const studentCourses = enrollments
          .filter(e => e.user_id === student.id)
          .map(e => coursesData?.find(c => c.id === e.course_id))
          .filter(Boolean) as Course[]
          
        return {
          ...student,
          courses: studentCourses || []
        }
      }) || []
      
      setStudents(studentsWithCourses)
      setFilteredStudents(studentsWithCourses)
    } catch (err: any) {
      console.error("Error fetching students:", err)
      setError(err.message || "Failed to load students")
    } finally {
      setLoading(false)
    }
  }
  
  const handleAddStudent = async () => {
    if (!newStudentEmail.trim()) {
      toast.error("Please enter a valid email address")
      return
    }
    
    if (!newStudentName.trim()) {
      toast.error("Please enter the student's name")
      return
    }
    
    if (selectedCourseIds.length === 0) {
      toast.error("Please select at least one course")
      return
    }
    
    try {
      setIsAddingStudent(true)
      
      // Check if user already exists
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', newStudentEmail.trim().toLowerCase())
        .single()
        
      if (userCheckError && userCheckError.code !== 'PGRST116') { // Not found is expected
        throw userCheckError
      }
      
      let userId = existingUser?.id
      
      // If user exists but is not a student
      if (existingUser && existingUser.role !== 'student') {
        toast.error("This email is registered but not as a student")
        return
      }
      
      // Create user if doesn't exist
      if (!existingUser) {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: newStudentEmail.trim().toLowerCase(),
            name: newStudentName.trim(),
            role: 'student'
          })
          .select('id')
          .single()
          
        if (createError) throw createError
        userId = newUser.id
      }
      
      // Enroll student in selected courses
      const enrollments = selectedCourseIds.map(courseId => ({
        user_id: userId,
        course_id: courseId
      }))
      
      const { error: enrollError } = await supabase
        .from('users_courses')
        .upsert(enrollments)
        
      if (enrollError) throw enrollError
      
      // Fetch the updated student list
      await fetchStudents()
      
      // Reset form
      setNewStudentEmail('')
      setNewStudentName('')
      setSelectedCourseIds([])
      setIsAddStudentModalOpen(false)
      
      toast.success("Student added successfully")
    } catch (err: any) {
      console.error("Error adding student:", err)
      toast.error("Failed to add student: " + (err.message || "Unknown error"))
    } finally {
      setIsAddingStudent(false)
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Student to Your Courses</DialogTitle>
            <DialogDescription>
              Enter the student's information and select which courses to enroll them in.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                className="col-span-3"
                placeholder="John Doe"
              />
            </div>
            
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
            
            <div className="grid grid-cols-4 items-start gap-4 pt-4">
              <Label className="text-right pt-2">
                Courses
              </Label>
              <div className="col-span-3 flex flex-col gap-3">
                {educatorCourses.length > 0 ? (
                  educatorCourses.map((course) => (
                    <div key={course.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`course-${course.id}`}
                        checked={selectedCourseIds.includes(course.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCourseIds([...selectedCourseIds, course.id])
                          } else {
                            setSelectedCourseIds(selectedCourseIds.filter(id => id !== course.id))
                          }
                        }}
                      />
                      <Label htmlFor={`course-${course.id}`}>
                        {course.course_code}: {course.name}
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">You have no courses available.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddStudentModalOpen(false)
                setNewStudentEmail('')
                setNewStudentName('')
                setSelectedCourseIds([])
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddStudent} 
              disabled={isAddingStudent || !newStudentEmail || !newStudentName || selectedCourseIds.length === 0}
            >
              {isAddingStudent ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Adding...
                </>
              ) : (
                'Add Student'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
