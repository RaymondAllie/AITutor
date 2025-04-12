"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Book, 
  FileText, 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send,
  MessageCircle,
  List,
  ArrowRight,
  Download,
  MoveRight,
  RefreshCw,
  HelpCircle,
  CheckCircle
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"

// Message types for chat
type MessageRole = 'user' | 'assistant' | 'system';
interface Message {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

interface Question {
  id: string;
  question: string;
  hint?: string;
  assignment_id: string;
  completed?: boolean;
}

interface Material {
  id: string;
  name: string;
  type: string;
  url?: string;
}

interface Assignment {
  id: string;
  name: string;
  slug?: string;
  courseName?: string;
  courseSlug?: string;
  due_date: string;
  description: string;
  materials: Material[];
  questions: Question[];
  nextAssignment?: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function AssignmentPage() {
  const params = useParams();
  const { studentId, courseSlug, assignmentSlug } = params;
  
  // State for the assignment data
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [completedQuestions, setCompletedQuestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentQuestion = assignment?.questions?.[currentQuestionIndex];
  const progress = assignment ? (completedQuestions.length / assignment.questions.length) * 100 : 0;
  const allQuestionsCompleted = assignment ? completedQuestions.length === assignment.questions.length : false;
  
  // Load assignment data
  useEffect(() => {
    const fetchAssignmentData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Format assignmentSlug by replacing dashes with spaces
        const formattedAssignmentSlug = assignmentSlug ? (assignmentSlug as string).replace(/-/g, ' ') : '';
        const formattedCourseSlug = courseSlug ? (courseSlug as string).replace(/-/g, ' ') : '';
        
        console.log(`Fetching data for course: ${formattedCourseSlug}, assignment: ${formattedAssignmentSlug}`);
        
        // 1. Fetch the course
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, name, course_code')
          .eq('course_code', formattedCourseSlug)
          .single();
          
        if (courseError) {
          console.error("Error fetching course:", courseError);
          throw new Error(`Course not found: ${courseError.message}`);
        }
        if (!courseData) throw new Error("Course not found");
        
        console.log("Found course:", courseData);
        
        // 2. First get assignments for this course via join table
        const { data: courseAssignmentLinks, error: courseAssignmentLinksError } = await supabase
          .from('courses_assignments')
          .select('assignment_id')
          .eq('course_id', courseData.id);
        
        if (courseAssignmentLinksError) {
          console.error("Error fetching course assignments:", courseAssignmentLinksError);
          throw new Error(`Course assignments not found: ${courseAssignmentLinksError.message}`);
        }
        
        if (!courseAssignmentLinks || courseAssignmentLinks.length === 0) {
          throw new Error("No assignments found for this course");
        }
        
        // Get the assignment IDs from the join table
        const assignmentIds = courseAssignmentLinks.map(ca => ca.assignment_id);
        
        // 3. Fetch the assignment by name but only from the ones that belong to this course
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('assignments')
          .select('*')
          .ilike('name', formattedAssignmentSlug)
          .in('id', assignmentIds)
          .single();
          
        if (assignmentError) {
          console.error("Error fetching assignment:", assignmentError);
          throw new Error(`Assignment not found in this course: ${assignmentError.message}`);
        }
        if (!assignmentData) throw new Error("Assignment not found in this course");
        
        console.log("Found assignment:", assignmentData);
        
        // 4. Fetch materials for this assignment
        let materials: Material[] = [];
        if (assignmentData.material_ids && assignmentData.material_ids.length > 0) {
          const { data: materialsData, error: materialsError } = await supabase
            .from('materials')
            .select('*')
            .in('id', assignmentData.material_ids);
            
          if (!materialsError && materialsData) {
            materials = materialsData;
          }
        }
        
        // 5. Fetch questions for this assignment
        // First get the question IDs from the join table
        const { data: assignmentProblemsData, error: assignmentProblemsError } = await supabase
          .from('assignments_problems')
          .select('problem_id')
          .eq('assignment_id', assignmentData.id);
          
        if (assignmentProblemsError) throw assignmentProblemsError;
        
        let questions: Question[] = [];
        if (assignmentProblemsData && assignmentProblemsData.length > 0) {
          const problemIds = assignmentProblemsData.map(row => row.problem_id);
          
          // Then fetch the actual questions
          const { data: problemsData, error: problemsError } = await supabase
            .from('problems')
            .select('*')
            .in('id', problemIds);
            
          if (problemsError) throw problemsError;
          
          // 6. Get student's progress for these questions
          const { data: progressData, error: progressError } = await supabase
            .from('student_progress')
            .select('*')
            .eq('assignment_id', assignmentData.id)
            .eq('student_id', studentId);
          
          // Map questions with completed status
          questions = (problemsData || []).map(problem => {
            const isCompleted = progressData?.some(
              progress => progress.problem_id === problem.id && progress.completed
            ) || false;
            
            return {
              id: problem.id,
              question: problem.question,
              hint: problem.hint || "No hint available for this question.",
              assignment_id: assignmentData.id,
              completed: isCompleted
            };
          });
          
          // Initialize completedQuestions array from progress data
          const completed = questions
            .filter(q => q.completed)
            .map(q => q.id);
          
          setCompletedQuestions(completed);
        }
        
        // 7. Check if there's a next assignment in this course
        let nextAssignment = undefined;
        
        const { data: assignmentOrder, error: assignmentOrderError } = await supabase
          .from('courses_assignments')
          .select('assignment_id')
          .eq('course_id', courseData.id)
          .order('created_at', { ascending: true });
        
        if (!assignmentOrderError && assignmentOrder) {
          const orderedAssignmentIds = assignmentOrder.map(ca => ca.assignment_id);
          const currentIndex = orderedAssignmentIds.indexOf(assignmentData.id);
          
          if (currentIndex >= 0 && currentIndex < orderedAssignmentIds.length - 1) {
            const nextAssignmentId = orderedAssignmentIds[currentIndex + 1];
            
            const { data: nextAssignmentData } = await supabase
              .from('assignments')
              .select('id, name')
              .eq('id', nextAssignmentId)
              .single();
              
            if (nextAssignmentData) {
              nextAssignment = {
                id: nextAssignmentData.id,
                name: nextAssignmentData.name,
                slug: nextAssignmentData.name.replace(/ /g, '-').toLowerCase()
              };
            }
          }
        }
        
        // 8. Create the full assignment object
        const fullAssignment: Assignment = {
          ...assignmentData,
          slug: assignmentData.name.replace(/ /g, '-').toLowerCase(),
          courseName: courseData.name,
          courseSlug: courseSlug as string,
          materials: materials,
          questions: questions,
          nextAssignment: nextAssignment
        };
        
        console.log("Created full assignment object:", fullAssignment);
        
        setAssignment(fullAssignment);
        
        // Add initial system message
        if (questions.length > 0) {
          const initialMessage: Message = {
            role: 'system',
            content: `Welcome to the ${fullAssignment.name} assignment. Let's start with the first question: "${questions[0].question}"`,
            timestamp: new Date()
          };
          setMessages([initialMessage]);
        } else {
          const initialMessage: Message = {
            role: 'system',
            content: `Welcome to the ${fullAssignment.name} assignment. This assignment doesn't have any questions yet.`,
            timestamp: new Date()
          };
          setMessages([initialMessage]);
        }
        
      } catch (err: any) {
        console.error("Error fetching assignment data:", err);
        setError(err.message || "Failed to load assignment data");
      } finally {
        setLoading(false);
      }
    };
    
    if (studentId && courseSlug && assignmentSlug) {
      fetchAssignmentData();
    } else {
      setError("Missing parameters to load the assignment");
      setLoading(false);
    }
  }, [studentId, courseSlug, assignmentSlug]);
  
