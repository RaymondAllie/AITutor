import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Assignment, Course, Problem, Material } from "../../types"; // Adjust import path as needed
import { fetchCourseData } from "../../utils/courseDataHelpers"; // Adjust import path as needed

interface AssignmentDataHook {
  course: Course | null;
  setCourse: React.Dispatch<React.SetStateAction<Course | null>>;
  assignment: Assignment | null;
  setAssignment: React.Dispatch<React.SetStateAction<Assignment | null>>;
  problems: Problem[];
  setProblems: React.Dispatch<React.SetStateAction<Problem[]>>;
  materials: Material[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  loading: boolean;
  error: string | null;
  supabaseAnonKey: string;
}

export const useAssignmentData = (
  educatorId: string,
  courseSlug: string,
  assignmentSlug: string
): AssignmentDataHook => {
  const [course, setCourse] = useState<Course | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string>("");

  // Load assignment data
  useEffect(() => {
    const loadAssignmentData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Format courseSlug by replacing dashes with spaces
        const formattedCourseSlug = courseSlug ? courseSlug.replace(/-/g, ' ') : '';
        
        // Fetch course data
        const { course: courseData, error: courseError } = await fetchCourseData(
          formattedCourseSlug,
          educatorId
        );
        
        if (courseError) throw new Error(courseError);
        if (!courseData) throw new Error("Course not found");
        
        setCourse(courseData);
        
        // Check if assignmentSlug is a UUID (assignment ID) or a name-based slug
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignmentSlug);
        
        let assignmentData;
        
        if (isUuid) {
          // Find assignment by ID
          assignmentData = courseData.assignments.find(
            (a: Assignment) => a.id === assignmentSlug
          );
        } else {
          // Find assignment by name (original approach)
          const formattedAssignmentSlug = assignmentSlug.replace(/-/g, ' ');
          assignmentData = courseData.assignments.find(
            (a: Assignment) => a.name.toLowerCase() === formattedAssignmentSlug.toLowerCase()
          );
        }
        
        if (!assignmentData) throw new Error("Assignment not found");
        
        setAssignment(assignmentData);
        
        // Load problems for this assignment
        await loadProblemsForAssignment(assignmentData.id);
        
        // Find materials for this assignment
        if (assignmentData.material_ids && assignmentData.material_ids.length > 0) {
          const assignmentMaterials = courseData.materials.filter(
            (m: Material) => assignmentData.material_ids.includes(m.id)
          );
          setMaterials(assignmentMaterials);
        }
        
        // Get the anon key for Supabase Edge Functions
        setSupabaseAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
      } catch (err: any) {
        console.error("Error loading assignment:", err);
        setError(err.message || "Failed to load assignment");
      } finally {
        setLoading(false);
      }
    };
    
    if (courseSlug && assignmentSlug && educatorId) {
      loadAssignmentData();
    }
  }, [courseSlug, assignmentSlug, educatorId]);

  // Load problems for an assignment
  const loadProblemsForAssignment = async (assignmentId: string) => {
    try {
      // First get the problem IDs from the join table
      const { data: assignmentProblemsData, error: assignmentProblemsError } = await supabase
        .from('assignments_problems')
        .select('problem_id')
        .eq('assignment_id', assignmentId);
      
      if (assignmentProblemsError) throw assignmentProblemsError;
      
      if (!assignmentProblemsData || assignmentProblemsData.length === 0) {
        setProblems([]);
        return;
      }
      
      const problemIds = assignmentProblemsData.map(row => row.problem_id);
      
      // Then fetch the actual problems
      const { data: problemsData, error: problemsError } = await supabase
        .from('problems')
        .select('*')
        .in('id', problemIds);
      
      if (problemsError) throw problemsError;
      
      setProblems(problemsData || []);
      console.log("problemsData", problemsData);
    } catch (err: any) {
      console.error("Error loading problems:", err);
      toast.error("Failed to load problems");
    }
  };

  return {
    course,
    setCourse,
    assignment,
    setAssignment,
    problems,
    setProblems,
    materials,
    setMaterials,
    loading,
    error,
    supabaseAnonKey
  };
}; 