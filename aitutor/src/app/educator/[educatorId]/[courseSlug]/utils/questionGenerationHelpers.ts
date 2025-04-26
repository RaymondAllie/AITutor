/**
 * Utility functions for generating questions from PDFs and adding assignments
 */
import { EdgeFunctions } from "@/lib/edge-functions";
/**
 * Generates questions from a PDF file using the generate_questions edge function
 * @param file The PDF file to generate questions from
 * @param fetchWithAuth The authenticated fetch function from useAuth
 * @returns An array of generated questions
 */

export async function generateQuestionsFromPdf(file: File, fetchWithAuth: any) {
  // Create a FormData object for the generate_questions endpoint

  const formData = new FormData();
  formData.append('pdf', file);
  
  // Use EdgeFunctions helper to upload and call the edge function
  const response = await EdgeFunctions.generateQuestions(fetchWithAuth, file);
  
  if (!response.success) {
    throw new Error(response.message || 'Failed to generate questions');
  }
  
  // Transform the problem array into the required format
  // The API returns an array of question strings without answers
  return response.problems.map((question: string) => ({
    question,
    answer: '' // No answers provided by the API
  }));
}

/**
 * Creates a new assignment with the provided questions and materials
 * @param courseId The course ID
 * @param name The assignment name
 * @param dueDate The assignment due date
 * @param description The assignment description
 * @param materialIds Array of material IDs to attach
 * @param problems Array of problem questions
 * @param answers Array of answers corresponding to the problems (each answer will be transformed to a list)
 * @param imageUrls Optional array of image URLs for each problem
 * @param fetchWithAuth The authenticated fetch function from useAuth
 * @returns The created assignment data
 */
export async function createAssignmentWithQuestions(
  courseId: string,
  name: string,
  dueDate: string,
  description: string,
  materialIds: string[],
  problems: string[],
  answers: string[],
  imageUrls: string[] = [],
  fetchWithAuth: any
) {
  // Transform answers into a list of lists (each answer becomes a single-item list)
  const transformedAnswers = answers.map(answer => [answer]);
  
  // Create a FormData object for multipart/form-data
  const formData = new FormData();
  
  // Add all the data as a JSON string in the 'data' field
  const jsonData = {
    course_id: courseId,
    name,
    due_date: dueDate,
    description,
    material_ids: materialIds,
    problem_list: problems,
    answer_list: transformedAnswers,
    image_urls: imageUrls
  };
  
  formData.append('data', JSON.stringify(jsonData));
  
  // Call the add_assignment Edge Function with fetchWithAuth
  const data = await fetchWithAuth(`/functions/v1/add_assignment`, {
    method: 'POST',
    body: formData
  });
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to create assignment');
  }
  
  return data;
} 