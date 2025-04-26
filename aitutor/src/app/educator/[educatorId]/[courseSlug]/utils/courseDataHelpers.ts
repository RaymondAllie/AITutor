import { supabase } from '@/lib/supabase';
import { Course, Assignment } from '../types';

/**
 * Fetches the complete course data including materials, assignments, and problem counts
 */
export async function fetchCourseData(courseSlug: string, educatorId: string | null) {
  try {
    // Format courseSlug by replacing dashes with spaces
    const formattedCourseSlug = courseSlug ? courseSlug.replace(/-/g, ' ') : '';
    
    // 1. Fetch the course basic information first
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('course_code', formattedCourseSlug)
      .single();
      
    if (courseError) throw courseError;
    if (!courseData) throw new Error("Course not found");
    
    // 2. Fetch materials for this course
    const { data: materialsData, error: materialsError } = await supabase
      .from('materials')
      .select('*')
      .eq('course_id', courseData.id);
      
    if (materialsError) throw materialsError;
    
    // 3. Fetch assignments for this course using the courses_assignments join table
    const { data: coursesAssignmentsData, error: coursesAssignmentsError } = await supabase
      .from('courses_assignments')
      .select('assignment_id')
      .eq('course_id', courseData.id);
      
    if (coursesAssignmentsError) throw coursesAssignmentsError;
    
    // Get assignment IDs from the join table
    const assignmentIds = coursesAssignmentsData.map(row => row.assignment_id);
    
    // If no assignments, return course with empty assignments array
    if (assignmentIds.length === 0) {
      // Combine all data with empty assignments
      const fullCourseData: Course = {
        ...courseData,
        instructor_name: educatorId || "Instructor",
        materials: materialsData || [],
        assignments: []
      };
      
      return { course: fullCourseData, error: null };
    }
    
    // Fetch the actual assignment data
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .in('id', assignmentIds);
      
    if (assignmentsError) throw assignmentsError;
    
    // 4. For each assignment, count the number of problems
    const assignmentsWithProblemCount = await Promise.all(
      assignmentsData.map(async (assignment) => {
        // Get problems through assignments_problems join table
        const { data: assignmentProblemsData, error: assignmentProblemsError } = await supabase
          .from('assignments_problems')
          .select('problem_id')
          .eq('assignment_id', assignment.id);
          
        if (assignmentProblemsError) {
          console.error("Error fetching assignment problems:", assignmentProblemsError);
          return { ...assignment, problem_count: 0 };
        }
        
        // Count the number of problems from the join table
        const problemCount = assignmentProblemsData ? assignmentProblemsData.length : 0;
        
        return { ...assignment, problem_count: problemCount };
      })
    );
    
    // 5. Fetch user data for educator name
    let instructorName = "Instructor";
    if (educatorId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name')
        .eq('id', educatorId)
        .single();
        
      if (!userError && userData) {
        instructorName = userData.name;
      }
    }
    
    // Combine all data
    const fullCourseData: Course = {
      ...courseData,
      instructor_name: instructorName,
      materials: materialsData || [],
      assignments: assignmentsWithProblemCount || [],
      join_code: courseData.join_code
    };
    
    return { course: fullCourseData, error: null };
  } catch (err: any) {
    console.error("Error fetching course data:", err);
    return { course: null, error: err.message || "Failed to load course data" };
  }
} 