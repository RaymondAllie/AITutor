import { Book, FileText } from "lucide-react";
import React from "react";

/**
 * Format date display
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return 'No due date';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

/**
 * Material type icon function
 */
export const getMaterialIcon = (type: string = ""): JSX.Element => {
  switch(type.toLowerCase()) {
    case 'textbook': return <Book className="h-4 w-4" />;
    case 'pdf': return <FileText className="h-4 w-4" />;
    case 'pset': return <FileText className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
} 