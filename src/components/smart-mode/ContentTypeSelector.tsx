// ============================================================
// Content Type Selector for Smart Mode
// Allows users to select what type of content to generate
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  HelpCircle, 
  Briefcase, 
  GraduationCap, 
  BookOpen, 
  Layers,
  ChevronRight,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { SmartModeContentType, DifficultyLevel, OutputFormat, GenerationOptions } from '@/hooks/useSmartModeGenerator';

interface ContentTypeSelectorProps {
  onGenerate: (options: GenerationOptions) => void;
  isGenerating: boolean;
  progress: number;
  currentStep: string;
}

const contentTypes: {
  id: SmartModeContentType;
  name: string;
  description: string;
  icon: typeof FileText;
  color: string;
}[] = [
  {
    id: 'notes',
    name: 'Study Notes',
    description: 'Comprehensive notes with key points and summaries',
    icon: FileText,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  },
  {
    id: 'qa',
    name: 'Q&A Set',
    description: 'Question and answer pairs for self-testing',
    icon: HelpCircle,
    color: 'bg-green-500/10 text-green-500 border-green-500/20'
  },
  {
    id: 'interview_prep',
    name: 'Interview Prep',
    description: 'Behavioral and technical interview questions',
    icon: Briefcase,
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
  },
  {
    id: 'exam_questions',
    name: 'Exam Questions',
    description: 'Multiple choice, short answer, and essay questions',
    icon: GraduationCap,
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
  },
  {
    id: 'teaching_notes',
    name: 'Teaching Notes',
    description: 'Lesson plans with objectives and activities',
    icon: BookOpen,
    color: 'bg-pink-500/10 text-pink-500 border-pink-500/20'
  },
  {
    id: 'flashcards',
    name: 'Flashcards',
    description: 'Quick review cards with front/back format',
    icon: Layers,
    color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
  }
];

export function ContentTypeSelector({ 
  onGenerate, 
  isGenerating, 
  progress, 
  currentStep 
}: ContentTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<SmartModeContentType | null>(null);
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('standard');
  const [focusAreas, setFocusAreas] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleGenerate = () => {
    if (!selectedType || !title.trim()) return;

    onGenerate({
      contentType: selectedType,
      title: title.trim(),
      difficulty,
      outputFormat,
      focusAreas: focusAreas.split(',').map(s => s.trim()).filter(Boolean),
      customInstructions: customInstructions.trim() || undefined
    });
  };

  const selectedTypeInfo = contentTypes.find(t => t.id === selectedType);

  return (
    <div className="space-y-6">
      {/* Content Type Grid */}
      <div>
        <Label className="text-base font-medium mb-3 block">
          What would you like to generate?
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {contentTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            
            return (
              <motion.button
                key={type.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  "relative p-4 rounded-lg border-2 text-left transition-all",
                  "hover:shadow-md",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/20 hover:border-muted-foreground/40"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                  type.color
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-medium text-sm">{type.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {type.description}
                </p>
                {isSelected && (
                  <motion.div
                    layoutId="selectedIndicator"
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Title Input */}
      {selectedType && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="title">Title for your {selectedTypeInfo?.name}</Label>
            <Input
              id="title"
              placeholder={`e.g., "Chapter 5 - Data Structures"`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5"
            />
          </div>

          {/* Quick Settings */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as DifficultyLevel)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy - Beginner friendly</SelectItem>
                  <SelectItem value="medium">Medium - Balanced</SelectItem>
                  <SelectItem value="hard">Hard - Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Format</Label>
              <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as OutputFormat)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise">Concise</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Settings */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Advanced Options
                </span>
                <ChevronRight className={cn(
                  "w-4 h-4 transition-transform",
                  showAdvanced && "rotate-90"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div>
                <Label htmlFor="focusAreas">Focus Areas (comma-separated)</Label>
                <Input
                  id="focusAreas"
                  placeholder="e.g., algorithms, complexity, optimization"
                  value={focusAreas}
                  onChange={(e) => setFocusAreas(e.target.value)}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Specify topics to emphasize in generation
                </p>
              </div>
              <div>
                <Label htmlFor="customInstructions">Custom Instructions</Label>
                <Textarea
                  id="customInstructions"
                  placeholder="Any specific requirements or preferences..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="mt-1.5"
                  rows={3}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!title.trim() || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {currentStep || 'Generating...'}
              </span>
            ) : (
              <>
                Generate {selectedTypeInfo?.name}
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          {/* Progress Bar */}
          {isGenerating && progress > 0 && (
            <div className="space-y-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {progress}% complete
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}