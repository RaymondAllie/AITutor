import React, { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Problem } from "../../types"; // Adjust import path as needed
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, MessageCircle, Image, Edit, Trash2 } from "lucide-react";

interface ProblemManagementProps {
  problems: Problem[];
  setProblems: React.Dispatch<React.SetStateAction<Problem[]>>;
  assignmentId: string;
  onSelectDiagram: (problemId: string) => void;
  supabaseAnonKey: string;
}

const ProblemManagement: React.FC<ProblemManagementProps> = ({
  problems,
  setProblems,
  assignmentId,
  onSelectDiagram,
  supabaseAnonKey,
}) => {
  const [isAddingProblem, setIsAddingProblem] = useState(false);
  const [editingProblem, setEditingProblem] = useState<{id: string, question: string, answer?: string} | null>(null);
  const [newProblem, setNewProblem] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  // Add a new problem
  const handleAddProblem = async () => {
    if (!assignmentId || !newProblem.trim()) return;
    
    try {
      // Use the Edge Function instead of direct database access
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/add_new_problem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          assignment_id: assignmentId,
          new_problem: newProblem,
          answer: newAnswer.trim() || null,
          i: problems.length // Use the current length as index
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add problem');
      }
      
      // Get the problem data from the join table and problems table
      const { data: assignmentProblems, error: joinError } = await supabase
        .from('assignments_problems')
        .select('problem_id')
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (joinError) throw joinError;
      if (!assignmentProblems || assignmentProblems.length === 0) {
        throw new Error('Problem was added but could not be retrieved');
      }
      
      const problemId = assignmentProblems[0].problem_id;
      
      // Get the full problem data
      const { data: problemData, error: problemError } = await supabase
        .from('problems')
        .select('*')
        .eq('id', problemId)
        .single();
      
      if (problemError) throw problemError;
      
      // Update the local state
      const newProblemWithId = problemData as Problem;
      setProblems([...problems, newProblemWithId]);
      setNewProblem("");
      setNewAnswer("");
      setIsAddingProblem(false);
      
      toast.success("Problem added successfully");
    } catch (err: any) {
      console.error("Error adding problem:", err);
      toast.error(err.message || "Failed to add problem");
    }
  };

  // Update an existing problem
  const handleUpdateProblem = async () => {
    if (!editingProblem || !editingProblem.question.trim()) return;
    
    try {
      const updateData: { question: string; answer?: string } = { 
        question: editingProblem.question 
      };
      
      // Only include answer in update if it exists
      if (editingProblem.answer !== undefined) {
        updateData.answer = editingProblem.answer;
      }
      
      const { error } = await supabase
        .from('problems')
        .update(updateData)
        .eq('id', editingProblem.id);
      
      if (error) throw error;
      
      // Update the local state, preserving any diagram information
      setProblems(problems.map(problem => 
        problem.id === editingProblem.id 
          ? { ...problem, ...updateData }
          : problem
      ));
      
      setEditingProblem(null);
      toast.success("Problem updated successfully");
    } catch (err: any) {
      console.error("Error updating problem:", err);
      toast.error("Failed to update problem");
    }
  };

  // Delete a problem
  const handleDeleteProblem = async (problemId: string) => {
    if (!assignmentId) return;
    
    if (!confirm("Are you sure you want to delete this problem? This action cannot be undone.")) {
      return;
    }
    
    try {
      // First, delete the entry from the join table
      const { error: joinError } = await supabase
        .from('assignments_problems')
        .delete()
        .eq('assignment_id', assignmentId)
        .eq('problem_id', problemId);
      
      if (joinError) throw joinError;
      
      // Then, delete the problem itself
      const { error: problemError } = await supabase
        .from('problems')
        .delete()
        .eq('id', problemId);
      
      if (problemError) throw problemError;
      
      // Update the local state
      setProblems(problems.filter(problem => problem.id !== problemId));
      
      toast.success("Problem deleted successfully");
    } catch (err: any) {
      console.error("Error deleting problem:", err);
      toast.error("Failed to delete problem");
    }
  };

  return (
    <>
      <div className="border-t pt-6 mt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Problems</h2>
          <Button 
            onClick={() => setIsAddingProblem(true)}
            size="sm"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Problem
          </Button>
        </div>
        
        {problems.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-gray-50">
            <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-700">No Problems Yet</h3>
            <p className="text-gray-500 max-w-md mx-auto mt-2 mb-4">
              Add problems for your students to solve in this assignment.
            </p>
            <Button onClick={() => setIsAddingProblem(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add First Problem
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {problems.map((problem, index) => (
              <Card key={problem.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Problem {index + 1}</CardTitle>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onSelectDiagram(problem.id)}
                      >
                        <Image className="h-4 w-4 mr-1" /> Select Diagram
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingProblem({
                          id: problem.id,
                          question: problem.question,
                          answer: problem.answer
                        })}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteProblem(problem.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="font-medium mb-2">Question:</div>
                  <div className="text-gray-700 whitespace-pre-wrap">{problem.question}</div>
                  
                  {problem.answer && (
                    <>
                      <div className="font-medium mt-4 mb-2">Answer:</div>
                      <div className="text-gray-700 whitespace-pre-wrap">{problem.answer}</div>
                    </>
                  )}
                  
                  {problem.diagram && problem.diagram.imageData && (
                    <div className="mt-4">
                      <div className="font-medium mb-2">Diagram:</div>
                      <div className="border p-2 rounded bg-gray-50">
                        <img 
                          src={problem.diagram.imageData} 
                          alt="Problem diagram"
                          className="max-w-full h-auto rounded"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Problem Dialog */}
      <Dialog open={isAddingProblem} onOpenChange={setIsAddingProblem}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Problem</DialogTitle>
            <DialogDescription>
              Create a new problem for this assignment. You can add questions and optional answers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="problem-question">Question</Label>
              <Textarea 
                id="problem-question" 
                value={newProblem}
                onChange={(e) => setNewProblem(e.target.value)}
                placeholder="Enter your question here..."
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="problem-answer">Answer (Optional)</Label>
              <Textarea 
                id="problem-answer" 
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="Enter the answer here..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddingProblem(false)
                setNewProblem("")
                setNewAnswer("")
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddProblem}
              disabled={!newProblem.trim()}
            >
              Add Problem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Problem Dialog */}
      <Dialog 
        open={!!editingProblem} 
        onOpenChange={(open) => !open && setEditingProblem(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Problem</DialogTitle>
            <DialogDescription>
              Update the question and answer for this problem.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-problem-question">Question</Label>
              <Textarea 
                id="edit-problem-question" 
                value={editingProblem?.question || ""}
                onChange={(e) => setEditingProblem(prev => prev ? {...prev, question: e.target.value} : null)}
                placeholder="Enter your question here..."
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-problem-answer">Answer (Optional)</Label>
              <Textarea 
                id="edit-problem-answer" 
                value={editingProblem?.answer || ""}
                onChange={(e) => setEditingProblem(prev => prev ? {...prev, answer: e.target.value} : null)}
                placeholder="Enter the answer here..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditingProblem(null)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateProblem}
              disabled={!editingProblem?.question?.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProblemManagement; 