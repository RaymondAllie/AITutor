/**
 * Helper functions for calling Supabase Edge Functions with authentication
 * 
 * Import this file in components that need to call edge functions:
 * import { callEdgeFunction } from "@/lib/edge-functions";
 * 
 * Then use the useAuth hook to get fetchWithAuth:
 * const { fetchWithAuth } = useAuth();
 * 
 * And call edge functions:
 * const result = await callEdgeFunction(fetchWithAuth, "my-function", { data: "value" });
 */

/**
 * Call a Supabase Edge Function with proper authentication
 * 
 * @param fetchWithAuth - The authenticated fetch function from useAuth
 * @param functionName - Name of the edge function to call (without /functions/v1/ prefix)
 * @param data - Optional data to send in the request body
 * @param options - Optional additional fetch options
 * @returns The parsed JSON response with success status
 */
export async function callEdgeFunction(
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<any>,
  functionName: string,
  data?: any,
  options?: Omit<RequestInit, 'body'>
) {
  const endpoint = `/functions/v1/${functionName}`;
  
  return fetchWithAuth(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    ...options,
    body: data ? JSON.stringify(data) : undefined
  });
}

/**
 * Predefined edge function callers for specific functions
 * Add your specific edge functions here
 */

export const EdgeFunctions = {
  /**
   * Call the signup edge function
   */
  signup: async (fetchWithAuth: any, userId: string) => {
    return callEdgeFunction(fetchWithAuth, 'signup', { user_id: userId });
  },
  
  /**
   * Call any chat or AI function
   */
  chat: async (fetchWithAuth: any, messages: any[], options?: any) => {
    return callEdgeFunction(fetchWithAuth, 'chat', { messages, ...options });
  },
  
  /**
   * Upload a file with authentication
   */
  uploadFile: async (fetchWithAuth: any, formData: FormData) => {
    return fetchWithAuth('/functions/v1/generate_questions', {
      method: 'POST',
      body: formData,
    });
  },
  
  /**
   * Generate questions from a PDF file
   */
  generateQuestions: async (fetchWithAuth: any, pdfFile: File) => {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    
    const response = await fetchWithAuth('/functions/v1/generate_questions', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to generate questions');
    }
    
    return {
      success: true,
      problems: response.problems || [],
      message: response.message || 'PDF processed successfully'
    };
  },

  materialUpload: async (fetchWithAuth: any, pdfFile: File, data: { name: string, type: string, course_id: string }) => {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('data', JSON.stringify(data));
    return fetchWithAuth('/functions/v1/material_upload', {
      method: 'POST',
      body: formData,
    });
  }
}; 