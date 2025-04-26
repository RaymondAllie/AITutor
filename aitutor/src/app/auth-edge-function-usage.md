# Using Authenticated Edge Functions

This document shows how to use the `fetchWithAuth` function from the auth context to make authenticated calls to Supabase Edge Functions.

## Basic Usage

```tsx
"use client";

import { useAuth } from "@/contexts/auth-context";
import { callEdgeFunction, EdgeFunctions } from "@/lib/edge-functions";

export default function MyComponent() {
  const { fetchWithAuth, user } = useAuth();
  
  const handleSomeAction = async () => {
    try {
      // Method 1: Using the generic callEdgeFunction helper
      const result = await callEdgeFunction(
        fetchWithAuth,
        "my-function-name",
        { 
          some_data: "value",
          user_id: user?.id 
        }
      );
      
      if (result.success) {
        // Handle successful response
        console.log("Function result:", result);
      } else {
        // Handle error
        console.error("Function error:", result.error);
      }
      
      // Method 2: Using a predefined function from EdgeFunctions
      const chatResult = await EdgeFunctions.chat(
        fetchWithAuth,
        [{ role: "user", content: "Hello AI" }],
        { temperature: 0.7 }
      );
      
      if (chatResult.success) {
        // Handle chat response
        console.log("AI response:", chatResult.response);
      }
      
    } catch (error) {
      console.error("Error calling edge function:", error);
    }
  };
  
  return (
    <div>
      <button onClick={handleSomeAction}>
        Call Edge Function
      </button>
    </div>
  );
}
```

## File Upload Example

```tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { EdgeFunctions } from "@/lib/edge-functions";

export default function FileUploadComponent() {
  const { fetchWithAuth } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleUpload = async () => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const result = await EdgeFunctions.uploadFile(fetchWithAuth, formData);
      
      if (result.success) {
        console.log("File uploaded successfully:", result.file_url);
      } else {
        console.error("Upload failed:", result.error);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };
  
  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!file}>Upload File</button>
    </div>
  );
}
```

## Important Notes

1. Always include error handling when calling edge functions
2. The `fetchWithAuth` function already handles authentication tokens
3. If the user is not logged in, the edge function calls will fail with a 401 status
4. For large file uploads, consider adding progress tracking with additional fetch options 