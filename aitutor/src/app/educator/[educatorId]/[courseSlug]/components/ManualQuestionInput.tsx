import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, PlusCircle } from "lucide-react";

export interface ManualQuestion {
  question: string;
  answer: string;
}

interface ManualQuestionInputProps {
  questions: ManualQuestion[];
  setQuestions: (questions: ManualQuestion[]) => void;
}

const ManualQuestionInput: React.FC<ManualQuestionInputProps> = ({ questions, setQuestions }) => {
  const handleQuestionChange = (index: number, value: string) => {
    const updated = [...questions];
    updated[index].question = value;
    setQuestions(updated);
  };

  const handleAnswerChange = (index: number, value: string) => {
    const updated = [...questions];
    updated[index].answer = value;
    setQuestions(updated);
  };

  const handleAdd = () => {
    setQuestions([...questions, { question: "", answer: "" }]);
  };

  const handleRemove = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  return (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <div key={idx} className="flex flex-col gap-2 border rounded-md p-3 relative bg-muted/50">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium text-sm">Question {idx + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500"
              onClick={() => handleRemove(idx)}
              aria-label="Remove question"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="Enter question text..."
            value={q.question}
            onChange={e => handleQuestionChange(idx, e.target.value)}
            className="mb-2"
          />
          <Textarea
            placeholder="Enter answer (optional)..."
            value={q.answer}
            onChange={e => handleAnswerChange(idx, e.target.value)}
            rows={2}
          />
        </div>
      ))}
      <Button type="button" variant="outline" onClick={handleAdd} className="w-full">
        <PlusCircle className="mr-2 h-4 w-4" /> Add Question
      </Button>
    </div>
  );
};

export default ManualQuestionInput; 