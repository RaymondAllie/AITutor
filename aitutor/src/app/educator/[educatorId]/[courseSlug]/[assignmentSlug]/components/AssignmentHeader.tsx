import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, MessageCircle, Paperclip, ArrowLeft } from "lucide-react";
import { Assignment, Course, Material } from "../../types"; // Adjust import path as needed

interface AssignmentHeaderProps {
  course: Course;
  assignment: Assignment;
  materials: Material[];
  onOpenMaterialsDialog: () => void;
  handleBackToCourse: () => void;
  formatDate: (dateString: string) => string;
  getMaterialIcon: (type: string) => JSX.Element;
}

const AssignmentHeader: React.FC<AssignmentHeaderProps> = ({
  course,
  assignment,
  materials,
  onOpenMaterialsDialog,
  handleBackToCourse,
  formatDate,
  getMaterialIcon
}) => {
  return (
    <div className="mb-6">
      <Button 
        variant="outline" 
        size="sm" 
        className="mb-4"
        onClick={handleBackToCourse}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to {course.name}
      </Button>
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{assignment.name}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
            <div className="flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              Due: {formatDate(assignment.due_date)}
            </div>
            <div className="flex items-center">
              <MessageCircle className="mr-1 h-4 w-4" />
              {assignment.problem_count || 0} {assignment.problem_count === 1 ? 'Problem' : 'Problems'}
            </div>
          </div>
          {assignment.description && (
            <p className="mt-4 text-gray-700">{assignment.description}</p>
          )}
        </div>
        <Button 
          variant="outline" 
          onClick={onOpenMaterialsDialog}
        >
          <Paperclip className="mr-2 h-4 w-4" /> 
          {materials.length > 0 ? `${materials.length} Materials` : "Attach Materials"}
        </Button>
      </div>
      
      {materials.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="font-medium text-sm mr-2">Attached materials:</div>
          {materials.map((material) => (
            <div key={material.id} className="flex items-center px-2 py-1 bg-gray-100 rounded-md text-xs">
              {getMaterialIcon(material.type)}
              <span className="ml-1">{material.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignmentHeader; 