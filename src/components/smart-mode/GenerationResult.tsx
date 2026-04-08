// ============================================================
// Generation Result Display for Smart Mode
// Renders generated content based on content type
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  HelpCircle,
  Briefcase,
  GraduationCap,
  BookOpen,
  Layers,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Download,
  Trash2,
  Clock,
  RotateCcw,
  FileJson,
  FileCode,
  Table
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { exportContent, getAvailableFormats, type ExportFormat } from '@/lib/smartModeExport';
import type { SmartModeGeneration, SmartModeContentType } from '@/hooks/useSmartModeGenerator';

interface GenerationResultProps {
  generation: SmartModeGeneration;
  onDelete: (id: string) => void;
  onRegenerate?: (generation: SmartModeGeneration) => void;
}

const contentTypeIcons: Record<SmartModeContentType, typeof FileText> = {
  notes: FileText,
  qa: HelpCircle,
  interview_prep: Briefcase,
  exam_questions: GraduationCap,
  teaching_notes: BookOpen,
  flashcards: Layers
};

const contentTypeLabels: Record<SmartModeContentType, string> = {
  notes: 'Study Notes',
  qa: 'Q&A Set',
  interview_prep: 'Interview Prep',
  exam_questions: 'Exam Questions',
  teaching_notes: 'Teaching Notes',
  flashcards: 'Flashcards'
};

const exportFormatIcons: Record<ExportFormat, typeof FileText> = {
  json: FileJson,
  markdown: FileCode,
  txt: FileText,
  csv: Table
};

const exportFormatLabels: Record<ExportFormat, string> = {
  json: 'JSON',
  markdown: 'Markdown',
  txt: 'Plain Text',
  csv: 'CSV (Spreadsheet)'
};

