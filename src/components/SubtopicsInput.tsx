// ============================================================
// SubtopicsInput.tsx — Multi-input component for subtopics
// Allows adding/removing custom subtopic entries
// ============================================================

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface SubtopicsInputProps {
  subtopics: string[];
  onChange: (subtopics: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  className?: string;
}

export function SubtopicsInput({ 
  subtopics, 
  onChange, 
  placeholder = "Enter a subtopic...",
  maxItems = 8,
  className = ""
}: SubtopicsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addSubtopic = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !subtopics.includes(trimmed) && subtopics.length < maxItems) {
      onChange([...subtopics, trimmed]);
      setInputValue('');
    }
  };

  const removeSubtopic = (index: number) => {
    onChange(subtopics.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubtopic();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Input for adding new subtopics */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-white/5 border-white/10 focus:border-purple-500/60 text-sm"
        />
        <Button
          type="button"
          onClick={addSubtopic}
          disabled={!inputValue.trim() || subtopics.includes(inputValue.trim()) || subtopics.length >= maxItems}
          size="sm"
          variant="outline"
          className="border-white/10 hover:bg-white/5 px-3"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Display current subtopics */}
      {subtopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {subtopics.map((subtopic, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors pr-1"
            >
              <span className="mr-1.5">{subtopic}</span>
              <button
                onClick={() => removeSubtopic(index)}
                className="hover:text-red-400 transition-colors p-0.5"
                aria-label={`Remove ${subtopic}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Helper text */}
      {subtopics.length >= maxItems && (
        <p className="text-xs text-yellow-400/70">
          Maximum {maxItems} subtopics reached
        </p>
      )}
    </div>
  );
}