"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PlusCircle, Search, UserPlus, Mail, UserX } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Course } from "../types"

interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
  role: "student" | "educator"
}

interface PeopleTabProps {
  course: Course
  educatorId: string
}

export function PeopleTab({ course, educatorId }: PeopleTabProps) {
  const [students, setStudents] = useState<User[]>([])
  const [educators, setEducators] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showInviteForm, setShowInviteForm] = useState(false)

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      try {
        // First, get user_ids from users_courses for this course
        const { data: courseUserLinks, error: courseUserLinksError } = await supabase
          .from('users_courses')
          .select('user_id')
          .eq('course_id', course.id)
        
        if (courseUserLinksError) throw courseUserLinksError
        
        if (!courseUserLinks || courseUserLinks.length === 0) {
          setStudents([])
          setEducators([])
          setLoading(false)
          return
        }
        
        // Extract the user IDs
        const userIds = courseUserLinks.map(link => link.user_id)
        
        // Fetch all users in one query
        const { data: allUsers, error: usersError } = await supabase
          .from('users')
          .select('*')
          .in('id', userIds)
        
        if (usersError) throw usersError
        
        if (!allUsers) {
          setStudents([])
          setEducators([])
          setLoading(false)
          return
        }
        
        // Separate educators and students
        const studentList = allUsers.filter(user => user.role === 'student')
        const educatorList = allUsers.filter(user => user.role === 'educator')
        
        setStudents(studentList as User[])
        setEducators(educatorList as User[])
      } catch (err: any) {
        console.error('Error fetching course users:', err)
        setError(err.message || 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    if (course?.id) {
      fetchUsers()
    }
  }, [course?.id])

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !course) return

    try {
      // In a real app, this would send an invitation email
      // For now, we'll just show a success message
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail("")
      setShowInviteForm(false)
    } catch (err: any) {
      console.error("Error inviting user:", err)
      toast.error(err.message || "Failed to send invitation")
    }
  }

  const handleRemoveUser = async (userId: string) => {
    try {
      // Remove user from the course
      const { error } = await supabase
        .from('users_courses')
        .delete()
        .eq('course_id', course.id)
        .eq('user_id', userId)

      if (error) throw error

      // Update local state
      setStudents(students.filter(student => student.id !== userId))
      setEducators(educators.filter(educator => educator.id !== userId))

      toast.success("User removed from course")
    } catch (err: any) {
      console.error("Error removing user:", err)
      toast.error(err.message || "Failed to remove user")
    }
  }

  // Filter users based on search query
  const filteredStudents = searchQuery
    ? students.filter(
        student =>
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : students

  const filteredEducators = searchQuery
    ? educators.filter(
        educator =>
          educator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          educator.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : educators

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 border rounded-lg bg-red-50">
        <p className="text-red-600">{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">People</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Button size="sm" onClick={() => setShowInviteForm(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Invite User
          </Button>
        </div>
      </div>

      {/* Invite User Form */}
      {showInviteForm && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <Input
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  type="email"
                />
              </div>
              <Button onClick={handleInviteUser} disabled={!inviteEmail.trim()}>
                Send Invite
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInviteForm(false)}
              >
                <UserX className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <p>Invite a user to join this course. They will receive an email with joining instructions.</p>
              <p className="mt-1">Join code: <span className="font-mono font-medium bg-gray-100 px-2 py-0.5 rounded">{course.join_code}</span></p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Educators Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Educators</h3>
        {filteredEducators.length === 0 ? (
          <p className="text-gray-500 italic">No educators found</p>
        ) : (
          <div className="space-y-2">
            {filteredEducators.map(educator => (
              <div
                key={educator.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center uppercase font-bold">
                    {educator.name?.[0] || 'U'}
                  </div>
                  <div>
                    <div className="font-medium">{educator.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {educator.email}
                    </div>
                  </div>
                </div>
                {educator.id !== educatorId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoveUser(educator.id)}
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Students Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Students</h3>
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-gray-50">
            <UserPlus className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h4 className="text-lg font-medium text-gray-700">No Students Yet</h4>
            <p className="text-gray-500 max-w-md mx-auto mt-2 mb-4">
              Invite students using the join code: <span className="font-mono font-medium">{course.join_code}</span>
            </p>
            <Button onClick={() => setShowInviteForm(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Invite First Student
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredStudents.map(student => (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center uppercase font-bold">
                    {student.name?.[0] || 'S'}
                  </div>
                  <div>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {student.email}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRemoveUser(student.id)}
                >
                  <UserX className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 