export function GenerationResult({ generation, onDelete, onRegenerate }: GenerationResultProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  
  const Icon = contentTypeIcons[generation.contentType];
  const content = generation.contentJson;
  const availableFormats = getAvailableFormats(generation.contentType);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleExport = (format: ExportFormat) => {
    exportContent({
      title: generation.title,
      contentType: generation.contentType,
      content: generation.contentJson,
      format
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              "bg-primary/10 text-primary"
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{generation.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {contentTypeLabels[generation.contentType]}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(generation.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {availableFormats.map((format) => {
                  const FormatIcon = exportFormatIcons[format];
                  return (
                    <DropdownMenuItem 
                      key={format}
                      onClick={() => handleExport(format)}
                      className="flex items-center gap-2"
                    >
                      <FormatIcon className="w-4 h-4" />
                      {exportFormatLabels[format]}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            {onRegenerate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRegenerate(generation)}
                className="h-8 w-8"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Generation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{generation.title}". This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(generation.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8"
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0">
              <ContentRenderer 
                contentType={generation.contentType} 
                content={content} 
              />
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// Content-type specific renderers
interface ContentRendererProps {
  contentType: SmartModeContentType;
  content: any;
}

function ContentRenderer({ contentType, content }: ContentRendererProps) {
  switch (contentType) {
    case 'notes':
      return <NotesRenderer content={content} />;
    case 'qa':
      return <QARenderer content={content} />;
    case 'interview_prep':
      return <InterviewPrepRenderer content={content} />;
    case 'exam_questions':
      return <ExamQuestionsRenderer content={content} />;
    case 'teaching_notes':
      return <TeachingNotesRenderer content={content} />;
    case 'flashcards':
      return <FlashcardsRenderer content={content} />;
    default:
      return <pre className="text-xs overflow-auto">{JSON.stringify(content, null, 2)}</pre>;
  }
}

function NotesRenderer({ content }: { content: any }) {
  const sections = content.sections || [];
  
  return (
    <div className="space-y-4">
      {content.summary && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-1">Summary</h4>
          <p className="text-sm text-muted-foreground">{content.summary}</p>
        </div>
      )}
      
      <Accordion type="multiple" className="space-y-2">
        {sections.map((section: any, idx: number) => (
          <AccordionItem key={idx} value={`section-${idx}`} className="border rounded-lg px-3">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-medium">{section.heading}</span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground mb-3">{section.content}</p>
              {section.keyPoints && section.keyPoints.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium uppercase text-muted-foreground mb-2">Key Points</h5>
                  <ul className="space-y-1">
                    {section.keyPoints.map((point: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function QARenderer({ content }: { content: any }) {
  const questions = content.questions || [];
  
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {content.totalQuestions || questions.length} questions generated
      </p>
      
      <Accordion type="single" collapsible className="space-y-2">
        {questions.map((q: any, idx: number) => (
          <AccordionItem key={idx} value={`q-${idx}`} className="border rounded-lg px-3">
            <AccordionTrigger className="hover:no-underline text-left">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">
                  {q.difficulty || 'medium'}
                </Badge>
                <span className="font-medium">{q.question}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="text-sm">{q.answer}</p>
                {q.category && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {q.category}
                  </Badge>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function InterviewPrepRenderer({ content }: { content: any }) {
  const behavioral = content.behavioralQuestions || [];
  const technical = content.technicalQuestions || [];
  const tips = content.tips || [];
  
  return (
    <div className="space-y-6">
      {behavioral.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Behavioral Questions
          </h4>
          <Accordion type="single" collapsible className="space-y-2">
            {behavioral.map((q: any, idx: number) => (
              <AccordionItem key={idx} value={`beh-${idx}`} className="border rounded-lg px-3">
                <AccordionTrigger className="hover:no-underline text-left">
                  {q.question}
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div>
                    <h5 className="text-xs font-medium uppercase text-muted-foreground mb-1">Sample Answer</h5>
                    <p className="text-sm">{q.sampleAnswer}</p>
                  </div>
                  {q.tips && q.tips.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium uppercase text-muted-foreground mb-1">Tips</h5>
                      <ul className="text-sm space-y-1">
                        {q.tips.map((tip: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
      
      {technical.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Technical Questions
          </h4>
          <Accordion type="single" collapsible className="space-y-2">
            {technical.map((q: any, idx: number) => (
              <AccordionItem key={idx} value={`tech-${idx}`} className="border rounded-lg px-3">
                <AccordionTrigger className="hover:no-underline text-left">
                  {q.question}
                </AccordionTrigger>
                <AccordionContent>
                  <h5 className="text-xs font-medium uppercase text-muted-foreground mb-1">Key Points</h5>
                  <ul className="text-sm space-y-1">
                    {(q.keyPoints || []).map((point: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
      
      {tips.length > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">General Tips</h4>
          <ul className="text-sm space-y-1">
            {tips.map((tip: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500">💡</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ExamQuestionsRenderer({ content }: { content: any }) {
  const mcq = content.multipleChoice || [];
  const shortAnswer = content.shortAnswer || [];
  const essay = content.essay || [];
  
  return (
    <div className="space-y-6">
      {mcq.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Multiple Choice ({mcq.length})</h4>
          <div className="space-y-4">
            {mcq.map((q: any, idx: number) => (
              <div key={idx} className="p-3 border rounded-lg">
                <p className="font-medium text-sm mb-2">Q{idx + 1}. {q.question}</p>
                <div className="space-y-1 mb-2">
                  {(q.options || []).map((opt: string, i: number) => (
                    <div 
                      key={i} 
                      className={cn(
                        "text-sm p-2 rounded",
                        i === q.correctAnswer ? "bg-green-500/10 text-green-700" : "bg-muted/50"
                      )}
                    >
                      {String.fromCharCode(65 + i)}. {opt}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                    <strong>Explanation:</strong> {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {shortAnswer.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Short Answer ({shortAnswer.length})</h4>
          <Accordion type="single" collapsible className="space-y-2">
            {shortAnswer.map((q: any, idx: number) => (
              <AccordionItem key={idx} value={`short-${idx}`} className="border rounded-lg px-3">
                <AccordionTrigger className="hover:no-underline text-left">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{q.points || 5} pts</Badge>
                    {q.question}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm">{q.sampleAnswer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
      
      {essay.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Essay Questions ({essay.length})</h4>
          <Accordion type="single" collapsible className="space-y-2">
            {essay.map((q: any, idx: number) => (
              <AccordionItem key={idx} value={`essay-${idx}`} className="border rounded-lg px-3">
                <AccordionTrigger className="hover:no-underline text-left">
                  <div className="flex items-center gap-2">
                    {q.timeRecommended && (
                      <Badge variant="outline">{q.timeRecommended}</Badge>
                    )}
                    {q.question}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <h5 className="text-xs font-medium uppercase text-muted-foreground mb-1">Key Points to Cover</h5>
                  <ul className="text-sm space-y-1">
                    {(q.keyPoints || []).map((point: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">{i + 1}.</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}

function TeachingNotesRenderer({ content }: { content: any }) {
  const objectives = content.lessonObjectives || [];
  const topics = content.keyTopics || [];
  const activities = content.activities || [];
  const assessments = content.assessmentIdeas || [];
  
  return (
    <div className="space-y-6">
      {objectives.length > 0 && (
        <div className="p-3 bg-blue-500/10 rounded-lg">
          <h4 className="font-medium text-sm mb-2 text-blue-700">Learning Objectives</h4>
          <ul className="text-sm space-y-1">
            {objectives.map((obj: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-500">→</span>
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {topics.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Key Topics</h4>
          <Accordion type="multiple" className="space-y-2">
            {topics.map((topic: any, idx: number) => (
              <AccordionItem key={idx} value={`topic-${idx}`} className="border rounded-lg px-3">
                <AccordionTrigger className="hover:no-underline">
                  {topic.topic}
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p className="text-sm">{topic.explanation}</p>
                  {topic.examples && topic.examples.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium uppercase text-muted-foreground mb-1">Examples</h5>
                      <ul className="text-sm space-y-1">
                        {topic.examples.map((ex: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-500">•</span>
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
      
      {activities.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Classroom Activities</h4>
          <div className="grid gap-3">
            {activities.map((activity: any, idx: number) => (
              <div key={idx} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <h5 className="font-medium text-sm">{activity.name}</h5>
                  {activity.duration && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {activity.duration}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {assessments.length > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Assessment Ideas</h4>
          <ul className="text-sm space-y-1">
            {assessments.map((idea: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500">✓</span>
                {idea}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FlashcardsRenderer({ content }: { content: any }) {
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const cards = content.cards || [];
  const categories = content.categories || [];
  
  const toggleFlip = (idx: number) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {content.totalCards || cards.length} flashcards
        </p>
        {categories.length > 0 && (
          <div className="flex gap-1">
            {categories.map((cat: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {cat}
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      <div className="grid md:grid-cols-2 gap-3">
        {cards.map((card: any, idx: number) => {
          const isFlipped = flippedCards.has(idx);
          
          return (
            <motion.div
              key={idx}
              className={cn(
                "relative h-40 cursor-pointer perspective-1000",
                "border rounded-lg"
              )}
              onClick={() => toggleFlip(idx)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={cn(
                "absolute inset-0 p-4 flex flex-col justify-center items-center text-center",
                "transition-all duration-300 backface-hidden rounded-lg",
                isFlipped ? "opacity-0" : "opacity-100 bg-background"
              )}>
                <p className="font-medium">{card.front}</p>
                <div className="absolute bottom-2 left-2 right-2 flex justify-between">
                  <Badge variant="outline" className="text-xs">
                    {card.difficulty || 'medium'}
                  </Badge>
                  {card.category && (
                    <Badge variant="secondary" className="text-xs">
                      {card.category}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className={cn(
                "absolute inset-0 p-4 flex flex-col justify-center items-center text-center",
                "transition-all duration-300 rounded-lg",
                isFlipped ? "opacity-100 bg-primary/5" : "opacity-0"
              )}>
                <p className="text-sm">{card.back}</p>
              </div>
              
              <div className="absolute top-2 right-2 text-xs text-muted-foreground">
                Click to flip
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}