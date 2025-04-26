"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, Book, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Material, Course } from "../types"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { EdgeFunctions } from "@/lib/edge-functions"

interface MaterialsTabProps {
  course: Course
  setCourse: (course: Course) => void
  supabaseAnonKey: string
}

export function MaterialsTab({ course, setCourse, supabaseAnonKey }: MaterialsTabProps) {
  // State for add material dialog
  const [addMaterialDialogOpen, setAddMaterialDialogOpen] = useState(false)
  const [newMaterial, setNewMaterial] = useState({ name: "", type: "resource" })
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()
  const { fetchWithAuth } = useAuth()

  // Add new material
  const handleAddMaterial = async () => {
    if (!course || !newMaterial.name) return
    
    setIsUploading(true)
    
    try {
      // Get the file from the input
      const fileInput = document.getElementById('material-file') as HTMLInputElement
      const file = fileInput?.files?.[0]
      
      // Create a FormData object
      const formData = new FormData()
      
      // Add the file if it exists
      if (file) {
        // Check file size (5MB limit)
        const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes
        if (file.size > MAX_FILE_SIZE) {
          toast.error('File size exceeds 5MB. Please choose a smaller file.')
          setIsUploading(false)
          return
        }
        
        // Check file type
        if (!file.type.includes('pdf')) {
          toast.error('Only PDF files are supported.')
          setIsUploading(false)
          return
        }
        
        // Add the file - 'pdf' must match exactly what the backend expects
        formData.append('pdf', file, file.name)
      }
      
      // Add the JSON data as a string
      const materialData = JSON.stringify({
        name: newMaterial.name,
        type: newMaterial.type,
        course_id: course.id
      })
      
      // Add the JSON data as a string value
      formData.append('data', materialData)
      
      // Use EdgeFunctions.uploadFile helper
      const response = await EdgeFunctions.uploadFile(fetchWithAuth, formData)
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to upload material')
      }
      
      // Update local state with the new material
      const newMaterialWithId = response.material as Material
      
      setCourse({
        ...course,
        materials: [
          ...course.materials,
          newMaterialWithId
        ]
      })
      
      toast.success("Material added successfully")
      
      // Refresh the page to show the new material
      router.refresh()
    } catch (err: any) {
      console.error("Error adding material:", err)
      toast.error(err.message || "Failed to add material")
    } finally {
      setIsUploading(false)
      setNewMaterial({ name: "", type: "resource" })
      setAddMaterialDialogOpen(false)
    }
  }

  // Get material type icon
  const getMaterialIcon = (type: string) => {
    switch(type) {
      case 'textbook': return <Book className="h-5 w-5" />;
      case 'powerpoint': return <FileText className="h-5 w-5" />;
      case 'slides': return <FileText className="h-5 w-5" />;
      case 'pset': return <FileText className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Course Materials</h2>
        <Button size="sm" onClick={() => setAddMaterialDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Material
        </Button>
      </div>
      
      {course.materials.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-700">No Materials Yet</h3>
          <p className="text-gray-500 max-w-md mx-auto mt-2 mb-4">
            Add course materials to help your students learn more effectively.
          </p>
          <Button onClick={() => setAddMaterialDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add First Material
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {course.materials && course.materials.filter(material => material).map((material) => (
            <Card key={material.id} className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100">
              <div className="flex px-4 py-3 items-center">
                <div className="mr-3 rounded-lg">
                  {getMaterialIcon(material?.type || 'other')}
                </div>
                <div>
                  <h3 className="font-semibold">{material.name}</h3>
                  <p className="text-xs text-gray-500 capitalize">{material?.type || 'Resource'}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Material Dialog */}
      <Dialog open={addMaterialDialogOpen} onOpenChange={(open) => {
        if (!isUploading) {
          setAddMaterialDialogOpen(open)
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Material</DialogTitle>
            <DialogDescription>
              Add a new material to your course. Students will be able to access this material.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="material-name">Material Name</Label>
              <Input 
                id="material-name" 
                value={newMaterial.name}
                onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                placeholder="e.g., Week 3: Algorithms"
                disabled={isUploading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="material-type">Material Type</Label>
              <select 
                id="material-type"
                className="w-full p-2 border rounded-md"
                value={newMaterial.type}
                onChange={(e) => setNewMaterial({...newMaterial, type: e.target.value})}
                disabled={isUploading}
              >
                <option value="textbook">Textbook</option>
                <option value="powerpoint">PowerPoint</option>
                <option value="slides">Slides</option>
                <option value="pset">Problem Set</option>
                <option value="resource">Resource</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="material-file">Upload File (optional)</Label>
              <Input id="material-file" type="file" disabled={isUploading} />
              <p className="text-xs text-gray-500">Max file size: 5MB</p>
            </div>
          </div>
          
          <DialogFooter>
            <div className="flex justify-between w-full">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setAddMaterialDialogOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleAddMaterial}
                disabled={!newMaterial.name || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Add Material"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 