  // Scroll to bottom of chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Check if all questions are completed
  useEffect(() => {
    if (allQuestionsCompleted && !showCompletionDialog) {
      setShowCompletionDialog(true);
    }
  }, [completedQuestions, allQuestionsCompleted, showCompletionDialog]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Error Loading Assignment</h1>
        <p className="text-gray-500 mb-6">
          {error}
        </p>
        <Button asChild>
          <a href={`/student/${studentId}/${courseSlug}`}>Go Back to Course</a>
        </Button>
      </div>
    );
  }
  
  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Assignment Not Found</h1>
        <p className="text-gray-500 mb-6">
          The assignment you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button asChild>
          <a href={`/student/${studentId}/${courseSlug}`}>Go Back to Course</a>
        </Button>
      </div>
    );
  }
  
  // Navigate to previous question
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0 && assignment) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      
      // Add system message for the new question
      const newMessage: Message = {
        role: 'system',
        content: `Let's go back to question ${currentQuestionIndex}: "${assignment.questions[currentQuestionIndex - 1].question}"`,
        timestamp: new Date()
      };
      setMessages([...messages, newMessage]);
    }
  };
  
  // Navigate to next question
  const goToNextQuestion = () => {
    if (assignment && currentQuestionIndex < assignment.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      
      // Add system message for the new question
      const newMessage: Message = {
        role: 'system',
        content: `Let's move on to question ${currentQuestionIndex + 2}: "${assignment.questions[currentQuestionIndex + 1].question}"`,
        timestamp: new Date()
      };
      setMessages([...messages, newMessage]);
    }
  };
  
  // Mark current question as completed
  const markAsCompleted = async () => {
    // TODO ADD EDGE FUNCTION & DB TO SAVE PROGRESS
    if (!assignment || !currentQuestion || completedQuestions.includes(currentQuestion.id)) return;
    
    // Temporarily keeping this local without saving to database
    console.log("Would save progress to database:", {
      student_id: studentId as string,
      assignment_id: assignment.id,
      problem_id: currentQuestion.id,
      completed: true
    });
    
    // Just update local state for now
    setCompletedQuestions(prev => [...prev, currentQuestion.id]);
    
    // Add a message to indicate completion
    const completionMessage: Message = {
      role: 'system',
      content: `You've marked question ${currentQuestionIndex + 1} as completed.`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, completionMessage]);
    
    // If there are more questions, move to the next one
    if (currentQuestionIndex < assignment.questions.length - 1) {
      goToNextQuestion();
    } else {
      // Check if all questions are now completed
      const allCompleted = assignment.questions.every(q => 
        completedQuestions.includes(q.id) || q.id === currentQuestion.id
      );
      
      if (allCompleted) {
        setShowCompletionDialog(true);
      }
    }
  };
  
  // Show hint for current question
  const showHint = () => {
    if (!currentQuestion || !currentQuestion.hint) return;
    
    const hintMessage: Message = {
      role: 'assistant',
      content: `Hint: ${currentQuestion.hint}`,
      timestamp: new Date()
    };
    setMessages([...messages, hintMessage]);
  };
  
  // Handle sending a chat message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    
    // Simple mock AI response logic
    // In a real app, this would call your backend API
    const mockResponse = () => {
      const responseContent = generateMockResponse(inputMessage, currentQuestion);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    // Simulate AI response with delay
    setTimeout(mockResponse, 1000);
  };
  
  // Generate a mock AI response based on the user's message and current question
  const generateMockResponse = (userMessage: string, question: typeof currentQuestion) => {
    if (!question) return "I'm not sure about that. Can you try asking something related to the current question?";
    
    const userMessageLower = userMessage.toLowerCase();
    
    // Simple keyword matching for mock responses
    if (question.question.toLowerCase().includes('hello world')) {
      if (userMessageLower.includes('test') || userMessageLower.includes('verify')) {
        return "Great point! 'Hello World' programs are indeed used to verify that the programming environment is set up correctly. It serves as a simple test to make sure you can write, compile, and run code successfully.";
      } else if (userMessageLower.includes('first') || userMessageLower.includes('begin')) {
        return "'Hello World' programs are traditional first programs because they're simple and focus just on producing output - a perfect starting point for learning.";
      } else if (userMessageLower.includes('print') || userMessageLower.includes('console')) {
        return "That looks like a good start! The key elements of a 'Hello World' program are the print or output statement and the string 'Hello, World!' to be displayed. Would you like to see examples in different languages?";
      } else {
        return "The 'Hello World' program serves as a simple test to verify that your programming environment is set up correctly. It's a way to confirm that you can write, compile (if needed), and execute code in a new language or environment.";
      }
    } else {
      return "Good thinking. Do you have any specific questions about this assignment that I can help with?";
    }
  };
  
  // Get material type icon
  const getMaterialIcon = (type: string) => {
    switch(type) {
      case 'textbook': return <Book className="h-5 w-5" />;
      case 'slides': return <FileText className="h-5 w-5" />;
      case 'pset': return <FileText className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };
  
  // Navigate to next assignment
  const goToNextAssignment = () => {
    if (assignment?.nextAssignment) {
      window.location.href = `/student/${studentId}/${courseSlug}/${assignment.nextAssignment.slug}`;
    } else {
      window.location.href = `/student/${studentId}/${courseSlug}`;
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* Assignment Header */}
      <div>
        <div className="flex items-center mb-2">
          <Button variant="ghost" className="p-0 mr-2" asChild>
            <a href={`/student/${studentId}/${courseSlug}`}><ChevronLeft className="h-5 w-5" /></a>
          </Button>
          <h1 className="text-3xl font-bold">{assignment.name}</h1>
        </div>
        <div className="text-gray-600 mb-3">
          {assignment.courseName} • Due: {new Date(assignment.due_date).toLocaleDateString()}
        </div>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1 text-sm">
            <span>Progress</span>
            <span>{completedQuestions.length} of {assignment.questions.length} questions completed</span>
          </div>
          <Progress 
            value={progress} 
            className={`h-2 ${allQuestionsCompleted ? 'bg-green-100' : ''}`}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Chat UI */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2 text-primary" />
                  <CardTitle className="text-lg">AI Tutor</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={showHint}>
                    <HelpCircle className="h-4 w-4 mr-1" /> Hint
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => markAsCompleted()}
                    disabled={!currentQuestion || completedQuestions.includes(currentQuestion.id)}
                  >
                    Mark Complete
                  </Button>
                </div>
              </div>
              <CardDescription>
                {currentQuestion ? (
                  <>Question {currentQuestionIndex + 1} of {assignment.questions.length}: {currentQuestion.question}</>
                ) : (
                  <>No question selected</>
                )}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-0">
              {/* Chat Messages */}
              <div className="h-[50vh] overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div key={index} className={`flex ${message.role !== 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`flex max-w-[80%] ${message.role !== 'user' ? 'items-start' : 'items-end'}`}>
                        {message.role !== 'user' && (
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src="/avatars/ai-tutor.png" alt="AI" />
                            <AvatarFallback>AI</AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div 
                          className={`rounded-lg px-3 py-2 ${
                            message.role === 'user' 
                              ? 'bg-primary text-primary-foreground ml-2' 
                              : message.role === 'system'
                                ? 'bg-secondary text-secondary-foreground'
                                : 'bg-muted border border-border'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          <div className="text-xs opacity-70 mt-1 text-right">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
              
              {/* Message Input */}
              <div className="border-t p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask about this question..."
                    className="flex-1"
                  />
                  <Button type="submit">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
          
          {/* Question Navigation */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button 
              variant="outline" 
              onClick={goToNextQuestion}
              disabled={currentQuestionIndex === assignment.questions.length - 1}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
        
        {/* Right Column - Resources and Navigation */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* All Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Questions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {assignment.questions.map((question, index) => (
                  <div 
                    key={question.id} 
                    className={`px-4 py-3 flex items-center hover:bg-muted transition-colors cursor-pointer ${
                      index === currentQuestionIndex ? 'bg-muted' : ''
                    }`}
                    onClick={() => setCurrentQuestionIndex(index)}
                  >
                    <div className="w-7 h-7 rounded-full bg-secondary text-foreground flex items-center justify-center mr-3 text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 text-sm">{question.question.length > 60 ? `${question.question.substring(0, 60)}...` : question.question}</div>
                    {completedQuestions.includes(question.id) && (
                      <Badge variant="outline" className="ml-2 bg-green-50 text-green-600 border-green-200">
                        Completed
                      </Badge>
                    )}
                  </div>
                ))}
                
                {assignment.questions.length === 0 && (
                  <div className="px-4 py-6 text-center text-gray-500">
                    No questions available for this assignment.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Assignment Completion Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Assignment Completed!
            </DialogTitle>
            <DialogDescription>
              Congratulations! You've completed all questions in this assignment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="mb-4">
              You've successfully completed the "{assignment.name}" assignment. Your progress has been saved.
            </p>
            
            {assignment?.nextAssignment && (
              <div className="bg-muted p-4 rounded-lg mb-4">
                <h3 className="font-medium mb-2">Next Assignment:</h3>
                <div className="flex items-center justify-between">
                  <span>{assignment.nextAssignment.name}</span>
                  <MoveRight className="h-5 w-5 text-primary" />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <div className="flex justify-between w-full">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCompletionDialog(false)}
              >
                Stay Here
              </Button>
              <Button type="button" onClick={goToNextAssignment}>
                {assignment?.nextAssignment ? 'Go to Next Assignment' : 'Return to Course'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
