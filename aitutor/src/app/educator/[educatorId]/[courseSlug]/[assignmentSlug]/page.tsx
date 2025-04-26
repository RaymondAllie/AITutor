"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import 'react-pdf/dist/esm/Page/TextLayer.css'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'

// Internal components
import PdfDiagramDialog from "./components/PdfDiagramDialog"
import ProblemManagement from "./components/ProblemManagement"
import MaterialsDialog from "./components/MaterialsDialog"
import AssignmentHeader from "./components/AssignmentHeader"

// Hooks and utils
import { useAssignmentData } from "./hooks/useAssignmentData"
import { formatDate, getMaterialIcon } from "./utils/helpers.tsx"

export default function AssignmentPage() {
  const params = useParams()
  const router = useRouter()
  const { educatorId, courseSlug, assignmentSlug } = params
  
  // Load assignment data using custom hook
  const {
    course,
    setCourse,
    assignment,
    setAssignment,
    problems,
    setProblems,
    materials,
    setMaterials,
    loading,
    error,
    supabaseAnonKey
  } = useAssignmentData(
    educatorId as string,
    courseSlug as string,
    assignmentSlug as string
  )
  
  // Materials dialog state
  const [materialsDialogOpen, setMaterialsDialogOpen] = useState(false)
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  
  // PDF and diagram selection state
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [currentProblemId, setCurrentProblemId] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string>("https://yhqxnhbpxjslmiwtfkez.supabase.co/storage/v1/object/public/psetfiles//hw1a.pdf")
  
  // Update selected materials whenever assignment changes
  useEffect(() => {
    if (assignment?.material_ids) {
      setSelectedMaterials(assignment.material_ids)
    }
  }, [assignment])

  // Set up PDF.js worker
  useEffect(() => {
    const setupPdfWorker = async () => {
      const pdfjs = await import('react-pdf')
      // Use local worker file from public directory instead of CDN
      pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
    }

    setupPdfWorker()
  }, [])
  
  // Go back to course page
  const handleBackToCourse = () => {
    if (courseSlug && educatorId) {
      router.push(`/educator/${educatorId}/${courseSlug}`)
    }
  }

  // Handle opening the PDF dialog for diagram selection
  const handleSelectDiagram = (problemId: string) => {
    setCurrentProblemId(problemId)
    setPdfDialogOpen(true)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  }

  if (error) {
    return <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="text-red-500 mb-4 text-lg">{error}</div>
        <Button onClick={handleBackToCourse}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Course
        </Button>
      </div>
    </div>
  }

  if (!assignment || !course) {
    return <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="text-gray-500 mb-4">Assignment not found</div>
        <Button onClick={handleBackToCourse}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Course
        </Button>
      </div>
    </div>
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      {/* Assignment Header */}
      <AssignmentHeader 
        course={course}
        assignment={assignment}
        materials={materials}
        onOpenMaterialsDialog={() => setMaterialsDialogOpen(true)}
        handleBackToCourse={handleBackToCourse}
        formatDate={formatDate}
        getMaterialIcon={getMaterialIcon}
      />
      
      {/* Problem Management */}
      <ProblemManagement 
        problems={problems}
        setProblems={setProblems}
        assignmentId={assignment.id}
        onSelectDiagram={handleSelectDiagram}
        supabaseAnonKey={supabaseAnonKey}
      />
      
      {/* Materials Dialog */}
      <MaterialsDialog 
        open={materialsDialogOpen}
        onOpenChange={setMaterialsDialogOpen}
        assignment={assignment}
        setAssignment={setAssignment}
        course={course}
        setCourse={setCourse}
        materials={materials}
        setMaterials={setMaterials}
        selectedMaterials={selectedMaterials}
        setSelectedMaterials={setSelectedMaterials}
        handleBackToCourse={handleBackToCourse}
      />
      
      {/* PDF Diagram Selection Dialog */}
      <PdfDiagramDialog 
        open={pdfDialogOpen}
        onOpenChange={setPdfDialogOpen}
        currentProblemId={currentProblemId}
        problems={problems}
        setProblems={setProblems}
        pdfUrl={pdfUrl}
      />
    </div>
  )
}
