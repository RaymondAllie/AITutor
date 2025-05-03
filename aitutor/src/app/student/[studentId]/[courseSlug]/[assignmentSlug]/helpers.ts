// Types and interfaces
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  time: string;
}

export interface Question {
  id: string;
  question: string;
  hint?: string;
  assignment_id: string;
  completed?: boolean;
  diagram?: {
    pageNumber: number;
    crop: any; // Use 'any' for Crop, or import the type if needed
    imageData?: string;
    url?: string;
  };
}

export interface Material {
  id: string;
  name: string;
  type: string;
  url?: string;
  defaultPage?: number;
}

export interface Assignment {
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

export interface PDFTab {
  id: string;
  url: string;
  title: string;
  defaultPage: number;
}

// Utility functions
import { v4 as uuidv4 } from 'uuid';
import { Book, FileText } from 'lucide-react';

export const createMessage = (role: MessageRole, content: string): Message => {
  return {
    id: uuidv4(),
    role,
    content,
    time: new Date().toISOString(),
  };
};

export const getMaterialIcon = (type: string) => {
  switch (type) {
    case 'textbook':
      return Book;
    case 'slides':
      return FileText;
    case 'pset':
      return FileText;
    default:
      return FileText;
  }
}; 