import { useState, useRef } from 'react';
import { ReactCrop } from 'react-image-crop';
import { Document, Page as PDFPage, pdfjs } from 'react-pdf';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Course, Assignment, Problem, Crop } from '../types';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface CourseHelpersProps {
  course: Course | null;
  setProblemsDialogOpen: (open: boolean) => void;
  setCurrentAssignmentForProblems: (assignment: Assignment | null) => void;
}

export function useCourseHelpers({
  course,
  setProblemsDialogOpen,
  setCurrentAssignmentForProblems,
}: CourseHelpersProps) {
  // PDF handling state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPdfSelector, setShowPdfSelector] = useState(false);
  const [currentProblemForDiagram, setCurrentProblemForDiagram] = useState<Problem | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State for problems
  const [problems, setProblems] = useState<Problem[]>([]);
  const [newProblem, setNewProblem] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [editingProblem, setEditingProblem] = useState<{id: string, text: string} | null>(null);
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);
  const [problemsError, setProblemsError] = useState<string | null>(null);
  
  // Open problems dialog for an assignment
  const openProblemsDialog = async (assignmentId: string) => {
    const assignment = course?.assignments.find(a => a.id === assignmentId);
    if (assignment) {
      setCurrentAssignmentForProblems(assignment);
      setProblemsDialogOpen(true);
      await loadProblemsForAssignment(assignmentId);
    }
  };

  // Load problems for an assignment
  const loadProblemsForAssignment = async (assignmentId: string) => {
    setIsLoadingProblems(true);
    setProblemsError(null);
    setProblems([]);
    
    try {
      // First get the problem IDs from the join table
      const { data: assignmentProblemsData, error: assignmentProblemsError } = await supabase
        .from('assignments_problems')
        .select('problem_id')
        .eq('assignment_id', assignmentId);
      
      if (assignmentProblemsError) throw assignmentProblemsError;
      
      if (!assignmentProblemsData || assignmentProblemsData.length === 0) {
        setProblems([]);
        setIsLoadingProblems(false);
        return;
      }
      
      const problemIds = assignmentProblemsData.map(row => row.problem_id);
      
      // Then fetch the actual problems
      const { data: problemsData, error: problemsError } = await supabase
        .from('problems')
        .select('*')
        .in('id', problemIds);
      
      if (problemsError) throw problemsError;
      
      setProblems(problemsData || []);
    } catch (err: any) {
      console.error("Error loading problems:", err);
      setProblemsError(err.message || "Failed to load problems");
    } finally {
      setIsLoadingProblems(false);
    }
  };

  // Open insights panel for an assignment
  const openInsightsPanel = async (assignmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const assignment = course?.assignments.find(a => a.id === assignmentId);
    if (assignment) {
      // In a real implementation, this would set up the insights panel
      toast.info(`Viewing insights for: ${assignment.name}`);
    }
  };

  // Function to handle PDF document loading
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  // Function to get material for current assignment
  const getMaterialForCurrentAssignment = (currentAssignment: Assignment | null) => {
    if (!currentAssignment || !course) return null;
    
    // Find PDF material attached to this assignment
    const materialIds = currentAssignment.material_ids || [];
    const pdfMaterials = course.materials.filter(m => 
      materialIds.includes(m.id) && m.type.includes('pdf')
    );
    
    return pdfMaterials[0] || null;
  };

  // Function to load PDF from Supabase storage
  const loadPdfFromStorage = async (materialId: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('materials')
        .download(`${materialId}.pdf`);
        
      if (error) throw error;
      
      const fileUrl = URL.createObjectURL(data);
      setPdfUrl(fileUrl);
    } catch (err) {
      console.error("Error loading PDF:", err);
      toast.error("Failed to load PDF file");
    }
  };

  return {
    // PDF helpers
    pdfFile,
    setPdfFile,
    pdfUrl,
    setPdfUrl,
    numPages,
    setNumPages,
    currentPage,
    setCurrentPage,
    showPdfSelector,
    setShowPdfSelector,
    crop,
    setCrop,
    completedCrop,
    setCompletedCrop,
    canvasRef,
    
    // Problem-related state
    problems,
    setProblems,
    newProblem,
    setNewProblem,
    newAnswer,
    setNewAnswer,
    editingProblem,
    setEditingProblem,
    isLoadingProblems,
    setIsLoadingProblems,
    problemsError,
    setProblemsError,
    
    // Problem functions
    loadProblemsForAssignment,
    
    // PDF functions
    onDocumentLoadSuccess,
    getMaterialForCurrentAssignment,
    loadPdfFromStorage,
    
    // Dialog functions
    openProblemsDialog,
    openInsightsPanel,
  };
} 