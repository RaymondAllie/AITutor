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
  CheckCircle,
  ZoomOut,
  ZoomIn,
  RotateCw,
  CropIcon,
  Paperclip,
  Save
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
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import dynamic from 'next/dynamic'
import { v4 as uuidv4 } from 'uuid'
import { Document, Page as PDFPage, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { ReactCrop, type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
// @ts-ignore
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'


// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

// Dynamically import the PDF viewer to avoid SSR issues
const PDFViewer = dynamic(() => import('@/components/pdf-viewer'), { ssr: false })

// Message types for chat
type MessageRole = 'user' | 'assistant' | 'system';
interface Message {
  id: string;
  role: MessageRole;
  content: string;
  time: string;
}

interface Question {
  id: string;
  question: string;
  hint?: string;
  assignment_id: string;
  completed?: boolean;
  diagram?: {
    pageNumber: number;
    crop: Crop;
    imageData?: string;
    url?: string;
  };
  image_url?: string;
}

interface Material {
  id: string;
  name: string;
  type: string;
  url?: string;
  defaultPage?: number;
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

interface PDFTab {
  id: string;
  url: string;
  title: string;
  defaultPage: number;
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
  const [responseInProgress, setResponseInProgress] = useState(false);
  const [partialResponse, setPartialResponse] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<Material[]>([]);
  const [pdfRefreshKey, setPdfRefreshKey] = useState(0);
  
  // PDF diagram selection state
  const [showPdfSelector, setShowPdfSelector] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentQuestionForDiagram, setCurrentQuestionForDiagram] = useState<Question | null>(null);
  
  const currentQuestion = assignment?.questions?.[currentQuestionIndex];
  const progress = assignment ? (completedQuestions.length / assignment.questions.length) * 100 : 0;
  const allQuestionsCompleted = assignment ? completedQuestions.length === assignment.questions.length : false;
  
  const { fetchWithAuth, user } = useAuth();
  
  const [showNextQuestionDialog, setShowNextQuestionDialog] = useState(false);
  
  const createMessage = (role: MessageRole, content: string): Message => {
    return {
      id: uuidv4(),
      role,
      content,
      time: new Date().toISOString()
    }
  }
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
          .eq('id', assignmentSlug)
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
          
          // Sort problems by index (ascending), missing index goes to end
          const sortedProblems = (problemsData || []).slice().sort((a, b) => {
            const aIndex = typeof a.index === 'number' ? a.index : Infinity;
            const bIndex = typeof b.index === 'number' ? b.index : Infinity;
            return aIndex - bIndex;
          });
          
          // 6. Get student's progress for these questions
          // Instead of querying the database directly, use the getprogress Edge Function
          const { data: { session } } = await supabase.auth.getSession()
          
          
          const progressResult = await fetchWithAuth(`/functions/v1/get_progress`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              assignment_id: assignmentData.id
            })
          })
          
          const completedProblemIds = progressResult.completed || [];
          
          // Map questions with completed status
          questions = sortedProblems.map(problem => {
            const isCompleted = completedProblemIds.includes(problem.id);
            return {
              id: problem.id,
              question: problem.question,
              hint: problem.hint || "No hint available for this question.",
              assignment_id: assignmentData.id,
              completed: isCompleted,
              image_url: problem.image_url
            };
          });
          
          // Initialize completedQuestions array from progress data
          setCompletedQuestions(completedProblemIds);
        }
        
        // 7. Check if there's a next assignment in this course
        let nextAssignment = undefined;
        
        const { data: assignmentOrder, error: assignmentOrderError } = await supabase
          .from('courses_assignments')
          .select('assignment_id')
          .eq('course_id', courseData.id)
        
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
          const initialMessage = createMessage(
            'system',
            `Welcome to the ${fullAssignment.name} assignment. Let's start with the first question: "${questions[0].question}"`
          );
          setMessages([initialMessage]);
        } else {
          const initialMessage = createMessage(
            'system',
            `Welcome to the ${fullAssignment.name} assignment. This assignment doesn't have any questions yet.`
          );
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
  
  // Check if all questions are completed
  useEffect(() => {
    if (allQuestionsCompleted && !showCompletionDialog) {
      setShowCompletionDialog(true);
    }
  }, [completedQuestions, allQuestionsCompleted, showCompletionDialog]);
  
  useEffect(() => {
    // Only trigger for user messages
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
      const timeoutId = setTimeout(streamResponse, 1000);
      
      // Cleanup function to prevent memory leaks
      return () => clearTimeout(timeoutId);
    }
  }, [messages]);

  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      // Use requestAnimationFrame to ensure the scroll happens after the render
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  }, [messages]);
  
  useEffect(() => {
    if (assignment && assignment.questions.length > 0) {
      setMessages((prev) => [])
      loadProgress();
      setUpQuestion(currentQuestionIndex);
    }
  }, [currentQuestionIndex, assignment]);
  
  const loadProgress = async () => {
    
    const res = await fetchWithAuth(`/functions/v1/get_progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assignment_id: assignment!.id
      })
    })
    console.log(res.completed)
    console.log(currentQuestion?.id)
    if (res.completed.includes(currentQuestion?.id)) {
      console.log("THIS IS CORRECT")
      setShowNextQuestionDialog(true)
    }
    setCompletedQuestions((_prev) => res.completed)
    return true
    }

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
  
  const setUpQuestion = async (index: number) => {
    if (!currentQuestion) throw new Error("can't load question")
    console.log("user", user)
    const rag = await pullContext(assignment.questions[currentQuestionIndex].question, 3)

    const context = rag.data
    interface Material {
      id: string;
      name: string;
      type: string;
      url?: string;
      defaultPage?: number;
    }
  
    if (rag.urls.length > 0) {
      console.log("PULLED CONTEXT: " + rag.urls.length)
      setSelectedMaterials((_prev) => {
        return rag.material_ids.map((obj: string, index: number) => {
          return {
            id: index + ":  " + obj, //this is wierd, must be different ids so dont use the id for anythign else
            name: rag.names[index],
            type: rag.types[index],
            url: rag.urls[index],
            defaultPage: rag.pages[index]
          }
        })
      })
      console.log(selectedMaterials)
      setPdfRefreshKey(prev => prev + 1);

    }
    const previous = await getMessages(currentQuestion.id)
    console.log("previous", previous)
    setMessages((prev) => [
      ...previous,
      createMessage("system", `Here is some context to the question you are trying to help the student through, use if applicable:\n\n${context.join("\n\n")}`),
    ])
  }

  const pullContext = async (text: string, max_matches: number) => {
    if (!assignment || !assignment.courseName) {
      console.error("Cannot pull context: assignment or course data is missing");
      return null;
    }
    
    console.log("sending request on text")
    console.log(text)
    
    // Get the course ID from the assignment data
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('course_code', courseSlug ? (courseSlug as string).replace(/-/g, ' ') : '')
      .single();
      
    if (courseError) {
      console.error("Error fetching course ID:", courseError);
      return null;
    }
    
    const body = await fetchWithAuth(`/functions/v1/pull_context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        course_id: courseData.id,
        text: text,
        max_matches: max_matches
      })
    })

    return body;
  }
  // Navigate to previous question
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0 && assignment) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Navigate to next question
  const goToNextQuestion = () => {
    if (assignment && currentQuestionIndex < assignment.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  // Mark current question as completed
  const markAsCompleted = async () => {
    // TODO ADD EDGE FUNCTION & DB TO SAVE PROGRESS
    if (!assignment || !currentQuestion || completedQuestions.includes(currentQuestion.id)) return;
    
    // Temporarily keeping this local without saving to database
    const _add = await fetchWithAuth(`/functions/v1/add_progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assignment_id: assignment.id,
        problem_id: currentQuestion.id
      })
    })
  
    setCompletedQuestions(prev => [...prev, currentQuestion.id]);
    setShowNextQuestionDialog(true);
  };

  const clearMessages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const msgs = JSON.parse(JSON.stringify(messages))
      setMessages((prev) => [])

  
      const _remove = await fetchWithAuth(`/functions/v1/remove_messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: msgs
        })
      })
      
       const n = await setUpQuestion(currentQuestionIndex)

    } catch (e) {
      console.log("Error deleting messages: ", e);
      throw e;
    }
  }
  const saveMessage = async (msg: Message, problem: Question) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

  
      const data = await fetchWithAuth("/functions/v1/add_message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          problem_id: problem.id,
          message_id: msg.id,
          role: msg.role,
          content: msg.content,
          time: msg.time
        })
      });
      
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;
    const userMessage = createMessage('user', inputMessage);
    setInputMessage('');

    setMessages(prev => [...prev, userMessage]);
    if (currentQuestion) {
      const success = await saveMessage(userMessage, currentQuestion)
      console.log(success)
    } else {
      throw new Error("Question didn't load")
    }
  
  };

  

  const handleStream = async (stream: ReadableStream<Uint8Array<ArrayBufferLike>> | null) => {
    if (stream == null) return "";
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    var text = ""
    setMessages(prev => [...prev, createMessage('assistant', text)]);

    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        
        const chunk: string = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
                      
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              console.log("content", content);
              text += content;
              setMessages(prev => [...prev.slice(0, -1), createMessage('assistant', text)]);
            } catch (e) {
              console.error('Error parsing JSON:', e);
            }
          }
        }
      } 
      
    } finally {
      reader.releaseLock()
    }
    
    return text;
  }
  // Stream response from AI
  const streamResponse = async () => {
    if (!currentQuestion || !messages.length || responseInProgress) return;
    
    setResponseInProgress(true);
    setPartialResponse("");
    
    try {
      // Prepare the context and messages
      // const context = await pullContext(messages[messages.length - 1].content, 3);
      
      const payload = {
        messages: messages,
        problem_id: currentQuestion.id,
        threshold: 7
      };
      
      const { data: { session } } = await supabase.auth.getSession()
      // Use fetchWithAuth to call the chat edge function
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,

        },
        body: JSON.stringify(payload)
      });
      const response = res.body
      const text = await handleStream(response)
      const message = createMessage('assistant', text)
      if (currentQuestion) {
        const success = await saveMessage(message, currentQuestion)
        console.log(success)
      }
      console.log(messages)
      loadProgress()
    } catch (error) {
      console.error("Error getting response:", error);
      toast.error("Failed to generate a response");
    } finally {
      setResponseInProgress(false);
    }

  };

  const getMessages = async (problemId: string) => {
    try {
      const { data: problemMessages, error: err0 } = await supabase
        .from('problems_messages')
        .select('message_id')
        .eq('problem_id', problemId);
      if (err0) throw err0;

      
      const { data: prevMsgs, error } = await supabase
        .from('messages')
        .select('*')
        .in('id', problemMessages.map(msg => msg.message_id))
        .order('time', { ascending: true });

      if (error) {
        throw error;
      }
      let data = prevMsgs;

      if (data.length == 0) {
        const response = await fetchWithAuth(`/functions/v1/begin_chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            problem_id: problemId
          })
        })
        data = response.messages
      }
      
      return data.map((entry) => ({
        id: entry.id,
        role: entry.role as MessageRole,
        content: entry.content,
        time: entry.time
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
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
  
  const handleCloseTab = (materialId: string) => {
    setSelectedMaterials(prev => prev.filter(material => material.id !== materialId));
  };

  const addMaterial = (material: Material) => {
    setSelectedMaterials(prev => {
      const exists = prev.some(m => m.url === material.url);
      if (!exists) {
        return [...prev, material];
      }
      return prev;
    });
  }
  
  // Function to handle PDF document loading success
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };
  
  // Function to store uploaded assignment PDF
  const uploadAssignmentPdf = async (file: File) => {
    try {
      // Generate a unique filepath for the PDF
      const fileExt = file.name.split('.').pop();
      const filepath = `${studentId}/${assignment?.id}/${Date.now()}.${fileExt}`;
      
      // Convert file to ArrayBuffer for upload
      const arrayBuffer = await file.arrayBuffer();
      const pdfData = {
        bytes: new Uint8Array(arrayBuffer)
      };
      
      // Upload to Supabase Storage
      const { data: _uploadData, error: uploadError } = await supabase.storage
        .from('materialfiles')
        .upload(filepath, pdfData.bytes, {
          contentType: 'application/pdf',
          cacheControl: '3600',  // Cache for 1 hour
          upsert: false  // Don't overwrite if exists
        });

      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: { publicUrl } } = await supabase.storage
        .from('materialfiles')
        .getPublicUrl(filepath);
      
      // Set the PDF URL for viewing
      setPdfUrl(publicUrl);
      
      return publicUrl;
    } catch (err: any) {
      console.error("Error uploading PDF:", err);
      toast("Error uploading PDF", { 
        description: err.message || "Failed to upload PDF",
        action: {
          label: "Try Again",
          onClick: () => {}
        }
      });
      return null;
    }
  };
  
  // Function to capture the selected portion of the PDF
  const captureCrop = async () => {
    if (!canvasRef.current || !completedCrop || !currentQuestionForDiagram) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    try {
      // Get the cropped image data
      const imageData = canvas.toDataURL('image/png');
      
      // Create a blob from the image data
      const base64Data = imageData.split(',')[1];
      if (!base64Data) return;
      
      const binaryData = atob(base64Data);
      const array = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        array[i] = binaryData.charCodeAt(i);
      }
      
      const blob = new Blob([array], { type: 'image/png' });
      const file = new File([blob], `diagram-${currentQuestionForDiagram.id}.png`, { type: 'image/png' });
      
      // Upload the cropped image to Supabase Storage
      const filepath = `${studentId}/${assignment?.id}/diagrams/${currentQuestionForDiagram.id}.png`;
      
      const { data: _uploadData, error: uploadError } = await supabase.storage
        .from('materialfiles')
        .upload(filepath, array, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // Get the public URL for the uploaded diagram
      const { data: { publicUrl } } = await supabase.storage
        .from('materialfiles')
        .getPublicUrl(filepath);
      
      // Update the current question with the diagram info
      const updatedQuestion = {
        ...currentQuestionForDiagram,
        diagram: {
          pageNumber: currentPage,
          crop: completedCrop,
          imageData,
          url: publicUrl
        }
      };
      
      // Update questions array in assignment
      if (assignment) {
        const updatedQuestions = assignment.questions.map(q => 
          q.id === currentQuestionForDiagram.id ? updatedQuestion : q
        );
        
        setAssignment({
          ...assignment,
          questions: updatedQuestions
        });
        
        // Send diagram data to edge function
        await sendDiagramToEdgeFunction(updatedQuestion);
      }
      
      // Reset the diagram selection
      setShowPdfSelector(false);
      setCurrentQuestionForDiagram(null);
      toast.success("Diagram associated with question");
    } catch (err: any) {
      console.error("Error saving diagram:", err);
      toast.error("Failed to save diagram: " + (err.message || "Unknown error"));
    }
  };
  
  // Function to send diagram to edge function
  const sendDiagramToEdgeFunction = async (question: Question) => {
    if (!question.diagram || !question.diagram.imageData) return;
    
    try {
      // Create a FormData object for the upload
      const formData = new FormData();
      
      // Convert base64 to a file
      const base64Response = await fetch(question.diagram.imageData);
      const blob = await base64Response.blob();
      const file = new File([blob], "diagram.png", { type: "image/png" });
      
      // Add the image file
      formData.append("image", file);
      
      // Add question and assignment data
      formData.append("data", JSON.stringify({
        question_id: question.id,
        assignment_id: assignment?.id
      }));
      
      // Use fetchWithAuth to call the edge function
      const response = await fetchWithAuth("/functions/v1/save_question_diagram", {
        method: "POST",
        body: formData
      });
      
      if (!response.success) {
        throw new Error(response.error || "Failed to save diagram");
      }
      
      console.log("Diagram saved:", response);
      return response.url;
    } catch (error) {
      console.error("Error saving diagram:", error);
      toast.error("Failed to save diagram to storage");
      return null;
    }
  };
  
  // Open PDF selector to select diagram for a question
  const openDiagramSelector = async (question: Question, file?: File) => {
    setCurrentQuestionForDiagram(question);
    
    if (file) {
      // Upload the file and get public URL
      const url = await uploadAssignmentPdf(file);
      if (url) {
        setPdfUrl(url);
        setShowPdfSelector(true);
      }
    } else if (pdfUrl) {
      // If PDF already uploaded, just show selector
      setShowPdfSelector(true);
    } else {
      toast.error("Please upload a PDF first");
    }
  };
  
  console.log('currentQuestion', currentQuestion);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen">
        <SidebarTrigger className="fixed top-4 right-4 z-50" />
        <div className="flex-1">
          <div className="max-w-full mx-auto px-4 py-6 space-y-8">
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

            {/* Main content with split view */}
            <div className="grid grid-cols-2 gap-8 mb-4">
              {/* Left side: Chat UI */}
              <div className="space-y-4">
                <Card className="border border-gray-200">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <MessageCircle className="h-5 w-5 mr-2 text-primary" />
                        <CardTitle className="text-lg">AI Tutor</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            clearMessages()
                          }}
                        >
                          Clear Messages
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
                    <div className="h-[50vh] overflow-y-auto p-4" ref={chatContainerRef}>
                      <div className="space-y-4">
                        {messages.filter(msg => msg.role != 'system').map((message, index) => (
                          <div key={index} className={`flex ${message.role !== 'user' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`flex max-w-[80%] ${message.role !== 'user' ? 'items-start' : 'items-end'}`}>
                              {message.role !== 'user' && (
                                <Avatar className="h-8 w-8 mr-2">
                                  <AvatarImage src="https://i.ibb.co/0r00000/ai-tutor.png" alt="AI" />
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
                                <div className="whitespace-pre-wrap">
                                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{message.content}</ReactMarkdown>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* This small div helps ensure we can scroll to the very bottom */}
                        <div className="h-px" />
                      </div>
                    </div>
                    
                    {/* Message Input */}
                    <div className="border-t p-4">
                      <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Input
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Ask about this question..."
                            className="flex-1"
                          />
                          <Button type="submit">
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>

                      </form>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right side: PDF Viewer */}
              <div className="space-y-4">
                <Card className="border border-gray-200">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-primary" />
                        <CardTitle className="text-lg">Course Materials</CardTitle>
                      </div>
                      {selectedMaterials.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const viewer = document.querySelector('[data-pdf-viewer]');
                              if (viewer) {
                                viewer.dispatchEvent(new CustomEvent('zoomOut'));
                              }
                            }}
                          >
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                          <span className="flex items-center text-sm px-2 bg-muted rounded">
                            <span data-pdf-zoom-display>100%</span>
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const viewer = document.querySelector('[data-pdf-viewer]');
                              if (viewer) {
                                viewer.dispatchEvent(new CustomEvent('zoomIn'));
                              }
                            }}
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const viewer = document.querySelector('[data-pdf-viewer]');
                              if (viewer) {
                                viewer.dispatchEvent(new CustomEvent('rotate'));
                              }
                            }}
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {currentQuestion?.image_url && (
                      <div className="flex flex-col items-center px-4">
                        <span className="text-xs font-medium mb-1">Associated Diagram</span>
                        <img
                          src={currentQuestion.image_url}
                          alt="Question Diagram"
                          className="max-h-48 max-w-full border rounded mb-2 object-contain"
                        />
                      </div>
                    )}
                    {selectedMaterials.length > 0 ? (
                      <PDFViewer 
                        tabs={selectedMaterials.map(material => ({
                          id: material.id,
                          url: material.url || '',
                          title: material.name,
                          defaultPage: material.defaultPage || 1
                        }))}
                        onCloseTab={handleCloseTab}
                        refreshKey={pdfRefreshKey}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[50vh] text-gray-500">
                        Select a material to view
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Question Navigation - Moved to bottom of page */}
            <div className="flex justify-between items-center border-t pt-4">
              <Button 
                variant="outline" 
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Previous Question
              </Button>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  Question {currentQuestionIndex + 1} of {assignment.questions.length}
                </Badge>
                {currentQuestion && completedQuestions.includes(currentQuestion.id) && (
                  <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                    Completed
                  </Badge>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={goToNextQuestion}
                disabled={currentQuestionIndex === assignment.questions.length - 1}
              >
                Next Question <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
        <Sidebar side="right">
          <SidebarContent>
            <div className="p-4 space-y-4">
            <h2 className="text-lg font-semibold">Questions</h2>
              <div className="divide-y">
                {assignment.questions.map((question, index) => (
                  <div 
                    key={question.id} 
                    className={`py-3 flex items-center hover:bg-muted transition-colors cursor-pointer ${
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
              </div>
            </div>
          </SidebarContent>
        </Sidebar>
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

      {/* Dialog for moving to next question after marking as complete */}
      <Dialog open={showNextQuestionDialog} onOpenChange={setShowNextQuestionDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Question Completed!</DialogTitle>
            <DialogDescription>
              You have completed this question. Would you like to move on to the next question?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNextQuestionDialog(false)}>
              Stay Here
            </Button>
            <Button
              onClick={() => {
                setShowNextQuestionDialog(false);
                if (assignment && currentQuestionIndex < assignment.questions.length - 1) {
                  setCurrentQuestionIndex(currentQuestionIndex + 1);
                }
              }}
              disabled={assignment ? currentQuestionIndex >= assignment.questions.length - 1 : true}
            >
              Next Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}