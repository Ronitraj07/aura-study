// ============================================================
// SubtopicsInput.tsx — Enhanced multi-input component for subtopics
// Features: drag-to-reorder, character limits, validation, autocomplete
// ============================================================

import { useState, useRef } from 'react';
import { Plus, X, GripVertical, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SubtopicsInputProps {
  subtopics: string[];
  onChange: (subtopics: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  maxLength?: number;
  className?: string;
  showCharacterCount?: boolean;
  enableDragReorder?: boolean;
  autocompleteOptions?: string[];
}

// Common academic subtopics for autocomplete
const DEFAULT_AUTOCOMPLETE_OPTIONS = [
  "Key Concepts", "Historical Context", "Mechanisms", "Applications", "Examples", 
  "Formulas", "Processes", "Relationships", "Theory", "Practice", "Analysis",
  "Structure", "Function", "Evolution", "Timeline", "Causes", "Effects",
  "Principles", "Methods", "Techniques", "Case Studies", "Comparisons"
];

// Generic subtopics to prevent (too vague)
const GENERIC_SUBTOPICS = [
  "introduction", "conclusion", "overview", "summary", "basics", 
  "fundamentals", "general", "misc", "other", "various"
];

export function SubtopicsInput({ 
  subtopics, 
  onChange, 
  placeholder = "Enter a subtopic...",
  maxItems = 8,
  maxLength = 50,
  className = "",
  showCharacterCount = true,
  enableDragReorder = true,
  autocompleteOptions = DEFAULT_AUTOCOMPLETE_OPTIONS
}: SubtopicsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter autocomplete options based on input and existing subtopics
  const filteredOptions = autocompleteOptions.filter(option => 
    option.toLowerCase().includes(inputValue.toLowerCase()) && 
    !subtopics.includes(option) &&
    inputValue.trim().length > 0
  ).slice(0, 5);

  const validateSubtopic = (subtopic: string): string | null => {
    const trimmed = subtopic.trim();
    
    if (trimmed.length === 0) return "Subtopic cannot be empty";
    if (trimmed.length > maxLength) return `Subtopic too long (max ${maxLength} characters)`;
    if (subtopics.includes(trimmed)) return "Subtopic already exists";
    if (GENERIC_SUBTOPICS.includes(trimmed.toLowerCase())) {
      return "Try to be more specific than '" + trimmed + "'";
    }
    if (subtopics.length >= maxItems) return `Maximum ${maxItems} subtopics reached`;
    
    return null;
  };

  const addSubtopic = (subtopic?: string) => {
    const toAdd = subtopic || inputValue;
    const error = validateSubtopic(toAdd);
    
    if (error) {
      setValidationError(error);
      setTimeout(() => setValidationError(null), 3000);
      return;
    }

    onChange([...subtopics, toAdd.trim()]);
    setInputValue('');
    setShowAutocomplete(false);
    setValidationError(null);
  };

  const removeSubtopic = (index: number) => {
    onChange(subtopics.filter((_, i) => i !== index));
    setValidationError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubtopic();
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setShowAutocomplete(value.trim().length > 0);
    setValidationError(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!enableDragReorder) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!enableDragReorder) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    if (!enableDragReorder || draggedIndex === null) return;
    e.preventDefault();
    
    const newSubtopics = [...subtopics];
    const draggedItem = newSubtopics[draggedIndex];
    
    // Remove dragged item
    newSubtopics.splice(draggedIndex, 1);
    
    // Insert at drop position
    const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newSubtopics.splice(adjustedDropIndex, 0, draggedItem);
    
    onChange(newSubtopics);
    setDraggedIndex(null);
  };

  const isInputValid = inputValue.trim().length > 0 && !validateSubtopic(inputValue);
  const characterCount = inputValue.length;
  const isNearLimit = characterCount > maxLength * 0.8;

  return (
    <div className={cn("space-y-3 relative", className)}>
      {/* Input for adding new subtopics */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowAutocomplete(inputValue.trim().length > 0)}
              onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)} // Delay to allow clicking
              placeholder={placeholder}
              className={cn(
                "bg-white/5 border-white/10 focus:border-purple-500/60 text-sm transition-colors",
                validationError && "border-red-400/50 focus:border-red-400/60"
              )}
              maxLength={maxLength}
            />
            
            {/* Character count */}
            {showCharacterCount && (
              <div className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums",
                isNearLimit ? "text-amber-400" : "text-muted-foreground/50"
              )}>
                {characterCount}/{maxLength}
              </div>
            )}
            
            {/* Autocomplete dropdown */}
            {showAutocomplete && filteredOptions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredOptions.map((option, index) => (
                  <button
                    key={option}
                    onClick={() => addSubtopic(option)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-secondary/50 border-b border-border/30 last:border-b-0 transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <Button
            type="button"
            onClick={() => addSubtopic()}
            disabled={!isInputValid}
            size="sm"
            variant="outline"
            className="border-white/10 hover:bg-white/5 px-3"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        {/* Validation error */}
        {validationError && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
            <AlertTriangle className="w-3 h-3" />
            {validationError}
          </div>
        )}
      </div>

      {/* Display current subtopics */}
      {subtopics.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {subtopics.length} of {maxItems} subtopics
            </span>
            {enableDragReorder && (
              <span className="text-xs text-muted-foreground/70 italic">
                Drag to reorder
              </span>
            )}
          </div>
          
          <div className="flex flex-col gap-1.5">
            {subtopics.map((subtopic, index) => (
              <div
                key={`${subtopic}-${index}`}
                draggable={enableDragReorder}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={cn(
                  "group flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 transition-all",
                  enableDragReorder && "cursor-move hover:bg-purple-500/15",
                  draggedIndex === index && "opacity-50"
                )}
              >
                {enableDragReorder && (
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                )}
                
                <span className="flex-1 text-sm text-purple-300 truncate" title={subtopic}>
                  {subtopic}
                </span>
                
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground/60 tabular-nums">
                    {subtopic.length}
                  </span>
                  
                  <button
                    onClick={() => removeSubtopic(index)}
                    className="hover:text-red-400 transition-colors p-0.5 opacity-60 hover:opacity-100"
                    aria-label={`Remove ${subtopic}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helper text */}
      {subtopics.length >= maxItems && (
        <div className="flex items-center gap-1.5 text-xs text-amber-400/70">
          <AlertTriangle className="w-3 h-3" />
          Maximum {maxItems} subtopics reached
        </div>
      )}
    </div>
  );
}