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
  uploadFile: async (fetchWithAuth: any, fileData: FormData) => {
    return fetchWithAuth('/functions/v1/upload', {
      method: 'POST',
      body: fileData,
      // Don't set Content-Type header - it will be set automatically with form boundary
    });
  }
}; 