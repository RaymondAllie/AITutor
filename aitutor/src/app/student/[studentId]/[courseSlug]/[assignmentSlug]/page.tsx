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

// Mock data for a specific assignment
const mockAssignment = {
  id: "a1",
  name: "Hello World Program",
  slug: "hello-world-program",
  courseName: "Introduction to Computer Science",
  courseSlug: "introduction-to-computer-science",
  dueDate: "2025-04-10",
  description: "Write a simple program that outputs 'Hello, World!' to the console.",
  questions: [
    {
      id: "q1",
      text: "What is the purpose of a 'Hello World' program?",
      hint: "Think about what developers are trying to test or verify with this type of program."
    },
    {
      id: "q2",
      text: "Write a simple 'Hello World' program in a programming language of your choice.",
      hint: "Remember to use the correct syntax for print/output statements."
    },
    {
      id: "q3",
      text: "Why is 'Hello World' traditionally the first program developers learn in a new language?",
      hint: "Consider the simplicity and what it allows you to confirm about your development environment."
    },
    {
      id: "q4",
      text: "How would you modify your 'Hello World' program to display your name instead?",
      hint: "You'll need to change the string within the print statement."
    }
  ],
  materials: [
    { id: "m1", name: "Week 1: Introduction to Programming", type: "slides" },
    { id: "m2", name: "Coding Style Guide", type: "resource" }
  ],
  nextAssignment: {
    id: "a2",
    name: "Variables and Data Types",
    slug: "variables-and-data-types"
  }
};

// Message types for chat
type MessageRole = 'user' | 'assistant' | 'system';
interface Message {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export default function AssignmentPage() {
  const params = useParams();
  const { studentId, courseSlug, assignmentSlug } = params;
  
  // State for the assignment data
  const [assignment, setAssignment] = useState(mockAssignment);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [completedQuestions, setCompletedQuestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentQuestion = assignment?.questions[currentQuestionIndex];
  const progress = assignment ? (completedQuestions.length / assignment.questions.length) * 100 : 0;
  const allQuestionsCompleted = assignment ? completedQuestions.length === assignment.questions.length : false;
  
  // Load assignment data
  useEffect(() => {
    // Simulate API call to get assignment data
    setTimeout(() => {
      // Initial system message introducing the current question
      if (mockAssignment) {
        const initialMessage: Message = {
          role: 'system',
          content: `Welcome to the ${mockAssignment.name} assignment. Let's start with the first question: "${mockAssignment.questions[0].text}"`,
          timestamp: new Date()
        };
        setMessages([initialMessage]);
      }
      setAssignment(mockAssignment);
      setLoading(false);
    }, 500);
  }, [assignmentSlug, courseSlug, studentId]);
  
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
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      
      // Add system message for the new question
      const newMessage: Message = {
        role: 'system',
        content: `Let's go back to question ${currentQuestionIndex}: "${assignment.questions[currentQuestionIndex - 1].text}"`,
        timestamp: new Date()
      };
      setMessages([...messages, newMessage]);
    }
  };
  
  // Navigate to next question
  const goToNextQuestion = () => {
    if (currentQuestionIndex < assignment.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      
      // Add system message for the new question
      const newMessage: Message = {
        role: 'system',
        content: `Let's move on to question ${currentQuestionIndex + 2}: "${assignment.questions[currentQuestionIndex + 1].text}"`,
        timestamp: new Date()
      };
      setMessages([...messages, newMessage]);
    }
  };
  
  // Mark current question as completed
  const markAsCompleted = () => {
    if (!completedQuestions.includes(currentQuestion.id)) {
      setCompletedQuestions([...completedQuestions, currentQuestion.id]);
    }
    
    // If there are more questions, move to the next one
    if (currentQuestionIndex < assignment.questions.length - 1) {
      goToNextQuestion();
    }
  };
  
  // Show hint for current question
  const showHint = () => {
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
    const userMessageLower = userMessage.toLowerCase();
    
    // Simple keyword matching for mock responses
    if (question.id === 'q1') {
      if (userMessageLower.includes('test') || userMessageLower.includes('verify')) {
        return "Great point! 'Hello World' programs are indeed used to verify that the programming environment is set up correctly. It serves as a simple test to make sure you can write, compile, and run code successfully.";
      } else if (userMessageLower.includes('first') || userMessageLower.includes('begin')) {
        return "'Hello World' programs are traditional first programs because they're simple and focus just on producing output - a perfect starting point for learning.";
      } else {
        return "The 'Hello World' program serves as a simple test to verify that your programming environment is set up correctly. It's a way to confirm that you can write, compile (if needed), and execute code in a new language or environment.";
      }
    } else if (question.id === 'q2') {
      if (userMessageLower.includes('print') || userMessageLower.includes('console')) {
        return "That looks like a good start! The key elements of a 'Hello World' program are the print or output statement and the string 'Hello, World!' to be displayed. Would you like to see examples in different languages?";
      } else {
        return "To write a 'Hello World' program, you need to use a print or output statement with the string 'Hello, World!'. For example:\n\nPython: `print('Hello, World!')`\nJavaScript: `console.log('Hello, World!')`\nJava: `System.out.println('Hello, World!')`\n\nDoes this help?";
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
    if (assignment.nextAssignment) {
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
          {assignment.courseName} • Due: {new Date(assignment.dueDate).toLocaleDateString()}
        </div>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1 text-sm">
            <span>Progress</span>
            <span>{completedQuestions.length} of {assignment.questions.length} questions completed</span>
          </div>
          <Progress 
            value={progress} 
            className={`h-2 ${allQuestionsCompleted ? 'bg-green-100' : ''}`}
            indicatorClassName={allQuestionsCompleted ? 'bg-green-500' : undefined}
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
                  <Button size="sm" variant="outline" onClick={() => markAsCompleted()}>
                    Mark Complete
                  </Button>
                </div>
              </div>
              <CardDescription>
                Question {currentQuestionIndex + 1} of {assignment.questions.length}: {currentQuestion.text}
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
          {/* Assignment Materials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment Materials</CardTitle>
              <CardDescription>
                Resources to help you complete this assignment
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {assignment.materials.map((material) => (
                  <div key={material.id} className="px-4 py-3 hover:bg-muted transition-colors flex items-center">
                    <div className="mr-3">
                      {getMaterialIcon(material.type)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{material.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{material.type}</div>
                    </div>
                    <Button size="icon" variant="ghost">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
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
                    <div className="flex-1 text-sm">{question.text.length > 60 ? `${question.text.substring(0, 60)}...` : question.text}</div>
                    {completedQuestions.includes(question.id) && (
                      <Badge variant="outline" className="ml-2 bg-green-50 text-green-600 border-green-200">
                        Completed
                      </Badge>
                    )}
                  </div>
                ))}
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
            
            {assignment.nextAssignment && (
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
                {assignment.nextAssignment ? 'Go to Next Assignment' : 'Return to Course'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
