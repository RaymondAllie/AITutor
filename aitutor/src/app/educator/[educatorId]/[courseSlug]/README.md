# AITutor Course Management

## Question Generation Feature

This feature allows educators to upload PDF problem sets and automatically generate questions for assignments. The system can also attach specific parts of the PDF to individual questions, providing visual context for students.

### How it works

1. **Upload a Problem Set:**
   - Go to the Materials tab
   - Click "Add Material"
   - Select "Problem Set" as the material type
   - Upload a PDF file (5MB max)
   - The system will automatically generate questions from the PDF content

2. **Review Generated Questions:**
   - After uploading, a dialog will appear showing the generated questions
   - Each question may include an automatically generated answer
   - You can create an assignment directly with these questions or close to edit them manually later

3. **Create Assignment:**
   - Click "Create Assignment" to automatically create an assignment with the generated questions
   - The assignment will be linked to the uploaded problem set material
   - A default due date of 2 weeks from now will be set

4. **Attaching Diagrams:**
   - For any problem, you can attach a specific part of the PDF as a visual reference
   - Go to the Assignments tab, select the assignment, and click on a problem
   - Click "Associate Diagram from PDF"
   - Select the page and crop the area you want to associate with the question
   - Students will see this diagram when working on the problem

### Technical Implementation

The feature utilizes Supabase Edge Functions:

- `generate_questions`: Analyzes PDF content to extract problems and answers
- `add_assignment`: Creates a new assignment with questions and materials
- `take_problem_diagrams`: Stores diagram information for specific problems

PDF processing:
- PDFs are stored in Supabase Storage
- React-PDF is used for rendering and interacting with PDFs
- React-Image-Crop allows selection of specific regions

### Limitations

- PDF processing may not capture all questions perfectly, especially with complex formatting
- Maximum PDF size is 5MB to ensure reasonable processing time
- The system works best with clean, well-structured problem sets
- Currently only supports PDF files 