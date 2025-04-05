"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, Trash2, Mail, User, BookOpen, Search, ArrowUpDown } from "lucide-react"

// Mock student data - in a real app, this would be fetched from Supabase
const mockStudents = [
  {
    id: "s1",
    name: "Alex Johnson",
    email: "alex.johnson@example.com",
    courses: ["CS101", "CS201"]
  },
  {
    id: "s2",
    name: "Jamie Smith",
    email: "jamie.smith@example.com",
    courses: ["CS101"]
  },
  {
    id: "s3",
    name: "Taylor Williams",
    email: "taylor.williams@example.com",
    courses: ["CS201", "CS301"]
  },
  {
    id: "s4",
    name: "Morgan Brown",
    email: "morgan.brown@example.com",
    courses: ["CS301"]
  },
  {
    id: "s5",
    name: "Riley Davis",
    email: "riley.davis@example.com",
    courses: ["CS101", "CS301"]
  }
]

export default function StudentsPage() {
  const params = useParams()
  const { educatorId } = params
  
  const [students, setStudents] = useState<typeof mockStudents>([])
  const [filteredStudents, setFilteredStudents] = useState<typeof mockStudents>([])
  const [loading, setLoading] = useState(true)
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false)
  const [newStudentEmail, setNewStudentEmail] = useState("")
  const [newStudentName, setNewStudentName] = useState("")
  const [newStudentCourses, setNewStudentCourses] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null)
  
  useEffect(() => {
    // Simulate fetching student data
    setTimeout(() => {
      // In a real app, this would be a fetch from Supabase
      /*
      const fetchStudents = async () => {
        const { data, error } = await supabaseClient
          .from('students')
          .select('*')
          .eq('educator_id', educatorId)
          
        if (data) {
          setStudents(data)
          setFilteredStudents(data)
        }
      }
      fetchStudents()
      */
      
      // Instead, we're using mock data
      setStudents(mockStudents)
      setFilteredStudents(mockStudents)
      setLoading(false)
    }, 500)
  }, [educatorId])
  
  useEffect(() => {
    // Filter students based on search query
    const filtered = students.filter(student => 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.courses.some(course => course.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    setFilteredStudents(filtered)
  }, [searchQuery, students])
  
  const handleAddStudent = () => {
    if (!newStudentEmail || !newStudentName) return
    
    // In a real app, this would be a POST to Supabase
    const newStudent = {
      id: `s${students.length + 1}`,
      name: newStudentName,
      email: newStudentEmail,
      courses: newStudentCourses ? newStudentCourses.split(',').map(course => course.trim()) : []
    }
    
    const updatedStudents = [...students, newStudent]
    setStudents(updatedStudents)
    setFilteredStudents(updatedStudents)
    setNewStudentEmail("")
    setNewStudentName("")
    setNewStudentCourses("")
    setIsAddStudentModalOpen(false)
  }
  
  const handleDeleteStudent = (studentId: string) => {
    // In a real app, this would be a DELETE to Supabase
    const updatedStudents = students.filter(student => student.id !== studentId)
    setStudents(updatedStudents)
    setFilteredStudents(updatedStudents.filter(student => 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.courses.some(course => course.toLowerCase().includes(searchQuery.toLowerCase()))
    ))
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
                    ? student.courses.join(", ")
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
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Enter the student's information to add them to your roster.
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
                placeholder="Student's full name"
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="courses" className="text-right">
                Courses
              </Label>
              <Input
                id="courses"
                value={newStudentCourses}
                onChange={(e) => setNewStudentCourses(e.target.value)}
                className="col-span-3"
                placeholder="Enter course codes separated by commas"
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
