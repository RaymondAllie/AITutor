/**
 * Utility functions for generating questions from PDFs and adding assignments
 */

/**
 * Generates questions from a PDF file using the generate_questions edge function
 * @param file The PDF file to generate questions from
 * @param supabaseAnonKey The Supabase anonymous key for authorization
 * @returns An array of generated questions
 */
export async function generateQuestionsFromPdf(file: File, supabaseAnonKey: string) {
  // Create a FormData object for the generate_questions endpoint
  const formData = new FormData();
  formData.append('pdf', file);
  
  // Call the generate_questions Edge Function
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate_questions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: formData
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate questions');
  }
  
  // Transform the problem array into the required format
  // The API returns an array of question strings without answers
  return data.problems.map((question: string) => ({
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
 * @param supabaseAnonKey The Supabase anonymous key for authorization
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
  supabaseAnonKey: string
) {
  // Transform answers into a list of lists (each answer becomes a single-item list)
  const transformedAnswers = answers.map(answer => [answer]);
  
  // Prepare the request body
  const requestBody = {
    course_id: courseId,
    name,
    due_date: dueDate,
    description,
    material_ids: materialIds,
    problem_list: problems,
    answer_list: transformedAnswers,
    image_urls: imageUrls
  };
  
  // Call the add_assignment Edge Function
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/add_assignment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify(requestBody)
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create assignment');
  }
  
  return data;
} 