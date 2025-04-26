import React from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlusCircle, Book, FileText } from "lucide-react";
import { Material, Assignment, Course } from "../../types"; // Adjust import path as needed

interface MaterialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment;
  setAssignment: React.Dispatch<React.SetStateAction<Assignment | null>>;
  course: Course;
  setCourse: React.Dispatch<React.SetStateAction<Course | null>>;
  materials: Material[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  selectedMaterials: string[];
  setSelectedMaterials: React.Dispatch<React.SetStateAction<string[]>>;
  handleBackToCourse: () => void;
}

const MaterialsDialog: React.FC<MaterialsDialogProps> = ({
  open,
  onOpenChange,
  assignment,
  setAssignment,
  course,
  setCourse,
  materials,
  setMaterials,
  selectedMaterials,
  setSelectedMaterials,
  handleBackToCourse
}) => {
  // Material type icon function
  const getMaterialIcon = (type: string = "") => {
    switch(type.toLowerCase()) {
      case 'textbook': return <Book className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'pset': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  // Save attached materials
  const saveAttachedMaterials = async () => {
    if (!assignment) return;
    
    try {
      // Update the assignment in the database
      const { error } = await supabase
        .from('assignments')
        .update({ material_ids: selectedMaterials })
        .eq('id', assignment.id);
      
      if (error) throw error;
      
      // Update local state
      const updatedAssignment = {
        ...assignment,
        material_ids: selectedMaterials
      };
      
      setAssignment(updatedAssignment);
      
      // Update materials list
      if (course) {
        const updatedMaterials = course.materials.filter(
          (m: Material) => selectedMaterials.includes(m.id)
        );
        setMaterials(updatedMaterials);
        
        // Also update in the course data
        const updatedAssignments = course.assignments.map(a => 
          a.id === assignment.id ? updatedAssignment : a
        );
        
        setCourse({
          ...course,
          assignments: updatedAssignments
        });
      }
      
      toast.success("Materials updated successfully");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating materials:", err);
      toast.error("Failed to update materials");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Attach Materials to Assignment</DialogTitle>
          <DialogDescription>
            Select course materials to attach to this assignment. Students will have easy access to these materials when working on the assignment.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {course.materials.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500">No materials available to attach.</p>
              <Button 
                className="mt-4" 
                variant="outline" 
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  // Navigate to materials tab
                  handleBackToCourse();
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Course Materials
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {course.materials.map((material: Material) => (
                <div key={material.id} className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-100">
                  <input 
                    type="checkbox"
                    id={material.id}
                    checked={selectedMaterials.includes(material.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMaterials(prev => [...prev, material.id]);
                      } else {
                        setSelectedMaterials(prev => 
                          prev.filter(id => id !== material.id)
                        );
                      }
                    }}
                    className="rounded"
                  />
                  <div className="flex-1 flex items-center">
                    <label htmlFor={material.id} className="cursor-pointer flex-1">
                      <div className="font-medium">{material.name}</div>
                      <div className="text-sm text-gray-500 capitalize">{material.type || 'Resource'}</div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={saveAttachedMaterials}
              disabled={course.materials.length === 0}
            >
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialsDialog; 